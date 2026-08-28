import type { Metadata } from "next";
import {
  ArrowRight,
  CloudSun,
  Download,
  MapPinned,
  RadioTower,
  RefreshCw,
  Route,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EditorialHero } from "@/components/editorial-hero";
import { HeroAtmosphere } from "@/components/hero-atmosphere";
import { RouteSignal } from "@/components/route-signal";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = {
  title: "Expedition Operations",
  description:
    "Connect expedition planning, offline field work, and command awareness without hiding data age or uncertainty.",
};

const workflow = [
  {
    number: "01",
    icon: MapPinned,
    title: "Plan the route",
    copy: "Shape routes, camps, waypoints, timing, weather context, and manual hazards in one operational plan.",
  },
  {
    number: "02",
    icon: Download,
    title: "Publish for the field",
    copy: "Issue an immutable plan version for the team to download before coverage disappears.",
  },
  {
    number: "03",
    icon: RadioTower,
    title: "Work beyond coverage",
    copy: "The later mobile field app records positions and reports offline while preserving their original time and source.",
  },
  {
    number: "04",
    icon: RefreshCw,
    title: "Reconnect with context",
    copy: "When connectivity returns, command receives the field record with freshness and sync state kept visible.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <EditorialHero
        home
        eyebrow="Expedition operating system"
        title={
          <>
            Plan beyond <em>last signal.</em>
          </>
        }
        description="Catalyst connects deliberate expedition planning with offline field work and a command view that never hides the age of its data."
        image="/images/catalyst-hero.png"
        imageAlt="Three mountaineers ascending a wind-carved ridge before dawn"
        atmosphere={<HeroAtmosphere />}
        actions={
          <>
            <Link className="button button--primary" href="/demo">
              Open the demo <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="button button--secondary" href="/platform">
              Explore the platform
            </Link>
          </>
        }
      />

      <aside className="signal-rail" aria-label="Catalyst operating principles">
        <div className="shell signal-rail__inner">
          <span>Plan</span>
          <span>Publish</span>
          <span>Track</span>
          <span>Reconnect</span>
          <span>Review</span>
        </div>
      </aside>

      <section className="chapter chapter--split shell">
        <div className="chapter__copy">
          <p className="eyebrow">One expedition record</p>
          <h2>Carry the plan from desk to mountain.</h2>
          <p>
            Planning and field execution should not become separate stories. Catalyst keeps the
            published route, timing assumptions, team reports, and latest received positions tied
            to the same expedition record.
          </p>
          <Link className="text-link" href="/platform">
            See the full workflow <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <figure className="feature-media feature-media--notched">
          <Image
            src="/images/field-planning.png"
            alt="Two expedition team members reviewing a route map and rugged tablet from a mountain shelter"
            fill
            sizes="(max-width: 768px) 100vw, 56vw"
          />
          <figcaption>
            <span>Field planning context</span>
            <span>Original Catalyst visual</span>
          </figcaption>
        </figure>
      </section>

      <section className="workflow-section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">Pilot workflow</p>
            <h2>Continuity when connectivity is not guaranteed.</h2>
            <p>
              The web command interface and later offline mobile app have different jobs, but one
              shared obligation: preserve what was known, when it was known, and where it came from.
            </p>
          </div>

          <ol className="workflow-list">
            {workflow.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.number}>
                  <span className="workflow-list__number">{step.number}</span>
                  <Icon aria-hidden="true" />
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="command-preview">
        <div className="shell command-preview__intro">
          <div>
            <p className="eyebrow">Command awareness</p>
            <h2>See the route. Read the signal.</h2>
          </div>
          <p>
            Every operational value carries the context needed to judge it: source, timestamp,
            freshness, and accuracy when available.
          </p>
        </div>

        <div className="shell command-frame">
          <div className="command-frame__topbar">
            <div>
              <span className="data-label">Karakoram Pilot</span>
              <strong>Route overview</strong>
            </div>
            <div className="command-frame__badges">
              <StatusBadge tone="simulated">Simulated</StatusBadge>
              <StatusBadge tone="information">Current fixture</StatusBadge>
            </div>
          </div>
          <div className="command-frame__body">
            <div className="command-frame__map">
              <RouteSignal />
              <div className="map-legend" aria-label="Map legend">
                <span><i data-kind="planned" /> Planned route</span>
                <span><i data-kind="actual" /> Actual track</span>
                <span><i data-kind="position" /> Latest position</span>
              </div>
            </div>
            <aside className="command-frame__inspector" aria-label="Latest position summary">
              <div className="inspector-block">
                <span className="data-label">Latest position received</span>
                <strong>1 min ago</strong>
                <span>Fixture timestamp</span>
              </div>
              <div className="inspector-grid">
                <div>
                  <span className="data-label">Accuracy</span>
                  <strong>±12 m</strong>
                </div>
                <div>
                  <span className="data-label">Fix</span>
                  <strong>3D</strong>
                </div>
                <div>
                  <span className="data-label">Track points</span>
                  <strong>07</strong>
                </div>
                <div>
                  <span className="data-label">Source</span>
                  <strong>Fixture</strong>
                </div>
              </div>
              <p className="inspector-note">
                Demonstration data only. No live QGIS source is connected.
              </p>
              <Link className="button button--primary" href="/demo">
                Inspect every state <ArrowRight aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="capability-band shell">
        <article>
          <Route aria-hidden="true" />
          <p className="eyebrow">Route context</p>
          <h3>Plan versions stay explicit.</h3>
          <p>Published plans are immutable so the field and command can identify the same version.</p>
        </article>
        <article>
          <CloudSun aria-hidden="true" />
          <p className="eyebrow">Weather context</p>
          <h3>Missing never becomes zero.</h3>
          <p>Forecast source, run time, freshness, and unavailable variables remain visible.</p>
        </article>
        <article>
          <RadioTower aria-hidden="true" />
          <p className="eyebrow">Team context</p>
          <h3>Last-known stays last-known.</h3>
          <p>Refresh failures preserve useful data while clearly exposing its age and connection state.</p>
        </article>
      </section>

      <section className="closing-image-cta">
        <Image
          className="closing-image-cta__image"
          src="/images/catalyst-hero.png"
          alt=""
          fill
          sizes="100vw"
          aria-hidden="true"
        />
        <div className="closing-image-cta__wash" aria-hidden="true" />
        <div className="shell closing-image-cta__content">
          <p className="eyebrow">Explore the pilot</p>
          <h2>Operational clarity starts with honest data.</h2>
          <p>
            Walk through the simulated QGIS states and see exactly how Catalyst handles current,
            stale, offline, empty, error, and unavailable information.
          </p>
          <Link className="button button--primary" href="/demo">
            Open the QGIS demo <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
