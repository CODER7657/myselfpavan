import type { Agent, AgentId } from "./types";

/* 5×5 pixel sigils. 1 = ink, 0 = paper. Hand-plotted so each reads at 16px. */

const CIPHER_SIGIL = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];

const LEDGER_SIGIL = [
  [1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 1],
  [1, 1, 0, 1, 1],
];

const ORACLE_SIGIL = [
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [1, 1, 0, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
];

const FORGE_SIGIL = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
];

const WARDEN_SIGIL = [
  [1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
];

const ATLAS_SIGIL = [
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
];

export const agents: Agent[] = [
  {
    id: "cipher",
    callsign: "CIPHER",
    discipline: "Cryptography & Protocol Security",
    motto: "I do not trust what I cannot verify twice.",
    brief:
      "Handles delegation chains, signature envelopes and the parts of a protocol that fail silently. CIPHER's standing rule is that an unchecked obligation is indistinguishable from a failed one, and must be treated as the worse of the two.",
    color: "var(--agent-cipher)",
    sigil: CIPHER_SIGIL,
    tools: ["chain.verify", "predicate.eval", "nonce.check", "index.search"],
    clearance: 1,
  },
  {
    id: "ledger",
    callsign: "LEDGER",
    discipline: "On-chain Systems & Settlement",
    motto: "If it did not settle, it did not happen.",
    brief:
      "Owns everything that touches a chain: contract surface, gas posture, wallet handshakes, and the audit trail that survives the frontend being deleted. LEDGER refuses to store a private key anywhere a process can read it.",
    color: "var(--agent-ledger)",
    sigil: LEDGER_SIGIL,
    tools: ["contract.read", "tx.trace", "github.repo", "index.search"],
    clearance: 1,
  },
  {
    id: "oracle",
    callsign: "ORACLE",
    discipline: "Applied ML & Inference",
    motto: "The model advises. It does not decide.",
    brief:
      "Runs classification, extraction and generation pipelines — and draws the line past which a model's output stops being evidence. ORACLE keeps confidence scores attached to their claims so downstream code cannot forget how sure it was.",
    color: "var(--agent-oracle)",
    sigil: ORACLE_SIGIL,
    tools: ["classify", "embed", "rank", "index.search"],
    clearance: 1,
  },
  {
    id: "forge",
    callsign: "FORGE",
    discipline: "Product & Interface Engineering",
    motto: "Ship the seam, not the sketch.",
    brief:
      "Turns a working core into something a stranger can use without a manual. FORGE cares about the boring parts — empty states, keyboard paths, what happens on the second-slowest network you will ever see.",
    color: "var(--agent-forge)",
    sigil: FORGE_SIGIL,
    tools: ["render", "route", "github.repo", "index.search"],
    clearance: 1,
  },
  {
    id: "warden",
    callsign: "WARDEN",
    discipline: "Policy, Compliance & Safety",
    motto: "Show the rule that fired, or do not act.",
    brief:
      "Encodes regulation as executable predicates and insists every verdict carries the reasoning that produced it. WARDEN's output is designed to be handed to an auditor without a translation layer.",
    color: "var(--agent-warden)",
    sigil: WARDEN_SIGIL,
    tools: ["policy.eval", "audit.write", "predicate.eval", "index.search"],
    clearance: 1,
  },
  {
    id: "atlas",
    callsign: "ATLAS",
    discipline: "Data & Infrastructure",
    motto: "The schema is the contract.",
    brief:
      "Holds the storage layer, the migrations and the shape of the data everyone else depends on. ATLAS treats an offline client as a first-class peer rather than a degraded one.",
    color: "var(--agent-atlas)",
    sigil: ATLAS_SIGIL,
    tools: ["sql.plan", "migrate.check", "github.repo", "index.search"],
    clearance: 1,
  },
];

export const agentsById: Record<AgentId, Agent> = Object.fromEntries(
  agents.map((a) => [a.id, a])
) as Record<AgentId, Agent>;
