import { halo } from '../../../src/art/glowArt';
import { PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import type { Pt } from './fish';
import { beamAxes, LAMP, LENS_HW, LOOP_S, SPREAD } from './story';

/** The deep around the fish: the water, marine snow, the lamp and its beam, rays of light, and the inked marks. */

export const CHALK = '#d6dbe8';
export const NIGHT = '#05091a';
/** The lamp's light, and the bristlemouths' blue. */
export const LAMP_LIGHT = '#ffd760';
export const BLUE_LIGHT = '#8fc4ff';

/** Near-black water, a touch lighter towards the top. */
export function makeWater(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#0b1430');
  g.addColorStop(0.55, '#060b1c');
  g.addColorStop(1, '#03050d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/** Marine snow, sinking one screen height a loop and swaying a whole number of times. */
const SNOW = (() => {
  const rng = createRng(4242);
  return Array.from({ length: 170 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 1 + rng() * 2.2, phase: rng() * Math.PI * 2, sways: 1 + Math.floor(rng() * 2) }));
})();

export function drawSnow(ctx: CanvasRenderingContext2D, t: number, colour: string, alpha: number): void {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = alpha;
  for (const m of SNOW) {
    const loop = (2 * Math.PI * t * m.sways) / LOOP_S + m.phase;
    const x = m.x + 14 * Math.sin(loop);
    const y = (m.y + (VIDEO.height * t) / LOOP_S) % VIDEO.height;
    ctx.beginPath();
    ctx.arc(x, y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The beam as a shape: from the lens out past the edge of the picture. */
function beamPath(ctx: CanvasRenderingContext2D, angle: number, reach: number): void {
  const { dir, side } = beamAxes(angle);
  const far = LENS_HW + reach * SPREAD;
  ctx.beginPath();
  ctx.moveTo(LAMP.x + side.x * LENS_HW, LAMP.y + side.y * LENS_HW);
  ctx.lineTo(LAMP.x + dir.x * reach + side.x * far, LAMP.y + dir.y * reach + side.y * far);
  ctx.lineTo(LAMP.x + dir.x * reach - side.x * far, LAMP.y + dir.y * reach - side.y * far);
  ctx.lineTo(LAMP.x - side.x * LENS_HW, LAMP.y - side.y * LENS_HW);
  ctx.closePath();
}

const REACH = 1700;

/** Fills the beam, soft-edged, with `colour` fading out along it: as haze in the water, or as light in a mask. */
export function fillBeam(ctx: CanvasRenderingContext2D, angle: number, on: number, rgb: string, near: number, far: number): void {
  if (on <= 0) return;
  const { dir } = beamAxes(angle);
  const g = ctx.createLinearGradient(LAMP.x, LAMP.y, LAMP.x + dir.x * REACH, LAMP.y + dir.y * REACH);
  g.addColorStop(0, `rgba(${rgb},${(near * on).toFixed(3)})`);
  g.addColorStop(0.75, `rgba(${rgb},${(far * on).toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},${(far * 0.6 * on).toFixed(3)})`);
  ctx.save();
  ctx.filter = 'blur(26px)';
  beamPath(ctx, angle, REACH);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** A pool of light round a glowing fish, for the light mask. */
export function fillPool(ctx: CanvasRenderingContext2D, at: Pt, reach: number, strength: number): void {
  if (strength <= 0) return;
  const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, reach);
  g.addColorStop(0, `rgba(255,255,255,${strength.toFixed(3)})`);
  g.addColorStop(0.55, `rgba(255,255,255,${(0.85 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(at.x - reach, at.y - reach, reach * 2, reach * 2);
}

/** The submersible's lamp, poking in from the left edge: a housing, a bracket, and the lens, glowing when it's on. */
export function drawLamp(ctx: CanvasRenderingContext2D, angle: number, on: number): void {
  ctx.save();
  // The bracket, off to the submersible beyond the edge.
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.fillStyle = '#141a2c';
  ctx.beginPath();
  ctx.moveTo(-40, LAMP.y + 150);
  ctx.lineTo(LAMP.x - 50, LAMP.y + 30);
  ctx.lineTo(LAMP.x - 30, LAMP.y + 30);
  ctx.lineTo(-10, LAMP.y + 165);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.translate(LAMP.x, LAMP.y);
  ctx.rotate(angle);
  // The housing: a squat drum, flaring to the lens.
  ctx.beginPath();
  ctx.moveTo(-170, -LENS_HW + 10);
  ctx.lineTo(-20, -LENS_HW - 6);
  ctx.lineTo(0, -LENS_HW - 14);
  ctx.lineTo(0, LENS_HW + 14);
  ctx.lineTo(-20, LENS_HW + 6);
  ctx.lineTo(-170, LENS_HW - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 3;
  for (const x of [-120, -80]) {
    ctx.beginPath();
    ctx.moveTo(x, -LENS_HW + 2);
    ctx.lineTo(x, LENS_HW - 2);
    ctx.stroke();
  }
  // The lens, seen at a slant.
  ctx.beginPath();
  ctx.ellipse(2, 0, 16, LENS_HW + 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = on > 0 ? `rgba(255,244,204,${(0.25 + 0.75 * on).toFixed(3)})` : '#2a3048';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  if (on > 0) {
    const { dir } = beamAxes(angle);
    halo(ctx, LAMP.x + dir.x * 20, LAMP.y + dir.y * 20, 260, '#fff1c0', 0.55 * on);
  }
}

/** One ray of light: a short stroke with an arrowhead, outlined dark so it reads on the haze. */
export function drawRay(ctx: CanvasRenderingContext2D, tail: Pt, tip: Pt, colour: string, alpha: number, head = true): void {
  const dx = tip.x - tail.x;
  const dy = tip.y - tail.y;
  const len = Math.hypot(dx, dy);
  if (len < 2 || alpha <= 0) return;
  const ux = dx / len;
  const uy = dy / len;
  const h = 22;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tip.x, tip.y);
    if (head && len > h) {
      ctx.moveTo(tip.x - ux * h - uy * h * 0.6, tip.y - uy * h + ux * h * 0.6);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(tip.x - ux * h + uy * h * 0.6, tip.y - uy * h - ux * h * 0.6);
    }
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = 12;
  ctx.stroke();
  path();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

/** A ray swallowed: pale ticks closing in on the spot and gone, `u` 0 .. 1. */
export function drawSwallow(ctx: CanvasRenderingContext2D, at: Pt, colour: string, u: number): void {
  if (u < 0 || u > 1) return;
  const r = 34 * (1 - u) + 4;
  ctx.save();
  ctx.globalAlpha = 1 - u;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r);
    ctx.lineTo(at.x + Math.cos(a) * (r + 14 * (1 - u)), at.y + Math.sin(a) * (r + 14 * (1 - u)));
    ctx.stroke();
  }
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 7 * (1 - u), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A hand-inked "!" in paper on the dark, centred at (x, y), `h` tall. */
export function drawExclaim(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, rotation: number): void {
  if (h <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(-h * 0.11, -h * 0.5);
  ctx.quadraticCurveTo(0, -h * 0.62, h * 0.11, -h * 0.5);
  ctx.lineTo(h * 0.025, h * 0.18);
  ctx.lineTo(-h * 0.025, h * 0.18);
  ctx.closePath();
  ctx.moveTo(h * 0.075, h * 0.38);
  ctx.arc(0, h * 0.38, h * 0.075, 0, Math.PI * 2);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = h * 0.08;
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.restore();
}

/** The snap of jaws in the dark: chalk strokes bursting forwards from the mouth, `u` 0 .. 1. */
export function drawSnap(ctx: CanvasRenderingContext2D, at: Pt, facing: number, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  const grow = 1 - (1 - u) ** 3;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.globalAlpha = u < 0.5 ? 1 : (1 - u) / 0.5;
  for (let k = 0; k < 7; k++) {
    const a = (k / 6 - 0.5) * Math.PI * 1.1;
    const r0 = size * (0.35 + 0.45 * grow);
    const r1 = size * (0.6 + 0.8 * grow) * (k % 2 ? 0.75 : 1);
    const cx = Math.cos(a) * facing;
    const cy = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(at.x + cx * r0, at.y + cy * r0);
    ctx.lineTo(at.x + cx * r1, at.y + cy * r1);
    ctx.stroke();
  }
  ctx.restore();
}

/** A label in chalk handwriting, with a leader line to what it names. */
export function drawCallout(
  ctx: CanvasRenderingContext2D, draw: (text: string, x: number, y: number, size: number, alpha: number) => void,
  text: string, at: Pt, to: Pt | null, alpha: number, size = 64,
): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = CHALK;
      ctx.fillStyle = CHALK;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
      ctx.lineTo(to.x - (dx / len) * 12, to.y - (dy / len) * 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  draw(text, at.x, at.y, size, alpha);
}
