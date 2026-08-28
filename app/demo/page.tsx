import type { Metadata } from "next";
import { Suspense } from "react";
import { QgisDemo } from "@/components/qgis-demo";

export const metadata: Metadata = {
  title: "QGIS State Demo",
  description:
    "Inspect simulated current, stale, offline, empty, error, and unavailable QGIS states through the Catalyst backend boundary.",
};

function DemoFallback() {
  return (
    <div className="demo-fallback shell" role="status">
      <span className="page-loading__signal" aria-hidden="true" />
      Preparing the QGIS state lab…
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<DemoFallback />}>
      <QgisDemo />
    </Suspense>
  );
}
