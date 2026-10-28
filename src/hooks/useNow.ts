import { useEffect, useState } from 'react';

/**
 * A ticking clock. Updates once per second, aligned to the second boundary
 * so the countdown never appears to skip or stall.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeout: number;

    const tick = () => {
      setNow(new Date());
      const drift = Date.now() % intervalMs;
      timeout = window.setTimeout(tick, intervalMs - drift);
    };

    const drift = Date.now() % intervalMs;
    timeout = window.setTimeout(tick, intervalMs - drift);

    return () => window.clearTimeout(timeout);
  }, [intervalMs]);

  return now;
}
