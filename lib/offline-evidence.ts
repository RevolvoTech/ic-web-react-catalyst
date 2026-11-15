import { readField, writeField } from "./field-store";
import { isWeatherSnapshot } from "./weather";
import { isSatelliteCatalog } from "./satellite";

interface CachedEvidence { url: string; body: unknown }
export async function evidenceFetch(url: string, kind: "weather" | "satellite", init: RequestInit) {
  let failure: unknown;
  try {
    const response = await fetch(url, init);
    if (response.status < 500) {
      if (response.ok) {
        const body: unknown = await response.clone().json();
        if ((kind === "weather" && isWeatherSnapshot(body)) || (kind === "satellite" && isSatelliteCatalog(body))) {
          // One last forecast and one catalogue (at most ten scenes), matched to
          // the exact area/query. A different location must never reuse it.
          if (kind === "satellite" && "scenes" in body && Array.isArray(body.scenes)) body.scenes = body.scenes.slice(0, 10);
          await writeField(`public:${kind}`, "latest", { url, body }).catch(() => undefined);
        }
      }
      return response;
    }
    failure = new Error("Evidence provider is unavailable.");
  } catch (reason) { failure = reason; }
  if (init.signal?.aborted) throw failure;
  const cached = await readField<CachedEvidence>(`public:${kind}`, "latest").catch(() => null);
  if (cached?.url === url) return Response.json(cached.body, { headers: { "x-catalyst-offline": "1" } });
  throw failure;
}
