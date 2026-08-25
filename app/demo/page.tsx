import type { Metadata } from "next";
import { Suspense } from "react";
import { QgpsDemo } from "@/components/qgps-demo";

export const metadata: Metadata = {
  title: "QGPS State Demo",
  description:
    "Inspect simulated current, stale, offline, empty, error, and unavailable QGPS states through the Catalyst backend boundary.",
};

function DemoFallback() {
  return (
    <div className="demo-fallback shell" role="status">
      <span className="page-loading__signal" aria-hidden="true" />
      Preparing the QGPS state lab…
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<DemoFallback />}>
      <QgpsDemo />
    </Suspense>
  );
}
