"use client";

import { useEffect, useRef, useState } from "react";
import type { FieldSnapshot } from "@/lib/field";
import { positionState } from "@/lib/field";
import { readField, writeField, removeField } from "@/lib/field-store";
import { LoadingState } from "@/components/loading-state";
import type { SourceSpecification, LayerSpecification, AddProtocolAction } from "maplibre-gl";

export function FieldMap({ snapshot, offline }: { snapshot: FieldSnapshot | null; offline: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Preparing map…");
  const [downloading, setDownloading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const camera = useRef<{ center: [number, number]; zoom: number; bearing: number; pitch: number } | null>(null);
  useEffect(() => () => { void import("maplibre-gl").then((module) => module.clearPrewarmedResources()); }, []);
  useEffect(() => { let active = true; void readField<File>("public:maps", "pmtiles").then((value) => {
    if (active && value) setFile(value);
  }).catch(() => { if (active) setError("Local map storage is unavailable."); }); return () => { active = false; }; }, []);

  useEffect(() => {
    if (!container.current) return;
    let active = true;
    let dispose: (() => void) | undefined;
    void (async () => {
      const [maplibre, pmtiles] = await Promise.all([import("maplibre-gl"), import("pmtiles")]);
      if (!active || !container.current) return;
      setMapLoading(true);
      maplibre.setWorkerUrl(`/maplibre/${maplibre.getVersion()}/maplibre-gl-worker.mjs`);
      maplibre.prewarm();
      const protocolName = `localtiles${crypto.randomUUID().replaceAll("-", "")}`;
      const protocol = new pmtiles.Protocol();
      // One local protocol per mounted map; cleanup cannot break another instance.
      maplibre.addProtocol(protocolName, async (params, controller) => {
        const result = await protocol.tilev4({ ...params, url: params.url.replace(`${protocolName}://`, "pmtiles://") }, controller);
        if (params.type === "json") {
          const data = result.data as { tiles?: string[] };
          if (data.tiles) data.tiles = data.tiles.map((url) => url.replace("pmtiles://", `${protocolName}://`));
        }
        return result as Awaited<ReturnType<AddProtocolAction>>;
      });
      const sources: Record<string, SourceSpecification> = {};
      const layers: LayerSpecification[] = [{ id: "canvas", type: "background", paint: { "background-color": "#101214" } }];
      let bounds: [number, number, number, number] | null = null;
      if (file) {
        const source = new pmtiles.FileSource(file);
        source.getKey = () => "local-basemap";
        const archive = new pmtiles.PMTiles(source);
        const header = await archive.getHeader();
        if (!active) { maplibre.removeProtocol(protocolName); return; }
        if (header.tileType !== 1) { maplibre.removeProtocol(protocolName); throw new Error("Select a vector PMTiles archive using the Protomaps basemap schema."); }
        protocol.add(archive);
        sources.terrain = { type: "vector", url: `${protocolName}://${archive.source.getKey()}`, attribution: "© OpenStreetMap contributors · Protomaps · verify package licence" };
        layers.push(
          { id: "earth", type: "fill", source: "terrain", "source-layer": "earth", paint: { "fill-color": "#202429" } },
          { id: "landuse", type: "fill", source: "terrain", "source-layer": "landuse", paint: { "fill-color": "#29312e" } },
          { id: "water", type: "fill", source: "terrain", "source-layer": "water", paint: { "fill-color": "#203c48" } },
          { id: "roads", type: "line", source: "terrain", "source-layer": "roads", paint: { "line-color": "#969ca2", "line-width": 1 } });
        bounds = [header.minLon, header.minLat, header.maxLon, header.maxLat];
      }
      const route = snapshot?.plan?.snapshot.route;
      const tracks = new Map<string, number[][]>();
      for (const fix of [...(snapshot?.positions ?? [])].reverse()) {
        const points = tracks.get(fix.user_id) ?? []; points.push([fix.longitude, fix.latitude]); tracks.set(fix.user_id, points);
      }
      const features = [...tracks.values()].filter((points) => points.length > 1).map((coordinates) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates } }));
      if (features.length) {
        sources.tracks = { type: "geojson", data: { type: "FeatureCollection", features } };
        layers.push({ id: "actual-tracks", type: "line", source: "tracks", paint: { "line-color": "#63c7e8", "line-width": 2 } });
      }
      if (route) {
        sources.route = { type: "geojson", data: { type: "Feature", properties: {}, geometry: route } };
        layers.push({ id: "route-outline", type: "line", source: "route", paint: { "line-color": "#08090a", "line-width": 7 } },
          { id: "planned-route", type: "line", source: "route", paint: { "line-color": "#f36c2a", "line-width": 3 } });
        const coords = route.coordinates;
        bounds = [Math.min(...coords.map((p) => p[0])), Math.min(...coords.map((p) => p[1])), Math.max(...coords.map((p) => p[0])), Math.max(...coords.map((p) => p[1]))];
      }
      if (snapshot?.plan?.snapshot.hazards) {
        sources.hazards = { type: "geojson", data: snapshot.plan.snapshot.hazards };
        layers.push({ id: "hazard-fill", type: "fill", source: "hazards", paint: { "fill-color": "#ff6b63", "fill-opacity": 0.15 } },
          { id: "hazard-border", type: "line", source: "hazards", paint: { "line-color": "#ff6b63", "line-width": 2, "line-dasharray": [2, 2] } });
      }
      const map = new maplibre.Map({ container: container.current, style: { version: 8, sources, layers },
        center: [74.59, 35.24], zoom: 9, ...(camera.current ?? (bounds ? { bounds, fitBoundsOptions: { padding: 48, maxZoom: 14 } } : {})),
        attributionControl: { compact: false }, fadeDuration: 0 });
      map.addControl(new maplibre.NavigationControl({ visualizePitch: false }), "top-right");
      const latest = new Map<string, NonNullable<FieldSnapshot>["positions"][number]>();
      const ageUpdates: (() => void)[] = [];
      for (const fix of snapshot?.positions ?? []) if (!latest.has(fix.user_id)) latest.set(fix.user_id, fix);
      for (const fix of latest.values()) {
        const state = positionState(fix, offline);
        const marker = document.createElement("div"); marker.className = "field-marker-container";
        const arrow = document.createElement("span"); arrow.className = `field-marker field-marker--${state}`;
        arrow.textContent = fix.member_name.split(/\s+/u).map((word) => word[0]).slice(0, 2).join("").toUpperCase();
        const ageLabel = document.createElement("span"); ageLabel.className = "field-marker-age";
        marker.append(arrow, ageLabel);
        const updateAge = () => {
          const currentState = positionState(fix, offline);
          const age = Math.max(0, Math.floor((Date.now() - Date.parse(fix.recorded_at)) / 60_000));
          arrow.className = `field-marker field-marker--${currentState}`;
          ageLabel.hidden = currentState === "live";
          ageLabel.textContent = `${currentState} · ${age} min`;
          marker.title = `${fix.member_name} · ${currentState} · ${age} min ago · ${fix.accuracy_m === null ? "accuracy unknown" : `±${fix.accuracy_m} m`}`;
        };
        updateAge(); ageUpdates.push(updateAge);
        new maplibre.Marker({ element: marker }).setLngLat([fix.longitude, fix.latitude]).addTo(map);
        if (!bounds && !camera.current) map.jumpTo({ center: [fix.longitude, fix.latitude], zoom: 12 });
        // Broad uncertainty remains in the text inspector; never shrink it into
        // a circle that would imply a more accurate fix than the source reports.
        if (fix.accuracy_m !== null && fix.accuracy_m <= 100000) {
          const radius = fix.accuracy_m;
          const latitudeScale = Math.max(0.01, Math.cos(fix.latitude * Math.PI / 180));
          const ring = Array.from({ length: 65 }, (_, i) => {
            const angle = i / 64 * Math.PI * 2;
            return [fix.longitude + Math.cos(angle) * radius / (111320 * latitudeScale), fix.latitude + Math.sin(angle) * radius / 111320];
          });
          const id = `accuracy-${fix.id}`;
          map.on("load", () => {
            map.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } } });
            map.addLayer({ id, type: "fill", source: id, paint: { "fill-color": state === "live" ? "#63c7e8" : "#969ca2", "fill-opacity": 0.12 } });
            map.addLayer({ id: `${id}-ring`, type: "line", source: id, paint: { "line-color": state === "live" ? "#63c7e8" : "#969ca2", "line-width": 1, ...(state !== "live" ? { "line-dasharray": [2, 2] } : {}) } });
          });
        }
      }
      const ageTimer = window.setInterval(() => ageUpdates.forEach((update) => update()), 30_000);
      map.on("error", () => { if (active) { setMapLoading(false); setStatus("Map rendering incomplete."); setError("Some map data could not be rendered. Use the position list and published plan."); } });
      map.on("load", () => { if (active) { setMapLoading(false); setStatus(file ? `Offline basemap · ${file.name} · ${(file.size / 1000000).toFixed(1)} MB saved` : "Route and position overlays · download a basemap for terrain context."); } });
      dispose = () => {
        window.clearInterval(ageTimer);
        const center = map.getCenter(); camera.current = { center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
        map.remove(); maplibre.removeProtocol(protocolName);
      };
    })().catch((reason: unknown) => { if (active) { setMapLoading(false); setStatus("Map unavailable. Use the published plan and position list."); setError(reason instanceof Error ? reason.message : "Map unavailable."); } });
    return () => { active = false; dispose?.(); };
  }, [file, snapshot, offline]);

  return <section aria-labelledby="field-map-heading" className="field-map-panel">
    <h3 id="field-map-heading">Command map</h3>
    <div className="field-map-shell">
      <div ref={container} className="field-map" role="region" aria-busy={mapLoading} aria-label="Expedition route, hazards and latest team positions. Equivalent details follow the map." />
      {mapLoading ? <div className="field-map-loading"><LoadingState label="Loading map…" /></div> : null}
    </div>
    <p role="status" className="operations__footnote">{status}</p>
    {error ? <p role="alert" className="operations__error">{error}</p> : null}
    <p className="operations__footnote">Orange: planned route · Blue: actual track · Muted markers: stale or offline · Rings: accuracy · Red: hazards. Arrows do not indicate a measured heading.</p>
    <details className="operations__disclosure field-map-options"><summary>Offline map options</summary>
    <button type="button" disabled={downloading || offline} onClick={() => {
      setDownloading(true); setError("");
      void (async () => {
        const response = await fetch("/offline/nanga-parbat.pmtiles");
        if (!response.ok) throw new Error("Basemap download failed. Connect and try again.");
        const bytes = await response.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        if (hash !== "e8675ff12028e01c419c80c67d2b7e2fc6a0df523f0948c6f7d5fabd01f7e4f5") throw new Error("Basemap integrity check failed. The downloaded file was not stored.");
        const downloaded = new File([bytes], "nanga-parbat.pmtiles");
        await writeField("public:maps", "pmtiles", downloaded); setFile(downloaded); await navigator.storage?.persist?.();
      })().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Basemap download failed."))
        .finally(() => setDownloading(false));
    }}>{downloading ? "Downloading and verifying…" : "Download Nanga Parbat basemap · 1.6 MB"}</button>
    <p className="operations__footnote">Coverage 74.35–74.85° E, 35.05–35.45° N · zooms 0–14 · source data 14 November 2026. Vector context; no offline elevation model. <a href="/offline/README.md">Source and licence</a></p>
    <label>Load an offline vector map (.pmtiles)<input type="file" accept=".pmtiles" onChange={(event) => {
      const selected = event.target.files?.[0]; if (!selected) return;
      setError("");
      void (async () => {
        const { PMTiles, FileSource } = await import("pmtiles");
        const header = await new PMTiles(new FileSource(selected)).getHeader();
        if (header.tileType !== 1) throw new Error("Choose a vector PMTiles file using the Protomaps basemap schema.");
        await writeField("public:maps", "pmtiles", selected); setFile(selected);
        await navigator.storage?.persist?.();
      })().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to save map."));
    }} /></label>
    <p className="operations__footnote">Prepare a licensed region before departure. The map uses the local file and bundled code; no remote tiles, fonts or sprites are required.</p>
    {file ? <button type="button" onClick={() => { void removeField("public:maps", "pmtiles").then(() => setFile(null)).catch(() => setError("Could not remove map.")); }}>Remove stored basemap</button> : null}
    </details>
  </section>;
}
