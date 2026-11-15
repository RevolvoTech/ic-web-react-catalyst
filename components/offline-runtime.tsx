"use client";

import { useEffect } from "react";

export function OfflineRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // The field screen reports that the offline shell is not ready.
    });
  }, []);
  return null;
}
