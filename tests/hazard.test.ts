import { describe, expect, it } from "vitest";
import { isHazardAnalysis } from "../lib/hazard";

const terrain = { schemaVersion: "catalyst.terrain.v1", mode: "live", source: { name: "Copernicus DEM", dataset: "GLO-30", nominalResolutionM: 30, protocol: "Sentinel Hub Process API" }, retrievedAt: "2026-09-01T00:00:00.000Z", raster: { width: 16, height: 16, effectiveResolutionM: 30, validPixelPercent: 90 }, intersections: [], notice: "Screening only." };
const feature = { type: "Feature", id: "zone-1", geometry: { type: "Polygon", coordinates: [[[74.5, 35.2], [74.6, 35.2], [74.6, 35.3], [74.5, 35.3], [74.5, 35.2]]] }, properties: { schemaVersion: "catalyst.hazard.zone.v1", name: "Release terrain", type: "avalanche", terrainClass: "release-screen", riskLevel: "high", elevationRange: { minimumM: 7_000, maximumM: 7_500 }, slopeP90Degrees: 38, meanAspectDegrees: 120, meanCurvature: 0.01, maximumFlowAccumulationCells: 40, dataSource: "Copernicus DEM GLO-30", assessedAt: "2026-09-01T00:00:00.000Z", assessedBy: "Automated · human validation pending", satelliteSceneDate: null, notes: "Not observed." } };
const analysis = { schemaVersion: "catalyst.hazard.analysis.v1", mode: "live", source: { name: "Copernicus DEM terrain screening", dataset: "GLO-30", method: "slope-aspect-curvature-d8-flow" }, retrievedAt: "2026-09-01T00:00:00.000Z", terrain, zones: { type: "FeatureCollection", features: [feature] }, intersections: [{ segmentId: "segment-1", segmentName: "Segment 1", zoneCount: 1, zoneIds: ["zone-1"], maximumRiskLevel: "high", screenedDistanceKm: 1.2, screenedPercent: 60, summary: "Screening summary", humanReviewRequired: true }], notice: "Human review required." };

describe("hazard analysis contract", () => {
  it("accepts terrain-screening GeoJSON with attribution", () => expect(isHazardAnalysis(analysis)).toBe(true));
  it("rejects unapproved safety language as a risk level", () => expect(isHazardAnalysis({ ...analysis, zones: { ...analysis.zones, features: [{ ...feature, properties: { ...feature.properties, riskLevel: "safe" } }] } })).toBe(false));
});
