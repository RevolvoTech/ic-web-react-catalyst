import { NextRequest, NextResponse } from "next/server";
import {
  createSimulatedSnapshot,
  isQgisScenario,
  isQgisSnapshot,
  type QgisScenario,
} from "@/lib/qgis";

export const dynamic = "force-dynamic";

const BACKEND_PATH = "/api/v1/integrations/qgis/snapshot";
const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

type BackendScenario = QgisScenario | "error";

function requestIdForBackend(request: NextRequest) {
  const candidate = request.headers.get("x-request-id")?.trim();
  return candidate && SAFE_REQUEST_ID.test(candidate) ? candidate : crypto.randomUUID();
}

function isJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  return /\bapplication\/(?:[\w.+-]*\+)?json\b/i.test(contentType);
}

function isSafeErrorMessage(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 240) return false;
  return Array.from(value).every((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 0x20 && codePoint !== 0x7f;
  });
}

function safeBackendErrorPayload(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = value.error;
  if (typeof error !== "object" || error === null) return null;

  const code = "code" in error ? error.code : null;
  const message = "message" in error ? error.message : null;
  const requestId = "requestId" in error ? error.requestId : null;
  if (
    typeof code !== "string" ||
    !SAFE_ERROR_CODE.test(code) ||
    !isSafeErrorMessage(message) ||
    typeof requestId !== "string" ||
    !SAFE_REQUEST_ID.test(requestId)
  ) {
    return null;
  }

  return { error: { code, message, requestId } };
}

async function fetchConfiguredBackend(request: NextRequest, scenario: BackendScenario) {
  const backendOrigin = process.env.CATALYST_BACKEND_URL;
  if (!backendOrigin) return null;

  try {
    const configuredUrl = new URL(backendOrigin);
    if (
      !["http:", "https:"].includes(configuredUrl.protocol) ||
      configuredUrl.username ||
      configuredUrl.password ||
      configuredUrl.search ||
      configuredUrl.hash
    ) {
      throw new TypeError("Invalid Catalyst backend URL");
    }

    const backendUrl = new URL(BACKEND_PATH, configuredUrl);
    backendUrl.searchParams.set("scenario", scenario);

    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-catalyst-request-id": requestIdForBackend(request),
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      if (
        ((response.status >= 400 && response.status < 500) || response.status === 503) &&
        isJsonResponse(response)
      ) {
        const errorPayload: unknown = await response.json();
        const safeErrorPayload = safeBackendErrorPayload(errorPayload);
        if (safeErrorPayload) {
          return NextResponse.json(safeErrorPayload, {
            status: response.status,
            headers: { "Cache-Control": "no-store" },
          });
        }
      }

      return NextResponse.json(
        {
          error: "The configured Catalyst backend did not return QGIS data.",
          status: response.status,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!isJsonResponse(response)) {
      return NextResponse.json(
        { error: "The configured Catalyst backend returned a non-JSON QGIS response." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload: unknown = await response.json();
    if (!isQgisSnapshot(payload)) {
      return NextResponse.json(
        { error: "The configured Catalyst backend returned an invalid QGIS snapshot." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "The configured Catalyst backend is invalid or currently unreachable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: NextRequest) {
  const requestedScenarios = request.nextUrl.searchParams.getAll("scenario");
  const requestId = requestIdForBackend(request);
  if (requestedScenarios.length > 1) {
    return NextResponse.json(
      {
        error: {
          code: "DUPLICATE_QUERY_PARAMETER",
          message: "scenario may be supplied once.",
          requestId,
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const requestedScenario = requestedScenarios[0] ?? null;
  if (requestedScenario !== null && requestedScenario !== "error" && !isQgisScenario(requestedScenario)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_SCENARIO",
          message: "scenario must be current, stale, offline, unavailable, empty, or error.",
          requestId,
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const scenario: QgisScenario = isQgisScenario(requestedScenario) ? requestedScenario : "current";

  const backendScenario: BackendScenario = requestedScenario === "error" ? "error" : scenario;
  const backendResponse = await fetchConfiguredBackend(request, backendScenario);
  if (backendResponse) return backendResponse;

  if (requestedScenario === "error") {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return NextResponse.json(
      {
        error: {
          code: "SIMULATED_QGIS_ERROR",
          message: "The simulated QGIS adapter rejected this request.",
          requestId: requestIdForBackend(request),
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 350));
  return NextResponse.json(createSimulatedSnapshot(scenario), {
    headers: { "Cache-Control": "no-store" },
  });
}
