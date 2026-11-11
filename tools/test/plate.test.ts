import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PLATE_FULL_WIDTH, PLATE_WIDTHS, plateSrcSet } from "../../apps/web/lib/plate";

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/web/public");
const PLATES = ["/art/ridge-plate.webp", "/art/ridge-plate-dark.webp"];

const entries = (src: string) =>
  plateSrcSet(src).split(", ").map((e) => {
    const [url, width] = e.split(" ");
    return { url: url!, width: Number(width!.replace("w", "")) };
  });

describe("plateSrcSet", () => {
  it("lists the smaller copies first and the full plate last", () => {
    expect(plateSrcSet("/art/ridge-plate.webp")).toBe(
      "/art/ridge-plate-960.webp 960w, /art/ridge-plate-1600.webp 1600w, /art/ridge-plate.webp 2556w"
    );
  });

  it("gives widths in rising order, ending at the full width", () => {
    for (const plate of PLATES) {
      const widths = entries(plate).map((e) => e.width);
      expect(widths).toEqual([...PLATE_WIDTHS, PLATE_FULL_WIDTH]);
      expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    }
  });

  it("names only files that exist, each smaller than the one after it", () => {
    for (const plate of PLATES) {
      const sizes = entries(plate).map((e) => {
        const file = resolve(PUBLIC, "." + e.url);
        expect(existsSync(file), e.url).toBe(true);
        return statSync(file).size;
      });
      expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    }
  });

  it("keeps the phone copy under 300 KB", () => {
    for (const plate of PLATES) {
      const file = resolve(PUBLIC, "." + entries(plate)[0]!.url);
      expect(statSync(file).size).toBeLessThan(300 * 1024);
    }
  });

  it("only rewrites the .webp ending", () => {
    expect(plateSrcSet("/art/a.webp.b.webp").startsWith("/art/a.webp.b-960.webp 960w")).toBe(true);
  });
});
