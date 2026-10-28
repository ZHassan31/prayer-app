import { useCallback, useEffect, useMemo, useState } from 'react';
import { PrayerBoard } from './components/PrayerBoard';
import { SettingsPanel } from './components/SettingsPanel';
import { useNow } from './hooks/useNow';
import { useWakeLock } from './hooks/useWakeLock';
import { loadConfig, type AppConfig } from './lib/config';
import {
  buildSchedule,
  civilDateInTimeZone,
  pickSelection,
  prayerProgress,
  qiblaBearing,
} from './lib/prayer';
import {
  applyConfig,
  loadSettings,
  saveSettings,
  type Settings,
} from './lib/settings';
import { useAutoReload } from './lib/version';

const KIOSK = new URLSearchParams(window.location.search).has('kiosk');

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [config, setConfig] = useState<AppConfig>({});
  const [configReady, setConfigReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cursorIdle, setCursorIdle] = useState(false);

  // The countdown shows seconds, so tick once per second.
  const now = useNow(1000);
  useWakeLock(true);
  useAutoReload(60_000);

  /* Load runtime config once. It is authoritative, so every device converges. */
  useEffect(() => {
    let cancelled = false;

    void loadConfig().then((loaded) => {
      if (cancelled) return;

      setConfig(loaded);
      setSettings((current) => {
        const { settings: next, changed } = applyConfig(current, loaded);
        if (changed) saveSettings(next);
        return next;
      });

      setConfigReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const qibla = useMemo(() => qiblaBearing(settings), [settings]);

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
        qibla={qibla}
        now={now}
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
        />
      )}
    </div>
  );
}
