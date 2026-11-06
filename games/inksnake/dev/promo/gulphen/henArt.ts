import { createRng } from '../../../src/logic/rng';
import { petalBlade, ellipseAt, glaze } from '../../../src/art/critters/birdKit';
import { hackles, HEN_PAINT, henFeather, henPlumage } from '../../../src/art/critters/birdHenParts';
import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import { HEN_LEN, henBottom, henTop } from './story';

/**
 * The farmyard hen from the side, facing +x: the game's top-down russet hen
 * (critters/hen.ts) walked round to the camera with the same paint box, her
 * laced mahogany coat, gold hackles, dark tail, red comb and yellow feet. Her
 * body follows story.ts's outline, so the lump in the snake is her shape.
 *
 * Art units are the game's; PER_ART world units to one. Each part is its own
 * sprite with its origin at its joint, so she can peck, kick and fold.
 */
export const PER_ART = 6.6;

/** Her axis place `a` (world units from the nose) as an art x, measured from the body sprite's origin. */
const BODY_A = 380;
export const artX = (a: number): number => (BODY_A - a) / PER_ART;

/** Joints, along her axis (world units) and off it (art units, down). */
export const JOINTS = {
  body: { a: BODY_A, y: 0 },
  neck: { a: 215, y: 0 },
  tail: { a: 640, y: -17 },
  nearHip: { a: 430, y: 22 },
  farHip: { a: 372, y: 24 },
} as const;

/** The outline along `story.ts`'s curves, from the neck root to the tail root. */
function bodyShape(): Pt[] {
  const from = 190;
  const to = HEN_LEN - 30;
  const n = 46;
  const at = (i: number): number => from + ((to - from) * i) / n;
  // The chest rounds off under the hackles.
  const round = (a: number): number => Math.min(1, Math.max(0, (a - from + 6) / 90)) ** 0.5;
  const top = Array.from({ length: n + 1 }, (_, i) => pt(artX(at(i)), (-henTop(at(i)) * round(at(i))) / PER_ART));
  const bottom = Array.from({ length: n + 1 }, (_, i) => pt(artX(at(n - i)), (henBottom(at(n - i)) * round(at(n - i))) / PER_ART));
  return [...top, ...bottom];
}

/** The folded wing, feathers pointing back, a covert patch over their roots. */
function wing(d: Draw): void {
  const rng = createRng(6201);
  for (let i = 0; i < 6; i++) henFeather(d, petalBlade(pt(14 - i * 3.4, -6 + i * 3), Math.PI + 0.2 - i * 0.075, 50 - i * 3.5, 12.5), 12.5, false, 0.8);
  const coverts = [
    ...cub(pt(22, -11), pt(25, 1), pt(16, 13), pt(0, 13), 12),
    ...cub(pt(0, 13), pt(-13, 13), pt(-19, 5), pt(-15, -4), 10).slice(1),
    ...cub(pt(-15, -4), pt(-8, -15), pt(12, -18), pt(22, -11), 10).slice(1),
  ];
  henPlumage(d, coverts.map((p) => pt(6 + (p.x - 6) * 0.8, -2 + (p.y + 2) * 0.8)), rng, { n: 60, size: 3.8, line: 0.9 });
}

function drawBody(d: Draw): void {
  const rng = createRng(6151);
  henPlumage(d, bodyShape(), rng, { n: 420, size: 4.4, line: 1.5 });
  wing(d);
}

/** Her body with the wing folded. */
export const HEN_BODY: SpriteArt<'body'> = { frame: 170, res: 7, poses: ['body'], draw: drawBody };

function drawTail(d: Draw): void {
  for (const [ang, len] of [[-0.5, 32], [0.5, 32], [-0.34, 37], [0.36, 37], [-0.17, 41], [0.18, 41], [0, 43]] as const) {
    henFeather(d, petalBlade(pt(0, 0), Math.PI + ang, len, 12.5, ang * 0.08), 12.5, true, 0.85);
  }
}

/** Her tail, pointing −x from its root. */
export const HEN_TAIL: SpriteArt<'tail'> = { frame: 90, res: 7, poses: ['tail'], draw: drawTail };

/** The comb from the side: a red blade of rounded points along the crown. */
function comb(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const pts: Pt[] = [];
  const peaks = 5;
  const [x0, x1] = [c.x - r * 0.95, c.x + r * 0.95];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    const rise = (0.6 + 0.9 * Math.sin(Math.PI * (0.12 + u * 0.8))) * (0.62 + 0.45 * Math.abs(Math.sin(u * peaks * Math.PI)));
    pts.push(pt(x0 + (x1 - x0) * u, c.y - r * 0.72 - r * 0.62 * rise));
  }
  const shape = [...pts, pt(x1, c.y - r * 0.5), pt(x0, c.y - r * 0.5)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HEN_PAINT.comb, 0.97);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x + 0.4, p.y + 3.4)), HEN_PAINT.combDeep, 0.35);
    pen.hair(pts.map((p) => pt(p.x - 0.4, p.y + 1.1)), 0.9, HEN_PAINT.combLight, 0.9);
  });
  pen.stroke(closed(shape), 1, d.ink, 1, false);
}

function wattle(d: Draw, x: number, y: number, r: number): void {
  const w = ellipseAt(x, y, r * 0.8, r * 1.2, 0.1, 18);
  d.pen.fill(w, HEN_PAINT.comb, 0.97);
  d.pen.crescent(w, pt(-1, -1.2), () => d.pen.fill(w, HEN_PAINT.combDeep, 0.5));
  d.pen.hair(closed(w), 0.8, d.ink, 0.95);
}

/** The beak from the side, a short horn hook, open when `gape` > 0. */
function beak(d: Draw, x: number, y: number, len: number, gape: number): void {
  const { pen } = d;
  const lower = [pt(x, y + 1.4), pt(x + len * 0.72, y + 1.4 + gape * 1.1), pt(x + len * 0.12, y + 4.6 + gape * 0.5)];
  pen.fill(lower, HEN_PAINT.beakDeep, 1);
  pen.stroke(closed(lower), 0.8, d.ink, 1, false);
  if (gape > 0) pen.fill([pt(x, y + 1), pt(x + len * 0.72, y + 1.4), pt(x + len * 0.72, y + 1.4 + gape), pt(x, y + 3)], '#7a1f28', 1);
  const upper = [
    ...cub(pt(x, y - 4.6), pt(x + len * 0.45, y - 4.8), pt(x + len * 0.9, y - 2.6), pt(x + len, y + 1.8 - gape * 0.4), 10),
    ...cub(pt(x + len, y + 1.8 - gape * 0.4), pt(x + len * 0.72, y + 1.2), pt(x + len * 0.3, y + 1.4), pt(x, y + 1.6), 8).slice(1),
  ];
  pen.fill(upper, HEN_PAINT.beak, 1);
  pen.clipped(upper, () => pen.crescent(upper, pt(-0.8, -1.4), () => pen.fill(upper, HEN_PAINT.beakDeep, 0.6)));
  pen.hair([pt(x + 1.5, y - 2.6), pt(x + len * 0.7, y - 1.6)], 0.7, PAPER_FILL, 0.8);
  pen.stroke(closed(upper), 0.9, d.ink, 1, false);
}

/** The eye: amber and calm, or stretched wide with a tiny pupil. */
function eye(d: Draw, x: number, y: number, alarm: boolean): void {
  const { pen } = d;
  const r = alarm ? 5.6 : 3.1;
  const ball = oval(x, y, r, r * (alarm ? 1.08 : 1), 22);
  pen.fill(ball, alarm ? PAPER_FILL : HEN_PAINT.eye, 1);
  if (alarm) {
    pen.dot(x + 1.1, y + 0.2, 2.5, HEN_PAINT.eye, 1);
    pen.dot(x + 1.3, y + 0.2, 1.45, '#140c08', 1);
    pen.dot(x + 0.5, y - 0.7, 0.55, PAPER_FILL, 1);
  } else {
    pen.dot(x + 0.5, y, 1.45, '#140c08', 1);
    pen.dot(x - 0.2, y - 0.8, 0.6, PAPER_FILL, 1);
  }
  pen.stroke(closed(ball), alarm ? 1.25 : 1, d.ink, 1, false);
  if (!alarm) pen.hair([pt(x - r * 1.05, y - r * 0.65), pt(x + r * 1.05, y - r * 0.55)], 0.9, d.ink, 0.9);
}

type HeadPose = 'calm' | 'alarm';

/** Neck and head, the origin at the neck's root, along +x. */
function drawHead(d: Draw, pose: HeadPose): void {
  const rng = createRng(6161);
  const alarm = pose === 'alarm';
  const c = pt(18.2, 0);
  const r = 10.6;
  comb(d, c, r);
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(1.4, 1.4);
  hackles(d, rng, pt(2.6, 0), 10.5, 9, alarm ? 0.5 : 0);
  ctx.restore();
  wattle(d, c.x + 8.2, c.y + 9.8, 3.1);
  wattle(d, c.x + 3.8, c.y + 11, 3.6);
  const head = ellipseAt(c.x, c.y, r * 1.12, r * 0.98, 0, 30);
  henPlumage(d, head, rng, { n: 42, size: 2.7, line: 1.15 });
  const lobe = ellipseAt(c.x - 4.4, c.y + 3.6, 2.2, 3, 0, 14);
  d.pen.fill(lobe, HEN_PAINT.comb, 0.82);
  glaze(d, c.x + 6, c.y + 2, 6, 5, 0, HEN_PAINT.comb, 0.45);
  beak(d, c.x + r * 0.92, c.y + 0.6, 10.5, alarm ? 3.6 : 0);
  eye(d, c.x + 3.4, c.y - 3, alarm);
}

export const HEN_HEAD: SpriteArt<HeadPose> = { frame: 96, res: 7, poses: ['calm', 'alarm'], draw: drawHead };

/** The leg, hanging +y from the hip: a feathered thigh, the scaly shank, the foot with its toes along +x. */
function drawLeg(d: Draw): void {
  const { pen } = d;
  const rng = createRng(6171);
  const shank = cub(pt(1, 10), pt(0, 16), pt(-0.5, 24), pt(0.5, 31), 14);
  const r = ribbon(shank, (u) => 4.8 - 1.1 * u).shape;
  pen.fill(r, HEN_PAINT.foot, 1);
  pen.clipped(r, () => {
    pen.fill(r.map((p) => pt(p.x + 1.1, p.y)), HEN_PAINT.beakDeep, 0.5);
    for (let i = 0; i < 9; i++) pen.hair([pt(-5, 12 + i * 2.2), pt(5, 11.4 + i * 2.2)], 0.4, d.ink, 0.55);
  });
  pen.stroke(closed(r), 0.9, d.ink, 1, false);
  // The foot: three fat toes forward, one back, each clawed.
  const heel = pt(0.5, 32);
  for (const [ang, len] of [[Math.PI, 8], [0.42, 15], [-0.02, 18], [-0.46, 14]] as const) {
    const tip = pt(heel.x + Math.cos(ang) * len, heel.y + Math.sin(ang) * len * 0.42 + 1);
    const toe = ribbon([heel, pt((heel.x + tip.x) / 2, (heel.y + tip.y) / 2 - 0.5), tip], (u) => 3.4 - 1.4 * u).shape;
    pen.fill(toe, HEN_PAINT.foot, 1);
    pen.stroke(closed(toe), 0.85, d.ink, 1, false);
    pen.hair([tip, pt(tip.x + Math.sign(Math.cos(ang)) * 2.6, tip.y + 0.8)], 1, d.ink, 1);
  }
  pen.dot(heel.x, heel.y, 3, HEN_PAINT.foot, 1);
  henPlumage(d, ellipseAt(1, 3, 7.4, 10, 0.1, 24), rng, { n: 34, size: 3, dir: () => Math.PI / 2, line: 0.7 });
}

export const HEN_LEG: SpriteArt<'leg'> = { frame: 96, res: 7, poses: ['leg'], draw: drawLeg };

/** One loose breast feather, along +x: pale gold, curved, split once at its edge, a tuft of down at its root. */
function drawFeather(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const f = petalBlade(pt(-11, 0), 0, 24, 9.4, 0.12);
  pen.fill(f.shape, PAPER_FILL, 1);
  pen.fill(f.shape, HEN_PAINT.gold, 0.75);
  pen.clipped(f.shape, () => {
    pen.fill(f.shape.map((p) => pt(p.x + 11, p.y)), HEN_PAINT.russet, 0.55);
    for (let i = 1; i < 9; i++) for (const s of [-1, 1]) pen.hair([f.at(i * 0.1, 0), f.at(i * 0.1 + 0.08, s * 5)], 0.28, HEN_PAINT.deep, 0.35);
  });
  pen.hair([pt(-14, 0.5), f.at(0.92, 0)], 0.6, HEN_PAINT.dark, 0.85);
  pen.stroke(closed(f.shape), 0.5, d.ink, 0.75, false);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,1)';
  for (const [t, s] of [[0.62, 1], [0.42, -1]] as const) {
    const [a, b, c] = [f.at(t - 0.02, s * 6), f.at(t + 0.09, s * 6), f.at(t + 0.015, s * 1.1)];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 7; i++) pen.hair([pt(-11, 0), pt(-8 - i * 0.6, -4.6 + i * 1.5)], 0.4, HEN_PAINT.gold, 0.9);
}

export const HEN_FEATHER: SpriteArt<'feather'> = { frame: 28, res: 8, poses: ['feather'], draw: drawFeather };
