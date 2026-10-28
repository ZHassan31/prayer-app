import { formatClock } from '../lib/format';

interface Props {
  now: Date;
  timeZone: string;
  use24Hour: boolean;
}

export function Clock({ now, timeZone, use24Hour }: Props) {
  return (
    <time className="clock" dateTime={now.toISOString()}>
      {formatClock(now, timeZone, use24Hour)}
    </time>
  );
}
