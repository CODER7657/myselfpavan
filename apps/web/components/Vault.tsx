"use client";

import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { agents, projects, type AgentId } from "@foundry/content";
import { reveal } from "@/lib/gsap";
import { useLiveRepos } from "@/lib/useLiveRepos";
import { Card } from "./Card";
import v from "./Vault.module.css";

type Filter = "all" | AgentId;

export function Vault() {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const live = useLiveRepos();

  const shown = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => p.agent === filter)),
    [filter]
  );

  useGSAP(
    () => {
      reveal("." + v.item, root.current, { y: 34, stagger: 0.05 });
    },
    { scope: root }
  );

  // Only offer a filter for agents that actually own something.
  const owners = agents.filter((a) => projects.some((p) => p.agent === a.id));

  return (
    <section id="vault" className="plate" ref={root}>
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 05</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">THE VAULT</h2>
        <p className="plate-sub">
          {projects.length} builds — the ones worth defending, drawn from the public
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

        <div className={v.filters} role="group" aria-label="Filter by operative">
          <button
            type="button"
            className={v.filter}
            data-on={filter === "all"}
            onClick={() => setFilter("all")}
          >
            ALL · {projects.length}
          </button>
          {owners.map((a) => {
            const n = projects.filter((p) => p.agent === a.id).length;
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
      </div>
    </section>
  );
}
