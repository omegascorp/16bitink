import type { Rng } from '../../logic/rng';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { specks } from '../places/farmGroundParts';
import { glaze } from '../snakes/cornPaint';
import { mix } from '../wash';
import {
  BARK, BARK_DARK, BARK_LIT, FOAM, LICHEN, LICHEN_GREEN, MOSS, MOSS_LIT, rngAt, SHADE, SKY, TEA_DEEP, WOOD, WOOD_DEEP,
} from './floodedPlaceKit';

/**
 * The Flooded Forest's solid things from above, lit from the upper left,
 * their shadows thrown down-right onto the water: a tree standing in the
 * flood (its long shadow, buttress roots flaring out and down under the
 * tea-dark water, the trunk's smooth grey bark crusted with pale lichen,
 * a bromeliad or two), and a fallen log floating (bark lit along its top,
 * dark and wet at the waterline, a broken end, moss, a stub of a branch).
 */
const lightOf = (a: number): number => (1 - Math.cos(a - 3.99)) / 2;

/** A wet waterline where something meets the water: a dark line just outside, a lit one along it. */
function waterline(d: Draw, shape: readonly Pt[]): void {
  d.pen.hair(closed(shape.map((p) => pt(p.x + 0.6, p.y + 0.9))), 1.3, TEA_DEEP, 0.55);
  d.pen.hair(closed(shape), 0.6, FOAM, 0.5);
}

/** The buttress roots: flared fins running out from the trunk and down into the water, the far part of each sunk under it. */
function buttresses(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const n = 5 + Math.floor(rng() * 3);
  const ph = rng() * TAU;
  const STEPS = 12;
  for (let i = 0; i < n; i++) {
    const a = ph + ((i + (rng() - 0.5) * 0.5) / n) * TAU;
    const reach = r * (1.5 + rng() * 0.7);
    const wide = r * (0.24 + rng() * 0.1);
    const side = pt(-Math.sin(a), Math.cos(a));
    const bow = (rng() - 0.5) * r * 0.5;
    const wave = rng() * TAU;
    // A plank root: thin, sinuous, flaring where it leaves the trunk, tapering out under the water.
    const spine = (t: number): Pt => {
      const p = polar(c, a, r * 0.7 + (reach - r * 0.7) * t);
      const off = bow * Math.sin(Math.PI * t * 0.9) + r * 0.04 * Math.sin(t * 6 + wave);
      return pt(p.x + side.x * off, p.y + side.y * off);
    };
    const width = (t: number): number => wide * (1 - t * 0.75) * (1 + 1.6 * Math.max(0, 0.3 - t) * 3.3) + 0.4;
    const left = Array.from({ length: STEPS + 1 }, (_, k) => {
      const t = k / STEPS;
      const p = spine(t);
      return pt(p.x + side.x * width(t), p.y + side.y * width(t));
    });
    const right = Array.from({ length: STEPS + 1 }, (_, k) => {
      const t = k / STEPS;
      const p = spine(t);
      return pt(p.x - side.x * width(t), p.y - side.y * width(t));
    });
    const fin = [...left, ...right.reverse()];
    pen.fill(fin.map((p) => pt(p.x + SHADOW.x * 2.5, p.y + SHADOW.y * 2.5)), SHADE, 0.3);
    const lit = lightOf(a);
    pen.fill(fin, PAPER_FILL, 0.8);
    pen.fill(fin, mix(BARK, BARK_DARK, 0.3 - lit * 0.25), 0.92);
    pen.clipped(fin, () => {
      // The ridge along its top catching the light, and its far part sinking into the brown water.
      pen.hair(Array.from({ length: 9 }, (_, k) => spine(k / 12)), 0.7, BARK_LIT, 0.35 + lit * 0.35);
      const tip = spine(1);
      const mid = spine(0.75);
      glaze(pen.ctx, tip.x, tip.y, r * 1.1, r * 1.1, 0, TEA_DEEP, 0.92);
      glaze(pen.ctx, mid.x, mid.y, r * 0.7, r * 0.7, 0, TEA_DEEP, 0.5);
    });
    pen.hair(left.slice(0, 8), 0.6, d.ink, 0.6);
    pen.hair(right.slice(STEPS - 7), 0.6, d.ink, 0.6);
  }
}

/** The trunk's top: smooth grey bark in long ridges running out from the middle, crusted with pale lichen, lit towards the upper left. */
function trunkTop(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const disc = oval(c.x, c.y, r, r, 40);
  pen.fill(disc, PAPER_FILL, 1);
  pen.fill(disc, mix(BARK, BARK_DARK, 0.2), 0.94);
  pen.clipped(disc, () => {
    const g = pen.ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.4, r * 0.1, c.x, c.y, r * 1.05);
    g.addColorStop(0, 'rgba(255,250,240,0.22)');
    g.addColorStop(0.55, 'rgba(255,250,240,0)');
    g.addColorStop(1, 'rgba(28,20,12,0.5)');
    pen.ctx.fillStyle = g;
    pen.ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    // Lichen crusts: white-grey and green-grey patches, a ring of dots round some.
    for (let k = 0; k < 6; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.85);
      const patch = blob(p, r * (0.1 + rng() * 0.16), r * (0.08 + rng() * 0.12), rng, 0.4, 14, rng() * TAU);
      pen.fill(patch, rng() < 0.4 ? LICHEN : LICHEN_GREEN, 0.28 + rng() * 0.2);
      pen.hair(closed(patch), 0.3, BARK_DARK, 0.3);
    }
    // Ridges running out from the middle, fissured dark between.
    const n = Math.round(r * 1.2) + 6;
    for (let i = 0; i < n; i++) {
      const a = ((i + (rng() - 0.5) * 0.6) / n) * TAU;
      const r0 = r * (0.12 + rng() * 0.25);
      const r1 = r * (0.7 + rng() * 0.35);
      const bend = (rng() - 0.5) * 0.12;
      const line = [polar(c, a, r0), polar(c, a + bend, (r0 + r1) / 2), polar(c, a + bend * 1.6, r1)];
      pen.hair(line, 0.45 + rng() * 0.3, BARK_DARK, 0.35 + (1 - lightOf(a)) * 0.35);
    }
    specks(d, BARK_DARK, 0.3, Array.from({ length: Math.round(r * 6) }, () => {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r);
      return [p.x, p.y, 0.25 + rng() * 0.4] as const;
    }));
    // The far side in core shadow, hatched.
    pen.crescent(disc, pt(-SHADOW.x * r * 0.35, -SHADOW.y * r * 0.35), () => pen.hatch(disc, 1.8, 0.9, 0.45, { color: d.ink, alpha: 0.4 }));
  });
  pen.stroke(closed(disc), 1.4, d.ink, 0.9);
}

/** A tank bromeliad in the crook of the trunk: a rosette of strap leaves. */
function bromeliad(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const n = 7 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rng() * 0.3;
    const tip = polar(c, a, s * (0.8 + rng() * 0.4));
    const side = pt(-Math.sin(a) * s * 0.16, Math.cos(a) * s * 0.16);
    const mid = polar(c, a, s * 0.45);
    const leaf = [c, pt(mid.x + side.x, mid.y + side.y), tip, pt(mid.x - side.x, mid.y - side.y)];
    pen.fill(leaf, i % 2 ? MOSS : MOSS_LIT, 0.9);
    pen.hair([c, tip], 0.3, d.ink, 0.4);
  }
  pen.dot(c.x, c.y, s * 0.14, '#b8322c', 0.85);
}

/** A tree standing in the flood, filling its collision circle (its roots reaching a little beyond it, under the water). */
export function floodTree(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 1);
  // Its long shadow on the water, soft-edged, and the water darkened round its foot.
  const shadow = (k: number): Pt[] => {
    const a = Math.atan2(SHADOW.y, SHADOW.x);
    const len = r * (4.2 + k);
    return [...oval(0, 0, 1, 1, 24).filter((p) => p.x <= 0.02).map((p) => pt(p.x * r, p.y * r * (1 + k * 0.1))), pt(len, -r * 0.35), pt(len, r * 0.35)].map((p) => pt(c.x + p.x * Math.cos(a) - p.y * Math.sin(a), c.y + p.x * Math.sin(a) + p.y * Math.cos(a)));
  };
  const { ctx } = pen;
  const g = ctx.createLinearGradient(c.x, c.y, c.x + SHADOW.x * r * 5.5, c.y + SHADOW.y * r * 5.5);
  g.addColorStop(0, 'rgba(28,20,12,0.4)');
  g.addColorStop(0.55, 'rgba(28,20,12,0.22)');
  g.addColorStop(1, 'rgba(28,20,12,0)');
  for (const k of [0, 0.8]) {
    ctx.save();
    ctx.globalAlpha = k ? 0.5 : 0.8;
    ctx.fillStyle = g;
    ctx.beginPath();
    shadow(k).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  glaze(ctx, c.x, c.y, r * 2.6, r * 2.6, 0, TEA_DEEP, 0.4);
  // Rings of ripples lapping round the foot, on the side the light catches.
  for (const k of [1.7, 2.1]) {
    const a0 = 2.6 + rng() * 0.5;
    pen.hair(Array.from({ length: 9 }, (_, i) => polar(c, a0 + i * 0.25, r * k + (rng() - 0.5))), 0.5, SKY, 0.35);
  }
  buttresses(d, c, r, rng);
  waterline(d, oval(c.x, c.y, r * 1.02, r * 1.02, 32));
  trunkTop(d, c, r, rng);
  if (rng() < 0.6) bromeliad(d, polar(c, 3.6 + rng() * 1.2, r * 0.42), r * 0.34, rng);
}

/** A fallen log floating, filling x, y, w × h: bark lit along its upper side, dark and wet at the waterline, a broken end, moss, a branch stub. */
export function floatingLog(d: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = d;
  const rng = rngAt(x, y, 2);
  const along = w >= h;
  const len = along ? w : h;
  const hw = (along ? h : w) / 2;
  const o = along ? pt(x, y + h / 2) : pt(x + w / 2, y);
  const at = (s: number, t: number): Pt => (along ? pt(o.x + s, o.y + t * hw) : pt(o.x - t * hw, o.y + s));
  const side = (t: number): Pt[] => Array.from({ length: 13 }, (_, i) => {
    const s = 4 + ((len - 8) * i) / 12;
    return at(s, t * (1 - 0.08 * (i / 12)) + (rng() - 0.5) * 0.05);
  });
  const top = side(-1);
  const bot = side(1).reverse();
  const end = (s: number, from: number, to: number): Pt[] => Array.from({ length: 7 }, (_, i) => {
    const t = from + ((to - from) * i) / 6;
    return at(s + Math.cos((t * Math.PI) / 2) * (s < len / 2 ? -3.5 : 3.5) + (s > len / 2 ? (rng() - 0.5) * 4 : 0), t * 0.92);
  });
  const shape = [...top, ...end(len - 4, -1, 1).slice(1, -1), ...bot, ...end(4, 1, -1).slice(1, -1)];
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 5, p.y + SHADOW.y * 5)), SHADE, 0.3);
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 2, p.y + SHADOW.y * 2)), TEA_DEEP, 0.4);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BARK, 0.9);
  pen.clipped(shape, () => {
    // The cylinder: lit along its upper side, dark and wet low down where the water laps it.
    for (const [t, col, a] of [[-0.6, BARK_LIT, 0.4], [0.55, BARK_DARK, 0.45], [0.85, TEA_DEEP, 0.55]] as const) {
      pen.fill([at(-10, t - 0.3), at(len + 10, t - 0.3), at(len + 10, t + 0.3), at(-10, t + 0.3)], col, a);
    }
    // Bark furrows running along it.
    for (let k = 0; k < 9; k++) {
      const t = -0.85 + k * 0.2 + (rng() - 0.5) * 0.06;
      const s0 = rng() * len * 0.3;
      const s1 = len * (0.6 + rng() * 0.4);
      pen.hair([at(s0, t), at((s0 + s1) / 2, t + (rng() - 0.5) * 0.1), at(s1, t)], 0.45, BARK_DARK, 0.45);
    }
    for (let k = 0; k < 3; k++) {
      const p = at(len * (0.2 + rng() * 0.6), -0.3 + (rng() - 0.5) * 0.5);
      const patch = blob(p, 6 + rng() * 9, hw * 0.4, rng, 0.4, 14, along ? 0 : Math.PI / 2);
      pen.fill(patch, rng() < 0.5 ? MOSS : LICHEN_GREEN, 0.6);
      specks(d, MOSS_LIT, 0.6, Array.from({ length: 30 }, () => [p.x + (rng() - 0.5) * 10, p.y + (rng() - 0.5) * hw * 0.6, 0.4 + rng() * 0.4] as const));
    }
    pen.crescent(shape, pt(0, -hw * 0.7), () => pen.hatch(shape, 1.8, 0.8, 0.4, { color: d.ink, alpha: 0.3 }));
  });
  // The broken end: pale wood and its rings.
  const ec = at(len - 5, 0);
  const face = oval(ec.x, ec.y, along ? 2.6 : hw * 0.8, along ? hw * 0.8 : 2.6, 18);
  pen.fill(face, WOOD, 0.9);
  for (const k of [0.65, 0.35]) pen.hair(closed(oval(ec.x, ec.y, (along ? 2.6 : hw * 0.8) * k, (along ? hw * 0.8 : 2.6) * k, 14)), 0.3, WOOD_DEEP, 0.7);
  // A stub of a branch.
  const sb = at(len * (0.3 + rng() * 0.3), -0.9);
  const tip = along ? pt(sb.x + 6, sb.y - 7) : pt(sb.x - 7, sb.y + 6);
  pen.stroke([sb, tip], 3.2, BARK, 0.95, false);
  pen.hair([sb, tip], 0.6, BARK_LIT, 0.7);
  pen.dot(tip.x, tip.y, 1.4, WOOD, 0.9);
  waterline(d, shape);
  pen.stroke(closed(shape), 1.3, d.ink, 0.9);
}
