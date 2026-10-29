import type { PrayerEntry } from './prayer';

/** Sunrise is not a prayer, so it never triggers the adhan. */
const ADHAN_KEYS = new Set(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

/** Dedupe key so a given prayer only plays once per day, even across reloads. */
const STORAGE_KEY = 'prayer-app.lastAdhan';

/**
 * How long after the exact prayer time the adhan may still start.
 *
 * This matters for a TV that sleeps or loses power: if it wakes an hour
 * later it must NOT play a stale adhan. Two minutes is long enough to cover
 * a slow browser tick and short enough to avoid surprising anyone.
 */
export const ADHAN_GRACE_MS = 120_000;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function readLastPlayed(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLastPlayed(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* ignore */
  }
}

/**
 * Finds the prayer whose time has just arrived.
 *
 * Returns an entry only if:
 *   - it is a real prayer (not sunrise),
 *   - the current time is within the grace window after it,
 *   - it has not already played today.
 *
 * The caller is responsible for marking it as played via `markPlayed`.
 */
export function findDueAdhan(
  entries: PrayerEntry[],
  now: Date,
  graceMs = ADHAN_GRACE_MS,
): PrayerEntry | null {
  const stamp = now.getTime();
  const today = dayKey(now);
  const lastPlayed = readLastPlayed();

  for (const entry of entries) {
    if (!ADHAN_KEYS.has(entry.key)) continue;

    const delta = stamp - entry.time.getTime();
    if (delta < 0 || delta > graceMs) continue;

    const key = `${today}:${entry.key}`;
    if (lastPlayed === key) continue;

    return entry;
  }

  return null;
}

/** Records that this prayer's adhan has been played, so it won't repeat. */
export function markAdhanPlayed(entry: PrayerEntry, now: Date): void {
  writeLastPlayed(`${dayKey(now)}:${entry.key}`);
}

/** Clears the dedupe record — used by the settings panel "test" button. */
export function resetAdhanHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
