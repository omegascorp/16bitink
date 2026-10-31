import { INK, Pen, type Pt } from '../../../src/art/pen';
import type { Placed } from './story';

/**
 * The two animals of the short, drawn big with the game's pen: a Cape fur
 * seal (brown-grey fur, a pale muzzle, big dark eyes, small ear flaps,
 * whiskers) and a blue shark (slender, a deep blue back, a white belly, long
 * pectoral fins, a pointed snout). Both are drawn nose to the right in their
 * own units (310 long, middle at 0,0) and scaled, turned and mirrored by the
 * Placed they are drawn with.
 */

const UNITS = 310;
/** The blue shark is drawn a little deeper in the body than life, so it reads at a glance. */
export const SHARK_PLUMP = 1.55;
const FUR = '#6a5648';
const FUR_DARK = '#3b2f2a';
const FUR_PALE = '#d1bd9d';
const WHISKER = '#f1e8d3';
const BLUE = '#2b62b3';
const BLUE_DEEP = '#1b4488';
const BELLY = '#eef1ee';
const SHADOW = '#16263d';

const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + boil * 977, 1.3);

/** Points along a closed loop through `pts`, smoothed (Catmull-Rom), `n` per span. */
export function smoothLoop(pts: readonly Pt[], n = 6): Pt[] {
  const out: Pt[] = [];
  const at = (i: number): Pt => pts[(i + pts.length) % pts.length]!;
  for (let i = 0; i < pts.length; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < n; k++) {
      const s = k / n;
      const s2 = s * s;
      const s3 = s2 * s;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}

/** Rotates a point about another. */
const turn = (p: Pt, about: Pt, a: number): Pt => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const [dx, dy] = [p.x - about.x, p.y - about.y];
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
};

/** Where a point in an animal's own units lands on screen. */
export function onAnimal(p: Placed, local: Pt): Pt {
  const k = p.len / UNITS;
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  const [lx, ly] = [local.x * k, local.y * k];
  return { x: p.x + p.face * (lx * c - ly * s), y: p.y + lx * s + ly * c };
}

/** Runs `draw` in an animal's own units: moved, turned, scaled and mirrored. */
function inPlace(ctx: CanvasRenderingContext2D, p: Placed, draw: () => void): void {
  const k = p.len / UNITS;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  draw();
  ctx.restore();
}

/** Where the Placed must go so that its own-units point `local` lands on `target` (screen). */
export function pinned(p: Omit<Placed, 'x' | 'y'>, local: Pt, target: Pt): Placed {
  const at = onAnimal({ ...p, x: 0, y: 0 }, local);
  return { ...p, x: target.x - at.x, y: target.y - at.y };
}

// ---------------------------------------------------------------- the seal

export type SealMood = 'fierce' | 'smug' | 'nervous' | 'sly' | 'plain';

export interface SealLook {
  readonly mood: SealMood;
  /** The lower jaw's opening, 0 .. 1. */
  readonly gape: number;
  /** A napkin tucked under the chin. */
  readonly napkin?: boolean;
  /** Cheeks puffed (a burp), 0 .. 1. */
  readonly puff?: number;
  /** Sweat drops, 0 .. 1. */
  readonly sweat?: number;
  /** Fore flipper raised and waving, 0 .. 1. */
  readonly wave?: number;
  /** Which parts: the whole seal, all but the lower jaw (drawn behind the prey), or just the lower jaw. */
  readonly part?: 'all' | 'head' | 'jaw';
}

const SEAL_BODY: readonly Pt[] = smoothLoop([
  { x: 154, y: 7 }, { x: 148, y: -1 }, { x: 134, y: -8 }, { x: 116, y: -17 }, { x: 98, y: -25 }, { x: 80, y: -24 }, { x: 56, y: -33 },
  { x: 14, y: -41 }, { x: -40, y: -39 }, { x: -92, y: -28 }, { x: -134, y: -13 }, { x: -168, y: -2 }, { x: -140, y: 7 }, { x: -96, y: 17 },
  { x: -44, y: 28 }, { x: 8, y: 34 }, { x: 46, y: 31 }, { x: 74, y: 26 }, { x: 92, y: 22 }, { x: 106, y: 17 }, { x: 128, y: 13 },
], 5);
const JAW_PIVOT: Pt = { x: 106, y: 19 };
const JAW: readonly Pt[] = smoothLoop([
  { x: 104, y: 17 }, { x: 132, y: 14 }, { x: 148, y: 14 }, { x: 148, y: 22 }, { x: 138, y: 32 }, { x: 116, y: 38 }, { x: 96, y: 33 },
], 4);

/** A fan-shaped flipper from `root`, pointing `angle` (radians), `len` long, in the seal's units. */
function flipper(pen: Pen, root: Pt, angle: number, len: number, width: number, fill = FUR_DARK): void {
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const n = { x: -dir.y, y: dir.x };
  const tip = { x: root.x + dir.x * len, y: root.y + dir.y * len };
  const outline = smoothLoop([
    { x: root.x + (n.x * width) / 3, y: root.y + (n.y * width) / 3 },
    { x: tip.x + (n.x * width) / 2, y: tip.y + (n.y * width) / 2 },
    { x: tip.x + dir.x * 7, y: tip.y + dir.y * 7 },
    { x: tip.x - (n.x * width) / 2, y: tip.y - (n.y * width) / 2 },
    { x: root.x - (n.x * width) / 3, y: root.y - (n.y * width) / 3 },
  ], 4);
  pen.fill(outline, fill, 0.96);
  pen.hatch(outline, 7, angle + 0.5, 0.8, { color: INK, alpha: 0.3 });
  pen.closed(outline, 2.6, INK);
}

/** The eye, by mood: big and dark and glossy; a lid for the smug and sly, a heavy brow for the fierce, wide and worried for the nervous. */
function sealEye(pen: Pen, mood: SealMood, wave: number): void {
  const e: Pt = { x: 108, y: -8 };
  const [rx, ry] = mood === 'nervous' ? [13, 14] : [11, 12];
  const eye = smoothLoop([{ x: e.x - rx, y: e.y }, { x: e.x, y: e.y - ry }, { x: e.x + rx, y: e.y }, { x: e.x, y: e.y + ry }], 5);
  if (mood === 'nervous') {
    pen.fill(eye.map((p) => ({ x: e.x + (p.x - e.x) * 1.22, y: e.y + (p.y - e.y) * 1.22 })), BELLY, 0.95);
  }
  pen.fill(eye, '#120e0e', 1);
  const pupil = mood === 'nervous' ? 4.2 : 0;
  if (pupil) pen.dot(e.x + 2, e.y + 2, pupil, '#fff', 0);
  pen.dot(e.x - 3.5, e.y - 4.5, 3.2, '#fff', 0.95);
  pen.dot(e.x + 3.5, e.y + 3.5, 1.6, '#fff', 0.55);
  pen.closed(eye, 2.2, INK);
  if (mood === 'smug' || mood === 'sly') {
    // A heavy lid over the top half.
    const lid = [{ x: e.x - rx - 2, y: e.y - ry - 3 }, { x: e.x + rx + 2, y: e.y - ry - 3 }, { x: e.x + rx + 2, y: e.y - 1 }, { x: e.x - rx - 2, y: e.y + 1 }];
    pen.clipped(eye, () => pen.fill(lid, FUR, 1));
    pen.stroke([{ x: e.x - rx - 1, y: e.y + 1 }, { x: e.x + rx + 1, y: e.y - 1 }], 3, INK);
  }
  if (mood === 'fierce') {
    pen.clipped(eye, () => pen.fill([{ x: e.x - rx - 2, y: e.y - ry - 3 }, { x: e.x + rx + 2, y: e.y - ry - 3 }, { x: e.x + rx + 2, y: e.y - 2 }, { x: e.x - rx - 2, y: e.y - 8 }], FUR, 1));
    pen.stroke([{ x: e.x - rx - 1, y: e.y - 8 }, { x: e.x + rx + 1, y: e.y - 2 }], 2.6, INK);
  }
  if (mood === 'nervous') pen.stroke([{ x: e.x - 14, y: e.y - 16 }, { x: e.x, y: e.y - 20 }, { x: e.x + 14, y: e.y - 29 }], 3.6, FUR_DARK);
  if (mood === 'sly') pen.stroke([{ x: e.x - 12, y: e.y - 18 + 8 * wave }, { x: e.x + 2, y: e.y - 24 - 6 * wave }, { x: e.x + 16, y: e.y - 16 }], 3.8, FUR_DARK);
}

/** A napkin tucked in at the neck: a paper triangle with red checks. */
function napkin(pen: Pen): void {
  const cloth = [{ x: 58, y: 26 }, { x: 112, y: 30 }, { x: 98, y: 92 }, { x: 70, y: 100 }, { x: 52, y: 70 }];
  pen.fill(cloth, '#fbf7ec', 0.98);
  pen.clipped(cloth, () => {
    for (let i = -2; i < 8; i++) {
      pen.hair([{ x: 40 + i * 12, y: 20 }, { x: 40 + i * 12, y: 110 }], 3, '#c8452c', 0.55);
      pen.hair([{ x: 40, y: 20 + i * 12 }, { x: 130, y: 20 + i * 12 }], 3, '#c8452c', 0.55);
    }
  });
  pen.closed(cloth, 2.6, INK);
}

/** A drop of sweat. */
function sweatDrop(pen: Pen, at: Pt, size: number): void {
  const drop = [{ x: at.x, y: at.y - size * 1.4 }, { x: at.x + size * 0.8, y: at.y - size * 0.1 }, { x: at.x, y: at.y + size * 0.7 }, { x: at.x - size * 0.8, y: at.y - size * 0.1 }];
  const round = smoothLoop(drop, 4);
  pen.fill(round, '#cfeafc', 0.95);
  pen.closed(round, 2.2, '#2d6fa8');
  pen.dot(at.x - size * 0.25, at.y - size * 0.1, size * 0.18, '#fff', 0.9);
}

/** The seal, nose right in its own units. */
export function drawSeal(ctx: CanvasRenderingContext2D, p: Placed, look: SealLook, boil: number): void {
  const pen = penFor(ctx, 17, boil);
  const part = look.part ?? 'all';
  const sweep = Math.sin(p.beat) * 0.28;
  const wave = look.wave ?? 0;
  const puff = look.puff ?? 0;
  inPlace(ctx, p, () => {
    if (part !== 'jaw') {
      // The hind flippers, trailing, and the far fore flipper behind the body.
      flipper(pen, { x: -158, y: -1 }, Math.PI - 0.35 + sweep, 58, 30);
      flipper(pen, { x: -158, y: 3 }, Math.PI + 0.35 + sweep, 54, 28);
      flipper(pen, { x: 40, y: 22 }, 2.75 + 0.1 * Math.sin(p.beat + 1.1), 56, 20);
      const body = puff ? SEAL_BODY.map((q) => (q.x > 70 && q.y > 5 ? { x: q.x + 4 * puff, y: q.y + 6 * puff } : q)) : SEAL_BODY;
      pen.fill(body, FUR, 0.97);
      // A paler belly and chest where the light from above wraps round, a pale muzzle.
      pen.clipped(body, () => {
        pen.fill(smoothLoop([{ x: -170, y: 6 }, { x: -60, y: 12 }, { x: 40, y: 12 }, { x: 108, y: 2 }, { x: 160, y: 0 }, { x: 160, y: 60 }, { x: -170, y: 60 }], 4), FUR_PALE, 0.55);
        pen.fill(smoothLoop([{ x: 100, y: -8 }, { x: 132, y: -14 }, { x: 156, y: -4 }, { x: 156, y: 24 }, { x: 100, y: 22 }], 4), FUR_PALE, 0.7);
        pen.hatch(body, 8, -0.75, 0.9, { color: FUR_DARK, alpha: 0.3 });
        pen.hatch(body, 9, 0.5, 0.8, { color: FUR_DARK, alpha: 0.13, onlyBelow: -10 });
      });
      pen.closed(body, 3.4, INK);
      // The ear flap, a tiny curl.
      const ear = smoothLoop([{ x: 70, y: -27 }, { x: 78, y: -34 }, { x: 85, y: -26 }, { x: 77, y: -19 }], 4);
      pen.fill(ear, FUR_DARK, 0.95);
      pen.closed(ear, 2.2, INK);
      pen.hair([{ x: 74, y: -26 }, { x: 79, y: -28 }, { x: 80, y: -24 }], 1.6, FUR_PALE, 0.8);
      // Fur strokes on the shoulder.
      for (let i = 0; i < 7; i++) pen.hair([{ x: -100 + i * 24, y: -30 + 3 * (i % 2) }, { x: -90 + i * 24, y: -20 }], 1.4, FUR_DARK, 0.5);
      sealEye(pen, look.mood, wave);
      // Nostril and whiskers, fanned.
      pen.dot(147, -1, 2.8, '#1a1212', 1);
      for (let i = -2; i <= 2; i++) {
        const a = 0.05 + i * 0.2;
        pen.hair([{ x: 133, y: 8 }, { x: 148 + 12 * Math.cos(a), y: 9 + 26 * Math.sin(a) + 2 }, { x: 162 + 36 * Math.cos(a), y: 10 + 58 * Math.sin(a) + 8 }], 1.7, WHISKER, 0.9);
      }
      for (let i = -1; i <= 1; i++) pen.dot(136 + i * 4, 6 + i * 4, 1.5, FUR_DARK, 0.8);
      // The mouth line.
      if (look.mood === 'smug' || look.mood === 'sly') pen.stroke([{ x: 108, y: 18 }, { x: 128, y: 24 }, { x: 144, y: 14 }], 3, INK);
      if (look.napkin) napkin(pen);
      const lead = wave > 0 ? 2.3 - 3.2 * wave * (0.6 + 0.4 * Math.sin(p.beat * 5)) : 2.7 + 0.15 * Math.sin(p.beat);
      flipper(pen, { x: 50, y: 24 }, lead, 58, 22);
      if (look.sweat) {
        sweatDrop(pen, { x: 70, y: -54 - 12 * look.sweat }, 7 + 4 * look.sweat);
        sweatDrop(pen, { x: 128, y: -44 + 18 * look.sweat }, 6);
      }
    }
    if (part !== 'head') {
      // The lower jaw, hinged at the back.
      const open = look.gape * 0.62;
      const jaw = JAW.map((q) => turn(q, JAW_PIVOT, open));
      if (open > 0.04) {
        // The dark inside of the mouth.
        pen.fill([{ x: 106, y: 14 }, { x: 148, y: 12 }, ...jaw.slice(2, 5).reverse(), { x: 108, y: 30 }], '#3a1a1c', 0.95);
      }
      pen.fill(jaw, FUR_PALE, 0.97);
      pen.hatch(jaw, 6, -0.6, 0.8, { color: FUR_DARK, alpha: 0.28 });
      pen.closed(jaw, 3, INK);
      if (open > 0.1) for (let i = 0; i < 4; i++) {
        const base = turn({ x: 116 + i * 9, y: 18 }, JAW_PIVOT, open);
        pen.fill([base, { x: base.x + 3, y: base.y - 9 }, { x: base.x + 6, y: base.y }], '#fffaf0', 0.95);
      }
    }
  });
}

// ---------------------------------------------------------------- the blue shark

export interface SharkLook {
  /** 0: bright blue and white; 1: a flat dark shape. */
  readonly dark?: number;
  /** How far the rear body bends away (a struggle), 0 .. about 0.2. */
  readonly bend?: number;
}

const SHARK_BODY: readonly Pt[] = smoothLoop([
  { x: 153, y: 3 }, { x: 140, y: -6 }, { x: 112, y: -13 }, { x: 70, y: -19 }, { x: 20, y: -21 }, { x: -30, y: -19 }, { x: -80, y: -13 },
  { x: -122, y: -6 }, { x: -136, y: -2 }, { x: -136, y: 3 }, { x: -120, y: 7 }, { x: -80, y: 13 }, { x: -30, y: 17 }, { x: 20, y: 19 },
  { x: 70, y: 17 }, { x: 112, y: 11 }, { x: 140, y: 7 },
], 5);
const BACK_BLUE: readonly Pt[] = [
  { x: -200, y: -90 }, { x: 200, y: -90 }, { x: 200, y: 4 }, { x: 140, y: 3 }, { x: 80, y: 1 }, { x: 20, y: -2 }, { x: -50, y: -3 }, { x: -120, y: -2 }, { x: -200, y: -2 },
];

/** A fin as a smoothed closed shape. */
const fin = (pts: readonly Pt[]): Pt[] => smoothLoop(pts, 4);

/** The blue shark, nose right in its own units (a tail beat from `p.beat`). */
export function drawBlueShark(ctx: CanvasRenderingContext2D, p: Placed, look: SharkLook, boil: number): void {
  const pen = penFor(ctx, 23, boil);
  const dark = look.dark ?? 0;
  const body = (c: string): string => (dark > 0.5 ? SHADOW : c);
  const swing = Math.sin(p.beat) * 0.22;
  const bend = look.bend ?? 0;
  const warp = (q: Pt): Pt => ({ x: q.x, y: q.y + (bend * Math.max(0, 60 - q.x) ** 2) / 200 });
  const warped = (pts: readonly Pt[]): Pt[] => pts.map(warp);
  const BODY = warped(SHARK_BODY);
  const BACK = warped(BACK_BLUE);
  inPlace(ctx, p, () => {
    ctx.scale(1, SHARK_PLUMP);
    const hinge: Pt = { x: -130, y: 0 };
    const tail = [
      { x: -128, y: -4 }, { x: -150, y: -20 }, { x: -168, y: -48 }, { x: -178, y: -70 }, { x: -158, y: -44 }, { x: -148, y: -14 },
      { x: -148, y: 8 }, { x: -160, y: 24 }, { x: -146, y: 18 }, { x: -128, y: 6 },
    ].map((q) => warp(turn(q, hinge, swing)));
    const tailShape = fin(tail);
    pen.fill(tailShape, body(BLUE_DEEP), 0.97);
    pen.closed(tailShape, 2.8, INK);
    // The far pectoral fin, then the body, then the near pectoral fin: long and sickle-shaped.
    const farFin = fin([{ x: 48, y: 12 }, { x: 22, y: 50 }, { x: -2, y: 74 }, { x: 4, y: 46 }, { x: 24, y: 16 }]);
    pen.fill(farFin, body(BLUE_DEEP), 0.9);
    pen.closed(farFin, 2.4, INK);
    pen.fill(BODY, body(BELLY), 0.98);
    if (dark <= 0.5) {
      pen.clipped(BODY, () => {
        pen.fill(BACK, BLUE, 0.96);
        pen.fill([{ x: -200, y: -90 }, { x: 200, y: -90 }, { x: 200, y: -12 }, { x: -200, y: -10 }], BLUE_DEEP, 0.7);
        pen.hatch(BODY, 8, -0.7, 0.8, { color: INK, alpha: 0.2 });
        pen.hatch(BODY, 7, 0.7, 0.7, { color: '#1a3a66', alpha: 0.18, onlyBelow: 2 });
      });
    }
    pen.closed(BODY, 3.4, INK);
    // The dorsal fins.
    const dorsal = fin([{ x: -6, y: -20 }, { x: -24, y: -56 }, { x: -52, y: -19 }]);
    pen.fill(dorsal, body(BLUE_DEEP), 0.97);
    pen.closed(dorsal, 2.6, INK);
    const small = fin(warped([{ x: -96, y: -11 }, { x: -104, y: -25 }, { x: -116, y: -9 }]));
    pen.fill(small, body(BLUE_DEEP), 0.97);
    pen.closed(small, 2.2, INK);
    const nearFin = fin([{ x: 54, y: 13 }, { x: 26, y: 58 }, { x: -6, y: 90 }, { x: 0, y: 56 }, { x: 28, y: 18 }]);
    pen.fill(nearFin, body(BLUE), 0.98);
    if (dark <= 0.5) pen.hatch(nearFin, 6, 1.1, 0.8, { color: INK, alpha: 0.25 });
    pen.closed(nearFin, 2.8, INK);
    if (dark <= 0.5) {
      // The eye, the gill slits, the mouth and a nostril.
      pen.dot(116, -5, 6, '#101418', 1);
      pen.dot(114, -7, 2, '#fff', 0.9);
      pen.circle(116, -5, 7, 1.6, INK);
      for (let i = 0; i < 5; i++) pen.hair([{ x: 74 - i * 7, y: -9 }, { x: 72 - i * 7, y: 1 }, { x: 74 - i * 7, y: 9 }], 1.6, INK, 0.7);
      pen.stroke([{ x: 142, y: 7 }, { x: 118, y: 11 }, { x: 100, y: 10 }], 2.4, INK);
      pen.dot(146, 0, 1.6, INK, 0.9);
    }
  });
}

/** A little blue shark icon, nose right, `len` long. */
export function drawSharkIcon(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, boil: number, face: 1 | -1 = 1): void {
  drawBlueShark(ctx, { x, y, len, rot: 0, face, beat: 0 }, {}, boil);
}
