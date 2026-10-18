import { drawFish, FISH_TEX } from '../../../src/art/fishArt';
import { C, heightAt, PAPER_FILL, xAt } from '../../../src/art/fish/kit';
import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { SWALLOWER } from './anatomy';
import { gapeAt, HINGE_TEX, K, type Lips, type Sac, texToLocal } from './swallow';

/**
 * The black swallower on screen: the game's drawing of it (anatomy.ts,
 * through fishArt, one canvas per boil frame) with its jaws cut open and
 * pushed apart column by column, as the gape short opens the viperfish's;
 * the dark inside of the mouth, inked lips and needle teeth; and its
 * stomach, a thin stretched sac you can see the meal through.
 *
 * Everything is drawn in the swallower's local px (swallow.ts): the caller
 * sets up the transform.
 */

/** Sprite px per texture px: crisp at the closest zoom. */
const RES = 7;

export interface SwallowerSprite {
  readonly frames: readonly HTMLCanvasElement[];
}

export function makeSwallowerSprite(): SwallowerSprite {
  const side = FISH_TEX * RES;
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(side, side);
    ctx.scale(RES, RES);
    // The shape is only a name here: the anatomy is the swallower's own.
    drawFish(ctx, 'fangtooth', 'light', 101 + f * 977, undefined, SWALLOWER);
    return canvas;
  });
  return { frames };
}

export interface SwallowerLook {
  readonly boil: number;
  readonly jaw: number;
  /** Tail beat phase and size (local px at the tail tip). */
  readonly beat: number;
  readonly wag: number;
}

/** Into the sprite's own px (its canvas's top left at 0, 0) from local px. */
function enterSprite(ctx: CanvasRenderingContext2D): void {
  const origin = texToLocal({ x: 0, y: 0 });
  ctx.translate(origin.x, origin.y);
  ctx.scale(K / RES, K / RES);
}

/** The body, its head split open at the mouth line (`jaw` 0 shut .. 1 wide), its tail wagging. */
export function drawBody(ctx: CanvasRenderingContext2D, sprite: SwallowerSprite, look: SwallowerLook): void {
  const canvas = sprite.frames[look.boil % sprite.frames.length]!;
  const side = canvas.width;
  const step = 4;
  ctx.save();
  enterSprite(ctx);
  const tailX = (C - SWALLOWER.hl - SWALLOWER.hh * SWALLOWER.tailSize) * RES;
  const hingeX = HINGE_TEX.x * RES;
  for (let sx = 0; sx < side; sx += step) {
    const mid = sx + step / 2;
    // The tail half sways a little: nothing at the hinge, most at the tail tips.
    const back = Math.max(0, Math.min(1, (hingeX - mid) / (hingeX - tailX)));
    const dy = (look.wag / K) * RES * back * back * Math.sin(look.beat - 2.2 * back);
    const g = gapeAt(look.jaw, mid / RES);
    const w = step + 1;
    if (!g) {
      ctx.drawImage(canvas, sx, 0, step, side, sx, dy, w, side);
      continue;
    }
    const cut = g.line * RES;
    ctx.drawImage(canvas, sx, 0, step, cut, sx, -g.up * RES + dy, w, cut);
    ctx.drawImage(canvas, sx, cut, step, side - cut, sx, cut + g.down * RES + dy, w, side - cut);
  }
  ctx.restore();
}

/** The open mouth's outline: along the upper lip, round the front in a curve that dips inwards, back along the lower lip. */
function mouthShape(lips: Lips): Pt[] {
  const top = lips.upper[lips.upper.length - 1]!;
  const bottom = lips.lower[lips.lower.length - 1]!;
  const front = Array.from({ length: 9 }, (_, i) => {
    const u = (i + 1) / 10;
    return { x: top.x + (bottom.x - top.x) * u - Math.sin(Math.PI * u) * lips.height * 0.12, y: top.y + (bottom.y - top.y) * u };
  });
  return [...lips.upper, ...front, ...[...lips.lower].reverse()];
}

/** The dark inside of the open mouth. */
export function drawMouthInside(ctx: CanvasRenderingContext2D, lips: Lips): void {
  if (lips.height < 2) return;
  const shape = mouthShape(lips);
  const corner = lips.upper[0]!;
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(corner.x, corner.y, lips.gate.x, lips.gate.y);
  g.addColorStop(0, '#0c0608');
  g.addColorStop(1, '#3a1d24');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** Darkness deepening towards the corner of the mouth, over whatever is going in. */
export function drawThroatShadow(ctx: CanvasRenderingContext2D, lips: Lips): void {
  if (lips.height < 2) return;
  const shape = mouthShape(lips);
  const corner = lips.upper[0]!;
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(corner.x, corner.y, lips.gate.x, lips.gate.y);
  g.addColorStop(0, 'rgba(12,6,8,1)');
  g.addColorStop(0.55, 'rgba(20,9,12,0.7)');
  g.addColorStop(1, 'rgba(42,20,24,0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/**
 * Clips to what is in front of the mouth: the opening between the lips
 * and all the water ahead of it. Call inside save/restore.
 */
export function clipToMouth(ctx: CanvasRenderingContext2D, lips: Lips): void {
  const far = 5000;
  const top = lips.upper[lips.upper.length - 1]!;
  const bottom = lips.lower[lips.lower.length - 1]!;
  ctx.beginPath();
  lips.upper.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.lineTo(top.x, -far);
  ctx.lineTo(far, -far);
  ctx.lineTo(far, far);
  ctx.lineTo(bottom.x, far);
  [...lips.lower].reverse().forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.clip();
}

function needle(pen: Pen, base: Pt, tip: Pt, width: number): void {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * (width / 2);
  const ny = (dx / d) * (width / 2);
  const tooth = [{ x: base.x + nx, y: base.y + ny }, tip, { x: base.x - nx, y: base.y - ny }];
  pen.fill(tooth, PAPER_FILL, 1);
  pen.hair([...tooth, tooth[0]!], 0.35 * K, INK, 0.9);
}

/** Inked lips over the cut, and the needle teeth along both jaws, longest at the front. */
export function drawJaws(ctx: CanvasRenderingContext2D, lips: Lips, boil: number): void {
  const pen = new Pen(ctx, 3301 + boil * 977, 0.5 * K);
  const n = lips.upper.length - 1;
  const open = Math.min(1, lips.height / 40);
  if (open > 0.05) {
    for (let i = 3; i <= n; i += 1) {
      const u = lips.upper[i]!;
      const l = lips.lower[i]!;
      const gap = l.y - u.y;
      const f = i / n;
      const len = Math.min(5 + 9 * f, gap * 0.28) * (i === n || i === n - 4 ? 1.5 : 1) * (0.6 + 0.4 * open);
      if (len < 1.5) continue;
      if (i % 2) needle(pen, u, { x: u.x - len * 0.25, y: u.y + len }, 2.4 + 1.6 * f);
      else needle(pen, l, { x: l.x - len * 0.3, y: l.y - len }, 2.2 + 1.4 * f);
    }
  }
  pen.stroke(lips.upper, 2 * K, INK, 1, false);
  pen.stroke(lips.lower, 2.2 * K, INK, 1, false);
  // The corner of the mouth.
  const c = lips.upper[0]!;
  pen.hair([c, { x: c.x - 4 * K, y: c.y + 1.5 * K }], 0.8 * K, INK, 0.85);
  // A pale edge on the dark lower jaw, so it reads against the dark mouth.
  pen.hair(lips.lower.slice(2), 0.9 * K, '#9a94a6', 0.5 * open);
}

const MEMBRANE = '#4a4054';
const HATCH = '#cfc6dc';

/** The inside of the stomach, behind the meal: dark, or lit from within for the x-ray (`xray` 0 .. 1). */
export function drawSacInside(ctx: CanvasRenderingContext2D, sac: Sac, xray: number): void {
  if (sac.r < 4) return;
  ctx.save();
  ctx.beginPath();
  sac.outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createRadialGradient(sac.cx - sac.r * 0.2, sac.cy - sac.r * 0.25, sac.r * 0.1, sac.cx, sac.cy, sac.r * 1.05);
  g.addColorStop(0, mix('#1b1620', '#f3d9a4', xray));
  g.addColorStop(0.7, mix('#120f16', '#c9925f', xray));
  g.addColorStop(1, mix('#0b090d', '#6d3f35', xray));
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.restore();
}

/** The stretched skin over the meal: a thin veil, hatched like the lines on a globe, its rim inked; thinner still in the x-ray. */
export function drawSacSkin(ctx: CanvasRenderingContext2D, sac: Sac, xray: number, boil: number): void {
  if (sac.r < 4) return;
  const pen = new Pen(ctx, 5101 + boil * 977, 0.5 * K);
  const shape = [...sac.outline];
  pen.fill(shape, MEMBRANE, 0.42 * (1 - 0.75 * xray));
  pen.clipped(shape, () => {
    const x0 = sac.cx - sac.r;
    const x1 = sac.cx + sac.r;
    for (let x = x0; x <= x1; x += sac.r / 9) {
      const line = Array.from({ length: 9 }, (_, i) => {
        const v = i / 8;
        const y = sac.cy - sac.r + 2 * sac.r * v;
        return { x: x + (x - sac.cx) * 0.32 * Math.sin(Math.PI * v), y };
      });
      pen.hair(line, 0.5 * K, HATCH, 0.22 * (1 - 0.5 * xray));
    }
    // Shade towards the far side.
    const shade = ctx.createRadialGradient(sac.cx - sac.r * 0.3, sac.cy - sac.r * 0.3, sac.r * 0.3, sac.cx, sac.cy, sac.r * 1.05);
    shade.addColorStop(0, 'rgba(10,8,14,0)');
    shade.addColorStop(1, `rgba(10,8,14,${(0.5 * (1 - 0.6 * xray)).toFixed(3)})`);
    ctx.fillStyle = shade;
    ctx.fillRect(sac.cx - sac.r - 4, sac.cy - sac.r - 4, 2 * sac.r + 8, 2 * sac.r + 8);
  });
  // A highlight where the skin is stretched tight, and the rim.
  const n = shape.length - 1;
  const arc = shape.slice(Math.round(n * 0.12), Math.round(n * 0.4)).map((p) => {
    const k = Math.min(0.2, (9 * K) / sac.r);
    return { x: p.x + (sac.cx - p.x) * k, y: p.y + (sac.cy - p.y) * k };
  });
  pen.hair(arc, 2.4 * K, '#f2ecf8', 0.4);
  pen.stroke(shape, 1.8 * K, INK, 1, true);
  pen.hair(shape, 0.7 * K, '#a49cb2', 0.45);
}

/** Two hex colours mixed, as a CSS colour. */
function mix(a: string, b: string, u: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * Math.max(0, Math.min(1, u))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Where the eye is, local px, with the jaw at `jaw` (the eye rides up with the upper jaw). */
export function eyeAt(jaw: number): { readonly at: Pt; readonly r: number } {
  const a = SWALLOWER;
  const tx = xAt(a, a.eye.t);
  const ty = C - heightAt(a, a.eye.t) * 0.3 - (gapeAt(jaw, tx)?.up ?? 0);
  return { at: texToLocal({ x: tx, y: ty }), r: a.eye.r * K };
}
