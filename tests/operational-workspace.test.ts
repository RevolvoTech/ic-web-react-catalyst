import { describe, expect, it } from "vitest";
import {
  aoiFromRoute,
  aoiFromWaypoints,
  bboxFromPoints,
  isWorkspaceAoi,
} from "../lib/operational-workspace";
import type { RouteAnalysis } from "../lib/route";

const route: RouteAnalysis = {
  schemaVersion: "catalyst.route.v1",
  id: "route-1",
  name: "Demo ridge",
  status: "draft",
  points: [
    { latitude: 35.7, longitude: 76.48, elevationM: 4_800, time: null, cumulativeDistanceKm: 0 },
    { latitude: 35.76, longitude: 76.55, elevationM: 6_200, time: null, cumulativeDistanceKm: 8.2 },
  ],
  waypoints: [],
  segments: [],
  summary: {
    distanceKm: 8.2,
    elevationGainM: 1_400,
    elevationLossM: 0,
    minimumElevationM: 4_800,
    maximumElevationM: 6_200,
    estimatedHours: 6,
  },
  source: { format: "GPX 1.x", analyzedAt: "2026-09-07T00:00:00.000Z", pointCount: 2 },
  terrainAssessment: {
    method: "route-gradient-only",
    coverage: "partial",
    notice: "Terrain screening requires DEM evidence.",
  },
};

describe("operational workspace area", () => {
  it("pads a route bounding box", () => {
    const bbox = bboxFromPoints(route.points);
    expect(bbox).not.toBeNull();
    expect(bbox?.[0]).toBeCloseTo(76.4695, 5);
    expect(bbox?.[1]).toBeCloseTo(35.69, 5);
    expect(bbox?.[2]).toBeCloseTo(76.5605, 5);
    expect(bbox?.[3]).toBeCloseTo(35.77, 5);
  });

  it("uses the route high point for weather and the whole route for imagery", () => {
    const area = aoiFromRoute(route);
    expect(area.name).toBe("Demo ridge");
    expect(area.latitude).toBe(35.76);
    expect(area.longitude).toBe(76.55);
    expect(area.elevationM).toBe(6_200);
    expect(isWorkspaceAoi(area)).toBe(true);
  });

  it("requires at least two demonstration waypoints", () => {
    expect(aoiFromWaypoints([{ id: "one", latitude: 35.7, longitude: 76.48, elevationM: 4_800 }])).toBeNull();
    expect(aoiFromWaypoints([
      { id: "one", latitude: 35.7, longitude: 76.48, elevationM: 4_800 },
      { id: "two", latitude: 35.71, longitude: 76.5, elevationM: 5_000 },
    ])?.source).toBe("waypoints");
  });
});
