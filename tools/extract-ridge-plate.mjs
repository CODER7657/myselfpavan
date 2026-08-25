/**
 * Extracts the mountain plate from the supplied reference screenshot.
 *
 * The source is a full webpage footer capture, so this does three things:
 *   1. Crops away everything above the skyline — logo, wordmark, nav, copyright.
 *   2. Knocks the paper background out to transparency, using a luminance ramp
 *      whose ceiling sits just below the page's dashed layout guides so those
 *      vanish while the engraving's lightest hatching survives.
 *   3. Re-inks the result to a flat colour and upscales, so the plate can be
 *      tinted by CSS and dropped on either the light or the dark stock.
 *
 *   node tools/extract-ridge-plate.mjs [sourceImage]
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * sharp is deliberately not a workspace dependency: it is a native module this
 * script alone needs, and installing it on every deploy meant CI blocking its
 * post-install script. Install it ad hoc when regenerating the art.
 */
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error(
    "This script needs sharp, which is not a project dependency.
" +
      "Install it just for this run:

  npm i --no-save sharp
"
  );
  process.exit(1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../apps/web/public/art");

const SRC = resolve(process.argv[2] ?? resolve(HERE, "../assets/ridge-source.png"));

/** Everything above this row is page chrome, not artwork. */
const SKYLINE = 205;

/**
 * Paper sits around L=242 and the dashed guides around L=228, while the
 * faintest real hatching is L≈215. Cutting at 222 drops the guides cleanly.
 */
const PAPER_CEIL = 211;
const INK_FLOOR = 34;

/**
 * Two plates are emitted, one per stock.
 *
 * The dark variant is generated rather than produced with a CSS `invert()`
 * filter at runtime: filtering the light plate rasterises it into its own
 * compositing layer and visibly darkens the transparent sky against the page
 * behind it, which showed as a hard band under the hero copy.
 */
const INK_LIGHT = [20, 17, 14];
const INK_DARK = [236, 229, 214];

const SCALE = 3;

async function main() {
  if (!existsSync(SRC)) {
    console.error("No source image at " + SRC);
    process.exit(1);
  }

  const src = sharp(SRC);
  const meta = await src.metadata();

  const top = Math.min(SKYLINE, meta.height - 1);
  const height = meta.height - top;

  const { data, info } = await sharp(SRC)
    .extract({ left: 0, top, width: meta.width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = info.width * info.height;
  const out = Buffer.alloc(px * 4);
  const outDark = Buffer.alloc(px * 4);

  for (let i = 0; i < px; i++) {
    const o = i * info.channels;
    // Rec. 709 luma — the source is near-neutral, but this keeps any warm
    // paper cast from reading as tone.
    const lum =
      0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];

    let a = 0;
    if (lum < PAPER_CEIL) {
      a = (PAPER_CEIL - lum) / (PAPER_CEIL - INK_FLOOR);
      a = Math.min(1, Math.max(0, a));
      // Slight gamma so mid hatching keeps its weight after the knock-out.
      a = Math.pow(a, 0.82);
    }

    const q = i * 4;
    const alpha = Math.round(a * 255);

    out[q] = INK_LIGHT[0];
    out[q + 1] = INK_LIGHT[1];
    out[q + 2] = INK_LIGHT[2];
    out[q + 3] = alpha;

    outDark[q] = INK_DARK[0];
    outDark[q + 1] = INK_DARK[1];
    outDark[q + 2] = INK_DARK[2];
    outDark[q + 3] = alpha;
  }

  mkdirSync(OUT, { recursive: true });

  const upscale = (buf) =>
    sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize({
        width: info.width * SCALE,
        height: info.height * SCALE,
        kernel: "lanczos3",
      })
      .sharpen({ sigma: 0.7, m1: 0.4, m2: 0.9 });

  for (const [buf, name] of [
    [out, "ridge-plate"],
    [outDark, "ridge-plate-dark"],
  ]) {
    const plate = upscale(buf);
    await plate.clone().png({ compressionLevel: 9 }).toFile(resolve(OUT, name + ".png"));
    await plate
      .clone()
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(resolve(OUT, name + ".webp"));
  }

  const final = await sharp(resolve(OUT, "ridge-plate.png")).metadata();
  console.log(
    "ridge-plate + ridge-plate-dark  " + final.width + "x" + final.height +
    "  (cropped " + top + "px of page chrome, x" + SCALE + ")"
  );
}

main();
