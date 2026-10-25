import type { Rng } from '../../logic/rng';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { rgba } from '../wash';
import { dots, GRASS_DEEP, GRASS_LIT, type Mark, markShadows, MOSS, MOSS_LIT, PEAT, PEAT_DARK, SPHAGNUM, SPHAGNUM_RED, strokeMarks, WATER, WATER_SKY } from './heathPlaceKit';

/**
 * A heath pool from above (Heron Pool): still water stained black-brown by
 * the peat, the pale sky lying on it from the upper left, the bank's shade
 * along its near edge, a few rings where something rose; a rim of
 * sphagnum (green, ochre and red cushions) and black mud, soft rush in
 * dark tufts and cottongrass nodding its white heads round the margin.
 * It fills the level's water zone, r round c.
 */

/** A tuft of soft rush or cottongrass at p: stiff thin stems fanning out, their shadows, white heads for cottongrass. */
function tuft(d: Draw, p: Pt, s: number, cotton: boolean, rng: Rng): void {
  const stems: Mark[] = [];
  const lit: Mark[] = [];
  const n = 10 + Math.floor(rng() * 8);
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU;
    const m: Mark = [p.x + (rng() - 0.5) * 2, p.y + (rng() - 0.5) * 2, a, s * (0.5 + rng() * 0.6), (rng() - 0.5) * 2];
    (rng() < 0.3 ? lit : stems).push(m);
  }
  markShadows(d, [...stems, ...lit], 0.25, 1.1, 2);
  d.pen.fill(oval(p.x, p.y, s * 0.25, s * 0.2, 10), PEAT_DARK, 0.6);
  strokeMarks(d, stems, GRASS_DEEP, 0.9, 0.8);
  strokeMarks(d, lit, GRASS_LIT, 0.85, 0.6);
  if (!cotton) return;
  for (const [x, y, a, l] of stems.filter((_, i) => i % 3 === 0)) {
    const h = pt(x + Math.cos(a) * l, y + Math.sin(a) * l);
    const head = blob(h, 1.8 + rng(), 1.5 + rng() * 0.6, rng, 0.35, 10);
    d.pen.fill(head.map((q) => pt(q.x + 0.8, q.y + 1.2)), d.ink, 0.15);
    d.pen.fill(head, PAPER_FILL, 0.95);
    d.pen.hair(closed(head), 0.3, d.ink, 0.35);
  }
}

/** The rim: black mud, then cushions of sphagnum and moss stippled round the shore. */
function rim(d: Draw, c: Pt, r: number, rng: Rng): void {
  const mud = blob(c, r + 9, r + 8, rng, 0.07, 40, rng() * TAU);
  d.pen.fill(mud, PEAT_DARK, 0.5);
  d.pen.fill(blob(c, r + 18, r + 16, rng, 0.1, 40), PEAT, 0.18);
  const cushions: [string, number][] = [[SPHAGNUM, 0.7], [MOSS, 0.6], [SPHAGNUM_RED, 0.55], [MOSS_LIT, 0.5]];
  for (let i = 0; i < 70; i++) {
    const a = rng() * TAU;
    const p = polar(c, a, r + 2 + rng() * 14);
    const [colour, alpha] = cushions[Math.floor(rng() * cushions.length)]!;
    const s = 2.5 + rng() * 4;
    const shape = blob(p, s, s * 0.8, rng, 0.3, 12, rng() * TAU);
    d.pen.fill(shape, colour, alpha);
    d.pen.crescent(shape, pt(-SHADOW.x * s * 0.4, -SHADOW.y * s * 0.4), () => d.pen.fill(shape, PEAT_DARK, 0.3));
  }
  const heads = Array.from({ length: 500 }, () => {
    const p = polar(c, rng() * TAU, r + 1 + rng() * 15);
    return [p.x, p.y, 0.4 + rng() * 0.5] as const;
  });
  dots(d, heads.slice(0, 300), MOSS_LIT, 0.55);
  dots(d, heads.slice(300), SPHAGNUM_RED, 0.5);
}

/** The pool for a level's water zone (r round c). */
export function peatPool(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  rim(d, c, r, rng);
  const water = blob(c, r + 1, r, rng, 0.05, 48, rng() * TAU);
  pen.fill(water, WATER, 0.94);
  pen.clipped(water, () => {
    // Peat-brown shallows round the edge, black in the deep middle.
    const deep = ctx.createRadialGradient(c.x + r * 0.1, c.y + r * 0.1, r * 0.2, c.x, c.y, r * 1.05);
    deep.addColorStop(0, rgba('#141210', 0.35));
    deep.addColorStop(0.75, rgba('#2a2018', 0.1));
    deep.addColorStop(1, rgba('#6b4a2e', 0.45));
    ctx.fillStyle = deep;
    ctx.fillRect(c.x - r - 4, c.y - r - 4, r * 2 + 8, r * 2 + 8);
    const sky = ctx.createLinearGradient(c.x - r, c.y - r, c.x + r * 0.6, c.y + r * 0.8);
    sky.addColorStop(0, rgba(WATER_SKY, 0.32));
    sky.addColorStop(0.5, rgba(WATER_SKY, 0.2));
    sky.addColorStop(1, rgba(WATER_SKY, 0.12));
    ctx.fillStyle = sky;
    ctx.fillRect(c.x - r - 4, c.y - r - 4, r * 2 + 8, r * 2 + 8);
    // A bright cloud lying on the water.
    for (let i = 0; i < 5; i++) pen.fill(blob(pt(c.x - r * 0.25 + (rng() - 0.5) * 10, c.y - r * 0.2 + (rng() - 0.5) * 6), r * (0.2 + rng() * 0.2), r * (0.08 + rng() * 0.08), rng, 0.4, 18, -0.3), PAPER_FILL, 0.05);
    // The bank's shade on the water along the upper-left shore.
    pen.crescent(water, pt(SHADOW.x * 9, SHADOW.y * 9), () => pen.fill(water, PEAT_DARK, 0.55));
    // Rings where something rose, and the dragged lines of a breeze.
    for (let i = 0; i < 3; i++) {
      const p = polar(c, rng() * TAU, rng() * r * 0.55);
      for (const k of [1, 1.8, 2.7]) pen.hair(closed(oval(p.x, p.y, 3.2 * k, 2.2 * k, 18)), 0.35, PAPER_FILL, 0.5 / k);
    }
    for (let i = 0; i < 7; i++) {
      const p = pt(c.x + (rng() - 0.5) * r * 1.3, c.y + (rng() - 0.3) * r * 1.2);
      const l = 8 + rng() * 18;
      pen.hair([p, pt(p.x + l * 0.5, p.y - 0.6), pt(p.x + l, p.y + 0.3)], 0.4, WATER_SKY, 0.4);
    }
  });
  pen.stroke(closed(water), 1.3, d.ink, 0.75);
  pen.hair(closed(water.map((p) => pt(p.x + SHADOW.x * 1.5, p.y + SHADOW.y * 1.5))), 0.5, PAPER_FILL, 0.3);
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU;
    tuft(d, polar(c, a, r + 4 + rng() * 9), 9 + rng() * 6, rng() < 0.45, rng);
  }
}
