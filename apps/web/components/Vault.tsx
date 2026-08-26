"use client";

import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { agents, type AgentId } from "@foundry/content";
import { PROMOTION_FLOOR, ageOf, pushedSince } from "@foundry/assay";
import { reveal } from "@/lib/gsap";
import { useLiveRepos } from "@/lib/useLiveRepos";
import { useAssay } from "@/lib/useAssay";
import { useStandings } from "@/lib/useStandings";
import { useCards } from "@/lib/useCards";
import { joinProjects } from "@/lib/liveProjects";
import { Card } from "./Card";
import v from "./Vault.module.css";

type Filter = "all" | AgentId;

export function Vault() {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const live = useLiveRepos();
  const assay = useAssay();
  const standings = useStandings();
  const written = useCards();

  /*
   * The grid is not a list somebody maintains. Every card in it is there
   * because its repository cleared the gate on this page load — curated where
   * one was written, generated where the gate promoted something nobody has
   * written up — and anything that stopped clearing it is named underneath
   * rather than quietly dropped.
   */
  const graded = assay.status === "ready";

  const { vault: catalogue, withdrawn } = useMemo(
    () => joinProjects(assay.byName, standings.previous, written, graded),
    [assay.byName, standings.previous, written, graded]
  );

  /*
   * How old the numbers on these cards are, and whether GitHub has moved since.
   *
   * The scoring is live, but the evidence it scores is a snapshot, and those
   * are different things. Without this line a four-hour-old commit count is
   * indistinguishable from a wrong one — which is exactly how a stale number
   * gets reported as a bug.
   *
   * `now` is read once per mount rather than on a timer: a clock that ticks
   * under the reader is a distraction, and the page is not open for hours.
   */
  const age = useMemo(() => ageOf(assay.collectedAt), [assay.collectedAt]);

  /* Repositories GitHub says were pushed after this snapshot was taken. */
  const behind = useMemo(() => {
    if (!graded || !live.byName.size) return [];
    return catalogue
      .filter((p) => p.assay)
      .filter((p) => pushedSince(p.assay!.evidence.pushedAt, live.byName.get(p.assay!.name.toLowerCase())?.pushed))
      .map((p) => p.name);
  }, [catalogue, live.byName, graded]);

  const shown = useMemo(
    () => (filter === "all" ? catalogue : catalogue.filter((p) => p.agent === filter)),
    [filter, catalogue]
  );

  useGSAP(
    () => {
      reveal("." + v.item, root.current, { y: 34, stagger: 0.05 });
    },
    { scope: root }
  );

  // Only offer a filter for agents that actually own something.
  const owners = agents.filter((a) => catalogue.some((p) => p.agent === a.id));

  return (
    <section id="vault" className="plate" ref={root}>
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 05</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">THE VAULT</h2>
        <p className="plate-sub">
          {catalogue.length} builds — the ones worth defending, drawn from the public
          repositories plus two private ones. Ranked by how much of the work survives
          questioning rather than by stars, and rarity follows that ranking. Turn a card over
          for the argument and the numbers.
        </p>

        {/* Live sync. The curated list is hand-written and would otherwise go
            stale; this states when the account last moved, and nothing more —
            listing half-finished repositories on a portfolio only advertises
            the half-finished ones. */}
        {live.lastPush && (
          <p className={v.sync}>
            <span className={v.pulse} aria-hidden="true" />
            Synced live with GitHub · last push {live.lastPush} ·{" "}
            <a href="https://github.com/CODER7657">see everything</a>
          </p>
        )}

        {/* How old these numbers are, said plainly, so a stale one cannot be
            mistaken for a wrong one. */}
        {assay.status === "loading" && (
          <p className={v.freshness} data-level="loading">
            Grading against the evidence snapshot…
          </p>
        )}

        {assay.status === "error" && (
          <p className={v.freshness} data-level="stale">
            The evidence snapshot could not be read, so nothing here has been graded.
            These are the cards as written, and the ranks with them.
          </p>
        )}

        {graded && age && (
          <p className={v.freshness} data-level={age.level}>
            Scored in your browser just now, from evidence collected{" "}
            <strong>{age.label}</strong>.
            {behind.length > 0 && (
              <>
                {" "}
                GitHub has moved since — {behind.slice(0, 3).join(", ")}
                {behind.length > 3 ? " and " + (behind.length - 3) + " more" : ""}
                {behind.length === 1 ? " has" : " have"} been pushed to. Run the assay to
                catch up.
              </>
            )}
          </p>
        )}

        <div className={v.filters} role="group" aria-label="Filter by operative">
          <button
            type="button"
            className={v.filter}
            data-on={filter === "all"}
            onClick={() => setFilter("all")}
          >
            ALL · {catalogue.length}
          </button>
          {owners.map((a) => {
            const n = catalogue.filter((p) => p.agent === a.id).length;
            return (
              <button
                key={a.id}
                type="button"
                className={v.filter}
                data-on={filter === a.id}
                style={{ color: a.color }}
                onClick={() => setFilter(a.id)}
              >
                {a.callsign} · {n}
              </button>
            );
          })}
        </div>

        <div className={v.grid}>
          {shown.map((p) => (
            <div key={p.slug} className={v.item}>
              <Card project={p} />
            </div>
          ))}
        </div>

        {/* A demotion that hides itself is just a stale portfolio with extra
            steps. What the gate pulled is listed, with the way back. */}
        {withdrawn.length > 0 && (
          <div className={v.withdrawn}>
            <h3 className={v.withdrawnHead}>
              Withdrawn by the gate · {withdrawn.length}
            </h3>
            <p className={v.withdrawnNote}>
              These have cards written for them and are not in the vault, because they no
              longer clear the floor of {PROMOTION_FLOOR}. They return on the next assay if
              the repository does.
            </p>
            <ul className={v.withdrawnList}>
              {withdrawn.map((w) => (
                <li key={w.slug} className={v.withdrawnItem}>
                  <a href={w.url} target="_blank" rel="noopener noreferrer">
                    {w.name}
                  </a>
                  <span className={v.withdrawnScore}>{Math.round(w.score)}/100</span>
                  <span className={v.withdrawnWhy}>
                    {w.reason}
                    {w.route ? " " + w.route : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
