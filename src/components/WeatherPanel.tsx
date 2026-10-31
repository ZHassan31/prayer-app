import {
  ageLabel,
  describeWeather,
  hourLabel,
  isStale,
  weekdayLabel,
  windDirection,
  type Weather,
  type WeatherDay,
} from '../lib/weather';

interface Props {
  weather: Weather | null;
  loading: boolean;
  timezone: string;
  use24Hour: boolean;
  now: Date;
}

/** Rounds to a whole degree — decimals are noise at three metres. */
function temp(value: number): string {
  return `${Math.round(value)}°`;
}

/**
 * Where a day's temperature range sits on a shared scale, so the bars are
 * comparable across the week rather than each filling its own row.
 */
function rangePosition(
  day: WeatherDay,
  low: number,
  high: number,
): { left: number; width: number } {
  const span = Math.max(1, high - low);
  const left = ((day.tempMin - low) / span) * 100;
  const width = Math.max(6, ((day.tempMax - day.tempMin) / span) * 100);
  return { left: Math.min(100 - width, Math.max(0, left)), width };
}

export function WeatherPanel({
  weather,
  loading,
  timezone,
  use24Hour,
  now,
}: Props) {
  if (!weather) {
    return (
      <section className="weather" aria-label="Weather">
        <p className="weather-empty">
          {loading ? 'Loading weather…' : 'Weather unavailable'}
        </p>
      </section>
    );
  }

  const { current, hours, days } = weather;
  const condition = describeWeather(current.weatherCode);
  const stale = isStale(weather, now);

  // Today is the first entry; the following days fill the list.
  const [today, ...rest] = days;
  const forecast = rest.slice(0, 6);

  // Shared scale for the range bars across today plus the forecast.
  const allTemps = [today, ...forecast].flatMap((day) => [day.tempMin, day.tempMax]);
  const low = Math.min(...allTemps);
  const high = Math.max(...allTemps);

  return (
    <section className="weather" aria-label="Weather">
      {/* ---- headline ---- */}
      <div className="weather-head">
        <span
          className={`weather-glyph tone-${condition.tone}`}
          aria-hidden="true"
        >
          {condition.glyph}
        </span>
        <div className="weather-head-text">
          <span className="weather-temp">{temp(current.temperature)}</span>
          <span className="weather-condition">{condition.label}</span>
          <span className="weather-range">
            H:{temp(today.tempMax)} L:{temp(today.tempMin)}
          </span>
        </div>

        {/* Fills the empty right-hand side of the headline with the
            readings people actually look for beyond temperature. */}
        <dl className="weather-details">
          <div className="weather-detail">
            <dt>Humidity</dt>
            <dd>{Math.round(current.humidity)}%</dd>
          </div>
          <div className="weather-detail">
            <dt>Wind</dt>
            <dd>
              {Math.round(current.windSpeed)}
              <span className="weather-detail-unit"> km/h</span>{' '}
              {windDirection(current.windDirection)}
            </dd>
          </div>
          <div className="weather-detail">
            <dt>Rain</dt>
            <dd>
              {current.precipitation > 0
                ? `${current.precipitation.toFixed(1)} mm`
                : 'None'}
            </dd>
          </div>
        </dl>
      </div>

      {/* ---- hourly conditions ---- */}
      {hours.length > 0 && (
        <div className="weather-hours">
          <p className="weather-hours-title">Conditions</p>
          <ul className="weather-hour-list">
            {hours.map((hour, index) => {
              const hourCondition = describeWeather(hour.weatherCode);
              return (
                <li key={hour.time.toISOString()} className="weather-hour">
                  <span className="weather-hour-time">
                    {index === 0 ? 'Now' : hourLabel(hour.time, timezone, use24Hour)}
                  </span>
                  <span
                    className={`weather-hour-glyph tone-${hourCondition.tone}`}
                    aria-hidden="true"
                  >
                    {hourCondition.glyph}
                  </span>
                  <span className="weather-hour-temp">{temp(hour.temperature)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ---- daily forecast ---- */}
      <ul className="weather-days">
        {forecast.map((day) => {
          const dayCondition = describeWeather(day.weatherCode);
          const bar = rangePosition(day, low, high);
          return (
            <li key={day.date} className="weather-day">
              <span className="weather-day-name">
                {weekdayLabel(day.date, timezone)}
              </span>
              <span
                className={`weather-day-glyph tone-${dayCondition.tone}`}
                aria-hidden="true"
              >
                {dayCondition.glyph}
              </span>
              <span className="weather-day-pop">
                {day.precipitationProbability > 0
                  ? `${Math.round(day.precipitationProbability)}%`
                  : ''}
              </span>
              <span className="weather-day-min">{temp(day.tempMin)}</span>
              <span className="weather-day-bar" aria-hidden="true">
                <span
                  className="weather-day-bar-fill"
                  style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                />
              </span>
              <span className="weather-day-max">{temp(day.tempMax)}</span>
            </li>
          );
        })}
      </ul>

      <p className="weather-foot">
        {stale && <span className="weather-stale">stale · </span>}
        <span className="weather-age">{ageLabel(weather, now)}</span>
        <span className="weather-credit">
          {' · '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer noopener">
            Open-Meteo
          </a>
        </span>
      </p>
    </section>
  );
}