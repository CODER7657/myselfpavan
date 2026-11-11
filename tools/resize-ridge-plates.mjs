/**
 * Writes the smaller copies of the ridge plates that phones and laptops load.
 *
 *   node tools/resize-ridge-plates.mjs
 *
 * The plates are 2556 pixels wide and about 1 MB each. A phone paints them
 * about 700 pixels wide, so serving the full plate made the largest paint on
 * mobile take over seven seconds in Lighthouse. The pages list these copies in
 * `srcset` and the browser picks the smallest one that is sharp enough.
 *
 * Run it after `tools/extract-ridge-plate.mjs` whenever the plates change.
 */
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = resolve(HERE, "../apps/web/public/art");

/* As in extract-ridge-plate.mjs: sharp is not a workspace dependency. */
const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  try {
    /* pnpm keeps the copy Next.js installs here. */
    sharp = require(resolve(HERE, "../node_modules/.pnpm/node_modules/sharp"));
  } catch {
    console.error("This script needs sharp. Install it just for this run:  npm i --no-save sharp");
    process.exit(1);
  }
}

export const WIDTHS = [768, 960, 1600];
export const PLATES = ["ridge-plate", "ridge-plate-dark"];

for (const plate of PLATES) {
  for (const width of WIDTHS) {
    const out = resolve(ART, plate + "-" + width + ".webp");
    await sharp(resolve(ART, plate + ".webp"))
      .resize({ width })
      .webp({ quality: 78, alphaQuality: 85, effort: 6 })
      .toFile(out);
    console.log(plate + "-" + width + ".webp  " + Math.round(statSync(out).size / 1024) + " KB");
  }
}
