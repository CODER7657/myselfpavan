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

export default function Page() {
  return (
    <>
      <Boot />
      <Konami />
      <ExternalLinks />
      <Hud />
      <main className="shell">
        <Hero />
        <Dossier />
        <Explainer />
        <Roster />
        <Console />
        <Vault />
        <Tree />
        <Log />
        <Assay />
        <Shell />
      </main>
      <Signal />
      <Toasts />
    </>
  );
}
