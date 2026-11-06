import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assess } from "../src/rubric";
import { fromSealed, lostAccess, withSealed, type SealedRecord } from "../src/sealed";
import { ageOf, pushedSince } from "../src/freshness";
import { evidence, NOW } from "./fixtures";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const record = (over: Partial<SealedRecord> = {}): SealedRecord => ({
  name: "secret-project",
  score: 66.7,
  tier: "legendary",
  verdict: "promoted",
  reason: null,
  commits: 167,
  pushedAt: "2026-10-01T00:00:00Z",
  bands: [{ id: "depth", label: "Depth of work", earned: 15, max: 18 }],
  ...over,
});

describe("fromSealed", () => {
  it("keeps the grade and drops everything that could describe the code", () => {
    const a = fromSealed(record());
    expect(a.sealed).toBe(true);
    expect(a.url).toBe("");
    expect(a.score).toBe(66.7);
    expect(a.evidence.description).toBeNull();
    expect(a.evidence.readmeLede).toBeNull();
    expect(a.evidence.topics).toEqual([]);
    expect(a.evidence.homepage).toBeNull();
    expect(a.bands[0]!.signals).toEqual([]);
    expect(a.nextSteps).toEqual([]);
  });

  it("carries the commit count and last push, which are published", () => {
    const a = fromSealed(record());
    expect(a.evidence.commits).toBe(167);
    expect(a.evidence.pushedAt).toBe("2026-10-01T00:00:00Z");
  });
});

describe("withSealed", () => {
  it("adds private grades beside public ones", () => {
    const merged = withSealed([assess(evidence({ name: "public-one" }))], [record()]);
    expect(merged.map((a) => a.name)).toEqual(["public-one", "secret-project"]);
  });

  it("lets the public reading win a name clash, case-insensitively", () => {
    const pub = assess(evidence({ name: "Secret-Project" }));
    const merged = withSealed([pub], [record()]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.sealed).toBeUndefined();
  });

  it("treats a missing sealed list as empty", () => {
    expect(withSealed([], undefined)).toEqual([]);
  });
});

describe("ageOf", () => {
  it("returns null for a missing or unparseable timestamp", () => {
    expect(ageOf(null)).toBeNull();
    expect(ageOf("not a date")).toBeNull();
  });

  it.each([
    [0.5, "in the last hour", "fresh"],
    [4, "four hours ago", "fresh"],
    [12, "twelve hours ago", "ageing"],
    [30, "yesterday", "ageing"],
    [72, "three days ago", "stale"],
  ])("%s hours old reads as %s and is %s", (hours, label, level) => {
    const a = ageOf(new Date(NOW - hours * 3_600_000).toISOString(), NOW)!;
    expect(a.label).toBe(label);
    expect(a.level).toBe(level);
  });

  it("never reports a negative age for a clock that runs ahead", () => {
    expect(ageOf(new Date(NOW + 60_000).toISOString(), NOW)!.hours).toBe(0);
  });
});

describe("pushedSince", () => {
  it("is true only when GitHub's date is later than the snapshot's", () => {
    expect(pushedSince("2026-10-01T09:00:00Z", "2026-10-02")).toBe(true);
    expect(pushedSince("2026-10-01T09:00:00Z", "2026-10-01")).toBe(false);
    expect(pushedSince("2026-10-01T09:00:00Z", "2026-09-30")).toBe(false);
  });

  it("is false when either side is missing", () => {
    expect(pushedSince(undefined, "2026-10-02")).toBe(false);
    expect(pushedSince("2026-10-01T00:00:00Z", undefined)).toBe(false);
  });
});

describe("lostAccess", () => {
  const prior = [record({ name: "trinetra" }), record({ name: "saakshi" })];

  it("reproduces the wipe: a token that sees none of last run's repositories has lost access", () => {
    expect(lostAccess(prior, [])).toBe(true);
    expect(lostAccess(prior, ["some-other-private-repo"])).toBe(true);
  });

  it("is a real change when at least one previous repository is still visible", () => {
    expect(lostAccess(prior, ["trinetra"])).toBe(false);
  });

  it("matches names case-insensitively", () => {
    expect(lostAccess(prior, ["SAAKSHI"])).toBe(false);
  });

  it("never blocks a first run with nothing graded before", () => {
    expect(lostAccess([], [])).toBe(false);
  });
});
