"use client";

import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { PROMOTION_FLOOR, READY_TOPIC, type Assay as AssayRow } from "@foundry/assay";
import { reveal } from "@/lib/gsap";
import { useAssay } from "@/lib/useAssay";
import a from "./Assay.module.css";

type Lens = "promoted" | "held" | "not-ready" | "all";

const LENSES: { id: Lens; label: string; blurb: string }[] = [
  { id: "promoted", label: "Promoted", blurb: "Cleared the floor. These earn a card." },
  { id: "held", label: "Held", blurb: "Marked ready, but not scoring high enough yet." },
  { id: "not-ready", label: "Not marked", blurb: "Work in progress — deliberately not graded." },
  { id: "all", label: "Everything", blurb: "Every repository the assay looked at." },
];

/**
 * The assay.
 *
 * A portfolio normally says "here is my best work" and asks you to take its
 * word for it. This shows the rule instead: every repository, the score it
 * earned, the signal-by-signal reason, and what it would take to move.
 *
 * It re-grades on every page load from a snapshot a scheduled workflow
 * refreshes daily, so improving a repository moves its rank without anyone
 * editing this site.
 */
export function Assay() {
  const root = useRef<HTMLElement>(null);
  const [lens, setLens] = useState<Lens>("promoted");
  const [open, setOpen] = useState<string | null>(null);
  const state = useAssay();

  useGSAP(
    () => {
      if (state.status !== "ready") return;
      reveal("." + a.row, root.current, { y: 12, duration: 0.45, stagger: 0.03 });
    },
    { scope: root, dependencies: [state.status] }
  );

  const rows = useMemo(() => {
    switch (lens) {
      case "promoted":
        return state.promoted;
      case "held":
        return state.held;
      case "not-ready":
        return state.notReady;
      default:
        return state.all;
    }
  }, [lens, state]);

  const counts: Record<Lens, number> = {
    promoted: state.promoted.length,
    held: state.held.length,
    "not-ready": state.notReady.length,
    all: state.all.length,
  };

  return (
    <section id="assay" className="plate" ref={root}>
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 08</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">THE ASSAY</h2>
        <p className="plate-sub">
          Which work earns a place here is decided by a rubric, not by memory. Every
          repository is graded on five bands — depth, verification, completeness, structure
          and whether it shipped — and anything scoring {PROMOTION_FLOOR} or above is
          promoted. Open a row to see exactly where its points came from, and what would
          move it.
        </p>

        <p className={a.gate}>
          <strong>Nothing is graded until it is marked.</strong> A repository is skipped
          entirely until it carries the <code>{READY_TOPIC}</code> topic on GitHub — so work
          in progress stays invisible until you decide it is finished.
        </p>

        <div className={a.lenses} role="group" aria-label="Filter by verdict">
          {LENSES.map((l) => (
            <button
              key={l.id}
              type="button"
              className={a.lens}
              data-on={lens === l.id}
              onClick={() => setLens(l.id)}
            >
              {l.label}
              <span className={a.count}>{counts[l.id]}</span>
            </button>
          ))}
        </div>

        <p className={a.blurb}>{LENSES.find((l) => l.id === lens)?.blurb}</p>

        {state.status === "loading" && <p className={a.state}>Grading…</p>}

        {state.status === "error" && (
          <p className={a.state}>
            No evidence snapshot yet ({state.error}). It is written by the scheduled assay
            workflow; run it once and this fills in.
          </p>
        )}

        {state.status === "ready" && rows.length === 0 && (
          <p className={a.state}>Nothing in this bucket.</p>
        )}

        {state.status === "ready" && rows.length > 0 && (
          <ul className={a.table}>
            {rows.map((r) => (
              <Row key={r.name} row={r} open={open === r.name} onToggle={() =>
                setOpen((o) => (o === r.name ? null : r.name))
              } />
            ))}
          </ul>
        )}

        {state.collectedAt && (
          <p className={a.foot}>
            Evidence collected {new Date(state.collectedAt).toISOString().slice(0, 16).replace("T", " ")} UTC ·
            rubric v{state.rubricVersion} · re-graded in your browser on load
          </p>
        )}
      </div>
    </section>
  );
}

function Row({
  row,
  open,
  onToggle,
}: {
  row: AssayRow;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = "assay-" + row.name.replace(/[^a-z0-9]/gi, "-");

  return (
    <li className={a.row} data-verdict={row.verdict} data-tier={row.tier}>
      <button
        type="button"
        className={a.summary}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={a.score}>{Math.round(row.score)}</span>

        <span className={a.ident}>
          <span className={a.name}>{row.name}</span>
          <span className={a.desc}>
            {row.reason ?? row.evidence.description ?? "—"}
          </span>
        </span>

        <span className={a.meta}>
          <span className={a.tier}>{row.tier}</span>
          <span className={a.commits}>{row.evidence.commits} commits</span>
        </span>

        <span className={a.chev} aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className={a.detail} id={panelId}>
          <div className={a.bands}>
            {row.bands.map((b) => (
              <div key={b.id} className={a.band}>
                <div className={a.bandHead}>
                  <span className={a.bandLabel}>{b.label}</span>
                  <span className={a.bandScore}>
                    {b.earned}/{b.max}
                  </span>
                </div>
                <span
                  className="bar"
                  style={{ ["--fill" as string]: (b.earned / b.max) * 100 + "%" }}
                />
                <p className={a.rationale}>{b.rationale}</p>

                <ul className={a.signals}>
                  {b.signals.map((sig) => (
                    <li key={sig.id} data-earned={sig.earned >= sig.max}>
                      <span className={a.sigMark} aria-hidden="true">
                        {sig.earned >= sig.max ? "◆" : sig.earned > 0 ? "◈" : "◇"}
                      </span>
                      <span className={a.sigBody}>
                        <b>{sig.label}</b>
                        <span>{sig.detail}</span>
                      </span>
                      <span className={a.sigScore}>
                        {sig.earned}/{sig.max}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {row.nextSteps.length > 0 && (
            <div className={a.next}>
              <h4>To move this up</h4>
              <ol>
                {row.nextSteps.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ol>
            </div>
          )}

          <a className={a.link} href={row.url} target="_blank" rel="noopener noreferrer">
            Open {row.name} on GitHub ↗
          </a>
        </div>
      )}
    </li>
  );
}
