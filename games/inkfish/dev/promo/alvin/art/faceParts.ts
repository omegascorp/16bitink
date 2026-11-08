import { blob, ink, lin, type Pt } from './draw';

/** One feature at a time of the crew's faces, in head units (the head's half-width is 1; the eyes sit near y = 0). */

export const SKIN_INK = '#2c1a12';
export const LW = 0.032;

export interface Mood {
  readonly shock: number;
  readonly joy: number;
  readonly gaze: number;
  readonly blink: number;
}

/** An almond eye: lids, a shaded white, an iris with a dark ring, a pupil and a catchlight; never a flat circle. */
export function eye(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, m: Mood, iris: string): void {
  const open = Math.max(0.05, (0.66 + 0.34 * m.shock - 0.34 * m.joy) * (1 - m.blink));
  const h = w * open;
  const upper: Pt[] = [{ x: x - w, y: y + h * 0.16 }, { x: x - w * 0.42, y: y - h * 0.96 }, { x: x + w * 0.34, y: y - h * 1.02 }, { x: x + w, y: y + h * 0.04 }];
  const lower: Pt[] = [{ x: x + w, y: y + h * 0.04 }, { x: x + w * 0.3, y: y + h * 0.6 }, { x: x - w * 0.4, y: y + h * 0.62 }, { x: x - w, y: y + h * 0.16 }];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(upper[0]!.x, upper[0]!.y);
  ctx.bezierCurveTo(upper[1]!.x, upper[1]!.y, upper[2]!.x, upper[2]!.y, upper[3]!.x, upper[3]!.y);
  ctx.bezierCurveTo(lower[1]!.x, lower[1]!.y, lower[2]!.x, lower[2]!.y, lower[3]!.x, lower[3]!.y);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, y - h, 0, y + h, [[0, '#b9a596'], [0.5, '#f1e7da'], [1, '#e2d3c4']]);
  ctx.fill();
  ctx.clip();
  const gx = x + m.gaze * w * 0.34;
  const r = w * 0.5;
  const g = ctx.createRadialGradient(gx, y + r * 0.2, r * 0.1, gx, y, r);
  g.addColorStop(0, iris);
  g.addColorStop(0.72, iris);
  g.addColorStop(1, '#14100e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(gx, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#080506';
  ctx.beginPath();
  ctx.arc(gx, y, r * (0.48 - 0.16 * m.shock), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(40,24,16,0.4)';
  ctx.fillRect(x - w, y - h * 1.2, w * 2, h * 0.5);
  ctx.fillStyle = '#fffdf6';
  ctx.beginPath();
  ctx.arc(gx - r * 0.34, y - r * 0.32, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The upper lid is the strong line, the crease above it thin, the lower lid barely there.
  ctx.beginPath();
  ctx.moveTo(upper[0]!.x, upper[0]!.y);
  ctx.bezierCurveTo(upper[1]!.x, upper[1]!.y, upper[2]!.x, upper[2]!.y, upper[3]!.x, upper[3]!.y);
  ctx.strokeStyle = SKIN_INK;
  ctx.lineWidth = LW * 1.5;
  ctx.lineCap = 'round';
  ctx.stroke();
  ink(ctx, [{ x: x - w * 0.8, y: y - h * 0.9 - 0.05 }, { x, y: y - h * 1.1 - 0.07 }, { x: x + w * 0.85, y: y - h * 0.7 - 0.05 }], LW * 0.6, SKIN_INK, 0.55);
  ink(ctx, [{ x: x - w * 0.8, y: y + h * 0.5 }, { x, y: y + h * 0.7 }, { x: x + w * 0.8, y: y + h * 0.4 }], LW * 0.5, SKIN_INK, 0.4);
  if (m.joy > 0.4) ink(ctx, [{ x: x + Math.sign(x || 1) * w * 1.1, y }, { x: x + Math.sign(x || 1) * w * 1.42, y: y - 0.05 }], LW * 0.6, SKIN_INK, 0.4 * m.joy);
}

/** Pen shading: a run of thin parallel strokes across a patch. */
export function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, step: Pt, stroke: Pt, alpha: number): void {
  for (let i = 0; i < count; i++) {
    const [ax, ay] = [x + step.x * i, y + step.y * i];
    const fade = 0.75 + 0.25 * Math.sin(i * 2.3);
    ink(ctx, [{ x: ax, y: ay }, { x: ax + stroke.x * fade, y: ay + stroke.y * fade }], LW * 0.4, SKIN_INK, alpha);
  }
}

/** A brow as a tapering mass of short hairs. */
export function brow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, lift: number, side: number, colour: string): void {
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const px = x - side * w + side * 2 * w * u;
    const py = y - 0.08 * Math.sin(u * 2.7) - lift * (1 - u * 0.3);
    const t = 0.05 * (1 - Math.abs(u - 0.35));
    ink(ctx, [{ x: px, y: py + t }, { x: px + side * 0.05, y: py - t }], LW * 0.95, colour, 0.92);
  }
}

export function nose(ctx: CanvasRenderingContext2D, x: number, turn: number): void {
  const side = turn >= 0 ? 1 : -1;
  blob(ctx, x - side * 0.14, 0.26, 0.15, 0.36, 0, '150,84,52', 0.34);
  blob(ctx, x + side * 0.02, 0.28, 0.08, 0.26, 0, '255,232,206', 0.42);
  ink(ctx, [{ x: x - side * 0.11, y: -0.04 }, { x: x - side * 0.1, y: 0.28 }, { x: x - side * 0.2, y: 0.47 }, { x: x - side * 0.1, y: 0.55 }], LW * 0.8, SKIN_INK, 0.65);
  ink(ctx, [{ x: x - 0.1, y: 0.56 }, { x: x + 0.02, y: 0.6 }, { x: x + 0.13, y: 0.54 }], LW * 0.8, SKIN_INK, 0.6);
  ink(ctx, [{ x: x + 0.19, y: 0.42 }, { x: x + 0.22, y: 0.5 }, { x: x + 0.14, y: 0.55 }], LW * 0.7, SKIN_INK, 0.55);
}

function shape(ctx: CanvasRenderingContext2D, top: readonly Pt[], low: readonly Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(top[0]!.x, top[0]!.y);
  ctx.quadraticCurveTo(top[1]!.x, top[1]!.y, top[2]!.x, top[2]!.y);
  ctx.quadraticCurveTo(low[1]!.x, low[1]!.y, low[2]!.x, low[2]!.y);
  ctx.closePath();
}

/** The mouth: shut and easy, a wide grin with teeth (and the folds it makes), or dropped open in a gasp. */
export function mouth(ctx: CanvasRenderingContext2D, x: number, y: number, m: Mood, lip: string): void {
  if (m.shock > 0.35) {
    const [w, h] = [0.2 + 0.1 * m.shock, 0.1 + 0.26 * m.shock];
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.7, w, h, 0, 0, Math.PI * 2);
    ctx.fillStyle = lin(ctx, 0, y, 0, y + h * 1.8, [[0, '#24100e'], [1, '#5e2622']]);
    ctx.fill();
    ctx.strokeStyle = lip;
    ctx.lineWidth = LW * 1.7;
    ctx.stroke();
    ink(ctx, [{ x: x - w * 0.8, y: y + h * 0.1 }, { x, y: y - h * 0.26 }, { x: x + w * 0.8, y: y + h * 0.1 }], LW * 0.7, SKIN_INK, 0.7);
    ctx.fillStyle = '#efe6d8';
    ctx.fillRect(x - w * 0.55, y + h * 0.02 - 0.015, w * 1.1, h * 0.2);
    return;
  }
  if (m.joy > 0.3) {
    const [w, drop] = [0.42, 0.1 + 0.15 * m.joy];
    const top = [{ x: x - w, y: y - 0.1 }, { x, y: y - 0.02 }, { x: x + w, y: y - 0.1 }];
    const low = [{ x: x + w, y: y - 0.1 }, { x, y: y + drop * 2 }, { x: x - w, y: y - 0.1 }];
    shape(ctx, top, low);
    ctx.fillStyle = '#3e1712';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = lin(ctx, 0, y - 0.1, 0, y + 0.14, [[0, '#d8ccb4'], [1, '#efe6d2']]);
    ctx.fillRect(x - w, y - 0.1, w * 2, 0.11 + drop * 0.3);
    for (let i = -4; i <= 4; i++) ink(ctx, [{ x: x + i * 0.082, y: y - 0.06 }, { x: x + i * 0.086, y: y + 0.09 }], LW * 0.28, '#8d7460', 0.75);
    ctx.restore();
    ink(ctx, [top[0]!, top[1]!, top[2]!], LW * 1.3, lip);
    ink(ctx, [low[2]!, { x: x - w * 0.5, y: y + drop * 0.92 }, { x: x + w * 0.5, y: y + drop * 0.92 }, low[0]!], LW * 1.4, lip);
    for (const s of [-1, 1]) ink(ctx, [{ x: x + s * 0.28, y: 0.44 }, { x: x + s * 0.5, y: y - 0.12 }, { x: x + s * 0.54, y: y + 0.1 }], LW * 0.9, SKIN_INK, 0.62);
    return;
  }
  ink(ctx, [{ x: x - 0.32, y: y + 0.01 }, { x: x - 0.1, y: y + 0.02 }, { x, y: y + 0.04 }, { x: x + 0.1, y: y + 0.02 }, { x: x + 0.32, y }], LW * 1.05, SKIN_INK, 0.85);
  ctx.beginPath();
  ctx.moveTo(x - 0.27, y + 0.02);
  ctx.quadraticCurveTo(x, y + 0.2, x + 0.27, y + 0.02);
  ctx.quadraticCurveTo(x, y + 0.06, x - 0.27, y + 0.02);
  ctx.fillStyle = lip;
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 1;
  ink(ctx, [{ x: x - 0.12, y: y + 0.24 }, { x, y: y + 0.27 }, { x: x + 0.12, y: y + 0.24 }], LW * 0.6, SKIN_INK, 0.4);
}

/** A simple work shirt: open collar, a placket, one breast pocket, a fold or two. */
export function shirt(ctx: CanvasRenderingContext2D, light: string, dark: string, neck: string): void {
  ctx.beginPath();
  ctx.moveTo(-0.62, 1.45);
  ctx.bezierCurveTo(-1.1, 1.78, -2, 1.9, -2.5, 2.5);
  ctx.lineTo(-2.9, 6);
  ctx.lineTo(2.9, 6);
  ctx.lineTo(2.5, 2.5);
  ctx.bezierCurveTo(2, 1.9, 1.1, 1.78, 0.62, 1.45);
  ctx.fillStyle = lin(ctx, -2.4, 1.4, 2.4, 5, [[0, light], [0.6, dark], [1, dark]]);
  ctx.fill();
  ctx.strokeStyle = SKIN_INK;
  ctx.lineWidth = LW * 0.9;
  ctx.stroke();
  blob(ctx, -0.1, 3, 2.2, 1, 0, '20,20,30', 0.2);
  // The open neck.
  ctx.beginPath();
  ctx.moveTo(-0.52, 1.5);
  ctx.lineTo(0, 2.36);
  ctx.lineTo(0.52, 1.5);
  ctx.closePath();
  ctx.fillStyle = neck;
  ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 0.62, 1.38);
    ctx.lineTo(s * 1.18, 1.82);
    ctx.lineTo(s * 0.5, 2.34);
    ctx.lineTo(s * 0.02, 2.36);
    ctx.closePath();
    ctx.fillStyle = light;
    ctx.fill();
    ctx.strokeStyle = SKIN_INK;
    ctx.lineWidth = LW * 0.8;
    ctx.stroke();
  }
  ink(ctx, [{ x: 0, y: 2.36 }, { x: 0.02, y: 6 }], LW, SKIN_INK, 0.6);
  for (const y of [3, 3.8, 4.6]) {
    ctx.fillStyle = '#e8dfca';
    ctx.beginPath();
    ctx.arc(0.04, y, 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = SKIN_INK;
  ctx.lineWidth = LW * 0.8;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.roundRect(0.6, 3.1, 0.9, 0.95, 0.06);
  ctx.moveTo(0.6, 3.34);
  ctx.lineTo(1.5, 3.34);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ink(ctx, [{ x: -1.9, y: 3 }, { x: -1.5, y: 3.9 }, { x: -1.6, y: 4.8 }], LW * 0.7, SKIN_INK, 0.35);
  ink(ctx, [{ x: 1.96, y: 2.9 }, { x: 2.1, y: 3.8 }], LW * 0.7, SKIN_INK, 0.35);
}
