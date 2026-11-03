import { PAPER_FILL } from '../../../../src/art/fish/kit';
import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import {
  type Box, type Brush, columnWash, dab, edgeAt, fadeRoot, mixStops, px, shade, smoothLoop, softLine, taper,
} from '../../seal/art/paint';
import { grain, inkEdge, type Lock, lockLine, shadeLocks, shaggy, unit } from './bearFur';

/**
 * The polar bear's legs, each baked as a sprite with its root at 0,0 pointing +x, turned live so the bear
 * paddles: the thick, furry foreleg (wider at the top, long fur feathering down its back), the huge flat
 * oar-like fore paw turned at the wrist (dark pads on the sole, short black claws), and the hind leg trailing
 * a long flat foot. The leg's front edge is -y; the sole and the back of the foreleg are +y.
 */

export const LIGHT = '#fff9e6';
export const LAVENDER = '#6f7193';

const AT = [0, 0.2, 0.42, 0.64, 0.84, 1] as const;
/** Lit edge to shadowed edge. */
const LIMB_PAL = ['#fffaea', '#f6ebcb', '#e8d9b2', '#cfc6b0', '#a3a6ba', '#7e8099'] as const;
const stopsLitFirst = (): ReturnType<typeof mixStops> => mixStops(AT, [[LIMB_PAL, 1]]);
const stopsLitLast = (): ReturnType<typeof mixStops> => mixStops(AT, [[[...LIMB_PAL].reverse(), 1]]);

interface Limb {
  /** The front (-y) and back (+y) edges, root to tip, smooth. */
  readonly front: readonly Pt[];
  readonly back: readonly Pt[];
  /** The whole outline, shaggy where the fur is. */
  readonly shape: readonly Pt[];
  readonly locks: readonly Lock[];
  readonly box: Box;
}

function limb(front: readonly Pt[], back: readonly Pt[], cap: readonly Pt[], seed: number, shag: (p: Pt, isBack: boolean) => readonly [number, number, number]): Omit<Limb, 'box'> {
  const locks: Lock[] = [];
  const fAt = (x: number): number => edgeAt(front, x);
  const bAt = (x: number): number => edgeAt(back, x);
  const inside = (p: Pt): Pt => ({ x: p.x - 4, y: (fAt(p.x) + bAt(p.x)) / 2 });
  const flow = (): Pt => unit(1, 0.25);
  const f = shaggy(front, seed, { inside, shag: (p) => shag(p, false), flow: () => unit(1, -0.2) }, locks);
  const b = shaggy(back, seed + 1, { inside, shag: (p) => shag(p, true), flow }, locks);
  return { front, back, shape: [...f, ...cap, ...[...b].reverse()], locks };
}

// ---------------------------------------------------------------- the foreleg (shoulder to wrist)

/** Shoulder to wrist. */
export const ARM_LEN = 46;
const ARM_FRONT = spline([{ x: -10, y: -20 }, { x: 4, y: -18.6 }, { x: 16, y: -15.4 }, { x: 28, y: -12.2 }, { x: 38, y: -10.2 }, { x: 48, y: -9.4 }, { x: 52, y: -9.2 }], 4);
const ARM_BACK = spline([{ x: -10, y: 20 }, { x: 4, y: 19.4 }, { x: 16, y: 17.4 }, { x: 28, y: 14.4 }, { x: 38, y: 12 }, { x: 48, y: 10.8 }, { x: 52, y: 10.4 }], 4);
const ARM: Limb = {
  ...limb(ARM_FRONT, ARM_BACK, [{ x: 55, y: -4 }, { x: 56, y: 1 }, { x: 54.6, y: 6 }], 7101, (p, back) =>
    back ? (p.x > 6 ? [0.95, 2.6, 5.8] : [0, 0, 0]) : p.x > 10 ? [0.3, 0.8, 1.8] : [0, 0, 0]),
  box: { x0: -14, x1: 62, y0: -26, y1: 32 },
};

// ---------------------------------------------------------------- the fore paw (wrist to claws)

const PAW_TOP = spline([{ x: -8, y: -9.6 }, { x: 4, y: -10.6 }, { x: 14, y: -12.4 }, { x: 24, y: -13.8 }, { x: 31, y: -13.4 }], 4);
const PAW_SOLE = spline([{ x: -8, y: 10 }, { x: 2, y: 12.6 }, { x: 8, y: 12.6 }, { x: 16, y: 13.8 }, { x: 26, y: 14.8 }, { x: 33, y: 13.6 }], 4);
/** The toes along the paw's front edge, top to sole: centres of the knuckles, each with a claw. */
const TOES: readonly Pt[] = [{ x: 33.6, y: -9.8 }, { x: 37.4, y: -3.6 }, { x: 38.4, y: 2.8 }, { x: 36.8, y: 9 }];
/** The front edge: a rounded knuckle for each toe, a little notch between them. */
const PAW_CAP: Pt[] = (() => {
  const out: Pt[] = [];
  TOES.forEach((t, i) => {
    const r = i === 0 || i === 3 ? 3 : 3.3;
    const lean = Math.atan2(t.y - 1, t.x - 26);
    for (let j = 0; j <= 6; j++) {
      const a = lean - Math.PI / 2 + (Math.PI * j) / 6;
      out.push({ x: t.x + r * Math.cos(a), y: t.y + r * Math.sin(a) });
    }
  });
  return [{ x: 31, y: -13.4 }, ...out, { x: 33, y: 13.6 }];
})();
const PAW: Limb = {
  ...limb(PAW_TOP, PAW_SOLE, PAW_CAP, 7203, (p, back) => (back ? (p.x < 30 ? [0.6, 1, 2.2] : [0, 0, 0]) : p.x < 26 ? [0.35, 0.6, 1.4] : [0, 0, 0])),
  box: { x0: -12, x1: 46, y0: -20, y1: 24 },
};

// ---------------------------------------------------------------- the hind leg (hip to toes)

const HIND_FRONT = spline([
  { x: -10, y: -17 }, { x: 6, y: -17.4 }, { x: 20, y: -15.6 }, { x: 32, y: -12.4 }, { x: 42, y: -9.4 }, { x: 50, y: -8.8 },
  { x: 60, y: -8.8 }, { x: 70, y: -7.6 }, { x: 77, y: -5 },
], 4);
const HIND_BACK = spline([
  { x: -10, y: 17 }, { x: 6, y: 18 }, { x: 20, y: 17.4 }, { x: 31, y: 16 }, { x: 39, y: 14.4 }, { x: 45, y: 11.6 },
  { x: 54, y: 9.8 }, { x: 64, y: 9.6 }, { x: 73, y: 8.4 }, { x: 78, y: 6 },
], 4);
const HIND: Limb = {
  ...limb(HIND_FRONT, HIND_BACK, spline([{ x: 77, y: -5 }, { x: 80.4, y: -1 }, { x: 80.6, y: 3 }, { x: 78, y: 6 }], 3), 7307, (p, back) =>
    back ? (p.x < 40 ? [0.9, 2.2, 5] : [0, 0, 0]) : p.x < 44 ? [0.5, 1.2, 3] : [0, 0, 0]),
  box: { x0: -14, x1: 88, y0: -28, y1: 32 },
};

export const ARM_BOX = ARM.box;
export const PAW_BOX = PAW.box;
export const HIND_BOX = HIND.box;

// ---------------------------------------------------------------- painting

interface LimbPaint {
  readonly litFront: boolean;
  readonly far: boolean;
  readonly droop: number;
}

/** The fur of a limb: the wash across it, light and shade, grain down its length, the locks, the ink. */
function furLimb(k: Brush, l: Limb, o: LimbPaint, inkFrom: number, inkTo: number, extra: () => void): void {
  const { pen, ctx } = k;
  const fAt = (x: number): number => edgeAt(l.front, x);
  const bAt = (x: number): number => edgeAt(l.back, x);
  pen.fill(l.shape, PAPER_FILL, 1);
  pen.clipped(l.shape, () => {
    columnWash(ctx, l.box.x0, l.box.x1, 1, fAt, bAt, o.litFront ? stopsLitFirst : stopsLitLast, 20);
    const litV = o.litFront ? 0.16 : 0.84;
    const darkV = o.litFront ? 0.78 : 0.22;
    const mid = (v: number, x0: number, x1: number): Pt[] => Array.from({ length: 8 }, (_, i) => {
      const x = x0 + ((x1 - x0) * i) / 7;
      return { x, y: fAt(x) + (bAt(x) - fAt(x)) * v };
    });
    softLine(ctx, mid(litV, l.box.x0 + 4, l.box.x1 - 10), 6, '#ffffff', 0.4);
    softLine(ctx, mid(darkV, l.box.x0 + 4, l.box.x1 - 10), 7, LAVENDER, 0.22);
    grain(k, fAt, bAt, l.box.x0 + 2, l.box.x1 - 4, 9, { light: LIGHT, dark: LAVENDER, droop: () => o.droop, litTop: o.litFront });
    shadeLocks(k, l.locks, LIGHT, '96,98,138', 0.9);
    extra();
    if (o.far) {
      ctx.fillStyle = 'rgba(64,74,108,0.3)';
      ctx.fillRect(l.box.x0 - 4, l.box.y0 - 4, l.box.x1 - l.box.x0 + 8, l.box.y1 - l.box.y0 + 8);
    }
  });
  // Ink the outline in runs, leaving out the root (and, on the foreleg, the end the paw covers).
  const weight = (p: Pt): number => (p.y > 0 === o.litFront ? 1.5 : 1.15) * (o.far ? 0.85 : 1);
  let run: Pt[] = [];
  for (const p of [...l.shape, l.shape[0]!]) {
    if (p.x > inkFrom && p.x < inkTo) run.push(p);
    else if (run.length) {
      if (run.length > 1) inkEdge(k, run, weight, () => 0.3);
      run = [];
    }
  }
  if (run.length > 1) inkEdge(k, run, weight, () => 0.3);
}

export function paintArm(k: Brush, far: boolean): void {
  furLimb(k, ARM, { litFront: true, far, droop: 0.12 }, 4, 50, () => {
    // The elbow's mass at the top, the wrist narrowing.
    dab(k.ctx, 6, -6, 14, '255,252,238', 0.3);
    softLine(k.ctx, [{ x: 36, y: -9 }, { x: 40, y: 0 }, { x: 38, y: 10 }], 4, LAVENDER, 0.14);
  });
  fadeRoot(k.ctx, -8, 8);
}

/** A dark leathery pad, lit along one edge. */
function pad(k: Brush, shape: readonly Pt[], y0: number, y1: number): void {
  k.pen.fill(shape, '#24252e', 1);
  shade(k.ctx, shape, y0, y1, [[0, 'rgba(120,124,144,0.55)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
}

const oval = (c: Pt, rx: number, ry: number, tilt = 0): Pt[] => smoothLoop(Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  const [x, y] = [rx * Math.cos(a), ry * Math.sin(a)];
  return { x: c.x + x * Math.cos(tilt) - y * Math.sin(tilt), y: c.y + x * Math.sin(tilt) + y * Math.cos(tilt) };
}), 3);

/**
 * The fore paw, huge, flat and broad as an oar: furred on top, the toes' knuckles along its front edge, the
 * black pads (palm, wrist and toes) peeping out along the sole between the fur, a short black claw on each toe.
 */
export function paintPaw(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  // The pads first, so the fur of the sole falls over them.
  pad(k, smoothLoop([{ x: 12, y: 12 }, { x: 20, y: 13 }, { x: 29, y: 13 }, { x: 30.4, y: 16 }, { x: 21, y: 16.6 }, { x: 12, y: 15 }], 4), 12, 17);
  pad(k, oval({ x: 3, y: 13 }, 3.4, 2.2, 0.2), 11, 15);
  for (const t of TOES.slice(2)) pad(k, oval({ x: t.x - 1.6, y: t.y + 2.6 }, 2.4, 1.7, 0.6), t.y + 1, t.y + 4.4);
  furLimb(k, PAW, { litFront: true, far, droop: 0.04 }, -2, Infinity, () => {
    // The toes: a soft crease running back from each notch, each knuckle lit on top.
    for (let i = 0; i < TOES.length - 1; i++) {
      const a = TOES[i]!;
      const b = TOES[i + 1]!;
      const m = { x: (a.x + b.x) / 2 + 1, y: (a.y + b.y) / 2 };
      taper(ctx, [m, { x: m.x - 4, y: m.y + 0.1 }, { x: m.x - 9, y: m.y + 0.2 }], 1.1, 0.2, LAVENDER, 0.5);
    }
    for (const t of TOES) dab(ctx, t.x - 1, t.y - 1, 2.6, '255,255,250', 0.35);
    softLine(ctx, [{ x: 2, y: -8 }, { x: 16, y: -10 }, { x: 30, y: -10.4 }], 5, '#ffffff', 0.4);
    softLine(ctx, [{ x: 2, y: 8.6 }, { x: 20, y: 11.6 }, { x: 33, y: 10.6 }], 6, LAVENDER, 0.25);
  });
  // The creases between the toes in ink, and the claws: short, black, curving toward the sole.
  for (let i = 0; i < TOES.length - 1; i++) {
    const a = TOES[i]!;
    const b = TOES[i + 1]!;
    const m = { x: (a.x + b.x) / 2 + 1.6, y: (a.y + b.y) / 2 };
    pen.hair([m, { x: m.x - 3, y: m.y + 0.1 }], px(k, 0.9), '#3a3b4c', 0.6);
  }
  for (const t of TOES) {
    const d = unit(t.x - 26, t.y - 1);
    const base = { x: t.x + d.x * 2.2, y: t.y + d.y * 2.2 };
    const claw = [base, { x: base.x + d.x * 2.6 + 0.3, y: base.y + d.y * 2.6 + 0.8 }, { x: base.x + d.x * 3.6 + 0.2, y: base.y + d.y * 3.6 + 2.2 }];
    taper(ctx, claw, 1.7, 0.3, '#0d0d10', 0.95);
    pen.hair(claw.slice(0, 2).map((p) => ({ x: p.x, y: p.y - 0.4 })), px(k, 0.6), '#9a9cab', 0.55);
  }
  fadeRoot(ctx, -10, 0);
}

export function paintHind(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  // The sole: dark heel and toe pads along the +y edge of the foot, which faces up as the leg trails.
  const sole = smoothLoop([{ x: 52, y: 9.4 }, { x: 62, y: 9.2 }, { x: 72, y: 8 }, { x: 77.4, y: 5.6 }, { x: 77, y: 8 }, { x: 70, y: 10.2 }, { x: 60, y: 10.8 }, { x: 52, y: 11 }], 4);
  pen.fill(sole, '#2a2b36', 1);
  furLimb(k, HIND, { litFront: false, far, droop: -0.1 }, 0, Infinity, () => {
    // The thigh's mass at the root, the hock where the foot turns.
    dab(ctx, 10, 6, 18, '255,252,238', 0.3);
    softLine(ctx, [{ x: 40, y: -10 }, { x: 44, y: 2 }, { x: 42, y: 13 }], 4, LAVENDER, 0.18);
    for (let i = 0; i < 4; i++) taper(ctx, lockLine({ x: 74, y: -5 + i * 3.2 }, unit(1, 0.05), 4, 0), 1, 0.2, LAVENDER, 0.4);
  });
  for (let i = 0; i < 4; i++) {
    const y = -4.4 + i * 3.1;
    taper(ctx, [{ x: 78, y }, { x: 81.4, y: y + 0.5 }, { x: 83, y: y + 1.8 }], 1.7, 0.3, '#0d0d10', 0.9);
  }
}
