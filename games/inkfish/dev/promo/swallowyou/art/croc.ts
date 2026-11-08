import { ellipse, INK, type Pen } from '../../../../src/art/pen';
import { boilOf, paint, penFor, type Pt, rot, spline, trace } from './ink';

/**
 * The saltwater crocodile, side on, in the game's pen and ink painted with
 * wash and shading: a long flat-topped snout with the famous wavy jaw line
 * and interlocking teeth, the raised knob of the eye with its slit pupil,
 * rows of armoured scutes down the back, the tail's double crest and dark
 * cross-bands, a dark olive back over a pale cream belly, and short legs
 * tucked back for swimming. The lower jaw drops about its hinge onto a pale
 * cream mouth (a croc's mouth is cream inside, not red).
 *
 * Local px: the snout's tip at x = 0, facing right, the tail tip at
 * x = -CROC_LEN, y down, the body's middle line at y = 0.
 */

export const CROC_LEN = 1000;

export interface CrocPose {
  /** Jaws, 0 shut .. 1 wide. */
  readonly gape?: number;
  /** The tail's sweep phase, radians, and how hard (0 .. 1). */
  readonly tail?: number;
  readonly effort?: number;
  /** A death roll: how far round its long axis it has turned, radians (the drawing squashes through edge-on and shows the belly). */
  readonly roll?: number;
  /** The eye: 0 open .. 1 shut. */
  readonly blink?: number;
}

const OLIVE_TOP = '#2c321f';
const OLIVE = '#4f5a37';
const OLIVE_FLANK = '#7a8352';
const CREAM = '#d9cf9f';
const BELLY = '#ece2b8';
const BAND = '#1d2215';
const MOUTH = '#e5d6a2';
const MOUTH_DEEP = '#7a5a40';
const TOOTH = '#f6f1df';

/** The hinge the lower jaw turns about, and its widest angle (radians). */
const HINGE: Pt = { x: -222, y: 8 };
const GAPE_MAX = 0.62;

/** Upper outline, snout to tail tip: the nostril bump, the flat snout, the eye knob, the neck, the scaly back, the tail. */
/** The body's depth, fattened behind the head (the outlines below are drawn lean, then swelled). */
const fatten = (p: Pt): Pt => {
  const k = p.x < -240 ? 1 + 0.3 * Math.min(1, (-240 - p.x) / 120) * Math.max(0, 1 - Math.max(0, -p.x - 700) / 300) : 1;
  return { x: p.x, y: p.y * k };
};

const TOP: readonly Pt[] = spline([
  { x: 2, y: -2 }, { x: -8, y: -12 }, { x: -22, y: -20 }, { x: -40, y: -16 }, { x: -90, y: -18 }, { x: -140, y: -24 },
  { x: -170, y: -30 }, { x: -184, y: -46 }, { x: -200, y: -44 }, { x: -214, y: -34 }, { x: -250, y: -34 }, { x: -290, y: -44 },
  { x: -380, y: -56 }, { x: -480, y: -60 }, { x: -560, y: -56 }, { x: -630, y: -46 }, { x: -720, y: -34 }, { x: -820, y: -22 },
  { x: -920, y: -11 }, { x: -1000, y: -2 },
], 5).map(fatten);

/** The underside, tail tip back to the chest, then the throat to the hinge. */
const UNDER: readonly Pt[] = spline([
  { x: -1000, y: 3 }, { x: -920, y: 12 }, { x: -820, y: 24 }, { x: -720, y: 36 }, { x: -630, y: 46 }, { x: -540, y: 52 },
  { x: -440, y: 54 }, { x: -350, y: 50 }, { x: -280, y: 40 }, { x: -240, y: 28 },
], 5).map(fatten);

/** The upper jaw's lip, hinge to snout tip: wavy, dipping where the big teeth sit. */
const LIP: readonly Pt[] = spline([
  { x: -222, y: 6 }, { x: -190, y: 4 }, { x: -150, y: 9 }, { x: -120, y: 4 }, { x: -80, y: 2 }, { x: -48, y: 8 }, { x: -24, y: 4 }, { x: 0, y: 2 },
], 4);

/** The lower jaw (shut), hinge round its underside to the tip and back along its lip. */
const JAW_UNDER: readonly Pt[] = spline([
  { x: -240, y: 28 }, { x: -200, y: 24 }, { x: -140, y: 20 }, { x: -80, y: 16 }, { x: -30, y: 12 }, { x: -4, y: 8 },
], 4);
const JAW_LIP: readonly Pt[] = spline([{ x: -4, y: 6 }, { x: -40, y: 8 }, { x: -100, y: 6 }, { x: -160, y: 9 }, { x: -222, y: 8 }], 4);

/** Teeth along each lip: (where along the lip 0 hinge .. 1 tip, length). */
const UPPER_TEETH = Array.from({ length: 15 }, (_, i) => ({ u: 0.1 + i * 0.062, len: 11 + 8 * Math.abs(Math.sin(i * 1.7)) }));
const LOWER_TEETH = Array.from({ length: 13 }, (_, i) => ({ u: 0.12 + i * 0.068, len: 9 + 7 * Math.abs(Math.sin(i * 2.3 + 1)) }));

const at = (path: readonly Pt[], u: number): Pt => {
  const f = Math.max(0, Math.min(1, u)) * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(f));
  const k = f - i;
  return { x: path[i]!.x + (path[i + 1]!.x - path[i]!.x) * k, y: path[i]!.y + (path[i + 1]!.y - path[i]!.y) * k };
};

/** The tail's sweep: nothing ahead of the hips, growing to the tip. */
function bend(p: Pt, phase: number, effort: number): Pt {
  const b = Math.max(0, (-p.x - 560) / 440);
  return { x: p.x, y: p.y + (10 + 22 * effort) * b * b * Math.sin(phase - 3 * b) };
}

function tooth(pen: Pen, base: Pt, dir: number, len: number, w: number): void {
  const tip = { x: base.x + 2, y: base.y + dir * len };
  const shape = [{ x: base.x - w, y: base.y }, tip, { x: base.x + w, y: base.y }];
  pen.fill(shape, TOOTH, 1);
  pen.hair([...shape], 1.3, INK, 0.8);
}

function leg(ctx: CanvasRenderingContext2D, pen: Pen, root: Pt, size: number, phase: number, seed: number): void {
  // Tucked back along the flank, as a swimming croc holds them.
  const knee = { x: root.x - size * 0.8, y: root.y + size * 0.32 + 4 * Math.sin(phase) };
  const foot = { x: knee.x - size * 0.75, y: knee.y + size * 0.04 };
  const thick = size * 0.28;
  const n1 = { x: 0, y: thick };
  const outline = [
    { x: root.x + thick, y: root.y - thick * 0.6 }, { x: knee.x + n1.x, y: knee.y - thick * 0.5 }, { x: foot.x, y: foot.y - thick * 0.4 },
    { x: foot.x - size * 0.18, y: foot.y + thick * 0.1 }, { x: foot.x, y: foot.y + thick * 0.4 }, { x: knee.x - 2, y: knee.y + thick * 0.6 },
    { x: root.x - thick, y: root.y + thick * 0.5 },
  ];
  paint(ctx, pen, spline(outline, 3, true), { from: { x: root.x, y: root.y - thick }, to: { x: root.x, y: foot.y + thick }, stops: [OLIVE, OLIVE_FLANK, CREAM], ink: 2, hatch: 0, mottle: 0.6, seed });
}

/** The whole crocodile in its local frame (call inside a transform; `scale` = screen px per local px, for line widths). */
function drawLocal(ctx: CanvasRenderingContext2D, pose: CrocPose, boil: number, scale: number, belly: boolean): void {
  const pen = penFor(ctx, 4401, boil, Math.max(0.6, 1.3 / scale));
  const gape = Math.max(0, Math.min(1, pose.gape ?? 0)) * GAPE_MAX;
  const phase = pose.tail ?? 0;
  const effort = pose.effort ?? 0.4;
  const ink = Math.max(2.2, 2.2 / scale);
  const top = TOP.map((p) => bend(p, phase, effort));
  const under = UNDER.map((p) => bend(p, phase, effort));
  const lowerJaw = [...JAW_UNDER, ...JAW_LIP].map((p) => rot(p, gape, HINGE));

  // The far legs, darker, behind the body.
  ctx.save();
  ctx.globalAlpha *= 0.85;
  leg(ctx, pen, { x: -300, y: 40 }, 60, phase + 1, 51);
  leg(ctx, pen, { x: -600, y: 50 }, 76, phase + 2, 52);
  ctx.restore();

  // The inside of the mouth, between the upper lip and the dropped lower jaw.
  if (gape > 0.01) {
    const inside = [{ x: -250, y: 10 }, ...LIP, ...JAW_LIP.map((p) => rot(p, gape, HINGE))];
    const g = ctx.createLinearGradient(-230, 0, 0, 0);
    g.addColorStop(0, '#3a2219');
    g.addColorStop(0.2, MOUTH_DEEP);
    g.addColorStop(0.5, '#d9b48c');
    g.addColorStop(1, MOUTH);
    ctx.save();
    trace(ctx, inside);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // The tongue, flat on the floor of the mouth.
    const tongue = JAW_LIP.slice(2, -2).map((p) => rot({ x: p.x, y: p.y - 6 }, gape, HINGE));
    pen.stroke(tongue, ink * 1.6, '#c9a477', 0.7, false);
    // Lower teeth pointing up out of the open jaw.
    for (const tth of LOWER_TEETH) tooth(pen, rot(at([...JAW_LIP].reverse(), tth.u), gape, HINGE), -1, tth.len, 4);
  }

  // The lower jaw.
  paint(ctx, pen, lowerJaw, { from: { x: -120, y: -4 }, to: { x: -120, y: 40 }, stops: [OLIVE_FLANK, CREAM, BELLY], ink, hatch: 0, mottle: 0.5, seed: 61 });

  // The body and head.
  const outline = [...top, ...under, ...LIP];
  const stops = belly ? [CREAM, BELLY, BELLY, CREAM, OLIVE_FLANK] : [OLIVE_TOP, OLIVE, OLIVE_FLANK, CREAM, BELLY];
  paint(ctx, pen, outline, { from: { x: -400, y: -60 }, to: { x: -400, y: 56 }, stops, ink, hatch: 9, hatchAlpha: 0.22, mottle: 1, seed: 62 });

  // Dark cross-bands down the tail and flank.
  pen.clipped(outline, () => {
    for (let i = 0; i < 9; i++) {
      const x = -520 - i * 52;
      const band = [{ x: x + 12, y: -80 }, { x: x - 6, y: -80 }, { x: x - 18, y: 60 }, { x: x + 2, y: 60 }].map((p) => bend(p, phase, effort));
      pen.fill(band, BAND, 0.55 - i * 0.03);
    }
    // The pale belly line, and the scales across the flank in soft rows.
    for (let row = 0; row < 3; row++) {
      for (let x = -260; x > -900; x -= 26) {
        const y = -18 + row * 16 + (x % 52 === 0 ? 2 : 0);
        const p = bend({ x, y }, phase, effort);
        pen.hair([{ x: p.x - 9, y: p.y }, { x: p.x, y: p.y + 6 }, { x: p.x + 9, y: p.y }], Math.max(0.7, 0.9 / scale), INK, 0.22);
      }
    }
  });

  // Scutes: armoured ridges along the back, then the tail's crest.
  for (let k = 0; k < 26; k++) {
    const u = 0.17 + k * 0.026;
    const i = Math.round(u * (top.length - 1));
    const p = top[i]!;
    const q = top[Math.min(top.length - 1, i + 1)]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    const h = k < 12 ? 9 : 13 - (k - 12) * 0.5;
    const crest = [{ x: p.x + 6, y: p.y + 1 }, { x: p.x - 2 + Math.sin(a) * h, y: p.y - h }, { x: p.x - 12, y: p.y + 2 }];
    pen.fill(crest, OLIVE_TOP, 1);
    pen.hair(crest, Math.max(0.9, 1.2 / scale), INK, 0.9);
    if (k < 12) pen.dot(p.x - 4, p.y + 12, 3.2, '#9aa070', 0.7);
  }

  // Upper teeth hanging over the lip (some show even with the jaw shut).
  for (const tth of UPPER_TEETH) {
    const base = at(LIP, tth.u);
    tooth(pen, { x: base.x, y: base.y - 2 }, 1, gape > 0.05 ? tth.len : tth.len * 0.55, 4);
  }

  // The lip line: dark, wavy.
  pen.stroke(LIP, ink * 1.1, INK, 1, false);
  // Nostril and eye.
  pen.dot(-14, -16, 4, INK, 0.9);
  const eye = { x: -192, y: -36 };
  const blink = Math.max(0, Math.min(1, pose.blink ?? 0));
  pen.fill(ellipse(eye.x, eye.y, 13, 11, 18), '#2a2d1b', 1);
  pen.fill(ellipse(eye.x, eye.y, 10, 8 * (1 - blink), 18), '#c9b44a', 1);
  if (blink < 0.9) {
    pen.fill(ellipse(eye.x + 1, eye.y, 2.2, 7 * (1 - blink), 10), INK, 1);
    pen.dot(eye.x - 3, eye.y - 3, 2, '#fffbe6', 0.9);
  }
  pen.hair(spline([{ x: eye.x - 16, y: eye.y - 4 }, { x: eye.x, y: eye.y - 16 }, { x: eye.x + 15, y: eye.y - 6 }], 4), Math.max(1, 1.6 / scale), INK, 0.9);

  // The near legs over the body.
  leg(ctx, pen, { x: -290, y: 38 }, 62, phase, 53);
  leg(ctx, pen, { x: -590, y: 48 }, 80, phase + 0.7, 54);
}

/**
 * Draws the crocodile with its snout tip at (x, y) in screen px, `length`
 * snout to tail tip, facing right (1) or left (-1), at `t` seconds (the line
 * boil). A roll squashes it about its long axis and, past edge-on, shows its
 * pale underside.
 */
export function drawCroc(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1, t: number, pose: CrocPose = {}): void {
  const scale = length / CROC_LEN;
  const roll = pose.roll ?? 0;
  const squash = Math.cos(roll);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale * (Math.abs(squash) < 0.08 ? Math.sign(squash || 1) * 0.08 : squash));
  drawLocal(ctx, pose, boilOf(t), scale, squash < 0);
  ctx.restore();
}

/** The crocodile's mouth (the middle of the gape) in screen px for a pose drawn by drawCroc. */
export function crocMouth(x: number, y: number, length: number, facing: 1 | -1, gape = 0): Pt {
  const s = length / CROC_LEN;
  const local = rot({ x: -70, y: 12 }, gape * GAPE_MAX * 0.5, HINGE);
  return { x: x + facing * local.x * s, y: y + local.y * s };
}
