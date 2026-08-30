import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";

export const dynamic = "force-dynamic";

const BACKEND_PATH = "/api/v1/gis/satellite/render";
const ALLOWED_PARAMETERS = ["sceneId", "bbox", "width", "height"] as const;

function error(message: string, status: number) {
  return NextResponse.json(
    { error: { code: status === 503 ? "SATELLITE_RENDER_NOT_CONFIGURED" : "SATELLITE_RENDER_FAILED", message } },
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
      headers: { accept: "image/png" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      return error(
        response.status === 503
          ? "Processed imagery needs Copernicus OAuth credentials on the Catalyst backend."
          : "The requested satellite image could not be rendered.",
        response.status === 503 ? 503 : response.status === 400 || response.status === 404 ? response.status : 502,
      );
    }
    if (!(response.headers.get("content-type") ?? "").toLowerCase().startsWith("image/png")) {
      return error("The Catalyst backend returned an invalid satellite image.", 502);
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": response.headers.get("cache-control") ?? "private, max-age=3600",
        "X-Catalyst-Attribution": response.headers.get("x-catalyst-attribution") ?? "Copernicus Sentinel data",
      },
    });
  } catch {
    return error("The satellite rendering service is currently unreachable.", 502);
  }
}
