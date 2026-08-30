import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";
import { isRouteAnalysis } from "@/lib/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const configuredBase = process.env.CATALYST_BACKEND_URL;
  if (!configuredBase) return NextResponse.json({ error: { code: "KMZ_UNAVAILABLE", message: "Route export is temporarily unavailable." } }, { status: 503 });
  const payload: unknown = await request.json().catch(() => null);
  if (!isRouteAnalysis(payload)) return NextResponse.json({ error: { code: "INVALID_ROUTE", message: "Analyze a valid GPX route before exporting." } }, { status: 400 });
  try {
    const baseUrl = new URL(configuredBase);
    if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) throw new Error("Invalid backend URL");
    const response = await fetch(backendUrlWithPath(baseUrl, "/api/v1/routes/kmz"), { method: "POST", body: JSON.stringify(payload), headers: { accept: "application/vnd.google-earth.kmz", "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error("Export rejected");
    return new NextResponse(await response.arrayBuffer(), { headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="${payload.name.replace(/[^a-z0-9-]+/giu, "-").replace(/^-|-$/gu, "").slice(0, 80) || "catalyst-route"}.kmz"`, "Content-Type": "application/vnd.google-earth.kmz" } });
  } catch {
    return NextResponse.json({ error: { code: "KMZ_UNAVAILABLE", message: "Route export is temporarily unavailable." } }, { status: 502 });
  }
}
