/**
 * Whether a repository someone else owns is still the owner's own work.
 *
 * GitHub lists eight repositories beyond this account: one transferred into
 * an organisation (roadside-app, now Hash-Hawks/roadside-app) and seven owned
 * by friends where this account is a collaborator. Grading all of them would
 * put other people's work on this portfolio. Grading none lost roadside-app,
 * which is this account's own project and simply lives somewhere else now.
 *
 * The line is drawn on authorship, which is measurable rather than asserted:
 * a repository counts if this account wrote at least half of its commits.
 * Bots are left out of the count on both sides, so a busy Dependabot cannot
 * either dilute a real author or make up a majority.
 */

export interface Contributor {
  login: string;
  contributions: number;
  type?: string;
}

/** The share of commits that makes a repository someone's own. */
export const AUTHORSHIP_SHARE = 0.5;

const isBot = (c: Contributor) =>
  c.type === "Bot" || /\[bot\]$/i.test(c.login) || /-bot$/i.test(c.login);

export interface Authorship {
  /** This account's commits as a fraction of all human commits, 0 to 1. */
  share: number;
  mine: boolean;
}

export function authorship(owner: string, contributors: Contributor[]): Authorship {
  const humans = contributors.filter((c) => !isBot(c) && c.contributions > 0);
  const total = humans.reduce((sum, c) => sum + c.contributions, 0);
  if (total === 0) return { share: 0, mine: false };

  const own = humans
    .filter((c) => c.login.toLowerCase() === owner.toLowerCase())
    .reduce((sum, c) => sum + c.contributions, 0);

  const share = own / total;
  return { share, mine: share >= AUTHORSHIP_SHARE };
}
