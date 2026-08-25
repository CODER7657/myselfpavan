"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { achievements, agents, missions, type AgentId } from "@foundry/content";

/**
 * Operator progression.
 *
 * Everything the visitor earns lives here and is mirrored to localStorage, so
 * a returning recruiter keeps their roster instead of starting the boot
 * sequence again. Achievements are derived inside the actions rather than by a
 * watcher, so awarding one can never double-fire.
 */

/** Cumulative XP required to reach each level. Index 0 is level 1. */
export const LEVEL_THRESHOLDS = [0, 150, 400, 800, 1400, 2200, 3200, 4500, 6200];

export function levelFor(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= (LEVEL_THRESHOLDS[i] as number)) level = i + 1;
  }
  return level;
}

export function levelProgress(xp: number): { level: number; into: number; span: number; pct: number } {
  const level = levelFor(xp);
  const floor = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const ceil = LEVEL_THRESHOLDS[level] ?? floor + 2000;
  const into = xp - floor;
  const span = Math.max(1, ceil - floor);
  return { level, into, span, pct: Math.min(100, (into / span) * 100) };
}

export interface Toast {
  id: string;
  kind: "achievement" | "xp" | "unlock";
  title: string;
  detail: string;
  xp?: number;
}

interface FoundryState {
  booted: boolean;
  xp: number;
  recruited: AgentId[];
  completed: string[];
  inspected: string[];
  earned: string[];
  terminalUsed: boolean;
  logRead: boolean;
  theme: "light" | "dark";
  toasts: Toast[];

  boot: () => void;
  reset: () => void;
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  /** Adopts the theme the pre-paint script resolved, without side effects. */
  syncTheme: (t: "light" | "dark") => void;

  award: (xp: number) => void;
  recruit: (id: AgentId) => void;
  completeMission: (id: string) => void;
  inspectCard: (slug: string, rarity: string) => void;
  markTerminalUsed: () => void;
  markLogRead: () => void;
  unlock: (id: string) => void;

  dismissToast: (id: string) => void;
}

let toastSeq = 0;
const nextToastId = () => "t" + ++toastSeq;

export const useFoundry = create<FoundryState>()(
  persist(
    (set, get) => {
      /** Grants an achievement once, with its XP and a toast. Never re-fires. */
      const grant = (id: string) => {
        const st = get();
        if (st.earned.includes(id)) return;
        const a = achievements.find((x) => x.id === id);
        if (!a) return;
        set({
          earned: [...st.earned, id],
          xp: st.xp + a.xp,
          toasts: [
            ...st.toasts,
            { id: nextToastId(), kind: "achievement", title: a.name, detail: a.hint, xp: a.xp },
          ],
        });
      };

      return {
        booted: false,
        xp: 0,
        recruited: [],
        completed: [],
        inspected: [],
        earned: [],
        terminalUsed: false,
        logRead: false,
        theme: "light",
        toasts: [],

        boot: () => set({ booted: true }),

        reset: () =>
          set({
            booted: true,
            xp: 0,
            recruited: [],
            completed: [],
            inspected: [],
            earned: [],
            terminalUsed: false,
            logRead: false,
            toasts: [],
          }),

        setTheme: (theme) => {
          set({ theme });
          if (typeof document !== "undefined") {
            document.documentElement.dataset.theme = theme;
          }
          if (theme === "dark") grant("theme");
        },

        toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

        /*
         * The inline script in <head> resolves a theme before React exists —
         * from storage if present, otherwise from the OS. When it falls back to
         * the OS, the persisted store still holds its default and the two
         * disagree, which leaves the toggle showing the wrong icon and moving
         * the wrong way on first click. This adopts what actually got painted.
         */
        syncTheme: (theme) => {
          if (get().theme === theme) return;
          set({ theme });
        },

        award: (xp) => set({ xp: get().xp + xp }),

        recruit: (id) => {
          const st = get();
          if (st.recruited.includes(id)) return;
          const agent = agents.find((a) => a.id === id);
          const next = [...st.recruited, id];
          set({
            recruited: next,
            xp: st.xp + 60,
            toasts: [
              ...st.toasts,
              {
                id: nextToastId(),
                kind: "unlock",
                title: (agent?.callsign ?? id) + " RECRUITED",
                detail: agent?.discipline ?? "",
                xp: 60,
              },
            ],
          });
          grant("first-contact");
          if (next.length >= agents.length) grant("full-roster");
        },

        completeMission: (id) => {
          const st = get();
          if (st.completed.includes(id)) return;
          const m = missions.find((x) => x.id === id);
          const next = [...st.completed, id];
          set({
            completed: next,
            xp: st.xp + (m?.xp ?? 100),
            toasts: [
              ...st.toasts,
              {
                id: nextToastId(),
                kind: "unlock",
                title: (m?.code ?? id) + " COMPLETE",
                detail: m?.reveals ?? "",
                xp: m?.xp ?? 100,
              },
            ],
          });
          grant("first-run");
          if (next.length >= missions.length) grant("all-missions");
        },

        inspectCard: (slug, rarity) => {
          const st = get();
          if (st.inspected.includes(slug)) return;
          const next = [...st.inspected, slug];
          set({ inspected: next, xp: st.xp + 15 });
          if (rarity === "mythic") grant("mythic");
          if (next.length >= 4) grant("collector");
        },

        markTerminalUsed: () => {
          if (get().terminalUsed) return;
          set({ terminalUsed: true });
          grant("terminal");
        },

        markLogRead: () => {
          if (get().logRead) return;
          set({ logRead: true });
          grant("deep-reader");
        },

        unlock: (id) => grant(id),

        dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
      };
    },
    {
      name: "foundry.operator.v1",
      partialize: (s) => ({
        booted: s.booted,
        xp: s.xp,
        recruited: s.recruited,
        completed: s.completed,
        inspected: s.inspected,
        earned: s.earned,
        terminalUsed: s.terminalUsed,
        logRead: s.logRead,
        theme: s.theme,
      }),
    }
  )
);

/* Exposed in development only, so the boot sequence and progression states can
   be driven from the browser console without clearing storage by hand. */
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).useFoundry = useFoundry;
}

/** Agents whose clearance the operator's current level satisfies. */
export function isUnlockable(clearance: number, xp: number): boolean {
  return levelFor(xp) >= clearance;
}
