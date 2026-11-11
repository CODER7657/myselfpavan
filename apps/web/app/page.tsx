import dynamic from "next/dynamic";
import { Suspense, type ReactNode } from "react";
import { Boot } from "@/components/Boot";
import { ExternalLinks } from "@/components/ExternalLinks";
import { Hero } from "@/components/Hero";
import { Hud } from "@/components/Hud";
import { Konami } from "@/components/Konami";
import { Toasts } from "@/components/Toasts";

/*
 * Everything below the hero is a chunk of its own. The server still renders
 * each section into the page; only its script is split out, so the code for
 * the vault, the tree and the terminal is no longer parsed and run in the
 * same task as the hero.
 */
const Assay = dynamic(() => import("@/components/Assay").then((m) => m.Assay));
const Console = dynamic(() => import("@/components/Console").then((m) => m.Console));
const Dossier = dynamic(() => import("@/components/Dossier").then((m) => m.Dossier));
const Explainer = dynamic(() => import("@/components/Explainer").then((m) => m.Explainer));
const Log = dynamic(() => import("@/components/Log").then((m) => m.Log));
const Roster = dynamic(() => import("@/components/Roster").then((m) => m.Roster));
const Shell = dynamic(() => import("@/components/Shell").then((m) => m.Shell));
const Signal = dynamic(() => import("@/components/Signal").then((m) => m.Signal));
const Tree = dynamic(() => import("@/components/Tree").then((m) => m.Tree));
const Vault = dynamic(() => import("@/components/Vault").then((m) => m.Vault));

/**
 * Hydrates one section on its own.
 *
 * Without a boundary React hydrates the whole page in one task, and on a
 * throttled phone that single task ran for about half a second. Nothing here
 * suspends: the boundary only tells React that this section can be hydrated
 * separately, after the hero, in its own short task. The server still renders
 * every section, so nothing is missing before it hydrates.
 */
function Later({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export default function Page() {
  return (
    <>
      <Boot />
      <Konami />
      <ExternalLinks />
      <Hud />
      <main className="shell">
        <Hero />
        <Later>
          <Dossier />
        </Later>
        <Later>
          <Explainer />
        </Later>
        <Later>
          <Roster />
        </Later>
        <Later>
          <Console />
        </Later>
        <Later>
          <Vault />
        </Later>
        <Later>
          <Tree />
        </Later>
        <Later>
          <Log />
        </Later>
        <Later>
          <Assay />
        </Later>
        <Later>
          <Shell />
        </Later>
      </main>
      <Later>
        <Signal />
      </Later>
      <Toasts />
    </>
  );
}
