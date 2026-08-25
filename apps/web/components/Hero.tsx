"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { profile, projects } from "@foundry/content";
import { gsap, reducedMotion } from "@/lib/gsap";
import { Ridge } from "./Ridge";
import s from "./Hero.module.css";

/** Kept as whole words — GSAP lifts each one, so splitting mid-word reads as a typo. */
const TITLE = ["DETERMINISTIC", "BY", "DESIGN"];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });

      tl.from("." + s.eyebrow, { y: 14, opacity: 0, duration: 0.6 })
        .from(
          "." + s.word,
          { yPercent: 118, opacity: 0, duration: 0.9, stagger: 0.07 },
          "-=0.35"
        )
        .from("." + s.pitch, { y: 18, opacity: 0, duration: 0.7 }, "-=0.5")
        .from("." + s.meta, { y: 12, opacity: 0, duration: 0.6 }, "-=0.45")
        .from("." + s.cta + " > *", { y: 12, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=0.4")
        .from("." + s.margin, { opacity: 0, duration: 0.8 }, "-=0.6")
        .from("." + s.scrollCue, { opacity: 0, duration: 0.8 }, "-=0.5");

      // The copy drifts up faster than the range behind it, which is what sells
      // the depth once the visitor starts scrolling.
      gsap.to("." + s.inner, {
        yPercent: -22,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.5 },
      });
    },
    { scope: root }
  );

  const shipped = projects.length;

  return (
    <section id="top" ref={root} className={s.hero}>
      <div className={s.grid} aria-hidden="true" />

      <div className={`wrap ${s.inner}`}>
        <div className={s.eyebrow}>
          <span className={s.pulse} aria-hidden="true" />
          <span className="micro dim">{profile.status}</span>
          <span className="tag">{profile.location}</span>
        </div>

        <h1 className={s.title}>
          {TITLE.map((w, i) => (
            <span key={w} className={s.word}>
              {i === 1 ? <em>{w}</em> : w}
              {i < TITLE.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>

        <p className={s.pitch}>{profile.pitch}</p>

        <div className={s.meta}>
          <span>
            <b>{profile.name}</b> — {profile.title}
          </span>
          <span>
            <b>{shipped}</b> indexed builds
          </span>
          <span>
            <b>2</b> upstream defects filed at Google
          </span>
        </div>

        <div className={s.cta}>
          <a className="btn btn--primary" href="#console">
            Run a mission
          </a>
          <a className="btn" href="#vault">
            Open the vault
          </a>
          <a className="btn btn--ghost" href={profile.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>

        <div className={s.scrollCue} aria-hidden="true">
          <span>SCROLL</span>
          <span className={s.cueLine} />
        </div>
      </div>

      <div className={s.margin} aria-hidden="true">
        PLATE 01 — THE RIDGE · {profile.handle}
      </div>

      <Ridge variant="hero" />
    </section>
  );
}
