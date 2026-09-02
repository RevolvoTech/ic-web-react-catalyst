import { expect, test } from "@playwright/test";

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Catalyst browser test" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="35.2375" lon="74.5892"><ele>8126</ele><name>Nanga Parbat summit</name><type>summit</type></wpt>
  <trk><trkseg>
    <trkpt lat="35.2200" lon="74.5700"><ele>7000</ele></trkpt>
    <trkpt lat="35.2280" lon="74.5780"><ele>7400</ele></trkpt>
    <trkpt lat="35.2375" lon="74.5892"><ele>8126</ele></trkpt>
  </trkseg></trk>
</gpx>`;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("live weather is presented with source and human-decision context", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Read the window. See what limits it." })).toBeVisible();
  await expect(page.getByText("Nanga Parbat summit · 8,126 m")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Source Open-Meteo")).toBeVisible();
  await expect(page.getByText("Decision support · Human review required")).toBeVisible();
});

test("failed live refreshes identify retained weather and satellite data as last known", async ({ page }) => {
  let weatherRequests = 0;
  let satelliteRequests = 0;
  await page.route("**/api/weather/snapshot**", async (route) => {
    weatherRequests += 1;
    if (weatherRequests === 1) return route.continue();
    return route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Weather test outage." } }),
    });
  });
  await page.route("**/api/satellite/catalog**", async (route) => {
    satelliteRequests += 1;
    if (satelliteRequests === 1) return route.continue();
    return route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Satellite test outage." } }),
    });
  });

  await page.goto("/demo");
  const weather = page.locator(".weather-section");
  const satellite = page.locator(".satellite-experience");
  await expect(weather.getByText("Current", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(satellite.getByText("Live catalogue", { exact: true })).toBeVisible({ timeout: 20_000 });

  await weather.getByRole("button", { name: "Refresh forecast" }).click();
  await satellite.getByRole("button", { name: "Refresh scenes" }).click();

  await expect(weather.getByText("Refresh failed · last known", { exact: true })).toBeVisible();
  await expect(weather.getByText("Forecast unavailable", { exact: true })).toBeVisible();
  await expect(satellite.getByText("Refresh failed · last known", { exact: true })).toBeVisible();
  await expect(satellite.getByText("Live catalogue unavailable", { exact: true })).toBeVisible();
});

test("a late processed-image response cannot attach to a newly selected scene", async ({ page }) => {
  const bbox = [76.48, 35.7, 76.56, 35.78];
  const scene = (id: string, capturedAt: string) => ({
    id,
    collection: "sentinel-2-l2a",
    capturedAt,
    publishedAt: capturedAt,
    platform: "sentinel-2b",
    groundSampleDistanceM: 10,
    cloudCoverPercent: 4,
    snowCoverPercent: 30,
    bbox,
    thumbnailUrl: null,
  });
  await page.route("**/api/satellite/catalog**", (route) => route.fulfill({ json: {
    schemaVersion: "catalyst.satellite.catalog.v1",
    source: {
      name: "Copernicus Data Space Ecosystem",
      collection: "Sentinel-2 Level-2A",
      protocol: "STAC 1.1.0",
      catalogUrl: "https://catalogue.dataspace.copernicus.eu/stac",
    },
    query: { bbox, from: "2026-07-01T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z", maxCloudCoverPercent: 30, limit: 8 },
    scenes: [
      scene("S2B_MSIL2A_20260829T053639_N0512_R005_T43SFV_20260829T091959", "2026-08-29T05:36:39.024Z"),
      scene("S2A_MSIL2A_20260820T053641_N0512_R005_T43SFV_20260820T091959", "2026-08-20T05:36:41.024Z"),
    ],
    retrievedAt: "2026-09-01T12:00:00.000Z",
    attribution: "Copernicus Sentinel data",
    notice: "Decision support only.",
  } }));
  await page.route("**/api/satellite/render**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("processed-scene-one") });
  });

  await page.goto("/demo");
  const satellite = page.locator(".satellite-experience");
  const scenes = satellite.locator(".satellite-scene-list button");
  await expect(scenes).toHaveCount(2);
  const renderRequest = page.waitForRequest("**/api/satellite/render**");
  await satellite.getByRole("button", { name: "Load processed image" }).click();
  await renderRequest;
  await scenes.nth(1).click();
  await page.waitForTimeout(700);

  await expect(scenes.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(satellite.locator(".satellite-preview__stamp span").first()).toHaveText("Catalogue quicklook");
});

test("late route evidence cannot attach to a replacement route", async ({ page }) => {
  await page.route("**/api/weather/route", async (route) => {
    const analyzedRoute = route.request().postDataJSON() as {
      segments: { id: string; name: string }[];
      points: { latitude: number; longitude: number; elevationM: number | null }[];
    };
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({ json: {
      schemaVersion: "catalyst.weather.route.v1",
      mode: "live",
      source: { name: "Open-Meteo", model: "ECMWF IFS 0.25°", license: "CC BY 4.0", attributionUrl: "https://open-meteo.com/" },
      retrievedAt: "2026-09-01T12:00:00.000Z",
      forecastWindowHours: 24,
      segments: analyzedRoute.segments.map((segment, index) => ({
        segmentId: segment.id,
        segmentName: segment.name,
        representative: {
          latitude: analyzedRoute.points[index]?.latitude ?? 35.22,
          longitude: analyzedRoute.points[index]?.longitude ?? 74.57,
          elevationM: analyzedRoute.points[index]?.elevationM ?? null,
          altitudeBand: "7,000–8,000 m band",
        },
        thresholdWindKmh: 65,
        forecastWindowHours: 24,
        peakWindKmh: 40,
        peakGustKmh: 50,
        status: "within-threshold",
        explanation: "Below the configured advisory threshold.",
      })),
      notice: "Decision support only.",
    } });
  });

  await page.goto("/demo");
  const route = page.locator(".route-section");
  const upload = async (routeName: string) => {
    await route.getByLabel("Route name").fill(routeName);
    await route.getByLabel("GPX file").setInputFiles({ name: `${routeName}.gpx`, mimeType: "application/gpx+xml", buffer: Buffer.from(gpx) });
    await route.getByRole("button", { name: "Analyze route" }).click();
    await expect(route.getByRole("heading", { name: routeName })).toBeVisible();
  };

  await upload("First route");
  const weatherRequest = page.waitForRequest("**/api/weather/route");
  await route.getByRole("button", { name: "Analyze weather" }).click();
  await weatherRequest;
  await upload("Replacement route");
  await page.waitForTimeout(1_000);

  await expect(route.getByRole("heading", { name: "Replacement route" })).toBeVisible();
  await expect(route.getByRole("heading", { name: "Altitude-aware wind evidence" })).toHaveCount(0);
});

test("a GPX route becomes a reviewable altitude-aware weather plan without inventing terrain data", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/hazards/analyze", async (interception) => {
    const analyzedRoute = interception.request().postDataJSON() as { segments: { id: string; name: string }[] };
    const zoneIds = analyzedRoute.segments.map((segment, index) => `zone-${index + 1}`);
    await interception.fulfill({ json: {
      schemaVersion: "catalyst.hazard.analysis.v1",
      mode: "live",
      source: { name: "Copernicus DEM terrain screening", dataset: "GLO-30", method: "slope-aspect-curvature-d8-flow" },
      retrievedAt: "2026-09-01T12:00:00.000Z",
      terrain: {
        schemaVersion: "catalyst.terrain.v1",
        mode: "live",
        source: { name: "Copernicus DEM", dataset: "GLO-30", nominalResolutionM: 30, protocol: "Sentinel Hub Process API" },
        retrievedAt: "2026-09-01T12:00:00.000Z",
        raster: { width: 32, height: 32, effectiveResolutionM: 30, validPixelPercent: 96 },
        intersections: analyzedRoute.segments.map((segment) => ({ segmentId: segment.id, segmentName: segment.name, sampledPointCount: 5, averageTerrainSlopeDegrees: 31, maximumTerrainSlopeDegrees: 38, slopeClass: "steep", interpretation: "DEM screening result; human validation required." })),
        notice: "Terrain screening only.",
      },
      zones: { type: "FeatureCollection", features: analyzedRoute.segments.map((segment, index) => ({
        type: "Feature",
        id: zoneIds[index],
        geometry: { type: "Polygon", coordinates: [[[74.568 + index * 0.008, 35.218 + index * 0.008], [74.58 + index * 0.008, 35.218 + index * 0.008], [74.58 + index * 0.008, 35.23 + index * 0.008], [74.568 + index * 0.008, 35.23 + index * 0.008], [74.568 + index * 0.008, 35.218 + index * 0.008]]] },
        properties: { schemaVersion: "catalyst.hazard.zone.v1", name: `${segment.name} release screen`, type: "avalanche", terrainClass: "release-screen", riskLevel: "high", elevationRange: { minimumM: 7_000, maximumM: 8_126 }, slopeP90Degrees: 38, meanAspectDegrees: 120, meanCurvature: 0.01, maximumFlowAccumulationCells: 40, dataSource: "Copernicus DEM GLO-30", assessedAt: "2026-09-01T12:00:00.000Z", assessedBy: "Automated · human validation pending", satelliteSceneDate: null, notes: "Terrain-derived screening cell, not an observed avalanche." },
      })) },
      intersections: analyzedRoute.segments.map((segment, index) => ({ segmentId: segment.id, segmentName: segment.name, zoneCount: 1, zoneIds: [zoneIds[index]], maximumRiskLevel: "high", screenedDistanceKm: 0.8, screenedPercent: 50, summary: "A terrain screening cell intersects this route sample.", humanReviewRequired: true })),
      notice: "Human review required. Screening zones are not observed hazards.",
    } });
  });
  await page.route("**/api/decision/briefing", async (interception) => {
    await interception.fulfill({ json: {
      schemaVersion: "catalyst.decision.briefing.v1",
      generatedAt: "2026-09-01T12:05:00.000Z",
      assessment: "mixed",
      engine: { kind: "rules-based", model: null, fallbackReason: "Groq API key is not configured." },
      title: "Kinshofer test route evidence briefing",
      summary: "The attached forecast is within its configured wind threshold while DEM screening identifies terrain intersections that require field validation and leader review.",
      favorableFactors: [{ label: "Wind thresholds", evidence: "The sampled route segments are within the configured threshold.", source: "Open-Meteo", observedAt: "2026-09-01T12:00:00.000Z" }],
      limitingFactors: [{ label: "Terrain screening", evidence: "High terrain-screening intersections require validation.", source: "Copernicus DEM terrain screening", observedAt: "2026-09-01T12:00:00.000Z" }],
      unknowns: ["No recent human field observation is attached."],
      nextChecks: ["Validate screened zones against current field observations."],
      humanApprovalRequired: true,
      notice: "Decision support only. The expedition leader must approve any action.",
    } });
  });
  await page.goto("/demo");
  const route = page.locator(".route-section");
  await route.getByLabel("Route name").fill("Kinshofer test route");
  await route.getByLabel("GPX file").setInputFiles({ name: "route.gpx", mimeType: "application/gpx+xml", buffer: Buffer.from(gpx) });
  await route.getByRole("button", { name: "Analyze route" }).click();
  await expect(route.getByRole("heading", { name: "Kinshofer test route" })).toBeVisible();
  await expect(route.getByRole("cell", { name: "DEM pending" })).toBeVisible();
  await route.getByRole("button", { name: "Analyze weather" }).click();
  await expect(route.getByRole("heading", { name: "Altitude-aware wind evidence" })).toBeVisible({ timeout: 30_000 });
  await expect(route.getByText("Open-Meteo · ECMWF IFS 0.25°")).toBeVisible();
  await expect(route.getByRole("group", { name: "Inspect route weather segment" })).toBeVisible();
  await expect(route.getByText("Configured threshold", { exact: true })).toBeVisible();
  await route.getByRole("button", { name: "Analyze hazards" }).click();
  await expect(route.getByRole("heading", { name: "Screening zones & route intersections" })).toBeVisible();
  await expect(route.getByRole("group", { name: "Inspect intersecting terrain zone" })).toBeVisible();
  await expect(route.getByText("Human review required", { exact: true }).first()).toBeVisible();
  await route.getByRole("button", { name: "Generate briefing" }).click();
  await expect(route.getByRole("heading", { name: "Kinshofer test route evidence briefing" })).toBeVisible();
  await expect(route.getByText("Rules-based synthesis · AI not used")).toBeVisible();
  await expect(route.getByText("The expedition leader must approve any action.")).toBeVisible();
  await route.getByRole("button", { name: "Review draft" }).click();
  await expect(route.getByText("Review", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.reload();
  await expect(route.getByText("Saved browser plan restored.")).toBeVisible();
  await expect(route.getByRole("heading", { name: "Kinshofer test route evidence briefing" })).toBeVisible();
});
