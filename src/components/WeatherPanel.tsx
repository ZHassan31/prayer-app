import {
  ageLabel,
  describeWeather,
  isStale,
  weekdayLabel,
  windDirection,
  type Weather,
} from '../lib/weather';

interface Props {
  weather: Weather | null;
  loading: boolean;
  timezone: string;
  now: Date;
}

/** Rounds to a whole degree — decimals are noise at three metres. */
function temp(value: number): string {
  return `${Math.round(value)}°`;
}

export function WeatherPanel({ weather, loading, timezone, now }: Props) {
  if (!weather) {
    return (
      <section className="weather" aria-label="Weather">
        <p className="weather-empty">
          {loading ? 'Loading weather…' : 'Weather unavailable'}
        </p>
      </section>
    );
  }

  const { current, days } = weather;
  const condition = describeWeather(current.weatherCode);
  const stale = isStale(weather, now);

  // Today is the first entry; the next five follow it.
  const forecast = days.slice(1, 6);

  return (
    <section className="weather" aria-label="Weather">
      <div className="weather-now">
        <span className="weather-glyph" aria-hidden="true">
          {condition.glyph}
        </span>
        <div className="weather-now-text">
          <span className="weather-temp">{temp(current.temperature)}</span>
          <span className="weather-condition">{condition.label}</span>
        </div>
        <div className="weather-meta">
          <span>Feels {temp(current.apparentTemperature)}</span>
          <span>
            {Math.round(current.windSpeed)} km/h {windDirection(current.windDirection)}
          </span>
          <span>{Math.round(current.humidity)}% humidity</span>
        </div>
      </div>

      <ul className="weather-days">
        {forecast.map((day) => {
          const dayCondition = describeWeather(day.weatherCode);
          return (
            <li key={day.date} className="weather-day">
              <span className="weather-day-name">
                {weekdayLabel(day.date, timezone)}
              </span>
              <span className="weather-day-glyph" aria-hidden="true">
                {dayCondition.glyph}
              </span>
              <span className="weather-day-pop">
                {day.precipitationProbability > 0
                  ? `${Math.round(day.precipitationProbability)}%`
                  : ''}
              </span>
              <span className="weather-day-temps">
                <span className="weather-day-max">{temp(day.tempMax)}</span>
                <span className="weather-day-min">{temp(day.tempMin)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="weather-foot">
        {stale && <span className="weather-stale">stale · </span>}
        <span className="weather-age">{ageLabel(weather, now)}</span>
        <span className="weather-credit">
          {' · '}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Open-Meteo
          </a>
        </span>
      </p>
    </section>
  );
}
