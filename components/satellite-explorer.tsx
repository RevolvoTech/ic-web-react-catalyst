"use client";

import {
  AlertTriangle,
  CalendarDays,
  Cloud,
  Image as ImageIcon,
  Layers3,
  RefreshCw,
  Satellite,
  ScanSearch,
  Snowflake,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  formatPercent,
  formatSceneDate,
  isSatelliteCatalog,
  type SatelliteCatalog,
  type SatelliteScene,
} from "@/lib/satellite";

const PILOT_BBOX = "76.48,35.70,76.56,35.78";
const MAX_CLOUD_COVER = 30;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 60);
  return { from: isoDate(from), to: isoDate(to) };
}

function errorMessage(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = value.error;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return null;
}

function ScenePreview({ scene, renderUrl }: { scene: SatelliteScene; renderUrl: string | null }) {
  const previewUrl = renderUrl ?? scene.thumbnailUrl;
  return (
    <div className="satellite-preview">
      {previewUrl ? (
        <div
          className="satellite-preview__image"
          role="img"
          aria-label={`Sentinel-2 preview captured ${formatSceneDate(scene.capturedAt)}`}
          style={{ backgroundImage: `url(${JSON.stringify(previewUrl)})` }}
        />
      ) : (
        <div className="satellite-preview__empty" role="status">
          <ImageIcon aria-hidden="true" />
          <strong>No preview supplied</strong>
          <span>The scene metadata and footprint remain available.</span>
        </div>
      )}
      <div className="satellite-preview__stamp">
        <span>{renderUrl ? "Processed true colour" : "Catalogue quicklook"}</span>
        <span>{scene.groundSampleDistanceM} m source sampling</span>
      </div>
    </div>
  );
}

export function SatelliteExplorer() {
  const [range] = useState(defaultRange);
  const [catalog, setCatalog] = useState<SatelliteCatalog | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setCatalogError(null);
    const parameters = new URLSearchParams({
      bbox: PILOT_BBOX,
      from: range.from,
      to: range.to,
      cloud: String(MAX_CLOUD_COVER),
      limit: "8",
    });

    try {
      const response = await fetch(`/api/satellite/catalog?${parameters}`, {
        headers: { accept: "application/json" },
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload) ?? "Satellite catalogue request failed.");
      if (!isSatelliteCatalog(payload)) throw new Error("Catalyst returned an invalid satellite catalogue.");
      setCatalog(payload);
      setSelectedId((current) =>
        current && payload.scenes.some((scene) => scene.id === current)
          ? current
          : (payload.scenes[0]?.id ?? null),
      );
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Satellite catalogue request failed.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog]);

  useEffect(() => {
    return () => {
      if (renderUrl) URL.revokeObjectURL(renderUrl);
    };
  }, [renderUrl]);

  const selectedScene = catalog?.scenes.find((scene) => scene.id === selectedId) ?? null;

  async function loadProcessedImage() {
    if (!selectedScene) return;
    setRenderState("loading");
    const parameters = new URLSearchParams({
      sceneId: selectedScene.id,
      bbox: PILOT_BBOX,
      width: "1200",
      height: "1200",
    });
    try {
      const response = await fetch(`/api/satellite/render?${parameters}`, {
        headers: { accept: "image/png" },
      });
      if (!response.ok) {
        setRenderState("unavailable");
        return;
      }
      const nextUrl = URL.createObjectURL(await response.blob());
      setRenderUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      setRenderState("ready");
    } catch {
      setRenderState("unavailable");
    }
  }

  function selectScene(scene: SatelliteScene) {
    setSelectedId(scene.id);
    setRenderUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setRenderState("idle");
  }

  return (
    <div className="satellite-experience">
      <section className="demo-intro shell satellite-intro">
        <div>
          <p className="eyebrow">Live satellite intelligence</p>
          <h1>See the terrain.<br /><em>Know the source.</em></h1>
        </div>
        <div className="demo-intro__copy">
          <StatusBadge tone={catalog ? "information" : catalogError ? "critical" : "unknown"}>
            {catalog ? "Live catalogue" : catalogError ? "Unavailable" : "Connecting"}
          </StatusBadge>
          <p>
            Catalyst searches the public Copernicus Sentinel-2 catalogue through its backend.
            Imagery supports planning and awareness; it does not prove route or hazard safety.
          </p>
        </div>
      </section>

      <section className="satellite-console shell" aria-labelledby="satellite-console-title">
        <header className="satellite-console__header">
          <div>
            <span className="data-label">Development area of interest</span>
            <h2 id="satellite-console-title">Karakoram pilot · Sentinel-2 L2A</h2>
          </div>
          <div className="satellite-console__status" aria-live="polite">
            <StatusBadge tone="information">20–50 m MVP target</StatusBadge>
            <button className="button button--secondary" type="button" onClick={() => void loadCatalog()} disabled={loading}>
              <RefreshCw aria-hidden="true" /> {loading ? "Searching…" : "Refresh scenes"}
            </button>
          </div>
        </header>

        <div className="satellite-query-strip" aria-label="Satellite search parameters">
          <span><ScanSearch aria-hidden="true" /> AOI {PILOT_BBOX}</span>
          <span><CalendarDays aria-hidden="true" /> {range.from} — {range.to}</span>
          <span><Cloud aria-hidden="true" /> ≤ {MAX_CLOUD_COVER}% cloud</span>
        </div>

        {catalogError ? (
          <div className="satellite-alert" role="alert">
            <AlertTriangle aria-hidden="true" />
            <div><strong>Live catalogue unavailable</strong><p>{catalogError}</p></div>
            <button className="button button--secondary" type="button" onClick={() => void loadCatalog()}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="satellite-console__workspace" aria-busy={loading}>
          <div className="satellite-scene-list" role="region" aria-label="Available Sentinel-2 scenes">
            <div className="satellite-scene-list__heading">
              <span className="data-label">Newest qualifying scenes</span>
              <strong>{catalog?.scenes.length ?? 0}</strong>
            </div>
            {catalog?.scenes.map((scene) => (
              <button
                type="button"
                aria-pressed={scene.id === selectedId}
                key={scene.id}
                onClick={() => selectScene(scene)}
              >
                <Satellite aria-hidden="true" />
                <span><strong>{formatSceneDate(scene.capturedAt)}</strong><small>{scene.platform} · {scene.groundSampleDistanceM} m</small></span>
                <span><small>Cloud</small><strong>{formatPercent(scene.cloudCoverPercent)}</strong></span>
              </button>
            ))}
            {!loading && catalog?.scenes.length === 0 ? (
              <div className="satellite-scene-list__empty" role="status">No scenes matched this date and cloud filter.</div>
            ) : null}
            {loading ? <div className="satellite-scene-list__empty" role="status">Searching the live Copernicus catalogue…</div> : null}
          </div>

          <div className="satellite-inspector">
            {selectedScene ? (
              <>
                <ScenePreview scene={selectedScene} renderUrl={renderUrl} />
                <div className="satellite-inspector__details">
                  <div className="satellite-inspector__title">
                    <div><span className="data-label">Selected acquisition</span><h3>{formatSceneDate(selectedScene.capturedAt)}</h3></div>
                    <Layers3 aria-hidden="true" />
                  </div>
                  <dl>
                    <div><dt>Source sampling</dt><dd>{selectedScene.groundSampleDistanceM} m</dd></div>
                    <div><dt>Cloud cover</dt><dd>{formatPercent(selectedScene.cloudCoverPercent)}</dd></div>
                    <div><dt>Snow cover</dt><dd><Snowflake aria-hidden="true" /> {formatPercent(selectedScene.snowCoverPercent)}</dd></div>
                    <div><dt>Platform</dt><dd>{selectedScene.platform}</dd></div>
                  </dl>
                  <button className="button button--primary" type="button" onClick={() => void loadProcessedImage()} disabled={renderState === "loading"}>
                    <ImageIcon aria-hidden="true" /> {renderState === "loading" ? "Rendering…" : renderState === "ready" ? "Reload processed image" : "Load processed image"}
                  </button>
                  {renderState === "unavailable" ? (
                    <p className="satellite-render-note" role="status">
                      Processed imagery is ready in code and will activate after Copernicus OAuth credentials are added to the backend.
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="satellite-inspector__empty" role="status">
                <Satellite aria-hidden="true" />
                <strong>{catalogError ? "Catalogue connection unavailable" : "Waiting for a satellite scene"}</strong>
                <span>No imagery is invented when the live source cannot answer.</span>
              </div>
            )}
          </div>
        </div>

        <footer className="operations-console__footer satellite-console__footer">
          <span>Schema: {catalog?.schemaVersion ?? "catalyst.satellite.catalog.v1"}</span>
          <span>Source: {catalog?.source.name ?? "Copernicus Data Space Ecosystem"}</span>
          <span>{catalog ? `Retrieved ${formatSceneDate(catalog.retrievedAt)}` : "Freshness unavailable"}</span>
        </footer>
      </section>
    </div>
  );
}
