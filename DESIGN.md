---
version: alpha
name: Catalyst — Alpine Signal
description: Cinematic black-and-orange design system for the Catalyst expedition operations website and command interface.
colors:
  primary: "#F36C2A"
  canvas: "#08090A"
  canvas-alternate: "#0B0C0E"
  surface: "#101214"
  surface-raised: "#171A1D"
  surface-active: "#202429"
  border: "#2C3035"
  border-strong: "#464C53"
  text: "#F5F2EA"
  text-secondary: "#C2C5C8"
  text-muted: "#969CA2"
  action: "#F36C2A"
  action-hover: "#FF8145"
  action-active: "#D9571F"
  on-action: "#160B06"
  focus: "#FFA06F"
  information: "#63C7E8"
  success: "#70D6A3"
  warning: "#F3B84B"
  critical: "#FF6B63"
  unknown: "#A8AEB5"
  snow: "#EFF6FA"
typography:
  display:
    fontFamily: Outfit Variable
    fontSize: "128px"
    lineHeight: "0.88"
    fontWeight: "800"
    letterSpacing: "-0.04em"
  heading:
    fontFamily: Outfit Variable
    fontSize: "80px"
    lineHeight: "0.95"
    fontWeight: "750"
    letterSpacing: "-0.03em"
  body:
    fontFamily: Geist Variable
    fontSize: "1rem"
    lineHeight: "1.6"
    fontWeight: "400"
  label:
    fontFamily: Geist Variable
    fontSize: "0.8125rem"
    lineHeight: "1.3"
    fontWeight: "650"
    letterSpacing: "0.04em"
  data:
    fontFamily: Geist Mono Variable
    fontSize: "0.8125rem"
    lineHeight: "1.45"
    fontWeight: "500"
rounded:
  square: "0px"
  control: "4px"
  panel: "8px"
  round: "999px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
  5xl: "128px"
  6xl: "192px"
---

## Overview

Catalyst is an expedition operating system for leaders, guides, climbers, and operations teams. It is decision support, not a consumer hiking app and not an autonomous safety system. The experience has two related modes: an immersive public website that earns attention through terrain, weather, and human resolve; and a compact command interface that prioritizes maps, freshness, exceptions, and next actions.

The visual direction is **Alpine Signal**: a near-black field cut by signal orange, cold mineral neutrals, strong editorial type, documentary expedition imagery, contour-derived geometry, and measured motion. The supplied Bear Grylls reference informs the contrast, pacing, image-led storytelling, thin orange rules, and short oversized headlines. Do not copy its logo, slogans, page composition, brand assets, or trade dress.

This document is the visual source of truth. Product requirements and safety language in `docs/FRONTEND_HANDOFF.md` remain authoritative when aesthetics and operational clarity compete.

## Colors

Use the dark canvas as the only default theme. Alternate sections by surface level, not by introducing unrelated hues. Raised surfaces should remain visibly dark; depth comes from borders, image contrast, and controlled overlays rather than luminous cards.

Signal orange is scarce. Use it for the primary action, current selection, planned-route emphasis, short display-word highlights, and small framing details. It is not a general decoration color and must not cover entire dense sections. Use `on-action` for text and icons on orange; white text on orange is not an approved pair.

Status colors retain independent meaning. Information blue represents actual track or current informational data. Amber represents attention or stale data. Red represents a critical rule, error, or destructive action. Green confirms a completed action. Orange must never silently substitute for warning, critical, or success.

Color is never the only state cue. Pair every status color with a label and, where space permits, an icon or shape. Do not use opacity alone to create secondary text if the result falls below WCAG 2.2 AA contrast.

Photography should be naturally cool or lightly desaturated so orange reads as a signal. Apply a dark neutral wash for legible type; do not recolor documentary images into orange monochrome. Snow remains cool white and must not compete with text.

## Typography

Use Outfit for display and major editorial headings. Its wide, geometric construction differentiates Catalyst from the reference site's condensed headline face. Use Geist for interface labels and body copy, and Geist Mono only for coordinates, timestamps, distance, elevation, accuracy, weather values, IDs, and comparable numeric columns.

Marketing display copy is short, direct, and limited to 2–3 lines in a wide container. The homepage hero should target 2 lines and must never become a narrow 5–6 line text wall. Use balanced wrapping and reduce size before reducing the text measure. Keep supporting paragraphs near a comfortable reading measure rather than stretching them across the viewport.

Sentence case is the default. Uppercase is reserved for slogans of 5 words or fewer, compact navigation labels, and short operational tags. Do not set paragraphs, instructions, errors, or long headings in all caps. Use tabular numerals for operational data.

Maintain semantic heading order independently of visual size. Each page has one clear `h1`; do not skip heading levels to obtain a style. Heading anchors need enough scroll margin to clear sticky navigation.

## Layout

### Public website

Use a fluid 12-column grid with generous side gutters and a maximum editorial width around 1440px. Major chapters should feel distinct and cinematic, with approximately 128–192px of vertical separation on large screens and 80–112px on small screens. Section transitions may use full-bleed imagery, a hairline rule, or a change in surface level; avoid placing every section inside a rounded card.

Public pages follow a flexible AIDA narrative:

1. Navigation establishes the brand and one primary route.
2. Attention uses a cinematic hero with a short promise and no more than 2 high-contrast actions.
3. Interest shows the product through maps, route context, field imagery, and a small number of structured modules.
4. Desire uses one controlled scroll story to connect plan, publish, track, reconnect, and review.
5. Action ends with one clear pilot or demo invitation and a quiet, useful footer.

The default homepage hero architecture is cinematic center: a full-bleed expedition image, a strong radial dark wash, an ultra-wide headline, and exactly 2 actions. Do not add floating stamps, pill-tag clusters, or raw statistics to the hero. Keep the header readable before imagery and atmospheric effects load.

Asymmetry should come from image crops, rules, notched frames, and uneven column spans rather than random offsets. A repeated left-copy/right-image rhythm is not a system; vary composition while maintaining a clear reading order.

When a bento composition is useful, use 3–5 intentional modules and `grid-auto-flow: dense`. The approved desktop pattern fills a 12-column by 3-row matrix exactly: one 7×2 lead story, two 5×1 supporting stories, and one 12×1 closing strip. That occupies all 36 cells with no empty corner. Collapse it into a single reading-order column on mobile.

### Command interface

The dashboard is denser and task-first: stable navigation, compact status bar, dominant map, and contextual details. Map and operational exceptions receive the greatest visual weight. Do not import oversized marketing typography, decorative snow, marquees, scroll pinning, or full-bleed photography into authenticated operational screens.

On narrower screens, stack or tab the map and inspector rather than squeezing both into thin columns. Preserve the current task, selected feature, and data-freshness context across layout changes. URL state should represent tabs, filters, expanded details, and selected map features when those states need to be shared or revisited.

### Responsive behavior

Design mobile-first and verify at 320, 390, 768, 1024, 1440, and 1920px. Public navigation becomes an accessible drawer below tablet width. Full-bleed sections account for safe-area insets. No layout, marquee, canvas, pinned section, or off-screen transform may create document-level horizontal scrolling.

## Elevation & Depth

Use flat, layered blacks with thin borders as the primary depth model. Raised controls may add one restrained shadow, but shadows must not replace boundaries or make the interface look glassy. Avoid backdrop blur over operational data.

Ambient backgrounds may use a low-contrast radial wash, faint grain, or topographic contour lines. These layers stay behind content, carry no meaning, and disappear when they reduce legibility or rendering performance. Do not use neon bloom, glowing HUD frames, generic purple gradients, or large blurred color orbs.

Imagery provides most of the visual depth. Use foreground-to-background tonal separation, deliberate focal points, and dark edge washes. Reserve orange corner brackets for a featured media frame; repeating them on every card turns the signal into decoration.

## Shapes

Catalyst geometry is precise and rugged rather than soft. Controls use a small radius, panels use a restrained radius, and badges may be fully rounded only when the shape communicates a compact status. Avoid oversized rounded containers and pill-shaped buttons everywhere.

Use clipped or notched corners sparingly on primary CTAs, featured media frames, and selected navigation. Use diagonal route strokes, contour fragments, and fine horizontal rules to connect the visual language to terrain without drawing literal mountains around every element.

Icons come from one consistent SVG family such as Lucide. Decorative icons are hidden from assistive technology; icon-only controls have accessible names. Do not use emoji as interface icons.

## Components

### Navigation

Public navigation is minimal and high-contrast, with the Catalyst mark, 4–6 primary destinations, and one primary action. It may float over the hero only when the background wash guarantees readability. The command interface uses stable side navigation and a compact top status area. Current location must be clear without relying on orange alone.

### Buttons and links

Primary buttons use signal orange with `on-action` text. Secondary buttons use a transparent dark surface, strong text, and a visible border. Tertiary actions appear as text links with an arrow or underline response. Actions use `button`; navigation uses `Link` or an anchor. Labels describe the outcome, such as “Request a Pilot” or “Open the Demo,” rather than “Continue.”

All interactive targets are at least 44×44px where applicable and expose hover, active, disabled, loading, and focus-visible states. Never use `transition: all`. Disabled styles must remain readable and must not be the only way an explanation is conveyed.

### Editorial media

Use licensed documentary imagery of real expedition contexts, equipment, terrain, weather, and operations. Crop confidently and reserve layout space before media loads. Above-the-fold media is prioritized; below-the-fold media is lazy-loaded. Every meaningful image has specific alt text, while purely atmospheric media uses an empty alternative.

Inline typography images are allowed only in one major marketing statement per page and must not interrupt the accessible reading order. Horizontal accordions may present platform capabilities on pointer-capable desktop layouts; provide a vertical disclosure or stacked alternative for touch and keyboard users. Do not create testimonials, client logos, performance claims, or field results without approved evidence.

### Cards and panels

Marketing cards are image-led and sparse, with one clear action and no nested card-on-card treatment. Operational panels prioritize title, freshness, source, primary value, exception, and next action. Do not create dashboards from equal-sized generic cards.

Clickable cards react as a whole, but their accessible name must remain specific. Hover may slightly scale the internal image while the card boundary stays stable. Touch and keyboard users receive equivalent feedback and access.

### Forms and feedback

Inputs use persistent visible labels, meaningful names, correct input types, autocomplete, and inline helper or error text. Focus the first invalid field after submission and announce asynchronous feedback politely. Never block paste. Preserve user input after recoverable errors and warn before abandoning unsaved work.

Loading, empty, simulated, stale, disconnected, degraded, unavailable, error, and success states are first-class component states. Preserve last-known operational data after refresh failure and label its timestamp and freshness clearly.

### Map and operational data

The planned route uses signal orange with a dark outline. The actual track uses information blue. Camps use outlined squares with labels; waypoints use diamonds; team members use directional markers with initials and accuracy circles; stale positions use muted markers with dashed rings and a visible age; hazards use a critical outline with a translucent pattern.

Always show layer controls, legend, source, timestamp, attribution, and accuracy or confidence when available. Provide a textual list or inspector for important map information. Never imply greater accuracy than the source provides.

## Motion & Atmosphere

Motion explains hierarchy, confirms action, guides attention, or preserves continuity. If it does none of those, remove it. Use one strong hero moment and no more than 1–2 animated focal elements in a viewport.

The motion token set is:

- `motion-instant`: 120ms for press feedback.
- `motion-fast`: 180ms for hover, focus, and small state changes.
- `motion-base`: 260ms for toggles, tabs, and compact overlays.
- `motion-slow`: 600ms for section entrances and image reveals.
- `motion-hero`: 1200ms for the initial hero sequence.
- `ease-enter`: `cubic-bezier(0.22, 1, 0.36, 1)`.
- `ease-exit`: `cubic-bezier(0.4, 0, 1, 1)` and shorter than entry.

Animate transforms and opacity. Avoid layout animation of width, height, top, and left. Motion must be interruptible, scoped to its component, and cleaned up on unmount.

For the public narrative, the approved advanced patterns are a scrubbed text reveal and a 3–4 card stack. Apply them to one story chapter, not the entire page. Pinned or scrubbed behavior is desktop-only, keeps native scrolling, and has a fully visible linear mobile fallback. Do not use scroll-jacking, forced horizontal scrolling, or simultaneous competing parallax layers.

Use GSAP only for choreographed marketing sequences. In Next.js, isolate it in client components, use `@gsap/react`, scope selectors, register plugins once, use responsive match media, and revert all contexts on teardown. CSS transitions handle ordinary buttons, links, focus, and simple hover.

### Animated snow

Snow is a signature atmospheric layer, not a global effect. It may appear inside the homepage hero and at most one later full-bleed expedition chapter. Never render snow over navigation menus, forms, maps, data tables, dialogs, or command screens.

Implement snow as one pointer-transparent, assistive-technology-hidden canvas or similarly batched layer bounded to its section. Do not create dozens of animated DOM nodes. Clamp pixel density, pause when the section or document is not visible, and keep the particle field sparse enough that headline contrast is unchanged. The direction should feel wind-driven and irregular rather than like confetti.

The home hero's decorative snow may run continuously without an exposed control for users who allow motion. Suspend the loop whenever the hero is offscreen or the browser tab is hidden, resume it automatically when visible, and do not initialize it under `prefers-reduced-motion`. Under reduced motion, also skip pinning, scrubbing, parallax, and card stacking; render the final content state and a still atmospheric image instead.

## Content & Data Integrity

Use active, specific language. Prefer “Latest Position Received 12 Minutes Ago,” “Position Accuracy ±24 m,” and “Forecast Source Updated 3 Hours Ago.” Use typographic ellipses in loading labels and format dates, times, numbers, and units with locale-aware APIs.

Never claim `SAFE`, `UNSAFE`, “All Clear,” “Safe to Proceed,” “AI-Powered Safety,” or “Real-Time Precision” without substantiated meaning. Alerts are advisory and must explain the triggering rule. Missing weather variables remain missing, not zero.

Never invent customers, testimonials, live feeds, device support, field outcomes, accuracy claims, or integration status. Fixtures and demos display `SIMULATED`. Unknown freshness must never be labeled `LIVE`.

## Accessibility & Quality Gates

Target WCAG 2.2 AA. Normal text meets at least 4.5:1 contrast. Keyboard focus is always visible and is not covered by sticky layers. Include a skip link, semantic landmarks, logical headings, keyboard-operable dialogs, focus trapping and restoration, and tap or keyboard alternatives for every gesture.

Set the document to a dark color scheme and align the browser theme color with the canvas. Do not disable zoom. Full-bleed layouts respect safe areas. Modals and drawers contain overscroll. Meaningful media needs captions, transcripts, or descriptions where appropriate.

Reserve image and media dimensions to prevent layout shift. Use optimized responsive formats and constrain remote image sources. Keep large lists virtualized or use content visibility. Client-side animation islands must not force the whole page into client rendering.

Server-rendered dates and times must not introduce hydration mismatches; format them with locale-aware APIs and use hydration suppression only when the mismatch is intentional and isolated. Native selects explicitly set dark-theme background and text colors. Touch controls use intentional tap feedback, and gesture interactions always keep a click and keyboard path.

Before declaring a surface complete, verify keyboard flow, focus visibility, loading and failure states, long and empty content, reduced motion, offscreen animation suspension, desktop and mobile layouts, and the absence of horizontal overflow. Use Playwright for browser-visible implementation checks.

## Do's and Don'ts

Do:

- Make terrain, maps, weather, and operational context the visual material.
- Use short, wide editorial headlines with decisive image crops.
- Keep orange rare enough that it always signals importance.
- Use asymmetry with a clear grid and reading order.
- Show source, timestamp, freshness, and uncertainty for operational data.
- Build reusable primitives and semantic tokens before page-specific styling.

Don't:

- Copy Bear Grylls branding, slogans, page layouts, or assets.
- Use glassmorphism, neon HUDs, purple gradients, fake terminals, or glowing globes.
- Fill pages with rounded cards, chips, badges, and decorative labels such as “SECTION 01.”
- Put atmospheric motion inside operational work or let motion obscure content.
- Use raw color values inside components; consume semantic tokens.
- Start a testimonial carousel unless the content is verified and approved.
- Treat a simulated or stale source as live.

## Definition of Done

- [ ] Uses the Alpine Signal tokens, typography, geometry, and dual-density rules.
- [ ] Public storytelling follows the cinematic hierarchy without copying the reference brand.
- [ ] Command views stay map-led, compact, and free of decorative atmosphere.
- [ ] Orange is reserved for action and selection; status colors retain their meanings.
- [ ] Loading, empty, simulated, stale, disconnected, degraded, unavailable, error, and success states exist.
- [ ] Real and simulated data are clearly distinguished.
- [ ] Keyboard, focus, contrast, semantic structure, offscreen animation suspension, and reduced motion are verified.
- [ ] Layouts are checked at 320, 390, 768, 1024, 1440, and 1920px.
- [ ] No document-level horizontal scrolling or unbounded animation work appears.
- [ ] No unsupported safety, QGIS, Garmin, customer, or field-performance claims appear.
