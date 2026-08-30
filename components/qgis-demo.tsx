"use client";

import {
  AlertTriangle,
  Clock3,
  Crosshair,
  Database,
  LocateFixed,
  RefreshCw,
  Route,
  Satellite,
  Signal,
  WifiOff,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QgisMap } from "@/components/qgis-map";
import { StatusBadge } from "@/components/status-badge";
import {
  formatAge,
  formatCoordinate,
  isQgisScenario,
  isQgisSnapshot,
  type QgisFreshness,
  type QgisScenario,
  type QgisSnapshot,
} from "@/lib/qgis";

type DemoScenario = QgisScenario | "error";

const scenarios: ReadonlyArray<{
  id: DemoScenario;
  label: string;
  description: string;
}> = [
  { id: "current", label: "Current fixture", description: "Recent simulated position and track" },
  { id: "stale", label: "Stale", description: "Last fix outside freshness threshold" },
  { id: "offline", label: "Offline", description: "Connection lost with last-known data" },
  { id: "empty", label: "Empty", description: "Connected source with no position yet" },
  { id: "error", label: "Error", description: "Backend request fails safely" },
  { id: "unavailable", label: "Unavailable", description: "No upstream source configured" },
];

const freshnessTone: Record<QgisFreshness, "information" | "warning" | "critical" | "unknown"> = {
  current: "information",
  stale: "warning",
  offline: "unknown",
  unavailable: "critical",
  unknown: "unknown",
};

const freshnessLabel: Record<QgisFreshness, string> = {
  current: "Current",
  stale: "Stale",
  offline: "Offline",
  unavailable: "Unavailable",
  unknown: "Unknown",
};

function scenarioFromSearch(value: string | null): DemoScenario {
  if (value === "error") return value;
  return isQgisScenario(value) ? value : "current";
}

function responseErrorMessage(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const { error } = value;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return null;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function QgisDemo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const scenario = scenarioFromSearch(searchParams.get("state"));
  const [snapshot, setSnapshot] = useState<QgisSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestNumber = ++requestSequence.current;

    fetch(`/api/qgis/snapshot?scenario=${encodeURIComponent(scenario)}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(responseErrorMessage(body) ?? "QGIS request failed.");
        }
        if (!isQgisSnapshot(body)) throw new Error("Catalyst returned an invalid QGIS snapshot.");
        if (controller.signal.aborted || requestNumber !== requestSequence.current) return;
        setError(null);
        setSnapshot(body);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || requestNumber !== requestSequence.current) return;
        setError(requestError instanceof Error ? requestError.message : "QGIS request failed.");
      })
      .finally(() => {
        if (requestNumber === requestSequence.current) setBusy(false);
      });

    return () => {
      controller.abort();
      if (requestSequence.current === requestNumber) requestSequence.current += 1;
    };
  }, [refreshKey, scenario]);

  const recentTrack = useMemo(() => snapshot?.track.slice(-5).reverse() ?? [], [snapshot]);

  function selectScenario(nextScenario: DemoScenario) {
    setBusy(true);
    setError(null);
    if (nextScenario === scenario) {
      setRefreshKey((value) => value + 1);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("state", nextScenario);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="demo-experience">
      <section className="demo-intro demo-intro--secondary shell">
        <div>
          <p className="eyebrow">GPS connection state lab</p>
          <h2>Read the position.<br /><em>Judge the signal.</em></h2>
        </div>
        <div className="demo-intro__copy">
          <StatusBadge tone="simulated">Simulated only</StatusBadge>
          <p>
            This map receives normalized GPS fixtures through the Catalyst backend route. It is a
            UI state test—not verified live tracker data—and must not be used for field decisions.
          </p>
        </div>
      </section>

      <section className="scenario-section shell" aria-labelledby="scenario-title">
        <div className="scenario-section__heading">
          <p id="scenario-title" className="data-label">Select a data condition</p>
          <p>URL state updates so each condition can be shared and revisited.</p>
        </div>
        <div className="scenario-switcher" role="group" aria-labelledby="scenario-title">
          {scenarios.map((item) => (
            <m.button
              key={item.id}
              type="button"
              aria-pressed={scenario === item.id}
              onClick={() => selectScenario(item.id)}
              whileTap={{ scale: 0.985 }}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </m.button>
          ))}
        </div>
      </section>

      <section className="operations-console shell" aria-labelledby="console-title">
        <header className="operations-console__header">
          <div>
            <span className="data-label">Expedition</span>
            <h2 id="console-title">{snapshot?.expedition.name ?? "Karakoram Pilot"}</h2>
          </div>
          <div className="operations-console__statuses" aria-live="polite">
            {snapshot?.mode === "live" ? (
              <StatusBadge tone="information">Live</StatusBadge>
            ) : (
              <StatusBadge tone="simulated">Simulated</StatusBadge>
            )}
            {error ? (
              <StatusBadge tone="critical">Error</StatusBadge>
            ) : snapshot ? (
              <StatusBadge tone={freshnessTone[snapshot.freshness]}>
                {freshnessLabel[snapshot.freshness]}
              </StatusBadge>
            ) : (
              <StatusBadge tone="unknown">Loading</StatusBadge>
            )}
          </div>
        </header>

        <AnimatePresence initial={false}>
          {error ? (
            <m.div
              key="console-error"
              className="console-alert"
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>Position refresh failed</strong>
              <p>{error} {snapshot ? "The previous fixture remains visible below." : "No position is available."}</p>
            </div>
            <button className="button button--secondary" type="button" onClick={() => selectScenario("current")}>
              <RefreshCw aria-hidden="true" /> Load current fixture
            </button>
            </m.div>
          ) : null}
        </AnimatePresence>

        <div className="operations-console__workspace" aria-busy={busy}>
          <QgisMap snapshot={snapshot} busy={busy} />

          <aside className="position-inspector" aria-label="GPS position inspector">
            <div className="position-inspector__title">
              <div>
                <span className="data-label">Team</span>
                <h3>{snapshot?.expedition.team ?? "Rope Team A"}</h3>
              </div>
              <Crosshair aria-hidden="true" />
            </div>

            {snapshot?.position ? (
              <>
                <div className="latest-fix">
                  <span className="data-label">Latest position received</span>
                  <strong>{formatAge(snapshot.position.timestamp)}</strong>
                  <time dateTime={snapshot.position.timestamp}>{formatTimestamp(snapshot.position.timestamp)}</time>
                </div>

                <dl className="position-data">
                  <div>
                    <dt><LocateFixed aria-hidden="true" /> Latitude</dt>
                    <dd>{formatCoordinate(snapshot.position.latitude, "N", "S")}</dd>
                  </div>
                  <div>
                    <dt><LocateFixed aria-hidden="true" /> Longitude</dt>
                    <dd>{formatCoordinate(snapshot.position.longitude, "E", "W")}</dd>
                  </div>
                  <div>
                    <dt><Route aria-hidden="true" /> Altitude</dt>
                    <dd>{snapshot.position.altitudeM.toLocaleString()} m</dd>
                  </div>
                  <div>
                    <dt><Crosshair aria-hidden="true" /> Accuracy</dt>
                    <dd>{snapshot.position.accuracyM === null ? "Not supplied" : `±${snapshot.position.accuracyM} m`}</dd>
                  </div>
                  <div>
                    <dt><Satellite aria-hidden="true" /> Fix / satellites</dt>
                    <dd>{snapshot.position.fixType} / {snapshot.position.satellites ?? "—"}</dd>
                  </div>
                  <div>
                    <dt><Signal aria-hidden="true" /> HDOP</dt>
                    <dd>{snapshot.position.hdop ?? "Not supplied"}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="position-empty" role="status">
                {snapshot?.freshness === "unavailable" ? <WifiOff aria-hidden="true" /> : <Satellite aria-hidden="true" />}
                <strong>{snapshot?.freshness === "unavailable" ? "Position unavailable" : "No position received"}</strong>
                <p>{snapshot?.notice ?? "Waiting for the Catalyst backend fixture…"}</p>
              </div>
            )}

            <div className="source-block">
              <Database aria-hidden="true" />
              <div>
                <span className="data-label">Source</span>
                <strong>{snapshot?.source.name ?? "Catalyst QGIS fixture"}</strong>
                <span>Via {snapshot?.source.adapter ?? "adapter pending"}</span>
              </div>
            </div>
          </aside>

          <AnimatePresence initial={false}>
            {busy ? (
              <m.div
                key="console-loading"
                className="console-loading"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
              <span className="page-loading__signal" aria-hidden="true" />
              Loading selected state…
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>

        <footer className="operations-console__footer">
          <span>Schema: {snapshot?.schemaVersion ?? "catalyst.qgis.snapshot.v1"}</span>
          <span>Map attribution: MapLibre GL JS · Catalyst fixture geometry</span>
          <span>No production tile source configured</span>
        </footer>
      </section>

      <section className="track-section shell">
        <div className="track-section__intro">
          <p className="eyebrow">Recent track</p>
          <h2>Every point keeps its own time.</h2>
          <p>
            Track order and timestamps are preserved rather than inferred from the time the browser
            received the response.
          </p>
        </div>
        <div className="track-list" role="list" aria-label="Five most recent simulated track points">
          {recentTrack.length ? (
            recentTrack.map((point, index) => (
              <div key={`${point.timestamp}-${point.latitude}`} role="listitem">
                <span>{String(recentTrack.length - index).padStart(2, "0")}</span>
                <dl>
                  <div><dt>Latitude</dt><dd>{formatCoordinate(point.latitude, "N", "S")}</dd></div>
                  <div><dt>Longitude</dt><dd>{formatCoordinate(point.longitude, "E", "W")}</dd></div>
                  <div><dt>Altitude</dt><dd>{point.altitudeM.toLocaleString()} m</dd></div>
                  <div><dt>Recorded</dt><dd><time dateTime={point.timestamp}>{formatAge(point.timestamp)}</time></dd></div>
                </dl>
              </div>
            ))
          ) : (
            <div className="track-list__empty" role="status">
              <Clock3 aria-hidden="true" />
              <div>
                <strong>No recent track points</strong>
                <p>The selected data condition does not provide a track.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="demo-disclosure shell">
        <AlertTriangle aria-hidden="true" />
        <div>
          <p className="eyebrow">Integration limitation</p>
          <h2>Simulation proves interface behavior—not upstream compatibility.</h2>
          <p>
            Live completion requires the client&apos;s chosen GPS device or tracking feed, representative
            data, a production adapter, and an accepted end-to-end field test.
          </p>
        </div>
      </aside>
    </div>
  );
}
