import type { Metadata } from "next";
import { Suspense } from "react";
import { QgisDemo } from "@/components/qgis-demo";
import { SatelliteExplorer } from "@/components/satellite-explorer";

export const metadata: Metadata = {
  title: "Satellite & GPS Operations Demo",
  description:
    "Search live Copernicus Sentinel-2 scenes and inspect simulated GPS connection states.",
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
      <Suspense fallback={<DemoFallback />}>
        <QgisDemo />
      </Suspense>
    </>
  );
}
