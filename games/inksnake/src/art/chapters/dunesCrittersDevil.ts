import { createRng } from '../../logic/rng';
import { closed, type Draw, pt, ribbon, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { glaze } from '../critters/preyKit';

/**
 * A dust devil, seen from above, travelling +x: a whirl of sand about 50
 * across, three spiral arms of blown dust wound round a dark eye, grit and
 * pebbles flung along them, a creosote leaf and a twig caught up in it,
 * and a skirt of dust trailing behind. 'spin0' and 'spin1' are two turns
 * of its spin (the arms half a step apart), so it whirls as it goes.
 */
type Pose = 'spin0' | 'spin1';

const D = {
  sand: '#dcc596',
  dust: '#c9ad78',
  deep: '#8f7347',
  dark: '#5e4a2f',
  pale: '#f1e4c4',
  leaf: '#7f8a4a',
  twig: '#6b4e33',
} as const;

const ARMS = 3;
const R0 = 3;
const R1 = 25;
/** How far round each arm winds from its root to its tip, radians. */
const WIND = 4.2;

/** A point on arm i at t (0 root .. 1 tip), turned by `rot`; the spiral squashed a little along its travel. */
function armAt(i: number, t: number, rot: number): Pt {
  const a = rot + (i / ARMS) * TAU + t * WIND;
  const r = R0 + (R1 - R0) * t ** 0.85;
  return pt(Math.cos(a) * r * 1.06, Math.sin(a) * r * 0.94);
}

function arm(i: number, rot: number, n = 40): Pt[] {
  return Array.from({ length: n + 1 }, (_, k) => armAt(i, k / n, rot));
}

/** The dust skirt: a soft cloud under it, trailing back the way it came. */
function skirt(d: Draw): void {
  glaze(d, -6, 1.5, 34, 26, 0, D.dust, 0.32);
  glaze(d, -22, 1, 22, 13, 0, D.sand, 0.3);
  glaze(d, 2, 3, 22, 20, 0, D.deep, 0.16);
  const rng = createRng(6601 + d.f);
  for (let i = 0; i < 9; i++) {
    const y = (rng() - 0.5) * 30;
    const x0 = -14 - rng() * 10;
    const len = 10 + rng() * 14;
    d.pen.hair([pt(x0, y), pt(x0 - len * 0.5, y + (rng() - 0.5) * 2), pt(x0 - len, y + (rng() - 0.5) * 3)], 0.45, D.deep, 0.25 + rng() * 0.2);
  }
}

/** One arm of blown sand: a broad soft wash, a denser band down its leading edge, and motion lines along it. */
function paintArm(d: Draw, i: number, rot: number): void {
  const { pen } = d;
  const spine = arm(i, rot);
  const wide = ribbon(spine, (u) => 3 + 11 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.8).shape;
  const band = ribbon(spine.map((p, k) => pt(p.x * (1 - 0.06 * (k / 40)), p.y * (1 - 0.06 * (k / 40)))), (u) => 1.2 + 4.2 * Math.sin(Math.PI * Math.min(1, u * 1.1))).shape;
  pen.fill(wide, D.sand, 0.42);
  pen.fill(band, D.dust, 0.62);
  pen.clipped(band, () => pen.crescent(band, pt(-1, -1.4), () => pen.fill(band, D.deep, 0.45)));
  pen.clipped(wide, () => pen.crescent(wide, pt(1.2, 1.6), () => pen.fill(wide, D.pale, 0.35)));
  // Streaks of moving sand, winding with the arm.
  for (const [o, w, a] of [[-2.6, 0.45, 0.45], [0, 0.6, 0.6], [2.4, 0.4, 0.4], [4.8, 0.3, 0.3]] as const) {
    const line = spine.slice(4 + Math.abs(Math.round(o)), 38).map((p) => {
      const r = Math.hypot(p.x, p.y) || 1;
      return pt(p.x + (p.x / r) * o, p.y + (p.y / r) * o);
    });
    pen.hair(line, w, d.ink, a);
  }
  pen.hair(spine.slice(8, 36), 0.9, D.pale, 0.55);
}

/** Grit and pebbles flung round the whirl: specks along the arms, a few stones inked. */
function grit(d: Draw, rot: number): void {
  const { pen } = d;
  const rng = createRng(6611 + d.f * 7);
  for (let k = 0; k < 120; k++) {
    const i = Math.floor(rng() * ARMS);
    const t = 0.1 + rng() * 0.95;
    const p = armAt(i, t, rot);
    const r = Math.hypot(p.x, p.y) || 1;
    const off = (rng() - 0.5) * 9 * t;
    const q = pt(p.x + (p.x / r) * off, p.y + (p.y / r) * off);
    const g = 0.3 + rng() * 0.5;
    pen.dot(q.x, q.y, g, rng() < 0.4 ? D.dark : D.deep, 0.75);
  }
  for (let k = 0; k < 8; k++) {
    const p = armAt(k % ARMS, 0.35 + rng() * 0.6, rot);
    const s = 0.8 + rng() * 0.7;
    const stone = Array.from({ length: 7 }, (_, j) => pt(p.x + Math.cos((j / 7) * TAU) * s * (0.8 + rng() * 0.4), p.y + Math.sin((j / 7) * TAU) * s * (0.75 + rng() * 0.3)));
    pen.fill(stone, mix(D.dust, PAPER_FILL, 0.2), 1);
    pen.fill(stone.map((q) => pt(q.x + 0.3, q.y + 0.4)), D.deep, 0.4);
    pen.stroke(closed(stone), 0.3, d.ink, 0.85, false);
  }
}

/** A creosote leaf and a twig, caught up and whirled round. */
function debris(d: Draw, rot: number): void {
  const { pen } = d;
  const lp = armAt(0, 0.62, rot);
  const la = rot + 0.62 * WIND + Math.PI / 2;
  const leaf = Array.from({ length: 10 }, (_, j) => {
    const a = (j / 10) * TAU;
    return pt(lp.x + Math.cos(la) * Math.cos(a) * 2.4 - Math.sin(la) * Math.sin(a) * 1.1, lp.y + Math.sin(la) * Math.cos(a) * 2.4 + Math.cos(la) * Math.sin(a) * 1.1);
  });
  pen.fill(leaf, D.leaf, 0.95);
  pen.hair([pt(lp.x - Math.cos(la) * 2.2, lp.y - Math.sin(la) * 2.2), pt(lp.x + Math.cos(la) * 2.2, lp.y + Math.sin(la) * 2.2)], 0.25, d.ink, 0.6);
  pen.stroke(closed(leaf), 0.35, d.ink, 0.9, false);
  const tp = armAt(2, 0.8, rot);
  const ta = rot + (2 / ARMS) * TAU + 0.8 * WIND + 1.2;
  const a = pt(tp.x - Math.cos(ta) * 4, tp.y - Math.sin(ta) * 4);
  const b = pt(tp.x + Math.cos(ta) * 4, tp.y + Math.sin(ta) * 4);
  pen.stroke([a, pt(tp.x + 0.4, tp.y - 0.3), b], 1, D.twig, 1, false);
  pen.stroke([tp, pt(tp.x + Math.cos(ta + 0.9) * 2.2, tp.y + Math.sin(ta + 0.9) * 2.2)], 0.6, D.twig, 1, false);
  pen.hair([a, pt(tp.x + 0.4, tp.y - 0.3), b], 0.3, d.ink, 0.7);
}

/** The eye: a dark, dense hole of spinning grit, ringed with a pale lip of dust. */
function eye(d: Draw, rot: number): void {
  const { pen } = d;
  glaze(d, 0.4, 0.6, 6.5, 6, 0, D.dark, 0.55);
  glaze(d, 0, 0, 3.2, 3, 0, D.dark, 0.7);
  const ring = Array.from({ length: 40 }, (_, k) => {
    const a = rot + (k / 39) * TAU * 0.85;
    const r = 4.6 + 0.4 * Math.sin(k * 0.85);
    return pt(Math.cos(a) * r, Math.sin(a) * r);
  });
  pen.hair(ring, 0.8, D.pale, 0.6);
  pen.hair(ring.map((p) => pt(p.x * 0.6, p.y * 0.6)), 0.5, d.ink, 0.55);
}

function draw(d: Draw, pose: Pose): void {
  const rot = (pose === 'spin0' ? 0 : Math.PI / ARMS) + d.f * 0.12;
  skirt(d);
  for (let i = 0; i < ARMS; i++) paintArm(d, i, rot);
  grit(d, rot);
  debris(d, rot);
  eye(d, rot);
}

export const DUST_DEVIL_ART: SpriteArt<Pose> = {
  frame: 90,
  res: 2,
  poses: ['spin0', 'spin1'],
  draw,
};
