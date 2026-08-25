export const RARITIES = ["common", "rare", "epic", "legendary", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

/** Ordering used for sorting and for XP weighting. */
export const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  mythic: 4,
};

export const RARITY_XP: Record<Rarity, number> = {
  common: 40,
  rare: 90,
  epic: 180,
  legendary: 320,
  mythic: 500,
};
