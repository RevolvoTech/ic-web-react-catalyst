import type { Metadata } from "next";
import { ArrowDown, ArrowRight, Database, Laptop, Satellite, Server } from "lucide-react";
import Link from "next/link";
import { EditorialHero } from "@/components/editorial-hero";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = {
  title: "GIS & Satellite Data",
  description: "Review the live Copernicus satellite catalogue, Catalyst GIS boundary, and planned PostGIS architecture.",
};

const registry = [
  ["Live catalogue", "Copernicus Data Space STAC"],
  ["Current collection", "Sentinel-2 Level-2A"],
  ["Processed true colour", "Ready after backend OAuth credentials"],
  ["Web renderer", "MapLibre GL JS"],
  ["Spatial database", "PostgreSQL + PostGIS planned for route data"],
] as const;

const fields = [
  ["acquisition", "Original capture and publication timestamps"],
  ["quality", "Cloud cover, snow cover, and source ground sampling"],
  ["footprint", "Provider-supplied geographic bounding box"],
  ["provenance", "Collection, platform, protocol, schema, and attribution"],
  ["limits", "Explicit notice that imagery does not prove field safety"],
] as const;

export default function GisPage() {
  return (
    <>
      <EditorialHero
        eyebrow="GIS & satellite data"
        title={<>Geography, <em>without vendor lock-in.</em></>}
        description="Catalyst now searches the live Copernicus Sentinel-2 catalogue through its TypeScript backend and presents source, capture time, cloud cover, snow cover, and resolution. MapLibre renders the web experience; QGIS Desktop remains an optional analyst tool."
        image="/images/catalyst-hero.png"
        imageAlt="Mountaineers moving along a remote snow ridge beneath a dark sky"
        actions={<Link className="button button--primary" href="/demo">Open satellite console <ArrowRight aria-hidden="true" /></Link>}
      />

      <section className="integration-status shell" aria-labelledby="integration-status-title">
        <div className="integration-status__summary">
          <StatusBadge tone="information">Live catalogue connected</StatusBadge>
          <p className="eyebrow">MVP integration status</p>
          <h2 id="integration-status-title">Real scene metadata now crosses the Catalyst backend boundary.</h2>
          <p>Public Sentinel-2 discovery works without a token. Processed true-colour images use the same provider-neutral contract and activate when Copernicus OAuth credentials are stored on the backend—not in the browser.</p>
        </div>
        <aside className="integration-status__note" aria-label="Planning note">
          <p className="eyebrow">Planning note</p>
          <p>Satellite imagery supports planning and should be verified against current field conditions.</p>
        </aside>
      </section>

      <section className="architecture-section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">MVP architecture</p>
            <h2>The website asks Catalyst. Catalyst asks the data provider.</h2>
            <p>Credentials, provider requests, validation, attribution, and future premium-provider switching stay behind the API.</p>
          </div>
          <ol className="architecture-flow" aria-label="Satellite GIS data flow">
            <li><Laptop aria-hidden="true" /><span>01</span><h3>MapLibre interface</h3><p>Requests normalized scene metadata and images from same-origin routes.</p></li>
            <ArrowDown className="architecture-flow__arrow" aria-hidden="true" />
            <li><Server aria-hidden="true" /><span>02</span><h3>Catalyst API</h3><p>Validates the AOI, protects OAuth secrets, and preserves provenance.</p></li>
            <ArrowDown className="architecture-flow__arrow" aria-hidden="true" />
            <li><Satellite aria-hidden="true" /><span>03</span><h3>Copernicus</h3><p>Supplies Sentinel-2 catalogue records and processed imagery.</p></li>
          </ol>
        </div>
      </section>

      <section className="source-register shell">
        <div className="source-register__heading">
          <p className="eyebrow">Capability register</p>
          <h2>Free data now. Higher-resolution providers later.</h2>
          <p>The interface consumes a Catalyst schema rather than a Mapbox, Copernicus, Planet, or Maxar-specific browser contract.</p>
        </div>
        <dl className="source-register__list">{registry.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>

      <section className="normalized-contract">
        <div className="shell normalized-contract__grid">
          <div>
            <Database aria-hidden="true" /><p className="eyebrow">Normalized contract</p>
            <h2>Stable for the interface. Traceable to the source.</h2>
            <p>Catalyst validates upstream records before the browser receives them and retains the original acquisition metadata.</p>
            <div className="contract-version"><span>Schema</span><strong>catalyst.satellite.catalog.v1</strong></div>
          </div>
          <dl className="contract-fields">{fields.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl>
        </div>
      </section>

      <section className="confirmation-list shell">
        <div><p className="eyebrow">Needed to finish the pilot</p><h2>Three client inputs turn the development view into their expedition.</h2></div>
        <ol>
          <li>Copernicus Data Space OAuth client ID and secret, stored as backend secrets</li>
          <li>The real pilot area, route, or GPX file instead of the development Karakoram bounding box</li>
          <li>The preferred default date window and acceptable cloud-cover threshold</li>
        </ol>
      </section>

      <section className="simple-cta shell">
        <p className="eyebrow">Inspect the integration</p><h2>Search current Sentinel-2 acquisitions.</h2>
        <p>The console clearly separates live Copernicus records from the simulated GPS state lab beneath it.</p>
        <Link className="button button--primary" href="/demo">Open satellite console <ArrowRight aria-hidden="true" /></Link>
      </section>
    </>
  );
}
