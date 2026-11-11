"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

/**
 * Reads the previous standing, so a card can say how it got where it is.
 *
 * The file is optional by design. It is written by the assay workflow and does
 * not exist on a fresh clone, so every consumer treats "no standings yet" as
 * the normal case rather than an error — the vault simply shows no movement
 * until there are two runs to compare.
 */

export interface Standing {
  ranAt: string;
  scores: Record<string, number>;
}

export interface StandingsFile {
  rubricVersion: string;
  current: Standing;
  previous: Standing | null;
}

export interface StandingsState {
  /** Score at the previous assay, keyed by lowercased repository name. */
  previous: Map<string, number>;
  /** When that previous run collected its evidence. */
  previousAt: string | null;
}

const EMPTY: StandingsState = { previous: new Map(), previousAt: null };

export function useStandings(): StandingsState {
  const [file, setFile] = useState<StandingsFile | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    fetch("/data/standings.json", { signal: ac.signal, cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: StandingsFile | null) => {
        if (!ac.signal.aborted && json) startTransition(() => setFile(json));
      })
      /* Absent or malformed means "no comparison available", not a failure. */
      .catch(() => undefined);

    return () => ac.abort();
  }, []);

  return useMemo<StandingsState>(() => {
    const prev = file?.previous;
    if (!prev?.scores) return EMPTY;

    return {
      previous: new Map(
        Object.entries(prev.scores).map(([name, score]) => [name.toLowerCase(), score])
      ),
      previousAt: prev.ranAt ?? null,
    };
  }, [file]);
}
