import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../src/tokens.css"), "utf8");
const DARK = ':root[data-theme="dark"]';

/** The hex tokens declared in one block of tokens.css. */
function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1]!, m[2]!]));
}

const light = tokens(css.slice(0, css.indexOf(DARK)));
const dark = tokens(css.slice(css.indexOf(DARK)));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const INKS = ["ink", "ink-soft", "ink-muted", "ink-faint"];
const PAPERS = ["paper", "paper-raised", "paper-sunken"];

describe("contrast maths", () => {
  it("matches the WCAG reference values", () => {
    expect(Math.round(contrast("#000000", "#ffffff"))).toBe(21);
    expect(contrast("#ffffff", "#ffffff")).toBe(1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("would have caught the old faint ink on the sunken paper", () => {
    expect(contrast("#756c5e", "#e6e0d0")).toBeLessThan(4.5);
  });
});

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme", (_name, theme) => {
  it("defines every ink and paper", () => {
    for (const name of [...INKS, ...PAPERS]) expect(theme[name], name).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("keeps every ink at 4.5:1 or better on every paper, so 10px labels stay readable", () => {
    for (const ink of INKS) {
      for (const paper of PAPERS) {
        const ratio = contrast(theme[ink]!, theme[paper]!);
        expect(ratio, `--${ink} ${theme[ink]} on --${paper} ${theme[paper]} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps the inverse ink readable on the inverse paper", () => {
    expect(contrast(theme["ink-inverse"]!, theme["paper-inverse"]!)).toBeGreaterThanOrEqual(4.5);
  });
});
