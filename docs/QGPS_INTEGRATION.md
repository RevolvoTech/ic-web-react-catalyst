# QGPS Integration Record

## Status

**Partially complete — simulated only. There is no verified live QGPS integration.**

This record describes the Milestone 1 boundary that exists in this repository and
the evidence still required to complete the integration. It must not be read as
confirmation that a particular product or open-source project called “QGPS” has
been selected.

As of 2026-08-24:

- the exact QGPS project, repository, version, owner, and license are unconfirmed;
- the QGPS transport and application protocol are unconfirmed;
- the supported live fields, units, coordinate datum, altitude reference, update
  cadence, authentication, and failure behaviour are unconfirmed;
- the referenced Catalyst backend repository, `ic-web-node-catalyst`, has no
  verified QGPS implementation or agreed response contract; and
- public projects and products with similar QGPS names are ambiguous. None can be
  adopted merely because its name appears to match.

The current UI and API path are therefore a contract-shaped fixture for frontend
development. They are not evidence of a live device, service, or data feed.

## Current integration boundary

The browser must only request the same-origin Catalyst endpoint:

```text
Browser
  GET /api/qgps/snapshot
        |
        v
Next.js server route
  app/api/qgps/snapshot/route.ts
        |
        +-- CATALYST_BACKEND_URL is set
        |     GET {CATALYST_BACKEND_URL}/api/v1/integrations/qgps/snapshot
        |
        +-- CATALYST_BACKEND_URL is not set
              return an explicitly simulated local fixture
```

The browser must never connect directly to a QGPS device, daemon, repository, or
third-party endpoint. `CATALYST_BACKEND_URL` is a server-side setting and must not
be exposed as a `NEXT_PUBLIC_*` variable.

Current route behaviour:

- the upstream fetch bypasses caching, and successful proxy/fixture payloads use
  `Cache-Control: no-store`;
- the proxy sends `Accept: application/json` and a Catalyst request ID;
- the upstream request times out after eight seconds;
- a configured backend that is unreachable or returns a non-success status
  produces a `502` response; it does **not** silently fall back to simulation;
- with no configured backend, the route returns `mode: "simulated"`; and
- `?scenario=` is a demo/fixture control. A production contract must remove,
  restrict, or explicitly define it before release. It must not be treated as a
  live-source feature.

The proposed upstream path is
`/api/v1/integrations/qgps/snapshot`. That path is a frontend expectation, not an
accepted backend contract, until the backend team implements and signs off on it.

## Normalized snapshot DTO

The frontend currently normalizes data to schema
`catalyst.qgps.snapshot.v1`. The canonical TypeScript definition lives in
`lib/qgps.ts`. This DTO is provisional until it is validated against the real
source and agreed with the backend.

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | `"catalyst.qgps.snapshot.v1"` | Version of the normalized Catalyst payload, not a QGPS protocol version. |
| `mode` | `"live" \| "simulated"` | Provenance of the payload. `simulated` must remain visible to the user. |
| `scenario` | `current \| stale \| offline \| unavailable \| empty` | Fixture/demo scenario selector. It is not a confirmed live-source field. |
| `expedition.id` | `string` | Catalyst expedition identifier. Fixture values are invented demo data. |
| `expedition.name` | `string` | Display name for the expedition. |
| `expedition.team` | `string` | Display name for the reporting team. |
| `source.name` | `string` | Human-readable source name. It must identify the real source once known. |
| `source.adapter` | `string` | Backend adapter responsible for normalization. It is not the device protocol. |
| `source.project` | `string \| null` | Exact upstream QGPS project/product. `null` means unconfirmed. |
| `source.repository` | `string \| null` | Canonical repository URL and, eventually, pinned version/commit. `null` means unconfirmed. |
| `source.license` | `string \| null` | Verified license identifier or commercial terms. `null` means unconfirmed. |
| `source.protocol` | `string \| null` | Verified protocol name and version. `null` means unconfirmed. |
| `connection.state` | `connected \| offline \| unavailable` | Adapter/source reachability state. `connected` does not prove that a position fix is current or that the payload is live. |
| `connection.receivedAt` | ISO 8601 timestamp or `null` | Time Catalyst received the payload. It is distinct from the observation time. `null` means no receipt time is known. |
| `freshness` | `current \| stale \| offline \| unavailable \| unknown` | Derived operational freshness state, not a safety judgment. |
| `position` | position object or `null` | Latest normalized fix. `null` means no usable position was supplied; it must not be replaced with zero coordinates. |
| `track` | track point array | Ordered recent history. An empty array means no track is available. It is not proof that the team has not moved. |
| `notice` | `string` | Human-readable disclosure or error context. It is not machine-authoritative state. |

Each track point contains:

| Field | Type | Meaning |
|---|---|---|
| `latitude` | `number` | Latitude in decimal degrees. The real source datum and any required transformation remain to be confirmed. |
| `longitude` | `number` | Longitude in decimal degrees. The real source datum and any required transformation remain to be confirmed. |
| `altitudeM` | `number` | Altitude in metres. The real vertical datum/reference remains to be confirmed and must be documented. |
| `timestamp` | ISO 8601 timestamp | Source observation time for this point. It must not be replaced by request time. |

The latest position adds:

| Field | Type | Meaning |
|---|---|---|
| `accuracyM` | `number \| null` | Reported horizontal accuracy in metres. `null` means unknown; zero must not stand in for missing data. The source confidence model remains to be confirmed. |
| `fixType` | `"2D" \| "3D" \| "unknown"` | Normalized fix classification. `unknown` must remain unknown. |
| `satellites` | `number \| null` | Reported satellites used/visible according to the future adapter contract. Exact source semantics remain unconfirmed. |
| `hdop` | `number \| null` | Reported horizontal dilution of precision. `null` means unavailable. |

All timestamps must include an offset (normally UTC `Z`). Missing operational
values remain `null`, absent, or empty according to the contract; they must never
be fabricated as zero or “current.” The backend adapter must preserve raw-source
provenance sufficiently to audit how every normalized value was produced.

## State and labelling rules

`mode`, `connection.state`, and `freshness` answer different questions and must
not be collapsed into one optimistic label:

- `mode` says whether the payload came from a verified live adapter or a fixture;
- `connection.state` says whether the adapter/source can currently be reached;
- `freshness` says whether the latest observation is recent enough for the
  configured operational threshold.

The fixture currently considers a position stale after ten minutes. That value is
a UI-development assumption, not an approved expedition policy. The final
threshold must be agreed with the client and should be configurable and visible.

Display rules:

1. `mode: "simulated"` always displays **SIMULATED**, including when freshness is
   `current` and connection state is `connected`.
2. **SIMULATED must never be labelled LIVE.** A recent fixture is only a current
   simulation.
3. **LIVE** is permitted only when `mode: "live"` was set by the Catalyst backend
   after data was obtained from the verified, configured QGPS source. Neither
   `connected` nor `current` alone is sufficient.
4. **STALE**, **OFFLINE**, and **UNAVAILABLE** remain visible when applicable and
   may be shown alongside **SIMULATED** or **LIVE** provenance.
5. `position: null`, an empty `track`, an unknown accuracy, or an unknown fix must
   be displayed honestly. The UI must not infer a successful fix.
6. These states provide decision support only. No state may be translated into a
   claim that a route or team is **SAFE** or **UNSAFE**.

## Fixture scenarios

With `CATALYST_BACKEND_URL` unset, the same-origin route provides these deliberate
test conditions:

| Request | Expected fixture condition |
|---|---|
| `?scenario=current` or no scenario | Connected, recent simulated position and track. Still labelled **SIMULATED**, never **LIVE**. |
| `?scenario=stale` | Connected simulated source with an observation older than the current ten-minute fixture threshold. |
| `?scenario=offline` | Simulated last-known position and track with connection state and freshness both `offline`. |
| `?scenario=unavailable` | No configured source, no receipt time, position, or track. |
| `?scenario=empty` | Connected simulated source that has supplied no usable position or track. |
| `?scenario=error` | Deliberate `503` response for UI error handling. This value is not part of the snapshot `scenario` union. |

Fixture coordinates, expedition details, timestamps, fix metrics, and tracks are
invented demonstration data. They must not be used for operational decisions.

## Client inputs required to complete the live integration

The following evidence is required before implementing or approving a live
adapter:

- the exact QGPS product/project name, owner/vendor, canonical repository or
  distribution location, and pinned version/commit;
- the license or commercial agreement, including server use, modification,
  redistribution, attribution, and production-deployment constraints;
- authoritative protocol documentation and version: transport, message framing,
  schemas, endpoints/ports, authentication, encryption, reconnect behaviour,
  rate limits, and error codes;
- a representative sanitized capture or sample payload for every supported
  message/fix type, including malformed, partial, no-fix, stale, and disconnected
  examples;
- the supported fields and their exact semantics: units, coordinate datum,
  vertical reference, timestamp origin/timezone, accuracy/confidence meaning,
  satellite meaning, fix types, track ordering, and device/team identifiers;
- expected update cadence, retention/history limits, and client-approved
  thresholds for current, stale, offline, and unavailable states;
- the network topology and ownership boundary between the QGPS source and the
  Catalyst backend, including staging connectivity and credentials supplied by
  an authorized owner;
- privacy, consent, access-control, logging, and retention requirements for team
  location data; and
- named client and backend owners who can approve the source mapping and execute
  an end-to-end live acceptance test.

Credentials and private captures must be delivered through an approved secret or
secure file-sharing channel, never committed to this repository.

## Completion gates

The following is the honest QGPS-specific Milestone 1 record. Checked items prove
only the fixture boundary, not a completed live integration.

- [x] The browser has a same-origin Catalyst QGPS route and does not require a
  direct QGPS connection.
- [x] A versioned normalized DTO exists for frontend development.
- [x] The local fallback identifies itself as `mode: "simulated"` and exposes
  current, stale, offline, unavailable, empty, and error test conditions.
- [x] A configured but failing backend is surfaced as an error rather than being
  silently replaced with believable fixture data.
- [ ] The exact QGPS project/product and owner are verified.
- [ ] The canonical repository/distribution, pinned version, and license are
  verified and approved.
- [ ] The protocol, authentication, supported data, units, datums, timestamp
  semantics, and update cadence are documented from authoritative material.
- [ ] The backend team has agreed to and implemented the normalized contract.
- [ ] A production backend adapter ingests the verified QGPS source without
  exposing source credentials or connectivity to the browser.
- [ ] Mapping and validation tests use representative source messages, including
  partial, malformed, no-fix, stale, offline, and unavailable cases.
- [ ] Access control, privacy, retention, audit logging, timeout, retry, and
  observability behaviour are approved and tested.
- [ ] An end-to-end test proves that a real QGPS observation travels through the
  Catalyst backend and renders with correct position, track, timestamps,
  accuracy/fix details, source, and state.
- [ ] A client/backend owner has accepted the live integration and its documented
  limitations.

Until every unchecked gate that applies to live operation is complete, report the
QGPS portion of Milestone 1 as **partially complete — simulated only**. Do not
describe it as complete, connected to QGPS, production-ready, or live.
