import { LIMBS, limbPoints, type SquidPose } from '../../../src/art/squidPose';
import { type Pt, resample, spline } from './whale';

/**
 * How the whale and the squid fit together, in the whale's own px (local
 * px, whale.ts): where the squid hangs in the jaws, the paths its arms take
 * round the whale's head, and the sucker scars they leave. Pure geometry;
 * story.ts moves it and render.ts draws it.
 */

/** A placement: body px to world (or screen) px, turned by `angle` and scaled by `scale` about (x, y). */
export interface Frame {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly scale: number;
}

export function apply(f: Frame, p: Pt): Pt {
  const c = Math.cos(f.angle) * f.scale;
  const s = Math.sin(f.angle) * f.scale;
  return { x: f.x + p.x * c - p.y * s, y: f.y + p.x * s + p.y * c };
}

export function invert(f: Frame, p: Pt): Pt {
  const dx = p.x - f.x;
  const dy = p.y - f.y;
  const c = Math.cos(-f.angle) / f.scale;
  const s = Math.sin(-f.angle) / f.scale;
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

/** `inner` placed inside `outer`. */
export function compose(outer: Frame, inner: Frame): Frame {
  const at = apply(outer, inner);
  return { x: at.x, y: at.y, angle: outer.angle + inner.angle, scale: outer.scale * inner.scale };
}

// ---------------------------------------------------------------- the squid in the jaws

/** Squid body px (the game's drawing) to whale local px: a giant squid a little over half the case's length. */
export const SQUID_SCALE = 2.6;
/** Its crown of arms, held at the front of the jaws, and which way its body runs from there (its arms point back up at the whale). */
export const CROWN: Pt = { x: -95, y: 215 };
export const SQUID_ANGLE = Math.PI + 0.55;
/** Where its arms leave its head, squid body px (squidPose.ts). */
const CROWN_X = 110;

/** The squid's body in the whale's local px, swinging `swing` radians about its crown, held in the jaws. */
export function squidInJaws(swing: number): Frame {
  const angle = SQUID_ANGLE + swing;
  const k = CROWN_X * SQUID_SCALE;
  return { x: CROWN.x - Math.cos(angle) * k, y: CROWN.y - Math.sin(angle) * k, angle, scale: SQUID_SCALE };
}

/**
 * Where each limb (squidPose LIMBS, in order) runs once it has wrapped round
 * the whale's head, local px, after its root: the near ones up over the
 * cheek, across the side of the case and over the eye, the far ones (drawn
 * behind the whale) showing past the snout and over the top of the head,
 * one tentacle thrashing free.
 */
export const WRAPS: readonly (readonly Pt[])[] = [
  [{ x: -40, y: 150 }, { x: 40, y: 30 }, { x: 62, y: -140 }, { x: 12, y: -300 }, { x: -120, y: -372 }, { x: -240, y: -352 }],
  [{ x: -110, y: 140 }, { x: -180, y: -80 }, { x: -280, y: -300 }, { x: -420, y: -382 }, { x: -560, y: -362 }],
  [{ x: 20, y: 190 }, { x: 200, y: 90 }, { x: 320, y: -150 }, { x: 300, y: -400 }, { x: 170, y: -520 }],
  [{ x: -260, y: 262 }, { x: -450, y: 352 }, { x: -650, y: 362 }, { x: -780, y: 322 }],
  [{ x: -10, y: 272 }, { x: 100, y: 382 }, { x: 90, y: 472 }, { x: 20, y: 500 }],
  [{ x: -170, y: 150 }, { x: -330, y: 90 }, { x: -500, y: 40 }, { x: -640, y: -20 }, { x: -700, y: -90 }, { x: -680, y: -132 }],
  [{ x: -80, y: 120 }, { x: -150, y: 10 }, { x: -260, y: -90 }, { x: -400, y: -160 }, { x: -520, y: -200 }, { x: -562, y: -168 }],
  [{ x: -20, y: 130 }, { x: 10, y: -30 }, { x: -40, y: -180 }, { x: -200, y: -270 }, { x: -450, y: -300 }, { x: -700, y: -270 }, { x: -860, y: -200 }],
  [{ x: -200, y: 160 }, { x: -360, y: 110 }, { x: -520, y: 80 }, { x: -640, y: 60 }, { x: -720, y: 30 }, { x: -742, y: -20 }],
  [{ x: -170, y: 300 }, { x: -330, y: 340 }, { x: -500, y: 350 }, { x: -620, y: 322 }],
];

/** Points along each limb (as squidPose has them), so the wrapped and the free shapes can be blended point for point. */
const pointsOf = (i: number): number => limbPoints(LIMBS[i]!, { t: 0, splay: 1, writhe: 0, stream: 0, lag: 0, strike: 0, aim: { x: 0, y: 0 } }).length;

/** Limb i wrapped round the head, local px, root first, writhing (`phase`, `amount`). */
export function wrappedLimb(i: number, root: Pt, phase: number, amount: number): Pt[] {
  const path = resample(spline([root, ...WRAPS[i]!], 8), pointsOf(i));
  return path.map((p, k) => {
    const s = k / (path.length - 1);
    const a = path[Math.max(0, k - 1)]!;
    const b = path[Math.min(path.length - 1, k + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const off = amount * 26 * s * Math.sin(phase - 4 * s);
    return { x: p.x - ((b.y - a.y) / d) * off, y: p.y + ((b.x - a.x) / d) * off };
  });
}

/** Limb i loose in the water (the game's own writhing), squid body px. */
export function freeLimb(i: number, t: number, splay: number): Pt[] {
  const pose: SquidPose = { t, splay, writhe: 1, stream: 0.1, lag: 0, strike: 0, aim: { x: 400, y: 0 } };
  return limbPoints(LIMBS[i]!, pose);
}

// ---------------------------------------------------------------- scars

export interface Scar {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Its place in the order they appear, 0 .. 1. */
  readonly order: number;
}

/**
 * Round sucker scars where the arms grip: rows of rings beside each near
 * arm's path across the head, big near the arm's root and smaller towards
 * its tip, and a few older trails between them.
 */
export const SCARS: readonly Scar[] = (() => {
  const near = [5, 6, 7, 8];
  const older: readonly (readonly Pt[])[] = [
    [{ x: -160, y: -20 }, { x: -300, y: -110 }, { x: -380, y: -60 }],
    [{ x: -500, y: -150 }, { x: -620, y: -200 }, { x: -760, y: -180 }],
    [{ x: -560, y: 40 }, { x: -600, y: -80 }, { x: -700, y: -120 }],
  ];
  const tracks = [
    ...near.flatMap((i) => [-1, 1].map((side) => ({ pts: spline([CROWN, ...WRAPS[i]!], 8), side }))),
    ...older.map((pts) => ({ pts: spline(pts, 8), side: 0 })),
  ];
  const out: Scar[] = [];
  tracks.forEach((track, k) => {
    const pts = resample(track.pts, 14);
    pts.forEach((p, i) => {
      if (i < 2 || (i + k) % 2 || p.x > -30 || p.y < -250 || p.y > 185) return;
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const off = track.side * (34 + 6 * Math.sin(i * 1.7 + k));
      const s = i / (pts.length - 1);
      out.push({
        x: p.x - ((b.y - a.y) / d) * off + 5 * Math.sin(i * 2.3 + k),
        y: p.y + ((b.x - a.x) / d) * off + 4 * Math.cos(i * 1.9 + k),
        r: (16 - 8 * s) * (track.side === 0 ? 0.85 : 1),
        order: (k + s) / tracks.length,
      });
    });
  });
  return out;
})();
