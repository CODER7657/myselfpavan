"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { agents, agentsById, skillTree } from "@foundry/content";
import { reveal } from "@/lib/gsap";
import { Sigil } from "./Sigil";
import t from "./Tree.module.css";

const COL_W = 236;
const ROW_H = 78;
const NODE_W = 190;
const NODE_H = 46;
const HEAD_H = 36;
const RADIUS = 8;

/** Names for the depth columns — the tree reads left to right as a progression. */
const TIERS = ["Foundations", "Built on those", "Applied", "Where it points"];

interface Placed {
  id: string;
  label: string;
  level: number;
  note: string;
  agent: (typeof skillTree)[number]["agent"];
  requires: string[];
  col: number;
  row: number;
  x: number;
  y: number;
}

/**
 * The capability tree.
 *
 * Positions come from the `requires` edges — a node sits one column right of
 * its deepest prerequisite — so the shape is derived from the data rather than
 * hand-placed, and adding a skill cannot silently break the layout.
 *
 * Hovering walks the graph in both directions and lights the whole chain rather
 * than the immediate neighbours, so you can see what a capability rests on all
 * the way back to a root, and what it went on to make possible.
 */
export function Tree() {
  const root = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  const { nodes, edges, width, height, cols } = useMemo(() => {
    const byId = new Map(skillTree.map((n) => [n.id, n]));

    const depthOf = new Map<string, number>();
    const resolve = (id: string, seen: Set<string>): number => {
      if (depthOf.has(id)) return depthOf.get(id)!;
      if (seen.has(id)) return 0;
      seen.add(id);
      const n = byId.get(id);
      const d =
        !n || n.requires.length === 0
          ? 0
          : 1 + Math.max(...n.requires.map((r) => resolve(r, seen)));
      seen.delete(id);
      depthOf.set(id, d);
      return d;
    };
    for (const n of skillTree) resolve(n.id, new Set());

    const rowCursor = new Map<number, number>();
    const placed: Placed[] = skillTree.map((n) => {
      const col = depthOf.get(n.id)!;
      const row = rowCursor.get(col) ?? 0;
      rowCursor.set(col, row + 1);
      return { ...n, col, row, x: col * COL_W, y: HEAD_H + row * ROW_H };
    });

    const pos = new Map(placed.map((p) => [p.id, p]));
    const links = placed.flatMap((n) =>
      n.requires
        .map((r) => pos.get(r))
        .filter((x): x is Placed => Boolean(x))
        .map((from) => ({ id: from.id + "->" + n.id, from, to: n }))
    );

    const colCount = Math.max(...placed.map((p) => p.col)) + 1;
    const rowCount = Math.max(...placed.map((p) => p.row)) + 1;

    return {
      nodes: placed,
      edges: links,
      cols: colCount,
      width: (colCount - 1) * COL_W + NODE_W,
      height: HEAD_H + (rowCount - 1) * ROW_H + NODE_H,
    };
  }, []);

  /** Every ancestor and descendant of the hovered node, transitively. */
  const lit = useMemo(() => {
    const set = new Set<string>();
    if (!hover) return set;

    const byId = new Map(skillTree.map((n) => [n.id, n]));
    const up = (id: string) => {
      if (set.has(id)) return;
      set.add(id);
      for (const r of byId.get(id)?.requires ?? []) up(r);
    };
    const down = (id: string) => {
      for (const n of skillTree) {
        if (n.requires.includes(id) && !set.has(n.id)) {
          set.add(n.id);
          down(n.id);
        }
      }
    };
    up(hover);
    down(hover);
    return set;
  }, [hover]);

  useGSAP(
    () => {
      reveal("." + t.tier, root.current, { y: 8, duration: 0.5, stagger: 0.06 });
      reveal("." + t.edge, root.current, { y: 0, duration: 0.8, stagger: 0.015 });
      reveal("." + t.node, root.current, { y: 12, duration: 0.5, stagger: 0.03 });
    },
    { scope: root }
  );

  /** Orthogonal routing with rounded corners — reads as a circuit, not a scribble. */
  const edgePath = useCallback((from: Placed, to: Placed) => {
    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    const mid = x1 + (x2 - x1) / 2;

    if (Math.abs(y2 - y1) < 1) return `M${x1} ${y1}H${x2}`;

    const dir = y2 > y1 ? 1 : -1;
    const r = Math.min(RADIUS, Math.abs(y2 - y1) / 2, Math.abs(mid - x1));

    return (
      `M${x1} ${y1}` +
      `H${mid - r}` +
      `Q${mid} ${y1} ${mid} ${y1 + dir * r}` +
      `V${y2 - dir * r}` +
      `Q${mid} ${y2} ${mid + r} ${y2}` +
      `H${x2}`
    );
  }, []);

  const active = hover ? nodes.find((n) => n.id === hover) : null;

  return (
    <section id="tree" className="plate" ref={root}>
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 06</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">CAPABILITY TREE</h2>
        <p className="plate-sub">
          Not a bar chart. Every line is a prerequisite, so a skill sits to the right of
          whatever it was built on and the shape shows the order things were learned in.
          Hover any node to light its whole chain — back to a root, and forward to what it
          made possible. Levels are self-assessed and deliberately un-flattering.
        </p>

        <div className={t.frame}>
          <p className={t.swipe} aria-hidden="true">
            Drag sideways to follow the branches →
          </p>

          <div className="scroll-x">
            <div className={t.canvas} style={{ width, height }}>
              {/* Column headers, named so the progression is legible. */}
              {Array.from({ length: cols }, (_, i) => (
                <span key={i} className={t.tier} style={{ left: i * COL_W, width: NODE_W }}>
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  {TIERS[i] ?? "Further"}
                </span>
              ))}

              <svg
                className={t.wires}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                aria-hidden="true"
              >
                {edges.map((e) => (
                  <path
                    key={e.id}
                    className={t.edge}
                    d={edgePath(e.from, e.to)}
                    data-on={lit.has(e.from.id) && lit.has(e.to.id)}
                  />
                ))}
              </svg>

              {nodes.map((n) => {
                const agent = agentsById[n.agent];
                const dim = Boolean(active) && !lit.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={t.node}
                    data-dim={dim}
                    data-active={active?.id === n.id}
                    style={{
                      left: n.x,
                      top: n.y,
                      width: NODE_W,
                      height: NODE_H,
                      color: agent.color,
                    }}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(n.id)}
                    onBlur={() => setHover(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${n.label}, level ${n.level} of 100, ${agent.discipline}. ${n.note}`}
                  >
                    <span className={t.nTop}>
                      <span className={t.nDot} aria-hidden="true" />
                      <span className={t.nLabel}>{n.label}</span>
                      <span className={t.nLevel}>{n.level}</span>
                    </span>
                    <span className={t.nBar} style={{ ["--fill" as string]: n.level + "%" }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={t.below}>
          <div className={t.readout} aria-live="polite">
            {active ? (
              <>
                <span className={t.rSigil} style={{ color: agentsById[active.agent].color }}>
                  <Sigil matrix={agentsById[active.agent].sigil} size={3} gap={1} />
                </span>
                <span className={t.rBody}>
                  <b>{active.label}</b>
                  <span>{active.note}</span>
                </span>
                <span className={t.rMeta}>
                  {agentsById[active.agent].callsign} · {lit.size} linked
                </span>
              </>
            ) : (
              <span className={t.rHint}>
                Hover or focus a capability to read what it actually means here.
              </span>
            )}
          </div>

          <ul className={t.legend} aria-label="Colour key">
            {agents.map((a) => (
              <li key={a.id} style={{ color: a.color }}>
                <span className={t.key} aria-hidden="true" />
                {a.callsign}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
