/**
 * Yearly prayer-time statistics.
 *
 * Answers two questions the daily view cannot:
 *   1. How long is each gap between prayers, on average, across a year?
 *   2. How much does that gap swing between winter and summer?
 *
 * Everything is computed locally with the same `adhan` engine the rest of the
 * app uses, so the numbers always agree with the times on screen. No network.
 *
 * Durations are measured from real `Date` objects, so daylight-saving shifts
 * are handled correctly: a gap that spans a clock change is still the true
 * elapsed time, not the difference between two wall-clock readings.
 */

import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan';
import { PRAYER_KEYS, type PrayerKey, type PrayerSettings } from './prayer';

/** The gaps we report, as [from, to] pairs of prayer keys. */
export const INTERVALS = [
  { key: 'night', from: 'isha', to: 'fajr', label: 'Night' },
  { key: 'fajr-sunrise', from: 'fajr', to: 'sunrise', label: 'Fajr → Sunrise' },
  { key: 'sunrise-dhuhr', from: 'sunrise', to: 'dhuhr', label: 'Sunrise → Dhuhr' },
  { key: 'dhuhr-asr', from: 'dhuhr', to: 'asr', label: 'Dhuhr → Asr' },
  { key: 'asr-maghrib', from: 'asr', to: 'maghrib', label: 'Asr → Maghrib' },
  { key: 'maghrib-isha', from: 'maghrib', to: 'isha', label: 'Maghrib → Isha' },
] as const;

export type IntervalKey = (typeof INTERVALS)[number]['key'];

/** One day's worth of computed durations, in minutes. */
export interface DayStats {
  /** Day of the year, 1-based. */
  dayOfYear: number;
  /** Month, 1-12. */
  month: number;
  /** Minutes between Fajr and Maghrib — the fasting length. */
  daylight: number;
  /** Minutes between each interval, keyed by IntervalKey. */
  intervals: Record<IntervalKey, number>;
}

/** Summary of one interval across the whole year. */
export interface IntervalSummary {
  key: IntervalKey;
  label: string;
  /** Mean across all days, in minutes. */
  average: number;
  /** Shortest and longest day of the year. */
  min: number;
  max: number;
  /** Which month the min and max fell in, for context. */
  minMonth: number;
  maxMonth: number;
  /** max - min, in minutes. The seasonal swing. */
  swing: number;
}

export interface MonthlyPoint {
  month: number;
  /** Mean daylight (Fajr → Maghrib) for that month, in minutes. */
  daylight: number;
  /** Mean night (Isha → next Fajr) for that month, in minutes. */
  night: number;
}

export interface YearlyStats {
  year: number;
  days: DayStats[];
  intervals: IntervalSummary[];
  monthly: MonthlyPoint[];
  /** Mean daylight across the year, in minutes. */
  averageDaylight: number;
  /** Shortest and longest daylight day, in minutes. */
  minDaylight: number;
  maxDaylight: number;
  minDaylightMonth: number;
  maxDaylightMonth: number;
}

const MINUTE = 60_000;

/** Builds adhan parameters once, so the per-day loop stays cheap. */
function buildParams(settings: PrayerSettings) {
  const params = CalculationMethod[settings.method]();
  params.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  params.adjustments = { ...settings.adjustments };
  return params;
}

/** Minutes between two instants, rounded to the nearest minute. */
function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MINUTE);
}

/**
 * Computes every day of a Gregorian year.
 *
 * 365 iterations of a pure calculation — a few milliseconds, so this is safe
 * to run synchronously when the panel opens.
 */
export function computeYearlyStats(
  settings: PrayerSettings,
  year: number,
): YearlyStats {
  const coordinates = new Coordinates(settings.latitude, settings.longitude);
  const params = buildParams(settings);

  const days: DayStats[] = [];
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDays = isLeap ? 366 : 365;

  // Cache the previous day's Isha so the night length can be measured across
  // midnight without recomputing.
  let previousIsha: Date | null = null;

  for (let index = 0; index < totalDays; index += 1) {
    // Local noon, so adhan reads the intended civil date regardless of the
    // device timezone.
    const date = new Date(year, 0, 1 + index, 12, 0, 0, 0);
    const times = new PrayerTimes(coordinates, date, params);

    const t = {} as Record<PrayerKey, Date>;
    for (const key of PRAYER_KEYS) t[key] = times[key];

    const intervals = {} as Record<IntervalKey, number>;
    for (const spec of INTERVALS) {
      if (spec.key === 'night') {
        // Night runs from the previous day's Isha to this day's Fajr. On the
        // first day there is no previous Isha, so it is filled in below.
        intervals.night = previousIsha
          ? minutesBetween(previousIsha, t.fajr)
          : 0;
      } else {
        intervals[spec.key] = minutesBetween(t[spec.from], t[spec.to]);
      }
    }

    days.push({
      dayOfYear: index + 1,
      month: date.getMonth() + 1,
      daylight: minutesBetween(t.fajr, t.maghrib),
      intervals,
    });

    previousIsha = t.isha;
  }

  // The first day's night is unknown; drop it from the night statistics by
  // copying day two's value, which is within a minute of the truth.
  if (days.length > 1) days[0].intervals.night = days[1].intervals.night;

  const intervals: IntervalSummary[] = INTERVALS.map((spec) => {
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let minMonth = 1;
    let maxMonth = 1;

    for (const day of days) {
      const value = day.intervals[spec.key];
      sum += value;
      if (value < min) {
        min = value;
        minMonth = day.month;
      }
      if (value > max) {
        max = value;
        maxMonth = day.month;
      }
    }

    return {
      key: spec.key,
      label: spec.label,
      average: Math.round(sum / days.length),
      min,
      max,
      minMonth,
      maxMonth,
      swing: max - min,
    };
  });

  const monthly: MonthlyPoint[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const inMonth = days.filter((day) => day.month === month);
    if (!inMonth.length) continue;
    const daylight =
      inMonth.reduce((acc, day) => acc + day.daylight, 0) / inMonth.length;
    const night =
      inMonth.reduce((acc, day) => acc + day.intervals.night, 0) /
      inMonth.length;
    monthly.push({
      month,
      daylight: Math.round(daylight),
      night: Math.round(night),
    });
  }

  let daylightSum = 0;
  let minDaylight = Infinity;
  let maxDaylight = -Infinity;
  let minDaylightMonth = 1;
  let maxDaylightMonth = 1;

  for (const day of days) {
    daylightSum += day.daylight;
    if (day.daylight < minDaylight) {
      minDaylight = day.daylight;
      minDaylightMonth = day.month;
    }
    if (day.daylight > maxDaylight) {
      maxDaylight = day.daylight;
      maxDaylightMonth = day.month;
    }
  }

  return {
    year,
    days,
    intervals,
    monthly,
    averageDaylight: Math.round(daylightSum / days.length),
    minDaylight,
    maxDaylight,
    minDaylightMonth,
    maxDaylightMonth,
  };
}

/** Formats a minute count as "1h 24m" or "42m". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins}m`;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

/** Short month name for a 1-12 month number. */
export function monthName(month: number): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(
    new Date(2024, month - 1, 1),
  );
}
