import type { Metadata } from "next";
import { ArrowDown, ArrowRight, Database, Laptop, Satellite, Server } from "lucide-react";
import Link from "next/link";
import { EditorialHero } from "@/components/editorial-hero";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = {
  title: "GIS & Satellite Data",
  description: "Explore live Copernicus satellite scenes with clear source, capture time, cloud cover, and resolution.",
};

const registry = [
  ["Satellite source", "Copernicus Data Space"],
  ["Collection", "Sentinel-2 Level-2A"],
  ["Imagery", "Processed true colour"],
  ["Web maps", "MapLibre GL JS"],
  ["Spatial data", "PostgreSQL + PostGIS"],
] as const;

const fields = [
  ["Capture", "Acquisition and publication timestamps"],
  ["Quality", "Cloud cover, snow cover, and source resolution"],
  ["Coverage", "Geographic footprint for each scene"],
  ["Source", "Collection, platform, and attribution"],
] as const;

export default function GisPage() {
  return (
    <>
      <EditorialHero
        eyebrow="GIS & satellite data"
        title={<>Geography, <em>without vendor lock-in.</em></>}
        description="Explore Sentinel-2 scenes with capture time, cloud cover, snow cover, and source resolution. MapLibre powers the web map, while QGIS Desktop can support deeper analysis."
        image="/images/catalyst-hero.png"
        imageAlt="Mountaineers moving along a remote snow ridge beneath a dark sky"
        actions={<Link className="button button--primary" href="/demo">Open satellite console <ArrowRight aria-hidden="true" /></Link>}
      />

      <section className="integration-status shell" aria-labelledby="integration-status-title">
        <div className="integration-status__summary">
          <StatusBadge tone="information">Live catalogue connected</StatusBadge>
          <p className="eyebrow">Satellite coverage</p>
          <h2 id="integration-status-title">Current Sentinel-2 scenes, ready to inspect.</h2>
          <p>Search recent acquisitions for the Karakoram area, compare cloud cover and source resolution, and open processed true-colour imagery.</p>
        </div>
        <aside className="integration-status__note" aria-label="Planning note">
          <p className="eyebrow">Planning note</p>
          <p>Satellite imagery supports planning and should be verified against current field conditions.</p>
        </aside>
      </section>

      <section className="architecture-section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">Data flow</p>
            <h2>One clear path from source to screen.</h2>
            <p>Catalyst validates each request and keeps source details attached to every result.</p>
          </div>
          <ol className="architecture-flow" aria-label="Satellite GIS data flow">
            <li><Laptop aria-hidden="true" /><span>01</span><h3>Map interface</h3><p>Choose the area and compare available scenes.</p></li>
            <ArrowDown className="architecture-flow__arrow" aria-hidden="true" />
            <li><Server aria-hidden="true" /><span>02</span><h3>Catalyst</h3><p>Validates the request and prepares imagery for the web.</p></li>
            <ArrowDown className="architecture-flow__arrow" aria-hidden="true" />
            <li><Satellite aria-hidden="true" /><span>03</span><h3>Copernicus</h3><p>Supplies Sentinel-2 catalogue records and processed imagery.</p></li>
          </ol>
        </div>
      </section>

      <section className="source-register shell">
        <div className="source-register__heading">
          <p className="eyebrow">Satellite sources</p>
          <h2>Open imagery now. Higher resolution when needed.</h2>
          <p>Imagery providers can change without rebuilding the expedition workflow.</p>
        </div>
        <dl className="source-register__list">{registry.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>

      <section className="normalized-contract">
        <div className="shell normalized-contract__grid">
          <div>
            <Database aria-hidden="true" /><p className="eyebrow">Data quality</p>
            <h2>Every image keeps its context.</h2>
            <p>Capture time, resolution, coverage, and attribution stay attached to each scene.</p>
          </div>
          <dl className="contract-fields">{fields.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl>
        </div>
      </section>

      <section className="simple-cta shell">
        <p className="eyebrow">Explore the data</p><h2>Search current Sentinel-2 acquisitions.</h2>
        <p>Browse recent satellite scenes and inspect GPS state handling.</p>
        <Link className="button button--primary" href="/demo">Open satellite console <ArrowRight aria-hidden="true" /></Link>
      </section>
    </>
  );
}
