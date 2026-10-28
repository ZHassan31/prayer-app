import { formatHijriDate } from './hijri';

export const pad2 = (value: number): string => String(value).padStart(2, '0');

export function formatClock(
  date: Date,
  timeZone: string,
  use24Hour: boolean,
): string {
  return new Intl.DateTimeFormat(use24Hour ? 'en-GB' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
    timeZone,
  }).format(date);
}

export function formatGregorian(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(date);
}

/**
 * Hijri date for display. Delegates to the shared Umm al-Qura helper so the
 * header and the Ramadan countdown always agree.
 */
export function formatHijri(
  date: Date,
  _timeZone: string,
  offsetDays: number,
): string {
  return formatHijriDate(date, offsetDays);
}

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  /** HH:MM:SS — the countdown is the only place seconds are shown. */
  text: string;
}

/**
 * Formats a duration as HH:MM:SS.
 *
 * Seconds are shown here (and only here) because the countdown is the one
 * value that benefits from ticking. The wall clock stays at HH:MM.
 */
export function formatCountdown(ms: number): Countdown {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return {
    hours,
    minutes,
    seconds,
    text: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`,
  };
}
