/**
 * Whether a deployment actually answers.
 *
 * "Live deployment" used to award its five points for the homepage field
 * being filled in. Nothing checked the address. A dead link, a domain that
 * lapsed, a free-tier app that was deleted — all scored as shipped.
 *
 * The collector now requests every homepage and records what came back. The
 * rule for what counts is deliberately generous, because the question is
 * "is there a deployment here", not "is it reachable by a robot":
 *
 *   2xx, 3xx           live
 *   401, 403           live — something is deployed and refusing a stranger,
 *                      which is what a protected preview or a login wall does
 *   429                live — answering, just rate-limiting the collector
 *   404, 410           down — the host answers, but nothing is there
 *   5xx                down — deployed and broken is not shipped
 *   no response        down — DNS failure, refused connection, timeout
 */

export type Liveness = "live" | "down";

export function livenessOf(status: number | null): Liveness {
  if (status === null) return "down";
  if (status >= 200 && status < 400) return "live";
  if (status === 401 || status === 403 || status === 429) return "live";
  return "down";
}

/**
 * Only an absolute http(s) address is checked. GitHub's homepage field is
 * free text, and "coming soon" is not a deployment to go and look for.
 */
export function checkableUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
