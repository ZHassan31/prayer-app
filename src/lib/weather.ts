/**
 * Weather data from Open-Meteo.
 *
 * Source: https://open-meteo.com — free, no API key, no account.
 *
 * Open-Meteo aggregates national weather service models and picks the
 * highest-resolution one for the requested coordinates. For the UK that is
 * the Met Office UKMO model at 2–10 km, refreshed hourly.
 *
 * IMPORTANT: the `current` block is NOT a measurement. It is model output
 * interpolated to 15-minute steps. It can differ from a thermometer at the
 * door by 1–2 °C. Treat it as "the model's estimate right now", not an
 * observation.
 *
 * Data is CC-BY 4.0, so attribution is required wherever it is displayed.
 */

const API = 'https://api.open-meteo.com/v1/forecast';

/** How stale `current.time` may be before we flag the reading. */
export const STALE_AFTER_MS = 45 * 60 * 1000;

/** How many hourly steps the "Conditions" strip shows. */
export const HOUR_COUNT = 6;

export interface WeatherCurrent {
  /** When the model value is valid for. */
  time: Date;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  isDay: boolean;
}

export interface WeatherHour {
  time: Date;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
}

export interface WeatherDay {
  /** Civil date, `YYYY-MM-DD` in the configured timezone. */
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  windSpeedMax: number;
  uvIndexMax: number;
}

export interface Weather {
  current: WeatherCurrent;
  /** The next few hours, starting at the current hour. */
  hours: WeatherHour[];
  /** Today first, then the following days. */
  days: WeatherDay[];
  /** When this payload was received by the browser. */
  fetchedAt: Date;
}

/* ------------------------------------------------------------------ *
 * WMO weather interpretation codes
 * ------------------------------------------------------------------ */

export interface WeatherLookup {
  label: string;
  /** A glyph that exists in DejaVu Sans, the default Debian font. */
  glyph: string;
}

const WMO: Record<number, WeatherLookup> = {
  0: { label: 'Clear sky', glyph: '☀' },
  1: { label: 'Mainly clear', glyph: '☀' },
  2: { label: 'Partly cloudy', glyph: '⛅' },
  3: { label: 'Overcast', glyph: '☁' },
  45: { label: 'Fog', glyph: '≡' },
  48: { label: 'Rime fog', glyph: '≡' },
  51: { label: 'Light drizzle', glyph: '☂' },
  53: { label: 'Drizzle', glyph: '☂' },
  55: { label: 'Dense drizzle', glyph: '☂' },
  56: { label: 'Freezing drizzle', glyph: '☂' },
  57: { label: 'Freezing drizzle', glyph: '☂' },
  61: { label: 'Light rain', glyph: '☂' },
  63: { label: 'Rain', glyph: '☂' },
  65: { label: 'Heavy rain', glyph: '☂' },
  66: { label: 'Freezing rain', glyph: '☂' },
  67: { label: 'Freezing rain', glyph: '☂' },
  71: { label: 'Light snow', glyph: '❄' },
  73: { label: 'Snow', glyph: '❄' },
  75: { label: 'Heavy snow', glyph: '❄' },
  77: { label: 'Snow grains', glyph: '❄' },
  80: { label: 'Light showers', glyph: '☂' },
  81: { label: 'Showers', glyph: '☂' },
  82: { label: 'Heavy showers', glyph: '☂' },
  85: { label: 'Snow showers', glyph: '❄' },
  86: { label: 'Heavy snow showers', glyph: '❄' },
  95: { label: 'Thunderstorm', glyph: '⚡' },
  96: { label: 'Thunderstorm, hail', glyph: '⚡' },
  99: { label: 'Thunderstorm, hail', glyph: '⚡' },
};

export function describeWeather(code: number): WeatherLookup {
  return WMO[code] ?? { label: 'Unknown', glyph: '·' };
}

/* ------------------------------------------------------------------ *
 * Fetching
 * ------------------------------------------------------------------ */

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function num(value: unknown, fallback = 0): number {
  return isNum(value) ? value : fallback;
}

/**
 * Builds the request URL.
 *
 * `timezone` is passed explicitly rather than `auto` so the daily boundaries
 * match the prayer times, which are computed in the configured zone.
 */
export function buildWeatherUrl(
  latitude: number,
  longitude: number,
  timezone: string,
  forecastDays = 7,
): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    hourly: ['temperature_2m', 'weather_code', 'precipitation_probability'].join(
      ',',
    ),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'uv_index_max',
    ].join(','),
    timezone,
    forecast_days: String(forecastDays),
  });

  return `${API}?${params.toString()}`;
}

/**
 * Open-Meteo returns local wall-clock timestamps without an offset, e.g.
 * "2026-10-31T10:30". Parsing that directly yields a Date in the *device's*
 * zone, which is wrong when the device zone differs from the configured one.
 * Anchor to the reported `utc_offset_seconds` instead.
 */
function parseLocal(text: string, offsetSeconds: number): Date | null {
  const ms = Date.parse(`${text}:00Z`);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms - offsetSeconds * 1000);
}

/** Discards anything malformed so a bad payload cannot break the display. */
function parse(raw: unknown): Weather | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;

  const currentRaw = input.current as Record<string, unknown> | undefined;
  const dailyRaw = input.daily as Record<string, unknown> | undefined;
  if (!currentRaw || !dailyRaw) return null;

  const timeText = currentRaw.time;
  if (typeof timeText !== 'string') return null;

  const offsetSeconds = num(input.utc_offset_seconds, 0);
  const currentTime = parseLocal(timeText, offsetSeconds);
  if (!currentTime) return null;

  const current: WeatherCurrent = {
    time: currentTime,
    temperature: num(currentRaw.temperature_2m),
    apparentTemperature: num(currentRaw.apparent_temperature),
    humidity: num(currentRaw.relative_humidity_2m),
    precipitation: num(currentRaw.precipitation),
    weatherCode: num(currentRaw.weather_code),
    windSpeed: num(currentRaw.wind_speed_10m),
    windDirection: num(currentRaw.wind_direction_10m),
    isDay: num(currentRaw.is_day) === 1,
  };

  /* ---- hourly ---- */
  const hourlyRaw = input.hourly as Record<string, unknown> | undefined;
  const hours: WeatherHour[] = [];

  if (hourlyRaw && Array.isArray(hourlyRaw.time)) {
    const times = hourlyRaw.time as unknown[];
    const temps = hourlyRaw.temperature_2m as unknown[] | undefined;
    const codes = hourlyRaw.weather_code as unknown[] | undefined;
    const pops = hourlyRaw.precipitation_probability as unknown[] | undefined;

    for (let i = 0; i < times.length; i += 1) {
      const text = times[i];
      if (typeof text !== 'string') continue;
      const when = parseLocal(text, offsetSeconds);
      if (!when) continue;
      hours.push({
        time: when,
        temperature: num(temps?.[i]),
        weatherCode: num(codes?.[i]),
        precipitationProbability: num(pops?.[i]),
      });
    }
  }

  // Start at the current hour so the strip reads "Now, +1, +2 …".
  const hourStart = new Date(currentTime);
  hourStart.setMinutes(0, 0, 0);
  const upcoming = hours
    .filter((hour) => hour.time.getTime() >= hourStart.getTime())
    .slice(0, HOUR_COUNT);

  /* ---- daily ---- */
  const dates = dailyRaw.time;
  if (!Array.isArray(dates)) return null;

  const codes = dailyRaw.weather_code as unknown[] | undefined;
  const maxes = dailyRaw.temperature_2m_max as unknown[] | undefined;
  const mins = dailyRaw.temperature_2m_min as unknown[] | undefined;
  const pops = dailyRaw.precipitation_probability_max as unknown[] | undefined;
  const winds = dailyRaw.wind_speed_10m_max as unknown[] | undefined;
  const uvs = dailyRaw.uv_index_max as unknown[] | undefined;

  const days: WeatherDay[] = [];
  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i];
    if (typeof date !== 'string') continue;
    days.push({
      date,
      weatherCode: num(codes?.[i]),
      tempMax: num(maxes?.[i]),
      tempMin: num(mins?.[i]),
      precipitationProbability: num(pops?.[i]),
      windSpeedMax: num(winds?.[i]),
      uvIndexMax: num(uvs?.[i]),
    });
  }

  if (days.length === 0) return null;

  return { current, hours: upcoming, days, fetchedAt: new Date() };
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  timezone: string,
  signal?: AbortSignal,
): Promise<Weather | null> {
  try {
    const response = await fetch(buildWeatherUrl(latitude, longitude, timezone), {
      signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return parse(await response.json());
  } catch {
    // Network failure or abort — the caller keeps the previous reading.
    return null;
  }
}

/** True when the model value is older than we are willing to present as current. */
export function isStale(weather: Weather, now: Date): boolean {
  return now.getTime() - weather.current.time.getTime() > STALE_AFTER_MS;
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

/** Compass point for a wind bearing in degrees. */
export function windDirection(degrees: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((degrees % 360) / 45) % 8;
  return points[index];
}

/** Short weekday label for a `YYYY-MM-DD` date, e.g. "Sat". */
export function weekdayLabel(date: string, timezone: string): string {
  // Anchor at noon UTC so the label cannot slip a day at the boundary.
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone: timezone,
  }).format(parsed);
}

/** Hour label for the conditions strip, e.g. "14". */
export function hourLabel(
  time: Date,
  timezone: string,
  use24Hour: boolean,
): string {
  return new Intl.DateTimeFormat(use24Hour ? 'en-GB' : 'en-US', {
    hour: 'numeric',
    hour12: !use24Hour,
    timeZone: timezone,
  }).format(time);
}

/** "12 min ago" style label for the last successful fetch. */
export function ageLabel(weather: Weather, now: Date): string {
  const minutes = Math.max(
    0,
    Math.round((now.getTime() - weather.current.time.getTime()) / 60000),
  );
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? '1 hr ago' : `${hours} hr ago`;
}
