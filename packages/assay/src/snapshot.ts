import { assess } from "./rubric.ts";
import { describeDeparture, type Departure } from "./departures.ts";
import type { RepoEvidence } from "./types";

/**
 * The rules a new evidence snapshot must pass before it is published.
 *
 * Lifted out of tools/verify-evidence.mjs so they can be tested without a git
 * repository, a filesystem or a process exit — the CLI is now a thin wrapper
 * that reads two files and prints what this returns.
 */

export interface EvidenceSnapshot {
  repos: RepoEvidence[];
  carriedForward?: string[];
  /** Repositories the collector confirmed with GitHub are really gone. */
  departed?: Departure[];
}

/** A fall this big with nothing behind it is a bad read, not a demotion. */
export const COLLAPSE = 15;
/** Losing more than this many repositories, unexplained, is a collection failure. */
export const SHRINK = 2;

export interface Collapse {
  name: string;
  wasScore: number;
  nowScore: number;
  drop: number;
  detail: string;
}

export interface SnapshotVerdict {
  /** Problems a human may judge to be real, and publish anyway with --allow. */
  complaints: string[];
  /** Confirmed departures, reported but not complained about. */
  departures: string[];
  collapses: Collapse[];
}

const sameTopics = (a: RepoEvidence, b: RepoEvidence) =>
  [...(a.topics ?? [])].sort().join(",") === [...(b.topics ?? [])].sort().join(",");

export function checkSnapshot(before: EvidenceSnapshot, now: EvidenceSnapshot): SnapshotVerdict {
  const wasByName = new Map(before.repos.map((r) => [r.name.toLowerCase(), r]));
  const nowByName = new Map(now.repos.map((r) => [r.name.toLowerCase(), r]));
  const departed = new Map((now.departed ?? []).map((d) => [d.name.toLowerCase(), d]));

  const complaints: string[] = [];

  /* ── nothing vanished without GitHub confirming why ───────────────────── */

  const missing = [...wasByName.keys()].filter((k) => !nowByName.has(k));
  const unexplained = missing.filter((k) => !departed.has(k));
  const departures = missing
    .filter((k) => departed.has(k))
    .map((k) => describeDeparture(departed.get(k)!));

  if (unexplained.length > 0) {
    complaints.push(
      unexplained.length + " repositor" + (unexplained.length === 1 ? "y" : "ies") +
        " vanished from the snapshot with no explanation from GitHub: " +
        unexplained.join(", ") +
        ". The collector asked about each one directly and was told it is still public, " +
        "under the same name — so its absence is a bad read, not a departure."
    );
  }

  /* Shrinkage is measured net of confirmed departures: three repositories made
     private in a week is a decision, not a collection failure. */
  const shrank = before.repos.length - now.repos.length - departures.length;
  if (shrank > SHRINK) {
    complaints.push(
      "the collection shrank by " + shrank + " repositories beyond those GitHub confirmed " +
        "were gone (" + before.repos.length + " → " + now.repos.length + ")."
    );
  }

  /* ── no score collapsed without the repository changing ───────────────── */

  const collapses: Collapse[] = [];

  for (const [key, fresh] of nowByName) {
    const old = wasByName.get(key);
    if (!old) continue;

    /* An entry that is openly last run's is not a new observation to compare. */
    if (fresh.carriedForward) continue;

    const wasScore = assess(old).score;
    const nowScore = assess(fresh).score;
    const drop = wasScore - nowScore;

    if (drop < COLLAPSE) continue;

    /* A push or a change of topics is a real reason for a real fall. */
    if (fresh.pushedAt !== old.pushedAt) continue;
    if (!sameTopics(fresh, old)) continue;

    collapses.push({
      name: fresh.name,
      wasScore,
      nowScore,
      drop: Math.round(drop * 10) / 10,
      detail:
        "sourceFiles " + old.sourceFiles + " → " + fresh.sourceFiles +
        ", tests " + old.testFiles + " → " + fresh.testFiles +
        ", ci " + (old.hasCi ? "yes" : "no") + " → " + (fresh.hasCi ? "yes" : "no"),
    });
  }

  if (collapses.length > 0) {
    complaints.push(
      collapses.length + " score" + (collapses.length === 1 ? "" : "s") +
        " collapsed with no push and no change of topics behind " +
        (collapses.length === 1 ? "it" : "them") + ":\n" +
        collapses
          .map((c) => "      " + c.name + ": " + c.wasScore + " → " + c.nowScore + "  (−" + c.drop + ")   " + c.detail)
          .join("\n")
    );
  }

  return { complaints, departures, collapses };
}

/* ── private grades say nothing private ─────────────────────────────────── */

export const SEALED_RECORD_KEYS: ReadonlySet<string> = new Set([
  "name", "score", "tier", "verdict", "reason", "commits", "pushedAt", "bands",
]);
export const SEALED_BAND_KEYS: ReadonlySet<string> = new Set(["id", "label", "earned", "max"]);

/**
 * Every way a sealed file could expose a private repository. Not a judgement
 * call, so unlike the complaints above nothing can override it.
 */
export function checkSealed(sealed: unknown): string[] {
  if (sealed === undefined || sealed === null) return [];
  if (typeof sealed !== "object") return ["sealed.json is not an object."];

  const records = (sealed as { records?: unknown }).records;
  if (records === undefined) return [];
  if (!Array.isArray(records)) return ["sealed.json records is not a list."];

  const leaks: string[] = [];
  for (const r of records as Record<string, unknown>[]) {
    const name = typeof r?.name === "string" ? r.name : "(unnamed)";
    const extra = Object.keys(r ?? {}).filter((k) => !SEALED_RECORD_KEYS.has(k));
    const bands = Array.isArray(r?.bands) ? (r.bands as Record<string, unknown>[]) : [];
    const bandExtra = bands.flatMap((b) => Object.keys(b ?? {}).filter((k) => !SEALED_BAND_KEYS.has(k)));

    if (extra.length || bandExtra.length) {
      leaks.push("sealed record " + name + " carries private fields: " + [...extra, ...bandExtra].join(", ") + ".");
    }
    if (/https?:\/\//i.test(JSON.stringify(r))) {
      leaks.push("sealed record " + name + " contains a URL.");
    }
  }
  return leaks;
}
