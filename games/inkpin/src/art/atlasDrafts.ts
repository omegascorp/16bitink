import { acrossPage, perWidth, type MapRegion } from '../scenes/map/layout';
import { createRng } from '../logic/rng';
import { Layer, type Plan, regionSpan, regionWeight } from './atlasPlace';
import { glow } from './atlasWash';
import { ellipse, Pen, type Pt } from './pen';

/**
 * The ruins of the chapters still being drawn, in pencil: an outline and a
 * little hatching each, by chapter index (1 = the Volcano Shrine … 4 = the
 * Dragon's Hoard). Each is about 260 × 170 px, its base at `at.y + 60`.
 */

const LEAD = '#8a8578';

type Draw = (pen: Pen, x: number, y: number) => void;

const line = (pen: Pen, pts: readonly Pt[], w = 1.3, a = 0.75): void => pen.hair(pts, w, LEAD, a);
const shade = (pen: Pen, shape: readonly Pt[], angle = 0.8): void => pen.hatch(shape, 5, angle, 0.6, { color: LEAD, alpha: 0.4 });
const ground = (pen: Pen, x: number, y: number, w: number): void => line(pen, [{ x: x - w, y: y + 60 }, { x: x - w * 0.3, y: y + 56 }, { x: x + w * 0.4, y: y + 61 }, { x: x + w, y: y + 58 }], 1.1, 0.6);

/** A smoking volcano with a small shrine at its foot. */
const volcano: Draw = (pen, x, y) => {
  const cone = [{ x: x - 120, y: y + 60 }, { x: x - 34, y: y - 60 }, { x: x - 14, y: y - 52 }, { x: x + 12, y: y - 58 }, { x: x + 34, y: y - 62 }, { x: x + 120, y: y + 60 }];
  line(pen, cone);
  shade(pen, [...cone.slice(3), { x: x + 30, y: y + 60 }], 1.1);
  for (let k = 0; k < 3; k++) line(pen, ellipse(x + 4 + k * 10, y - 80 - k * 22, 14 + k * 4, 10 + k * 3, 14), 1, 0.55);
  line(pen, [{ x: x - 70, y: y + 60 }, { x: x - 70, y: y + 36 }, { x: x - 56, y: y + 26 }, { x: x - 42, y: y + 36 }, { x: x - 42, y: y + 60 }]);
};

/** A pyramid in the dunes, with an obelisk. */
const tomb: Draw = (pen, x, y) => {
  const pyr = [{ x: x - 110, y: y + 58 }, { x: x - 10, y: y - 70 }, { x: x + 90, y: y + 58 }];
  line(pen, [...pyr, pyr[0]!]);
  shade(pen, [pyr[1]!, pyr[2]!, { x: x + 10, y: y + 58 }], 1.2);
  line(pen, [{ x: x + 110, y: y + 58 }, { x: x + 110, y: y - 20 }, { x: x + 116, y: y - 32 }, { x: x + 122, y: y - 20 }, { x: x + 122, y: y + 58 }]);
  line(pen, [{ x: x - 140, y: y + 60 }, { x: x - 90, y: y + 44 }, { x: x - 40, y: y + 60 }], 1.1, 0.6);
};

/** A monastery of stacked roofs on a snowy peak. */
const monastery: Draw = (pen, x, y) => {
  line(pen, [{ x: x - 130, y: y + 60 }, { x: x - 30, y: y - 40 }, { x: x + 10, y: y - 10 }, { x: x + 50, y: y - 50 }, { x: x + 130, y: y + 60 }]);
  line(pen, [{ x: x - 52, y: y - 18 }, { x: x - 30, y: y - 40 }, { x: x - 12, y: y - 22 }], 1, 0.6);
  for (let k = 0; k < 3; k++) {
    const w = 46 - k * 10;
    const by = y + 30 - k * 26;
    line(pen, [{ x: x - w, y: by }, { x: x - w * 0.6, y: by - 12 }, { x: x + w * 0.6, y: by - 12 }, { x: x + w, y: by }]);
    line(pen, [{ x: x - w * 0.6, y: by }, { x: x - w * 0.6, y: by + 14 }], 1, 0.6);
    line(pen, [{ x: x + w * 0.6, y: by }, { x: x + w * 0.6, y: by + 14 }], 1, 0.6);
  }
};

/** The dragon's mountain, a wing over its peak and a heap of gold at its door. */
const hoard: Draw = (pen, x, y) => {
  const mount = [{ x: x - 130, y: y + 60 }, { x: x - 40, y: y - 70 }, { x: x + 10, y: y - 40 }, { x: x + 60, y: y - 80 }, { x: x + 130, y: y + 60 }];
  line(pen, mount);
  shade(pen, [mount[2]!, mount[3]!, mount[4]!, { x: x + 10, y: y + 60 }], 1.1);
  line(pen, [{ x: x + 30, y: y - 100 }, { x: x + 60, y: y - 130 }, { x: x + 76, y: y - 104 }, { x: x + 96, y: y - 128 }, { x: x + 104, y: y - 98 }, { x: x + 60, y: y - 92 }], 1.2, 0.7);
  line(pen, [{ x: x - 20, y: y + 60 }, { x: x - 20, y: y + 30 }, { x: x, y: y + 18 }, { x: x + 20, y: y + 30 }, { x: x + 20, y: y + 60 }]);
  for (let k = 0; k < 6; k++) line(pen, ellipse(x - 40 + k * 6, y + 56 - (k % 3) * 4, 5, 3, 10), 0.9, 0.6);
};

const DRAFTS: readonly Draw[] = [volcano, tomb, monastery, hoard];

export function paintDraftRuin(pen: Pen, chapter: number, at: Pt): void {
  DRAFTS[(chapter - 1) % DRAFTS.length]?.(pen, at.x, at.y);
}

/**
 * The lands of a chapter still being drawn, in pencil: for the monastery
 * snowy ranges, pines and a frozen lake; for the dragon's hoard crags,
 * caves and the dragon itself wheeling overhead. Light, so it reads as a
 * draft, but enough that the page isn't bare.
 */
export function planDrafts(plan: Plan, r: MapRegion): void {
  const { layout, clear } = plan;
  const span = regionSpan(layout, r);
  const rng = createRng(300 + r.index);
  const weight = (y: number): number => regionWeight(layout, r, y);
  const hoard = (r.index - 1) % DRAFTS.length === 3;
  // Graphite smudges, where the side of the pencil went over the page.
  for (let i = 0; i < perWidth(layout, 16); i++) {
    const x = acrossPage(layout, rng());
    const y = span.top + rng() * (span.bottom - span.top);
    const rr = 60 + rng() * 90;
    if (rng() > weight(y)) continue;
    plan.add(Layer.Ground, y, y - rr, y + rr, (ctx) => glow(ctx, x, y, rr, LEAD, 0.06));
  }
  // Ranges.
  for (let i = 0; i < perWidth(layout, 16); i++) {
    const side = i % 3 === 2 ? rng() : i % 2 ? rng() * 0.25 : 0.72 + rng() * 0.25;
    const cx = acrossPage(layout, side, 40);
    const cy = span.top + 60 + rng() * (span.bottom - span.top - 60);
    if (rng() > weight(cy)) continue;
    const n = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const w = 28 + rng() * 26;
      const h = w * (hoard ? 1.2 + rng() * 0.6 : 0.9 + rng() * 0.5);
      const x = cx + (k - (n - 1) / 2) * w * 1.15;
      const y = cy + (rng() - 0.5) * 24;
      if (y > r.bottom - 10 || !clear.ok(x, y, w * 0.8, h, 24)) continue;
      plan.add(Layer.Standing, y, y - h - 4, y + 4, (ctx, seed) => pencilPeak(new Pen(ctx, seed, 0.5), x, y, w, h, createRng(seed), hoard));
    }
  }
  // Pines (or, by the hoard, dead stumps and scattered coins), in little stands.
  for (let i = 0; i < perWidth(layout, 18); i++) {
    const cx = acrossPage(layout, rng(), 40);
    const cy = span.top + rng() * (span.bottom - span.top);
    if (rng() > weight(cy)) continue;
    const n = 2 + Math.floor(rng() * 5);
    for (let k = 0; k < n; k++) {
      const x = cx + (rng() - 0.5) * 70;
      const y = cy + (rng() - 0.5) * 34;
      const s = 9 + rng() * 7;
      if (y > r.bottom - 10 || !clear.ok(x, y, s, s * 2.4, 30)) continue;
      plan.add(Layer.Standing, y, y - s * 2.6, y + 3, (ctx, seed) => (hoard ? pencilCoins(new Pen(ctx, seed, 0.5), x, y, createRng(seed)) : pencilPine(new Pen(ctx, seed, 0.5), x, y, s)));
    }
  }
  // A landmark of the chapter: a frozen lake, or the dragon in the sky.
  for (let tries = 0; tries < 40; tries++) {
    const x = acrossPage(layout, rng(), 80);
    const y = r.top + 120 + rng() * (r.bottom - r.top - 500);
    if (!clear.ok(x, y, 70, 50, 20)) continue;
    plan.add(Layer.Standing, y, y - 90, y + 40, (ctx, seed) => (hoard ? pencilDragon(new Pen(ctx, seed, 0.5), x, y) : pencilLake(new Pen(ctx, seed, 0.5), x, y, createRng(seed))));
    break;
  }
}

/** A pencil peak: an outline, a few strokes of shade, a snow line (or, by the hoard, a jagged crag). */
function pencilPeak(pen: Pen, x: number, y: number, w: number, h: number, rng: () => number, crag: boolean): void {
  const peak = { x: x + (rng() - 0.5) * w * 0.3, y: y - h };
  const left: Pt[] = [{ x: x - w, y }];
  const right: Pt[] = [];
  const steps = crag ? 5 : 3;
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    const j = crag ? (k % 2 ? -1 : 1) * w * 0.1 : (rng() - 0.5) * w * 0.08;
    left.push({ x: x - w + (peak.x - x + w) * t + j * 0.3, y: y - h * Math.pow(t, 1.2) + j });
    right.push({ x: peak.x + (x + w - peak.x) * t + j * 0.3, y: peak.y + h * (1 - Math.pow(1 - t, 1.2)) + j });
  }
  const sil = [...left, peak, ...right, { x: x + w, y }];
  // Paper inside, so a nearer peak hides the one behind.
  pen.fill(sil, '#efe3c3', 0.7);
  line(pen, sil, 1.1, 0.6);
  shade(pen, [peak, ...right, { x: x + w, y }, { x: peak.x + w * 0.15, y }], 1.15);
  if (!crag) line(pen, [{ x: peak.x - w * 0.3, y: peak.y + h * 0.32 }, { x: peak.x - w * 0.1, y: peak.y + h * 0.24 }, { x: peak.x + w * 0.05, y: peak.y + h * 0.36 }, { x: peak.x + w * 0.3, y: peak.y + h * 0.28 }], 0.9, 0.5);
}

function pencilPine(pen: Pen, x: number, y: number, s: number): void {
  line(pen, [{ x, y }, { x, y: y - s * 0.5 }], 1, 0.55);
  for (let k = 0; k < 3; k++) {
    const by = y - s * 0.4 - k * s * 0.6;
    const w = s * (0.75 - k * 0.18);
    line(pen, [{ x: x - w, y: by }, { x, y: by - s * 0.85 }, { x: x + w, y: by }], 1, 0.55);
  }
}

function pencilCoins(pen: Pen, x: number, y: number, rng: () => number): void {
  for (let k = 0; k < 3; k++) line(pen, ellipse(x + (rng() - 0.5) * 14, y - k * 3, 4, 2.4, 10), 0.8, 0.5);
}

function pencilLake(pen: Pen, x: number, y: number, rng: () => number): void {
  const shore = ellipse(x, y, 62 + rng() * 10, 22, 22);
  line(pen, [...shore, shore[0]!], 1.1, 0.6);
  for (let k = 0; k < 4; k++) line(pen, [{ x: x - 30 + k * 12, y: y - 8 + k * 5 }, { x: x - 6 + k * 12, y: y - 8 + k * 5 }], 0.8, 0.45);
  for (let k = 0; k < 3; k++) pencilPine(pen, x + 70 + k * 14, y - 4 + (k % 2) * 8, 9);
}

/** The dragon, roughed in: bat wings spread, neck and horned head, a long spade-tipped tail, its shadow on the ground. */
function pencilDragon(pen: Pen, x: number, y: number): void {
  const by = y - 40;
  line(pen, [{ x: x - 24, y: by + 4 }, { x: x - 4, y: by - 2 }, { x: x + 18, y: by - 4 }], 1.6, 0.7);
  line(pen, [{ x: x - 22, y: by + 9 }, { x: x - 2, y: by + 6 }, { x: x + 16, y: by + 2 }], 1.1, 0.55);
  // Neck and head.
  line(pen, [{ x: x + 18, y: by - 4 }, { x: x + 32, y: by - 14 }, { x: x + 40, y: by - 24 }], 1.4, 0.7);
  line(pen, [{ x: x + 36, y: by - 26 }, { x: x + 54, y: by - 24 }, { x: x + 42, y: by - 18 }], 1.1, 0.7);
  line(pen, [{ x: x + 39, y: by - 26 }, { x: x + 36, y: by - 34 }], 1, 0.6);
  line(pen, [{ x: x + 43, y: by - 26 }, { x: x + 43, y: by - 33 }], 1, 0.6);
  // Tail, with a spade at its tip.
  line(pen, [{ x: x - 24, y: by + 6 }, { x: x - 50, y: by + 16 }, { x: x - 74, y: by + 8 }, { x: x - 90, y: by + 14 }], 1.2, 0.65);
  line(pen, [{ x: x - 90, y: by + 8 }, { x: x - 100, y: by + 14 }, { x: x - 90, y: by + 20 }, { x: x - 90, y: by + 8 }], 1, 0.6);
  // Wings: a leading edge, finger bones, and a scalloped trailing edge.
  for (const dir of [-1, 1]) {
    const root = { x: x + (dir < 0 ? -6 : 6), y: by - 2 };
    const elbow = { x: root.x + dir * 16, y: by - 40 };
    const tip = { x: root.x + dir * 48, y: by - 56 + (dir > 0 ? -6 : 0) };
    line(pen, [root, elbow, tip], 1.3, 0.7);
    const trail = [tip, { x: root.x + dir * 42, y: by - 32 }, { x: root.x + dir * 28, y: by - 24 }, { x: root.x + dir * 14, y: by - 14 }, { x: root.x + dir * 4, y: by - 4 }];
    line(pen, trail, 1, 0.55);
    for (const k of [1, 2, 3]) line(pen, [elbow, trail[k]!], 0.8, 0.45);
  }
  line(pen, ellipse(x - 10, y + 30, 46, 7, 18), 0.8, 0.3);
}
