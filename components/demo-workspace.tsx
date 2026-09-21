"use client";

import { useEffect, useState } from "react";
import { QgisDemo } from "@/components/qgis-demo";
import { RoutePlanner } from "@/components/route-planner";
import { SatelliteExplorer } from "@/components/satellite-explorer";
import { WeatherPanel } from "@/components/weather-panel";
import { WORKSPACE_DETAIL_EVENT, type WorkspaceDetail } from "@/lib/workspace-detail";

const details: ReadonlyArray<{ id: WorkspaceDetail; label: string }> = [
  { id: "route", label: "Route & briefing" },
  { id: "weather", label: "Weather" },
  { id: "satellite", label: "Satellite scenes" },
  { id: "gps", label: "GPS simulation" },
];

export function DemoWorkspace() {
  const [activeDetail, setActiveDetail] = useState<WorkspaceDetail | null>(null);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDetail>).detail;
      if (!details.some((item) => item.id === detail)) return;
      setActiveDetail(detail);
      window.requestAnimationFrame(() => document.getElementById("demo-evidence")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
    };
    window.addEventListener(WORKSPACE_DETAIL_EVENT, listener);
    return () => window.removeEventListener(WORKSPACE_DETAIL_EVENT, listener);
  }, []);

  return (
    <QgisDemo showGpsDetails={activeDetail === "gps"}>
      <section className="demo-evidence shell" id="demo-evidence" aria-labelledby="demo-evidence-title">
        <button className="demo-evidence__toggle" type="button" aria-expanded={activeDetail !== null} onClick={() => setActiveDetail(activeDetail === null ? "route" : null)}>
          <span id="demo-evidence-title">{activeDetail === null ? "View evidence" : "Hide evidence"}</span>
          <span aria-hidden="true">{activeDetail === null ? "+" : "−"}</span>
        </button>
        {activeDetail !== null ? <div className="demo-evidence__tabs" role="group" aria-label="Evidence details">
          {details.map((item) => <button key={item.id} type="button" aria-pressed={activeDetail === item.id} onClick={() => setActiveDetail(item.id)}>{item.label}</button>)}
        </div> : null}
      </section>
      <div hidden={activeDetail !== "weather"}><WeatherPanel /></div>
      <div hidden={activeDetail !== "route"}><RoutePlanner /></div>
      <div hidden={activeDetail !== "satellite"}><SatelliteExplorer /></div>
    </QgisDemo>
  );
}
