import { PAPER_FILL } from '../../../src/art/fish/kit';
import { INK, Pen, type Pt } from '../../../src/art/pen';

/**
 * The pistol shrimp's big snapping claw, drawn onto the game's own shrimp
 * (critterArt.ts has no claws on it) in the same pen and ink: paper, a
 * misregistered wash, hatching under the palm, dark finger tips, a wobbly
 * outline. Everything is in the shrimp drawing's texture px, origin at its
 * centre, head to the right, so it lines up with drawCritter('shrimp').
 *
 * The real claw is a swollen palm with a short fixed finger and a hinged
 * one on top (the dactyl). The dactyl cocks open and locks, then slams
 * shut: a plunger on it drives into a socket in the fixed finger and shoots
 * a jet of water out of the front, fast enough to tear a bubble open.
 */

export const CLAW_WASH = '#d9874a';
const SHRIMP_WASH = '#d6a95a';

/**
 * The claw is drawn in the units of the game's crab claws, then blown up by
 * CLAW_SCALE from where the arm leaves the body: the pistol claw is huge.
 */
const ROOT: Pt = { x: 40, y: 8 };
export const CLAW_SCALE = 1.25;
const big = (p: Pt): Pt => ({ x: ROOT.x + (p.x - ROOT.x) * CLAW_SCALE, y: ROOT.y + (p.y - ROOT.y) * CLAW_SCALE });

/** The dactyl's hinge, on the top front of the palm (drawing units). */
const HINGE_AT: Pt = { x: 119, y: -3 };
/** The hinge, where the jet comes out (the front of the shut claw) and the middle of the palm, in shrimp texture px. */
export const HINGE: Pt = big(HINGE_AT);
export const JET_FROM: Pt = big({ x: 153, y: 9 });
export const PALM: Pt = big({ x: 98, y: 5 });
/** How far the dactyl swings up when cocked, radians. */
export const OPEN_RAD = 1.45;

const pt = (x: number, y: number): Pt => ({ x, y });
const closed = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];

function cub(p0: Pt, c0: Pt, c1: Pt, p1: Pt, n = 14): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return pt(u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x, u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y);
  });
}

/** A path thickened into a closed shape, tapering from `w0` to `w1`. */
function tube(path: readonly Pt[], w0: number, w1: number): Pt[] {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  path.forEach((p, i) => {
    const a = path[Math.max(0, i - 1)]!;
    const b = path[Math.min(path.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = pt((b.y - a.y) / d, -(b.x - a.x) / d);
    const h = (w0 + ((w1 - w0) * i) / (path.length - 1)) / 2;
    top.push(pt(p.x + n.x * h, p.y + n.y * h));
    bot.push(pt(p.x - n.x * h, p.y - n.y * h));
  });
  return [...top, ...bot.reverse()];
}

/** A tapered segment with rounded ends. */
function capsule(a: Pt, b: Pt, w0: number, w1: number): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const arc = (c: Pt, r: number, from: number): Pt[] =>
    Array.from({ length: 7 }, (_, i) => pt(c.x + Math.cos(from + (i / 6) * Math.PI) * r, c.y + Math.sin(from + (i / 6) * Math.PI) * r));
  return [...arc(b, w1 / 2, ang - Math.PI / 2), ...arc(a, w0 / 2, ang + Math.PI / 2)];
}

const rotateAbout = (pts: readonly Pt[], c: Pt, a: number): Pt[] => {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return pts.map((p) => pt(c.x + (p.x - c.x) * cos - (p.y - c.y) * sin, c.y + (p.x - c.x) * sin + (p.y - c.y) * cos));
};

/** Paper, then the wash a little off register, like the game's skin(). */
function skin(pen: Pen, shape: readonly Pt[], wash: string, strength: number): void {
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.ctx.translate(1.5, 1);
    pen.fill(shape, wash, strength);
    pen.ctx.translate(-1.5, -1);
  });
}

const PALM_SHAPE: readonly Pt[] = [
  ...cub(pt(70, 2), pt(80, -16), pt(108, -20), pt(124, -8)),
  ...cub(pt(124, -8), pt(130, -2), pt(130, 10), pt(126, 17), 6).slice(1),
  ...cub(pt(126, 17), pt(112, 30), pt(84, 30), pt(70, 17)).slice(1),
  ...cub(pt(70, 17), pt(65, 13), pt(65, 6), pt(70, 2), 6).slice(1, -1),
];
const FIXED = tube(cub(pt(121, 13), pt(132, 16), pt(144, 15), pt(153, 9), 10), 13, 3);
/** The dactyl, shut: from the hinge over the fixed finger to the tip. */
const DACTYL = tube(cub(HINGE_AT, pt(134, 0), pt(147, 4), pt(155, 9), 10), 14, 3.4);
const PLUNGER = { x: 127, y: 5 } as const;

/** Where the dactyl's tip is at `open` (0 shut .. 1 cocked), shrimp texture px. */
export function dactylTip(open: number): Pt {
  return big(rotateAbout([{ x: 155, y: 9 }], HINGE_AT, -open * OPEN_RAD)[0]!);
}

/**
 * The big claw on the near side, `open` 0 shut .. 1 cocked. Drawn with the
 * pen's current context already in shrimp texture px.
 */
export function drawPistolClaw(pen: Pen, open: number): void {
  const ink = INK;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(ROOT.x, ROOT.y);
  ctx.scale(CLAW_SCALE, CLAW_SCALE);
  ctx.translate(-ROOT.x, -ROOT.y);
  // The arm: from under the carapace, forward and down to the palm.
  const arm = [pt(40, 8), pt(56, 19), pt(70, 13)];
  const widths = [8, 9, 11];
  for (let i = arm.length - 2; i >= 0; i--) {
    const seg = capsule(arm[i]!, arm[i + 1]!, widths[i]!, widths[i + 1]!);
    skin(pen, seg, SHRIMP_WASH, 0.36);
    pen.stroke(closed(seg), 0.95, ink, 1, false);
  }
  // The fixed finger, with the socket the plunger drives into.
  skin(pen, FIXED, CLAW_WASH, 0.5);
  pen.clipped(FIXED, () => pen.fill(cub(pt(140, 2), pt(150, 2), pt(158, 8), pt(156, 20), 6).concat([pt(138, 22)]), ink, 0.5));
  pen.stroke(closed(FIXED), 1.1, ink, 1, false);
  // The palm: swollen, banded, hatched underneath.
  skin(pen, PALM_SHAPE, CLAW_WASH, 0.5);
  pen.clipped(PALM_SHAPE, () => {
    pen.stipple(PALM_SHAPE, 220, (_, y) => Math.max(0, Math.min(1, (y + 12) / 34)) * 0.7, 0.6, '#8a4220');
    pen.hatch(PALM_SHAPE, 2.6, 0.12, 0.5, { onlyBelow: 8, color: ink, alpha: 0.5 });
    pen.hair(cub(pt(78, -8), pt(92, -16), pt(110, -16), pt(120, -9), 10), 1.4, PAPER_FILL, 0.75);
    pen.hair(cub(pt(84, 26), pt(80, 12), pt(82, -2), pt(88, -14), 8), 0.7, ink, 0.6);
  });
  pen.stroke(closed(PALM_SHAPE), 1.3, ink);
  // The socket shows while the claw is cocked.
  if (open > 0.05) {
    const socket = [pt(124, 9), pt(130, 6), pt(136, 8), pt(131, 12)];
    pen.fill(socket, ink, 0.75 * Math.min(1, open * 2));
  }
  // The dactyl on its hinge, with the plunger under it.
  const a = -open * OPEN_RAD;
  const dactyl = rotateAbout(DACTYL, HINGE_AT, a);
  const plunger = rotateAbout([PLUNGER], HINGE_AT, a)[0]!;
  const knob = Array.from({ length: 12 }, (_, i) => pt(plunger.x + Math.cos((i / 12) * Math.PI * 2) * 4.2, plunger.y + Math.sin((i / 12) * Math.PI * 2) * 3.4));
  skin(pen, knob, CLAW_WASH, 0.55);
  pen.stroke(closed(knob), 0.8, ink, 1, false);
  skin(pen, dactyl, CLAW_WASH, 0.55);
  pen.clipped(dactyl, () => {
    pen.fill(rotateAbout(cub(pt(144, -8), pt(152, -6), pt(160, 2), pt(158, 12), 6).concat([pt(140, 10)]), HINGE_AT, a), ink, 0.5);
    pen.hatch(dactyl, 2.4, 0.4 + a, 0.45, { color: ink, alpha: 0.35 });
  });
  pen.stroke(closed(dactyl), 1.15, ink, 1, false);
  pen.dot(HINGE_AT.x, HINGE_AT.y, 1.8, ink, 0.9);
  ctx.restore();
}
