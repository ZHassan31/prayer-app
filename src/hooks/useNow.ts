import { useEffect, useState } from 'react';

/**
 * A ticking clock. Updates once per second, aligned to the second boundary
 * so the countdown never appears to skip or stall.
 *
 * `paused` stops the timer entirely. During the night quiet window nothing on
 * screen changes, so re-rendering once a second is pure waste — and on a kiosk
 * that runs for months, that waste is the difference between a warm and a cool
 * machine.
 *
 * While paused the returned value is frozen at the moment of pausing. Callers
 * that need the real time (to decide when to wake) should use `Date.now()`
 * rather than this value.
 */
export function useNow(intervalMs = 1000, paused = false): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (paused) return;

    let timeout: number;

    const tick = () => {
      setNow(new Date());
      const drift = Date.now() % intervalMs;
      timeout = window.setTimeout(tick, intervalMs - drift);
    };

    const drift = Date.now() % intervalMs;
    timeout = window.setTimeout(tick, intervalMs - drift);

    return () => window.clearTimeout(timeout);
  }, [intervalMs, paused]);

  return now;
}
