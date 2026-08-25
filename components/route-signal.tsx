"use client";

import { m, useReducedMotion } from "motion/react";

export function RouteSignal() {
  const reduceMotion = useReducedMotion();
  const pathInitial = reduceMotion ? false : { pathLength: 0, opacity: 0 };
  const pointInitial = reduceMotion ? false : { opacity: 0 };

  return (
    <svg
      className="route-signal"
      viewBox="0 0 800 520"
      role="img"
      aria-labelledby="route-signal-title route-signal-description"
    >
      <title id="route-signal-title">Simulated expedition route overview</title>
      <desc id="route-signal-description">
        A planned orange route, a blue recorded track, three camps, and one latest team position.
      </desc>
      <m.g
        className="route-signal__contours"
        aria-hidden="true"
        initial={reduceMotion ? false : { opacity: 0.08 }}
        whileInView={{ opacity: 0.48 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <path d="M-60 395c150-170 262-178 382-72s237 113 390-58 255-57 279 0" />
        <path d="M-55 425c158-168 274-173 394-70s228 109 385-50 249-50 273 4" />
        <path d="M-40 460c164-160 280-167 398-65s218 99 376-43 241-42 269 11" />
        <path d="M72 188c74-76 164-83 236-22s163 66 248-29 181-93 263-28" />
        <path d="M108 206c66-58 138-60 202-10s150 52 223-28 166-78 239-24" />
      </m.g>
      <m.path
        className="route-signal__planned-outline"
        d="M105 434C190 390 214 348 277 324s96-76 144-132 115-30 168-83 82-47 126-35"
        initial={pathInitial}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
      />
      <m.path
        className="route-signal__planned"
        d="M105 434C190 390 214 348 277 324s96-76 144-132 115-30 168-83 82-47 126-35"
        initial={pathInitial}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
      />
      <m.path
        className="route-signal__actual"
        d="M105 434c82-48 104-84 168-106s87-73 136-120 93-37 139-70"
        initial={pathInitial}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 0.95, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
      />
      <g className="route-signal__camp" transform="translate(105 434)">
        <rect x="-8" y="-8" width="16" height="16" />
        <text x="18" y="5">C1</text>
      </g>
      <g className="route-signal__camp" transform="translate(421 192)">
        <rect x="-8" y="-8" width="16" height="16" />
        <text x="18" y="5">C2</text>
      </g>
      <g className="route-signal__camp" transform="translate(715 74)">
        <rect x="-8" y="-8" width="16" height="16" />
        <text x="-36" y="-14">C3</text>
      </g>
      <m.g
        className="route-signal__position"
        transform="translate(548 138)"
        initial={pointInitial}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <circle className="route-signal__accuracy" r="24" />
        <circle r="8" />
      </m.g>
    </svg>
  );
}
