import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { drawOrca } from '../foodchain/art/orca';
import { ramp, VIDEO } from '../short';
import { drawBlueWhale } from './blueWhale';
import { TEXT } from './script';
import { drawRays, drawSnow, drawVignette, drawWater, glow } from './sea';
import { AND_AT, browAt, cycles, huhAt, SO_AT, TONGUE2_AT, wrap } from './story';

/**
 * "and they want the TONGUE.": the orca's smug face in close-up, chin up, a
 * napkin tucked under it, one eyebrow climbing; behind it the blue whale, and
 * a "?!" over it (sarcastic, comic).
 */

/** The orca: its middle, length and tilt; local px are the orca art's (snout at x 0, 1000 long). */
const ORCA = { x: -430, y: 990, len: 2400, angle: -0.12 } as const;
const OFFSET = 500;
const EYE: Pt = { x: -122, y: 14 };

/** Smug: the chin lifts on "want", a little punch in on "TONGUE". */
const offScreen = (t: number): number => 1 - ramp(wrap(t), SO_AT + 0.05, SO_AT + 0.25);
export const liftAt = (t: number): number => ramp(wrap(t), AND_AT, AND_AT + 0.5) * offScreen(t);
export const smugZoomAt = (t: number): number => 1 + 0.07 * ramp(wrap(t), TONGUE2_AT - 0.05, TONGUE2_AT + 0.15) * offScreen(t);

/** A point on the orca (local px) on screen. */
export function onSmugOrca(p: Pt, t: number): Pt {
  const s = ORCA.len / 1000;
  const a = ORCA.angle - 0.05 * liftAt(t);
  const lx = (p.x + OFFSET) * s;
  const ly = p.y * s;
  return { x: ORCA.x + lx * Math.cos(a) - ly * Math.sin(a), y: ORCA.y + lx * Math.sin(a) + ly * Math.cos(a) };
}

/** The napkin, tucked in under the chin (local px): a white cloth hanging in a point, its two tied corners sticking up. */
function drawNapkin(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = 6 * Math.sin(cycles(6, t));
  const cloth: Pt[] = [
    { x: -84, y: 76 }, { x: -120, y: 88 }, { x: -170, y: 98 }, { x: -220, y: 106 }, { x: -262, y: 110 },
    { x: -228 + sway, y: 160 }, { x: -192 + sway, y: 212 }, { x: -150 + sway * 0.5, y: 162 }, { x: -112, y: 118 },
  ];
  const pts = cloth.map((p) => onSmugOrca(p, t));
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Folds: soft grey hatching.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(80,90,110,0.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = onSmugOrca({ x: -110 - i * 26, y: 92 + i * 3 }, t);
    const b = onSmugOrca({ x: -178 - i * 6 + sway, y: 190 }, t);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.stroke();
  // The knot's two ears.
  for (const ear of [[{ x: -258, y: 108 }, { x: -300, y: 76 }, { x: -290, y: 112 }], [{ x: -258, y: 108 }, { x: -306, y: 128 }, { x: -272, y: 134 }]]) {
    const e = ear.map((p) => onSmugOrca(p, t));
    ctx.beginPath();
    e.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** The smug eye: a heavy lid half down, and the eyebrow arching up on "want". */
function drawFace(ctx: CanvasRenderingContext2D, t: number): void {
  const s = ORCA.len / 1000;
  const eye = onSmugOrca(EYE, t);
  const r = 7.5 * s;
  ctx.save();
  // The lid: the black of the head over the eye's top half.
  ctx.fillStyle = '#121a2a';
  ctx.beginPath();
  ctx.ellipse(eye.x, eye.y - r * 0.15, r * 1.35, r * 0.75, ORCA.angle, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(eye.x, eye.y - r * 0.1, r * 1.3, r * 0.6, ORCA.angle, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // The eyebrow: a thick pale stroke (on black skin) that climbs and tilts.
  const b = browAt(t);
  const from = { x: eye.x - 46, y: eye.y - 34 - 10 * b };
  const to = { x: eye.x + 44, y: eye.y - 44 - 38 * b };
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 18 - 14 * b };
  for (const [colour, width] of [[INK, 16], [PAPER, 9]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mid.x, mid.y, to.x, to.y);
    ctx.stroke();
  }
  ctx.restore();
  // A glint off the teeth on "TONGUE".
  const g = Math.max(0, 1 - Math.abs(wrap(t) - TONGUE2_AT - 0.15) / 0.3);
  if (g > 0) {
    const tooth = onSmugOrca({ x: -40, y: 30 }, t);
    glow(ctx, tooth.x, tooth.y, 90, '255,250,230', 0.8 * g);
    ctx.save();
    ctx.strokeStyle = `rgba(255,252,240,${g.toFixed(3)})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.4;
      const l = 40 * g;
      ctx.beginPath();
      ctx.moveTo(tooth.x + Math.cos(a) * 8, tooth.y + Math.sin(a) * 8);
      ctx.lineTo(tooth.x + Math.cos(a) * (8 + l), tooth.y + Math.sin(a) * (8 + l));
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** The "?!" over the whale, popping up and wobbling. */
function drawHuh(ctx: CanvasRenderingContext2D, t: number): void {
  const h = huhAt(t);
  if (h <= 0) return;
  const s = wrap(t) - TONGUE2_AT + 0.05;
  const pop = 1 + (TEXT.huhPop - 1) * Math.max(0, 1 - s / 0.3) * ramp(s, 0, 0.08);
  ctx.save();
  ctx.translate(TEXT.huh.x, TEXT.huh.y);
  ctx.rotate(-0.12 + 0.06 * Math.sin(cycles(26, t)));
  drawTextLine(ctx, '?!', 0, 0, TEXT.huh.size * pop * ramp(s, -0.05, 0.1), 700, h, { fill: '#f5c84a', halo: '#141018' });
  ctx.restore();
}

export function drawSmug(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  drawWater(ctx, sheet, [74, 140, 168], [26, 78, 112], [8, 26, 44]);
  drawRays(ctx, t, 1.1, -150, '250,236,210', 1800);
  drawSnow(ctx, t, '#f2f0e6', 0.6);
  // The whale behind, faded by the water, mouth a little open.
  ctx.save();
  ctx.globalAlpha = 0.7;
  drawBlueWhale(ctx, 690, 470, 1150, Math.PI - 0.06, t, { tail: cycles(7, t), gape: 0.12 + 0.1 * huhAt(t) }, true);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = 'rgba(40,100,140,0.25)';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  const z = smugZoomAt(t);
  ctx.save();
  ctx.translate(700, 900);
  ctx.scale(z, z);
  ctx.translate(-700, -900);
  drawOrca(ctx, ORCA.x, ORCA.y, ORCA.len, ORCA.angle - 0.05 * liftAt(t), t, { jaw: 0.1 + 0.05 * Math.sin(cycles(13, t)), tail: cycles(13, t) });
  drawNapkin(ctx, t);
  drawFace(ctx, t);
  ctx.restore();
  drawHuh(ctx, t);
  drawVignette(ctx, 0.45, '10,20,30');
}
