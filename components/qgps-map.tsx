"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection, LineString, Point } from "geojson";
import type { QgpsSnapshot } from "@/lib/qgps";

interface QgpsMapProps {
  snapshot: QgpsSnapshot | null;
  busy: boolean;
}

type LineFeatureCollection = FeatureCollection<LineString>;
type PointFeatureCollection = FeatureCollection<Point>;

const emptyLines: LineFeatureCollection = { type: "FeatureCollection", features: [] };
const emptyPoints: PointFeatureCollection = { type: "FeatureCollection", features: [] };

const plannedRoute: LineFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "planned" },
      geometry: {
        type: "LineString",
        coordinates: [
          [76.5082, 35.7378],
          [76.5115, 35.7391],
          [76.5147, 35.7409],
          [76.5189, 35.743],
          [76.5236, 35.746],
          [76.5296, 35.7486],
          [76.5344, 35.7522],
        ],
      },
    },
  ],
};

const contourLines: LineFeatureCollection = {
  type: "FeatureCollection",
  features: Array.from({ length: 9 }, (_, index) => ({
    type: "Feature" as const,
    properties: { elevation: 4_500 + index * 80 },
    geometry: {
      type: "LineString" as const,
      // Extend well beyond the route so the contour field fills ultrawide map viewports.
      coordinates: Array.from({ length: 145 }, (__, point) => {
        const longitude = 76.36 + point * 0.0022;
        const latitude =
          35.728 + index * 0.0034 + Math.sin(point * 0.52 + index * 0.7) * 0.0032;
        return [longitude, latitude];
      }),
    },
  })),
};

function colorsFromDocument() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  return {
    canvas: read("--color-canvas-alternate"),
    surface: read("--color-surface-active"),
    border: read("--color-border-strong"),
    action: read("--color-action"),
    information: read("--color-information"),
    warning: read("--color-warning"),
    unknown: read("--color-unknown"),
  };
}

function actualTrackData(snapshot: QgpsSnapshot | null): LineFeatureCollection {
  if (!snapshot || snapshot.track.length < 2) return emptyLines;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "actual" },
        geometry: {
          type: "LineString",
          coordinates: snapshot.track.map((point) => [point.longitude, point.latitude]),
        },
      },
    ],
  };
}

function positionData(snapshot: QgpsSnapshot | null): PointFeatureCollection {
  if (!snapshot?.position) return emptyPoints;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { freshness: snapshot.freshness },
        geometry: {
          type: "Point",
          coordinates: [snapshot.position.longitude, snapshot.position.latitude],
        },
      },
    ],
  };
}

export function QgpsMap({ snapshot, busy }: QgpsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    async function initialize() {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        const colors = colorsFromDocument();
        maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

        const map = new maplibregl.Map({
          container: containerRef.current,
          center: [76.519, 35.742],
          zoom: 12.2,
          minZoom: 10,
          maxZoom: 16,
          attributionControl: false,
          style: {
            version: 8,
            sources: {
              contours: { type: "geojson", data: contourLines },
              planned: { type: "geojson", data: plannedRoute },
              actual: { type: "geojson", data: emptyLines },
              position: { type: "geojson", data: emptyPoints },
            },
            layers: [
              {
                id: "background",
                type: "background",
                paint: { "background-color": colors.canvas },
              },
              {
                id: "contour",
                type: "line",
                source: "contours",
                paint: {
                  "line-color": colors.border,
                  "line-width": 1,
                  "line-opacity": 0.45,
                },
              },
              {
                id: "planned-outline",
                type: "line",
                source: "planned",
                paint: { "line-color": colors.canvas, "line-width": 9 },
                layout: { "line-cap": "round", "line-join": "round" },
              },
              {
                id: "planned-route",
                type: "line",
                source: "planned",
                paint: { "line-color": colors.action, "line-width": 4 },
                layout: { "line-cap": "round", "line-join": "round" },
              },
              {
                id: "actual-track",
                type: "line",
                source: "actual",
                paint: {
                  "line-color": colors.information,
                  "line-width": 3,
                  "line-dasharray": [2, 1.5],
                },
                layout: { "line-cap": "round", "line-join": "round" },
              },
              {
                id: "position-accuracy",
                type: "circle",
                source: "position",
                paint: {
                  "circle-radius": 25,
                  "circle-color": colors.information,
                  "circle-opacity": 0.12,
                  "circle-stroke-color": colors.information,
                  "circle-stroke-opacity": 0.7,
                  "circle-stroke-width": 1,
                },
              },
              {
                id: "position-point",
                type: "circle",
                source: "position",
                paint: {
                  "circle-radius": 7,
                  "circle-color": [
                    "match",
                    ["get", "freshness"],
                    "stale",
                    colors.warning,
                    "offline",
                    colors.unknown,
                    colors.information,
                  ],
                  "circle-stroke-color": colors.canvas,
                  "circle-stroke-width": 3,
                },
              },
            ],
          },
        });

        mapRef.current = map;
        const markReady = () => {
          if (cancelled) return;
          setReady(true);
        };

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
        if (map.loaded()) markReady();
        else {
          map.once("load", markReady);
          map.once("render", markReady);
        }
        map.on("error", () => setMapError(true));
      } catch {
        if (!cancelled) setMapError(true);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    (map.getSource("actual") as GeoJSONSource | undefined)?.setData(actualTrackData(snapshot));
    (map.getSource("position") as GeoJSONSource | undefined)?.setData(positionData(snapshot));

    if (snapshot?.track.length) {
      const coordinates = snapshot.track.map((point) => [point.longitude, point.latitude] as [number, number]);
      const longitudes = coordinates.map(([longitude]) => longitude);
      const latitudes = coordinates.map(([, latitude]) => latitude);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ];
      const mapWidth = map.getContainer().clientWidth;
      const padding =
        mapWidth < 480
          ? { top: 156, right: 40, bottom: 96, left: 32 }
          : mapWidth < 768
            ? { top: 96, right: 64, bottom: 80, left: 48 }
            : 76;
      map.fitBounds(bounds, { padding, maxZoom: 13.8, duration: reduceMotion ? 0 : 500 });
    }
  }, [ready, reduceMotion, snapshot]);

  return (
    <div className="qgps-map" data-map-ready={ready || undefined}>
      <div
        ref={containerRef}
        className="qgps-map__surface"
        role="region"
        aria-label="Interactive simulated QGPS route map"
      />
      <div className="qgps-map__grid" aria-hidden="true" />
      <div className="qgps-map__label">
        <span>MapLibre operational plot</span>
        <span>No third-party basemap</span>
      </div>
      <div className="qgps-map__legend" aria-label="Map legend">
        <span><i data-kind="planned" /> Planned route</span>
        <span><i data-kind="actual" /> Recent track</span>
        <span><i data-kind="position" /> Latest position</span>
      </div>
      {!ready && !mapError ? (
        <div className="qgps-map__message" role="status">
          <span className="page-loading__signal" aria-hidden="true" />
          Initializing map…
        </div>
      ) : null}
      {mapError ? (
        <div className="qgps-map__message" role="status">
          Map surface unavailable. Position details remain in the inspector.
        </div>
      ) : null}
      {busy ? <div className="qgps-map__busy" aria-hidden="true" /> : null}
    </div>
  );
}
