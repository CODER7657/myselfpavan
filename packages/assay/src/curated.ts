/**
 * Which hand-written card belongs to which repository.
 *
 * This lives beside the gate rather than in the site because two different
 * things need it and must never disagree: the vault, to give a curated card
 * its live score, and the card writer, to know which promoted repositories
 * nobody has written up yet. Kept in one place, a repository cannot end up
 * with both a written card and a generated one.
 *
 * Deliberately free of imports so it can be read by a plain Node script as
 * easily as by the site.
 */

/** Card slug → repository name, exactly as GitHub spells it. */
export const CARD_TO_REPO: Record<string, string> = {
  pramana: "pramana",
  "raksha-ai": "raksha-ai",
  charkha: "charkha",
  "aura-guard": "AURA-GUARD",
  "voice-emotion": "voice-emotion-detection",
  "kisan-mitra": "kisan_mitra",
  complylite: "complylite",
  genex: "genex-prj",
};

/** Cards with no repository of their own — an upstream filing, private work. */
export const NO_REPO: ReadonlySet<string> = new Set(["ap2-findings"]);

/** Repository names that already have a written card, lowercased. */
export const CURATED_REPOS: ReadonlySet<string> = new Set(
  Object.values(CARD_TO_REPO).map((n) => n.toLowerCase())
);

/**
 * The six flagships, in the order every showcase surface uses.
 *
 * The same order as the GitHub profile and the portfolio, so a visitor who
 * moves between them finds the same project first. These cards lead the vault
 * in this order whatever they score. Every card after them is still placed by
 * its score, so the rest of the grid is earned rather than arranged.
 */
export const FLAGSHIP_ORDER: readonly string[] = [
  "pramana",
  "raksha-ai",
  "charkha",
  "aura-guard",
  "voice-emotion",
  "kisan-mitra",
];

export interface VaultSortable {
  slug: string;
  name: string;
  sortScore: number;
}

/** Flagships first, in FLAGSHIP_ORDER. Then by score, highest first, then by name. */
export function compareVault(x: VaultSortable, y: VaultSortable): number {
  const px = FLAGSHIP_ORDER.indexOf(x.slug);
  const py = FLAGSHIP_ORDER.indexOf(y.slug);
  if (px !== -1 || py !== -1) {
    if (px === -1) return 1;
    if (py === -1) return -1;
    if (px !== py) return px - py;
  }
  return y.sortScore - x.sortScore || x.name.localeCompare(y.name);
}
