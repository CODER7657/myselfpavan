/**
 * How old the evidence is, and whether GitHub has moved since.
 *
 * Every number on a card is computed live, but from a snapshot that a workflow
 * collected at some point in the past. Those are different kinds of "live", and
 * the page previously showed no sign of the difference — so a commit count that
 * was four hours behind looked exactly like one that was wrong. Someone reading
 * the vault could not tell a stale number from a bad one, which is the same as
 * not being able to trust either.
 *
 * Kept next to the rubric because it is the same kind of statement: something
 * observable, said plainly, that a reader could check themselves.
 */

export type Freshness = "fresh" | "ageing" | "stale";

export interface Age {
  hours: number;
  /** Plain English, for the end of a sentence: "collected four hours ago". */
  label: string;
  level: Freshness;
}

/** Under six hours is this morning's; over a day and a half is visibly old. */
const AGEING_AFTER_HOURS = 6;
const STALE_AFTER_HOURS = 36;

const WORDS = [
  "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/** Small numbers read better as words in a sentence; large ones do not. */
const count = (n: number): string => WORDS[n - 1] ?? String(n);

export function ageOf(collectedAt: string | null, now: number = Date.now()): Age | null {
  if (!collectedAt) return null;

  const then = Date.parse(collectedAt);
  if (Number.isNaN(then)) return null;

  const hours = Math.max(0, (now - then) / 3_600_000);

  const level: Freshness =
    hours < AGEING_AFTER_HOURS ? "fresh" : hours < STALE_AFTER_HOURS ? "ageing" : "stale";

  return { hours, label: labelFor(hours), level };
}

function labelFor(hours: number): string {
  if (hours < 1) return "in the last hour";
  if (hours < 2) return "an hour ago";
  if (hours < 24) return count(Math.floor(hours)) + " hours ago";

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return count(days) + " days ago";

  const weeks = Math.floor(days / 7);
  return weeks < 9 ? count(weeks) + " weeks ago" : "over two months ago";
}

/* ── has GitHub moved since? ──────────────────────────────────────────────── */

/**
 * True when GitHub reports a push this snapshot does not know about.
 *
 * Both values are the date part of an ISO timestamp, which is all the live
 * listing gives. Comparing dates rather than instants means a push made in the
 * same day as the collection does not register — deliberately: the alternative
 * is a warning that flickers on every push and teaches the reader to ignore it.
 */
export function pushedSince(
  snapshotPushedAt: string | undefined,
  livePushedDate: string | undefined
): boolean {
  if (!snapshotPushedAt || !livePushedDate) return false;
  return livePushedDate > snapshotPushedAt.slice(0, 10);
}
