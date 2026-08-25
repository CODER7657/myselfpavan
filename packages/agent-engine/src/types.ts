import type { AgentId, Mission, MissionStep } from "@foundry/content";

export type StepStatus = "pending" | "blocked" | "running" | "done" | "failed";

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  tool: string;
  /** One line, rendered verbatim in the trace. */
  summary: string;
  /** Arbitrary payload the step may fold into its own output. */
  data?: unknown;
  /** Wall-clock milliseconds the call actually took. */
  ms: number;
  ok: boolean;
}

export interface StepState {
  id: string;
  agent: AgentId;
  action: string;
  tool: string;
  needs: string[];
  status: StepStatus;
  /** Streamed characters accumulated so far. */
  output: string;
  tokens: number;
  startedAt: number | null;
  endedAt: number | null;
  toolResult: ToolResult | null;
}

export type RunEvent =
  | { type: "run:start"; missionId: string; order: string[][] }
  | { type: "step:unblocked"; stepId: string }
  | { type: "step:start"; stepId: string; agent: AgentId; tool: string }
  | { type: "tool:call"; stepId: string; call: ToolCall }
  | { type: "tool:result"; stepId: string; result: ToolResult }
  | { type: "token"; stepId: string; text: string }
  | { type: "step:done"; stepId: string; tokens: number; ms: number }
  | { type: "step:failed"; stepId: string; reason: string }
  | { type: "run:done"; missionId: string; tokens: number; ms: number }
  | { type: "run:aborted"; missionId: string };

export interface RunOptions {
  /** Multiplier on every simulated delay. 1 is the authored pace. */
  speed?: number;
  /** Seeds the pacing and jitter so a run is reproducible. */
  seed?: number;
  /** Collapses all delays to near-zero for reduced-motion users. */
  instant?: boolean;
  signal?: AbortSignal;
}

export interface RunHandle {
  mission: Mission;
  events: AsyncGenerator<RunEvent, void, void>;
  abort: () => void;
}

export type { AgentId, Mission, MissionStep };
