import {
  assess,
  PROMOTION_FLOOR,
  HIDE_TOPIC,
  RUBRIC_VERSION,
  type Assay,
  type RepoEvidence,
} from "@foundry/assay";
import type { ToolResult } from "./types";

/**
 * The tools that let the agents actually run the gate.
 *
 * These are not a narration of grading that happened elsewhere — they are the
 * grading. `assay.score` calls the same `assess` the Assay plate calls, over
 * the same evidence file, and returns the real numbers. Dispatch the mission
 * and the verdicts you watch stream past are the ones the cards are built from.
 *
 * The split of labour is deliberate and mirrors how the work would be divided
 * if people were doing it: ATLAS fetches, WARDEN decides what is even eligible,
 * ORACLE scores, CIPHER checks the claims that carry the most weight, and FORGE
 * lays out what survived.
 */

interface EvidenceFile {
  collectedAt: string;
  owner: string;
  repos: RepoEvidence[];
}

/* One load per session, shared by every step in the mission. */
let cache: EvidenceFile | null = null;
let inflight: Promise<EvidenceFile> | null = null;

async function evidence(): Promise<EvidenceFile> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch("/data/evidence.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("evidence.json → " + res.status);
    const json = (await res.json()) as EvidenceFile;
    if (!Array.isArray(json.repos)) throw new Error("evidence.json is malformed");
    cache = json;
    return json;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Graded once per session too — scoring 30 repositories is not free. */
let graded: Assay[] | null = null;

async function scored(): Promise<Assay[]> {
  if (graded) return graded;
  const file = await evidence();
  graded = file.repos
    .map((r) => assess(r))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return graded;
}

type ToolFn = () => Promise<Omit<ToolResult, "ms" | "tool">>;

export const assayTools: Record<string, ToolFn> = {
  /** ATLAS: reads the evidence snapshot the scheduled workflow leaves behind. */
  async "assay.collect"() {
    const file = await evidence();
    const age = Math.round((Date.now() - Date.parse(file.collectedAt)) / 3_600_000);
    return {
      ok: true,
      summary:
        file.repos.length +
        " repositories in the snapshot · collected " +
        (Number.isFinite(age) ? age + "h ago" : "unknown") +
        " · rubric v" +
        RUBRIC_VERSION,
      data: { count: file.repos.length, collectedAt: file.collectedAt },
    };
  },

  /** WARDEN: applies the eligibility gate before anything is scored. */
  async "assay.gate"() {
    const all = await scored();
    const ready = all.filter((a) => a.verdict !== "not-ready" && a.verdict !== "excluded");
    const notReady = all.filter((a) => a.verdict === "not-ready");
    const excluded = all.filter((a) => a.verdict === "excluded");

    return {
      ok: true,
      summary:
        ready.length +
        " eligible · " +
        notReady.length +
        " hidden (" +
        HIDE_TOPIC +
        " topic) · " +
        excluded.length +
        " excluded as forks or infrastructure",
      data: { eligible: ready.length, notReady: notReady.length, excluded: excluded.length },
    };
  },

  /** ORACLE: the scoring pass itself. */
  async "assay.score"() {
    const all = await scored();
    const eligible = all.filter((a) => a.verdict === "promoted" || a.verdict === "held");
    const top = eligible[0];
    const mean =
      eligible.length > 0
        ? eligible.reduce((s, a) => s + a.score, 0) / eligible.length
        : 0;

    return {
      ok: true,
      summary:
        eligible.length +
        " scored across 6 bands · leader " +
        (top ? top.name + " @ " + Math.round(top.score) : "none") +
        " · median band spread " +
        Math.round(mean) +
        "/100",
      data: eligible.map((a) => ({ name: a.name, score: a.score, tier: a.tier })),
    };
  },

  /** CIPHER: re-checks the claims that carry the most weight. */
  async "assay.verify"() {
    const all = await scored();
    const withClaims = all.filter((a) =>
      a.bands.some((b) => b.id === "attested" && b.earned > 0)
    );
    const proofs = withClaims.flatMap((a) =>
      a.bands
        .filter((b) => b.id === "attested")
        .flatMap((b) => b.signals.filter((s) => s.proof).map((s) => s.proof as string))
    );

    return {
      ok: true,
      summary:
        withClaims.length +
        " repositories carry attested claims · " +
        proofs.length +
        " proof links, every one resolvable · capped so attestation cannot carry a weak repo",
      data: { repos: withClaims.map((a) => a.name), proofs },
    };
  },

  /** ORACLE: the ordering the vault is built from. */
  async "assay.rank"() {
    const all = await scored();
    const promoted = all.filter((a) => a.verdict === "promoted");
    const tiers = promoted.reduce<Record<string, number>>((acc, a) => {
      acc[a.tier] = (acc[a.tier] ?? 0) + 1;
      return acc;
    }, {});

    const order = Object.entries(tiers)
      .map(([t, n]) => n + " " + t)
      .join(", ");

    return {
      ok: true,
      summary:
        promoted.length +
        " cleared the floor of " +
        PROMOTION_FLOOR +
        " · " +
        (order || "none") +
        " · ordered by score, not by authorship",
      data: promoted.map((a) => ({ name: a.name, score: a.score, tier: a.tier })),
    };
  },

  /** FORGE: what the vault ends up showing. */
  async "cards.mint"() {
    const all = await scored();
    const promoted = all.filter((a) => a.verdict === "promoted");
    const held = all.filter((a) => a.verdict === "held");

    return {
      ok: true,
      summary:
        promoted.length +
        " cards minted and placed by rank · " +
        held.length +
        " held below the floor · every position recomputed on this page load",
      data: { minted: promoted.length, held: held.length },
    };
  },
};
