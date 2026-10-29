import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Adhan audio playback.
 *
 * Browsers block audio until the user has interacted with the page at least
 * once. On a TV that is never touched, the first adhan after a reboot would
 * silently fail. To work around that:
 *
 *   1. We attempt playback and catch the rejection.
 *   2. If blocked, `needsUnlock` becomes true so the UI can show a prompt.
 *   3. Any click/keypress on the page sets `unlocked`, because that gesture
 *      satisfies the autoplay policy for the rest of the session.
 *
 * `?kiosk` does NOT bypass this — it is a browser policy, not an app one.
 */

export type AdhanStatus = 'idle' | 'playing' | 'blocked' | 'error';

export interface UseAdhanResult {
  playing: boolean;
  status: AdhanStatus;
  /** True when audio has not yet been permitted by a user gesture. */
  needsUnlock: boolean;
  play: (src: string, volume?: number) => Promise<boolean>;
  stop: () => void;
}

export function useAdhan(): UseAdhanResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<AdhanStatus>('idle');
  const [needsUnlock, setNeedsUnlock] = useState(false);

  /* Create the element once. */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onEnded = () => {
      setPlaying(false);
      setStatus('idle');
    };
    const onError = () => {
      setPlaying(false);
      setStatus('error');
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  /* A user gesture unlocks audio for the rest of the session. */
  useEffect(() => {
    const unlock = () => {
      setNeedsUnlock(false);
      const audio = audioRef.current;
      if (!audio) return;
      // Playing an empty source still counts as a permitted play attempt.
      audio
        .play()
        .then(() => audio.pause())
        .catch(() => undefined);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = useCallback(
    async (src: string, volume = 1): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;

      try {
        audio.pause();
        audio.src = src;
        audio.currentTime = 0;
        audio.volume = Math.min(1, Math.max(0, volume));
        await audio.play();
        setPlaying(true);
        setStatus('playing');
        setNeedsUnlock(false);
        return true;
      } catch {
        // Most likely NotAllowedError — needs a user gesture first.
        setPlaying(false);
        setStatus('blocked');
        setNeedsUnlock(true);
        return false;
      }
    },
    [],
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setStatus('idle');
  }, []);

  return { playing, status, needsUnlock, play, stop };
}
