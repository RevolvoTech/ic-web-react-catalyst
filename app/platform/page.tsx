import type { Metadata } from "next";
import {
  ArrowRight,
  BatteryWarning,
  CircleAlert,
  CloudSun,
  FileCheck2,
  History,
  Map,
  RadioTower,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { EditorialHero } from "@/components/editorial-hero";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = {
  title: "Platform",
  description:
    "Explore how Catalyst connects the web command interface with a later offline field application.",
};

const lifecycle = [
  ["Plan", "Route, camps, waypoints, hazards, timing, and weather context."],
  ["Publish", "An immutable plan version becomes the field team's shared reference."],
  ["Operate", "Positions and reports are captured with original timestamps and accuracy."],
  ["Review", "Command sees changes, exceptions, acknowledgements, and history."],
] as const;

export default function PlatformPage() {
  return (
    <>
      <EditorialHero
        eyebrow="Platform overview"
        title={
          <>
            One plan. <em>Two environments.</em>
          </>
        }
        description="A map-led command interface for leaders and operations, paired later with an offline-first mobile field application for guides and climbers."
        image="/images/field-planning.png"
        imageAlt="Expedition planners reviewing a tablet and paper map inside a high-altitude shelter"
        actions={
          <Link className="button button--primary" href="/demo">
            Explore the demo <ArrowRight aria-hidden="true" />
          </Link>
        }
      />

      <section className="dual-environment shell">
        <div className="section-heading">
          <p className="eyebrow">Shared expedition record</p>
          <h2>Different tools. One operational truth.</h2>
          <p>
            The web and mobile experiences are deliberately different in density and behavior.
            They stay aligned through versioned plans and explicit sync state—not visual similarity.
          </p>
        </div>

        <div className="environment-split">
          <article className="environment-panel environment-panel--command">
            <div className="environment-panel__number">01</div>
            <Map aria-hidden="true" />
            <p className="eyebrow">Web command</p>
            <h3>Plan and monitor.</h3>
            <p>
              Leaders and operations work from a dominant command map, route context, weather,
              schedule, exceptions, alerts, and audit history.
            </p>
            <ul className="plain-list">
              <li>Route planning and immutable publishing</li>
              <li>Latest team positions and reports</li>
              <li>Explainable advisory alerts</li>
            </ul>
          </article>
          <article className="environment-panel environment-panel--field">
            <div className="environment-panel__number">02</div>
            <Smartphone aria-hidden="true" />
            <p className="eyebrow">Planned field app</p>
            <h3>Carry and record.</h3>
            <p>
              A companion mobile experience will carry published plans, record positions and
              reports offline, and synchronize after reconnection.
            </p>
            <ul className="plain-list">
              <li>Downloaded operational plan</li>
              <li>Background GPS and field reports</li>
              <li>Queued sync after reconnection</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="lifecycle-section">
        <div className="shell">
          <div className="section-heading section-heading--wide">
            <p className="eyebrow">Operational lifecycle</p>
            <h2>From route intent to field evidence.</h2>
          </div>
          <ol className="lifecycle-list">
            {lifecycle.map(([title, copy], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="platform-matrix shell">
        <article className="platform-matrix__lead">
          <div className="platform-matrix__icon"><Map aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Command map</p>
            <h2>Geography is the primary interface.</h2>
            <p>
              Planned route, actual track, camps, waypoints, team positions, and hazards use
              distinct shapes and colors backed by a textual inspector.
            </p>
          </div>
          <div className="matrix-route" aria-hidden="true">
            <span data-point="start" />
            <span data-point="middle" />
            <span data-point="end" />
          </div>
        </article>
        <article className="platform-matrix__support">
          <CloudSun aria-hidden="true" />
          <div>
            <p className="eyebrow">Weather provenance</p>
            <h3>Forecast run and missing values stay visible.</h3>
          </div>
        </article>
        <article className="platform-matrix__support">
          <History aria-hidden="true" />
          <div>
            <p className="eyebrow">Audit and history</p>
            <h3>Decisions retain their sequence and context.</h3>
          </div>
        </article>
        <article className="platform-matrix__strip">
          <div>
            <RadioTower aria-hidden="true" />
            <span>Position freshness</span>
          </div>
          <div>
            <BatteryWarning aria-hidden="true" />
            <span>Deterministic rules</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <span>Role-aware access</span>
          </div>
          <div>
            <FileCheck2 aria-hidden="true" />
            <span>Immutable plans</span>
          </div>
        </article>
      </section>

      <section className="state-integrity">
        <div className="shell state-integrity__grid">
          <div>
            <p className="eyebrow">State integrity</p>
            <h2>A status is evidence, not decoration.</h2>
            <p>
              Color always travels with a label. A failed refresh does not erase useful last-known
              data, and an unknown timestamp can never become live by assumption.
            </p>
          </div>
          <div className="state-stack" aria-label="Example operational states">
            <div><StatusBadge tone="information">Live</StatusBadge><span>Verified live source and freshness window</span></div>
            <div><StatusBadge tone="simulated">Simulated</StatusBadge><span>Generated demonstration data</span></div>
            <div><StatusBadge tone="warning">Stale</StatusBadge><span>Older than its declared freshness threshold</span></div>
            <div><StatusBadge tone="unknown">Offline</StatusBadge><span>Connection lost; last-known may remain</span></div>
            <div><StatusBadge tone="critical">Unavailable</StatusBadge><span>No usable source or position</span></div>
          </div>
        </div>
      </section>

      <section className="scope-section shell">
        <div>
          <CircleAlert aria-hidden="true" />
          <p className="eyebrow">Product scope</p>
          <h2>Focused now. Extensible later.</h2>
        </div>
        <div className="scope-columns">
          <div>
            <h3>Core capabilities</h3>
            <p>Planning, route context, satellite intelligence, weather, team state, reports, command awareness, and advisory alerts.</p>
          </div>
          <div>
            <h3>Future scope</h3>
            <p>Garmin support, premium high-resolution imagery, predictive analytics, AI briefings, 3D terrain, logistics, and rescue integrations.</p>
          </div>
        </div>
      </section>

      <section className="simple-cta shell">
        <p className="eyebrow">Next view</p>
        <h2>Explore GIS and satellite data.</h2>
        <p>Review live Copernicus scenes, source details, cloud cover, and resolution.</p>
        <Link className="button button--primary" href="/qgis">
          Review GIS & Satellite <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </>
  );
}
