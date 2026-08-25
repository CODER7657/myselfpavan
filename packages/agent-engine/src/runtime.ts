import type { Mission, MissionStep } from "@foundry/content";
import { hashString, mulberry32 } from "./prng";
import { callTool } from "./tools";
import type { RunEvent, RunHandle, RunOptions } from "./types";

/**
 * A minimal async queue: concurrent producers push, a single consumer drains.
 * The runtime needs this because several steps run at once and all of them emit
 * into one ordered stream.
 */
class EventQueue<T> {
  private items: T[] = [];
  private waiting: ((r: IteratorResult<T>) => void)[] = [];
  private closed = false;

  push(value: T): void {
    if (this.closed) return;
    const w = this.waiting.shift();
    if (w) w({ value, done: false });
    else this.items.push(value);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    while (this.waiting.length) {
      this.waiting.shift()!({ value: undefined as never, done: true });
    }
  }

  async *drain(): AsyncGenerator<T, void, void> {
    while (true) {
      if (this.items.length) {
        yield this.items.shift() as T;
        continue;
      }
      if (this.closed) return;
      const next = await new Promise<IteratorResult<T>>((resolve) => {
        this.waiting.push(resolve);
      });
      if (next.done) return;
      yield next.value;
    }
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });

/**
 * Topological levels. Only used to draw the plan before it runs — execution
 * does not wait for a level to complete, it waits for a step's own dependencies.
 */
export function planLevels(steps: MissionStep[]): string[][] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const depth = new Map<string, number>();

  const resolve = (id: string, seen: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (seen.has(id)) throw new Error("cycle in plan at step " + id);
    seen.add(id);
    const step = byId.get(id);
    const d = !step || step.needs.length === 0
      ? 0
      : 1 + Math.max(...step.needs.map((n) => resolve(n, seen)));
    seen.delete(id);
    depth.set(id, d);
    return d;
  };

  for (const s of steps) resolve(s.id, new Set());

  const levels: string[][] = [];
  for (const s of steps) {
    const d = depth.get(s.id)!;
    (levels[d] ??= []).push(s.id);
  }
  return levels;
}

/**
 * Executes a mission plan.
 *
 * Every step is launched immediately as a promise that first awaits its own
 * dependencies, so concurrency falls out of the graph rather than being
 * scheduled: two independent steps genuinely run at the same time, interleave
 * their token streams, and may finish out of declaration order.
 */
export function runMission(mission: Mission, opts: RunOptions = {}): RunHandle {
  const controller = new AbortController();
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const signal = controller.signal;

  const instant = opts.instant ?? false;
  const speed = instant ? 0 : Math.max(0.05, opts.speed ?? 1);
  const rng = mulberry32(opts.seed ?? hashString(mission.id));

  const queue = new EventQueue<RunEvent>();
  const started = Date.now();
  let totalTokens = 0;

  const pace = (ms: number) => sleep(ms * speed, signal);

  async function streamLine(step: MissionStep, line: string): Promise<void> {
    let i = 0;
    while (i < line.length) {
      if (signal.aborted) return;
      // Chunk sizes vary the way a real token stream does — a few characters at
      // a time, occasionally a whole short word.
      const chunk = 1 + Math.floor(rng() * 4);
      const text = line.slice(i, i + chunk);
      i += chunk;
      totalTokens += 1;
      queue.push({ type: "token", stepId: step.id, text });
      await pace(9 + rng() * 22);
    }
    queue.push({ type: "token", stepId: step.id, text: "\n" });
    await pace(90 + rng() * 120);
  }

  async function execute(step: MissionStep): Promise<void> {
    if (signal.aborted) return;

    queue.push({ type: "step:start", stepId: step.id, agent: step.agent, tool: step.tool });
    await pace(120 + rng() * 220);
    if (signal.aborted) return;

    const args =
      step.args ??
      (step.tool === "index.search"
        ? { q: step.action }
        : step.tool === "embed" || step.tool === "classify"
          ? { text: step.action }
          : step.tool === "predicate.eval"
            ? { withheld: 3 }
            : {});

    queue.push({ type: "tool:call", stepId: step.id, call: { tool: step.tool, args } });

    // The tool call is real; the extra pause is there so the trace is legible.
    const [result] = await Promise.all([callTool(step.tool, args), pace(200 + rng() * 340)]);
    if (signal.aborted) return;

    queue.push({ type: "tool:result", stepId: step.id, result });

    await pace(80 + rng() * 120);
    for (const line of step.thought) {
      if (signal.aborted) return;
      await streamLine(step, line);
    }

    if (signal.aborted) return;
    queue.push({
      type: "step:done",
      stepId: step.id,
      tokens: step.cost,
      ms: Date.now() - started,
    });
  }

  async function drive(): Promise<void> {
    let order: string[][];
    try {
      order = planLevels(mission.steps);
    } catch (err) {
      queue.push({
        type: "step:failed",
        stepId: mission.steps[0]?.id ?? "plan",
        reason: err instanceof Error ? err.message : String(err),
      });
      queue.close();
      return;
    }

    queue.push({ type: "run:start", missionId: mission.id, order });
    await pace(240);

    const settled = new Map<string, Promise<void>>();

    for (const step of mission.steps) {
      const task = (async () => {
        if (step.needs.length) {
          await Promise.all(step.needs.map((id) => settled.get(id) ?? Promise.resolve()));
          if (!signal.aborted) queue.push({ type: "step:unblocked", stepId: step.id });
        }
        await execute(step);
      })();
      settled.set(step.id, task);
    }

    await Promise.all(settled.values());

    if (signal.aborted) {
      queue.push({ type: "run:aborted", missionId: mission.id });
    } else {
      queue.push({
        type: "run:done",
        missionId: mission.id,
        tokens: mission.steps.reduce((s, x) => s + x.cost, 0),
        ms: Date.now() - started,
      });
    }
    queue.close();
  }

  void drive();

  return {
    mission,
    events: queue.drain(),
    abort: () => {
      controller.abort();
      queue.close();
    },
  };
}

export { totalCost };

function totalCost(mission: Mission): number {
  return mission.steps.reduce((s, x) => s + x.cost, 0);
}
