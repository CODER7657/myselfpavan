import type { Assay, Band, RepoEvidence, Signal, Verdict } from "./types";
import { ATTESTED_MAX, attestationsFor } from "./attestations.ts";
import type { Rarity } from "@foundry/tokens";

/**
 * The gate.
 *
 * A repository earns its place on the portfolio by scoring, not by being
 * remembered. Every signal below is observable through the GitHub API, so the
 * whole verdict can be recomputed by anyone — and re-run tomorrow, which is
 * what makes a rank move when the work improves.
 *
 * Bump this when the rules change; a stored score always names the rubric that
 * produced it, so an old number is never silently compared against new rules.
 */
export const RUBRIC_VERSION = "3.0.0";

/**
 * Topic a repository must carry before it is judged at all.
 *
 * This is the "do not look at it yet" switch. Work in progress stays invisible
 * until it is deliberately marked — add the topic on GitHub (Settings → About →
 * Topics) and the next assay picks it up. Nothing needs to be cloned or edited.
 */
export const READY_TOPIC = "foundry-ready";

/**
 * Repositories that are graded regardless of the topic.
 *
 * These predate the gate and are already written up by hand. Everything new
 * goes through the topic instead.
 */
export const GRANDFATHERED = new Set([
  "pramana",
  "complylite",
  "globetrotter",
  "CRAFTATHON",
  "VortiFi",
  "VeriServe_block",
  "genex-prj",
  "shoes.store",
]);

/** Never graded: infrastructure, coursework, and the portfolio itself. */
export const EXCLUDED = new Set([
  /* A fixture built to prove the gate end to end. It scored 69 and was
     promoted with a generated card, which was the point — but it is a test
     harness, not portfolio work. */
  "assay-probe",
  "CODER7657",
  "myselfpavan",
  "portfolio2",
  "3d-portfolio",
  "codes-",
  "assignment-2",
  "-WEBATHON",
]);

/** Score at or above which a repository is shown at all. */
export const PROMOTION_FLOOR = 34;

/** Score → tier. A repository moves between these as it is worked on. */
const TIERS: { min: number; tier: Rarity }[] = [
  { min: 72, tier: "mythic" },
  { min: 60, tier: "legendary" },
  { min: 48, tier: "epic" },
  { min: 36, tier: "rare" },
  { min: 0, tier: "common" },
];

export function tierFor(score: number): Rarity {
  return (TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1]!).tier;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));
const round = (n: number) => Math.round(n * 10) / 10;

/** Diminishing returns: the first commits count for far more than the last. */
function logScale(value: number, saturateAt: number, max: number): number {
  if (value <= 0) return 0;
  return clamp((Math.log1p(value) / Math.log1p(saturateAt)) * max, max);
}

function daysSince(iso: string): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return (Date.now() - then) / 86_400_000;
}

function band(
  id: string,
  label: string,
  rationale: string,
  signals: Signal[]
): Band {
  return {
    id,
    label,
    rationale,
    earned: round(signals.reduce((s, x) => s + x.earned, 0)),
    max: signals.reduce((s, x) => s + x.max, 0),
    signals,
  };
}

/* ── bands ────────────────────────────────────────────────────────────────── */

/**
 * Depth. How much work is actually in there.
 *
 * Commits dominate, on a log curve — the gap between 5 and 30 commits says far
 * more than the gap between 80 and 200. Stars are deliberately absent: they
 * measure reach, not work.
 */
function depthBand(e: RepoEvidence): Band {
  const commitPts = logScale(e.commits, 60, 8);
  const filePts = logScale(e.sourceFiles, 120, 7);
  const sizePts = logScale(e.sizeKb, 4000, 3);

  return band("depth", "Depth of work", "How much is actually in there.", [
    {
      id: "source",
      label: "Source written",
      earned: round(filePts),
      max: 7,
      detail: e.sourceFiles + " source file" + (e.sourceFiles === 1 ? "" : "s"),
      ...(filePts < 4 ? { advice: "There is not much here yet." } : {}),
    },
    {
      id: "commits",
      label: "Commit history",
      /*
       * Deliberately no longer the heaviest signal.
       *
       * It was worth fifteen points, which meant a finished, deployed project
       * imported as a single commit scored near zero for depth — punished for
       * its git history rather than judged on its work. Source written now
       * carries comparable weight, so a squashed repository can still show
       * what is in it.
       */
      earned: round(commitPts),
      max: 8,
      detail: e.commits + " commit" + (e.commits === 1 ? "" : "s"),
      ...(commitPts < 5
        ? { advice: "A visible history makes the work easier to follow, though it is not the whole picture." }
        : {}),
    },
    {
      id: "size",
      label: "Codebase size",
      earned: round(sizePts),
      max: 3,
      detail: e.sizeKb.toLocaleString() + " KB checked in",
    },
  ]);
}

/**
 * Verification. The band this whole portfolio argues for.
 *
 * Weighted heaviest on purpose: a project that cannot show it checked itself is
 * a project taking its own word for it.
 */
function verificationBand(e: RepoEvidence): Band {
  return band(
    "verification",
    "Verification",
    "Whether the project can show it checked itself.",
    [
      {
        id: "tests",
        label: "Test suite",
        /*
         * Depth, not presence. One token test file and a suite of several
         * hundred are not the same claim, and scoring them identically was
         * the rubric's blindest spot.
         */
        earned: round(e.hasTests ? 3.5 + logScale(e.testFiles, 60, 5.5) : 0),
        max: 9,
        detail: e.hasTests
          ? e.testFiles + " test file" + (e.testFiles === 1 ? "" : "s")
          : "none found",
        ...(e.hasTests && e.testFiles >= 20
          ? {}
          : {
              advice: e.hasTests
                ? "More of the surface under test is the cheapest way to raise this band."
                : "Add a tests/ directory — the largest single gain available.",
            }),
      },
      {
        id: "ci",
        label: "Continuous integration",
        earned: e.hasCi ? 7 : 0,
        max: 7,
        detail: e.hasCi ? ".github/workflows present" : "no workflow",
        ...(e.hasCi ? {} : { advice: "A workflow that runs the tests proves they still pass." }),
      },
      {
        id: "coverage",
        label: "Coverage reporting",
        earned: e.hasCoverage ? 3 : 0,
        max: 3,
        detail: e.hasCoverage ? "coverage configured" : "not configured",
      },
      {
        id: "linter",
        label: "Lint / type gate",
        earned: e.hasLinter ? 3 : 0,
        max: 3,
        detail: e.hasLinter ? "linter or type config present" : "none",
      },
    ]
  );
}

/** Completeness. Whether a stranger could pick it up. */
function completenessBand(e: RepoEvidence): Band {
  const readmePts = logScale(e.readmeBytes, 6000, 7);

  return band(
    "completeness",
    "Completeness",
    "Whether someone else could pick it up.",
    [
      {
        id: "readme",
        label: "README depth",
        earned: round(readmePts),
        max: 7,
        detail:
          e.readmeBytes > 0
            ? e.readmeBytes.toLocaleString() + " bytes"
            : "missing",
        ...(readmePts < 6
          ? { advice: "Explain the problem and the approach, not just how to run it." }
          : {}),
      },
      {
        id: "docs",
        label: "Extended docs",
        earned: round(e.hasDocs ? 1.5 + logScale(e.docFiles, 12, 1.5) : 0),
        max: 3,
        detail: e.hasDocs
          ? e.docFiles + " document" + (e.docFiles === 1 ? "" : "s") + " under docs/"
          : "none",
      },
      {
        id: "licence",
        label: "Licence",
        earned: e.licence ? 3 : 0,
        max: 3,
        detail: e.licence ?? "unlicensed",
        ...(e.licence ? {} : { advice: "Without one, nobody may legally reuse it." }),
      },
      {
        id: "description",
        label: "Description",
        earned: e.description ? 2 : 0,
        max: 2,
        detail: e.description ? "set" : "empty",
      },
      {
        id: "topics",
        label: "Topics",
        earned: clamp(e.topics.length, 1),
        max: 1,
        detail: e.topics.length + " topic" + (e.topics.length === 1 ? "" : "s"),
      },
    ]
  );
}

/** Structure. A project, or a folder of loose files. */
function structureBand(e: RepoEvidence): Band {
  const dirPts = clamp(e.topLevelDirs.length * 2, 5);

  return band("structure", "Structure", "A project, or a folder of loose files.", [
    {
      id: "layout",
      label: "Directory layout",
      earned: dirPts,
      max: 5,
      detail:
        e.topLevelDirs.length > 0
          ? e.topLevelDirs.length + " top-level directories"
          : "flat — everything at the root",
      ...(dirPts < 4
        ? { advice: "Loose files at the root read as a scratch folder." }
        : {}),
    },
    {
      id: "manifest",
      label: "Dependency manifest",
      earned: e.hasManifest ? 4 : 0,
      max: 4,
      detail: e.hasManifest ? "declared" : "none — dependencies are implicit",
    },
    {
      id: "container",
      label: "Reproducible environment",
      earned: e.hasContainer ? 2 : 0,
      max: 2,
      detail: e.hasContainer ? "Dockerfile or compose file" : "none",
    },
    {
      id: "workspace",
      label: "Workspace config",
      earned: e.hasWorkspace ? 2 : 0,
      max: 2,
      detail: e.hasWorkspace ? "monorepo workspace" : "single package",
    },
  ]);
}

/** Shipped. Whether it left the machine it was written on. */
function shippedBand(e: RepoEvidence): Band {
  const days = daysSince(e.pushedAt);
  const recencyPts = days < 90 ? 3 : days < 270 ? 2 : days < 540 ? 1 : 0;

  return band("shipped", "Shipped", "Whether it left the machine it was written on.", [
    {
      id: "releases",
      label: "Tagged release",
      earned: e.releases > 0 ? 5 : 0,
      max: 5,
      detail: e.releases > 0 ? e.releases + " release(s)" : "never tagged",
      ...(e.releases > 0 ? {} : { advice: "One tagged release marks a version somebody could actually use." }),
    },
    {
      id: "demo",
      label: "Live deployment",
      earned: e.homepage ? 5 : 0,
      max: 5,
      detail: e.homepage ? "homepage set" : "no deployment linked",
      ...(e.homepage ? {} : { advice: "Set the repository homepage to the deployed URL." }),
    },
    {
      id: "recency",
      label: "Recent activity",
      earned: recencyPts,
      max: 3,
      detail: Number.isFinite(days) ? Math.round(days) + " days since last push" : "unknown",
    },
  ]);
}

/**
 * Craft. Interface work, which the rest of the rubric is blind to.
 *
 * Everything above rewards correctness — tests, CI, licences, structure. A
 * genuinely well-made front end scores almost nothing on any of it, which is
 * wrong: making something feel good is a real discipline and a real part of
 * this portfolio. Kept small on purpose, because it is the easiest band to
 * fake and the hardest to verify remotely.
 */
function craftBand(e: RepoEvidence): Band {
  const componentPts = logScale(e.componentFiles, 40, 3);

  return band("craft", "Craft", "Interface work the other bands cannot see.", [
    {
      id: "components",
      label: "Component structure",
      earned: round(componentPts),
      max: 3,
      detail:
        e.componentFiles > 0
          ? e.componentFiles + " component file" + (e.componentFiles === 1 ? "" : "s")
          : "no component directory",
    },
    {
      id: "designsystem",
      label: "Design system",
      earned: e.hasDesignSystem ? 2 : 0,
      max: 2,
      detail: e.hasDesignSystem ? "theme or token config present" : "none",
      ...(e.hasDesignSystem ? {} : { advice: "Tokens or a theme file show the styling was designed, not improvised." }),
    },
    {
      id: "a11y",
      label: "Accessibility tooling",
      earned: e.hasA11y ? 2 : 0,
      max: 2,
      detail: e.hasA11y ? "a11y linting configured" : "none",
      ...(e.hasA11y ? {} : { advice: "jsx-a11y or axe is the cheapest proof the interface was built for everyone." }),
    },
    {
      id: "motion",
      label: "Motion system",
      earned: e.hasMotion ? 1 : 0,
      max: 1,
      detail: e.hasMotion ? "animation library in use" : "none",
    },
  ]);
}

/**
 * Attested. Verifiable claims the API cannot reach.
 *
 * Capped hard: this can lift a strong project above a merely tidy one, but a
 * repository with nothing else going for it cannot be talked into a rank. Every
 * claim carries a proof URL, and the band renders as ATTESTED rather than
 * OBSERVED so a reader always knows which half of a score came from the author.
 */
function attestedBand(e: RepoEvidence): Band {
  const claims = attestationsFor(e.name);

  if (claims.length === 0) {
    return band(
      "attested",
      "Attested",
      "Verifiable claims the API cannot see. Each carries a link.",
      [
        {
          id: "none",
          label: "No claims filed",
          earned: 0,
          max: ATTESTED_MAX,
          detail: "Scored purely on what the repository shows.",
        },
      ]
    );
  }

  /* Declared weights may exceed the cap; scale them down rather than truncate,
     so the relative importance the author assigned is preserved. */
  const declared = claims.reduce((sum, c) => sum + c.weight, 0);
  const scale = declared > ATTESTED_MAX ? ATTESTED_MAX / declared : 1;

  return band(
    "attested",
    "Attested",
    "Verifiable claims the API cannot see. Each carries a link.",
    claims.map((c) => ({
      id: c.id,
      label: c.label,
      earned: round(c.weight * scale),
      max: round(c.weight * scale),
      detail: c.detail,
      proof: c.proof,
    }))
  );
}

/* ── the gate ─────────────────────────────────────────────────────────────── */

/**
 * Grades one repository.
 *
 * The readiness check runs before any scoring: an unmarked repository is
 * reported as `not-ready` with a zero score rather than being judged half-built.
 */
export function assess(e: RepoEvidence): Assay {
  const bands = [
    depthBand(e),
    verificationBand(e),
    completenessBand(e),
    structureBand(e),
    shippedBand(e),
    craftBand(e),
    attestedBand(e),
  ];

  const score = round(bands.reduce((s, b) => s + b.earned, 0));

  let verdict: Verdict = "promoted";
  let reason: string | null = null;

  if (EXCLUDED.has(e.name)) {
    verdict = "excluded";
    reason = "Infrastructure or coursework — never graded.";
  } else if (e.isFork) {
    verdict = "excluded";
    reason = "Fork — the work is somebody else's to claim.";
  } else if (e.isArchived) {
    verdict = "excluded";
    reason = "Archived.";
  } else if (!e.topics.includes(READY_TOPIC) && !GRANDFATHERED.has(e.name)) {
    verdict = "not-ready";
    reason = `Not marked ready. Add the "${READY_TOPIC}" topic when you want it graded.`;
  } else if (score < PROMOTION_FLOOR) {
    verdict = "held";
    reason = `Scored ${score}, below the promotion floor of ${PROMOTION_FLOOR}.`;
  }

  /* The cheapest points still available, so the advice is actionable. */
  const nextSteps = bands
    .flatMap((b) => b.signals)
    .filter((s) => s.advice && s.earned < s.max)
    .sort((a, b) => b.max - b.earned - (a.max - a.earned))
    .slice(0, 3)
    .map((s) => s.advice as string);

  return {
    name: e.name,
    url: e.url,
    score,
    tier: tierFor(score),
    verdict,
    reason,
    bands,
    evidence: {
      commits: e.commits,
      stars: e.stars,
      pushedAt: e.pushedAt,
      createdAt: e.createdAt,
      language: e.language,
      languages: e.languages,
      topics: e.topics,
      description: e.description,
      readmeLede: e.readmeLede,
      isFork: e.isFork,
      homepage: e.homepage,
      licence: e.licence,
      releases: e.releases,
      testFiles: e.testFiles,
      docFiles: e.docFiles,
      sourceFiles: e.sourceFiles,
      hasCi: e.hasCi,
      hasCoverage: e.hasCoverage,
      hasContainer: e.hasContainer,
      hasTests: e.hasTests,
    },
    nextSteps,
  };
}
