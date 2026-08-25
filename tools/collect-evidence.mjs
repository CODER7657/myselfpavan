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
  coverage: /(^|\/)(\.coveragerc|codecov\.ya?ml|jest\.config|vitest\.config)|coverage/i,
  linter: /(^|\/)(\.eslintrc|eslint\.config|ruff\.toml|\.flake8|\.prettierrc|tsconfig\.json|mypy\.ini)/i,
  docs: /^docs?\//i,
  manifest: /^(package\.json|pyproject\.toml|requirements\.txt|Cargo\.toml|go\.mod|build\.gradle(\.kts)?|pom\.xml|Gemfile)$/i,
  container: /^(Dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/i,
  workspace: /^(pnpm-workspace\.yaml|turbo\.json|lerna\.json|nx\.json)$/i,
};

function pathSignals(paths) {
  const any = (rx) => paths.some((p) => rx.test(p));
  return {
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
  const paths = entries.map((t) => t.path);

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

    ...pathSignals(paths),
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

  console.log("  " + repos.length + " repositories listed");

  const evidence = await pool(repos, CONCURRENCY, inspect);
  evidence.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));

  const payload = {
    collectedAt: new Date().toISOString(),
    owner: OWNER,
    apiCalls: calls,
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
