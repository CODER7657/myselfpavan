"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP and its scroll plugin.
 *
 * Also owns the refresh policy. ScrollTrigger measures every trigger's start
 * position once, at creation — so anything that changes the document height
 * afterwards (a webfont swapping in, the ridge plate decoding, the live GitHub
 * table filling out) leaves those measurements stale and reveals can fail to
 * fire. Refreshing on those events is what keeps content from being stranded
 * at its `from` state.
 */
let registered = false;

if (typeof window !== "undefined" && !registered) {
  gsap.registerPlugin(ScrollTrigger);
  registered = true;

  ScrollTrigger.config({ ignoreMobileResize: true });

  const refresh = () => ScrollTrigger.refresh();

  window.addEventListener("load", refresh);
  if ("fonts" in document) document.fonts.ready.then(refresh).catch(() => {});

  // Late-loading imagery is the most common source of a stale measurement.
  window.addEventListener(
    "load",
    () => {
      for (const img of Array.from(document.images)) {
        if (!img.complete) img.addEventListener("load", refresh, { once: true });
      }
    },
    { once: true }
  );

  // Exposed for debugging in the browser console; harmless in production.
  (window as unknown as Record<string, unknown>).ScrollTrigger = ScrollTrigger;
  (window as unknown as Record<string, unknown>).gsap = gsap;
}

/** Honour the OS setting — parallax is orientation, not decoration. */
export const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Standard scroll-in reveal.
 *
 * Uses `fromTo` rather than `from` deliberately: if a trigger ever fails to
 * fire, `from` leaves the element invisible forever, whereas the explicit end
 * state here can be forced. `onRefresh` re-checks whether the section is
 * already above the fold and, if so, plays immediately — so a deep link or a
 * restored scroll position never lands on a blank section.
 */
export function reveal(
  targets: gsap.TweenTarget,
  trigger: Element | null,
  vars: gsap.TweenVars = {}
): gsap.core.Tween | null {
  if (reducedMotion() || !trigger) return null;

  const { y = 24, duration = 0.6, stagger = 0.06, start = "top 88%", ...rest } = vars as
    & gsap.TweenVars
    & { start?: string };

  return gsap.fromTo(
    targets,
    { y, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration,
      stagger,
      ease: "power3.out",
      overwrite: "auto",
      ...rest,
      scrollTrigger: {
        trigger,
        start,
        once: true,
        invalidateOnRefresh: true,

        /*
         * The rescue this file has always claimed to have, and did not.
         *
         * A trigger measures its start once. Anything that changes the page
         * height afterwards — a webfont, the ridge plate decoding, the live
         * GitHub table filling in, the loading screen handing over — moves the
         * section without moving the trigger, and a `once` trigger that is
         * refreshed into a position already behind the reader never fires.
         * The tween holds its from-state, which is opacity 0, and the block is
         * simply invisible for the rest of the visit.
         *
         * Caught in the wild on the log section: start 8861 against a viewport
         * bottom of 9460 — scrolled well past — with the animation still at
         * progress 0.
         *
         * Half a viewport is the test rather than the very edge: at the top of
         * the page a first section whose start sits just inside the fold must
         * still animate rather than snap.
         */
        onRefresh: (self) => {
          const strandedBehind = self.start < window.scrollY + window.innerHeight * 0.5;
          if (strandedBehind && self.animation && self.animation.progress() === 0) {
            self.animation.progress(1);
          }
        },
      },
    }
  );
}

export { gsap, ScrollTrigger };
