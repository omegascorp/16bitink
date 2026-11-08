import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { spline } from '../../kraken/whale';
import { curve, dab, path, screenScale, smoothLoop, softLine, taper } from '../../seal/art/paint';
import type { Placed } from '../../seal/story';

/**
 * The harbour porpoise, a small chunky whale: a blunt round head with NO beak,
 * a smiling little mouth line, a small dark eye, a low triangular fin, small
 * dark flippers and smooth skin, dark over the back and pale under, the two
 * running into each other in soft mottling. Its tail curls up so the flukes
 * spread flat at us: a whale's tail, nothing like a fish's. The wash follows
 * the curled body rib by rib. Own units: 310 long, nose to the right, the
 * middle of the body at 0,0, belly down.
 */

export const UNITS = 310;
/** Stretched deep: harbour porpoises are stout little animals. */
const CHUNK = 1.2;

export interface PorpoiseLook {
  /** Wide, worried eye, 0 .. 1. */
  readonly fear?: number;
}

/** The back, from the blunt nose to the tail stock, then the underside: hand-drawn so the head is a true round melon, the body a chunky torpedo. */
const BACK: readonly Pt[] = [
  { x: 157, y: 6 }, { x: 152, y: -9 }, { x: 137, y: -23 }, { x: 110, y: -33 }, { x: 70, y: -39 }, { x: 24, y: -42 }, { x: -24, y: -41 },
  { x: -62, y: -38 }, { x: -90, y: -43 }, { x: -108, y: -57 }, { x: -118, y: -76 }, { x: -122, y: -92 },
];
const BELLY: readonly Pt[] = [
  { x: 157, y: 6 }, { x: 153, y: 19 }, { x: 134, y: 31 }, { x: 98, y: 39 }, { x: 50, y: 43 }, { x: -4, y: 40 }, { x: -54, y: 30 },
  { x: -100, y: 12 }, { x: -130, y: -10 }, { x: -146, y: -40 }, { x: -148, y: -72 }, { x: -142, y: -94 },
];

interface Shape {
  readonly top: readonly Pt[];
  readonly under: readonly Pt[];
  readonly body: readonly Pt[];
  readonly fin: readonly Pt[];
  readonly flukes: readonly Pt[];
}

const RIBS = 66;

/** `n` points evenly spaced along a smoothed line. */
function even(line: readonly Pt[], n: number): Pt[] {
  const fine = spline([...line], 6);
  const lengths = fine.reduce<number[]>((acc, p, i) => {
    const q = fine[Math.max(0, i - 1)]!;
    return [...acc, (acc[acc.length - 1] ?? 0) + Math.hypot(p.x - q.x, p.y - q.y)];
  }, []);
  const total = lengths[lengths.length - 1]!;
  return Array.from({ length: n }, (_, i) => fine[Math.max(0, lengths.findIndex((l) => l >= (i / (n - 1)) * total))]!);
}

const TOP = even(BACK, RIBS);
const UNDER = even(BELLY, RIBS);

/** The tail swinging: the far end of the body shifts a little. */
function swing(p: Pt, sway: number): Pt {
  const b = Math.max(0, Math.min(1, (-p.x - 40) / 120));
  return { x: p.x + 7 * b * sway, y: p.y + 5 * b * b * sway };
}

/** The outline, with the fin and the flukes hung on it. */
function shapeOf(beat: number): Shape {
  const sway = Math.sin(beat);
  const top = TOP.map((p) => swing(p, sway));
  const under = UNDER.map((p) => swing(p, sway));
  const f = top[Math.round(RIBS * 0.47)]!;
  const fin = spline([{ x: f.x + 30, y: f.y + 6 }, { x: f.x + 6, y: f.y - 15 }, { x: f.x - 14, y: f.y - 29 }, { x: f.x - 19, y: f.y - 15 }, { x: f.x - 28, y: f.y + 8 }], 4);
  const [a, b] = [top[RIBS - 1]!, under[RIBS - 1]!];
  const end = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  // A whale's tail spread flat at us: two wide lobes, tips swept up, a notch in the middle. The far lobe a little smaller.
  const flukes = smoothLoop([
    [9, 12], [32, 2], [58, -16], [80, -42], [54, -36], [28, -32], [0, -22], [-30, -34], [-58, -40], [-86, -48], [-62, -18], [-34, 2], [-9, 12],
  ].map(([x, y]) => ({ x: end.x + x! + 3 * sway, y: end.y + y! - 8 })), 3);
  return { top, under, body: [...top, ...[...under].reverse().slice(1)], fin, flukes };
}

const RIB_STOPS: readonly (readonly [number, string])[] = [
  [0, '#22282f'], [0.3, '#303942'], [0.5, '#46515b'], [0.62, '#7f8a90'], [0.74, '#cfcfc8'], [0.9, '#f1ece0'], [1, '#c6ced0'],
];

function wash(ctx: CanvasRenderingContext2D, s: Shape): void {
  for (let i = 0; i + 1 < s.top.length; i++) {
    const [a, b] = [s.top[i]!, s.under[i]!];
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    for (const [at, c] of RIB_STOPS) g.addColorStop(at, c);
    ctx.fillStyle = g;
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5;
    path(ctx, [a, s.top[i + 1]!, s.under[i + 1]!, b]);
    ctx.fill();
    ctx.stroke();
  }
}

/** Soft mottling where dark meets pale, a matte sheen on the back, the water's light under the belly. Smooth skin: no scales, no lines. */
function light(ctx: CanvasRenderingContext2D, s: Shape): void {
  const rng = createRng(61);
  for (let i = 0; i < 70; i++) {
    const q = Math.floor(3 + rng() * (RIBS - 22));
    const [a, b] = [s.top[q]!, s.under[q]!];
    const v = 0.48 + rng() * 0.24;
    dab(ctx, a.x + (b.x - a.x) * v, a.y + (b.y - a.y) * v, 2.5 + rng() * 6, rng() < 0.6 ? '34,41,49' : '238,234,222', 0.16 + rng() * 0.24);
  }
  dab(ctx, 96, -26, 62, '150,170,186', 0.3);
  dab(ctx, 10, -34, 80, '130,150,166', 0.2);
  dab(ctx, -70, -36, 50, '120,140,156', 0.14);
  dab(ctx, 124, 22, 34, '250,246,236', 0.5);
  softLine(ctx, s.under.slice(4, -16).map((p) => ({ x: p.x, y: p.y - 5 })), 8, '#8fb2c6', 0.26, 10);
}

function flukes(ctx: CanvasRenderingContext2D, s: Shape, lw: number): void {
  path(ctx, s.flukes);
  const c = s.flukes[0]!;
  const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 70);
  g.addColorStop(0, '#2c343d');
  g.addColorStop(0.7, '#4c5964');
  g.addColorStop(1, '#2c343c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * lw;
  ctx.stroke();
}

function fin(ctx: CanvasRenderingContext2D, s: Shape, lw: number): void {
  path(ctx, s.fin);
  const g = ctx.createLinearGradient(0, s.fin[0]!.y - 40, 0, s.fin[0]!.y + 8);
  g.addColorStop(0, '#5c6974');
  g.addColorStop(1, '#2a323a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * lw;
  ctx.stroke();
}

function flipper(ctx: CanvasRenderingContext2D, beat: number, lw: number): void {
  ctx.save();
  ctx.translate(92, 30);
  ctx.rotate(0.85 + 0.16 * Math.sin(beat + 1));
  const shape = smoothLoop([{ x: -4, y: -9 }, { x: 16, y: -9 }, { x: 36, y: -1 }, { x: 18, y: 8 }, { x: -4, y: 8 }], 5);
  path(ctx, shape);
  const g = ctx.createLinearGradient(0, -9, 0, 9);
  g.addColorStop(0, '#3a444e');
  g.addColorStop(1, '#1d232a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * lw;
  ctx.stroke();
  ctx.restore();
}

const EYE: Pt = { x: 126, y: -8 };
const SMILE: readonly Pt[] = curve({ x: 154, y: 14 }, { x: 137, y: 19 }, { x: 118, y: 9 }, 8);

function face(ctx: CanvasRenderingContext2D, fear: number, lw: number): void {
  // The dusky line from the mouth back to the flipper, soft, then the little smile.
  softLine(ctx, curve({ x: 122, y: 14 }, { x: 108, y: 24 }, { x: 94, y: 29 }, 6), 7, '#39434d', 0.4);
  taper(ctx, SMILE, 2.6, 1.4, INK, 0.95);
  const r = 5.2;
  dab(ctx, EYE.x, EYE.y, 12, '16,20,26', 0.55);
  if (fear > 0.3) {
    ctx.strokeStyle = 'rgba(238,234,222,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(EYE.x, EYE.y, r + 1.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#080a0e';
  ctx.beginPath();
  ctx.arc(EYE.x, EYE.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2 * lw;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.arc(EYE.x + r * 0.35, EYE.y - r * 0.38, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

/** The painted porpoise, placed, turned and mirrored by `p`. */
export function drawPorpoise(ctx: CanvasRenderingContext2D, p: Placed, look: PorpoiseLook, _boil: number): void {
  const k = p.len / UNITS;
  const s = shapeOf(p.beat);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k * CHUNK);
  const lw = 1 / screenScale(ctx);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  flukes(ctx, s, lw);
  fin(ctx, s, lw);
  ctx.save();
  path(ctx, s.body);
  ctx.clip();
  wash(ctx, s);
  light(ctx, s);
  ctx.restore();
  path(ctx, s.body);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6 * lw;
  ctx.stroke();
  face(ctx, look.fear ?? 0, lw);
  flipper(ctx, p.beat, lw);
  ctx.restore();
}

/** A pale ink outline of the porpoise only (for the x-ray window): no washes, no flesh. */
export function porpoiseOutline(ctx: CanvasRenderingContext2D, p: Placed, colour: string, width: number): void {
  const k = p.len / UNITS;
  const s = shapeOf(p.beat);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k * CHUNK);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width / k;
  ctx.lineJoin = 'round';
  for (const line of [s.body, s.fin, s.flukes]) {
    path(ctx, line);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(SMILE[0]!.x, SMILE[0]!.y);
  for (const q of SMILE) ctx.lineTo(q.x, q.y);
  ctx.moveTo(EYE.x + 5, EYE.y);
  ctx.arc(EYE.x, EYE.y, 5, 0, Math.PI * 2);
  ctx.moveTo(98, 34);
  ctx.quadraticCurveTo(96, 54, 82, 66);
  ctx.quadraticCurveTo(78, 48, 80, 36);
  ctx.stroke();
  ctx.restore();
}
