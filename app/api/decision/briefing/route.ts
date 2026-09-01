import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";
import { isDecisionBriefing, isDecisionBriefingRequest } from "@/lib/decision";

export const dynamic = "force-dynamic";

function failure(message: string, status: number) {
  return NextResponse.json({ error: { code: "DECISION_BRIEFING_UNAVAILABLE", message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const configuredBase = process.env.CATALYST_BACKEND_URL;
  if (!configuredBase) return failure("Evidence briefing is temporarily unavailable.", 503);
  const payload: unknown = await request.json().catch(() => null);
  if (!isDecisionBriefingRequest(payload)) return failure("Attach a valid analyzed route and evidence bundle.", 400);
  try {
    const baseUrl = new URL(configuredBase);
    if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) return failure("Evidence briefing is temporarily unavailable.", 503);
    const response = await fetch(backendUrlWithPath(baseUrl, "/api/v1/decision/briefing"), { method: "POST", body: JSON.stringify(payload), headers: { accept: "application/json", "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(25_000) });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) return failure(response.status === 400 ? "The evidence bundle was rejected." : "Evidence synthesis is currently unavailable.", response.status === 400 ? 400 : 502);
    if (!isDecisionBriefing(result)) return failure("The decision service returned an unexpected response.", 502);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("The decision service is currently unreachable.", 502);
  }
}
