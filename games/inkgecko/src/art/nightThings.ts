import type { Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, TAU } from './kit';
import { nightBloom } from './nightFlora';
import { BOX, BOX_DEEP, BOX_LIT, type Clump, clumps, glow, MOON, MOONSTONE, MOONSTONE_DEEP, NIGHT_SKY, PETAL, WATER } from './nightKit';
import { drawGardenLantern } from './nightLantern';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The night garden's things, seen from above under the moon: the round
 * reflecting pool with the moon in it, a moon-dial on its plinth, stone
 * urns spilling white flowers, clipped box balls, and little lanterns
 * glowing along the edges. Board coordinates.
 */
const BRONZE = '#7d7a68';
const LILY_PAD = '#2d4a3a';

/** A dressed stone in a ring between radii r0 and r1, from angle a0 to a1. */
function ringStone(c: Pt, r0: number, r1: number, a0: number, a1: number): Pt[] {
  const n = Math.max(3, Math.ceil(((a1 - a0) * r1) / 6));
  const outer = Array.from({ length: n + 1 }, (_, i) => polar(c, a0 + ((a1 - a0) * i) / n, r1));
  const inner = Array.from({ length: n + 1 }, (_, i) => polar(c, a1 - ((a1 - a0) * i) / n, r0));
  return [...outer, ...inner];
}

/** A ring of coping stones round c, r0 to r1, each a little different, lit from the upper left. */
function coping(d: Draw, c: Pt, r0: number, r1: number, rng: Rng): void {
  const { pen } = d;
  const n = Math.max(8, Math.round((TAU * r1) / 30));
  const gap = 1.2 / r1;
  const ring = [...oval(c.x, c.y, r1, r1, 64)];
  castShadow(d, ring, 6, 0.3, NIGHT_SKY);
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * TAU + gap;
    const a1 = ((k + 1) / n) * TAU - gap;
    const s = ringStone(c, r0, r1, a0, a1);
    body(d, s, mix(MOONSTONE, MOONSTONE_DEEP, rng() * 0.35), 0.9);
    // Lit on the side facing the moon, dark facing away.
    const mid = (a0 + a1) / 2;
    const facing = -(Math.cos(mid) * SHADOW.x + Math.sin(mid) * SHADOW.y);
    pen.fill(s, facing > 0 ? MOON : MOONSTONE_DEEP, Math.abs(facing) * 0.3);
    pen.stipple(s, 18, () => 0.6, 0.4, MOONSTONE_DEEP);
    pen.stroke(closed(s), 0.8, d.ink, 0.85, false);
  }
}

/**
 * The round reflecting pool, radius r (water) at c, often hanging off the
 * board: a ring of coping, still dark water holding the moon and a few
 * stars, lily pads with a white water lily opened for the night.
 */
export function reflectingPool(d: Draw, c: Pt, r: number, moonAt: Pt, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const water = oval(c.x, c.y, r, r, 72);
  coping(d, c, r - 1, r + 15, rng);
  pen.fill(water, WATER, 1);
  pen.clipped(water, () => {
    // The sky in the water: lighter towards the moon's reflection.
    const g = ctx.createRadialGradient(moonAt.x, moonAt.y, 4, moonAt.x, moonAt.y, r * 1.4);
    g.addColorStop(0, rgba('#5b6f96', 0.9));
    g.addColorStop(0.4, rgba('#2a3a5e', 0.6));
    g.addColorStop(1, rgba(WATER, 0));
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    // The coping's shadow on the water under the rim towards the moon.
    pen.crescent(water, pt(SHADOW.x * 9, SHADOW.y * 9), () => pen.fill(water, '#060a14', 0.45));
    // The moon: a pale disc, its halo, broken by slow ripples.
    const mr = Math.max(9, r * 0.11);
    const halo = ctx.createRadialGradient(moonAt.x, moonAt.y, mr * 0.8, moonAt.x, moonAt.y, mr * 4);
    halo.addColorStop(0, rgba(MOON, 0.35));
    halo.addColorStop(1, rgba(MOON, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(moonAt.x - mr * 4, moonAt.y - mr * 4, mr * 8, mr * 8);
    pen.fill(oval(moonAt.x, moonAt.y, mr, mr, 28), MOON, 0.95);
    pen.fill(oval(moonAt.x + mr * 0.3, moonAt.y - mr * 0.1, mr * 0.25, mr * 0.2, 10), '#c9d3e6', 0.6);
    pen.fill(oval(moonAt.x - mr * 0.35, moonAt.y + mr * 0.35, mr * 0.18, mr * 0.15, 10), '#c9d3e6', 0.5);
    for (let k = -3; k <= 3; k++) {
      const y = moonAt.y + k * mr * 0.55;
      const half = mr * (1.6 - Math.abs(k) * 0.12) + rng() * 4;
      pen.hair([pt(moonAt.x - half, y), pt(moonAt.x - half * 0.3, y + 0.5)], 0.7, k % 2 === 0 ? MOON : WATER, 0.7);
      pen.hair([pt(moonAt.x + half * 0.2, y + 0.3), pt(moonAt.x + half, y)], 0.7, k % 2 === 0 ? MOON : WATER, 0.6);
    }
    // Stars, and rings where something touched the water.
    for (let k = 0; k < 14; k++) pen.dot(c.x + (rng() - 0.5) * r * 1.8, c.y + (rng() - 0.5) * r * 1.8, 0.5 + rng() * 0.5, MOON, 0.5 + rng() * 0.4);
    const rip = polar(c, rng() * TAU, r * 0.5);
    for (const k of [6, 11, 17]) pen.hair(closed(oval(rip.x, rip.y, k, k * 0.92, 24)).slice(0, 16), 0.5, '#8fa2c4', 0.45 - k * 0.015);
    // Lily pads, one carrying a water lily open for the night.
    for (let k = 0; k < 4; k++) {
      const p = polar(c, rng() * TAU, r * (0.45 + rng() * 0.4));
      if (Math.hypot(p.x - moonAt.x, p.y - moonAt.y) < r * 0.3) continue;
      const pr = 9 + rng() * 6;
      const turn = rng() * TAU;
      const pad = Array.from({ length: 22 }, (_, i) => polar(p, turn + 0.25 + (i / 21) * (TAU - 0.5), pr)).concat([p]);
      castShadow(d, pad, 1.5, 0.35, '#05080f');
      pen.fill(pad, LILY_PAD, 0.95);
      pen.crescent(pad, pt(-1.6, -2.4), () => pen.fill(pad, '#16261f', 0.5));
      pen.fill(pad.slice(0, 8).concat([p]), '#6f8f86', 0.25);
      for (let v = 0; v < 5; v++) pen.hair([p, polar(p, turn + 0.6 + v * 1.1, pr * 0.85)], 0.35, '#7d9b90', 0.4);
      pen.hair(closed(pad), 0.5, d.ink, 0.7);
      if (k === 0) {
        const lc = polar(p, turn + Math.PI, pr * 0.3);
        for (let j = 0; j < 10; j++) {
          const a = j * 0.63 + turn;
          const petal = [polar(lc, a - 0.25, 2), polar(lc, a, 7.5), polar(lc, a + 0.25, 2)];
          pen.fill(petal, PETAL, 0.95);
          pen.hair(closed(petal), 0.3, d.ink, 0.4);
        }
        pen.fill(oval(lc.x, lc.y, 2.2, 2.2, 10), '#e8d57a', 0.95);
      }
    }
  });
  pen.stroke(closed(water), 1.2, d.ink, 0.9);
}

/**
 * A moon-dial at c: a sundial on a round pedestal that tells the hours by
 * moonlight, its bronze plate ringed with hour marks, a crescent at its
 * heart, the gnomon's moon-shadow thrown down and to the right.
 */
export function moonDial(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const turn = Math.PI / 8 + (rng() - 0.5) * 0.4;
  const step = Array.from({ length: 8 }, (_, i) => polar(c, (i / 8) * TAU + turn, 27));
  castShadow(d, step, 7, 0.35, NIGHT_SKY);
  body(d, step, MOONSTONE, 0.85);
  pen.crescent(step, pt(-2.5, -3.8), () => pen.fill(step, MOONSTONE_DEEP, 0.6));
  pen.stipple(step, 60, () => 0.6, 0.45, MOONSTONE_DEEP);
  pen.stroke(outline(step, 5), 1, d.ink, 0.9, false);
  const ped = oval(c.x, c.y, 18, 18, 36);
  castShadow(d, ped, 5, 0.35, NIGHT_SKY);
  body(d, ped, mix(MOONSTONE, MOON, 0.25), 0.9);
  pen.crescent(ped, pt(-2.5, -3.8), () => pen.fill(ped, MOONSTONE_DEEP, 0.55));
  pen.stroke(closed(ped), 1, d.ink, 0.9);
  const plate = oval(c.x, c.y, 14, 14, 36);
  body(d, plate, BRONZE, 0.85);
  pen.fill(oval(c.x - 4, c.y - 5, 8, 6, 16), '#c8ccc0', 0.25);
  for (let k = 0; k < 12; k++) {
    const a = -Math.PI / 2 + (k / 12) * TAU;
    pen.hair([polar(c, a, 10.5), polar(c, a, k % 3 === 0 ? 13.2 : 12.4)], k % 3 === 0 ? 0.7 : 0.45, d.ink, 0.8);
  }
  pen.hair(closed(oval(c.x, c.y, 10, 10, 30)), 0.4, d.ink, 0.6);
  // A crescent moon engraved at the heart.
  const outer = Array.from({ length: 12 }, (_, i) => polar(c, 0.6 + (i / 11) * Math.PI * 1.25, 4.2));
  const inner = Array.from({ length: 12 }, (_, i) => polar(pt(c.x + 1.4, c.y - 1), 0.6 + Math.PI * 1.25 - (i / 11) * Math.PI * 1.25, 3.3));
  pen.fill([...outer, ...inner], '#e6e2c8', 0.75);
  // The gnomon, standing up to the north, and its moon-shadow.
  const base = pt(c.x, c.y + 1);
  const tip = pt(c.x, c.y - 12);
  pen.fill([base, pt(tip.x + SHADOW.x * 10, tip.y + SHADOW.y * 10), pt(base.x + 1.5, base.y)], '#0c1018', 0.45);
  pen.fill([pt(base.x - 1.7, base.y), tip, pt(base.x + 1.7, base.y)], mix(BRONZE, d.ink, 0.35), 1);
  pen.hair([pt(base.x - 0.8, base.y), tip], 0.7, MOON, 0.85);
  pen.stroke(closed(plate), 0.9, d.ink, 0.9);
}

/** A stone urn at c, rim radius r, on a square plinth, with white flowers and ivy spilling over. */
export function urn(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const s = r * 1.25;
  const plinth = outline([pt(c.x - s, c.y - s), pt(c.x + s, c.y - s), pt(c.x + s, c.y + s), pt(c.x - s, c.y + s)], 5);
  castShadow(d, plinth, 9, 0.35, NIGHT_SKY);
  body(d, plinth, MOONSTONE, 0.85);
  pen.crescent(plinth, pt(-3, -4.5), () => pen.fill(plinth, MOONSTONE_DEEP, 0.6));
  pen.stipple(plinth, 40, () => 0.6, 0.45, MOONSTONE_DEEP);
  pen.stroke(closed(plinth), 0.9, d.ink, 0.9, false);
  const bowl = oval(c.x, c.y, r, r, 36);
  castShadow(d, bowl, 6, 0.35, NIGHT_SKY);
  body(d, bowl, mix(MOONSTONE, MOON, 0.2), 0.9);
  pen.crescent(bowl, pt(-SHADOW.x * r * 0.35, -SHADOW.y * r * 0.35), () => pen.hatch(bowl, 1.8, 0.9, 0.4, { color: d.ink, alpha: 0.45 }));
  pen.stroke(closed(bowl), 1, d.ink, 0.9);
  // Planted up: a mound of leaves over the rim, ivy trailing out, white flowers open on top.
  for (let k = 0; k < 3; k++) {
    const a = rng() * TAU;
    const from = polar(c, a, r * 0.5);
    const to = polar(c, a + 0.4, r * 1.5 + rng() * r * 0.5);
    pen.hair([from, polar(c, a + 0.2, r * 1.05), to], 0.6, '#5f7f70', 0.8);
    for (let j = 1; j <= 3; j++) {
      const leaf = blob(polar(c, a + 0.13 * j, r * (0.75 + j * 0.25)), 2.4, 1.8, rng, 0.2, 10, a);
      pen.fill(leaf, '#3d5e4c', 0.9);
      pen.hair(closed(leaf), 0.3, d.ink, 0.5);
    }
  }
  const mound: Clump[] = [{ x: c.x, y: c.y, r: r * 0.62 }];
  for (let k = 0; k < 6; k++) {
    const p = polar(c, (k / 6) * TAU + rng() * 0.4, r * 0.5);
    mound.push({ x: p.x, y: p.y, r: r * (0.32 + rng() * 0.1) });
  }
  clumps(d, mound, { lift: 2, deep: '#13201b', mid: '#2b4537', lit: '#7a9a8a', ticks: 4 }, rng);
  const kind = rng() < 0.5 ? 'rose' : 'moonflower';
  for (let k = 0; k < 4; k++) nightBloom(d, kind, polar(c, rng() * TAU, r * (0.2 + rng() * 0.45)), r * 0.32, rng);
}

/** A clipped box ball at c, radius r: a lumpy dome of clumps. */
export function boxBall(d: Draw, c: Pt, r: number, rng: Rng): void {
  const cs: Clump[] = [{ x: c.x, y: c.y, r }];
  for (let k = 0; k < 7; k++) {
    const p = polar(c, (k / 7) * TAU + rng() * 0.5, r * 0.5);
    cs.push({ x: p.x, y: p.y, r: r * (0.5 + rng() * 0.12) });
  }
  clumps(d, cs, { lift: r * 0.75, deep: BOX_DEEP, mid: BOX, lit: BOX_LIT, ticks: 12 }, rng);
}

/** A garden lantern on its block at c, scale k, its warm light on the ground round it. */
export function groundLantern(d: Draw, c: Pt, k: number): void {
  const { ctx } = d.pen;
  glow(ctx, c, 70 * k, 0.32);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(k, k);
  drawGardenLantern(d, true);
  ctx.restore();
}

/** Dew on the grass: a few hard glints, a cross of light on each. */
export function dewGlints(ctx: CanvasRenderingContext2D, ps: readonly Pt[]): void {
  ctx.save();
  ctx.strokeStyle = rgba(PAPER_FILL, 0.6);
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  for (const p of ps) {
    ctx.moveTo(p.x - 2.2, p.y);
    ctx.lineTo(p.x + 2.2, p.y);
    ctx.moveTo(p.x, p.y - 2.2);
    ctx.lineTo(p.x, p.y + 2.2);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(PAPER_FILL, 0.9);
  ctx.beginPath();
  for (const p of ps) {
    ctx.moveTo(p.x + 0.8, p.y);
    ctx.arc(p.x, p.y, 0.8, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}
