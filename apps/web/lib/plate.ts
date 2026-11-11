/**
 * The ridge plate at the widths a screen actually needs.
 *
 * The full plate is 2556 pixels wide and about 1 MB. tools/resize-ridge-plates.mjs
 * writes 960 and 1600 pixel copies beside it, and the browser picks from this
 * list, so a phone downloads about a fifth of the bytes.
 */
export const PLATE_WIDTHS = [960, 1600] as const;
export const PLATE_FULL_WIDTH = 2556;

/** The plate always spans the viewport. */
export const PLATE_SIZES = "100vw";

export function plateSrcSet(src: string): string {
  const base = src.replace(/.webp$/, "");
  return [
    ...PLATE_WIDTHS.map((w) => base + "-" + w + ".webp " + w + "w"),
    src + " " + PLATE_FULL_WIDTH + "w",
  ].join(", ");
}
