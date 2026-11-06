import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assess, HIDE_TOPIC, PROMOTION_FLOOR } from "../src/rubric";
import { MOVEMENT_FLOOR, movementFor, placementFor } from "../src/placement";
import { empty, evidence, NOW } from "./fixtures";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("placementFor", () => {
  it("puts a promoted repository in the vault", () => {
    expect(placementFor(assess(evidence())).placement).toBe("vault");
  });

  it("withdraws a held repository, naming the floor and a way back", () => {
    const p = placementFor(assess(empty()));
    expect(p.placement).toBe("withdrawn");
    expect(p.reason).toContain(String(PROMOTION_FLOOR));
    expect(p.route).toBeTruthy();
  });

  it("withdraws a hidden repository and says how to bring it back", () => {
    const p = placementFor(assess(evidence({ topics: [HIDE_TOPIC] })));
    expect(p.placement).toBe("withdrawn");
    expect(p.route).toContain(HIDE_TOPIC);
  });

  it("never lists an excluded repository", () => {
    expect(placementFor(assess(evidence({ isFork: true }))).placement).toBe("unlisted");
  });
});

describe("movementFor", () => {
  it("marks a repository with no previous standing as new", () => {
    expect(movementFor(50, undefined)).toEqual({ delta: 0, isNew: true });
  });

  it("ignores movement below the noise floor", () => {
    expect(movementFor(50 + MOVEMENT_FLOOR / 2, 50)).toBeNull();
  });

  it("reports a rise inside a tier without a tier change", () => {
    expect(movementFor(52, 50)).toEqual({ delta: 2, isNew: false });
  });

  it("reports a fall across a tier boundary in both directions", () => {
    expect(movementFor(58, 61)).toEqual({ delta: -3, from: "legendary", to: "epic", isNew: false });
    expect(movementFor(73, 70)).toEqual({ delta: 3, from: "legendary", to: "mythic", isNew: false });
  });

  it("rounds the delta to one decimal place", () => {
    expect(movementFor(50.06, 49)?.delta).toBe(1.1);
  });
});
