import type { FishShape } from '../../../src/art/fishArt';
import { INK } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import type { Pose } from '../chain';
import { CAPTION_FONT, type TextInk } from '../captions';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';

/**
 * The game's growth bar and combo meter, laid out like its wide-screen HUD:
 * the red combo meter under the growth bar, and the multiplier ("×3 Frenzy")
 * at the end of the meter, so the meter explains itself. A copy of the
 * shared gameplay/hud.ts bar, shortened to leave the label room.
 */

const BAR = { x: 250, y: 1140, w: 500, h: 26 } as const;
const COMBO = { y: BAR.y + BAR.h + 10, h: 10 } as const;

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

export interface ComboHud {
  /** Growth, 0 .. 1, with the stage marks. */
  readonly fill: number;
  readonly marks: readonly number[];
  /** The combo meter, 0 .. 1 (hidden at 0, as in the game). */
  readonly meter: number;
  /** "×3 Frenzy", or '' below ×2. */
  readonly label: string;
  readonly alpha: number;
}

/** One line of the game's handwriting with a solid paper halo, so it reads over fish on a phone. */
export function drawBoldText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number, colours: TextInk, align: CanvasTextAlign = 'center',
): void {
  if (alpha <= 0) return;
  const half = (() => {
    ctx.font = `700 ${size}px ${CAPTION_FONT}`;
    return align === 'center' ? ctx.measureText(text).width / 2 : 0;
  })();
  // Kept inside the frame.
  const cx = align === 'center' ? Math.max(half + 20, Math.min(1060 - half, x)) : x;
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  ctx.strokeStyle = colours.halo;
  ctx.lineWidth = size * 0.26;
  ctx.globalAlpha = alpha;
  ctx.strokeText(text, cx, y);
  ctx.fillStyle = colours.fill;
  ctx.fillText(text, cx, y);
  ctx.restore();
}

export function drawComboHud(
  ctx: CanvasRenderingContext2D, icon: Sprite, shape: FishShape, hud: ComboHud, labelInk: TextInk, t: number,
): void {
  if (hud.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = hud.alpha;
  ctx.fillStyle = 'rgba(255,250,240,0.9)';
  ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
  ctx.fillStyle = 'rgba(52,102,194,0.6)';
  ctx.fillRect(BAR.x, BAR.y, BAR.w * hud.fill, BAR.h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  for (const m of hud.marks) {
    ctx.beginPath();
    ctx.moveTo(BAR.x + BAR.w * m, BAR.y - 6);
    ctx.lineTo(BAR.x + BAR.w * m, BAR.y + BAR.h + 6);
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  wobblyBox(ctx, BAR.x, BAR.y, BAR.w, BAR.h);
  if (hud.meter > 0) {
    ctx.fillStyle = 'rgba(163,52,43,0.6)';
    ctx.fillRect(BAR.x, COMBO.y, BAR.w * hud.meter, COMBO.h);
    ctx.lineWidth = 2;
    wobblyBox(ctx, BAR.x, COMBO.y, BAR.w, COMBO.h);
  }
  ctx.restore();
  if (hud.label) drawBoldText(ctx, hud.label, BAR.x + BAR.w + 18, BAR.y + (BAR.h + 10 + COMBO.h) / 2, 64, hud.alpha, labelInk, 'left');
  const pose: Pose = { j: 0, age: 0, shape, x: BAR.x - 70, y: BAR.y + BAR.h / 2, length: 100, facing: 1, tilt: 0, beat: 0, effort: 0 };
  drawSwimmer(ctx, icon, pose, Math.floor(t * BOIL_FPS + 1e-6), { alpha: hud.alpha });
}

