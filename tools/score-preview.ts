/**
 * Grades the collected evidence on the command line, using the same rubric the
 * site uses — so a verdict can be checked without opening a browser.
 *
 *   node --experimental-strip-types tools/score-preview.ts [repoName]
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assess } from "../packages/assay/src/rubric.ts";
import type { RepoEvidence } from "../packages/assay/src/types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const file = resolve(HERE, "../apps/web/public/data/evidence.json");
const { repos } = JSON.parse(readFileSync(file, "utf8")) as { repos: RepoEvidence[] };

const only = process.argv[2];

if (only) {
  const found = repos.find((r) => r.name.toLowerCase() === only.toLowerCase());
  if (!found) {
    console.log("Not collected: " + only);
    process.exit(1);
  }
  const a = assess(found);
  console.log("name    : " + a.name);
  console.log("score   : " + a.score + "/100    tier: " + a.tier);
  console.log("verdict : " + a.verdict);
  console.log("reason  : " + (a.reason ?? "(promoted)"));
  console.log("\nbands");
  for (const b of a.bands) {
    console.log("  " + b.label.padEnd(16) + String(b.earned).padStart(5) + " / " + String(b.max).padEnd(4));
    for (const s of b.signals) {
      console.log(
        "      " + (s.earned >= s.max ? "+" : s.earned > 0 ? "~" : " ") + " " +
        s.label.padEnd(24) + String(s.earned).padStart(5) + "/" + String(s.max).padEnd(3) + "  " + s.detail
      );
    }
  }
  if (a.nextSteps.length) {
    console.log("\nnext steps");
    for (const n of a.nextSteps) console.log("  - " + n);
  }
} else {
  const rows = repos.map(assess).sort((x, y) => y.score - x.score);
  console.log("SCORE  TIER        VERDICT      NAME");
  for (const a of rows) {
    console.log(
      String(a.score).padStart(5) + "  " + a.tier.padEnd(11) + " " +
      a.verdict.padEnd(12) + " " + a.name
    );
  }
  const by = (v: string) => rows.filter((r) => r.verdict === v).length;
  console.log(
    "\npromoted " + by("promoted") + " | held " + by("held") +
    " | not-ready " + by("not-ready") + " | excluded " + by("excluded")
  );
}
