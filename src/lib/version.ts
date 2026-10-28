import { useEffect } from 'react';

const RELOAD_GUARD_KEY = 'prayer-app.lastReload';
/** Don't reload more than once per this window, to avoid a reload loop. */
const RELOAD_COOLDOWN_MS = 30_000;

function canReloadNow(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? '0');
    if (!Number.isFinite(last)) return true;
    return Date.now() - last > RELOAD_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markReload(): void {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Polls /version.json and reloads the page when the deployed build differs
 * from the one currently running.
 *
 * This is what makes every screen pick up a new deploy without anyone
 * touching it — a TV left on for weeks will still update within a minute
 * of a new image going live.
 *
 * A cooldown guard prevents a reload loop if the browser serves a cached
 * HTML shell alongside a fresh version.json.
 */
export function useAutoReload(intervalMs = 60_000): void {
  useEffect(() => {
    let stopped = false;
    let reloading = false;

    const check = async () => {
      if (stopped || reloading) return;

      try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        if (!response.ok) return;

        const data = (await response.json()) as { buildId?: string };
        if (!data.buildId) return;

        if (data.buildId !== __BUILD_ID__ && canReloadNow()) {
          reloading = true;
          markReload();
          window.location.reload();
        }
      } catch {
        /* offline or transient — try again next tick */
      }
    };

    // Check shortly after load, then on an interval.
    const initial = window.setTimeout(check, 5_000);
    const timer = window.setInterval(check, intervalMs);

    // Also check when the screen wakes up (TVs suspend background tabs).
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
}
