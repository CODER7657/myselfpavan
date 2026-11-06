/**
 * Writes the prose for a card the gate promoted and nobody has written up.
 *
 *   node --experimental-strip-types tools/write-cards.mjs [--force] [--dry-run]
 *
 * The vault can already synthesise a card from evidence alone, and it reads
 * like a filled-in form because that is what it is. This asks a model to write
 * the same five fields properly, from the same evidence, under house rules that
 * forbid it from saying anything the evidence does not support.
 *
 * Three properties matter more than the prose:
 *
 *   It never invents. Every number in the output must appear in the material
 *   the model was given, or the card is rejected and the template stands.
 *
 *   It never blocks the deploy. No key, no network, a rate limit, malformed
 *   JSON — all of it exits 0 with the previous cards.json untouched.
 *
 *   It never rewrites for the sake of it. Each card records a hash of the
 *   evidence it was written from; unchanged evidence means no call, no cost
 *   and no diff, which is what keeps the daily workflow quiet.
 *
 * Environment
 *   GROQ_API_KEY   required to write anything. Absent means the step no-ops.
 *   GROQ_MODEL     preferred model; otherwise the best one Groq offers
 *   GROQ_BASE_URL  default https://api.groq.com/openai/v1
 *   GITHUB_TOKEN   optional; only used to read READMEs at a higher rate limit
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assess } from "../packages/assay/src/rubric.ts";
import { CURATED_REPOS } from "../packages/assay/src/curated.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, "../apps/web/public/data");
const EVIDENCE = resolve(DATA, "evidence.json");
const CARDS = resolve(DATA, "cards.json");

const KEY = process.env.GROQ_API_KEY ?? "";
/*
 * The model is resolved at run time, not fixed here.
 *
 * Groq retires models. llama-3.3-70b-versatile, the original default, was
 * withdrawn, and every card request after that came back "model not found"
 * while the key itself was perfectly valid. So the writer asks Groq which
 * models exist and takes the first of these it actually offers. GROQ_MODEL,
 * if set, goes to the front of the queue.
 */
export const PREFERRED_MODELS = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
];
let MODEL = process.env.GROQ_MODEL || PREFERRED_MODELS[0];

/**
 * The first preferred model that is on offer; otherwise any chat model the
 * account can use, skipping speech and guard models that cannot write a card;
 * otherwise null, which means there is nothing to write with.
 */
export function pickModel(available, preferred) {
  const offered = new Set(available);
  const choice = preferred.find((m) => m && offered.has(m));
  if (choice) return choice;
  return available.find((m) => !/whisper|tts|guard|orpheus|playai/i.test(m)) ?? null;
}

async function resolveModel() {
  try {
    const res = await fetch(BASE + "/models", {
      headers: { Authorization: "Bearer " + KEY },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return MODEL;
    const ids = ((await res.json())?.data ?? []).map((m) => m.id).filter(Boolean);
    return pickModel(ids, [process.env.GROQ_MODEL, ...PREFERRED_MODELS]) ?? MODEL;
  } catch {
    /* A listing failure is not a reason to give up; try the configured one. */
    return MODEL;
  }
}
const BASE = (process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
const GH_TOKEN = process.env.GITHUB_TOKEN ?? "";
const OWNER = process.env.ASSAY_OWNER ?? "CODER7657";

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

/** How long one card is allowed to take before it is abandoned. */
const TIMEOUT_MS = 45_000;
/** How much README the model is shown. Enough to understand it, not a novel. */
const README_CHARS = 6_000;

/* ── house rules ──────────────────────────────────────────────────────────── */

const SYSTEM = [
  "You write catalogue entries for a software portfolio. You are given the",
  "observed evidence for one repository and nothing else.",
  "",
  "Rules, in order of importance:",
  "",
  "1. Never state anything the evidence does not support. If the evidence does",
  "   not say there are tests, a licence, a deployment or users, do not say so.",
  "   Do not guess at what the code does beyond what the README and the",
  "   description state.",
  "2. No marketing language. Not powerful, seamless, cutting-edge, robust,",
  "   revolutionary, world-class, game-changing, leverage or showcase. No",
  "   exclamation marks. Never address the reader as you.",
  "3. British spelling throughout: analyse, behaviour, licence (the noun),",
  "   organised, optimise, recognise.",
  "4. Say what is difficult about the problem, not what the software does. A",
  "   card that says it handles user authentication is worthless; one that says",
  "   what the hard part was is worth reading.",
  "5. Plain declarative sentences. No rhetorical questions, no lists, no",
  "   headings, no quotation marks around your own phrases.",
  "6. Numbers: only reuse numbers that appear in the evidence you were given.",
  "   Never round one, never invent one.",
  "7. If the evidence is thin, write less. A short honest card beats a padded",
  "   one.",
  "",
  "Return only the five fields, as JSON.",
].join("\n");

const FIELDS = {
  classification:
    "Two or three words naming the kind of thing this is, in Title Case. The register to match: Verification Gate, Surveillance Co-pilot, Offline-first Platform. Not a slogan.",
  tagline:
    "One sentence, at most 90 characters, ending in a full stop. The single most interesting true thing about it.",
  plain:
    "One sentence a non-engineer would understand, at most 200 characters. What the software is for, in ordinary words.",
  summary:
    "Two or three sentences, at most 450 characters, on what is actually in the repository: the stack, the shape, what is verified. Only what the evidence shows.",
  highlight:
    "At most two sentences and 300 characters on the hard part: the constraint, the failure mode it guards against, or the decision that was not obvious.",
};

const SCHEMA = {
  type: "object",
  properties: Object.fromEntries(
    Object.entries(FIELDS).map(([k, description]) => [k, { type: "string", description }])
  ),
  required: Object.keys(FIELDS),
  additionalProperties: false,
};

/** Anything on this list means the model reached for a brochure. */
const BANNED =
  /\b(powerful|seamless(ly)?|cutting[- ]edge|robust|revolutionary|world[- ]class|game[- ]chang\w+|leverag\w+|synerg\w+|best[- ]in[- ]class|state[- ]of[- ]the[- ]art|unparalleled|blazing|showcase\w*|passionate|delightful|effortless\w*)\b/i;

const LIMITS = { classification: 40, tagline: 110, plain: 240, summary: 520, highlight: 340 };

/* ── evidence for one repository ──────────────────────────────────────────── */

async function readme(name) {
  try {
    const res = await fetch("https://api.github.com/repos/" + OWNER + "/" + name + "/readme", {
      headers: {
        Accept: "application/vnd.github.raw",
        "User-Agent": "foundry-cards",
        ...(GH_TOKEN ? { Authorization: "Bearer " + GH_TOKEN } : {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return "";
    const text = await res.text();
    return text.length > README_CHARS ? text.slice(0, README_CHARS) + "\n[truncated]" : text;
  } catch {
    /* The README is a nicety. Its absence is not a failure. */
    return "";
  }
}

/** Everything the model is allowed to know, as plain text. */
function digest(a, e, readmeText) {
  const bands = a.bands
    .map(
      (b) =>
        "  " + b.label + ": " + b.earned + "/" + b.max + "\n" +
        b.signals.map((s) => "    - " + s.label + ": " + s.detail).join("\n")
    )
    .join("\n");

  return [
    "REPOSITORY: " + e.name,
    "DESCRIPTION: " + (e.description ?? "(none set)"),
    "TOPICS: " + (e.topics.join(", ") || "(none)"),
    "PRIMARY LANGUAGE: " + (e.language ?? "unknown"),
    "LANGUAGES: " + (e.languages.join(", ") || "unknown"),
    "LICENCE: " + (e.licence ?? "none"),
    "HOMEPAGE: " + (e.homepage ?? "none"),
    "TOP-LEVEL DIRECTORIES: " + (e.topLevelDirs.join(", ") || "(none)"),
    "TOP-LEVEL FILES: " + (e.topLevelFiles.slice(0, 24).join(", ") || "(none)"),
    "",
    "ASSAY: " + a.score + "/100, tier " + a.tier,
    bands,
    "",
    "README (verbatim, possibly truncated):",
    readmeText || "(no README)",
  ].join("\n");
}

/** A card is rewritten only when the evidence behind it moves. */
function evidenceKey(a, e) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        a.score, e.description, e.topics, e.language, e.homepage, e.licence,
        e.commits, e.releases, e.sourceFiles, e.testFiles, e.readmeBytes, e.pushedAt,
      ])
    )
    .digest("hex")
    .slice(0, 12);
}

/* ── the call ─────────────────────────────────────────────────────────────── */

async function ask(prompt) {
  const body = {
    model: MODEL,
    temperature: 0.2,
    max_completion_tokens: 900,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "card", strict: true, schema: SCHEMA },
    },
  };

  /* One retry, because a rate limit or a 502 is usually momentary, and then it
     gives up rather than holding a deploy open. */
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(BASE + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) {
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("no content in the response");
      return JSON.parse(content);
    }

    const detail = (await res.text().catch(() => "")).slice(0, 160).replace(/\s+/g, " ");
    if (attempt === 2 || (res.status < 500 && res.status !== 429)) {
      throw new Error("HTTP " + res.status + (detail ? " — " + detail : ""));
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
}

/* ── validation ───────────────────────────────────────────────────────────── */

/**
 * Rejects a card rather than publishing a claim nobody can check.
 *
 * The numeric test is the one that matters: a model asked about a repository
 * will happily write "over 200 commits" when the evidence said 42, and that is
 * exactly the kind of error a portfolio cannot afford. Every number in the
 * prose has to appear in the material the model was shown.
 */
export function validate(card, facts) {
  const problems = [];

  for (const field of Object.keys(FIELDS)) {
    const value = card?.[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      problems.push(field + " is missing");
      continue;
    }
    if (value.length > LIMITS[field]) {
      problems.push(
        field + " is " + value.length + " characters, over the limit of " + LIMITS[field]
      );
    }
    const banned = BANNED.exec(value);
    if (banned) problems.push(field + " uses marketing language: " + banned[0]);
  }

  const prose = Object.keys(FIELDS)
    .map((f) => (typeof card?.[f] === "string" ? card[f] : ""))
    .join(" ");

  /* Thousands separators are a formatting choice, not a different number. */
  const haystack = facts.replace(/,/g, "");
  for (const n of prose.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? []) {
    if (!haystack.includes(n)) {
      problems.push("claims a number the evidence does not contain: " + n);
    }
  }

  return problems;
}

/* ── main ─────────────────────────────────────────────────────────────────── */

async function main() {
  if (!existsSync(EVIDENCE)) {
    console.log("No evidence yet — nothing to write.");
    return;
  }

  const { repos, collectedAt } = JSON.parse(readFileSync(EVIDENCE, "utf8"));

  const candidates = repos
    .map((e) => ({ e, a: assess(e) }))
    .filter(({ a }) => a.verdict === "promoted")
    .filter(({ e }) => !CURATED_REPOS.has(e.name.toLowerCase()))
    .sort((x, y) => y.a.score - x.a.score);

  if (candidates.length === 0) {
    console.log("Every promoted repository already has a written card. Nothing to do.");
    return;
  }

  let existing = { cards: {} };
  if (existsSync(CARDS)) {
    try {
      const parsed = JSON.parse(readFileSync(CARDS, "utf8"));
      if (parsed && typeof parsed === "object" && parsed.cards) existing = parsed;
    } catch {
      console.warn("cards.json is unreadable — starting a fresh one.");
    }
  }

  const stale = candidates.filter(({ a, e }) => {
    const have = existing.cards[e.name.toLowerCase()];
    return force || !have || have.evidenceKey !== evidenceKey(a, e);
  });

  console.log(
    candidates.length + " promoted repositor" + (candidates.length === 1 ? "y" : "ies") +
      " with no written card; " + stale.length + " need prose."
  );

  if (stale.length === 0) return;

  if (!KEY && !dryRun) {
    console.log(
      "GROQ_API_KEY is not set — leaving cards.json alone. The vault falls back to\n" +
        "the generated template for these, which is the intended behaviour."
    );
    return;
  }

  if (KEY) {
    MODEL = await resolveModel();
    console.log("  writing with " + MODEL);
  }

  const cards = { ...existing.cards };
  let written = 0;

  for (const { a, e } of stale) {
    const key = e.name.toLowerCase();
    const facts = digest(a, e, await readme(e.name));

    if (dryRun) {
      console.log("\n─── " + e.name + " ───");
      console.log("model: " + MODEL + "   endpoint: " + BASE + "/chat/completions");
      console.log(facts.slice(0, 1400) + (facts.length > 1400 ? "\n…" : ""));
      continue;
    }

    try {
      const card = await ask(facts);
      const problems = validate(card, facts);

      if (problems.length) {
        console.warn("  ✗ " + e.name + " rejected — " + problems.join("; "));
        continue;
      }

      cards[key] = {
        repo: e.name,
        classification: card.classification.trim(),
        tagline: card.tagline.trim(),
        plain: card.plain.trim(),
        summary: card.summary.trim(),
        highlight: card.highlight.trim(),
        model: MODEL,
        writtenAt: collectedAt,
        scoreAtWriting: a.score,
        evidenceKey: evidenceKey(a, e),
      };
      written++;
      console.log("  ✓ " + e.name + " — " + card.tagline);
    } catch (err) {
      /* Fail soft, every time. A card is worth less than a deploy. */
      console.warn("  ✗ " + e.name + " — " + err.message);
    }
  }

  if (dryRun) {
    console.log("\nDry run: nothing written, no request made.");
    return;
  }

  if (written === 0) {
    console.log("No card survived. cards.json is unchanged and the template stands.");
    return;
  }

  /* Sorted, so a diff shows what changed rather than what moved. */
  const ordered = Object.fromEntries(Object.keys(cards).sort().map((k) => [k, cards[k]]));

  mkdirSync(DATA, { recursive: true });
  writeFileSync(CARDS, JSON.stringify({ model: MODEL, cards: ordered }, null, 2) + "\n");
  console.log("Wrote " + written + " card(s) to " + CARDS);
}

/* Importable by a test harness; runs only when invoked directly. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    /* Even an unexpected failure exits clean: the site keeps the prose it has. */
    console.error("write-cards failed, leaving cards.json alone: " + err.message);
  });
}
