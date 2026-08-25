/**
 * Claims the GitHub API cannot see, each carrying a link that proves it.
 *
 * The rubric grades what is observable from a repository's metadata and file
 * tree. That is most of the picture, but not all of it: it cannot count 671
 * passing tests, it cannot read a coverage percentage out of a test run, and
 * it has no idea that a project produced two acknowledged defects in Google's
 * SDK. Scoring purely on observable structure therefore rewards polish over
 * substance — which is how a travel planner outranked a verification engine.
 *
 * So claims live here instead, under three rules that keep them honest:
 *
 *   1. Every claim names a URL a stranger can open and check.
 *   2. The band is capped, so attestation can lift a strong project over a
 *      merely tidy one but can never carry a weak project on its own.
 *   3. They are rendered as ATTESTED rather than OBSERVED, so a reader always
 *      knows which half of a score came from the author.
 */

export interface Attestation {
  /** Repository this belongs to, matched case-insensitively. */
  repo: string;
  id: string;
  label: string;
  /** The claim, stated so it can be checked. */
  detail: string;
  /** Where to verify it. Required — a claim without one is not evidence. */
  proof: string;
  /** Points, capped by ATTESTED_MAX across all of a repository's claims. */
  weight: number;
}

/** No repository can earn more than this from attestation. */
export const ATTESTED_MAX = 10;

export const ATTESTATIONS: Attestation[] = [
  {
    repo: "pramana",
    id: "pramana-suite",
    label: "671 tests passing at 94% coverage",
    detail:
      "The suite and its coverage gate run in CI on every push; the run log shows the totals.",
    proof: "https://github.com/CODER7657/pramana/actions",
    weight: 5,
  },
  {
    repo: "pramana",
    id: "pramana-ap2-issue",
    label: "Defect acknowledged upstream by Google",
    detail:
      "Found while building against the AP2 reference SDK. Google confirmed the mechanism and invited a public issue.",
    proof: "https://github.com/google-agentic-commerce/AP2/issues/339",
    weight: 4,
  },
  {
    repo: "pramana",
    id: "pramana-ap2-pr",
    label: "Fix filed upstream as a pull request",
    detail: "AP2#340, open against Google's repository.",
    proof: "https://github.com/google-agentic-commerce/AP2/pull/340",
    weight: 3,
  },
  {
    repo: "CRAFTATHON",
    id: "pocso-deployed",
    label: "Deployed and reachable",
    detail: "The reporter and authority portals are live.",
    proof: "https://craftathon-eight.vercel.app",
    weight: 3,
  },
  {
    repo: "shoes.store",
    id: "sole-deployed",
    label: "Deployed and reachable",
    detail: "The storefront is live, including the scroll-driven hero.",
    proof: "https://shoes-store-one-coral.vercel.app",
    weight: 3,
  },
];

/** Claims for one repository, newest declaration order preserved. */
export function attestationsFor(repo: string): Attestation[] {
  const key = repo.toLowerCase();
  return ATTESTATIONS.filter((a) => a.repo.toLowerCase() === key);
}
