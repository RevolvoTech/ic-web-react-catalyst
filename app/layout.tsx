import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "@fontsource-variable/outfit";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "@/styles/marketing.css";
import "@/styles/demo.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  metadataBase: new URL("https://catalyst.example"),
  title: {
    default: "Catalyst — Expedition Operations",
    template: "%s — Catalyst",
  },
  description:
    "Plan expeditions, publish field-ready routes, and monitor team data with its source and freshness intact.",
  openGraph: {
    title: "Catalyst — Expedition Operations",
    description:
      "A decision-support interface connecting expedition planning, offline field work, and command awareness.",
    type: "website",
    images: ["/images/catalyst-hero.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#08090A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
