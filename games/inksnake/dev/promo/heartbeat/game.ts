import { BLUE, INK } from '../../../src/art/palette';
import { SNAKE_W } from '../../../src/art/types';
import { route } from '../krait/path';
import { lerp, ramp, VIDEO } from '../short';
import { drawBody, drawBodyShadow, drawSprite, type Pt, taper } from '../sprites';
import type { Cast, GameCast } from './cast';
import { HEART_AT } from './coils';
import { HEART_W } from './heartArt';
import { BLOOM_AT, coilProgress, GAME_AT, gameSqueeze, LOOP_S, preyGlow, pulseAt, ringAt } from './story';

/**
 * The real game: chapter 1's "Rat Run", the board as the game paints it, the
 * corn snake (the game's strip and head, at game proportions) closing a loop
 * round a rat, the game's blue dotted ring showing as it's about to close,
 * then two squeezes. The body lies along the trail behind the head, as in
 * the game. In the last moments the camera sinks onto the prey, and the
 * heart's glow rises in it, ready to bloom into frame 1.
 */
const RAT_AT: Pt = { x: 640, y: 212 };
const LOOP_R = 62;
const SNAKE_WIDE = 17;
const LENGTH = 470;
const ZOOM = 3.6;
/** The rat's size on the board, as the game draws it. */
const RAT_SCALE = 1;

const TURN_FROM = 0.95;
/** The trail: in from the south, once round the rat, the head back at its own body. */
const LOOP_POINTS: readonly Pt[] = Array.from({ length: 24 }, (_, i) => {
  const a = TURN_FROM * Math.PI + (i / 23) * Math.PI * 2.1;
  return { x: RAT_AT.x + Math.cos(a) * LOOP_R, y: RAT_AT.y + Math.sin(a) * LOOP_R };
});
const TRAIL = route([{ x: 470, y: 560 }, { x: 500, y: 450 }, { x: 540, y: 350 }, { x: 556, y: 280 }, ...LOOP_POINTS]);
const HEAD_FROM = TRAIL.length - 2 * Math.PI * LOOP_R * 1.02;

interface Cam {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** The rat at the upper middle, under the words; then it sinks to where frame 1's heart is, as the camera closes in. */
function camAt(t: number): Cam {
  const sink = ramp(t, 12.45, LOOP_S);
  const zoom = lerp(ZOOM, 6.4, sink);
  const y = lerp(750, HEART_AT.y, ramp(t, 12.45, BLOOM_AT + 0.25));
  return { x: RAT_AT.x + 0, y: RAT_AT.y - (y - VIDEO.height / 2) / zoom, zoom };
}

const toScreen = (c: Cam, p: Pt): Pt => ({ x: (p.x - c.x) * c.zoom + VIDEO.width / 2, y: (p.y - c.y) * c.zoom + VIDEO.height / 2 });

/** A trail point pulled in towards the rat by the squeeze (only the loop itself). */
function squeezed(p: Pt, sq: number): Pt {
  const dx = p.x - RAT_AT.x;
  const dy = p.y - RAT_AT.y;
  const r = Math.hypot(dx, dy);
  const inLoop = 1 - ramp(r, LOOP_R + 18, LOOP_R + 110);
  const k = 1 - 0.36 * sq * inLoop;
  return { x: RAT_AT.x + dx * k, y: RAT_AT.y + dy * k };
}

function ring(ctx: CanvasRenderingContext2D, at: Pt, r: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 7;
  ctx.setLineDash([3, 22]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The heart's light rising in the prey. */
function preyHeart(ctx: CanvasRenderingContext2D, cast: Cast, at: Pt, cam: Cam, t: number, boil: number): void {
  const glow = preyGlow(t);
  if (glow <= 0) return;
  const size = (14 + 16 * glow) * cam.zoom * (1 + 0.18 * pulseAt(t));
  const g = ctx.createRadialGradient(at.x, at.y, 8, at.x, at.y, size * 2.6);
  g.addColorStop(0, `rgba(255,60,40,${0.8 * glow})`);
  g.addColorStop(1, 'rgba(255,30,20,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(at.x - size * 3, at.y - size * 3, size * 6, size * 6);
  ctx.restore();
  drawSprite(ctx, cast.heart.live, boil, { x: at.x, y: at.y, scale: (size * 1.2) / HEART_W, alpha: glow });
}

/** The corn snake along its trail, as the game lays it: shadow, strip, head. */
function drawSnake(ctx: CanvasRenderingContext2D, game: GameCast, cam: Cam, headS: number, sq: number, boil: number): void {
  const n = Math.ceil(LENGTH / 3);
  const spine: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * LENGTH;
    spine.push(toScreen(cam, squeezed(TRAIL.at(headS - d), sq)));
    widths.push(SNAKE_WIDE * taper(d / LENGTH) * cam.zoom);
  }
  const pose = { spine, widths, along: (SNAKE_WIDE * cam.zoom) / SNAKE_W };
  drawBodyShadow(ctx, pose, SNAKE_WIDE * cam.zoom);
  drawBody(ctx, game.strip, boil, pose);
  const h = spine[0]!;
  const back = spine[8]!;
  drawSprite(ctx, game.head, boil, { x: h.x, y: h.y, scale: (SNAKE_WIDE / SNAKE_W) * cam.zoom, rotation: Math.atan2(h.y - back.y, h.x - back.x) });
}

/** The game shot at t. */
export function drawGameShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const game = cast.game;
  const cam = camAt(t);
  const sq = gameSqueeze(t);
  const p = coilProgress(t);
  const headS = lerp(HEAD_FROM, TRAIL.length - 3, p);
  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const tl = toScreen(cam, { x: 0, y: 0 });
  ctx.drawImage(game.board, tl.x, tl.y, (game.board.width / game.res) * cam.zoom, (game.board.height / game.res) * cam.zoom);
  const rat = toScreen(cam, RAT_AT);
  const pose = sq > 0 ? 'idle' : boil % 2 === 0 ? 'run0' : 'run1';
  const wriggle = sq > 0 ? 0.05 * Math.sin((t - GAME_AT) * 40) * (1 - sq * 0.4) : 0;
  drawSprite(ctx, game.rat[pose], boil, { x: rat.x, y: rat.y, scale: cam.zoom * RAT_SCALE * (1 - 0.1 * sq), rotation: -0.5 + wriggle });
  drawSnake(ctx, game, cam, headS, sq, boil);
  const a = ringAt(t);
  if (a > 0) ring(ctx, rat, 32 * cam.zoom, 0.85 * a);
  preyHeart(ctx, cast, rat, cam, t, boil);
  ctx.restore();
}

