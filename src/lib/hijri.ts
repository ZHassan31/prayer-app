/**
 * Hijri calendar helpers.
 *
 * Uses the **Umm al-Qura** calendar (`islamic-umalqura`), which is the
 * official calendar of Saudi Arabia. This is the same table the Saudi
 * authorities publish, so dates match what is used there.
 *
 * Both the header date and the Ramadan countdown go through this module, so
 * they can never disagree with each other.
 */

/** Ramadan is the 9th month of the Hijri calendar. */
export const RAMADAN_MONTH = 9;

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

const HIJRI_LOCALE = 'en-u-ca-islamic-umalqura';

/**
 * Arabic month names, indexed 1-12 (Muharram = 1).
 *
 * Spelled the way Umm al-Qura renders them, so the header reads naturally
 * in Arabic while the day and year stay in Latin digits.
 */
const HIJRI_MONTHS_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
] as const;

/** Arabic name for a Hijri month number (1-12). */
export function hijriMonthName(month: number): string {
  return HIJRI_MONTHS_AR[month - 1] ?? '';
}

/**
 * Reads the Hijri date for an instant.
 *
 * Formatting happens in UTC against a date anchored at UTC noon, so the
 * result is stable regardless of the device's timezone or DST.
 */
export function hijriDate(date: Date): HijriDate | null {
  try {
    const parts = new Intl.DateTimeFormat(HIJRI_LOCALE, {
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
 * Builds a UTC-noon anchor for a civil date, shifted by the Hijri offset.
 *
 * Anchoring at noon means adding whole days never crosses a date boundary,
 * which is what makes the day arithmetic below reliable.
 */
export function anchorUtcNoon(
  year: number,
  month: number,
  day: number,
  offsetDays = 0,
): number {
  return Date.UTC(year, month - 1, day, 12) + offsetDays * 86_400_000;
}

/**
 * Hijri date split into its three display parts.
 *
 * Kept separate rather than pre-joined into a string because the Arabic
 * month name is a right-to-left run: mixing it into one string lets the
 * bidi algorithm pull the year into that run, so "day month year" renders
 * as "day year month". Rendering the parts as sibling elements keeps the
 * order fixed regardless of direction.
 */
export interface HijriParts {
  day: number;
  /** Arabic month name, e.g. "جمادى الأولى". */
  month: string;
  year: number;
}

/** Splits a Hijri date into day, Arabic month name and year. */
export function hijriParts(
  date: Date,
  offsetDays = 0,
): HijriParts | null {
  const shifted = new Date(date.getTime() + offsetDays * 86_400_000);
  const parts = hijriDate(shifted);
  if (!parts) return null;

  const month = hijriMonthName(parts.month);
  if (!month) return null;

  return { day: parts.day, month, year: parts.year };
}

/**
 * Formats a Hijri date as "20 جمادى الأولى 1448 AH".
 *
 * Only for plain-text contexts. The header renders the parts separately
 * so the bidi algorithm cannot reorder them.
 */
export function formatHijriDate(date: Date, offsetDays = 0): string {
  const parts = hijriParts(date, offsetDays);
  if (!parts) return '';

  return `${parts.day} ${parts.month} ${parts.year} AH`;
}

/**
 * Days until the next 1 Ramadan.
 *
 * Returns 0 when today is the first day of Ramadan, and `null` if the
 * calendar data is unavailable.
 */
export function daysUntilRamadan(
  anchorMs: number,
  offsetDays = 0,
): number | null {
  const start = anchorMs + offsetDays * 86_400_000;

  // A Hijri year is ~354 days; 400 gives comfortable headroom.
  for (let offset = 0; offset <= 400; offset += 1) {
    const parts = hijriDate(new Date(start + offset * 86_400_000));
    if (!parts) return null;

    if (parts.month === RAMADAN_MONTH && parts.day === 1) {
      return offset;
    }
  }

  return null;
}

/** Human label for the Ramadan countdown. */
export function ramadanLabel(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'Ramadan begins today';
  if (days === 1) return '1 day until Ramadan';
  return `${days} days until Ramadan`;
}
