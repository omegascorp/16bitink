import { createRng } from '../logic/rng';
import { BOAR_FRAME } from './boar';
import { ART_RES, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The Desert Tomb's things, as placeholders in the pen-and-ink style (the
 * painterly pass comes later): the sun-disc pressure plate, the stone door,
 * a fire bowl lit or doused, the rubble of a broken wall, and the rain frog,
 * flat or puffed up round. Each is drawn at ART_RES, centred like the
 * chapter 2 pictures.
 */

export const SAND = '#e3c991';
export const SAND_DARK = '#b8955a';
export const SAND_LIGHT = '#f4e4b8';
export const TOMB_GREEN = '#7fbf5a';
const BRONZE = '#a86f35';
const BRONZE_DARK = '#5a3a1c';
const FROG = '#c79a52';
const FROG_DARK = '#7d5a2b';
const FROG_BELLY = '#f1dcae';
/** Board px a door or rubble picture reaches past its capsule. */
export const STONE_PAD = 4;

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

/** A pressure plate, `w` across: a carved sandstone slab with a sun disc; down, it sits 4 px lower and the sun glows. Its top at y 6. */
export function paintPlate(w: number, down: boolean): HTMLCanvasElement {
  const h = 18;
  const { canvas, ctx } = makeCanvas(Math.ceil((w + 8) * ART_RES), Math.ceil(h * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(4, down ? 10 : 6);
  const pen = new Pen(ctx, 300 + Math.round(w), 0.4);
  const slab: Pt[] = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w - 2, y: 6 }, { x: 2, y: 6 }];
  const g = ctx.createLinearGradient(0, 0, 0, 6);
  g.addColorStop(0, down ? SAND : SAND_LIGHT);
  g.addColorStop(1, SAND_DARK);
  ctx.fillStyle = g;
  fillPath(ctx, slab);
  pen.hatch(slab, 2.6, 0.5, 0.5, { color: INK, alpha: 0.18 });
  pen.stroke([...slab, slab[0]!], 1.1, INK, 0.9, false);
  // The sun disc and its rays, carved into the slab's face.
  const cx = w / 2;
  if (down) {
    const glow = ctx.createRadialGradient(cx, 2, 0, cx, 2, 16);
    glow.addColorStop(0, 'rgba(255,214,110,0.8)');
    glow.addColorStop(1, 'rgba(255,214,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 16, -14, 32, 30);
  }
  pen.fill(ellipse(cx, 3, 4.2, 2.4, 14), down ? '#ffcf5a' : mix(SAND_DARK, INK, 0.2), 1);
  for (let k = -3; k <= 3; k++) if (k) pen.hair([{ x: cx + k * 3.2, y: 3 }, { x: cx + k * 5.4, y: k % 2 ? 0.6 : 5.4 }], 0.7, down ? '#c8761c' : INK, 0.7);
  return canvas;
}

/** A stone door, `len` long and `t2` thick, drawn lying along x (the scene turns it): dressed sandstone blocks, a carved eye, ink edges. */
export function paintDoor(len: number, t2: number): HTMLCanvasElement {
  const P = STONE_PAD;
  const { canvas, ctx } = makeCanvas(Math.ceil((len + t2 + P * 2) * ART_RES), Math.ceil((t2 + P * 2) * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(P, P);
  const pen = new Pen(ctx, 400 + Math.round(len), 0.35);
  const w = len + t2;
  const body: Pt[] = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: t2 }, { x: 0, y: t2 }];
  const g = ctx.createLinearGradient(0, 0, 0, t2);
  g.addColorStop(0, SAND_LIGHT);
  g.addColorStop(0.5, SAND);
  g.addColorStop(1, SAND_DARK);
  ctx.fillStyle = g;
  fillPath(ctx, body);
  pen.hatch(body, 3, 0.9, 0.5, { color: INK, alpha: 0.16 });
  for (let x = 22; x < w - 6; x += 22) pen.hair([{ x, y: 1 }, { x: x + 0.6, y: t2 - 1 }], 0.8, INK, 0.55);
  // A carved eye in the middle block: the tomb's guardian watches the door.
  const cx = w / 2;
  pen.hair([{ x: cx - 6, y: t2 / 2 }, { x: cx, y: t2 / 2 - 3 }, { x: cx + 6, y: t2 / 2 }, { x: cx, y: t2 / 2 + 3 }, { x: cx - 6, y: t2 / 2 }], 0.8, INK, 0.8);
  pen.dot(cx, t2 / 2, 1.3, INK, 0.9);
  pen.stroke([...body, body[0]!], 1.3, INK, 0.95, false);
  return canvas;
}

/** A bronze fire bowl on a little stand, its foot at (14, 30) of a 28 x 34 picture; doused, it's black and wet. */
export function paintBowl(lit: boolean): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(28 * ART_RES, 34 * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(14, 30);
  const pen = new Pen(ctx, lit ? 71 : 72, 0.4);
  pen.stroke([{ x: 0, y: 0 }, { x: 0, y: -12 }], 2.4, BRONZE_DARK, 1, false);
  pen.fill([{ x: -6, y: 0 }, { x: 6, y: 0 }, { x: 4, y: -3 }, { x: -4, y: -3 }], BRONZE_DARK, 1);
  const bowl: Pt[] = [{ x: -12, y: -22 }, { x: 12, y: -22 }, { x: 9, y: -15 }, { x: 4, y: -12 }, { x: -4, y: -12 }, { x: -9, y: -15 }];
  const g = ctx.createLinearGradient(-12, 0, 12, 0);
  g.addColorStop(0, '#d39a5a');
  g.addColorStop(0.5, BRONZE);
  g.addColorStop(1, BRONZE_DARK);
  ctx.fillStyle = g;
  fillPath(ctx, bowl);
  pen.hair([{ x: -10, y: -19 }, { x: 10, y: -19 }], 0.8, BRONZE_DARK, 0.8);
  pen.stroke([...bowl, bowl[0]!], 1, INK, 0.9, false);
  pen.fill(ellipse(0, -22, 11.5, 2.4, 14), lit ? '#3a1a12' : '#1d1b1f', 1);
  if (lit) for (const cx of [-6, -2, 2, 6]) pen.dot(cx, -22.4, 1.6, cx % 4 ? '#e2562b' : '#ffb653', 0.95);
  else for (const cx of [-5, 0, 5]) pen.dot(cx, -21.8, 1, '#8fb4d6', 0.8);
  return canvas;
}

/** The rubble where a cracked bar stood: a heap of broken sandstone, `len` long, lying along x like the door. */
export function paintRubble(len: number, t2: number): HTMLCanvasElement {
  const P = STONE_PAD;
  const { canvas, ctx } = makeCanvas(Math.ceil((len + t2 + P * 2) * ART_RES), Math.ceil((t2 + P * 2) * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(P, P);
  const pen = new Pen(ctx, 500 + Math.round(len), 0.5);
  const rng = createRng(Math.round(len) + 3);
  // The gap: the room's shade where the bar was, then broken stones along its foot end.
  ctx.fillStyle = SAND;
  ctx.fillRect(0, 0, len + t2, t2);
  ctx.fillStyle = rgba('#5a4630', 0.22);
  ctx.fillRect(0, 0, len + t2, t2);
  for (let x = 2; x < len + t2 - 4; x += 5 + rng() * 6) {
    if (rng() < 0.55) continue;
    const r = 1.5 + rng() * 2.5;
    const y = t2 / 2 + (rng() - 0.5) * t2 * 0.6;
    pen.fill(ellipse(x, y, r * 1.2, r, 7), mix(SAND, SAND_DARK, rng()), 1);
    pen.circle(x, y, r, 0.6, INK);
  }
  return canvas;
}

export type FrogMood = 'grump' | 'scared';

/**
 * The rain frog, in a guard's frame (BOAR_FRAME): flat, a squat round-backed
 * little desert frog with a sulky mouth; puffed, a round smiling ball with
 * tiny legs. `size` scales it (the old toad, the boss, is bigger and warty).
 */
export function paintFrog(mood: FrogMood, boil: number, puffed: boolean, size = 1, old = false): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.round(BOAR_FRAME.w * ART_RES * size), Math.round(BOAR_FRAME.h * ART_RES * size));
  ctx.scale(ART_RES * size, ART_RES * size);
  ctx.translate(BOAR_FRAME.ox, BOAR_FRAME.oy);
  const pen = new Pen(ctx, 1700 + boil * 11 + (old ? 5 : 0), 0.5);
  const skin = old ? mix(FROG, '#6f7a4a', 0.5) : FROG;
  const r = puffed ? 22 : 18;
  const cy = puffed ? 0 : 6;
  // A soft shadow under a frog on the ground.
  if (!puffed) {
    const sh = ctx.createRadialGradient(0, 22, 0, 0, 22, 20);
    sh.addColorStop(0, 'rgba(30,24,20,0.35)');
    sh.addColorStop(1, 'rgba(30,24,20,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(-22, 14, 44, 14);
  }
  const wob = boil === 1 ? 0.6 : boil === 2 ? -0.6 : 0;
  const body = ellipse(0, cy, r + wob, puffed ? r - wob : r * 0.78, 28);
  const g = ctx.createRadialGradient(-6, cy - 8, 2, 0, cy, r * 1.2);
  g.addColorStop(0, mix(skin, '#fff4d8', 0.35));
  g.addColorStop(0.7, skin);
  g.addColorStop(1, FROG_DARK);
  ctx.fillStyle = g;
  fillPath(ctx, body);
  pen.clipped(body, () => {
    pen.fill(ellipse(0, cy + r * 0.45, r * 0.75, r * 0.45, 20), FROG_BELLY, 0.85);
    pen.hatch(body, 3, 0.8, 0.5, { color: INK, alpha: 0.18, onlyBelow: cy + r * 0.2 });
    const rng = createRng(old ? 9 : 4);
    for (let k = 0; k < (old ? 14 : 6); k++) pen.dot(-r + rng() * r * 2, cy - r + rng() * r, old ? 1.6 : 1.1, FROG_DARK, 0.7);
  });
  pen.stroke([...body, body[0]!], 1.5, INK, 1, false);
  // Little legs: tucked under when flat, dangling when puffed.
  for (const s of [-1, 1]) {
    const lx = s * r * 0.55;
    const ly = cy + r * (puffed ? 0.9 : 0.62);
    pen.fill(ellipse(lx, ly + (puffed ? 3 : 1), 4.5, 2.6, 10), FROG_DARK, 1);
    pen.stroke([{ x: lx - 4, y: ly + 3 }, { x: lx + 4, y: ly + 3 }], 0.8, INK, 0.8, false);
  }
  // Eyes on top, and the mouth: a smile puffed, a sulk flat, an O scared.
  const scared = mood === 'scared';
  for (const s of [-1, 1]) {
    const ex = s * r * 0.38;
    const ey = cy - r * (puffed ? 0.45 : 0.62);
    pen.fill(ellipse(ex, ey, 4.4, 4, 12), '#fff8e6', 1);
    pen.circle(ex, ey, 4.2, 0.9, INK);
    pen.dot(ex + (scared ? 0 : 1), ey + (scared ? -0.5 : 0.6), scared ? 2.4 : 1.7, INK, 1);
  }
  const my = cy - r * (puffed ? 0.05 : 0.2);
  if (scared) pen.circle(0, my + 2, 2.4, 1, INK);
  else if (puffed) pen.hair([{ x: -7, y: my }, { x: 0, y: my + 4 }, { x: 7, y: my }], 1.1, INK, 0.95);
  else pen.hair([{ x: -7, y: my + 2 }, { x: 0, y: my }, { x: 7, y: my + 2 }], 1.1, INK, 0.95);
  if (puffed) for (const s of [-1, 1]) pen.dot(s * r * 0.62, my + 1, 2.4, '#e88a7a', 0.45);
  return canvas;
}
