import { INK } from '../../../src/art/pen';
import { ART_RES, drawHook } from '../../../src/art/propArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { wormPath } from '../../../src/scenes/game/worm';
import { HOOK_X, LINE_TOP_Y, REST_EYE_Y, RIG, type Rig } from './story';

/**
 * The game's hook rig at RIG times its in-game size: the dotted warning
 * line, the line itself, the hook drawing and the live worm (the game's own
 * wriggle from scenes/game/worm.ts, drawn here with a 2D canvas instead of
 * Phaser graphics).
 */

const HOOK_RES = 4;
/** The hook texture is 48 x 76 game px; the game hangs it from its eye at (0.66, 0.05) of that. */
const HOOK_TEX = { w: 48, h: 76 } as const;
const HOOK_ORIGIN = { x: 0.66 * 48, y: 0.05 * 76 } as const;
/** The worm hangs this far below the eye (worm.ts HOOK_EYE), game px. */
const WORM_AT = { x: 0, y: 2 } as const;

/** The hook drawing, one per boil frame, with the game's seeds (textures.ts). */
export function makeHookFrames(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const canvas = document.createElement('canvas');
    canvas.width = HOOK_TEX.w * HOOK_RES;
    canvas.height = HOOK_TEX.h * HOOK_RES;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(HOOK_RES / ART_RES, HOOK_RES / ART_RES);
    drawHook(ctx, 101 + f * 977);
    return canvas;
  });
}

/** The game's pencil guide: dots growing down the line's path ahead of the hook (hazards.ts, 'warn'). */
export function drawWarning(ctx: CanvasRenderingContext2D, reach: number): void {
  const length = REST_EYE_Y - LINE_TOP_Y;
  const gap = 16 * RIG * 0.8;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.45;
  for (let d = 0; d <= length * reach; d += gap) {
    ctx.beginPath();
    ctx.arc(HOOK_X, LINE_TOP_Y + d, 2 * RIG * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The line from the rod above to the hook's eye; `twang` bows it sideways as it snaps taut. */
export function drawLine(ctx: CanvasRenderingContext2D, rig: Rig): void {
  const mid = { x: (HOOK_X + rig.eye.x) / 2 + 2 * rig.twang, y: (LINE_TOP_Y + rig.eye.y) / 2 };
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.6 * RIG * 0.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(HOOK_X, LINE_TOP_Y);
  ctx.quadraticCurveTo(mid.x, mid.y, rig.eye.x, rig.eye.y);
  ctx.stroke();
  ctx.restore();
}

export function drawHookAt(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], boil: number, rig: Rig): void {
  ctx.save();
  ctx.translate(rig.eye.x, rig.eye.y);
  ctx.drawImage(frames[boil % frames.length]!, -HOOK_ORIGIN.x * RIG, -HOOK_ORIGIN.y * RIG, HOOK_TEX.w * RIG, HOOK_TEX.h * RIG);
  ctx.restore();
}

const FLESH = '#c0675d';
const BAND = '#d98b80';
const OUTLINE = '#1b1a1f';

/** Body radius along the worm (0..1), game px: plump in the middle, tapering at both ends (worm.ts). */
const radiusAt = (s: number): number => 1.3 + 2 * Math.sin(Math.PI * Math.min(1, Math.max(0, s)) ** 0.8);

/** The worm threaded on the hook, wriggling on the game's clock: outline, flesh with its paler saddle, segment rings and a wet shine. */
export function drawWorm(ctx: CanvasRenderingContext2D, rig: Rig): void {
  const path = wormPath(rig.wormAge, false);
  const last = path.length - 1;
  const at = (i: number): { x: number; y: number } => ({
    x: rig.eye.x + (WORM_AT.x + path[i]!.x) * RIG,
    y: rig.eye.y + (WORM_AT.y + path[i]!.y) * RIG,
  });
  const dot = (p: { x: number; y: number }, r: number): void => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * RIG, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.save();
  ctx.fillStyle = OUTLINE;
  ctx.globalAlpha = 0.9;
  for (let i = 0; i <= last; i++) dot(at(i), radiusAt(i / last) + 0.8);
  ctx.globalAlpha = 1;
  for (let i = 0; i <= last; i++) {
    const s = i / last;
    ctx.fillStyle = s > 0.22 && s < 0.32 ? BAND : FLESH;
    dot(at(i), radiusAt(s));
  }
  ctx.lineCap = 'round';
  for (let i = 2; i < last; i += 2) {
    const a = at(i - 1);
    const b = at(i + 1);
    const p = at(i);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const r = radiusAt(i / last) * 0.9 * RIG;
    ctx.strokeStyle = OUTLINE;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 0.6 * RIG;
    ctx.beginPath();
    ctx.moveTo(p.x - nx * r, p.y - ny * r);
    ctx.lineTo(p.x + nx * r, p.y + ny * r);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff4ea';
    ctx.beginPath();
    ctx.arc(p.x - nx * r * 0.45, p.y - ny * r * 0.45, 0.45 * RIG, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
