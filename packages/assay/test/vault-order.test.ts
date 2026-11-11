import { describe, expect, it } from "vitest";
import { CARD_TO_REPO, compareVault, FLAGSHIP_ORDER, type VaultSortable } from "../src/curated";

const card = (slug: string, sortScore: number, name = slug): VaultSortable => ({ slug, name, sortScore });
const order = (cards: VaultSortable[]) => [...cards].sort(compareVault).map((c) => c.slug);

describe("FLAGSHIP_ORDER", () => {
  it("is the order the profile and the portfolio use", () => {
    expect(FLAGSHIP_ORDER).toEqual(["pramana", "raksha-ai", "charkha", "aura-guard", "voice-emotion", "kisan-mitra"]);
  });

  it("names only cards that exist, each once", () => {
    for (const slug of FLAGSHIP_ORDER) expect(CARD_TO_REPO[slug], slug).toBeDefined();
    expect(new Set(FLAGSHIP_ORDER).size).toBe(FLAGSHIP_ORDER.length);
  });
});

describe("compareVault", () => {
  it("puts the flagships first in the fixed order, whatever they score", () => {
    const cards = [
      card("kisan-mitra", 72.8), card("aura-guard", 56.8), card("voice-emotion", 74.6),
      card("charkha", 73.8), card("raksha-ai", 76.4), card("pramana", 85.9),
    ];
    expect(order(cards)).toEqual([...FLAGSHIP_ORDER]);
  });

  it("keeps a low-scoring flagship ahead of a higher-scoring card that is not one", () => {
    expect(order([card("complylite", 99), card("aura-guard", 35)])).toEqual(["aura-guard", "complylite"]);
  });

  it("ranks everything else by score, highest first", () => {
    expect(order([card("genex", 60.9), card("sealed-trinetra", 67.9), card("complylite", 71.5)]))
      .toEqual(["complylite", "sealed-trinetra", "genex"]);
  });

  it("breaks a tie on score by name", () => {
    expect(order([card("b", 50, "Beta"), card("a", 50, "Alpha")])).toEqual(["a", "b"]);
  });

  it("gives the full vault order for today's scores", () => {
    const cards = [
      card("pramana", 85.9), card("raksha-ai", 76.4), card("voice-emotion", 74.6), card("charkha", 73.8),
      card("ap2-findings", 73), card("kisan-mitra", 72.8), card("complylite", 71.5), card("sealed-trinetra", 67.9),
      card("sealed-saakshi", 66.7), card("genex", 60.9), card("aura-guard", 56.8),
    ];
    expect(order(cards)).toEqual([
      "pramana", "raksha-ai", "charkha", "aura-guard", "voice-emotion", "kisan-mitra",
      "ap2-findings", "complylite", "sealed-trinetra", "sealed-saakshi", "genex",
    ]);
  });

  it("works when some flagships are missing, and on an empty or single list", () => {
    expect(order([card("genex", 60), card("charkha", 10), card("pramana", 5)])).toEqual(["pramana", "charkha", "genex"]);
    expect(order([])).toEqual([]);
    expect(order([card("genex", 60)])).toEqual(["genex"]);
  });

  it("is a consistent comparator: equal to itself, antisymmetric", () => {
    const a = card("aura-guard", 56.8);
    const b = card("complylite", 71.5);
    expect(compareVault(a, a)).toBe(0);
    expect(Math.sign(compareVault(a, b))).toBe(-Math.sign(compareVault(b, a)));
  });
});
