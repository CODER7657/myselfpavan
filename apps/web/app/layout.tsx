import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Pixelify_Sans, Silkscreen } from "next/font/google";
import { profile } from "@foundry/content";
import "./globals.css";

const pixel = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixel-loaded",
  display: "swap",
});

const micro = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-micro-loaded",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-mono-loaded",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(profile.site),
  title: {
    default: "PAVAN//FOUNDRY — " + profile.title,
    template: "%s · PAVAN//FOUNDRY",
  },
  description: profile.pitch,
  authors: [{ name: profile.name, url: profile.github }],
  keywords: [
    "Pavan Patel",
    "agent systems",
    "verification",
    "AP2",
    "policy-as-code",
    "cryptography",
    "blockchain",
    "portfolio",
  ],
  openGraph: {
    type: "website",
    title: "PAVAN//FOUNDRY",
    description: profile.pitch,
    siteName: "PAVAN//FOUNDRY",
  },
  twitter: { card: "summary_large_image", title: "PAVAN//FOUNDRY", description: profile.pitch },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#100e0c" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Applied before paint so a returning operator never sees the light stock flash
 * before their stored preference lands.
 *
 * The value out of localStorage is checked against the two themes that exist
 * rather than written through — storage is attacker-writable in any scenario
 * where it matters, and this is the one place its contents reach the DOM.
 */
const THEME_BOOTSTRAP = `(function(){try{
var t=null;
var s=localStorage.getItem("foundry.operator.v1");
if(s){var v=JSON.parse(s);t=v&&v.state&&v.state.theme;}
if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}
document.documentElement.dataset.theme=t;
}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Minted per request by middleware; pairs with the strict-dynamic script policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={[pixel.variable, micro.variable, mono.variable, serif.variable].join(" ")}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <style nonce={nonce}>{`:root{
          --font-pixel:var(--font-pixel-loaded),ui-monospace,monospace;
          --font-micro:var(--font-micro-loaded),ui-monospace,monospace;
          --font-mono:var(--font-mono-loaded),ui-monospace,monospace;
          --font-serif:var(--font-serif-loaded),Georgia,serif;
        }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
