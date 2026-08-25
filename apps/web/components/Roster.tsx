"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { agents } from "@foundry/content";
import { reveal } from "@/lib/gsap";
import { levelFor, useFoundry } from "@/lib/store";
import { Sigil } from "./Sigil";
import s from "./Roster.module.css";

/**
 * The roster. Operatives gate on operator level, so the first visit exposes two
 * and the rest arrive as missions are run — the site teaches its own mechanic
 * without a tutorial.
 */
export function Roster() {
  const root = useRef<HTMLDivElement>(null);
  const xp = useFoundry((st) => st.xp);
  const recruited = useFoundry((st) => st.recruited);
  const recruit = useFoundry((st) => st.recruit);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useGSAP(
    () => {
      reveal("." + s.tile, root.current, { y: 26 });
    },
    { scope: root }
  );

  const level = levelFor(hydrated ? xp : 0);

  return (
    <section id="roster" className="plate" ref={root}>
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 03</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">THE ROSTER</h2>
        <p className="plate-sub" style={{ marginBottom: "var(--s-6)" }}>
          Six operatives, one discipline each — they are the six areas the work actually
          falls into. Click one to recruit it: you earn XP, and its full briefing opens.
          All six are available from the start.
        </p>

        <div className={s.grid}>
          {agents.map((a) => {
            const on = hydrated && recruited.includes(a.id);
            const locked = hydrated && !on && level < a.clearance;

            return (
              <button
                key={a.id}
                type="button"
                className={s.tile}
                style={{ color: a.color }}
                data-on={on}
                data-locked={locked}
                disabled={locked}
                onClick={() => !locked && recruit(a.id)}
                aria-pressed={on}
              >
                <div className={s.head}>
                  <span className={s.sigil}>
                    <Sigil matrix={a.sigil} size={4} gap={1} />
                  </span>
                  <span className={s.state}>
                    {on ? "◆ ACTIVE" : locked ? "◇ LVL " + a.clearance : "◇ RECRUIT"}
                  </span>
                </div>

                <div>
                  <div className={s.callsign} style={{ color: "var(--ink)" }}>
                    {a.callsign}
                  </div>
                  <div className={s.discipline}>{a.discipline}</div>
                </div>

                <div className={s.body}>
                  <p className={s.motto}>“{a.motto}”</p>
                  {on && <p className={s.brief}>{a.brief}</p>}
                  <div className={s.tools}>
                    {a.tools.map((t) => (
                      <span key={t} className={s.tool}>
                        {t}
                      </span>
                    ))}
                  </div>
                  {locked && (
                    <div className={s.lock}>
                      Requires operator level {a.clearance} — run a mission.
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
