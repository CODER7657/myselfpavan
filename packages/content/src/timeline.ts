import type { Achievement, Credential, TimelineEntry } from "./types";

export const timeline: TimelineEntry[] = [
  {
    id: "bits",
    period: "Aug 2024 — May 2027",
    title: "BS, Computer Science",
    org: "Birla Institute of Technology and Science, Pilani",
    kind: "education",
    detail:
      "One of two undergraduate degrees read in parallel. Coursework spans AWS tooling and artificial intelligence alongside core computer science.",
    tags: ["BITS Pilani", "AI", "AWS CLI", "In progress"],
  },
  {
    id: "gtu",
    period: "Aug 2024 — Apr 2028",
    title: "BTech, Computer Engineering",
    org: "Gujarat Technological University — New LJ Institute of Technology",
    kind: "education",
    detail:
      "The second parallel degree. Where the applied ML, signal-processing and systems work started.",
    tags: ["GTU", "New LJIET", "In progress"],
  },
  {
    id: "foundations",
    period: "2025",
    title: "Security and on-chain foundations",
    org: "Self-directed",
    kind: "build",
    detail:
      "On-chain verification experiments, a compliance surveillance engine over DuckDB, a CNN classifier over live audio and a first air-quality forecaster. Unrelated domains, one recurring question: what makes an automated verdict defensible?",
    tags: ["ComplyLite", "Voice Emotion", "AURA-GUARD"],
  },
  {
    id: "hackathons",
    period: "2026",
    title: "Team lead, gtu-radar",
    org: "HashHawks",
    kind: "build",
    detail:
      "A Telegram bot that sends each GTU student only the notices for their course, semester and branch: an 8-agent pipeline on Redis Streams with 1,000+ tests and 1,346 of 1,346 live timetable rows parsed correctly. Lead and top human contributor.",
    tags: ["gtu-radar", "Team lead", "Redis Streams"],
  },
  {
    id: "evals",
    period: "2026",
    title: "Evaluation harness authoring",
    org: "Harbor · Terminal-Bench",
    kind: "build",
    detail:
      "22 container-isolated benchmark tasks, digest-pinned, with verifiers proved sound three ways — the oracle solution scores 1.00, an agent that does nothing scores 0.00, and a deliberately sabotaged solution also scores 0.00. The tasks themselves are not public; a teardown of one broken task is.",
    tags: ["22 tasks", "Harbor", "Docker", "Tasks not public"],
  },
  {
    id: "pramana",
    period: "2026",
    title: "PRAMANA",
    org: "Independent research",
    kind: "build",
    detail:
      "A deterministic verification gate for agent-initiated payments. 711 tests, a 65.3% mutation score, and a type-level distinction between an obligation that passed and one that was never checked.",
    tags: ["AP2", "Policy-as-code", "Apache-2.0"],
  },
  {
    id: "ap2",
    period: "2026",
    title: "Two defects filed against Google's AP2",
    org: "google-agentic-commerce/AP2",
    kind: "recognition",
    detail:
      "Found while building against the reference implementation. Google confirmed the mechanism, classified it as intended behaviour, and invited a public issue. Filed as AP2#339 and AP2#340, with a harness that reproduces both in about thirty seconds.",
    tags: ["Issue #339", "PR #340", "Acknowledged"],
  },
];

/**
 * Awards and appointments — kept out of the timeline above so the same fact is
 * never stated twice on one page. Thirteen certifications are listed on
 * LinkedIn; these four are the ones with a competitive result or a selection
 * behind them.
 */
export const credentials: Credential[] = [
  {
    id: "maverick",
    name: "The Maverick Effect AI Challenge 2026",
    issuer: "Dewang Mehta Foundation",
    issued: "Aug 2026",
    kind: "award",
    detail: "Hackathon finalist · Certificate of Appreciation",
    skills: ["Fraud Detection", "Fraud Analysis", "+3"],
  },
  {
    id: "rotahack",
    name: "ROTAHACK 2025 — 1st runner-up",
    issuer: "Rotaract Club of New L.J.I.E.T",
    issued: "Aug 2025",
    kind: "award",
    detail: "Placed second overall",
    skills: ["React.js", "Blockchain", "+1"],
  },
  {
    id: "perplexity",
    name: "Campus Partner",
    issuer: "Perplexity",
    issued: "Aug — Nov 2025",
    kind: "role",
    detail: "Selected as a Campus Partner for fall 2025",
    skills: ["Science & Technology"],
  },
  {
    id: "internshala",
    name: "Campus Partner",
    issuer: "Internshala",
    issued: "Aug — Sep 2025",
    kind: "role",
    detail: "Campus representative",
    skills: ["Science & Technology"],
  },
];

export const achievements: Achievement[] = [
  { id: "first-contact", name: "First Contact", hint: "Recruit your first operative.", xp: 40 },
  { id: "full-roster", name: "Full Roster", hint: "Recruit all six operatives.", xp: 200 },
  { id: "first-run", name: "Cold Start", hint: "Run your first mission.", xp: 60 },
  { id: "all-missions", name: "Campaign Complete", hint: "Run every mission on the board.", xp: 400 },
  { id: "collector", name: "Archivist", hint: "Turn over four project cards.", xp: 120 },
  { id: "mythic", name: "Held the Mythic", hint: "Turn over the mythic-tier card.", xp: 150 },
  { id: "deep-reader", name: "Read the Footnotes", hint: "Reach the end of the career log.", xp: 80 },
  { id: "terminal", name: "Shell Access", hint: "Run a command in the console.", xp: 70 },
  {
    id: "konami",
    name: "↑↑↓↓←→←→BA",
    hint: "Some habits survive every console generation.",
    xp: 250,
    secret: true,
  },
  { id: "theme", name: "Night Shift", hint: "Work the other stock.", xp: 50, secret: true },
];
