"use client";

import { AlertTriangle, CloudSnow, Gauge, RefreshCw, Wind } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  isWeatherSnapshot,
  weatherDate,
  weatherValue,
  type SummitWindow,
  type WeatherHour,
  type WeatherSnapshot,
} from "@/lib/weather";

const WEATHER_QUERY = new URLSearchParams({
  latitude: "35.2375",
  longitude: "74.5892",
  elevationM: "8126",
  name: "Nanga Parbat summit",
});

function errorMessage(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = value.error;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return null;
}

interface DailyWeather {
  date: string;
  lowC: number | null;
  highC: number | null;
  windKmh: number | null;
  gustKmh: number | null;
  snowfallCm: number | null;
}

function available(values: (number | null)[]) {
  return values.filter((value): value is number => value !== null);
}

function aggregateDaily(hours: WeatherHour[]) {
  const grouped = new Map<string, WeatherHour[]>();
  for (const hour of hours) {
    const key = hour.time.slice(0, 10);
    grouped.set(key, [...(grouped.get(key) ?? []), hour]);
  }
  return [...grouped.entries()].map<DailyWeather>(([date, day]) => {
    const temperatures = available(day.map((hour) => hour.temperatureC));
    const wind = available(day.map((hour) => hour.windSpeedKmh));
    const gust = available(day.map((hour) => hour.windGustKmh));
    const snowfall = available(day.map((hour) => hour.snowfallCm));
    return {
      date: `${date}T00:00:00.000Z`,
      lowC: temperatures.length ? Math.min(...temperatures) : null,
      highC: temperatures.length ? Math.max(...temperatures) : null,
      windKmh: wind.length ? Math.max(...wind) : null,
      gustKmh: gust.length ? Math.max(...gust) : null,
      snowfallCm: snowfall.length ? snowfall.reduce((total, value) => total + value, 0) : null,
    };
  });
}

function WindowRow({ window, rank }: { window: SummitWindow; rank: number }) {
  const tone = window.assessment === "favorable" ? "success" : window.assessment === "mixed" ? "warning" : "critical";
  return (
    <li>
      <span className="weather-window__rank">{String(rank).padStart(2, "0")}</span>
      <div>
        <strong>{weatherDate(window.start, { weekday: "short", month: "short", day: "numeric" })}</strong>
        <span>{weatherDate(window.start, { hour: "2-digit", minute: "2-digit" })}–{weatherDate(window.end, { hour: "2-digit", minute: "2-digit" })} UTC</span>
      </div>
      <StatusBadge tone={tone}>{window.assessment}</StatusBadge>
      <div className="weather-window__score"><strong>{window.score}</strong><span>/100</span></div>
      <p>{window.limitingFactors.join(" · ")}</p>
    </li>
  );
}

function WindProfile({ hours }: { hours: WeatherHour[] }) {
  const points = hours.slice(0, 24);
  const numeric = points.map((point) => point.windSpeedKmh ?? 0);
  const maximum = Math.max(1, ...numeric);
  const path = numeric.map((value, index) => `${index === 0 ? "M" : "L"} ${(index / Math.max(1, numeric.length - 1)) * 600} ${140 - (value / maximum) * 120}`).join(" ");
  return (
    <div className="weather-chart">
      <svg viewBox="0 0 600 160" role="img" aria-labelledby="weather-chart-title weather-chart-description">
        <title id="weather-chart-title">Twenty-four hour summit wind forecast</title>
        <desc id="weather-chart-description">A line chart of hourly wind speed. Exact values are available in the table below.</desc>
        <line x1="0" y1="140" x2="600" y2="140" />
        <path d={path} />
      </svg>
      <details>
        <summary>View hourly wind values</summary>
        <div className="weather-table-scroll">
          <table><thead><tr><th>Time UTC</th><th>Wind</th><th>Gust</th><th>Visibility</th></tr></thead><tbody>
            {points.map((hour) => <tr key={hour.time}><td>{weatherDate(hour.time, { hour: "2-digit", minute: "2-digit" })}</td><td>{weatherValue(hour.windSpeedKmh, "km/h")}</td><td>{weatherValue(hour.windGustKmh, "km/h")}</td><td>{weatherValue(hour.visibilityM, "m")}</td></tr>)}
          </tbody></table>
        </div>
      </details>
    </div>
  );
}

export function WeatherPanel() {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/weather/snapshot?${WEATHER_QUERY}`, { headers: { accept: "application/json" } });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload) ?? "Weather request failed.");
      if (!isWeatherSnapshot(payload)) throw new Error("The weather service returned an unexpected response.");
      setSnapshot(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Weather request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWeather(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWeather]);

  const daily = useMemo(() => aggregateDaily(snapshot?.forecastHours ?? []), [snapshot]);
  const current = snapshot?.forecastHours[0] ?? null;

  return (
    <section className="weather-section shell" aria-labelledby="weather-title">
      <div className="weather-section__heading">
        <div><p className="eyebrow">Live mountain weather</p><h2 id="weather-title">Read the window.<br /><em>See what limits it.</em></h2></div>
        <div>
          <StatusBadge tone={snapshot?.freshness === "current" ? "success" : snapshot?.freshness === "offline" || error ? "critical" : "unknown"}>
            {snapshot?.freshness === "current" ? "Current" : snapshot?.freshness === "offline" ? "Offline · last known" : error ? "Unavailable" : "Connecting"}
          </StatusBadge>
          <p>Ten-day ECMWF guidance normalized through Catalyst. Window scores explain threshold pressure; the expedition leader makes the decision.</p>
          <button className="button button--secondary" type="button" onClick={() => void loadWeather()} disabled={loading}><RefreshCw aria-hidden="true" /> {loading ? "Refreshing…" : "Refresh forecast"}</button>
        </div>
      </div>

      {error ? <div className="weather-alert" role="alert"><AlertTriangle aria-hidden="true" /><div><strong>Forecast unavailable</strong><p>{error}</p></div></div> : null}

      {snapshot ? (
        <div className="weather-console">
          <header><div><span className="data-label">Forecast location</span><h3>{snapshot.location.name} · {snapshot.location.elevationM.toLocaleString()} m</h3></div><div><span>Source {snapshot.source.name}</span><span>Retrieved {weatherDate(snapshot.retrievedAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} UTC</span></div></header>
          <div className="weather-days" role="region" aria-label="Ten-day forecast; scroll horizontally for later days" tabIndex={0}>
            {daily.map((day) => <article key={day.date}><span>{weatherDate(day.date, { weekday: "short" })}</span><strong>{weatherDate(day.date, { month: "short", day: "numeric" })}</strong><dl><div><dt>Temperature</dt><dd>{weatherValue(day.lowC, "°C")} / {weatherValue(day.highC, "°C")}</dd></div><div><dt>Wind / gust</dt><dd>{weatherValue(day.windKmh, "km/h")} / {weatherValue(day.gustKmh, "km/h")}</dd></div><div><dt>Snowfall</dt><dd>{weatherValue(day.snowfallCm, "cm", 1)}</dd></div></dl></article>)}
          </div>
          <div className="weather-analysis">
            <div className="weather-analysis__windows"><div className="weather-panel-title"><Gauge aria-hidden="true" /><div><span className="data-label">Summit window advisory</span><h3>Best six-hour periods</h3></div></div><ol>{snapshot.summitWindows.slice(0, 4).map((window, index) => <WindowRow key={window.start} window={window} rank={index + 1} />)}</ol></div>
            <div className="weather-analysis__detail">
              <div className="weather-panel-title"><Wind aria-hidden="true" /><div><span className="data-label">Jet-stream monitor</span><h3>Pressure-level wind</h3></div></div>
              <dl className="jet-levels"><div><dt>300 hPa</dt><dd>{weatherValue(current?.pressureLevelWindKmh.hpa300 ?? null, "km/h")}</dd></div><div><dt>500 hPa</dt><dd>{weatherValue(current?.pressureLevelWindKmh.hpa500 ?? null, "km/h")}</dd></div><div><dt>850 hPa</dt><dd>{weatherValue(current?.pressureLevelWindKmh.hpa850 ?? null, "km/h")}</dd></div></dl>
              <div className="weather-panel-title weather-panel-title--chart"><CloudSnow aria-hidden="true" /><div><span className="data-label">Next 24 hours</span><h3>Summit wind trend</h3></div></div>
              <WindProfile hours={snapshot.forecastHours} />
            </div>
          </div>
          <footer className="operations-console__footer"><span>Model: {snapshot.source.model}</span><span>Model run: Not supplied</span><span>License: {snapshot.source.license}</span><span>Decision support · Human review required</span></footer>
        </div>
      ) : loading ? <div className="weather-loading" role="status"><span className="page-loading__signal" aria-hidden="true" /> Loading live forecast…</div> : null}
    </section>
  );
}
