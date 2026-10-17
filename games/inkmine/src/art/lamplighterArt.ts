import { capsule, edge, oval, pt, type Draw } from './kit';
import { dab, gleam, glow, mix, paint, SHADOW } from './paint';
import type { Pt } from './pen';
import { part, rivets, roundRect, seam, sheen } from './prospector/parts';

/**
 * The Lamplighters (spec, "The Lamplighters"): Graphite's only people, who
 * came to mine it as you did. Tall, thin and slow, in sealed suits of
 * layered cloth, each carrying a lantern, as their home world is dark.
 * Drawn in blue, as they're never a danger. Their outpost on the crater's
 * far rim: a handful of domes of stitched cloth over ribs, and a lantern
 * mast.
 *
 * Both are drawn with the origin at the middle of their footing (y = 0 is
 * the ground), in units of world px.
 */
export const LAMPLIGHTER = { w: 56, h: 86 } as const;
export const OUTPOST_ART = { w: 260, h: 176 } as const;

const CLOTH = ['#56707f', '#6d8492', '#47606e'] as const;
const WRAP = '#b9a98a';
const VISOR = '#1c2134';
const BRASS = '#b48a45';
const FLAME = '#ffd36b';
const DOME = ['#8c9aa3', '#a3a99a', '#7d8f99'] as const;

/** A band of layered cloth across the body, from y0 down to y1, its width tapering from w0 to w1. */
function band(d: Draw, y0: number, y1: number, w0: number, w1: number, color: string, lean: number): void {
  const shape = [pt(-w0 / 2 + lean, y0), pt(w0 / 2 + lean, y0 + 0.8), pt(w1 / 2, y1), pt(-w1 / 2, y1 + 0.6)];
  part(d, shape, color, { shadow: 0.55, line: 0.7 });
  // The hem's stitching.
  d.pen.hair([pt(-w1 / 2 + 1, y1 - 1.2), pt(w1 / 2 - 1, y1 - 0.8)], 0.4, mix(color, SHADOW, 0.5), 0.7);
}

/** The lantern on its pole: a brass cage round a flame, its light pooled round it. */
function lantern(d: Draw, at: Pt, sway: number): void {
  const top = pt(at.x + sway, at.y);
  d.pen.stroke([pt(at.x, at.y - 9), top], 0.8, d.ink, 0.9, false);
  glow(d.pen.ctx, pt(top.x, top.y + 6), 22, FLAME, 0.45);
  const cage = roundRect(top.x - 4, top.y + 1, top.x + 4, top.y + 11, 1.4);
  part(d, cage, '#fff0c0', { shadow: 0.1, line: 0, hatch: 0, alpha: 1 });
  glow(d.pen.ctx, pt(top.x, top.y + 6), 6, FLAME, 0.9);
  for (const x of [-4, 0, 4]) d.pen.stroke([pt(top.x + x, top.y + 1), pt(top.x + x * 0.9, top.y + 11)], 0.7, BRASS, 1, false);
  edge(d, cage, 0.7);
  part(d, [pt(top.x - 5, top.y + 1.4), pt(top.x, top.y - 2), pt(top.x + 5, top.y + 1.4)], BRASS, { shadow: 0.3, line: 0.6, hatch: 0, gloss: true });
  part(d, roundRect(top.x - 4.6, top.y + 10.6, top.x + 4.6, top.y + 12.6, 0.6), BRASS, { shadow: 0.3, line: 0.6, hatch: 0, gloss: true });
}

/**
 * A Lamplighter standing, facing left (towards whoever comes), the lantern
 * held out on a crook. `d.f` sways it a little: they're never quite still.
 */
export function drawLamplighter(d: Draw): void {
  const sway = [0, 0.6, -0.4][d.f]!;
  // Legs: long and thin, wrapped.
  for (const [x, far] of [[4, true], [-3, false]] as const) {
    const leg = capsule(pt(x, -30), pt(x + (far ? 1 : -1), -2), 4.4, 3.6);
    part(d, leg, far ? mix(CLOTH[2], SHADOW, 0.25) : CLOTH[2], { shadow: 0.5, line: 0.6 });
    for (let y = -26; y < -4; y += 4) d.pen.hair([pt(x - 2, y), pt(x + 2, y + 1.4)], 0.4, mix(WRAP, SHADOW, 0.3), 0.8);
    part(d, roundRect(x - 3.6 + (far ? 1 : -1), -3, x + 4 + (far ? 1 : -1), 0, 1), '#3b4652', { shadow: 0.3, line: 0.6, hatch: 0 });
  }
  // The body: three layers of cloth, each overlapping the one below, long and narrow.
  band(d, -40, -24, 15, 19, CLOTH[0], 0);
  band(d, -54, -37, 13, 16, CLOTH[1], 0.4);
  band(d, -64, -51, 12, 14, CLOTH[0], 0.6);
  // A wrap across the chest, and the pack of lamp oil on the back.
  part(d, [pt(-7, -60), pt(-4, -61), pt(7, -44), pt(4, -43)], WRAP, { shadow: 0.35, line: 0.5, hatch: 0 });
  part(d, roundRect(6, -58, 12, -42, 2), mix(BRASS, SHADOW, 0.2), { shadow: 0.5, line: 0.6 });
  rivets(d, [pt(9, -54), pt(9, -46)], 0.5);
  // The far arm, down; the near arm out holding the crook.
  part(d, capsule(pt(5, -60), pt(8, -36), 3.4, 3), mix(CLOTH[1], SHADOW, 0.25), { shadow: 0.4, line: 0.55 });
  part(d, capsule(pt(-5, -60), pt(-15, -48), 3.6, 3), CLOTH[1], { shadow: 0.45, line: 0.6 });
  part(d, oval(-16, -47.5, 2.4, 2.2, 10), '#3b4652', { shadow: 0.3, line: 0.5, hatch: 0 });
  // The crook: a staff from the hand, bent over at the top, the lantern hanging off it.
  d.pen.stroke([pt(-17, -2), pt(-16.4, -48), pt(-17, -74), pt(-22, -78), pt(-26, -75)], 1.3, d.ink, 0.95, false);
  d.pen.stroke([pt(-16.6, -10), pt(-16.2, -48), pt(-16.8, -72)], 0.5, '#d9c8a6', 0.7, false);
  lantern(d, pt(-26, -72), sway);
  // The head: a tall hood of the same cloth over a dark, smooth visor, two faint lights behind it.
  const hood = [pt(-6, -64), pt(-7.4, -74), pt(-3, -84), pt(4, -83), pt(7.6, -74), pt(6.4, -64)];
  part(d, hood, CLOTH[1], { shadow: 0.5, line: 0.75 });
  const visor = [pt(-5.6, -72), pt(-3.6, -79), pt(2, -79.4), pt(3.4, -73), pt(-0.6, -69.6)];
  paint(d, visor, VISOR, { alpha: 1, shadow: 0.2, hatch: 0, line: 0.6, gloss: true });
  glow(d.pen.ctx, pt(-1.6, -75), 4, '#9fd7ff', 0.55);
  for (const x of [-3.2, 0.2]) d.pen.dot(x, -75.4, 0.75, '#cfeeff', 0.95);
  gleam(d, [pt(-4.2, -76.6), pt(-2.6, -78.4)], 0.6, 0.8);
  seam(d, [pt(-6.4, -66), pt(6.2, -66)], 0.5);
  sheen(d, [pt(-6, -70), pt(-5, -78)], 0.6);
}

/** One dome of stitched cloth over ribs, `r` across its base, with a round door or a vent. */
function dome(d: Draw, cx: number, r: number, h: number, color: string, door: boolean): void {
  const shape: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI * (i / 18);
    shape.push(pt(cx - Math.cos(a) * r, -Math.sin(a) * h));
  }
  part(d, shape, color, { shadow: 0.6, line: 0.9 });
  // The ribs, and the cloth's seams between them.
  for (const k of [-0.6, -0.2, 0.2, 0.6]) {
    const rib: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = -h * Math.sin((Math.PI / 2) * t);
      rib.push(pt(cx + k * r * Math.cos((Math.PI / 2) * t), y));
    }
    d.pen.stroke(rib.reverse(), 0.6, mix(color, SHADOW, 0.55), 0.8, false);
  }
  part(d, roundRect(cx - r - 1, -3, cx + r + 1, 0, 0.8), '#5b5550', { shadow: 0.3, line: 0.6, hatch: 0 });
  if (door) {
    const dw = Math.min(9, r * 0.32);
    const doorShape: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      doorShape.push(pt(cx - Math.cos(a) * dw, -3 - Math.sin(a) * dw * 1.6));
    }
    doorShape.push(pt(cx + dw, -3), pt(cx - dw, -3));
    paint(d, doorShape, '#2b2a33', { alpha: 1, shadow: 0, hatch: 0, line: 0.7 });
    glow(d.pen.ctx, pt(cx, -3 - dw * 0.6), dw * 1.6, FLAME, 0.4);
  } else {
    part(d, oval(cx + r * 0.2, -h * 0.62, 3, 2, 10), '#3b3a44', { shadow: 0.2, line: 0.5, hatch: 0 });
  }
  sheen(d, [pt(cx - r * 0.7, -h * 0.4), pt(cx - r * 0.35, -h * 0.82)], 0.9);
}

/** A cord strung between two points, sagging, with knot-words tied along it (their writing). */
function knotCord(d: Draw, a: Pt, b: Pt, knots: number): void {
  const mid = pt((a.x + b.x) / 2, (a.y + b.y) / 2 + 9);
  const at = (t: number): Pt => pt((1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x, (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y);
  d.pen.stroke(Array.from({ length: 13 }, (_, i) => at(i / 12)), 0.6, d.ink, 0.85, false);
  for (let k = 1; k <= knots; k++) {
    const p = at(k / (knots + 1));
    edge(d, oval(p.x, p.y + 1.6, 1.4 + (k % 2) * 0.6, 1.8, 8), 0.6, 0.9);
    d.pen.stroke([pt(p.x, p.y + 3), pt(p.x + (k % 2 ? 1 : -1), p.y + 6)], 0.5, d.ink, 0.8, false);
  }
}

/**
 * The outpost: three domes on the rim, the middle one biggest with its door
 * lit, a lantern mast standing over them, and knot-cords strung from it.
 */
export function drawOutpost(d: Draw): void {
  const { ctx } = d.pen;
  ctx.save();
  // The mast first, behind the domes: a tall pole guyed down, a lantern at its head.
  const mastX = 34;
  const mast = capsule(pt(mastX, 0), pt(mastX + 1, -150), 3, 2);
  part(d, mast, '#6b6660', { shadow: 0.5, line: 0.7, hatch: 0 });
  for (const gx of [-30, 80]) d.pen.hair([pt(mastX + 1, -130), pt(gx, -2)], 0.5, d.ink, 0.6);
  glow(ctx, pt(mastX + 1, -158), 34, FLAME, 0.35);
  lantern(d, pt(mastX + 1, -164), 0);
  knotCord(d, pt(mastX + 1, -140), pt(-96, -46), 5);
  knotCord(d, pt(mastX + 1, -140), pt(104, -40), 4);
  dome(d, -86, 34, 46, DOME[2], false);
  dome(d, 92, 30, 40, DOME[1], false);
  dome(d, 6, 52, 70, DOME[0], true);
  // Crates of ore by the door: they're miners too.
  for (const [x, w] of [[64, 16], [78, 12]] as const) {
    part(d, roundRect(x - w / 2, -w, x + w / 2, 0, 1), '#8d7a5c', { shadow: 0.5, line: 0.7 });
    d.pen.hair([pt(x - w / 2, -w), pt(x + w / 2, 0)], 0.5, d.ink, 0.5);
  }
  for (const [x, c] of [[61, '#c9d1dc'], [66, '#c9d1dc']] as const) paint(d, oval(x, -17.4, 2.6, 1.6, 10), c, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5 });
  dab(d, oval(0, 1, 130, 4, 24), SHADOW, 0.12, 2);
  ctx.restore();
}
