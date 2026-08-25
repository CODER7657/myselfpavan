import { projects, type AgentId, type Project } from "@foundry/content";
import type { Assay } from "@foundry/assay";

/**
 * Marries the hand-written cards to the live assay.
 *
 * Two things happen here, and both exist so the vault stops being a snapshot
 * of the day it was written:
 *
 *   1. A curated card takes its rank and its numbers from the assay. Improve
 *      a repository — add tests, wire up CI, tag a release — and its tier
 *      moves on the next refresh without anyone editing this site.
 *
 *   2. A repository that clears the gate but has no card yet gets one
 *      synthesised from its own evidence. It reads plainly rather than
 *      pretending to prose it does not have, and it is labelled as generated,
 *      because a card written by a script should say so.
 */

/** Which curated card corresponds to which repository. */
const CARD_TO_REPO: Record<string, string> = {
  pramana: "pramana",
  complylite: "complylite",
  globetrotter: "globetrotter",
  "pocso-shield": "CRAFTATHON",
  vortifi: "VortiFi",
  veriserve: "VeriServe_block",
  "mental-wellness": "genex-prj",
  "sole-vault": "shoes.store",
};

/** Cards with no repository of their own — an upstream filing, private work. */
const NO_REPO = new Set(["ap2-findings", "raksha-ai"]);

/* ── inference for generated cards ────────────────────────────────────────── */

const AGENT_BY_SIGNAL: { test: RegExp; agent: AgentId }[] = [
  { test: /solidity|hardhat|contract|chain|web3|ethereum|blockchain/i, agent: "ledger" },
  { test: /security|crypto|auth|verif|policy|compliance|fraud|audit/i, agent: "warden" },
  { test: /\b(ml|ai|model|llm|agent|nlp|vision|tensorflow|pytorch)\b/i, agent: "oracle" },
  { test: /sql|postgres|database|pipeline|infra|docker|kubernetes/i, agent: "atlas" },
  { test: /react|next|vue|svelte|css|ui|frontend|android|mobile/i, agent: "forge" },
];

function inferAgent(a: Assay): AgentId {
  const haystack = [
    a.name,
    a.evidence.description ?? "",
    a.evidence.topics.join(" "),
    a.evidence.language ?? "",
  ].join(" ");

  for (const rule of AGENT_BY_SIGNAL) {
    if (rule.test.test(haystack)) return rule.agent;
  }
  return "forge";
}

function bandScore(a: Assay, id: string): number {
  const b = a.bands.find((x) => x.id === id);
  if (!b || b.max === 0) return 0;
  return Math.round((b.earned / b.max) * 100);
}

function titleCase(name: string): string {
  return name
    .replace(/[-_.]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toUpperCase();
}

/** A sentence about the shape of the repository, built only from what was observed. */
function describeStructure(a: Assay): string {
  const has = (id: string) =>
    a.bands.some((b) => b.signals.some((s) => s.id === id && s.earned > 0));

  const parts: string[] = [];
  if (has("tests")) parts.push("a test suite");
  if (has("ci")) parts.push("continuous integration");
  if (has("container")) parts.push("a containerised environment");
  if (has("docs")) parts.push("extended documentation");
  if (has("releases")) parts.push("a tagged release");

  if (parts.length === 0) {
    return "No tests, CI or release are visible yet, which is most of what is holding its score down.";
  }

  const last = parts.pop() as string;
  const list = parts.length ? parts.join(", ") + " and " + last : last;
  return "Ships with " + list + ".";
}

function synthesise(a: Assay): Project {
  const agent = inferAgent(a);
  const languages = a.evidence.topics.length
    ? a.evidence.topics.slice(0, 6)
    : [a.evidence.language ?? "Mixed"];

  const commits = a.evidence.commits;
  const pushed = a.evidence.pushedAt.slice(0, 10);

  return {
    slug: "auto-" + a.name.toLowerCase(),
    name: titleCase(a.name),
    classification: "Auto-assayed",
    tagline: a.evidence.description ?? "No description set on the repository.",
    /*
     * The README's opening paragraph beats the one-line GitHub description:
     * it is the author explaining the thing in their own words, which is the
     * closest an auto-generated card can get to being written.
     */
    plain:
      a.evidence.readmeLede ??
      a.evidence.description ??
      "Generated from the repository itself — it carries no description or README prose yet.",
    summary:
      "Promoted automatically by the assay at " +
      Math.round(a.score) +
      "/100. " +
      describeStructure(a) +
      " " +
      commits +
      " commit" +
      (commits === 1 ? "" : "s") +
      ", last pushed " +
      pushed +
      ".",
    highlight:
      a.nextSteps.length > 0
        ? "Written by a script, not by hand. To raise it: " +
          a.nextSteps[0]!.charAt(0).toLowerCase() +
          a.nextSteps[0]!.slice(1)
        : "Written by a script, not by hand — it cleared every signal the rubric checks.",
    rarity: a.tier,
    agent,
    stack: languages,
    metrics: [
      { label: "Assay score", value: Math.round(a.score) + "/100" },
      { label: "Commits", value: String(commits) },
      { label: "Last push", value: pushed },
      { label: "Origin", value: "Auto-generated" },
    ],
    repo: a.url,
    demo: null,
    year: Number(a.evidence.pushedAt.slice(0, 4)) || new Date().getFullYear(),
    stats: {
      depth: bandScore(a, "depth"),
      rigor: bandScore(a, "verification"),
      surface: bandScore(a, "completeness"),
      novelty: bandScore(a, "shipped"),
    },
  };
}

/* ── the join ─────────────────────────────────────────────────────────────── */

export interface LiveProject extends Project {
  /** Present once the assay has graded this project's repository. */
  assay?: Assay;
  /** True when the whole card was generated rather than written. */
  generated?: boolean;
}

/**
 * Curated cards first, in their authored order, then anything the assay
 * promoted that nobody has written up. Ranks come from the assay wherever
 * one exists, so the vault reorders itself as the work improves.
 */
export function joinProjects(byName: Map<string, Assay>): LiveProject[] {
  const claimed = new Set<string>();

  const curated: LiveProject[] = projects.map((p) => {
    if (NO_REPO.has(p.slug)) return p;

    const repoName = CARD_TO_REPO[p.slug];
    const assay = repoName ? byName.get(repoName.toLowerCase()) : undefined;
    if (!assay) return p;

    claimed.add(repoName!.toLowerCase());

    /* Live numbers replace the ones typed in by hand. */
    const metrics = p.metrics.map((m) =>
      /^commits$/i.test(m.label) ? { ...m, value: String(assay.evidence.commits) } : m
    );

    return {
      ...p,
      metrics,
      rarity: assay.tier,
      assay,
    };
  });

  const generated: LiveProject[] = [...byName.values()]
    .filter((a) => a.verdict === "promoted" && !claimed.has(a.name.toLowerCase()))
    .sort((x, y) => y.score - x.score)
    .map((a) => ({ ...synthesise(a), assay: a, generated: true }));

  return [...curated, ...generated];
}
