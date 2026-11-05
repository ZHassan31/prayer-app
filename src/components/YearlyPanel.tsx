import { useMemo } from 'react';
import type { PrayerSettings } from '../lib/prayer';
import {
  computeYearlyStats,
  formatDuration,
  monthName,
  type IntervalSummary,
  type MonthlyPoint,
} from '../lib/yearly';

interface Props {
  settings: PrayerSettings;
  year: number;
  onClose: () => void;
}

/**
 * Yearly prayer-time statistics.
 *
 * Two views, because they answer different questions:
 *
 *   - The interval table shows how long each gap between prayers lasts on
 *     average, plus the shortest and longest day of the year. The swing
 *     column is the headline: it is how much that gap moves across the year.
 *   - The monthly chart shows the seasonal shape — long summer days, short
 *     winter ones — as paired bars for daylight and night.
 *
 * Everything is computed locally from the same engine as the main screen, so
 * the numbers always agree with the times shown there.
 */
export function YearlyPanel({ settings, year, onClose }: Props) {
  const stats = useMemo(
    () => computeYearlyStats(settings, year),
    [settings, year],
  );

  // Scale for the monthly bars: the tallest value across both series.
  const peak = useMemo(() => {
    let max = 1;
    for (const point of stats.monthly) {
      max = Math.max(max, point.daylight, point.night);
    }
    return max;
  }, [stats.monthly]);

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="panel yearly-panel">
        <header className="panel-header">
          <div>
            <h2>Prayer times through {year}</h2>
            <p className="panel-sub">
              Averages and seasonal swing, computed for your location.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="panel-body yearly-body">
          <section className="yearly-section">
            <h3 className="yearly-heading">Daylight and night</h3>
            <div className="yearly-highlights">
              <Highlight
                label="Average daylight"
                value={formatDuration(stats.averageDaylight)}
                note="Fajr to Maghrib"
              />
              <Highlight
                label="Shortest day"
                value={formatDuration(stats.minDaylight)}
                note={monthName(stats.minDaylightMonth)}
              />
              <Highlight
                label="Longest day"
                value={formatDuration(stats.maxDaylight)}
                note={monthName(stats.maxDaylightMonth)}
              />
              <Highlight
                label="Seasonal swing"
                value={formatDuration(stats.maxDaylight - stats.minDaylight)}
                note="Longest minus shortest"
              />
            </div>
          </section>

          <section className="yearly-section">
            <h3 className="yearly-heading">Average gap between prayers</h3>
            <table className="yearly-table">
              <thead>
                <tr>
                  <th scope="col">Interval</th>
                  <th scope="col">Average</th>
                  <th scope="col">Shortest</th>
                  <th scope="col">Longest</th>
                  <th scope="col">Swing</th>
                </tr>
              </thead>
              <tbody>
                {stats.intervals.map((interval) => (
                  <IntervalRow key={interval.key} interval={interval} />
                ))}
              </tbody>
            </table>
          </section>

          <section className="yearly-section">
            <h3 className="yearly-heading">How the year changes</h3>
            <p className="yearly-note">
              Daylight (Fajr → Maghrib) against night (Isha → Fajr), averaged
              per month.
            </p>
            <div className="yearly-chart">
              {stats.monthly.map((point) => (
                <MonthColumn key={point.month} point={point} peak={peak} />
              ))}
            </div>
            <div className="yearly-legend">
              <span className="yearly-key yearly-key-daylight">Daylight</span>
              <span className="yearly-key yearly-key-night">Night</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Highlight({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="yearly-highlight">
      <span className="yearly-highlight-label">{label}</span>
      <span className="yearly-highlight-value">{value}</span>
      <span className="yearly-highlight-note">{note}</span>
    </div>
  );
}

function IntervalRow({ interval }: { interval: IntervalSummary }) {
  return (
    <tr>
      <th scope="row">{interval.label}</th>
      <td className="yearly-strong">{formatDuration(interval.average)}</td>
      <td>
        {formatDuration(interval.min)}
        <span className="yearly-month">{monthName(interval.minMonth)}</span>
      </td>
      <td>
        {formatDuration(interval.max)}
        <span className="yearly-month">{monthName(interval.maxMonth)}</span>
      </td>
      <td className="yearly-swing">{formatDuration(interval.swing)}</td>
    </tr>
  );
}

function MonthColumn({ point, peak }: { point: MonthlyPoint; peak: number }) {
  const daylightPct = (point.daylight / peak) * 100;
  const nightPct = (point.night / peak) * 100;

  return (
    <div className="yearly-col">
      <div className="yearly-bars">
        <div
          className="yearly-bar yearly-bar-daylight"
          style={{ height: `${daylightPct}%` }}
          title={`Daylight ${formatDuration(point.daylight)}`}
        />
        <div
          className="yearly-bar yearly-bar-night"
          style={{ height: `${nightPct}%` }}
          title={`Night ${formatDuration(point.night)}`}
        />
      </div>
      <span className="yearly-col-label">{monthName(point.month)}</span>
    </div>
  );
}
