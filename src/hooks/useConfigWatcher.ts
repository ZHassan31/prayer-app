import { useEffect, useRef } from 'react';
import { loadConfig, type AppConfig } from '../lib/config';

/**
 * Polls `/config.json` and reports when its contents change.
 *
 * Code changes already propagate on their own: the build id changes, and
 * `useAutoReload` reloads the page. But editing `config.json` on the server
 * does NOT change the build id, so without this the display would keep
 * showing stale coordinates until someone manually refreshed it.
 *
 * The first poll only records a baseline — it never fires `onChanged`, so
 * mounting this hook cannot cause a spurious update.
 */
export function useConfigWatcher(
  intervalMs: number,
  onChanged: (next: AppConfig) => void,
): void {
  const lastSignature = useRef<string | null>(null);

  // Keep the callback fresh without making it a dependency of the effect,
  // which would tear down and rebuild the interval on every render.
  const callbackRef = useRef(onChanged);
  callbackRef.current = onChanged;

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const next = await loadConfig();
      if (cancelled) return;

      const signature = JSON.stringify(next);

      if (lastSignature.current === null) {
        lastSignature.current = signature;
        return;
      }

      if (signature !== lastSignature.current) {
        lastSignature.current = signature;
        callbackRef.current(next);
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [intervalMs]);
}
