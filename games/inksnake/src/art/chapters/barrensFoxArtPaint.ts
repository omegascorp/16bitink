import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { glaze } from '../critters/tomcatKit';
import { furEdge, furStripe, hairs } from '../critters/tomcatFur';
import { along, blackHair, FOX, model, redHair, wash, whiteHair } from './barrensFoxArtFur';
import type { Fox, FoxEar, FoxLeg } from './barrensFoxArtParts';

/**
 * Painting the Red Fox's parts: the coat brushed in hair by hair over
 * layered washes, a grizzled saddle down the spine, golden shoulders and
 * haunches, black stockings, black-backed ears and the white-tipped brush.
 */

const LIGHT_SHIFT = pt(-2.6, -4);

/** The trunk: wash, the darker grizzled line down the back, golden lights, a paler flank, the coat, volume, contour. */
export function paintBody(d: Draw, c: Fox): void {
  const { pen } = d;
  const s = c.body;
  const { sx, sy } = c;
  const fright = c.puff > 0.5;
  wash(d, s, FOX.base, LIGHT_SHIFT, 0.55);
  pen.clipped(s, () => {
    // Cream low on the flanks, where the belly's pale fur shows.
    for (const side of [-1, 1]) glaze(d, -6 * sx, side * 11 * sy, 26 * sx, 3.4, 0, FOX.cream, 0.55);
    // The grizzled saddle down the spine, deepest over the shoulders (the faint "cross" of a red fox) and the rump.
    glaze(d, -6 * sx, 0, 30 * sx, 4.6 * sy, 0, FOX.rich, 0.55);
    glaze(d, 13 * sx, 0, 4.6 * sx, 10 * sy, 0, FOX.rich, 0.38);
    glaze(d, -28 * sx, 0, 7 * sx, 6 * sy, 0, FOX.grizzle, 0.32);
    // The lit upper flank, golden; the far flank turning away into deeper red.
    glaze(d, -4 * sx, -6.5 * sy, 26 * sx, 3.6 * sy, 0, FOX.light, 0.35);
    glaze(d, -4 * sx, 7.5 * sy, 28 * sx, 3.4 * sy, 0, FOX.rich, 0.4);
    // Golden light on the shoulder blades and haunches.
    for (const [x, rx] of [[11, 8], [-24, 9]] as const) glaze(d, x * sx, -5.5 * sy, rx * sx, 4.6 * sy, 0.2, FOX.light, 0.42);
  });
  const centre = pt(-4 * sx, 0);
  const lie = (p: Pt): number => Math.atan2(p.y * 0.05, -1) + Math.sign(p.y) * Math.min(0.85, Math.abs(p.y) / 20);
  const dir = fright ? (p: Pt) => Math.atan2(p.y, (p.x - centre.x) * 0.3) : lie;
  const pale = (p: Pt): boolean => Math.abs(p.y) > 8.6 * sy && p.x > -22 * sx && p.x < 10 * sx;
    const spine = (p: Pt): boolean => Math.abs(p.y) < 4.2 * sy;
  hairs(d, s, {
    dir,
    color: (p, r) => (pale(p) ? (r < 0.6 ? FOX.cream : FOX.light) : redHair(r, spine(p) ? 0.3 : 0.06)),
  }, fright ? 1500 : 1300, 7101, fright ? 4 : 2.8);
  // Guard hairs down the spine, a darker line brushed in fur.
  pen.clipped(s, () => furStripe(d, [pt(22 * sx, 0), pt(0, 0.2), pt(-34 * sx, 0)], 3.2 * sy, FOX.grizzle, dir, 7120, 1.4, fright ? 3.4 : 2.6, 0.7));
  model(d, s, pt(-4 * sx, 0), 30 * sx, 10 * sy, LIGHT_SHIFT, 0.3);
  if (c.pose === 'leap') pen.clipped(s, () => glaze(d, -4 * sx, -1.5, 28 * sx, 3.2, 0, FOX.light, 0.5));
  // The shoulder blades and haunches rising under the coat.
  for (const side of [-1, 1]) {
    for (const [x, y, rx] of [[12, 6, 4.6], [-24, 7, 6]] as const) {
      pen.hair(bezier(pt(x * sx - rx, side * (y + 1.6) * sy), pt(x * sx, side * (y + rx * 0.6) * sy), pt(x * sx + rx * 0.8, side * (y + 0.6) * sy), 5), 0.4, d.ink, 0.3);
    }
  }
  if (fright) hackles(d, sx);
  furEdge(d, s, 0.8, 7102, fright ? 1 : 2, fright ? 2.6 : 1);
}

/** Raised hackles in a fright: dark-tipped bristles standing along the spine. */
function hackles(d: Draw, sx: number): void {
  const rng = createRng(7104);
  for (let x = -32 * sx; x < 20 * sx; x += 1.1) {
    const side = rng() < 0.5 ? -1 : 1;
    const l = 2.6 + rng() * 3;
    const y0 = side * rng() * 1.4;
    d.pen.hair([pt(x, y0), pt(x - 0.8 - rng() * 1.2, y0 + side * l)], 0.5, rng() < 0.7 ? FOX.black : FOX.rich, 0.7);
  }
}

/** The brush: long and full, red grizzled with black, a dark band before the white tip, the hairs fanning out from its middle. */
export function paintTail(d: Draw, c: Fox): void {
  const { pen } = d;
  const { shape, spine } = c.tail;
  const n = spine.length - 1;
  const end = spine[n]!;
  const brush = c.puff > 0.5;
  const TIP = 0.83;
  const tipAt = spine[Math.round(TIP * n)]!;
  // The white tip begins across the brush at TIP, its edge bowed back towards the root down the middle.
  const tipDir = along(spine, tipAt).ang;
  const tu = pt(Math.cos(tipDir), Math.sin(tipDir));
  const bow = (t: number): number => -2.6 + 4.4 * (t / c.tail.w) ** 2;
  const inTip = (p: Pt): boolean => {
    const [x, y] = [p.x - tipAt.x, p.y - tipAt.y];
    return x * tu.x + y * tu.y > bow(Math.abs(-x * tu.y + y * tu.x)) && along(spine, p).u > TIP - 0.12;
  };
  wash(d, shape, FOX.base, pt(-1.6, -2.6), 0.5);
  pen.clipped(shape, () => {
    // The grizzled top, darker down the middle of the brush.
    for (let i = 2; i < n - 2; i += 2) {
      const p = spine[i]!;
      const q = spine[i + 1]!;
      glaze(d, p.x, p.y, 4.2, c.tail.w * 0.26, Math.atan2(q.y - p.y, q.x - p.x), FOX.grizzle, 0.16);
    }
    for (let i = 1; i < n - 2; i += 3) glaze(d, spine[i]!.x - 0.6, spine[i]!.y - 1.6, 5, c.tail.w * 0.2, 0, FOX.light, 0.22);
    // The dark band, then the white tip.
    for (const [t, a] of [[TIP - 0.16, 0.22], [TIP - 0.09, 0.34], [TIP - 0.03, 0.42]] as const) {
      const b = spine[Math.round(t * n)]!;
      glaze(d, b.x, b.y, 6, c.tail.w * 0.55, along(spine, b).ang, FOX.grizzle, a);
    }
    // The white tip, its edge bowed back into the red.
    const W = c.tail.w;
    const edgeLine = Array.from({ length: 11 }, (_, i) => {
      const t = -W + (i / 10) * 2 * W;
      return pt(tipAt.x + tu.x * bow(Math.abs(t)) - tu.y * t, tipAt.y + tu.y * bow(Math.abs(t)) + tu.x * t);
    });
    const far = (q: Pt): Pt => pt(q.x + tu.x * 60, q.y + tu.y * 60);
    pen.fill([...edgeLine, far(edgeLine[10]!), far(edgeLine[0]!)], FOX.white, 0.95);
  });
  const dir = (p: Pt): number => {
    const { ang, side } = along(spine, p);
    return ang + side * (brush ? 1.1 : 0.32);
  };
  const color = (p: Pt, r: number): string => {
    if (inTip(p)) return whiteHair(r);
    const u = along(spine, p).u;
    return u > TIP - 0.06 ? blackHair(r) : redHair(r, 0.16 + Math.max(0, u - 0.55) * 1.4);
  };
  hairs(d, shape, { dir, color }, brush ? 1100 : 900, 7201, brush ? 5 : 4);
  // Long black-tipped guard hairs straying over the brush.
  hairs(d, shape, { dir, color: (p, r) => (inTip(p) ? whiteHair(r) : r < 0.6 ? FOX.black : FOX.grizzle) }, 120, 7203, brush ? 6 : 5, 0.35);
  pen.clipped(shape, () => pen.crescent(shape, pt(-1.4, -2.4), () => pen.fill(shape, FOX.deep, 0.28)));
  // The tip's shadow side, cool grey, so the white reads round.
  pen.clipped(shape, () => glaze(d, end.x + 1.2, end.y + 2.4, c.tail.w * 0.45, c.tail.w * 0.35, 0, FOX.whiteDeep, 0.4));
  furEdge(d, shape, 0.8, 7202, brush ? 1 : 2, brush ? 2.4 : 1.4);
}

/** A slim leg: red at the top running into the black stocking, a neat dark paw with its toes. */
export function paintLeg(d: Draw, l: FoxLeg, k: number): void {
  const { pen } = d;
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const v = pt(-u.y, u.x);
  const lie = (p: Pt): number => Math.atan2(l.c.y - p.y, l.c.x - p.x);
  const reach = Math.hypot(l.c.x - l.root.x, l.c.y - l.root.y) || 1;
  const stocking = (p: Pt): number => Math.hypot(p.x - l.root.x, p.y - l.root.y) / reach;
  if (!l.tucked) {
    wash(d, l.limb, FOX.base, pt(-1.4, -2), 0.45);
    pen.clipped(l.limb, () => {
      const mid = pt(l.joint.x + (l.c.x - l.joint.x) * 0.45, l.joint.y + (l.c.y - l.joint.y) * 0.45);
      glaze(d, mid.x, mid.y, reach * 0.55, 6, l.ang, FOX.black, 0.9);
      glaze(d, l.c.x, l.c.y, 5, 4, l.ang, FOX.black, 0.9);
    });
    hairs(d, l.limb, { dir: lie, color: (p, r) => (stocking(p) > (l.front ? 0.42 : 0.5) ? blackHair(r) : redHair(r)) }, 160, 7300 + k, 2);
    pen.clipped(l.limb, () => pen.crescent(l.limb, pt(-1, -1.6), () => pen.fill(l.limb, FOX.black, 0.3)));
    furEdge(d, l.limb, 0.7, 7310 + k, 3);
  }
  // The paw: small and neat, near black, a sheen on the knuckles.
  wash(d, l.paw, FOX.black, pt(-0.8, -1.2), 0.5);
  pen.clipped(l.paw, () => glaze(d, l.c.x - 0.6, l.c.y - 0.8, 1.6, 1, l.ang, mix(FOX.blackSoft, PAPER_FILL, 0.35), 0.45));
  hairs(d, l.paw, { dir: () => l.ang + Math.PI, color: (_p, r) => blackHair(r) }, 26, 7320 + k, 1.3, 0.35);
  const tip = pt(l.c.x + u.x * 3.6, l.c.y + u.y * 3.6);
  for (const o of [-1, 0, 1]) {
    const b = pt(tip.x + v.x * o * 0.95 - u.x * 0.3, tip.y + v.y * o * 0.95 - u.y * 0.3);
    pen.hair([b, pt(b.x - u.x * 1.6, b.y - u.y * 1.6)], 0.3, PAPER_FILL, 0.3);
  }
  pen.stroke(closed(l.paw), 0.6, d.ink, 0.85, false);
}

/** An ear seen from above: its black back, the red at its base, the pale fur along its front edge, tufts, contour. */
export function paintEar(d: Draw, e: FoxEar, seed: number): void {
  const { pen } = d;
  wash(d, e.shape, FOX.blackSoft, pt(-0.8, -1.4 * e.side), 0.6);
  pen.clipped(e.shape, () => {
    glaze(d, e.base.x, e.base.y, 5.2, 4.4, 0, FOX.base, 0.9);
    glaze(d, e.tip.x, e.tip.y, 6, 6, 0, FOX.black, 0.8);
  });
  const dir = (): number => Math.atan2(e.tip.y - e.base.y, e.tip.x - e.base.x);
  const near = (p: Pt): number => Math.hypot(p.x - e.base.x, p.y - e.base.y);
  hairs(d, e.shape, { dir, color: (p, r) => (near(p) < 4 ? redHair(r) : blackHair(r)) }, 70, seed + 7, 1.5, 0.35);
  // A glint of light along the back of the ear, where it turns to the sun.
  pen.clipped(e.shape, () => glaze(d, (e.base.x + e.tip.x) / 2 - 1, (e.base.y + e.tip.y) / 2 - 1, 2.4, 1.6, 0, mix(FOX.blackSoft, PAPER_FILL, 0.5), 0.35));
  pen.fill(e.rim, FOX.cream, 0.9);
  pen.clipped(e.rim, () => pen.fill(e.rim.map((p) => pt(p.x + 0.4, p.y + 0.7)), FOX.whiteDeep, 0.5));
  for (let i = 2; i < e.rim.length / 2; i += 2) {
    const b = e.rim[i]!;
    pen.hair([b, pt(b.x + (e.tip.x - b.x) * 0.15 + 0.6, b.y + (e.tip.y - b.y) * 0.15)], 0.3, PAPER_FILL, 0.9);
  }
  d.pen.stroke(e.edge, 0.75, d.ink, 0.9);
  // Red crown fur combed up over the ear's root, so it grows out of the head.
  const rng = createRng(seed + 11);
  for (let i = 0; i < 16; i++) {
    const t = rng();
    const a = e.shape[0]!;
    const b = e.edge[e.edge.length - 1]!;
    const p = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    const ang = Math.atan2(e.tip.y - p.y, e.tip.x - p.x) + (rng() - 0.5) * 0.5;
    const l = 1.4 + rng() * 1.4;
    pen.hair([pt(p.x - Math.cos(ang) * 0.6, p.y - Math.sin(ang) * 0.6), pt(p.x + Math.cos(ang) * l, p.y + Math.sin(ang) * l)], 0.4, redHair(rng()), 0.85);
  }
}
