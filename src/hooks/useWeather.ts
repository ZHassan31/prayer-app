import { useEffect, useRef, useState } from 'react';
import { fetchWeather, type Weather } from '../lib/weather';

/**
 * Polls Open-Meteo and keeps the last good reading.
 *
 * Two intervals, because the two halves of the payload change at different
 * rates:
 *
 *   - `current` is model output interpolated to 15-minute steps, so polling
 *     it faster than every 15 minutes returns identical numbers.
 *   - the daily forecast only changes when a new model run lands (hourly for
 *     UKMO), so polling it every 15 minutes is pure waste.
 *
 * A failed request never clears the previous reading — a network blip should
 * not blank the weather panel. The caller can inspect `stale` to decide how
 * to present an old value.
 */
export function useWeather(
  latitude: number,
  longitude: number,
  timezone: string,
  currentIntervalMs = 15 * 60 * 1000,
  dailyIntervalMs = 60 * 60 * 1000,
): { weather: Weather | null; loading: boolean } {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep the latest coordinates without restarting the timers on every render.
  const coords = useRef({ latitude, longitude, timezone });
  coords.current = { latitude, longitude, timezone };

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();

      const { latitude: lat, longitude: lon, timezone: tz } = coords.current;
      const next = await fetchWeather(lat, lon, tz, controller.signal);

      if (cancelled) return;

      // Only replace on success, so a transient failure keeps the last value.
      if (next) setWeather(next);
      setLoading(false);
    };

    void load();

    const currentTimer = window.setInterval(() => void load(), currentIntervalMs);
    const dailyTimer = window.setInterval(() => void load(), dailyIntervalMs);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(currentTimer);
      window.clearInterval(dailyTimer);
    };
  }, [currentIntervalMs, dailyIntervalMs]);

  return { weather, loading };
}
