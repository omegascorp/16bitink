import { createRng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, edge, glint, oval, pt, shade } from '../kit';
import { INK, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { erase } from '../wash';
import { type Cham, type ChamEye, type ChamLeg, type ChamPose, chameleon, onLayer, scaleArc, silhouette } from './chameleonParts';
import { paintChameleonSkin } from './chameleonSkin';
import { dizzy } from './chameleonDizzy';
import type { BossArt } from './types';

/**
 * The Great Chameleon (chapter 7), seen from above facing +x, in two
 * layers that register exactly: '-skin', a near-white wash the game tints
 * with the colour it is showing, and '-lines', the ink drawn over it
 * (contours, hatching, tubercles, crest, eyes and its shadow on the ground)
 * with no body colour of its own.
 */

/** Tubercles over a part on a jittered grid: tiny rounded scales of mixed sizes, inked on their shadowed rims. */
function tubercles(d: Draw, shape: readonly Pt[], step: number, seed: number, a: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(shape, () => {
    for (let y = y0; y < y1; y += step * 0.86) {
      for (let x = x0 + (Math.round(y / step) % 2) * step * 0.5; x < x1; x += step) {
        const p = pt(x + (rng() - 0.5) * step * 0.6, y + (rng() - 0.5) * step * 0.6);
        const r = step * (0.28 + rng() * 0.22);
        const k = (rng() < 0.1 ? 1.5 : 1) * r;
        const w = a * (p.y > 0 ? 1.2 : 0.8);
        pen.hair(closed(oval(p.x, p.y, k, k * 0.85, 7)), 0.26, d.ink, w * 0.55);
        pen.hair(scaleArc(p.x, p.y + 0.1, k), 0.36, d.ink, w);
      }
    }
  });
}

/** The ground shadow of the whole silhouette: one soft even tone, kept off the body itself. */
function groundShadow(d: Draw, c: Cham): void {
  const shapes = silhouette(c);
  onLayer(d, (l) => {
    for (const s of shapes) l.pen.fill(s.map((p) => pt(p.x + 2.4, p.y + 3.4)), INK, 1);
    for (const lg of c.legs) for (const t of lg.foot.tips) l.pen.fill(oval(t.p.x + 0.4, t.p.y + 0.8, 3, 2.6, 12), INK, 1);
  }, 0.17, 1.1);
  for (const s of shapes) erase(d.pen.ctx, s);
}

/**
 * Cross-contour hatching down the flank turned from the light: short
 * strokes across the body's curve, denser and darker towards its rim.
 */
function flankHatch(d: Draw, c: Cham): void {
  const { pen } = d;
  const { top, bot } = c.body;
  const rng = createRng(4401);
  pen.clipped(c.body.shape, () => {
    for (let i = 1; i < c.tailFrom - 1; i++) {
      for (const k of [0, 0.5]) {
        const x = 32 - (i + k) * 2;
        const hw = Math.max(Math.abs(top[i]!.y), Math.abs(bot[i]!.y));
        const from = 0.48 + rng() * 0.16;
        pen.hair(bezier(pt(x + 0.3, hw * from), pt(x - 0.6, hw * 0.8), pt(x - 0.2, hw * 1.02), 4), 0.42, d.ink, 0.5);
        if (rng() < 0.5) pen.hair(bezier(pt(x, -hw * 0.8), pt(x - 0.4, -hw * 0.92), pt(x - 0.2, -hw * 1.02), 3), 0.32, d.ink, 0.3);
      }
    }
  });
}

/** A leg: its toe bundles with claws gripping, then the forearm and the upper arm over them. */
function legLines(d: Draw, l: ChamLeg, k: number): void {
  const { pen } = d;
  const { ctx } = pen;
  l.foot.lobes.forEach((lobe, i) => {
    erase(ctx, lobe);
    const t = l.foot.tips[i]!;
    const n = pt(-Math.sin(t.ang), Math.cos(t.ang));
    for (const j of [0.35, 0.65]) {
      const m = pt(l.wrist.x + (t.p.x - l.wrist.x) * j, l.wrist.y + (t.p.y - l.wrist.y) * j);
      pen.hair([pt(m.x - n.x * 1.7, m.y - n.y * 1.7), pt(m.x + n.x * 1.7, m.y + n.y * 1.7)], 0.3, d.ink, 0.5);
    }
    // Claws: short dark hooks off the bundle's tip, one per toe.
    for (let c = 0; c < t.claws; c++) {
      const o = (c - (t.claws - 1) / 2) * 1.2;
      const b = pt(t.p.x + n.x * o + Math.cos(t.ang) * 1.2, t.p.y + n.y * o + Math.sin(t.ang) * 1.2);
      const tip = pt(b.x + Math.cos(t.ang + o * 0.25) * 2.6, b.y + Math.sin(t.ang + o * 0.25) * 2.6);
      pen.hair(bezier(b, pt((b.x + tip.x) / 2 + n.x * 0.5, (b.y + tip.y) / 2 + n.y * 0.5), tip, 3), 0.95, d.ink, 1);
    }
    shade(d, lobe, 0.3);
    pen.stroke(closed(lobe), 0.65, d.ink, 0.92, false);
  });
  for (const [seg, w] of [[l.lower, 0.8], [l.upper, 0.85]] as const) {
    erase(ctx, seg);
    tubercles(d, seg, 1.9, 4100 + k, 0.45);
    shade(d, seg, 0.32);
    edge(d, seg, w);
  }
  const j = l.joint;
  pen.hair(bezier(pt(j.x - 1.6, j.y - 1.2), pt(j.x + 0.3, j.y + 0.6), pt(j.x + 1.8, j.y - 0.9), 4), 0.4, d.ink, 0.5);
}

/** The dorsal crest: a row of small cones down the spine, larger at the shoulders, lit on their near side. */
function crest(d: Draw): void {
  const { pen } = d;
  for (let x = 25, i = 0; x > -30; x -= 2.9, i++) {
    const h = (i % 3 === 0 ? 2.6 : 1.7) * (1 - Math.max(0, (14 - x) / 60));
    const back = pt(x - h * 1.6, 0.2);
    const tip = pt(x + h * 0.55, 0);
    pen.fill([back, pt(x, -h * 0.75), tip, pt(x, h * 0.75)], PAPER_FILL, 0.45);
    pen.fill([back, tip, pt(x, h * 0.75)], d.ink, 0.5);
    pen.hair([back, pt(x, h * 0.78), tip], 0.4, d.ink, 0.75);
  }
  pen.hair([pt(26, 0), pt(-30, 0.3)], 0.35, d.ink, 0.4);
}

/** Trunk and tail: tubercles, folds along the flanks, rings round the tail, the crest, hatching and contour. */
function bodyLines(d: Draw, c: Cham): void {
  const { pen } = d;
  const { shape, spine, top, bot } = c.body;
  erase(pen.ctx, shape);
  tubercles(d, shape, 2.2, 4201, 0.42);
  flankHatch(d, c);
  pen.clipped(shape, () => {
    // Skin folds following the flank.
    for (const s of [-1, 1]) {
      pen.hair(cub(pt(25, s * 9.5), pt(12, s * 14.2), pt(-12, s * 14.6), pt(-27, s * 7.4), 12), 0.5, d.ink, 0.45);
      pen.hair(cub(pt(14, s * 5.2), pt(4, s * 7.4), pt(-10, s * 7.6), pt(-20, s * 5), 10), 0.35, d.ink, 0.3);
    }
    for (let i = c.tailFrom + 2; i < spine.length - 2; i += 3) {
      const m = spine[i]!;
      pen.hair([top[i]!, pt(m.x + (spine[i - 1]!.x - m.x) * 0.7, m.y + (spine[i - 1]!.y - m.y) * 0.7), bot[i]!], 0.38, d.ink, 0.45);
    }
    pen.hatch(shape.filter((p) => p.x < -34), 1.4, 0.9, 0.35, { color: d.ink, alpha: 0.18 });
  });
  shade(d, shape, 0.3);
  crest(d);
  glint(d, cub(pt(20, -5.5), pt(8, -9), pt(-10, -9.4), pt(-24, -5.6), 10), 1.1, 0.5);
  glint(d, spine.slice(c.tailFrom + 2, c.tailFrom + 20).map((p, i) => pt(p.x - 0.9 + i * 0.04, p.y - 1.8)), 0.8, 0.45);
  edge(d, shape, 1.05);
}

/** The head: helmet rims and keel, plates, canthal ridges to the snout, scales, the long mouth, nostrils, contour. */
function headLines(d: Draw, c: Cham): void {
  const { pen } = d;
  erase(pen.ctx, c.head);
  tubercles(d, c.head, 2.1, 4301, 0.36);
  // The far half of the helmet and the head's far flank in shade.
  pen.crescent(c.casque, pt(-0.6, -3.2), () => pen.hatch(c.casque, 1.2, 0.75, 0.36, { color: d.ink, alpha: 0.32 }));
  shade(d, c.head, 0.3);
  // The helmet's plates: rows of big flat scales between the keel and the rims.
  for (const s of [-1, 1]) {
    for (const [x, w] of [[19, 3.2], [24.5, 5.2], [30.5, 6.4], [37, 6], [43, 4.4]] as const) {
      pen.hair(bezier(pt(x - 2.4, s * 0.8), pt(x + 0.4, s * w * 0.55), pt(x - 1.6, s * w), 4), 0.4, d.ink, 0.5);
    }
    pen.hair(bezier(pt(21, s * 2.6), pt(32, s * 4.2), pt(44, s * 2.4), 6), 0.35, d.ink, 0.4);
  }
  pen.stroke(closed(c.casque), 0.6, d.ink, 0.7);
  // The keel: a ridge down the helmet, lit along its near side.
  pen.hair([pt(14.5, 0.3), pt(30, 0.5), pt(46, 0.3), pt(54, 0)], 0.45, d.ink, 0.5);
  glint(d, [pt(16, -0.7), pt(30, -0.9), pt(44, -0.7)], 0.8, 0.7);
  for (const s of [-1, 1]) {
    // The mouth runs along the side of the head from the snout back under the eye, ending in a little hook.
    pen.hair(cub(pt(59.6, s * 2.2), pt(56, s * 8), pt(46, s * 12.6), pt(29, s * 13.2), 10), 0.75, d.ink, 0.8);
    pen.hair(bezier(pt(29, s * 13.2), pt(26.6, s * 12.8), pt(26, s * 11.6), 3), 0.55, d.ink, 0.6);
    pen.dot(56.6, s * 3.4, 0.55, d.ink, 0.9);
  }
  edge(d, c.head, 1.05);
}

/** A turret eye: rings of granules round the cone, the small pupil at its tip (or squeezed to a slit). */
function eyeLines(d: Draw, e: ChamEye, closedLid: boolean): void {
  const { pen } = d;
  erase(pen.ctx, e.shape);
  // The cone's tip looks forward and out.
  const tip = pt(e.c.x + 2.4, e.c.y + e.side * 2.2);
  const at = (k: number): Pt => pt(e.c.x + (tip.x - e.c.x) * (1 - k), e.c.y + (tip.y - e.c.y) * (1 - k));
  pen.clipped(e.shape, () => {
    for (const k of [0.84, 0.66, 0.48, 0.32]) {
      const m = at(k);
      pen.hair(closed(oval(m.x, m.y, e.r * k, e.r * k * 0.96, 24)), 0.34, d.ink, 0.42);
      // Granules between this ring and the next, as short radial ticks.
      const n = Math.round(22 * k);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * 2.3;
        const r0 = e.r * k;
        const r1 = e.r * (k + 0.16);
        pen.hair([pt(m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0), pt(m.x + Math.cos(a) * r1, m.y + Math.sin(a) * r1)], 0.3, d.ink, 0.38);
      }
    }
  });
  shade(d, e.shape, 0.3);
  if (closedLid) {
    // Squeezed shut: the lid puckered into a short dark slit with creases round it.
    const ang = Math.PI / 2 + e.side * 0.6;
    const u = pt(Math.cos(ang), Math.sin(ang));
    pen.stroke(bezier(pt(tip.x - u.x * 2.6, tip.y - u.y * 2.6), pt(tip.x + u.y * 0.9, tip.y - u.x * 0.9), pt(tip.x + u.x * 2.6, tip.y + u.y * 2.6), 6), 1, d.ink, 1, false);
    for (const k of [-1.4, 0, 1.4]) {
      const b = pt(tip.x + u.x * k, tip.y + u.y * k);
      for (const s of [-1, 1]) pen.hair([pt(b.x + u.y * s * 1.2, b.y - u.x * s * 1.2), pt(b.x + u.y * s * 2.4 + u.x * k * 0.3, b.y - u.x * s * 2.4 + u.y * k * 0.3)], 0.35, d.ink, 0.6);
    }
  } else {
    pen.fill(oval(tip.x, tip.y, 1.8, 1.8, 14), d.ink, 0.25);
    pen.dot(tip.x + 0.25, tip.y + e.side * 0.15, 1.25, d.ink, 1);
    pen.dot(tip.x - 0.3, tip.y - 0.45, 0.42, PAPER_FILL, 0.95);
    pen.hair(closed(oval(tip.x, tip.y, 2, 2, 14)), 0.45, d.ink, 0.7);
  }
  glint(d, bezier(pt(e.c.x - e.r * 0.75, e.c.y - 1), pt(e.c.x - e.r * 0.62, e.c.y - e.r * 0.62), pt(e.c.x - 1, e.c.y - e.r * 0.78), 5), 0.9, 0.6);
  edge(d, e.shape, 0.95);
}

/** The chameleon's ink layer, over the tinted skin: transparent except for ink, shading and white lights. */
function paintLines(d: Draw, c: Cham, pose: ChamPose): void {
  groundShadow(d, c);
  c.legs.forEach((l, i) => legLines(d, l, i));
  bodyLines(d, c);
  headLines(d, c);
  for (const e of c.eyes) eyeLines(d, e, pose === 'hurt');
  if (pose === 'hurt') dizzy(d, pt(38, 0), 17, 25);
}

function draw(d: Draw, pose: string): void {
  const [name, layer] = pose.split('-') as [ChamPose, string];
  const c = chameleon(name);
  if (layer === 'skin') paintChameleonSkin(d, c);
  else onLayer(d, (l) => paintLines(l, c, name));
}

export const CHAMELEON_ART: BossArt = { frame: 150, res: 3, poses: ['walk0-skin', 'walk0-lines', 'walk1-skin', 'walk1-lines', 'hurt-skin', 'hurt-lines'], draw };
