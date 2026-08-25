import type { SkillNode } from "./types";

/**
 * A dependency tree rather than a bar chart. `requires` draws the edges, so the
 * shape itself says which capabilities were built on top of which.
 * Levels are self-assessed and deliberately un-flattering.
 */
export const skillTree: SkillNode[] = [
  /* ── roots ─────────────────────────────────────────────────────────── */
  {
    id: "python",
    label: "Python",
    agent: "oracle",
    level: 88,
    requires: [],
    note: "Primary language for anything with a verification or inference core.",
  },
  {
    id: "typescript",
    label: "TypeScript",
    agent: "forge",
    level: 84,
    requires: [],
    note: "Strict mode, no implicit any, types used as the specification.",
  },
  {
    id: "systems",
    label: "Systems Thinking",
    agent: "atlas",
    level: 76,
    requires: [],
    note: "Deciding what must not be allowed to fail silently.",
  },

  /* ── cryptography & protocol ───────────────────────────────────────── */
  {
    id: "crypto",
    label: "Cryptography",
    agent: "cipher",
    level: 74,
    requires: ["python"],
    note: "Signature envelopes, hash chains, nonce freshness, replay windows.",
  },
  {
    id: "sdjwt",
    label: "SD-JWT Chains",
    agent: "cipher",
    level: 71,
    requires: ["crypto"],
    note: "Selective disclosure, chain verification, what a presentation omits.",
  },
  {
    id: "policy",
    label: "Policy-as-code",
    agent: "warden",
    level: 79,
    requires: ["crypto", "systems"],
    note: "Regulation compiled to predicates that must each produce a result.",
  },
  {
    id: "threat",
    label: "Threat Modelling",
    agent: "cipher",
    level: 66,
    requires: ["crypto"],
    note: "Enumerating what an adversary is allowed to control, then removing it.",
  },

  /* ── chain ─────────────────────────────────────────────────────────── */
  {
    id: "solidity",
    label: "Solidity",
    agent: "ledger",
    level: 62,
    requires: ["systems"],
    note: "Contracts kept small, with state changes that are cheap to audit.",
  },
  {
    id: "web3",
    label: "Web3 Integration",
    agent: "ledger",
    level: 68,
    requires: ["solidity", "typescript"],
    note: "ethers.js, wallet handshakes, keeping custody out of the app process.",
  },
  {
    id: "auditchain",
    label: "Audit Trails",
    agent: "ledger",
    level: 64,
    requires: ["web3", "policy"],
    note: "Mirroring consequential actions so they survive the database.",
  },

  /* ── ML ────────────────────────────────────────────────────────────── */
  {
    id: "ml",
    label: "Machine Learning",
    agent: "oracle",
    level: 70,
    requires: ["python"],
    note: "CNNs over audio, classical detection features, honest baselines.",
  },
  {
    id: "llm",
    label: "LLM Orchestration",
    agent: "oracle",
    level: 77,
    requires: ["ml", "typescript"],
    note: "Task DAGs, tool calling, provider-agnostic runtimes.",
  },
  {
    id: "agentic",
    label: "Agentic Boundaries",
    agent: "oracle",
    level: 81,
    requires: ["llm", "policy"],
    note: "Where the model's output stops being evidence. The actual thesis.",
  },

  /* ── data & infra ──────────────────────────────────────────────────── */
  {
    id: "postgres",
    label: "PostgreSQL",
    agent: "atlas",
    level: 72,
    requires: ["systems"],
    note: "Schema as contract, migrations owned by the repo, tests on real PG.",
  },
  {
    id: "olap",
    label: "Analytical Stores",
    agent: "atlas",
    level: 61,
    requires: ["postgres"],
    note: "DuckDB in-process for surveillance workloads that do not need a cluster.",
  },
  {
    id: "docker",
    label: "Containers & CI",
    agent: "atlas",
    level: 69,
    requires: ["systems"],
    note: "Reproducible stacks, one-shot migrate containers, gates that fail loudly.",
  },

  /* ── product surface ───────────────────────────────────────────────── */
  {
    id: "react",
    label: "React & Next.js",
    agent: "forge",
    level: 80,
    requires: ["typescript"],
    note: "App Router, server components, keeping client state small.",
  },
  {
    id: "motion",
    label: "Motion Design",
    agent: "forge",
    level: 73,
    requires: ["react"],
    note: "GSAP and spring physics used for orientation, not decoration.",
  },
  {
    id: "designsys",
    label: "Design Systems",
    agent: "forge",
    level: 67,
    requires: ["react", "systems"],
    note: "Tokens generated once, contrast gated in CI, no hex in components.",
  },
];
