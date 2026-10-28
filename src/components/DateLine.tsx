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
          <span className="dateline-hijri">{hijri}</span>
        </>
      )}
    </div>
  );
}
