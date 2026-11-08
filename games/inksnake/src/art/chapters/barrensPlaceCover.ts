import type { Rng } from '../../logic/rng';
import type { CoverDef } from '../../level/types';
import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { frond } from './barrensPlaceFrond';
import { rngAt } from './barrensPlaceKit';

/**
 * The Pine Barrens' cover, painted on the layer over the snake: a clump of
 * lowbush blueberry (small oval leaves on wiry twigs, many reddening for
 * autumn, dusty blue berries) and a stand of bracken (broad flat fronds
 * overlapping, some going bronze). Each stays inside about r × 1.15 of its
 * centre, opaque, its edge leafy and irregular, lit from the upper left
 * with the shade on the lower right.
 */
const REACH = 1.15;

const LEAF_GREEN = '#5d8743';
const LEAF_DEEP = '#36572f';
const LEAF_LIT = '#a3c264';
const LEAF_RED = '#a8483a';
const LEAF_CRIMSON = '#7a3432';
const LEAF_ORANGE = '#c27e48';
const BERRY = '#3d5590';
const BERRY_DUSTY = '#7183b4';
const BERRY_BLOOM = '#b9c4dc';
const TWIG = '#7a3f2c';

/** A blueberry leaf's outline: a small pointed oval from its stalk at p towards a, `l` long. */
function leafPath(ctx: CanvasRenderingContext2D, p: Pt, a: number, l: number, w: number): void {
  const tip = polar(p, a, l);
  const mid = polar(p, a, l * 0.45);
  const n = pt(-Math.sin(a), Math.cos(a));
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo(mid.x + n.x * w, mid.y + n.y * w, tip.x, tip.y);
  ctx.quadraticCurveTo(mid.x - n.x * w, mid.y - n.y * w, p.x, p.y);
}

interface Leaf {
  readonly p: Pt;
  readonly a: number;
  readonly l: number;
  readonly w: number;
  readonly colour: string;
}

/** One layer of leaves: their shadows on what's under, then each leaf, its shaded half, its midrib, the outlines. */
function leafLayer(d: Draw, leaves: readonly Leaf[], lift: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = rgba(d.ink, 0.22);
  ctx.beginPath();
  for (const f of leaves) leafPath(ctx, pt(f.p.x + SHADOW.x * lift, f.p.y + SHADOW.y * lift), f.a, f.l, f.w);
  ctx.fill();
  for (const f of leaves) {
    ctx.fillStyle = f.colour;
    ctx.beginPath();
    leafPath(ctx, f.p, f.a, f.l, f.w);
    ctx.fill();
    // The half turned from the light a shade deeper.
    const n = pt(-Math.sin(f.a), Math.cos(f.a));
    const away = n.x * SHADOW.x + n.y * SHADOW.y > 0 ? 1 : -1;
    const tip = polar(f.p, f.a, f.l);
    const mid = polar(f.p, f.a, f.l * 0.45);
    ctx.fillStyle = rgba(mix(f.colour, '#1a1a24', 0.5), 0.4);
    ctx.beginPath();
    ctx.moveTo(f.p.x, f.p.y);
    ctx.quadraticCurveTo(mid.x + n.x * f.w * away, mid.y + n.y * f.w * away, tip.x, tip.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 0.4;
  ctx.strokeStyle = rgba(PAPER_FILL, 0.45);
  ctx.beginPath();
  for (const f of leaves) {
    const tip = polar(f.p, f.a, f.l * 0.85);
    ctx.moveTo(f.p.x, f.p.y);
    ctx.lineTo(tip.x, tip.y);
  }
  ctx.stroke();
  ctx.lineWidth = 0.45;
  ctx.strokeStyle = rgba(d.ink, 0.6);
  ctx.beginPath();
  for (const f of leaves) leafPath(ctx, f.p, f.a, f.l, f.w);
  ctx.stroke();
  ctx.restore();
}

/** A blueberry: dusty blue with its bloom, a dark crown at the top, a glint. */
function berry(d: Draw, p: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = oval(p.x, p.y, r, r, 12);
  castShadow(d, shape, r * 0.7, 0.32);
  const ripe = rng() < 0.92;
  body(d, shape, ripe ? mix(BERRY, BERRY_DUSTY, rng() * 0.5) : mix('#9aa86a', '#c07a8a', rng()), 0.95);
  pen.fill(oval(p.x - r * 0.25, p.y - r * 0.3, r * 0.6, r * 0.5, 10), ripe ? BERRY_BLOOM : PAPER_FILL, 0.45);
  pen.crescent(shape, pt(-SHADOW.x * r * 0.5, -SHADOW.y * r * 0.5), () => pen.fill(shape, '#1c2448', 0.45));
  const crown = polar(p, rng() * TAU, r * 0.2);
  for (let k = 0; k < 5; k++) pen.hair([crown, polar(crown, (k / 5) * TAU, r * 0.35)], 0.4, '#1c2034', 0.8);
  pen.dot(p.x - r * 0.4, p.y - r * 0.45, r * 0.18, PAPER_FILL, 0.85);
  pen.hair(closed(shape), 0.4, d.ink, 0.75);
}

/**
 * A clump of lowbush blueberry: a dark tangle under it so nothing shows
 * through, wiry red twigs, three layers of small leaves (deep ones under,
 * lit ones on top, more reddened towards the clump's edge), the berries in
 * little bunches, the whole clump shaded down-right.
 */
function blueberryClump(d: Draw, c: CoverDef, rng: Rng): void {
  const { pen } = d;
  const r = c.r;
  const centre = pt(c.x, c.y);
  const mass = blob(centre, r * 0.82, r * 0.78, rng, 0.2, 30);
  castShadow(d, mass, r * 0.16, 0.24);
  body(d, mass, mix('#3c5030', '#5a2c24', 0.35), 0.92);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU + rng() * 0.4;
    const line = arc(polar(centre, a, r * 0.1), polar(centre, a + (rng() - 0.5) * 0.4, r * (0.7 + rng() * 0.35)), (rng() - 0.5) * r * 0.3, 8);
    pen.hair(line, 1.1, mix(TWIG, '#4a5a2a', rng() * 0.4), 0.85);
  }
  const red = 0.3 + rng() * 0.35;
  const reds = [LEAF_RED, LEAF_CRIMSON, LEAF_ORANGE] as const;
  // Autumn takes whole sprigs at a time: `turn` is how far this sprig has reddened, and in which red.
  let turn = 0;
  let rd: string = LEAF_RED;
  const newSprig = (outer: number): void => {
    turn = rng() < red * (0.4 + outer * 0.6) ? 0.55 + rng() * 0.4 : rng() * 0.12;
    rd = reds[Math.floor(rng() * reds.length)]!;
  };
  const tone = (_outer: number, lit: number): string => {
    const g = mix(mix(LEAF_DEEP, LEAF_GREEN, 0.4 + lit * 0.6), LEAF_LIT, lit * lit * 0.6);
    const k = Math.max(0, Math.min(1, turn + (rng() - 0.5) * 0.25));
    return mix(g, mix(mix(rd, LEAF_CRIMSON, (1 - lit) * 0.5), PAPER_FILL, lit * 0.12), k);
  };
  const fits = (p: Pt, la: number, l: number): boolean => Math.hypot(p.x + Math.cos(la) * l - c.x, p.y + Math.sin(la) * l - c.y) < r * (REACH - 0.04);
  const litAt = (p: Pt, dark: number): number => {
    const facing = Math.max(0, -((p.x - c.x) * SHADOW.x + (p.y - c.y) * SHADOW.y) / r);
    return Math.max(0, Math.min(1, 0.35 + facing * 0.6 - dark + (rng() - 0.5) * 0.3));
  };
  // A filler of deep leaves through the tangle, so nothing shows through.
  const filler: Leaf[] = [];
  newSprig(0);
  for (let k = 0; k < 160; k++) {
    const p = polar(centre, rng() * TAU, r * Math.sqrt(rng()) * 0.92);
    const la = rng() * TAU;
    const l = 7 + rng() * 3;
    if (fits(p, la, l)) filler.push({ p, a: la, l, w: l * 0.5, colour: tone(Math.hypot(p.x - c.x, p.y - c.y) / r, litAt(p, 0.5)) });
  }
  leafLayer(d, filler, 1);
  // Sprigs: a twig out from the root with leaves alternating along it, three tiers, the top tier lit.
  const tiers: readonly (readonly [number, number, number, number, number])[] = [
    // sprigs, from, to (share of r), darkness, shadow lift
    [18, 0.15, 1.02, 0.3, 1.3],
    [15, 0.05, 0.86, 0.12, 1.7],
    [11, 0, 0.66, 0, 2],
  ];
  for (const [count, from, to, dark, lift] of tiers) {
    const leaves: Leaf[] = [];
    const ph = rng() * TAU;
    for (let k = 0; k < count; k++) {
      const a = ph + ((k + (rng() - 0.5) * 0.6) / count) * TAU;
      newSprig(to);
      // Short sprigs anywhere in the clump, leaning roughly outwards.
      const base = polar(centre, a + (rng() - 0.5), r * Math.max(from, (to - 0.3) * Math.sqrt(rng())));
      const reachTo = Math.min(r * (to - 0.06), Math.hypot(base.x - c.x, base.y - c.y) + r * (0.25 + rng() * 0.2));
      const tip = polar(centre, a + (rng() - 0.5) * 0.9, reachTo);
      const twig = arc(base, tip, (rng() - 0.5) * r * 0.15, 6);
      pen.hair(twig, 1, mix(TWIG, '#5a4a2a', rng() * 0.4), 0.9);
      const dir = Math.atan2(tip.y - base.y, tip.x - base.x);
      for (let i = 2; i < twig.length; i++) {
        for (const side of [1, -1]) {
          if (rng() < 0.25) continue;
          const u = i / (twig.length - 1);
          const l = (7.5 + rng() * 3.5) * (1 - 0.35 * Math.abs(u - 0.5));
          const la = dir + side * (0.5 + rng() * 0.6) * (1 - u * 0.5);
          const p = twig[i]!;
          if (!fits(p, la, l)) continue;
          leaves.push({ p, a: la, l, w: l * (0.5 + rng() * 0.12), colour: tone(Math.hypot(p.x - c.x, p.y - c.y) / r, litAt(p, dark)) });
        }
      }
      // A rosette of young leaves at the sprig's tip.
      for (let i = 0; i < 4; i++) {
        const la = dir + (rng() - 0.5) * 2.2;
        const l = 6 + rng() * 2.5;
        if (fits(tip, la, l)) leaves.push({ p: tip, a: la, l, w: l * 0.5, colour: tone(to, litAt(tip, dark - 0.1)) });
      }
    }
    leafLayer(d, leaves, lift);
  }
  // Berries in little bunches among the top leaves.
  const bunches = 4 + Math.floor(rng() * 3);
  for (let k = 0; k < bunches; k++) {
    const bc = polar(centre, rng() * TAU, r * (0.15 + rng() * 0.6));
    const n = 2 + Math.floor(rng() * 5);
    const ps = Array.from({ length: n }, () => polar(bc, rng() * TAU, 1.5 + rng() * 3.5));
    ps.sort((a, b) => a.y - b.y);
    for (const p of ps) berry(d, p, 1.9 + rng() * 0.6, rng);
  }
  const top = blob(centre, r * 0.92, r * 0.9, rng, 0.15, 30);
  pen.crescent(top, pt(-SHADOW.x * r * 0.45, -SHADOW.y * r * 0.45), () => pen.fill(top, '#1a1f2a', 0.16));
  pen.crescent(top, pt(SHADOW.x * r * 0.5, SHADOW.y * r * 0.5), () => pen.fill(top, PAPER_FILL, 0.07));
}

/** A stand of bracken: a dark understory, a ring of big fronds spread out from the middle, a few more over them throwing their shade, some turning bronze. */
function brackenStand(d: Draw, c: CoverDef, rng: Rng): void {
  const { pen } = d;
  const r = c.r;
  const centre = pt(c.x, c.y);
  const keep = (p: Pt): boolean => Math.hypot(p.x - c.x, p.y - c.y) < r * (REACH - 0.03);
  const mass = blob(centre, r * 0.86, r * 0.82, rng, 0.2, 30);
  castShadow(d, mass, r * 0.16, 0.22);
  body(d, mass, mix('#24361f', '#3b4a26', rng()), 0.92);
  const autumn = rng() * 0.3;
  const n = 8 + Math.floor(rng() * 3);
  const ph = rng() * TAU;
  // The lower fronds, older and darker, some dying back bronze; then fresh ones over them throwing their shade.
  for (let k = 0; k < n; k++) {
    const a = ph + (k / n) * TAU + (rng() - 0.5) * 0.4;
    frond(d, polar(centre, a + Math.PI, r * 0.1), a, r * (1.0 + rng() * 0.12), rng, { bronze: rng() < 0.3 ? 0.6 + rng() * 0.3 : autumn, lift: 3, keep, broad: 1.45 });
  }
  for (let k = 0; k < 4; k++) {
    const a = ph + ((k + 0.5) / 4) * TAU + (rng() - 0.5) * 0.5;
    frond(d, polar(centre, a + Math.PI, r * 0.06), a, r * (0.72 + rng() * 0.18), rng, { bronze: autumn * 0.5, lift: 6, keep, broad: 1.3 });
  }
  pen.crescent(mass, pt(-SHADOW.x * r * 0.45, -SHADOW.y * r * 0.45), () => pen.fill(mass, '#1a1f2a', 0.18));
}

/** One patch of the Pine Barrens' cover, by its look. */
export function paintBarrensCover(d: Draw, c: CoverDef): void {
  const rng = rngAt(c.x, c.y, 9);
  // Nothing past the cover's reach: the layer lies over the snake.
  d.pen.clipped(oval(c.x, c.y, c.r * REACH, c.r * REACH, 48), () => {
    if (c.look === 'fern') brackenStand(d, c, rng);
    else blueberryClump(d, c, rng);
  });
}
