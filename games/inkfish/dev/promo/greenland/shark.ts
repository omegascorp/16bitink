import { createRng } from '../../../src/logic/rng';
import { chalk, pathThrough, type Pt, spline } from './ink';

/**
 * The Greenland shark, drawn as paths in chalk and ink: a long, heavy,
 * cylindrical body; a short, blunt, rounded snout; a small clouded eye with
 * a copepod hanging off it; five small gill slits low on the side; two small
 * dorsal fins set well back and no anal fin; small pectoral and pelvic fins;
 * a tail with a long upper lobe; dark grey-brown skin, mottled and stippled.
 *
 * Its shape is in body lengths (nose to tail base is 1), nose at x = +0.5,
 * belly down; `along` runs 0 at the nose to 1 at the tail base, `across` in
 * half-heights below the midline (-1 the back, +1 the belly). The body bends
 * with a slow travelling wave. Everything is placed through bodyPoint, so the
 * story can put a tape or a magnifier exactly on it.
 */

export interface SharkPose {
  /** Its body centre, px, and its length nose to tail base, px. */
  readonly x: number;
  readonly y: number;
  readonly length: number;
  /** 1 faces right, -1 left. */
  readonly facing: 1 | -1;
  /** Nose-up tilt, radians. */
  readonly tilt: number;
  /** Tail-beat phase (radians) and strength (0 .. 1). */
  readonly beat: number;
  readonly effort: number;
}

/** Its greatest half-height, in body lengths: a heavy, round-bodied fish. */
const H = 0.112;
/** Its eye, small: where (along, across) and how big (body lengths). */
export const EYE = { along: 0.085, across: -0.36, r: 0.0115 } as const;

const smooth = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};

/** Half its height at `along`: a rounded blunt snout, a long even barrel, tapering to the tail stalk. */
export function halfHeight(along: number): number {
  const a = Math.max(0, Math.min(1, along));
  const snout = a < 0.24 ? Math.sqrt(Math.max(0, 1 - (1 - a / 0.24) ** 2)) : 1;
  const swell = 0.9 + 0.1 * smooth((a - 0.1) / 0.3);
  const taper = a > 0.45 ? 0.26 + 0.74 * Math.cos((Math.PI / 2) * ((a - 0.45) / 0.55)) ** 1.25 : 1;
  return H * snout * swell * taper;
}

/** Its midline: the snout overhangs the mouth a little. */
const midline = (along: number): number => (along < 0.24 ? 0.014 * (1 - along / 0.24) ** 2 : 0);

/** The slow wave down its body, body lengths: nothing at the head, growing towards the tail. */
export function waveAt(along: number, beat: number, effort: number): number {
  const bend = Math.max(0, (along - 0.28) / 0.72);
  return (0.014 + 0.02 * effort) * bend * bend * Math.sin(beat - 2.3 * along);
}

/** The edge of its body at `across` (-1 back, +1 belly), before the wave. */
const edge = (along: number, across: number): number => midline(along) + across * halfHeight(along) * (across < 0 ? 1.06 : 0.92);

/** A point on (or in) the shark in body lengths, bent with its wave. */
export function bodyPoint(along: number, across: number, beat: number, effort: number): Pt {
  return { x: 0.5 - along, y: edge(along, across) + waveAt(along, beat, effort) };
}

/** A point given as (along, y off its unbent shape), bent with the wave: for fins. */
const bent = (along: number, y: number, beat: number, effort: number): Pt => ({ x: 0.5 - along, y: y + waveAt(along, beat, effort) });

// ---------------------------------------------------------------- shapes, as (along, y) before bending

const top = (a: number): number => edge(a, -1);
const bottom = (a: number): number => edge(a, 1);

/** The tail: a long upper lobe raked up and back, a short lower one. */
const TAIL: readonly (readonly [number, number])[] = [
  [0.96, top(0.96)], [1.02, -0.05], [1.09, -0.088], [1.16, -0.122], [1.185, -0.128], [1.17, -0.106], [1.14, -0.07], [1.115, -0.032],
  [1.1, -0.006], [1.115, 0.022], [1.13, 0.05], [1.125, 0.062], [1.09, 0.052], [1.04, 0.036], [0.97, bottom(0.97)],
];
/** Two small dorsal fins, low and rounded, set well back. */
const DORSAL_1: readonly (readonly [number, number])[] = [
  [0.49, top(0.49) + 0.004], [0.515, top(0.515) - 0.018], [0.54, top(0.54) - 0.034], [0.56, top(0.56) - 0.038], [0.572, top(0.572) - 0.028],
  [0.578, top(0.578) - 0.012], [0.592, top(0.592) + 0.003],
];
const DORSAL_2: readonly (readonly [number, number])[] = [
  [0.71, top(0.71) + 0.004], [0.73, top(0.73) - 0.016], [0.752, top(0.752) - 0.03], [0.77, top(0.77) - 0.032], [0.779, top(0.779) - 0.02],
  [0.784, top(0.784) - 0.008], [0.798, top(0.798) + 0.003],
];
/** A small paddle of a pectoral fin, low behind the gills, and a small pelvic fin far back. */
const PECTORAL: readonly (readonly [number, number])[] = [
  [0.225, edge(0.225, 0.6)], [0.25, bottom(0.25) + 0.008], [0.278, bottom(0.278) + 0.026], [0.3, bottom(0.3) + 0.034],
  [0.31, bottom(0.31) + 0.028], [0.298, bottom(0.298) + 0.01], [0.278, edge(0.278, 0.82)],
];
const PELVIC: readonly (readonly [number, number])[] = [
  [0.655, bottom(0.655) - 0.003], [0.685, bottom(0.685) + 0.014], [0.715, bottom(0.715) + 0.026], [0.73, bottom(0.73) + 0.022],
  [0.722, bottom(0.722) + 0.008], [0.71, bottom(0.71) - 0.002],
];

/** Five small gill slits low on its side, each a short bowed stroke. */
const GILLS = Array.from({ length: 5 }, (_, i) => 0.168 + i * 0.017);

// ---------------------------------------------------------------- skin

/** Soft blotches of darker and paler skin, and a stipple of fine dots: (along, across) and size in body lengths. */
const MOTTLE = (() => {
  const rng = createRng(2016);
  return Array.from({ length: 110 }, () => ({ a: 0.05 + rng() * 0.95, c: rng() * 2 - 1, r: 0.004 + rng() * 0.01, dark: rng() < 0.65 }));
})();
const STIPPLE = (() => {
  const rng = createRng(392);
  return Array.from({ length: 900 }, () => {
    const c = rng() * 2 - 1;
    // Denser on the back.
    return { a: 0.02 + rng() * 0.98, c, r: 0.0011 + rng() * 0.0016, keep: rng() < (c < 0 ? 0.95 : 0.45) };
  }).filter((d) => d.keep);
})();
/** Pale old scars from a long, slow life: (along, across, length, slant). */
const SCARS = [[0.42, -0.35, 0.028, -0.3], [0.55, 0.15, 0.02, 0.4], [0.63, -0.1, 0.024, -0.2], [0.33, 0.25, 0.016, 0.2]] as const;

const CHALK = '#e2dccf';
const BACK = '#26221f';
const FLANK = '#3a332e';
const BELLY = '#575049';
const FIN = '#3c3530';

// ---------------------------------------------------------------- drawing

/** Maps body lengths to screen px for a pose. */
function placer(pose: SharkPose): (p: Pt) => Pt {
  const [c, s] = [Math.cos(pose.tilt), Math.sin(pose.tilt)];
  const L = pose.length;
  return (p) => {
    const x = p.x * pose.facing;
    return { x: pose.x + (x * c + p.y * s * pose.facing) * L, y: pose.y + (-x * s * pose.facing + p.y * c) * L };
  };
}

/** Points along each of the back and the belly. */
const OUTLINE_STEPS = 64;

/** The body's outline, nose round the back to the tail stalk and back along the belly, bent. */
function bodyOutline(pose: SharkPose): Pt[] {
  const n = OUTLINE_STEPS;
  const back = Array.from({ length: n + 1 }, (_, i) => bodyPoint((i / n) ** 1.15, -1, pose.beat, pose.effort));
  const belly = Array.from({ length: n + 1 }, (_, i) => bodyPoint((1 - i / n) ** 1.15, 1, pose.beat, pose.effort));
  return [...back, ...belly.slice(1)];
}

const finPoints = (shape: readonly (readonly [number, number])[], pose: SharkPose): Pt[] =>
  spline(shape.map(([a, y]) => bent(a, y, pose.beat, pose.effort)), false, 6);

function drawFin(ctx: CanvasRenderingContext2D, pts: readonly Pt[], line: number, wander: number, boil: number, seed: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = FIN;
  pathThrough(ctx, pts, true);
  ctx.fill();
  ctx.restore();
  chalk(ctx, pts, seed, boil, { width: line * 0.8, color: CHALK, alpha: 0.9 * alpha, wander });
}

/** The eye: small, pale and clouded, a dark pupil, and the copepod trailing from it. */
function drawEye(ctx: CanvasRenderingContext2D, at: (p: Pt) => Pt, pose: SharkPose, line: number, boil: number, t: number): void {
  const c = at(bodyPoint(EYE.along, EYE.across, pose.beat, pose.effort));
  const r = EYE.r * pose.length;
  ctx.save();
  const g = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, r * 0.1, c.x, c.y, r);
  g.addColorStop(0, '#dde6e9');
  g.addColorStop(1, '#8e9ea5');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3e4c54';
  ctx.beginPath();
  ctx.arc(c.x + r * 0.1 * pose.facing, c.y, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(230,238,240,0.45)';
  ctx.beginPath();
  ctx.arc(c.x + r * 0.2 * pose.facing, c.y + r * 0.15, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  chalk(ctx, spline(Array.from({ length: 8 }, (_, i) => ({ x: c.x + Math.cos((i / 8) * Math.PI * 2) * r, y: c.y + Math.sin((i / 8) * Math.PI * 2) * r })), true, 4), 90, boil, {
    width: Math.max(1.2, line * 0.55), color: '#0d0b0a', alpha: 0.9, wander: line * 0.1, close: true, retrace: false,
  });
  // The copepod: a pale strand hanging off the eye, two egg sacs trailing from it.
  if (r < 2) return;
  const sway = 0.15 * Math.sin(t * 2.2);
  const root = { x: c.x + r * 0.3 * pose.facing, y: c.y + r * 0.6 };
  const dir = (k: number, spread: number): Pt => ({ x: Math.sin(-0.3 * pose.facing + sway + spread) * k, y: Math.cos(-0.3 * pose.facing + sway + spread) * k });
  const body = [root, { x: root.x + dir(r * 1.6, 0).x, y: root.y + dir(r * 1.6, 0).y }];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#efe3c6';
  ctx.lineWidth = Math.max(1, r * 0.32);
  pathThrough(ctx, body);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, r * 0.2);
  ctx.strokeStyle = '#ddcca2';
  for (const spread of [-0.22, 0.22]) {
    const d = dir(r * 1.5, spread);
    pathThrough(ctx, [body[1]!, { x: body[1]!.x + d.x, y: body[1]!.y + d.y }]);
    ctx.stroke();
  }
  ctx.restore();
}

/** Its skin: a dark grey-brown, back to belly, blotched and stippled, scarred, its back caught by the light from the ice. */
function drawSkin(ctx: CanvasRenderingContext2D, at: (p: Pt) => Pt, pose: SharkPose, outline: readonly Pt[], line: number, boil: number): void {
  const L = pose.length;
  const p = (a: number, c: number): Pt => at(bodyPoint(a, c, pose.beat, pose.effort));
  const [up, down] = [p(0.4, -1), p(0.4, 1)];
  const g = ctx.createLinearGradient(up.x, up.y, down.x, down.y);
  g.addColorStop(0, BACK);
  g.addColorStop(0.6, FLANK);
  g.addColorStop(1, BELLY);
  ctx.save();
  pathThrough(ctx, outline, true);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  for (const m of MOTTLE) {
    const q = p(m.a, m.c);
    ctx.fillStyle = m.dark ? 'rgba(18,15,13,0.28)' : 'rgba(120,108,96,0.1)';
    ctx.beginPath();
    ctx.ellipse(q.x, q.y, m.r * L * 1.6, m.r * L, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#0e0c0b';
  ctx.globalAlpha = 0.5;
  for (const d of STIPPLE) {
    const q = p(d.a, d.c);
    ctx.beginPath();
    ctx.arc(q.x, q.y, Math.max(0.5, d.r * L), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Shadow hatched along the belly, where no light reaches.
  for (let a = 0.12; a < 0.98; a += 0.012) {
    const [from, to] = [p(a, 0.55), p(a - 0.01, 1.05)];
    chalk(ctx, [from, to], 300 + Math.round(a * 1000), boil, { width: Math.max(0.8, line * 0.35), color: '#0b0908', alpha: 0.4, wander: line * 0.1, retrace: false });
  }
  ctx.restore();
  for (const [a, c, len, slant] of SCARS) {
    const q = p(a, c);
    const dx = (len * L) / 2;
    chalk(ctx, [{ x: q.x - dx, y: q.y - dx * slant }, { x: q.x + dx, y: q.y + dx * slant }], 400 + Math.round(a * 100), boil, {
      width: Math.max(1, line * 0.45), color: '#b9b1a4', alpha: 0.55, wander: line * 0.12, retrace: false,
    });
  }
  // Cold light from the ice, along its back.
  const rim = Array.from({ length: 30 }, (_, i) => p(0.06 + (0.84 * i) / 29, -0.86));
  chalk(ctx, rim, 450, boil, { width: Math.max(1.2, line * 0.8), color: '#9fd0e0', alpha: 0.35, wander: line * 0.2, retrace: false });
}

/** Draws the shark in pose; `t` sways the copepod. */
export function drawGreenlandShark(ctx: CanvasRenderingContext2D, pose: SharkPose, boil: number, t: number, alpha = 1): void {
  if (alpha <= 0 || pose.length < 4) return;
  const at = placer(pose);
  const line = Math.min(6, Math.max(1.2, pose.length * 0.0044));
  const wander = Math.min(2.4, pose.length * 0.0016);
  const fin = (shape: readonly (readonly [number, number])[]): Pt[] => finPoints(shape, pose).map(at);
  ctx.save();
  ctx.globalAlpha *= alpha;
  // Behind the body: the far pectoral, the tail, the dorsal and pelvic fins.
  drawFin(ctx, fin(PECTORAL).map((q) => ({ x: q.x + 0.012 * pose.length * pose.facing, y: q.y - 0.006 * pose.length })), line, wander, boil, 10, 0.55);
  drawFin(ctx, fin(TAIL), line, wander, boil, 20);
  drawFin(ctx, fin(DORSAL_1), line, wander, boil, 30);
  drawFin(ctx, fin(DORSAL_2), line, wander, boil, 40);
  drawFin(ctx, fin(PELVIC), line, wander, boil, 50);
  const outline = bodyOutline(pose).map(at);
  drawSkin(ctx, at, pose, outline, line, boil);
  // Its outline along the back and round the snout to the belly, open at the tail stalk where the tail takes over.
  const back = OUTLINE_STEPS + 1;
  chalk(ctx, [...outline.slice(0, back).reverse(), ...outline.slice(back).reverse()], 60, boil, { width: line, color: CHALK, wander });
  const p = (a: number, c: number): Pt => at(bodyPoint(a, c, pose.beat, pose.effort));
  // Five gill slits, bowed forwards.
  GILLS.forEach((a, i) => {
    chalk(ctx, spline([p(a, 0.02), p(a - 0.005, 0.28), p(a, 0.55)], false, 4), 70 + i, boil, {
      width: Math.max(1, line * 0.65), color: '#0b0908', alpha: 0.85, wander: wander * 0.4, retrace: false,
    });
    chalk(ctx, spline([p(a + 0.003, 0.04), p(a - 0.002, 0.28), p(a + 0.003, 0.52)], false, 4), 80 + i, boil, {
      width: Math.max(0.8, line * 0.35), color: CHALK, alpha: 0.4, wander: wander * 0.4, retrace: false,
    });
  });
  // The mouth, a grim curve under the blunt snout, and a nostril at its tip.
  chalk(ctx, spline([p(0.055, 0.82), p(0.1, 0.9), p(0.15, 0.86)], false, 5), 95, boil, { width: Math.max(1, line * 0.7), color: CHALK, alpha: 0.75, wander: wander * 0.4 });
  chalk(ctx, spline([p(0.03, 0.05), p(0.04, 0.2), p(0.05, 0.12)], false, 4), 96, boil, { width: Math.max(0.8, line * 0.5), color: CHALK, alpha: 0.6, wander: wander * 0.3, retrace: false });
  drawEye(ctx, at, pose, line, boil, t);
  // On top: the near pectoral.
  drawFin(ctx, fin(PECTORAL), line, wander, boil, 99);
  ctx.restore();
}
