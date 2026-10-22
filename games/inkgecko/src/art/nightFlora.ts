import type { Rng } from '../logic/rng';
import { arc, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, TAU } from './kit';
import { moonHalo, PETAL } from './nightKit';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The night garden's white flowers seen from above, pale enough to glow in
 * the dark: moonflowers opened flat, night-scented stock in loose clusters,
 * evening primroses, white roses; each seated on dark leaves, with a pen
 * contour and a breath of cool light round it. Board coordinates.
 */
export type NightBloom = 'moonflower' | 'stock' | 'primrose' | 'rose';
export const NIGHT_BLOOMS: readonly NightBloom[] = ['moonflower', 'stock', 'primrose', 'rose'];
/** Each flower's radius, about. */
export const NIGHT_BLOOM_SIZE: Readonly<Record<NightBloom, number>> = { moonflower: 8, stock: 7, primrose: 6, rose: 6.5 };

const LEAF_NIGHT = '#2c4636';
const LEAF_NIGHT_LIT = '#5f7f70';
const THROAT = '#c9d9a6';
const STOCK = '#ddd3f2';
const STOCK_DEEP = '#9f8fc4';
const PRIMROSE = '#f4ecb0';
const PRIMROSE_DEEP = '#c9b867';
const ROSE_SHADE = '#c2c4dc';

/** Dark leaves under a flower: a few broad blades fanned round it, the lit edges silvered. */
export function nightLeaves(d: Draw, c: Pt, size: number, rng: Rng, n = 4): void {
  const { pen } = d;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rng() * 1.2;
    const tip = polar(c, a, size * (1.3 + rng() * 0.6));
    const base = polar(c, a, size * 0.2);
    const blade = [...arc(base, tip, size * 0.34, 5), ...arc(tip, base, size * 0.34, 5).slice(1)];
    pen.fill(blade.map((p) => pt(p.x + SHADOW.x * 1.5, p.y + SHADOW.y * 1.5)), '#0d1420', 0.25);
    pen.fill(blade, mix(LEAF_NIGHT, '#1c2d2b', rng() * 0.6), 0.92);
    pen.fill(blade.slice(0, 6), LEAF_NIGHT_LIT, 0.3);
    pen.hair([base, tip], 0.35, '#8fa9a0', 0.35);
    pen.hair(closed(blade), 0.35, d.ink, 0.45);
  }
}

/** Moonflower: a wide white trumpet opened flat, five soft lobes, a star of folds into a green throat. */
function moonflower(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  const disc = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const r = s * (0.92 + 0.08 * Math.cos(5 * (a - turn)));
    return polar(c, a, r);
  });
  pen.fill(disc.map((p) => pt(p.x + SHADOW.x * 2, p.y + SHADOW.y * 2)), '#0d1420', 0.3);
  pen.fill(disc, PETAL, 0.97);
  pen.crescent(disc, pt(-SHADOW.x * s * 0.35, -SHADOW.y * s * 0.35), () => pen.fill(disc, ROSE_SHADE, 0.45));
  for (let k = 0; k < 5; k++) {
    const a = turn + (k / 5) * TAU + Math.PI / 5;
    pen.hair([polar(c, a, s * 0.25), polar(c, a + 0.06, s * 0.85)], 0.7, THROAT, 0.7);
  }
  pen.fill(oval(c.x, c.y, s * 0.28, s * 0.28, 10), THROAT, 0.9);
  pen.fill(oval(c.x + s * 0.06, c.y + s * 0.08, s * 0.14, s * 0.14, 8), '#6f8a4a', 0.7);
  pen.hair(closed(disc), 0.45, d.ink, 0.55);
}

/** Night-scented stock: a loose cluster of small four-petalled flowers, lilac-white. */
function stock(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const n = 5 + Math.floor(rng() * 4);
  for (let k = 0; k < n; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * s * 0.75);
    const f = s * (0.26 + rng() * 0.1);
    const turn = rng() * TAU;
    pen.fill(oval(p.x + SHADOW.x, p.y + SHADOW.y, f * 1.1, f * 1.1, 10), '#0d1420', 0.25);
    for (let j = 0; j < 4; j++) {
      const q = polar(p, turn + (j * TAU) / 4, f * 0.55);
      pen.fill(oval(q.x, q.y, f * 0.55, f * 0.55, 8), mix(STOCK, PETAL, rng() * 0.6), 0.95);
    }
    pen.dot(p.x, p.y, f * 0.22, STOCK_DEEP, 0.9);
    pen.hair(closed(oval(p.x, p.y, f * 1.05, f * 1.05, 10)), 0.3, d.ink, 0.35);
  }
}

/** Evening primrose: four broad notched petals, palest lemon, with a cross of stamens. */
function primrose(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  for (let k = 0; k < 4; k++) {
    const a = turn + (k * TAU) / 4;
    const p = polar(c, a, s * 0.48);
    const petal = Array.from({ length: 16 }, (_, i) => {
      const t = (i / 16) * TAU;
      const notch = 1 - 0.18 * Math.exp(-((t - Math.PI) ** 2) * 4);
      return polar(p, a + t, s * 0.52 * (Math.cos(t) > 0 ? notch : 1));
    });
    pen.fill(petal.map((q) => pt(q.x + SHADOW.x * 1.4, q.y + SHADOW.y * 1.4)), '#0d1420', 0.2);
    pen.fill(petal, PRIMROSE, 0.95);
    pen.hair(closed(petal), 0.35, d.ink, 0.45);
  }
  pen.fill(oval(c.x, c.y, s * 0.2, s * 0.2, 8), PRIMROSE_DEEP, 0.9);
  for (let k = 0; k < 4; k++) pen.hair([c, polar(c, turn + Math.PI / 4 + (k * TAU) / 4, s * 0.38)], 0.4, PRIMROSE_DEEP, 0.8);
}

/** White rose: rings of cupped petals closing to a shadowed heart. */
function rose(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const outer = Array.from({ length: 28 }, (_, i) => polar(c, (i / 28) * TAU, s * (0.9 + 0.1 * Math.sin(i * 1.7 + rng()))));
  pen.fill(outer.map((p) => pt(p.x + SHADOW.x * 2, p.y + SHADOW.y * 2)), '#0d1420', 0.3);
  pen.fill(outer, PETAL, 0.97);
  pen.crescent(outer, pt(-SHADOW.x * s * 0.3, -SHADOW.y * s * 0.3), () => pen.fill(outer, ROSE_SHADE, 0.5));
  const turn = rng() * TAU;
  for (let ring = 0; ring < 3; ring++) {
    const r = s * (0.72 - ring * 0.2);
    const n = 5 - ring;
    for (let k = 0; k < n; k++) {
      const a0 = turn + ring * 0.9 + (k / n) * TAU;
      const petal = Array.from({ length: 6 }, (_, i) => polar(c, a0 + (i / 5) * (TAU / n) * 1.1, r * (1 - 0.12 * Math.sin((i / 5) * Math.PI))));
      pen.hair(petal, 0.45, mix(ROSE_SHADE, d.ink, 0.35), 0.7);
    }
  }
  pen.fill(oval(c.x + s * 0.04, c.y + s * 0.05, s * 0.16, s * 0.16, 8), mix(ROSE_SHADE, d.ink, 0.3), 0.6);
  pen.hair(closed(outer), 0.45, d.ink, 0.55);
}

/** One flower of the kind, radius about s, at c, with a breath of light round it. */
export function nightBloom(d: Draw, kind: NightBloom, c: Pt, s: number, rng: Rng): void {
  moonHalo(d.pen.ctx, c, s * 2.6, 0.13);
  if (kind === 'moonflower') moonflower(d, c, s, rng);
  else if (kind === 'stock') stock(d, c, s, rng);
  else if (kind === 'primrose') primrose(d, c, s, rng);
  else rose(d, c, s, rng);
}

/** Tiny pale flowers (thyme, chamomile) as dots with a warm eye: rings round stepping stones, edging the lawn. */
export function starlets(ctx: CanvasRenderingContext2D, ps: readonly Pt[], r: number): void {
  ctx.save();
  ctx.fillStyle = rgba('#0d1420', 0.25);
  ctx.beginPath();
  for (const p of ps) {
    ctx.moveTo(p.x + r + 0.8, p.y + 1);
    ctx.arc(p.x + 0.8, p.y + 1, r, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = rgba(PETAL, 0.92);
  ctx.beginPath();
  for (const p of ps) {
    ctx.moveTo(p.x + r, p.y);
    ctx.arc(p.x, p.y, r, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = rgba('#d9c56a', 0.9);
  ctx.beginPath();
  for (const p of ps) {
    ctx.moveTo(p.x + r * 0.4, p.y);
    ctx.arc(p.x, p.y, r * 0.4, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}
