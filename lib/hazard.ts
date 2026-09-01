import { isTerrainAnalysis, type TerrainAnalysis } from "./terrain";

export const HAZARD_ANALYSIS_SCHEMA_VERSION = "catalyst.hazard.analysis.v1" as const;
export type HazardRiskLevel = "low" | "moderate" | "high" | "critical" | "unknown";

export interface HazardZoneFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: {
    schemaVersion: "catalyst.hazard.zone.v1";
    name: string;
    type: "avalanche" | "rockfall";
    terrainClass: "runout-screen" | "track-screen" | "release-screen" | "very-steep-screen";
    riskLevel: Exclude<HazardRiskLevel, "unknown">;
    elevationRange: { minimumM: number; maximumM: number };
    slopeP90Degrees: number;
    meanAspectDegrees: number;
    meanCurvature: number;
    maximumFlowAccumulationCells: number;
    dataSource: string;
    assessedAt: string;
    assessedBy: string;
    satelliteSceneDate: null;
    notes: string;
  };
}

export interface RouteHazardIntersection {
  segmentId: string;
  segmentName: string;
  zoneCount: number;
  zoneIds: string[];
  maximumRiskLevel: HazardRiskLevel;
  screenedDistanceKm: number;
  screenedPercent: number;
  summary: string;
  humanReviewRequired: true;
}

export interface HazardAnalysis {
  schemaVersion: typeof HAZARD_ANALYSIS_SCHEMA_VERSION;
  mode: "live";
  source: { name: "Copernicus DEM terrain screening"; dataset: "GLO-30" | "GLO-90"; method: "slope-aspect-curvature-d8-flow" };
  retrievedAt: string;
  terrain: TerrainAnalysis;
  zones: { type: "FeatureCollection"; features: HazardZoneFeature[] };
  intersections: RouteHazardIntersection[];
  notice: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function polygon(value: unknown) {
  return record(value) && value.type === "Polygon" && Array.isArray(value.coordinates) && value.coordinates.every((ring) => Array.isArray(ring) && ring.every((point) => Array.isArray(point) && point.length === 2 && point.every(finite)));
}

function zone(value: unknown): value is HazardZoneFeature {
  if (!record(value) || value.type !== "Feature" || typeof value.id !== "string" || !polygon(value.geometry) || !record(value.properties)) return false;
  const properties = value.properties;
  return properties.schemaVersion === "catalyst.hazard.zone.v1"
    && typeof properties.name === "string"
    && ["avalanche", "rockfall"].includes(String(properties.type))
    && ["runout-screen", "track-screen", "release-screen", "very-steep-screen"].includes(String(properties.terrainClass))
    && ["low", "moderate", "high", "critical"].includes(String(properties.riskLevel))
    && record(properties.elevationRange)
    && finite(properties.elevationRange.minimumM)
    && finite(properties.elevationRange.maximumM)
    && finite(properties.slopeP90Degrees)
    && finite(properties.meanAspectDegrees)
    && finite(properties.meanCurvature)
    && finite(properties.maximumFlowAccumulationCells)
    && typeof properties.dataSource === "string"
    && typeof properties.assessedAt === "string"
    && typeof properties.assessedBy === "string"
    && properties.satelliteSceneDate === null
    && typeof properties.notes === "string";
}

function intersection(value: unknown): value is RouteHazardIntersection {
  return record(value)
    && typeof value.segmentId === "string"
    && typeof value.segmentName === "string"
    && finite(value.zoneCount)
    && Array.isArray(value.zoneIds)
    && value.zoneIds.every((id) => typeof id === "string")
    && ["low", "moderate", "high", "critical", "unknown"].includes(String(value.maximumRiskLevel))
    && finite(value.screenedDistanceKm)
    && finite(value.screenedPercent)
    && typeof value.summary === "string"
    && value.humanReviewRequired === true;
}

export function isHazardAnalysis(value: unknown): value is HazardAnalysis {
  return record(value)
    && value.schemaVersion === HAZARD_ANALYSIS_SCHEMA_VERSION
    && value.mode === "live"
    && record(value.source)
    && value.source.name === "Copernicus DEM terrain screening"
    && ["GLO-30", "GLO-90"].includes(String(value.source.dataset))
    && value.source.method === "slope-aspect-curvature-d8-flow"
    && typeof value.retrievedAt === "string"
    && isTerrainAnalysis(value.terrain)
    && record(value.zones)
    && value.zones.type === "FeatureCollection"
    && Array.isArray(value.zones.features)
    && value.zones.features.every(zone)
    && Array.isArray(value.intersections)
    && value.intersections.every(intersection)
    && typeof value.notice === "string";
}
