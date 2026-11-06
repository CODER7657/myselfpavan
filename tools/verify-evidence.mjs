/**
 * Refuses to publish a snapshot that would take work off the site, or put
 * private detail on it.
 *
 *   node --experimental-strip-types tools/verify-evidence.mjs [--allow]
 *
 * The rules live in packages/assay/src/snapshot.ts, where they are tested;
 * this only reads the committed and the fresh snapshot and reports.
 *
 * A repository that left the listing is fine when the collector confirmed
 * with GitHub that it really went — transferred, renamed, made private or
 * deleted. Treating every disappearance as a bad read is what froze the
 * assay for a month after roadside-app moved to the Hash-Hawks organisation.
 *
 * `--allow` publishes despite the complaints, for when a collapse is real. It
 * never overrides a privacy leak.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSealed, checkSnapshot } from "../packages/assay/src/snapshot.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const TRACKED = "apps/web/public/data/evidence.json";
const EVIDENCE = resolve(REPO_ROOT, TRACKED);
const SEALED = resolve(REPO_ROOT, "apps/web/public/data/sealed.json");

const allow = process.argv.includes("--allow");

if (!existsSync(EVIDENCE)) {
  console.error("No evidence to verify.");
  process.exit(1);
}

/* ── privacy first, and unconditionally ─────────────────────────────────── */

let sealed;
if (existsSync(SEALED)) {
  try {
    sealed = JSON.parse(readFileSync(SEALED, "utf8"));
  } catch {
    sealed = "unparseable";
  }
}
const leaks = checkSealed(sealed);
if (leaks.length > 0) {
  console.error("This would publish private detail. Nothing has been published.");
  console.error("");
  for (const l of leaks) console.error("  - " + l);
  console.error("");
  console.error("--allow does not override this. Fix tools/collect-sealed.mjs.");
  process.exit(1);
}

/* ── then the snapshot against the one already published ────────────────── */

const now = JSON.parse(readFileSync(EVIDENCE, "utf8"));

/* Read from git rather than disk: disk is what the collector just overwrote. */
let before;
try {
  before = JSON.parse(
    execFileSync("git", ["show", "HEAD:" + TRACKED], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
  );
} catch {
  console.log("No committed evidence to compare against — nothing to verify.");
  process.exit(0);
}

const { complaints, departures } = checkSnapshot(before, now);

for (const d of departures) console.log("Departed, confirmed by GitHub: " + d);

const carried = now.carriedForward ?? [];
if (carried.length > 0) {
  console.log("Note: carried forward from the last run: " + carried.join(", ") + ".");
}

if (complaints.length === 0) {
  console.log("Evidence verified: " + now.repos.length + " repositories, nothing collapsed.");
  process.exit(0);
}

console.error("This snapshot would remove work from the site.");
console.error("");
for (const c of complaints) console.error("  - " + c);
console.error("");

if (allow) {
  console.error("--allow was passed, so it is being published anyway.");
  process.exit(0);
}

console.error("Nothing has been published. If the loss is real, re-run with --allow.");
process.exit(1);
