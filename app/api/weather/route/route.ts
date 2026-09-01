import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";
import { isRouteAnalysis } from "@/lib/route";
import { isRouteWeatherAnalysis } from "@/lib/route-weather";

export const dynamic = "force-dynamic";

function failure(message: string, status: number) {
  return NextResponse.json({ error: { code: "ROUTE_WEATHER_UNAVAILABLE", message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const configuredBase = process.env.CATALYST_BACKEND_URL;
  if (!configuredBase) return failure("Route weather is temporarily unavailable.", 503);
  const payload: unknown = await request.json().catch(() => null);
  if (!isRouteAnalysis(payload)) return failure("Analyze a valid GPX route before requesting weather.", 400);
  try {
    const baseUrl = new URL(configuredBase);
    if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) return failure("Route weather is temporarily unavailable.", 503);
    const response = await fetch(backendUrlWithPath(baseUrl, "/api/v1/weather/route"), { method: "POST", body: JSON.stringify(payload), headers: { accept: "application/json", "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) return failure(response.status === 400 ? "The analyzed route is invalid." : "Route weather is currently unavailable.", response.status === 400 ? 400 : 502);
    if (!isRouteWeatherAnalysis(result)) return failure("The weather service returned an unexpected response.", 502);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("The route weather service is currently unreachable.", 502);
  }
}
