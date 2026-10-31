import { useCallback, useEffect, useMemo, useState } from 'react';
import { PrayerBoard } from './components/PrayerBoard';
import { SettingsPanel } from './components/SettingsPanel';
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

/** Narrows a prayer key to one that has an adhan (sunrise never does). */
function isAdhanPrayerKey(
  key: string,
): key is AdhanPrayerKey {
  return (ADHAN_PRAYER_KEYS as string[]).includes(key);
}
import { useAutoReload } from './lib/version';

const KIOSK = new URLSearchParams(window.location.search).has('kiosk');

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
  const [cursorIdle, setCursorIdle] = useState(false);

  const { play: playAdhan, stop: stopAdhan, status: adhanStatus } = useAdhan();

  // The countdown shows seconds, so tick once per second.
  const now = useNow(1000);
  useWakeLock(true);
  useAutoReload(60_000);

  /*
   * Weather. `current` is 15-minute model output, so it is polled every 15
   * minutes; the daily forecast only changes on a new model run, so hourly.
   */
  const { weather, loading: weatherLoading } = useWeather(
    settings.latitude,
    settings.longitude,
    settings.timezone,
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
        showSettingsButton={!KIOSK}
      />

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
