import { formatClockWithSeconds } from '../lib/format';

interface Props {
  now: Date;
  timeZone: string;
  use24Hour: boolean;
  showSeconds: boolean;
}

export function Clock({ now, timeZone, use24Hour, showSeconds }: Props) {
  const text = showSeconds
    ? formatClockWithSeconds(now, timeZone, use24Hour)
    : formatClockWithSeconds(now, timeZone, use24Hour).slice(0, 5);

  return (
    <time className="clock" dateTime={now.toISOString()}>
      {text}
    </time>
  );
}
