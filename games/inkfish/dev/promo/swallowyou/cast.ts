import { INK } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import * as greatWhite from '../foodchain/art/greatWhite';
import * as whaleShark from '../foodchain/art/whaleShark';
import { GROUPER_LID } from '../goliath/cast';
import { drawSwimmer } from '../goliath/swimmer';
import { bodyPoint, drawGreenlandShark } from '../greenland/shark';
import { drawWhaleBack, drawWhaleFront } from '../kayak/whale';
import { BELLY, jawAt, openJaw } from '../kraken/whale';
import { drawMouthInside, drawWhaleBody, drawWhaleJawAt, makeWhaleSprite, type WhaleSprite } from '../kraken/whaleArt';
import { makeSprite, type Sprite } from '../sprites';
import { drawTiger, makeTigerSprite } from '../tigershark/tiger';
import { drawCroc } from './art/croc';
import { boilOf, type Pt, spline, trace } from './art/ink';
import { closeFraction } from './layout';
import type { Animal } from './timeline';
import { ANIMALS } from './timeline';

/**
 * Every animal through one door: `drawAnimal` puts its snout at a screen
 * point, `length` px from snout to tail tip, facing left or right, whatever
 * each drawing's own anchor and units are. Reused art: the goliath grouper
 * (../goliath), the tiger shark (../tigershark), the great white and the
 * whale shark (../foodchain/art), the Greenland shark (../greenland), the
 * humpback (../kayak), the sperm whale (../kraken); the crocodile is new
 * (art/croc.ts). `prepareCast` measures each drawing once, so the placement
 * is exact, and paints the stamp card's little mouths.
 */

export interface AnimalPose {
  /** Jaws, 0 shut .. 1 wide. */
  readonly gape?: number;
  /** Tail-beat phase, radians (default: beating with time). */
  readonly tail?: number;
  /** The humpback's throat, 0 slack .. 1 ballooned. */
  readonly balloon?: number;
  /** The croc's death roll, radians. */
  readonly roll?: number;
  /** Nose up, radians, turned about the snout. */
  readonly angle?: number;
  /** The sperm whale's mouth painted bright red inside (the thumbnails), not its dark wet grey. */
  readonly redMouth?: boolean;
}

interface Art {
  /** Draws it facing right, its own anchor at (x, y), its own length parameter `len`. */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, t: number, pose: AnimalPose): void;
}

interface Measured {
  /** Its drawn extent for len = PROBE_LEN with the anchor at the origin: snout (max x), tail (min x), top and bottom. */
  readonly snout: number;
  readonly tail: number;
  readonly top: number;
  readonly bottom: number;
}

const PROBE_LEN = 600;

let arts: Record<Animal, Art> | null = null;
const measured = new Map<Animal, Measured>();
const icons = new Map<Animal, HTMLCanvasElement>();

/** The Greenland shark has no open mouth of its own: a dark gape with small teeth under its blunt snout. */
function greenlandGape(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, gape: number, beat: number): void {
  if (gape <= 0.02) return;
  const at = (a: number, c: number): Pt => {
    const p = bodyPoint(a, c, beat, 0.3);
    return { x: x + p.x * len, y: y + p.y * len };
  };
  const n = 10;
  const upper = Array.from({ length: n + 1 }, (_, i) => at(0.035 + (0.13 * i) / n, 0.8));
  const lower = Array.from({ length: n + 1 }, (_, i) => {
    const a = 0.035 + (0.13 * i) / n;
    const open = gape * 1.5 * Math.sin((Math.PI / 2) * Math.min(1, (0.17 - a) / 0.11));
    return at(a, 0.8 + open);
  });
  const mouth = spline([...upper, ...lower.reverse()], 2, true);
  ctx.save();
  trace(ctx, mouth);
  const g = ctx.createLinearGradient(upper[0]!.x, 0, upper[n]!.x, 0);
  g.addColorStop(0, '#5a2a2c');
  g.addColorStop(1, '#140808');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, len * 0.004);
  ctx.stroke();
  ctx.fillStyle = '#e8e2d2';
  for (let i = 1; i < n; i++) {
    const p = upper[i]!;
    const q = lower[n - i]!;
    const s = len * 0.006;
    ctx.beginPath();
    ctx.moveTo(p.x - s, p.y);
    ctx.lineTo(p.x, p.y + s * 2.2);
    ctx.lineTo(p.x + s, p.y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(q.x - s, q.y);
    ctx.lineTo(q.x, q.y - s * 1.6);
    ctx.lineTo(q.x + s, q.y);
    ctx.fill();
  }
  ctx.restore();
}

/** Over the sperm whale's mouth: a bright red inside, lit towards the front (whale.ts's local px). */
function redMouth(ctx: CanvasRenderingContext2D, open: number): void {
  if (open < 0.004) return;
  const palate = BELLY.filter((p) => p.x <= -100 && p.x >= -650);
  const jaw = Array.from({ length: 16 }, (_, i) => openJaw(jawAt(i / 15).upper, open));
  ctx.save();
  trace(ctx, [...palate, ...jaw]);
  const g = ctx.createLinearGradient(-650, 0, -100, 0);
  g.addColorStop(0, '#5a0a14');
  g.addColorStop(1, '#e8394a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function makeArts(): Record<Animal, Art> {
  const grouper: Sprite = makeSprite('grouper', 8, 'heavy');
  const tiger: Sprite = makeTigerSprite(8);
  const sperm: WhaleSprite = makeWhaleSprite();
  const beatOf = (t: number, pose: AnimalPose, hz: number): number => pose.tail ?? t * hz * Math.PI * 2;
  return {
    grouper: {
      draw: (ctx, x, y, len, t, p) => drawSwimmer(ctx, grouper, { j: 0, shape: 'grouper', age: 0, x, y, length: len, facing: 1, tilt: 0, beat: beatOf(t, p, 0.6), effort: 0.35 }, boilOf(t), { jaw: (p.gape ?? 0) * 1.05, lid: GROUPER_LID }),
    },
    tiger: {
      draw: (ctx, x, y, len, t, p) => drawTiger(ctx, tiger, { x, y, length: len, turn: 1, tilt: 0, beat: beatOf(t, p, 0.7), effort: 0.4, jaw: p.gape ?? 0, lid: 0 }, boilOf(t)),
    },
    white: {
      draw: (ctx, x, y, len, t, p) => greatWhite.drawGreatWhite(ctx, x, y, len, 0, t, { jaw: p.gape ?? 0, tail: beatOf(t, p, 0.6) }),
    },
    croc: {
      draw: (ctx, x, y, len, t, p) => drawCroc(ctx, x, y, len, 1, t, { gape: p.gape ?? 0, tail: beatOf(t, p, 0.35), roll: p.roll ?? 0 }),
    },
    greenland: {
      draw: (ctx, x, y, len, t, p) => {
        const beat = beatOf(t, p, 0.25);
        greenlandGape(ctx, x, y, len, p.gape ?? 0, beat);
        drawGreenlandShark(ctx, { x, y, length: len, facing: 1, tilt: 0, beat, effort: 0.3 }, boilOf(t), t);
        // Over the body's own grim mouth line: the gape again, so it reads as open.
        if ((p.gape ?? 0) > 0.02) {
          ctx.save();
          ctx.globalAlpha *= Math.min(1, (p.gape ?? 0) * 3);
          greenlandGape(ctx, x, y, len, p.gape ?? 0, beat);
          ctx.restore();
        }
      },
    },
    whaleShark: {
      draw: (ctx, x, y, len, t, p) => whaleShark.drawWhaleShark(ctx, x, y, len, 0, t, { gape: p.gape ?? 0, tail: beatOf(t, p, 0.3) }),
    },
    humpback: {
      draw: (ctx, x, y, len, t, p) => {
        const k = len / 1800;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(k, k);
        const w = { x: 0, y: 0, tilt: 0, gape: p.gape ?? 0, balloon: p.balloon ?? 0, eye: 'calm' as const, fin: 0.1 * Math.sin(t * 0.9) };
        drawWhaleBack(ctx, w, boilOf(t));
        drawWhaleFront(ctx, w, boilOf(t));
        ctx.restore();
      },
    },
    sperm: {
      draw: (ctx, x, y, len, t, p) => {
        const k = len / 3000;
        const open = (p.gape ?? 0) * 0.42;
        const boil = boilOf(t) % BOIL_FRAMES;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(k, k);
        drawMouthInside(ctx, open);
        if (p.redMouth) redMouth(ctx, open);
        drawWhaleJawAt(ctx, sperm, boil, open);
        drawWhaleBody(ctx, sperm, boil, beatOf(t, p, 0.25), 40);
        ctx.restore();
      },
    },
  };
}

/** The alpha bounds of what `draw` paints on a scratch canvas, relative to (ox, oy). */
function bounds(draw: (c: CanvasRenderingContext2D) => void, ox: number, oy: number): Measured {
  const canvas = document.createElement('canvas');
  canvas.width = 2 * ox;
  canvas.height = 2 * oy;
  const c = canvas.getContext('2d')!;
  draw(c);
  const { data } = c.getImageData(0, 0, canvas.width, canvas.height);
  let x0 = canvas.width;
  let x1 = 0;
  let y0 = canvas.height;
  let y1 = 0;
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (data[(y * canvas.width + x) * 4 + 3]! < 40) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0) throw new Error('A cast drawing painted nothing');
  return { snout: x1 - ox, tail: x0 - ox, top: y0 - oy, bottom: y1 - oy };
}

/** Bakes the drawings, measures each one, and paints the stamp card's mouths. */
export async function prepareCast(): Promise<void> {
  if (arts) return;
  await Promise.all([greatWhite.prepare(), whaleShark.prepare()]);
  arts = makeArts();
  for (const a of ANIMALS) {
    const art = arts[a];
    measured.set(a, bounds((c) => art.draw(c, 1000, 500, PROBE_LEN, 0, { gape: 0, tail: 0 }), 1000, 500));
  }
  for (const a of ANIMALS) icons.set(a, makeIcon(a));
}

/** Its body's drawn height over its length (fins included). */
export function heightRatio(a: Animal): number {
  const m = measured.get(a)!;
  return (m.bottom - m.top) / (m.snout - m.tail);
}

/**
 * Draws an animal with its snout at `snout` (and its body's vertical middle
 * on that line), `length` px from snout to tail tip, facing right (1) or
 * left (-1), at t seconds.
 */
export function drawAnimal(ctx: CanvasRenderingContext2D, a: Animal, snout: Pt, length: number, facing: 1 | -1, t: number, pose: AnimalPose = {}): void {
  if (!arts) throw new Error('prepareCast() first');
  const m = measured.get(a)!;
  const r = length / (m.snout - m.tail);
  ctx.save();
  ctx.translate(snout.x, snout.y);
  if (pose.angle) ctx.rotate(-pose.angle * facing);
  ctx.scale(facing, 1);
  arts[a].draw(ctx, -m.snout * r, -((m.top + m.bottom) / 2) * r, PROBE_LEN * r, t, pose);
  ctx.restore();
}

/** A little open mouth for the stamp card: the head, mouth wide, facing right in a 220 x 150 tile. */
function makeIcon(a: Animal): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 150;
  const c = canvas.getContext('2d')!;
  const length = 230 / closeFraction(a);
  drawAnimal(c, a, { x: 206, y: 70 }, length, 1, 0.2, { gape: a === 'whaleShark' ? 0.8 : 0.9, tail: 0, balloon: 0.3 });
  // The body fades out behind the head, and at the top and bottom, instead of a hard crop.
  c.globalCompositeOperation = 'destination-in';
  const across = c.createLinearGradient(0, 0, canvas.width, 0);
  across.addColorStop(0, 'rgba(0,0,0,0)');
  across.addColorStop(0.4, 'rgba(0,0,0,1)');
  c.fillStyle = across;
  c.fillRect(0, 0, canvas.width, canvas.height);
  const down = c.createLinearGradient(0, 0, 0, canvas.height);
  down.addColorStop(0, 'rgba(0,0,0,0)');
  down.addColorStop(0.14, 'rgba(0,0,0,1)');
  down.addColorStop(0.86, 'rgba(0,0,0,1)');
  down.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = down;
  c.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export function iconOf(a: Animal): HTMLCanvasElement {
  const icon = icons.get(a);
  if (!icon) throw new Error('prepareCast() first');
  return icon;
}
