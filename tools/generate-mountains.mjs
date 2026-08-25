/**
 * Procedural pen-and-ink engraving mountain generator.
 *
 * Produces a set of stackable SVG parallax layers in the style of a
 * 19th-century steel engraving: fractal ridgelines, fall-line hatching on the
 * shadowed faces, blank snowfields at the summits and a hatched conifer treeline.
 *
 * Everything is seeded, so the art is byte-identical on every machine.
 *   node tools/generate-mountains.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../apps/web/public/art");

/* ── deterministic randomness ─────────────────────────────────────────────── */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (x) => Math.round(x * 10) / 10;

/* ── ridgeline construction ───────────────────────────────────────────────── */

/**
 * Lay down alternating summit/col anchors across the full width, then roughen
 * the polyline with midpoint displacement so the rock reads as fractured rather
 * than as rolling hills.
 */
function buildRidge(rng, { width, baseY, peakCount, minH, maxH, roughness, subdivisions }) {
  const anchors = [];
  const step = width / peakCount;

  // Start before the left edge and end past the right edge so the silhouette
  // never shows a seam when the layer is translated for parallax.
  for (let i = -1; i <= peakCount + 1; i++) {
    const jitter = (rng() - 0.5) * step * 0.42;
    const x = i * step + jitter;
    const isSummit = i % 2 === 0;
    const h = isSummit ? minH + rng() * (maxH - minH) : minH * (0.12 + rng() * 0.3);
    anchors.push({ x, y: baseY - h });
  }

  // Midpoint displacement between every neighbouring pair.
  let pts = anchors;
  let amp = roughness;
  for (let pass = 0; pass < subdivisions; pass++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // Displace along the segment normal so steep faces stay steep.
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const d = (rng() - 0.5) * 2 * amp;
      next.push({ x: mx + nx * d * 0.55, y: my + ny * d });
      next.push(b);
    }
    pts = next;
    amp *= 0.54;
  }

  return pts.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function ridgeToPath(pts) {
  return pts.map((p, i) => (i === 0 ? "M" : "L") + n(p.x) + " " + n(p.y)).join("");
}

function silhouettePath(pts, floorY) {
  const first = pts[0];
  const last = pts[pts.length - 1];
  return (
    ridgeToPath(pts) +
    "L" + n(last.x) + " " + n(floorY) +
    "L" + n(first.x) + " " + n(floorY) + "Z"
  );
}

/* ── shading ──────────────────────────────────────────────────────────────── */

/** Local summit detection — used to keep snowfields blank near the tops. */
function summitMask(pts, radius) {
  const mask = new Array(pts.length).fill(false);
  for (let i = 0; i < pts.length; i++) {
    let isMax = true;
    for (let j = Math.max(0, i - radius); j < Math.min(pts.length, i + radius); j++) {
      if (pts[j].y < pts[i].y - 0.5) {
        isMax = false;
        break;
      }
    }
    if (isMax) {
      for (let j = Math.max(0, i - radius); j < Math.min(pts.length, i + radius); j++) mask[j] = true;
    }
  }
  return mask;
}

/**
 * Fall-line tone. A burin does not draw one long line down a face — it lays
 * many short parallel cuts, packed tight against the ridge and thinning as the
 * face recedes. So for every ridge sample we walk *down* the face dropping a
 * column of short strokes, whose probability decays with depth. Faces that fall
 * to the right are in shadow and take the weight; lit faces take a whisper.
 * Summits are skipped for a band so the snowfields stay as bare paper.
 */
function shadeFaces(rng, pts, { floorY, sampleStep, gap, len, angle, maxDepth, tone, snowBand }) {
  const snow = summitMask(pts, Math.max(4, Math.round(pts.length / 70)));
  const strokes = [];
  const sinA = Math.abs(Math.sin(angle));
  const cosA = Math.cos(angle);

  for (let i = 1; i < pts.length - 1; i += sampleStep) {
    const p = pts[i];
    const slope = pts[i + 1].y - pts[i - 1].y; // > 0 → the ground falls right
    const inShadow = slope > 0;
    const steep = Math.min(1, Math.abs(slope) / 5);

    const avail = Math.min(maxDepth, floorY - p.y);
    if (avail <= 4) continue;

    const start = snow[i] ? snowBand : 0;
    for (let d = start; d < avail; d += gap * (0.65 + rng() * 0.8)) {
      const t = d / avail;
      // Densest right under the ridge, fading down into the paper.
      const pr = (inShadow ? tone : tone * 0.16) * (1 - t * 0.72);
      if (rng() > pr) continue;

      const L = len * (0.45 + rng() * 0.95) * (0.45 + steep * 0.55);
      const th = angle + (rng() - 0.5) * 0.22;
      const x1 = p.x + (rng() - 0.5) * gap * 1.4;
      const y1 = p.y + d;
      const x2 = x1 + Math.cos(th) * L * (inShadow ? 1 : -1);
      const y2 = y1 + Math.abs(Math.sin(th)) * L;
      if (y2 > floorY) continue;
      strokes.push("M" + n(x1) + " " + n(y1) + "L" + n(x2) + " " + n(y2));
    }
    void sinA;
    void cosA;
  }
  return strokes.join("");
}

/**
 * Spurs: secondary ridgelines that peel off the summit line and run toward the
 * viewer. They are what stops a silhouette reading as a flat cut-out — each one
 * gets its own short hatched shadow on the downhill side.
 */
function spurs(rng, pts, { floorY, count, minLen, maxLen, len, angle }) {
  const lines = [];
  const shade = [];

  for (let k = 0; k < count; k++) {
    const i = 3 + Math.floor(rng() * (pts.length - 6));
    const p = pts[i];
    const total = minLen + rng() * (maxLen - minLen);
    if (p.y + total > floorY) continue;

    const drift = (rng() - 0.5) * 1.1;
    const segs = 3 + Math.floor(rng() * 4);
    const seg = total / segs;

    let x = p.x;
    let y = p.y;
    let d = "M" + n(x) + " " + n(y);
    for (let s = 0; s < segs; s++) {
      x += drift * seg * (0.6 + rng() * 0.8);
      y += seg * (0.75 + rng() * 0.5);
      d += "L" + n(x) + " " + n(y);

      // Hatch the shadowed flank of this spur.
      const cuts = 2 + Math.floor(rng() * 4);
      for (let c = 0; c < cuts; c++) {
        const f = rng();
        const hx = x - drift * seg * f;
        const hy = y - seg * f;
        const L = len * (0.4 + rng() * 0.8);
        const th = angle + (rng() - 0.5) * 0.2;
        shade.push(
          "M" + n(hx) + " " + n(hy) +
          "L" + n(hx + Math.cos(th) * L) + " " + n(hy + Math.abs(Math.sin(th)) * L)
        );
      }
    }
    lines.push(d);
  }
  return { lines: lines.join(""), shade: shade.join("") };
}

/* ── conifers ─────────────────────────────────────────────────────────────── */

function conifer(rng, x, baseY, h) {
  const w = h * (0.3 + rng() * 0.14);
  const tiers = 4 + Math.floor(rng() * 4);
  let d = "";
  for (let t = 0; t < tiers; t++) {
    const f = t / tiers;
    const ty = baseY - h + f * h * 0.92;
    const tw = w * (0.22 + f * 0.9);
    const drop = (h / tiers) * 1.5;
    // Each tier is a drooping bough drawn as a jagged chevron.
    d += "M" + n(x) + " " + n(ty) + "L" + n(x - tw) + " " + n(ty + drop) + "L" + n(x - tw * 0.45) + " " + n(ty + drop * 0.72);
    d += "M" + n(x) + " " + n(ty) + "L" + n(x + tw) + " " + n(ty + drop) + "L" + n(x + tw * 0.45) + " " + n(ty + drop * 0.72);
  }
  d += "M" + n(x) + " " + n(baseY - h) + "L" + n(x) + " " + n(baseY);
  return d;
}

function treeline(rng, { width, baseY, count, minH, maxH }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = -40 + rng() * (width + 80);
    const h = minH + rng() * (maxH - minH);
    out.push(conifer(rng, x, baseY + rng() * 14, h));
  }
  return out.join("");
}

/* ── layer assembly ───────────────────────────────────────────────────────── */

const W = 2400;
const H = 780;

function layer(name, seed, cfg) {
  const rng = mulberry32(seed);
  const pts = buildRidge(rng, { width: W, ...cfg.ridge });
  const floorY = H + 40;

  const body = [];
  body.push('<path d="' + silhouettePath(pts, floorY) + '" fill="var(--engrave-fill, #F4F1E8)" stroke="none"/>');

  // Broad tone first, so spur lines and the ridge sit crisply on top of it.
  body.push(
    '<path d="' + shadeFaces(rng, pts, { floorY, ...cfg.hatch }) +
    '" stroke="currentColor" stroke-width="' + cfg.hairline +
    '" fill="none" stroke-linecap="round" opacity="' + cfg.hatchOpacity + '"/>'
  );

  if (cfg.spurs) {
    const s = spurs(rng, pts, { floorY, len: cfg.hatch.len, angle: cfg.hatch.angle, ...cfg.spurs });
    body.push(
      '<path d="' + s.shade +
      '" stroke="currentColor" stroke-width="' + cfg.hairline +
      '" fill="none" stroke-linecap="round" opacity="' + n(cfg.hatchOpacity * 0.95) + '"/>'
    );
    body.push(
      '<path d="' + s.lines +
      '" stroke="currentColor" stroke-width="' + n(cfg.hairline * 1.25) +
      '" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="' + n(Math.min(1, cfg.hatchOpacity * 1.3)) + '"/>'
    );
  }

  body.push(
    '<path d="' + ridgeToPath(pts) +
    '" stroke="currentColor" stroke-width="' + cfg.ridgeWidth +
    '" fill="none" stroke-linejoin="round" stroke-linecap="round"/>'
  );
  if (cfg.trees) {
    body.push(
      '<path d="' + treeline(rng, { width: W, ...cfg.trees }) +
      '" stroke="currentColor" stroke-width="' + n(cfg.hairline * 1.1) +
      '" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>'
    );
  }

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H +
    '" width="' + W + '" height="' + H +
    '" fill="none" role="img" aria-label="Engraved mountain range, ' + name +
    ' layer" preserveAspectRatio="xMidYMax slice"><g color="#14110E">' +
    body.join("") +
    "</g></svg>";

  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "ridge-" + name + ".svg"), svg);
  return { layer: name, kb: Math.round(svg.length / 102.4) / 10, points: pts.length };
}

const LAYERS = [
  ["far", 20260825, {
    hairline: 0.45, ridgeWidth: 0.8, hatchOpacity: 0.34,
    ridge: { baseY: 700, peakCount: 12, minH: 130, maxH: 280, roughness: 44, subdivisions: 6 },
    hatch: { sampleStep: 3, gap: 4.4, len: 7, angle: 1.15, maxDepth: 90, tone: 0.5, snowBand: 22 },
    spurs: { count: 34, minLen: 26, maxLen: 70 },
  }],
  ["mid", 771337, {
    hairline: 0.55, ridgeWidth: 1.05, hatchOpacity: 0.5,
    ridge: { baseY: 748, peakCount: 8, minH: 240, maxH: 430, roughness: 66, subdivisions: 7 },
    hatch: { sampleStep: 2, gap: 4, len: 9, angle: 1.12, maxDepth: 150, tone: 0.62, snowBand: 30 },
    spurs: { count: 60, minLen: 40, maxLen: 120 },
  }],
  ["near", 4915263, {
    hairline: 0.66, ridgeWidth: 1.35, hatchOpacity: 0.6,
    ridge: { baseY: 800, peakCount: 6, minH: 320, maxH: 590, roughness: 92, subdivisions: 7 },
    hatch: { sampleStep: 2, gap: 3.6, len: 11, angle: 1.08, maxDepth: 215, tone: 0.72, snowBand: 40 },
    spurs: { count: 90, minLen: 55, maxLen: 170 },
    trees: { baseY: 778, count: 210, minH: 14, maxH: 46 },
  }],
  ["fore", 88231, {
    hairline: 0.8, ridgeWidth: 1.7, hatchOpacity: 0.72,
    ridge: { baseY: 900, peakCount: 4, minH: 180, maxH: 320, roughness: 74, subdivisions: 7 },
    hatch: { sampleStep: 2, gap: 3.4, len: 13, angle: 1.02, maxDepth: 230, tone: 0.78, snowBand: 26 },
    spurs: { count: 70, minLen: 50, maxLen: 150 },
    trees: { baseY: 730, count: 140, minH: 26, maxH: 84 },
  }],
];

const report = LAYERS.map(([name, seed, cfg]) => layer(name, seed, cfg));
console.table(report);
console.log("\nWrote " + report.length + " engraving layers to " + OUT);
