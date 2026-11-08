import { drawFood, FOOD_FRAME, FOOD_GROUND } from '../../../src/art/itemArt';
import { osprey } from '../../../src/art/birds/osprey';
import { CRITTER_FRAME, CRITTER_GROUND } from '../../../src/art/critterArt';
import { BOIL, INK, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { glowBehind } from '../manowar/marks';
import { VIDEO, type Short } from '../short';
import { bakeSprite, boilAt, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { renderBirdSnatchAudio } from './audio';
import { makeBeach } from './scene';
import {
  AIM_X, alarmAt, captionAt, CAPTION_Y, CRAB, GROUND_Y, hiddenAt, hopAt, LOOP_S, ospreyAt, OSPREY_SCALE, rattleAt, shadowAt, STRIKE, strikeAt, tauOf, AT,
} from './story';

/** Draws "This crab hid from an osprey" (story.ts has the choreography). */

const FLAP_FPS = 10;
/** The game's own wingbeat frame for an osprey hovering. */
const flapAt = (t: number): number => Math.floor(t * FLAP_FPS + 1e-9) % BOIL;
/** Where the held crumb sits, from the crab's ground point, in the crab's own units. */
const SNACK = { x: 114, centre: 66 } as const;
const SNACK_SCALE = 5.6;
/** From the ground point to the shell's middle, in the crab's own units. */
const SHELL_MIDDLE = 34;

interface Kit {
  readonly beach: HTMLCanvasElement;
  readonly hover: Sprite;
  readonly dive: Sprite;
  readonly back: Sprite;
  readonly shell: Sprite;
  readonly front: Sprite;
  readonly snack: Sprite;
}

const makeKit = (): Kit => ({
  beach: makeBeach(),
  // Red-inked, as the game draws a bird that can catch the player.
  hover: bakeSprite(CRITTER_FRAME, 7, CRITTER_GROUND, 890, (d) => osprey(d, false), RED),
  dive: bakeSprite(CRITTER_FRAME, 7, CRITTER_GROUND, 890, (d) => osprey(d, true), RED),
  back: crabSprite('back', 4),
  shell: shellSprite('whelk', 4),
  front: crabSprite('front', 4),
  snack: bakeSprite(FOOD_FRAME, 5, FOOD_GROUND, 55, (d) => drawFood(d, 'crumb')),
});

/** The red warning ring the game casts on the sand under a bird about to stoop (BirdsView.shadow), at video size. */
function drawShadow(ctx: CanvasRenderingContext2D, tau: number, time: number): void {
  const s = shadowAt(tau);
  if (s.alpha <= 0) return;
  const ry = Math.max(8, s.rx * 0.22);
  const y = GROUND_Y + 6;
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.fillStyle = RED;
  ctx.globalAlpha = s.alpha * (0.16 + 0.26 * s.settle);
  ctx.beginPath();
  ctx.ellipse(AIM_X, y, s.rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = s.alpha * (0.55 + 0.3 * Math.sin(time * 11));
  ctx.strokeStyle = RED;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const dashes = 16;
  for (let i = 0; i < dashes; i++) {
    const a0 = (i / dashes) * Math.PI * 2 + time * 1.1;
    const a1 = a0 + Math.PI / dashes;
    ctx.beginPath();
    ctx.ellipse(AIM_X, y, s.rx, ry, 0, a0, a1);
    ctx.stroke();
  }
  ctx.restore();
}

/** The osprey, its sprite turned about its middle. */
function drawOsprey(ctx: CanvasRenderingContext2D, kit: Kit, tau: number, t: number, boil: number): void {
  const p = ospreyAt(tau);
  if (!p.visible) return;
  const s = OSPREY_SCALE;
  const ground = { x: p.x - Math.sin(p.tilt) * CRITTER_GROUND * s, y: p.y + Math.cos(p.tilt) * CRITTER_GROUND * s };
  const at = { ...ground, scale: s, rotation: p.tilt, facing: -1 };
  if (p.dive < 1) drawSprite(ctx, kit.hover, flapAt(t), { ...at, alpha: 1 - p.dive });
  if (p.dive > 0) drawSprite(ctx, kit.dive, boil, { ...at, alpha: p.dive });
}

/** Spikes and a flash where the talons strike the shell, and a puff of sand. */
function drawStrike(ctx: CanvasRenderingContext2D, tau: number): void {
  const u = strikeAt(tau);
  if (u < 0) return;
  ctx.save();
  ctx.translate(STRIKE.x, STRIKE.y);
  ctx.lineCap = 'round';
  if (u < 0.3) {
    ctx.globalAlpha = 1 - u / 0.3;
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.arc(0, 0, 40 + u * 260, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.globalAlpha = 1 - u * u;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const r0 = 70 + u * 110;
    const r1 = r0 + 70 * (1 - u);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.8);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.8);
    ctx.stroke();
  }
  ctx.restore();
  // Sand kicked up at the shell's foot.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const r = 18 + (i * 7) % 14 + u * 55;
    ctx.globalAlpha = 0.6 * (1 - u);
    ctx.beginPath();
    ctx.arc(CRAB.x + 30 + side * (110 + i * 22 + u * 90), GROUND_Y - 14 - u * 70 - i * 6, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The crab: shell always, head and claws (and the crumb in the big claw) unless pulled in. */
function drawCrab(ctx: CanvasRenderingContext2D, kit: Kit, tau: number, boil: number): void {
  const hidden = hiddenAt(tau);
  const rot = rattleAt(tau);
  const hop = hopAt(tau);
  const S = CRAB.scale;
  const middle = SHELL_MIDDLE * S;
  const press = tau >= AT.hit && tau < AT.hit + 0.12 ? 0.05 : 0;
  const at = { x: CRAB.x - Math.sin(rot) * middle, y: GROUND_Y - hop - middle + Math.cos(rot) * middle + press * middle, scale: S, rotation: rot };
  const out = Math.min(1, 1 - hidden);
  const shift = -40 * hidden;
  if (out > 0.02) drawSprite(ctx, kit.back, boil, { ...at, alpha: Math.min(1, out * 1.6) });
  drawSprite(ctx, kit.shell, boil, at);
  if (out > 0.02) {
    drawSprite(ctx, kit.front, boil, { ...at, x: at.x + shift, alpha: Math.min(1, out * 1.6) });
    const sway = [0, 3, -2][boil % 3]!;
    const [sx, sy] = [CRAB.x + SNACK.x * S + shift, GROUND_Y - hop - SNACK.centre * S + sway * 1.5];
    glowBehind(ctx, sx, sy, 150, 120, Math.min(1, out * 1.6) * 0.9);
    drawSprite(ctx, kit.snack, boil, { x: sx, y: sy + FOOD_GROUND * SNACK_SCALE, scale: SNACK_SCALE, alpha: Math.min(1, out * 1.6) });
  }
}

/** "!" over the crab as it sees what's coming, in the game's red. */
function drawAlarm(ctx: CanvasRenderingContext2D, tau: number): void {
  const a = alarmAt(tau);
  if (a <= 0) return;
  const pop = 1 + 0.25 * Math.max(0, 1 - (tau - AT.alarm) * 7);
  ctx.save();
  ctx.translate(930, 860);
  ctx.rotate(0.12);
  ctx.scale(pop, pop);
  drawTextLine(ctx, '!', 0, 0, 260, 700, a, { fill: RED, halo: '#fffaf0' });
  ctx.restore();
}

/** Glints off the crumb when the crab is smug about it. */
function drawGlints(ctx: CanvasRenderingContext2D, tau: number): void {
  const u = (tau - (AT.smug + 0.1)) / 0.9;
  if (u < 0 || u > 1) return;
  const S = CRAB.scale;
  ctx.save();
  ctx.translate(CRAB.x + SNACK.x * S, GROUND_Y - SNACK.centre * S);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.globalAlpha = Math.sin(u * Math.PI);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.95 + i * 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 90, Math.sin(a) * 90);
    ctx.lineTo(Math.cos(a) * (130 + 14 * u), Math.sin(a) * (130 + 14 * u));
    ctx.stroke();
  }
  ctx.restore();
}

export function createBirdSnatch(ctx: CanvasRenderingContext2D): Short {
  const kit = makeKit();
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
      const tau = tauOf(t);
      const boil = boilAt(t);
      ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
      ctx.drawImage(kit.beach, 0, 0);
      drawShadow(ctx, tau, t);
      drawCrab(ctx, kit, tau, boil);
      drawOsprey(ctx, kit, tau, t, boil);
      drawStrike(ctx, tau);
      drawAlarm(ctx, tau);
      drawGlints(ctx, tau);
      const caption = captionAt(tau);
      if (caption) drawTextLine(ctx, caption.text, VIDEO.width / 2, CAPTION_Y, caption.size, 700, caption.alpha);
    },
    audio: renderBirdSnatchAudio,
  };
}
