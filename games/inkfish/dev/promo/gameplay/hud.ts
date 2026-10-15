import type { FishShape } from '../../../src/art/fishArt';
import { INK } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import type { Pose } from '../chain';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { VIDEO } from '../short';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';

/**
 * The game's on-screen bits, for the gameplay-highlight shorts: the growth
 * bar, the floating "+10 ×2" and "Bigger!" texts, and the game's name and
 * site, which every gameplay short carries for the whole loop (descriptions
 * carry no links, so the name has to be in the picture).
 *
 * Layout, 1080x1920: captions at the top (y ≈ 330-470), the bar at 1140,
 * the credit at 1228. Shorts and Reels cover above ~270 and below ~1250.
 */

/** The game's colours for floating text: score in blue, growth in red. */
export const SCORE_INK: TextInk = { fill: '#1f3f8a', halo: INK_ON_PAPER.halo };
export const GROWTH_INK: TextInk = { fill: '#a3342b', halo: INK_ON_PAPER.halo };

/** A floating game text ("Bigger!", "+10 ×2", "INK FRENZY!") centred at (x, y). */
export function drawFloatText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number, colours: TextInk): void {
  drawTextLine(ctx, text, Math.max(size * 2, Math.min(VIDEO.width - size * 2, x)), y, size, 700, alpha, colours);
}

/** A floating text's life: risen (0 .. 1) and visible (0 .. 1), `since` seconds after it appears, over `life` seconds; null once gone. */
export function floatLife(since: number, life = 0.7): { readonly rise: number; readonly alpha: number } | null {
  if (since < 0 || since >= life) return null;
  const s = since / life;
  return { rise: 1 - (1 - s) ** 2, alpha: Math.min(1, since / 0.08) * (1 - Math.max(0, (s - 0.65) / 0.35)) };
}

/** A hand-inked box: each side a little wobbly, the same every frame. */
function wobblyBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const rng = createRng(31);
  const j = (): number => (rng() - 0.5) * 3;
  ctx.beginPath();
  ctx.moveTo(x + j(), y + j());
  ctx.quadraticCurveTo(x + w / 2, y + j(), x + w + j(), y + j());
  ctx.quadraticCurveTo(x + w + j(), y + h / 2, x + w + j(), y + h + j());
  ctx.quadraticCurveTo(x + w / 2, y + h + j(), x + j(), y + h + j());
  ctx.quadraticCurveTo(x + j(), y + h / 2, x + j(), y + j());
  ctx.stroke();
}

export const BAR = { x: 300, y: 1140, w: 600, h: 26 } as const;

export interface BarState {
  /** 0 .. 1 full. */
  readonly fill: number;
  readonly alpha: number;
  /** Growth-stage marks along the bar, 0 .. 1. */
  readonly marks: readonly number[];
  /** The thinner red combo bar under it (the game shows it while a frenzy runs), 0 .. 1; 0 hides it. */
  readonly combo?: number;
}

/** The game's growth bar, with your fish (`icon`, drawn as `shape`) beside it. */
export function drawGrowthBar(ctx: CanvasRenderingContext2D, icon: Sprite, shape: FishShape, bar: BarState, t: number): void {
  if (bar.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = bar.alpha;
  ctx.fillStyle = 'rgba(255,250,240,0.9)';
  ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
  ctx.fillStyle = 'rgba(52,102,194,0.6)';
  ctx.fillRect(BAR.x, BAR.y, BAR.w * bar.fill, BAR.h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  for (const m of bar.marks) {
    ctx.beginPath();
    ctx.moveTo(BAR.x + BAR.w * m, BAR.y - 6);
    ctx.lineTo(BAR.x + BAR.w * m, BAR.y + BAR.h + 6);
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  wobblyBox(ctx, BAR.x, BAR.y, BAR.w, BAR.h);
  if (bar.combo && bar.combo > 0) {
    ctx.fillStyle = 'rgba(163,52,43,0.6)';
    ctx.fillRect(BAR.x, BAR.y + BAR.h + 10, BAR.w * bar.combo, 9);
    ctx.lineWidth = 2;
    wobblyBox(ctx, BAR.x, BAR.y + BAR.h + 10, BAR.w, 9);
  }
  ctx.restore();
  const pose: Pose = { j: 0, age: 0, shape, x: BAR.x - 70, y: BAR.y + BAR.h / 2, length: 100, facing: 1, tilt: 0, beat: 0, effort: 0 };
  drawSwimmer(ctx, icon, pose, Math.floor(t * BOIL_FPS + 1e-6), { alpha: bar.alpha });
}

const CREDIT = { text: 'InkFish · 16bit.ink', y: 1228, size: 56 } as const;

/** The game and where to play it, small under the bar, in every frame of every gameplay short. */
export function drawCredit(ctx: CanvasRenderingContext2D, colours: TextInk = INK_ON_PAPER): void {
  drawTextLine(ctx, CREDIT.text, VIDEO.width / 2, CREDIT.y, CREDIT.size, 700, 0.8, colours);
}
