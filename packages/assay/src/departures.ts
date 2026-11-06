/**
 * Why a repository is no longer in the listing — when it really is gone.
 *
 * The verifier used to treat every disappearance as a bad read of the API,
 * on the reasoning that a repository which still exists cannot drop out of a
 * good collection. That was wrong, and it froze the site for a month:
 * roadside-app was transferred to the Hash-Hawks organisation on 11 October,
 * fell out of the owner's listing exactly as it should, and every run after
 * that was refused.
 *
 * A repository can leave legitimately in four ways — deleted, made private,
 * renamed, transferred — and GitHub will say which if asked directly. The
 * collector asks; this decides what the answer means. Only a repository that
 * GitHub says is still here, still public and still under the same name is a
 * genuine anomaly worth stopping a run for.
 */

export type DepartureReason = "not-found" | "made-private" | "renamed" | "transferred";

export interface Departure {
  name: string;
  why: DepartureReason;
  /** Where it went, for a rename or transfer. Public information either way. */
  now?: string;
}

/** What a direct GET of the repository returned. */
export type Probe =
  | { status: "missing" }
  | { status: "found"; fullName: string; private: boolean };

const ownerOf = (fullName: string) => fullName.split("/")[0]!.toLowerCase();
const nameOf = (fullName: string) => fullName.split("/")[1]!.toLowerCase();

/**
 * Returns a departure if GitHub confirms the repository really left, or null
 * if it is apparently still exactly where it was — in which case its absence
 * from the listing is unexplained and the run should not publish.
 */
export function explainDeparture(expectedFullName: string, probe: Probe): Departure | null {
  const name = nameOf(expectedFullName);

  if (probe.status === "missing") return { name, why: "not-found" };
  if (probe.private) return { name, why: "made-private" };

  if (ownerOf(probe.fullName) !== ownerOf(expectedFullName)) {
    return { name, why: "transferred", now: probe.fullName };
  }
  if (nameOf(probe.fullName) !== name) {
    return { name, why: "renamed", now: probe.fullName };
  }
  return null;
}

/** Plain words for the run log and the summary. */
export function describeDeparture(d: Departure): string {
  switch (d.why) {
    case "not-found":
      return d.name + " — deleted, or made private";
    case "made-private":
      return d.name + " — made private";
    case "renamed":
      return d.name + " — renamed to " + d.now;
    case "transferred":
      return d.name + " — transferred to " + d.now;
  }
}
