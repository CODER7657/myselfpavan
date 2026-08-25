import type { Rarity } from "@foundry/tokens";

/** The six operatives. Each one owns a domain of the work. */
export type AgentId =
  | "cipher"
  | "ledger"
  | "oracle"
  | "forge"
  | "warden"
  | "atlas";

export interface Agent {
  id: AgentId;
  /** Display callsign, always rendered upper-case. */
  callsign: string;
  /** The human-readable discipline behind the callsign. */
  discipline: string;
  /** One line, first-person, in the agent's own register. */
  motto: string;
  /** Longer briefing shown once the agent is recruited. */
  brief: string;
  /** CSS custom property holding this agent's pigment. */
  color: string;
  /** Glyph drawn in the roster tile — a 5×5 pixel matrix. */
  sigil: number[][];
  /** Tools this agent is allowed to call at runtime. */
  tools: string[];
  /** Operator level required before the agent unlocks. */
  clearance: number;
}

export interface ProjectMetric {
  label: string;
  value: string;
}

export interface Project {
  slug: string;
  name: string;
  /** Short kicker rendered above the name on the card. */
  classification: string;
  tagline: string;
  /** One sentence, no jargon — what this is, for a reader who is not an engineer. */
  plain: string;
  /** Two or three sentences. What it is, and what is genuinely hard about it. */
  summary: string;
  /** The single most defensible claim, stated plainly. */
  highlight: string;
  rarity: Rarity;
  /** Which operative claims this project. Drives colour and filtering. */
  agent: AgentId;
  stack: string[];
  metrics: ProjectMetric[];
  repo: string | null;
  demo: string | null;
  /** Set when the source is not public. Rendered as a badge rather than a dead link. */
  private?: boolean;
  year: number;
  /** Card stats, 0–100. Rendered as the pixel bar block on the card back. */
  stats: {
    depth: number;
    rigor: number;
    surface: number;
    novelty: number;
  };
  /** Set for the one or two things worth leading with. */
  featured?: boolean;
}

export interface SkillNode {
  id: string;
  label: string;
  agent: AgentId;
  /** 0–100. Honest, not flattering. */
  level: number;
  /** Node ids that must be unlocked first. Drives the tree edges. */
  requires: string[];
  note: string;
}

export interface TimelineEntry {
  id: string;
  period: string;
  title: string;
  org: string;
  kind: "education" | "build" | "recognition";
  detail: string;
  tags: string[];
}

export interface Achievement {
  id: string;
  name: string;
  hint: string;
  xp: number;
  /** Hidden achievements are shown as ??? until earned. */
  secret?: boolean;
}

/** A single executable step inside a mission plan. */
export interface MissionStep {
  id: string;
  agent: AgentId;
  /** Imperative, as an operator would write a ticket. */
  action: string;
  /** Tool the step invokes. Must be present in the agent's tool list. */
  tool: string;
  /** Arguments handed to the tool. Omitted steps get a sensible default. */
  args?: Record<string, unknown>;
  /** Step ids that must resolve before this one may start. */
  needs: string[];
  /** Lines the agent streams while working. Rendered token by token. */
  thought: string[];
  /** Rough cost in simulated tokens; drives the meter, not billing. */
  cost: number;
}

export interface Mission {
  id: string;
  code: string;
  title: string;
  objective: string;
  /** What the operator earns, and what section of the site it reveals. */
  reveals: string;
  xp: number;
  steps: MissionStep[];
}

export interface Profile {
  name: string;
  handle: string;
  title: string;
  location: string;
  email: string;
  github: string;
  linkedin: string;
  x: string;
  site: string;
  status: string;
  pitch: string;
  availability: {
    headline: string;
    detail: string;
    interests: string[];
    fullTime: boolean;
  };
  /** Jargon-free version, for readers who are not engineers. */
  plain: string[];
  bio: string[];
}

/** One row of the breadth panel in the dossier. */
export interface Domain {
  label: string;
  note: string;
  examples: string[];
}

export interface Credential {
  id: string;
  name: string;
  issuer: string;
  issued: string;
  kind: "award" | "certification" | "role";
  detail: string;
  skills: string[];
}

export interface StackGroup {
  label: string;
  items: string[];
}

/** One row of the live GitHub archive table. */
export interface RepoRow {
  name: string;
  url: string;
  language: string | null;
  description: string | null;
  fork: boolean;
  stars: number;
  pushed: string;
}
