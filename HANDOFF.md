# HANDOFF — PAVAN//FOUNDRY

Written 25 August 2026. Plain text, no jargon where it can be avoided.

Live: https://myselfpavan.vercel.app
Repo: https://github.com/CODER7657/myselfpavan (private)
Old site: preserved on the `legacy-terminal-portfolio` branch — nothing was lost.

---

## 1. WHAT THIS IS

Your old portfolio was a page you scrolled. This one is a console you operate.

A visitor picks a mission and presses Dispatch. Six agents split the work
between them, call real tools, and stream what they find back line by line.
What they report is what the rest of the page contains — so the console is a
way in, not a gate. Anyone who ignores it and just scrolls loses nothing.

Built as a pnpm monorepo:

    apps/web/                 the site (Next.js 15)
    packages/agent-engine/    the runtime: planner, scheduler, tools
    packages/assay/           the grading rubric — the gate
    packages/content/         all your text, projects, skills, missions
    packages/tokens/          colours, type, spacing
    tools/                    the collector, the card writer, the art generator
    .github/workflows/        the daily re-grade

---

## 2. WHAT IS REAL AND WHAT IS NOT

This matters. Do not oversell it in an interview — the honest version is
already impressive.

REAL:
  - Agents run concurrently. Each step waits only on its own dependencies, so
    two independent agents genuinely run at once and finish out of order. That
    is why the trace interleaves.
  - `github.repo` makes a live call to api.github.com on every run.
  - `index.search` runs real TF scoring with a document-frequency penalty.
  - The assay tools call the same rubric the Assay plate uses, over the same
    evidence file. A mission run and the published ranking cannot disagree.
  - Every score, tier and ordering is computed in your browser on page load.
  - Pacing is seeded, so a mission replays identically.

NOT REAL:
  - The sentences the agents "think" are written by hand and streamed
    character by character. No language model is called when anyone visits the
    site — a visitor never waits on one and there is nothing to rate-limit.
    (One model does run, in the daily workflow, to write the prose on a card
    for a newly promoted repository. That prose is committed as a file and
    labelled machine-written on the card itself. See section 10.)
  - Some tools (`chain.verify`, `policy.eval`, `audit.write`, `contract.read`,
    `tx.trace`) return summaries computed from local content. They do not
    actually execute PRAMANA or read a contract on-chain.

The upside of no model: zero cost per visitor, no API key, nothing to
rate-limit or fail during a demo.

---

## 3. THE MISSIONS

M-01  IDENTIFY THE OPERATOR   Who is this?                     +120 XP
M-02  INDEX THE ARCHIVE       What has he built?                +200 XP
M-03  ASSAY THE GATE          Explain the best idea             +260 XP
M-04  SURVEY THE TREE         What can he do?                   +180 XP
M-05  RECONSTRUCT THE LOG     History, and what is proven       +160 XP
M-06  RUN THE ASSAY           Grade every repo, rebuild vault   +300 XP

M-02 and M-06 are the ones to show someone. Both have stages where two agents
run at the same time, which you can see in the trace.

M-06 is the interesting one. It really grades your repositories:

    ATLAS  loads the evidence snapshot
    WARDEN applies the gate — forks, archives, unmarked work
    ORACLE scores against the rubric
    CIPHER re-checks the attested claims
    ORACLE ranks what cleared the floor
    FORGE  mints the cards and places them

---

## 4. THE SIX AGENTS

CIPHER   Cryptography and protocol      PRAMANA, the AP2 findings
WARDEN   Policy, compliance, safety     Raksha AI, ComplyLite, POCSO Shield
ORACLE   Applied ML and inference       scoring, ranking, embeddings
ATLAS    Data and infrastructure        GlobeTrotter, schemas, the snapshot
FORGE    Product and interface          Sole Vault, the surface itself
LEDGER   On-chain settlement            VortiFi, VeriServe

They are not decoration. Each one owns projects (card colours and vault
filters), skills (tree colours) and tools (listed on its roster tile).

---

## 5. THE ASSAY — HOW A REPO EARNS ITS PLACE

Rubric version 3.0.0. Seven bands, totalling exactly 100.

    Depth of work    18   source written 7, commits 8, size 3
    Verification     22   tests 9, CI 7, coverage 3, lint/types 3
    Completeness     16   README 7, docs 3, licence 3, description 2, topics 1
    Structure        13   layout 5, manifest 4, container 2, workspace 2
    Shipped          13   release 5, deployment 5, recency 3
    Craft             8   components 3, design system 2, a11y 2, motion 1
    Attested         10   verified claims, each with a proof link

TIERS
    mythic     72 and above
    legendary  60
    epic       48
    rare       36
    common     below 36
    promotion floor: 34 — below this, no card

CURRENT STANDINGS (25 Aug 2026)

    74.9  mythic     pramana
    68.5  legendary  globetrotter
    55.3  epic       CRAFTATHON  (POCSO Shield)
    51.1  epic       complylite
    41.2  rare       shoes.store (Sole Vault)
    41.0  rare       genex-prj
    35.7  common     VortiFi
    21.1  held       VeriServe_block  — below the floor

Raksha AI and the AP2 filings show as PROVISIONAL, because the gate cannot
reach a private repo or an upstream issue. The card says so on its face rather
than passing an estimate off as a score.

WHAT HAPPENS TO A CARD — THE RULES, IN FULL

The rules live in `packages/assay/src/placement.ts`, in one place, so they can
be read without opening a component. There are three outcomes and nothing else
puts a card in the vault.

  IN THE VAULT
    Marked ready (or grandfathered), not a fork, not archived, not excluded,
    and scoring 34 or above. A hand-written card is used where one exists; a
    repo with no card gets one generated from its own evidence.

  WITHDRAWN
    It had a card and no longer clears the gate — it fell below 34, or the
    `foundry-ready` topic came off. The card leaves the grid and is named
    underneath it, with the score and the cheapest way back. A demotion that
    hides itself is just a stale portfolio with extra steps.

  UNLISTED
    Never a card: forks, archives, coursework, infrastructure, and anything
    nobody has marked ready. Unfinished work is not graded, so it is never
    shown as having failed.

RANK UP, RANK DOWN

Position in the grid is the score, highest first, recomputed on every page
load. Tier follows the same number. Nothing is ordered by hand, and a card
cannot hold a rank it stopped earning.

Movement is now visible. `apps/web/public/data/standings.json` keeps ONE
previous standing, written by the workflow, and a card that moved shows the
delta on its rarity band — ▲3.9, ▼1.7 — with a line on the reverse when it
crossed a tier ("Moved from legendary to mythic at the last assay. Nobody
edited this card."). Recency is scored in steps rather than by the day, so an
untouched repo scores the same tomorrow: a delta always means work happened,
never that time passed.

VeriServe_block is the live example. It scores 21.1, so its card is out of the
grid and listed as withdrawn — item (b) below decided itself.

---

## 6. HOW TO BEAT PRAMANA

You asked directly: if you build something better, does it become mythic?

Yes. Nothing is hard-coded. PRAMANA holds the top slot because it scores 74.9,
and it will lose it the moment something scores higher. Here is exactly where
its points come from, and where it is weak:

    Depth          16.4 / 18   61 source files, 42 commits
    Verification   19.5 / 22   22 test files, CI, coverage, ruff + mypy
    Completeness   15.5 / 16   36 KB README, docs/, Apache-2.0, 15 topics
    Structure      10   / 13   no container, no workspace
    Shipped         3   / 13   NEVER TAGGED, NO DEPLOYMENT   <-- weakest
    Craft           1   / 8    it is a library, not an interface
    Attested       10   / 10   671 tests, AP2#339, AP2#340

PRAMANA is leaving 23 points on the table. To beat it, a new project needs
roughly 75+, which is very reachable:

    Tag one release                       +5
    Set the repository homepage to a URL  +5
    Push in the last 90 days              +3
    A real test suite (20+ files)         +9
    A CI workflow that runs them          +7
    Coverage configured                   +3
    Lint or type gate                     +3
    A licence                             +3
    A README that explains the problem    +7
    A docs/ directory                     +3
    Description and topics set            +3
    Dockerfile or compose                 +2
    Components, tokens, a11y, motion      +8

That is 61 before a single commit is counted, and before any attestation.
A finished, tested, deployed, documented project will pass PRAMANA.

IMPORTANT: to add attested points for a new project, edit
`packages/assay/src/attestations.ts`. Every claim needs a `proof` URL. That is
deliberate — a claim without a link is not evidence, and the band is capped at
10 so attestation can never carry a weak repository on its own.

---

## 7. WHAT GETS GRADED — PUBLIC AUTOMATICALLY, PRIVATE ON REQUEST

Rubric 3.1.0 turned the gate around (27 Sep 2026).

PUBLIC REPOSITORIES are graded automatically. Create one, push to it, and the
next run finds it — no tagging. The promotion floor of 34 is what keeps
unfinished work off the page. The opt-in topic used to do that job, and in
practice it hid finished work instead: charkha scored 75.7, mythic, above
PRAMANA, and sat invisible for a fortnight because nobody had tagged it.

To keep a public repository out anyway, give it the topic:

    foundry-hide

PRIVATE REPOSITORIES are opt-in, because grading one makes its name and
activity public. Give it the topic:

    foundry-ready

and the workflow reads it with your token, scores it with the same rubric,
and publishes only: name, score, tier, commit count, last push and the band
totals. No code, README, description, topics, file list or link — ever. That
promise is enforced twice: tools/collect-sealed.mjs refuses to write any other
field, and tools/verify-evidence.mjs refuses to publish one, with no --allow
override. Results live in apps/web/public/data/sealed.json.

This needs a token the workflow's own token cannot provide. Create a
fine-grained personal access token (github.com → Settings → Developer settings
→ Fine-grained tokens) with access to your repositories and read-only
"Contents" and "Metadata", then add it as the repository secret ASSAY_TOKEN.
Without it the private pass does nothing and changes nothing.

A private repository whose name matches a hand-written card binds to that card:
Raksha AI keeps its prose and swaps PROVISIONAL for its real score.

---

## 8. THE REFRESH — YOU NEVER HAVE TO ASK ME

    .github/workflows/assay.yml

FIRST, A CORRECTION. The workflow as committed was not valid YAML — the commit
message inside it began at column 0, which ends the shell block early and makes
GitHub reject the whole file. An invalid workflow file never appears in the
Actions list, so the daily run never ran and the button was never there to
press. It is fixed and the file now parses; the button is real.

Runs three ways:
  1. Every day at 03:20 UTC.
  2. Whenever the rubric or any of the three tools change.
  3. MANUALLY — GitHub → Actions → "Assay repositories" → Run workflow.

That third one is your button. Only you can press it — the repo is private and
`workflow_dispatch` needs write access — and there is no attack surface on the
public site. It has two inputs: a reason, which is recorded in the run log, and
a `force` tick that re-records the standings and rewrites every generated card
even if nothing moved.

What one press does, in order:

  1. Collects fresh evidence from the GitHub API.
  2. Puts the file back if only the timestamp moved, so the site does not
     redeploy for a clock.
  3. Records the standings, if any score actually changed.
  4. Writes prose for anything newly promoted, if GROQ_API_KEY is set. This
     step is allowed to fail without failing the run.
  5. Commits whatever moved, which redeploys Vercel.
  6. Writes the outcome into the run summary — the ranking, what moved, what
     was withdrawn — so pressing the button tells you the result without
     opening the site.

Cards then re-rank themselves. A repo that improves climbs; one that stalls
drops. Nobody edits the site.

---

## 9. STILL TO DO

  a) The evidence file only covers PUBLIC repos. Raksha AI and Tradex are
     private, so they show as PROVISIONAL. Make them public and press the
     button — they get real scores automatically, no code change.

  b) DONE, by rule rather than by decision. `VeriServe_block` sits at 21.1,
     below the floor, so its card is withdrawn from the grid and named under
     it with the way back. Improve the repo above 34 and it returns by itself.

  c) DONE. Generated cards now carry written prose when GROQ_API_KEY is set,
     and fall back to the template when it is not. See section 10.

  d) `assay-probe` — the fixture I built to prove the pipeline end to end. It
     scored 69 and got promoted with a generated card, which was the point. It
     is excluded from the vault now. Delete the repo whenever you like.

  e) Sound on events was requested and is not built yet.

  f) M-06 shared its mission id with M-03. Completing "RUN THE ASSAY" credited
     M-03's 260 XP instead of 300 and marked both missions done. Fixed — M-06
     is now `regrade`. If you had already completed either, the console will
     offer M-06 again; that is the fix working.

  g) `pnpm-workspace.yaml` carried an unanswered pnpm 11 build prompt, which
     failed every install on a clean clone. Answered.

  h) The three deep-inspection agents were stopped mid-run. One useful finding
     landed: genex-prj's workflow sits at `devops/.github/workflows/`, not the
     root, so GitHub never runs it. Moving it would earn +7. The rubric already
     scores that correctly as "no CI", which is a good sign the gate is not
     being fooled.

---

## 10. GROQ — BUILT. WHERE THE KEY GOES.

It is built and tested. Without a key nothing changes; with one, a newly
promoted repository arrives with prose that reads like the rest of the site
instead of a filled-in form.

WHERE YOU PUT THE KEY

  1. Create a key at https://console.groq.com/keys
  2. Go to the repository → Settings → Secrets and variables → Actions
  3. "New repository secret"
        Name:   GROQ_API_KEY
        Secret: the key
  4. Save. That is the whole setup — the workflow already reads it.

I never see or handle that key. The workflow passes it to the script as an
environment variable and the script sends it to Groq and nowhere else. It is
never written to a file, never logged, and never reaches the public site.

Optionally, to change model without touching code: same page, "Variables" tab,
new variable named GROQ_MODEL. Default is `llama-3.3-70b-versatile`.

WHAT IT DOES

    tools/write-cards.mjs                    (new)
    apps/web/public/data/cards.json          (written by it, committed)
    apps/web/lib/useCards.ts                 (the site reads it)

For every promoted repository with no hand-written card, it sends the README,
the description, topics, languages, the file tree summary and the full assay
breakdown to Groq, and asks for five fields back as strict JSON:
classification, tagline, plain, summary, highlight. The site uses that prose in
place of the template. The score, the tier, the metrics and the bars are still
the assay's — a model is trusted to write a sentence and never to decide a
number.

WHAT STOPS IT LYING

Three things, and the numeric one is the one that matters.

  - Every number in the returned prose must appear in the evidence the model
    was shown. "Built over 214 commits" against evidence saying 42 is caught
    and the card is thrown away.
  - A marketing-word list (powerful, seamless, robust, cutting-edge,
    showcase, …) rejects the card outright.
  - Length limits per field, and every field required.

A rejected card is not published. The template stands instead, and the run says
why in the log.

IT CANNOT BREAK THE DEPLOY

The step is `continue-on-error`, and the script exits clean on every failure
path: no key, wrong key, Groq down, rate limited, malformed JSON, timeout.
Each of those was tested against a stand-in server, and in every one the
previous cards.json was left untouched and the site fell back to the template.

IT DOES NOT COST YOU A DAILY CALL

Each card records a hash of the evidence it was written from. Unchanged
evidence means no request, no cost and no diff — so the daily run is silent
until a repository actually changes. Use the `force` tick on the button to
rewrite them all deliberately.

IT SAYS IT IS MACHINE-WRITTEN

The card's metrics read "Origin: Machine-written", and the reverse carries:
"This card's prose was written by llama-3.3-70b-versatile from the
repository's own evidence, under rules that forbid any claim the evidence does
not carry. The score, the tier and the numbers are the assay's, not the
model's."

THE HONEST CAVEAT THAT REMAINS

The guards catch invented numbers and brochure language. They cannot catch a
sentence that is plausible, unverifiable and wrong. Read a new card once before
you send the link to anyone — it is five sentences.

---

## 11. SECURITY

  - Nonce-based Content-Security-Policy with strict-dynamic, set in middleware.
  - HSTS, COOP, CORP, nosniff, DENY framing, locked Permissions-Policy.
  - GitHub responses are time-boxed, size-capped and field-coerced before use.
  - URLs from the API are scheme- and host-checked before they reach an href.
  - No secrets in the repository. No `.env`. One inline script, which validates
    its own input from localStorage.
  - Every external link opens in a new tab with noopener and noreferrer.

---

## 12. RUNNING IT

    pnpm install
    pnpm dev                 http://localhost:3210
    pnpm build
    pnpm start

    pnpm assay               the whole gate locally: collect, record the
                             standings, print the ranking
                             (set GITHUB_TOKEN first)
    pnpm assay:report        re-print the ranking from the file on disk
    pnpm assay:score NAME    the full band-by-band breakdown for one repo

    node tools/collect-evidence.mjs      just the collection step
    node --experimental-strip-types tools/write-cards.mjs --dry-run
                                          shows exactly what would be sent to
                                          Groq, and sends nothing
    pnpm gen:mountains                   regenerate the procedural engraving
    pnpm gen:ridge                       re-extract the ridge plate
                                          (needs: npm i --no-save sharp)

Node 22.x, pnpm 11.

---

## 13. ONE THING TO KNOW

The mountain illustration is from QED Labs' website. I cropped away their
logo and branding, but the artwork itself is theirs and you chose to use it.
`tools/generate-mountains.mjs` is a fully original procedural engraving
generator I wrote as an alternative — point `components/Ridge.tsx` at the
generated layers and the QED asset is gone entirely.
