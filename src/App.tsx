import { useCallback, useEffect, useMemo, useState } from 'react';
import { PrayerBoard } from './components/PrayerBoard';
import { SettingsPanel } from './components/SettingsPanel';
import { YearlyPanel } from './components/YearlyPanel';
import { useAdhan } from './hooks/useAdhan';
import { useConfigWatcher } from './hooks/useConfigWatcher';
import { useNow } from './hooks/useNow';
import { useWakeLock } from './hooks/useWakeLock';
import { useWeather } from './hooks/useWeather';
import { findDueAdhan, markAdhanPlayed } from './lib/adhan';
import { loadConfig, type AppConfig } from './lib/config';
import {
  buildSchedule,
  civilDateInTimeZone,
  pickSelection,
  prayerProgress,
} from './lib/prayer';
import {
  ADHAN_PRAYER_KEYS,
  applyConfig,
  loadSettings,
  saveSettings,
  type AdhanPrayerKey,
  type Settings,
} from './lib/settings';
import { sleepWindow } from './lib/sleep';

/** Narrows a prayer key to one that has an adhan (sunrise never does). */
function isAdhanPrayerKey(
  key: string,
): key is AdhanPrayerKey {
  return (ADHAN_PRAYER_KEYS as string[]).includes(key);
}
import { useAutoReload } from './lib/version';

const KIOSK = new URLSearchParams(window.location.search).has('kiosk');

/**
 * Traffic-light lead times before the next prayer.
 *
 * Amber at 30 minutes: long enough to notice from across a room and finish
 * what you are doing. Red at 15 minutes: the point where you should be
 * getting ready rather than starting something new.
 */
const AMBER_LEAD_MS = 30 * 60 * 1000;
const RED_LEAD_MS = 15 * 60 * 1000;

/** Which alert stage the countdown is in, or null for the normal canvas. */
type AlertStage = 'amber' | 'red';

/**
 * Bundled adhan audio. Served from the public dir, so it is cached and needs
 * no network at prayer time. Replace public/Adhan-Makkah.mp3 to change it.
 */
export const ADHAN_SRC = '/Adhan-Makkah.mp3';


export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [config, setConfig] = useState<AppConfig>({});
  const [configReady, setConfigReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [yearlyOpen, setYearlyOpen] = useState(false);
  const [cursorIdle, setCursorIdle] = useState(false);

  const { play: playAdhan, stop: stopAdhan, status: adhanStatus } = useAdhan();

  /*
   * Night quiet window.
   *
   * Computed from the schedule, so it can never disagree with the times on
   * screen. `sleeping` is read from a ref-free calculation on every render,
   * which is cheap: it is two array scans.
   *
   * The clock is paused while sleeping, so `now` freezes. That means the
   * window cannot be recomputed from `now` alone — it would never end. The
   * wake-up is therefore driven by a separate timer below.
   */
  const [sleeping, setSleeping] = useState(false);

  // The countdown shows seconds, so tick once per second.
  const now = useNow(1000, sleeping);
  useWakeLock(!sleeping);
  useAutoReload(60_000);

  /*
   * Weather. `current` is 15-minute model output, so it is polled every 15
   * minutes; the daily forecast only changes on a new model run, so hourly.
   */
  const { weather, loading: weatherLoading } = useWeather(
    settings.latitude,
    settings.longitude,
    settings.timezone,
    15 * 60 * 1000,
    60 * 60 * 1000,
    sleeping,
  );

  /*
   * Applies a config object to state. Server config is authoritative, so every
   * device converges on the same values.
   */
  const applyLoadedConfig = useCallback((loaded: AppConfig) => {
    setConfig(loaded);
    setSettings((current) => {
      const { settings: next, changed } = applyConfig(current, loaded);
      if (changed) saveSettings(next);
      return next;
    });
  }, []);

  /* Load runtime config once, before the first paint of real data. */
  useEffect(() => {
    let cancelled = false;

    void loadConfig().then((loaded) => {
      if (cancelled) return;
      applyLoadedConfig(loaded);
      setConfigReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [applyLoadedConfig]);

  /*
   * Keep watching config.json. Editing it on the server does not change the
   * build id, so useAutoReload will not notice — this does.
   */
  useConfigWatcher(60_000, applyLoadedConfig);

  /* Recompute the schedule only when the civil day changes. */
  const dayKey = useMemo(() => {
    const { year, month, day } = civilDateInTimeZone(now, settings.timezone);
    return `${year}-${month}-${day}`;
  }, [now, settings.timezone]);

  const schedule = useMemo(
    () => buildSchedule(settings, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, dayKey],
  );

  const selection = useMemo(
    () => pickSelection(schedule, now),
    [schedule, now],
  );

  const progress = useMemo(
    () => prayerProgress(selection.previous, selection.next, now),
    [selection, now],
  );

  /*
   * Traffic-light stage for the canvas.
   *
   * Derived from the same `selection` the countdown uses, so the colour can
   * never disagree with the timer on screen. `now` ticks every second, so a
   * stage change lands within a second of its threshold.
   *
   * Red is checked first: it is the narrower window, so it wins when both
   * thresholds are satisfied.
   */
  const alertStage = useMemo<AlertStage | null>(() => {
    if (!selection.next) return null;
    const remaining = selection.next.time.getTime() - now.getTime();
    if (remaining <= 0) return null;
    if (remaining <= RED_LEAD_MS) return 'red';
    if (remaining <= AMBER_LEAD_MS) return 'amber';
    return null;
  }, [selection, now]);

  /*
   * Enter and leave the quiet window.
   *
   * Two separate timers rather than one interval, because the clock is paused
   * while sleeping: `now` stops advancing, so nothing would ever notice that
   * the window had ended. The wake timer is the only thing that can bring the
   * app back, so it is scheduled against the wall clock, not `now`.
   *
   * Re-runs whenever the schedule changes (new day, settings edit), which
   * re-arms both timers against the fresh Isha and Fajr.
   */
  useEffect(() => {
    const quiet = sleepWindow(schedule, new Date(), {
      enabled: settings.sleepEnabled,
      afterIshaMinutes: settings.sleepAfterIsha,
      beforeFajrMinutes: settings.sleepBeforeFajr,
    });

    if (!quiet.sleepAt || !quiet.wakeAt) {
      setSleeping(false);
      return;
    }

    const sleepAt = quiet.sleepAt.getTime();
    const wakeAt = quiet.wakeAt.getTime();
    const timers: number[] = [];

    const enter = () => {
      setSleeping(true);
      // Arm the wake-up now, so it survives the paused clock.
      const delay = Math.max(0, wakeAt - Date.now());
      timers.push(window.setTimeout(() => setSleeping(false), delay));
    };

    if (Date.now() >= sleepAt) {
      enter();
    } else {
      timers.push(
        window.setTimeout(enter, Math.max(0, sleepAt - Date.now())),
      );
    }

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [
    schedule,
    settings.sleepEnabled,
    settings.sleepAfterIsha,
    settings.sleepBeforeFajr,
  ]);

  /*
   * Play the adhan when a prayer time arrives.
   *
   * Runs on every tick, so the trigger window is one second wide at the
   * point of arrival. The grace period and the per-day dedupe key mean a
   * sleeping or rebooting TV cannot replay an old adhan or miss one twice.
   */
  useEffect(() => {
    if (!settings.adhanEnabled) return;

    const due = findDueAdhan(schedule, now);
    if (!due) return;
    if (!isAdhanPrayerKey(due.key)) return;
    if (!settings.adhanPrayers.includes(due.key)) return;

    // Mark first: if playback is blocked we still don't want to retry every
    // second, or the TV would spam attempts for the whole grace window.
    markAdhanPlayed(due, now);

    void playAdhan(ADHAN_SRC, settings.adhanVolume);
  }, [
    now,
    schedule,
    settings.adhanEnabled,
    settings.adhanPrayers,
    settings.adhanVolume,
    playAdhan,
  ]);

  /* Hide the mouse pointer on the TV after a few idle seconds. */
  useEffect(() => {
    let timer = window.setTimeout(() => setCursorIdle(true), 3000);

    const wake = () => {
      setCursorIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setCursorIdle(true), 3000);
    };

    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    window.addEventListener('keydown', wake);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  /* Keyboard shortcuts: S = settings, F = fullscreen. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 's' || event.key === 'S') {
        setSettingsOpen((open) => !open);
      }
      if (event.key === 'f' || event.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      }
      if (event.key === 'Escape') setSettingsOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSave = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
    setSettingsOpen(false);
  }, []);

  const firstRun = configReady && !settings.configured;
  const managed =
    typeof config.latitude === 'number' && typeof config.longitude === 'number';

  return (
    <div
      className={`app${cursorIdle ? ' cursor-idle' : ''}`}
      data-theme={settings.theme}
      data-alert={alertStage ?? undefined}
      data-sleeping={sleeping ? 'true' : undefined}
    >
      <div className="ambient" aria-hidden="true" />

      <PrayerBoard
        settings={settings}
        schedule={schedule}
        selection={selection}
        progress={progress}
        now={now}
        weather={weather}
        weatherLoading={weatherLoading}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenYearly={() => setYearlyOpen(true)}
        showSettingsButton={!KIOSK}
        sleeping={sleeping}
      />

      {yearlyOpen && (
        <YearlyPanel
          settings={settings}
          year={now.getFullYear()}
          onClose={() => setYearlyOpen(false)}
        />
      )}

      {/*
        Quiet overlay. A black sheet over everything, so the panel is dark
        even if the OS backlight is still on. Any pointer or key wakes it.
      */}
      {sleeping && (
        <div
          className="sleep-veil"
          role="presentation"
          onClick={() => setSleeping(false)}
          onKeyDown={() => setSleeping(false)}
        />
      )}

      {(settingsOpen || firstRun) && (
        <SettingsPanel
          initial={settings}
          firstRun={firstRun}
          managed={managed}
          onSave={handleSave}
          onClose={firstRun ? undefined : () => setSettingsOpen(false)}
          onTestAdhan={(volume) => void playAdhan(ADHAN_SRC, volume)}
          onStopAdhan={stopAdhan}
          adhanStatus={adhanStatus}
        />
      )}
    </div>
  );
}
