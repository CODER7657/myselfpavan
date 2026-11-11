import type { Assay, Rarity, Verdict } from "./types";

/**
 * A private repository's grade, with the evidence left behind.
 *
 * Written by tools/collect-sealed.mjs, which reads private work with the
 * owner's token, scores it in the same process, and publishes only this. There
 * is no description, README, topic, language, file path or URL in here on
 * purpose — those are exactly what a private repository is private about.
 */
export interface SealedRecord {
  name: string;
  score: number;
  tier: Rarity;
  verdict: Verdict;
  reason: string | null;
  commits: number;
  pushedAt: string;
  bands: { id: string; label: string; earned: number; max: number }[];
}

export interface SealedFile {
  rubricVersion: string;
  owner: string;
  records: SealedRecord[];
}

/**
 * Turns a sealed record into an Assay, so the vault, the assay table and the
 * standings can treat private work exactly like public work — ranked by the
 * same score — while every field that would describe the code stays empty.
 *
 * `url` is blank rather than the repository's address: a link to a private
 * repository is a 404 for every visitor, and naming it is all the page is
 * entitled to do.
 */
export function fromSealed(r: SealedRecord): Assay {
  return {
    name: r.name,
    url: "",
    sealed: true,
    score: r.score,
    tier: r.tier,
    verdict: r.verdict,
    reason: r.reason,
    bands: r.bands.map((b) => ({
      id: b.id,
      label: b.label,
      rationale: "Graded from a private repository; the detail behind this total is not published.",
      earned: b.earned,
      max: b.max,
      signals: [],
    })),
    evidence: {
      commits: r.commits,
      stars: 0,
      pushedAt: r.pushedAt,
      createdAt: "",
      language: null,
      languages: [],
      topics: [],
      description: null,
      readmeLede: null,
      isFork: false,
      homepage: null,
      licence: null,
      releases: 0,
      testFiles: 0,
      docFiles: 0,
      sourceFiles: 0,
      hasCi: false,
      hasCoverage: false,
      hasContainer: false,
      hasTests: false,
    },
    nextSteps: [],
  };
}

/** Merges sealed grades into a public list, public winning any name clash. */
export function withSealed(publicAssays: Assay[], sealed: SealedRecord[] | undefined): Assay[] {
  const seen = new Set(publicAssays.map((a) => a.name.toLowerCase()));
  /* A repository made public appears in the evidence on the next run; until
     the private pass drops it, the public reading is the one that counts. */
  const extra = (sealed ?? [])
    .filter((r) => !seen.has(r.name.toLowerCase()))
    .map(fromSealed);
  return [...publicAssays, ...extra];
}

/**
 * Whether a private listing looks like lost access rather than lost work.
 *
 * The first CI run with ASSAY_TOKEN listed zero private repositories — the
 * fine-grained token had not been granted any — and wrote an empty sealed
 * file over seven real grades. A token that can see none of the repositories
 * graded last time has lost its view; an owner does not delete or publish
 * every private repository at once. In that case the previous grades stand.
 */
export function lostAccess(previous: SealedRecord[], listedPrivateNames: string[]): boolean {
  if (previous.length === 0) return false;
  const listed = new Set(listedPrivateNames.map((n) => n.toLowerCase()));
  return previous.every((r) => !listed.has(r.name.toLowerCase()));
}

/**
 * Drops a private repository from an older standing once it stops being graded.
 *
 * standings.json keeps one previous standing so a card can show movement. A
 * private repository that is later hidden left sealed.json at once but stayed
 * named in that previous standing until some score next moved, which can be
 * days. A name is kept only if it is still graded or is public anyway.
 */
export function forgetHidden(
  scores: Record<string, number>,
  stillGraded: Iterable<string>,
  publicNames: Iterable<string>
): Record<string, number> {
  const known = new Set([...stillGraded, ...publicNames].map((n) => n.toLowerCase()));
  return Object.fromEntries(Object.entries(scores).filter(([name]) => known.has(name.toLowerCase())));
}
