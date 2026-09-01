"use client";

import { AlertTriangle, BrainCircuit, CheckCircle2, CircleHelp, CloudSun, Download, FileCheck2, Layers3, ListChecks, MountainSnow, Route as RouteIcon, Upload, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { isDecisionBriefing, type DecisionAssessment, type DecisionBriefing, type DecisionEvidence } from "@/lib/decision";
import { isHazardAnalysis, type HazardAnalysis, type HazardRiskLevel } from "@/lib/hazard";
import { isRouteAnalysis, routeValue, type RouteAnalysis } from "@/lib/route";
import { isRouteWeatherAnalysis, type RouteWeatherAnalysis, type RouteWeatherStatus } from "@/lib/route-weather";
import { isTerrainAnalysis, type TerrainAnalysis, type TerrainSlopeClass } from "@/lib/terrain";

type PlanStage = "draft" | "review" | "published";
type BriefingScene = { sceneId: string; capturedAt: string; cloudCoverPercent: number | null; groundSampleDistanceM: number };
const SAVED_PLAN_KEY = "catalyst:saved-route-plan:v1";

function terrainTone(value: TerrainSlopeClass | undefined): "success" | "warning" | "critical" | "unknown" {
  if (value === "gentle") return "success";
  if (value === "moderate" || value === "steep") return "warning";
  if (value === "very-steep") return "critical";
  return "unknown";
}

function weatherTone(value: RouteWeatherStatus | undefined): "success" | "warning" | "critical" | "unknown" {
  if (value === "within-threshold") return "success";
  if (value === "near-threshold") return "warning";
  if (value === "exceeds-threshold") return "critical";
  return "unknown";
}

function weatherLabel(value: RouteWeatherStatus | undefined) {
  if (value === "within-threshold") return "Below threshold";
  if (value === "near-threshold") return "Near threshold";
  if (value === "exceeds-threshold") return "Exceeds threshold";
  return "Weather pending";
}

function hazardTone(value: HazardRiskLevel | undefined): "success" | "warning" | "critical" | "unknown" {
  if (value === "low") return "success";
  if (value === "moderate" || value === "high") return "warning";
  if (value === "critical") return "critical";
  return "unknown";
}

function briefingTone(value: DecisionAssessment): "success" | "warning" | "critical" | "unknown" {
  if (value === "favorable") return "success";
  if (value === "mixed") return "warning";
  if (value === "unfavorable") return "critical";
  return "unknown";
}

function EvidenceList({ title, items, icon }: { title: string; items: DecisionEvidence[]; icon: React.ReactNode }) {
  return <section><header>{icon}<h4>{title}</h4><strong>{items.length}</strong></header>{items.length ? <ul>{items.map((item, index) => <li key={`${item.label}-${index}`}><strong>{item.label}</strong><p>{item.evidence}</p><small>{item.source}{item.observedAt ? ` · ${new Date(item.observedAt).toLocaleString()}` : ""}</small></li>)}</ul> : <p className="briefing-empty">No factors in this category.</p>}</section>;
}

function DecisionBriefingView({ briefing }: { briefing: DecisionBriefing }) {
  return <div className="decision-briefing" aria-live="polite"><header><div className="weather-panel-title"><BrainCircuit aria-hidden="true" /><div><span className="data-label">Human-reviewed decision support</span><h3>{briefing.title}</h3></div></div><div><StatusBadge tone={briefingTone(briefing.assessment)}>{briefing.assessment.replace("-", " ")}</StatusBadge><span>{briefing.engine.kind === "groq" ? `AI synthesis · Groq · ${briefing.engine.model}` : "Rules-based synthesis · AI not used"}</span></div></header><div className="decision-briefing__summary"><p>{briefing.summary}</p>{briefing.engine.fallbackReason ? <small>{briefing.engine.fallbackReason}</small> : null}</div><div className="decision-evidence-grid"><EvidenceList title="Favorable factors" items={briefing.favorableFactors} icon={<CheckCircle2 aria-hidden="true" />} /><EvidenceList title="Limiting factors" items={briefing.limitingFactors} icon={<AlertTriangle aria-hidden="true" />} /></div><div className="decision-next"><section><header><CircleHelp aria-hidden="true" /><h4>Unknowns</h4></header>{briefing.unknowns.length ? <ul>{briefing.unknowns.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No unknowns were recorded in the submitted evidence.</p>}</section><section><header><ListChecks aria-hidden="true" /><h4>Next checks</h4></header><ol>{briefing.nextChecks.map((item) => <li key={item}>{item}</li>)}</ol></section></div><footer><AlertTriangle aria-hidden="true" /><p>{briefing.notice}</p></footer></div>;
}

function errorMessage(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = value.error;
  return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : null;
}

function downloadBlob(blob: Blob, name: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function ElevationProfile({ route }: { route: RouteAnalysis }) {
  const points = route.points.filter((point) => point.elevationM !== null);
  const minimum = Math.min(...points.map((point) => point.elevationM ?? 0));
  const maximum = Math.max(...points.map((point) => point.elevationM ?? 0));
  const range = Math.max(1, maximum - minimum);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${(point.cumulativeDistanceKm / Math.max(0.001, route.summary.distanceKm)) * 800} ${210 - (((point.elevationM ?? minimum) - minimum) / range) * 180}`).join(" ");
  return (
    <div className="route-profile">
      {points.length > 1 ? <svg viewBox="0 0 800 240" role="img" aria-labelledby="route-profile-title route-profile-description"><title id="route-profile-title">Route elevation profile</title><desc id="route-profile-description">Elevation from {minimum.toLocaleString()} to {maximum.toLocaleString()} metres across {route.summary.distanceKm} kilometres. Exact segment values follow.</desc><path className="route-profile__area" d={`${path} L 800 230 L 0 230 Z`} /><path className="route-profile__line" d={path} /><line x1="0" y1="230" x2="800" y2="230" /></svg> : <p className="route-profile__empty">This GPX file does not contain enough elevation points to draw a profile.</p>}
    </div>
  );
}

function TerrainPlanView({ route, terrain }: { route: RouteAnalysis; terrain: TerrainAnalysis }) {
  const longitudes = route.points.map((point) => point.longitude);
  const latitudes = route.points.map((point) => point.latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const x = (longitude: number) => 30 + (longitude - west) / Math.max(0.000_001, east - west) * 740;
  const y = (latitude: number) => 250 - (latitude - south) / Math.max(0.000_001, north - south) * 220;
  return (
    <div className="terrain-plan-view">
      <svg viewBox="0 0 800 280" role="img" aria-labelledby="terrain-route-title terrain-route-description">
        <title id="terrain-route-title">Copernicus terrain slope along the uploaded route</title>
        <desc id="terrain-route-description">Each numbered route segment is styled by its maximum intersecting DEM slope class. Exact values follow below.</desc>
        {route.segments.map((segment, index) => {
          const points = route.points.slice(segment.fromPointIndex, segment.toPointIndex + 1);
          const intersection = terrain.intersections.find((item) => item.segmentId === segment.id);
          const path = points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${x(point.longitude)} ${y(point.latitude)}`).join(" ");
          const middle = points[Math.floor(points.length / 2)];
          return <g key={segment.id}><path className="terrain-route-line" data-slope={intersection?.slopeClass ?? "unknown"} d={path} />{middle ? <text x={x(middle.longitude)} y={y(middle.latitude) - 12}>{index + 1}</text> : null}</g>;
        })}
        {route.waypoints.map((waypoint, index) => <circle key={`${waypoint.name}-${index}`} cx={x(waypoint.longitude)} cy={y(waypoint.latitude)} r="6"><title>{waypoint.name}</title></circle>)}
      </svg>
      <div className="terrain-plan-legend" aria-label="Terrain slope legend"><span data-slope="gentle">Gentle &lt;15°</span><span data-slope="moderate">Moderate 15–30°</span><span data-slope="steep">Steep 30–45°</span><span data-slope="very-steep">Very steep &gt;45°</span></div>
    </div>
  );
}

function RouteWeatherPlan({ route, weather, selectedId, onSelect }: { route: RouteAnalysis; weather: RouteWeatherAnalysis; selectedId: string; onSelect: (id: string) => void }) {
  const longitudes = route.points.map((point) => point.longitude);
  const latitudes = route.points.map((point) => point.latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const x = (longitude: number) => 30 + (longitude - west) / Math.max(0.000_001, east - west) * 740;
  const y = (latitude: number) => 250 - (latitude - south) / Math.max(0.000_001, north - south) * 220;
  const selected = weather.segments.find((segment) => segment.segmentId === selectedId) ?? weather.segments[0];
  return (
    <div className="route-weather-workspace">
      <div className="route-weather-plan">
        <svg viewBox="0 0 800 280" role="img" aria-labelledby="route-weather-title route-weather-description">
          <title id="route-weather-title">Twenty-four hour wind evidence along the uploaded route</title>
          <desc id="route-weather-description">Route segments are styled by their relationship to configured altitude-band sustained-wind thresholds. Exact values and text labels follow.</desc>
          {route.segments.map((segment, index) => {
            const points = route.points.slice(segment.fromPointIndex, segment.toPointIndex + 1);
            const evidence = weather.segments.find((item) => item.segmentId === segment.id);
            const path = points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${x(point.longitude)} ${y(point.latitude)}`).join(" ");
            const middle = points[Math.floor(points.length / 2)];
            return <g key={segment.id}><path className="route-weather-line" data-status={evidence?.status ?? "unavailable"} data-selected={segment.id === selectedId || undefined} d={path} />{middle ? <text x={x(middle.longitude)} y={y(middle.latitude) - 12}>{index + 1}</text> : null}</g>;
          })}
        </svg>
        <div className="route-weather-legend" aria-label="Route weather legend"><span data-status="within-threshold">Below threshold</span><span data-status="near-threshold">Near threshold</span><span data-status="exceeds-threshold">Exceeds threshold</span><span data-status="unavailable">Unavailable</span></div>
        <div className="route-weather-segments" role="group" aria-label="Inspect route weather segment">
          {weather.segments.map((segment, index) => <button key={segment.segmentId} type="button" data-status={segment.status} aria-pressed={segment.segmentId === selectedId} onClick={() => onSelect(segment.segmentId)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{segment.segmentName}</strong><small>{weatherLabel(segment.status)}</small></button>)}
        </div>
      </div>
      <aside className="route-weather-detail" aria-live="polite">
        {selected ? <><div className="weather-panel-title"><Wind aria-hidden="true" /><div><span className="data-label">Selected segment</span><h3>{selected.segmentName}</h3></div></div><StatusBadge tone={weatherTone(selected.status)}>{weatherLabel(selected.status)}</StatusBadge><dl><div><dt>Altitude band</dt><dd>{selected.representative.altitudeBand}</dd></div><div><dt>Sample elevation</dt><dd>{routeValue(selected.representative.elevationM, "m")}</dd></div><div><dt>24 h peak wind</dt><dd>{routeValue(selected.peakWindKmh, "km/h")}</dd></div><div><dt>24 h peak gust</dt><dd>{routeValue(selected.peakGustKmh, "km/h")}</dd></div><div><dt>Configured threshold</dt><dd>{routeValue(selected.thresholdWindKmh, "km/h")}</dd></div></dl><p>{selected.explanation}</p></> : <p>No segment weather is available.</p>}
      </aside>
    </div>
  );
}

function HazardPlanView({ route, hazard }: { route: RouteAnalysis; hazard: HazardAnalysis }) {
  const [visible, setVisible] = useState<Record<Exclude<HazardRiskLevel, "unknown">, boolean>>({ low: true, moderate: true, high: true, critical: true });
  const relevantIds = new Set(hazard.intersections.flatMap((intersection) => intersection.zoneIds));
  const relevantZones = hazard.zones.features.filter((zone) => relevantIds.has(zone.id));
  const [selectedId, setSelectedId] = useState(relevantZones[0]?.id ?? hazard.zones.features[0]?.id ?? "");
  const selected = hazard.zones.features.find((zone) => zone.id === selectedId);
  const coordinates = hazard.zones.features.flatMap((zone) => zone.geometry.coordinates[0] ?? []);
  const longitudes = [...route.points.map((point) => point.longitude), ...coordinates.map((point) => point[0] ?? 0)];
  const latitudes = [...route.points.map((point) => point.latitude), ...coordinates.map((point) => point[1] ?? 0)];
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const x = (longitude: number) => 30 + (longitude - west) / Math.max(0.000_001, east - west) * 740;
  const y = (latitude: number) => 250 - (latitude - south) / Math.max(0.000_001, north - south) * 220;
  return (
    <div className="hazard-workspace">
      <div className="hazard-map-panel">
        <fieldset><legend>Show terrain-screening layers</legend>{(["low", "moderate", "high", "critical"] as const).map((risk) => <label key={risk}><input type="checkbox" checked={visible[risk]} onChange={(event) => setVisible((current) => ({ ...current, [risk]: event.target.checked }))} /><span data-risk={risk} aria-hidden="true" />{risk}</label>)}</fieldset>
        <svg viewBox="0 0 800 280" role="img" aria-labelledby="hazard-map-title hazard-map-description">
          <title id="hazard-map-title">Copernicus DEM screening zones along the uploaded route</title>
          <desc id="hazard-map-description">Terrain-derived polygons are colored and patterned by screening level. They require human validation and are not current avalanche observations.</desc>
          {hazard.zones.features.filter((zone) => visible[zone.properties.riskLevel]).map((zone) => <polygon key={zone.id} className="hazard-zone" data-risk={zone.properties.riskLevel} data-selected={zone.id === selectedId || undefined} points={(zone.geometry.coordinates[0] ?? []).map((point) => `${x(point[0] ?? 0)},${y(point[1] ?? 0)}`).join(" ")} />)}
          {route.segments.map((segment) => <path key={segment.id} className="hazard-route-line" d={route.points.slice(segment.fromPointIndex, segment.toPointIndex + 1).map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.longitude)} ${y(point.latitude)}`).join(" ")} />)}
        </svg>
        <div className="hazard-zone-list" role="group" aria-label="Inspect intersecting terrain zone">{relevantZones.length ? relevantZones.map((zone) => <button key={zone.id} type="button" aria-pressed={zone.id === selectedId} data-risk={zone.properties.riskLevel} onClick={() => setSelectedId(zone.id)}><strong>{zone.properties.name}</strong><span>{zone.properties.type} · {zone.properties.riskLevel}</span></button>) : <p>No valid DEM screening zone intersects this route sample.</p>}</div>
      </div>
      <aside className="hazard-zone-detail" aria-live="polite">{selected ? <><div className="weather-panel-title"><Layers3 aria-hidden="true" /><div><span className="data-label">Selected screening cell</span><h3>{selected.properties.name}</h3></div></div><StatusBadge tone={hazardTone(selected.properties.riskLevel)}>{selected.properties.riskLevel} screening</StatusBadge><dl><div><dt>Terrain class</dt><dd>{selected.properties.terrainClass}</dd></div><div><dt>90th percentile slope</dt><dd>{selected.properties.slopeP90Degrees}°</dd></div><div><dt>Mean aspect</dt><dd>{selected.properties.meanAspectDegrees}°</dd></div><div><dt>Elevation range</dt><dd>{selected.properties.elevationRange.minimumM.toLocaleString()}–{selected.properties.elevationRange.maximumM.toLocaleString()} m</dd></div><div><dt>Mean curvature</dt><dd>{selected.properties.meanCurvature}</dd></div><div><dt>Max flow cells</dt><dd>{selected.properties.maximumFlowAccumulationCells.toLocaleString()}</dd></div></dl><p>{selected.properties.notes}</p><small>{selected.properties.dataSource}<br />{selected.properties.assessedBy}</small></> : <p>No terrain cell is selected.</p>}</aside>
      <div className="hazard-intersections" aria-label="Route hazard intersection summaries">{hazard.intersections.map((intersection) => <article key={intersection.segmentId}><div><strong>{intersection.segmentName}</strong><StatusBadge tone={hazardTone(intersection.maximumRiskLevel)}>{intersection.maximumRiskLevel}</StatusBadge></div><p>{intersection.summary}</p><small>Human review required</small></article>)}</div>
    </div>
  );
}

export function RoutePlanner() {
  const [route, setRoute] = useState<RouteAnalysis | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<PlanStage>("draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terrain, setTerrain] = useState<TerrainAnalysis | null>(null);
  const [hazard, setHazard] = useState<HazardAnalysis | null>(null);
  const [terrainBusy, setTerrainBusy] = useState(false);
  const [routeWeather, setRouteWeather] = useState<RouteWeatherAnalysis | null>(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [selectedWeatherSegmentId, setSelectedWeatherSegmentId] = useState("");
  const [satelliteScene, setSatelliteScene] = useState<BriefingScene | null>(null);
  const [briefing, setBriefing] = useState<DecisionBriefing | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [restoredPlan, setRestoredPlan] = useState(false);
  const publishedAt = useMemo(() => stage === "published" ? new Date().toISOString() : null, [stage]);

  useEffect(() => {
    function readScene(value: unknown) {
      if (typeof value !== "object" || value === null) return;
      const scene = value as Partial<BriefingScene>;
      if (typeof scene.sceneId === "string" && typeof scene.capturedAt === "string" && (scene.cloudCoverPercent === null || typeof scene.cloudCoverPercent === "number") && typeof scene.groundSampleDistanceM === "number") setSatelliteScene(scene as BriefingScene);
    }
    try { const stored = window.localStorage.getItem("catalyst:selected-satellite-scene"); if (stored) readScene(JSON.parse(stored)); } catch { /* A blocked storage context simply leaves imagery unattached. */ }
    const listener = (event: Event) => readScene((event as CustomEvent<unknown>).detail);
    window.addEventListener("catalyst:satellite-scene", listener);
    return () => window.removeEventListener("catalyst:satellite-scene", listener);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(SAVED_PLAN_KEY);
        if (stored) {
          const saved: unknown = JSON.parse(stored);
          if (typeof saved === "object" && saved !== null && "route" in saved && isRouteAnalysis(saved.route)) {
            setRoute(saved.route);
            if ("terrain" in saved && isTerrainAnalysis(saved.terrain)) setTerrain(saved.terrain);
            if ("hazard" in saved && isHazardAnalysis(saved.hazard)) setHazard(saved.hazard);
            if ("routeWeather" in saved && isRouteWeatherAnalysis(saved.routeWeather)) { setRouteWeather(saved.routeWeather); setSelectedWeatherSegmentId(saved.routeWeather.segments[0]?.segmentId ?? ""); }
            if ("briefing" in saved && isDecisionBriefing(saved.briefing)) setBriefing(saved.briefing);
            setRestoredPlan(true);
          }
        }
      } catch { /* Invalid or unavailable browser storage is ignored. */ }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady || !route) return;
    try { window.localStorage.setItem(SAVED_PLAN_KEY, JSON.stringify({ route, terrain, hazard, routeWeather, briefing, savedAt: new Date().toISOString() })); } catch { /* Storage quotas do not block the active plan. */ }
  }, [briefing, hazard, route, routeWeather, storageReady, terrain]);

  async function analyze() {
    if (!file) { setError("Choose a GPX file first."); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/routes/analyze?name=${encodeURIComponent(name || file.name.replace(/\.gpx$/iu, ""))}`, { method: "POST", body: await file.arrayBuffer(), headers: { accept: "application/json", "content-type": "application/gpx+xml" } });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload) ?? "Route analysis failed.");
      if (!isRouteAnalysis(payload)) throw new Error("The route service returned an unexpected response.");
      setRoute(payload); setTerrain(null); setHazard(null); setRouteWeather(null); setBriefing(null); setSelectedWeatherSegmentId(""); setStage("draft");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Route analysis failed."); }
    finally { setBusy(false); }
  }

  async function analyzeTerrain() {
    if (!route) return;
    setTerrainBusy(true); setError(null);
    try {
      const response = await fetch("/api/hazards/analyze", { method: "POST", body: JSON.stringify(route), headers: { "content-type": "application/json" } });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload) ?? "Hazard analysis failed.");
      if (!isHazardAnalysis(payload)) throw new Error("The hazard service returned an unexpected response.");
      setHazard(payload); setTerrain(payload.terrain);
      setBriefing(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Hazard analysis failed."); }
    finally { setTerrainBusy(false); }
  }

  async function analyzeWeather() {
    if (!route) return;
    setWeatherBusy(true); setError(null);
    try {
      const response = await fetch("/api/weather/route", { method: "POST", body: JSON.stringify(route), headers: { "content-type": "application/json" } });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload) ?? "Route weather analysis failed.");
      if (!isRouteWeatherAnalysis(payload)) throw new Error("The weather service returned an unexpected response.");
      setRouteWeather(payload); setSelectedWeatherSegmentId(payload.segments[0]?.segmentId ?? "");
      setBriefing(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Route weather analysis failed."); }
    finally { setWeatherBusy(false); }
  }

  async function createBriefing() {
    if (!route) return;
    setBriefingBusy(true); setError(null);
    try {
      const request = { route: { name: route.name, distanceKm: route.summary.distanceKm, maximumElevationM: route.summary.maximumElevationM }, weather: routeWeather, hazards: hazard, satellite: satelliteScene?.cloudCoverPercent === null || !satelliteScene ? null : { sceneId: satelliteScene.sceneId, capturedAt: satelliteScene.capturedAt, cloudCoverPercent: satelliteScene.cloudCoverPercent, groundSampleDistanceM: satelliteScene.groundSampleDistanceM } };
      const response = await fetch("/api/decision/briefing", { method: "POST", body: JSON.stringify(request), headers: { "content-type": "application/json" } });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload) ?? "Evidence briefing failed.");
      if (!isDecisionBriefing(payload)) throw new Error("The decision service returned an unexpected response.");
      setBriefing(payload);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Evidence briefing failed."); }
    finally { setBriefingBusy(false); }
  }

  async function exportKmz() {
    if (!route) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/routes/kmz", { method: "POST", body: JSON.stringify(route), headers: { "content-type": "application/json" } });
      if (!response.ok) throw new Error("KMZ export failed.");
      downloadBlob(await response.blob(), `${route.name.replace(/[^a-z0-9-]+/giu, "-")}.kmz`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "KMZ export failed."); }
    finally { setBusy(false); }
  }

  function publishPackage() {
    if (!route || stage !== "review") return;
    const manifest = { ...route, terrain, hazard, routeWeather, briefing, status: "published", publishedAt: new Date().toISOString(), notice: "Immutable export package. Shared server publication requires authenticated expedition access." };
    downloadBlob(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }), `${route.name.replace(/[^a-z0-9-]+/giu, "-")}-plan.json`);
    setStage("published");
  }

  return (
    <section className="route-section shell" aria-labelledby="route-title">
      <div className="route-section__heading"><div><p className="eyebrow">Route & elevation</p><h2 id="route-title">Upload the line.<br /><em>Inspect every climb.</em></h2></div><div><StatusBadge tone={route ? stage === "published" ? "success" : "information" : "unknown"}>{route ? stage : "Waiting for GPX"}</StatusBadge><p>Turn a field GPX file into a measured route, elevation profile, segment breakdown, waypoint inventory, and portable plan package.</p></div></div>
      <div className="route-console">
        {restoredPlan ? <div className="route-saved-state" role="status"><CheckCircle2 aria-hidden="true" /><p><strong>Saved browser plan restored.</strong> Its attached evidence keeps the original source times; refresh each live layer when connected.</p></div> : null}
        <form className="route-upload" onSubmit={(event) => { event.preventDefault(); void analyze(); }}>
          <div><label htmlFor="route-name">Route name</label><input id="route-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={180} placeholder="Kinshofer route" /></div>
          <div><label htmlFor="route-file">GPX file</label><input id="route-file" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div>
          <button className="button button--primary" type="submit" disabled={busy || !file}><Upload aria-hidden="true" />{busy ? "Working…" : "Analyze route"}</button>
        </form>
        {error ? <div className="route-alert" role="alert"><AlertTriangle aria-hidden="true" /><div><strong>Route action unavailable</strong><p>{error}</p></div></div> : null}
        {route ? <>
          <div className="route-summary" aria-label="Route summary"><div><span>Distance</span><strong>{routeValue(route.summary.distanceKm, "km", 2)}</strong></div><div><span>Elevation gain</span><strong>{routeValue(route.summary.elevationGainM, "m")}</strong></div><div><span>High point</span><strong>{routeValue(route.summary.maximumElevationM, "m")}</strong></div><div><span>Estimated movement</span><strong>{routeValue(route.summary.estimatedHours, "h", 1)}</strong></div></div>
          <div className="route-workspace"><div className="route-elevation"><div className="weather-panel-title"><MountainSnow aria-hidden="true" /><div><span className="data-label">GPX elevation</span><h3>{route.name}</h3></div></div><ElevationProfile route={route} /><p className="route-method"><AlertTriangle aria-hidden="true" />{route.terrainAssessment.notice}</p></div><div className="route-waypoints"><div className="weather-panel-title"><RouteIcon aria-hidden="true" /><div><span className="data-label">Field markers</span><h3>{route.waypoints.length} waypoints</h3></div></div>{route.waypoints.length ? <ul>{route.waypoints.map((waypoint, index) => <li key={`${waypoint.name}-${index}`}><span>{waypoint.type}</span><strong>{waypoint.name}</strong><small>{routeValue(waypoint.elevationM, "m")}</small></li>)}</ul> : <p>No waypoints were included in this GPX file.</p>}</div></div>
          <div className="route-table-scroll"><table><caption>Calculated route segments</caption><thead><tr><th>Segment</th><th>Distance</th><th>Gain / loss</th><th>Est. time</th><th>Max route gradient</th><th>Weather · next 24 h</th><th>Terrain intersection</th></tr></thead><tbody>{route.segments.map((segment) => { const intersection = terrain?.intersections.find((item) => item.segmentId === segment.id); const evidence = routeWeather?.segments.find((item) => item.segmentId === segment.id); const tone = terrainTone(intersection?.slopeClass); return <tr key={segment.id} data-selected={segment.id === selectedWeatherSegmentId || undefined}><th scope="row">{evidence ? <button className="route-segment-select" type="button" aria-pressed={segment.id === selectedWeatherSegmentId} onClick={() => setSelectedWeatherSegmentId(segment.id)}>{segment.name}</button> : segment.name}</th><td>{routeValue(segment.distanceKm, "km", 2)}</td><td>+{segment.elevationGainM.toLocaleString()} / −{segment.elevationLossM.toLocaleString()} m</td><td>{routeValue(segment.estimatedHours, "h", 1)}</td><td><span className="gradient-marker" data-gradient={segment.gradientClass} aria-hidden="true" />{routeValue(segment.maximumRouteGradientDegrees, "°", 1)} · {segment.gradientClass}</td><td><StatusBadge tone={weatherTone(evidence?.status)}>{evidence ? `${weatherLabel(evidence.status)} · ${routeValue(evidence.peakWindKmh, "km/h")}` : "Weather pending"}</StatusBadge></td><td><StatusBadge tone={tone}>{intersection ? `${intersection.slopeClass} · ${routeValue(intersection.maximumTerrainSlopeDegrees, "°", 1)}` : "DEM pending"}</StatusBadge></td></tr>; })}</tbody></table></div>
          {routeWeather ? <div className="route-weather-analysis"><header><div className="weather-panel-title"><CloudSun aria-hidden="true" /><div><span className="data-label">Live route weather</span><h3>Altitude-aware wind evidence</h3></div></div><div><span>{routeWeather.source.name} · {routeWeather.source.model}</span><span>Retrieved {new Date(routeWeather.retrievedAt).toLocaleString()} · {routeWeather.forecastWindowHours} h window</span></div></header><RouteWeatherPlan route={route} weather={routeWeather} selectedId={selectedWeatherSegmentId} onSelect={setSelectedWeatherSegmentId} /><footer><AlertTriangle aria-hidden="true" /><p>{routeWeather.notice}</p></footer></div> : null}
          {terrain ? <div className="terrain-analysis"><header><div className="weather-panel-title"><Layers3 aria-hidden="true" /><div><span className="data-label">Live terrain evidence</span><h3>Route–slope intersections</h3></div></div><div><span>{terrain.source.name} {terrain.source.dataset}</span><span>{terrain.raster.effectiveResolutionM} m effective sample · {terrain.raster.validPixelPercent}% valid cells</span></div></header><TerrainPlanView route={route} terrain={terrain} /><div className="terrain-bands" aria-label="Slope classifications">{terrain.intersections.map((intersection) => <article key={intersection.segmentId}><div><strong>{intersection.segmentName}</strong><StatusBadge tone={terrainTone(intersection.slopeClass)}>{intersection.slopeClass}</StatusBadge></div><div className="terrain-band" data-slope={intersection.slopeClass}><span style={{ width: `${Math.min(100, (intersection.maximumTerrainSlopeDegrees ?? 0) / 60 * 100)}%` }} /></div><dl><div><dt>Average</dt><dd>{routeValue(intersection.averageTerrainSlopeDegrees, "°", 1)}</dd></div><div><dt>Maximum</dt><dd>{routeValue(intersection.maximumTerrainSlopeDegrees, "°", 1)}</dd></div><div><dt>Samples</dt><dd>{intersection.sampledPointCount}</dd></div></dl><p>{intersection.interpretation}</p></article>)}</div><footer><AlertTriangle aria-hidden="true" /><p>{terrain.notice} Snowpack and weekly SAR change detection are not included in this terrain result.</p></footer></div> : null}
          {hazard ? <div className="hazard-analysis"><header><div className="weather-panel-title"><Layers3 aria-hidden="true" /><div><span className="data-label">Terrain hazard layers</span><h3>Screening zones & route intersections</h3></div></div><div><span>{hazard.source.dataset} · slope, aspect, curvature, D8 flow</span><span>{hazard.zones.features.length} bounded GeoJSON zones · {new Date(hazard.retrievedAt).toLocaleString()}</span></div></header><HazardPlanView key={hazard.retrievedAt} route={route} hazard={hazard} /><footer><AlertTriangle aria-hidden="true" /><p>{hazard.notice}</p></footer></div> : null}
          {briefing ? <DecisionBriefingView briefing={briefing} /> : null}
          <div className="route-publication"><div><span className="data-label">Plan workflow</span><ol aria-label="Plan status"><li data-active={stage === "draft"}>Draft</li><li data-active={stage === "review"}>Review</li><li data-active={stage === "published"}>Published package</li></ol><p>{stage === "published" ? `Package created${publishedAt ? ` in this session at ${new Date(publishedAt).toLocaleTimeString()}` : ""}. Server sharing remains unavailable until authenticated expedition access is enabled.` : "Review freezes the analyzed data before an immutable JSON package is created. This browser session does not publish to the shared database."}</p></div><div className="route-actions"><button className="button button--secondary" type="button" onClick={() => void analyzeWeather()} disabled={weatherBusy}>{weatherBusy ? "Reading forecast…" : routeWeather ? "Refresh weather" : "Analyze weather"}</button><button className="button button--secondary" type="button" onClick={() => void analyzeTerrain()} disabled={terrainBusy}>{terrainBusy ? "Deriving layers…" : hazard ? "Refresh hazards" : "Analyze hazards"}</button><button className="button button--secondary" type="button" onClick={() => void createBriefing()} disabled={briefingBusy}>{briefingBusy ? "Synthesizing evidence…" : briefing ? "Refresh briefing" : "Generate briefing"}</button><button className="button button--secondary" type="button" onClick={() => void exportKmz()} disabled={busy}><Download aria-hidden="true" />Export KMZ</button>{stage === "draft" ? <button className="button button--primary" type="button" onClick={() => setStage("review")}><FileCheck2 aria-hidden="true" />Review draft</button> : stage === "review" ? <button className="button button--primary" type="button" onClick={publishPackage}><Download aria-hidden="true" />Publish package</button> : null}</div></div>
        </> : <div className="route-empty"><RouteIcon aria-hidden="true" /><strong>No route analyzed</strong><p>Upload a GPX 1.x file up to 5 MB. Its original coordinates and elevations remain the source of record.</p></div>}
      </div>
    </section>
  );
}
