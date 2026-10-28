import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  Qibla,
} from 'adhan';

/* ------------------------------------------------------------------ *
 * Prayer keys
 * ------------------------------------------------------------------ */

export const PRAYER_KEYS = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
] as const;

export type PrayerKey = (typeof PRAYER_KEYS)[number];

/** Sunrise is displayed but is not a prayer. */
export type PrayerName = Exclude<PrayerKey, 'sunrise'>;

export const PRAYER_META: Record<
  PrayerKey,
  { label: string; arabic: string; isPrayer: boolean }
> = {
  fajr: { label: 'Fajr', arabic: 'الفجر', isPrayer: true },
  sunrise: { label: 'Sunrise', arabic: 'الشروق', isPrayer: false },
  dhuhr: { label: 'Dhuhr', arabic: 'الظهر', isPrayer: true },
  asr: { label: 'Asr', arabic: 'العصر', isPrayer: true },
  maghrib: { label: 'Maghrib', arabic: 'المغرب', isPrayer: true },
  isha: { label: 'Isha', arabic: 'العشاء', isPrayer: true },
};

/* ------------------------------------------------------------------ *
 * Calculation methods
 * ------------------------------------------------------------------ */

export const METHODS = {
  MuslimWorldLeague: 'Muslim World League',
  Egyptian: 'Egyptian General Authority',
  Karachi: 'Univ. of Islamic Sciences, Karachi',
  UmmAlQura: 'Umm al-Qura, Makkah',
  Dubai: 'Dubai',
  MoonsightingCommittee: 'Moonsighting Committee',
  NorthAmerica: 'ISNA (North America)',
  Kuwait: 'Kuwait',
  Qatar: 'Qatar',
  Singapore: 'Singapore',
  Tehran: 'Tehran',
  Turkey: 'Turkey (Diyanet)',
} as const;

export type MethodKey = keyof typeof METHODS;

export const METHOD_KEYS = Object.keys(METHODS) as MethodKey[];

export type MadhabKey = 'shafi' | 'hanafi';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface PrayerEntry {
  key: PrayerKey;
  label: string;
  arabic: string;
  isPrayer: boolean;
  time: Date;
}

export interface PrayerSettings {
  latitude: number;
  longitude: number;
  timezone: string;
  method: MethodKey;
  madhab: MadhabKey;
  adjustments: Record<PrayerKey, number>;
}

export interface Selection {
  next: PrayerEntry | null;
  previous: PrayerEntry | null;
  current: PrayerEntry | null;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Returns the civil (calendar) date in a given IANA timezone. */
export function civilDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  return { year: get('year'), month: get('month'), day: get('day') };
}

function buildParameters(settings: PrayerSettings) {
  const params = CalculationMethod[settings.method]();
  params.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  params.adjustments = { ...settings.adjustments };
  return params;
}

/**
 * Computes the six daily events for a single civil day.
 *
 * `dayOffset` is relative to "today" in the configured timezone, so the
 * result is correct even if the TV's own clock is set to another timezone.
 */
export function buildDay(
  settings: PrayerSettings,
  dayOffset: number,
  now: Date,
): PrayerEntry[] {
  const { year, month, day } = civilDateInTimeZone(now, settings.timezone);

  // Local noon of the target civil date. adhan only reads Y/M/D from this
  // value, so the device timezone does not affect the result.
  const base = new Date(year, month - 1, day, 12, 0, 0, 0);
  base.setDate(base.getDate() + dayOffset);

  const coordinates = new Coordinates(settings.latitude, settings.longitude);
  const times = new PrayerTimes(coordinates, base, buildParameters(settings));

  return PRAYER_KEYS.map((key) => ({
    key,
    label: PRAYER_META[key].label,
    arabic: PRAYER_META[key].arabic,
    isPrayer: PRAYER_META[key].isPrayer,
    time: times[key],
  }));
}

/**
 * Builds a rolling window of yesterday → tomorrow so that "next prayer"
 * still resolves correctly late at night (Isha → tomorrow's Fajr).
 */
export function buildSchedule(
  settings: PrayerSettings,
  now: Date,
): PrayerEntry[] {
  return [-1, 0, 1]
    .flatMap((offset) => buildDay(settings, offset, now))
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

/** Picks the next / previous / current prayer from a schedule. */
export function pickSelection(
  entries: PrayerEntry[],
  now: Date,
): Selection {
  const prayers = entries.filter((entry) => entry.isPrayer);
  const stamp = now.getTime();

  const next = prayers.find((entry) => entry.time.getTime() > stamp) ?? null;

  let previous: PrayerEntry | null = null;
  for (const entry of prayers) {
    if (entry.time.getTime() <= stamp) previous = entry;
    else break;
  }

  return { next, previous, current: previous };
}

/** Qibla bearing in degrees from true north. */
export function qiblaBearing(settings: PrayerSettings): number {
  return Qibla(new Coordinates(settings.latitude, settings.longitude));
}

/** Progress (0–1) between the previous and next prayer. */
export function prayerProgress(
  previous: PrayerEntry | null,
  next: PrayerEntry | null,
  now: Date,
): number {
  if (!previous || !next) return 0;
  const span = next.time.getTime() - previous.time.getTime();
  if (span <= 0) return 0;
  const elapsed = now.getTime() - previous.time.getTime();
  return Math.min(1, Math.max(0, elapsed / span));
}
