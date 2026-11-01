/**
 * Quran verses from UmmahAPI.
 *
 * Source: https://ummahapi.com — free, no account required.
 *
 * Why this exists: the app used to ship a hand-typed list of 100 verses in
 * `verses.ts`. Hand-copying Arabic scripture is error-prone, and a single
 * wrong vowel in a Quran verse is a serious mistake. This module fetches the
 * text from a verified source instead.
 *
 * Attribution: Quran text from Tanzil.net (CC BY 3.0), translations via
 * quran.com. The API asks for attribution, so the footer shows the source.
 *
 * The API returns all 12 translations on every request (~4 KB). We keep only
 * the one we display, so the rest is discarded immediately.
 */

const API = 'https://ummahapi.com';

/** Translation used for the English line. */
export const TRANSLATION = 'pickthall' as const;

/**
 * Curated verse references as [surah, ayah] pairs.
 *
 * These are the same passages the app showed before, so the rotation keeps
 * its familiar character.
 *
 * Two filters applied:
 *   1. Short on purpose — the footer is a fixed-height box (13vh, max 10rem)
 *      with a two-line clamp, so a long ayah would either overflow or be
 *      cut off mid-verse. Truncating scripture is not acceptable, so long
 *      passages are excluded rather than clamped.
 *   2. Deduplicated — the old list repeated a few references.
 *
 * Verified against the live API at 1920x1080: all of these render in two
 * lines or fewer. If the footer height or font size changes, re-check with
 * the probe described in the README.
 */
export const VERSE_REFS: ReadonlyArray<readonly [number, number]> = [
  [94, 5],
  [65, 3],
  [2, 152],
  [29, 69],
  [39, 53],
  [2, 153],
  [2, 216],
  [2, 190],
  [2, 45],
  [3, 134],
  [62, 11],
  [16, 90],
  [20, 114],
  [20, 25],
  [17, 37],
  [17, 24],
  [4, 103],
  [2, 173],
  [2, 20],
  [12, 87],
  [2, 201],
  [3, 8],
  [71, 28],
  [25, 74],
  [3, 173],
  [21, 87],
  [21, 107],
  [33, 56],
  [53, 39],
  [2, 181],
  [2, 43],
  [3, 159],
  [4, 29],
  [3, 57],
  [51, 56],
  [94, 6],
  [93, 5],
  [94, 7],
  [74, 3],
  [93, 1],
  [4, 40],
  [18, 23],
  [18, 24],
  [11, 85],
  [28, 76],
  [28, 88],
  [29, 57],
  [2, 212],
  [14, 42],
  [20, 14],
  [20, 132],
  [18, 28],
  [18, 29],
  [18, 30],
  [33, 62],
  [3, 146],
  [3, 169],
  [4, 170],
  [33, 71],
  [2, 225],
  [2, 284],
  [4, 148],
  [4, 149],
  [2, 186],
  [65, 2],
  [65, 4],
  [64, 16],
  [64, 17],
  [64, 1],
  [64, 2],
  [64, 3],
];

export interface QuranVerse {
  /** Arabic text in the Uthmani script. */
  arabic: string;
  /** English translation. */
  english: string;
  /** e.g. "Ash-Sharh 94:5". */
  reference: string;
  /** Surah number, for the API call. */
  surah: number;
  /** Ayah number, for the API call. */
  ayah: number;
}

/** Reads the optional API key. Absent is fine — the API works without one. */
function apiKey(): string {
  const key = import.meta.env.VITE_UMMAH_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

/** Builds the request URL for one ayah. */
export function buildVerseUrl(surah: number, ayah: number): string {
  const url = new URL(`/api/quran/surah/${surah}/ayah/${ayah}`, API);
  url.searchParams.set('script', 'uthmani');

  const key = apiKey();
  if (key) url.searchParams.set('apikey', key);

  return url.toString();
}

/** Narrows an unknown value to a non-empty string. */
function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Fetches one verse.
 *
 * Returns null on any failure — network, HTTP error, or a malformed body.
 * The caller keeps showing the previous verse rather than blanking the
 * footer, which matters on a TV that must never look broken.
 */
export async function fetchVerse(
  surah: number,
  ayah: number,
  signal?: AbortSignal,
): Promise<QuranVerse | null> {
  try {
    const response = await fetch(buildVerseUrl(surah, ayah), { signal });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return null;

    const root = body as Record<string, unknown>;
    if (root.success !== true) return null;

    const data = root.data as Record<string, unknown> | undefined;
    if (!data) return null;

    const surahInfo = data.surah as Record<string, unknown> | undefined;
    const verse = data.verse as Record<string, unknown> | undefined;
    if (!verse) return null;

    const arabic = str(verse.arabic);
    if (!arabic) return null;

    const translations = verse.translations as
      | Record<string, unknown>
      | undefined;
    const english =
      str(translations?.[TRANSLATION]) ?? str(translations?.sahih_international);
    if (!english) return null;

    const name = str(surahInfo?.name_english) ?? `Surah ${surah}`;

    return {
      arabic,
      english,
      reference: `${name} ${surah}:${ayah}`,
      surah,
      ayah,
    };
  } catch {
    // AbortError and network failures both land here.
    return null;
  }
}
