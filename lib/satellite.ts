export const SATELLITE_CATALOG_SCHEMA_VERSION = "catalyst.satellite.catalog.v1" as const;

export type SatelliteBoundingBox = readonly [number, number, number, number];

export interface SatelliteScene {
  id: string;
  collection: "sentinel-2-l2a";
  capturedAt: string;
  publishedAt: string | null;
  platform: string;
  groundSampleDistanceM: number;
  cloudCoverPercent: number | null;
  snowCoverPercent: number | null;
  bbox: SatelliteBoundingBox;
  thumbnailUrl: string | null;
}

export interface SatelliteCatalog {
  schemaVersion: typeof SATELLITE_CATALOG_SCHEMA_VERSION;
  source: {
    name: "Copernicus Data Space Ecosystem";
    collection: "Sentinel-2 Level-2A";
    protocol: "STAC 1.1.0";
    catalogUrl: string;
  };
  query: {
    bbox: SatelliteBoundingBox;
    from: string;
    to: string;
    maxCloudCoverPercent: number;
    limit: number;
  };
  scenes: SatelliteScene[];
  retrievedAt: string;
  attribution: string;
  notice: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function isSatelliteBoundingBox(value: unknown): value is SatelliteBoundingBox {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(isFiniteNumber) &&
    value[0] >= -180 &&
    value[2] <= 180 &&
    value[1] >= -90 &&
    value[3] <= 90 &&
    value[0] < value[2] &&
    value[1] < value[3]
  );
}

function isSatelliteScene(value: unknown): value is SatelliteScene {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.collection === "sentinel-2-l2a" &&
    isTimestamp(value.capturedAt) &&
    (value.publishedAt === null || isTimestamp(value.publishedAt)) &&
    typeof value.platform === "string" &&
    value.platform.length > 0 &&
    isFiniteNumber(value.groundSampleDistanceM) &&
    value.groundSampleDistanceM > 0 &&
    isNullableFiniteNumber(value.cloudCoverPercent) &&
    isNullableFiniteNumber(value.snowCoverPercent) &&
    isSatelliteBoundingBox(value.bbox) &&
    (value.thumbnailUrl === null ||
      (typeof value.thumbnailUrl === "string" && /^https:\/\//.test(value.thumbnailUrl)))
  );
}

export function isSatelliteCatalog(value: unknown): value is SatelliteCatalog {
  if (!isRecord(value) || !isRecord(value.source) || !isRecord(value.query)) return false;
  return (
    value.schemaVersion === SATELLITE_CATALOG_SCHEMA_VERSION &&
    value.source.name === "Copernicus Data Space Ecosystem" &&
    value.source.collection === "Sentinel-2 Level-2A" &&
    value.source.protocol === "STAC 1.1.0" &&
    typeof value.source.catalogUrl === "string" &&
    isSatelliteBoundingBox(value.query.bbox) &&
    typeof value.query.from === "string" &&
    typeof value.query.to === "string" &&
    isFiniteNumber(value.query.maxCloudCoverPercent) &&
    isFiniteNumber(value.query.limit) &&
    Array.isArray(value.scenes) &&
    value.scenes.every(isSatelliteScene) &&
    isTimestamp(value.retrievedAt) &&
    typeof value.attribution === "string" &&
    typeof value.notice === "string"
  );
}

export function formatPercent(value: number | null) {
  return value === null ? "Not supplied" : `${value.toFixed(1)}%`;
}

export function formatSceneDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
