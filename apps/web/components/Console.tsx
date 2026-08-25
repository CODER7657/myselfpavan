"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { agentsById, missions, type Mission } from "@foundry/content";
import { planLevels, runMission, type RunEvent } from "@foundry/agent-engine";
import { useFoundry } from "@/lib/store";
import s from "./Console.module.css";

type Status = "pending" | "running" | "done";

interface TraceEntry {
  key: string;
  stepId: string;
  kind: "tool" | "result" | "thought";
  text: string;
  live?: boolean;
}

/**
 * The mission console.
 *
 * This drives the real runtime from `@foundry/agent-engine`: the plan is
 * topologically levelled for display, then executed with genuine concurrency,
 * so independent steps stream their traces at the same time and finish out of
 * order. The tool calls underneath are real — `github.repo` hits the public API.
 */
export function Console() {
  const [selected, setSelected] = useState<Mission>(missions[0] as Mission);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const completed = useFoundry((st) => st.completed);
  const completeMission = useFoundry((st) => st.completeMission);
  const [hydrated, setHydrated] = useState(false);

  const handle = useRef<ReturnType<typeof runMission> | null>(null);
  const traceEl = useRef<HTMLDivElement>(null);

  useEffect(() => setHydrated(true), []);

  const levels = useMemo(() => planLevels(selected.steps), [selected]);
  const stepById = useMemo(
    () => Object.fromEntries(selected.steps.map((x) => [x.id, x])),
    [selected]
  );

  /* Keep the trace pinned to the newest line while a run is live. */
  useEffect(() => {
    if (!running || !traceEl.current) return;
    traceEl.current.scrollTop = traceEl.current.scrollHeight;
  }, [trace, running]);

  useEffect(() => {
    return () => handle.current?.abort();
  }, []);

  const reset = useCallback(() => {
    handle.current?.abort();
    handle.current = null;
    setStatus({});
    setTrace([]);
    setTokens(0);
    setElapsed(0);
    setRunning(false);
  }, []);

  const select = useCallback(
    (m: Mission) => {
      reset();
      setSelected(m);
    },
    [reset]
  );

  const execute = useCallback(async () => {
    reset();
    setRunning(true);

    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const run = runMission(selected, { instant, speed: 1 });
    handle.current = run;

    const started = Date.now();
    const ticker = setInterval(() => setElapsed(Date.now() - started), 100);

    try {
      for await (const ev of run.events) {
        apply(ev);
      }
    } finally {
      clearInterval(ticker);
      setRunning(false);
      handle.current = null;
    }

    function apply(ev: RunEvent) {
      switch (ev.type) {
        case "step:start":
          setStatus((p) => ({ ...p, [ev.stepId]: "running" }));
          break;

        case "tool:call":
          setTrace((p) => [
            ...p,
            {
              key: ev.stepId + ":call:" + p.length,
              stepId: ev.stepId,
              kind: "tool",
              text: "→ " + ev.call.tool + "(" + JSON.stringify(ev.call.args) + ")",
            },
          ]);
          break;

        case "tool:result":
          setTrace((p) => [
            ...p,
            {
              key: ev.stepId + ":res:" + p.length,
              stepId: ev.stepId,
              kind: "result",
              text: "← " + ev.result.summary + "  [" + ev.result.ms + "ms]",
            },
          ]);
          break;

        case "token":
          setTokens((t) => t + 1);
          setTrace((p) => {
            /*
             * Every step owns its own open line.
             *
             * Steps run concurrently, so tokens from two agents arrive
             * interleaved. Appending to whichever line happened to be last
             * chopped both of their sentences into alternating fragments —
             * so the append target is found by step, not by position.
             */
            let i = p.length - 1;
            while (i >= 0) {
              const line = p[i]!;
              if (line.stepId === ev.stepId && line.kind === "thought" && line.live) break;
              i--;
            }

            if (i >= 0) {
              const open = p[i]!;
              const next = [...p];
              next[i] =
                ev.text === "\n"
                  ? { ...open, live: false }
                  : { ...open, text: open.text + ev.text };
              return next;
            }

            // A newline with no open line closes something already closed.
            if (ev.text === "\n") return p;

            return [
              ...p,
              {
                key: ev.stepId + ":th:" + p.length,
                stepId: ev.stepId,
                kind: "thought",
                text: ev.text,
                live: true,
              },
            ];
          });
          break;

        case "step:done":
          setStatus((p) => ({ ...p, [ev.stepId]: "done" }));
          setTrace((p) =>
            p.map((t) => (t.stepId === ev.stepId ? { ...t, live: false } : t))
          );
          break;

        case "run:done":
          completeMission(ev.missionId);
          break;

        default:
          break;
      }
    }
  }, [selected, reset, completeMission]);

  const done = hydrated && completed.includes(selected.id);
  const totalCost = selected.steps.reduce((a, b) => a + b.cost, 0);

  return (
    <section id="console" className="plate">
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 04</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">MISSION CONSOLE</h2>
        <p className="plate-sub" style={{ marginBottom: "var(--s-6)" }}>
          Pick a mission and dispatch it. The plan is a directed graph, not a script —
          independent steps run concurrently, interleave their traces, and finish out of
          order. Tool calls are real; <code>github.repo</code> queries the public API live.
        </p>

        <div className={s.console}>
          <div className={s.bar}>
            <span className={s.barDots}>
              <span className={s.dot} data-live={running} />
              <span className={s.dot} />
              <span className={s.dot} />
            </span>
            <span>foundry/runtime — {selected.code}</span>
            <span>{running ? "EXECUTING" : done ? "COMPLETE" : "IDLE"}</span>
          </div>

          <div className={s.missions}>
            {missions.map((m) => {
              const isDone = hydrated && completed.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={s.mission}
                  data-active={m.id === selected.id}
                  onClick={() => select(m)}
                >
                  <span className={s.mCode}>
                    <span>{m.code}</span>
                    <span className={isDone ? s.mDone : undefined}>
                      {isDone ? "◆ DONE" : "+" + m.xp + " XP"}
                    </span>
                  </span>
                  <span className={s.mTitle}>{m.title}</span>
                  <span className={s.mObj}>{m.reveals}</span>
                </button>
              );
            })}
          </div>

          <div className={s.stage}>
            <div className={s.brief}>
              <div className={s.briefTop}>
                <span className={s.briefTitle}>{selected.title}</span>
                <span className="micro dim">
                  {selected.steps.length} steps · {levels.length} stages · ~{totalCost} tok
                </span>
              </div>
              <p className={s.briefObj}>{selected.objective}</p>
            </div>

            <div className={s.graph}>
              <div className={s.levels}>
                {levels.map((ids, li) => (
                  <div key={li} style={{ display: "contents" }}>
                    {li > 0 && (
                      <div className={s.connector} aria-hidden="true">
                        →
                      </div>
                    )}
                    <div className={s.level}>
                      {ids.map((id) => {
                        const step = stepById[id]!;
                        const agent = agentsById[step.agent];
                        const st = status[id] ?? "pending";
                        return (
                          <div
                            key={id}
                            className={s.node}
                            data-status={st}
                            style={{ color: agent.color }}
                          >
                            <div className={s.nodeTop}>
                              <span style={{ color: agent.color }}>{agent.callsign}</span>
                              <span className={s.nodeState}>
                                {st === "done" ? "◆" : st === "running" ? "◈" : "◇"}
                              </span>
                            </div>
                            <div className={s.nodeAction}>{step.action}</div>
                            <div className={s.nodeTool}>{step.tool}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${s.trace} scroll-y`} ref={traceEl} aria-live="polite" aria-atomic="false">
              {trace.length === 0 ? (
                <div className={s.empty}>
                  <span>foundry/runtime idle.</span>
                  <span>
                    Dispatch {selected.code} to watch {selected.steps.length} agents plan,
                    call their tools, and stream back what they found.
                  </span>
                </div>
              ) : (
                trace.map((t) => {
                  const agent = agentsById[stepById[t.stepId]!.agent];
                  return (
                    <div key={t.key} className={s.traceLine}>
                      <span className={s.who} style={{ color: agent.color }}>
                        {agent.callsign}
                      </span>
                      <span
                        className={[
                          s.what,
                          t.kind === "tool" ? s.toolLine : "",
                          t.kind === "result" ? s.okLine : "",
                          t.kind === "thought" ? s.thought : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {t.text}
                        {t.live && <span className={s.caret} />}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className={s.foot}>
              <div className={s.stats}>
                <span>
                  TOKENS <b>{tokens}</b>
                </span>
                <span>
                  ELAPSED <b>{(elapsed / 1000).toFixed(1)}s</b>
                </span>
                <span>
                  STEPS{" "}
                  <b>
                    {Object.values(status).filter((x) => x === "done").length}/
                    {selected.steps.length}
                  </b>
                </span>
              </div>

              <div className="row">
                {running ? (
                  <button type="button" className="btn" onClick={reset}>
                    Abort
                  </button>
                ) : (
                  <button type="button" className="btn btn--primary" onClick={execute}>
                    {done ? "Re-run " + selected.code : "Dispatch " + selected.code}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
