import { bezier, closed, cub, type Draw, oval, pt, ribbon, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * The life of a dry volcanic coast, Galápagos-style: tree prickly pears,
 * candelabra cactus and pale, leafless palo santo; mats of red and green
 * sesuvium; a sea lion asleep on the black sand and a heap of marine
 * iguanas basking; and the seabirds flying over,
 * always drawn side-on: frigatebirds, blue-footed boobies and pelicans.
 * Things face right; birds take a wingbeat `f` (-1..1).
 */
const BARK = '#a8684a';
const PAD = '#7f9c4f';
const CEREUS = '#8ea36c';
const PALO = '#e3ded2';
const SESUVIUM_RED = '#b8483a';
const SESUVIUM_GREEN = '#86a04a';
const SEA_LION = '#a48c6c';
const IGUANA = '#55524f';
const IGUANA_RUST = '#9a5f4a';
const BOOBY = '#7a5d43';
const BOOBY_FOOT = '#5fb3c9';
const PELICAN = '#8b8478';
const POUCH = '#c4423a';

/** An oval turned by `a` radians about its centre. */
function turned(cx: number, cy: number, rx: number, ry: number, a: number, n = 16): Pt[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return oval(0, 0, rx, ry, n).map((p) => pt(cx + p.x * c - p.y * s, cy + p.x * s + p.y * c));
}

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.6, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/**
 * A tree prickly pear (Opuntia): a straight trunk armoured in reddish bark
 * plates, branching at the top into chains of flat oval pads, spined.
 */
export function opuntia(t: Draw, x: number, ground: number, h: number, s: number): void {
  const { pen } = t;
  const crown = pt(x + pen.jitter(2), ground - h * 0.58);
  const trunk = tube(bezier(pt(x, ground + 1), pt(x - 1, ground - h * 0.3), crown, 8), 6 * s, 4.4 * s);
  washed(t, trunk, BARK, 0.5);
  pen.clipped(trunk, () => {
    for (let y = ground - 2; y > crown.y; y -= 3 * s) for (const dx of [-1.2, 1.2]) pen.hair(bezier(pt(x + dx * s - 1.4 * s, y), pt(x + dx * s, y - 1.6 * s), pt(x + dx * s + 1.4 * s, y), 3), 0.35, t.ink, FAR * 0.55);
    pen.crescent(trunk, pt(-2 * s, 0), () => pen.fill(trunk, '#5a3c2c', 0.25));
  });
  const pads: Pt[][] = [];
  for (let k = 0; k < 7; k++) {
    let a = -Math.PI / 2 + (k - 3) * 0.42 + pen.jitter(0.12);
    let at = crown;
    const n = 2 + Math.floor(pen.rng() * 2) + (Math.abs(k - 3) < 2 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const ry = (6.5 - i * 0.8) * s;
      const c = pt(at.x + Math.cos(a) * ry, at.y + Math.sin(a) * ry);
      pads.push(turned(c.x, c.y, ry * 0.68, ry, a + Math.PI / 2));
      at = pt(c.x + Math.cos(a) * ry * 0.9, c.y + Math.sin(a) * ry * 0.9);
      a += pen.jitter(0.5) + (a < -Math.PI / 2 ? -0.15 : 0.15);
    }
  }
  for (const p of pads) {
    washed(t, p, PAD, 0.5, 0.5);
    pen.crescent(p, pt(-1.2 * s, -1.6 * s), () => pen.fill(p, '#3e5a2c', 0.22));
    for (let k = 0; k < 4; k++) {
      const q = p[Math.floor(pen.rng() * p.length)]!;
      const c = p.reduce((m, v) => pt(m.x + v.x / p.length, m.y + v.y / p.length), pt(0, 0));
      pen.dot(c.x + (q.x - c.x) * 0.55, c.y + (q.y - c.y) * 0.55, 0.35, t.ink, FAR * 0.8);
    }
  }
  // A yellow flower or two on the rims of pads.
  for (const p of pads.filter((_, i) => i % 5 === 2)) pen.fill(oval(p[12]!.x, p[12]!.y - 0.8 * s, 1.4 * s, 1 * s, 8), '#efc93e', 0.85);
}

/** A candelabra cactus (Jasminocereus): ribbed arms bending up from a short trunk like a candlestick's. */
export function candelabra(t: Draw, x: number, ground: number, h: number, s: number): void {
  const { pen } = t;
  const arms: Pt[][] = [[pt(x, ground + 1), pt(x, ground - h * 0.5), pt(x + pen.jitter(1), ground - h)]];
  for (const [y, side, reach, rise] of [[0.3, -1, 9, 0.85], [0.42, 1, 8, 0.92], [0.55, -1, 5, 0.74], [0.6, 1, 11, 0.7], [0.36, 1, 15, 0.62]] as const) {
    const from = pt(x, ground - h * y);
    const elbow = pt(x + side * reach * s, ground - h * y + 1);
    arms.push(cub(from, pt(from.x + side * reach * 0.7 * s, from.y + 2), elbow, pt(elbow.x, from.y - 6 * s), 8).concat([pt(elbow.x + pen.jitter(0.6), ground - h * rise)]));
  }
  for (const arm of arms.slice(1).concat([arms[0]!])) {
    const body = tube(arm, 4.4 * s, 3.8 * s);
    washed(t, body, CEREUS, 0.5, 0.55);
    const tip = arm[arm.length - 1]!;
    pen.fill(oval(tip.x, tip.y, 1.9 * s, 1.3 * s, 10), CEREUS, 0.6);
    pen.hair(oval(tip.x, tip.y, 1.9 * s, 1.3 * s, 10).slice(5, 11), 0.5, t.ink, FAR);
    pen.clipped(body, () => {
      for (const off of [-0.8, 0.8]) pen.hair(arm.map((p) => pt(p.x + off * s, p.y)), 0.35, t.ink, FAR * 0.45);
      pen.crescent(body, pt(-1.4 * s, 0), () => pen.fill(body, '#3e5a2c', 0.22));
    });
  }
}

/**
 * A palo santo: silvery, almost white bark on a short trunk forking into
 * crooked limbs, leafless in the dry season, a haze of fine twigs at the ends.
 */
export function paloSanto(t: Draw, x: number, ground: number, h: number, s = 1): void {
  const { pen } = t;
  const limb = (from: Pt, a: number, len: number, w: number, depth: number): void => {
    const end = pt(from.x + Math.cos(a) * len, from.y + Math.sin(a) * len);
    const mid = pt((from.x + end.x) / 2 + pen.jitter(len * 0.15), (from.y + end.y) / 2 + pen.jitter(len * 0.1));
    if (depth <= 0 || w < 0.9) {
      pen.hair(bezier(from, mid, end, 4), 0.4, t.ink, FAR * 0.55);
      return;
    }
    const shape = tube(bezier(from, mid, end, 6), w, w * 0.65);
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, PALO, 0.85);
    pen.hair(edges(shape), 0.4, t.ink, FAR * 0.75);
    const n = 2 + (pen.rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) limb(end, a + (i - (n - 1) / 2) * 0.6 + pen.jitter(0.25), len * (0.62 + pen.rng() * 0.15), w * 0.62, depth - 1);
  };
  limb(pt(x, ground + 1), -Math.PI / 2 + pen.jitter(0.1), h * 0.36, 4.5 * s, 4);
}

/** Sesuvium: a low mat of fleshy little leaves sprawled over the rock, red where it's driest, green where not. */
export function sesuvium(t: Draw, x0: number, x1: number, y: (x: number) => number, red = 0.6): void {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 4) top.push(pt(x, y(x) - 2.5 * Math.sin((Math.PI * (x - x0)) / (x1 - x0)) ** 0.5 * 2 - pen.rng() * 1.5));
  const mat = [...top, ...[...top].reverse().map((p) => pt(p.x, y(p.x) + 3.5))];
  pen.fill(mat, SESUVIUM_GREEN, 0.35);
  for (let k = 0; k < (x1 - x0) * 1.4; k++) {
    const lx = x0 + pen.rng() * (x1 - x0);
    const ly = y(lx) - pen.rng() * 6 * Math.sin((Math.PI * (lx - x0)) / (x1 - x0)) ** 0.5 + 2;
    const c = pen.rng() < red ? SESUVIUM_RED : SESUVIUM_GREEN;
    const leaf = turned(lx, ly, 2.2, 0.95, pen.jitter(0.9), 8);
    pen.fill(leaf, c, 0.75);
    if (k % 4 === 0) pen.hair(leaf.slice(4, 8), 0.3, t.ink, FAR * 0.5);
  }
  pen.hair(top, 0.4, t.ink, FAR * 0.5);
}

/**
 * A sea lion asleep on the sand, lying on its belly with its chin down:
 * sandy where it has dried, darker underneath, flippers splayed, whiskers.
 */
export function seaLion(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  pen.fill(oval(x, ground + 1, 40 * s, 2.6, 24), t.ink, 0.1);
  const body = [P(36, -1.5), ...cub(P(36, -1.5), P(36, -7), P(31, -9.5), P(26, -9.5), 6).slice(1), ...cub(P(26, -9.5), P(20, -10), P(14, -15.5), P(4, -16), 8).slice(1), ...cub(P(4, -16), P(-12, -16.5), P(-22, -11), P(-30, -5), 8).slice(1), P(-34, -2.5), P(-33, 0.5), P(34, 0.5)];
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, SEA_LION, 0.65);
  pen.clipped(body, () => {
    pen.fill(body.map((p) => pt(p.x, p.y + 6 * s)), '#5e4c3c', 0.4);
    pen.crescent(body, pt(-4 * s, -6 * s), () => pen.hatch(body, 1.8, 1.05, 0.4, { color: t.ink, alpha: FAR * 0.45 }));
    for (let k = 0; k < 9; k++) pen.hair([P(-26 + k * 6, -14 + Math.abs(k - 4) * 0.8), P(-24 + k * 6, -11 + Math.abs(k - 4) * 0.6)], 0.3, t.ink, FAR * 0.3);
  });
  pen.stroke(edges(body.slice(0, -2), 2).slice(0, -1), 0.8, t.ink, FAR, false);
  // Fore-flipper lying flat beside the chest; hind flippers fanned behind.
  const fore = [P(8, -3), P(13, -4), P(22, -1.2), P(20, 0.5), P(9, 0.3)];
  washed(t, fore, '#6e5a46', 0.55, 0.5);
  for (const [dx, dy] of [[-44, -3.5], [-43, 1]] as const) {
    const fin = [P(-31, -2), P(dx + 2, dy - 1.6), P(dx, dy), P(dx + 2, dy + 1.6), P(-31, 0.5)];
    washed(t, fin, '#6e5a46', 0.55, 0.5);
  }
  // A closed eye, a dark nose, a small ear, whiskers.
  pen.hair(bezier(P(28, -6.5), P(29.5, -5.6), P(31, -6.6), 4), 0.5, t.ink, FAR * 1.1);
  pen.dot(x + 35.4 * s, ground - 3 * s, 0.8 * s, t.ink, FAR);
  pen.hair([P(24.5, -9.4), P(23.6, -10.6)], 0.6, t.ink, FAR);
  for (const k of [-1, 0, 1]) pen.hair([P(34, -2.2 + k * 0.6), P(39, -3.4 + k * 1.4)], 0.3, t.ink, FAR * 0.6);
}

/**
 * A marine iguana basking flat out: a heavy dark body with a crest of
 * spines down its back, a long flattened tail, a blunt, warty head crusted
 * white with sneezed salt, legs splayed. `lift` raises its head; `dir`
 * turns it to face left.
 */
export function iguana(t: Draw, x: number, ground: number, s: number, dir: 1 | -1 = 1, lift = 0): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, ground + dy * s);
  const neck = P(16, -9 - lift * 0.6);
  const spine = [...cub(P(-40, -1), P(-30, -3.5), P(-20, -3), P(-9, -7), 10), ...cub(P(-9, -7), P(-1, -9), P(8, -9.2), neck, 8).slice(1), ...bezier(neck, P(20, -9.6 - lift), P(23, -8.6 - lift * 1.6), 4).slice(1)];
  // Full width along it from tail tip (0) to snout (1): a thin tail swelling into a heavy body, a short thick neck.
  const w = (u: number): number => s * (u < 0.48 ? 1 + 8 * (u / 0.48) ** 1.4 : u < 0.82 ? 9 - (u - 0.48) * 5 : 7.3 - (u - 0.82) * 14);
  const r = ribbon(dir > 0 ? spine : [...spine].reverse(), (u) => w(dir > 0 ? u : 1 - u));
  // The far legs, behind the body.
  for (const [hx, kx, fx] of [[-8, -12, -15], [9, 12, 15]] as const) pen.stroke([P(hx, -6), P(kx, -3), P(fx, 0)], 2 * s, t.ink, FAR * 0.55, false);
  pen.fill(r.shape, PAPER_FILL, 1);
  pen.fill(r.shape, IGUANA, 0.78);
  pen.clipped(r.shape, () => {
    pen.fill(r.shape.map((p) => pt(p.x, p.y - 3.4 * s)), IGUANA_RUST, 0.14);
    pen.stipple(r.shape, Math.round(260 * s), () => 0.6, 0.4, '#2a2826');
    pen.crescent(r.shape, pt(0, -2.6 * s), () => pen.fill(r.shape, '#2a2826', 0.25));
    for (const fx of [-4, 0, 4]) pen.hair([P(fx, -9), P(fx - 1, -5.4)], 0.4, t.ink, FAR * 0.5);
  });
  pen.stroke(closed(r.shape), 0.75, t.ink, FAR, false);
  // The crest: a saw of dark spines down its back, longest over the neck.
  r.top.forEach((p, i) => {
    const u = dir > 0 ? i / r.top.length : 1 - i / r.top.length;
    if (u < 0.3 || u > 0.86 || i % 2) return;
    const len = s * (u > 0.6 ? 2.6 : 1.6);
    pen.fill([pt(p.x - 0.7 * s, p.y + 0.3), pt(p.x - 0.4 * s * dir, p.y - len), pt(p.x + 0.7 * s, p.y + 0.3)], t.ink, FAR * 0.9);
  });
  // The near legs, splayed: elbow and knee bent out, long clawed toes gripping the rock.
  for (const [hx, kx, fx, toe] of [[-7, -13, -16, -1], [10, 14, 17, 1]] as const) {
    washed(t, tube([P(hx, -6), P(kx, -4.2), P(fx, -0.4)], 3.2 * s, 1.8 * s), IGUANA, 0.8, 0.5);
    for (const k of [-1, 0, 1]) pen.hair([P(fx, -0.2), P(fx + toe * 2.8, 0.3 + k * 0.6)], 0.5, t.ink, FAR * 0.9);
  }
  // A blunt, warty head with a grey-white crust of sneezed salt on its crown, and an eye.
  const head = P(20.5, -9 - lift * 1.2);
  const skull = oval(head.x, head.y, 3.8 * s, 2.7 * s, 14);
  washed(t, skull, IGUANA, 0.8, 0.6);
  pen.fill(oval(head.x + 0.4 * s * dir, head.y - 1.4 * s, 3 * s, 1.2 * s, 10), '#d8d3c8', 0.85);
  pen.stipple(skull, Math.round(30 * s), () => 0.7, 0.45, '#2a2826');
  pen.dot(head.x - 0.4 * s * dir, head.y - 0.2 * s, 0.6 * s, t.ink, FAR * 1.2);
  pen.hair([P(19, 1.2 - 9 - lift * 1.2), P(24, 0.8 - 9 - lift * 1.2)], 0.45, t.ink, FAR * 0.8);
}

/** A heap of marine iguanas basking on a rock: big, dark and piled on one another, some heads up. */
export function iguanaHeap(t: Draw, x: number, ground: (x: number) => number, s: number): void {
  for (const [dx, dy, dir, lift, k] of [[-34, -2, 1, 1.5, 0.95], [30, -3, -1, 0.6, 1], [-4, -7, -1, 0, 0.9], [6, 1, 1, 2.4, 1.05], [-50, 2, -1, 0.2, 0.85]] as const) {
    iguana(t, x + dx * s, ground(x + dx * s) + dy * s, s * k, dir, lift);
  }
}

/** One wing side-on from the shoulder, swept back; `lift` (-1..1) raises it; `crook` bends it at the wrist. */
function wing(P: (dx: number, dy: number) => Pt, lift: number, span: number, broad: number, crook: number): Pt[] {
  const wy = -0.5 - 5 * lift;
  const ty = -0.5 - (5 + 2 * crook) * lift - crook * 0.8;
  const wrist = P(-span * 0.25 + crook * 1.5, wy);
  const lead = [...bezier(P(1, -0.4), P(1, wy * 0.6), wrist, 5), ...bezier(wrist, P(-span * 0.55, wy + (ty - wy) * 0.2 - crook), P(-span, ty), 7).slice(1)];
  const trail = cub(P(-span, ty), P(-span * 0.6, ty * 0.55 + broad), P(-span * 0.3, wy * 0.4 + broad), P(-3.5, 0.5), 8);
  return [...lead, ...trail.slice(1)];
}

/** A frigatebird soaring: black, long crooked wings, a deep forked tail, a hooked bill and a red throat. */
export function frigatebird(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const dark = FAR * 0.95;
  // Soaring, the wings stay raised and crooked; the beat only flexes them.
  pen.fill(wing((dx, dy) => P(dx + 1.2, dy - 0.4), 0.8 + f * 0.25, 10, 0.5, 1), t.ink, dark * 0.7);
  for (const [ty, w] of [[-1.6, 0.55], [1.4, 0.5]] as const) pen.stroke(bezier(P(-3.5, 0), P(-8, ty * 0.4), P(-13, ty), 5), w * s, t.ink, dark, false);
  pen.fill(oval(x, y, 4.4 * s, 1.3 * s, 14), t.ink, dark);
  pen.fill(oval(x + 4.6 * s, y - 0.5 * s, 1.4 * s, 1.1 * s, 10), t.ink, dark);
  pen.fill(oval(x + 3.6 * s, y + 0.6 * s, 1.2 * s, 0.8 * s, 8), POUCH, 0.75);
  pen.stroke([...bezier(P(5.6, -0.6), P(8, -0.4), P(10.2, -0.3), 4), P(10.6, 0.5)], 0.45 * s, t.ink, dark, false);
  pen.fill(wing(P, 0.9 + f * 0.3, 11, 0.6, 1), t.ink, dark);
}

/** A blue-footed booby flying: brown wings and back, white below, a pointed bill and tail, blue feet tucked behind. */
export function booby(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const far = wing((dx, dy) => P(dx + 1, dy - 0.3), f * 0.8, 10, 0.8, 0);
  washed(t, far, BOOBY, 0.6, 0.4, 0.7);
  const tail = [P(-4, -0.6), P(-9, 0.2), P(-4, 1)];
  washed(t, tail, BOOBY, 0.6, 0.4);
  pen.fill(oval(x - 5.4 * s, y + 1.3 * s, 1.3 * s, 0.7 * s, 8), BOOBY_FOOT, 0.9);
  const body = oval(x, y, 5 * s, 1.6 * s, 14);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body.filter((p) => p.y < y), BOOBY, 0.45);
  pen.hair(closed(body).slice(2, 12), 0.4, t.ink, FAR * 0.8);
  pen.fill(oval(x + 5 * s, y - 0.5 * s, 1.6 * s, 1.3 * s, 10), '#c8b8a0', 0.8);
  pen.dot(x + 5.4 * s, y - 0.8 * s, 0.35 * s, t.ink, FAR);
  pen.fill([P(6.2, -0.9), P(9.6, 0), P(6.2, 0.4)], '#7f93a0', 0.85);
  const near = wing(P, f, 11, 1, 0.2);
  washed(t, near, BOOBY, 0.62, 0.5);
}

/** A brown pelican flying: heavy, grey-brown, head drawn back on its shoulders, the long bill laid along its breast. */
export function pelican(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const far = wing((dx, dy) => P(dx + 1.5, dy - 0.4), f * 0.75, 12, 1.6, 0.4);
  washed(t, far, PELICAN, 0.55, 0.4, 0.7);
  washed(t, [P(-4.5, -0.8), P(-8.5, -0.2), P(-8, 1), P(-4.5, 1.2)], '#5f5a52', 0.6, 0.4);
  const body = oval(x, y, 5.4 * s, 2 * s, 14);
  washed(t, body, PELICAN, 0.55, 0.45);
  const head = oval(x + 5.2 * s, y - 1.4 * s, 1.8 * s, 1.5 * s, 10);
  washed(t, head, '#efe2b8', 0.7, 0.4);
  pen.dot(x + 5.8 * s, y - 1.7 * s, 0.35 * s, t.ink, FAR);
  const bill = [P(6.4, -1.6), P(13, 0.2), P(12.6, 0.9), P(6, 0.6)];
  washed(t, bill, '#b9a07a', 0.7, 0.4);
  pen.fill([P(6, 0.4), P(11, 0.9), P(6.5, 1.6)], '#6e6458', 0.45);
  const near = wing(P, f, 13, 2, 0.4);
  washed(t, near, PELICAN, 0.6, 0.5);
  pen.fill(near.slice(9, 13), t.ink, FAR * 0.6);
}
