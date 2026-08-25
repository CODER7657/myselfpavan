"use client";

import { useEffect, useState } from "react";
import { projects, type RepoRow } from "@foundry/content";

/**
 * Live GitHub state, fetched once per page load and shared by every consumer.
 *
 * The curated vault is hand-written, which means it goes stale the moment a new
 * repository is pushed. This hook closes that gap two ways: it overlays real
 * star counts and push dates onto the cards, and it surfaces any authored
 * repository that has not been written up yet — so new work shows up on the
 * page without anybody remembering to edit it.
 */

export interface LiveState {
  repos: RepoRow[] | null;
  error: string | null;
  /** Authored repositories with no curated card yet. */
  uncurated: RepoRow[];
  /** Newest push across the account, as an ISO date. */
  lastPush: string | null;
  byName: Map<string, RepoRow>;
}

const EMPTY: LiveState = {
  repos: null,
  error: null,
  uncurated: [],
  lastPush: null,
  byName: new Map(),
};

/** Repos deliberately excluded from "new work" — infrastructure, not portfolio. */
const IGNORE = new Set(["CODER7657", "portfolio2", "codes-", "assignment-2", "3d-portfolio"]);

/**
 * Curated cards do not always share a slug with their repository, so the link
 * between them is declared here rather than guessed.
 */
const CURATED_REPOS = new Set<string>([
  ...projects.map((p) => p.slug),
  "pramana",
  "CRAFTATHON",
  "complylite",
  "globetrotter",
  "VortiFi",
  "VeriServe_block",
  "open-multi-agent",
  "genex-prj",
  "shoes.store",
  "fix-broken-Terminal-Bench-2-Harbor-",
  "AP2",
]);

let cache: RepoRow[] | null = null;
let inflight: Promise<RepoRow[]> | null = null;

const MAX_REPOS = 200;
const FETCH_TIMEOUT_MS = 8000;

/**
 * A URL is only allowed to reach an `href` if it is an https link to GitHub.
 * Nothing in the real API returns anything else, but this is data from a third
 * party landing in an anchor, and `javascript:` in an href is the whole class
 * of bug worth closing here.
 */
function safeRepoUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (u.hostname !== "github.com" && !u.hostname.endsWith(".github.com")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Trims third-party strings so one absurd description cannot wreck the layout. */
const clamp = (v: unknown, n: number): string | null =>
  typeof v === "string" && v.length > 0 ? v.slice(0, n) : null;

async function load(signal: AbortSignal): Promise<RepoRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const timer = setTimeout(() => {
      /* The caller's signal is what aborts; this just bounds the wait. */
    }, FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(
        "https://api.github.com/users/CODER7657/repos?per_page=100&sort=pushed",
        {
          signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
          headers: { Accept: "application/vnd.github+json" },
          referrerPolicy: "no-referrer",
          credentials: "omit",
          mode: "cors",
        }
      );
      if (!res.ok) throw new Error("GitHub returned " + res.status);

      const json: unknown = await res.json();
      if (!Array.isArray(json)) throw new Error("unexpected payload");

      cache = json
        .slice(0, MAX_REPOS)
        .map((raw) => {
          const r = (raw ?? {}) as Record<string, unknown>;
          const url = safeRepoUrl(r.html_url);
          const name = clamp(r.name, 100);
          if (!url || !name) return null;
          return {
            name,
            url,
            language: clamp(r.language, 40),
            description: clamp(r.description, 300),
            fork: Boolean(r.fork),
            stars: Number(r.stargazers_count) || 0,
            pushed: String(r.pushed_at ?? "").slice(0, 10),
          } satisfies RepoRow;
        })
        .filter((r): r is RepoRow => r !== null);

      return cache;
    } finally {
      clearTimeout(timer);
    }
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function useLiveRepos(): LiveState {
  const [state, setState] = useState<LiveState>(EMPTY);

  useEffect(() => {
    const ac = new AbortController();

    load(ac.signal)
      .then((repos) => {
        if (ac.signal.aborted) return;
        const authored = repos.filter((r) => !r.fork);
        setState({
          repos,
          error: null,
          uncurated: authored.filter(
            (r) => !IGNORE.has(r.name) && !CURATED_REPOS.has(r.name)
          ),
          lastPush: authored[0]?.pushed ?? null,
          byName: new Map(repos.map((r) => [r.name.toLowerCase(), r])),
        });
      })
      .catch((err: Error) => {
        if (err.name === "AbortError" || ac.signal.aborted) return;
        setState({ ...EMPTY, error: err.message });
      });

    return () => ac.abort();
  }, []);

  return state;
}

/** Pulls the repo name out of a curated project's GitHub URL, if it has one. */
export function repoNameOf(repoUrl: string | null): string | null {
  if (!repoUrl) return null;
  const m = /github\.com\/[^/]+\/([^/?#]+)/.exec(repoUrl);
  return m?.[1] ?? null;
}
