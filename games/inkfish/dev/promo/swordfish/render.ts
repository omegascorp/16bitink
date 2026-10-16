import { INK } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderSwordfishAudio } from './audio';
import { brainOf, drawCutaway, muscleOf } from './head';
import { COLD_ON_PAPER, drawArrow, drawCallout, drawSeat, drawSnowflake, drawThermometer, EMBER_ON_PAPER, THERMO } from './props';
import {
  brainLabel, captionAt, depthShown, eyeLabel, heaterLit, hookLabel, insetsShown, muscleLabel, nameLabel, seatShown, seatStruck, tempText, tenShown,
  thermoShown,
} from './script';
import {
  boilAt, brainGlowAt, closeAt, deepAt, depthAt, EYE_R_TEX, eyeGlowAt, eyeOf, type Fish, FIFTEEN_AT, frostAt, insetDartAt, LOOP_S, muscleGlowAt, type Prey,
  preyAt, shakeAt, shimmerAt, sunkAt, swordfishAt, tempAt, texScale, wavesAt,
} from './story';
import { drawEyeViews } from './views';
import { drawHotEye, drawMarks, drawShimmer, makeFrost, makeWater } from './water';

/** Draws the "this fish has heated eyes" short (story.ts has the choreography). */

const SPOKEN: TextInk = EMBER_ON_PAPER;
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const LABEL_SIZE = 72;
const SNOWFLAKES = [
  { x: 150, y: 520, r: 34 }, { x: 830, y: 300, r: 24 }, { x: 1000, y: 900, r: 30 }, { x: 105, y: 1010, r: 28 }, { x: 560, y: 330, r: 20 },
] as const;
const SEAT_AT = { x: 245, y: 425 } as const;

const swordPose = (f: Fish): Pose => ({ j: 0, shape: 'swordfish', age: 0, x: f.x, y: f.y, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort });
const preyPose = (p: Prey): Pose => ({ j: 0, shape: 'mackerel', age: 0, x: p.x, y: p.y, length: p.len, facing: 1, tilt: p.tilt, beat: p.beat, effort: 1 });

/** The mackerel darting past, speed lines streaming off behind it. */
function drawDart(ctx: CanvasRenderingContext2D, sprite: Sprite, p: Prey, boil: number): void {
  ctx.save();
  ctx.strokeStyle = '#d8e6f5';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.6;
  [-30, -4, 22].forEach((dy, i) => {
    ctx.beginPath();
    ctx.moveTo(p.x - p.len * (0.55 + 0.1 * i), p.y + dy);
    ctx.lineTo(p.x - p.len * (1.6 + 0.2 * i), p.y + dy + 0.6 * p.tilt * p.len);
    ctx.stroke();
  });
  ctx.restore();
  drawSwimmer(ctx, sprite, preyPose(p), boil);
}

/** The spoken line, word by word, the word being said in ember orange. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : INK_ON_PAPER);
    x += (natural[i]! + space) * k;
  });
}

/** The swordfish, its eye burning, the heat shimmering off it, and (in close) the cutaway of its head. */
function drawSwordfish(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, t: number, boil: number): void {
  drawSwimmer(ctx, sprite, swordPose(f), boil);
  const close = closeAt(f.len);
  drawCutaway(ctx, f, { open: (close - 0.55) / 0.45, muscle: muscleGlowAt(t), waves: wavesAt(t), brain: brainGlowAt(t), loop: t / LOOP_S }, boil);
  const eye = eyeOf(f);
  const r = EYE_R_TEX * texScale(f);
  drawHotEye(ctx, eye, r, eyeGlowAt(t));
  drawShimmer(ctx, eye, r, t / LOOP_S, shimmerAt(t));
}

/** The deep: the depth rolling down, the thermometer falling, frost and snowflakes on "freezing". */
function drawCold(ctx: CanvasRenderingContext2D, frost: readonly HTMLCanvasElement[], t: number, boil: number): void {
  const icy = frostAt(t);
  if (icy > 0) {
    ctx.save();
    ctx.globalAlpha = 0.85 * icy;
    ctx.drawImage(frost[boil]!, 0, 0);
    ctx.restore();
    SNOWFLAKES.forEach((s, i) => drawSnowflake(ctx, s, s.r, (2 * Math.PI * (i % 2 ? 1 : -1) * t) / LOOP_S, icy, boil, 70 + i));
  }
  const depth = depthShown(t);
  if (depth > 0) {
    drawTextLine(ctx, `${depthAt(t)} m deep`, 300, 380, 92, 700, depth);
    drawArrow(ctx, { x: 300, y: 405 }, { x: 300, y: 480 }, depth, boil, 81, INK, 0);
  }
  const shown = thermoShown(t);
  drawThermometer(ctx, tempAt(t), shown, boil);
  const warm = t >= FIFTEEN_AT - 0.05;
  drawTextLine(ctx, tempText(t), THERMO.x - 165, THERMO.bottom - 140, warm ? 104 : 92, 700, shown, warm ? EMBER_ON_PAPER : COLD_ON_PAPER);
}

/** The labels: "heated eyes" in the hook, "swordfish", and the cutaway's "heater muscle", "eye" and "brain". */
function drawLabels(ctx: CanvasRenderingContext2D, f: Fish, t: number, boil: number): void {
  const eye = eyeOf(f);
  const r = EYE_R_TEX * texScale(f);
  drawCallout(ctx, 'heated eyes', { x: 820, y: 545 }, 96, hookLabel(t), EMBER_ON_PAPER, { from: { x: 880, y: 585 }, to: { x: eye.x + r * 1.3, y: eye.y - r * 1.1 } }, boil, 91);
  drawCallout(ctx, 'swordfish', { x: f.x + 30, y: f.y + 0.36 * f.len }, LABEL_SIZE, nameLabel(t), INK_ON_PAPER, null, boil, 92);
  const muscle = muscleOf(f);
  drawCallout(ctx, 'heater muscle', { x: 320, y: 1015 }, LABEL_SIZE, muscleLabel(t), heaterLit(t) > 0.5 ? EMBER_ON_PAPER : INK_ON_PAPER,
    { from: { x: 380, y: 960 }, to: { x: muscle.x - 30, y: muscle.y + 45 } }, boil, 93);
  drawCallout(ctx, 'eye', { x: 880, y: 935 }, LABEL_SIZE, eyeLabel(t), INK_ON_PAPER, { from: { x: 850, y: 880 }, to: { x: eye.x + r * 0.7, y: eye.y + r * 0.9 } }, boil, 94);
  const brain = brainOf(f);
  drawCallout(ctx, 'brain', { x: 240, y: 455 }, LABEL_SIZE, brainLabel(t), INK_ON_PAPER, { from: { x: 260, y: 485 }, to: { x: brain.x - 50, y: brain.y - 30 } }, boil, 95);
}

export function createSwordfish(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const frost = makeFrost();
  const sword = makeSprite('swordfish', 10);
  const mackerel = makeSprite('mackerel', 3);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const f = swordfishAt(t);
    const deep = deepAt(t);
    ctx.drawImage(water.shallow, 0, 0);
    ctx.save();
    ctx.globalAlpha = deep;
    ctx.drawImage(water.deep, 0, 0);
    ctx.restore();
    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    drawMarks(ctx, t / LOOP_S, sunkAt(t), f.len / 720, deep);
    drawSwordfish(ctx, sword, f, t, boil);
    const prey = preyAt(t);
    if (prey) drawDart(ctx, mackerel, prey, boil);
    drawCold(ctx, frost, t, boil);
    drawLabels(ctx, f, t, boil);
    drawEyeViews(ctx, mackerel, insetsShown(t), tenShown(t), insetDartAt(t), t * 45, boil);
    drawSeat(ctx, SEAT_AT, 205, seatShown(t), seatStruck(t), t / LOOP_S, boil);
    ctx.restore();
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSwordfishAudio };
}
