import { drawCrabBack, drawCrabFront, PLAYER_COLORS } from '../../../src/art/crabArt';
import { FRAME, GROUND } from '../../../src/art/frame';
import { drawFood, FOOD_FRAME, FOOD_GROUND } from '../../../src/art/itemArt';
import { INK, RED } from '../../../src/art/palette';
import { clamp01, smooth } from '../short';
import { bakeSprite, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import {
  armourAt, CRUMBS, crumbAt, HERMIT, hermitAlphaAt, hermitSizeAt, nakedAt, SHELLS, shellAt, type ShellStep, strainAt,
} from './story';

/**
 * The young coconut crab: the game's own hermit crab (the player), first in
 * a periwinkle, then moving up a snail shell, a whelk and a conch as it
 * grows (each new shell drops in as the old one is pushed out behind), until
 * it pops out of the last one, soft and red-inked as the game draws a crab
 * out of its shell, its coiled tail showing; then its back hardens, plate
 * by plate, as an adult coconut crab's does.
 */
export interface HermitSprites {
  readonly back: Sprite;
  readonly front: Sprite;
  readonly nakedBack: Sprite;
  readonly nakedFront: Sprite;
  readonly shells: Readonly<Record<ShellStep, Sprite>>;
  readonly crumb: Sprite;
}

export function makeHermit(): HermitSprites {
  return {
    back: crabSprite('back'),
    front: crabSprite('front'),
    // Out of its shell for good: its soft tail shows (as the game draws a rival turned out).
    nakedBack: bakeSprite(FRAME, 4, GROUND, 120, (d) => drawCrabBack(d, true, PLAYER_COLORS, true), RED),
    nakedFront: crabSprite('front', 4, true),
    shells: { periwinkle: shellSprite('periwinkle'), snail: shellSprite('snail'), whelk: shellSprite('whelk'), conch: shellSprite('conch') },
    crumb: bakeSprite(FOOD_FRAME, 4, FOOD_GROUND, 500, (d) => drawFood(d, 'crumb')),
  };
}

/** Where its coiled tail sits, in the drawing's units from the frame's centre (crabArt's COIL), and its shield. */
const COIL = { x: -1, y: 27, r: 19 } as const;
const SHIELD = { x: 30, y: 8, rx: 11, ry: 9 } as const;
const PLATE = '#5b5799';

/** A point of the crab's drawing on screen, for a crab of size `s` standing at the hermit's spot. */
export const onCrab = (lx: number, ly: number, s: number): { readonly x: number; readonly y: number } => ({
  x: HERMIT.x + lx * s,
  y: HERMIT.ground + (ly - GROUND) * s,
});

/** Its soft tail and back covered in hard plates, `a` 0 .. 1, top to bottom. */
function drawPlates(ctx: CanvasRenderingContext2D, s: number, a: number, alpha: number): void {
  if (a <= 0 || alpha <= 0) return;
  const c = onCrab(COIL.x, COIL.y, s);
  const r = COIL.r * s;
  const bands = 5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, r * 1.02, r * 0.98, 0, 0, Math.PI * 2);
  ctx.clip();
  for (let k = 0; k < bands; k++) {
    const u = clamp01(a * (bands + 1) - k);
    if (u <= 0) continue;
    const y0 = c.y - r + (k * 2 * r) / bands;
    const h = (2 * r) / bands + 4;
    ctx.save();
    ctx.globalAlpha *= smooth(u);
    ctx.beginPath();
    ctx.ellipse(c.x, y0 + h / 2, r * 1.1, h * 0.62, 0, Math.PI, 0);
    ctx.lineTo(c.x + r * 1.1, y0 + h);
    ctx.lineTo(c.x - r * 1.1, y0 + h);
    ctx.closePath();
    ctx.fillStyle = PLATE;
    ctx.globalAlpha *= 0.85;
    ctx.fill();
    ctx.globalAlpha /= 0.85;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2.5, s * 1.4);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  const shield = clamp01(a * 3 - 1.2);
  if (shield > 0) {
    const p = onCrab(SHIELD.x, SHIELD.y, s);
    ctx.save();
    ctx.globalAlpha = alpha * smooth(shield);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, SHIELD.rx * s, SHIELD.ry * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = PLATE;
    ctx.globalAlpha *= 0.8;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2.5, s * 1.4);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawHermit(ctx: CanvasRenderingContext2D, sp: HermitSprites, t: number, boil: number): void {
  const alpha = hermitAlphaAt(t);
  if (alpha <= 0) return;
  const s = hermitSizeAt(t);
  const naked = nakedAt(t);
  const at = { x: HERMIT.x, y: HERMIT.ground, scale: s };

  CRUMBS.forEach((c, i) => {
    const left = crumbAt(i, t);
    if (left !== null && left > 0) drawSprite(ctx, sp.crumb, boil, { x: HERMIT.x + c.dx, y: HERMIT.ground, scale: 1.5 * (0.4 + 0.6 * left), alpha: alpha * clamp01(left * 3) });
  });

  // Shells on their way out first, behind everything.
  SHELLS.forEach((step, i) => {
    const st = shellAt(i, t);
    if (!st || st.out <= 0) return;
    const last = i === SHELLS.length - 1;
    const u = smooth(st.out);
    drawSprite(ctx, sp.shells[step.kind], boil, last
      ? { x: HERMIT.x - 300 * u, y: HERMIT.ground - 260 * Math.sin(Math.PI * Math.min(1, st.out * 1.1)) * 0.9, scale: step.size, rotation: -3.4 * u, alpha: alpha * (1 - st.out * st.out) }
      : { x: HERMIT.x - 170 * step.size * u, y: HERMIT.ground, scale: step.size, rotation: -0.5 * u, alpha: alpha * (1 - u) });
  });

  if (naked < 1) {
    ctx.save();
    ctx.globalAlpha = alpha * (1 - naked);
    drawSprite(ctx, sp.back, boil, at);
    SHELLS.forEach((step, i) => {
      const st = shellAt(i, t);
      if (!st || st.out > 0) return;
      const drop = i === 0 ? 0 : smooth(st.drop);
      const wobble = i === SHELLS.length - 1 ? 0.07 * strainAt(t) * Math.sin(2 * Math.PI * 7 * t) : 0;
      drawSprite(ctx, sp.shells[step.kind], boil, { x: HERMIT.x, y: HERMIT.ground - 460 * drop, scale: step.size, rotation: wobble + 0.4 * drop });
    });
    drawSprite(ctx, sp.front, boil, at);
    ctx.restore();
  }
  if (naked > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * naked;
    drawSprite(ctx, sp.nakedBack, boil, at);
    drawSprite(ctx, sp.nakedFront, boil, at);
    ctx.restore();
    drawPlates(ctx, s, armourAt(t), alpha * naked);
  }
}
