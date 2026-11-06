import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeDeparture, explainDeparture } from "../src/departures";
import { authorship } from "../src/membership";
import { checkableUrl, livenessOf } from "../src/liveness";
import { checkSealed, checkSnapshot, COLLAPSE } from "../src/snapshot";
import { empty, evidence, NOW } from "./fixtures";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

/* ── departures ─────────────────────────────────────────────────────────── */

describe("explainDeparture", () => {
  const expected = "CODER7657/roadside-app";

  it("explains the real failure: a transfer into an organisation", () => {
    const d = explainDeparture(expected, {
      status: "found",
      fullName: "Hash-Hawks/roadside-app",
      private: false,
    });
    expect(d).toEqual({ name: "roadside-app", why: "transferred", now: "Hash-Hawks/roadside-app" });
  });

  it("explains a 404 as deleted or made private", () => {
    expect(explainDeparture(expected, { status: "missing" })?.why).toBe("not-found");
  });

  it("explains a repository made private", () => {
    const d = explainDeparture(expected, { status: "found", fullName: expected, private: true });
    expect(d?.why).toBe("made-private");
  });

  it("explains a rename under the same owner", () => {
    const d = explainDeparture(expected, {
      status: "found",
      fullName: "CODER7657/roadside",
      private: false,
    });
    expect(d).toEqual({ name: "roadside-app", why: "renamed", now: "CODER7657/roadside" });
  });

  it("refuses to explain a repository that is still exactly where it was", () => {
    expect(explainDeparture(expected, { status: "found", fullName: expected, private: false })).toBeNull();
  });

  it("compares owners and names case-insensitively", () => {
    expect(
      explainDeparture(expected, { status: "found", fullName: "coder7657/ROADSIDE-APP", private: false })
    ).toBeNull();
  });

  it("describes each reason in plain words", () => {
    expect(describeDeparture({ name: "x", why: "transferred", now: "Org/x" })).toBe("x — transferred to Org/x");
    expect(describeDeparture({ name: "x", why: "not-found" })).toContain("deleted");
  });
});

/* ── authorship ─────────────────────────────────────────────────────────── */

describe("authorship", () => {
  it("counts a repository whose commits are mostly this account's", () => {
    const a = authorship("CODER7657", [
      { login: "CODER7657", contributions: 80 },
      { login: "friend", contributions: 20 },
    ]);
    expect(a).toEqual({ share: 0.8, mine: true });
  });

  it("does not claim a friend's repository with a handful of commits", () => {
    const a = authorship("CODER7657", [
      { login: "friend", contributions: 95 },
      { login: "CODER7657", contributions: 5 },
    ]);
    expect(a.mine).toBe(false);
  });

  it("counts exactly half as the owner's", () => {
    const a = authorship("CODER7657", [
      { login: "CODER7657", contributions: 50 },
      { login: "friend", contributions: 50 },
    ]);
    expect(a.mine).toBe(true);
  });

  it("ignores bots on both sides of the count", () => {
    const a = authorship("CODER7657", [
      { login: "CODER7657", contributions: 10 },
      { login: "friend", contributions: 9 },
      { login: "dependabot[bot]", contributions: 500, type: "Bot" },
    ]);
    expect(a.mine).toBe(true);
  });

  it("matches the login case-insensitively", () => {
    expect(authorship("coder7657", [{ login: "CODER7657", contributions: 3 }]).mine).toBe(true);
  });

  it("is not the owner's when there are no human commits at all", () => {
    expect(authorship("CODER7657", [])).toEqual({ share: 0, mine: false });
    expect(authorship("CODER7657", [{ login: "renovate[bot]", contributions: 9 }]).mine).toBe(false);
  });
});

/* ── liveness ───────────────────────────────────────────────────────────── */

describe("livenessOf", () => {
  it.each([
    [200, "live"], [204, "live"], [301, "live"], [308, "live"],
    [401, "live"], [403, "live"], [429, "live"],
    [404, "down"], [410, "down"], [500, "down"], [502, "down"], [503, "down"],
    [null, "down"],
  ])("status %s is %s", (status, expected) => {
    expect(livenessOf(status as number | null)).toBe(expected);
  });
});

describe("checkableUrl", () => {
  it("accepts absolute http and https addresses", () => {
    expect(checkableUrl("https://charkha.example.com")).toBe("https://charkha.example.com/");
    expect(checkableUrl("  http://x.dev/path ")).toBe("http://x.dev/path");
  });

  it("rejects free text, bare domains and other schemes", () => {
    for (const raw of ["coming soon", "example.com", "javascript:alert(1)", "ftp://x.dev", "", null, undefined]) {
      expect(checkableUrl(raw)).toBeNull();
    }
  });
});

/* ── snapshot ───────────────────────────────────────────────────────────── */

describe("checkSnapshot", () => {
  const before = { repos: [evidence({ name: "pramana" }), evidence({ name: "roadside-app" })] };

  it("passes an unchanged snapshot", () => {
    expect(checkSnapshot(before, before).complaints).toEqual([]);
  });

  it("reproduces the month-long failure: an unexplained vanish is refused", () => {
    const now = { repos: [evidence({ name: "pramana" })] };
    const v = checkSnapshot(before, now);
    expect(v.complaints).toHaveLength(1);
    expect(v.complaints[0]).toContain("roadside-app");
  });

  it("accepts the same vanish once GitHub has confirmed the transfer", () => {
    const now = {
      repos: [evidence({ name: "pramana" })],
      departed: [{ name: "roadside-app", why: "transferred" as const, now: "Hash-Hawks/roadside-app" }],
    };
    const v = checkSnapshot(before, now);
    expect(v.complaints).toEqual([]);
    expect(v.departures).toEqual(["roadside-app — transferred to Hash-Hawks/roadside-app"]);
  });

  it("measures shrinkage net of confirmed departures", () => {
    const many = { repos: ["a", "b", "c", "d", "e"].map((n) => evidence({ name: n })) };
    const now = {
      repos: [evidence({ name: "a" })],
      departed: ["b", "c", "d", "e"].map((n) => ({ name: n, why: "made-private" as const })),
    };
    expect(checkSnapshot(many, now).complaints).toEqual([]);
  });

  it("refuses a score collapse with no push and no topic change behind it", () => {
    const now = { repos: [evidence({ name: "pramana" }), empty({ name: "roadside-app", pushedAt: before.repos[1]!.pushedAt, topics: [] })] };
    const v = checkSnapshot(before, now);
    expect(v.collapses.map((c) => c.name)).toEqual(["roadside-app"]);
    expect(v.collapses[0]!.drop).toBeGreaterThanOrEqual(COLLAPSE);
  });

  it("allows the same fall when the repository was pushed to", () => {
    const now = { repos: [evidence({ name: "pramana" }), empty({ name: "roadside-app", pushedAt: new Date(NOW).toISOString() })] };
    expect(checkSnapshot(before, now).collapses).toEqual([]);
  });

  it("does not judge an entry carried forward from the last run", () => {
    const now = { repos: [evidence({ name: "pramana" }), { ...empty({ name: "roadside-app", pushedAt: before.repos[1]!.pushedAt }), carriedForward: true } as never] };
    expect(checkSnapshot(before, now).collapses).toEqual([]);
  });
});

describe("checkSealed", () => {
  const ok = { name: "trinetra", score: 67.9, tier: "legendary", verdict: "promoted", reason: null, commits: 53, pushedAt: "2026-09-10", bands: [{ id: "depth", label: "Depth", earned: 10, max: 18 }] };

  it("passes a record carrying only the allowed fields", () => {
    expect(checkSealed({ records: [ok] })).toEqual([]);
  });

  it("refuses a description, a README lede or a band detail", () => {
    expect(checkSealed({ records: [{ ...ok, description: "secret" }] })[0]).toContain("description");
    expect(checkSealed({ records: [{ ...ok, readmeLede: "secret" }] })[0]).toContain("readmeLede");
    expect(checkSealed({ records: [{ ...ok, bands: [{ id: "d", label: "D", earned: 1, max: 2, detail: "x" }] }] })[0]).toContain("detail");
  });

  it("refuses a URL hidden in an allowed field", () => {
    const leaks = checkSealed({ records: [{ ...ok, reason: "see https://github.com/CODER7657/trinetra" }] });
    expect(leaks.some((l) => l.includes("URL"))).toBe(true);
  });

  it("treats a missing file or an empty list as nothing to check", () => {
    expect(checkSealed(undefined)).toEqual([]);
    expect(checkSealed({ records: [] })).toEqual([]);
  });

  it("refuses a malformed file rather than assuming it is safe", () => {
    expect(checkSealed("nope")).toHaveLength(1);
    expect(checkSealed({ records: "nope" })).toHaveLength(1);
  });
});
