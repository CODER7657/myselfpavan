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
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../apps/web/public/data");

const OWNER = process.env.ASSAY_OWNER ?? "CODER7657";
const TOKEN = process.env.GITHUB_TOKEN ?? "";
const API = "https://api.github.com";

/** Kept low: the point is to finish inside the rate limit, not to race. */
const CONCURRENCY = 4;

/* ── http ─────────────────────────────────────────────────────────────────── */

let calls = 0;

async function gh(path, { raw = false, allow404 = true } = {}) {
  const res = await fetch(API + path, {
    headers: {
      Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
      "User-Agent": "foundry-assay",
      ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}),
    },
  });
  calls++;

  if (res.status === 404 && allow404) return null;
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    throw new Error(
      "Rate limited after " + calls + " calls" +
        (reset ? " (resets " + new Date(Number(reset) * 1000).toISOString() + ")" : "") +
        (TOKEN ? "" : " — set GITHUB_TOKEN to raise the limit")
    );
  }
  if (!res.ok) throw new Error("GET " + path + " → " + res.status);

  return raw ? res.text() : res.json();
}

/**
 * Total count via pagination headers.
 *
 * Asking for one item and reading the `last` page number is a single request,
 * where walking the collection would be dozens.
 */
async function countVia(path) {
  const res = await fetch(API + path + "?per_page=1", {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "foundry-assay",
      ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}),
    },
  });
  calls++;
  if (!res.ok) return 0;

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
  motion: /(framer-motion|gsap|motion|react-spring|lottie|three)/i,
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
    .replace(/^---[\s\S]*?---/, "")              // front matter
    .replace(/```[\s\S]*?```/g, "")              // fenced code
    .replace(/<[^>]+>/g, "")                        // inline html
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")       // images and badges
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");   // links to their text

  for (const block of cleaned.split(/\n\s*\n/)) {
    const line = block.trim().replace(/\s+/g, " ");
    if (!line) continue;

    if (/^[#>|*=+_\-]/.test(line)) continue;  // heading, quote, table, list, aside
    if (/^\d+[.)]\s/.test(line)) continue;      // numbered step
    if (/^`/.test(line)) continue;                 // opens with a command
    if (line.length < 60) continue;                // too short to be a description
    if (!/[a-z]/.test(line)) continue;             // all-caps banner
    if (!/[.!?]/.test(line)) continue;             // not a sentence
    if (line.split(" ").length < 10) continue;     // not enough of one

    // Mostly inline code is a usage note, not prose.
    const ticked = (line.match(/`[^`]*`/g) || []).join("").length;
    if (ticked / line.length > 0.2) continue;

    return line.length > 260 ? line.slice(0, 257).trimEnd() + "…" : line;
  }

  return null;
}

/* ── per repository ───────────────────────────────────────────────────────── */

async function inspect(repo) {
  const base = "/repos/" + OWNER + "/" + repo.name;

  const [tree, readme, languages, commits, releases] = await Promise.all([
    gh(base + "/git/trees/" + repo.default_branch + "?recursive=1").catch(() => null),
    gh(base + "/readme", { raw: true }).catch(() => null),
    gh(base + "/languages").catch(() => null),
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
    manifestNames
      .slice(0, 3)
      .map((f) => gh(base + "/contents/" + f, { raw: true }).catch(() => null))
  );
  const declared = manifests.filter(Boolean).join("\n").toLowerCase();

  const declares = (rx) => rx.test(declared);

  return {
    name: repo.name,
    url: repo.html_url,
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
          declares(/pytest-cov|coverage\[toml\]|nyc|--cov|c8|codecov/),
        hasA11y: declares(RX.a11y),
        hasMotion: declares(RX.motion) || paths.some((p) => RX.motion.test(p)),
        hasLinter:
          sig.hasLinter ||
          declares(/\[tool\.ruff|\[tool\.mypy|ruff|mypy|eslint|biome|pylint|flake8/),
      };
    })(),
  };
}

/** Runs `worker` over `items` with a fixed number in flight. */
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        try {
          out[i] = await worker(items[i]);
        } catch (err) {
          console.warn("  ! " + items[i].name + ": " + err.message);
          out[i] = null;
        }
      }
    })
  );

  return out.filter(Boolean);
}

/* ── main ─────────────────────────────────────────────────────────────────── */

async function main() {
  console.log("Collecting evidence for " + OWNER + (TOKEN ? " (authenticated)" : " (anonymous)"));

  const repos = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(
      "/users/" + OWNER + "/repos?per_page=100&sort=pushed&page=" + page
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
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

  const evidence = await pool(publicOnly, CONCURRENCY, inspect);
  evidence.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));

  const payload = {
    collectedAt: new Date().toISOString(),
    owner: OWNER,
    apiCalls: calls,
    /** Always false for every entry; private work is never published here. */
    includesPrivate: false,
    repos: evidence,
  };

  mkdirSync(OUT, { recursive: true });
  const file = resolve(OUT, "evidence.json");
  writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");

  console.log(
    "  " + evidence.length + " inspected in " + calls + " API calls\n" +
      "  wrote " + file
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
