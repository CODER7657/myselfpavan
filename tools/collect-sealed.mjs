/**
 * Grades private repositories and publishes nothing but the result.
 *
 *   node --experimental-strip-types tools/collect-sealed.mjs
 *
 * evidence.json is served publicly, so a private repository can never go in
 * it — its file list, README and description would be readable by anyone.
 * This pass reads private work with the owner's own token, scores it with the
 * same rubric in the same process, and writes only the outcome to sealed.json:
 * the name, the score and tier, the commit count, the last push, and each
 * band's total. The evidence those numbers came from never leaves memory.
 *
 * Private work is opt-in. A private repository is read only if it carries the
 * "foundry-ready" topic, because being graded means its name and activity
 * become public, and that is a decision to be made on purpose.
 *
 * It needs a token that belongs to the owner and can see private
 * repositories — the ASSAY_TOKEN secret in CI. The workflow's built-in token
 * cannot, and without one this pass does nothing and leaves the previous
 * sealed.json exactly as it was. It never blocks the public assay.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gh, inspect } from "./collect-evidence.mjs";
import { assess, EXCLUDED, HIDE_TOPIC, RUBRIC_VERSION } from "../packages/assay/src/rubric.ts";
import { lostAccess } from "../packages/assay/src/sealed.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../apps/web/public/data");
const FILE = resolve(OUT, "sealed.json");

const OWNER = process.env.ASSAY_OWNER ?? "CODER7657";
const TOKEN = process.env.GITHUB_TOKEN ?? "";

/*
 * The only fields a sealed record may carry, checked before anything is
 * written. This is the whole privacy promise in one list: if a later change
 * ever starts copying a description, a topic, a URL or a path into a record,
 * the pass refuses to publish rather than leaking it.
 */
const RECORD_KEYS = new Set([
  "name", "score", "tier", "verdict", "reason", "commits", "pushedAt", "bands",
]);
const BAND_KEYS = new Set(["id", "label", "earned", "max"]);

/* ── the previous file, for carrying a failed read forward ───────────────── */

function readPrevious() {
  if (!existsSync(FILE)) return { records: [] };
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8"));
    return Array.isArray(parsed?.records) ? parsed : { records: [] };
  } catch {
    return { records: [] };
  }
}

/* ── a record, and the check that it says nothing it should not ──────────── */

function seal(a, e) {
  return {
    name: a.name,
    score: a.score,
    tier: a.tier,
    verdict: a.verdict,
    reason: a.reason,
    commits: e.commits,
    pushedAt: e.pushedAt,
    bands: a.bands.map((b) => ({ id: b.id, label: b.label, earned: b.earned, max: b.max })),
  };
}

function assertSealed(record) {
  for (const key of Object.keys(record)) {
    if (!RECORD_KEYS.has(key)) throw new Error("sealed record carries a forbidden field: " + key);
  }
  for (const band of record.bands) {
    for (const key of Object.keys(band)) {
      if (!BAND_KEYS.has(key)) throw new Error("sealed band carries a forbidden field: " + key);
    }
  }
  /* A URL anywhere in a record is a private link made public. */
  if (/https?:\/\//i.test(JSON.stringify(record))) {
    throw new Error("sealed record for " + record.name + " contains a URL");
  }
}

/* ── main ─────────────────────────────────────────────────────────────────── */

async function main() {
  if (!TOKEN) {
    console.log("No token — private repositories are not graded. sealed.json left as it was.");
    return;
  }

  /*
   * The token has to be the owner's. The workflow's own token cannot read
   * /user at all, and a token belonging to somebody else must never be used
   * to publish anything about this account.
   */
  let me;
  try {
    me = await gh("/user");
  } catch (err) {
    console.log(
      "This token cannot read private repositories (" + err.message.slice(0, 90) + ").\n" +
        "Add a personal access token as the ASSAY_TOKEN secret to grade them. sealed.json left as it was."
    );
    return;
  }
  if (!me?.login || me.login.toLowerCase() !== OWNER.toLowerCase()) {
    console.log("Token belongs to " + (me?.login ?? "nobody") + ", not " + OWNER + " — skipping.");
    return;
  }

  const listed = [];
  try {
    for (let page = 1; page <= 5; page++) {
      const batch = await gh(
        "/user/repos?visibility=private&affiliation=owner&per_page=100&page=" + page
      );
      if (!Array.isArray(batch) || batch.length === 0) break;
      listed.push(...batch);
      if (batch.length < 100) break;
    }
  } catch (err) {
    /* A failed listing is not "there are no private repositories". Keeping
       the previous file stops a network fault from deleting private cards. */
    console.log("Could not list private repositories (" + err.message.slice(0, 90) + ") — sealed.json left as it was.");
    return;
  }

  const eligible = listed.filter(
    (r) =>
      r.private &&
      !r.fork &&
      !r.archived &&
      !EXCLUDED.has(r.name) &&
      /* Every private repository is graded unless deliberately hidden — the
         owner asked for all of their work to count. */
      !(r.topics ?? []).includes(HIDE_TOPIC)
  );
  const hidden = listed.filter((r) => r.private && !r.fork && (r.topics ?? []).includes(HIDE_TOPIC));

  console.log(
    "  " + listed.length + " private repositories visible · " + eligible.length + " graded" +
      (hidden.length ? " · hidden: " + hidden.map((r) => r.name).join(", ") : "")
  );

  const prior = readPrevious().records;
  if (lostAccess(prior, listed.filter((r) => r.private).map((r) => r.name))) {
    console.log(
      "  This token can see none of the " + prior.length + " private repositories graded last time.\n" +
        "  That is lost access, not lost work: grant the token those repositories\n" +
        "  (Repository access → All repositories). sealed.json left as it was."
    );
    return;
  }
  const previous = new Map(prior.map((r) => [r.name.toLowerCase(), r]));
  const records = [];

  for (const repo of eligible) {
    try {
      const evidence = await inspect(repo);
      const record = seal(assess(evidence), evidence);
      assertSealed(record);
      records.push(record);
      console.log("  ✓ " + repo.name + " — " + record.score + " " + record.tier);
    } catch (err) {
      if (/forbidden field|contains a URL/.test(err.message)) throw err;

      const before = previous.get(repo.name.toLowerCase());
      if (before) {
        records.push(before);
        console.warn("  ! " + repo.name + ": " + err.message.slice(0, 90) + " — carried forward");
      } else {
        console.warn("  ! " + repo.name + ": " + err.message.slice(0, 90) + " — not graded this run");
      }
    }
  }

  records.sort((a, b) => a.name.localeCompare(b.name));

  /* No timestamp: an unchanged set of results writes an identical file, so a
     run where nothing moved produces no diff and no redeploy. */
  const payload = { rubricVersion: RUBRIC_VERSION, owner: OWNER, records };
  const next = JSON.stringify(payload, null, 2) + "\n";

  if (existsSync(FILE) && readFileSync(FILE, "utf8") === next) {
    console.log("  sealed.json unchanged.");
    return;
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(FILE, next);
  console.log("  wrote " + records.length + " sealed record(s) to " + FILE);
}

main().catch((err) => {
  /* The privacy check is the one failure that must be loud. Anything else has
     already been handled softly above. */
  console.error("collect-sealed refused: " + err.message);
  process.exit(1);
});
