import type { MethodKey, MadhabKey, PrayerKey } from './prayer';

export type ThemeKey = 'midnight' | 'emerald' | 'sand' | 'slate';

export const THEMES: Record<ThemeKey, string> = {
  midnight: 'Midnight',
  emerald: 'Emerald',
  sand: 'Sand',
  slate: 'Slate',
};

export interface Settings {
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  method: MethodKey;
  madhab: MadhabKey;
  adjustments: Record<PrayerKey, number>;
  use24Hour: boolean;
  hijriOffset: number;
  theme: ThemeKey;
  showSeconds: boolean;
  /** Set once the user has saved their own location. */
  configured: boolean;
}

const STORAGE_KEY = 'prayer-app.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  locationName: 'Makkah',
  latitude: 21.4225,
  longitude: 39.8262,
  timezone: 'Asia/Riyadh',
  method: 'UmmAlQura',
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
  theme: 'midnight',
  showSeconds: true,
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
    locationName:
      typeof input.locationName === 'string' && input.locationName.trim()
        ? input.locationName.trim().slice(0, 60)
        : DEFAULT_SETTINGS.locationName,
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
      input.theme === 'emerald' ||
      input.theme === 'sand' ||
      input.theme === 'slate'
        ? input.theme
        : 'midnight',
    showSeconds:
      typeof input.showSeconds === 'boolean'
        ? input.showSeconds
        : DEFAULT_SETTINGS.showSeconds,
    configured: input.configured === true,
  };
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
