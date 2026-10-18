import { bodyProportions, FISH_TEX } from '../../../src/art/fishArt';
import { bottomAt, C, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { makeCanvas } from '../../../src/art/pen';
import { makeSprite, type Sprite } from '../sprites';

/**
 * The game's mako, drawn big and alive: cut into thin columns like
 * swimmer.ts, the tail half bending with a travelling wave, and the jaws
 * opening where the mako's mouth really is, under the long cone of its
 * snout (swimmer.ts opens a mouth on the nose line). The upper jaw and snout
 * lift a little, the lower jaw drops a lot, and the gap is the inside of a
 * shark's mouth, rows of teeth along both jaws. Baked with a pale rim of
 * light so it stands out on the dark sky and sea.
 */

interface Pt { readonly x: number; readonly y: number }

const A = ANATOMY.mako;
const { hl: HL, hh: HH } = bodyProportions('mako');
const INK = A.ink ?? '#1f3f8a';

/** Where the mouth opens, fish-texture px (fish facing right): the front of the crescent under the snout, and its corner. */
const TIP: Pt = { x: xAt(A, 0.045), y: bottomAt(A, 0.045) - 1.2 };
const HINGE: Pt = { x: xAt(A, 0.175), y: bottomAt(A, 0.16) - 5 };
/** How far each jaw moves at full gape, in half-heights. */
const LOWER = 1.45;
const UPPER = 0.42;

export interface MakoPose {
  /** Screen px of the body's centre. */
  readonly x: number;
  readonly y: number;
  /** Body length on screen, px. */
  readonly length: number;
  /** Horizontal scale: 1 faces right, -1 left (between, edge-on as it turns). */
  readonly turn: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** 0 shut .. 1 wide. */
  readonly jaw: number;
}

/** The sprite, with a pale rim of light baked round it. */
export function makeMakoSprite(res: number): Sprite {
  const plain = makeSprite('mako', res);
  const frames = plain.frames.map((src) => {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    ctx.shadowColor = 'rgba(214,228,255,0.85)';
    ctx.shadowBlur = 2.4 * res;
    ctx.drawImage(src, 0, 0);
    ctx.shadowBlur = 0.9 * res;
    ctx.drawImage(src, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.drawImage(src, 0, 0);
    return canvas;
  });
  return { ...plain, frames };
}

interface Gape { readonly line: number; readonly up: number; readonly down: number }

function gapeAt(open: number, x: number): Gape | null {
  if (open <= 0 || x <= HINGE.x) return null;
  const f = Math.min(1, (x - HINGE.x) / (TIP.x - HINGE.x));
  const ease = Math.sin((Math.PI / 2) * f) ** 0.8;
  const line = HINGE.y + (TIP.y - HINGE.y) * f;
  return { line, up: UPPER * HH * open * ease, down: LOWER * HH * open * ease };
}

function outline(open: number): { readonly upper: Pt[]; readonly lower: Pt[] } {
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const x = HINGE.x + ((TIP.x - HINGE.x) * i) / 18;
    const g = gapeAt(open, x + 1e-6) ?? { line: HINGE.y, up: 0, down: 0 };
    upper.push({ x, y: g.line - g.up });
    lower.push({ x, y: g.line + g.down });
  }
  return { upper, lower };
}

const toSprite = (p: Pt, R: number): Pt => ({ x: (p.x - FISH_TEX / 2) * R, y: (p.y - FISH_TEX / 2) * R });

function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], R: number, move = true): void {
  pts.forEach((p, i) => {
    const q = toSprite(p, R);
    if (i === 0 && move) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
}

function mouthPath(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[], R: number): void {
  const top = toSprite(upper[upper.length - 1]!, R);
  const bottom = toSprite(lower[lower.length - 1]!, R);
  ctx.beginPath();
  trace(ctx, upper, R);
  ctx.quadraticCurveTo(top.x - (bottom.y - top.y) * 0.3, (top.y + bottom.y) / 2, bottom.x, bottom.y);
  trace(ctx, [...lower].reverse(), R, false);
  ctx.closePath();
}

/** The inside: dark red, a throat shadow deepening to the corner, and ragged rows of teeth on both jaws. */
function drawInside(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[], R: number): void {
  ctx.save();
  mouthPath(ctx, upper, lower, R);
  ctx.fillStyle = '#3a1a22';
  ctx.fill();
  ctx.clip();
  const back = toSprite(HINGE, R);
  const front = toSprite({ x: TIP.x, y: (upper[upper.length - 1]!.y + lower[lower.length - 1]!.y) / 2 }, R);
  const shade = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  shade.addColorStop(0, 'rgba(14,4,8,1)');
  shade.addColorStop(0.6, 'rgba(40,14,20,0.6)');
  shade.addColorStop(1, 'rgba(120,50,60,0.25)');
  ctx.fillStyle = shade;
  ctx.fill();
  // The tongue, low in the mouth.
  const mid = lower[Math.round(lower.length * 0.5)]!;
  const tongue = toSprite({ x: mid.x, y: mid.y - HH * 0.12 }, R);
  ctx.fillStyle = '#8c3a46';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(tongue.x, tongue.y, HH * 0.55 * R, HH * 0.15 * R, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Teeth: long, narrow and slightly hooked, like a mako's, pointing across the gap.
  for (const [lip, dir] of [[upper, 1], [lower, -1]] as const) {
    for (let i = 1; i < lip.length - 1; i++) {
      const p = toSprite(lip[i]!, R);
      const size = (1.6 + (i / lip.length) * 2.2) * R;
      const hook = dir * size * 0.25;
      ctx.beginPath();
      ctx.moveTo(p.x - size * 0.32, p.y);
      ctx.quadraticCurveTo(p.x - hook * 0.2, p.y + dir * size * 0.8, p.x + hook, p.y + dir * size * 1.7);
      ctx.quadraticCurveTo(p.x + size * 0.1, p.y + dir * size * 0.7, p.x + size * 0.32, p.y);
      ctx.closePath();
      ctx.fillStyle = '#fffaf0';
      ctx.fill();
      ctx.lineWidth = 0.35 * R;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLips(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[], R: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.5 * R;
  for (const lip of [upper, lower]) {
    ctx.beginPath();
    trace(ctx, lip, R);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws the mako at `pose` (the swimmer's column method, with the mako's own jaw). */
export function drawMako(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: MakoPose, boil: number): void {
  const canvas = sprite.frames[boil % sprite.frames.length]!;
  const side = canvas.width;
  const half = side / 2;
  const R = sprite.res;
  const scale = pose.length / sprite.bodyPx;
  const head = (FISH_TEX / 2 + HL) * R;
  const span = 2 * HL * R;
  const amp = HH * R * (0.12 + 0.16 * pose.effort);
  const open = Math.max(0, pose.jaw);
  const step = Math.max(4, Math.min(48, Math.ceil(2 / scale)));
  const mouth = open > 0.01 ? outline(open) : null;
  // Edge-on as it turns: never quite flat, so it doesn't vanish.
  const turn = Math.sign(pose.turn || 1) * Math.max(0.08, Math.abs(pose.turn));

  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(turn, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(scale, scale);
  if (mouth) drawInside(ctx, mouth.upper, mouth.lower, R);
  for (let sx = 0; sx < side; sx += step) {
    const along = (head - (sx + step / 2)) / span;
    const bend = Math.max(0, (along - 0.3) / 0.7);
    const dy = amp * bend * bend * Math.sin(pose.beat - 2.4 * along);
    const w = step + 0.75 / scale;
    const gape = gapeAt(open, (sx + step / 2) / R);
    if (!gape) {
      ctx.drawImage(canvas, sx, 0, step, side, sx - half, -half + dy, w, side);
      continue;
    }
    const cut = gape.line * R;
    ctx.drawImage(canvas, sx, 0, step, cut, sx - half, -half - gape.up * R + dy, w, cut);
    ctx.drawImage(canvas, sx, cut, step, side - cut, sx - half, cut - half + gape.down * R + dy, w, side - cut);
  }
  if (mouth) drawLips(ctx, mouth.upper, mouth.lower, R);
  ctx.restore();
}

/** A point on the fish (texture px, facing right) on screen, for a pose: its mouth, its tail. */
export function pointOn(pose: MakoPose, p: Pt): Pt {
  const scale = pose.length / (2 * HL);
  const lx = (p.x - C) * scale;
  const ly = (p.y - C) * scale;
  const c = Math.cos(pose.tilt);
  const s = Math.sin(pose.tilt);
  // As drawMako: scale(turn, 1), then rotate(-tilt).
  return { x: pose.x + pose.turn * (lx * c + ly * s), y: pose.y - lx * s + ly * c };
}

/** The mouth (between the jaws) and the tail fork, texture px. */
export const MOUTH: Pt = { x: (TIP.x + HINGE.x) / 2 + 4, y: TIP.y + 3 };
export const TAIL: Pt = { x: xAt(A, 1), y: C };
