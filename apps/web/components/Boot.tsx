"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { profile } from "@foundry/content";
import { gsap, reducedMotion } from "@/lib/gsap";
import { useFoundry } from "@/lib/store";
import s from "./Boot.module.css";

const WORDMARK = "PAVAN//FOUNDRY";

/** The two halves, so the only legal break is at the slash. */
const WORD_GROUPS = ["PAVAN//", "FOUNDRY"] as const;

const TASKS = [
  "mounting agent runtime",
  "loading tool registry",
  "opening channel to api.github.com",
  "indexing 29 repositories",
  "verifying upstream claims",
  "engraving the ridge",
  "console ready",
];

/** The assets worth waiting on — only the plate this stock will actually paint. */
const plateFor = (theme: string | undefined) =>
  theme === "dark" ? "/art/ridge-plate-dark.webp" : "/art/ridge-plate.webp";

/**
 * The loading screen.
 *
 * It waits on real work — the ridge plate decoding and the webfonts settling —
 * rather than on a fixed timer, so the page behind it is genuinely ready when
 * the curtain parts. A floor of ~1.6s keeps it from flashing on a fast
 * connection; a ceiling of 6s means a slow one is never held hostage.
 */
export function Boot() {
  const booted = useFoundry((st) => st.booted);
  const boot = useFoundry((st) => st.boot);

  const [hydrated, setHydrated] = useState(false);
  const [task, setTask] = useState(TASKS[0] as string);

  const root = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const finished = useRef(false);

  useEffect(() => setHydrated(true), []);

  /* ── real readiness signal ─────────────────────────────────────────────── */

  const ready = useRef(false);
  useEffect(() => {
    if (!hydrated || booted) return;

    let cancelled = false;
    const jobs: Promise<unknown>[] = [plateFor(document.documentElement.dataset.theme)].map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        })
    );

    if (typeof document !== "undefined" && "fonts" in document) {
      jobs.push(document.fonts.ready.catch(() => undefined));
    }

    Promise.all(jobs).then(() => {
      if (!cancelled) ready.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, booted]);

  /* ── exit ──────────────────────────────────────────────────────────────── */

  const leave = useCallback(() => {
    if (finished.current) return;
    finished.current = true;

    if (reducedMotion()) {
      boot();
      return;
    }

    // The screen irises open from the middle, revealing the page beneath —
    // one animated property, no extra elements to get in the content's way.
    const tl = gsap.timeline({ onComplete: boot });
    tl.to("." + s.stage, { y: -26, opacity: 0, duration: 0.4, ease: "power2.in" })
      .to("." + s.plate, { yPercent: 10, opacity: 0, duration: 0.5, ease: "power2.in" }, "<")
      .to(
        root.current,
        { clipPath: "inset(50% 0% 50% 0%)", duration: 0.8, ease: "expo.inOut" },
        "-=0.25"
      )
      .set(root.current, { autoAlpha: 0 });
  }, [boot]);

  /* ── entrance + progress ───────────────────────────────────────────────── */

  useGSAP(
    () => {
      if (!hydrated || booted) return;

      if (reducedMotion()) {
        boot();
        return;
      }

      const counter = { v: 0 };
      /*
       * Played at 1.4x.
       *
       * The whole sequence ran to about 3.8s on a warm cache, which is long for
       * something every visit now shows. Scaling the timeline keeps the
       * choreography and every overlap exactly as composed and simply runs it
       * faster — re-timing eight tweens by hand would not.
       */
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.timeScale(1.4);

      tl.from("." + s.crop, { scale: 0.4, opacity: 0, duration: 0.7, stagger: 0.05 })
        .from("." + s.kicker, { y: 10, opacity: 0, duration: 0.5 }, "-=0.45")
        .from(
          "." + s.glyph,
          { yPercent: 108, opacity: 0, duration: 0.95, stagger: 0.028 },
          "-=0.3"
        )
        .from("." + s.sub, { y: 14, opacity: 0, duration: 0.65 }, "-=0.6")
        .from("." + s.meterWrap, { y: 12, opacity: 0, duration: 0.55 }, "-=0.45")
        .to("." + s.plate, { opacity: 0.95, duration: 1.1, ease: "power2.out" }, "-=0.9")
        .from("." + s.plate, { yPercent: 14, duration: 1.4, ease: "expo.out" }, "<")
        .from("." + s.hint, { opacity: 0, duration: 0.5 }, "-=0.6");

      /*
       * The meter eases to 92% over the floor duration, then waits for the real
       * readiness flag before completing — so it never shows 100% while the
       * page behind is still decoding, and never stalls visibly either.
       */
      tl.to(
        counter,
        {
          v: 92,
          duration: 1.15,
          ease: "power1.inOut",
          onUpdate() {
            const n = Math.round(counter.v);
            if (pctRef.current) pctRef.current.textContent = String(n).padStart(3, "0") + "%";
            if (fillRef.current) fillRef.current.style.width = n + "%";
            const idx = Math.min(TASKS.length - 1, Math.floor((n / 100) * TASKS.length));
            setTask(TASKS[idx] as string);
          },
        },
        0.25
      );

      const started = performance.now();
      const settle = () => {
        const waited = performance.now() - started;
        if (!ready.current && waited < 6000) {
          raf = requestAnimationFrame(settle);
          return;
        }
        gsap.to(counter, {
          v: 100,
          duration: 0.35,
          ease: "power2.out",
          onUpdate() {
            const n = Math.round(counter.v);
            if (pctRef.current) pctRef.current.textContent = String(n).padStart(3, "0") + "%";
            if (fillRef.current) fillRef.current.style.width = n + "%";
          },
          onComplete() {
            setTask(TASKS[TASKS.length - 1] as string);
            gsap.delayedCall(0.15, leave);
          },
        });
      };

      let raf = 0;
      /* Just past the end of the entrance at 1.4x, so nothing is still moving
         when the meter completes and the curtain starts to part. */
      const kickoff = gsap.delayedCall(1.35, () => {
        raf = requestAnimationFrame(settle);
      });

      return () => {
        kickoff.kill();
        cancelAnimationFrame(raf);
      };
    },
    { scope: root, dependencies: [hydrated, booted] }
  );

  /* ── skip ──────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!hydrated || booted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hydrated, booted, leave]);

  if (!hydrated || booted) return null;

  return (
    <div
      ref={root}
      className={s.boot}
      data-done={finished.current}
      role="dialog"
      aria-label="Loading"
      aria-busy="true"
      onClick={leave}
    >
      <div className={s.rule} aria-hidden="true" />
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <span key={c} className={s.crop} data-c={c} aria-hidden="true" />
      ))}

      <div className={s.stage}>
        <div className={s.kicker}>
          <span className={s.dot} aria-hidden="true" />
          <span>FOUNDRY · BOOT SEQUENCE</span>
          <span>{profile.handle}</span>
        </div>

        <h1 className={s.mark} aria-label={WORDMARK}>
          {/*
            Grouped, not one flat run of letters.

            The heading is a wrapping flex row of individual glyphs so they can
            be staggered, which on a 375px screen broke it as PAVAN//FOUNDR and
            a lone Y on the next line. Each half is now unbreakable, so the only
            place it can wrap is the slash it is named for. The glyphs are still
            separate elements and the animation is untouched.
          */}
          {WORD_GROUPS.map((group, g) => (
            <span key={group} className={s.word}>
              {group.split("").map((ch, i) => (
                <span
                  key={ch + g + i}
                  className={`${s.glyph} ${ch === "/" ? s.slash : ""}`}
                  aria-hidden="true"
                >
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </h1>

        <p className={s.sub}>{profile.pitch}</p>

        <div className={s.meterWrap}>
          <div className={s.meterTop}>
            <span className={s.task}>{task}</span>
            <span ref={pctRef} className={s.pct}>
              000%
            </span>
          </div>
          <div className={s.meter}>
            <span ref={fillRef} className={s.fill} />
          </div>
        </div>

        <p className={s.hint}>
          <b>Click anywhere</b> or press <b>Enter</b> to skip
        </p>
      </div>

      <div className={s.ridge} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/ridge-plate.webp"
          alt=""
          className={`${s.plate} ${s.plateLight}`}
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/art/ridge-plate-dark.webp" alt="" className={`${s.plate} ${s.plateDark}`} />
        <span className={s.veil} />
      </div>

    </div>
  );
}
