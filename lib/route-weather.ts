export const ROUTE_WEATHER_SCHEMA_VERSION = "catalyst.weather.route.v1" as const;

export type RouteWeatherStatus = "within-threshold" | "near-threshold" | "exceeds-threshold" | "unavailable";

export interface RouteWeatherSegment {
  segmentId: string;
  segmentName: string;
  representative: { latitude: number; longitude: number; elevationM: number | null; altitudeBand: string };
  thresholdWindKmh: number | null;
  forecastWindowHours: 24;
  peakWindKmh: number | null;
  peakGustKmh: number | null;
  status: RouteWeatherStatus;
  explanation: string;
}

export interface RouteWeatherAnalysis {
  schemaVersion: typeof ROUTE_WEATHER_SCHEMA_VERSION;
  mode: "live";
  source: { name: "Open-Meteo"; model: "ECMWF IFS 0.25°"; license: "CC BY 4.0"; attributionUrl: "https://open-meteo.com/" };
  retrievedAt: string;
  forecastWindowHours: 24;
  segments: RouteWeatherSegment[];
  notice: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableNumber(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function segment(value: unknown): value is RouteWeatherSegment {
  return record(value)
    && typeof value.segmentId === "string"
    && typeof value.segmentName === "string"
    && record(value.representative)
    && typeof value.representative.latitude === "number"
    && typeof value.representative.longitude === "number"
    && nullableNumber(value.representative.elevationM)
    && typeof value.representative.altitudeBand === "string"
    && nullableNumber(value.thresholdWindKmh)
    && value.forecastWindowHours === 24
    && nullableNumber(value.peakWindKmh)
    && nullableNumber(value.peakGustKmh)
    && ["within-threshold", "near-threshold", "exceeds-threshold", "unavailable"].includes(String(value.status))
    && typeof value.explanation === "string";
}

export function isRouteWeatherAnalysis(value: unknown): value is RouteWeatherAnalysis {
  return record(value)
    && value.schemaVersion === ROUTE_WEATHER_SCHEMA_VERSION
    && value.mode === "live"
    && record(value.source)
    && value.source.name === "Open-Meteo"
    && value.source.model === "ECMWF IFS 0.25°"
    && value.source.license === "CC BY 4.0"
    && value.source.attributionUrl === "https://open-meteo.com/"
    && typeof value.retrievedAt === "string"
    && value.forecastWindowHours === 24
    && Array.isArray(value.segments)
    && value.segments.every(segment)
    && typeof value.notice === "string";
}
