"use client";

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { agentsById, type Project } from "@foundry/content";
import { useFoundry } from "@/lib/store";
import { Sigil } from "./Sigil";
import s from "./Card.module.css";

const STAT_LABELS: Record<keyof Project["stats"], string> = {
  depth: "DEPTH",
  rigor: "RIGOUR",
  surface: "SURFACE",
  novelty: "NOVELTY",
};

/** Only the top two tiers get the spectral pass; below that it reads as noise. */
const SPECTRAL = new Set(["legendary", "mythic"]);

/** The front is a fixed-height card, so the stack list is capped rather than
 *  allowed to push the metrics out of view. The full list is on the reverse. */
const STACK_SHOWN = 6;

/**
 * A collectible project card. The front is the pitch, the reverse carries the
 * argument and the numbers.
 *
 * The flip target is a full-bleed button *behind* the content rather than a
 * button wrapping it: an anchor nested inside a button is invalid HTML, and in
 * practice the button swallowed the click so the repository links never fired.
 * Card content is therefore `pointer-events: none` and passes clicks through to
 * that surface, while the links opt back in and sit above it.
 */
export function Card({ project }: { project: Project }) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inspectCard = useFoundry((st) => st.inspectCard);
  const agent = agentsById[project.agent];

  const frontBtn = useRef<HTMLButtonElement>(null);
  const backBtn = useRef<HTMLButtonElement>(null);

  const flip = useCallback(() => {
    setFlipped((f) => {
      if (!f) inspectCard(project.slug, project.rarity);
      // Focus follows the face that is about to be visible; leaving it on the
      // face being hidden is what produced the aria-hidden focus warning.
      const next = f ? frontBtn : backBtn;
      requestAnimationFrame(() => next.current?.focus({ preventScroll: true }));
      return !f;
    });
  }, [inspectCard, project.slug, project.rarity]);

  /* The sheen tracks the pointer via custom properties — no re-render per move. */
  const track = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
  }, []);

  const style = {
    "--rarity": "var(--rarity-" + project.rarity + ")",
    color: agent.color,
  } as CSSProperties;

  const spectral = SPECTRAL.has(project.rarity);

  return (
    <div className={s.slot}>
      <div
        ref={ref}
        className={s.card}
        style={style}
        data-flipped={flipped}
        onPointerMove={track}
      >
        {/* ── front ── */}
        <div className={`${s.face} ${s.front}`} inert={flipped}>
          <button
            ref={frontBtn}
            type="button"
            className={s.flipSurface}
            onClick={flip}
            aria-expanded={flipped}
            aria-label={project.name + " — show details"}
          />

          <div className={s.band}>
            <span>{project.rarity.toUpperCase()}</span>
            <span>{project.year}</span>
          </div>

          <div className={s.head}>
            <div className={s.headTop}>
              <span className={s.sigil}>
                <Sigil matrix={agent.sigil} size={3} gap={1} />
              </span>
              <span className={s.owner}>{agent.callsign}</span>
              <span className={s.classification}>{project.classification}</span>
            </div>
            <div className={s.name}>{project.name}</div>
          </div>

          <div className={s.body}>
            <p className={s.tagline}>{project.tagline}</p>
            {/* The line that lets a non-engineer understand the card. */}
            <p className={s.plain}>{project.plain}</p>
            <div className={s.metrics}>
              {project.metrics.map((m) => (
                <div key={m.label} className={s.metric}>
                  <span className={s.mLabel}>{m.label}</span>
                  <span className={s.mValue}>{m.value}</span>
                </div>
              ))}
            </div>
            <div className={s.stack}>
              {project.stack.slice(0, STACK_SHOWN).map((t) => (
                <span key={t} className={s.chip}>
                  {t}
                </span>
              ))}
              {project.stack.length > STACK_SHOWN && (
                <span className={s.chip}>+{project.stack.length - STACK_SHOWN}</span>
              )}
            </div>
          </div>

          <div className={s.foot}>
            <span className={s.hint}>▸ TAP TO INSPECT</span>
            <span className={s.hint} style={{ color: "var(--rarity)" }}>
              {agent.callsign}
            </span>
          </div>

          {spectral && <span className={s.spectral} aria-hidden="true" />}
          <span className={s.sheen} aria-hidden="true" />
        </div>

        {/* ── reverse ── */}
        <div className={`${s.face} ${s.back}`} inert={!flipped}>
          <button
            ref={backBtn}
            type="button"
            className={s.flipSurface}
            onClick={flip}
            aria-label={project.name + " — back to front"}
          />

          <div className={s.band}>
            <span>DOSSIER</span>
            <span>{project.slug}</span>
          </div>

          <div className={s.head}>
            <div className={s.name} style={{ fontSize: "var(--t-lg)" }}>
              {project.name}
            </div>
          </div>

          <div className={s.body}>
            <p className={s.summary}>{project.summary}</p>
            <p className={s.highlight}>{project.highlight}</p>

            <div className={s.stack}>
              {project.stack.map((t) => (
                <span key={t} className={s.chip}>
                  {t}
                </span>
              ))}
            </div>

            <div className={s.stats}>
              {(Object.keys(project.stats) as (keyof Project["stats"])[]).map((k) => (
                <div key={k} className={s.stat}>
                  <span className={s.sLabel}>{STAT_LABELS[k]}</span>
                  <span
                    className="bar"
                    style={
                      {
                        "--fill": project.stats[k] + "%",
                        color: "var(--rarity)",
                      } as CSSProperties
                    }
                  />
                  <span className={s.sVal}>{project.stats[k]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={s.foot}>
            <span className={s.hint}>▸ TAP TO CLOSE</span>
            <span className={s.links}>
              {project.repo && (
                <a
                  className={s.link}
                  href={project.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CODE ↗
                </a>
              )}
              {project.private && <span className={s.privateTag}>PRIVATE SOURCE</span>}
              {project.demo && (
                <a
                  className={s.link}
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LIVE ↗
                </a>
              )}
            </span>
          </div>

          <span className={s.sheen} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
