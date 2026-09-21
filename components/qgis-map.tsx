"use client";

import {
  CloudSun,
  Globe2,
  Layers3,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Satellite,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { loadArcGisSdk } from "@/lib/arcgis-loader";
import { isMapLocation, type MapLocation } from "@/lib/geocode";
import { isHazardAnalysis, type HazardAnalysis, type HazardRiskLevel } from "@/lib/hazard";
import {
  publishWorkspaceRoute,
  WORKSPACE_HAZARD_EVENT,
  WORKSPACE_ROUTE_EVENT,
  WORKSPACE_WEATHER_EVENT,
  type DemoWaypoint,
  type WorkspaceHazardDetail,
  type WorkspaceRouteDetail,
  type WorkspaceWeatherDetail,
} from "@/lib/operational-workspace";
import type { QgisSnapshot } from "@/lib/qgis";
import { isRouteAnalysis, type RouteAnalysis } from "@/lib/route";
import { isRouteWeatherAnalysis, type RouteWeatherAnalysis, type RouteWeatherStatus } from "@/lib/route-weather";
import { openWorkspaceDetail } from "@/lib/workspace-detail";

interface QgisMapProps {
  snapshot: QgisSnapshot | null;
  busy: boolean;
}

type LocationState = "idle" | "loading" | "ready" | "unavailable";
type MapViewMode = "2d" | "3d";
type BasemapStyle = "satellite" | "topographic";
type OperationalFocus = "loading" | "latest-position" | "active-route" | "pilot-area";

interface MapCenter {
  latitude: number;
  longitude: number;
  zoom: number;
}

type ArcGisGeometry = object;

interface ArcGisMap {
  basemap: string;
}

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
  on(
    eventName: "click",
    callback: (event: { mapPoint?: { latitude?: number; longitude?: number; z?: number } | null }) => void,
  ): { remove(): void };
}

type ArcGisConstructor<T> = new (properties: Record<string, unknown>) => T;

interface OperationalLayers {
  hazards: ArcGisGraphicsLayer;
  weather: ArcGisGraphicsLayer;
  planned: ArcGisGraphicsLayer;
  actual: ArcGisGraphicsLayer;
  position: ArcGisGraphicsLayer;
  waypoints: ArcGisGraphicsLayer;
}

interface ArcGisConstructors {
  Graphic: ArcGisConstructor<ArcGisGraphic>;
  Point: ArcGisConstructor<ArcGisGeometry>;
  Polyline: ArcGisConstructor<ArcGisGeometry>;
  Polygon: ArcGisConstructor<ArcGisGeometry>;
  SimpleFillSymbol: ArcGisConstructor<object>;
  SimpleLineSymbol: ArcGisConstructor<object>;
  SimpleMarkerSymbol: ArcGisConstructor<object>;
  TextSymbol: ArcGisConstructor<object>;
}

type ArcGisModules = [
  ArcGisConstructor<ArcGisMap>,
  ArcGisConstructor<ArcGisSceneView>,
  ArcGisConstructor<ArcGisGraphicsLayer>,
  ArcGisConstructor<ArcGisGraphic>,
  ArcGisConstructor<ArcGisGeometry>,
  ArcGisConstructor<ArcGisGeometry>,
  ArcGisConstructor<ArcGisGeometry>,
  ArcGisConstructor<object>,
  ArcGisConstructor<object>,
  ArcGisConstructor<object>,
  ArcGisConstructor<object>,
  {
    watch<T>(getter: () => T, callback: (value: T) => void): { remove(): void };
  },
];

const INITIAL_CENTER: MapCenter = { latitude: 35.742, longitude: 76.519, zoom: 11.8 };
const ARCGIS_API_KEY = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
const CAMERA_TILT: Record<MapViewMode, number> = { "2d": 0, "3d": 62 };
const POSITION_FOCUS_ZOOM = 13.2;

const plannedRouteCoordinates = [
  [76.5082, 35.7378],
  [76.5115, 35.7391],
  [76.5147, 35.7409],
  [76.5189, 35.743],
  [76.5236, 35.746],
  [76.5296, 35.7486],
  [76.5344, 35.7522],
];

function readVisibleMapCenter(view: ArcGisSceneView): MapCenter | null {
  const viewCenter = view.center;
  const latitude = viewCenter?.latitude;
  const longitude = viewCenter?.longitude;
  if (
    typeof latitude !== "number"
    || typeof longitude !== "number"
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
  ) return null;
  return {
    latitude,
    longitude,
    zoom: Number.isFinite(view.zoom) ? view.zoom : INITIAL_CENTER.zoom,
  };
}

function colorsFromDocument() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  return {
    canvas: read("--color-canvas-alternate"),
    text: read("--color-text"),
    action: read("--color-action"),
    information: read("--color-information"),
    warning: read("--color-warning"),
    critical: read("--color-critical"),
    success: read("--color-success"),
    unknown: read("--color-unknown"),
  };
}

function buildPlannedRoute(
  coordinates: number[][],
  constructors: ArcGisConstructors,
  colors: ReturnType<typeof colorsFromDocument>,
) {
  if (coordinates.length < 2) return [];
  const geometry = new constructors.Polyline({
    paths: [coordinates],
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

function buildWaypoints(
  waypoints: DemoWaypoint[],
  constructors: ArcGisConstructors,
  colors: ReturnType<typeof colorsFromDocument>,
) {
  return waypoints.flatMap((waypoint, index) => [new constructors.Graphic({
    geometry: new constructors.Point({
      longitude: waypoint.longitude,
      latitude: waypoint.latitude,
      spatialReference: { wkid: 4326 },
    }),
    symbol: new constructors.SimpleMarkerSymbol({
      color: colors.action,
      size: 13,
      style: "diamond",
      outline: { color: colors.canvas, width: 3 },
    }),
  }), new constructors.Graphic({
    geometry: new constructors.Point({
      longitude: waypoint.longitude,
      latitude: waypoint.latitude,
      spatialReference: { wkid: 4326 },
    }),
    symbol: new constructors.TextSymbol({
      text: `${index + 1} · ${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)}`,
      color: colors.text,
      haloColor: colors.canvas,
      haloSize: 2,
      yoffset: 22,
      font: { size: 10, weight: "bold", family: "sans-serif" },
    }),
  })]);
}

function hazardColor(risk: HazardRiskLevel, colors: ReturnType<typeof colorsFromDocument>) {
  if (risk === "critical" || risk === "high") return colors.critical;
  if (risk === "moderate") return colors.warning;
  if (risk === "low") return colors.success;
  return colors.unknown;
}

function buildHazards(
  analysis: HazardAnalysis | null,
  constructors: ArcGisConstructors,
  colors: ReturnType<typeof colorsFromDocument>,
) {
  if (!analysis) return [];
  return analysis.zones.features.map((zone) => {
    const color = hazardColor(zone.properties.riskLevel, colors);
    return new constructors.Graphic({
      geometry: new constructors.Polygon({
        rings: zone.geometry.coordinates,
        spatialReference: { wkid: 4326 },
      }),
      symbol: new constructors.SimpleFillSymbol({
        color: `${color}38`,
        outline: { color, width: zone.properties.riskLevel === "critical" ? 2.5 : 1.5 },
        style: "solid",
      }),
      attributes: {
        name: zone.properties.name,
        riskLevel: zone.properties.riskLevel,
        terrainClass: zone.properties.terrainClass,
      },
    });
  });
}

function weatherColor(status: RouteWeatherStatus, colors: ReturnType<typeof colorsFromDocument>) {
  if (status === "exceeds-threshold") return colors.critical;
  if (status === "near-threshold") return colors.warning;
  if (status === "within-threshold") return colors.success;
  return colors.unknown;
}

function buildWeather(
  analysis: RouteWeatherAnalysis | null,
  constructors: ArcGisConstructors,
  colors: ReturnType<typeof colorsFromDocument>,
) {
  if (!analysis) return [];
  return analysis.segments.map((segment) => {
    const color = weatherColor(segment.status, colors);
    return new constructors.Graphic({
      geometry: new constructors.Point({
        longitude: segment.representative.longitude,
        latitude: segment.representative.latitude,
        spatialReference: { wkid: 4326 },
      }),
      symbol: new constructors.SimpleMarkerSymbol({
        color,
        size: 12,
        style: "diamond",
        outline: { color: colors.canvas, width: 2.5 },
      }),
      attributes: {
        name: segment.segmentName,
        status: segment.status,
        peakWindKmh: segment.peakWindKmh,
      },
    });
  });
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
  const sceneMapRef = useRef<ArcGisMap | null>(null);
  const layersRef = useRef<OperationalLayers | null>(null);
  const constructorsRef = useRef<ArcGisConstructors | null>(null);
  const layersButtonRef = useRef<HTMLButtonElement>(null);
  const layersPanelRef = useRef<HTMLDivElement>(null);
  const waypointModeRef = useRef(false);
  const waypointSequenceRef = useRef(0);
  const waypointRequestRef = useRef<AbortController | null>(null);
  const viewModeRef = useRef<MapViewMode>("3d");
  const initialFocusAppliedRef = useRef(false);
  const focusedRouteRef = useRef<RouteAnalysis | null>(null);
  const snapshotRef = useRef(snapshot);
  const reduceMotion = useReducedMotion();
  const [shouldInitialize, setShouldInitialize] = useState(false);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [center, setCenter] = useState<MapCenter>(INITIAL_CENTER);
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [layersOpen, setLayersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<MapViewMode>("3d");
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>("satellite");
  const [operationalFocus, setOperationalFocus] = useState<OperationalFocus>("loading");
  const [waypointMode, setWaypointMode] = useState(false);
  const [waypoints, setWaypoints] = useState<DemoWaypoint[]>([]);
  const [activeRoute, setActiveRoute] = useState<RouteAnalysis | null>(null);
  const [waypointBusy, setWaypointBusy] = useState(false);
  const [waypointError, setWaypointError] = useState<string | null>(null);
  const [hazardAnalysis, setHazardAnalysis] = useState<HazardAnalysis | null>(null);
  const [routeWeather, setRouteWeather] = useState<RouteWeatherAnalysis | null>(null);
  const [layerVisibility, setLayerVisibility] = useState({
    route: true,
    track: true,
    position: true,
    hazards: true,
    weather: true,
  });

  useEffect(() => {
    waypointModeRef.current = waypointMode;
  }, [waypointMode]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    if (!layersOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setLayersOpen(false);
      layersButtonRef.current?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (layersPanelRef.current?.contains(target) || layersButtonRef.current?.contains(target)) return;
      setLayersOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [layersOpen]);

  useEffect(() => {
    const routeListener = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceRouteDetail>).detail;
      if (detail?.route === null) {
        setActiveRoute(null);
        setHazardAnalysis(null);
      } else if (detail && isRouteAnalysis(detail.route)) {
        setActiveRoute(detail.route);
        if (detail.route.source.format === "GPX 1.x") {
          setWaypoints([]);
          setWaypointMode(false);
        }
      }
    };
    const hazardListener = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceHazardDetail>).detail;
      if (detail?.hazard === null || isHazardAnalysis(detail?.hazard)) {
        setHazardAnalysis(detail.hazard);
      }
    };
    const weatherListener = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceWeatherDetail>).detail;
      if (detail?.weather === null || isRouteWeatherAnalysis(detail?.weather)) {
        setRouteWeather(detail.weather);
      }
    };
    window.addEventListener(WORKSPACE_ROUTE_EVENT, routeListener);
    window.addEventListener(WORKSPACE_HAZARD_EVENT, hazardListener);
    window.addEventListener(WORKSPACE_WEATHER_EVENT, weatherListener);
    return () => {
      window.removeEventListener(WORKSPACE_ROUTE_EVENT, routeListener);
      window.removeEventListener(WORKSPACE_HAZARD_EVENT, hazardListener);
      window.removeEventListener(WORKSPACE_WEATHER_EVENT, weatherListener);
    };
  }, []);

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
    let clickHandle: { remove(): void } | null = null;

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
          PolygonConstructor,
          SimpleFillSymbolConstructor,
          SimpleLineSymbolConstructor,
          SimpleMarkerSymbolConstructor,
          TextSymbolConstructor,
          reactiveUtils,
        ] = await arcgis.import<ArcGisModules>([
          "@arcgis/core/Map.js",
          "@arcgis/core/views/SceneView.js",
          "@arcgis/core/layers/GraphicsLayer.js",
          "@arcgis/core/Graphic.js",
          "@arcgis/core/geometry/Polyline.js",
          "@arcgis/core/geometry/Point.js",
          "@arcgis/core/geometry/Polygon.js",
          "@arcgis/core/symbols/SimpleFillSymbol.js",
          "@arcgis/core/symbols/SimpleLineSymbol.js",
          "@arcgis/core/symbols/SimpleMarkerSymbol.js",
          "@arcgis/core/symbols/TextSymbol.js",
          "@arcgis/core/core/reactiveUtils.js",
        ]);
        if (cancelled || !containerRef.current) return;

        const constructors: ArcGisConstructors = {
          Graphic: GraphicConstructor,
          Point: PointConstructor,
          Polyline: PolylineConstructor,
          Polygon: PolygonConstructor,
          SimpleFillSymbol: SimpleFillSymbolConstructor,
          SimpleLineSymbol: SimpleLineSymbolConstructor,
          SimpleMarkerSymbol: SimpleMarkerSymbolConstructor,
          TextSymbol: TextSymbolConstructor,
        };
        constructorsRef.current = constructors;
        const colors = colorsFromDocument();
        const hazards = new GraphicsLayerConstructor({
          title: "Terrain screening zones",
          listMode: "show",
          elevationInfo: { mode: "on-the-ground" },
        });
        const weather = new GraphicsLayerConstructor({
          title: "Route weather forecast",
          listMode: "show",
          elevationInfo: { mode: "relative-to-ground", offset: 14 },
        });
        const planned = new GraphicsLayerConstructor({
          title: "Active planned route",
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
        const waypointLayer = new GraphicsLayerConstructor({
          title: "Demonstration waypoints",
          listMode: "show",
          elevationInfo: { mode: "relative-to-ground", offset: 10 },
        });
        planned.addMany(buildPlannedRoute(plannedRouteCoordinates, constructors, colors));
        layersRef.current = { hazards, weather, planned, actual, position, waypoints: waypointLayer };

        const map = new ArcGISMap({
          basemap: "satellite",
          ground: "world-elevation",
          layers: [hazards, weather, planned, actual, position, waypointLayer],
        });
        sceneMapRef.current = map;
        const view = new SceneViewConstructor({
          container: containerRef.current,
          map,
          viewingMode: "global",
          qualityProfile: "high",
          navigation: {
            actionMap: {
              dragPrimary: "pan",
              dragSecondary: "zoom",
              dragTertiary: "zoom",
              mouseWheel: "zoom",
            },
            gamepad: { enabled: false },
          },
          camera: {
            position: {
              longitude: INITIAL_CENTER.longitude,
              latitude: INITIAL_CENTER.latitude - 0.09,
              z: 28_000,
              spatialReference: { wkid: 4326 },
            },
            heading: 0,
            tilt: CAMERA_TILT["3d"],
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
          const nextCenter = readVisibleMapCenter(view);
          if (nextCenter) setCenter(nextCenter);
        };

        await view.when();
        if (cancelled) return;
        const initialPosition = snapshotRef.current?.position;
        if (initialPosition) {
          const target = new constructors.Point({
            longitude: initialPosition.longitude,
            latitude: initialPosition.latitude,
            spatialReference: { wkid: 4326 },
          });
          await view.goTo(
            { target, zoom: POSITION_FOCUS_ZOOM, tilt: CAMERA_TILT["3d"], heading: 0 },
            { animate: false, duration: 0 },
          );
          if (cancelled) return;
          initialFocusAppliedRef.current = true;
          setOperationalFocus("latest-position");
        }
        setReady(true);
        updateCenter();
        stationaryHandle = reactiveUtils.watch(
          () => view.stationary,
          (stationary) => {
            if (stationary) updateCenter();
          },
        );
        clickHandle = view.on("click", (event) => {
          if (!waypointModeRef.current) return;
          const latitude = event.mapPoint?.latitude;
          const longitude = event.mapPoint?.longitude;
          if (typeof latitude !== "number" || typeof longitude !== "number") return;
          waypointRequestRef.current?.abort();
          waypointRequestRef.current = null;
          setWaypointBusy(false);
          setWaypointError(null);
          publishWorkspaceRoute(null);
          const waypointId = `demo-waypoint-${++waypointSequenceRef.current}`;
          setWaypoints((current) => [...current, {
            id: waypointId,
            latitude,
            longitude,
            elevationM: typeof event.mapPoint?.z === "number" && Number.isFinite(event.mapPoint.z)
              ? Math.max(0, Math.round(event.mapPoint.z))
              : null,
          }]);
        });
      } catch {
        if (!cancelled) setMapError(true);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      stationaryHandle?.remove();
      clickHandle?.remove();
      viewRef.current?.destroy();
      viewRef.current = null;
      sceneMapRef.current = null;
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
    const routeCoordinates = activeRoute
      ? activeRoute.points.map((point) => [point.longitude, point.latitude])
      : waypoints.length > 0
        ? waypoints.map((point) => [point.longitude, point.latitude])
        : plannedRouteCoordinates;
    const routeGraphics = buildPlannedRoute(routeCoordinates, constructors, colors);

    layers.planned.removeAll();
    layers.waypoints.removeAll();
    layers.hazards.removeAll();
    layers.weather.removeAll();
    layers.planned.addMany(routeGraphics);
    layers.waypoints.addMany(buildWaypoints(waypoints, constructors, colors));
    layers.hazards.addMany(buildHazards(hazardAnalysis, constructors, colors));
    layers.weather.addMany(buildWeather(routeWeather, constructors, colors));

    if (activeRoute && activeRoute.source.format !== "Map waypoints" && initialFocusAppliedRef.current && focusedRouteRef.current !== activeRoute && routeGraphics[0]?.geometry) {
      focusedRouteRef.current = activeRoute;
      void view.goTo(
        { target: routeGraphics[0].geometry, tilt: CAMERA_TILT[viewModeRef.current], heading: 0 },
        { animate: !reduceMotion, duration: reduceMotion ? 0 : 700 },
      ).then(() => {
        setOperationalFocus("active-route");
      }).catch(() => undefined);
    } else if (!activeRoute) {
      focusedRouteRef.current = null;
    }
  }, [activeRoute, hazardAnalysis, ready, reduceMotion, routeWeather, waypoints]);

  useEffect(() => {
    const view = viewRef.current;
    const layers = layersRef.current;
    const constructors = constructorsRef.current;
    if (!view || !layers || !constructors || !ready) return;
    const colors = colorsFromDocument();
    layers.actual.removeAll();
    layers.position.removeAll();
    const track = buildActualTrack(snapshot, constructors, colors);
    const position = buildPosition(snapshot, constructors, colors);
    if (track) layers.actual.add(track);
    if (position) layers.position.add(position);

    if (!initialFocusAppliedRef.current && snapshot) {
      initialFocusAppliedRef.current = true;
      if (snapshot.position || !activeRoute?.points.length) {
        const coordinates: [number, number] = snapshot.position
          ? [snapshot.position.longitude, snapshot.position.latitude]
          : [INITIAL_CENTER.longitude, INITIAL_CENTER.latitude];
        const zoom = snapshot.position ? POSITION_FOCUS_ZOOM : INITIAL_CENTER.zoom;
        const target = new constructors.Point({
          longitude: coordinates[0],
          latitude: coordinates[1],
          spatialReference: { wkid: 4326 },
        });
        void view.goTo(
          { target, zoom, tilt: CAMERA_TILT[viewModeRef.current], heading: 0 },
          { animate: false, duration: 0 },
        ).then(() => {
          setOperationalFocus(snapshot.position ? "latest-position" : "pilot-area");
          const nextCenter = readVisibleMapCenter(view);
          if (nextCenter) setCenter(nextCenter);
        }).catch(() => undefined);
      } else {
        focusedRouteRef.current = activeRoute;
        const route = new constructors.Polyline({
          paths: [activeRoute.points.map((point) => [point.longitude, point.latitude])],
          spatialReference: { wkid: 4326 },
        });
        void view.goTo(
          { target: route, tilt: CAMERA_TILT[viewModeRef.current], heading: 0 },
          { animate: false, duration: 0 },
        ).then(() => {
          setOperationalFocus("active-route");
          const nextCenter = readVisibleMapCenter(view);
          if (nextCenter) setCenter(nextCenter);
        }).catch(() => undefined);
      }
    }
  }, [activeRoute, ready, snapshot]);

  useEffect(() => {
    const layers = layersRef.current;
    if (!layers || !ready) return;
    layers.planned.visible = layerVisibility.route;
    layers.waypoints.visible = layerVisibility.route;
    layers.actual.visible = layerVisibility.track;
    layers.position.visible = layerVisibility.position;
    layers.hazards.visible = layerVisibility.hazards;
    layers.weather.visible = layerVisibility.weather;
  }, [layerVisibility, ready]);

  function returnToOperationalFocus() {
    const view = viewRef.current;
    const constructors = constructorsRef.current;
    if (!view || !constructors) return;
    const targetCenter: [number, number] = snapshot?.position
      ? [snapshot.position.longitude, snapshot.position.latitude]
      : [INITIAL_CENTER.longitude, INITIAL_CENTER.latitude];
    const target = new constructors.Point({
      longitude: targetCenter[0],
      latitude: targetCenter[1],
      spatialReference: { wkid: 4326 },
    });
    setOperationalFocus(snapshot?.position ? "latest-position" : "pilot-area");
    void view.goTo(
      {
        target,
        zoom: snapshot?.position ? POSITION_FOCUS_ZOOM : INITIAL_CENTER.zoom,
        tilt: CAMERA_TILT[viewModeRef.current],
        heading: 0,
      },
      { animate: !reduceMotion, duration: reduceMotion ? 0 : 700 },
    ).then(() => {
      const nextCenter = readVisibleMapCenter(view);
      if (nextCenter) setCenter(nextCenter);
    }).catch(() => undefined);
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

  function changeViewMode(nextMode: MapViewMode) {
    const view = viewRef.current;
    if (!view) return;
    viewModeRef.current = nextMode;
    setViewMode(nextMode);
    void view.goTo(
      {
        center: [center.longitude, center.latitude],
        zoom: view.zoom,
        tilt: CAMERA_TILT[nextMode],
        heading: 0,
      },
      { animate: !reduceMotion, duration: reduceMotion ? 0 : 420 },
    ).then(() => {
      const nextCenter = readVisibleMapCenter(view);
      if (nextCenter) setCenter(nextCenter);
    }).catch(() => undefined);
  }

  function clearWaypoints() {
    waypointRequestRef.current?.abort();
    waypointRequestRef.current = null;
    setWaypointBusy(false);
    setWaypointError(null);
    publishWorkspaceRoute(null);
    setWaypoints([]);
    setWaypointMode(false);
  }

  async function analyzeWaypoints() {
    if (waypoints.length < 2) return;
    waypointRequestRef.current?.abort();
    const controller = new AbortController();
    waypointRequestRef.current = controller;
    setWaypointBusy(true);
    setWaypointError(null);
    try {
      const response = await fetch("/api/routes/waypoints", {
        method: "POST",
        body: JSON.stringify({ name: `Map route · ${waypoints.length} waypoints`, waypoints: waypoints.map(({ latitude, longitude }) => ({ latitude, longitude })) }),
        headers: { "content-type": "application/json", accept: "application/json" },
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "object" && payload.error !== null && "message" in payload.error && typeof payload.error.message === "string" ? payload.error.message : "Map route analysis is unavailable.";
        throw new Error(message);
      }
      if (!isRouteAnalysis(payload)) throw new Error("The route service returned an unexpected response.");
      if (waypointRequestRef.current !== controller) return;
      publishWorkspaceRoute(payload);
      openWorkspaceDetail("route");
    } catch (error) {
      if (!controller.signal.aborted && waypointRequestRef.current === controller) setWaypointError(error instanceof Error ? error.message : "Map route analysis is unavailable.");
    } finally {
      if (waypointRequestRef.current === controller) {
        waypointRequestRef.current = null;
        setWaypointBusy(false);
      }
    }
  }

  function toggleLayer(layer: keyof typeof layerVisibility) {
    setLayerVisibility((current) => ({ ...current, [layer]: !current[layer] }));
  }

  function changeBasemap(nextBasemap: BasemapStyle) {
    const map = sceneMapRef.current;
    if (!map) return;
    map.basemap = nextBasemap === "satellite" ? "satellite" : "topo-vector";
    setBasemapStyle(nextBasemap);
  }

  function closeLayersPanel({ restoreFocus = false } = {}) {
    setLayersOpen(false);
    if (restoreFocus) layersButtonRef.current?.focus();
  }

  const locationLabel = location?.name
    ?? (locationState === "loading"
      ? "Identifying map center…"
      : locationState === "unavailable"
        ? "Location name unavailable"
        : "Karakoram pilot area");

  return (
    <div ref={mapRef} className="qgis-map" data-map-ready={ready || undefined} data-map-engine="arcgis-sceneview" data-view-mode={viewMode} data-operational-focus={operationalFocus} data-waypoint-mode={waypointMode || undefined} data-waypoint-error={Boolean(waypointError) || undefined} data-layers-open={layersOpen || undefined}>
      <div
        ref={containerRef}
        className="qgis-map__surface"
        role="region"
        aria-label="Interactive Earth with expedition data layers"
      />
      <div className="qgis-map__grid" aria-hidden="true" />
      <div className="earth-map-toolbar" role="group" aria-label="Map route tools">
        <button type="button" onClick={() => changeViewMode(viewMode === "3d" ? "2d" : "3d")} disabled={!ready} aria-label={`Switch to ${viewMode === "3d" ? "2D overhead" : "3D terrain"}`} title={`Switch to ${viewMode === "3d" ? "2D overhead" : "3D terrain"}`}><MapIcon aria-hidden="true" /><span>{viewMode === "3d" ? "3D" : "2D"}</span></button>
        <button type="button" aria-pressed={waypointMode} onClick={() => setWaypointMode((current) => !current)} disabled={!ready} title={waypointMode ? "Stop placing waypoints" : "Place waypoints on the map"}><MapPin aria-hidden="true" /><span>Place points</span></button>
        <button type="button" className="earth-map-toolbar__analyze" onClick={() => void analyzeWaypoints()} disabled={waypointBusy || waypoints.length < 2} title={waypoints.length < 2 ? "Place at least two waypoints first" : "Analyze the straight-line route"}>{waypointBusy ? "Sampling terrain…" : "Analyze route"}</button>
        {waypoints.length ? <button type="button" onClick={clearWaypoints} aria-label="Clear all waypoints" title="Clear all waypoints"><Trash2 aria-hidden="true" /></button> : null}
        {waypointError ? <span className="earth-map-toolbar__error" role="alert">{waypointError}</span> : null}
      </div>
      <div className="earth-layers-control" data-open={layersOpen || undefined}>
        <button
          ref={layersButtonRef}
          className="earth-layers-control__trigger"
          type="button"
          aria-expanded={layersOpen}
          aria-controls="earth-layers-panel"
          aria-haspopup="dialog"
          onClick={() => setLayersOpen((current) => !current)}
        >
          <Layers3 aria-hidden="true" />
          <span>Layers</span>
        </button>
        {layersOpen ? (
          <div
            ref={layersPanelRef}
            id="earth-layers-panel"
            className="earth-layers-panel"
            role="dialog"
            aria-labelledby="earth-layers-title"
          >
            <header>
              <div>
                <span className="data-label">Map controls</span>
                <h3 id="earth-layers-title">Layers</h3>
              </div>
              <button type="button" onClick={() => closeLayersPanel({ restoreFocus: true })} aria-label="Close layers">
                <X aria-hidden="true" />
              </button>
            </header>

            <fieldset className="earth-basemap-list">
              <legend className="data-label">Map style</legend>
              <button type="button" aria-pressed={basemapStyle === "satellite"} onClick={() => changeBasemap("satellite")} disabled={!ready}>
                <Satellite aria-hidden="true" />
                <span><strong>Satellite</strong><small>ArcGIS imagery + elevation</small></span>
              </button>
              <button type="button" aria-pressed={basemapStyle === "topographic"} onClick={() => changeBasemap("topographic")} disabled={!ready}>
                <MapIcon aria-hidden="true" />
                <span><strong>Topographic</strong><small>Labels, contours and terrain</small></span>
              </button>
            </fieldset>

            <fieldset className="earth-layer-list">
              <legend className="data-label">Operational overlays</legend>
              <label><input type="checkbox" checked={layerVisibility.route} onChange={() => toggleLayer("route")} /><i data-kind="planned" /><span><strong>Planned route</strong><small>Drawn line or GPX</small></span></label>
              <label><input type="checkbox" checked={layerVisibility.track} onChange={() => toggleLayer("track")} /><i data-kind="actual" /><span><strong>Recent GPS track</strong><small>{snapshot?.track.length ? `${snapshot.track.length} recorded points` : "No track received"}</small></span></label>
              <label><input type="checkbox" checked={layerVisibility.position} onChange={() => toggleLayer("position")} /><i data-kind="position" /><span><strong>Latest position</strong><small>{snapshot?.position ? "Current map fix" : "No position received"}</small></span></label>
              <label><input type="checkbox" checked={layerVisibility.hazards} onChange={() => toggleLayer("hazards")} /><i data-kind="hazard" /><span><strong>Hazard screening</strong><small>{hazardAnalysis ? `${hazardAnalysis.zones.features.length} terrain zones` : "Awaiting hazard analysis"}</small></span></label>
              <label data-disabled={!routeWeather || undefined}><input type="checkbox" checked={layerVisibility.weather && Boolean(routeWeather)} onChange={() => toggleLayer("weather")} disabled={!routeWeather} /><i data-kind="weather" /><span><strong>Route weather</strong><small>{routeWeather ? `${routeWeather.segments.length} forecast segments · Open-Meteo` : "Awaiting route weather"}</small></span></label>
            </fieldset>

            <p className="earth-layers-panel__note"><CloudSun aria-hidden="true" /> Forecast markers show threshold status at route segments. They are decision support, not a safety declaration.</p>
          </div>
        ) : null}
      </div>
      <div className="qgis-map__top-right">
        <div className="qgis-map__label" aria-live="polite">
          <span className="data-label">Map center</span>
          <strong>{locationLabel}</strong>
          <span>{center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}</span>
        </div>
        <div className="qgis-map__scene-actions" aria-label="Scene controls">
          <button type="button" onClick={() => zoomBy(1)} disabled={!ready} aria-label="Zoom in" title="Zoom in"><ZoomIn aria-hidden="true" /></button>
          <button type="button" onClick={() => zoomBy(-1)} disabled={!ready} aria-label="Zoom out" title="Zoom out"><ZoomOut aria-hidden="true" /></button>
          <button type="button" onClick={showGlobalView} disabled={!ready} aria-label="Show global Earth view" title="Show global Earth view"><Globe2 aria-hidden="true" /></button>
          <button
            type="button"
            onClick={returnToOperationalFocus}
            disabled={!ready}
            aria-label={snapshot?.position ? "Return to latest position" : "Return to Karakoram pilot area"}
            title={snapshot?.position ? "Return to latest position" : "Return to Karakoram pilot area"}
          >
            <LocateFixed aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="qgis-map__legend" aria-label="Map legend">
        {layerVisibility.route && (activeRoute || waypoints.length !== 1) ? <span><i data-kind="planned" /> {activeRoute ? activeRoute.source.format === "Map waypoints" ? "Drawn route" : "GPX route" : waypoints.length ? "Unverified drawn line" : "Demo route · simulated"}</span> : null}
        {layerVisibility.track ? <span><i data-kind="actual" /> Recent track</span> : null}
        {layerVisibility.position ? <span><i data-kind="position" /> Latest position</span> : null}
        {hazardAnalysis && layerVisibility.hazards ? <span><i data-kind="hazard" /> Terrain screening</span> : null}
        {routeWeather && layerVisibility.weather ? <span><i data-kind="weather" /> Route weather</span> : null}
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
