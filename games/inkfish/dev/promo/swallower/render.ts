import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine, type TextInk } from '../captions';
import { drawCallout, fontOf, PAPER_ON_INK } from '../gulper/scenery';
import { VIDEO, type Short } from '../short';
import { renderSwallowerAudio } from './audio';
import { drawMackerel } from './mackerel';
import {
  drawDashedOpen, drawPool, drawRays, drawRing, drawSkyLabel, drawSnow, drawSurface, drawVignette, drawWater, INK_BG, makeSheet, SPOKEN, waterlineY,
} from './scenery';
import {
  boilAt, type Camera, cameraAt, captionAt, cmAt, coilTrace, compareAt, eyeRing, LOOP_S, mealAt, metresAt, nameAt, placeAt, popAt, type Pose, raysAt, readoutAt,
  replayAt, shakeAt, stomachRing, swallowerAt, swallowTime, toScreen, xrayAt, yearAt, lightAt,
} from './story';
import { BODY_LEN, K, lipsAt, MACK_H, MACKEREL_LEN, mackerelAt, type MealPose, type Pt, sacAt, SPINE_N, type SpineSample, SWALLOWER_LEN } from './swallow';
import { mackerelProfile } from './anatomy';
import {
  clipToMouth, drawBody, drawJaws, drawMouthInside, drawSacInside, drawSacSkin, drawThroatShadow, eyeAt, makeSwallowerSprite, type SwallowerSprite,
} from './swallowerArt';

/** Draws the "this fish swallowed a fish four times its length" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
const CAPTION_MAX_W = 980;
const TOP_Y = 372;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = fontOf(CAPTION_SIZE);
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** The swallower's frame on screen: from local px (origin at its snout) to screen px. */
interface Placement {
  readonly cx: number;
  readonly cy: number;
  readonly cos: number;
  readonly sin: number;
  readonly zoom: number;
  /** Squash across the body as it rolls belly up (1 upright, -1 belly up). */
  readonly flip: number;
}

function placementOf(p: Pose, cam: Camera, jolt: Pt): Placement {
  const c = toScreen(cam, p);
  return { cx: c.x + jolt.x, cy: c.y + jolt.y, cos: Math.cos(-p.tilt), sin: Math.sin(-p.tilt), zoom: cam.zoom, flip: Math.cos(Math.PI * p.roll) };
}

const onScreen = (pl: Placement, q: Pt): Pt => {
  const x = (q.x + BODY_LEN / 2) * pl.zoom;
  const y = q.y * pl.zoom * pl.flip;
  return { x: pl.cx + x * pl.cos - y * pl.sin, y: pl.cy + x * pl.sin + y * pl.cos };
};

function enter(ctx: CanvasRenderingContext2D, pl: Placement): void {
  ctx.translate(pl.cx, pl.cy);
  ctx.rotate(Math.atan2(pl.sin, pl.cos));
  ctx.scale(pl.zoom, pl.zoom * pl.flip);
  ctx.translate(BODY_LEN / 2, 0);
}

/** The swallower and its meal, layer by layer: the stomach and what's in it, the mouth and what's going in, the body over them, the jaws. */
function drawSwallower(ctx: CanvasRenderingContext2D, sprite: SwallowerSprite, pl: Placement, pose: Pose, meal: MealPose, spine: readonly SpineSample[], boil: number, xray: number): void {
  const lips = lipsAt(meal.jaw);
  const sac = sacAt(meal.fill);
  ctx.save();
  enter(ctx, pl);
  drawSacInside(ctx, sac, xray);
  ctx.save();
  ctx.beginPath();
  sac.outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  drawMackerel(ctx, spine, { boil, lw: K, alpha: 0.9 });
  ctx.restore();
  drawSacSkin(ctx, sac, xray, boil);
  drawMouthInside(ctx, lips);
  if (meal.fold < 1) {
    ctx.save();
    clipToMouth(ctx, lips);
    drawMackerel(ctx, spine, { boil, lw: K });
    drawThroatShadow(ctx, lips);
    ctx.restore();
  }
  drawBody(ctx, sprite, { boil, jaw: meal.jaw, beat: pose.beat, wag: pose.wag });
  drawJaws(ctx, lips, boil);
  ctx.restore();
}

/** A straight mackerel, nose to the right, centred on the origin: the size comparison's. */
function straightMackerel(): SpineSample[] {
  return Array.from({ length: SPINE_N + 1 }, (_, i) => {
    const s = i / SPINE_N;
    return { s, x: (0.5 - s) * MACKEREL_LEN, y: 0, h: MACK_H * mackerelProfile(s), depth: -MACKEREL_LEN };
  });
}

/** The size comparison: a mackerel along the top, four swallowers popping up under it, one a word. */
function drawCompare(ctx: CanvasRenderingContext2D, sprite: SwallowerSprite, spine: readonly SpineSample[], t: number, boil: number): void {
  const show = compareAt(t);
  if (show <= 0) return;
  const width = 860;
  const k = width / MACKEREL_LEN;
  ctx.save();
  ctx.globalAlpha = show;
  drawPool(ctx, { x: 540, y: 390 }, 520, 0.9);
  ctx.save();
  ctx.translate(540, 330);
  ctx.scale(k, k);
  drawMackerel(ctx, spine, { boil, lw: K });
  ctx.restore();
  const each = (width * SWALLOWER_LEN) / MACKEREL_LEN;
  for (let i = 0; i < 4; i++) {
    const pop = popAt(t, i);
    if (pop <= 0) continue;
    const s = (each / SWALLOWER_LEN) * pop;
    const x = 540 - width / 2 + each * (i + 0.5);
    ctx.save();
    ctx.globalAlpha = show * Math.min(1, pop);
    ctx.translate(x + (SWALLOWER_LEN / 2) * s, 410);
    ctx.scale(s, s);
    drawBody(ctx, sprite, { boil, jaw: 0, beat: 0, wag: 0 });
    ctx.restore();
    drawTextLine(ctx, String(i + 1), x, 478, 50 * Math.min(1.2, pop), 700, show * Math.min(1, pop), { fill: SPOKEN, halo: INK_BG });
  }
  ctx.restore();
}

/** Depth, ticking as it sinks. */
function drawReadout(ctx: CanvasRenderingContext2D, t: number): void {
  const show = readoutAt(t);
  if (show <= 0) return;
  const metres = Math.round(metresAt(t) / 10) * 10;
  drawTextLine(ctx, `${metres.toLocaleString('en-US')} m`, VIDEO.width / 2, TOP_Y + 8, 124, 700, show, PAPER_ON_INK);
  drawTextLine(ctx, 'down', VIDEO.width / 2, TOP_Y + 80, 60, 700, 0.8 * show, PAPER_ON_INK);
}

export function createSwallower(ctx: CanvasRenderingContext2D): Short {
  const sheet = makeSheet();
  const sprite = makeSwallowerSprite();
  const straight = straightMackerel();

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const loop = t / LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const light = lightAt(cam);
    drawWater(ctx, sheet, light);
    drawRays(ctx, cam, light * raysAt(t), loop);
    drawSurface(ctx, cam, boil, loop);
    drawSnow(ctx, cam, loop, light);

    const jolt = shakeAt(t);
    const xray = xrayAt(t);
    const fish: { readonly pose: Pose; readonly replay: boolean }[] = [{ pose: swallowerAt(t), replay: false }];
    const replay = replayAt(t);
    if (replay) fish.push({ pose: replay, replay: true });
    const placed = fish.map((f) => {
      const u = swallowTime(t, f.replay);
      const meal = mealAt(f.replay ? 0 : t, u);
      return { ...f, meal, pl: placementOf(f.pose, cam, jolt), ...mackerelAt(meal) };
    });
    for (const f of placed) {
      const c = onScreen(f.pl, { x: -BODY_LEN * 0.45, y: 60 });
      if (c.y < -900 || c.y > VIDEO.height + 900) continue;
      drawPool(ctx, c, 620 * cam.zoom, 1 - 0.5 * light);
      drawSwallower(ctx, sprite, f.pl, f.pose, f.meal, f.spine, boil, f.replay ? 0 : xray);
    }
    drawVignette(ctx, light);

    const main = placed[0]!;
    // The tracer round the coil, on "coiled".
    const trace = coilTrace(t);
    if (trace.alpha > 0) drawDashedOpen(ctx, main.coil.map((p) => onScreen(main.pl, p)), trace.drawn, trace.alpha, SPOKEN, 7);
    drawCompare(ctx, sprite, straight, t, boil);
    const name = nameAt(t);
    if (name > 0) {
      const head = onScreen(main.pl, { x: -30, y: -30 });
      drawCallout(ctx, 'black swallower', { x: Math.min(740, head.x + 240), y: head.y - 170 }, head, name, 84);
    }
    drawReadout(ctx, t);
    const year = yearAt(t);
    if (year > 0) drawTextLine(ctx, '2007', VIDEO.width / 2, TOP_Y + 20, 130, 700, year, PAPER_ON_INK);
    const place = placeAt(t);
    if (place > 0) {
      const wl = waterlineY(cam);
      drawSkyLabel(ctx, 'Cayman Islands', 330, Math.max(330, wl - 120), 76, place);
      drawSkyLabel(ctx, '2007', 330, Math.max(400, wl - 45), 66, place);
    }
    const cm = cmAt(t);
    if (cm > 0) {
      const sac = sacAt(main.meal.fill);
      const c = onScreen(main.pl, { x: sac.cx, y: sac.cy });
      const r = sac.r * cam.zoom;
      drawCallout(ctx, '86 cm', { x: c.x + r + 150, y: c.y - r * 0.45 }, { x: c.x + r * 0.8, y: c.y - r * 0.2 }, cm, 120, { fill: SPOKEN, halo: INK_BG });
      drawTextLine(ctx, 'fish', Math.min(960, c.x + r + 150), c.y - r * 0.45 + 80, 80, 700, cm, { fill: SPOKEN, halo: INK_BG });
    }
    const eye = eyeRing(t);
    if (eye.alpha > 0) {
      const e = eyeAt(main.meal.jaw);
      const at = onScreen(main.pl, e.at);
      drawRing(ctx, at, e.r * 2.2 * cam.zoom, e.r * 2.2 * cam.zoom, eye.drawn, eye.alpha, 5);
      drawCallout(ctx, 'eyes', { x: at.x + 150, y: at.y + 170 }, { x: at.x + e.r * 1.6 * cam.zoom, y: at.y + e.r * 1.6 * cam.zoom }, eye.alpha * Math.min(1, eye.drawn * 2), 72);
    }
    const belly = stomachRing(t);
    if (belly.alpha > 0) {
      const sac = sacAt(main.meal.fill);
      const at = onScreen(main.pl, { x: sac.cx, y: sac.cy });
      const r = (sac.r + 26) * cam.zoom;
      drawRing(ctx, at, r, r, belly.drawn, belly.alpha, 7);
      drawTextLine(ctx, 'stomach', at.x, Math.max(330, at.y - r - 30), 84, 700, belly.alpha * Math.min(1, belly.drawn * 2), { fill: SPOKEN, halo: INK_BG });
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSwallowerAudio };
}
