import { useMemo, useState } from 'react';
import {
  METHOD_KEYS,
  METHODS,
  PRAYER_KEYS,
  PRAYER_META,
  type MadhabKey,
  type MethodKey,
  type PrayerKey,
} from '../lib/prayer';
import {
  ADHAN_PRAYER_KEYS,
  DEFAULT_SETTINGS,
  THEMES,
  THEME_KEYS,
  guessTimezone,
  listTimezones,
  normalizeSettings,
  type Settings,
  type ThemeKey,
} from '../lib/settings';

interface Props {
  initial: Settings;
  firstRun: boolean;
  /** True when /config.json supplies the location, making it authoritative. */
  managed?: boolean;
  onSave: (settings: Settings) => void;
  onClose?: () => void;
  /** Plays the adhan once so the user can check volume. */
  onTestAdhan?: (volume: number) => void;
}

export function SettingsPanel({
  initial,
  firstRun,
  managed = false,
  onSave,
  onClose,
  onTestAdhan,
}: Props) {
  const [draft, setDraft] = useState<Settings>(initial);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);

  const timezones = useMemo(() => listTimezones(), []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const updateAdjustment = (key: PrayerKey, value: number) =>
    setDraft((prev) => ({
      ...prev,
      adjustments: { ...prev.adjustments, [key]: value },
    }));

  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('Geolocation is not available in this browser.');
      return;
    }

    setGeoBusy(true);
    setGeoStatus('Requesting your location…');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((prev) => ({
          ...prev,
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
          timezone: guessTimezone(),
        }));
        setGeoStatus('Location detected. Remember to save.');
        setGeoBusy(false);
      },
      (error) => {
        setGeoStatus(
          error.code === error.PERMISSION_DENIED
            ? 'Permission denied. Enter coordinates manually.'
            : 'Could not detect location. Enter coordinates manually.',
        );
        setGeoBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(normalizeSettings({ ...draft, configured: true }));
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <form className="panel" onSubmit={submit}>
        <header className="panel-header">
          <div>
            <h2>{firstRun ? 'Set up prayer times' : 'Settings'}</h2>
            <p className="panel-sub">
              {managed
                ? 'This device is managed by the server config. Changes here are temporary and will be overwritten on the next load.'
                : firstRun
                  ? 'Choose your location and calculation method to get started.'
                  : 'Changes are saved on this device.'}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close settings"
            >
              ✕
            </button>
          )}
        </header>

        <div className="panel-body">
          <section className="field-group">
            <h3>Location</h3>

            <div className="field-row">
              <label className="field">
                <span>Latitude</span>
                <input
                  type="number"
                  step="0.00001"
                  min={-90}
                  max={90}
                  value={draft.latitude}
                  onChange={(e) => update('latitude', Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span>Longitude</span>
                <input
                  type="number"
                  step="0.00001"
                  min={-180}
                  max={180}
                  value={draft.longitude}
                  onChange={(e) => update('longitude', Number(e.target.value))}
                />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Timezone</span>
                <select
                  value={draft.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                >
                  {!timezones.includes(draft.timezone) && (
                    <option value={draft.timezone}>{draft.timezone}</option>
                  )}
                  {timezones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="inline-actions">
              <button
                type="button"
                className="button ghost"
                onClick={detectLocation}
                disabled={geoBusy}
              >
                {geoBusy ? 'Detecting…' : 'Use my location'}
              </button>
              {geoStatus && <span className="hint">{geoStatus}</span>}
            </div>
          </section>

          <section className="field-group">
            <h3>Calculation</h3>

            <div className="field-row">
              <label className="field">
                <span>Method</span>
                <select
                  value={draft.method}
                  onChange={(e) => update('method', e.target.value as MethodKey)}
                >
                  {METHOD_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {METHODS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Asr madhab</span>
                <select
                  value={draft.madhab}
                  onChange={(e) =>
                    update('madhab', e.target.value as MadhabKey)
                  }
                >
                  <option value="shafi">Shafi / Maliki / Hanbali</option>
                  <option value="hanafi">Hanafi</option>
                </select>
              </label>
            </div>

            <details className="adjustments">
              <summary>Manual adjustments (minutes)</summary>
              <div className="adjustment-grid">
                {PRAYER_KEYS.map((key) => (
                  <label key={key} className="field compact">
                    <span>{PRAYER_META[key].label}</span>
                    <input
                      type="number"
                      step={1}
                      min={-60}
                      max={60}
                      value={draft.adjustments[key]}
                      onChange={(e) =>
                        updateAdjustment(key, Number(e.target.value))
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
          </section>

          <section className="field-group">
            <h3>Display</h3>

            <div className="field-row">
              <label className="field">
                <span>Theme</span>
                <select
                  value={draft.theme}
                  onChange={(e) => update('theme', e.target.value as ThemeKey)}
                >
                  {THEME_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {THEMES[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Hijri offset (days)</span>
                <input
                  type="number"
                  step={1}
                  min={-3}
                  max={3}
                  value={draft.hijriOffset}
                  onChange={(e) => update('hijriOffset', Number(e.target.value))}
                />
              </label>
            </div>

            <div className="toggles">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={draft.use24Hour}
                  onChange={(e) => update('use24Hour', e.target.checked)}
                />
                <span>24-hour clock</span>
              </label>
            </div>
          </section>

          <section className="field-group">
            <h3>Adhan</h3>

            <div className="toggles">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={draft.adhanEnabled}
                  onChange={(e) => update('adhanEnabled', e.target.checked)}
                />
                <span>Play adhan at prayer time</span>
              </label>
            </div>

            <label className="field">
              <span>Volume ({Math.round(draft.adhanVolume * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={draft.adhanVolume}
                onChange={(e) => update('adhanVolume', Number(e.target.value))}
              />
            </label>

            <div className="adjustment-grid">
              {ADHAN_PRAYER_KEYS.map((key) => (
                <label key={key} className="toggle">
                  <input
                    type="checkbox"
                    checked={draft.adhanPrayers.includes(key)}
                    onChange={(e) =>
                      update(
                        'adhanPrayers',
                        e.target.checked
                          ? [...draft.adhanPrayers, key]
                          : draft.adhanPrayers.filter((k) => k !== key),
                      )
                    }
                  />
                  <span>{PRAYER_META[key].label}</span>
                </label>
              ))}
            </div>

            <div className="inline-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => onTestAdhan?.(draft.adhanVolume)}
              >
                ▶ Test adhan
              </button>
              <span className="hint">
                Browsers block audio until you interact with the page once.
              </span>
            </div>
          </section>
        </div>

        <footer className="panel-footer">
          {!firstRun && (
            <button
              type="button"
              className="button ghost"
              onClick={() => setDraft({ ...DEFAULT_SETTINGS, configured: true })}
            >
              Reset to defaults
            </button>
          )}
          <button type="submit" className="button primary">
            Save
          </button>
        </footer>
      </form>
    </div>
  );
}
