import type { Mission } from "./types";

/**
 * Missions are plans, not scripts. Each is a directed acyclic graph the runtime
 * topologically sorts and executes with real concurrency, so two steps whose
 * dependencies are satisfied genuinely run at the same time and finish out of
 * order. `needs` is the only thing controlling sequence.
 */
export const missions: Mission[] = [
  {
    id: "recon",
    code: "M-01",
    title: "IDENTIFY THE OPERATOR",
    objective:
      "Establish who this dossier belongs to and what he actually claims to do.",
    reveals: "Unlocks the dossier.",
    xp: 120,
    steps: [
      {
        id: "r1",
        agent: "atlas",
        action: "Resolve the identity record",
        tool: "index.search",
        args: { q: "Pavan Patel security agent systems engineer Gujarat" },
        needs: [],
        cost: 180,
        thought: [
          "Reading the identity record off the local index.",
          "Two concurrent degree programmes — BITS Pilani and LJIET. Not a typo; both are live.",
          "Primary handle CODER7657. 29 public repositories.",
        ],
      },
      {
        id: "r2",
        agent: "oracle",
        action: "Extract the stated thesis",
        tool: "embed",
        args: { text: "deterministic verification gate policy predicates agent payments" },
        needs: ["r1"],
        cost: 420,
        thought: [
          "Embedding the long-form bio and clustering by claim.",
          "One claim dominates: the interesting work is the gate around the model, not the model.",
          "Cross-checking that against the repositories — the claim is load-bearing, not decorative.",
        ],
      },
      {
        id: "r3",
        agent: "forge",
        action: "Assemble the dossier surface",
        tool: "render",
        needs: ["r2"],
        cost: 260,
        thought: [
          "Laying out the dossier panel.",
          "Holding the measure at 68 characters so the prose stays readable.",
          "Dossier ready.",
        ],
      },
    ],
  },

  {
    id: "archive",
    code: "M-02",
    title: "INDEX THE ARCHIVE",
    objective:
      "Pull the public repository list, rank it, and mint a card for everything that survives.",
    reveals: "Unlocks the card vault.",
    xp: 200,
    steps: [
      {
        id: "a1",
        agent: "atlas",
        action: "Fetch the public repository list",
        tool: "github.repo",
        needs: [],
        cost: 340,
        thought: [
          "GET /users/CODER7657/repos — this is a live call, not a fixture.",
          "Filtering forks where the contribution is not the operator's own.",
          "Sorting by pushed_at to see what is actually warm.",
        ],
      },
      {
        id: "a2",
        agent: "oracle",
        action: "Rank by defensibility",
        tool: "rank",
        needs: ["a1"],
        cost: 520,
        thought: [
          "Scoring on test count, coverage, upstream acknowledgement and stack depth.",
          "Star count deliberately down-weighted — it measures reach, not rigour.",
          "PRAMANA separates from the field by a wide margin. 671 tests, 94% coverage.",
        ],
      },
      {
        id: "a3",
        agent: "cipher",
        action: "Verify the upstream claim",
        tool: "chain.verify",
        needs: ["a1"],
        cost: 300,
        thought: [
          "The AP2 finding asserts two upstream defects. Claims like that need checking.",
          "AP2#339 resolves. AP2#340 resolves. Both public, both acknowledged.",
          "Claim stands.",
        ],
      },
      {
        id: "a4",
        agent: "forge",
        action: "Mint the card set",
        tool: "render",
        needs: ["a2", "a3"],
        cost: 380,
        thought: [
          "Assigning rarity from the ranking, not from sentiment.",
          "One mythic. One legendary. The rest fall where they fall.",
          "Vault open.",
        ],
      },
    ],
  },

  {
    id: "assay",
    code: "M-03",
    title: "ASSAY THE GATE",
    objective:
      "Walk PRAMANA's verification path and confirm the INDETERMINATE claim holds.",
    reveals: "Unlocks the deep-dive on the flagship.",
    xp: 260,
    steps: [
      {
        id: "s1",
        agent: "cipher",
        action: "Parse an AP2 presentation",
        tool: "chain.verify",
        needs: [],
        cost: 460,
        thought: [
          "Loading an SD-JWT delegation chain.",
          "chain.verified — computed from AP2's own verification, not re-implemented.",
          "chain.disclosures_pinned — enumerating what the presentation actually disclosed against what policy demands.",
          "chain.nonce_fresh — checking the seen-nonce store. No replay.",
        ],
      },
      {
        id: "s2",
        agent: "warden",
        action: "Evaluate the RBI envelope",
        tool: "policy.eval",
        needs: ["s1"],
        cost: 540,
        thought: [
          "Five rbi.* predicates. Each must produce a result — not a default.",
          "Cap, validity window, mandate reference, debit frequency, pre-debit notification.",
          "All five returned. No predicate silently skipped.",
        ],
      },
      {
        id: "s3",
        agent: "warden",
        action: "Probe the INDETERMINATE path",
        tool: "predicate.eval",
        needs: ["s1"],
        cost: 480,
        thought: [
          "Now the interesting case. Withholding the three caller-supplied mandate.* obligations.",
          "They stay declared. Declared with no result.",
          "Verdict: INDETERMINATE. Blocked at construction — the type will not let it be built otherwise.",
          "This is the whole argument. A verifier that cannot tell 'checked and passed' from 'never checked' is not a verifier.",
        ],
      },
      {
        id: "s4",
        agent: "cipher",
        action: "Write the evidence record",
        tool: "audit.write",
        needs: ["s2", "s3"],
        cost: 320,
        thought: [
          "Hash-chaining the verdict to the previous record.",
          "An auditor can replay this without trusting the process that wrote it.",
          "Evidence sealed.",
        ],
      },
    ],
  },

  {
    id: "survey",
    code: "M-04",
    title: "SURVEY THE CAPABILITY TREE",
    objective:
      "Map the skill graph and mark which capabilities are load-bearing for which project.",
    reveals: "Unlocks the capability tree.",
    xp: 180,
    steps: [
      {
        id: "c1",
        agent: "atlas",
        action: "Load the capability graph",
        tool: "sql.plan",
        needs: [],
        cost: 240,
        thought: [
          "19 nodes, edges declared as prerequisites rather than categories.",
          "Three roots: Python, TypeScript, systems thinking.",
        ],
      },
      {
        id: "c2",
        agent: "oracle",
        action: "Trace dependency paths",
        tool: "rank",
        needs: ["c1"],
        cost: 400,
        thought: [
          "Longest path runs Python → cryptography → policy-as-code → agentic boundaries.",
          "That path is the spine. Everything defensible in the archive hangs off it.",
        ],
      },
      {
        id: "c3",
        agent: "forge",
        action: "Draw the tree",
        tool: "render",
        needs: ["c2"],
        cost: 300,
        thought: [
          "Edges drawn from the data — the shape is not hand-placed.",
          "Levels shown as declared. No rounding up.",
          "Tree ready.",
        ],
      },
    ],
  },

  {
    id: "trace",
    code: "M-05",
    title: "RECONSTRUCT THE LOG",
    objective:
      "Order the campaign chronologically and separate what was built from what was recognised.",
    reveals: "Unlocks the campaign log.",
    xp: 160,
    steps: [
      {
        id: "t1",
        agent: "atlas",
        action: "Order events chronologically",
        tool: "sql.plan",
        needs: [],
        cost: 220,
        thought: [
          "Six entries across 2024 to 2026.",
          "Two education tracks running concurrently — ordering by start, not by tier.",
        ],
      },
      {
        id: "t2",
        agent: "warden",
        action: "Separate claims from acknowledgements",
        tool: "audit.write",
        needs: ["t1"],
        cost: 380,
        thought: [
          "Marking which entries are self-reported and which have an external record.",
          "One entry carries third-party acknowledgement: the AP2 filings.",
          "Everything else is labelled as build, not as recognition. Kept honest.",
        ],
      },
      {
        id: "t3",
        agent: "forge",
        action: "Render the log",
        tool: "render",
        needs: ["t2"],
        cost: 260,
        thought: ["Log rendered in reverse chronological order.", "Campaign log ready."],
      },
    ],
  },

  {
    /* Not "assay": M-03 already owns that id, and two missions sharing one
       meant completing this credited that one's XP and marked both done. */
    id: "regrade",
    code: "M-06",
    title: "RUN THE ASSAY",
    objective:
      "Grade every repository against the rubric and rebuild the vault from the result.",
    reveals: "Re-ranks the card vault, live.",
    xp: 300,
    steps: [
      {
        id: "y1",
        agent: "atlas",
        action: "Load the evidence snapshot",
        tool: "assay.collect",
        needs: [],
        cost: 260,
        thought: [
          "Reading the snapshot the scheduled workflow leaves behind.",
          "Collecting it live would cost about 150 API calls — more than an anonymous visitor is allowed in an hour.",
          "So the gathering runs once a day in CI, and the grading runs here, on every load.",
        ],
      },
      {
        id: "y2",
        agent: "warden",
        action: "Apply the eligibility gate",
        tool: "assay.gate",
        needs: ["y1"],
        cost: 320,
        thought: [
          "Before anything is scored: what is even allowed to be judged?",
          "Forks are somebody else's work. Archived repositories are finished being interesting.",
          "And anything without the foundry-ready topic is still being worked on — those are skipped entirely, not marked down.",
          "Judging unfinished work and then penalising it for being unfinished would be a rigged gate.",
        ],
      },
      {
        id: "y3",
        agent: "oracle",
        action: "Score against the rubric",
        tool: "assay.score",
        needs: ["y2"],
        cost: 480,
        thought: [
          "Six bands: depth, verification, completeness, structure, shipped, attested.",
          "Verification carries the most weight — a project that cannot show it checked itself is taking its own word for it.",
          "Stars are not an input. They measure reach, not work.",
          "A language-spread signal used to live here and was removed: being written in one language is focus, not a deficiency.",
        ],
      },
      {
        id: "y4",
        agent: "cipher",
        action: "Re-check the attested claims",
        tool: "assay.verify",
        needs: ["y2"],
        cost: 360,
        thought: [
          "Some things are true but invisible to an API — a coverage percentage, a defect acknowledged upstream.",
          "Those are allowed to count, but only with a link a stranger can open, and only up to a hard cap.",
          "Attestation can lift a strong repository over a merely tidy one. It cannot carry a weak one.",
        ],
      },
      {
        id: "y5",
        agent: "oracle",
        action: "Rank what cleared the floor",
        tool: "assay.rank",
        needs: ["y3", "y4"],
        cost: 300,
        thought: [
          "Ordering by score. Position is earned here, not authored.",
          "Improve a repository and it climbs past one that stood still — on the next refresh, with nobody editing the site.",
        ],
      },
      {
        id: "y6",
        agent: "forge",
        action: "Mint and place the cards",
        tool: "cards.mint",
        needs: ["y5"],
        cost: 340,
        thought: [
          "Anything promoted with no card written for it gets one generated from its own evidence.",
          "A generated card says so on its face — a card written by a script should admit it.",
          "Vault rebuilt.",
        ],
      },
    ],
  },
];

export const missionById = Object.fromEntries(missions.map((m) => [m.id, m]));
