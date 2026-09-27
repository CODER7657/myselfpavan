/**
 * Prints what the assay decided, as markdown.
 *
 *   node --experimental-strip-types tools/assay-summary.ts
 *
 * The workflow pipes this into the run summary, so pressing the button tells
 * you the outcome — what was promoted, what moved, what was withdrawn — without
 * opening the site. It reads the same files the site does and scores with the
 * same rubric, so it cannot report something the page will not show.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assess, PROMOTION_FLOOR, RUBRIC_VERSION } from "../packages/assay/src/rubric.ts";
import { movementFor, placementFor } from "../packages/assay/src/placement.ts";
import type { RepoEvidence } from "../packages/assay/src/types.ts";
import { withSealed, type SealedRecord } from "../packages/assay/src/sealed.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, "../apps/web/public/data");

const evidence = JSON.parse(readFileSync(resolve(DATA, "evidence.json"), "utf8")) as {
  collectedAt: string;
  owner: string;
  apiCalls: number;
  repos: RepoEvidence[];
};

const standingsPath = resolve(DATA, "standings.json");
const standings = existsSync(standingsPath)
  ? (JSON.parse(readFileSync(standingsPath, "utf8")) as {
      previous: { ranAt: string; scores: Record<string, number> } | null;
    })
  : null;

const previous = new Map(
  Object.entries(standings?.previous?.scores ?? {}).map(([n, s]) => [n.toLowerCase(), s])
);

const sealedPath = resolve(DATA, "sealed.json");
const sealed: SealedRecord[] = existsSync(sealedPath)
  ? ((JSON.parse(readFileSync(sealedPath, "utf8")) as { records?: SealedRecord[] }).records ?? [])
  : [];

const all = withSealed(evidence.repos.map((r) => assess(r)), sealed)
  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

const promoted = all.filter((a) => a.verdict === "promoted");
const held = all.filter((a) => a.verdict === "held");
const notReady = all.filter((a) => a.verdict === "not-ready");
const excluded = all.filter((a) => a.verdict === "excluded");

const out: string[] = [];
const say = (line = "") => out.push(line);

const arrow = (a: (typeof all)[number]) => {
  const m = previous.size ? movementFor(a.score, previous.get(a.name.toLowerCase())) : null;
  if (!m) return "";
  if (m.isNew) return " **new**";
  return " " + (m.delta > 0 ? "▲ +" : "▼ ") + m.delta + (m.from ? " _" + m.from + " → " + m.to + "_" : "");
};

say("## Assay");
say();
say(
  "Rubric " + RUBRIC_VERSION + " · floor " + PROMOTION_FLOOR + " · " +
    evidence.repos.length + " repositories in " + evidence.apiCalls + " API calls · collected " +
    evidence.collectedAt.slice(0, 16).replace("T", " ") + " UTC"
);
say();

say("### In the vault — " + promoted.length);
say();
say("| Score | Tier | Repository | Movement |");
say("|---:|---|---|---|");
for (const a of promoted) {
  say("| " + a.score + " | " + a.tier + " | [" + a.name + "](" + a.url + ") |" + (arrow(a) || " — ") + " |");
}
say();

if (held.length) {
  say("### Withdrawn — below the floor of " + PROMOTION_FLOOR);
  say();
  for (const a of held) {
    const route = placementFor(a).route;
    say("- **" + a.name + "** — " + a.score + "/100." + (route ? " " + route : ""));
  }
  say();
}

if (notReady.length) {
  say("### Hidden — " + notReady.length);
  say();
  say(
    "Kept out on purpose with the foundry-hide topic, or private without foundry-ready. " +
      notReady
        .slice(0, 12)
        .map((a) => "`" + a.name + "`")
        .join(", ") +
      (notReady.length > 12 ? " and " + (notReady.length - 12) + " more" : "") +
      "."
  );
  say();
}

say("_" + excluded.length + " excluded as forks, archives, coursework or infrastructure._");

console.log(out.join("\n"));
