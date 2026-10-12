import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderGreenlandAudio } from './audio';
import { coreOf, drawEyeLens } from './eye';
import { drawStamp, drawTape } from './marks';
import { drawGreenlandShark } from './shark';
import { drawRibbon, PAPER_ON_INK } from './ribbon';
import { drawCrackGlow, drawIce, drawIceGlow, drawShafts, drawSnow, makeWater, toScreen } from './scenery';
import {
  ageMarks, boilAt, type Camera, cameraAt, captionAt, coreLabel, coreLit, EYE_R, eyeAt, layersGrown, LENS, lensLabel, lensOpen, LOOP_S, pupsAt, ribbonShow, section, sharkAt,
} from './story';

/** Draws the "this shark may have been born before Isaac Newton" short (story.ts has the choreography). */

const SPOKEN = '#f5c84a';
const CAPTION_Y = 1170;
const CAPTION_SIZE = 96;
const GOLD_ON_INK: TextInk = { fill: SPOKEN, halo: '#05091a' };

/** The shark, on screen. */
function drawShark(ctx: CanvasRenderingContext2D, cam: Camera, t: number, boil: number): void {
  const shark = sharkAt(t);
  const c = toScreen(cam, shark.x, shark.y);
  drawGreenlandShark(ctx, { ...shark, x: c.x, y: c.y, length: shark.length * cam.zoom }, boil, t);
}

/** The magnifier on its eye, and its labels: the lens, and the core formed before birth. */
function drawEye(ctx: CanvasRenderingContext2D, cam: Camera, t: number, boil: number): void {
  const open = lensOpen(t);
  if (open <= 0) return;
  const eye = eyeAt(t);
  const at = toScreen(cam, eye.x, eye.y);
  const sec = section(t);
  drawEyeLens(ctx, { ...at, r: EYE_R * cam.zoom }, LENS, { open, section: sec, layers: layersGrown(t), lit: coreLit(t), t, boil });
  const shown = Math.max(0, (open - 0.6) / 0.4);
  drawTextLine(ctx, 'lens', LENS.x, LENS.y - LENS.r + 82, 64, 700, shown * lensLabel(t), PAPER_ON_INK);
  const label = shown * coreLabel(t);
  if (label <= 0) return;
  const core = coreOf(LENS, sec);
  ctx.save();
  ctx.globalAlpha = label;
  ctx.strokeStyle = SPOKEN;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(core.x, core.y + core.r + 8);
  ctx.lineTo(core.x, LENS.y + LENS.r + 18);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'core: formed before birth', LENS.x, LENS.y + LENS.r + 78, 58, 700, label, GOLD_ON_INK);
}

/** The first pups, swimming out from the "150" milestone. */
function drawPups(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const alpha = ageMarks(t) * ribbonShow(t);
  if (alpha <= 0) return;
  for (const pup of pupsAt(t)) drawGreenlandShark(ctx, pup, boil, t, alpha);
}

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const words = now.line.words.map((w) => w.text);
  const space = ctx.measureText(' ').width;
  const widths = words.map((w) => ctx.measureText(w).width);
  const total = widths.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  let x = VIDEO.width / 2 - total / 2;
  ctx.restore();
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? GOLD_ON_INK : PAPER_ON_INK;
    drawTextLine(ctx, w, x + widths[i]! / 2, CAPTION_Y, CAPTION_SIZE, 700, i <= now.word ? 1 : 0.55, colours);
    x += widths[i]! + space;
  });
}

export function createGreenland(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t);
    const cam = cameraAt(t);
    ctx.drawImage(water, 0, 0);
    drawIceGlow(ctx, cam);
    drawShafts(ctx, cam, t);
    drawSnow(ctx, t);
    drawIce(ctx, cam, t, boil);
    drawCrackGlow(ctx, cam, t);
    drawShark(ctx, cam, t, boil);
    drawTape(ctx, cam, t, boil);
    drawEye(ctx, cam, t, boil);
    const landed = drawStamp(ctx, t, boil);
    drawRibbon(ctx, t, boil, landed);
    drawPups(ctx, t, boil);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGreenlandAudio };
}
