import type { Domain, Profile } from "./types";

export const profile: Profile = {
  name: "Pavan Patel",
  handle: "CODER7657",
  title: "AI Systems & Security Engineer",
  location: "Gujarat, India",
  email: "pavanpatela5598@gmail.com",
  github: "https://github.com/CODER7657",
  linkedin: "https://www.linkedin.com/in/pavan-patel-559195261/",
  x: "https://x.com/pavan_pate78009",
  site: "https://myselfpavan.vercel.app",
  status: "Open to internships — AI, ML, security, or anything adjacent",

  /** The one-line version, for the hero. */
  pitch: "I build the thing — then I build the thing that catches it lying.",

  /**
   * Availability, stated the way it actually is: the domain matters less than
   * the problem. Narrowing this to one field would be inventing a constraint
   * that does not exist.
   */
  availability: {
    headline: "Open to internships, and ready for full-time.",
    detail:
      "AI, machine learning, cybersecurity, backend, agent systems — I am not fixed on one of them. If the work is close to any of it, or just interesting, it is worth a conversation.",
    interests: [
      "AI / Agent systems",
      "Machine learning",
      "Cybersecurity",
      "Backend & infrastructure",
      "Blockchain",
      "Anything adjacent",
    ],
    fullTime: true,
  },

  /**
   * Jargon-free. A recruiter, or a parent, should finish these three short
   * paragraphs knowing what he does and roughly how wide the range is.
   */
  plain: [
    "I build software that gets trusted to decide something on its own — clear a payment, flag a scam, grade another program's work.",
    "Systems like that fail quietly. Nobody gets an error; the fraud just goes through, or a test reports a pass for something that never ran. So most of my work is the checking layer — the part that has to be convinced before anything actually happens. Two of those checks turned up real bugs in Google's payment software, now filed publicly on their repository.",
    "The subject matter moves around a lot: payments, scams, compliance, crop advice, mental health, voice, air quality. The question underneath never changes — how do you know this thing is right?",
  ],

  /**
   * Sharp version. Written to show the spread across the
   * repositories rather than to restate the three headline projects.
   */
  bio: [
    "I work at the point where software stops advising and starts acting. That is where failures go silent, so that is where I build.",
    "Concretely: a verification gate for agent-initiated payments where an unchecked obligation is treated as harshly as a failed one; a fraud-interception stack ordered rules → retrieval → model, so a verdict is always traceable to evidence; and twenty-two sealed benchmark tasks whose graders I proved sound three ways before trusting a single score.",
    "Around those sits a wider set — compliance surveillance over DuckDB, crop advice whose guard removes every pesticide dose, hourly air-quality forecasts scored against live readings, agents that carry a satellite fire detection through to a signed carbon credential, a crisis-routing wellness companion, a speech-emotion model re-tested after I found my own data leaks. Different domains, one habit: decide what must not fail silently, then make that structural rather than remembered.",
    "Python, TypeScript, Rust, Kotlin, Solidity. Two undergraduate degrees in parallel — BS Computer Science at BITS Pilani, BTech Computer Engineering at GTU.",
  ],
};

/**
 * The breadth, made countable.
 *
 * A single narrative flattens thirty repositories into three stories. This puts
 * the range back, and every row names what was actually built rather than
 * claiming a competency in the abstract.
 */
export const domains: Domain[] = [
  {
    label: "Verification & policy",
    note: "Turning rules into checks a system cannot skip, and evidence an auditor can replay.",
    examples: ["PRAMANA", "AP2 #339 / #340", "ComplyLite"],
  },
  {
    label: "Agent systems & evals",
    note: "Task graphs planned at runtime, and graders built so an agent cannot score by doing nothing.",
    examples: ["CHARKHA", "Terminal-Bench tasks", "This console"],
  },
  {
    label: "Applied ML",
    note: "Retrieval, classification and signal work — with the confidence kept attached to the claim.",
    examples: ["Raksha AI", "AURA-GUARD", "Voice emotion"],
  },
  {
    label: "Safety-gated AI",
    note: "A deterministic guard after the model, so an unsafe answer cannot ship.",
    examples: ["Kisan Mitra", "GENEX", "Raksha AI"],
  },
  {
    label: "Backend & data",
    note: "Schemas as contracts, migrations owned by the repo, tests against a real database.",
    examples: ["ComplyLite", "AURA-GUARD", "CHARKHA"],
  },
  {
    label: "Product surface",
    note: "Android and web clients, motion systems, design tokens gated on contrast in CI.",
    examples: ["Raksha AI", "Voice emotion", "This console"],
  },
];
