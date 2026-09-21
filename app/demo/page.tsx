import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoWorkspace } from "@/components/demo-workspace";

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
      <Suspense fallback={<DemoFallback />}>
        <DemoWorkspace />
      </Suspense>
    </>
  );
}
