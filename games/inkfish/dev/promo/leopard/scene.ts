import { makePaper } from '../backdrop';
import { VIDEO } from '../short';

/** The cold water under the Antarctic ice: pale teal at the top, deep blue-black below. */
export function makeIce(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, 'rgba(140,215,228,0.93)');
  g.addColorStop(0.3, 'rgba(48,140,178,0.92)');
  g.addColorStop(0.7, 'rgba(16,70,116,0.94)');
  g.addColorStop(1, 'rgba(6,26,52,0.97)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

export const RED = '#c8452c';

/** Light shafts slanting down from the gaps in the ice, swaying a whole cycle a loop (`loop` 0 .. 1). */
export function drawRays(ctx: CanvasRenderingContext2D, loop: number, strength = 1): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const sway = 50 * Math.sin(2 * Math.PI * (loop * (1 + (k % 2)) + k * 0.41));
    const x = 20 + k * 200 + sway;
    const g = ctx.createLinearGradient(0, 0, 0, 1500);
    g.addColorStop(0, `rgba(235,250,255,${0.2 * strength})`);
    g.addColorStop(1, 'rgba(235,250,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 40, 0);
    ctx.lineTo(x + 50, 0);
    ctx.lineTo(x + 330, 1500);
    ctx.lineTo(x + 90, 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Bubbles drifting up, a whole number of screens a loop so the loop point matches. */
export function drawBubbles(ctx: CanvasRenderingContext2D, loop: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(235,250,255,0.55)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 16; i++) {
    const speed = 1 + (i % 2);
    const y = (((i * 313) % 1920) - 1920 * loop * speed + 1920 * 4) % 1920;
    const x = (i * 197 + 60) % 1080 + 14 * Math.sin(2 * Math.PI * (loop * 3 + i * 0.37));
    const r = 5 + (i % 5) * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(235,250,255,0.14)';
    ctx.fill();
  }
  ctx.restore();
}

/** The underside of the pack ice: a lumpy white-teal ceiling with cracks, painted once. */
export function makeCeiling(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = 420;
  const ctx = canvas.getContext('2d')!;
  const edge = (x: number): number => 250 + 55 * Math.sin(x / 90) + 30 * Math.sin(x / 37 + 1) + 18 * Math.sin(x / 15 + 2);
  const g = ctx.createLinearGradient(0, 0, 0, 330);
  g.addColorStop(0, '#f4fdff');
  g.addColorStop(0.55, '#bfeaf0');
  g.addColorStop(1, '#6fbccb');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= VIDEO.width; x += 6) ctx.lineTo(x, edge(x));
  ctx.lineTo(VIDEO.width, 0);
  ctx.closePath();
  ctx.fill();
  // Shadowed hollows and bright lumps, cracks.
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 14; i++) {
    const x = (i * 83 + 20) % VIDEO.width;
    const r = 40 + (i % 4) * 22;
    const rg = ctx.createRadialGradient(x, edge(x) - 40, 4, x, edge(x) - 40, r);
    rg.addColorStop(0, i % 2 ? '#2e7f94' : '#ffffff');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, edge(x) - 40 - r, 2 * r, 2 * r);
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#2a6f86';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    let x = 70 + i * 150;
    let y = 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < edge(x) - 20) {
      x += ((i * 31 + y) % 23) - 11;
      y += 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#1b1a1f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = 0; x <= VIDEO.width; x += 6) (x ? ctx.lineTo(x, edge(x)) : ctx.moveTo(x, edge(x)));
  ctx.stroke();
  return canvas;
}

export interface Grade {
  /** Desaturation, 0 .. 1. */
  readonly sat: number;
  /** A multiplied tint and how much of it. */
  readonly tint: string;
  readonly tintA: number;
  /** Dark vignette, 0 .. 1. */
  readonly dark: number;
  /** A screen-blended glow (bright moods). */
  readonly glow?: string;
  readonly glowA?: number;
}

/** The mood of a beat over its picture (every scene paints a full opaque frame, so source-atop is the whole frame). */
export function grade(ctx: CanvasRenderingContext2D, g: Grade): void {
  const wash = (mode: GlobalCompositeOperation, colour: string, a: number): void => {
    if (a <= 0.005) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = a;
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.restore();
  };
  wash('saturation', '#808080', g.sat);
  wash('multiply', g.tint, g.tintA);
  wash('screen', g.glow ?? '#000', g.glowA ?? 0);
  if (g.dark > 0.01) {
    const v = ctx.createRadialGradient(VIDEO.width / 2, 820, 280, VIDEO.width / 2, 860, 1250);
    v.addColorStop(0, 'rgba(2,10,20,0)');
    v.addColorStop(1, `rgba(2,10,20,${(0.62 * g.dark).toFixed(3)})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
}
