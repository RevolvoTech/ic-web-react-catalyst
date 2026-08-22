# Catalyst Design Guide

This is the visual source of truth for the Catalyst web application. Read it
before building any page or component.

## Product character

Catalyst is an expedition operations platform, not a consumer hiking app. It
should feel like a calm, modern command centre: map-first, precise, trustworthy,
and readable for long periods.

The interface should highlight exceptions and data freshness without pretending
to make safety decisions. Never use language such as `SAFE`, `UNSAFE`, or
`safe to proceed`.

## Design direction

- Dark terrain-inspired canvas with flat, structured panels.
- One restrained high-visibility lime accent for primary actions and selection.
- Thin borders, compact spacing, clear type hierarchy, and purposeful status
  colors.
- Maps, routes, elevation profiles, weather, and operational data provide the
  visual interest.
- Avoid purple gradients, glassmorphism, glowing HUD frames, decorative globes,
  oversized rounded cards, fake terminals, and generic AI-generated visuals.

The design document was used only as a quality reference for disciplined
tokens, flat surfaces, truthful content, and restrained motion. Google Stitch's
internal control-room reference informed the compact information hierarchy.
21st.dev map/sidebar examples informed component composition. Catalyst retains
its own visual identity.

## Color tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#07100f` | Page and app background |
| Canvas alternate | `#091411` | Alternate sections |
| Surface | `#0d1916` | Panels and cards |
| Surface raised | `#13221e` | Drawers and selected areas |
| Border | `#283934` | Dividers and boundaries |
| Text | `#f1f7f4` | Primary text |
| Secondary text | `#b3c0bc` | Body and supporting text |
| Muted text | `#82908c` | Metadata only |
| Accent | `#d7ef72` | Primary action and active selection |
| On accent | `#111608` | Text on accent |
| Information | `#66c7e6` | Current/informational data |
| Success | `#65d19e` | Confirmed successful action |
| Warning | `#f0b84d` | Attention and stale data |
| Critical | `#ef726b` | Critical rule, error, destructive action |
| Unknown | `#9aa8a4` | Unknown or unavailable state |

Use semantic tokens in code. Do not scatter raw color values through
components. Color must never be the only indicator of status.

## Typography

- Primary: Geist Sans.
- Data and metadata: Geist Mono.
- Use sentence case.
- Marketing hero: large but controlled, with a maximum of two short lines.
- Application titles: 24–32px.
- Panel titles: 16–18px.
- Body: 14–16px with comfortable line height.
- Use tabular numerals for coordinates, time, distance, elevation, and weather.
- Do not use tiny text for meaningful status or instructions.

## Layout

### Public website

- Maximum content width around 1200px.
- Strong left alignment and generous hero spacing.
- Responsive navigation becomes an accessible drawer below tablet width.
- The map/product preview should carry more visual weight than generic cards.

### Command dashboard

- Stable left navigation, compact top status bar, large central map, and a
  contextual side panel.
- Map and operational exceptions are the priority.
- Avoid a dashboard made entirely from equal-sized cards.
- On smaller screens, stack or tab the map and details instead of squeezing
  both into unusable columns.

## Milestone 1 pages

- `/` — product website and value proposition.
- `/platform` — plan, publish, track, reconnect, and review workflow.
- `/integrations/qgps` — QGPS connection, source, status, and limitations.
- `/demo` — read-only command-centre demonstration.

Homepage order:

1. Clear product promise and primary CTA.
2. Map-led operational preview.
3. Route + terrain + weather + time + team explanation.
4. QGPS integration proof with current connection state.
5. Plan → publish → track → reconnect → review workflow.
6. Decision-support boundary.
7. Later roadmap and pilot CTA.

Never invent customers, field results, accuracy claims, testimonials, or live
data. Simulated data must always display `SIMULATED`.

## Map rules

- Planned route: lime line with dark outline.
- Actual track: information blue.
- Camp: outlined square with label.
- Waypoint: diamond marker.
- Team member: directional marker with initials and accuracy circle.
- Stale position: muted marker, dashed ring, and visible age.
- Hazard: critical outline plus translucent patterned fill.
- Always show layer controls, legend, data source, timestamp, and attribution.
- Never imply more positional accuracy than the source provides.
- Provide a textual list/inspector for important information shown on the map.

## Components

Build and reuse a small shared component set:

- Buttons, fields, selects, dialogs, drawers, tooltips, and tabs.
- Panels, page headers, navigation, and app shell.
- Status, freshness, source, and severity badges.
- Loading, empty, disconnected, degraded, stale, error, and success states.
- Map, legend, layer control, feature inspector, and event list.

Use one consistent SVG icon family such as Lucide. Do not use emoji as UI
icons. Use accessible headless primitives where useful, but apply Catalyst's
tokens rather than library-default styling.

## Interaction and motion

- Controls must be at least 44px high/tall where applicable.
- Every action needs loading and success/error feedback.
- Preserve last-known data during refresh failure and clearly label it stale.
- Motion should explain selection, entry, or state change.
- Keep micro-interactions around 150–250ms.
- No ambient movement, autoplay carousel, pulsing background, or decorative
  animation.
- Respect `prefers-reduced-motion`.

## Accessibility and responsive QA

- Target WCAG 2.2 AA.
- Maintain at least 4.5:1 contrast for normal text.
- All controls must work with keyboard and visible focus.
- Dialogs trap and restore focus.
- Forms use persistent labels and inline errors.
- Status uses text/icon/shape as well as color.
- Verify at 320, 390, 768, 1024, 1440, and 1920px.
- No document-level horizontal scrolling.
- Verify important desktop and mobile flows with Playwright.

## Content language

Good:

- `Latest position received 12 minutes ago`
- `Position accuracy ±24 m`
- `Attention — forecast source is 3 hours old`
- `QGPS disconnected; showing last received position`

Avoid:

- `Live` when freshness is unknown.
- `All clear` or `Safe to proceed`.
- `AI-powered safety`.
- `Real-time precision` without evidence.

## Design definition of done

- [ ] Follows the Catalyst tokens and layout rules.
- [ ] Real and simulated data are clearly distinguished.
- [ ] Loading, empty, stale, disconnected, degraded, and error states exist.
- [ ] Keyboard, focus, contrast, and reduced motion are verified.
- [ ] Desktop and mobile layouts are checked with Playwright.
- [ ] No unsupported safety, QGPS, Garmin, or field-performance claims appear.

