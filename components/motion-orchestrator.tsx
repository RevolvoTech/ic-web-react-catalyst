"use client";

import { animate } from "motion/mini";
import { useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const easeEnter = [0.22, 1, 0.36, 1] as const;

interface RevealRule {
  trigger: string;
  targets?: string;
  amount?: number;
  cascade?: number;
  distance?: number;
  duration?: number;
  stagger?: number;
}

const revealRules: RevealRule[] = [
  // Home
  {
    trigger: ".signal-rail",
    targets: ".signal-rail__inner > span",
    distance: 8,
    duration: 0.45,
    stagger: 0.055,
    amount: 0.35,
  },
  {
    trigger: ".chapter__copy",
    targets: ":scope > *",
    distance: 16,
    stagger: 0.07,
  },
  { trigger: ".feature-media", distance: 18, duration: 0.72 },
  { trigger: ".workflow-section .section-heading", targets: ":scope > *" },
  {
    trigger: ".workflow-list > li",
    cascade: 0.055,
    distance: 16,
  },
  { trigger: ".command-preview__intro", targets: ":scope > *" },
  { trigger: ".command-frame__topbar", distance: 10, duration: 0.48 },
  { trigger: ".command-frame__map", amount: 0.1, distance: 18, duration: 0.76 },
  { trigger: ".command-frame__inspector", amount: 0.1, distance: 18, duration: 0.7 },
  {
    trigger: ".capability-band > article",
    cascade: 0.065,
    distance: 16,
  },
  {
    trigger: ".closing-image-cta__content",
    targets: ":scope > *",
    amount: 0.22,
    stagger: 0.07,
  },
  {
    trigger: ".closing-image-cta__image",
    amount: 0.15,
    distance: 0,
    duration: 0.85,
  },

  // Platform
  { trigger: ".dual-environment > .section-heading", targets: ":scope > *" },
  {
    trigger: ".environment-split > .environment-panel",
    cascade: 0.075,
    distance: 18,
  },
  { trigger: ".lifecycle-section .section-heading", targets: ":scope > *" },
  {
    trigger: ".lifecycle-list > li",
    cascade: 0.055,
    distance: 16,
  },
  {
    trigger: ".platform-matrix > article",
    cascade: 0.055,
    distance: 16,
  },
  { trigger: ".state-integrity__grid > div:first-child", targets: ":scope > *" },
  {
    trigger: ".state-stack > div",
    cascade: 0.045,
    distance: 12,
    duration: 0.5,
  },
  { trigger: ".scope-section > div:first-child", targets: ":scope > *" },
  {
    trigger: ".scope-columns > div",
    cascade: 0.06,
    distance: 14,
  },

  // QGPS integration
  {
    trigger: ".integration-status > div",
    cascade: 0.075,
    distance: 18,
  },
  { trigger: ".architecture-section .section-heading", targets: ":scope > *" },
  {
    trigger: ".architecture-flow > li",
    cascade: 0.075,
    distance: 18,
  },
  {
    trigger: ".architecture-flow > .architecture-flow__arrow",
    cascade: 0.055,
    distance: 0,
    duration: 0.42,
  },
  { trigger: ".source-register__heading", targets: ":scope > *" },
  {
    trigger: ".source-register__list > div",
    cascade: 0.045,
    distance: 14,
  },
  { trigger: ".normalized-contract__grid > div:first-child", targets: ":scope > *" },
  {
    trigger: ".contract-fields > div",
    cascade: 0.045,
    distance: 14,
  },
  { trigger: ".state-semantics > .section-heading", targets: ":scope > *" },
  {
    trigger: ".state-semantics__grid > article",
    cascade: 0.055,
    distance: 16,
  },
  { trigger: ".confirmation-list > div:first-child", targets: ":scope > *" },
  {
    trigger: ".confirmation-list > ol > li",
    cascade: 0.045,
    distance: 14,
  },
  { trigger: ".simple-cta", targets: ":scope > *", stagger: 0.07 },

  // Interactive demo
  { trigger: ".demo-intro", targets: ":scope > *", distance: 18, amount: 0.05 },
  { trigger: ".scenario-section__heading", targets: ":scope > *" },
  {
    trigger: ".scenario-switcher > button",
    cascade: 0.04,
    distance: 10,
    duration: 0.46,
  },
  { trigger: ".operations-console__header", distance: 10, duration: 0.48 },
  {
    trigger: ".operations-console__workspace > .qgps-map",
    amount: 0.1,
    distance: 18,
    duration: 0.76,
  },
  {
    trigger: ".operations-console__workspace > .position-inspector",
    amount: 0.1,
    distance: 18,
    duration: 0.7,
  },
  {
    trigger: ".operations-console__footer",
    targets: ":scope > span",
    amount: 0.2,
    distance: 8,
    stagger: 0.045,
  },
  { trigger: ".track-section__intro", targets: ":scope > *" },
  {
    trigger: ".track-list > div",
    cascade: 0.045,
    distance: 14,
  },
  { trigger: ".demo-disclosure", targets: ":scope > *", distance: 14 },

  // Shared footer and fallback page
  {
    trigger: ".site-footer__grid > *",
    cascade: 0.055,
    distance: 16,
  },
  { trigger: ".site-footer__base", targets: ":scope > span", distance: 8, stagger: 0.05 },
  { trigger: ".error-page", targets: ":scope > *", distance: 14, stagger: 0.065 },
];

function clearRevealStyles() {
  document.querySelectorAll<HTMLElement>("[data-motion-reveal]").forEach((element) => {
    element.style.removeProperty("opacity");
    element.style.removeProperty("transform");
    element.style.removeProperty("will-change");
    element.removeAttribute("data-motion-reveal");
  });
}

export function MotionOrchestrator() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    clearRevealStyles();

    if (reduceMotion) return;

    const observers: IntersectionObserver[] = [];
    const animations: Array<{ cancel: () => void }> = [];
    const observedTriggers = revealRules.map(() => new WeakSet<HTMLElement>());
    const mutationObserver = new MutationObserver(() => scanForTriggers());

    const registerTrigger = (rule: RevealRule, trigger: HTMLElement, triggerIndex: number) => {
      const targets = rule.targets
        ? Array.from(trigger.querySelectorAll<HTMLElement>(rule.targets))
        : [trigger];

      if (!targets.length) return;

      const distance = rule.distance ?? 16;
      const usesTransform = distance !== 0;
      const setPendingState = () =>
        targets.forEach((target) => {
          target.dataset.motionReveal = "pending";
          target.style.opacity = "0";
          if (usesTransform) {
            target.style.transform = `translate3d(0, ${distance}px, 0)`;
          }
          target.style.willChange = usesTransform ? "opacity, transform" : "opacity";
        });
      const amount = rule.amount ?? 0.14;
      const bounds = trigger.getBoundingClientRect();
      const intersectionWidth = Math.max(
        0,
        Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0),
      );
      const intersectionHeight = Math.max(
        0,
        Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0),
      );
      const triggerArea = bounds.width * bounds.height;
      let isInView =
        triggerArea > 0 &&
        (intersectionWidth * intersectionHeight) / triggerArea >= amount;
      let currentAnimations: Array<{ cancel: () => void }> = [];

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;

          const isVisibleEnough = entry.isIntersecting && entry.intersectionRatio >= amount;

          if (isVisibleEnough && !isInView) {
            isInView = true;
            currentAnimations.forEach((animation) => animation.cancel());
            setPendingState();
            currentAnimations = targets.map((target, index) => {
              const keyframes = usesTransform
                ? {
                    opacity: [0, 1],
                    transform: [target.style.transform, "translate3d(0, 0, 0)"],
                  }
                : { opacity: [0, 1] };
              const control = animate(target, keyframes, {
                duration: rule.duration ?? 0.58,
                delay:
                  triggerIndex * (rule.cascade ?? 0) + index * (rule.stagger ?? 0.065),
                ease: easeEnter,
                onComplete: () => {
                  target.style.removeProperty("opacity");
                  if (usesTransform) target.style.removeProperty("transform");
                  target.style.removeProperty("will-change");
                  target.dataset.motionReveal = "complete";
                },
              });
              animations.push(control);
              return control;
            });
          } else if (!entry.isIntersecting && isInView) {
            isInView = false;
            currentAnimations.forEach((animation) => animation.cancel());
            currentAnimations = [];
            setPendingState();
          }
        },
        { threshold: [0, amount] },
      );

      observer.observe(trigger);
      observers.push(observer);
    };

    const scanForTriggers = () => {
      revealRules.forEach((rule, ruleIndex) => {
        document.querySelectorAll<HTMLElement>(rule.trigger).forEach((trigger, triggerIndex) => {
          if (observedTriggers[ruleIndex].has(trigger)) return;
          observedTriggers[ruleIndex].add(trigger);
          registerTrigger(rule, trigger, triggerIndex);
        });
      });
    };

    scanForTriggers();
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observers.forEach((observer) => observer.disconnect());
      animations.forEach((animation) => animation.cancel());
      clearRevealStyles();
    };
  }, [pathname, reduceMotion]);

  return null;
}
