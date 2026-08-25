import { projects, type AgentId, type Project } from "@foundry/content";
import type { WrittenCard } from "@/lib/useCards";
import {
  CARD_TO_REPO,
  NO_REPO,
  movementFor,
  placementFor,
  type Assay,
  type Movement,
} from "@foundry/assay";

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

/**
 * Builds a card for a repository nobody has written up.
 *
 * `written` is the prose a model produced from this repository's own evidence,
 * committed by the assay workflow. Where it exists it replaces the five prose
 * fields and nothing else — the rank, the tier, the metrics and the bars are
 * still computed here, from the assay. A model is trusted to write a sentence
 * and never to decide a number.
 */
function synthesise(a: Assay, written?: WrittenCard): Project {
  const agent = inferAgent(a);
  const languages = a.evidence.topics.length
    ? a.evidence.topics.slice(0, 6)
    : [a.evidence.language ?? "Mixed"];

  const commits = a.evidence.commits;
  const pushed = a.evidence.pushedAt.slice(0, 10);

  return {
    slug: "auto-" + a.name.toLowerCase(),
    name: titleCase(a.name),
    classification: written?.classification ?? "Auto-assayed",
    tagline: written?.tagline ?? a.evidence.description ?? "No description set on the repository.",
    /*
     * The README's opening paragraph beats the one-line GitHub description:
     * it is the author explaining the thing in their own words, which is the
     * closest an auto-generated card can get to being written.
     */
    plain:
      written?.plain ??
      a.evidence.readmeLede ??
      a.evidence.description ??
      "Generated from the repository itself — it carries no description or README prose yet.",
    summary:
      written?.summary ??
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
      written?.highlight ??
      (a.nextSteps.length > 0
        ? "Written by a script, not by hand. To raise it: " +
          a.nextSteps[0]!.charAt(0).toLowerCase() +
          a.nextSteps[0]!.slice(1)
        : "Written by a script, not by hand — it cleared every signal the rubric checks."),
    rarity: a.tier,
    agent,
    stack: languages,
    metrics: [
      { label: "Assay score", value: Math.round(a.score) + "/100" },
      { label: "Commits", value: String(commits) },
      { label: "Last push", value: pushed },
      { label: "Origin", value: written ? "Machine-written" : "Auto-generated" },
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
  /**
   * Which model wrote the prose on a generated card, when one did. The card
   * says so on its face: a card written by a machine should admit it.
   */
  writtenBy?: string;
  /**
   * True when no assay could reach this project's repository — private work,
   * or a filing with no repository of its own. Its rank is the author's
   * estimate, and the card says so rather than passing it off as a score.
   */
  provisional?: boolean;
  /** Why it could not be graded. */
  provisionalReason?: string;
  /** How the score moved since the previous assay, where there is one to compare. */
  movement?: Movement | null;
  /** What the vault orders by. Real score where one exists. */
  sortScore: number;
}

/**
 * A card that used to be in the vault and no longer clears the gate.
 *
 * It is named rather than deleted. A portfolio that quietly drops the projects
 * that stopped measuring up is one you cannot read anything into — the whole
 * value of a gate is that it is visible when it bites.
 */
export interface WithdrawnCard {
  slug: string;
  name: string;
  url: string;
  score: number;
  reason: string;
  route: string | null;
}

export interface Catalogue {
  /** Ranked, highest first. What the grid draws. */
  vault: LiveProject[];
  /** Pulled from the grid, listed underneath it with the reason. */
  withdrawn: WithdrawnCard[];
}

/**
 * Where a card sits when the assay cannot reach its repository — private work
 * still under way, or a filing that has no repository of its own.
 *
 * Anchored to the middle of each tier's range so a hand-ranked card lands
 * among its graded peers rather than above or below all of them.
 */
const TIER_ANCHOR: Record<string, number> = {
  mythic: 87,
  legendary: 73,
  epic: 59,
  rare: 46,
  common: 34,
};

const anchorFor = (rarity: string): number => TIER_ANCHOR[rarity] ?? 34;

/** Why a given card cannot be graded, stated on the card itself. */
const PROVISIONAL_REASON: Record<string, string> = {
  "raksha-ai":
    "Private while in progress. Make it public and re-run the assay, and this rank becomes a score.",
  tradex: "Private. Will be graded once the repository is public.",
  "ap2-findings":
    "An upstream filing on Google's repository, not a repository of its own — the gate has nothing to grade.",
};

/**
 * Builds the vault from the live assay.
 *
 * Three rules, and nothing else decides what a visitor sees:
 *
 *   1. A card exists because its repository cleared the gate — curated if
 *      somebody wrote it, generated if not. Nobody adds one by editing a list.
 *   2. Its rank is the score. A repository that improves climbs past one that
 *      has not, on the next refresh, with nothing reordered by hand.
 *   3. A card whose repository stops clearing the gate is withdrawn and said
 *      to have been withdrawn.
 *
 * `previous` is the score at the last assay, keyed by lowercased repository
 * name. It is optional — with no history, cards simply show no movement.
 * `written` is the prose the workflow had a model produce for cards nobody has
 * written by hand; it is equally optional, and its absence falls back to the
 * template.
 */
export function joinProjects(
  byName: Map<string, Assay>,
  previous?: Map<string, number>,
  written?: Map<string, WrittenCard>
): Catalogue {
  const claimed = new Set<string>();
  const vault: LiveProject[] = [];
  const withdrawn: WithdrawnCard[] = [];

  const movedBy = (a: Assay): Movement | null =>
    previous ? movementFor(a.score, previous.get(a.name.toLowerCase())) : null;

  for (const p of projects) {
    /*
     * The rank on a curated card is the assay's, not the author's.
     *
     * Both used to exist: a hand-written rarity in the content, and a computed
     * tier from the gate. They disagreed — GlobeTrotter was written as epic and
     * graded legendary — and a portfolio with two ranks for the same project is
     * one you cannot rely on. The hand-written value is now only a fallback for
     * work the gate genuinely cannot see, and it is labelled when used.
     */
    if (NO_REPO.has(p.slug)) {
      vault.push({
        ...p,
        sortScore: anchorFor(p.rarity),
        provisional: true,
        provisionalReason: PROVISIONAL_REASON[p.slug] ?? "Not gradeable from a repository.",
      });
      continue;
    }

    const repoName = CARD_TO_REPO[p.slug];
    const assay = repoName ? byName.get(repoName.toLowerCase()) : undefined;
    if (!assay) {
      vault.push({
        ...p,
        sortScore: anchorFor(p.rarity),
        provisional: true,
        provisionalReason:
          PROVISIONAL_REASON[p.slug] ??
          "Repository is private, so the gate cannot reach it yet.",
      });
      continue;
    }

    claimed.add(repoName!.toLowerCase());

    /*
     * A curated card is not a permit. If the repository behind it stops
     * clearing the gate, the card comes out of the grid — the same rule that
     * let it in, applied in the other direction.
     */
    const placed = placementFor(assay);
    if (placed.placement !== "vault") {
      withdrawn.push({
        slug: p.slug,
        name: p.name,
        url: assay.url,
        score: assay.score,
        reason: placed.reason ?? assay.reason ?? "No longer clears the gate.",
        route: placed.route,
      });
      continue;
    }

    /* Live numbers replace the ones typed in by hand. */
    const metrics = p.metrics.map((m) =>
      /^commits$/i.test(m.label) ? { ...m, value: String(assay.evidence.commits) } : m
    );

    vault.push({
      ...p,
      metrics,
      rarity: assay.tier,
      assay,
      movement: movedBy(assay),
      sortScore: assay.score,
    });
  }

  /* Anything the gate promoted that nobody has written up gets a card of its own. */
  for (const a of byName.values()) {
    if (a.verdict !== "promoted") continue;
    if (claimed.has(a.name.toLowerCase())) continue;

    const prose = written?.get(a.name.toLowerCase());

    vault.push({
      ...synthesise(a, prose),
      assay: a,
      generated: true,
      writtenBy: prose?.model,
      movement: movedBy(a),
      sortScore: a.score,
    });
  }

  /*
   * Ranked, not authored-order. The whole point of the gate is that position
   * is earned — a card that improves climbs past one that has not, on the next
   * refresh, with nobody reordering anything by hand.
   */
  vault.sort((x, y) => y.sortScore - x.sortScore || x.name.localeCompare(y.name));
  withdrawn.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));

  return { vault, withdrawn };
}
