import { useEffect } from 'react';

interface WakeLockLike {
  release: () => Promise<void>;
}

interface WakeLockNavigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockLike>;
  };
}

/**
 * Keeps the screen awake while the app is visible. TVs and kiosk browsers
 * often dim or sleep after a few minutes of inactivity; this prevents that
 * where the browser supports the Screen Wake Lock API.
 */
export function useWakeLock(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const nav = navigator as Navigator & WakeLockNavigator;
    if (!nav.wakeLock) return;

    let sentinel: WakeLockLike | null = null;
    let disposed = false;

    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible') return;
      try {
        sentinel = await nav.wakeLock!.request('screen');
      } catch {
        /* denied or unsupported — not fatal */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);
}
