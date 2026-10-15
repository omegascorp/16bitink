import { INK } from '../../../src/art/pen';
import { CAPTION_FONT } from '../captions';
import type { InkButton } from './story';

/**
 * The game's ink button (HudScene.makeAbilityButton): a paper disc with an
 * inked rim and "ink" in blue ink. While it recharges it fades to 0.45 and a
 * blue ring fills round it. Drawn at 1.5x the game's size for a phone video.
 */
export const BUTTON = { x: 170, y: 1160, r: 66 } as const;

const BLUE_INK = '#1f3f8a';
const RING = 'rgba(52,102,194,0.9)';

export function drawInkButton(ctx: CanvasRenderingContext2D, b: InkButton): void {
  const scale = 1 - 0.12 * b.press + 0.08 * b.pulse;
  const r = BUTTON.r * scale;
  ctx.save();
  ctx.globalAlpha = b.ready >= 1 ? 1 : 0.45;
  ctx.fillStyle = 'rgba(255,250,240,0.85)';
  ctx.beginPath();
  ctx.arc(BUTTON.x, BUTTON.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  if (b.ready < 1) {
    ctx.strokeStyle = RING;
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(BUTTON.x, BUTTON.y, r * 0.86, -Math.PI / 2, -Math.PI / 2 + b.ready * Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = BLUE_INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(46 * scale)}px ${CAPTION_FONT}`;
  ctx.fillText('ink', BUTTON.x, BUTTON.y - 2);
  ctx.restore();
  if (b.ripple === null) return;
  // The tap: a ring spreading from the button.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.6 * (1 - b.ripple);
  ctx.lineWidth = 4 * (1 - b.ripple) + 1;
  ctx.beginPath();
  ctx.arc(BUTTON.x, BUTTON.y, BUTTON.r * (1 + 0.9 * b.ripple), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
