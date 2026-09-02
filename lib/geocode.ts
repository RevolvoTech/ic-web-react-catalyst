export const MAP_LOCATION_SCHEMA_VERSION = "catalyst.map.location.v1" as const;

export interface MapLocation {
  schemaVersion: typeof MAP_LOCATION_SCHEMA_VERSION;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  source: {
    name: string;
    attribution: string;
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function finiteCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

export function isMapLocation(value: unknown): value is MapLocation {
  if (!record(value) || !record(value.source)) return false;
  return value.schemaVersion === MAP_LOCATION_SCHEMA_VERSION
    && text(value.name) !== null
    && text(value.displayName) !== null
    && finiteCoordinate(value.latitude, -90, 90)
    && finiteCoordinate(value.longitude, -180, 180)
    && text(value.source.name) !== null
    && text(value.source.attribution) !== null;
}

export function normalizeNominatimLocation(
  value: unknown,
  coordinates: { latitude: number; longitude: number },
): MapLocation | null {
  if (!record(value) || !record(value.address)) return null;
  const displayName = text(value.display_name);
  if (!displayName || displayName.length > 800) return null;

  const address = value.address;
  const feature = text(value.name)
    ?? text(address.city)
    ?? text(address.town)
    ?? text(address.village)
    ?? text(address.hamlet)
    ?? text(address.municipality)
    ?? text(address.county)
    ?? text(address.state_district)
    ?? text(address.state)
    ?? text(address.country);
  if (!feature) return null;

  const region = text(address.state_district) ?? text(address.state);
  const country = text(address.country);
  const name = [...new Set([feature, region, country].filter((part): part is string => Boolean(part)))]
    .slice(0, 3)
    .join(", ");

  return {
    schemaVersion: MAP_LOCATION_SCHEMA_VERSION,
    name,
    displayName,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    source: {
      name: "OpenStreetMap Nominatim",
      attribution: "© OpenStreetMap contributors",
    },
  };
}

