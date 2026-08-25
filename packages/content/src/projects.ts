import type { Project } from "./types";

/**
 * Ten builds.
 *
 * Chosen by inspecting the repositories rather than by reading their READMEs:
 * commit count, presence of a real test suite, CI configuration, and whether
 * the layout is a project or a folder of loose files. Rarity follows that
 * inspection — the flat five-commit DApp is marked common and the 671-test
 * verification gate is marked mythic, because that is what they are.
 * Exploratory forks and coursework repositories were left out entirely.
 *
 * Every entry carries a `plain` line written for a reader who is not an
 * engineer. The card leads with that; the technical argument is on the reverse.
 */
export const projects: Project[] = [
  {
    slug: "pramana",
    name: "PRAMANA",
    classification: "Verification Gate",
    tagline: "No model on the money path.",
    plain:
      "A safety gate that sits between an AI shopping assistant and your bank, and refuses the payment unless every required check actually ran.",
    summary:
      "A deterministic verification gate between an AI buying agent and merchant checkout. It parses an AP2 delegation chain, computes the RBI e-mandate envelope as executable predicates, and writes a hash-chained evidence record for every verdict it reaches.",
    highlight:
      "A declared obligation that produced no result becomes INDETERMINATE at construction time and blocks exactly as hard as an outright violation — the difference between \"checked and passed\" and \"never checked\" is enforced by the type system, not remembered by convention.",
    rarity: "mythic",
    agent: "cipher",
    stack: ["Python 3.13", "AP2", "SD-JWT", "Policy-as-code", "Pydantic", "pytest"],
    metrics: [
      { label: "Tests", value: "671 passing" },
      { label: "Coverage", value: "94%" },
      { label: "Commits", value: "42" },
      { label: "Licence", value: "Apache-2.0" },
    ],
    repo: "https://github.com/CODER7657/pramana",
    demo: null,
    year: 2026,
    stats: { depth: 96, rigor: 98, surface: 54, novelty: 92 },
    featured: true,
  },

  {
    slug: "ap2-findings",
    name: "AP2 #339 / #340",
    classification: "Upstream Finding",
    tagline: "Two defects found in Google's agent-payments code.",
    plain:
      "While building the gate above, two real bugs turned up in Google's own payment software. Google confirmed them, and both are now public on their repository.",
    summary:
      "Building PRAMANA against Google's AP2 reference SDK surfaced two defects in its own verification path. Google confirmed the mechanism, classified it as intended behaviour, and invited a public issue — both are now filed upstream as an issue and a pull request.",
    highlight:
      "The finding ships as an executable proof rather than a write-up: `pramana finding` mints two presentations against the installed SDK, runs AP2's own evaluators over each, prints the commit it ran against, and exits non-zero the day the defect stops reproducing.",
    rarity: "legendary",
    agent: "cipher",
    stack: ["AP2", "SD-JWT", "Python", "Reproducible harness"],
    metrics: [
      { label: "Issue", value: "AP2#339" },
      { label: "Pull request", value: "AP2#340" },
      { label: "Repro time", value: "~30 seconds" },
      { label: "Status", value: "Acknowledged" },
    ],
    repo: "https://github.com/google-agentic-commerce/AP2/issues/339",
    demo: null,
    year: 2026,
    stats: { depth: 94, rigor: 95, surface: 30, novelty: 88 },
    featured: true,
  },

  {
    slug: "raksha-ai",
    name: "RAKSHA AI",
    classification: "Fraud Interception",
    tagline: "Rules first on device, retrieval second, model last.",
    plain:
      "An app that spots scam messages and calls before they reach you, in twelve Indian languages — and always tells you which specific warning sign it saw.",
    summary:
      "A fraud-interception system across Android and web. Detection runs in a fixed order — deterministic rules on the device, then retrieval over past cases, and only then a model — so a verdict is explained from evidence rather than invented. Case history is isolated per user with row-level security.",
    highlight:
      "The ordering is the design. Putting the model last means the common cases never reach it, the explanation is always traceable to a rule or a retrieved precedent, and the system degrades to something still useful when the network is gone.",
    rarity: "legendary",
    agent: "warden",
    stack: ["Kotlin", "React 19", "FastAPI", "pgvector", "PostgreSQL", "Supabase"],
    metrics: [
      { label: "Commits", value: "82" },
      { label: "Languages", value: "12" },
      { label: "Surfaces", value: "Android + web" },
      { label: "Isolation", value: "Row-level security" },
    ],
    repo: null,
    demo: null,
    private: true,
    year: 2026,
    stats: { depth: 88, rigor: 84, surface: 82, novelty: 80 },
    featured: true,
  },

  {
    slug: "complylite",
    name: "COMPLYLITE",
    classification: "Surveillance Co-pilot",
    tagline: "Compliance alerts that can show their working.",
    plain:
      "Software for stockbrokers that watches trades for suspicious patterns, and shows exactly which rule fired so a human can argue with it.",
    summary:
      "A hybrid rules-plus-ML detection engine over CSV and SFTP ingestion, with DuckDB for in-process analytics and a React dashboard for triage. Backend, frontend, sample data and a Docker Compose stack all live in the repository, with detectors tested in CI.",
    highlight:
      "Every alert carries the rule or feature weight that produced it, and audit reports are generated from the same records the analyst worked from — so what reaches a regulator is not a second, prettier version of events.",
    rarity: "epic",
    agent: "warden",
    stack: ["FastAPI", "DuckDB", "Pandas", "React 18", "Ant Design", "Recharts", "Docker"],
    metrics: [
      { label: "Commits", value: "35" },
      { label: "Detection", value: "Rules + ML" },
      { label: "Analytics", value: "DuckDB (OLAP)" },
      { label: "Licence", value: "MIT" },
    ],
    repo: "https://github.com/CODER7657/complylite",
    demo: null,
    year: 2025,
    stats: { depth: 78, rigor: 82, surface: 74, novelty: 62 },
  },

  {
    slug: "globetrotter",
    name: "GLOBETROTTER",
    classification: "Offline-first Platform",
    tagline: "A travel planner that keeps working without a signal.",
    plain:
      "A multi-city trip planner you can keep using on a plane or in a dead zone — it syncs back up when the connection returns.",
    summary:
      "A pnpm monorepo: a Fastify 5 modular monolith, a Vite and React 19 client, a shared Zod contracts package and a generated design system. Migrations and seeds are owned by the repository, applied by a one-shot container, and tested against a real Postgres 18 rather than a mock.",
    highlight:
      "Layering is enforced by ESLint rules rather than by convention — the lint step fails if the web app reaches past the contracts package into server internals.",
    rarity: "epic",
    agent: "atlas",
    stack: ["Fastify 5", "React 19", "PostgreSQL 18", "Zod", "TanStack Router", "Vitest", "Docker"],
    metrics: [
      { label: "Commits", value: "31" },
      { label: "Workspaces", value: "4 packages" },
      { label: "Tests", value: "Real Postgres" },
      { label: "Built for", value: "Odoo Hackathon '26" },
    ],
    repo: "https://github.com/CODER7657/globetrotter",
    demo: null,
    year: 2026,
    stats: { depth: 84, rigor: 86, surface: 72, novelty: 66 },
  },

  {
    slug: "pocso-shield",
    name: "POCSO SHIELD",
    classification: "Safety Platform",
    tagline: "Anonymous child-safety reporting with an on-chain audit trail.",
    plain:
      "A way to report child-safety incidents anonymously, where the record of what officials did about it cannot be quietly edited afterwards.",
    summary:
      "Three layers in one workspace: a FastAPI backend with Celery workers, Next.js reporter and authority portals, and a Hardhat contract project. Reports are classified by an AI pipeline, persisted in Postgres, pinned to IPFS, and mirrored to Sepolia. Deployed, with the container and proxy configuration in the repository.",
    highlight:
      "Jurisdiction scoping is enforced in API logic rather than in the UI — a case is visible only to authorities whose key maps to the same jurisdiction code, so hiding a button is never mistaken for access control.",
    rarity: "epic",
    agent: "warden",
    stack: ["FastAPI", "Next.js 14", "PostgreSQL", "Celery", "Redis", "IPFS", "Solidity", "Hardhat"],
    metrics: [
      { label: "Layers", value: "API · Web · Chain" },
      { label: "Network", value: "Ethereum Sepolia" },
      { label: "Status", value: "Deployed" },
      { label: "Built for", value: "Craftathon '26" },
    ],
    repo: "https://github.com/CODER7657/CRAFTATHON",
    demo: "https://craftathon-eight.vercel.app",
    year: 2026,
    stats: { depth: 82, rigor: 78, surface: 86, novelty: 74 },
  },

  {
    slug: "vortifi",
    name: "VORTIFI",
    classification: "On-chain Elections",
    tagline: "Verifiable elections, settled on-chain.",
    plain:
      "An online voting system where anyone can check the count for themselves, because every vote is recorded publicly and permanently.",
    summary:
      "A Solidity contract set with a React client, Hardhat Ignition deployment modules and a contract test suite. Ballots and tallies settle on-chain, so the result can be independently recomputed rather than taken on trust.",
    highlight:
      "The point of putting an election on-chain is not novelty — it is that verification stops depending on the same party that ran the vote.",
    rarity: "rare",
    agent: "ledger",
    stack: ["Solidity", "Hardhat", "Ignition", "React", "ethers.js"],
    metrics: [
      { label: "Commits", value: "18" },
      { label: "Contracts", value: "Tested" },
      { label: "Deployment", value: "Hardhat Ignition" },
      { label: "Property", value: "Publicly verifiable" },
    ],
    repo: "https://github.com/CODER7657/VortiFi",
    demo: null,
    year: 2025,
    stats: { depth: 68, rigor: 70, surface: 62, novelty: 66 },
  },

  {
    slug: "mental-wellness",
    name: "MENTAL WELLNESS AI",
    classification: "Crisis-aware Companion",
    tagline: "Crisis detection in front of the model.",
    plain:
      "A mental-health chat companion that recognises when someone is in real danger and hands them to professional help instead of carrying on the conversation.",
    summary:
      "A three-tier application — React Native client, Express and SQLite backend, Socket.IO for live sessions — with mood tracking, context retention and a crisis-detection path that routes to professional resources. Backend, frontend, devops and test directories are all present in the repository.",
    highlight:
      "The constraint worth solving was knowing when the model must stop being the interface. Detection triggers a hand-off, not a better reply — the same rule as the fraud work, applied where the stakes are personal rather than financial.",
    rarity: "rare",
    agent: "oracle",
    stack: ["React Native", "Express", "SQLite", "Socket.IO", "Gemini"],
    metrics: [
      { label: "Commits", value: "10" },
      { label: "Tiers", value: "App · API · AI" },
      { label: "Realtime", value: "Socket.IO" },
      { label: "Safety", value: "Crisis routing" },
    ],
    repo: "https://github.com/CODER7657/genex-prj",
    demo: null,
    year: 2025,
    stats: { depth: 58, rigor: 56, surface: 72, novelty: 60 },
  },

  {
    slug: "sole-vault",
    name: "SOLE VAULT",
    classification: "Commerce Interface",
    tagline: "A storefront built as an animation problem.",
    plain:
      "A high-end sneaker shop where the product turns as you scroll — proof that making something feel good is its own skill.",
    summary:
      "A premium storefront in React 18, TypeScript and Vite. The hero is a scroll-driven 360° sequence, the grid is a bento of material close-ups, and the whole surface runs on spring-based kinetics with a glassmorphic detail modal and a global cart drawer. Deployed and live.",
    highlight:
      "Every other card here argues about correctness. This one is the counterweight: interface craft is its own discipline, and a portfolio that only shows verification logic is hiding half the job.",
    rarity: "rare",
    agent: "forge",
    stack: ["React 18", "TypeScript", "Vite", "Tailwind", "Framer Motion"],
    metrics: [
      { label: "Hero", value: "Scroll-driven 360°" },
      { label: "Motion", value: "Spring kinetics" },
      { label: "State", value: "Context API" },
      { label: "Status", value: "Live" },
    ],
    repo: "https://github.com/CODER7657/shoes.store",
    demo: "https://shoes-store-one-coral.vercel.app",
    year: 2026,
    stats: { depth: 44, rigor: 50, surface: 94, novelty: 68 },
  },

  {
    slug: "veriserve",
    name: "VERISERVE",
    classification: "Certificate DApp",
    tagline: "Certificates anyone can verify without an account.",
    plain:
      "A way to issue digital certificates that an employer can check instantly, without having to phone the institution that issued them.",
    summary:
      "A Solidity contract on Polygon Amoy storing a certificate id, its hash and its recipient, with a React client where an admin issues through MetaMask and anyone can verify publicly. The smallest project here, and listed as such.",
    highlight:
      "No private key is ever stored or read by the application — every state-changing call is signed in the wallet, which makes the admin panel a convenience rather than a trust boundary.",
    rarity: "common",
    agent: "ledger",
    stack: ["Solidity", "Polygon Amoy", "ethers.js", "React", "MetaMask"],
    metrics: [
      { label: "Network", value: "Polygon Amoy" },
      { label: "Contract", value: "VeriServe.sol" },
      { label: "Verification", value: "Public, keyless" },
      { label: "Custody", value: "Wallet-only" },
    ],
    repo: "https://github.com/CODER7657/VeriServe_block",
    demo: null,
    year: 2025,
    stats: { depth: 60, rigor: 62, surface: 58, novelty: 50 },
  },
];

export const featuredProjects = projects.filter((p) => p.featured);