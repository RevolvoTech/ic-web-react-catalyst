export const ROUTE_SCHEMA_VERSION = "catalyst.route.v1" as const;

export interface RoutePoint {
  latitude: number;
  longitude: number;
  elevationM: number | null;
  time: string | null;
  cumulativeDistanceKm: number;
}

export interface RouteWaypoint {
  name: string;
  type: "camp" | "hazard" | "waypoint" | "summit";
  latitude: number;
  longitude: number;
  elevationM: number | null;
}

export interface RouteSegment {
  id: string;
  name: string;
  fromPointIndex: number;
  toPointIndex: number;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  estimatedHours: number;
  maximumRouteGradientDegrees: number | null;
  gradientClass: "level" | "steep" | "very-steep" | "extreme" | "unknown";
  riskLevel: "pending";
}

export interface RouteAnalysis {
  schemaVersion: typeof ROUTE_SCHEMA_VERSION;
  id: string;
  name: string;
  status: "draft";
  points: RoutePoint[];
  waypoints: RouteWaypoint[];
  segments: RouteSegment[];
  summary: {
    distanceKm: number;
    elevationGainM: number;
    elevationLossM: number;
    minimumElevationM: number | null;
    maximumElevationM: number | null;
    estimatedHours: number;
  };
  source: { format: "GPX 1.x"; analyzedAt: string; pointCount: number };
  terrainAssessment: { method: "route-gradient-only"; coverage: "partial"; notice: string };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nullableFinite(value: unknown): value is number | null {
  return value === null || finite(value);
}

function point(value: unknown): value is RoutePoint {
  return record(value) && finite(value.latitude) && finite(value.longitude) && nullableFinite(value.elevationM) && finite(value.cumulativeDistanceKm) && (value.time === null || typeof value.time === "string");
}

function waypoint(value: unknown): value is RouteWaypoint {
  return record(value) && typeof value.name === "string" && ["camp", "hazard", "waypoint", "summit"].includes(String(value.type)) && finite(value.latitude) && finite(value.longitude) && nullableFinite(value.elevationM);
}

function segment(value: unknown): value is RouteSegment {
  return record(value) && typeof value.id === "string" && typeof value.name === "string" && finite(value.fromPointIndex) && finite(value.toPointIndex) && finite(value.distanceKm) && finite(value.elevationGainM) && finite(value.elevationLossM) && finite(value.estimatedHours) && nullableFinite(value.maximumRouteGradientDegrees) && ["level", "steep", "very-steep", "extreme", "unknown"].includes(String(value.gradientClass)) && value.riskLevel === "pending";
}

export function isRouteAnalysis(value: unknown): value is RouteAnalysis {
  if (!record(value) || value.schemaVersion !== ROUTE_SCHEMA_VERSION || typeof value.id !== "string" || typeof value.name !== "string" || value.status !== "draft") return false;
  if (!Array.isArray(value.points) || value.points.length < 2 || !value.points.every(point)) return false;
  if (!Array.isArray(value.waypoints) || !value.waypoints.every(waypoint) || !Array.isArray(value.segments) || !value.segments.every(segment)) return false;
  if (!record(value.summary) || !finite(value.summary.distanceKm) || !finite(value.summary.elevationGainM) || !finite(value.summary.elevationLossM) || !nullableFinite(value.summary.minimumElevationM) || !nullableFinite(value.summary.maximumElevationM) || !finite(value.summary.estimatedHours)) return false;
  return record(value.source) && value.source.format === "GPX 1.x" && typeof value.source.analyzedAt === "string" && finite(value.source.pointCount) && record(value.terrainAssessment) && value.terrainAssessment.method === "route-gradient-only" && value.terrainAssessment.coverage === "partial" && typeof value.terrainAssessment.notice === "string";
}

export function routeValue(value: number | null, unit: string, digits = 0) {
  return value === null ? "Not supplied" : `${value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${unit}`;
}
