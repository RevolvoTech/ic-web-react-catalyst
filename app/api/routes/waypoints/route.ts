import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";
import { isRouteAnalysis } from "@/lib/route";

export const dynamic = "force-dynamic";

function failure(message: string, status: number) {
  return NextResponse.json({ error: { code: status === 400 ? "INVALID_WAYPOINT_ROUTE" : "ROUTE_ANALYSIS_UNAVAILABLE", message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const configuredBase = process.env.CATALYST_BACKEND_URL;
  if (!configuredBase) return failure("Route analysis is temporarily unavailable.", 503);
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return failure("Send map waypoints as JSON.", 400);
  const body = await request.text();
  if (body.length > 250_000) return failure("The waypoint route is too large.", 400);

  try {
    const baseUrl = new URL(configuredBase);
    if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) return failure("Route analysis is temporarily unavailable.", 503);
    const response = await fetch(backendUrlWithPath(baseUrl, "/api/v1/routes/waypoints"), {
      method: "POST",
      body,
      headers: { accept: "application/json", "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const backendMessage = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "object" && payload.error !== null && "message" in payload.error && typeof payload.error.message === "string" ? payload.error.message : null;
      return failure(response.status === 400 ? backendMessage ?? "Invalid map waypoints." : "Route analysis is temporarily unavailable.", response.status === 400 ? 400 : 502);
    }
    if (!isRouteAnalysis(payload)) return failure("The route service returned an unexpected response.", 502);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("The route service is currently unreachable.", 502);
  }
}
