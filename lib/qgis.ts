export const QGIS_SCHEMA_VERSION = "catalyst.qgis.snapshot.v1" as const;

export const qgisScenarios = [
  "current",
  "stale",
  "offline",
  "unavailable",
  "empty",
] as const;

export type QgisScenario = (typeof qgisScenarios)[number];
export type QgisMode = "live" | "simulated";
export type QgisConnectionState = "connected" | "offline" | "unavailable";
export type QgisFreshness =
  | "current"
  | "stale"
  | "offline"
  | "unavailable"
  | "unknown";

export interface QgisTrackPoint {
  latitude: number;
  longitude: number;
  altitudeM: number;
  timestamp: string;
}

export interface QgisPosition extends QgisTrackPoint {
  accuracyM: number | null;
  fixType: "2D" | "3D" | "unknown";
  satellites: number | null;
  hdop: number | null;
}

export interface QgisSnapshot {
  schemaVersion: typeof QGIS_SCHEMA_VERSION;
  mode: QgisMode;
  scenario: QgisScenario;
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
    state: QgisConnectionState;
    receivedAt: string | null;
  };
  freshness: QgisFreshness;
  position: QgisPosition | null;
  track: QgisTrackPoint[];
  notice: string;
}

const qgisModes: readonly QgisMode[] = ["live", "simulated"];
const qgisConnectionStates: readonly QgisConnectionState[] = [
  "connected",
  "offline",
  "unavailable",
];
const qgisFreshnessStates: readonly QgisFreshness[] = [
  "current",
  "stale",
  "offline",
  "unavailable",
  "unknown",
];
const qgisFixTypes: readonly QgisPosition["fixType"][] = ["2D", "3D", "unknown"];
const snapshotKeys = [
  "schemaVersion",
  "mode",
  "scenario",
  "expedition",
  "source",
  "connection",
  "freshness",
  "position",
  "track",
  "notice",
] as const;
const expeditionKeys = ["id", "name", "team"] as const;
const sourceKeys = ["name", "adapter", "project", "repository", "license", "protocol"] as const;
const connectionKeys = ["state", "receivedAt"] as const;
const trackPointKeys = ["latitude", "longitude", "altitudeM", "timestamp"] as const;
const positionKeys = [
  ...trackPointKeys,
  "accuracyM",
  "fixType",
  "satellites",
  "hdop",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value);
  return (
    actual.length === expected.length &&
    expected.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isTimestamp(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  const second = Number(value.slice(17, 19));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const offset = value.endsWith("Z") ? null : value.slice(-5);

  return (
    year > 0 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (daysInMonth[month - 1] ?? 0) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    (offset === null || (Number(offset.slice(0, 2)) <= 23 && Number(offset.slice(3, 5)) <= 59)) &&
    !Number.isNaN(Date.parse(value))
  );
}

function hasQgisTrackPointFields(value: Record<string, unknown>) {
  return (
    isFiniteNumber(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    isFiniteNumber(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180 &&
    isFiniteNumber(value.altitudeM) &&
    isTimestamp(value.timestamp)
  );
}

function isQgisTrackPoint(value: unknown): value is QgisTrackPoint {
  return isRecord(value) && hasExactKeys(value, trackPointKeys) && hasQgisTrackPointFields(value);
}

function isQgisPosition(value: unknown): value is QgisPosition {
  if (!isRecord(value) || !hasExactKeys(value, positionKeys) || !hasQgisTrackPointFields(value)) {
    return false;
  }

  return (
    (value.accuracyM === null ||
      (isFiniteNumber(value.accuracyM) && value.accuracyM >= 0)) &&
    qgisFixTypes.includes(value.fixType as QgisPosition["fixType"]) &&
    (value.satellites === null ||
      (typeof value.satellites === "number" &&
        Number.isInteger(value.satellites) &&
        value.satellites >= 0)) &&
    (value.hdop === null || (isFiniteNumber(value.hdop) && value.hdop >= 0))
  );
}

export function isQgisSnapshot(value: unknown): value is QgisSnapshot {
  if (!isRecord(value) || !hasExactKeys(value, snapshotKeys)) return false;

  const { expedition, source, connection } = value;
  if (!isRecord(expedition) || !isRecord(source) || !isRecord(connection)) return false;
  if (
    !hasExactKeys(expedition, expeditionKeys) ||
    !hasExactKeys(source, sourceKeys) ||
    !hasExactKeys(connection, connectionKeys)
  ) {
    return false;
  }

  const trackIsOrdered =
    Array.isArray(value.track) &&
    value.track.every(
      (point, index, track) =>
        isQgisTrackPoint(point) &&
        (index === 0 ||
          Date.parse(point.timestamp) >= Date.parse((track[index - 1] as QgisTrackPoint).timestamp)),
    );
  const scenarioStateIsConsistent =
    value.scenario === "current"
      ? connection.state === "connected" && value.freshness === "current" && value.position !== null
      : value.scenario === "stale"
        ? connection.state === "connected" && value.freshness === "stale" && value.position !== null
        : value.scenario === "offline"
          ? connection.state === "offline" && value.freshness === "offline"
          : value.scenario === "unavailable"
            ? connection.state === "unavailable" &&
              value.freshness === "unavailable" &&
              value.position === null &&
              Array.isArray(value.track) &&
              value.track.length === 0
            : value.scenario === "empty"
              ? connection.state === "connected" &&
                value.freshness === "unknown" &&
                value.position === null &&
                Array.isArray(value.track) &&
                value.track.length === 0
              : false;

  return (
    value.schemaVersion === QGIS_SCHEMA_VERSION &&
    qgisModes.includes(value.mode as QgisMode) &&
    isQgisScenario(typeof value.scenario === "string" ? value.scenario : null) &&
    typeof expedition.id === "string" &&
    typeof expedition.name === "string" &&
    typeof expedition.team === "string" &&
    typeof source.name === "string" &&
    typeof source.adapter === "string" &&
    isNullableString(source.project) &&
    isNullableString(source.repository) &&
    isNullableString(source.license) &&
    isNullableString(source.protocol) &&
    qgisConnectionStates.includes(connection.state as QgisConnectionState) &&
    (connection.receivedAt === null || isTimestamp(connection.receivedAt)) &&
    qgisFreshnessStates.includes(value.freshness as QgisFreshness) &&
    (value.position === null || isQgisPosition(value.position)) &&
    trackIsOrdered &&
    scenarioStateIsConsistent &&
    typeof value.notice === "string"
  );
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

export function isQgisScenario(value: string | null): value is QgisScenario {
  return qgisScenarios.includes(value as QgisScenario);
}

export function deriveFreshness(
  timestamp: string | null,
  connection: QgisConnectionState,
  now = new Date(),
): QgisFreshness {
  if (connection === "offline") return "offline";
  if (connection === "unavailable") return "unavailable";
  if (!timestamp) return "unknown";

  const ageMs = now.getTime() - new Date(timestamp).getTime();
  if (ageMs < -60_000) return "unknown";
  return ageMs > 10 * 60 * 1_000 ? "stale" : "current";
}

function minutesBefore(now: Date, minutes: number) {
  return new Date(now.getTime() - minutes * 60 * 1_000).toISOString();
}

export function createSimulatedSnapshot(
  scenario: QgisScenario,
  now = new Date(),
): QgisSnapshot {
  const connection: QgisConnectionState =
    scenario === "offline"
      ? "offline"
      : scenario === "unavailable"
        ? "unavailable"
        : "connected";

  const ageMinutes = scenario === "stale" ? 27 : scenario === "offline" ? 18 : 1;
  const hasPosition = scenario !== "unavailable" && scenario !== "empty";

  const track: QgisTrackPoint[] = hasPosition
    ? ROUTE_COORDINATES.map(([latitude, longitude, altitudeM], index) => ({
        latitude,
        longitude,
        altitudeM,
        timestamp: minutesBefore(now, ageMinutes + (ROUTE_COORDINATES.length - index) * 2),
      }))
    : [];

  const lastTrackPoint = track.at(-1);
  const position: QgisPosition | null = lastTrackPoint
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
    schemaVersion: QGIS_SCHEMA_VERSION,
    mode: "simulated",
    scenario,
    expedition: {
      id: "fixture-k2-01",
      name: "Karakoram Pilot",
      team: "Rope Team A",
    },
    source: {
      name: "Catalyst QGIS fixture",
      adapter: "website-local-fixture-adapter",
      project: null,
      repository: null,
      license: null,
      protocol: null,
    },
    connection: {
      state: connection,
      receivedAt:
        scenario === "unavailable"
          ? null
          : scenario === "offline"
            ? minutesBefore(now, ageMinutes)
            : minutesBefore(now, 0),
    },
    freshness: deriveFreshness(position?.timestamp ?? null, connection, now),
    position,
    track,
    notice:
      scenario === "empty"
        ? "The simulated source is connected but has not supplied a position."
        : scenario === "unavailable"
          ? "No QGIS source is configured for this environment."
          : "Demonstration fixture only. This is not a live QGIS integration.",
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
