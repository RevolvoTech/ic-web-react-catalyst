export const WEATHER_SCHEMA_VERSION = "catalyst.weather.snapshot.v1" as const;

export type WeatherFreshness = "current" | "stale" | "offline";
export type WeatherWindowAssessment = "favorable" | "mixed" | "unfavorable";

export interface WeatherHour {
  time: string;
  temperatureC: number | null;
  precipitationMm: number | null;
  snowfallCm: number | null;
  cloudCoverPercent: number | null;
  visibilityM: number | null;
  surfacePressureHpa: number | null;
  windSpeedKmh: number | null;
  windDirectionDegrees: number | null;
  windGustKmh: number | null;
  pressureLevelWindKmh: { hpa300: number | null; hpa500: number | null; hpa850: number | null };
}
export interface SummitWindow {
  start: string;
  end: string;
  score: number;
  assessment: WeatherWindowAssessment;
  limitingFactors: string[];
  peakWindKmh: number | null;
  peakGustKmh: number | null;
  snowfallCm: number | null;
  minimumVisibilityM: number | null;
}

export interface WeatherSnapshot {
  schemaVersion: typeof WEATHER_SCHEMA_VERSION;
  mode: "live";
  freshness: WeatherFreshness;
  source: {
    name: "Open-Meteo";
    model: string;
    modelRunAt: string | null;
    protocol: string;
    license: string;
    attributionUrl: string;
  };
  location: { latitude: number; longitude: number; elevationM: number; name: string };
  retrievedAt: string;
  freshnessWindowMinutes: number;
  forecastHours: WeatherHour[];
  summitWindows: SummitWindow[];
  notice: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isWeatherHour(value: unknown): value is WeatherHour {
  return isRecord(value) && isRecord(value.pressureLevelWindKmh) && isTimestamp(value.time) &&
    isNullableNumber(value.temperatureC) && isNullableNumber(value.precipitationMm) &&
    isNullableNumber(value.snowfallCm) && isNullableNumber(value.cloudCoverPercent) &&
    isNullableNumber(value.visibilityM) && isNullableNumber(value.surfacePressureHpa) &&
    isNullableNumber(value.windSpeedKmh) && isNullableNumber(value.windDirectionDegrees) &&
    isNullableNumber(value.windGustKmh) && isNullableNumber(value.pressureLevelWindKmh.hpa300) &&
    isNullableNumber(value.pressureLevelWindKmh.hpa500) && isNullableNumber(value.pressureLevelWindKmh.hpa850);
}

function isSummitWindow(value: unknown): value is SummitWindow {
  return isRecord(value) && isTimestamp(value.start) && isTimestamp(value.end) &&
    typeof value.score === "number" && value.score >= 0 && value.score <= 100 &&
    ["favorable", "mixed", "unfavorable"].includes(String(value.assessment)) &&
    Array.isArray(value.limitingFactors) && value.limitingFactors.every((factor) => typeof factor === "string") &&
    isNullableNumber(value.peakWindKmh) && isNullableNumber(value.peakGustKmh) &&
    isNullableNumber(value.snowfallCm) && isNullableNumber(value.minimumVisibilityM);
}

export function isWeatherSnapshot(value: unknown): value is WeatherSnapshot {
  return isRecord(value) && isRecord(value.source) && isRecord(value.location) &&
    value.schemaVersion === WEATHER_SCHEMA_VERSION && value.mode === "live" &&
    ["current", "stale", "offline"].includes(String(value.freshness)) &&
    value.source.name === "Open-Meteo" && typeof value.source.model === "string" &&
    (value.source.modelRunAt === null || isTimestamp(value.source.modelRunAt)) &&
    typeof value.source.protocol === "string" && typeof value.source.license === "string" &&
    typeof value.source.attributionUrl === "string" && typeof value.location.latitude === "number" &&
    typeof value.location.longitude === "number" && typeof value.location.elevationM === "number" &&
    typeof value.location.name === "string" && isTimestamp(value.retrievedAt) &&
    typeof value.freshnessWindowMinutes === "number" && Array.isArray(value.forecastHours) &&
    value.forecastHours.length >= 24 && value.forecastHours.every(isWeatherHour) &&
    Array.isArray(value.summitWindows) && value.summitWindows.every(isSummitWindow) &&
    typeof value.notice === "string";
}

export function weatherDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { timeZone: "UTC", ...options }).format(new Date(value));
}

export function weatherValue(value: number | null, unit: string, digits = 0) {
  return value === null ? "Not supplied" : `${value.toFixed(digits)} ${unit}`;
}
