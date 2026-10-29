import type { MethodKey, MadhabKey, PrayerKey } from './prayer';
import type { AppConfig } from './config';

export type ThemeKey = 'mint' | 'midnight' | 'emerald' | 'sand' | 'slate';

export const THEMES: Record<ThemeKey, string> = {
  mint: 'Mint',
  midnight: 'Midnight',
  emerald: 'Emerald',
  sand: 'Sand',
  slate: 'Slate',
};

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export interface Settings {
  latitude: number;
  longitude: number;
  timezone: string;
  method: MethodKey;
  madhab: MadhabKey;
  adjustments: Record<PrayerKey, number>;
  use24Hour: boolean;
  hijriOffset: number;
  theme: ThemeKey;
  /** Play the adhan audio when a prayer time arrives. */
  adhanEnabled: boolean;
  /** 0 = muted, 1 = full volume. */
  adhanVolume: number;
  /** Which prayer times should play. Sunrise is never included. */
  adhanPrayers: AdhanPrayerKey[];
  /** Set once the user has saved their own location. */
  configured: boolean;
}

export type AdhanPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const ADHAN_PRAYER_KEYS: AdhanPrayerKey[] = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

/**
 * Which prayers play the adhan by default.
 *
 * Fajr is deliberately excluded: the adhan at dawn is very loud in a silent
 * house. It can still be switched on per device or via config.json.
 */
export const DEFAULT_ADHAN_PRAYERS: AdhanPrayerKey[] = [
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

const STORAGE_KEY = 'prayer-app.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  // Neutral fallback only. The real location is supplied at runtime by
  // /config.json, which is gitignored and never baked into the image.
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 'Europe/London',
  method: 'MoonsightingCommittee',
  madhab: 'shafi',
  adjustments: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },
  use24Hour: true,
  hijriOffset: 0,
  theme: 'mint',
  adhanEnabled: false,
  adhanVolume: 0.8,
  adhanPrayers: [...DEFAULT_ADHAN_PRAYERS],
  configured: false,
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

/** Merges stored data over the defaults, discarding anything malformed. */
export function normalizeSettings(raw: unknown): Settings {
  const input = (raw ?? {}) as Partial<Settings>;
  const adjustments = { ...DEFAULT_SETTINGS.adjustments };

  if (input.adjustments && typeof input.adjustments === 'object') {
    for (const key of Object.keys(adjustments) as PrayerKey[]) {
      adjustments[key] = clampNumber(
        (input.adjustments as Record<string, unknown>)[key],
        -60,
        60,
        0,
      );
    }
  }

  return {
    latitude: clampNumber(input.latitude, -90, 90, DEFAULT_SETTINGS.latitude),
    longitude: clampNumber(
      input.longitude,
      -180,
      180,
      DEFAULT_SETTINGS.longitude,
    ),
    timezone:
      typeof input.timezone === 'string' && input.timezone
        ? input.timezone
        : DEFAULT_SETTINGS.timezone,
    method:
      typeof input.method === 'string'
        ? (input.method as MethodKey)
        : DEFAULT_SETTINGS.method,
    madhab: input.madhab === 'hanafi' ? 'hanafi' : 'shafi',
    adjustments,
    use24Hour:
      typeof input.use24Hour === 'boolean'
        ? input.use24Hour
        : DEFAULT_SETTINGS.use24Hour,
    hijriOffset: clampNumber(input.hijriOffset, -3, 3, 0),
    theme:
      input.theme === 'midnight' ||
      input.theme === 'emerald' ||
      input.theme === 'sand' ||
      input.theme === 'slate' ||
      input.theme === 'mint'
        ? input.theme
        : 'mint',
    adhanEnabled:
      typeof input.adhanEnabled === 'boolean'
        ? input.adhanEnabled
        : DEFAULT_SETTINGS.adhanEnabled,
    adhanVolume: clampNumber(
      input.adhanVolume,
      0,
      1,
      DEFAULT_SETTINGS.adhanVolume,
    ),
    adhanPrayers: normalizeAdhanPrayers(input.adhanPrayers),
    configured: input.configured === true,
  };
}

/** Keeps only known prayer keys, falling back to all of them. */
function normalizeAdhanPrayers(raw: unknown): AdhanPrayerKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_ADHAN_PRAYERS];

  const kept = ADHAN_PRAYER_KEYS.filter((key) => raw.includes(key));
  // An explicit empty list is respected (the user turned them all off).
  return raw.length === 0 ? [] : kept;
}

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(stored));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Applies runtime config to a settings object.
 *
 * **The server config is authoritative.** When `/config.json` supplies a
 * location, it always wins — on fresh installs and on devices that already
 * have settings. This is what keeps every screen uniform: change config.json,
 * restart the container, and every TV converges on the same values on its
 * next load.
 *
 * The consequence is deliberate: per-device edits made in the settings panel
 * are overwritten on the next load. If you want a device to keep its own
 * values, remove the location from config.json (or run that device without
 * the config file mounted).
 *
 * Returns the settings to use, plus whether anything changed.
 */
export function applyConfig(
  settings: Settings,
  config: AppConfig,
): { settings: Settings; changed: boolean } {
  const hasLocation =
    typeof config.latitude === 'number' && typeof config.longitude === 'number';

  if (!hasLocation) return { settings, changed: false };

  const next: Settings = {
    ...settings,
    latitude: config.latitude as number,
    longitude: config.longitude as number,
    timezone: config.timezone ?? settings.timezone,
    method: (config.method as MethodKey) ?? settings.method,
    madhab: config.madhab === 'hanafi' ? 'hanafi' : settings.madhab,
    theme: (config.theme as Settings['theme']) ?? settings.theme,
    use24Hour: config.use24Hour ?? settings.use24Hour,
    hijriOffset: config.hijriOffset ?? settings.hijriOffset,
    adhanEnabled: config.adhanEnabled ?? settings.adhanEnabled,
    adhanVolume: config.adhanVolume ?? settings.adhanVolume,
    adhanPrayers: normalizeAdhanPrayers(
      config.adhanPrayers ?? settings.adhanPrayers,
    ),
    adjustments: config.adjustments
      ? { ...settings.adjustments, ...config.adjustments }
      : settings.adjustments,
    configured: true,
  };

  const changed =
    next.latitude !== settings.latitude ||
    next.longitude !== settings.longitude ||
    next.timezone !== settings.timezone ||
    next.method !== settings.method ||
    next.madhab !== settings.madhab ||
    next.theme !== settings.theme ||
    next.use24Hour !== settings.use24Hour ||
    next.hijriOffset !== settings.hijriOffset ||
    next.adhanEnabled !== settings.adhanEnabled ||
    next.adhanVolume !== settings.adhanVolume ||
    JSON.stringify(next.adhanPrayers) !== JSON.stringify(settings.adhanPrayers) ||
    JSON.stringify(next.adjustments) !== JSON.stringify(settings.adjustments) ||
    next.configured !== settings.configured;

  return { settings: next, changed };
}

/** True when this device has never saved settings. */
export function hasStoredSettings(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage may be unavailable (private mode) — ignore */
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** List of IANA timezones, with a small fallback for older browsers. */
export function listTimezones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };

  try {
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) return zones;
  } catch {
    /* fall through */
  }

  return [
    'UTC',
    'Africa/Cairo',
    'Africa/Casablanca',
    'Africa/Lagos',
    'America/Chicago',
    'America/Los_Angeles',
    'America/New_York',
    'America/Toronto',
    'Asia/Dhaka',
    'Asia/Dubai',
    'Asia/Istanbul',
    'Asia/Jakarta',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Kuala_Lumpur',
    'Asia/Riyadh',
    'Asia/Singapore',
    'Australia/Sydney',
    'Europe/Berlin',
    'Europe/London',
    'Europe/Paris',
  ];
}

/** Best-effort guess of the viewer's timezone. */
export function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
