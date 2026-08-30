import { NextRequest, NextResponse } from "next/server";
import { backendUrlWithPath } from "@/lib/backend-url";
import { isWeatherSnapshot } from "@/lib/weather";

export const dynamic = "force-dynamic";

const BACKEND_PATH = "/api/v1/weather/snapshot";
const ALLOWED_PARAMETERS = ["latitude", "longitude", "elevationM", "name"] as const;

function error(message: string, status: number) {
  return NextResponse.json(
    { error: { code: status === 400 ? "INVALID_WEATHER_QUERY" : "WEATHER_UNAVAILABLE", message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function GET(request: NextRequest) {
  const configuredBase = process.env.CATALYST_BACKEND_URL;
  if (!configuredBase) return error("Weather data is temporarily unavailable.", 503);

  for (const parameter of ALLOWED_PARAMETERS) {
    if (request.nextUrl.searchParams.getAll(parameter).length > 1) {
      return error(`${parameter} may be supplied once.`, 400);
    }
  }

  try {
    const baseUrl = new URL(configuredBase);
    if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
      return error("Weather data is temporarily unavailable.", 503);
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
      return error(response.status === 400 ? "The weather location was rejected." : "Weather data is temporarily unavailable.", response.status === 400 ? 400 : 502);
    }
    if (!isWeatherSnapshot(payload)) return error("The weather service returned an unexpected response.", 502);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch {
    return error("The weather service is currently unreachable.", 502);
  }
}
