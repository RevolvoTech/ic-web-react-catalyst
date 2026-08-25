import { NextRequest, NextResponse } from "next/server";
import {
  createSimulatedSnapshot,
  isQgpsScenario,
  type QgpsScenario,
} from "@/lib/qgps";

export const dynamic = "force-dynamic";

const BACKEND_PATH = "/api/v1/integrations/qgps/snapshot";

async function fetchConfiguredBackend(request: NextRequest, scenario: QgpsScenario) {
  const backendOrigin = process.env.CATALYST_BACKEND_URL;
  if (!backendOrigin) return null;

  const backendUrl = new URL(BACKEND_PATH, backendOrigin);
  backendUrl.searchParams.set("scenario", scenario);

  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-catalyst-request-id": request.headers.get("x-request-id") ?? crypto.randomUUID(),
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "The configured Catalyst backend did not return QGPS data.",
          status: response.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "The configured Catalyst backend is currently unreachable." },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  const requestedScenario = request.nextUrl.searchParams.get("scenario");
  const scenario: QgpsScenario = isQgpsScenario(requestedScenario)
    ? requestedScenario
    : "current";

  if (requestedScenario === "error") {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return NextResponse.json(
      { error: "The simulated backend rejected this request." },
      { status: 503 },
    );
  }

  const backendResponse = await fetchConfiguredBackend(request, scenario);
  if (backendResponse) return backendResponse;

  await new Promise((resolve) => setTimeout(resolve, 350));
  return NextResponse.json(createSimulatedSnapshot(scenario), {
    headers: { "Cache-Control": "no-store" },
  });
}
