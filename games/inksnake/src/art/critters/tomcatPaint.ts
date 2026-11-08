import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, pt } from '../kit';
import { INK, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { FUR, furEdge, furStripe, hairs, model, wash } from './tomcatFur';
import { ellipseAt, glaze } from './tomcatKit';
import type { Tom, TomEar, TomLeg } from './tomcatParts';

/**
 * Painting the Old Tomcat's parts: a grey-brown mackerel tabby with a white
 * muzzle, bib and socks, its coat brushed in hair by hair over layered
 * washes, and the old fighter's marks: a torn ear, a scar across the brow,
 * claw rakes on the shoulder.
 */

const LIGHT_SHIFT = pt(-3, -4.5);

/** A hair's colour between the stripes: grey-brown ticked dark and pale (agouti). */
const agouti = (r: number): string => (r < 0.14 ? FUR.stripe : r < 0.4 ? FUR.deep : r < 0.72 ? FUR.base : FUR.light);
const whiteHair = (r: number): string => (r < 0.35 ? FUR.whiteDeep : PAPER_FILL);

/** Where the white of the chest and belly shows low on the flanks. */
const inBib = (c: Tom, p: Pt): boolean => ((p.x - 10 * c.sx) / (14 * c.sx)) ** 2 + ((Math.abs(p.y) - 15.8 * c.sy) / 4.4) ** 2 < 1;

/** Mackerel tabby: narrow unbroken bars running down the flanks from the spine like a fish's ribs, and the dark line down the spine. */
function bodyBars(c: Tom): { curve: Pt[]; w: number }[] {
  const { sx, sy } = c;
  const rng = createRng(9103);
  const out: { curve: Pt[]; w: number }[] = [];
  for (let k = -7; k <= 4; k++) {
    const x = (1.5 + 5.9 * k) * sx;
    for (const side of [-1, 1]) {
      const j = (rng() - 0.5) * 1.6;
      out.push({ curve: bezier(pt(x + j, side * 2.4), pt(x - 2.6 * sx + j, side * 8 * sy), pt(x - 6.5 * sx + j * 2, side * (13.5 + rng() * 3) * sy), 6), w: 1.6 + rng() * 0.8 });
    }
  }
  out.push({ curve: [pt(25 * sx, 0), pt(0, 0.3), pt(-34 * sx, 0)], w: 3 });
  for (const side of [-1, 1]) out.push({ curve: [pt(18 * sx, side * 2.6), pt(-4 * sx, side * 3), pt(-30 * sx, side * 2.4)], w: 1 });
  return out;
}

/** The trunk: wash, the dark saddle, mackerel bars brushed in wet and then in fur, the white flanks, shoulder blades and haunches, scars, contour. */
export function paintBody(d: Draw, c: Tom): void {
  const { pen } = d;
  const s = c.body;
  const { sx, sy } = c;
  const bars = bodyBars(c);
  wash(d, s, FUR.base, LIGHT_SHIFT, 0.45);
  pen.clipped(s, () => {
    glaze(d, -4 * sx, 0, 31 * sx, 7.5 * sy, 0, FUR.deep, 0.4);
    // Warm brown through the shoulders and haunches, cooler grey low on the flanks.
    glaze(d, 10 * sx, -3, 14 * sx, 11 * sy, 0, FUR.warm, 0.32);
    glaze(d, -20 * sx, 2, 13 * sx, 11 * sy, 0, FUR.warm, 0.26);
    for (const side of [-1, 1]) glaze(d, -6 * sx, side * 13 * sy, 26 * sx, 4, 0, FUR.cool, 0.3);
    for (const b of bars) pen.hair(b.curve, b.w * 1.3, FUR.stripe, 0.5);
    for (const side of [-1, 1]) glaze(d, 10 * sx, side * 16.2 * sy, 14 * sx, 4.6, 0, FUR.white, 0.95);
  });
  const fright = c.puff > 0.5;
  const centre = pt(-4 * sx, 0);
  const lie = (p: Pt): number => Math.atan2(p.y * 0.05, -1) + Math.sign(p.y) * Math.min(0.9, Math.abs(p.y) / 22);
  // Lying back along the body; on end, the hairs stand straight out from it.
  const dir = fright ? (p: Pt) => Math.atan2(p.y, (p.x - centre.x) * 0.3) : lie;
  hairs(d, s, { dir, color: (p, r) => (inBib(c, p) ? whiteHair(r) : agouti(r)) }, fright ? 1900 : 1700, 9101, fright ? 4.4 : 3.2);
  pen.clipped(s, () => bars.forEach((b, i) => {
    // Bars fade out where they reach the white.
    const curve = b.curve.filter((p) => !inBib(c, p));
    if (curve.length > 1) furStripe(d, curve, b.w * 1.15, FUR.stripe, dir, 9120 + i, 5, fright ? 3.6 : 2.6, 0.9);
  }));
  model(d, s, pt(-3 * sx, 0), 30 * sx, 14 * sy, LIGHT_SHIFT);
  if (fright) hackles(d, sx);
  // Shoulder blades and haunches rising under the coat.
  for (const side of [-1, 1]) {
    for (const [x, y, rx] of [[14, 7.5, 5.4], [-20, 8.5, 7]] as const) {
      glaze(d, x * sx - 1, side * y * sy - 1.4, rx, rx * 0.6, side * 0.3, FUR.light, side < 0 ? 0.42 : 0.22);
      pen.hair(bezier(pt(x * sx - rx, side * (y + 2) * sy), pt(x * sx, side * (y + rx * 0.75) * sy), pt(x * sx + rx * 0.8, side * (y + 1) * sy), 5), 0.45, d.ink, 0.35);
    }
  }
  // Three old claw rakes across the right shoulder.
  for (let i = 0; i < 3; i++) {
    const a = pt((8 + i * 2.6) * sx, (6.5 + i * 1.6) * sy);
    const b = pt(a.x + 6.5 * sx, a.y - 3.2 * sy);
    pen.hair([a, pt((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.4), b], 0.75, FUR.scar, 0.8);
    pen.hair([pt(a.x + 0.3, a.y + 0.7), pt(b.x + 0.3, b.y + 0.7)], 0.35, d.ink, 0.5);
  }
  furEdge(d, s, 0.85, 9102, fright ? 1 : 2, fright ? 2.8 : 1);
}

/** The arched back in a fright: the spine's ridge catching the light, its hackles raised in dark bristles. */
function hackles(d: Draw, sx: number): void {
  const { pen } = d;
  glaze(d, -6 * sx, -5, 22 * sx, 5, 0, FUR.light, 0.35);
  const rng = createRng(9104);
  for (let x = -30 * sx; x < 20 * sx; x += 1.1) {
    const side = rng() < 0.5 ? -1 : 1;
    const l = 3 + rng() * 3.4;
    const y0 = side * rng() * 1.6;
    pen.hair([pt(x, y0), pt(x - 0.8 - rng() * 1.2, y0 + side * l)], 0.55, rng() < 0.8 ? FUR.stripe : FUR.deep, 0.75);
  }
}

/** The angle along the tail at the spine point nearest p. */
function along(spine: readonly Pt[], p: Pt): { ang: number; i: number } {
  let best = 0;
  let bd = Infinity;
  spine.forEach((s, i) => {
    const dd = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
    if (dd < bd) [bd, best] = [dd, i];
  });
  const n = spine.length - 1;
  const a = spine[Math.max(0, best - 1)]!;
  const b = spine[Math.min(n, best + 1)]!;
  return { ang: Math.atan2(b.y - a.y, b.x - a.x), i: best };
}

/** The tail: thick, ringed, a dark tip, the old kink's knot, fur lying back along it (or bristling out like a bottle brush). */
export function paintTail(d: Draw, c: Tom): void {
  const { pen } = d;
  const { shape, spine } = c.tail;
  const n = spine.length - 1;
  const end = spine[n]!;
  const brush = c.puff > 0.5;
  wash(d, shape, FUR.base, pt(-1.6, -2.4), 0.5);
  pen.clipped(shape, () => {
    glaze(d, end.x, end.y, 6.5, 6.5, 0, FUR.stripe, 0.9);
    // Dark rings along it, brushed wet so their edges blur into the fur.
    for (let i = 2; i < n - 2; i += 3) {
      const p = spine[i]!;
      const q = spine[i + 1]!;
      const a = Math.atan2(q.y - p.y, q.x - p.x);
      glaze(d, p.x, p.y, brush ? 3.4 : 2.4, brush ? 16 : 9, a, FUR.stripe, 0.8);
    }
  });
  const dir = (p: Pt): number => {
    const { ang, i } = along(spine, p);
    return brush ? ang + (i % 2 ? 1.3 : -1.3) : ang;
  };
  hairs(d, shape, { dir, color: (p, r) => (Math.hypot(p.x - end.x, p.y - end.y) < 4.5 ? (r < 0.7 ? FUR.stripe : FUR.deep) : agouti(r)) }, brush ? 900 : 600, 9201, brush ? 5.2 : 3);
  pen.clipped(shape, () => {
    for (let i = 2; i < n - 2; i += 3) {
      const p = spine[i]!;
      const q = spine[i + 1]!;
      const a = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
      const r = brush ? 15 : 8;
      furStripe(d, [pt(p.x - Math.cos(a) * r, p.y - Math.sin(a) * r), pt(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r)], brush ? 3.6 : 2.4, FUR.stripe, dir, 9210 + i, 4, brush ? 4.4 : 2.6, 0.9);
    }
  });
  pen.clipped(shape, () => pen.crescent(shape, pt(-1.4, -2.2), () => pen.fill(shape, FUR.deep, 0.3)));
  // The knot where it was broken long ago.
  const k = spine[Math.round(c.tail.kinkAt * n)]!;
  glaze(d, k.x - 1, k.y - 1.4, 4, 3, 0, FUR.light, 0.35);
  furEdge(d, shape, 0.85, 9202, brush ? 1 : 2, brush ? 2.6 : 1);
}

/** The pads of an upturned sole: the big heel pad and four toe beans. */
function pads(d: Draw, l: TomLeg): void {
  const { pen } = d;
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const v = pt(-u.y, u.x);
  const heel = ellipseAt(l.c.x - u.x * 0.6, l.c.y - u.y * 0.6, 1.7, 2.1, l.ang, 12);
  pen.fill(heel, FUR.pad, 0.95);
  pen.hair(closed(heel), 0.35, d.ink, 0.8);
  for (const o of [-2.2, -0.8, 0.8, 2.2]) {
    const b = pt(l.c.x + u.x * (2.6 - Math.abs(o) * 0.35) + v.x * o, l.c.y + u.y * (2.6 - Math.abs(o) * 0.35) + v.y * o);
    pen.dot(b.x, b.y, 0.75, FUR.pad, 0.95);
    pen.circle(b.x, b.y, 0.75, 0.25, d.ink);
  }
}

/** Curved claws hooking out of the toes. */
function claws(d: Draw, tip: Pt, u: Pt, v: Pt): void {
  const { pen } = d;
  for (const o of [-2.1, -0.7, 0.7, 2.1]) {
    const b = pt(tip.x + v.x * o * 1.15 - u.x * 0.8, tip.y + v.y * o * 1.15 - u.y * 0.8);
    const e = pt(b.x + u.x * 4.8 + v.x * o * 0.5, b.y + u.y * 4.8 + v.y * o * 0.5);
    const hook = pt(e.x + v.x * 1.4 - u.x * 0.6, e.y + v.y * 1.4 - u.y * 0.6);
    const claw = [pt(b.x - v.x * 0.6, b.y - v.y * 0.6), pt(b.x + u.x * 2.6 - v.x * 0.3, b.y + u.y * 2.6 - v.y * 0.3), e, hook, pt(b.x + u.x * 2 + v.x * 0.9, b.y + u.y * 2 + v.y * 0.9), pt(b.x + v.x * 0.7, b.y + v.y * 0.7)];
    pen.fill(claw, PAPER_FILL, 1);
    pen.fill(claw.slice(2, 5), '#d9cdb3', 1);
    pen.stroke(closed(claw), 0.5, d.ink, 0.95, false);
  }
}

/** A leg: the barred limb running into a white sock, then the white paw with its toes (claws out, or pads up). */
export function paintLeg(d: Draw, l: TomLeg, k: number): void {
  const { pen } = d;
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const v = pt(-u.y, u.x);
  const sock = (p: Pt): boolean => Math.hypot(p.x - l.c.x, p.y - l.c.y) < (l.front ? 7.5 : 6);
  const nn = pt(-Math.sin(l.ang), Math.cos(l.ang));
  // Bars across the leg between the joint and the sock.
  const bars = [0.1, 0.3, 0.5].map((t) => {
    const p = pt(l.joint.x + (l.c.x - l.joint.x) * t, l.joint.y + (l.c.y - l.joint.y) * t);
    return [pt(p.x - nn.x * 6, p.y - nn.y * 6), pt(p.x + nn.x * 6 - u.x * 1.5, p.y + nn.y * 6 - u.y * 1.5)];
  });
  const lie = (p: Pt): number => Math.atan2(l.c.y - p.y, l.c.x - p.x);
  wash(d, l.limb, FUR.base, pt(-1.6, -2.4), 0.45);
  pen.clipped(l.limb, () => {
    for (const b of bars) pen.hair(b, 2.6, FUR.stripe, 0.3);
    glaze(d, l.c.x - u.x * 1.5, l.c.y - u.y * 1.5, l.front ? 9 : 7.5, 6, l.ang, FUR.white, 0.85);
  });
  hairs(d, l.limb, { dir: lie, color: (p, r) => (sock(p) ? whiteHair(r) : agouti(r)) }, 320, 9300 + k, 2.4);
  pen.clipped(l.limb, () => bars.forEach((b, i) => furStripe(d, b, 1.8, FUR.stripe, lie, 9340 + k * 4 + i, 4, 2.2, 0.9)));
  pen.clipped(l.limb, () => pen.crescent(l.limb, pt(-1.2, -1.8), () => pen.fill(l.limb, FUR.deep, 0.32)));
  furEdge(d, l.limb, 0.75, 9310 + k, 3);
  // The paw: big, white, rounded, with the toe divisions at its front.
  wash(d, l.paw, FUR.white, pt(-1.2, -1.8), 0.6);
  pen.clipped(l.paw, () => glaze(d, l.c.x + 1.2, l.c.y + 1.6, 3.4, 2.6, l.ang, FUR.whiteDeep, 0.55));
  hairs(d, l.paw, { dir: () => l.ang + Math.PI, color: (_p, r) => whiteHair(r) }, 44, 9320 + k, 1.6, 0.35);
  const r = l.claws ? 5.2 : 4.6;
  const tip = pt(l.c.x + u.x * (1.2 + r), l.c.y + u.y * (1.2 + r));
  if (l.pads) pads(d, l);
  else {
    for (const o of [-1.4, 0, 1.4]) {
      const b = pt(tip.x + v.x * o * 1.15 - u.x * 0.4, tip.y + v.y * o * 1.15 - u.y * 0.4);
      pen.hair([b, pt(b.x - u.x * 3, b.y - u.y * 3)], 0.55, d.ink, 0.85);
    }
  }
  if (l.claws) claws(d, tip, u, v);
  furEdge(d, l.paw, 0.65, 9330 + k, 3);
}

/** An ear: the dark-backed tabby ear, its pale pink inside, tufts, the bitten notch, contour. */
export function paintEar(d: Draw, e: TomEar, seed: number): void {
  const { pen } = d;
  wash(d, e.shape, mix(FUR.base, FUR.deep, 0.3), pt(-1, -1.5), 0.55);
  hairs(d, e.shape, { dir: () => Math.atan2(e.tip.y, 0), color: (_p, r) => agouti(r * 0.8) }, 60, seed + 7, 1.6, 0.35);
  pen.clipped(e.shape, () => glaze(d, e.tip.x, e.tip.y, 3.6, 3.6, 0, FUR.stripe, 0.65));
  pen.fill(e.inner, FUR.pink, 0.8);
  pen.clipped(e.inner, () => pen.fill(e.inner.map((p) => pt(p.x - 0.5, p.y - e.side * 0.6)), mix(FUR.pink, FUR.deep, 0.45), 0.45));
  pen.hair(closed(e.inner), 0.35, d.ink, 0.5);
  for (let i = 1; i < 4; i++) {
    const b = e.inner[i]!;
    pen.hair([b, pt(b.x - 1.6, b.y + e.side * 0.9)], 0.35, PAPER_FILL, 0.9);
  }
  if (e.notch) {
    // The healed rim of the tear: pale, with a dark crust at its root.
    pen.dot(e.notch.x, e.notch.y, 0.7, FUR.scar, 1);
    pen.dot(e.notch.x + 0.3, e.notch.y - e.side * 0.3, 0.4, mix(FUR.pad, INK, 0.4), 0.8);
  }
  furEdge(d, e.shape, 0.8, seed, 3);
}
