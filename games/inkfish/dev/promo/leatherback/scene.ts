import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { mix, rgb } from './paint';
import { cycles, type Grade, LOOP_S } from './story';

/**
 * The water round the turtle: the game's paper under a wash of sea, light
 * rays slanting down from the surface and specks of marine snow; the colour
 * of each beat's mood over the whole picture; the vignette.
 */

export const INK_BG = '#060d14';
export const CHALK = '#eef0e8';

export interface Backdrop {
  readonly paper: HTMLCanvasElement;
}

export function makeBackdrop(): Backdrop {
  return { paper: makePaper() };
}

/** The sea's colour top to bottom, by mood: near black (the hook), open blue (the size), turquoise (the feast), sunlit (the soft beat). */
const SEAS = {
  dark: ['#0f2230', '#071019', '#020509'],
  blue: ['#3f7894', '#1d4660', '#0b2133'],
  teal: ['#4a9aa0', '#21606e', '#0b2a36'],
  sun: ['#c9c48e', '#4d8a8e', '#173f4c'],
} as const;

export interface SeaMix {
  readonly blue: number;
  readonly teal: number;
  readonly sun: number;
}

function seaColour(i: number, m: SeaMix): string {
  const lerp3 = (a: readonly number[], b: readonly number[], u: number): number[] => a.map((v, k) => v + (b[k]! - v) * Math.max(0, Math.min(1, u)));
  let c = lerp3(rgb(SEAS.dark[i]!), rgb(SEAS.blue[i]!), m.blue);
  c = lerp3(c, rgb(SEAS.teal[i]!), m.teal);
  c = lerp3(c, rgb(SEAS.sun[i]!), m.sun);
  return `rgb(${c.map(Math.round).join(',')})`;
}

/** The sea behind everything: paper, the wash, the light rays. `drift` scrolls the rays and snow (px) as the camera follows the turtle. */
export function drawSea(ctx: CanvasRenderingContext2D, b: Backdrop, m: SeaMix, t: number, drift: number): void {
  ctx.drawImage(b.paper, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, seaColour(0, m));
  g.addColorStop(0.55, seaColour(1, m));
  g.addColorStop(1, seaColour(2, m));
  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  drawRays(ctx, 0.5 + 0.9 * Math.max(m.blue, m.teal) + 1.6 * m.sun, t, drift, m.sun);
}

/** Pale shafts of light slanting down from the surface, swaying. */
function drawRays(ctx: CanvasRenderingContext2D, strength: number, t: number, drift: number, warm: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const colour = mix('#b8d8dc', '#ffe2a0', warm);
  for (let i = 0; i < 7; i++) {
    const x = ((i * 260 - drift * 0.15) % 1820 + 1820) % 1820 - 380 + 40 * Math.sin(cycles(1, t) + i * 1.7);
    const w = 70 + 60 * ((i * 37) % 3);
    const a = (0.05 + 0.03 * Math.sin(cycles(2, t) + i)) * strength;
    const g = ctx.createLinearGradient(0, 0, 0, 1700);
    g.addColorStop(0, mix(colour, colour, 0, Math.min(0.5, a)));
    g.addColorStop(1, mix(colour, colour, 0, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, -20);
    ctx.lineTo(x + w, -20);
    ctx.lineTo(x + w + 520, 1700);
    ctx.lineTo(x + 360, 1700);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Marine snow: specks drifting, scrolled by the camera's drift (px); they wrap round the frame. */
const SNOW = (() => {
  const rng = createRng(8121);
  return Array.from({ length: 90 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 1 + rng() * 2.6, depth: 0.3 + rng() * 0.7, sway: rng() * 6.28 }));
})();

export function drawSnow(ctx: CanvasRenderingContext2D, t: number, drift: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.fillStyle = CHALK;
  const w = VIDEO.width + 40;
  for (const s of SNOW) {
    const x = (((s.x - drift * s.depth + 18 * Math.sin(cycles(2, t) + s.sway)) % w) + w) % w - 20;
    const y = (((s.y - (t / LOOP_S) * VIDEO.height * 2 * s.depth * 0) + 8 * Math.cos(cycles(3, t) + s.sway)) % VIDEO.height + VIDEO.height) % VIDEO.height;
    ctx.globalAlpha = alpha * (0.25 + 0.45 * s.depth);
    ctx.beginPath();
    ctx.arc(x, y, s.r * s.depth, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Paints a flat colour over the frame with a blend mode. */
function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** The mood over the whole picture. */
export function drawGrade(ctx: CanvasRenderingContext2D, g: Grade): void {
  wash(ctx, 'saturation', '#808080', 0.3 * g.cold);
  wash(ctx, 'multiply', '#8ea2bc', 0.25 * g.cold);
  wash(ctx, 'soft-light', '#ff4a3a', 0.3 * g.hot);
  wash(ctx, 'soft-light', '#ffb0c8', 0.3 * g.rosy);
  wash(ctx, 'soft-light', '#9fe0ff', 0.25 * g.clear);
  wash(ctx, 'soft-light', '#40ffe0', 0.22 * g.vivid);
  wash(ctx, 'saturation', '#00ffd0', 0.08 * g.vivid);
  wash(ctx, 'soft-light', '#ffc76a', 0.45 * g.sun);
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength: number): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 760, 380, VIDEO.width / 2, 820, 1250);
  g.addColorStop(0, 'rgba(1,4,8,0)');
  g.addColorStop(1, `rgba(1,4,8,${strength.toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** A flat fill over everything (a flash). */
export function drawFill(ctx: CanvasRenderingContext2D, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}
