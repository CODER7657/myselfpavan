/**
 * Records where every graded repository stood, so the next run can say what
 * moved.
 *
 *   node --experimental-strip-types tools/record-standings.mjs
 *
 * The site scores in the browser and therefore only ever knows *today*. A card
 * that climbed from rare to epic looks exactly like one that was always epic,
 * which throws away the most interesting thing the gate does. This keeps one
 * previous standing — not a full history, which nobody would read — so a card
 * can show the delta that produced its current rank.
 *
 * It writes nothing when nothing moved. Recency is scored in steps rather than
 * by the day, so an unchanged repository scores identically tomorrow; a diff in
 * this file always means somebody did some work.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assess, RUBRIC_VERSION } from "../packages/assay/src/rubric.ts";
import { withSealed } from "../packages/assay/src/sealed.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, "../apps/web/public/data");
const EVIDENCE = resolve(DATA, "evidence.json");
const STANDINGS = resolve(DATA, "standings.json");

/** A score has to move by this much before it counts as having moved at all. */
const EPSILON = 0.05;

const force = process.argv.includes("--force");

/* ── read ─────────────────────────────────────────────────────────────────── */

if (!existsSync(EVIDENCE)) {
  console.error("No evidence to record. Run tools/collect-evidence.mjs first.");
  process.exit(1);
}

const { repos, collectedAt } = JSON.parse(readFileSync(EVIDENCE, "utf8"));

/* Private grades, published separately and merged in so a private repository's
   rank can move like any other. Absent or unreadable means there are none. */
function readSealed(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed?.records) ? parsed.records : [];
  } catch {
    return [];
  }
}

/*
 * Only the repositories the gate actually judges. Excluded work has no rank to
 * move, and hidden work is deliberately kept out — recording a number for
 * it here would be scoring it by the back door.
 */
const graded = withSealed(repos.map((r) => assess(r)), readSealed(resolve(DATA, "sealed.json")))
  .filter((a) => a.verdict === "promoted" || a.verdict === "held");

const scores = Object.fromEntries(
  graded
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => [a.name, a.score])
);

/* ── compare ──────────────────────────────────────────────────────────────── */

let existing = null;
if (existsSync(STANDINGS)) {
  try {
    existing = JSON.parse(readFileSync(STANDINGS, "utf8"));
  } catch {
    console.warn("standings.json is unreadable — starting a fresh one.");
  }
}

/*
 * A rubric change rewrites every number at once, and comparing a 3.0.0 score
 * against a 2.x one would report movement nobody caused. History resets.
 */
const rubricChanged = existing != null && existing.rubricVersion !== RUBRIC_VERSION;

const before = existing?.current?.scores ?? null;

function moved(a, b) {
  if (!a) return true;
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const n of names) {
    if (a[n] === undefined || b[n] === undefined) return true;
    if (Math.abs(a[n] - b[n]) >= EPSILON) return true;
  }
  return false;
}

if (!force && !rubricChanged && !moved(before, scores)) {
  console.log("Standings unchanged — " + graded.length + " repositories, nothing to write.");
  process.exit(0);
}

/* ── write ────────────────────────────────────────────────────────────────── */

const next = {
  rubricVersion: RUBRIC_VERSION,
  current: { ranAt: collectedAt, scores },
  previous: rubricChanged || !existing?.current ? null : existing.current,
};

mkdirSync(DATA, { recursive: true });
writeFileSync(STANDINGS, JSON.stringify(next, null, 2) + "\n");

if (rubricChanged) {
  console.log(
    "Rubric moved " + existing.rubricVersion + " → " + RUBRIC_VERSION +
      " — history reset, every score is now on the new rules."
  );
}

const deltas = before
  ? Object.entries(scores)
      .map(([name, score]) => [name, Math.round((score - (before[name] ?? score)) * 10) / 10])
      .filter(([, d]) => Math.abs(d) >= EPSILON)
  : [];

console.log("Recorded " + graded.length + " standings → " + STANDINGS);
for (const [name, d] of deltas) {
  console.log("  " + (d > 0 ? "▲" : "▼") + " " + name + " " + (d > 0 ? "+" : "") + d);
}
