"use client";

import { useEffect, useMemo, useState } from "react";
import { assess, RUBRIC_VERSION, type Assay, type RepoEvidence } from "@foundry/assay";

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

  useEffect(() => {
    const ac = new AbortController();

    fetch("/data/evidence.json", { signal: ac.signal, cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error("evidence.json → " + r.status);
        return r.json();
      })
      .then((json: EvidenceFile) => {
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

    const all = file.repos
      .map((r) => assess(r))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

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
  }, [file, error]);
}
