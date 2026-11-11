"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

/**
 * Reads the prose written for cards nobody wrote by hand.
 *
 * The vault can always build a card out of evidence alone, and it reads like a
 * filled-in form. When the assay workflow has a Groq key it asks a model to
 * write the same five fields properly, from the same evidence, and commits the
 * result here.
 *
 * Everything about this is optional. The file does not exist until the first
 * card is written, a missing or malformed one is treated as "no prose yet", and
 * the template is what the visitor sees instead. Nothing on the page depends on
 * a model having been available.
 */

export interface WrittenCard {
  repo: string;
  classification: string;
  tagline: string;
  plain: string;
  summary: string;
  highlight: string;
  /** Which model wrote it, stated on the card itself. */
  model: string;
  writtenAt: string;
  scoreAtWriting: number;
  evidenceKey: string;
}

interface CardsFile {
  model: string;
  cards: Record<string, WrittenCard>;
}

/** Keyed by lowercased repository name. */
export type CardsState = Map<string, WrittenCard>;

const EMPTY: CardsState = new Map();

/** Nothing here is trusted: the file is committed by a workflow a model fed. */
function usable(c: unknown): c is WrittenCard {
  const x = c as WrittenCard;
  return (
    !!x &&
    typeof x.classification === "string" &&
    typeof x.tagline === "string" &&
    typeof x.plain === "string" &&
    typeof x.summary === "string" &&
    typeof x.highlight === "string" &&
    typeof x.model === "string"
  );
}

export function useCards(): CardsState {
  const [file, setFile] = useState<CardsFile | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    fetch("/data/cards.json", { signal: ac.signal, cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: CardsFile | null) => {
        if (!ac.signal.aborted && json) startTransition(() => setFile(json));
      })
      /* Absent means no card has been written yet, which is the normal case. */
      .catch(() => undefined);

    return () => ac.abort();
  }, []);

  return useMemo<CardsState>(() => {
    if (!file?.cards) return EMPTY;

    return new Map(
      Object.entries(file.cards)
        .filter(([, c]) => usable(c))
        .map(([repo, c]) => [repo.toLowerCase(), c])
    );
  }, [file]);
}
