export const QGPS_SCHEMA_VERSION = "catalyst.qgps.snapshot.v1" as const;

export const qgpsScenarios = [
  "current",
  "stale",
  "offline",
  "unavailable",
  "empty",
] as const;

export type QgpsScenario = (typeof qgpsScenarios)[number];
export type QgpsMode = "live" | "simulated";
export type QgpsConnectionState = "connected" | "offline" | "unavailable";
export type QgpsFreshness =
  | "current"
  | "stale"
  | "offline"
  | "unavailable"
  | "unknown";

export interface QgpsTrackPoint {
  latitude: number;
  longitude: number;
  altitudeM: number;
  timestamp: string;
}

export interface QgpsPosition extends QgpsTrackPoint {
  accuracyM: number | null;
  fixType: "2D" | "3D" | "unknown";
  satellites: number | null;
  hdop: number | null;
}

export interface QgpsSnapshot {
  schemaVersion: typeof QGPS_SCHEMA_VERSION;
  mode: QgpsMode;
  scenario: QgpsScenario;
  expedition: {
    id: string;
    name: string;
    team: string;
  };
  source: {
    name: string;
    adapter: string;
    project: string | null;
    repository: string | null;
    license: string | null;
    protocol: string | null;
  };
  connection: {
    state: QgpsConnectionState;
    receivedAt: string | null;
  };
  freshness: QgpsFreshness;
  position: QgpsPosition | null;
  track: QgpsTrackPoint[];
  notice: string;
}

const ROUTE_COORDINATES = [
  [35.7378, 76.5082, 4_660],
  [35.7391, 76.5115, 4_684],
  [35.7408, 76.5148, 4_718],
  [35.7426, 76.5185, 4_755],
  [35.7444, 76.5223, 4_798],
  [35.7465, 76.526, 4_842],
  [35.7486, 76.5296, 4_891],
] as const;

export function isQgpsScenario(value: string | null): value is QgpsScenario {
  return qgpsScenarios.includes(value as QgpsScenario);
}

export function deriveFreshness(
  timestamp: string | null,
  connection: QgpsConnectionState,
  now = new Date(),
): QgpsFreshness {
  if (connection === "offline") return "offline";
  if (connection === "unavailable") return "unavailable";
  if (!timestamp) return "unknown";

  const ageMs = now.getTime() - new Date(timestamp).getTime();
  return ageMs > 10 * 60 * 1_000 ? "stale" : "current";
}

function minutesBefore(now: Date, minutes: number) {
  return new Date(now.getTime() - minutes * 60 * 1_000).toISOString();
}

export function createSimulatedSnapshot(
  scenario: QgpsScenario,
  now = new Date(),
): QgpsSnapshot {
  const connection: QgpsConnectionState =
    scenario === "offline"
      ? "offline"
      : scenario === "unavailable"
        ? "unavailable"
        : "connected";

  const ageMinutes = scenario === "stale" ? 27 : scenario === "offline" ? 18 : 1;
  const hasPosition = scenario !== "unavailable" && scenario !== "empty";

  const track: QgpsTrackPoint[] = hasPosition
    ? ROUTE_COORDINATES.map(([latitude, longitude, altitudeM], index) => ({
        latitude,
        longitude,
        altitudeM,
        timestamp: minutesBefore(now, ageMinutes + (ROUTE_COORDINATES.length - index) * 2),
      }))
    : [];

  const lastTrackPoint = track.at(-1);
  const position: QgpsPosition | null = lastTrackPoint
    ? {
        ...lastTrackPoint,
        timestamp: minutesBefore(now, ageMinutes),
        accuracyM: 12,
        fixType: "3D",
        satellites: 11,
        hdop: 0.9,
      }
    : null;

  return {
    schemaVersion: QGPS_SCHEMA_VERSION,
    mode: "simulated",
    scenario,
    expedition: {
      id: "fixture-k2-01",
      name: "Karakoram Pilot",
      team: "Rope Team A",
    },
    source: {
      name: "Catalyst QGPS fixture",
      adapter: "Catalyst backend API",
      project: null,
      repository: null,
      license: null,
      protocol: null,
    },
    connection: {
      state: connection,
      receivedAt: hasPosition ? minutesBefore(now, 0) : null,
    },
    freshness: deriveFreshness(position?.timestamp ?? null, connection, now),
    position,
    track,
    notice:
      scenario === "empty"
        ? "The simulated source is connected but has not supplied a position."
        : scenario === "unavailable"
          ? "No QGPS source is configured for this environment."
          : "Demonstration fixture only. This is not a live QGPS integration.",
  };
}

export function formatCoordinate(value: number, positive: string, negative: string) {
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(5)}° ${direction}`;
}

export function formatAge(timestamp: string, now = new Date()) {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(timestamp).getTime()) / 1_000));

  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}
