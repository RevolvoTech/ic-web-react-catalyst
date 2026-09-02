import { NextRequest, NextResponse } from "next/server";
import {
  MAP_LOCATION_SCHEMA_VERSION,
  normalizeNominatimLocation,
  type MapLocation,
} from "@/lib/geocode";

export const dynamic = "force-dynamic";

const ALLOWED_PARAMETERS = new Set(["latitude", "longitude"]);

function error(message: string, status: number) {
  return NextResponse.json(
    { error: { code: status === 400 ? "INVALID_MAP_CENTER" : "GEOCODER_UNAVAILABLE", message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function coordinate(value: string | null, minimum: number, maximum: number) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function fixtureLocation(latitude: number, longitude: number): MapLocation {
  return {
    schemaVersion: MAP_LOCATION_SCHEMA_VERSION,
    name: "Karakoram map center, Gilgit-Baltistan, Pakistan",
    displayName: "Karakoram map center, Gilgit-Baltistan, Pakistan",
    latitude,
    longitude,
    source: { name: "Catalyst geocoder fixture", attribution: "Test fixture" },
  };
}

export async function GET(request: NextRequest) {
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!ALLOWED_PARAMETERS.has(key)) return error("Only latitude and longitude are supported.", 400);
  }
  for (const key of ALLOWED_PARAMETERS) {
    if (request.nextUrl.searchParams.getAll(key).length !== 1) return error(`${key} must be supplied once.`, 400);
  }

  const latitude = coordinate(request.nextUrl.searchParams.get("latitude"), -90, 90);
  const longitude = coordinate(request.nextUrl.searchParams.get("longitude"), -180, 180);
  if (latitude === null || longitude === null) return error("The map-center coordinates are invalid.", 400);

  if (process.env.GEOCODER_ADAPTER === "fixture") {
    return NextResponse.json(fixtureLocation(latitude, longitude), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const upstream = new URL("https://nominatim.openstreetmap.org/reverse");
    upstream.searchParams.set("format", "jsonv2");
    upstream.searchParams.set("lat", String(latitude));
    upstream.searchParams.set("lon", String(longitude));
    upstream.searchParams.set("zoom", "10");
    upstream.searchParams.set("addressdetails", "1");

    const response = await fetch(upstream, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "accept-language": "en",
        referer: "https://ic-web-react-catalyst.vercel.app/",
        "user-agent": "Catalyst-MVP/1.0 (https://ic-web-react-catalyst.vercel.app)",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return error("The location-name service is temporarily unavailable.", 502);
    const payload: unknown = await response.json().catch(() => null);
    const location = normalizeNominatimLocation(payload, { latitude, longitude });
    if (!location) return error("No reliable place name was returned for this map center.", 502);

    return NextResponse.json(location, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return error("The location-name service is currently unreachable.", 502);
  }
}
