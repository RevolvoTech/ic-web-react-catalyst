import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";
import { isSatelliteCatalog } from "@/lib/satellite";

export const dynamic = "force-dynamic";

const BACKEND_PATH = "/api/v1/gis/satellite/catalog";
const ALLOWED_PARAMETERS = ["bbox", "from", "to", "cloud", "limit"] as const;

function error(message: string, status: number) {
  return NextResponse.json(
    { error: { code: status === 400 ? "INVALID_SATELLITE_QUERY" : "SATELLITE_UNAVAILABLE", message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const configuredBase = process.env.CATALYST_BACKEND_URL;
  if (!configuredBase) return error("The Catalyst backend is not configured for this website.", 503);

  for (const parameter of ALLOWED_PARAMETERS) {
    if (request.nextUrl.searchParams.getAll(parameter).length > 1) {
      return error(`${parameter} may be supplied once.`, 400);
    }
  }

  try {
    const baseUrl = new URL(configuredBase);
    if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
      return error("The Catalyst backend URL is invalid.", 503);
    }

    const backendUrl = backendUrlWithPath(baseUrl, BACKEND_PATH);
    for (const parameter of ALLOWED_PARAMETERS) {
      const value = request.nextUrl.searchParams.get(parameter);
      if (value !== null) backendUrl.searchParams.set(parameter, value);
    }

    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return error(
        response.status === 400
          ? "The satellite search parameters were rejected."
          : "The Copernicus catalogue is temporarily unavailable.",
        response.status === 400 ? 400 : 502,
      );
    }
    if (!isSatelliteCatalog(payload)) {
      return error("The Catalyst backend returned an invalid satellite catalogue.", 502);
    }

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return error("The Catalyst backend or Copernicus catalogue is currently unreachable.", 502);
  }
}
