import { projects, type AgentId, type Project } from "@foundry/content";
import type { WrittenCard } from "@/lib/useCards";
import {
  CARD_TO_REPO,
  READY_TOPIC,
  HIDE_TOPIC,
  NO_REPO,
  compareVault,
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
/**
 * A deployment link, but only if it is one.
 *
 * `homepage` is free text on GitHub: people put "coming soon", a bare domain,
 * or an npm page in it. Anything that is not a real https URL is not a demo,
 * and must never reach an href.
 */
function demoUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * What this is built with, in the order a reader cares about.
 *
 * Languages come from GitHub's own byte counts, so they are real regardless of
 * whether anyone remembered to set topics — which, on most of these
 * repositories, nobody has. Topics are added after, because when they do exist
 * they name frameworks the language list cannot see.
 */
function stackOf(a: Assay): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (v: string | null | undefined) => {
    const t = (v ?? "").trim();
    if (!t || t.length > 24) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const l of a.evidence.languages) add(l);
  /* The gate's own topic is plumbing, not a technology: "Foundry-ready" was
     turning up in the stack beside Python and TypeScript. */
  for (const t of a.evidence.topics) {
    if (t === READY_TOPIC || t === HIDE_TOPIC) continue;
    add(prettyTopic(t));
  }
  if (out.length === 0) add(a.evidence.language ?? "Mixed");

  return out.slice(0, 7);
}

/** `offline-first` reads better as `Offline-first` next to `TypeScript`. */
function prettyTopic(t: string): string {
  if (/^[a-z0-9]+$/.test(t) && t.length <= 4) return t.toUpperCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Four facts about the project, not four facts about the assay.
 *
 * A curated card shows things like "671 passing" and "Apache-2.0" — the
 * specifics somebody would ask about. The generated card used to show its own
 * score, its commit count and the words "Auto-generated", which tells a reader
 * nothing they cannot see from the band at the top. These are drawn from the
 * strongest signals the repository actually has, so a well-built project shows
 * its tests and its licence, and a thin one honestly shows less.
 */
function metricsOf(a: Assay): { label: string; value: string }[] {
  const e = a.evidence;
  const out: { label: string; value: string }[] = [];

  if (e.testFiles > 0) out.push({ label: "Tests", value: e.testFiles + " files" });
  if (e.hasCi) out.push({ label: "CI", value: e.hasCoverage ? "With coverage" : "Configured" });
  if (e.licence) out.push({ label: "Licence", value: e.licence });
  if (e.releases > 0) {
    out.push({ label: "Releases", value: String(e.releases) });
  }
  if (e.hasContainer) out.push({ label: "Container", value: "Dockerised" });
  if (e.docFiles > 0) out.push({ label: "Docs", value: e.docFiles + " pages" });
  if (e.sourceFiles > 0) out.push({ label: "Source", value: e.sourceFiles + " files" });

  out.push({ label: "Commits", value: String(e.commits) });
  if (e.language) out.push({ label: "Language", value: e.language });

  return out.slice(0, 4);
}

/**
 * What kind of thing this is, when no model has written a better line.
 *
 * "Auto-assayed" described how the card was made rather than what the project
 * is, which is the one thing a classification is for.
 */
function classifyFallback(a: Assay): string {
  const e = a.evidence;
  const hay = [a.name, e.description ?? "", e.topics.join(" "), e.readmeLede ?? ""].join(" ");

  /*
   * Ordered most specific first. The word boundaries matter: without them
   * "ai" matches inside "chain" and "detail", and everything classifies as
   * machine learning.
   */
  if (/\b(contract|on-chain|web3|solidity|blockchain)\b/i.test(hay)) return "On-chain System";
  if (/\b(ml|ai|llm|nlp|inference|agent)\b/i.test(hay)) return "Applied ML";
  if (/\b(cli|command-line|terminal)\b/i.test(hay)) return "Command-line Tool";
  if (/\b(dashboard|portal|console|admin)\b/i.test(hay)) return "Interface";
  if (/\b(api|server|backend|service|microservice)\b/i.test(hay)) return "Service";
  if (/\b(app|mobile|android|ios|flutter)\b/i.test(hay)) return "Application";
  if (e.homepage) return "Deployed Project";
  return "Repository";
}

/**
 * Splits a README lede into its opening sentence and the rest.
 *
 * Both halves are used, and they must not be the same text: taking the first
 * sentence for the tagline and the whole lede for the plain line put the same
 * words on the card twice, once truncated with an ellipsis.
 */
function splitLede(lede: string | null): { head: string; rest: string } | null {
  if (!lede) return null;

  const whole = lede.trim().replace(/\s+/g, " ");
  const m = /^(.{20,}?[.!?])(?:\s+|$)/.exec(whole);
  if (!m) return { head: clip(whole, 96), rest: "" };

  return { head: clip(m[1]!, 96), rest: whole.slice(m[0].length).trim() };
}

const clip = (v: string, n: number): string =>
  v.length <= n ? v : v.slice(0, n - 1).trimEnd() + "…";
/**
 * The card for a private repository nobody has written up.
 *
 * It can only say what the sealed grade carries — the score, the tier, the
 * commit count, the last push and the shape of the bands — because anything
 * more would be describing private code in public. So it says exactly that,
 * and says why, rather than padding the gap with invented prose.
 */
function sealedCard(a: Assay): Project {
  const pushed = a.evidence.pushedAt.slice(0, 10);
  return {
    slug: "sealed-" + a.name.toLowerCase(),
    name: titleCase(a.name),
    classification: "Private Work",
    tagline: "Graded from a private repository.",
    plain:
      "The code is private, so this card carries the grade and nothing else: " +
      "no description, no stack, no link. The score is the same rubric every " +
      "public repository here is measured by.",
    summary:
      "Scored " + Math.round(a.score) + "/100 from its source by the assay, which " +
      "read it with the owner’s own access and published only the result. " +
      a.evidence.commits + " commits, last pushed " + pushed + ".",
    highlight:
      "Made public, it would be graded from its full evidence and this card would " +
      "fill in on the next run with nothing to edit.",
    rarity: a.tier,
    agent: "cipher",
    stack: ["Private"],
    metrics: [
      { label: "Assay score", value: Math.round(a.score) + "/100" },
      { label: "Commits", value: String(a.evidence.commits) },
      { label: "Last push", value: pushed },
      { label: "Source", value: "Private" },
    ],
    /* No link: a private repository is a 404 for every visitor. */
    repo: null,
    demo: null,
    year: Number(pushed.slice(0, 4)) || new Date().getFullYear(),
    stats: {
      depth: bandScore(a, "depth"),
      rigor: bandScore(a, "verification"),
      surface: bandScore(a, "completeness"),
      novelty: bandScore(a, "shipped"),
    },
  };
}

function synthesise(a: Assay, written?: WrittenCard): Project {
  if (a.sealed) return sealedCard(a);

  const e = a.evidence;
  const commits = e.commits;
  const pushed = e.pushedAt.slice(0, 10);

  /*
   * Every field falls back through the same order: what a model wrote, then
   * what the author wrote on GitHub, then what the README says, then a plain
   * statement of what was observed. Only the last of those is a template, and
   * it is reached only when a repository carries no prose at all.
   */
  const lede = splitLede(e.readmeLede);

  const tagline =
    written?.tagline ??
    e.description ??
    lede?.head ??
    titleCase(a.name) + " — no description set on the repository.";

  /*
   * When the tagline came from the README's first sentence, the plain line
   * picks up from the second — otherwise the card says the same thing twice.
   */
  const plain =
    written?.plain ??
    /* A description on GitHub and a README are two different sentences, so
       both can be shown. */
    (e.description ? e.readmeLede ?? e.description : null) ??
    /* Only a README: its first sentence is already the tagline, so this takes
       the second onwards. */
    (lede && lede.rest.length > 60 ? lede.rest : null) ??
    /* One sentence in the whole repository. Saying it twice, once truncated,
       is worse than admitting there is no more. */
    (lede
      ? "That is the whole of what the repository says about itself. Everything below " +
        "was observed by the gate rather than written."
      : null) ??
    "The repository carries no description or README prose, so there is nothing here " +
      "that was written by hand — only what the gate could observe.";

  return {
    slug: "auto-" + a.name.toLowerCase(),
    name: titleCase(a.name),
    classification: written?.classification ?? classifyFallback(a),
    tagline,
    plain,
    summary:
      written?.summary ??
      "Promoted by the assay at " + Math.round(a.score) + "/100. " +
        describeStructure(a) + " " + commits + " commit" + (commits === 1 ? "" : "s") +
        ", last pushed " + pushed + ".",
    highlight:
      written?.highlight ??
      (a.nextSteps.length > 0
        ? "Written by a script, not by hand. To raise it: " +
          a.nextSteps[0]!.charAt(0).toLowerCase() +
          a.nextSteps[0]!.slice(1)
        : "Written by a script, not by hand — it cleared every signal the rubric checks."),
    rarity: a.tier,
    agent: inferAgent(a),
    stack: stackOf(a),
    metrics: metricsOf(a),
    repo: a.url,
    demo: demoUrl(e.homepage),
    year: Number(e.pushedAt.slice(0, 4)) || new Date().getFullYear(),
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
  /**
   * True while the evidence is still loading, or could not be loaded at all.
   * The card shows what was written about it and makes no claim about a rank.
   */
  pending?: boolean;
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
  written?: Map<string, WrittenCard>,
  graded: boolean = true
): Catalogue {
  /*
   * Before the snapshot arrives there are no verdicts, and a card must not be
   * made to answer for that. Reporting every project as unreachable while a
   * fetch is in flight put "Repository is private, so the gate cannot reach it
   * yet" on the face of PRAMANA — which is public — on every page load, and
   * left it there permanently whenever evidence.json could not be served.
   *
   * An ungraded pass therefore renders the authored cards as authored, marked
   * pending, and claims nothing about a gate that has not run.
   */
  if (!graded) {
    return {
      vault: projects
        .map((p) => ({ ...p, pending: true, sortScore: anchorFor(p.rarity) }))
        .sort(compareVault),
      withdrawn: [],
    };
  }

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

  /*
   * A card that was waiting for its repository binds to it the moment it
   * appears.
   *
   * RAKSHA AI is written up but carries no repository, because the work is
   * private. Make it public and the gate promotes it — and without this it
   * would arrive as a *second*, generated card sitting next to the written
   * one, both describing the same project. Matching on the name, flattened,
   * means the written card simply starts being graded instead: no mapping to
   * remember, no edit to make.
   */
  const flatten = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const waiting = new Map<string, number>();
  vault.forEach((p, i) => {
    if (!p.provisional) return;
    waiting.set(flatten(p.name), i);
    waiting.set(flatten(p.slug), i);
  });

  /* Anything the gate promoted that nobody has written up gets a card of its own. */
  for (const a of byName.values()) {
    if (a.verdict !== "promoted") continue;
    if (claimed.has(a.name.toLowerCase())) continue;

    const prose = written?.get(a.name.toLowerCase());

    /* Does a written card already describe this repository by name? */
    const waitingAt = waiting.get(flatten(a.name));
    if (waitingAt !== undefined) {
      const card = vault[waitingAt]!;
      vault[waitingAt] = {
        ...card,
        rarity: a.tier,
        assay: a,
        movement: movedBy(a),
        sortScore: a.score,
        provisional: false,
        provisionalReason: undefined,
        metrics: card.metrics.map((m) =>
          /^commits$/i.test(m.label) ? { ...m, value: String(a.evidence.commits) } : m
        ),
        demo: card.demo ?? demoUrl(a.evidence.homepage),
      };
      claimed.add(a.name.toLowerCase());
      continue;
    }

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
   * The six flagships lead in one fixed order, the same on the profile and
   * the portfolio. After them position is earned — a card that improves climbs
   * past one that has not, on the next refresh, with nobody reordering it.
   */
  vault.sort(compareVault);
  withdrawn.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));

  return { vault, withdrawn };
}
