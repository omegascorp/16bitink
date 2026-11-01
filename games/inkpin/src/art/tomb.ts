import { createRng } from '../logic/rng';
import { BOAR_FRAME } from './boar';
import { ART_RES, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The Desert Tomb's things in the pen-and-ink style: a fire bowl lit or
 * doused, the rubble of a broken wall, and the rain frog, flat or puffed up
 * round. (The plates, doors and their grooves are in tombMarks.ts and
 * tombLinks.ts.) Each is drawn at ART_RES, centred like the chapter 2
 * pictures.
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
/** Board px a rubble picture reaches past its capsule. */
export const STONE_PAD = 4;

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
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

/** Where a cracked bar stood once a blast broke it: a scorched gap with snapped stubs and broken stones, `len` long, lying along x. */
export function paintRubble(len: number, t2: number): HTMLCanvasElement {
  const P = STONE_PAD;
  const { canvas, ctx } = makeCanvas(Math.ceil((len + t2 + P * 2) * ART_RES), Math.ceil((t2 + P * 2) * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(P, P);
  const pen = new Pen(ctx, 500 + Math.round(len), 0.5);
  const rng = createRng(Math.round(len) + 3);
  // The gap: the wall's stone where the bar was (covering its outline too), scorched by the blast.
  const W = len + t2;
  ctx.fillStyle = SAND;
  ctx.fillRect(0, -2.6, W, t2 + 5.2);
  const soot = ctx.createLinearGradient(0, 0, W, 0);
  soot.addColorStop(0, rgba('#3a2a1c', 0.1));
  soot.addColorStop(0.5, rgba('#3a2a1c', 0.3));
  soot.addColorStop(1, rgba('#3a2a1c', 0.1));
  ctx.fillStyle = soot;
  ctx.fillRect(0, -2.6, W, t2 + 5.2);
  // Jagged stubs where it snapped off at each end.
  for (const [x0, dir] of [[0, 1], [W, -1]] as const) {
    const stub: Pt[] = [{ x: x0, y: 0 }, { x: x0 + dir * (4 + rng() * 3), y: 0 }, { x: x0 + dir * (2 + rng() * 2), y: t2 * 0.35 }, { x: x0 + dir * (6 + rng() * 3), y: t2 * 0.6 }, { x: x0 + dir * (3 + rng() * 2), y: t2 }, { x: x0, y: t2 }];
    pen.fill(stub, SAND_DARK, 1);
    pen.stroke([...stub, stub[0]!], 0.9, INK, 0.9, false);
  }
  // Broken stones scattered along it.
  for (let x = 8; x < W - 8; x += 7 + rng() * 9) {
    if (rng() < 0.4) continue;
    const r = 1.6 + rng() * 2.4;
    const y = t2 / 2 + (rng() - 0.5) * t2 * 0.7;
    const chunk: Pt[] = [{ x: x - r, y: y + r * 0.6 }, { x: x - r * 0.4, y: y - r }, { x: x + r, y: y - r * 0.5 }, { x: x + r * 0.8, y: y + r * 0.8 }];
    pen.fill(chunk, mix(SAND, SAND_DARK, 0.3 + rng() * 0.6), 1);
    pen.stroke([...chunk, chunk[0]!], 0.7, INK, 0.85, false);
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
