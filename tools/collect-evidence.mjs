/**
 * Gathers the raw evidence the assay rubric grades.
 *
 * This script only *observes* — it never scores. Scoring lives in
 * packages/assay so the rules have exactly one definition, shared by the site
 * and by anyone recomputing a verdict by hand.
 *
 * Everything here is reachable through the public GitHub API, which is the
 * point: a rank has to be something a stranger could arrive at independently.
 *
 *   node tools/collect-evidence.mjs
 *
 * Set GITHUB_TOKEN to lift the unauthenticated rate limit (60/hour). In CI the
 * workflow's built-in token is enough for the whole account.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { authorship } from "../packages/assay/src/membership.ts";
import { explainDeparture } from "../packages/assay/src/departures.ts";
import { checkableUrl, livenessOf } from "../packages/assay/src/liveness.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../apps/web/public/data");

const OWNER = process.env.ASSAY_OWNER ?? "CODER7657";
const TOKEN = process.env.GITHUB_TOKEN ?? "";
/* Overridable so the retry and carry-forward behaviour can be tested against
   a server that fails on purpose, rather than by hoping GitHub misbehaves. */
const API = process.env.GITHUB_API ?? "https://api.github.com";

/** Kept low: the point is to finish inside the rate limit, not to race. */
const CONCURRENCY = 4;

/* ── http ────────────────────────────────────────────────────────────── */

let calls = 0;

/**
 * The retry policy, and why it is not optional.
 *
 * Every signal in the rubric is derived from these responses, so a request that
 * fails quietly does not produce a missing score — it produces a *wrong* one.
 * The recursive tree call is the sharp edge: one failure reads as "this
 * repository contains no files", which takes PRAMANA from 75.3 to 35.8 and
 * drops GlobeTrotter and ComplyLite under the promotion floor, withdrawing
 * their cards from the site. A transient 502 could rewrite the whole ranking,
 * and the result would look entirely plausible.
 *
 * So nothing here returns a default on failure. It retries, and if it still
 * cannot answer it throws, and the run stops rather than publishing fiction.
 *
 * Waiting follows GitHub's documented contract, in their order of precedence:
 * honour `retry-after`; else if `x-ratelimit-remaining` is 0, wait for
 * `x-ratelimit-reset`; else wait a minute. Continuing to hammer a rate limit
 * is the one behaviour they warn can get an integration banned.
 */
const MAX_ATTEMPTS = 4;
/** A wait longer than this is not worth a CI runner sitting idle — fail loudly. */
const MAX_WAIT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 20_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Spreads retries so parallel workers do not all wake at the same instant. */
const jitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5));

/** How long GitHub has asked us to wait, in ms, or null if it did not say. */
function askedToWait(res) {
  const retryAfter = res.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }

  if (res.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    if (Number.isFinite(reset)) return Math.max(0, reset * 1000 - Date.now());
  }

  return null;
}

const headersFor = (raw) => ({
  Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
  "User-Agent": "foundry-assay",
  ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}),
});

/**
 * One request, retried. Resolves to the response, or null for a genuine 404 —
 * which is an answer ("there is no LICENCE file"), not a failure.
 */
async function attempt(url, raw, emptyOn = []) {
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    let res;

    try {
      res = await fetch(url, {
        headers: headersFor(raw),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      /* Network fault or timeout: no response to read a policy from. */
      if (n === MAX_ATTEMPTS) {
        throw new Error(url + " — " + err.message + " after " + n + " attempts");
      }
      await sleep(jitter(500 * 2 ** n));
      continue;
    }

    calls++;

    if (res.status === 404) return null;
    /*
     * Some statuses are answers rather than faults. Listing the commits of an
     * empty repository is a documented 409, and treating that as a failed read
     * would carry the repository forward for ever instead of recording the
     * plain truth: it has no commits.
     */
    if (emptyOn.includes(res.status)) return null;
    if (res.ok) return res;

    /*
     * A 403 is only a rate limit when GitHub says so. It is also how GitHub
     * answers a token that is not allowed to see something — the workflow's
     * own token asking for private repositories, for one — and retrying that
     * for a minute at a time, four times over, just stalls the run before
     * failing anyway.
     */
    const limited =
      res.status === 429 ||
      res.headers.get("retry-after") !== null ||
      res.headers.get("x-ratelimit-remaining") === "0";

    if (res.status === 403 && !limited) {
      const detail = (await res.text().catch(() => "")).slice(0, 140).replace(/\s+/g, " ");
      throw new Error(url + " → 403 forbidden" + (detail ? " — " + detail : ""));
    }

    if (limited) {
      const wait = askedToWait(res) ?? 60_000;
      if (wait > MAX_WAIT_MS || n === MAX_ATTEMPTS) {
        throw new Error(
          "Rate limited on " + url + " — GitHub asks for " +
            Math.round(wait / 1000) + "s" +
            (TOKEN ? "" : "; set GITHUB_TOKEN to raise the 60/hour anonymous limit")
        );
      }
      console.warn("  · rate limited, waiting " + Math.round(wait / 1000) + "s");
      await sleep(jitter(wait));
      continue;
    }

    if (res.status >= 500) {
      if (n === MAX_ATTEMPTS) {
        throw new Error(url + " → " + res.status + " after " + n + " attempts");
      }
      await sleep(jitter(500 * 2 ** n));
      continue;
    }

    throw new Error(url + " → " + res.status);
  }

  throw new Error(url + " — exhausted " + MAX_ATTEMPTS + " attempts");
}

export async function gh(path, { raw = false, emptyOn = [] } = {}) {
  const res = await attempt(API + path, raw, emptyOn);
  if (!res) return null;
  return raw ? res.text() : res.json();
}

/**
 * Total count via pagination headers.
 *
 * Asking for one item and reading the `last` page number is a single request,
 * where walking the collection would be dozens.
 */
async function countVia(path) {
  /* 404: no such collection. 409: GitHub's answer for an empty repository.
     Both are a real zero rather than a failed lookup. */
  const res = await attempt(API + path + "?per_page=1", false, [409]);
  if (!res) return 0;

  const link = res.headers.get("link");
  if (link) {
    const m = /[?&]page=(\d+)>;\s*rel="last"/.exec(link);
    if (m) return Number(m[1]);
  }

  const body = await res.json().catch(() => []);
  return Array.isArray(body) ? body.length : 0;
}

/* ── path signals ─────────────────────────────────────────────────────────── */

/*
 * One recursive tree call gives every path in the repository, which is enough
 * to answer all the structural questions without another request.
 */
const RX = {
  tests: /(^|\/)(tests?|__tests__|spec|e2e)(\/|$)|\.(test|spec)\.[jt]sx?$|(^|\/)test_[^/]+\.py$|_test\.(py|go|rs)$/i,
  ci: /^\.github\/workflows\/.+\.ya?ml$/i,
  /* Config files only. A `coverage/` directory is build output, not evidence
     that coverage is configured. */
  coverage: /(^|\/)(\.coveragerc|codecov\.ya?ml|\.nycrc|jest\.config\.[jt]s|vitest\.config\.[jt]s)$/i,
  linter: /(^|\/)(\.eslintrc|eslint\.config|ruff\.toml|\.flake8|\.prettierrc|tsconfig\.json|mypy\.ini)/i,
  docs: /^docs?\//i,
  manifest: /^(package\.json|pyproject\.toml|requirements\.txt|Cargo\.toml|go\.mod|build\.gradle(\.kts)?|pom\.xml|Gemfile)$/i,
  container: /^(Dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/i,
  workspace: /^(pnpm-workspace\.yaml|turbo\.json|lerna\.json|nx\.json)$/i,

  /* Source, so the work itself can be measured rather than its git history. */
  source: /\.(ts|tsx|js|jsx|py|rs|go|java|kt|kts|sol|rb|php|swift|c|cc|cpp|h|hpp|cs|vue|svelte|scss|css)$/i,

  /* Interface craft, in the only forms an API can see. */
  component: /(^|\/)(components?|widgets?|screens?|views?|pages?)\//i,
  designSystem: /(^|\/)(tailwind\.config|theme\.[jt]s|tokens?\.(json|ts|css)|design-system|styled\.[jt]s|panda\.config|\.storybook)/i,
  a11y: /(eslint-plugin-jsx-a11y|axe-core|@axe-core|jsx-a11y)/i,
  motion: /(framer-motion|\bgsap\b|\bmotion\b|react-spring|lottie|three)/i,
};

/*
 * Vendored code and build output are not the author's work.
 *
 * A repository with node_modules committed reported 410 test files — its
 * dependencies' tests, counted as its own. Filtering these out before any
 * signal is computed is what keeps the score honest.
 */
const VENDORED =
  /(^|\/)(node_modules|bower_components|vendor|third_party|\.venv|venv|site-packages|dist|build|out|target|\.next|coverage|artifacts|cache|typechain-types|__pycache__|\.git)(\/|$)/i;

function pathSignals(paths) {
  const any = (rx) => paths.some((p) => rx.test(p));
  return {
    /*
     * Counted, not just detected. "A tests directory exists" cannot tell a
     * token test file apart from a suite of several hundred, and that is
     * exactly the distinction the rubric is supposed to reward.
     */
    testFiles: paths.filter((p) => RX.tests.test(p) && /\.[a-z]+$/i.test(p)).length,
    docFiles: paths.filter((p) => RX.docs.test(p) && /\.mdx?$/i.test(p)).length,

    /*
     * Written source, counted directly.
     *
     * Commit count alone punishes a complete project that happened to be
     * squashed into one import — the history is thin, the work is not. This
     * measures what is actually there.
     */
    sourceFiles: paths.filter((p) => RX.source.test(p)).length,

    /* Interface craft. A polished front end is a real discipline and was
       previously worth nothing here. */
    componentFiles: paths.filter((p) => RX.component.test(p) && RX.source.test(p)).length,
    hasDesignSystem: any(RX.designSystem),
    hasTests: any(RX.tests),
    hasCi: any(RX.ci),
    hasCoverage: any(RX.coverage),
    hasLinter: any(RX.linter),
    hasDocs: any(RX.docs),
    hasManifest: any(RX.manifest),
    hasContainer: any(RX.container),
    hasWorkspace: any(RX.workspace),
  };
}

/* ── readme prose ─────────────────────────────────────────────────────────── */

/**
 * Pulls the first paragraph of real prose out of a README.
 *
 * A generated card that just repeats the one-line GitHub description says very
 * little. The opening paragraph of a README is usually the author explaining
 * what the thing is, in their own words — which is far better material, and
 * still nobody's invention.
 *
 * Headings, badge rows, HTML blocks, code fences and list items are skipped;
 * what survives is a sentence someone actually wrote.
 */
function readmeLede(markdown) {
  if (!markdown) return null;

  const cleaned = markdown
    .replace(/^---[\s\S]*?---/, "")        // front matter
    .replace(/```[\s\S]*?```/g, "")        // fenced code
    .replace(/<[^>]+>/g, "")                    // inline html
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")   // images and badges
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"); // links to their text

  /*
   * The introduction, then everything, in that order.
   *
   * AURA-GUARD's card opened with "We welcome contributions to AURA-GUARD!"
   * because its intro had no paragraph that qualified and the search ran on
   * into the contributing section. Cutting the back matter away fixed that
   * and immediately cost GlobeTrotter its lede, whose only real prose sits
   * below a heading. So the intro is preferred and the rest is a fallback:
   * a description from further down beats no description at all, and the
   * housekeeping shapes are refused either way.
   */
  const backMatter =
    /^#{1,6}\s*(?:contributing|contribution|licen[sc]e|installation|install|getting started|setup|acknowledge?ments?|credits|changelog|roadmap|contact|support)\b/im;

  return pickLede(cleaned.split(backMatter)[0]) ?? pickLede(cleaned);
}

/** The first paragraph that reads like somebody describing their project. */
function pickLede(text) {
  for (const block of (text ?? "").split(/\n\s*\n/)) {
    const line = block.trim().replace(/\s+/g, " ");
    if (!line) continue;

    if (/^[#>|*=+_\-]/.test(line)) continue;   // heading, quote, table, list, aside
    if (/^\d+[.)]\s/.test(line)) continue;    // numbered step
    if (/^`/.test(line)) continue;                // opens with a command
    if (line.length < 60) continue;               // too short to be a description
    if (!/[a-z]/.test(line)) continue;            // all-caps banner
    if (!/[.!?]/.test(line)) continue;            // not a sentence
    if (line.split(" ").length < 10) continue;    // not enough of one

    /* Housekeeping prose, which says nothing about the project itself. */
    if (/^(we welcome|contributions are|this project is licensed|pull requests|please read|to get started|first,? clone|run the following|clone the repo)/i.test(line)) continue;
    if (/^(thanks?|thank you|special thanks)\b/i.test(line)) continue;

    // Mostly inline code is a usage note, not prose.
    const ticked = (line.match(/`[^`]*`/g) || []).join("").length;
    if (ticked / line.length > 0.2) continue;

    return line.length > 260 ? line.slice(0, 257).trimEnd() + "…" : line;
  }

  return null;
}

/* ── per repository ───────────────────────────────────────────────────────── */

export async function inspect(repo) {
  /* full_name, not OWNER/name: a repository the owner wrote may now live in an
     organisation, as roadside-app does. */
  const base = "/repos/" + (repo.full_name ?? OWNER + "/" + repo.name);

  /*
   * Nothing here is wrapped in a catch any more.
   *
   * These five results are the entire basis of the score, and a swallowed
   * failure does not show up as a gap — it shows up as a repository that
   * appears to have no files, no tests and no history. Letting it throw is
   * what lets the caller tell "collected and empty" apart from "not
   * collected", which is the difference between a rank and a guess.
   */
  const [tree, readme, languages, commits, releases] = await Promise.all([
    /* 409 here is an empty repository: no commits, so no tree to walk. That is
       an answer, and the rubric scores it correctly as a repository with
       nothing in it. */
    gh(base + "/git/trees/" + repo.default_branch + "?recursive=1", { emptyOn: [409] }),
    gh(base + "/readme", { raw: true }),
    gh(base + "/languages"),
    countVia(base + "/commits"),
    countVia(base + "/releases"),
  ]);

  const entries = Array.isArray(tree?.tree) ? tree.tree : [];
  const allPaths = entries.map((t) => t.path);
  const paths = allPaths.filter((p) => !VENDORED.test(p));
  const vendoredPaths = allPaths.length - paths.length;

  const topLevelDirs = [
    ...new Set(
      entries
        .filter((t) => t.type === "tree" && !t.path.includes("/"))
        .map((t) => t.path)
        .filter((p) => !p.startsWith("."))
    ),
  ];
  const topLevelFiles = entries
    .filter((t) => t.type === "blob" && !t.path.includes("/"))
    .map((t) => t.path);

  /*
   * Read the manifests, not just their filenames.
   *
   * A path scan reported PRAMANA as having no linter and no coverage, because
   * ruff, mypy and pytest-cov are all declared inside pyproject.toml rather
   * than in files named after themselves. Most Python projects and a good
   * share of Node ones configure tooling this way, so scoring on filenames
   * alone systematically punishes them.
   */
  const manifestNames = topLevelFiles.filter((f) => RX.manifest.test(f));
  const manifests = await Promise.all(
    manifestNames.slice(0, 3).map((f) => gh(base + "/contents/" + f, { raw: true }))
  );
  const declared = manifests.filter(Boolean).join("\n").toLowerCase();

  const declares = (rx) => rx.test(declared);

  return {
    name: repo.name,
    url: repo.html_url,
    fullName: repo.full_name ?? OWNER + "/" + repo.name,
    description: repo.description ?? null,
    homepage: repo.homepage || null,
    language: repo.language ?? null,
    languages: Object.keys(languages ?? {}),
    topics: repo.topics ?? [],
    isFork: Boolean(repo.fork),
    isArchived: Boolean(repo.archived),
    isPrivate: Boolean(repo.private),
    stars: repo.stargazers_count ?? 0,
    sizeKb: repo.size ?? 0,
    pushedAt: repo.pushed_at ?? "",
    createdAt: repo.created_at ?? "",
    licence: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"
      ? repo.license.spdx_id
      : null,

    commits,
    releases,

    topLevelDirs,
    topLevelFiles,
    readmeBytes: readme ? Buffer.byteLength(readme, "utf8") : 0,
    readmeLede: readmeLede(readme),

    /** Files ignored as vendored or build output, kept for traceability. */
    vendoredPaths,

    ...(() => {
      const sig = pathSignals(paths);
      return {
        ...sig,
        /* A declared dev dependency counts as much as a config file. */
        hasCoverage:
          sig.hasCoverage ||
          declares(/pytest-cov|coverage\[toml\]|\bnyc\b|--cov|\bc8\b|codecov/),
        hasA11y: declares(RX.a11y),
        hasMotion: declares(RX.motion) || paths.some((p) => RX.motion.test(p)),
        hasLinter:
          sig.hasLinter ||
          declares(/\[tool\.ruff|\[tool\.mypy|\bruff\b|\bmypy\b|\beslint\b|\bbiome\b|\bpylint\b|\bflake8\b/),
      };
    })(),
  };
}

/**
 * Runs `worker` over `items` with a fixed number in flight.
 *
 * Failures are returned rather than logged and forgotten. A repository that
 * could not be inspected must not simply vanish from the snapshot: the site
 * would then report it as unreachable and withdraw its card, on the strength
 * of a network error.
 */
async function pool(items, limit, worker) {
  const done = [];
  const failed = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        try {
          done.push(await worker(items[i]));
        } catch (err) {
          console.warn("  ! " + items[i].name + ": " + err.message);
          failed.push({ name: items[i].name, error: err.message });
        }
      }
    })
  );

  return { done, failed };
}

/* ── listing, liveness, departures ────────────────────────────────────────── */

/** Every page of a repository listing. Five pages is 500 repositories. */
async function listPages(path) {
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(path + "&per_page=100&page=" + page);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

const HOMEPAGE_TIMEOUT_MS = 10_000;

/**
 * Requests a homepage and reports whether anything answered. Two attempts,
 * because a cold free-tier deployment can take longer than one request to
 * wake, and a single slow start should not cost a repository five points.
 * GET rather than HEAD: plenty of hosts answer HEAD wrongly.
 */
export async function probeHomepage(url, fetchImpl = fetch) {
  let status = null;
  for (let n = 1; n <= 2; n++) {
    try {
      const res = await fetchImpl(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "foundry-assay (+https://myselfpavan.vercel.app)" },
        signal: AbortSignal.timeout(HOMEPAGE_TIMEOUT_MS),
      });
      status = res.status;
      /* Only the status matters; do not download the page. */
      await res.body?.cancel?.().catch?.(() => undefined);
      if (livenessOf(status) === "live") return "live";
    } catch {
      status = null;
    }
  }
  return livenessOf(status);
}

/** "https://github.com/OWNER/name" → "OWNER/name". */
export function fullNameFromUrl(url) {
  const m = /github\.com\/([^/]+)\/([^/?#]+)/.exec(url ?? "");
  return m ? m[1] + "/" + m[2] : null;
}

/**
 * Asks GitHub directly what became of a repository that left the listing.
 * GitHub follows a rename or transfer with a redirect, so the answer names
 * where it went. A network failure returns null: unexplained, which is the
 * safe direction — the verifier then refuses rather than publishing a loss.
 */
async function confirmDeparture(expectedFullName) {
  try {
    const res = await attempt(API + "/repos/" + expectedFullName, false);
    if (!res) return explainDeparture(expectedFullName, { status: "missing" });
    const repo = await res.json();
    return explainDeparture(expectedFullName, {
      status: "found",
      fullName: repo.full_name,
      private: Boolean(repo.private),
    });
  } catch {
    return null;
  }
}

/* ── main ─────────────────────────────────────────────────────────────────── */

async function main() {
  console.log("Collecting evidence for " + OWNER + (TOKEN ? " (authenticated)" : " (anonymous)"));

  const repos = await listPages("/users/" + OWNER + "/repos?type=owner&sort=pushed");

  /*
   * Repositories that live elsewhere but are this account's work.
   *
   * roadside-app was transferred to the Hash-Hawks organisation and, listed by
   * owner alone, simply vanished — which froze the assay for a month. The
   * account is also a collaborator on several friends' repositories, which
   * must not be claimed. Authorship decides: a repository counts if this
   * account wrote at least half of its human commits.
   */
  const owned = new Set(repos.map((r) => r.name.toLowerCase()));
  const elsewhere = (await listPages("/users/" + OWNER + "/repos?type=member&sort=pushed"))
    .filter((r) => r.owner?.login?.toLowerCase() !== OWNER.toLowerCase())
    .filter((r) => !owned.has(r.name.toLowerCase()));

  for (const r of elsewhere) {
    const contributors = await gh("/repos/" + r.full_name + "/contributors?per_page=100").catch(() => null);
    const a = authorship(OWNER, Array.isArray(contributors) ? contributors : []);
    console.log(
      "  " + (a.mine ? "+" : "·") + " " + r.full_name + " — " + Math.round(a.share * 100) +
        "% of commits by " + OWNER + (a.mine ? ", graded" : ", not this account's work")
    );
    if (a.mine) repos.push(r);
  }

  /*
   * The evidence file is served publicly, so a private repository must never
   * reach it. `/users/{owner}/repos` already returns only public repositories
   * even for an authenticated owner — this filter is the belt to that braces,
   * so switching to `/user/repos` later cannot silently start leaking names.
   */
  const publicOnly = repos.filter((r) => !r.private);
  const withheld = repos.length - publicOnly.length;

  console.log(
    "  " + publicOnly.length + " public repositories listed" +
      (withheld > 0 ? " (" + withheld + " private, withheld)" : "")
  );

  const { done, failed } = await pool(publicOnly, CONCURRENCY, inspect);
  const evidence = [...done];

  /*
   * A repository that could not be inspected keeps the entry it had last time.
   *
   * The alternative -- dropping it -- is what makes a network fault look like
   * a deletion: the site cannot find it in the snapshot, so it reports the
   * work as unreachable and withdraws its card. Yesterday's observation is
   * stale by a day; no observation at all is simply wrong, and wrong in the
   * direction that removes real work from the page.
   *
   * The entry is marked, so nothing downstream can mistake it for fresh.
   */
  const previous = readPrevious();
  const carried = [];
  const lost = [];

  for (const f of failed) {
    const before = previous.byName.get(f.name.toLowerCase());
    if (before) {
      carried.push(f.name);
      evidence.push({
        ...before,
        carriedForward: true,
        carriedFrom: previous.collectedAt,
        carriedBecause: f.error.slice(0, 200),
      });
    } else {
      /* Never seen before and unreadable now: there is nothing honest to put
         in the file, so it is left out and counted. */
      lost.push(f.name);
    }
  }

  /* ── is each deployment actually there? ─────────────────────────────── */

  await pool(
    evidence.filter((e) => !e.carriedForward && checkableUrl(e.homepage)),
    CONCURRENCY,
    async (e) => {
      e.homepageLive = await probeHomepage(checkableUrl(e.homepage));
      return e;
    }
  );
  const down = evidence.filter((e) => e.homepageLive === "down").map((e) => e.name);
  if (down.length) console.log("  homepage not answering: " + down.join(", "));

  /* ── what left, and why ──────────────────────────────────────────────── */

  const present = new Set(evidence.map((e) => e.name.toLowerCase()));
  const departed = [];
  for (const [key, before] of previous.byName) {
    if (present.has(key)) continue;
    const expected = before.fullName ?? fullNameFromUrl(before.url) ?? OWNER + "/" + before.name;
    const d = await confirmDeparture(expected);
    if (d) {
      departed.push(d);
      console.log("  departed: " + d.name + " (" + d.why + (d.now ? " → " + d.now : "") + ")");
    } else {
      console.warn("  ! " + before.name + " is missing from the listing but GitHub says it is still here");
    }
  }

  evidence.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));

  const payload = {
    collectedAt: new Date().toISOString(),
    owner: OWNER,
    apiCalls: calls,
    /** Always false for every entry; private work is never published here. */
    includesPrivate: false,
    /** Entries that are last run's, because this run could not read them. */
    carriedForward: carried,
    /** Repositories GitHub confirmed have really gone, and how. */
    departed,
    repos: evidence,
  };

  mkdirSync(OUT, { recursive: true });
  const file = resolve(OUT, "evidence.json");
  writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");

  console.log(
    "  " + done.length + " inspected in " + calls + " API calls" +
      (carried.length
        ? "\n  " + carried.length + " carried forward from the last run: " + carried.join(", ")
        : "") +
      (lost.length ? "\n  " + lost.length + " unreadable with no fallback: " + lost.join(", ") : "") +
      "\n  wrote " + file
  );

  /*
   * A run that lost a repository outright has built a snapshot that would take
   * work off the site. Say so with an exit code, so the workflow stops before
   * publishing it.
   */
  if (lost.length > 0) {
    throw new Error(
      lost.length + " repositor" + (lost.length === 1 ? "y" : "ies") +
        " could not be read and had no previous entry to fall back on"
    );
  }
}

/** Last run's evidence, for carrying an unreadable repository forward. */
function readPrevious() {
  const empty = { byName: new Map(), collectedAt: null };
  const file = resolve(OUT, "evidence.json");
  if (!existsSync(file)) return empty;

  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const byName = new Map();
    for (const r of parsed.repos ?? []) {
      if (r?.name) byName.set(r.name.toLowerCase(), r);
    }
    return { byName, collectedAt: parsed.collectedAt ?? null };
  } catch {
    console.warn("  ! previous evidence is unreadable -- nothing to carry forward");
    return empty;
  }
}

/* Importable by the private pass, which reuses inspect() and the retry
   policy; runs only when invoked directly. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
