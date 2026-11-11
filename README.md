# PAVAN//FOUNDRY

A portfolio that behaves like an operator console rather than a page you scroll.

Visitors dispatch **missions**. Each mission is a directed acyclic graph of steps
assigned to six agents; the runtime topologically sorts it, executes the steps
with real concurrency, calls real tools, and streams the traces back token by
token. What the agents report is what the rest of the page contains — the
console is a way in, not a gate. Everything remains reachable by plain scrolling.

Live: <https://myselfpavan.vercel.app>

---

## What is actually real

This matters, because "AI portfolio" usually means an animation on a timer.

| Claim | Reality |
|---|---|
| Agents run concurrently | Each step awaits only its own `needs`; concurrency falls out of the graph. Independent steps interleave their output and finish out of declaration order. |
| Tool calls are real | `github.repo` performs a live `fetch` against `api.github.com`. `index.search` runs TF scoring with a document-frequency penalty over the content package. `rank` computes an actual ordering. |
| Runs are reproducible | Pacing, jitter and chunk sizes come from a seeded `mulberry32` PRNG keyed off the mission id. |
| Nothing is pre-recorded | There is no script of output. Traces are assembled at run time from tool results and per-step reasoning. |
| No model is called | The runtime is deterministic TypeScript. No API key, no per-visitor cost, nothing to rate-limit during a demo. |

When a tool cannot reach the network it says so in its summary rather than
pretending it succeeded.

---

## Where the cards come from

No model runs when a visitor opens the site. The cards are built ahead of time:

- **A daily assay** (`.github/workflows/assay.yml`) reads every non-archived, non-fork
  repository on the account, scores it with the rubric in `packages/assay`, and commits
  the result to `apps/web/public/data/`. The site reads those files.
- **Private repositories** are scored too, unless they carry the `foundry-hide` topic.
  Only the name, score, tier, commit count, last push and band totals are published.
- **The flagship cards are written by hand** in `packages/content/src/projects.ts`, and
  every number on them is taken from that repository's README.
- **A promoted repository with no hand-written card** gets its prose from a model,
  `openai/gpt-oss-120b` on Groq, during the assay. The card names the model, and any card
  that states a number not found in the evidence is rejected. Today every promoted
  repository has a hand-written card, so no generated card is shown.
- **Order:** the six flagships lead in one fixed order, the same as on the profile and
  the portfolio. Every other card is placed by its score.

## Checks

CI runs the typecheck, 152 unit tests, a syntax check of the pipeline scripts, the build,
and mobile Lighthouse on the built site. Accessibility may not drop below 95 (measured
100, with no failing audit). Performance is the median of three runs and measured 76 to
78 on the CI runner, up from 56; single runs ranged from 68 to 86. The gate is a
regression guard at 70. A steady 85 is open work: the first task after the scripts
arrive still runs for 340 to 470 ms on the throttled phone profile. Dependabot and CodeQL run weekly. See [SECURITY.md](SECURITY.md) to report a
vulnerability and [CHANGELOG.md](CHANGELOG.md) for what changed.

---

## Layout

```
apps/
  web/                    Next.js 15 App Router — the site
packages/
  agent-engine/           The runtime: planner, scheduler, tool registry, PRNG
  content/                Typed content — profile, projects, agents, missions, skills
  tokens/                 Design tokens (CSS custom properties) + rarity scales
  ui/                     Shared primitives
  tsconfig/               Shared strict TypeScript base
tools/
  generate-mountains.mjs  Procedural pen-engraving generator (seeded, deterministic)
  extract-ridge-plate.mjs Crops and knocks out the reference ridge plate
assets/
  ridge-source.png        Source image for the ridge plate
```

## Commands

```bash
pnpm install
pnpm dev            # http://localhost:3210
pnpm build
pnpm start
pnpm typecheck
pnpm gen:mountains  # regenerate the procedural engraving layers
```

Requires Node 20.11+ and pnpm 10+.

---

## Design system — "Ink & Oxide"

A letterpress palette: bone paper, iron-gall ink, and four pigments a
19th-century press actually stocked — oxide red, verdigris, indigo and ochre.
Maximalism comes from density and layering rather than from neon.

Every text colour clears **WCAG AA (4.5:1)** against its stock in both themes.
No component contains a raw hex value; everything resolves through
`packages/tokens/src/tokens.css`. Light is canonical, dark redefines only the
token values and never the roles.

Type: **Pixelify Sans** (display), **Silkscreen** (labels and HUD),
**IBM Plex Mono** (data and traces), **Instrument Serif** (editorial).

### The ridge

The mountain plate in the hero and the footer is derived from a supplied
reference image. `tools/extract-ridge-plate.mjs` crops away the page chrome it
was captured with, knocks the paper background out to transparency with a
luminance ramp tuned to drop the source's dashed layout guides while keeping the
faintest hatching, re-inks the result to a flat colour so CSS can tint it, and
upscales it 3×. Dark mode inverts it into a scratchboard rather than shipping a
second asset.

`tools/generate-mountains.mjs` is an independent, fully procedural engraving
generator — fractal ridgelines by midpoint displacement, fall-line burin
hatching, spur lines and a hatched conifer treeline — kept because it produces
infinitely crisp, separately parallaxing layers. Seeded, so the art is
byte-identical on every machine.

---

## Accessibility

- `prefers-reduced-motion` is honoured throughout: the boot sequence is skipped,
  parallax is disabled, the card flip becomes a visibility swap, and the agent
  runtime collapses its delays to zero rather than removing the content.
- The boot screen is skippable by click, `Enter`, `Escape` or `Space`, and only
  runs once per operator.
- Every interactive element is reachable by keyboard; the capability tree
  responds to focus as well as hover.
- Live regions announce agent traces and the tree readout.
- All content is available without playing anything.

---

## Notes

The mountain illustration in `assets/ridge-source.png` originates from a
third-party website's footer and is used here at the site owner's direction.
`tools/generate-mountains.mjs` exists as a fully original alternative and can be
swapped in by pointing `components/Ridge.tsx` at the generated layers.
