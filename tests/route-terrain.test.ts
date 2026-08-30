import { describe, expect, it } from "vitest";
import { isRouteAnalysis, routeValue } from "../lib/route";
import { isTerrainAnalysis } from "../lib/terrain";

const route = {
  schemaVersion: "catalyst.route.v1",
  id: "route-1",
  name: "Test route",
  status: "draft",
  points: [
    { latitude: 35.2, longitude: 74.5, elevationM: 7_000, time: null, cumulativeDistanceKm: 0 },
    { latitude: 35.3, longitude: 74.6, elevationM: 7_500, time: null, cumulativeDistanceKm: 2 },
  ],
  waypoints: [],
  segments: [{ id: "segment-1", name: "Segment 1", fromPointIndex: 0, toPointIndex: 1, distanceKm: 2, elevationGainM: 500, elevationLossM: 0, estimatedHours: 1.3, maximumRouteGradientDegrees: 30, gradientClass: "steep", riskLevel: "pending" }],
  summary: { distanceKm: 2, elevationGainM: 500, elevationLossM: 0, minimumElevationM: 7_000, maximumElevationM: 7_500, estimatedHours: 1.3 },
  source: { format: "GPX 1.x", analyzedAt: "2026-08-30T12:00:00.000Z", pointCount: 2 },
  terrainAssessment: { method: "route-gradient-only", coverage: "partial", notice: "DEM not included." },
};

const terrain = {
  schemaVersion: "catalyst.terrain.v1",
  mode: "live",
  source: { name: "Copernicus DEM", dataset: "GLO-30", nominalResolutionM: 30, protocol: "Sentinel Hub Process API" },
  retrievedAt: "2026-08-30T12:00:00.000Z",
  raster: { width: 256, height: 256, effectiveResolutionM: 31, validPixelPercent: 98.4 },
  intersections: [{ segmentId: "segment-1", segmentName: "Segment 1", sampledPointCount: 2, averageTerrainSlopeDegrees: 28, maximumTerrainSlopeDegrees: 36, slopeClass: "steep", interpretation: "Specialist review required." }],
  notice: "Not a safety declaration.",
};

describe("route and terrain contracts", () => {
  it("accepts normalized route and terrain evidence", () => {
    expect(isRouteAnalysis(route)).toBe(true);
    expect(isTerrainAnalysis(terrain)).toBe(true);
  });

  it("rejects safety labels and preserves missing values", () => {
    expect(isTerrainAnalysis({ ...terrain, intersections: [{ ...terrain.intersections[0], slopeClass: "safe" }] })).toBe(false);
    expect(routeValue(null, "m")).toBe("Not supplied");
  });
});
