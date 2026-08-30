# Catalyst Frontend Handoff

## Purpose

Build the web interface for Catalyst, the expedition operating system described in
`Expedition OS Developer Action Plan.pdf` and `EXPEDITION_MVP_MILESTONES.md`.
Those documents are the source of truth. This handoff only assigns their web work
to this repository and adds the client's requested first milestone.

- **Stack:** React, Next.js App Router, TypeScript
- **Design direction:** follow the repository `DESIGN.md`
- **Backend contract:** coordinate with `ic-web-node-catalyst`
- **Mobile app:** required by the overall MVP, but it belongs in a later separate
  React Native project—not this web repository

## Product Outcome

The pilot succeeds when a leader can plan an expedition and monitor it, while a
field team can download the plan, work offline, record GPS and reports, reconnect,
and have that data appear correctly in the command view.

The product is decision support. It must never claim a route is **SAFE** or
**UNSAFE**, hide stale data, or present missing data as current.

## Catalyst Milestone 1 — Website and GIS

> Current satellite architecture and required pilot inputs are recorded in
> [SATELLITE_GIS_MVP.md](SATELLITE_GIS_MVP.md). QGIS-specific material below is
> retained as the historical GPS fixture brief, not as a requirement for QGIS
> Server.

This is a client-requested bootstrap milestone before the source plan's numbered
milestones.

Deliver:

- A polished responsive Catalyst website explaining the product, pilot workflow,
  web command interface, offline mobile role, and future Garmin scope.
- Pages for Home, Platform, QGIS Integration, and Demo.
- A map-based QGIS fixture demo showing current position, recent track, timestamp,
  accuracy/fix details when supplied, and connection/freshness state.
- Integration through the Catalyst backend; the browser must not connect to QGIS
  directly.
- Clear **Live**, **Simulated**, **Stale**, **Offline**, and **Unavailable** labels.

Before calling the integration complete, record the exact QGIS deployment,
edition, version, license, service API, and supported data. Fixtures are fine for UI work,
but a simulated demo is not a completed live integration.

Completion checklist:

- [ ] Home, Platform, QGIS Integration, and Demo pages are complete.
- [ ] The experience follows `DESIGN.md` and works on desktop and mobile.
- [ ] The real QGIS source and service API are documented.
- [ ] QGIS data comes through the backend API.
- [ ] Position, track, timestamps, accuracy, and data state render correctly.
- [ ] Loading, empty, error, stale, offline, and simulated states are tested.
- [ ] Accessibility, lint, type-check, tests, production build, and browser checks
      pass.

If the real QGIS deployment is unavailable, report Milestone 1 as partially
complete. Do not hide the gap behind simulated data.

## Source MVP Requirements Assigned to the Web

The source plan requires the web application to provide:

- expedition creation and team assignment;
- a MapLibre command map using a licensed production tile source;
- GPX import, route drawing/editing, segments, camps, waypoints, manual hazards,
  and immutable published plans;
- elevation profile, distance, gain/loss, approximate slope, and provenance;
- normalized weather along route locations, elevations, and planned times with
  source, forecast run, and freshness shown;
- latest team positions and reports with timestamp, source, accuracy, and current,
  stale, offline, or unknown state;
- an operations-centre dashboard covering route, weather, team, schedule, next
  decision, exceptions, alerts, and audit/history;
- transparent 4D timing and weather exposure, including assumptions and
  uncertainty;
- deterministic alerts for deviation, missing update, delay, weather threshold,
  low battery, and route/hazard intersection;
- role-aware access for Leader, Guide, Climber, Operations, and Administrator.

## Source Milestones and Minimum Hours

Do not renumber or silently reduce these requirements:

| # | Source milestone | Floor | Likely | Frontend responsibility |
|---:|---|---:|---:|---|
| 0 | Product, field-workflow and provider discovery | 48 | 60 | Confirm users, workflows, devices, providers, and non-goals. |
| 1 | Architecture, UX flows and delivery specification | 40 | 52 | Web/mobile flows, wireframes, states, and acceptance paths. |
| 2 | Platform foundation and deployment | 64 | 80 | App foundation, environments, CI, tests, and staging build. |
| 3 | Core domain, PostGIS, API and authorization | 80 | 100 | Auth and role-aware screens aligned to API contracts. |
| 4 | Web GIS and expedition planning | 120 | 144 | Primary web implementation: map, GPX, routes, camps, hazards, publishing. |
| 5 | DEM and route analytics | 72 | 92 | Profiles and approximate terrain analytics with provenance. |
| 6 | Weather ingestion and forecast history | 56 | 68 | Weather views, attribution, run time, missing/stale states. |
| 7 | Mobile shell, field screens and offline maps | 112 | 136 | Separate mobile repository; keep web contracts compatible. |
| 8 | Background GPS and tracking lifecycle | 96 | 120 | Separate mobile work; web displays tracking state accurately. |
| 9 | Offline operational data and synchronization | 120 | 148 | Show plan versions and sync/freshness state where relevant. |
| 10 | Field reports and team state | 48 | 60 | Reports, acknowledgement, team position, movement, and freshness UI. |
| 11 | Command dashboard | 72 | 92 | Primary web implementation: operational map, panels, exceptions, history. |
| 12 | 4D route/weather calculations and alerts | 96 | 120 | Explainable timelines, exposure, uncertainty, alerts, acknowledgement. |
| 13 | Reliability, security, privacy and observability | 80 | 104 | Privacy/consent UI, authorization checks, safe errors, telemetry. |
| 14 | Device QA, releases, rehearsal and pilot stabilization | 112 | 144 | Cross-browser QA, rehearsal support, fixes, onboarding, go/no-go evidence. |

The complete pilot floor is **1,216 AI-assisted human hours**; the working estimate
is **1,520 hours**, with a prudent commitment of about **1,750 hours**. These are
whole-project hours, not frontend-only estimates.

## Required Constraints

- The pilot is one organization and roughly 5–15 users.
- Use one licensed map source and one weather provider.
- Public OpenStreetMap tiles must not be bulk-downloaded for offline use.
- All operational values expose time, source, freshness, and confidence/accuracy
  where applicable.
- Missing weather variables remain missing, not zero.
- Published plans are immutable versions.
- Alerts are deterministic, explain their rule, and remain advisory.
- Garmin implementation, satellite intelligence, predictive analytics, AI
  briefings, 3D terrain, logistics, chat, rescue integration, billing, and broad
  administration are outside the core pilot.

## Agent Handoff Rule

Implement only the milestone the user requests. After Milestone 1, report
**“Catalyst Milestone 1 is complete”** only when its checklist genuinely passes;
include the checked items, verification results, and any limitations, confirm the
next milestone has not started, then wait for the user's next prompt.

