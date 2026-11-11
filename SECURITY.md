# Security policy

PAVAN//FOUNDRY is maintained by one person ([@CODER7657](https://github.com/CODER7657)) in
spare time. Reports are welcome and taken seriously; please be patient with the response.

## Reporting a vulnerability

Please report privately, not in a public issue or pull request:

1. Open [the repository's Security tab](https://github.com/CODER7657/myselfpavan/security)
   and choose **Report a vulnerability** (GitHub private vulnerability reporting). The
   report is visible only to the maintainer until an advisory is published.
2. Describe what is affected, how to reproduce it, and what an attacker gains.

If the Report button is not shown, open a public issue that says only that you have a
security report and how to reach you, with no details; a private channel will be set up.

## Scope

In scope:

- **The site** (`apps/web`, deployed at `myselfpavan.vercel.app`): for example script
  injection through a card, a mission trace or the terminal, or the page sending data
  somewhere other than `api.github.com`.
- **The published data** (`apps/web/public/data/*.json`): anything about a private
  repository beyond its name, score, tier, commit count, last push and band totals, or the
  name of a repository that carries the `foundry-hide` topic.
- **The assay workflow** (`.github/workflows/assay.yml` and `tools/`): for example a way
  for a pull request or a repository's README to reach a secret, to write to `main`, or to
  put text on a card that the evidence does not support.

Out of scope:

- Vulnerabilities in Vercel, Groq or GitHub themselves (report those to the provider).
- Denial of service by request volume against the free tiers.
- Reports from automated scanners without a demonstrated impact, and social engineering.

## What to expect

- An acknowledgement, usually within a week.
- An assessment and, if confirmed, a fix or mitigation as soon as practical.
- Credit in the advisory and the changelog if you want it.

Only the latest code on `main` (and the deployment built from it) is supported; there are
no maintained older releases.
