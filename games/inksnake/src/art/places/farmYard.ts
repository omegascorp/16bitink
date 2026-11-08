import type { Rng } from '../../logic/rng';
import { BOARD, type SolidDef } from '../../level/types';
import { arc, blob, body, castShadow, outline, polar, SHADOW } from '../groundKit';
import { capsule, closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { bareEarth, overhang, specks } from './farmGroundParts';
import { EARTH, EARTH_DEEP, LICHEN, OAK_DARK, STRAW, STRAW_DEEP, STRAW_LIT, strokes, WEATHERED, WEATHERED_DARK } from './farmKit';

/**
 * The farmyard's own touches on the ground: the hen coop's scratched yard
 * with straw, feathers, hens' footprints and the ramp up to the coop's
 * door; corn spilt by the crib; a puddle by the trough; a stepping-stone
 * path; an old fence rail lying in the long grass. Board coordinates.
 */
const CORN = '#efc23e';
const CORN_DEEP = '#c98a1e';
const COB = '#c98a5a';
const FLAG = '#c4baa4';

type RectSolid = Extract<SolidDef, { kind: 'rect' }>;

/** A rounded rectangle x0..x1 × y0..y1 (corner radius rc) as a ragged closed outline. */
function raggedRect(x0: number, y0: number, x1: number, y1: number, rc: number, rng: Rng, rough: number): Pt[] {
  const corners: [number, number, number][] = [[x1 - rc, y0 + rc, -Math.PI / 2], [x1 - rc, y1 - rc, 0], [x0 + rc, y1 - rc, Math.PI / 2], [x0 + rc, y0 + rc, Math.PI]];
  const sharp: Pt[] = corners.flatMap(([cx, cy, a0]) => Array.from({ length: 5 }, (_, i) => polar(pt(cx, cy), a0 + (i / 4) * (Math.PI / 2), rc)));
  const ph = rng() * TAU;
  return outline(sharp, 10).slice(0, -1).map((p, i) => {
    const k = Math.sin(i * 0.7 + ph) * 0.6 + (rng() - 0.5);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const l = Math.hypot(p.x - cx, p.y - cy) || 1;
    return pt(p.x + ((p.x - cx) / l) * k * rough, p.y + ((p.y - cy) / l) * k * rough);
  });
}

/** A hen's footprint at p, pointing along a: three toes forward, one back. */
function henPrint(d: Draw, p: Pt, a: number, alpha: number): void {
  for (const t of [-0.55, 0, 0.55]) d.pen.hair([p, polar(p, a + t, 5.5)], 0.7, EARTH_DEEP, alpha);
  d.pen.hair([p, polar(p, a + Math.PI, 2.5)], 0.7, EARTH_DEEP, alpha);
}

/** A small feather lying on the ground: a curved quill and soft vanes. */
function feather(d: Draw, c: Pt, s: number, colour: string, rng: Rng): void {
  const { pen } = d;
  const a = rng() * TAU;
  const base = polar(c, a, -s / 2);
  const tip = polar(c, a, s / 2);
  const bow = (rng() - 0.5) * s * 0.3;
  const vane = [...arc(base, tip, s * 0.22 + bow, 8), ...arc(tip, base, s * 0.2 - bow, 8).slice(1)];
  castShadow(d, vane, 1.5, 0.15);
  body(d, vane, colour, 0.85);
  pen.clipped(vane, () => {
    for (let k = 1; k < 8; k++) {
      const q = polar(base, a, (s * k) / 8);
      for (const side of [1, -1]) pen.hair([q, polar(q, a + side * 1.0, s * 0.25)], 0.3, mix(colour, d.ink, 0.35), 0.4);
    }
  });
  pen.hair(arc(polar(base, a, -2), tip, bow * 0.5, 6), 0.5, mix(colour, d.ink, 0.5), 0.8);
  pen.hair(closed(vane), 0.35, d.ink, 0.45);
}

/** Loose straw strokes round c, thinning out to `reach`. */
function strawScatter(d: Draw, at: () => Pt | null, n: number, rng: Rng): void {
  for (const [colour, alpha, wd] of [[STRAW_DEEP, 0.7, 1], [STRAW, 0.85, 1], [STRAW_LIT, 0.9, 0.9]] as const) {
    strokes(d, colour, alpha, wd, n, () => {
      const p = at();
      if (!p) return null;
      return [p.x, p.y, rng() * TAU, 4 + rng() * 9, (rng() - 0.5) * 3];
    });
  }
}

/** The coop's ramp from its left wall down to the ground: a plank with cleats across. */
function ramp(d: Draw, coop: RectSolid, rng: Rng): void {
  const { pen } = d;
  const y = coop.y + coop.h * 0.62;
  const x1 = coop.x + 6;
  const x0 = coop.x - 50;
  const plank = [pt(x0, y - 11), pt(x1, y - 12), pt(x1, y + 12), pt(x0, y + 11)];
  castShadow(d, plank.map((p) => pt(p.x + (p.x - x0) * 0.12, p.y)), 7, 0.2);
  body(d, plank, mix(WEATHERED, '#b39c78', 0.4), 0.8);
  pen.clipped(plank, () => {
    for (let k = 0; k < 6; k++) {
      const gy = y - 9 + rng() * 18;
      pen.hair([pt(x0 + 2, gy), pt(x1 - 2, gy + (rng() - 0.5) * 2)], 0.4, WEATHERED_DARK, 0.4);
    }
    strawScatter(d, () => pt(x0 + rng() * (x1 - x0), y - 11 + rng() * 22), 14, rng);
  });
  for (let x = x0 + 6; x < x1 - 4; x += 10) {
    const cleat = [pt(x, y - 11), pt(x + 3.2, y - 11), pt(x + 3.2, y + 11), pt(x, y + 11)];
    castShadow(d, cleat, 2, 0.25);
    body(d, cleat, mix(WEATHERED, OAK_DARK, 0.25), 0.85);
    pen.hair(outline(cleat, 4), 0.45, d.ink, 0.75);
  }
  pen.crescent(plank, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(plank, WEATHERED_DARK, 0.3));
  pen.stroke(outline(plank, 6), 0.9, d.ink, 0.9, false);
}

/**
 * The hen coop's yard: scratched bare earth round the coop and its nests,
 * straw everywhere thick by the nests, hens' footprints, a dust bath, a
 * few dropped feathers, the ramp up to the door. Returns the yard as
 * spots the grass keeps off.
 */
export function coopYard(d: Draw, coop: RectSolid, nests: readonly Pt[], rng: Rng): { x: number; y: number; r: number }[] {
  const xs = [coop.x, coop.x + coop.w, ...nests.map((n) => n.x)];
  const ys = [coop.y, coop.y + coop.h, ...nests.map((n) => n.y)];
  const [x0, x1, y0, y1] = [Math.min(...xs) - 90, Math.max(...xs) + 56, Math.min(...ys) - 40, Math.max(...ys) + 52];
  const shape = raggedRect(x0, y0, x1, y1, 60, rng, 6);
  const inYard = (): Pt => pt(x0 + 12 + rng() * (x1 - x0 - 24), y0 + 12 + rng() * (y1 - y0 - 24));
  bareEarth(d, shape, [closed(shape)], inYard, ((x1 - x0) * (y1 - y0)) / 40, rng, mix(EARTH, '#c4a77a', 0.4));
  const { pen } = d;
  // A dust bath: a shallow scooped hollow, darker, rimmed with thrown-out dust.
  const bath = pt(x0 + 60 + rng() * 40, y1 - 50);
  const hollow = blob(bath, 20, 13, rng, 0.2, 18, rng() * 0.6);
  pen.fill(hollow, EARTH_DEEP, 0.16);
  pen.crescent(hollow, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(hollow, d.ink, 0.14));
  pen.hair(closed(hollow).slice(4, 16), 0.5, d.ink, 0.35);
  // Scratch marks and footprints.
  for (let k = 0; k < 26; k++) {
    const p = inYard();
    const a = rng() * TAU;
    if (rng() < 0.4) for (let s = -1; s <= 1; s++) pen.hair([polar(p, a + Math.PI / 2, s * 2.4), polar(polar(p, a + Math.PI / 2, s * 2.4), a, 7 + rng() * 4)], 0.6, EARTH_DEEP, 0.4);
    else for (let i = 0; i < 3; i++) henPrint(d, polar(p, a, i * 11), a + (rng() - 0.5) * 0.3, 0.45);
  }
  // Straw: thick round the nests and along the coop's front, thinning across the yard.
  const near = [...nests, pt(coop.x + coop.w / 2, coop.y + coop.h + 8), pt(coop.x - 30, coop.y + coop.h * 0.62)];
  strawScatter(d, () => {
    const c = near[Math.floor(rng() * near.length)]!;
    const r = 70 * Math.sqrt(-Math.log(1 - rng() * 0.97)) * 0.6;
    const p = polar(c, rng() * TAU, r);
    return p.x > x0 + 6 && p.x < x1 - 6 && p.y > y0 + 6 && p.y < y1 - 6 ? p : null;
  }, 700, rng);
  strawScatter(d, () => inYard(), 220, rng);
  for (let k = 0; k < 7; k++) feather(d, inYard(), 7 + rng() * 5, rng() < 0.6 ? '#f6efe0' : rng() < 0.5 ? '#b5683a' : '#8a5a3a', rng);
  ramp(d, coop, rng);
  const spots: { x: number; y: number; r: number }[] = [];
  for (let x = x0 + 30; x < x1 - 10; x += 40) for (let y = y0 + 30; y < y1 - 10; y += 40) spots.push({ x, y, r: 36 });
  return spots;
}

/** Corn spilt in the trodden ground at the foot of the crib: loose kernels, a stripped cob, husks. */
export function cornSpill(d: Draw, crib: RectSolid, rng: Rng): void {
  const { pen } = d;
  const cx = crib.x + crib.w * (0.3 + rng() * 0.4);
  const top = crib.y + crib.h;
  const at = (): Pt => pt(cx + (rng() - 0.5) * crib.w * 0.9, top + 4 + Math.abs(rng() - rng()) * 54);
  const patch = blob(pt(cx, top + 16), crib.w * 0.5, 30, rng, 0.25, 30);
  pen.fill(patch, EARTH, 0.28);
  pen.stipple(patch, 600, () => 0.5, 0.5, mix(EARTH, d.ink, 0.4));
  overhang(d, closed(patch), rng, 4);
  // Husks first, the corn over them.
  for (let k = 0; k < 4; k++) {
    const p = at();
    const a = rng() * TAU;
    const tip = polar(p, a, 16 + rng() * 10);
    const husk = [...arc(p, tip, 5, 6), ...arc(tip, p, 2, 6).slice(1)];
    castShadow(d, husk, 2, 0.15);
    body(d, husk, mix(STRAW_LIT, '#d8cf9a', rng()), 0.85);
    pen.hair(arc(p, tip, 3, 6), 0.35, STRAW_DEEP, 0.6);
    pen.hair(closed(husk), 0.4, d.ink, 0.6);
  }
  for (let k = 0; k < 2; k++) {
    const p = at();
    const a = rng() * TAU;
    const b = polar(p, a, 20);
    const cob = capsule(p, b, 7, 6);
    castShadow(d, cob, 3, 0.2);
    const stripped = k === 0;
    body(d, cob, stripped ? COB : CORN, 0.85);
    pen.clipped(cob, () => {
      for (let i = 1; i < 9; i++) {
        const q = polar(p, a, i * 2.3);
        for (const s of [-1.8, 0, 1.8]) pen.dot(q.x - Math.sin(a) * s, q.y + Math.cos(a) * s, 0.6, stripped ? '#8a4f30' : CORN_DEEP, 0.6);
      }
    });
    pen.crescent(cob, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(cob, stripped ? '#7a4026' : CORN_DEEP, 0.4));
    pen.hair(closed(cob), 0.5, d.ink, 0.8);
  }
  const shade: [number, number, number][] = [];
  const kernels: [number, number, number][] = [];
  const glints: [number, number, number][] = [];
  for (let k = 0; k < 140; k++) {
    const p = at();
    shade.push([p.x + 0.7, p.y + 1, 1.5]);
    kernels.push([p.x, p.y, 1.4 + rng() * 0.4]);
    glints.push([p.x - 0.4, p.y - 0.5, 0.45]);
  }
  specks(d, d.ink, 0.2, shade);
  specks(d, CORN, 0.95, kernels);
  specks(d, CORN_DEEP, 0.35, kernels.filter(() => rng() < 0.5).map(([x, y, r]) => [x + 0.4, y + 0.4, r * 0.6]));
  specks(d, PAPER_FILL, 0.7, glints);
}

/** Wet trodden mud where the trough slops over: a dark soft stain, a sheen of water in its lowest part catching the sky, cloven hoof prints pressed in round it. */
export function puddle(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(blob(c, r * 2.2, r * 1.2, rng, 0.35, 24), EARTH_DEEP, 0.16);
  const wet = blob(c, r * 1.5, r * 0.8, rng, 0.35, 22, (rng() - 0.5) * 0.4);
  pen.fill(wet, mix(EARTH_DEEP, '#4a3a2a', 0.4), 0.32);
  const sheen = blob(pt(c.x + r * 0.1, c.y + r * 0.05), r * 0.8, r * 0.32, rng, 0.3, 16, (rng() - 0.5) * 0.3);
  pen.fill(sheen, '#9fb0ae', 0.45);
  pen.clipped(sheen, () => {
    for (let k = 0; k < 2; k++) pen.hair([pt(c.x - r * 0.6, c.y - r * 0.12 + k * r * 0.2), pt(c.x + r * 0.5, c.y - r * 0.1 + k * r * 0.2)], 1.2, '#eef3f0', 0.75);
  });
  pen.crescent(sheen, pt(SHADOW.x * 2, SHADOW.y * 2), () => pen.fill(sheen, '#3a3a30', 0.35));
  pen.hair(closed(sheen).slice(0, 10), 0.5, d.ink, 0.45);
  // Hoof prints: two crescent halves each, toes forward.
  for (let k = 0; k < 7; k++) {
    const p = polar(c, rng() * TAU, r * (1.2 + rng() * 1.4));
    const a = rng() * TAU;
    for (const s of [1, -1]) {
      const half = blob(polar(p, a + Math.PI / 2, s * 2.4), 3.6, 2, rng, 0.2, 10, a);
      pen.fill(half, mix(EARTH_DEEP, '#3e2e20', 0.4), 0.45);
      pen.crescent(half, pt(SHADOW.x * 1.2, SHADOW.y * 1.2), () => pen.fill(half, d.ink, 0.35));
    }
  }
}

/** Flat stepping stones set in the turf along `pts`, about one stride apart. */
export function steppingStones(d: Draw, pts: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  for (let i = 4; i < pts.length - 2; i += 9 + Math.floor(rng() * 3)) {
    const p = pts[i]!;
    if (p.x < -10 || p.y < -10 || p.x > BOARD.w + 10 || p.y > BOARD.h + 10) continue;
    const q = pts[i + 1]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2 + (rng() - 0.5) * 0.4;
    const c = pt(p.x + (rng() - 0.5) * 6, p.y + (rng() - 0.5) * 6);
    const shape = blob(c, 19 + rng() * 4, 13 + rng() * 3, rng, 0.14, 20, a);
    pen.fill(shape.map((s) => pt(s.x + SHADOW.x * 2, s.y + SHADOW.y * 2)), d.ink, 0.16);
    body(d, shape, mix(FLAG, rng() < 0.5 ? '#b5b9ae' : '#cdb894', rng() * 0.6), 0.8);
    pen.clipped(shape, () => {
      pen.fill(oval(c.x - 4, c.y - 4, 11, 7, 12), PAPER_FILL, 0.3);
      pen.stipple(shape, 140, () => 0.6, 0.5, '#8f8676');
      if (rng() < 0.6) pen.fill(blob(polar(c, rng() * TAU, 8), 3 + rng() * 3, 2.5 + rng() * 2, rng, 0.25, 10), LICHEN, 0.55);
    });
    pen.crescent(shape, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(shape, '#8f8676', 0.35));
    pen.stroke(closed(shape), 0.9, d.ink, 0.85);
    overhang(d, closed(shape), rng, 4);
  }
}

/** An old fence rail lying in the grass at c along angle a: weathered grey board, grain, a split end, a rusty nail. */
export function brokenRail(d: Draw, c: Pt, len: number, a: number, rng: Rng): void {
  const { pen } = d;
  const u = pt(Math.cos(a), Math.sin(a));
  const n = pt(-u.y, u.x);
  const at = (s: number, t: number): Pt => pt(c.x + u.x * s + n.x * t, c.y + u.y * s + n.y * t);
  const hw = 4.5;
  const jag = Array.from({ length: 5 }, (_, i) => at(len / 2 + (i % 2 ? 6 : 0) + rng() * 3, hw - (2 * hw * i) / 4));
  const shape = [at(-len / 2, -hw), ...[...jag].reverse(), at(-len / 2, hw)];
  castShadow(d, shape, 4, 0.2);
  body(d, shape, mix(WEATHERED, '#9a8f7a', rng() * 0.5), 0.8);
  pen.clipped(shape, () => {
    for (let k = 0; k < 4; k++) {
      const t = (rng() - 0.5) * hw * 1.6;
      pen.hair([at(-len / 2, t), at(len * (rng() - 0.2), t + (rng() - 0.5)), at(len / 2, t)], 0.4, WEATHERED_DARK, 0.45);
    }
    pen.fill(blob(at(-len * 0.2, 0), 3, 2, rng, 0.3, 10), LICHEN, 0.5);
  });
  pen.crescent(shape, pt(-SHADOW.x * 1.6, -SHADOW.y * 1.6), () => pen.fill(shape, WEATHERED_DARK, 0.35));
  pen.stroke(outline(shape, 6), 0.8, d.ink, 0.85, false);
  const nail = at(-len / 2 + 5, 0);
  pen.dot(nail.x, nail.y, 1.1, '#8a4a2a', 0.9);
  // Grass grown up over it here and there.
  strokes(d, '#6f9446', 0.75, 0.9, 20, () => {
    const p = at((rng() - 0.5) * len, (rng() < 0.5 ? -1 : 1) * (hw + 2));
    return [p.x, p.y, rng() * TAU, 4 + rng() * 5, (rng() - 0.5) * 2];
  });
}
