import { bezier, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, FAR } from './common';
import { glow } from './estuary';
import { NIGHT } from './nightSky';

/**
 * The bay by night: dark water under the moon, the long glittering path of
 * moonlight laid across it, low swells catching silver on their backs; the
 * reef's breakers and the shore's little waves lit electric blue by the
 * plankton in them, sparks of it scattered wherever the water stirs; the
 * islands out on the horizon black against the haze, one with its
 * lighthouse.
 */
const W = BACKDROP_W;
export const BAY = '#1f3766';
export const BAY_FAR = '#3a5486';
export const BAY_DEEP = '#16264c';
/** The plankton's light: electric cyan-blue, white-hot where it's brightest. */
export const PLANKTON = '#4fdcff';
export const PLANKTON_DEEP = '#1f9be0';
export const PLANKTON_CORE = '#e6fdff';
const ISLAND = '#1e2648';
const ISLAND_FAR = '#3b4874';
const SILVER = '#dfe8f6';

/**
 * The moon's path across the water below `x`: a column of broken, glinting
 * strokes from y0 down to y1, narrow at the horizon and widening towards
 * the viewer, brightest down its middle, over a soft sheen.
 */
export function moonPath(t: Draw, x: number, y0: number, y1: number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < 10; k++) {
    const u = (k + 0.5) / 10;
    glow(t, x, y0 + (y1 - y0) * u, 14 + 80 * u, (y1 - y0) / 9, SILVER, 0.3 - 0.12 * u);
  }
  for (let k = 0; k < n; k++) {
    const u = pen.rng() ** 0.9;
    const y = y0 + (y1 - y0) * u;
    const half = 8 + 95 * u;
    const spread = half * Math.abs(pen.rng() + pen.rng() - 1);
    const px = x + (pen.rng() < 0.5 ? -1 : 1) * spread;
    const len = 1.5 + u * 8 + pen.rng() * 5;
    const core = 1 - spread / half;
    pen.hair([pt(px - len / 2, y), pt(px + len / 2, y + pen.jitter(0.3))], 0.6 + u * 0.9, PAPER_FILL, 0.3 + 0.7 * core);
    if (core > 0.75 && pen.rng() < 0.15) glow(t, px, y, len, 1.5 + u, PAPER_FILL, 0.5);
  }
}

/**
 * Dark water from y0 down to y1: low swells, their backs catching a thin
 * line of moonlight, a darker trough under each, closer and finer far off.
 */
export function nightSwell(t: Draw, y0: number, y1: number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const u = pen.rng() ** 1.3;
    const y = y0 + (y1 - y0) * u;
    const x = pen.rng() * W;
    const len = 6 + 30 * u + pen.rng() * 14;
    const crest = bezier(pt(x, y), pt(x + len / 2, y - 0.6 - u), pt(x + len, y + 0.2), 6);
    pen.hair(crest, 0.4 + 0.5 * u, SILVER, 0.25 + 0.3 * u);
    pen.hair(crest.map((p) => pt(p.x + 1.5, p.y + 1 + u * 1.2)), 0.45, t.ink, FAR * (0.25 + 0.35 * u));
  }
}

/** A spark of plankton: a white-hot point in a small cyan glow. */
export function spark(t: Draw, x: number, y: number, r: number, alpha = 1): void {
  glow(t, x, y, r * 4, r * 2.6, PLANKTON, 0.4 * alpha);
  t.pen.dot(x, y, r * 0.6, PLANKTON_CORE, 0.9 * alpha);
}

/** Sparks of plankton scattered through the water from y0 to y1, where the swell stirs it. */
export function sparks(t: Draw, x0: number, x1: number, y0: number, y1: number, n: number, size = 1): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const u = pen.rng();
    spark(t, x0 + pen.rng() * (x1 - x0), y0 + (y1 - y0) * u, (0.4 + pen.rng() * 0.6 + u * 0.4) * size, 0.4 + pen.rng() * 0.6);
  }
}

/**
 * Breakers glowing with plankton along `y` from x0 to x1: curling crests
 * of electric blue, white-hot where they tumble, the light bleeding out
 * into the water round them and running back in streaks down their faces.
 * `size` scales them up towards the viewer.
 */
export function glowBreakers(t: Draw, x0: number, x1: number, y: number, size = 1): void {
  const { pen } = t;
  glow(t, (x0 + x1) / 2, y, (x1 - x0) * 0.55, 5 * size, PLANKTON_DEEP, 0.3);
  for (let x = x0; x < x1; x += (6 + pen.rng() * 14) * size) {
    if (pen.rng() < 0.2) continue;
    const w = (6 + pen.rng() * 16) * size;
    const lift = (1.5 + pen.rng() * 2.5) * size;
    const yy = y + pen.jitter(1.2 * size);
    glow(t, x + w / 2, yy - lift * 0.3, w * 0.8, lift * 1.8 + 2, PLANKTON, 0.45);
    const crest = bezier(pt(x, yy + 0.5), pt(x + w * (0.35 + pen.rng() * 0.3), yy - lift), pt(x + w, yy + 0.3), 7);
    pen.hair(crest, (1.1 + pen.rng() * 0.6) * size, PLANKTON, 0.95);
    pen.hair(crest.slice(1, 6), 0.6 * size, PLANKTON_CORE, 0.95);
    pen.hair(crest.map((p) => pt(p.x + 1, p.y + 1.6 * size)), 0.4, t.ink, FAR * 0.4);
    // Light running back down the face in streaks, and spray thrown up.
    for (let k = 0; k < 2; k++) {
      const sx = x + pen.rng() * w;
      pen.hair([pt(sx, yy + 1.5 * size), pt(sx + (3 + pen.rng() * 5) * size, yy + (2.5 + k * 1.5) * size)], 0.5 * size, PLANKTON, 0.5);
    }
    if (pen.rng() < 0.4) for (let k = 0; k < 3; k++) pen.dot(x + w * 0.5 + pen.jitter(w * 0.4), yy - lift - pen.rng() * 3 * size, 0.35 * size, PLANKTON_CORE, 0.8);
  }
}

/** Foam lines left behind a breaker as it runs in, faintly glowing, broken up. */
export function glowFoam(t: Draw, x0: number, x1: number, y0: number, y1: number, rows: number): void {
  const { pen } = t;
  for (let r = 0; r < rows; r++) {
    const y = y0 + ((y1 - y0) * (r + 0.5)) / rows;
    for (let x = x0 + pen.rng() * 20; x < x1; x += 10 + pen.rng() * 26) {
      const len = 5 + pen.rng() * 16;
      pen.hair(bezier(pt(x, y + pen.jitter(1)), pt(x + len / 2, y - 0.6), pt(x + len, y + pen.jitter(1)), 5), 0.6, PLANKTON, 0.35 + pen.rng() * 0.3);
    }
  }
}

/**
 * An island on the horizon from x0 to x1, `height(x)` above `horizon`:
 * dark against the haze, paler the further off (`fade` 0..1), hoop pines
 * standing up off its ridge, a thin rim of moonlight along its skyline.
 * Returns its outline.
 */
export function nightIsland(t: Draw, x0: number, x1: number, horizon: number, height: (x: number) => number, fade = 1, pines = 6): Pt[] {
  const { pen } = t;
  const sky: Pt[] = [];
  for (let x = x0; x <= x1; x += 3) sky.push(pt(x, horizon - height(x) + pen.jitter(0.35)));
  const shape = [...sky, pt(x1, horizon + 1), pt(x0, horizon + 1)];
  const color = fade > 0.6 ? ISLAND : ISLAND_FAR;
  pen.fill(shape, color, 0.55 + 0.4 * fade);
  for (let k = 0; k < pines; k++) {
    const x = x0 + (x1 - x0) * (0.15 + 0.7 * pen.rng());
    const g = horizon - height(x) + 1;
    const h = (3 + pen.rng() * 4) * (0.6 + 0.6 * fade);
    pen.stroke([pt(x, g), pt(x, g - h)], 0.6, color, 0.9, false);
    for (let j = 1; j < 4; j++) pen.fill([pt(x - 1.4 + j * 0.25, g - h * j * 0.28), pt(x + 1.4 - j * 0.25, g - h * j * 0.28), pt(x, g - h * j * 0.28 - 1.2)], color, 0.9);
  }
  pen.hair(sky.filter((_, i) => i % 9 < 6), 0.5, SILVER, 0.18 + 0.2 * fade);
  pen.hair(sky.filter((_, i) => i % 13 < 9), 0.45, t.ink, FAR * 0.5 * fade);
  return shape;
}

/** A far lighthouse on its island: a pale tower and lantern, its keeper's cottage dark beside it. (Its flash blinks on its own, a mover.) */
export function farLighthouse(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const tower = [pt(x - 1.6 * s, ground), pt(x + 1.6 * s, ground), pt(x + 1 * s, ground - 9 * s), pt(x - 1 * s, ground - 9 * s)];
  pen.fill(tower, '#c9d1e2', 0.85);
  pen.hair([pt(x - 1.1 * s, ground - 9 * s), pt(x + 1.1 * s, ground - 9 * s)], 0.5, t.ink, FAR);
  pen.fill([pt(x - 0.8 * s, ground - 9 * s), pt(x + 0.8 * s, ground - 9 * s), pt(x, ground - 11 * s)], NIGHT, 0.9);
  glow(t, x, ground - 9.8 * s, 3 * s, 2 * s, '#ffe7a6', 0.7);
  pen.fill([pt(x + 2 * s, ground), pt(x + 6 * s, ground), pt(x + 6 * s, ground - 2.5 * s), pt(x + 4 * s, ground - 3.6 * s), pt(x + 2 * s, ground - 2.5 * s)], ISLAND, 0.9);
  pen.dot(x + 4.6 * s, ground - 1.2 * s, 0.4 * s, '#ffd27a', 0.9);
}

/**
 * The lighthouse's flash, `on` 0..1: the lamp flaring white and its beam
 * thrown out sideways across the sky as a long, faint wedge.
 */
export function lighthouseFlash(t: Draw, x: number, y: number, on: number): void {
  if (on <= 0) {
    glow(t, x, y, 2, 1.5, '#ffe7a6', 0.6);
    return;
  }
  const { ctx } = t.pen;
  for (const side of [-1, 1] as const) {
    const g = ctx.createLinearGradient(x, y, x + side * 90, y);
    g.addColorStop(0, `rgba(255,246,214,${0.5 * on})`);
    g.addColorStop(1, 'rgba(255,246,214,0)');
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - 0.6);
    ctx.lineTo(x + side * 90, y - 5);
    ctx.lineTo(x + side * 90, y + 3);
    ctx.lineTo(x, y + 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  glow(t, x, y, 9 * on, 7 * on, '#fff6d6', 0.85);
  t.pen.dot(x, y, 0.9, PAPER_FILL, 1);
}
