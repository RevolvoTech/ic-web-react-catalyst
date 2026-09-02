"use client";

import { Globe2, LocateFixed, ZoomIn, ZoomOut } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { loadArcGisSdk } from "@/lib/arcgis-loader";
import { isMapLocation, type MapLocation } from "@/lib/geocode";
import type { QgisSnapshot } from "@/lib/qgis";

interface QgisMapProps {
  snapshot: QgisSnapshot | null;
  busy: boolean;
}

type LocationState = "idle" | "loading" | "ready" | "unavailable";

interface MapCenter {
  latitude: number;
  longitude: number;
  zoom: number;
}

type ArcGisGeometry = object;

interface ArcGisGraphic {
  geometry?: ArcGisGeometry;
}

interface ArcGisGraphicsLayer {
  visible: boolean;
  add(graphic: ArcGisGraphic): void;
  addMany(graphics: ArcGisGraphic[]): void;
  removeAll(): void;
}

interface ArcGisSceneView {
  center?: { latitude?: number | null; longitude?: number | null } | null;
  zoom: number;
  stationary: boolean;
  destroy(): void;
  when(): Promise<void>;
  goTo(target: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
}

type ArcGisConstructor<T> = new (properties: Record<string, unknown>) => T;

interface OperationalLayers {
  planned: ArcGisGraphicsLayer;
  actual: ArcGisGraphicsLayer;
  position: ArcGisGraphicsLayer;
}

interface ArcGisConstructors {
  Graphic: ArcGisConstructor<ArcGisGraphic>;
  Point: ArcGisConstructor<ArcGisGeometry>;
  Polyline: ArcGisConstructor<ArcGisGeometry>;
  SimpleLineSymbol: ArcGisConstructor<object>;
  SimpleMarkerSymbol: ArcGisConstructor<object>;
}

type ArcGisModules = [
  ArcGisConstructor<object>,
  ArcGisConstructor<ArcGisSceneView>,
  ArcGisConstructor<ArcGisGraphicsLayer>,
  ArcGisConstructor<ArcGisGraphic>,
  ArcGisConstructor<ArcGisGeometry>,
  ArcGisConstructor<ArcGisGeometry>,
  ArcGisConstructor<object>,
  ArcGisConstructor<object>,
  {
    watch<T>(getter: () => T, callback: (value: T) => void): { remove(): void };
  },
];

const INITIAL_CENTER: MapCenter = { latitude: 35.742, longitude: 76.519, zoom: 11.8 };
const ARCGIS_API_KEY = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;

const plannedRouteCoordinates = [
  [76.5082, 35.7378],
  [76.5115, 35.7391],
  [76.5147, 35.7409],
  [76.5189, 35.743],
  [76.5236, 35.746],
  [76.5296, 35.7486],
  [76.5344, 35.7522],
];

function colorsFromDocument() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  return {
    canvas: read("--color-canvas-alternate"),
    action: read("--color-action"),
    information: read("--color-information"),
    warning: read("--color-warning"),
    unknown: read("--color-unknown"),
  };
}

function buildPlannedRoute(
  constructors: ArcGisConstructors,
  colors: ReturnType<typeof colorsFromDocument>,
) {
  const geometry = new constructors.Polyline({
    paths: [plannedRouteCoordinates],
    spatialReference: { wkid: 4326 },
  });
  return [
    new constructors.Graphic({
      geometry,
      symbol: new constructors.SimpleLineSymbol({
        color: colors.canvas,
        width: 8,
        cap: "round",
        join: "round",
      }),
    }),
    new constructors.Graphic({
      geometry,
      symbol: new constructors.SimpleLineSymbol({
        color: colors.action,
        width: 4,
        cap: "round",
        join: "round",
      }),
    }),
  ];
}

function buildActualTrack(
  snapshot: QgisSnapshot | null,
  constructors: ArcGisConstructors,
  colors: ReturnType<typeof colorsFromDocument>,
) {
  if (!snapshot || snapshot.track.length < 2) return null;
  return new constructors.Graphic({
    geometry: new constructors.Polyline({
      paths: [snapshot.track.map((point) => [point.longitude, point.latitude])],
      spatialReference: { wkid: 4326 },
    }),
    symbol: new constructors.SimpleLineSymbol({
      color: colors.information,
      width: 3,
      style: "short-dot",
      cap: "round",
      join: "round",
    }),
  });
}

function buildPosition(
  snapshot: QgisSnapshot | null,
  constructors: ArcGisConstructors,
  colors: ReturnType<typeof colorsFromDocument>,
) {
  if (!snapshot?.position) return null;
  const fill = snapshot.freshness === "stale"
    ? colors.warning
    : snapshot.freshness === "offline"
      ? colors.unknown
      : colors.information;
  return new constructors.Graphic({
    geometry: new constructors.Point({
      longitude: snapshot.position.longitude,
      latitude: snapshot.position.latitude,
      spatialReference: { wkid: 4326 },
    }),
    symbol: new constructors.SimpleMarkerSymbol({
      color: fill,
      size: 12,
      outline: { color: colors.canvas, width: 3 },
    }),
  });
}

export function QgisMap({ snapshot, busy }: QgisMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ArcGisSceneView | null>(null);
  const layersRef = useRef<OperationalLayers | null>(null);
  const constructorsRef = useRef<ArcGisConstructors | null>(null);
  const reduceMotion = useReducedMotion();
  const [shouldInitialize, setShouldInitialize] = useState(false);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [center, setCenter] = useState<MapCenter>(INITIAL_CENTER);
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");

  useEffect(() => {
    const map = mapRef.current;
    if (!map || shouldInitialize) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldInitialize(true);
        observer.disconnect();
      },
      { rootMargin: "0px", threshold: 0.01 },
    );
    observer.observe(map);
    return () => observer.disconnect();
  }, [shouldInitialize]);

  useEffect(() => {
    if (!shouldInitialize) return;
    if (!containerRef.current || viewRef.current) return;
    let cancelled = false;
    let stationaryHandle: { remove(): void } | null = null;

    async function initialize() {
      try {
        const arcgis = await loadArcGisSdk(ARCGIS_API_KEY);
        const [
          ArcGISMap,
          SceneViewConstructor,
          GraphicsLayerConstructor,
          GraphicConstructor,
          PolylineConstructor,
          PointConstructor,
          SimpleLineSymbolConstructor,
          SimpleMarkerSymbolConstructor,
          reactiveUtils,
        ] = await arcgis.import<ArcGisModules>([
          "@arcgis/core/Map.js",
          "@arcgis/core/views/SceneView.js",
          "@arcgis/core/layers/GraphicsLayer.js",
          "@arcgis/core/Graphic.js",
          "@arcgis/core/geometry/Polyline.js",
          "@arcgis/core/geometry/Point.js",
          "@arcgis/core/symbols/SimpleLineSymbol.js",
          "@arcgis/core/symbols/SimpleMarkerSymbol.js",
          "@arcgis/core/core/reactiveUtils.js",
        ]);
        if (cancelled || !containerRef.current) return;

        const constructors: ArcGisConstructors = {
          Graphic: GraphicConstructor,
          Point: PointConstructor,
          Polyline: PolylineConstructor,
          SimpleLineSymbol: SimpleLineSymbolConstructor,
          SimpleMarkerSymbol: SimpleMarkerSymbolConstructor,
        };
        constructorsRef.current = constructors;
        const colors = colorsFromDocument();
        const planned = new GraphicsLayerConstructor({
          title: "Simulated planned route",
          listMode: "show",
          elevationInfo: { mode: "on-the-ground" },
        });
        const actual = new GraphicsLayerConstructor({
          title: "Simulated recent track",
          listMode: "show",
          elevationInfo: { mode: "on-the-ground" },
        });
        const position = new GraphicsLayerConstructor({
          title: "Simulated latest position",
          listMode: "show",
          elevationInfo: { mode: "relative-to-ground", offset: 8 },
        });
        planned.addMany(buildPlannedRoute(constructors, colors));
        layersRef.current = { planned, actual, position };

        const map = new ArcGISMap({
          basemap: "satellite",
          ground: "world-elevation",
          layers: [planned, actual, position],
        });
        const view = new SceneViewConstructor({
          container: containerRef.current,
          map,
          viewingMode: "global",
          qualityProfile: "high",
          camera: {
            position: {
              longitude: INITIAL_CENTER.longitude,
              latitude: INITIAL_CENTER.latitude - 0.09,
              z: 28_000,
              spatialReference: { wkid: 4326 },
            },
            heading: 12,
            tilt: 68,
          },
          environment: {
            atmosphereEnabled: true,
            starsEnabled: true,
            lighting: {
              directShadowsEnabled: true,
              cameraTrackingEnabled: false,
            },
          },
          ui: {
            components: [],
          },
        });
        viewRef.current = view;

        const updateCenter = () => {
          const viewCenter = view.center;
          const latitude = viewCenter?.latitude;
          const longitude = viewCenter?.longitude;
          if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
          setCenter({
            latitude,
            longitude,
            zoom: Number.isFinite(view.zoom) ? view.zoom : INITIAL_CENTER.zoom,
          });
        };

        await view.when();
        if (cancelled) return;
        setReady(true);
        updateCenter();
        stationaryHandle = reactiveUtils.watch(
          () => view.stationary,
          (stationary) => {
            if (stationary) updateCenter();
          },
        );
      } catch {
        if (!cancelled) setMapError(true);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      stationaryHandle?.remove();
      viewRef.current?.destroy();
      viewRef.current = null;
      layersRef.current = null;
      constructorsRef.current = null;
    };
  }, [shouldInitialize]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLocation(null);
      setLocationState("loading");
      const parameters = new URLSearchParams({
        latitude: center.latitude.toFixed(4),
        longitude: center.longitude.toFixed(4),
      });
      fetch(`/api/geocode/reverse?${parameters.toString()}`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      })
        .then(async (response) => {
          const payload: unknown = await response.json().catch(() => null);
          if (!response.ok || !isMapLocation(payload)) throw new Error("Location name unavailable.");
          if (controller.signal.aborted) return;
          setLocation(payload);
          setLocationState("ready");
        })
        .catch(() => {
          if (!controller.signal.aborted) setLocationState("unavailable");
        });
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [center.latitude, center.longitude, ready]);

  useEffect(() => {
    const view = viewRef.current;
    const layers = layersRef.current;
    const constructors = constructorsRef.current;
    if (!view || !layers || !constructors || !ready) return;
    const colors = colorsFromDocument();
    layers.planned.visible = snapshot?.mode !== "live";
    layers.actual.removeAll();
    layers.position.removeAll();
    const track = buildActualTrack(snapshot, constructors, colors);
    const position = buildPosition(snapshot, constructors, colors);
    if (track) layers.actual.add(track);
    if (position) layers.position.add(position);

    if (track?.geometry && snapshot?.track.length) {
      void view.goTo(
        { target: track.geometry, tilt: 68, heading: 12 },
        { animate: !reduceMotion, duration: reduceMotion ? 0 : 600 },
      ).catch(() => undefined);
    }
  }, [ready, reduceMotion, snapshot]);

  function returnToPilotArea() {
    const view = viewRef.current;
    const constructors = constructorsRef.current;
    if (!view || !constructors) return;
    const target = new constructors.Point({
      longitude: INITIAL_CENTER.longitude,
      latitude: INITIAL_CENTER.latitude,
      spatialReference: { wkid: 4326 },
    });
    void view.goTo(
      {
        target,
        zoom: INITIAL_CENTER.zoom,
        tilt: 68,
        heading: 12,
      },
      { animate: !reduceMotion, duration: reduceMotion ? 0 : 700 },
    ).catch(() => undefined);
  }

  function showGlobalView() {
    const view = viewRef.current;
    const constructors = constructorsRef.current;
    if (!view || !constructors) return;
    const target = new constructors.Point({
      longitude: INITIAL_CENTER.longitude,
      latitude: 24,
      spatialReference: { wkid: 4326 },
    });
    void view.goTo(
      {
        target,
        zoom: 1.7,
        tilt: 0,
        heading: 0,
      },
      { animate: !reduceMotion, duration: reduceMotion ? 0 : 900 },
    ).catch(() => undefined);
  }

  function zoomBy(delta: number) {
    const view = viewRef.current;
    if (!view) return;
    void view.goTo(
      { zoom: Math.max(0, Math.min(19, view.zoom + delta)) },
      { animate: !reduceMotion, duration: reduceMotion ? 0 : 260 },
    ).catch(() => undefined);
  }

  const locationLabel = location?.name
    ?? (locationState === "loading"
      ? "Identifying map center…"
      : locationState === "unavailable"
        ? "Location name unavailable"
        : "Karakoram pilot area");

  return (
    <div ref={mapRef} className="qgis-map" data-map-ready={ready || undefined} data-map-engine="arcgis-sceneview">
      <div
        ref={containerRef}
        className="qgis-map__surface"
        role="region"
        aria-label="Interactive 3D Earth with simulated GPS route overlay"
      />
      <div className="qgis-map__grid" aria-hidden="true" />
      <div className="qgis-map__center-marker" aria-hidden="true"><span /><span /></div>
      <div className="qgis-map__label" aria-live="polite">
        <span className="data-label">Scene center</span>
        <strong>{locationLabel}</strong>
        <span>{center.latitude.toFixed(4)}, {center.longitude.toFixed(4)} · Z{center.zoom.toFixed(1)}</span>
        <small>ArcGIS global 3D · {snapshot?.mode === "live" ? "Position plot" : "SIMULATED route overlay"}</small>
      </div>
      <div className="qgis-map__scene-actions" aria-label="Scene controls">
        <button type="button" onClick={() => zoomBy(1)} disabled={!ready} aria-label="Zoom in" title="Zoom in"><ZoomIn aria-hidden="true" /></button>
        <button type="button" onClick={() => zoomBy(-1)} disabled={!ready} aria-label="Zoom out" title="Zoom out"><ZoomOut aria-hidden="true" /></button>
        <button type="button" onClick={showGlobalView} disabled={!ready} aria-label="Show global Earth view" title="Show global Earth view"><Globe2 aria-hidden="true" /></button>
        <button type="button" onClick={returnToPilotArea} disabled={!ready} aria-label="Return to Karakoram pilot area" title="Return to Karakoram pilot area"><LocateFixed aria-hidden="true" /></button>
      </div>
      <div className="qgis-map__legend" aria-label="Map legend">
        {snapshot?.mode !== "live" ? <span><i data-kind="planned" /> Planned route</span> : null}
        <span><i data-kind="actual" /> Recent track</span>
        <span><i data-kind="position" /> Latest position</span>
      </div>
      {!shouldInitialize ? (
        <div className="qgis-map__message" role="status">
          3D Earth loads as the map enters view.
        </div>
      ) : !ready && !mapError ? (
        <div className="qgis-map__message" role="status">
          <span className="page-loading__signal" aria-hidden="true" />
          Initializing 3D Earth…
        </div>
      ) : null}
      {mapError ? (
        <div className="qgis-map__message" role="status">
          3D scene unavailable. Position details remain in the inspector.
        </div>
      ) : null}
      {busy ? <div className="qgis-map__busy" aria-hidden="true" /> : null}
    </div>
  );
}
