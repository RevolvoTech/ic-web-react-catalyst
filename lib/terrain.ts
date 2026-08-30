export const TERRAIN_SCHEMA_VERSION = "catalyst.terrain.v1" as const;

export type TerrainSlopeClass = "gentle" | "moderate" | "steep" | "very-steep" | "unknown";

export interface TerrainIntersection {
  segmentId: string;
  segmentName: string;
  sampledPointCount: number;
  averageTerrainSlopeDegrees: number | null;
  maximumTerrainSlopeDegrees: number | null;
  slopeClass: TerrainSlopeClass;
  interpretation: string;
}

export interface TerrainAnalysis {
  schemaVersion: typeof TERRAIN_SCHEMA_VERSION;
  mode: "live";
  source: { name: "Copernicus DEM"; dataset: "GLO-30"; nominalResolutionM: 30; protocol: "Sentinel Hub Process API" };
  retrievedAt: string;
  raster: { width: number; height: number; effectiveResolutionM: number; validPixelPercent: number };
  intersections: TerrainIntersection[];
  notice: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableNumber(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function intersection(value: unknown): value is TerrainIntersection {
  return record(value) && typeof value.segmentId === "string" && typeof value.segmentName === "string" && typeof value.sampledPointCount === "number" && nullableNumber(value.averageTerrainSlopeDegrees) && nullableNumber(value.maximumTerrainSlopeDegrees) && ["gentle", "moderate", "steep", "very-steep", "unknown"].includes(String(value.slopeClass)) && typeof value.interpretation === "string";
}

export function isTerrainAnalysis(value: unknown): value is TerrainAnalysis {
  return record(value) && value.schemaVersion === TERRAIN_SCHEMA_VERSION && value.mode === "live" && record(value.source) && value.source.name === "Copernicus DEM" && value.source.dataset === "GLO-30" && record(value.raster) && typeof value.raster.effectiveResolutionM === "number" && typeof value.raster.validPixelPercent === "number" && Array.isArray(value.intersections) && value.intersections.every(intersection) && typeof value.retrievedAt === "string" && typeof value.notice === "string";
}
