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
  /** First paragraph of real prose from the README, if there is one. */
  readmeLede: string | null;

  /** Number of test files, not merely whether a tests directory exists. */
  testFiles: number;
  /** Number of markdown files under docs/. */
  docFiles: number;
  /** Paths discarded as vendored or build output before any signal was read. */
  vendoredPaths: number;

  /** Written source files, excluding vendored code and build output. */
  sourceFiles: number;
  /** Source files living under a components/ screens/ views/ directory. */
  componentFiles: number;
  hasDesignSystem: boolean;
  hasA11y: boolean;
  hasMotion: boolean;

  hasTests: boolean;
  hasCi: boolean;
  hasCoverage: boolean;
  hasLinter: boolean;
  hasDocs: boolean;
  hasManifest: boolean;
  hasContainer: boolean;
  hasWorkspace: boolean;

  /** Set when this entry is last run's, because this run could not read it. */
  carriedForward?: boolean;
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
  /** Present on attested signals: where a reader can check the claim. */
  proof?: string;
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
  /** Blank for a sealed (private) grade: there is no public page to link to. */
  url: string;
  /** True when this grade came from a private repository via sealed.json. */
  sealed?: boolean;
  score: number;
  tier: Rarity;
  verdict: Verdict;
  /** Set when the verdict is anything other than `promoted`. */
  reason: string | null;
  bands: Band[];
  /*
   * Everything a card needs to be built without going back to the raw file.
   *
   * This used to carry only what the assay table displayed, which is why a
   * generated card had no deployment link, no licence and a one-item stack:
   * the facts existed in the evidence and simply were not passed through.
   */
  evidence: Pick<
    RepoEvidence,
    | "commits"
    | "stars"
    | "pushedAt"
    | "createdAt"
    | "language"
    | "languages"
    | "topics"
    | "description"
    | "readmeLede"
    | "isFork"
    | "homepage"
    | "licence"
    | "releases"
    | "testFiles"
    | "docFiles"
    | "sourceFiles"
    | "hasCi"
    | "hasCoverage"
    | "hasContainer"
    | "hasTests"
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
