export const pad2 = (value: number): string => String(value).padStart(2, '0');

export function formatClock(
  date: Date,
  timeZone: string,
  use24Hour: boolean,
): string {
  return new Intl.DateTimeFormat(use24Hour ? 'en-GB' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
    timeZone,
  }).format(date);
}

export function formatClockWithSeconds(
  date: Date,
  timeZone: string,
  use24Hour: boolean,
): string {
  return new Intl.DateTimeFormat(use24Hour ? 'en-GB' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !use24Hour,
    timeZone,
  }).format(date);
}

export function formatGregorian(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(date);
}

export function formatHijri(
  date: Date,
  timeZone: string,
  offsetDays: number,
): string {
  const shifted = new Date(date.getTime() + offsetDays * 86_400_000);
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone,
    }).format(shifted);
  } catch {
    return '';
  }
}

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  text: string;
  short: string;
}

export function formatCountdown(ms: number): Countdown {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return {
    hours,
    minutes,
    seconds,
    text: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`,
    short:
      hours > 0
        ? `${hours}h ${pad2(minutes)}m`
        : minutes > 0
          ? `${minutes}m ${pad2(seconds)}s`
          : `${seconds}s`,
  };
}

/** "in 2h 15m" style label used in the header. */
export function humanizeCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) return `in ${hours}h ${pad2(minutes)}m`;
  if (minutes > 0) return `in ${minutes}m`;
  return 'in under a minute';
}
