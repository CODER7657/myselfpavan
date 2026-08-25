"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { domains, profile, stack } from "@foundry/content";
import { reveal } from "@/lib/gsap";
import d from "./Dossier.module.css";

/**
 * The dossier.
 *
 * Opens in plain English, because most people who land here are not engineers
 * and should not have to decode "deterministic verification gate" to work out
 * what he does. The technical register is one click away, not the default.
 */
export function Dossier() {
  const root = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"plain" | "technical">("plain");

  useGSAP(
    () => {
      reveal("." + d.col, root.current, { stagger: 0.1, duration: 0.7 });
    },
    { scope: root }
  );

  const body = mode === "plain" ? profile.plain : profile.bio;

  return (
    <section id="dossier" className="plate" ref={root}>
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 02</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">WHO YOU ARE READING</h2>

        <div className={d.layout}>
          <div className={d.col}>
            <div className={d.toggle} role="group" aria-label="Reading level">
              <button
                type="button"
                data-on={mode === "plain"}
                onClick={() => setMode("plain")}
              >
                Plain English
              </button>
              <button
                type="button"
                data-on={mode === "technical"}
                onClick={() => setMode("technical")}
              >
                Technical
              </button>
            </div>

            <div className={d.prose}>
              {body.map((para) => (
                <p key={para.slice(0, 40)}>{para}</p>
              ))}
            </div>

            {/* The breadth, made countable. A single narrative flattens thirty
                repositories into three stories; this puts the range back. */}
            <div className={d.domains}>
              <h3 className={d.domainsHead}>Where the work has gone</h3>
              <ul className={d.domainList}>
                {domains.map((dom) => (
                  <li key={dom.label} className={d.domain}>
                    <span className={d.domainLabel}>{dom.label}</span>
                    <p className={d.domainNote}>{dom.note}</p>
                    <span className={d.domainEx}>
                      {dom.examples.map((ex) => (
                        <span key={ex} className={d.chip}>
                          {ex}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className={d.col}>
            <dl className={d.facts}>
              <div>
                <dt>Name</dt>
                <dd>{profile.name}</dd>
              </div>
              <div>
                <dt>Focus</dt>
                <dd>{profile.title}</dd>
              </div>
              <div>
                <dt>Based in</dt>
                <dd>{profile.location}</dd>
              </div>
              <div>
                <dt>Studying</dt>
                <dd>BS Computer Science, BITS Pilani · BTech Computer Engineering, GTU</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className={d.ok}>{profile.status}</dd>
              </div>
            </dl>

            <div className={d.stack}>
              <h3 className={d.stackHead}>What he works with</h3>
              {stack.map((g) => (
                <div key={g.label} className={d.stackRow}>
                  <span className={d.stackLabel}>{g.label}</span>
                  <span className={d.stackItems}>
                    {g.items.map((i) => (
                      <span key={i} className={d.chip}>
                        {i}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
