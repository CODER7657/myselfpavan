import { describe, expect, it } from "vitest";
import { missions, profile, projects } from "../src/index";

const text = (value: unknown) => JSON.stringify(value);

/* Work that is archived or mostly someone else's, so no card backs it. */
const RETIRED = /elections?|child[- ]safety|offline-first planner|travel/i;

describe("profile", () => {
  it("names only subjects a current card backs", () => {
    expect(text(profile)).not.toMatch(RETIRED);
  });
});

describe("missions", () => {
  it("has missions to check", () => {
    expect(missions.length).toBeGreaterThan(0);
  });

  it("states no repository count, which the assay changes daily", () => {
    expect(text(missions)).not.toMatch(/\d+\s+(public\s+)?repositor/i);
  });

  it("names only subjects a current card backs", () => {
    expect(text(missions)).not.toMatch(RETIRED);
  });
});

describe("projects", () => {
  it("gives every card metric a label and a value", () => {
    expect(projects.length).toBeGreaterThan(0);
    for (const stat of projects.flatMap((p) => p.metrics)) {
      expect(stat.label.trim()).not.toBe("");
      expect(stat.value.trim()).not.toBe("");
    }
  });
});
