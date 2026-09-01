import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";
import { isHazardAnalysis } from "@/lib/hazard";
import { isRouteAnalysis } from "@/lib/route";

export const dynamic = "force-dynamic";

function failure(message: string, status: number) {
  return NextResponse.json({ error: { code: "HAZARD_ANALYSIS_UNAVAILABLE", message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const configuredBase = process.env.CATALYST_BACKEND_URL;
  if (!configuredBase) return failure("Hazard analysis is temporarily unavailable.", 503);
  const payload: unknown = await request.json().catch(() => null);
  if (!isRouteAnalysis(payload)) return failure("Analyze a valid GPX route before requesting hazards.", 400);
  try {
    const baseUrl = new URL(configuredBase);
    if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) return failure("Hazard analysis is temporarily unavailable.", 503);
    const response = await fetch(backendUrlWithPath(baseUrl, "/api/v1/hazards/analyze"), { method: "POST", body: JSON.stringify(payload), headers: { accept: "application/json", "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(45_000) });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) return failure(response.status === 503 ? "Copernicus terrain credentials are not configured." : "Copernicus terrain screening is currently unavailable.", response.status === 400 ? 400 : response.status === 503 ? 503 : 502);
    if (!isHazardAnalysis(result)) return failure("The hazard service returned an unexpected response.", 502);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("The hazard service is currently unreachable.", 502);
  }
}
