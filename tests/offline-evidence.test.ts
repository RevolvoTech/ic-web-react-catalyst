import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { evidenceFetch } from "../lib/offline-evidence";

const catalog = {
  schemaVersion: "catalyst.satellite.catalog.v1",
  source: { name: "Copernicus Data Space Ecosystem", collection: "Sentinel-2 Level-2A", protocol: "STAC 1.1.0", catalogUrl: "https://catalogue.dataspace.copernicus.eu/stac" },
  query: { bbox: [74.35,35.05,74.85,35.45], from: "2026-11-01T00:00:00Z", to: "2026-11-15T00:00:00Z", maxCloudCoverPercent: 30, limit: 8 },
  scenes: [], retrievedAt: "2026-11-15T12:00:00Z", attribution: "Copernicus Sentinel data", notice: "Test evidence.",
};
afterEach(() => vi.unstubAllGlobals());
describe("last-known evidence", () => {
  it("keeps the last validated catalogue when a malformed response claims the same schema", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(catalog))
      .mockResolvedValueOnce(Response.json({ schemaVersion: catalog.schemaVersion, scenes: "invalid" }))
      .mockResolvedValueOnce(new Response("outage", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    const url = "/api/satellite/catalog?bbox=test-region";
    await evidenceFetch(url, "satellite", {});
    await evidenceFetch(url, "satellite", {});
    const offline = await evidenceFetch(url, "satellite", {});
    expect(offline.headers.get("x-catalyst-offline")).toBe("1");
    expect(await offline.json()).toEqual(catalog);
  });
  it("does not substitute evidence from another area or ignore request cancellation", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(catalog))
      .mockRejectedValueOnce(new Error("Disconnected"))
      .mockRejectedValueOnce(new Error("Canceled"));
    vi.stubGlobal("fetch", fetcher);
    await evidenceFetch("/api/satellite/catalog?bbox=original", "satellite", {});
    await expect(evidenceFetch("/api/satellite/catalog?bbox=different", "satellite", {})).rejects.toThrow("Disconnected");
    const controller = new AbortController(); controller.abort();
    await expect(evidenceFetch("/api/satellite/catalog?bbox=original", "satellite", { signal: controller.signal })).rejects.toThrow("Canceled");
  });
});
