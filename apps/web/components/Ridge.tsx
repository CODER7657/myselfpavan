"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, reducedMotion } from "@/lib/gsap";
import s from "./Ridge.module.css";

/**
 * The horizon.
 *
 * One plate, sized from its own aspect ratio so the summits are never cropped,
 * drifting a few percent against the page as it scrolls. The copy above it
 * moves considerably faster, and that difference is what reads as depth.
 */
export function Ridge({ variant = "hero" }: { variant?: "hero" | "footer" }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;

      gsap.fromTo(
        "." + s.layerWrap,
        { yPercent: variant === "hero" ? 0 : -3 },
        {
          yPercent: variant === "hero" ? -4 : 0,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.7,
          },
        }
      );
    },
    { scope: root, dependencies: [variant] }
  );

  return (
    <div ref={root} className={s.ridge} data-variant={variant} aria-hidden="true">
      <div className={s.layerWrap}>
        {/*
          Two pre-inked plates rather than one plate and a CSS invert() — the
          filter rasterised the image into its own layer and darkened the
          transparent sky against the page, which showed as a hard band.
          eslint-disable-next-line @next/next/no-img-element
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/ridge-plate.webp"
          alt=""
          className={`${s.plate} ${s.plateLight}`}
          loading={variant === "hero" ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={variant === "hero" ? "high" : "low"}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/ridge-plate-dark.webp"
          alt=""
          className={`${s.plate} ${s.plateDark}`}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className={s.veil} />
    </div>
  );
}
