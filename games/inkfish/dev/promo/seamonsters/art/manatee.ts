import { ellipse, INK, type Pen } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import type { KitEntry } from '../../foodchain/kit';
import { boilOf, paint, penFor, type Pt, range, rot, spline, trace } from '../../swallowyou/art/ink';

/**
 * The West Indian manatee, side on, in the game's pen and ink painted like
 * the crocodile (../../swallowyou/art/croc.ts): a big soft grey-brown sack of
 * a body, wrinkled, with a few sparse hairs and a green tinge of algae on the
 * back; the bristly, split upper lip working away at its salad; a tiny eye
 * in a fold of skin; small front flippers with fingernails; and the round
 * paddle of a tail, seen a little from above so it reads as a paddle and
 * tilting as it beats. It should look gentle and a bit funny.
 *
 * Local px: the snout's tip at x = 0, facing right, the tail tip at
 * x = -LEN, y down, the body's middle line at y = 0.
 */

const LEN = 1000;

export interface ManateePose {
  /** The lips working, 0 shut .. 1 open (cycle it to chew). */
  readonly chew?: number;
  /** The eye: 0 open .. 1 shut. */
  readonly blink?: number;
  /** Seagrass blades trailing from the mouth. */
  readonly grass?: boolean;
  /** The tail's paddle stroke phase, radians (defaults to a slow stroke with time). */
  readonly paddle?: number;
}

/** Body height (flippers and the tail's stroke included) over length, for laying it out beside "you". */
export const MANATEE_HEIGHT = 0.4;

const GREY_TOP = '#45413b';
const GREY = '#625b52';
const GREY_FLANK = '#7f776b';
const GREY_BELLY = '#9e9588';
const SKIN_DARK = '#2a2622';
const MUZZLE = '#968a7f';
const MUZZLE_LIGHT = '#b9ac9f';
const MUZZLE_SHADE = '#6a6058';
const NAIL = '#e8dfcc';
const MOUTH_DARK = '#3a2423';
const TONGUE = '#9a6662';
const GRASS = ['#7f9c4a', '#5b7a35', '#445f2a'] as const;

/** The eye, small, in a fold behind the muzzle. */
const EYE = { x: -112, y: -60, r: 8 } as const;
/** The lower lip turns about here as it chews. */
const LIP_HINGE: Pt = { x: -74, y: 50 };

// ---------------------------------------------------------------- the shapes

/** Upper outline from behind the muzzle pad, up the sloping face, over the round back, to the broad tail stock. */
const TOP: readonly Pt[] = spline([
  { x: -6, y: -34 }, { x: -14, y: -52 }, { x: -34, y: -67 }, { x: -66, y: -80 }, { x: -105, y: -91 }, { x: -150, y: -106 }, { x: -198, y: -125 },
  { x: -250, y: -143 }, { x: -320, y: -158 }, { x: -420, y: -166 }, { x: -520, y: -160 }, { x: -610, y: -140 }, { x: -690, y: -106 }, { x: -755, y: -70 },
  { x: -805, y: -42 }, { x: -845, y: -27 },
], 5);

/** The underside, tail stock forward to the chin; then back up under the muzzle (hidden by the lips). */
const UNDER: readonly Pt[] = spline([
  { x: -845, y: 23 }, { x: -800, y: 44 }, { x: -760, y: 62 }, { x: -700, y: 92 }, { x: -610, y: 130 }, { x: -500, y: 156 }, { x: -390, y: 166 }, { x: -290, y: 160 },
  { x: -215, y: 140 }, { x: -160, y: 114 }, { x: -120, y: 94 }, { x: -88, y: 80 }, { x: -64, y: 72 },
], 5);
const HIDDEN: readonly Pt[] = [{ x: -48, y: 50 }, { x: -30, y: 20 }, { x: -16, y: -14 }];

/** The big bristly upper lip (the muzzle pad), round at the front, split down the middle. */
const MUZZLE_PAD: readonly Pt[] = [
  { x: -4, y: -40 }, { x: 8, y: -26 }, { x: 14, y: -6 }, { x: 13, y: 14 }, { x: 6, y: 30 }, { x: -8, y: 40 }, { x: -30, y: 44 }, { x: -52, y: 42 },
  { x: -62, y: 30 }, { x: -60, y: 8 }, { x: -50, y: -14 }, { x: -32, y: -34 },
];

/** The small lower lip under it. */
const LOWER_LIP: readonly Pt[] = [
  { x: -58, y: 42 }, { x: -34, y: 42 }, { x: -16, y: 46 }, { x: -10, y: 56 }, { x: -18, y: 66 }, { x: -40, y: 74 }, { x: -68, y: 76 }, { x: -86, y: 70 }, { x: -80, y: 56 },
];

/** The folds round the neck, and where they run (x at the top .. x at the bottom). */
const NECK_FOLDS: readonly (readonly [number, number])[] = [[-158, -150], [-184, -178], [-214, -210]];

interface Mark { readonly p: Pt; readonly a: number; readonly len: number; readonly alpha: number }

/** Fixed to the skin (not the boil): creases across the body, a few sparse hairs. */
function marks(seed: number, n: number, len: readonly [number, number], spread: number): readonly Mark[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => {
    const x = -230 - rng() * 520;
    const top = edgeY(TOP, x);
    const bottom = edgeY(UNDER, x);
    const y = top + (bottom - top) * (0.08 + rng() * 0.84);
    return { p: { x, y }, a: Math.PI / 2 + (rng() - 0.5) * spread, len: len[0] + rng() * (len[1] - len[0]), alpha: 0.2 + rng() * 0.25 };
  });
}

function edgeY(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }
  return line[line.length - 1]!.y;
}

const CREASES = marks(3301, 46, [18, 42], 0.7);
const HAIRS = marks(3302, 80, [4, 8], 1.4);
/** Bristle follicles on the muzzle pad. */
const FOLLICLES: readonly Pt[] = (() => {
  const rng = createRng(3303);
  return Array.from({ length: 46 }, () => ({ x: -48 + rng() * 58, y: -26 + rng() * 64 }));
})();

// ---------------------------------------------------------------- the tail's stroke

/** The tail stock bends up and down behind the hips, most at the paddle. */
function stockDy(x: number, phase: number): number {
  const b = Math.max(0, (-x - 560) / 240);
  return 24 * b * b * Math.sin(phase - 1.1 * b);
}

const flex = (p: Pt, phase: number): Pt => ({ x: p.x, y: p.y + stockDy(p.x, phase) });

// ---------------------------------------------------------------- drawing

interface Kit {
  readonly ctx: CanvasRenderingContext2D;
  readonly pen: Pen;
  /** Local px per screen px. */
  readonly k: number;
  readonly ink: number;
  readonly t: number;
}

/**
 * The round paddle: a disc seen a little from above (so it reads as a
 * paddle, not a line), tilting through its stroke; drawn over the end of the
 * tail stock, as its leading edge would hide it.
 */
function drawPaddle(c: Kit, phase: number): void {
  const centre = { x: -893, y: stockDy(-893, phase) };
  const tilt = Math.atan((stockDy(-900, phase) - stockDy(-860, phase)) / -40) * 0.8;
  const rx = 107;
  const ry = 36 + 22 * (0.5 + 0.5 * Math.cos(phase - 1.3));
  const at = (a: number, f = 1): Pt => rot({ x: centre.x - rx * f * Math.cos(a), y: centre.y + ry * f * Math.sin(a) }, tilt, centre);
  const disc = range(36, (u) => at(u * Math.PI * 2));
  paint(c.ctx, c.pen, disc, { from: at(-Math.PI / 2), to: at(Math.PI / 2), stops: [GREY_FLANK, GREY, GREY_TOP], ink: 0, hatch: 0, mottle: 0.6, seed: 41 });
  // Fine skin lines fanning back across it from the stock, a darker rim, light along its near edge.
  c.pen.clipped(disc, () => {
    for (let i = 1; i < 8; i++) c.pen.hair([at(Math.PI, 0.55), at(-1.3 + (i / 8) * 2.6)], Math.max(0.5, 0.7 * c.k), SKIN_DARK, 0.2);
    c.pen.stroke(range(24, (u) => at(-1.9 + u * 3.8)), 10, 'rgba(30,26,22,0.3)', 1, false);
    trace(c.ctx, range(12, (u) => at(Math.PI - 1 + u * 2, 0.9)), false);
    c.ctx.lineWidth = 5;
    c.ctx.strokeStyle = 'rgba(225,215,195,0.14)';
    c.ctx.stroke();
  });
  c.pen.stroke(disc, c.ink, INK, 1, true);
}

/** A front flipper: a short rounded paddle swinging from the shoulder, three pale nails at its tip. */
function drawFlipper(c: Kit, root: Pt, angle: number, far: boolean): void {
  const local = (p: Pt): Pt => ({ x: root.x + p.x * Math.cos(angle) - p.y * Math.sin(angle), y: root.y + p.x * Math.sin(angle) + p.y * Math.cos(angle) });
  const shape = spline([
    { x: 0, y: -15 }, { x: 40, y: -17 }, { x: 78, y: -24 }, { x: 102, y: -20 }, { x: 114, y: -4 }, { x: 108, y: 14 }, { x: 84, y: 23 }, { x: 44, y: 17 }, { x: 0, y: 14 },
  ], 4, true).map(local);
  const stops = far ? [SKIN_DARK, GREY_TOP, GREY] : [GREY_FLANK, GREY, GREY_TOP];
  paint(c.ctx, c.pen, shape, { from: local({ x: 0, y: -24 }), to: local({ x: 0, y: 24 }), stops, ink: 0, hatch: 0, mottle: 0.5, seed: far ? 42 : 43 });
  // Inked round all but the root, which melts into the shoulder.
  const n = shape.length;
  c.pen.stroke(shape.slice(Math.round(n * 0.08), Math.round(n * 0.94)), c.ink * 0.9, INK, 1, true);
  if (far) return;
  c.pen.clipped(shape, () => {
    const a = local({ x: -4, y: 0 });
    const b = local({ x: 34, y: 0 });
    const g = c.ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, 'rgba(127,119,107,1)');
    g.addColorStop(1, 'rgba(127,119,107,0)');
    c.ctx.fillStyle = g;
    c.ctx.fillRect(root.x - 60, root.y - 60, 120, 120);
  });
  // The elbow crease and the bones showing through the paddle.
  c.pen.hair([local({ x: 40, y: -16 }), local({ x: 47, y: 0 }), local({ x: 42, y: 15 })], Math.max(0.6, c.ink * 0.4), SKIN_DARK, 0.4);
  for (const side of [-11, -1, 9]) {
    const p = local({ x: 100 + (side === -1 ? 6 : 0), y: side - 3 });
    const nail = ellipse(p.x, p.y, 5.5, 4, 12).map((q) => rot(q, angle, p));
    c.pen.fill(nail, NAIL, 1);
    c.pen.hair([...nail, nail[0]!], Math.max(0.5, c.ink * 0.4), INK, 0.8);
  }
}

function drawBody(c: Kit, phase: number): readonly Pt[] {
  const outline = [...TOP, ...UNDER, ...HIDDEN].map((p) => flex(p, phase));
  paint(c.ctx, c.pen, outline, { from: { x: -400, y: -166 }, to: { x: -400, y: 166 }, stops: [GREY_TOP, GREY, GREY_FLANK, GREY_BELLY, GREY_FLANK], ink: 0, hatch: Math.max(10, 5 * c.k), hatchAlpha: 0.13, mottle: 0.6, seed: 44 });
  c.pen.clipped(outline, () => {
    // Algae tinting the back green, like moss on a rock.
    for (const [x, y, r] of [[-300, -150, 80], [-430, -165, 100], [-570, -140, 70], [-220, -125, 50]] as const) {
      const g = c.ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(112,128,64,0.3)');
      g.addColorStop(1, 'rgba(112,128,64,0)');
      c.ctx.fillStyle = g;
      c.ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    // Soft light on the round of the back and the head.
    for (const [x, y, r] of [[-380, -110, 240], [-80, -50, 70]] as const) {
      const sheen = c.ctx.createRadialGradient(x, y, 10, x, y, r);
      sheen.addColorStop(0, 'rgba(230,220,200,0.2)');
      sheen.addColorStop(1, 'rgba(230,220,200,0)');
      c.ctx.fillStyle = sheen;
      c.ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    drawSkin(c, phase);
  });
  return outline;
}

/** Wrinkles: rolls round the neck, creases across the body, a few sparse hairs. */
function drawSkin(c: Kit, phase: number): void {
  const fine = Math.max(0.5, 0.9 * c.k);
  for (const [top, bottom] of NECK_FOLDS) {
    const y0 = edgeY(TOP, top) * 0.78;
    const y1 = edgeY(UNDER, bottom) * 0.8;
    const fold = spline([{ x: top, y: y0 }, { x: top + 6, y: y0 * 0.45 + y1 * 0.1 }, { x: (top + bottom) / 2 + 10, y: (y0 + y1) / 2 + 8 }, { x: bottom + 3, y: y1 * 0.7 }, { x: bottom - 2, y: y1 }], 6);
    // A soft lit roll in front of each crease, then the crease itself.
    trace(c.ctx, fold.slice(1, -1).map((p) => ({ x: p.x + 6, y: p.y })), false);
    c.ctx.lineCap = 'round';
    c.ctx.strokeStyle = 'rgba(200,190,172,0.05)';
    for (const w of [16, 10, 5]) {
      c.ctx.lineWidth = w;
      c.ctx.stroke();
    }
    c.pen.stroke(fold, fine * 1.3, SKIN_DARK, 0.3, false);
  }
  if (c.k > 2.5) return;
  for (const m of CREASES) {
    const d = { x: Math.cos(m.a) * m.len, y: Math.sin(m.a) * m.len };
    const bow = { x: m.p.x + 4, y: m.p.y };
    c.pen.hair(spline([flex({ x: m.p.x - d.x / 2, y: m.p.y - d.y / 2 }, phase), flex(bow, phase), flex({ x: m.p.x + d.x / 2, y: m.p.y + d.y / 2 }, phase)], 3), fine, SKIN_DARK, m.alpha);
  }
  for (const h of HAIRS) {
    const q = flex(h.p, phase);
    c.pen.hair([q, { x: q.x - Math.cos(h.a) * h.len * 0.4 - h.len * 0.5, y: q.y - Math.sin(h.a) * h.len }], fine * 0.8, SKIN_DARK, 0.5);
  }
}

/** The small eye in its soft fold: a dark bead with a glint, or a contented closed curve when it blinks. */
function drawEye(c: Kit, blink: number): void {
  const { pen } = c;
  const r = Math.max(EYE.r, 2.4 * c.k);
  const { x, y } = EYE;
  const fine = Math.max(0.6, c.ink * 0.5);
  // The fold of skin round it.
  pen.hair(spline([{ x: x - r * 2.4, y: y + r * 0.2 }, { x, y: y - r * 2 }, { x: x + r * 2.3, y: y - r * 0.2 }], 5), fine, SKIN_DARK, 0.45);
  pen.hair(spline([{ x: x - r * 1.8, y: y + r * 1.2 }, { x, y: y + r * 1.9 }, { x: x + r * 1.7, y: y + r * 1.1 }], 5), fine, SKIN_DARK, 0.35);
  const open = 1 - Math.max(0, Math.min(1, blink));
  if (open > 0.12) {
    pen.fill(ellipse(x, y, r * 1.15, r * 0.95 * open, 18), '#191311', 1);
    pen.fill(ellipse(x + r * 0.1, y, r * 0.8, r * 0.75 * open, 16), '#3b2a22', 1);
    pen.dot(x + r * 0.35, y - r * 0.3 * open, r * 0.28, '#fff8ea', 0.95);
  }
  // The upper lid: its edge follows the eye down as it shuts, then curves like a smile.
  const lid = range(10, (u) => {
    const a = Math.PI + u * Math.PI;
    return { x: x + Math.cos(a) * r * 1.25, y: y + Math.sin(a) * r * open * 1.05 + (1 - open) * r * 0.5 * Math.sin(u * Math.PI) };
  });
  pen.stroke(lid, c.ink * 0.8, INK, 1, false);
}

/** The lips: the dark mouth when open, the lower lip, seagrass, and the bristly split upper lip over it all. */
function drawFace(c: Kit, chew: number, grass: boolean): void {
  const drop = chew * 0.3;
  const lower = LOWER_LIP.map((p) => rot(p, drop, LIP_HINGE));
  if (chew > 0.02) {
    const mouth = spline([{ x: -64, y: 38 }, { x: -34, y: 40 }, { x: -12, y: 40 }, rot({ x: -14, y: 48 }, drop, LIP_HINGE), rot({ x: -40, y: 46 }, drop, LIP_HINGE), rot({ x: -66, y: 46 }, drop, LIP_HINGE)], 3, true);
    c.pen.fill(mouth, MOUTH_DARK, 1);
    c.pen.fill(ellipse(-36, 46 + 6 * chew, 14, 3 + 3 * chew, 12), TONGUE, 0.8);
  }
  const lip = spline(lower, 3, true);
  paint(c.ctx, c.pen, lip, { from: { x: -40, y: 44 }, to: { x: -40, y: 78 }, stops: [MUZZLE, GREY_FLANK, MUZZLE_SHADE], ink: 0, hatch: 0, mottle: 0.5, seed: 45 });
  c.pen.stroke(lip.slice(0, Math.round(lip.length * 0.72)), c.ink * 0.85, INK, 1, true);
  // Short bristles on the chin too.
  for (let i = 0; i < 5; i++) {
    const p = rot({ x: -14 - i * 7, y: 58 + i * 3.2 }, drop, LIP_HINGE);
    const a = 0.9 + i * 0.18 + 0.1 * Math.sin(c.t * 8 + i * 2);
    c.pen.hair([p, { x: p.x + Math.cos(a) * 7, y: p.y + Math.sin(a) * 7 }], Math.max(0.6, c.ink * 0.4), '#e2d9c8', 0.8);
  }
  if (grass) drawGrass(c);
  drawMuzzle(c, chew);
  // The corner of the mouth, turned up: a contented little smile.
  c.pen.hair(spline([{ x: -54, y: 40 + chew * 3 }, { x: -66, y: 37 }, { x: -74, y: 29 }], 4), Math.max(0.7, c.ink * 0.6), INK, 0.75);
}

/** The muzzle pad: pale, dotted with bristle follicles, its split showing, short stiff whiskers twitching round its edge. */
function drawMuzzle(c: Kit, chew: number): void {
  // Chewing, the lower front of the lip reaches forward and down, then pulls back.
  const reach = (p: Pt): Pt => (p.y > 4 ? { x: p.x + chew * 4 * (p.x > -40 ? 1 : 0.3), y: p.y + chew * 4 } : p);
  const pad = spline(MUZZLE_PAD.map(reach), 4, true);
  paint(c.ctx, c.pen, pad, { from: { x: -10, y: -40 }, to: { x: -24, y: 46 }, stops: [GREY_FLANK, MUZZLE_LIGHT, MUZZLE, MUZZLE_SHADE], ink: 0, hatch: Math.max(5, 3.5 * c.k), hatchAlpha: 0.2, mottle: 0.6, seed: 46 });
  // Blend its back into the face, so it reads as the front of the head and not a disc stuck on.
  c.pen.clipped(pad, () => {
    const g = c.ctx.createLinearGradient(-64, 0, -30, 0);
    g.addColorStop(0, 'rgba(98,91,82,1)');
    g.addColorStop(1, 'rgba(98,91,82,0)');
    c.ctx.fillStyle = g;
    c.ctx.fillRect(-70, -50, 46, 110);
  });
  c.pen.clipped(pad, () => {
    for (const f of FOLLICLES) {
      const q = reach(f);
      c.pen.dot(q.x, q.y, Math.max(0.9, 0.5 * c.k), SKIN_DARK, 0.55);
    }
  });
  // The split down the middle of the upper lip, wider as it works.
  c.pen.hair(spline([{ x: 11, y: -6 }, { x: 9 + chew * 2, y: 12 }, reach({ x: 2, y: 34 })], 4), Math.max(0.6, c.ink * 0.55), INK, 0.8);
  // Nostrils on top of the snout, two little crescents.
  for (const nx of [-18, -6]) c.pen.hair(spline([{ x: nx - 5, y: -45 + nx * 0.1 }, { x: nx, y: -49 + nx * 0.1 }, { x: nx + 5, y: -46 + nx * 0.1 }], 3), Math.max(0.8, c.ink * 0.6), INK, 0.9);
  // Inked round the front only; a soft crease where it meets the cheek.
  const front = pad.slice(0, Math.round(pad.length * 0.6));
  c.pen.stroke(front, c.ink, INK, 1, true);
  c.pen.hair(pad.slice(Math.round(pad.length * 0.6), Math.round(pad.length * 0.86)), Math.max(0.6, c.ink * 0.5), SKIN_DARK, 0.45);
  drawWhiskers(c, pad);
}

function drawWhiskers(c: Kit, pad: readonly Pt[]): void {
  const centre = { x: -24, y: 4 };
  const front = pad.filter((p) => p.x > -48 && p.y > -32);
  const width = Math.max(0.55, c.ink * 0.42);
  front.forEach((p, i) => {
    const out = Math.atan2(p.y - centre.y, p.x - centre.x) + 0.25 * Math.sin(i * 3.7);
    // A twitch now and then, rippling round the lip.
    const twitch = 0.16 * Math.sin(c.t * 10 + i * 1.3) * Math.max(0, Math.sin(c.t * 1.6 + i * 0.4)) ** 2;
    const a = out + twitch;
    const len = 5 + 9 * Math.abs(Math.sin(i * 2.7 + 0.4));
    const root = { x: p.x - Math.cos(out) * 2.5, y: p.y - Math.sin(out) * 2.5 };
    const bend = { x: root.x + Math.cos(a) * len * 0.55, y: root.y + Math.sin(a) * len * 0.55 + len * 0.08 };
    const tip = { x: root.x + Math.cos(a + 0.12) * len, y: root.y + Math.sin(a + 0.12) * len + len * 0.18 };
    c.pen.hair(spline([root, bend, tip], 3), width, i % 3 ? '#e9e1d2' : '#cbbfae', 0.9);
  });
}

/** Seagrass blades caught in the corner of the mouth, trailing back and down in the water as it swims. */
function drawGrass(c: Kit): void {
  for (let i = 0; i < 3; i++) {
    const root = { x: -26 + i * 7, y: 45 };
    const len = 150 + 34 * Math.sin(i * 2.3 + 1);
    const width = 6.5 - i;
    const spine = range(16, (u) => ({
      x: root.x - len * (0.12 + 0.36 * u) * u - (i - 1) * 22 * u * u,
      y: root.y + len * u * (0.78 - 0.22 * u) + 9 * u * Math.sin(c.t * 1.9 + u * 5 + i * 1.4),
    }));
    const normal = (k: number): Pt => {
      const a = spine[Math.max(0, k - 1)]!;
      const b = spine[Math.min(spine.length - 1, k + 1)]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { x: -(b.y - a.y) / l, y: (b.x - a.x) / l };
    };
    const side = (s: number): Pt[] => spine.map((p, k) => {
      const n = normal(k);
      const w = s * width * (1 - (k / 16) ** 2 * 0.8) * (0.8 + 0.2 * Math.sin(k * 1.3 + c.t * 3));
      return { x: p.x + n.x * w, y: p.y + n.y * w };
    });
    const blade = [...side(-1), ...side(1).reverse()];
    paint(c.ctx, c.pen, blade, { from: root, to: spine[spine.length - 1]!, stops: [GRASS[i % 3]!, GRASS[(i + 1) % 3]!, GRASS[(i + 2) % 3]!], ink: Math.max(0.6, c.ink * 0.55), hatch: 0, mottle: 0.3, seed: 47 + i });
    c.pen.hair(spine.slice(1, -3), Math.max(0.5, 0.7 * c.k), '#c9dba0', 0.45);
  }
}

/** The whole manatee in its local frame (call inside a transform; `scale` = screen px per local px). */
function drawLocal(ctx: CanvasRenderingContext2D, pose: ManateePose, t: number, scale: number): void {
  const k = 1 / scale;
  const pen = penFor(ctx, 7717, boilOf(t), Math.max(0.5, (0.5 + 0.7 * Math.min(1, scale)) * k));
  const c: Kit = { ctx, pen, k, ink: Math.min(5, Math.max(1.4, 2.4 * Math.sqrt(scale))) * k, t };
  const phase = pose.paddle ?? t * 1.7;
  const sway = 0.16 * Math.sin(phase * 0.5 + 0.6);

  drawFlipper(c, { x: -190, y: 96 }, 1.8 + sway * 0.8, true);
  drawBody(c, phase);
  // The contour: back and belly, open at the tail stock (the paddle covers its end).
  pen.stroke(TOP.map((p) => flex(p, phase)), c.ink, INK, 1, true);
  pen.stroke(UNDER.map((p) => flex(p, phase)), c.ink, INK, 1, true);
  drawPaddle(c, phase);
  drawEye(c, pose.blink ?? 0);
  drawFace(c, Math.max(0, Math.min(1, pose.chew ?? 0)), pose.grass ?? false);
  drawFlipper(c, { x: -218, y: 102 }, 2.05 + sway, false);
}

export async function prepare(): Promise<void> {}

/**
 * Draws the manatee with its snout tip at (x, y) in screen px, `length`
 * snout to tail tip, facing right (1) or left (-1), at `t` seconds (the line
 * boil, the whiskers' twitch, the grass drifting, and the tail's stroke
 * unless the pose sets it).
 */
export function drawManatee(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1, t: number, pose: ManateePose = {}): void {
  const scale = length / LEN;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  drawLocal(ctx, pose, t, scale);
  ctx.restore();
}

/** The manatee's eye in screen px, for a slow blink at the camera. */
export function manateeEye(x: number, y: number, length: number, facing: 1 | -1): Pt {
  const s = length / LEN;
  return { x: x + facing * EYE.x * s, y: y + EYE.y * s };
}

/** A slow blink every five seconds, for previews. */
const slowBlink = (t: number): number => {
  const p = t % 5;
  return p > 1.5 && p < 2.7 ? Math.sin((Math.PI * (p - 1.5)) / 1.2) : 0;
};

/** The preview: a big manatee chewing seagrass and blinking, one mid-size facing left, one small as in the line-up. */
export const KIT: KitEntry = {
  name: 'manatee',
  draw: (ctx, w, h, t) => {
    const chew = 0.5 - 0.5 * Math.cos(t * 5);
    drawManatee(ctx, w * 0.8, h * 0.36, w * 0.62, 1, t, { chew, blink: slowBlink(t), grass: true });
    drawManatee(ctx, w * 0.1, h * 0.82, w * 0.3, -1, t, { chew });
    drawManatee(ctx, w * 0.95, h * 0.88, Math.min(200, w * 0.2), 1, t + 1.3, { chew: 0 });
  },
};
