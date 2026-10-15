import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, INK_ON_PAPER } from '../captions';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { BASE, type Prop } from './plants';
import { DINOS, FIRST_TREE, IMPACT_MYR, LOOP_S, PX_PER_MYR, screenX } from './story';

/**
 * The world along the timeline: the sky, the land and the sea (scrolling
 * with the camera), what stands on the land at each moment, and the ruler
 * of millions of years.
 */

/** The land's edge, where the sea begins, and the ruler. */
export const GROUND_Y = 704;
export const SHORE_Y = 752;
export const RULER_Y = 1062;
/** Ruler marks for the story's moments, in brick red. */
export const MARK = '#c8452c';
const EARTH = '#d9c49b';

/** Paper with a pale sky over the land and a blue wash for the sea below it. */
export function makeBackdrop(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, SHORE_Y);
  sky.addColorStop(0, 'rgba(120,170,210,0.18)');
  sky.addColorStop(1, 'rgba(240,215,170,0.12)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, SHORE_Y);
  const sea = ctx.createLinearGradient(0, SHORE_Y, 0, VIDEO.height);
  sea.addColorStop(0, 'rgba(70,150,195,0.22)');
  sea.addColorStop(1, 'rgba(30,90,150,0.42)');
  ctx.fillStyle = sea;
  ctx.fillRect(0, SHORE_Y, VIDEO.width, VIDEO.height - SHORE_Y);
  return canvas;
}

// ---------------------------------------------------------------- what stands where

export type PlantKind = 'first' | 'broad' | 'conifer' | 'tuft';
export interface Plant {
  readonly myr: number;
  readonly kind: PlantKind;
  readonly variant: number;
  readonly scale: number;
  /** A little up or down the bank. */
  readonly dy: number;
}

/** The big broadleaf the shark swims past in the hook, mid-frame at today's camera. */
export const HOOK_TREE = 38;

/**
 * Tiny stalked plants from 470 to the first tree at 390; nothing taller for
 * 45 million years after it (so it stands alone in its shot); then trees all
 * the way to today, except round the dinosaurs and the impact, which need the room.
 */
export const PLANTS: readonly Plant[] = (() => {
  const rng = createRng(390);
  const plants: Plant[] = [];
  for (let myr = 472; myr > FIRST_TREE + 2; myr -= 3.4) plants.push({ myr: myr + rng(), kind: 'tuft', variant: plants.length % 3, scale: 0.8 + 0.5 * rng(), dy: 4 * rng() });
  plants.push({ myr: FIRST_TREE, kind: 'first', variant: 0, scale: 1.15, dy: 6 });
  for (let myr = 345; myr > 1; myr -= 5 + 2.5 * rng()) {
    if (DINOS.some((d) => Math.abs(myr - d.myr) < 8) || Math.abs(myr - IMPACT_MYR) < 9 || Math.abs(myr - HOOK_TREE) < 6) continue;
    plants.push({ myr, kind: rng() < 0.5 ? 'broad' : 'conifer', variant: Math.floor(rng() * 3), scale: 0.72 + 0.3 * rng(), dy: 10 * rng() });
  }
  plants.push({ myr: HOOK_TREE, kind: 'broad', variant: 0, scale: 1.12, dy: 12 });
  // Back to front: the ones lower down the bank stand in front.
  return plants.sort((a, b) => a.dy - b.dy);
})();

/** Draws a prop with its base at (x, y), scaled, tilted about its base, and grown up from it (0 .. 1). */
export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, boil: number, x: number, y: number, scale: number, opts: { tilt?: number; grow?: number; alpha?: number } = {}): void {
  const grow = opts.grow ?? 1;
  if (grow <= 0 || (opts.alpha ?? 1) <= 0) return;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.translate(x, y);
  ctx.rotate(opts.tilt ?? 0);
  ctx.scale(scale * (0.35 + 0.65 * grow), scale * grow);
  ctx.drawImage(p.frames[boil % p.frames.length]!, -p.w / 2, -(p.h - BASE));
  ctx.restore();
}

// ---------------------------------------------------------------- land and sea

/** The land's top edge at a moment of the timeline: gently rolling, so it visibly scrolls. */
export const edgeAt = (myr: number): number => GROUND_Y + 7 * Math.sin(myr * 0.37) + 4 * Math.sin(myr * 1.3 + 1);

/** The land between its rolling top and the sea, and the water's inked surface. */
export function drawLand(ctx: CanvasRenderingContext2D, cam: number, t: number): void {
  const myrAt = (x: number): number => cam - (x - 540) / PX_PER_MYR;
  const top: { x: number; y: number }[] = [];
  for (let x = -10; x <= VIDEO.width + 10; x += 8) top.push({ x, y: edgeAt(myrAt(x)) });
  ctx.save();
  ctx.beginPath();
  top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.lineTo(VIDEO.width + 10, SHORE_Y);
  ctx.lineTo(-10, SHORE_Y);
  ctx.closePath();
  ctx.fillStyle = EARTH;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  // Pebbles, fixed to the timeline, so they scroll with it.
  ctx.fillStyle = INK;
  const first = Math.ceil(myrAt(VIDEO.width + 20));
  for (let m = first; m <= myrAt(-20); m++) {
    const x = screenX(m, cam) + 3 * Math.sin(m * 7.1);
    const y = edgeAt(m) + 16 + 20 * (0.5 + 0.5 * Math.sin(m * 3.7));
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x, Math.min(y, SHORE_Y - 6), 1.6 + Math.abs(Math.sin(m * 2.3)), 0, Math.PI * 2);
    ctx.fill();
  }
  // The sea's surface: a wavy line rolling along, round a whole number of times a loop.
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const roll = (2 * Math.PI * 4 * t) / LOOP_S;
  for (let x = -10; x <= VIDEO.width + 10; x += 6) {
    const y = SHORE_Y + 4 * Math.sin(x / 38 + roll) + 2 * Math.sin(x / 13 - roll);
    if (x === -10) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Current marks in the sea, fixed to the timeline: they slide by as the camera travels, streaked when it's fast. */
const MARKS = (() => {
  const rng = createRng(4501);
  return Array.from({ length: 34 }, () => ({ x: rng() * 1300, y: SHORE_Y + 50 + rng() * (VIDEO.height - SHORE_Y - 80), size: 0.6 + rng() * 0.8, phase: rng() * Math.PI * 2, sways: 1 + Math.floor(rng() * 2) }));
})();

export function drawSeaMarks(ctx: CanvasRenderingContext2D, cam: number, speed: number, t: number): void {
  const shift = cam * PX_PER_MYR;
  const streak = Math.min(520, Math.abs(speed * PX_PER_MYR) / 30);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  for (const m of MARKS) {
    const sway = Math.sin((2 * Math.PI * m.sways * t) / LOOP_S + m.phase);
    const x = ((((m.x + shift + 22 * sway) % 1300) + 1300) % 1300) - 110;
    const len = 56 * m.size + streak;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = Math.max(1.4, 2.2 * m.size);
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const px = x - len / 2 + (k / 8) * len;
      const py = m.y + 8 * Math.cos((2 * Math.PI * m.sways * t) / LOOP_S + m.phase) + Math.sin(k * 1.4 + m.phase) * 3.5 * m.size;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the ruler

/** The ruler of millions of years: a tick every 10, a number every 50 and at the story's moments (red while it's at them), "today" at its end, and a red ▼ at `now`, where the story is. */
export function drawRuler(ctx: CanvasRenderingContext2D, cam: number, now: number, lit: (myr: number) => boolean): void {
  const right = Math.min(VIDEO.width + 20, screenX(0, cam));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-20, RULER_Y);
  ctx.lineTo(right, RULER_Y);
  ctx.stroke();
  if (right < VIDEO.width) {
    ctx.beginPath();
    ctx.moveTo(right - 18, RULER_Y - 12);
    ctx.lineTo(right, RULER_Y);
    ctx.lineTo(right - 18, RULER_Y + 12);
    ctx.stroke();
  }
  const from = Math.max(0, Math.floor((cam - 60) / 10) * 10);
  for (let m = from; m <= cam + 60; m += 10) {
    const x = screenX(m, cam);
    if (x < -40 || x > VIDEO.width + 40 || m === 0) continue;
    const big = m % 50 === 0;
    ctx.lineWidth = big ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(x, RULER_Y - (big ? 16 : 9));
    ctx.lineTo(x, RULER_Y + (big ? 16 : 9));
    ctx.stroke();
  }
  const labels = new Set<number>();
  for (let m = Math.max(50, Math.ceil((cam - 60) / 50) * 50); m <= cam + 60; m += 50) labels.add(m);
  for (const m of [FIRST_TREE, IMPACT_MYR]) labels.add(m);
  for (const m of labels) {
    const x = screenX(m, cam);
    if (x < -60 || x > VIDEO.width + 60) continue;
    drawTextLine(ctx, `${m}`, x, RULER_Y + 54, 50, 700, 1, lit(m) ? { fill: MARK, halo: PAPER } : INK_ON_PAPER);
  }
  const today = screenX(0, cam);
  if (today < VIDEO.width + 120) drawTextLine(ctx, 'today', Math.min(today - 30, VIDEO.width - 75), RULER_Y + 54, 50, 700, 1);
  // Where the story is now.
  const x = screenX(now, cam);
  ctx.fillStyle = MARK;
  ctx.beginPath();
  ctx.moveTo(x, RULER_Y - 6);
  ctx.lineTo(x - 15, RULER_Y - 32);
  ctx.lineTo(x + 15, RULER_Y - 32);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
