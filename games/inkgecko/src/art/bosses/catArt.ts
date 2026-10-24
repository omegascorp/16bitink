import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, oval, pt } from '../kit';
import { INK, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../propsKit';
import { mix } from '../wash';
import { type Cat, type CatLeg, type CatPose, cat } from './catParts';
import { type Coat, FUR, furEdge, hairs, model, wash } from './catFur';
import { onLayer } from './chameleonParts';
import { dizzy } from './chameleonDizzy';
import type { BossArt } from './types';

/**
 * The Barn Cat (chapter 8), seen from above facing +x as it prowls the
 * barn's top beam: a ginger-and-cream tabby, stalking low. 'swat' throws a
 * forepaw out ahead, claws out and ears back, to bat away shots; 'hurt'
 * has its fur on end, eyes squeezed shut, and stars round its head.
 */

/** Where a tabby stripe falls on the back: chevrons sweeping back from the spine. */
const stripeAt = (p: Pt): number => Math.sin((p.x + Math.abs(p.y) * 0.75) * 0.56);
const LIGHT_SHIFT = pt(-3, -4.5);

/** A hair's colour in a striped part: dark in the stripes, flecked light and deep between. */
const tabby = (dark: boolean, r: number): string => (dark ? (r < 0.75 ? FUR.stripe : FUR.deep) : r < 0.3 ? FUR.light : r < 0.55 ? FUR.deep : FUR.base);

/** The trunk: wash, brushed stripes, the dark line down the spine, fur, shoulder blades and haunches, contour. */
function paintBody(d: Draw, c: Cat): void {
  const { pen } = d;
  const s = c.body;
  wash(d, s, FUR.base, LIGHT_SHIFT, 0.45);
  pen.clipped(s, () => {
    const rng = createRng(8103);
    for (let k = -4; k <= 2; k++) {
      const x = 2.8 + 11.2 * k;
      for (const side of [-1, 1]) {
        const j = (rng() - 0.5) * 2;
        pen.hair(bezier(pt(x + j, 0), pt(x - 5 + j, side * 7), pt(x - 11 + j * 2, side * (14 + rng() * 4)), 6), 2.4 + rng() * 1.2, FUR.stripe, 0.5);
      }
    }
    pen.hair([pt(26, 0), pt(0, 0.3), pt(-34, 0)], 2.6, FUR.stripe, 0.5);
  });
  const coat: Coat = {
    dir: (p) => Math.atan2(p.y * 0.05, -1) + Math.sign(p.y) * Math.min(0.9, Math.abs(p.y) / 22),
    color: (p, r) => tabby(stripeAt(p) > 0.5 || Math.abs(p.y) < 1.6, r),
  };
  hairs(d, s, coat, 1100, 8101, 3.2);
  model(d, s, pt(-3, 0), 30, 13, LIGHT_SHIFT);
  // Shoulder blades and haunches rising under the coat as it stalks.
  for (const side of [-1, 1]) {
    for (const [x, y, rx] of [[14, 7, 5], [-20, 8, 6.4]] as const) {
      glaze(d, x - 1, side * y - 1.4, rx, rx * 0.6, side * 0.3, FUR.light, side < 0 ? 0.45 : 0.25);
      pen.hair(bezier(pt(x - rx, side * (y + 2)), pt(x, side * (y + rx * 0.75)), pt(x + rx * 0.8, side * (y + 1)), 5), 0.4, d.ink, 0.35);
    }
  }
  furEdge(d, s, 0.95, 8102);
}

/** The tail: rings of stripes, a cream tip, fur lying back along it. */
function paintTail(d: Draw, c: Cat): void {
  const { pen } = d;
  const { shape, spine } = c.tail;
  const n = spine.length - 1;
  const end = spine[n]!;
  wash(d, shape, FUR.base, pt(-1.6, -2.4), 0.5);
  pen.clipped(shape, () => {
    // The cream tip, then dark rings along the rest.
    pen.fill(oval(end.x, end.y, 8, 8, 18), FUR.cream, 0.95);
    for (let i = 3; i < n - 2; i += 3) {
      const p = spine[i]!;
      const q = spine[i + 1]!;
      const a = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
      pen.hair([pt(p.x - Math.cos(a) * 9, p.y - Math.sin(a) * 9), pt(p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 9)], 2.6, FUR.stripe, 0.55);
    }
  });
  const along = (p: Pt): number => {
    let best = 0;
    let bd = Infinity;
    spine.forEach((s, i) => {
      const dd = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
      if (dd < bd) [bd, best] = [dd, i];
    });
    const a = spine[Math.max(0, best - 1)]!;
    const b = spine[Math.min(n, best + 1)]!;
    return Math.atan2(b.y - a.y, b.x - a.x) + (c.pose === 'hurt' ? (best % 2 ? 0.9 : -0.9) : 0);
  };
  hairs(d, shape, { dir: along, color: (p, r) => (Math.hypot(p.x - end.x, p.y - end.y) < 6.5 ? (r < 0.5 ? FUR.creamDeep : PAPER_FILL) : tabby(r < 0.3, r)) }, c.pose === 'hurt' ? 520 : 360, 8201, c.pose === 'hurt' ? 4.6 : 3);
  pen.clipped(shape, () => pen.crescent(shape, pt(-1.4, -2.2), () => pen.fill(shape, FUR.deep, 0.3)));
  furEdge(d, shape, 0.85, 8202);
}

/** A leg: the striped limb, then the cream paw with its toes (and, swatting, claws hooked out). */
function paintLeg(d: Draw, l: CatLeg, k: number): void {
  const { pen } = d;
  wash(d, l.limb, FUR.base, pt(-1.6, -2.4), 0.45);
  pen.clipped(l.limb, () => {
    // Bars across the leg below the joint.
    for (const t of [0.3, 0.55, 0.8]) {
      const p = pt(l.joint.x + (l.c.x - l.joint.x) * t, l.joint.y + (l.c.y - l.joint.y) * t);
      const n = pt(-Math.sin(l.ang), Math.cos(l.ang));
      pen.hair([pt(p.x - n.x * 6, p.y - n.y * 6), pt(p.x + n.x * 6 - Math.cos(l.ang) * 1.5, p.y + n.y * 6 - Math.sin(l.ang) * 1.5)], 2, FUR.stripe, 0.6);
    }
  });
  hairs(d, l.limb, { dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), color: (_p, r) => tabby(r < 0.25, r) }, 220, 8300 + k, 2.4);
  pen.clipped(l.limb, () => pen.crescent(l.limb, pt(-1.2, -1.8), () => pen.fill(l.limb, FUR.deep, 0.35)));
  furEdge(d, l.limb, 0.8, 8310 + k, 3);
  // The paw: cream, rounded, with the toe divisions at its front.
  wash(d, l.paw, FUR.cream, pt(-1, -1.5), 0.55);
  hairs(d, l.paw, { dir: () => l.ang + Math.PI, color: (_p, r) => (r < 0.5 ? FUR.creamDeep : PAPER_FILL) }, 40, 8320 + k, 1.6, 0.35);
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const v = pt(-u.y, u.x);
  const r = l.claws ? 5 : 4.4;
  const tip = pt(l.c.x + u.x * (1.2 + r), l.c.y + u.y * (1.2 + r));
  for (const o of [-1.4, 0, 1.4]) {
    const b = pt(tip.x + v.x * o * 1.1 - u.x * 0.4, tip.y + v.y * o * 1.1 - u.y * 0.4);
    pen.hair([b, pt(b.x - u.x * 2.6, b.y - u.y * 2.6)], 0.5, d.ink, 0.8);
  }
  if (l.claws) {
    for (const o of [-2.1, -0.7, 0.7, 2.1]) {
      const b = pt(tip.x + v.x * o * 1.15 - u.x * 0.8, tip.y + v.y * o * 1.15 - u.y * 0.8);
      // A curved claw: broad at its root in the toe, hooking down to a fine point.
      const e = pt(b.x + u.x * 4.8 + v.x * o * 0.45, b.y + u.y * 4.8 + v.y * o * 0.45);
      const hook = pt(e.x + v.x * 1.4 - u.x * 0.6, e.y + v.y * 1.4 - u.y * 0.6);
      const claw = [pt(b.x - v.x * 0.6, b.y - v.y * 0.6), pt(b.x + u.x * 2.6 - v.x * 0.3, b.y + u.y * 2.6 - v.y * 0.3), e, hook, pt(b.x + u.x * 2 + v.x * 0.9, b.y + u.y * 2 + v.y * 0.9), pt(b.x + v.x * 0.7, b.y + v.y * 0.7)];
      pen.fill(claw, PAPER_FILL, 1);
      pen.fill(claw.slice(2, 5), '#d9cdb3', 1);
      pen.stroke(closed(claw), 0.5, d.ink, 0.95, false);
    }
  }
  furEdge(d, l.paw, 0.6, 8330 + k, 3);
}

/** Speed lines behind the swatting paw. */
function swoosh(d: Draw, l: CatLeg): void {
  for (const [o, len, a] of [[-8, 13, 0.55], [-3, 18, 0.7], [2, 12, 0.5]] as const) {
    const p = pt(l.c.x - 5, l.c.y + o - 3);
    d.pen.hair(bezier(pt(p.x - len, p.y + 6), pt(p.x - len * 0.4, p.y - 0.5), p, 6), 0.8, d.ink, a);
  }
}

/** The head: tabby forehead, cream muzzle, eyes, nose, whisker pads and whiskers. */
function paintHead(d: Draw, c: Cat): void {
  const { pen } = d;
  const s = c.head;
  const C = c.headC;
  wash(d, s, FUR.base, pt(-2.4, -3.6), 0.45);
  pen.clipped(s, () => {
    glaze(d, C.x + 10, 0, 6.5, 8.5, 0, FUR.cream, 0.95);
    for (const side of [-1, 1]) glaze(d, C.x + 5, side * 9.5, 4, 3, side * 0.5, FUR.cream, 0.7);
    // The tabby M on the brow and the stripes running back over the crown and cheeks.
    for (const y of [-4.6, -1.6, 1.6, 4.6]) pen.hair(bezier(pt(C.x + 6.5, y * 0.7), pt(C.x, y * 1.05), pt(C.x - 11, y * 1.25), 6), 1.5, FUR.stripe, 0.6);
    for (const side of [-1, 1]) pen.hair(bezier(pt(C.x + 3, side * 8.5), pt(C.x - 1, side * 10.5), pt(C.x - 5, side * 13), 5), 1.6, FUR.stripe, 0.55);
  });
  const muzzle = pt(C.x + 12, 0);
  hairs(d, s, { dir: (p) => Math.atan2(p.y - muzzle.y, p.x - muzzle.x) + Math.PI, color: (p, r) => (p.x > C.x + 6 && Math.abs(p.y) < 6 ? (r < 0.5 ? FUR.creamDeep : PAPER_FILL) : tabby(r < 0.25, r)) }, 420, 8401, 2.4);
  model(d, s, C, 12, 12, pt(-2.4, -3.6));
  furEdge(d, s, 0.95, 8402);
  const hurt = c.pose === 'hurt';
  for (const side of [-1, 1] as const) {
    // Eyes at the front of the head, looking ahead; squeezed shut when hurt.
    const e = pt(C.x + 7.8, side * 5);
    if (hurt) {
      pen.stroke([pt(e.x - 2, e.y - side * 1.2), pt(e.x + 0.6, e.y), pt(e.x - 2, e.y + side * 1.2)], 0.8, d.ink, 1, false);
    } else {
      const eye = ellipseAt(e.x, e.y, 2.3, 1.45, side * 0.45, 16);
      pen.fill(eye, FUR.eye, 1);
      pen.fill(ellipseAt(e.x + 0.3, e.y, 0.55, 1.25, side * 0.45, 10), INK, 1);
      pen.dot(e.x - 0.6, e.y - 0.5, 0.35, PAPER_FILL, 1);
      pen.stroke(closed(eye), 0.6, d.ink, 1, false);
    }
    // Whisker pads, then the whiskers fanning out.
    pen.dot(C.x + 11.6, side * 2.4, 0.3, d.ink, 0.6);
    pen.dot(C.x + 10.8, side * 3.4, 0.3, d.ink, 0.6);
    for (const [ty, tx, k] of [[9, 25, 0], [12.5, 22, 1], [15.5, 18, 2]] as const) {
      const root = pt(C.x + 11 - k * 0.4, side * (2.4 + k * 0.7));
      const wh = bezier(root, pt(C.x + 15 + k, side * (ty * 0.55)), pt(C.x + tx, side * ty), 6);
      pen.hair(wh, 0.55, d.ink, 0.35);
      pen.hair(wh, 0.32, PAPER_FILL, 0.95);
    }
  }
  const nose = [pt(C.x + 13.2, -1.3), pt(C.x + 14.4, 0), pt(C.x + 13.2, 1.3), pt(C.x + 12.4, 0)];
  pen.fill(nose, FUR.pink, 1);
  pen.hair(closed(nose), 0.4, d.ink, 0.8);
}

/** An ear: the ginger back, the pale pink inside along its front edge, tufts, contour. */
function paintEar(d: Draw, e: Cat['ears'][number], seed: number): void {
  const { pen } = d;
  wash(d, e.shape, mix(FUR.base, FUR.deep, 0.15), pt(-1, -1.5), 0.55);
  hairs(d, e.shape, { dir: () => Math.atan2(e.tip.y, 0), color: (_p, r) => tabby(r < 0.3, r) }, 40, seed + 7, 1.6, 0.35);
  pen.clipped(e.shape, () => glaze(d, e.tip.x, e.tip.y, 3.4, 3.4, 0, FUR.stripe, 0.6));
  pen.fill(e.inner, FUR.pink, 0.85);
  pen.clipped(e.inner, () => pen.fill(e.inner.map((p) => pt(p.x - 0.5, p.y - e.side * 0.6)), mix(FUR.pink, FUR.deep, 0.45), 0.45));
  pen.hair(closed(e.inner), 0.35, d.ink, 0.5);
  for (let i = 1; i < 4; i++) {
    const b = e.inner[i]!;
    pen.hair([b, pt(b.x - 1.6, b.y + e.side * 0.9)], 0.35, PAPER_FILL, 0.9);
  }
  furEdge(d, e.shape, 0.75, seed, 3);
}

function draw(d: Draw, pose: string): void {
  const p = pose as CatPose;
  const c = cat(p);
  const legs = c.legs.slice(0, 3);
  const top = c.legs[3]!;
  const all = [c.tail.shape, ...c.legs.flatMap((l) => [l.limb, l.paw]), c.body, c.head, ...c.ears.map((e) => e.shape)];
  onLayer(d, (l) => all.forEach((s) => l.pen.fill(s.map((q) => pt(q.x + 2.6, q.y + 3.6)), INK, 1)), 0.16, 1.2);
  paintTail(d, c);
  legs.forEach((l, i) => paintLeg(d, l, i));
  if (p !== 'swat') paintLeg(d, top, 3);
  const under = p === 'swat' ? legs : c.legs;
  under.forEach((l) => d.pen.clipped(l.limb, () => d.pen.fill(c.body.map((q) => pt(q.x + 1.6, q.y + 2.4)), FUR.deep, 0.4)));
  paintBody(d, c);
  d.pen.clipped(c.body, () => d.pen.fill(c.head.map((q) => pt(q.x + 1.6, q.y + 2.4)), FUR.deep, 0.35));
  c.ears.forEach((e, i) => paintEar(d, e, 8501 + i));
  paintHead(d, c);
  if (p === 'swat') {
    swoosh(d, top);
    paintLeg(d, top, 3);
  }
  if (p === 'hurt') dizzy(d, pt(c.headC.x + 2, 0), 17, 25);
}

export const CAT_ART: BossArt = { frame: 150, res: 3, poses: ['prowl0', 'prowl1', 'swat', 'hurt'], draw };
