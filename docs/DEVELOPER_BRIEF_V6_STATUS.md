# Developer Brief v6 — web implementation

The October 2026 brief was reviewed against both repositories on 15 November
2026. This file records the implemented web scope and the production boundary.
The backend repository contains the matching activation guide.

## Implemented

- `/operations` now starts with a field workspace. Viewers can read the command
  map, published plan and leader decision. Guides see their own GPS fixes and
  reports; their alert view still contains only approved deliveries. Leaders can
  publish GPX-based plans, attach analyst GeoJSON hazard polygons, register a
  member's device, and record a written go/no-go/hold decision.
- The map uses MapLibre with local PMTiles, an orange planned route, blue actual
  tracks, directional initial markers, accuracy rings and explicitly labeled
  stale/offline readings. The arrow does not claim a measured heading. A text
  list preserves coordinates, original fix time, receipt time, source and
  accuracy. Imported/legacy evidence is labeled simulated unless it comes from
  a registered RockBLOCK ingestion path. The public GIS demo remains simulated.
- Plan download and the latest 100 visible fixes are stored in IndexedDB under
  the signed-in account and expedition. Reconnection downloads the server's
  active immutable plan. HTTP 401/403 never falls back to a cached access grant.
  Offline access uses the last verified membership until reconnection; it is
  not instantaneous offline revocation.
- Field reports have durable client UUIDs and original observation times. They
  sync in bounded batches while the app is open, on reconnection and retry.
  Only acknowledged IDs are removed; failures/conflicts retain the outbox.
  Sign-out clears downloaded operational data but preserves unsent reports for
  the same account's next sign-in. Keep a field device private. Closing the app
  does not perform unattended authenticated background uploads.
- Workbox precaches production application code, fonts and MapLibre workers;
  public shell pages and up to ten processed satellite images are cached.
  Authenticated APIs bypass the service worker cache. Weather retains one
  last-known snapshot and satellite metadata retains up to ten scenes in
  IndexedDB, always matched to the original query and labeled after failure.
  The command screen reports whether the offline shell is actually ready.
- A real, attributed Nanga Parbat archive is included at
  `public/offline/nanga-parbat.pmtiles`: 1,601,198 bytes, bounds
  74.35–74.85 E / 35.05–35.45 N, zooms 0–14. The download action verifies SHA-256
  before storing it locally. The manifest and licence/source notice accompany
  the file. It is vector context, not an elevation DEM or live terrain evidence.
- Audit timelines use actor names, expandable source payloads, and plan/alert/
  position/decision/role filters. Full JSON export follows server sequence
  cursors until all events are exported, independent of the visible filters.
- Same-origin `/api/qgps/snapshot` and `/api/qgps/rockblock/inbound` forward to
  the backend without exposing server credentials. Next.js and its ESLint
  configuration were updated to 16.4.6 after the production audit flagged a
  critical issue in 16.3.8. Production dependency audit is clean.

## Verification and limits

Frontend lint, strict types, unit tests and production build are checked. The
unit suite contains 77 passing checks. All 45 existing browser checks passed
across the initial run and targeted reruns: the fallback-label regression was
fixed, and the slow ArcGIS camera check passed with tracing disabled after
timing out during cleanup in traced runs. The
existing Playwright suite covers all five public/command shells, accessibility,
responsive widths, demo interactions and reduced motion. The field component
was also exercised in a disposable browser harness with explicitly simulated
data: map loading, a 390 px viewport without overflow, and offline report
queue/reconnect acknowledgement. An additional disposable production-bundled
harness was controlled by the actual Workbox worker: it reloaded offline with
the saved plan, position and local basemap intact, and its axe A/AA scan found no
violations. This uses simulated evidence, not a physical tracker. Local Supabase integration tests in the
backend use real Auth sessions and PostgreSQL roles for approval, delivery,
immutability, publishing, GPS ingestion and report synchronization.

Automatic approval review blocked commands configuring an authenticated local
browser build, without a detailed reason. A production signed-in browser
acceptance run remains outstanding; the isolated component harness is not that
acceptance run. Physical GPS transmissions, native-device/background GPS,
browser storage eviction, an expedition leader review and outdoor rehearsal
remain required before field readiness can be claimed.

## Production activation

1. Apply backend migration `20261115090000_field_operations.sql` (schema revision
   6) before deploying the backend. Keep the earlier approval/audit migrations.
2. Configure the backend database/Auth and the provider JWT public key or trusted
   gateway signature secret. Verify an actual signed webhook sample and the
   firmware's `catalyst.gps.fix.v1` payload before enabling a physical device.
3. Build the frontend with `CATALYST_BACKEND_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the
   intended project. Never publish a service-role key. `npm run build` prepares
   the local map workers and generates `public/sw.js`; these are build artifacts.
4. Confirm real expedition membership, verify each role in production, download
   the plan and regional map, wait for the offline shell-ready indication, then
   rehearse offline/reconnect on the actual pilot device.

The brief's expectation that a `NEXT_PUBLIC_ARCGIS_API_KEY` stays out of the
browser bundle is incompatible with browser API-key authentication. Esri
explicitly identifies these as public keys. Apply least privileges and allowed
referrers in the company-owned Esri account, rotate any exposed confidential
credentials, and configure account usage alerts. No confidential Esri token is
hardcoded by this change. Account ownership and console restrictions could not
be verified from these repositories.

## External and later-phase work

Garmin inReach application submission, Apple/Google company accounts, RockBLOCK
purchase/SIM activation, actual firmware samples, provider dashboard settings,
production migration, field tests and human acceptance are not completed by a
Git push. No corporate applications, purchases or charges were submitted.

Phase 2 remains roadmap work: InfluxDB sensor adapters and S1–S4 hardware, drone
survey/R2 ingestion and change detection, four-layer hazard scoring with
approved thresholds, Claude draft delivery through the approval gate, daily
assessment scheduling, and Free/Pro entitlements/billing. The brief calls its
core tier “Free” while also assigning a price, so no pricing or billing rule was
invented. These capabilities are not represented as live or complete.

Sources: [Ground Control signed webhooks](https://docs.groundcontrol.com/iot/rockblock/web-services/receiving-mo-message),
[Esri browser credential guidance](https://developers.arcgis.com/javascript/latest/ai-assisted-development/setup-and-validation/),
[Protomaps downloads and terms](https://docs.protomaps.com/basemaps/downloads).
