import type { Project } from "./types";

/**
 * Nine builds, agentic work first.
 *
 * Chosen by inspecting the repositories rather than by reading their READMEs:
 * commit count, presence of a real test suite, CI configuration, and whether
 * the layout is a project or a folder of loose files. Rarity follows that
 * inspection — the flat five-commit DApp is marked common and the 711-test
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
      { label: "Tests", value: "711 passing" },
      { label: "Mutation score", value: "65.3%" },
      { label: "Attack success", value: "53.8% → 0%" },
      { label: "Licence", value: "Apache-2.0" },
    ],
    repo: "https://github.com/CODER7657/pramana",
    demo: "https://pramana-gate.vercel.app",
    year: 2026,
    stats: { depth: 96, rigor: 98, surface: 54, novelty: 92 },
    featured: true,
  },

  {
    slug: "raksha-ai",
    name: "RAKSHA AI",
    classification: "Fraud Interception",
    tagline: "Rules first, retrieval second, model last.",
    plain:
      "An app that spots scam messages and calls in English, Hindi and Gujarati, and tells you which warning sign it saw.",
    summary:
      "A fraud-interception system on Android and the web, by text or voice. Detection runs in a fixed order: deterministic rules, then retrieval over past cases, then an LLM verdict grounded in that evidence, so a verdict is explained rather than invented.",
    highlight:
      "The ordering is the design: common scams never reach the model, every explanation traces to a rule or a retrieved precedent, and the rules alone still catch all 48 offline test scams.",
    rarity: "legendary",
    agent: "warden",
    stack: ["Kotlin", "React", "FastAPI", "pgvector", "Groq", "PostgreSQL"],
    metrics: [
      { label: "Held-out recall", value: "1.000" },
      { label: "Precision", value: "0.950" },
      { label: "Backend tests", value: "1,092" },
      { label: "Offline rules", value: "48 / 48" },
    ],
    repo: "https://github.com/CODER7657/raksha-ai",
    demo: "https://frontend-one-sage-77.vercel.app",
    year: 2026,
    stats: { depth: 88, rigor: 88, surface: 82, novelty: 80 },
    featured: true,
  },

  {
    slug: "charkha",
    name: "CHARKHA",
    classification: "Agent Mesh",
    tagline: "Crop fire to carbon credit, one task id.",
    plain:
      "Satellites spot crop residue burning; agents route it to a conversion unit, verify the work and issue a carbon credit anyone can check.",
    summary:
      "Five agents over Google's Agent2Agent protocol, from satellite fire detections to signed W3C verifiable credentials. Every decision is one row in an append-only, hash-chained ledger.",
    highlight:
      "Refusal is a feature: an unauthenticated agent call is rejected before the protocol handler runs, and six attacks a reviewer can run against it show each one refused.",
    rarity: "legendary",
    agent: "ledger",
    stack: ["TypeScript", "A2A", "W3C VC", "PostgreSQL"],
    metrics: [
      { label: "Tests", value: "754" },
      { label: "Agents", value: "5" },
      { label: "Ledger", value: "hash-chained" },
      { label: "Attacks shown", value: "6" },
    ],
    repo: "https://github.com/CODER7657/charkha",
    demo: null,
    year: 2026,
    stats: { depth: 90, rigor: 88, surface: 70, novelty: 86 },
    featured: true,
  },

  {
    slug: "aura-guard",
    name: "AURA-GUARD",
    classification: "Live Forecaster",
    tagline: "Air-quality forecasts that score themselves.",
    plain:
      "Hourly NO2 forecasts for US air monitors from live EPA data, with honest uncertainty, checked against what actually happened.",
    summary:
      "Gradient boosting with split-conformal 90% intervals, trained on 2024 and tested on all of 2025. An hourly job pulls live AirNow readings, publishes forecasts, and scores earlier forecasts against the readings that followed. A tool-only analyst agent answers questions from those numbers.",
    highlight:
      "The live page compares every forecast with the reading that later arrived and with persistence, and reports how many forecasts could not be scored.",
    rarity: "epic",
    agent: "oracle",
    stack: ["Python", "scikit-learn", "GitHub Actions", "Groq"],
    metrics: [
      { label: "vs persistence", value: "−33% error at 12 h" },
      { label: "Interval", value: "90% conformal" },
      { label: "Test year", value: "2025" },
      { label: "Refresh", value: "hourly" },
    ],
    repo: "https://github.com/CODER7657/AURA-GUARD",
    demo: "https://aura-guard-live.vercel.app",
    year: 2026,
    stats: { depth: 82, rigor: 90, surface: 76, novelty: 74 },
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
    slug: "voice-emotion",
    name: "VOICE EMOTION",
    classification: "Honest Evaluation",
    tagline: "I caught my own model cheating.",
    plain:
      "Speech emotion recognition that reports its real accuracy, which turned out lower than the first version claimed.",
    summary:
      "The original evaluation leaked speakers between training and test. Re-tested on unseen speakers, the old CNN fell to 0.43 macro-F1; a WavLM model reaches 0.75. It runs live as an ONNX model behind a browser app.",
    highlight:
      "The headline number went down on purpose: the honest split is the result, and the README leads with the leak it found.",
    rarity: "epic",
    agent: "forge",
    stack: ["WavLM", "ONNX Runtime", "FastAPI", "TypeScript"],
    metrics: [
      { label: "Macro-F1, unseen speakers", value: "0.75" },
      { label: "Original CNN, honest", value: "0.43" },
      { label: "Leak found", value: "speakers" },
      { label: "Status", value: "live" },
    ],
    repo: "https://github.com/CODER7657/voice-emotion-detection",
    demo: "https://vemo-api.vercel.app",
    year: 2026,
    stats: { depth: 80, rigor: 92, surface: 78, novelty: 72 },
  },

  {
    slug: "kisan-mitra",
    name: "KISAN MITRA",
    classification: "Safety-gated Assistant",
    tagline: "Crop advice that never gives a dose.",
    plain:
      "Farmers in Gujarat ask by voice and get next steps; any pesticide dose or brand is removed and they are sent to the local KVK.",
    summary:
      "Speech to text and an LLM answer, behind a deterministic guard that removes any pesticide dose or brand before the answer is spoken.",
    highlight:
      "The guard is code, not a prompt: 0 doses and 0 brands in 28 red-team attempts.",
    rarity: "rare",
    agent: "atlas",
    stack: ["FastAPI", "Groq", "Voice"],
    metrics: [
      { label: "Doses leaked", value: "0 / 28" },
      { label: "Brands leaked", value: "0 / 28" },
      { label: "Backend tests", value: "195" },
      { label: "Status", value: "live" },
    ],
    repo: "https://github.com/CODER7657/kisan_mitra",
    demo: "https://kisan-mitra-gilt.vercel.app",
    year: 2026,
    stats: { depth: 72, rigor: 84, surface: 80, novelty: 64 },
  },

  {
    slug: "complylite",
    name: "COMPLYLITE",
    classification: "Surveillance Co-pilot",
    tagline: "Compliance alerts that show their working.",
    plain:
      "Software for a stockbroker's compliance analyst: a short daily queue of the trades most likely to be manipulation, with the reasons shown.",
    summary:
      "Rules plus LightGBM rank every client and symbol each day; the top 50 go to the analyst with the rules fired, red flags and top model reasons. Measured on a simulated market with planted patterns, and it says so.",
    highlight:
      "A live demo shows the real ranked queue on ten holdout days the model never saw, with the reasons behind every alert.",
    rarity: "epic",
    agent: "warden",
    stack: ["FastAPI", "DuckDB", "LightGBM", "pandas"],
    metrics: [
      { label: "PR-AUC", value: "0.97 vs 0.38 rules" },
      { label: "Precision, top 50", value: "0.50 (best 0.51)" },
      { label: "False alarms / 10k", value: "101 vs 161" },
      { label: "Data", value: "simulated" },
    ],
    repo: "https://github.com/CODER7657/complylite",
    demo: "https://complylite-demo.vercel.app",
    year: 2026,
    stats: { depth: 78, rigor: 86, surface: 70, novelty: 62 },
  },

  {
    slug: "genex",
    name: "GENEX",
    classification: "Crisis-aware Companion",
    tagline: "Crisis messages get a helpline, not a chatbot.",
    plain:
      "A wellness chat companion where a message that may signal suicide risk gets a fixed safety reply and a helpline.",
    summary:
      "A React and Express companion. With an LLM risk judge added to phrase rules, crisis recall on a sealed held-out set rose from 3/35 to 26/35, and a CI gate fails if it drops.",
    highlight:
      "Measured, with its weakness stated: some crisis messages still get an ordinary reply, and the README says so.",
    rarity: "rare",
    agent: "oracle",
    stack: ["React", "Express", "Groq"],
    metrics: [
      { label: "Crisis recall", value: "3/35 → 26/35" },
      { label: "Held-out set", value: "sealed" },
      { label: "CI gate", value: "recall may not drop" },
      { label: "Crisis reply", value: "fixed, no LLM" },
    ],
    repo: "https://github.com/CODER7657/genex-prj",
    demo: null,
    year: 2026,
    stats: { depth: 68, rigor: 82, surface: 66, novelty: 62 },
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
