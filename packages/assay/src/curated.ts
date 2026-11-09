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
