import { drawCritter } from '../../../src/art/critterArt';
import { C, FISH_TEX } from '../../../src/art/fish/kit';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine, type TextInk } from '../captions';
import type { Pose } from '../chain';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderPistolAudio } from './audio';
import { dactylTip, drawPistolClaw, HINGE, JET_FROM, PALM } from './claw';
import { drawArrow, drawBang, drawCallout, drawDashed, drawStars, drawSnapMark, drawSub, drawSun, drawThermometer } from './props';
import { CHALK, drawBubble, drawFlash, drawHeat, drawJet, drawReef, drawShock, drawSpecks, drawVignette, drawWhite, INK_BG, makeWater, PAPER_ON_INK, SPOKEN } from './scenery';
import { captionAt } from './script';
import {
  aheadOf, bangAt, BED, bedShowAt, bedSnapAt, boilAt, bubbleAt, bubbleLabel, burstPointAt, type Camera, cameraAt, clawOpenAt, clawRing, degreesAt, FISH_LEN, fishAt, flashAt,
  heatAt, HOT_C, jetAt, jetFromAt, LOOP_S, onShrimp, pistolLabel, type Pt, shakeAt, shhAt, shockAt, type Shrimp, SHRIMP_K, shrimpAt, snapArrow, starsAt, SUB_LEN, subAt,
  sunAt, thermoAt, toScreen, whiteAt, wwiiLabel,
} from './story';

/** Draws the "this shrimp's snap is almost as hot as the sun" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
const CAPTION_MAX_W = 980;
const TOP_Y = 410;
/** Texture px to sprite px for the close-up shrimp and the bed's. */
const SHRIMP_RES = 4;
const BED_RES = 2;
/** The bed shrimp are baked with their claw, on a canvas wide enough for it: origin this far in from the left. */
const BED_W = 420;
const BED_ORIGIN = 150;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px Caveat`;
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

/** The game's shrimp, one canvas per boil frame. */
function makeShrimpFrames(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(FISH_TEX * SHRIMP_RES, FISH_TEX * SHRIMP_RES);
    ctx.scale(SHRIMP_RES, SHRIMP_RES);
    drawCritter(ctx, 'shrimp', 'light', f, 7 + f * 977);
    return canvas;
  });
}

/** A bed shrimp with its claw shut, one canvas per boil frame. */
function makeBedFrames(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(BED_W * BED_RES, FISH_TEX * BED_RES);
    ctx.scale(BED_RES, BED_RES);
    ctx.translate(BED_ORIGIN - C, 0);
    drawCritter(ctx, 'shrimp', 'light', f, 7 + f * 977);
    ctx.translate(C, C);
    drawPistolClaw(new Pen(ctx, 11 + f * 977, 0.5), 0);
    return canvas;
  });
}

/** Runs `draw` in the shrimp's frame: its drawing's texture px, origin at its centre. */
function inShrimpFrame(ctx: CanvasRenderingContext2D, s: Shrimp, cam: Camera, draw: () => void): void {
  const at = toScreen(cam, s);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(-s.tilt);
  ctx.scale(SHRIMP_K * cam.zoom, SHRIMP_K * cam.zoom);
  draw();
  ctx.restore();
}

const shrimpPoint = (s: Shrimp, cam: Camera, p: Pt): Pt => toScreen(cam, onShrimp(s, p));

function drawBed(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], cam: Camera, t: number, boil: number, row: 0 | 1 | 2): void {
  const show = bedShowAt(t);
  if (show <= 0) return;
  BED.forEach((b, i) => {
    if (b.row !== row) return;
    const at = toScreen(cam, { x: b.x, y: b.y + 90 * (1 - show) });
    const k = (SHRIMP_K * cam.zoom * b.scale) / BED_RES;
    const canvas = frames[(boil + i) % frames.length]!;
    if (at.x < -400 || at.x > VIDEO.width + 400) return;
    ctx.save();
    ctx.globalAlpha = show;
    ctx.translate(at.x, at.y);
    ctx.scale(b.facing * k, k);
    if (row < 2) ctx.filter = `brightness(${row === 1 ? 0.55 : 0.36})`;
    ctx.drawImage(canvas, -BED_ORIGIN * BED_RES, -C * BED_RES);
    ctx.restore();
    const u = bedSnapAt(i, t);
    if (u === null) return;
    const tip = toScreen(cam, { x: b.x + b.facing * (JET_FROM.x + 12) * SHRIMP_K * b.scale, y: b.y + JET_FROM.y * SHRIMP_K * b.scale });
    drawSnapMark(ctx, tip, 60 * b.scale * Math.max(1, cam.zoom * 2.4), u, i % 3 === 0, (i % 2 ? 1 : -1) * 0.15);
  });
}

function drawLabels(ctx: CanvasRenderingContext2D, t: number, s: Shrimp, cam: Camera, open: number): void {
  const pistol = pistolLabel(t);
  if (pistol > 0) {
    const back = shrimpPoint(s, cam, { x: 10, y: -30 });
    drawCallout(ctx, 'pistol shrimp', { x: Math.max(250, back.x - 20), y: back.y - 260 }, back, pistol, 84);
  }
  const ring = clawRing(t);
  if (ring.drawn > 0 && ring.alpha > 0) {
    const c = { x: PALM.x + 20, y: PALM.y - 8 };
    const pts = Array.from({ length: 40 }, (_, i) => {
      const a = Math.PI * 0.75 + (i / 40) * Math.PI * 2;
      return shrimpPoint(s, cam, { x: c.x + Math.cos(a) * 80, y: c.y + Math.sin(a) * 64 });
    });
    drawDashed(ctx, pts, ring.drawn, ring.alpha, SPOKEN);
    const below = shrimpPoint(s, cam, { x: c.x + 40, y: c.y + 52 });
    drawTextLine(ctx, 'claw', below.x + 70, below.y + 70, 96, 700, ring.alpha * Math.min(1, ring.drawn * 2), { fill: SPOKEN, halo: INK_BG });
  }
  const arrow = snapArrow(t);
  if (arrow > 0) {
    // Round from the cocked finger's tip to where it slams shut, a little outside its swing.
    const pts = Array.from({ length: 16 }, (_, i) => {
      const tip = dactylTip(Math.max(open, 0.9) * (1 - i / 15));
      const d = Math.hypot(tip.x - HINGE.x, tip.y - HINGE.y);
      const out = (d + 14) / d;
      return shrimpPoint(s, cam, { x: HINGE.x + (tip.x - HINGE.x) * out, y: HINGE.y + (tip.y - HINGE.y) * out });
    });
    drawArrow(ctx, pts, arrow, 7);
  }
  const bubble = bubbleLabel(t);
  const b = bubbleAt(t);
  if (bubble > 0 && b) {
    const at = toScreen(cam, b);
    drawCallout(ctx, 'bubble', { x: at.x + 40, y: at.y - 190 }, { x: at.x, y: at.y - b.r * cam.zoom - 8 }, bubble, 84);
  }
}

function drawHotNotes(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const thermo = thermoAt(t);
  if (thermo <= 0) return;
  const level = degreesAt(t) / HOT_C;
  drawThermometer(ctx, { x: 180, y: 540 }, 400, level, thermo, boil);
  const shown = Math.round(degreesAt(t) / 100) * 100;
  if (level > 0.02) drawTextLine(ctx, `${shown.toLocaleString('en-US')} °C`, 590, TOP_Y, 150, 700, thermo * Math.min(1, level * 4), { fill: '#ffd27a', halo: INK_BG });
}

export function createPistol(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const shrimp = makeShrimpFrames();
  const bed = makeBedFrames();
  const fish: Sprite = makeSprite('chromis', 4);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.drawImage(water, 0, 0);
    drawSpecks(ctx, t / LOOP_S);

    const cam = cameraAt(t);
    const s = shrimpAt(t);
    const open = clawOpenAt(t);
    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const sub = subAt(t);
    if (sub) drawSub(ctx, toScreen(cam, sub), SUB_LEN * cam.zoom, sub.alpha, boil);
    for (const row of [0, 1, 2] as const) {
      drawReef(ctx, cam, row);
      drawBed(ctx, bed, cam, t, boil, row);
    }

    const f = fishAt(t);
    if (f) {
      const at = toScreen(cam, f);
      const pose: Pose = { j: 0, shape: 'chromis', age: 0, x: at.x, y: at.y, length: FISH_LEN * cam.zoom, facing: -1, tilt: -f.spin, beat: f.beat, effort: f.effort };
      drawSwimmer(ctx, fish, pose, boil, { alpha: f.alpha });
    }

    // The shrimp, then its big claw drawn live (it opens and slams).
    inShrimpFrame(ctx, s, cam, () => {
      const canvas = shrimp[boil]!;
      ctx.scale(1 / SHRIMP_RES, 1 / SHRIMP_RES);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    });
    inShrimpFrame(ctx, s, cam, () => drawPistolClaw(new Pen(ctx, 11 + boil * 977, 0.5), open));

    const jet = jetAt(t);
    if (jet) {
      const a = aheadOf(s);
      drawJet(ctx, toScreen(cam, jetFromAt(t)), a, jet.u, jet.reach * cam.zoom, cam.zoom);
    }
    const b = bubbleAt(t);
    if (b) drawBubble(ctx, b, toScreen(cam, b), cam.zoom, t);
    const heat = heatAt(t);
    if (heat > 0) drawHeat(ctx, toScreen(cam, burstPointAt(t)), heat, degreesAt(t) / HOT_C, cam.zoom, t);
    const flash = flashAt(t);
    if (flash) drawFlash(ctx, flash, toScreen(cam, flash), cam.zoom);
    const shock = shockAt(t);
    if (shock !== null) drawShock(ctx, toScreen(cam, burstPointAt(t)), shock, cam.zoom);
    if (f) drawStars(ctx, { x: toScreen(cam, f).x, y: toScreen(cam, f).y - 70 * cam.zoom }, 90 * cam.zoom, starsAt(t) * f.alpha, t);
    ctx.restore();

    drawVignette(ctx);
    drawWhite(ctx, whiteAt(t));

    // The sun beside the first flash, on "SUN!".
    const sun = sunAt(t);
    if (sun > 0) drawSun(ctx, { x: 330, y: 470 }, 110, sun, boil);
    drawLabels(ctx, t, s, cam, open);
    drawHotNotes(ctx, t, boil);
    drawBang(ctx, { x: 400, y: 470 }, bangAt(t), boil);
    const wwii = wwiiLabel(t);
    if (wwii > 0) drawTextLine(ctx, 'WWII', VIDEO.width / 2, TOP_Y, 170, 700, wwii, PAPER_ON_INK);
    const shh = shhAt(t);
    if (shh > 0 && sub) {
      const at = toScreen(cam, sub);
      drawTextLine(ctx, 'shh…', at.x + SUB_LEN * cam.zoom * 0.3, at.y - SUB_LEN * cam.zoom * 0.2, 84, 700, shh * sub.alpha, { fill: CHALK, halo: INK_BG });
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderPistolAudio };
}
