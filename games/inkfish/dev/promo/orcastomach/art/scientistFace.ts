import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { curve, dab, path, smoothLoop, softLine, taper } from '../../seal/art/paint';

/**
 * The naturalist's head: a real face rather than a mask. Lit from the upper
 * left with soft washes, small human eyes with lids, thin wire spectacles, a
 * high forehead and receding hair, a full greying beard laid in hair by hair.
 * Units: the head 100 tall, centred on 0,0.
 */

export type Mood = 'calm' | 'bemused' | 'amazed';

export interface ScientistLook {
  readonly mood: Mood;
  /** Where he looks, -1 (left) .. 1 (right). */
  readonly gaze: number;
  /** Both hands up beside his head: 0 down .. 1 fully raised. */
  readonly hands: number;
  /** Head tilt, radians. */
  readonly tilt: number;
  /** A small blink / squint, 0 .. 1. */
  readonly lid: number;
}

const SKIN = '#e4b995';
export const HAIR = '#4e3f35';
const BEARD = '#6a5a4c';

const SKULL: readonly Pt[] = smoothLoop([
  { x: 0, y: -52 }, { x: 28, y: -47 }, { x: 40, y: -22 }, { x: 40, y: 8 }, { x: 31, y: 34 }, { x: 0, y: 50 }, { x: -31, y: 34 }, { x: -40, y: 8 }, { x: -40, y: -22 }, { x: -28, y: -47 },
], 5);

function ears(ctx: CanvasRenderingContext2D): void {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 41, -4, 6, 13, s * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = s < 0 ? '#e0b08c' : '#b98a68';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function skin(ctx: CanvasRenderingContext2D): void {
  path(ctx, SKULL);
  const g = ctx.createRadialGradient(-12, -20, 4, 0, 0, 62);
  g.addColorStop(0, '#f6d7bb');
  g.addColorStop(0.5, SKIN);
  g.addColorStop(1, '#b4805e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The forehead's light, the shadow side, the sockets, warm cheeks and nose.
  dab(ctx, 30, 6, 30, '120,70,44', 0.4);
  dab(ctx, -16, -36, 22, '255,240,224', 0.5);
  for (const s of [-1, 1]) dab(ctx, s * 17, -11, 13, '130,84,60', 0.36);
  for (const s of [-1, 1]) dab(ctx, s * 24, 12, 13, '214,110,92', 0.3);
  dab(ctx, 0, 11, 9, '214,110,92', 0.3);
  ctx.restore();
  path(ctx, SKULL);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function hairOnHead(ctx: CanvasRenderingContext2D): void {
  // Receding, parted, thick at the sides; the crown stays bare, so the forehead is high.
  const mass = smoothLoop([
    { x: -41, y: -6 }, { x: -44, y: -32 }, { x: -30, y: -54 }, { x: -4, y: -60 }, { x: 24, y: -57 }, { x: 42, y: -38 }, { x: 42, y: -6 },
    { x: 36, y: -24 }, { x: 26, y: -40 }, { x: 4, y: -46 }, { x: -18, y: -40 }, { x: -34, y: -24 },
  ], 5);
  path(ctx, mass);
  const g = ctx.createLinearGradient(-40, -60, 40, -10);
  g.addColorStop(0, '#7a6555');
  g.addColorStop(0.5, HAIR);
  g.addColorStop(1, '#2b2320');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  const rng = createRng(19);
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 40; i++) {
    const x = -42 + rng() * 84;
    taper(ctx, curve({ x, y: -58 + rng() * 6 }, { x: x * 1.1, y: -46 }, { x: x * 1.14 + (x > 0 ? 3 : -3), y: -20 - rng() * 12 }, 6), 1.4, 0.4, rng() < 0.4 ? '#a08e7c' : '#1d1815', 0.6);
  }
  ctx.restore();
}

function eye(ctx: CanvasRenderingContext2D, x: number, look: ScientistLook, wide: number): void {
  const y = -9;
  const [rx, ry] = [9.4, (3.8 + 2 * wide) * (1 - 0.7 * look.lid)];
  const shape: Pt[] = [...curve({ x: x - rx, y }, { x, y: y - ry * 2 }, { x: x + rx, y: y + 0.6 }, 8), ...curve({ x: x + rx, y: y + 0.6 }, { x, y: y + ry * 1.5 }, { x: x - rx, y }, 8)];
  path(ctx, shape);
  ctx.fillStyle = '#f6f0e4';
  ctx.fill();
  ctx.save();
  ctx.clip();
  const ix = x + look.gaze * 3;
  ctx.fillStyle = '#34424c';
  ctx.beginPath();
  ctx.arc(ix, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#08090c';
  ctx.beginPath();
  ctx.arc(ix, y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(ix - 1.5, y - 1.8, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The upper lid's firm line, a fold above it, a faint lower lid.
  taper(ctx, shape.slice(0, 9), 1.9, 0.9, INK, 1);
  softLine(ctx, shape.slice(9).map((p) => ({ x: p.x, y: p.y + 1 })), 1.2, '#7a4f3a', 0.5, 2);
  softLine(ctx, curve({ x: x - rx, y: y - 6 }, { x, y: y - 11 - wide * 2 }, { x: x + rx, y: y - 5 }, 6), 1.3, '#7a4f3a', 0.5, 2);
}

function brows(ctx: CanvasRenderingContext2D, look: ScientistLook, lift: number): void {
  const rng = createRng(3);
  for (const s of [-1, 1] as const) {
    const up = lift + (look.mood === 'bemused' && s > 0 ? 6 : 0);
    const y = -21 - up;
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      const x = s * (7 + u * 21);
      taper(ctx, [{ x, y: y + 2 - 1.5 * Math.sin(u * 3) }, { x: x + s * 1.5, y: y - 1 - 1.5 * Math.sin(u * 3) }, { x: x + s * 4, y: y - 2.2 - rng() - 1.5 * Math.sin(u * 3) }], 1.5, 0.4, i % 3 ? '#2b2320' : '#6a5a4c', 0.95);
    }
  }
}

function nose(ctx: CanvasRenderingContext2D): void {
  softLine(ctx, curve({ x: 5, y: -8 }, { x: 8, y: 6 }, { x: 8, y: 13 }, 6), 5, '#8a5a40', 0.3);
  softLine(ctx, curve({ x: -1, y: -6 }, { x: -2, y: 4 }, { x: -1, y: 11 }, 6), 3, '#ffeedd', 0.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, 13);
  ctx.quadraticCurveTo(-9, 18, -4, 17.5);
  ctx.quadraticCurveTo(0, 21, 4, 17.5);
  ctx.quadraticCurveTo(9, 18, 8.4, 13);
  ctx.stroke();
}

/** The beard: a soft mass, then hair by hair from the cheeks down, grey among the brown. */
function beard(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const mass = smoothLoop([
    { x: -42, y: -6 }, { x: -46, y: 26 }, { x: -36, y: 62 }, { x: -12, y: 84 }, { x: 4, y: 88 }, { x: 22, y: 78 }, { x: 40, y: 58 }, { x: 46, y: 24 }, { x: 42, y: -6 },
    { x: 34, y: 14 }, { x: 20, y: 23 }, { x: 0, y: 19 }, { x: -20, y: 23 }, { x: -34, y: 14 },
  ], 5);
  path(ctx, mass);
  const g = ctx.createLinearGradient(-30, 10, 30, 90);
  g.addColorStop(0, '#8c7c6c');
  g.addColorStop(0.5, BEARD);
  g.addColorStop(1, '#2f2823');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  const rng = createRng(7);
  for (let i = 0; i < 150; i++) {
    const x = -44 + rng() * 88;
    const y = 14 + rng() * 44;
    const [dx, len] = [-x * 0.28 + (rng() - 0.5) * 8, 18 + rng() * 22];
    const tone = rng();
    taper(ctx, curve({ x, y }, { x: x + dx * 0.3, y: y + len * 0.6 }, { x: x + dx, y: y + len }, 5), 1.3, 0.3, tone < 0.3 ? '#b7ab9c' : tone < 0.7 ? '#1f1a17' : '#7d6c5c', 0.6);
  }
  dab(ctx, 26, 56, 30, '16,12,10', 0.4);
  dab(ctx, -18, 36, 18, '220,206,190', 0.2);
  ctx.restore();
  mouth(ctx, mood);
  moustache(ctx);
}

function mouth(ctx: CanvasRenderingContext2D, mood: Mood): void {
  ctx.lineCap = 'round';
  if (mood === 'amazed') {
    ctx.beginPath();
    ctx.ellipse(0, 33, 7, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1214';
    ctx.fill();
    ctx.strokeStyle = '#8c4a42';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    return;
  }
  const smirk = mood === 'bemused' ? 5 : 0;
  const lip = curve({ x: -10, y: 31 }, { x: 0, y: 36 }, { x: 11, y: 31 - smirk }, 8);
  softLine(ctx, lip.map((p) => ({ x: p.x, y: p.y + 2 })), 5, '#b5655c', 0.8, 3);
  taper(ctx, lip, 1.5, 1.5, '#3a1a1a', 1);
}

function moustache(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(13);
  for (const s of [-1, 1] as const) {
    const shape = smoothLoop([{ x: s * 1, y: 19 }, { x: s * 14, y: 17 }, { x: s * 27, y: 28 }, { x: s * 14, y: 29 }, { x: s * 2, y: 27 }], 4);
    path(ctx, shape);
    ctx.fillStyle = s < 0 ? '#7d6c5c' : '#55473c';
    ctx.fill();
    for (let i = 0; i < 20; i++) {
      const x = s * (2 + rng() * 14);
      taper(ctx, [{ x, y: 19 + rng() * 2 }, { x: x + s * 5, y: 23 + rng() * 2 }, { x: x + s * 11, y: 28 + rng() * 2 }], 1, 0.3, rng() < 0.4 ? '#b7ab9c' : '#1f1a17', 0.7);
    }
  }
}

function spectacles(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#3d3526';
  ctx.lineWidth = 1.2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 17, -9, 13.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(214,236,244,0.13)';
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-4, -12);
  ctx.quadraticCurveTo(0, -15, 4, -12);
  ctx.moveTo(-30, -11);
  ctx.lineTo(-40, -13);
  ctx.moveTo(30, -11);
  ctx.lineTo(40, -13);
  ctx.stroke();
  // The glint on the lenses.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 17, -9, 10.5, Math.PI * 1.1, Math.PI * 1.42);
    ctx.stroke();
  }
}

export function drawFace(ctx: CanvasRenderingContext2D, look: ScientistLook): void {
  const amazed = look.mood === 'amazed';
  ctx.save();
  ctx.rotate(look.tilt);
  ears(ctx);
  skin(ctx);
  hairOnHead(ctx);
  beard(ctx, look.mood);
  nose(ctx);
  eye(ctx, -17, look, amazed ? 1 : 0);
  eye(ctx, 17, look, amazed ? 1 : 0);
  brows(ctx, look, amazed ? 5 : 0);
  spectacles(ctx);
  ctx.restore();
}
