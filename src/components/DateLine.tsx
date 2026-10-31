import { formatGregorian, formatHijri } from '../lib/format';

interface Props {
  now: Date;
  timeZone: string;
  hijriOffset: number;
}

export function DateLine({ now, timeZone, hijriOffset }: Props) {
  const gregorian = formatGregorian(now, timeZone);
  const hijri = formatHijri(now, timeZone, hijriOffset);

  return (
    <div className="dateline">
      <span className="dateline-gregorian">{gregorian}</span>
      {hijri && (
        <>
          <span className="dateline-dot" aria-hidden="true">
            ·
          </span>
          {/*
            Day, month and year are separate elements on purpose. The Arabic
            month is a right-to-left run, and a single mixed string lets the
            bidi algorithm absorb the year into it, rendering "day year
            month". Siblings keep the order fixed.
          */}
          <span className="dateline-hijri">
            <span className="dateline-hijri-day">{hijri.day}</span>{' '}
            <span className="dateline-hijri-month">{hijri.month}</span>{' '}
            <span className="dateline-hijri-year">{hijri.year}</span>
            <span className="dateline-hijri-era"> AH</span>
          </span>
        </>
      )}
    </div>
  );
}
