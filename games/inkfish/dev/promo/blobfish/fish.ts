import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp, smooth } from '../short';

/**
 * The blobfish, drawn as paths so it stays crisp however close the camera
 * gets, between two forms: `sag` 0 is how it looks at home a kilometre
 * down (a firm, big-headed, tapering fish with spread fins and a normal
 * eye and mouth), 1 is the famous blob (slumped flat, its nose a droopy
 * bulb over a frown, its fins limp, its skin in folds). Every point blends
 * between the two, so the morph is one smooth movement.
 *
 * Fish units: length 1, head to the right, x 0 at its middle, y 0 at the
 * lowest point of its belly (where it rests), y down.
 */
const INK = '#3a1d27';
const CHALK = '#f1e4ea';
const FIRM_SKIN = [206, 176, 172] as const;
const SAG_SKIN = [236, 158, 160] as const;
const FIN = '#c98f93';

interface P { readonly x: number; readonly y: number }

/** The body outline, clockwise from the snout over the back: firm and sagged, point for point. */
const FIRM: readonly P[] = [
  { x: 0.5, y: -0.12 }, { x: 0.47, y: -0.215 }, { x: 0.37, y: -0.29 }, { x: 0.22, y: -0.315 }, { x: 0.04, y: -0.285 },
  { x: -0.14, y: -0.22 }, { x: -0.29, y: -0.165 }, { x: -0.335, y: -0.15 }, { x: -0.335, y: -0.1 }, { x: -0.29, y: -0.085 },
  { x: -0.14, y: -0.045 }, { x: 0.04, y: -0.008 }, { x: 0.2, y: 0 }, { x: 0.36, y: -0.03 }, { x: 0.46, y: -0.075 },
];
const SAG: readonly P[] = [
  { x: 0.545, y: -0.1 }, { x: 0.535, y: -0.25 }, { x: 0.43, y: -0.37 }, { x: 0.24, y: -0.395 }, { x: 0.03, y: -0.315 },
  { x: -0.17, y: -0.19 }, { x: -0.31, y: -0.1 }, { x: -0.355, y: -0.075 }, { x: -0.36, y: -0.03 }, { x: -0.32, y: -0.005 },
  { x: -0.16, y: 0 }, { x: 0.04, y: 0 }, { x: 0.22, y: 0 }, { x: 0.42, y: 0 }, { x: 0.53, y: -0.03 },
];

export interface BlobLook {
  readonly sag: number;
  readonly swell: number;
  readonly wobble: number;
  /** Line-boil frame: the outline's little wobble changes with it. */
  readonly boil: number;
}

const mix = (a: P, b: P, u: number): P => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const rgb = (c: readonly number[], k = 1): string => `rgb(${c.map((v) => Math.round(Math.min(255, v * k))).join(',')})`;

/** A closed smooth curve through points (Catmull-Rom as Béziers). */
function closedCurve(ctx: CanvasRenderingContext2D, pts: readonly P[]): void {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
  ctx.closePath();
}

/** An open smooth curve through points. */
function openCurve(ctx: CanvasRenderingContext2D, pts: readonly P[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
}

/** The line boil: each point nudged a hair, differently on each boil frame. */
function boiled(pts: readonly P[], boil: number, salt: number, amount = 0.0035): P[] {
  const rng = createRng(1009 * (boil + 1) + salt);
  return pts.map((p) => ({ x: p.x + (rng() - 0.5) * 2 * amount, y: p.y + (rng() - 0.5) * 2 * amount }));
}

/**
 * Its shape, swelled and wobbling: puffed up (taller more than longer) as
 * the pressure comes off, squashed and stretched by the jelly's jiggle,
 * all about the belly it rests on.
 */
function bodyTransform(look: BlobLook): (p: P) => P {
  const sx = 1 + 0.05 * look.swell - 0.035 * look.wobble;
  const sy = 1 + 0.16 * look.swell + 0.07 * look.wobble;
  return (p) => ({ x: p.x * sx, y: p.y * sy });
}

/** The tail fin: a spread fan, or a limp crumpled flap drooping to the ground. */
function drawTail(ctx: CanvasRenderingContext2D, u: number, f: (p: P) => P, boil: number, line: number): void {
  const root = mix({ x: -0.32, y: -0.125 }, { x: -0.34, y: -0.04 }, u);
  const top = mix({ x: -0.5, y: -0.215 }, { x: -0.45, y: -0.05 }, u);
  const mid = mix({ x: -0.515, y: -0.12 }, { x: -0.47, y: -0.015 }, u);
  const bot = mix({ x: -0.5, y: -0.03 }, { x: -0.42, y: 0 }, u);
  const fan = boiled([root, top, mid, bot].map(f), boil, 11);
  ctx.beginPath();
  ctx.moveTo(fan[0]!.x, fan[0]!.y - 0.03);
  ctx.quadraticCurveTo(lerp(fan[1]!.x, fan[0]!.x, 0.4), fan[1]!.y, fan[1]!.x, fan[1]!.y);
  ctx.quadraticCurveTo(fan[2]!.x - 0.02, fan[2]!.y, fan[3]!.x, fan[3]!.y);
  ctx.quadraticCurveTo(lerp(fan[3]!.x, fan[0]!.x, 0.6), fan[3]!.y, fan[0]!.x, fan[0]!.y + 0.03);
  ctx.closePath();
  ctx.fillStyle = FIN;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.stroke();
  // Its rays, fading as it goes limp.
  ctx.globalAlpha = 1 - 0.7 * u;
  ctx.lineWidth = line * 0.5;
  for (const k of [0.2, 0.4, 0.6, 0.8]) {
    const end = k < 0.5 ? mix(fan[1]!, fan[2]!, k * 2) : mix(fan[2]!, fan[3]!, k * 2 - 1);
    ctx.beginPath();
    ctx.moveTo(fan[0]!.x - 0.01, fan[0]!.y);
    ctx.lineTo(lerp(fan[0]!.x, end.x, 0.92), lerp(fan[0]!.y, end.y, 0.92));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** The pectoral fin: a big fan held out, or a flap lying limp. */
function drawPectoral(ctx: CanvasRenderingContext2D, u: number, f: (p: P) => P, boil: number, line: number): void {
  const base = [mix({ x: 0.15, y: -0.14 }, { x: 0.16, y: -0.085 }, u), mix({ x: 0.15, y: -0.06 }, { x: 0.15, y: -0.03 }, u)];
  const edge = [
    mix({ x: 0.0, y: -0.2 }, { x: 0.06, y: -0.07 }, u),
    mix({ x: -0.08, y: -0.135 }, { x: 0.0, y: -0.03 }, u),
    mix({ x: -0.07, y: -0.05 }, { x: 0.03, y: -0.004 }, u),
  ];
  const pts = boiled([base[0]!, ...edge, base[1]!].map(f), boil, 23);
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  ctx.quadraticCurveTo(lerp(pts[0]!.x, pts[1]!.x, 0.5), pts[1]!.y - 0.01, pts[1]!.x, pts[1]!.y);
  ctx.quadraticCurveTo(pts[2]!.x - 0.03, pts[2]!.y, pts[3]!.x, pts[3]!.y);
  ctx.quadraticCurveTo(lerp(pts[3]!.x, pts[4]!.x, 0.5), pts[4]!.y + 0.01, pts[4]!.x, pts[4]!.y);
  ctx.closePath();
  ctx.fillStyle = FIN;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line * 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1 - 0.6 * u;
  ctx.lineWidth = line * 0.45;
  for (const k of [0.15, 0.38, 0.62, 0.85]) {
    const end = k < 0.5 ? mix(pts[1]!, pts[2]!, k * 2) : mix(pts[2]!, pts[3]!, k * 2 - 1);
    const from = mix(pts[0]!, pts[4]!, 0.5);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(lerp(from.x, end.x, 0.9), lerp(from.y, end.y, 0.9));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A soft low dorsal fin along the back: only on the firm fish. */
function drawDorsal(ctx: CanvasRenderingContext2D, u: number, f: (p: P) => P, boil: number, line: number): void {
  const show = 1 - smooth(u * 1.6);
  if (show <= 0) return;
  const pts = boiled(
    [{ x: 0.0, y: -0.28 }, { x: -0.04, y: -0.33 }, { x: -0.16, y: -0.27 }, { x: -0.22, y: -0.215 }, { x: -0.16, y: -0.212 }].map((p) => f({ x: p.x, y: lerp(p.y, -0.2, u) })),
    boil, 31,
  );
  ctx.globalAlpha = show;
  openCurve(ctx, pts);
  ctx.closePath();
  ctx.fillStyle = FIN;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = line * 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Faint stipple over the skin, fixed to the body, reseeded each boil frame. */
const SPECKS = (() => {
  const rng = createRng(808);
  return Array.from({ length: 160 }, () => ({ u: rng(), v: rng(), r: 0.002 + rng() * 0.003 }));
})();

/** Draws the blobfish with its belly at (x, y) on screen, `length` px long, turned by `angle`. */
export function drawBlobfish(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, look: BlobLook): void {
  if (length < 4) return;
  const u = clamp01(look.sag);
  const f = bodyTransform(look);
  const line = Math.max(1.6, length * 0.0075) / length;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(length, length);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  drawTail(ctx, u, f, look.boil, line);
  drawDorsal(ctx, u, f, look.boil, line);

  const body = boiled(FIRM.map((p, i) => f(mix(p, SAG[i]!, u))), look.boil, 3);
  // A pale rim first, so its edge reads against the dark water.
  closedCurve(ctx, body);
  ctx.strokeStyle = CHALK;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = line * 2.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Skin: greyish pink at depth, the meme's bright pink when wrecked; lit from above.
  const skin = FIRM_SKIN.map((c, i) => lerp(c, SAG_SKIN[i]!, u));
  const top = Math.min(...body.map((p) => p.y));
  const g = ctx.createLinearGradient(0, top, 0, 0);
  g.addColorStop(0, rgb(skin, 1.1));
  g.addColorStop(0.55, rgb(skin));
  g.addColorStop(1, rgb(skin, 0.72));
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  closedCurve(ctx, body);
  ctx.clip();
  drawSkinDetail(ctx, u, f, look.boil, line, top);
  ctx.restore();

  closedCurve(ctx, body);
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.stroke();

  drawPectoral(ctx, u, f, look.boil, line);
  drawFace(ctx, u, f, look.boil, line);
  ctx.restore();
}

/** Stipple, the jelly's sheen and folds (sagged) or the gill slit (firm). */
function drawSkinDetail(ctx: CanvasRenderingContext2D, u: number, f: (p: P) => P, boil: number, line: number, top: number): void {
  const rng = createRng(77 + boil);
  ctx.fillStyle = INK;
  for (const s of SPECKS) {
    const p = f({ x: -0.34 + s.u * 0.86, y: top + s.v * (0 - top) });
    ctx.globalAlpha = 0.18 + 0.12 * rng();
    ctx.beginPath();
    ctx.arc(p.x + (rng() - 0.5) * 0.004, p.y + (rng() - 0.5) * 0.004, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A wet sheen across the forehead, glossier on the jelly.
  ctx.globalAlpha = 0.18 + 0.3 * u;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = line * 2.2;
  openCurve(ctx, boiled([{ x: 0.07, y: lerp(-0.25, -0.27, u) }, { x: 0.2, y: lerp(-0.285, -0.325, u) }, { x: 0.34, y: lerp(-0.265, -0.31, u) }].map(f), boil, 41));
  ctx.stroke();
  // Folds of loose skin: jowls, a sagging cheek, rolls down the body.
  ctx.strokeStyle = INK;
  ctx.lineWidth = line * 0.7;
  const folds: readonly (readonly P[])[] = [
    [{ x: 0.46, y: -0.05 }, { x: 0.36, y: -0.12 }, { x: 0.24, y: -0.06 }],
    [{ x: 0.3, y: -0.03 }, { x: 0.18, y: -0.09 }, { x: 0.08, y: -0.02 }],
    [{ x: 0.08, y: -0.27 }, { x: 0.03, y: -0.16 }, { x: 0.06, y: -0.03 }],
    [{ x: -0.07, y: -0.22 }, { x: -0.11, y: -0.12 }, { x: -0.08, y: -0.02 }],
    [{ x: -0.2, y: -0.15 }, { x: -0.23, y: -0.08 }, { x: -0.21, y: -0.01 }],
  ];
  ctx.globalAlpha = 0.75 * smooth(u * 1.3 - 0.2);
  for (const [i, fold] of folds.entries()) {
    openCurve(ctx, boiled(fold.map(f), boil, 50 + i));
    ctx.stroke();
  }
  // The gill slit of the firm fish.
  ctx.globalAlpha = 1 - smooth(u * 1.5);
  ctx.lineWidth = line * 0.8;
  openCurve(ctx, boiled([{ x: 0.23, y: -0.25 }, { x: 0.205, y: -0.16 }, { x: 0.215, y: -0.07 }].map(f), boil, 61));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** The eye, the mouth and the nose. */
function drawFace(ctx: CanvasRenderingContext2D, u: number, f: (p: P) => P, boil: number, line: number): void {
  // The mouth: a plain fish's mouth, or a frown under the nose.
  const mouth = boiled(
    [
      mix({ x: 0.497, y: -0.105 }, { x: 0.43, y: -0.02 }, u),
      mix({ x: 0.44, y: -0.09 }, { x: 0.37, y: -0.06 }, u),
      mix({ x: 0.38, y: -0.084 }, { x: 0.3, y: -0.045 }, u),
      mix({ x: 0.345, y: -0.072 }, { x: 0.265, y: -0.012 }, u),
    ].map(f),
    boil, 71,
  );
  ctx.strokeStyle = INK;
  ctx.lineWidth = line * 1.15;
  openCurve(ctx, mouth);
  ctx.stroke();
  // Lower lip, hanging, on the blob.
  ctx.globalAlpha = smooth(u * 1.4 - 0.3);
  ctx.lineWidth = line * 0.7;
  openCurve(ctx, boiled([{ x: 0.41, y: -0.012 }, { x: 0.35, y: -0.035 }, { x: 0.29, y: -0.006 }].map(f), boil, 73));
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The eye: a round, bright fish eye, or a small bead under a heavy fold.
  const eye = f(mix({ x: 0.36, y: -0.2 }, { x: 0.33, y: -0.225 }, u));
  const r = lerp(0.034, 0.017, u);
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#efe6e0';
  ctx.globalAlpha = 1 - 0.85 * u;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line * 0.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(eye.x + 0.004 * (1 - u), eye.y, r * lerp(0.62, 1, u), 0, Math.PI * 2);
  ctx.fillStyle = '#120a10';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eye.x - r * 0.25, eye.y - r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // The droopy lid over the blob's eye.
  ctx.globalAlpha = smooth(u * 1.3 - 0.2);
  ctx.lineWidth = line * 0.9;
  openCurve(ctx, boiled([{ x: eye.x - 0.05, y: eye.y - 0.005 }, { x: eye.x, y: eye.y - 0.03 }, { x: eye.x + 0.045, y: eye.y + 0.004 }], boil, 81));
  ctx.stroke();
  openCurve(ctx, boiled([{ x: eye.x - 0.035, y: eye.y + 0.035 }, { x: eye.x + 0.005, y: eye.y + 0.045 }, { x: eye.x + 0.04, y: eye.y + 0.03 }], boil, 83));
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The nose: a small bump on the firm snout, a big soft bulb drooping over the mouth on the blob.
  const nose = f(mix({ x: 0.488, y: -0.145 }, { x: 0.505, y: -0.1 }, u));
  const rx = lerp(0.026, 0.096, u);
  const ry = lerp(0.03, 0.108, u);
  const show = smooth(u * 1.4);
  if (show > 0.01) {
    const rim = boiled(Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      // Heavier at the bottom: it hangs.
      const hang = Math.sin(a) > 0 ? 1 + 0.18 * Math.sin(a) * u : 1;
      return { x: nose.x + Math.cos(a) * rx, y: nose.y + Math.sin(a) * ry * hang };
    }), boil, 91, 0.003);
    ctx.globalAlpha = show;
    closedCurve(ctx, rim);
    const g = ctx.createRadialGradient(nose.x - rx * 0.3, nose.y - ry * 0.4, 0, nose.x, nose.y, Math.max(rx, ry) * 1.2);
    g.addColorStop(0, '#ffc9c6');
    g.addColorStop(1, '#d98a8d');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = line;
    ctx.stroke();
    // Its shine.
    ctx.beginPath();
    ctx.ellipse(nose.x - rx * 0.35, nose.y - ry * 0.45, rx * 0.22, ry * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.55 * show;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
