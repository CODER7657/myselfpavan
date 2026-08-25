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
    tools/                    the art generator and the evidence collector
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
    character by character. No language model is called anywhere on this site.
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

## 7. THE READY SWITCH — YOUR WORK IN PROGRESS STAYS HIDDEN

Nothing is graded until you say so.

A repository is skipped entirely until it carries the GitHub topic:

    foundry-ready

Add it in the repo's About panel when you consider the work finished. Remove
it and the repo disappears from the assay again. Unmarked repos are reported
as "not marked" — they are not scored and not penalised, because judging
unfinished work and then marking it down for being unfinished is a rigged gate.

Eight existing repositories are grandfathered in and graded without the topic.
Everything new goes through the switch.

---

## 8. THE REFRESH — YOU NEVER HAVE TO ASK ME

    .github/workflows/assay.yml

Runs three ways:
  1. Every day at 03:20 UTC.
  2. Whenever the rubric or the collector changes.
  3. MANUALLY — GitHub → Actions → "Assay repositories" → Run workflow.

That third one is your button. Only you can press it, the repo is private, and
there is no attack surface on the public site. It collects fresh evidence,
commits it if anything actually changed (a timestamp alone does not count), and
Vercel redeploys.

Cards then re-rank themselves. A repo that improves climbs; one that stalls
drops. Nobody edits the site.

---

## 9. STILL TO DO

  a) The evidence file only covers PUBLIC repos. Raksha AI and Tradex are
     private, so they show as PROVISIONAL. Make them public and press the
     button — they get real scores automatically, no code change.

  b) `VeriServe_block` sits at 21 and is below the floor. It still has a
     hand-written card. Decide: improve the repo, or drop the card.

  c) The generated card for a newly promoted repo uses template prose. It is
     honest but flat. See section 10.

  d) `assay-probe` — the fixture I built to prove the pipeline end to end. It
     scored 69 and got promoted with a generated card, which was the point. It
     is excluded from the vault now. Delete the repo whenever you like.

  e) Sound on events was requested and is not built yet.

  f) The three deep-inspection agents were stopped mid-run. One useful finding
     landed: genex-prj's workflow sits at `devops/.github/workflows/`, not the
     root, so GitHub never runs it. Moving it would earn +7. The rubric already
     scores that correctly as "no CI", which is a good sign the gate is not
     being fooled.

---

## 10. THE GROQ IDEA — YES, THIS WORKS

You asked whether Groq could write the card content when a new repo is
promoted, following my instructions. It can, and it is a good fit.

WHY GROQ SPECIFICALLY
  - The API is OpenAI-compatible at https://api.groq.com/openai/v1, so it is a
    plain HTTP call from the workflow — no SDK needed.
  - It is very fast and has a free tier, and this runs at most once a day over
    a handful of repositories.
  - It supports structured outputs, so it can be made to return strict JSON.

Current production models include `llama-3.3-70b-versatile`,
`openai/gpt-oss-120b`, `openai/gpt-oss-20b` and `llama-3.1-8b-instant`.
For prose quality, `llama-3.3-70b-versatile` or `openai/gpt-oss-120b`.

HOW IT WOULD FIT

    1. collect-evidence.mjs runs        (already built)
    2. write-cards.mjs runs             (new)
         - for each PROMOTED repo with no hand-written card
         - sends: README, description, topics, languages, file tree summary,
           and its full assay breakdown
         - system prompt carries the house rules: British spelling, no
           marketing language, no claim not present in the evidence, state
           what is hard about the project rather than what it does
         - returns strict JSON: classification, tagline, plain, summary,
           highlight
    3. writes apps/web/public/data/cards.json
    4. the site prefers that prose over the template
    5. the workflow commits it, Vercel redeploys

WHAT YOU WOULD NEED TO DO
  Create a Groq API key and add it as a repository secret named GROQ_API_KEY
  (Settings → Secrets and variables → Actions). I will never see or handle
  that key — I only write the code that reads it from the environment.

THE HONEST CAVEATS
  - A model can invent things. The prompt must forbid any claim not present in
    the evidence, and the output should still be reviewed before it is trusted
    on a page that represents you.
  - Generated cards should stay labelled as machine-written. A card written by
    a script should admit it.
  - It adds a failure mode: if Groq is down or rate-limited, the step must fail
    soft and fall back to the template rather than break the deploy.
  - It costs nothing on the free tier at this volume, but that is a Groq policy
    decision, not a guarantee.

My recommendation: build it, but keep the template as the fallback and keep
the "generated" label. The value is real — a new repo would arrive with prose
that reads like the rest of the site instead of a filled-in form.

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

    node tools/collect-evidence.mjs      refresh the evidence locally
                                          (set GITHUB_TOKEN first)
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
