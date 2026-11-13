/**
 * Night-time quiet window.
 *
 * The screen has no reason to glow between Isha and Fajr. This module decides
 * when the app should stand down: a black canvas, no polling, no animation.
 *
 * It deliberately does NOT try to blank the display itself — a browser cannot
 * do that. The OS handles the backlight (see scripts/kiosk-sleep.py); this
 * only stops the app burning CPU to render a screen nobody is looking at.
 *
 * The window is derived from the same schedule the main view uses, so it can
 * never disagree with the times on screen.
 */

import type { PrayerEntry } from './prayer';

export interface SleepOptions {
  enabled: boolean;
  /** Minutes after Isha before the screen goes quiet. */
  afterIshaMinutes: number;
  /** Minutes before Fajr to wake, so the countdown is already showing. */
  beforeFajrMinutes: number;
}

export interface SleepWindow {
  /** True while the app should be quiet. */
  active: boolean;
  /** When the quiet window starts, or null if it cannot be determined. */
  sleepAt: Date | null;
  /** When it ends, or null. */
  wakeAt: Date | null;
}

const MINUTE = 60_000;

/**
 * Shortest window worth honouring.
 *
 * At high latitudes Isha and Fajr can nearly meet in summer, and a window of
 * a few minutes would make the screen flicker off and on. Below this the app
 * simply stays awake.
 */
const MIN_WINDOW_MS = 60 * MINUTE;

/** Finds the last entry with the given key at or before `stamp`. */
function lastBefore(
  entries: PrayerEntry[],
  key: PrayerEntry['key'],
  stamp: number,
): PrayerEntry | null {
  let found: PrayerEntry | null = null;
  for (const entry of entries) {
    if (entry.key !== key) continue;
    if (entry.time.getTime() <= stamp) found = entry;
  }
  return found;
}

/** Finds the first entry with the given key after `stamp`. */
function firstAfter(
  entries: PrayerEntry[],
  key: PrayerEntry['key'],
  stamp: number,
): PrayerEntry | null {
  for (const entry of entries) {
    if (entry.key !== key) continue;
    if (entry.time.getTime() > stamp) return entry;
  }
  return null;
}

/**
 * Works out the quiet window around `now`.
 *
 * `schedule` must span yesterday → tomorrow (which `buildSchedule` already
 * does), so both tonight's Isha and tomorrow's Fajr are present.
 *
 * The wake-up is the first Fajr *after the Isha that opens the window*, not
 * the first Fajr after `now`. Those differ during the day: at midday the most
 * recent Isha is yesterday's, and pairing it with tomorrow's Fajr would build
 * a 35-hour window that swallows the entire day. Anchoring the Fajr to the
 * Isha keeps the window at one night.
 */
export function sleepWindow(
  schedule: PrayerEntry[],
  now: Date,
  options: SleepOptions,
): SleepWindow {
  const idle: SleepWindow = { active: false, sleepAt: null, wakeAt: null };
  if (!options.enabled) return idle;

  const stamp = now.getTime();

  // Tonight's Isha is the most recent one; the wake-up is the Fajr that
  // follows it.
  const isha = lastBefore(schedule, 'isha', stamp);
  if (!isha) return idle;

  const fajr = firstAfter(schedule, 'fajr', isha.time.getTime());
  if (!fajr) return idle;

  const sleepAt = new Date(
    isha.time.getTime() + options.afterIshaMinutes * MINUTE,
  );
  const wakeAt = new Date(
    fajr.time.getTime() - options.beforeFajrMinutes * MINUTE,
  );

  // Inverted or vanishingly short windows happen at high latitudes in summer.
  // Staying awake is the safe answer.
  if (wakeAt.getTime() - sleepAt.getTime() < MIN_WINDOW_MS) return idle;

  const active = stamp >= sleepAt.getTime() && stamp < wakeAt.getTime();

  return { active, sleepAt, wakeAt };
}
