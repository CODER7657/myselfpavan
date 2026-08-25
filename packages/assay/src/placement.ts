import type { Assay, Rarity } from "./types";
import { PROMOTION_FLOOR, READY_TOPIC, tierFor } from "./rubric.ts";

/**
 * The card rules.
 *
 * The rubric answers "what is this repository worth". This answers the next
 * question — "does it get a card, and where does the card sit" — and it is
 * kept apart from the rendering on purpose, so the rule can be read, argued
 * with and recomputed without opening a component.
 *
 * There are exactly three outcomes, and nothing else is allowed to put a card
 * in the vault:
 *
 *   vault      Promoted. Marked ready, not a fork, not archived, not excluded,
 *              and scoring at or above the floor. It gets a card — a curated
 *              one if somebody wrote it, a generated one if not.
 *
 *   withdrawn  It had a card, or would have had one, and no longer clears the
 *              gate. The card comes out of the grid and is named underneath it
 *              with its score and the way back. A demotion that hides itself
 *              is just a stale portfolio with extra steps.
 *
 *   unlisted   Never a card. Forks, archives, coursework, infrastructure, and
 *              anything nobody has marked ready — unfinished work is not judged
 *              at all, so it is not shown as having failed.
 */
export type Placement = "vault" | "withdrawn" | "unlisted";

export interface Placed {
  placement: Placement;
  /** Why, in the words the card itself will use. */
  reason: string | null;
  /** The cheapest thing that would put it back in the vault. */
  route: string | null;
}

/** Where this repository's card belongs, given how it just scored. */
export function placementFor(a: Assay): Placed {
  switch (a.verdict) {
    case "promoted":
      return { placement: "vault", reason: null, route: null };

    /*
     * Held is the interesting case: the gate can see it, it is marked ready,
     * and it is not good enough. That is a real result and it is stated.
     */
    case "held":
      return {
        placement: "withdrawn",
        reason:
          "Scored " + a.score + ", below the promotion floor of " + PROMOTION_FLOOR + ".",
        route: a.nextSteps[0] ?? "Raise the score above " + PROMOTION_FLOOR + ".",
      };

    /*
     * Not-ready only reaches here for a repository somebody already wrote a
     * card for — the topic was removed, or it was never added. The card is
     * pulled rather than left standing on a grade nobody asked for.
     */
    case "not-ready":
      return {
        placement: "withdrawn",
        reason: 'Not marked ready — the "' + READY_TOPIC + '" topic is not set.',
        route: 'Add the "' + READY_TOPIC + '" topic on GitHub to have it graded again.',
      };

    case "excluded":
    default:
      return { placement: "unlisted", reason: a.reason, route: null };
  }
}

/* ── movement ─────────────────────────────────────────────────────────────── */

/**
 * How a card moved since the previous assay.
 *
 * Recency is scored in steps rather than by the day, so a score only changes
 * when the repository changes. A delta here therefore means somebody did
 * something — not that time passed.
 */
export interface Movement {
  /** Points gained or lost. Negative is a fall. */
  delta: number;
  /** Set when the change crossed a tier boundary. */
  from?: Rarity;
  to?: Rarity;
  /** True when this repository was not in the previous standing at all. */
  isNew: boolean;
}

/** Below this, a change is noise and is not drawn. */
export const MOVEMENT_FLOOR = 0.5;

export function movementFor(
  score: number,
  previous: number | undefined
): Movement | null {
  if (previous === undefined) return { delta: 0, isNew: true };

  const delta = Math.round((score - previous) * 10) / 10;
  if (Math.abs(delta) < MOVEMENT_FLOOR) return null;

  const from = tierFor(previous);
  const to = tierFor(score);

  return from === to ? { delta, isNew: false } : { delta, from, to, isNew: false };
}
