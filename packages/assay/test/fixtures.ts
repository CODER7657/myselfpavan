import type { RepoEvidence } from "../src/types";

/** A fixed "now" so recency is deterministic in every test. */
export const NOW = Date.parse("2026-11-06T12:00:00Z");

const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

/**
 * A strong, ordinary public repository. Tests override only what they are
 * about, so each one reads as the single fact it checks.
 */
export function evidence(over: Partial<RepoEvidence> = {}): RepoEvidence {
  return {
    name: "sample",
    url: "https://github.com/CODER7657/sample",
    description: "A sample project.",
    homepage: null,
    language: "TypeScript",
    languages: ["TypeScript", "CSS"],
    topics: [],
    isFork: false,
    isArchived: false,
    isPrivate: false,
    stars: 0,
    sizeKb: 800,
    pushedAt: daysAgo(10),
    createdAt: daysAgo(200),
    licence: "MIT",
    commits: 40,
    releases: 0,
    topLevelDirs: ["src", "tests", "docs"],
    topLevelFiles: ["package.json", "README.md"],
    readmeBytes: 6000,
    readmeLede: "A sample project that exists so the rubric has something sensible to grade in a test.",
    testFiles: 20,
    docFiles: 3,
    vendoredPaths: 0,
    sourceFiles: 60,
    componentFiles: 0,
    hasDesignSystem: false,
    hasA11y: false,
    hasMotion: false,
    hasTests: true,
    hasCi: true,
    hasCoverage: true,
    hasLinter: true,
    hasDocs: true,
    hasManifest: true,
    hasContainer: false,
    hasWorkspace: false,
    ...over,
  };
}

/** Evidence for a repository with nothing in it. */
export function empty(over: Partial<RepoEvidence> = {}): RepoEvidence {
  return evidence({
    description: null,
    licence: null,
    commits: 1,
    sizeKb: 1,
    topLevelDirs: [],
    topLevelFiles: [],
    readmeBytes: 0,
    readmeLede: null,
    testFiles: 0,
    docFiles: 0,
    sourceFiles: 0,
    hasTests: false,
    hasCi: false,
    hasCoverage: false,
    hasLinter: false,
    hasDocs: false,
    hasManifest: false,
    pushedAt: daysAgo(900),
    ...over,
  });
}
