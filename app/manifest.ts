import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Catalyst Expedition Operations",
    short_name: "Catalyst",
    description: "Expedition planning and evidence review with explicit source freshness and uncertainty.",
    start_url: "/demo",
    display: "standalone",
    background_color: "#08090A",
    theme_color: "#08090A",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
