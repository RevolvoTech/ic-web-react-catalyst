import type { HazardAnalysis } from "./hazard";
import type { RouteAnalysis, RoutePoint } from "./route";

export const WORKSPACE_AOI_EVENT = "catalyst:workspace-aoi";
export const WORKSPACE_ROUTE_EVENT = "catalyst:workspace-route";
export const WORKSPACE_HAZARD_EVENT = "catalyst:workspace-hazard";
export const WORKSPACE_AOI_STORAGE_KEY = "catalyst:workspace-aoi:v1";

export type WorkspaceAoiSource = "pilot" | "route" | "waypoints";

export interface WorkspaceAoi {
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  bbox: [number, number, number, number];
  source: WorkspaceAoiSource;
}

export interface DemoWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  elevationM: number | null;
}

export interface WorkspaceRouteDetail {
  route: RouteAnalysis;
}

export interface WorkspaceHazardDetail {
  hazard: HazardAnalysis | null;
}

const PILOT_BBOX: WorkspaceAoi["bbox"] = [76.48, 35.7, 76.56, 35.78];

export const PILOT_AOI: WorkspaceAoi = {
  name: "Karakoram pilot area",
  latitude: 35.74,
  longitude: 76.52,
  elevationM: 5_200,
  bbox: PILOT_BBOX,
  source: "pilot",
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isWorkspaceAoi(value: unknown): value is WorkspaceAoi {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<WorkspaceAoi>;
  return typeof candidate.name === "string"
    && finite(candidate.latitude)
    && candidate.latitude >= -90
    && candidate.latitude <= 90
    && finite(candidate.longitude)
    && candidate.longitude >= -180
    && candidate.longitude <= 180
    && (candidate.elevationM === null || finite(candidate.elevationM))
    && Array.isArray(candidate.bbox)
    && candidate.bbox.length === 4
    && candidate.bbox.every(finite)
    && ["pilot", "route", "waypoints"].includes(String(candidate.source));
}

export function bboxFromPoints(
  points: ReadonlyArray<{ latitude: number; longitude: number }>,
): WorkspaceAoi["bbox"] | null {
  if (points.length === 0) return null;
  const latitudes = points.map((point) => point.latitude).filter(finite);
  const longitudes = points.map((point) => point.longitude).filter(finite);
  if (latitudes.length !== points.length || longitudes.length !== points.length) return null;

  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const longitudePadding = Math.max(0.01, (east - west) * 0.15);
  const latitudePadding = Math.max(0.01, (north - south) * 0.15);
  return [
    Math.max(-180, west - longitudePadding),
    Math.max(-90, south - latitudePadding),
    Math.min(180, east + longitudePadding),
    Math.min(90, north + latitudePadding),
  ];
}

function highestPoint(points: RoutePoint[]) {
  return points.reduce<RoutePoint | null>((highest, point) => {
    if (point.elevationM === null) return highest;
    if (!highest || highest.elevationM === null || point.elevationM > highest.elevationM) return point;
    return highest;
  }, null);
}

export function aoiFromRoute(route: RouteAnalysis): WorkspaceAoi {
  const bbox = bboxFromPoints(route.points) ?? PILOT_BBOX;
  const highPoint = highestPoint(route.points);
  return {
    name: route.name,
    latitude: highPoint?.latitude ?? (bbox[1] + bbox[3]) / 2,
    longitude: highPoint?.longitude ?? (bbox[0] + bbox[2]) / 2,
    elevationM: highPoint?.elevationM ?? null,
    bbox,
    source: "route",
  };
}

export function aoiFromWaypoints(waypoints: DemoWaypoint[]): WorkspaceAoi | null {
  const bbox = bboxFromPoints(waypoints);
  if (!bbox || waypoints.length < 2) return null;
  const last = waypoints.at(-1);
  return {
    name: `Waypoint demonstration · ${waypoints.length} points`,
    latitude: last?.latitude ?? (bbox[1] + bbox[3]) / 2,
    longitude: last?.longitude ?? (bbox[0] + bbox[2]) / 2,
    elevationM: last?.elevationM ?? null,
    bbox,
    source: "waypoints",
  };
}

export function formatBbox(bbox: WorkspaceAoi["bbox"]) {
  return bbox.map((value) => value.toFixed(5)).join(",");
}

export function publishWorkspaceAoi(aoi: WorkspaceAoi) {
  try {
    window.localStorage.setItem(WORKSPACE_AOI_STORAGE_KEY, JSON.stringify(aoi));
  } catch {
    // Storage availability never blocks the active map session.
  }
  window.dispatchEvent(new CustomEvent<WorkspaceAoi>(WORKSPACE_AOI_EVENT, { detail: aoi }));
}

export function publishWorkspaceRoute(route: RouteAnalysis) {
  window.dispatchEvent(new CustomEvent<WorkspaceRouteDetail>(WORKSPACE_ROUTE_EVENT, {
    detail: { route },
  }));
  publishWorkspaceAoi(aoiFromRoute(route));
}

export function publishWorkspaceHazard(hazard: HazardAnalysis | null) {
  window.dispatchEvent(new CustomEvent<WorkspaceHazardDetail>(WORKSPACE_HAZARD_EVENT, {
    detail: { hazard },
  }));
}
