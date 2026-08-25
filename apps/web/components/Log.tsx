"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { credentials, timeline } from "@foundry/content";
import { gsap, reducedMotion, reveal } from "@/lib/gsap";
import { useFoundry } from "@/lib/store";
import l from "./Log.module.css";

const KIND_LABEL: Record<string, string> = {
  education: "EDUCATION",
  build: "BUILT",
  recognition: "RECOGNITION",
};

/**
 * The career log — education, builds and recognition on one spine, newest last
 * so it reads as a story rather than a résumé. Reaching the end of it awards an
 * achievement, which is the only reason there is an observer on the last entry.
 */
export function Log() {
  const root = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const markLogRead = useFoundry((st) => st.markLogRead);

  useGSAP(
    () => {
      reveal("." + l.entry, root.current, { y: 14, duration: 0.55, stagger: 0.07 });
      if (reducedMotion()) return;
      gsap.from("." + l.spine, {
        scaleY: 0,
        transformOrigin: "top",
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top 70%", end: "bottom 70%", scrub: 0.5 },
      });
    },
    { scope: root }
  );

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          markLogRead();
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [markLogRead]);

  return (
    <section id="log" className="plate" ref={root}>
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 07</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">THE CAREER LOG</h2>
        <p className="plate-sub">
          Education and the work itself, oldest first. Awards, competitions and appointments
          are listed separately underneath rather than mixed in here.
        </p>

        <div className={l.timeline}>
          <span className={l.spine} aria-hidden="true" />
          {timeline.map((t) => (
            <article key={t.id} className={l.entry} data-kind={t.kind}>
              <span className={l.node} aria-hidden="true" />
              <div className={l.head}>
                <span className={l.kind}>{KIND_LABEL[t.kind]}</span>
                <span className={l.period}>{t.period}</span>
              </div>
              <h3 className={l.title}>{t.title}</h3>
              <div className={l.org}>{t.org}</div>
              <p className={l.detail}>{t.detail}</p>
              <div className={l.tags}>
                {t.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div ref={endRef} className={l.creds}>
          <h3 className={l.credsHead}>Awards &amp; appointments</h3>
          <p className={l.credsNote}>
            Thirteen certifications are listed on LinkedIn. These four are the ones with a
            competitive result or a selection behind them.
          </p>
          <div className={l.credGrid}>
            {credentials.map((c) => (
              <div key={c.id + c.issuer} className={l.cred}>
                <span className={l.credKind} data-kind={c.kind}>
                  {c.kind === "award" ? "◆ AWARD" : c.kind === "role" ? "◈ ROLE" : "◇ CERT"}
                </span>
                <h4 className={l.credName}>{c.name}</h4>
                <div className={l.credIssuer}>{c.issuer}</div>
                <div className={l.credIssued}>{c.issued}</div>
                <p className={l.credDetail}>{c.detail}</p>
                <div className={l.tags}>
                  {c.skills.map((sk) => (
                    <span key={sk} className="tag">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
