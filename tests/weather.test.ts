import { describe, expect, it } from "vitest";
import { isWeatherSnapshot, weatherValue } from "../lib/weather";

const hour = {
  time: "2026-08-30T12:00:00.000Z",
  temperatureC: -18,
  precipitationMm: 0,
  snowfallCm: 0,
  cloudCoverPercent: 20,
  visibilityM: 10_000,
  surfacePressureHpa: 360,
  windSpeedKmh: 25,
  windDirectionDegrees: 270,
  windGustKmh: 35,
  pressureLevelWindKmh: { hpa300: 110, hpa500: 65, hpa850: 25 },
};

const snapshot = {
  schemaVersion: "catalyst.weather.snapshot.v1",
  mode: "live",
  freshness: "current",
  source: {
    name: "Open-Meteo",
    model: "ECMWF IFS 0.25°",
    modelRunAt: null,
    protocol: "HTTPS JSON",
    license: "CC BY 4.0",
    attributionUrl: "https://open-meteo.com/",
  },
  location: { latitude: 35.2375, longitude: 74.5892, elevationM: 8_126, name: "Nanga Parbat summit" },
  retrievedAt: "2026-08-30T12:00:00.000Z",
  freshnessWindowMinutes: 60,
  forecastHours: Array.from({ length: 24 }, (_, index) => ({ ...hour, time: `2026-08-30T${String(index).padStart(2, "0")}:00:00.000Z` })),
  summitWindows: [{
    start: "2026-08-30T00:00:00.000Z",
    end: "2026-08-30T05:00:00.000Z",
    score: 82,
    assessment: "favorable",
    limitingFactors: ["No configured threshold exceeded"],
    peakWindKmh: 25,
    peakGustKmh: 35,
    snowfallCm: 0,
    minimumVisibilityM: 10_000,
  }],
  notice: "Forecast guidance only.",
};

describe("weather contract", () => {
  it("accepts normalized live data and rejects unsupported safety labels", () => {
    expect(isWeatherSnapshot(snapshot)).toBe(true);
    expect(isWeatherSnapshot({ ...snapshot, summitWindows: [{ ...snapshot.summitWindows[0], assessment: "safe" }] })).toBe(false);
  });

  it("preserves missing weather values instead of displaying zero", () => {
    expect(weatherValue(null, "km/h")).toBe("Not supplied");
    expect(weatherValue(0, "cm", 1)).toBe("0.0 cm");
  });
});
