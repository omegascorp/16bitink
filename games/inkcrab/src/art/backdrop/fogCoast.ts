import { bezier, type Draw, oval, pt } from '../kit';
import { pathOf, type Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, edges, FAR } from './common';
import { glow } from './estuary';
import { CONIFER, CONIFER_DARK, spruce } from './pnw';

/**
 * Landforms and weather of a foggy northern Pacific coast: low stratus and
 * fog banks, capes of dark forest fading one behind another into the mist,
 * a forested headland ending in a cliff, basalt sea stacks in the surf
 * (Haystack Rock and its needles) and low black rocks at the point.
 */
const W = BACKDROP_W;
export const FOG = '#f1f3ef';
export const FOG_SHADE = '#a9b6b8';
export const STACK = '#5a5955';
const STACK_LIT = '#8f8c84';
const STACK_COLD = '#5f6f78';
const CAPE = '#61786c';
const GUANO = '#f4f1e8';

/**
 * A fog bank lying low: a long, flat-bottomed heap of soft white puffs,
 * greyer underneath, its rounded top inked only in a few broken curls.
 */
export function fogBank(t: Draw, x: number, base: number, w: number, h: number, alpha = 1): void {
  const { pen } = t;
  const n = Math.max(4, Math.round(w / (h * 0.9)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const env = Math.sin(Math.PI * u) ** 0.5;
    const r = h * (0.35 + 0.55 * env) * (0.8 + pen.rng() * 0.4);
    const px = x - w / 2 + w * u + pen.jitter(h * 0.2);
    const py = base - r * 0.55;
    glow(t, px, py + r * 0.3, r * 2, r * 0.9, FOG_SHADE, 0.22 * alpha);
    glow(t, px, py, r * 1.7, r, FOG, 0.85 * alpha);
    if (env > 0.4 && pen.rng() < 0.6) pen.hair(oval(px, py, r * 1.1, r * 0.75, 18).slice(10, 16), 0.45, t.ink, FAR * 0.3 * alpha);
  }
  pen.hair(bezier(pt(x - w * 0.4, base), pt(x, base + 0.6), pt(x + w * 0.38, base - 0.4), 12), 0.4, FOG_SHADE, 0.5 * alpha);
}

/** A sheet of stratus: a long, thin, soft band of grey, its underside traced by a few faint ink strokes. */
export function stratus(t: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = t;
  for (let k = 0; k < 5; k++) {
    const px = x - w / 2 + (w * (k + 0.5)) / 5 + pen.jitter(w * 0.05);
    glow(t, px, y + pen.jitter(h * 0.2), w * 0.24, h * (0.7 + pen.rng() * 0.4), FOG_SHADE, 0.2);
    glow(t, px, y - h * 0.25, w * 0.2, h * 0.6, FOG, 0.55);
  }
  for (let k = 0; k < 3; k++) {
    const sx = x - w * 0.4 + pen.rng() * w * 0.3;
    const len = w * (0.3 + pen.rng() * 0.3);
    const sy = y + h * 0.4 + k * 1.5;
    pen.hair(bezier(pt(sx, sy), pt(sx + len / 2, sy + 0.8), pt(sx + len, sy - 0.3), 10), 0.4, t.ink, FAR * 0.2);
  }
}

/** A wisp of mist lying along a slope or the water: a thin, soft white veil fading out at both ends. */
export function mist(t: Draw, x0: number, x1: number, y: number, h: number, alpha = 0.8): void {
  const { pen } = t;
  const n = Math.max(2, Math.round((x1 - x0) / (h * 3)));
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    glow(t, x0 + step * (i + 0.5) + pen.jitter(step * 0.2), y + pen.jitter(h * 0.15), step * 1.1, h, FOG, alpha * Math.sin(Math.PI * u) ** 0.4);
  }
}

/**
 * A far cape: a ridge of forest seen across miles of sea, its skyline
 * combed by tree tips, paler and bluer the further off (`fade`), its foot
 * lost in the fog lying on the water.
 */
export function cape(t: Draw, x0: number, x1: number, horizon: number, height: (x: number) => number, fade: number): Pt[] {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = x0, k = 0; x <= x1; x += 1.6, k++) {
    const h = height(x);
    top.push(pt(x, horizon - h - (h > 2 ? (k % 2 ? 0.6 : 1.4 + pen.rng() * 1.6) * Math.min(1, h / 8) : 0)));
  }
  const shape = [...top, pt(x1, horizon + 0.5), pt(x0, horizon + 0.5)];
  pen.fill(shape, PAPER_FILL, 0.6 + fade * 0.3);
  pen.fill(shape, CAPE, 0.2 + fade * 0.4);
  pen.clipped(shape, () => {
    const peak = Math.max(...top.map((p) => horizon - p.y));
    const { ctx } = pen;
    const g = ctx.createLinearGradient(0, horizon - peak, 0, horizon);
    g.addColorStop(0, 'rgba(241,243,239,0)');
    g.addColorStop(0.55, 'rgba(241,243,239,0.15)');
    g.addColorStop(1, `rgba(241,243,239,${0.95 - fade * 0.25})`);
    ctx.fillStyle = g;
    pathOf(ctx, shape);
    ctx.fill();
  });
  let run: Pt[] = [];
  for (const p of top) {
    if (horizon - p.y > 3) run.push(p);
    else {
      if (run.length > 3) pen.hair(run, 0.45, t.ink, FAR * (0.2 + fade * 0.5));
      run = [];
    }
  }
  if (run.length > 3) pen.hair(run, 0.45, t.ink, FAR * (0.2 + fade * 0.5));
  return top;
}

/**
 * Forest cloaking a slope: a dark mass of conifer from the skyline `top(x)`
 * down to `bottom(x)`, spires of spruce and fir standing up out of it in
 * rows, the back row along the crest, each row down the slope in front.
 */
export function forest(t: Draw, x0: number, x1: number, top: (x: number) => number, bottom: (x: number) => number, hMin: number, hMax: number, fade = 1): void {
  const { pen } = t;
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 3) edge.push(pt(x, top(x) - hMin * 0.4));
  const mass = [...edge, ...[...edge].reverse().map((p) => pt(p.x, Math.max(p.y + 4, bottom(p.x))))];
  pen.fill(mass, PAPER_FILL, 0.9 * fade);
  pen.fill(mass, CONIFER, 0.55 * fade);
  pen.clipped(mass, () => {
    pen.fill(mass.map((p) => pt(p.x, p.y + hMin)), CONIFER_DARK, 0.3 * fade);
    pen.hatch(mass, 1.5, 1.15, 0.3, { color: t.ink, alpha: FAR * 0.3 * fade });
  });
  const step = hMin * 0.55;
  for (let row = 0, drop = 0; row < 40; row++, drop += step) {
    const k = row === 0 ? 1 : 0.8;
    let any = false;
    for (let x = x0 + pen.rng() * 4; x < x1; x += hMin * 0.34 + pen.rng() * hMin * 0.3) {
      const ground = top(x) + drop;
      const h = (hMin + pen.rng() * (hMax - hMin)) * k;
      if (ground + h * 0.1 > bottom(x)) continue;
      any = true;
      spruce(t, x + pen.jitter(2), ground + h * 0.15, h, fade);
    }
    if (!any && row > 0) break;
  }
}

/** Basalt washed and shaded: a dark mass, its lit rim warm, its shade cool and hatched, inked. */
export function stackRock(t: Draw, shape: readonly Pt[], fade = 1): void {
  const { pen } = t;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, STACK, 0.55 * fade);
  pen.crescent(shape, pt(size * 0.1, size * 0.14), () => pen.fill(shape, STACK_LIT, 0.4 * fade));
  pen.crescent(shape, pt(-size * 0.14, -size * 0.2), () => {
    pen.fill(shape, STACK_COLD, 0.25 * fade);
    pen.hatch(shape, Math.max(1.4, size / 50), 1.05, 0.36, { color: t.ink, alpha: FAR * 0.42 * fade });
  });
  pen.stroke(edges(shape, 3), 0.85, t.ink, FAR * fade, false);
}

/**
 * A sea stack, Haystack Rock fashion: a great dome of basalt standing in
 * the surf, fissured, streaked white with the guano of its seabirds, a
 * scrap of green on its crown. `height(u)` (0..1 across) shapes its top.
 */
export function seaStack(t: Draw, x0: number, x1: number, foot: number, h: number, height: (u: number) => number, fade = 1): Pt[] {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) top.push(pt(x, foot - h * height((x - x0) / (x1 - x0)) + 0.8 * Math.sin(x * 0.6)));
  const shape = [...top, pt(x1, foot + 2), pt(x0, foot + 2)];
  stackRock(t, shape, fade);
  pen.clipped(shape, () => {
    // Fissures down its face, and the white streaks below the ledges where the birds sit.
    for (let x = x0 + 6; x < x1 - 4; x += 6 + pen.rng() * 8) {
      const y0 = foot - h * height((x - x0) / (x1 - x0)) + 4;
      pen.hair([pt(x, y0), pt(x + pen.jitter(2), (y0 + foot) / 2), pt(x + pen.jitter(3), foot)], 0.4, t.ink, FAR * 0.4 * fade);
    }
    for (let k = 0; k < (x1 - x0) / 5; k++) {
      const x = x0 + 4 + pen.rng() * (x1 - x0 - 8);
      const y = foot - h * height((x - x0) / (x1 - x0)) * (0.55 + pen.rng() * 0.4) + 3;
      pen.hair([pt(x, y), pt(x + pen.jitter(0.5), y + 3 + pen.rng() * 7)], 0.5 + pen.rng() * 0.4, GUANO, 0.5 * fade);
    }
    // Wet black rock at its foot.
    pen.fill([pt(x0 - 2, foot - 6), pt(x1 + 2, foot - 6), pt(x1 + 2, foot + 3), pt(x0 - 2, foot + 3)], '#2f2e2c', 0.3 * fade);
  });
  const crown = top.filter((p) => p.y < foot - h * 0.9);
  if (crown.length > 3) pen.fill([...crown, ...[...crown].reverse().map((p) => pt(p.x, p.y + 3))], '#7d9a5a', 0.5 * fade);
  return top;
}

/**
 * The forested headland: rock rising out of the sea under a cloak of dark
 * forest, falling at its seaward (right) end in a cliff to a bench, then
 * the sea. `height(x)` is the ground above the water; trees stop short
 * of the cliff edge (`treeline`).
 */
export function headland(t: Draw, x0: number, x1: number, water: number, height: (x: number) => number, treeline: number): Pt[] {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) top.push(pt(x, water - height(x)));
  const shape = [...top, pt(x1, water + 3), pt(x0, water + 3)];
  stackRock(t, shape, 0.9);
  pen.clipped(shape, () => {
    // Fissures down the bare cliff, wet black rock at its foot, turf on the bench past the trees.
    for (let x = x0 + 8; x < x1; x += 5 + pen.rng() * 7) {
      const y0 = water - Math.min(height(x) - 4, 30 + (x > treeline - 70 ? (x - treeline + 70) : 0));
      if (y0 > water - 4) continue;
      pen.hair([pt(x, y0), pt(x + pen.jitter(2), (y0 + water) / 2), pt(x + pen.jitter(3), water)], 0.45, t.ink, FAR * 0.45);
    }
    pen.fill([...top.filter((p) => p.x > treeline - 6), ...[...top].reverse().filter((p) => p.x > treeline - 6).map((p) => pt(p.x, p.y + 7))], '#7d9562', 0.6);
    pen.fill([pt(x0, water - 7), pt(x1, water - 7), pt(x1, water + 3), pt(x0, water + 3)], '#2f2e2c', 0.3);
  });
  // The forest runs down to the cliff top, which rises towards the seaward end.
  const cliffTop = (x: number): number => water - 22 - Math.max(0, x - (treeline - 80)) * 0.9 - 4 * Math.sin(x * 0.11) - 2 * Math.sin(x * 0.31);
  forest(t, x0 + 4, treeline, (x) => water - height(x) + 2, cliffTop, 12, 28);
  return top;
}

/** Surf at the foot of the rock: a broken white band at the waterline with spray thrown up. */
export function surf(t: Draw, x0: number, x1: number, y: number): void {
  const { pen } = t;
  for (let x = x0; x < x1; x += 5 + pen.rng() * 10) {
    if (pen.rng() < 0.25) continue;
    const w = 3 + pen.rng() * 12;
    const lift = 1 + pen.rng() * 4;
    pen.hair(bezier(pt(x, y + 1 + pen.jitter(1)), pt(x + w * (0.3 + pen.rng() * 0.4), y - lift), pt(x + w, y + pen.jitter(1)), 5), 0.9 + pen.rng() * 0.8, PAPER_FILL, 0.95);
    pen.hair(bezier(pt(x + 1, y + 2), pt(x + w * 0.5, y - 0.5), pt(x + w, y + 1.5), 5), 0.4, t.ink, FAR * 0.45);
    if (pen.rng() < 0.3) glow(t, x + w / 2, y - 4, w * 0.7, 6, '#ffffff', 0.75);
  }
}

/** Long swells rolling in out of the fog: rows of faint crests, each with a dark trough under it, wider towards the viewer. */
export function longSwells(t: Draw, y0: number, y1: number, rows: number): void {
  const { pen } = t;
  for (let r = 0; r < rows; r++) {
    const k = r / Math.max(1, rows - 1);
    const y = y0 + (y1 - y0) * k ** 1.3;
    for (let x = (r * 71) % 90 - 40; x < W; x += 70 + 120 * k + pen.rng() * 60) {
      const len = 40 + 90 * k + pen.rng() * 40;
      const crest = bezier(pt(x, y), pt(x + len / 2, y - 0.8 - k), pt(x + len, y), 12);
      pen.hair(crest, 0.5 + 0.5 * k, PAPER_FILL, 0.5 + 0.3 * k);
      pen.hair(crest.map((p) => pt(p.x + 2, p.y + 1 + k)), 0.4, t.ink, FAR * (0.18 + 0.2 * k));
    }
  }
}
