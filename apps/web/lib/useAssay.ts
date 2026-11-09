"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assess,
  RUBRIC_VERSION,
  withSealed,
  type Assay,
  type RepoEvidence,
  type SealedRecord,
} from "@foundry/assay";

/**
 * Reads the evidence snapshot and grades it in the browser.
 *
 * The split matters. Gathering evidence costs ~150 GitHub API calls, which
 * would exhaust an anonymous visitor's rate limit immediately — so a scheduled
 * workflow does that once a day and commits the result. Scoring, by contrast,
 * is pure arithmetic over that snapshot, so it runs here against the same
 * rubric module the repository documents. One definition of the rules, applied
 * identically wherever anyone checks them.
 *
 * The practical effect: improve a repository, and its rank moves on the next
 * refresh without anyone editing this site.
 */

export interface EvidenceFile {
  collectedAt: string;
  owner: string;
  apiCalls: number;
  repos: RepoEvidence[];
}

export interface AssayState {
  status: "loading" | "ready" | "error";
  error: string | null;
  collectedAt: string | null;
  rubricVersion: string;
  /** Graded and sorted, highest first. */
  all: Assay[];
  promoted: Assay[];
  held: Assay[];
  notReady: Assay[];
  excluded: Assay[];
  byName: Map<string, Assay>;
}

/** Long enough for a cold CDN, short enough that nobody watches a dead page. */
const FETCH_TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 750;

const EMPTY: AssayState = {
  status: "loading",
  error: null,
  collectedAt: null,
  rubricVersion: RUBRIC_VERSION,
  all: [],
  promoted: [],
  held: [],
  notReady: [],
  excluded: [],
  byName: new Map(),
};

export function useAssay(): AssayState {
  const [file, setFile] = useState<EvidenceFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* Private grades. Optional: absent or unreadable just means none. */
  const [sealed, setSealed] = useState<SealedRecord[]>([]);

  useEffect(() => {
    const ac = new AbortController();

    /*
     * Bounded and retried once.
     *
     * There was no timeout here at all, so a request that never resolved left
     * the vault ungraded for the life of the page — and an ungraded vault used
     * to report every project as unreachable. A single retry covers the case
     * this actually fails in practice: a CDN miss on a deploy that has only
     * just gone out.
     */
    const load = async (): Promise<EvidenceFile> => {
      let last: Error | null = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await fetch("/data/evidence.json", {
            signal: AbortSignal.any([ac.signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
            cache: "no-cache",
          });
          if (!res.ok) throw new Error("evidence.json → " + res.status);
          return (await res.json()) as EvidenceFile;
        } catch (e) {
          last = e as Error;
          if (ac.signal.aborted) throw last;
          if (attempt < 2) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }

      throw last ?? new Error("evidence.json could not be read");
    };

    /*
     * Private work arrives separately, and failing to read it never holds up
     * the public grading — it simply means no private cards this load.
     */
    fetch("/data/sealed.json", { signal: ac.signal, cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { records?: SealedRecord[] } | null) => {
        if (!ac.signal.aborted && Array.isArray(json?.records)) setSealed(json.records);
      })
      .catch(() => undefined);

    load()
      .then((json) => {
        if (!ac.signal.aborted) setFile(json);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError" || ac.signal.aborted) return;
        setError(e.message);
      });

    return () => ac.abort();
  }, []);

  return useMemo<AssayState>(() => {
    if (error) return { ...EMPTY, status: "error", error };
    if (!file) return EMPTY;

    const all = withSealed(
      // Archived repositories are retired work; the board lists only live repos.
      file.repos.filter((r) => !r.isArchived).map((r) => assess(r)),
      sealed
    ).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    return {
      status: "ready",
      error: null,
      collectedAt: file.collectedAt,
      rubricVersion: RUBRIC_VERSION,
      all,
      promoted: all.filter((a) => a.verdict === "promoted"),
      held: all.filter((a) => a.verdict === "held"),
      notReady: all.filter((a) => a.verdict === "not-ready"),
      excluded: all.filter((a) => a.verdict === "excluded"),
      byName: new Map(all.map((a) => [a.name.toLowerCase(), a])),
    };
  }, [file, error, sealed]);
}
