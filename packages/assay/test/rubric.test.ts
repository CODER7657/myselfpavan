import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assess,
  EXCLUDED,
  HIDE_TOPIC,
  PROMOTION_FLOOR,
  READY_TOPIC,
  tierFor,
} from "../src/rubric";
import { empty, evidence, NOW } from "./fixtures";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("tierFor", () => {
  it.each([
    [100, "mythic"],
    [72, "mythic"],
    [71.9, "legendary"],
    [60, "legendary"],
    [48, "epic"],
    [36, "rare"],
    [35.9, "common"],
    [0, "common"],
  ])("%s scores as %s", (score, tier) => {
    expect(tierFor(score)).toBe(tier);
  });
});

describe("assess — the score", () => {
  it("is the sum of its bands, to one decimal place", () => {
    const a = assess(evidence());
    const sum = Math.round(a.bands.reduce((s, b) => s + b.earned, 0) * 10) / 10;
    expect(a.score).toBe(sum);
  });

  it("never exceeds 100, even for a repository that does everything", () => {
    const a = assess(
      evidence({
        commits: 5000, sourceFiles: 5000, sizeKb: 99999, testFiles: 999, docFiles: 99,
        releases: 9, homepage: "https://example.com", hasContainer: true, hasWorkspace: true,
        componentFiles: 99, hasDesignSystem: true, hasA11y: true, hasMotion: true,
        topics: ["a", "b", "c"],
      })
    );
    expect(a.score).toBeLessThanOrEqual(100);
  });

  it("is never negative, even for an empty repository", () => {
    expect(assess(empty()).score).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic for the same evidence", () => {
    expect(assess(evidence()).score).toBe(assess(evidence()).score);
  });
});

describe("assess — the gate", () => {
  it("promotes an ordinary public repository with no topic at all", () => {
    expect(assess(evidence()).verdict).toBe("promoted");
  });

  it("holds a repository that scores under the floor", () => {
    const a = assess(empty());
    expect(a.score).toBeLessThan(PROMOTION_FLOOR);
    expect(a.verdict).toBe("held");
    expect(a.reason).toContain(String(PROMOTION_FLOOR));
  });

  it("excludes forks, archives and listed infrastructure", () => {
    expect(assess(evidence({ isFork: true })).verdict).toBe("excluded");
    expect(assess(evidence({ isArchived: true })).verdict).toBe("excluded");
    const listed = [...EXCLUDED][0]!;
    expect(assess(evidence({ name: listed })).verdict).toBe("excluded");
  });

  it("hides a repository carrying the hide topic, whatever it scores", () => {
    const a = assess(evidence({ topics: [HIDE_TOPIC] }));
    expect(a.verdict).toBe("not-ready");
    expect(a.score).toBeGreaterThan(PROMOTION_FLOOR);
  });

  it("puts exclusion ahead of hiding", () => {
    expect(assess(evidence({ isFork: true, topics: [HIDE_TOPIC] })).verdict).toBe("excluded");
  });

  it("still computes the score of a hidden repository, exactly as if visible", () => {
    /* Compared against a repository with one ordinary topic, because carrying
       any topic at all earns the one-point "Topics" signal. */
    const hidden = assess(evidence({ topics: [HIDE_TOPIC] })).score;
    const visible = assess(evidence({ topics: ["typescript"] })).score;
    expect(hidden).toBe(visible);
  });

  it("offers at most three next steps, each with advice", () => {
    const a = assess(empty());
    expect(a.nextSteps.length).toBeLessThanOrEqual(3);
    for (const step of a.nextSteps) expect(step.length).toBeGreaterThan(0);
  });

  it("grades a private repository with no topic, like a public one", () => {
    expect(assess(evidence({ isPrivate: true })).verdict).toBe("promoted");
  });

  it("still hides a private repository carrying the hide topic", () => {
    expect(assess(evidence({ isPrivate: true, topics: [HIDE_TOPIC] })).verdict).toBe("not-ready");
  });

  it("keeps READY_TOPIC and HIDE_TOPIC distinct", () => {
    expect(READY_TOPIC).not.toBe(HIDE_TOPIC);
  });
});

describe("assess — live deployment", () => {
  const demo = (over: Parameters<typeof evidence>[0]) =>
    assess(evidence(over)).bands.flatMap((b) => b.signals).find((s) => s.id === "demo")!;

  it("pays five points for a homepage that answers", () => {
    expect(demo({ homepage: "https://x.dev", homepageLive: "live" }).earned).toBe(5);
  });

  it("pays nothing for a homepage that does not, and says what to do", () => {
    const s = demo({ homepage: "https://x.dev", homepageLive: "down" });
    expect(s.earned).toBe(0);
    expect(s.advice).toMatch(/does not respond/);
  });

  it("gives older evidence with no reading the benefit of the doubt", () => {
    expect(demo({ homepage: "https://x.dev" }).earned).toBe(5);
  });

  it("pays nothing, and advises setting one, with no homepage", () => {
    const s = demo({ homepage: null });
    expect(s.earned).toBe(0);
    expect(s.advice).toMatch(/homepage/);
  });
});

describe("assess — recency is stepped, not continuous", () => {
  it("scores the same a day later when nothing changed", () => {
    const e = evidence();
    const today = assess(e).score;
    vi.setSystemTime(NOW + 86_400_000);
    expect(assess(e).score).toBe(today);
  });
});
