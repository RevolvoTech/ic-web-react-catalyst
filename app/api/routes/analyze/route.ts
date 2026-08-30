import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";
import { isRouteAnalysis } from "@/lib/route";

export const dynamic = "force-dynamic";

function failure(message: string, status: number) {
  return NextResponse.json({ error: { code: status === 400 ? "INVALID_GPX" : "ROUTE_ANALYSIS_UNAVAILABLE", message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const configuredBase = process.env.CATALYST_BACKEND_URL;
  if (!configuredBase) return failure("Route analysis is temporarily unavailable.", 503);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!["application/gpx+xml", "application/xml", "text/xml"].includes(contentType ?? "")) return failure("Choose a GPX file to analyze.", 400);
  const body = await request.arrayBuffer();
  if (body.byteLength < 20 || body.byteLength > 5_000_000) return failure("GPX files must be between 20 bytes and 5 MB.", 400);

  try {
    const baseUrl = new URL(configuredBase);
    if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) return failure("Route analysis is temporarily unavailable.", 503);
    const backendUrl = backendUrlWithPath(baseUrl, "/api/v1/routes/analyze");
    const name = request.nextUrl.searchParams.get("name");
    if (name) backendUrl.searchParams.set("name", name.slice(0, 180));
    const response = await fetch(backendUrl, { method: "POST", body, headers: { accept: "application/json", "content-type": "application/gpx+xml" }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) return failure(response.status === 400 && typeof payload === "object" && payload !== null ? "The GPX file could not be parsed." : "Route analysis is temporarily unavailable.", response.status === 400 ? 400 : 502);
    if (!isRouteAnalysis(payload)) return failure("The route service returned an unexpected response.", 502);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("The route service is currently unreachable.", 502);
  }
}
