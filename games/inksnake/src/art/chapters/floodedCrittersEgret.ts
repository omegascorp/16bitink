import { createRng } from '../../logic/rng';
import { polar } from '../groundKit';
import { bezier, closed, cub, type Draw, pt, ribbon, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze, shadowOf } from '../critters/birdKit';
import { mapWing, mirrorY, wingOutlines } from '../critters/birdWing';
import { softShadow } from './barrensCrittersBeast';
import { EGRET, egretPlumage, foldedWings, openWing, paintOpenWing, plumes } from './floodedCrittersEgretWing';
import { rings, WATER } from './floodedCrittersKit';

/**
 * The great egret from above facing +x: tall, slender and all white, a long
 * neck, a dagger of a yellow bill, black legs and long black toes, lacy
 * plumes trailing over its tail. 'stand' waits, neck folded in its S;
 * 'fish' shoots the neck out and stabs the bill into the water; 'walk0',
 * 'walk1' wade, a long leg reaching ahead; 'fly0', 'fly1' beat the broad
 * white wings (spread, then swept forward on the downstroke), neck tucked
 * and legs trailing out behind.
 */
type Pose = 'stand' | 'fish' | 'walk0' | 'walk1' | 'fly0' | 'fly1';

const E = EGRET;

/** The body: a slender egg, fullest at the breast. */
function torso(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.28 * Math.max(0, -c) ** 1.4 - 0.08 * Math.max(0, c) ** 2));
  });
}

interface Neck {
  /** Shoulders to the back of the head. */
  readonly spine: Pt[];
  readonly w0: number;
  readonly w1: number;
}

const NECKS: Readonly<Record<Pose, Neck>> = {
  stand: { spine: cub(pt(6, 0), pt(13, 5), pt(10, -3.5), pt(16, -1), 16), w0: 5.4, w1: 3 },
  walk0: { spine: cub(pt(6, 0), pt(13, 4), pt(12, -3), pt(19, -0.6), 16), w0: 5.4, w1: 2.9 },
  walk1: { spine: cub(pt(6, 0), pt(13, -4), pt(12, 3), pt(19, 0.6), 16), w0: 5.4, w1: 2.9 },
  fish: { spine: cub(pt(6, 0), pt(13, 2.8), pt(20, -1.6), pt(30, 0), 18), w0: 5, w1: 2.4 },
  fly0: { spine: cub(pt(6, 0), pt(10, 2.2), pt(10.5, -1.6), pt(13, 0), 10), w0: 6.4, w1: 3.8 },
  fly1: { spine: cub(pt(6, 0), pt(10, -2.2), pt(10.5, 1.6), pt(13, 0), 10), w0: 6.4, w1: 3.8 },
};

/** The long neck: white, its slim feathers lying along it, shaded on the far side. */
function paintNeck(d: Draw, n: Neck): void {
  const { pen } = d;
  const { shape, top, bot } = ribbon(n.spine, (u) => n.w0 + (n.w1 - n.w0) * Math.sqrt(u));
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, E.white, 0.9);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.9, -1.3), () => pen.fill(shape, E.cool, 0.6));
    pen.crescent(shape, pt(-0.4, -0.6), () => pen.fill(shape, E.shade, 0.3));
    for (let i = 1; i < n.spine.length - 1; i += 1) {
      const a = top[i]!;
      const b = bot[i]!;
      const c = n.spine[i]!;
      pen.hair([pt((a.x + c.x) / 2, (a.y + c.y) / 2), pt(c.x - (c.x - n.spine[i - 1]!.x) * 1.4, c.y - (c.y - n.spine[i - 1]!.y) * 1.4)], 0.22, E.cool, 0.55);
      pen.hair([pt((b.x + c.x) / 2, (b.y + c.y) / 2), pt(c.x - (c.x - n.spine[i - 1]!.x) * 1.2, c.y - (c.y - n.spine[i - 1]!.y) * 1.2)], 0.22, E.shade, 0.45);
    }
  });
  pen.stroke(closed(shape), 0.6, d.ink, 0.95, false);
}

/** The head at the neck's end, heading `ang`: small and sleek, the green-yellow lores, golden eyes, the long yellow bill (`stab` dips its tip under). */
function paintHead(d: Draw, c: Pt, ang: number, bill: number, stab: boolean): void {
  const { pen } = d;
  const f = (x: number, y: number): Pt => pt(c.x + Math.cos(ang) * x - Math.sin(ang) * y, c.y + Math.sin(ang) * x + Math.cos(ang) * y);
  // The bill: a long dagger, the culmen ridged, a dark line where the mandibles meet.
  const tip = bill;
  const beak = [f(1.6, -1.25), ...bezier(f(4, -1.15), f(tip * 0.7, -0.75), f(tip, 0), 6), ...bezier(f(tip, 0), f(tip * 0.7, 0.75), f(4, 1.15), 6).slice(1), f(1.6, 1.25)];
  pen.fill(beak.map((p) => pt(p.x + 1.4, p.y + 2)), d.ink, 0.12);
  pen.fill(beak, E.bill, 1);
  pen.clipped(beak, () => {
    pen.crescent(beak, pt(-0.3, -0.5), () => pen.fill(beak, E.billDeep, 0.55));
    pen.hair([f(3, -0.25), f(tip * 0.92, -0.05)], 0.4, PAPER_FILL, 0.55);
    glaze(d, f(tip * 0.85, 0).x, f(tip * 0.85, 0).y, 2.2, 0.8, ang, E.billDeep, 0.45);
  });
  pen.hair([f(3, 0.15), f(tip * 0.96, 0.05)], 0.25, E.billDeep, 0.8);
  pen.stroke(closed(beak), 0.4, d.ink, 0.95, false);
  if (stab) {
    // The tip under the water: the surface laps over it.
    const sink = ellipseAt(f(tip - 1.5, 0).x, f(tip - 1.5, 0).y, 3.4, 2.2, ang, 16);
    pen.fill(sink, WATER.murk, 0.55);
    rings(d, f(tip - 1.5, 0), 3, 2.4, 3, 7710, 0.8);
    for (const [x, y] of [[tip + 2.5, -3], [tip + 3.5, 2.6], [tip - 4, 4]] as const) pen.dot(f(x, y).x, f(x, y).y, 0.5, WATER.lit, 0.9);
  }
  const head = [...bezier(f(-3, 0), f(-2.8, -2.6), f(1.2, -1.9), 6), ...bezier(f(1.2, -1.9), f(3.2, -1.2), f(3.4, 0), 4).slice(1), ...bezier(f(3.4, 0), f(3.2, 1.2), f(1.2, 1.9), 4).slice(1), ...bezier(f(1.2, 1.9), f(-2.8, 2.6), f(-3, 0), 6).slice(1, -1)];
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(head, E.white, 0.9);
  pen.clipped(head, () => pen.crescent(head, pt(-0.6, -0.9), () => pen.fill(head, E.cool, 0.6)));
  pen.stroke(closed(head), 0.5, d.ink, 0.95, false);
  for (const s of [-1, 1]) {
    pen.hair([f(0.6, s * 1.5), f(2.2, s * 1.25), f(3.4, s * 1.05)], 0.55, E.lore, 0.9);
    const e = f(0.6, s * 1.55);
    pen.dot(e.x, e.y, 0.6, E.eye, 1);
    pen.dot(e.x, e.y, 0.3, '#121114', 1);
    pen.dot(e.x - 0.15, e.y - 0.2, 0.12, PAPER_FILL, 0.9);
  }
}

/** A black foot at `at`: three long toes fanned forward round `ang`, one back, the claws. */
function foot(d: Draw, at: Pt, ang: number): void {
  const { pen } = d;
  for (const [a, len] of [[-0.5, 6.5], [0, 7.5], [0.45, 6], [Math.PI, 3.5]] as const) {
    const tip = polar(at, ang + a, len);
    const mid = polar(polar(at, ang + a, len * 0.5), ang + a + Math.PI / 2, a * 0.6);
    pen.stroke([at, mid, tip], 0.9, E.leg, 1, false);
    pen.hair([at, mid, tip].map((p) => pt(p.x - 0.2, p.y - 0.25)), 0.25, E.legLit, 0.7);
  }
}

/** A long black leg from under the body out to the foot, its knee joint swelling. */
function leg(d: Draw, from: Pt, to: Pt): void {
  d.pen.stroke([from, pt((from.x + to.x) / 2, (from.y + to.y) / 2 + 0.3), to], 1.3, E.leg, 1, false);
  d.pen.hair([from, to].map((p) => pt(p.x - 0.25, p.y - 0.3)), 0.3, E.legLit, 0.7);
}

function standing(d: Draw, pose: Pose): void {
  const rng = createRng(5311);
  const neck = NECKS[pose];
  const body = torso(-3, 12.5, 6.4);
  const head = neck.spine[neck.spine.length - 1]!;
  const prev = neck.spine[neck.spine.length - 3]!;
  const ang = Math.atan2(head.y - prev.y, head.x - prev.x);
  const fish = pose === 'fish';
  const step = pose === 'walk0' ? 1 : pose === 'walk1' ? -1 : 0;
  // A tall bird stands in a long shadow.
  softShadow(d, [body, ribbon(neck.spine, () => 4.6).shape], pt(4, 6), 0.16, 1.6);
  rings(d, pt(-2, 0), 15, 10, 2, 7700, step ? 0.4 : 0.55);
  if (step) {
    leg(d, pt(3, step * 2), pt(17, step * 7));
    foot(d, pt(17, step * 7), step * 0.15);
    leg(d, pt(-2, -step * 2.5), pt(-19, -step * 7.5));
    foot(d, pt(-19, -step * 7.5), -step * 0.2);
  } else {
    foot(d, pt(2, fish ? 4.5 : 3.6), 0.12);
    foot(d, pt(fish ? -5 : 1, fish ? -4.5 : -3.6), -0.12);
  }
  plumes(d, pt(-6, 0), 18, 3.4, step * 1.5);
  foldedWings(d, rng, step ? 1 : 0);
  egretPlumage(d, body, rng, { n: 70, size: 3.2, line: 0.6 });
  paintNeck(d, neck);
  paintHead(d, head, ang, fish ? 11.5 : 10.5, fish);
}

function flying(d: Draw, pose: Pose): void {
  const rng = createRng(5321);
  const down = pose === 'fly1';
  const neck = NECKS[pose];
  const body = torso(-2, 12, 6.4);
  const right = openWing(down);
  const wings = [right, mapWing(right, mirrorY)];
  // The legs trail out behind, black, past the short tail.
  shadowOf(d, [body, ...wings.flatMap(wingOutlines)], 10, 0.1);
  for (const s of [-1, 1]) {
    leg(d, pt(-10, s * 1.6), pt(-30, s * 1.4));
    foot(d, pt(-30, s * 1.4), Math.PI + s * 0.12);
  }
  for (const w of wings) paintOpenWing(d, w, rng);
  plumes(d, pt(-6, 0), 14, 2.2, 0);
  egretPlumage(d, body, rng, { n: 62, size: 3.1, line: 0.6 });
  paintNeck(d, neck);
  paintHead(d, neck.spine[neck.spine.length - 1]!, 0, 10.5, false);
}

function draw(d: Draw, pose: Pose): void {
  if (pose === 'fly0' || pose === 'fly1') flying(d, pose);
  else standing(d, pose);
}

export const EGRET_ART: SpriteArt<Pose> = { frame: 96, res: 2, poses: ['stand', 'fish', 'walk0', 'walk1', 'fly0', 'fly1'], draw };
