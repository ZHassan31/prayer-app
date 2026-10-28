/**
 * Runtime configuration.
 *
 * The app fetches `/config.json` at startup. That file is:
 *   - gitignored (never committed)
 *   - NOT baked into the Docker image
 *   - mounted into the container at deploy time
 *
 * This keeps the real location out of the public repo and the public image,
 * while still letting the TV show a friendly place name.
 *
 * If the file is missing, the app falls back to generic defaults and shows
 * the setup screen.
 */

export interface AppConfig {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  method?: string;
  madhab?: string;
  theme?: string;
  use24Hour?: boolean;
  hijriOffset?: number;
  adjustments?: Record<string, number>;
}

let cached: AppConfig = {};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Discards anything malformed so a bad config can't break the app. */
function sanitize(raw: unknown): AppConfig {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;
  const out: AppConfig = {};

  if (isFiniteNumber(input.latitude) && input.latitude >= -90 && input.latitude <= 90) {
    out.latitude = input.latitude;
  }
  if (
    isFiniteNumber(input.longitude) &&
    input.longitude >= -180 &&
    input.longitude <= 180
  ) {
    out.longitude = input.longitude;
  }
  if (typeof input.timezone === 'string' && input.timezone) {
    out.timezone = input.timezone;
  }
  if (typeof input.method === 'string') out.method = input.method;
  if (typeof input.madhab === 'string') out.madhab = input.madhab;
  if (typeof input.theme === 'string') out.theme = input.theme;
  if (typeof input.use24Hour === 'boolean') out.use24Hour = input.use24Hour;
  if (isFiniteNumber(input.hijriOffset)) {
    out.hijriOffset = Math.min(3, Math.max(-3, Math.round(input.hijriOffset)));
  }
  if (input.adjustments && typeof input.adjustments === 'object') {
    const adjustments: Record<string, number> = {};
    for (const [key, value] of Object.entries(
      input.adjustments as Record<string, unknown>,
    )) {
      if (isFiniteNumber(value)) {
        adjustments[key] = Math.min(60, Math.max(-60, Math.round(value)));
      }
    }
    out.adjustments = adjustments;
  }

  return out;
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (!response.ok) {
      cached = {};
      return cached;
    }
    cached = sanitize(await response.json());
    return cached;
  } catch {
    cached = {};
    return cached;
  }
}

export function getConfig(): AppConfig {
  return cached;
}
