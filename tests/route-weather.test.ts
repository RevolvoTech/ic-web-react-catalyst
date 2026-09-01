import { describe, expect, it } from "vitest";
import { isRouteWeatherAnalysis } from "../lib/route-weather";

const analysis = {
  schemaVersion: "catalyst.weather.route.v1",
  mode: "live",
  source: { name: "Open-Meteo", model: "ECMWF IFS 0.25°", license: "CC BY 4.0", attributionUrl: "https://open-meteo.com/" },
  retrievedAt: "2026-09-01T00:00:00.000Z",
  forecastWindowHours: 24,
  segments: [{ segmentId: "segment-1", segmentName: "Segment 1", representative: { latitude: 35.2, longitude: 74.5, elevationM: 7_200, altitudeBand: "Camp 4 band" }, thresholdWindKmh: 60, forecastWindowHours: 24, peakWindKmh: 48, peakGustKmh: 61, status: "near-threshold", explanation: "Forecast wind is near the configured threshold." }],
  notice: "Decision support only.",
};

describe("route weather contract", () => {
  it("accepts altitude-aware advisory evidence", () => {
    expect(isRouteWeatherAnalysis(analysis)).toBe(true);
  });

  it("rejects safety labels and incomplete provenance", () => {
    expect(isRouteWeatherAnalysis({ ...analysis, segments: [{ ...analysis.segments[0], status: "safe" }] })).toBe(false);
    expect(isRouteWeatherAnalysis({ ...analysis, source: { ...analysis.source, license: undefined } })).toBe(false);
  });
});
