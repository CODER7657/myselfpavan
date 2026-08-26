/**
 * Refuses to publish a snapshot that would take work off the site.
 *
 *   node --experimental-strip-types tools/verify-evidence.mjs [--allow]
 *
 * The collector already retries and carries a failed repository forward, so
 * most bad snapshots never get this far. This is the second line, and it exists
 * because the failure it guards against is invisible: a snapshot where a
 * repository has quietly lost its files scores lower, looks entirely plausible,
 * and withdraws real cards from the vault. By the time anyone notices, it is
 * deployed.
 *
 * So the new snapshot is compared against the one currently committed, and the
 * run stops if anything moved in a way work cannot actually move:
 *
 *   - a repository that was there and is now missing
 *   - the collection shrinking by more than a repository or two
 *   - a score collapsing while the repository itself did not change
 *
 * That last rule is the important one. A score is allowed to fall — that is
 * the entire point of a gate — but it falls because somebody changed something.
 * A fall with no push behind it and no change of topics is not a demotion, it
 * is a bad read.
 *
 * `--allow` publishes anyway, for the case where the collapse is real.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assess } from "../packages/assay/src/rubric.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const TRACKED = "apps/web/public/data/evidence.json";
const EVIDENCE = resolve(REPO_ROOT, TRACKED);

/** A fall this big with nothing behind it is a bad read, not a demotion. */
const COLLAPSE = 15;
/** Losing more than this many repositories at once is a collection failure. */
const SHRINK = 2;

const allow = process.argv.includes("--allow");

if (!existsSync(EVIDENCE)) {
  console.error("No evidence to verify.");
  process.exit(1);
}

const now = JSON.parse(readFileSync(EVIDENCE, "utf8"));

/* The committed snapshot, read from git rather than from disk — disk is what
   the collector has just overwritten. */
let before = null;
try {
  const raw = execFileSync("git", ["show", "HEAD:" + TRACKED], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  before = JSON.parse(raw);
} catch {
  console.log("No committed evidence to compare against — nothing to verify.");
  process.exit(0);
}

const wasByName = new Map(before.repos.map((r) => [r.name.toLowerCase(), r]));
const nowByName = new Map(now.repos.map((r) => [r.name.toLowerCase(), r]));

const complaints = [];

/* ── the collection did not shrink ────────────────────────────────────────── */

const missing = [...wasByName.keys()].filter((k) => !nowByName.has(k));
if (missing.length > 0) {
  complaints.push(
    missing.length + " repositor" + (missing.length === 1 ? "y" : "ies") +
      " vanished from the snapshot: " + missing.join(", ") +
      ". A repository that still exists cannot disappear from a good collection."
  );
}

const shrank = before.repos.length - now.repos.length;
if (shrank > SHRINK) {
  complaints.push(
    "the collection shrank by " + shrank + " repositories (" +
      before.repos.length + " → " + now.repos.length + ")."
  );
}

/* ── no score collapsed without the repository changing ───────────────────── */

const sameTopics = (a, b) =>
  [...(a.topics ?? [])].sort().join(",") === [...(b.topics ?? [])].sort().join(",");

const collapses = [];

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
        .map(
          (c) =>
            "      " + c.name + ": " + c.wasScore + " → " + c.nowScore +
            "  (−" + c.drop + ")   " + c.detail
        )
        .join("\n")
  );
}

/* ── verdict ──────────────────────────────────────────────────────────────── */

const carried = now.carriedForward ?? [];
if (carried.length > 0) {
  console.log(
    "Note: " + carried.length + " entr" + (carried.length === 1 ? "y is" : "ies are") +
      " carried forward from the last run (" + carried.join(", ") + ")."
  );
}

if (complaints.length === 0) {
  console.log(
    "Evidence verified: " + now.repos.length + " repositories, nothing collapsed."
  );
  process.exit(0);
}

console.error("This snapshot would remove work from the site.\n");
for (const c of complaints) console.error("  - " + c);

if (allow) {
  console.error("\n--allow was passed, so it is being published anyway.");
  process.exit(0);
}

console.error(
  "\nNothing has been published. If the collapse is real — files genuinely " +
    "deleted,\na repository genuinely emptied — re-run with --allow. Otherwise " +
    "press the button\nagain: this is almost always a bad read of the API."
);
process.exit(1);
