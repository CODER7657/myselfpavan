"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { profile, projects, skillTree, timeline, credentials } from "@foundry/content";
import { searchIndex } from "@foundry/agent-engine";
import { useFoundry } from "@/lib/store";
import sh from "./Shell.module.css";

interface Line {
  id: number;
  kind: "in" | "out" | "err";
  text: string;
}

const BANNER = [
  "foundry shell — type `help`, or click a suggestion below.",
];

const SUGGESTIONS = ["help", "whoami", "projects", "find payments", "awards", "contact"];

/**
 * A real command console over the same index the agents query. Kept small on
 * purpose: six or so commands that each answer a question a visitor might
 * genuinely have, rather than a fake shell with a hundred stubs.
 */
export function Shell() {
  const [lines, setLines] = useState<Line[]>(
    BANNER.map((text, id) => ({ id, kind: "out" as const, text }))
  );
  const [value, setValue] = useState("");
  const seq = useRef(BANNER.length);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useRef<string[]>([]);
  const histIdx = useRef(-1);

  const markTerminalUsed = useFoundry((st) => st.markTerminalUsed);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  const emit = useCallback((kind: Line["kind"], text: string) => {
    setLines((p) => [...p, { id: seq.current++, kind, text }]);
  }, []);

  const run = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;

      emit("in", cmd);
      history.current.unshift(cmd);
      histIdx.current = -1;
      markTerminalUsed();

      const [head, ...rest] = cmd.split(/\s+/);
      const arg = rest.join(" ");

      switch ((head ?? "").toLowerCase()) {
        case "help":
          emit("out", "whoami          who this is and what he does");
          emit("out", "projects        list the indexed builds");
          emit("out", "open <name>     open a project's repository");
          emit("out", "skills          top capabilities by level");
          emit("out", "education       degrees, in progress");
          emit("out", "awards          competitive results and appointments");
          emit("out", "find <query>    search everything on this page");
          emit("out", "contact         how to reach him");
          emit("out", "clear           clear the screen");
          break;

        case "whoami":
          emit("out", profile.name + " — " + profile.title);
          emit("out", profile.location + " · " + profile.status);
          emit("out", "");
          emit("out", profile.plain[0] ?? "");
          break;

        case "projects":
          for (const p of projects) {
            emit(
              "out",
              p.name.padEnd(20) + p.rarity.padEnd(11) + (p.private ? "private" : p.repo ? "public" : "—")
            );
          }
          emit("out", "");
          emit("out", projects.length + " indexed. `open <name>` to visit one.");
          break;

        case "open": {
          if (!arg) {
            emit("err", "usage: open <name>");
            break;
          }
          const hit = projects.find(
            (p) =>
              p.slug.toLowerCase() === arg.toLowerCase() ||
              p.name.toLowerCase().includes(arg.toLowerCase())
          );
          if (!hit) emit("err", "no project matching " + JSON.stringify(arg));
          else if (!hit.repo) emit("err", hit.name + " is private — happy to walk through it on request.");
          else {
            emit("out", "opening " + hit.repo);
            window.open(hit.repo, "_blank", "noopener");
          }
          break;
        }

        case "skills": {
          const top = [...skillTree].sort((a, b) => b.level - a.level).slice(0, 8);
          for (const s of top) emit("out", String(s.level).padStart(3) + "  " + s.label);
          break;
        }

        case "education":
          for (const t of timeline.filter((x) => x.kind === "education")) {
            emit("out", t.period + "  " + t.title);
            emit("out", "".padEnd(t.period.length + 2) + t.org);
          }
          break;

        case "awards":
          for (const c of credentials) {
            emit("out", c.issued.padEnd(16) + c.name);
            emit("out", "".padEnd(16) + c.issuer + " — " + c.detail);
          }
          break;

        case "find": {
          if (!arg) {
            emit("err", "usage: find <query>");
            break;
          }
          const hits = searchIndex(arg, 6);
          if (!hits.length) emit("err", "nothing matched " + JSON.stringify(arg));
          else
            for (const h of hits) {
              emit("out", h.score.toFixed(1).padStart(6) + "  " + h.kind.padEnd(10) + h.id);
            }
          break;
        }

        case "contact":
          emit("out", "email     " + profile.email);
          emit("out", "github    " + profile.github);
          emit("out", "linkedin  " + profile.linkedin);
          emit("out", "x         " + profile.x);
          break;

        case "clear":
          setLines([]);
          break;

        default:
          emit("err", "command not found: " + head + " — try `help`");
      }
    },
    [emit, markTerminalUsed]
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(value);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx.current < history.current.length - 1) histIdx.current++;
      setValue(history.current[histIdx.current] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx.current > 0) histIdx.current--;
      else histIdx.current = -1;
      setValue(histIdx.current === -1 ? "" : (history.current[histIdx.current] ?? ""));
    }
  };

  return (
    <section id="shell" className="plate">
      <div className="wrap">
        <div className="plate-head">
          <span className="plate-num">PLATE 08</span>
          <span className="plate-rule" />
        </div>
        <h2 className="plate-title">CONSOLE</h2>
        <p className="plate-sub">
          The same index the agents search, exposed directly. If you would rather type than
          scroll, everything on this page is reachable from here.
        </p>

        <div className={sh.term}>
          <div className={sh.bar}>
            <span>pavan@foundry — shell</span>
            <span>{lines.length} lines</span>
          </div>

          <div className={`${sh.body} scroll-y`} ref={bodyRef} onClick={() => inputRef.current?.focus()}>
            {lines.map((l) => (
              <div key={l.id} className={sh.line} data-kind={l.kind}>
                {l.kind === "in" && <span className={sh.prompt}>$</span>}
                <span className={sh.text}>{l.text || " "}</span>
              </div>
            ))}

            <form onSubmit={submit} className={sh.form}>
              <span className={sh.prompt}>$</span>
              <input
                ref={inputRef}
                className={sh.input}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
                autoComplete="off"
                aria-label="Console command"
                placeholder="type a command…"
              />
            </form>
          </div>

          <div className={sh.chips}>
            {SUGGESTIONS.map((c) => (
              <button key={c} type="button" className={sh.chip} onClick={() => run(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
