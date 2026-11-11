import { Suspense, type ReactNode } from "react";
import { Assay } from "@/components/Assay";
import { Boot } from "@/components/Boot";
import { Console } from "@/components/Console";
import { Dossier } from "@/components/Dossier";
import { Explainer } from "@/components/Explainer";
import { ExternalLinks } from "@/components/ExternalLinks";
import { Hero } from "@/components/Hero";
import { Hud } from "@/components/Hud";
import { Konami } from "@/components/Konami";
import { Log } from "@/components/Log";
import { Roster } from "@/components/Roster";
import { Shell } from "@/components/Shell";
import { Signal } from "@/components/Signal";
import { Toasts } from "@/components/Toasts";
import { Tree } from "@/components/Tree";
import { Vault } from "@/components/Vault";

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
