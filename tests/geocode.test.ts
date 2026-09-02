import { describe, expect, it } from "vitest";
import { isMapLocation, normalizeNominatimLocation } from "../lib/geocode";

describe("map-center reverse geocoding", () => {
  it("normalizes an OpenStreetMap result with concise place hierarchy and provenance", () => {
    const location = normalizeNominatimLocation({
      name: "Shigar",
      display_name: "Shigar, Shigar District, Gilgit-Baltistan, Pakistan",
      address: { county: "Shigar District", state: "Gilgit-Baltistan", country: "Pakistan" },
    }, { latitude: 35.742, longitude: 76.519 });

    expect(location).toMatchObject({
      schemaVersion: "catalyst.map.location.v1",
      name: "Shigar, Gilgit-Baltistan, Pakistan",
      latitude: 35.742,
      longitude: 76.519,
      source: { name: "OpenStreetMap Nominatim" },
    });
    expect(isMapLocation(location)).toBe(true);
  });

  it("falls back to administrative geography for unnamed terrain", () => {
    const location = normalizeNominatimLocation({
      display_name: "Shigar District, Gilgit-Baltistan, Pakistan",
      address: { county: "Shigar District", state: "Gilgit-Baltistan", country: "Pakistan" },
    }, { latitude: 35.75, longitude: 76.52 });

    expect(location?.name).toBe("Shigar District, Gilgit-Baltistan, Pakistan");
  });

  it("rejects incomplete or unbounded payloads", () => {
    expect(normalizeNominatimLocation(null, { latitude: 0, longitude: 0 })).toBeNull();
    expect(normalizeNominatimLocation({ display_name: "Unknown", address: {} }, { latitude: 0, longitude: 0 })).toBeNull();
    expect(isMapLocation({ schemaVersion: "catalyst.map.location.v1" })).toBe(false);
  });
});

