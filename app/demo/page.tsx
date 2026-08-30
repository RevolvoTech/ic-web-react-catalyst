import type { Metadata } from "next";
import { Suspense } from "react";
import { QgisDemo } from "@/components/qgis-demo";
import { RoutePlanner } from "@/components/route-planner";
import { SatelliteExplorer } from "@/components/satellite-explorer";
import { WeatherPanel } from "@/components/weather-panel";

export const metadata: Metadata = {
  title: "Expedition Operations Demo",
  description:
    "Inspect live weather, GPX route elevation, Copernicus terrain evidence, satellite scenes, and GPS connection states.",
};

function DemoFallback() {
  return (
    <div className="demo-fallback shell" role="status">
      <span className="page-loading__signal" aria-hidden="true" />
      Preparing the operations console…
    </div>
  );
}

export default function DemoPage() {
  return (
    <>
      <SatelliteExplorer />
      <WeatherPanel />
      <RoutePlanner />
      <Suspense fallback={<DemoFallback />}>
        <QgisDemo />
      </Suspense>
    </>
  );
}
