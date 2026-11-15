import type { LineString, FeatureCollection } from "geojson";

export interface FieldPosition {
  id: string; user_id: string; member_name: string; device_name: string | null;
  latitude: number; longitude: number; altitude_m: number | null; accuracy_m: number | null;
  recorded_at: string; received_at: string; source: string;
  state: "live" | "simulated" | "stale" | "offline" | "unavailable"; expected_interval_seconds: number | null;
  mode: "live" | "simulated";
}
export interface FieldSnapshot {
  schemaVersion: "catalyst.field.snapshot.v1"; fetchedAt: string;
  plan: { id: string; version: number; content_hash: string; published_at: string;
    snapshot: { name: string; route: LineString; hazards?: FeatureCollection; notes?: string } } | null;
  positions: FieldPosition[];
  reports: Array<{ id: string; kind: string; recorded_at: string; author_name: string; payload: { text: string } }>;
  decision: { decision: string; note: string; leader_name: string; created_at: string } | null;
}
export class FieldApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function fieldApi<T>(token: string, expedition: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/operations/expeditions/${expedition}/${path}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(10_000),
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json() as T & { error?: { message: string } };
  if (!response.ok) throw new FieldApiError(response.status, result.error?.message ?? "Field request failed.");
  return result;
}
export function positionState(position: FieldPosition, offline = false, now = Date.now()) {
  if (position.mode === "simulated") return "simulated";
  if (offline || now - Date.parse(position.received_at) >= (position.expected_interval_seconds ?? 1800) * 1000) return "offline";
  return now - Date.parse(position.recorded_at) >= 20 * 60_000 ? "stale" : "live";
}
