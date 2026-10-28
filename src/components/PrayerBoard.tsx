import { formatClock, formatCountdown } from '../lib/format';
import type { PrayerEntry, Selection } from '../lib/prayer';
import { daysUntilRamadan, ramadanLabel } from '../lib/ramadan';
import type { Settings } from '../lib/settings';
import { Clock } from './Clock';
import { DateLine } from './DateLine';
import { PrayerList } from './PrayerList';
import { VerseRotator } from './VerseRotator';

interface Props {
  settings: Settings;
  schedule: PrayerEntry[];
  selection: Selection;
  progress: number;
  qibla: number;
  now: Date;
  onOpenSettings: () => void;
  showSettingsButton: boolean;
}

export function PrayerBoard({
  settings,
  schedule,
  selection,
  progress,
  qibla,
  now,
  onOpenSettings,
  showSettingsButton,
}: Props) {
  const { next, previous } = selection;
  const remaining = next ? next.time.getTime() - now.getTime() : 0;
  const countdown = formatCountdown(remaining);

  const ramadanDays = daysUntilRamadan(
    now,
    settings.timezone,
    settings.hijriOffset,
  );

  return (
    <div className="board">
      <header className="topbar">
        <div className="topbar-left">
          <span className="pin" aria-hidden="true">
            ◈
          </span>
          <div className="topbar-text">
            <DateLine
              now={now}
              timeZone={settings.timezone}
              hijriOffset={settings.hijriOffset}
            />
          </div>
        </div>

        <div className="topbar-right">
          <Clock
            now={now}
            timeZone={settings.timezone}
            use24Hour={settings.use24Hour}
          />
          {showSettingsButton && (
            <button
              type="button"
              className="icon-button"
              onClick={onOpenSettings}
              title="Settings (S)"
              aria-label="Open settings"
            >
              ⚙
            </button>
          )}
        </div>
      </header>

      <main className="stage">
        <section className="hero" aria-live="polite">
          <p className="hero-eyebrow">
            {next ? 'Next prayer' : 'Prayer times'}
          </p>

          {next ? (
            <>
              <h1 className="hero-name">
                {next.label}
                <span className="hero-arabic" lang="ar" dir="rtl">
                  {next.arabic}
                </span>
              </h1>

              <div className="hero-countdown">
                <span className="countdown-value">{countdown.text}</span>
                <span className="countdown-label">until {next.label}</span>
              </div>
            </>
          ) : (
            <h1 className="hero-name">—</h1>
          )}

          <div className="progress" role="presentation">
            <div
              className="progress-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          <div className="progress-labels">
            <span>
              {previous
                ? `${previous.label} ${formatClock(
                    previous.time,
                    settings.timezone,
                    settings.use24Hour,
                  )}`
                : ''}
            </span>
            <span>
              {next
                ? `${next.label} ${formatClock(
                    next.time,
                    settings.timezone,
                    settings.use24Hour,
                  )}`
                : ''}
            </span>
          </div>
        </section>

        <aside className="side">
          <PrayerList
            schedule={schedule}
            selection={selection}
            timeZone={settings.timezone}
            use24Hour={settings.use24Hour}
            now={now}
          />

          <div className="qibla">
            <span className="qibla-label">Qibla</span>
            <span className="qibla-value">{Math.round(qibla)}°</span>
            <span
              className="qibla-arrow"
              style={{ transform: `rotate(${qibla}deg)` }}
              aria-hidden="true"
            >
              ↑
            </span>
          </div>
        </aside>
      </main>

      <footer className="footer">
        <div className="footer-ramadan">
          <span className="ramadan-icon" aria-hidden="true">
            ☾
          </span>
          <span className="ramadan-text">{ramadanLabel(ramadanDays)}</span>
        </div>

        <VerseRotator />
      </footer>
    </div>
  );
}
