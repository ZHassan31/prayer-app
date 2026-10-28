import { civilDateInTimeZone } from './prayer';

/** Ramadan is the 9th month of the Hijri calendar. */
const RAMADAN_MONTH = 9;

interface HijriParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Reads the Hijri (Umm al-Qura) date for an instant.
 *
 * Formatting is done in UTC against a date built at UTC noon, so the result
 * is stable regardless of the device's own timezone or DST.
 */
function hijriParts(date: Date): HijriParts | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).formatToParts(date);

    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? '0');

    const year = get('year');
    const month = get('month');
    const day = get('day');

    if (!year || !month || !day) return null;
    return { year, month, day };
  } catch {
    return null;
  }
}

/**
 * Days until the next 1 Ramadan.
 *
 * Returns 0 when today is the first day of Ramadan, and `null` if the
 * calendar data is unavailable.
 *
 * `hijriOffset` is applied the same way as the displayed Hijri date, so the
 * countdown agrees with the date shown in the header.
 */
export function daysUntilRamadan(
  now: Date,
  timeZone: string,
  hijriOffset: number,
): number | null {
  const { year, month, day } = civilDateInTimeZone(now, timeZone);

  // Anchor at UTC noon so adding whole days never crosses a date boundary.
  const start = Date.UTC(year, month - 1, day, 12) + hijriOffset * 86_400_000;

  // A Hijri year is ~354 days; 400 gives comfortable headroom.
  for (let offset = 0; offset <= 400; offset += 1) {
    const candidate = new Date(start + offset * 86_400_000);
    const parts = hijriParts(candidate);
    if (!parts) return null;

    if (parts.month === RAMADAN_MONTH && parts.day === 1) {
      return offset;
    }
  }

  return null;
}

/** Human label for the countdown. */
export function ramadanLabel(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'Ramadan begins today';
  if (days === 1) return '1 day until Ramadan';
  return `${days} days until Ramadan`;
}
