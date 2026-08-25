import type { Rarity } from "@foundry/tokens";

/**
 * The raw evidence gathered about one repository.
 *
 * Everything here is observable through the GitHub API — nothing is asserted by
 * the author. That is the point: the score has to be something a stranger could
 * recompute.
 */
export interface RepoEvidence {
  name: string;
  url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  languages: string[];
  topics: string[];
  isFork: boolean;
  isArchived: boolean;
  isPrivate: boolean;
  stars: number;
  sizeKb: number;
  pushedAt: string;
  createdAt: string;
  licence: string | null;

  commits: number;
  releases: number;

  /** Top-level entries, used to tell a project from a folder of loose files. */
  topLevelDirs: string[];
  topLevelFiles: string[];

  readmeBytes: number;

  hasTests: boolean;
  hasCi: boolean;
  hasCoverage: boolean;
  hasLinter: boolean;
  hasDocs: boolean;
  hasManifest: boolean;
  hasContainer: boolean;
  hasWorkspace: boolean;
}

/** One line of the score, kept so the total can always be explained. */
export interface Signal {
  id: string;
  label: string;
  /** Points earned. */
  earned: number;
  /** Points available. */
  max: number;
  /** What was observed, in plain words. */
  detail: string;
  /** Present when points were left on the table — what would earn them. */
  advice?: string;
}

export interface Band {
  id: string;
  label: string;
  /** Why this band is weighted the way it is. */
  rationale: string;
  earned: number;
  max: number;
  signals: Signal[];
}

export type Verdict = "promoted" | "held" | "not-ready" | "excluded";

export interface Assay {
  name: string;
  url: string;
  score: number;
  tier: Rarity;
  verdict: Verdict;
  /** Set when the verdict is anything other than `promoted`. */
  reason: string | null;
  bands: Band[];
  evidence: Pick<
    RepoEvidence,
    "commits" | "stars" | "pushedAt" | "language" | "topics" | "description" | "isFork"
  >;
  /** The three cheapest points still on the table. */
  nextSteps: string[];
}

export interface AssayReport {
  /** ISO timestamp the assay ran. */
  ranAt: string;
  /** Commit the rubric was at, so a score can be traced to the rules that made it. */
  rubricVersion: string;
  owner: string;
  totals: {
    scanned: number;
    promoted: number;
    held: number;
    notReady: number;
    excluded: number;
  };
  assays: Assay[];
}

export type { Rarity };
