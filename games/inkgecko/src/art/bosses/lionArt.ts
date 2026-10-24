import { createRng, type Rng } from '../../logic/rng';
import { polar, SHADOW } from '../groundKit';
import { bezier, capsule, closed, cub, type Draw, pt, ribbon, TAU } from '../kit';
import { PAPER_FILL, STONE } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze, petalBlade } from '../propsKit';
import { mossPatch } from '../ruinsThings';
import { drawHead } from './lionHead';
import { crackPath, fissure, flyingChip, plinth, scar, stone } from './lionStone';
import type { BossArt } from './types';

/**
 * The Stone Lion (chapter 9, the ruins): an old garden statue of a lion
 * come to life, seen from above lying couchant on its weathered plinth and
 * facing +x, front paws stretched forward, haunches and hind paws tucked at
 * its sides and its tail curled round them. Pale lichen-spotted limestone,
 * moss in the crevices. 'roar' raises the head with the jaws wide, the mane
 * bristling and the sound inked in front of it; 'hurt' splits the stone
 * with fissures, knocks chips flying and shuts its eyes.
 */
const FRAME = 150;
const PLINTH = 100;
const TURN = -0.06;
const SEED = 9091;

/** The back from the rump to the shoulders: an egg, broader at the ribs. */
function back(): Pt[] {
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const c = Math.cos(a);
    return pt(-14 + c * 29, Math.sin(a) * 15.5 * (1 - 0.12 * Math.max(0, -c)));
  });
}

/** The tail: from the rump round the right haunch and forward along its side, a carved tuft at its end. */
function tail(): { shape: Pt[]; tip: Pt; ang: number } {
  const spine = [...cub(pt(-40, 4), pt(-50, 18), pt(-36, 32), pt(-18, 31.5), 14), ...cub(pt(-18, 31.5), pt(-10, 31), pt(-4, 31), pt(1, 29.5), 6).slice(1)];
  return { shape: ribbon(spine, (u) => 6 - 2.4 * u).shape, tip: spine[spine.length - 1]!, ang: -0.25 };
}

/** A paw from above, toes forward: a pad with four rounded toe lobes along its front. */
function pawShape(c: Pt, rx: number, ry: number): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const front = Math.max(0, Math.cos(a));
    const lobes = 1 + 0.07 * front * Math.abs(Math.sin(((a + Math.PI / 2) * 4) / 1)) - 0.05 * front;
    return pt(c.x + Math.cos(a) * rx * lobes, c.y + Math.sin(a) * ry * lobes);
  });
}

/** A paw's toes: carved grooves between them across its front, and the line of the knuckles. */
function toes(d: Draw, c: Pt, rx: number, ry: number): void {
  for (const k of [-1, 0, 1]) {
    d.pen.hair(bezier(pt(c.x + rx * 0.3, c.y + k * ry * 0.4), pt(c.x + rx * 0.75, c.y + k * ry * 0.5), pt(c.x + rx * 1.02, c.y + k * ry * 0.5), 5), 0.65, d.ink, 0.85);
  }
  d.pen.hair(bezier(pt(c.x - rx * 0.05, c.y - ry * 0.8), pt(c.x + rx * 0.25, c.y), pt(c.x - rx * 0.05, c.y + ry * 0.8), 6), 0.45, d.ink, 0.45);
}

/** Every piece of the lying body (tail, hind legs, haunches, back, forelegs), painted back to front. Returns their outlines. */
function bodyParts(d: Draw, rng: Rng): Pt[][] {
  const { pen } = d;
  const t = tail();
  const parts: Pt[][] = [];
  stone(d, t.shape, rng, { line: 1, lichen: 2 });
  pen.hair(t.shape.slice(2, 16).map((p, i) => pt(p.x * 0.5 + t.shape[t.shape.length - 3 - i]!.x * 0.5, p.y * 0.5 + t.shape[t.shape.length - 3 - i]!.y * 0.5)), 0.4, d.ink, 0.35);
  for (let i = 0; i < 4; i++) {
    const a = t.ang + (i - 1.5) * 0.45;
    const tuft = petalBlade(polar(t.tip, a + Math.PI, 1.5), a, 7.5 - Math.abs(i - 1.5) * 0.8, 4.6, (i - 1.5) * 0.08);
    stone(d, tuft.shape, rng, { line: 0.8, lichen: 0, grain: 0.3 });
    pen.hair([tuft.at(0.2, 0), tuft.at(0.7, 0.6)], 0.45, d.ink, 0.6);
  }
  parts.push(t.shape);
  for (const s of [-1, 1]) {
    const shin = capsule(pt(-24, s * 18.5), pt(-6, s * 21.5), 10, 8.4);
    stone(d, shin, rng, { line: 1, lichen: 1 });
    const paw = pawShape(pt(-2.5, s * 21.6), 6.8, 5.4);
    stone(d, paw, rng, { line: 1, lichen: 0, grain: 0.3 });
    toes(d, pt(-2.5, s * 21.6), 6.8, 5.4);
    parts.push(shin, paw);
  }
  for (const s of [-1, 1]) {
    const haunch = ellipseAt(-27, s * 12.5, 16.5, 11.5, s * 0.32, 30);
    stone(d, haunch, rng, { line: 1.2, lichen: 2 });
    pen.hair(bezier(pt(-38, s * 6), pt(-30, s * 19), pt(-15, s * 16), 8), 0.5, d.ink, 0.4);
    parts.push(haunch);
  }
  const torso = back();
  stone(d, torso, rng, { line: 1.3, lichen: 4 });
  pen.clipped(torso, () => {
    // The spine down the middle of the back, the shoulder blades and a few ribs under the stone.
    pen.stroke([pt(-40, 0.4), pt(-24, -0.4), pt(-8, 0.3), pt(6, 0)], 2.2, PAPER_FILL, 0.35, false);
    pen.hair([pt(-38, 1), pt(-24, 0.6), pt(-8, 1.2), pt(4, 1)], 0.55, d.ink, 0.45);
    for (const s of [-1, 1]) {
      pen.hair(bezier(pt(-6, s * 4), pt(0, s * 11), pt(8, s * 9), 8), 0.55, d.ink, 0.5);
      for (const x of [-20, -15, -10]) pen.hair([pt(x, s * 8), pt(x + 2.5, s * 13.5)], 0.4, d.ink, 0.3);
    }
  });
  parts.push(torso);
  for (const s of [-1, 1]) {
    const leg = capsule(pt(4, s * 12.5), pt(39, s * 13.6), 13, 10.6);
    pen.fill(leg.map((p) => pt(p.x + SHADOW.x * 2, p.y + SHADOW.y * 2)), d.ink, 0.12);
    stone(d, leg, rng, { line: 1.2, lichen: 2 });
    pen.hair([pt(14, s * (12.5 + 4.5)), pt(30, s * (13.4 + 4)), pt(36, s * (13.6 + 3.2))], 0.5, d.ink, 0.45);
    const paw = pawShape(pt(42.5, s * 13.8), 7.8, 6.8);
    stone(d, paw, rng, { line: 1.15, lichen: 1, grain: 0.3 });
    toes(d, pt(42.5, s * 13.8), 7.8, 6.7);
    parts.push(leg, paw);
  }
  // Moss where the stone holds the damp: under the mane at the shoulders, between haunch and back.
  for (const p of [pt(6, -18), pt(4, 18.5), pt(-14, -15.5), pt(-12, 16.5), pt(-42, -6)]) mossPatch(d, p, 2.8 + rng() * 1.4, rng, 0.6);
  return parts;
}

/** Clips drawing to the union of the shapes. */
function clipAll(d: Draw, shapes: readonly Pt[][], draw: () => void): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.beginPath();
  for (const s of shapes) s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.clip('nonzero');
  draw();
  ctx.restore();
}

/** The roar, inked in front of the open jaws: arcs of sound spreading towards +x and a few flung dashes. */
function roarLines(d: Draw): void {
  const { pen } = d;
  const m = pt(46, 0);
  for (const [r, span, w] of [[12, 0.62, 1.5], [18.5, 0.56, 1.35], [25, 0.5, 1.15]] as const) {
    const arc = Array.from({ length: 11 }, (_, i) => polar(m, -span + (i / 10) * span * 2, r));
    pen.stroke(arc, w + 1.6, PAPER_FILL, 0.55, false);
    pen.stroke(arc, w, d.ink, 0.9, false);
  }
  for (const a of [-0.95, -0.75, 0.75, 0.95]) pen.stroke([polar(m, a, 13), polar(m, a, 21)], 0.9, d.ink, 0.8, false);
}

/** The hit: fissures across the stone, raw scars where chips came away, and the chips flying. */
function damage(d: Draw, parts: readonly Pt[][], rng: Rng): void {
  const cracks = [
    crackPath(pt(-41, -8), 0.35, 30, rng),
    crackPath(pt(-14, 14), -1.1, 18, rng),
    crackPath(pt(6, -24), 0.85, 34, rng),
    crackPath(pt(24, 16), 0.15, 20, rng),
    crackPath(pt(-28, 20), -0.6, 12, rng),
    crackPath(pt(26, -13), 1.2, 16, rng),
  ];
  // Puffs of grit where the chips burst off.
  for (const [x, y, r] of [[-4, -32, 9], [38, -24, 7], [48, 22, 7], [-30, 32, 7]] as const) glaze(d, x, y, r, r * 0.8, 0, STONE, 0.45);
  clipAll(d, parts, () => {
    for (const c of cracks) fissure(d, c, rng, 1.9);
  });
  for (const [x, y, r] of [[2, -26, 2.6], [40, 19, 2], [-37, -14, 2.4]] as const) scar(d, pt(x, y), r, rng);
  for (const [x, y, a, r] of [[-6, -44, -1.9, 4.4], [30, -38, -0.9, 3.6], [55, 27, 0.5, 3.8], [-30, 43, 2.1, 3.4], [-57, -26, -2.6, 3], [14, 50, 1.4, 2.6], [60, -14, -0.3, 2.4]] as const) {
    flyingChip(d, pt(x, y), a, r, rng);
  }
}

function draw(d: Draw, pose: string): void {
  const rng = createRng(SEED);
  const roar = pose === 'roar';
  const hurt = pose === 'hurt';
  plinth(d, PLINTH, TURN, createRng(SEED + 1));
  // The lion's shadow on its plinth, then the lion.
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(SHADOW.x * 5, SHADOW.y * 5);
  for (const s of [back(), tail().shape, ellipseAt(-27, 12.5, 16.5, 11.5, 0.32, 20), ellipseAt(-27, -12.5, 16.5, 11.5, -0.32, 20), ellipseAt(16, 0, 26, 25, 0, 24)]) d.pen.fill(s, d.ink, 0.1);
  for (const s of [-1, 1]) d.pen.fill(capsule(pt(4, s * 12.5), pt(44, s * 13.6), 14, 12), d.ink, 0.1);
  ctx.restore();
  const parts = bodyParts(d, rng);
  const head = drawHead(d, { roar, shut: hurt }, rng);
  if (roar) roarLines(d);
  if (hurt) damage(d, [...parts, ...head], createRng(SEED + 7));
}

export const LION_ART: BossArt = { frame: FRAME, res: 3, poses: ['idle', 'roar', 'hurt'], draw };
