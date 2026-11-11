"use client";

import { useEffect, useState } from "react";
import { achievements, profile } from "@foundry/content";
import { levelProgress, useFoundry } from "@/lib/store";
import { Ridge } from "./Ridge";
import g from "./Signal.module.css";

const LINKS = [
  { label: "Email", value: "pavanpatela5598@gmail.com", href: "mailto:pavanpatela5598@gmail.com" },
  { label: "Portfolio", value: "pavanpatel.vercel.app", href: "https://pavanpatel.vercel.app" },
  { label: "GitHub", value: "github.com/CODER7657", href: profile.github },
  { label: "LinkedIn", value: "in/pavan-patel-559195261", href: profile.linkedin },
  { label: "X", value: "@pavan_pate78009", href: profile.x },
];

/**
 * Closing plate: how to make contact, the operator's final score, and the
 * range one more time — which is where the reference put it, and where it
 * belongs, since a footer is the one place a full-bleed illustration is not
 * competing with anything.
 */
export function Signal() {
  const xp = useFoundry((st) => st.xp);
  const earned = useFoundry((st) => st.earned);
  const completed = useFoundry((st) => st.completed);
  const recruited = useFoundry((st) => st.recruited);
  const reset = useFoundry((st) => st.reset);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const { level } = levelProgress(hydrated ? xp : 0);
  const got = hydrated ? earned : [];

  return (
    <footer id="signal" className={g.signal}>
      <div className="wrap">
        <div className="plate-head" style={{ paddingTop: "var(--s-7)" }}>
          <span className="plate-num">PLATE 10</span>
          <span className="plate-rule" />
        </div>

        <div className={g.top}>
          <div>
            <h2 className={g.title}>
              LET&apos;S <em>TALK</em>
            </h2>
            <p className={g.pitch}>{profile.availability.headline}</p>
            <p className={g.detail}>{profile.availability.detail}</p>

            <ul className={g.interests}>
              {profile.availability.interests.map((i) => (
                <li key={i} className="tag">
                  {i}
                </li>
              ))}
            </ul>

            <a className="btn btn--primary" href={"mailto:" + profile.email}>
              Write to Pavan
            </a>
          </div>

          <dl className={g.links}>
            {LINKS.map((l) => (
              <div key={l.label}>
                <dt>{l.label}</dt>
                <dd>
                  <a href={l.href} target={l.href.startsWith("mailto") ? undefined : "_blank"} rel="noreferrer">
                    {l.value}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={g.scoreboard}>
          <div className={g.scoreHead}>
            <span className={g.scoreTitle}>OPERATOR RECORD</span>
            <span className={g.scoreStats} suppressHydrationWarning>
              LVL {level} · {hydrated ? xp : 0} XP · {completed.length}/5 missions ·{" "}
              {recruited.length}/6 recruited
            </span>
            <button type="button" className={g.reset} onClick={reset}>
              Reset progress
            </button>
          </div>

          <ul className={g.badges}>
            {achievements.map((a) => {
              const on = got.includes(a.id);
              const hidden = a.secret && !on;
              return (
                <li key={a.id} className={g.badge} data-on={on}>
                  <span className={g.badgeMark}>{on ? "◆" : "◇"}</span>
                  <span className={g.badgeBody}>
                    <b>{hidden ? "???" : a.name}</b>
                    <span>{hidden ? "Hidden — keep exploring." : a.hint}</span>
                  </span>
                  <span className={g.badgeXp}>+{a.xp}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={g.colophon}>
          <span>© {new Date().getFullYear()} Pavan Patel</span>
          <span>
            Built as a pnpm monorepo — Next.js 15, GSAP ScrollTrigger, and a hand-written
            agent runtime. No model was called to render this page.
          </span>
          {/* Somebody else made the music. Whose it is belongs on the page, not
              in a commit message. */}
          <span>
            Music: &ldquo;Calm music&rdquo; from the Freesound community. Credit pending
            confirmation of the original author and licence.
          </span>
          <a href="#top">Back to the ridge ↑</a>
        </div>
      </div>

      <Ridge variant="footer" />
    </footer>
  );
}
