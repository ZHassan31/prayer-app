import { formatClock } from '../lib/format';
import type { PrayerEntry, Selection } from '../lib/prayer';

interface Props {
  schedule: PrayerEntry[];
  selection: Selection;
  timeZone: string;
  use24Hour: boolean;
  now: Date;
}

export function PrayerList({
  schedule,
  selection,
  timeZone,
  use24Hour,
  now,
}: Props) {
  /* Show today's six events (yesterday/tomorrow are only for lookups). */
  const today = schedule.filter((entry) => {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(entry.time);
    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    return day === todayKey;
  });

  const rows = today.length > 0 ? today : schedule.slice(0, 6);

  return (
    <ul className="prayer-list">
      {rows.map((entry) => {
        const isNext = selection.next?.time.getTime() === entry.time.getTime();
        const isCurrent =
          selection.previous?.time.getTime() === entry.time.getTime();
        const isPast = entry.time.getTime() < now.getTime();

        return (
          <li
            key={`${entry.key}-${entry.time.toISOString()}`}
            className={[
              'prayer-row',
              isNext ? 'is-next' : '',
              isCurrent ? 'is-current' : '',
              isPast && !isCurrent ? 'is-past' : '',
              entry.isPrayer ? '' : 'is-secondary',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="row-name">
              {entry.label}
              <span className="row-arabic" lang="ar" dir="rtl">
                {entry.arabic}
              </span>
            </span>
            <span className="row-time">
              {formatClock(entry.time, timeZone, use24Hour)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
