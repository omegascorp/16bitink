import { createRng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { ellipseAt, glaze } from '../critters/preyKit';
import { fingers, softShadow } from './barrensCrittersBeast';
import { scatter } from './barrensCrittersKit';
import { HOG, hogEars, hogHead, paintHogHead } from './heathHedgehogHead';

/**
 * The hedgehog, seen from above facing +x: a mound of spines about 46 long,
 * each spine cream with a dark band near its pale tip, so the coat reads
 * grizzled brown and cream; the spines lie back from a parting on the crown
 * and bristle out past the edge. In front the brown furred face, a black
 * nose on its long snout; small dark feet peep out at the sides. It
 * trundles ('walk0', 'walk1'), scurries flatter and longer ('run0',
 * 'run1'), and bites with its snout thrust forward ('bite').
 */
type Pose = 'walk0' | 'walk1' | 'run0' | 'run1' | 'bite';

interface Spec {
  readonly sx: number;
  readonly sy: number;
  /** The face's crown and how far its snout reaches. */
  readonly head: Pt;
  readonly reach: number;
  /** Feet: fore −y, fore +y, hind −y, hind +y, as (x, y) on the +y side, mirrored for −y. */
  readonly feet: readonly [Pt, Pt, Pt, Pt];
}

const walk = (k: 1 | -1): Spec => ({
  sx: 1, sy: 1, head: pt(13, 0), reach: 8,
  feet: [pt(7 - 2.5 * k, 11.5), pt(7 + 2.5 * k, 11.5), pt(-12 + 2.5 * k, 14), pt(-12 - 2.5 * k, 14)],
});

const SPECS: Readonly<Record<Pose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  run0: { sx: 1.07, sy: 0.92, head: pt(15, 0), reach: 8.5, feet: [pt(10, 10), pt(4, 12), pt(-8, 13.5), pt(-16, 13)] },
  run1: { sx: 1.07, sy: 0.92, head: pt(15, 0), reach: 8.5, feet: [pt(4, 12), pt(10, 10), pt(-16, 13), pt(-8, 13.5)] },
  bite: { sx: 1.02, sy: 0.98, head: pt(16, 0), reach: 11, feet: [pt(9, 11.5), pt(9, 11.5), pt(-14, 14), pt(-14, 14)] },
};

/** The spine mantle: an egg, fullest behind the middle, its front a broad brim round the face. */
function mantle(s: Spec): Pt[] {
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const c = Math.cos(a);
    const rx = c > 0 ? 17 : 22;
    return pt((-4 + c * rx) * s.sx, Math.sin(a) * 15.5 * s.sy * (1 - 0.14 * Math.max(0, c) ** 2));
  });
}

/** A small dark foot peeping out from under the spines: a pad and four or five little pale claws. */
function foot(d: Draw, at: Pt, side: number, front: boolean): void {
  const { pen } = d;
  const ang = front ? side * 0.9 : side * 1.4;
  const sole = ellipseAt(at.x, at.y, 2.2, 1.7, ang, 12);
  pen.fill(sole, HOG.foot, 1);
  pen.clipped(sole, () => pen.crescent(sole, pt(-0.4, -0.6), () => pen.fill(sole, HOG.deep, 0.5)));
  pen.stroke(closed(sole), 0.4, d.ink, 0.9, false);
  const base = pt(at.x + Math.cos(ang) * 1.3, at.y + Math.sin(ang) * 1.3);
  fingers(d, base, ang, 1.5, front ? [1.4, 1.7, 1.8, 1.5, 1.1] : [1.3, 1.7, 1.7, 1.3], 0.75, HOG.footPale, HOG.claw);
}

/**
 * The spines: laid from the back forward so the front ones lie over the
 * roots behind them, each lying back from the parting, cream with its dark
 * band and pale tip; longer over the back, shorter at the brim.
 */
function spines(d: Draw, shape: readonly Pt[], s: Spec, seed: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  const part = pt(s.head.x - 3, 0);
  const roots = scatter(rng, shape, 520, 0.95).sort((a, b) => a.x - b.x);
  for (const r of roots) {
    const back = Math.atan2(r.y - part.y, r.x - part.x);
    const a = back + (rng() - 0.5) * 0.45;
    const edge = Math.min(1, Math.hypot((r.x + 4) / 20, r.y / 15));
    const len = (5.6 - 2.2 * Math.max(0, (r.x - 4) / 10)) * (0.8 + rng() * 0.35) * (r.x > s.head.x - 5 ? 0.6 : 1);
    const u = pt(Math.cos(a), Math.sin(a));
    const at = (t: number): Pt => pt(r.x + u.x * len * t + -u.y * 0.15 * t * t, r.y + u.y * len * t + u.x * 0.15 * t * t);
    const w = 0.62 + 0.18 * rng();
    pen.hair([at(0), at(0.5), at(1)], w, rng() < 0.15 ? mix(HOG.spine, HOG.light, 0.5) : HOG.spine, 0.95);
    pen.hair([at(0.48), at(0.66), at(0.84)], w * 1.05, rng() < 0.3 ? HOG.root : HOG.band, 0.9);
    pen.hair([at(0), at(0.12), at(0.24)], w * 0.9, HOG.root, 0.6 + edge * 0.2);
    if (rng() < 0.35) pen.hair([at(0.1), at(0.9)], 0.18, HOG.deep, 0.45);
  }
}

/** The mantle: a dark undercoat, the spines over it, modelled as a dome lit from the upper left. */
function paintMantle(d: Draw, s: Spec, shape: readonly Pt[], seed: number): void {
  const { pen } = d;
  pen.fill(shape, HOG.mass, 1);
  pen.clipped(shape, () => glaze(d, -8 * s.sx, 6, 18, 12, 0, HOG.deep, 0.6));
  spines(d, shape, s, seed);
  // Light on the dome, shadow down its far side (the poking tips left crisp).
  pen.clipped(shape, () => {
    glaze(d, -6 * s.sx, -5 * s.sy, 13, 8, -0.3, HOG.light, 0.28);
    pen.crescent(shape, pt(-3, -4.5), () => pen.fill(shape, HOG.deep, 0.3));
    pen.crescent(shape, pt(-1.2, -1.8), () => pen.fill(shape, HOG.deep, 0.2));
  });
  pen.stroke(closed(shape), 0.45, d.ink, 0.35);
}

function draw(d: Draw, pose: Pose): void {
  const s = SPECS[pose];
  const shape = mantle(s);
  const head = hogHead(s.head, s.reach);
  const feet = s.feet.map((p, i) => pt(p.x * s.sx, p.y * (i % 2 === 0 ? -1 : 1) * s.sy));
  softShadow(d, [shape.map((p) => pt(p.x * 1.08, p.y * 1.1)), head], pt(2.2, 3.2), 0.2, 1.6);
  feet.forEach((p, i) => foot(d, p, i % 2 === 0 ? -1 : 1, i < 2));
  paintHogHead(d, s.head, s.reach, pose === 'bite');
  paintMantle(d, s, shape, 8730 + (pose === 'bite' ? 3 : 0));
  hogEars(d, s.head);
}

export const HEDGEHOG_ART: SpriteArt<Pose> = {
  frame: 80,
  res: 2,
  poses: ['walk0', 'walk1', 'run0', 'run1', 'bite'],
  draw,
};
