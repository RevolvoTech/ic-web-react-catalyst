import { describe, expect, it } from "vitest";
import {
  formatPercent,
  isSatelliteBoundingBox,
  isSatelliteCatalog,
  SATELLITE_CATALOG_SCHEMA_VERSION,
} from "../lib/satellite";

const validCatalog = {
  schemaVersion: SATELLITE_CATALOG_SCHEMA_VERSION,
  source: {
    name: "Copernicus Data Space Ecosystem",
    collection: "Sentinel-2 Level-2A",
    protocol: "STAC 1.1.0",
    catalogUrl: "https://stac.dataspace.copernicus.eu/v1",
  },
  query: {
    bbox: [76.48, 35.7, 76.56, 35.78],
    from: "2026-07-01",
    to: "2026-08-30",
    maxCloudCoverPercent: 30,
    limit: 8,
  },
  scenes: [
    {
      id: "S2B_MSIL2A_20260829T053639_N0512_R005_T43SFV_20260829T091959",
      collection: "sentinel-2-l2a",
      capturedAt: "2026-08-29T05:36:39.024Z",
      publishedAt: "2026-08-29T10:00:00Z",
      platform: "sentinel-2b",
      groundSampleDistanceM: 10,
      cloudCoverPercent: 1.96,
      snowCoverPercent: 38.92,
      bbox: [76, 35, 78, 36],
      thumbnailUrl: "https://zipper.creodias.eu/odata/v1/Products/example/$value",
    },
  ],
  retrievedAt: "2026-08-30T12:00:00Z",
  attribution: "Contains modified Copernicus Sentinel data.",
  notice: "Planning context only.",
};

describe("satellite catalogue validation", () => {
  it("accepts the normalized provider-neutral contract", () => {
    expect(isSatelliteCatalog(validCatalog)).toBe(true);
  });

  it("rejects unsafe bounding boxes and invalid scene metadata", () => {
    expect(isSatelliteBoundingBox([-181, 35, 76, 36])).toBe(false);
    expect(isSatelliteBoundingBox([76, 36, 75, 35])).toBe(false);
    expect(isSatelliteCatalog({ ...validCatalog, scenes: [{ ...validCatalog.scenes[0], groundSampleDistanceM: 0 }] })).toBe(false);
  });

  it("formats nullable percentages without inventing a value", () => {
    expect(formatPercent(1.96)).toBe("2.0%");
    expect(formatPercent(null)).toBe("Not supplied");
  });
});
