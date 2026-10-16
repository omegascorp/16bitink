import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeMarks } from '../backdrop';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import type { Pose } from '../chain';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderSurferAudio } from './audio';
import { drawSeal, drawSurfer } from './figures';
import {
  drawCamera, drawConeEdges, drawEquals, drawQuestion, drawRays, drawRing, drawSeabed, drawSightLines, drawSurface, drawVision, makeSea, RED,
  RED_ON_PAPER, VISION_DOWN, viewCone,
} from './scene';
import {
  cameraLabel, captionAt, equalsAt, equalsDrawn, eyeRingAt, eyeRingDrawn, questionAt, sealTag, sealTagPulse, surferTags, visionLabel, youngLabel,
} from './script';
import {
  boilAt, CAMERA, cameraAt, eyeOf, filmingAt, type Fish, LOOP_S, recAt, sealAt, sharkAt, SURFACE_Y, surferAt, visionAt,
} from './story';

/** Draws the "to a shark, you look like THIS" short (story.ts has the choreography). */

const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const TAG_Y = 405;
const TAG_SIZE = 68;
const LABEL_SIZE = 58;
const SURFER_SCALE = 1.1;
const MARKS = makeMarks(28, 2021);

/** The shark as drawSwimmer wants it, facing squarely one way. */
const poseOf = (f: Fish): Pose => ({
  j: 0, shape: 'shark', age: 0, x: f.x, y: f.y, length: f.len, facing: f.face < 0 ? -1 : 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/** The shark, squeezed edge-on about its middle part-way through a turn. */
function drawShark(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, boil: number): void {
  if (Math.abs(f.face) >= 1) {
    drawSwimmer(ctx, sprite, poseOf(f), boil);
    return;
  }
  if (Math.abs(f.face) < 0.01) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, { ...poseOf(f), x: 0, y: 0, facing: 1 }, boil);
  ctx.restore();
}

/** The spoken line, word by word, the word being said in red. */
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

/** Everything the shark looks up at, drawn into `sc`: the sea, the surface, the seabed and its camera, the seal and the surfer. */
function drawWorld(sc: CanvasRenderingContext2D, sea: HTMLCanvasElement, t: number, boil: number): { lens: { x: number; y: number } } {
  const loop = t / LOOP_S;
  sc.drawImage(sea, 0, 0);
  drawRays(sc, loop);
  sc.save();
  sc.beginPath();
  sc.rect(0, SURFACE_Y + 20, VIDEO.width, VIDEO.height);
  sc.clip();
  drawMarks(sc, MARKS, loop);
  sc.restore();
  drawSeabed(sc, boil);
  const lens = drawCamera(sc, CAMERA, cameraAt(t), recAt(t), boil);
  drawSurface(sc, loop, boil);
  const seal = sealAt(t);
  if (seal) drawSeal(sc, seal, boil);
  drawSurfer(sc, surferAt(t), SURFER_SCALE, boil);
  return { lens };
}

/** The tags over the surfer and the seal, and the "=" between them. */
function drawTags(ctx: CanvasRenderingContext2D, t: number): void {
  const surfer = surferAt(t);
  for (const tag of surferTags(t)) drawTextLine(ctx, tag.text, surfer.x - 20, TAG_Y, TAG_SIZE, 700, tag.alpha, tag.red ? RED_ON_PAPER : INK_ON_PAPER);
  const seal = sealAt(t);
  if (!seal) return;
  drawTextLine(ctx, 'seal', seal.x, TAG_Y + 20, TAG_SIZE * (1 + 0.2 * sealTagPulse(t)), 700, sealTag(t));
  const gap = { from: surfer.x + 205 * SURFER_SCALE, to: seal.x - 0.5 * seal.len };
  drawEquals(ctx, (gap.from + gap.to) / 2, SURFACE_Y + 30, 76, equalsDrawn(t), equalsAt(t));
}

/** Notes on the shark: its view, its name, its eye, its "?". */
function drawSharkNotes(ctx: CanvasRenderingContext2D, s: Fish, t: number): void {
  const eye = eyeOf(s);
  drawRing(ctx, eye, 30, eyeRingDrawn(t), eyeRingAt(t));
  drawQuestion(ctx, s.x, s.y - 175, questionAt(t));
  drawTextLine(ctx, 'young white shark', Math.max(280, Math.min(800, s.x)), s.y + 140, LABEL_SIZE, 700, youngLabel(t), RED_ON_PAPER);
  drawTextLine(ctx, 'shark vision', VIDEO.width / 2, 305, 84, 700, visionLabel(t), RED_ON_PAPER);
}

export function createSurfer(ctx: CanvasRenderingContext2D): Short {
  const sea = makeSea();
  const shark = makeSprite('shark', 4, 'heavy');
  const scene = makeCanvas(VIDEO.width, VIDEO.height);
  const small = makeCanvas(VIDEO.width / VISION_DOWN, VIDEO.height / VISION_DOWN).canvas;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const { lens } = drawWorld(scene.ctx, sea, t, boil);
    ctx.drawImage(scene.canvas, 0, 0);
    const s = sharkAt(t);
    const vision = visionAt(t);
    if (vision > 0) {
      const cone = viewCone(eyeOf(s));
      drawVision(ctx, scene.canvas, small, cone, vision);
      drawConeEdges(ctx, cone, vision);
    }
    const seal = sealAt(t);
    const surfer = surferAt(t);
    drawSightLines(ctx, lens, [{ x: surfer.x, y: surfer.y + 30 }, ...(seal ? [{ x: seal.x, y: seal.y }] : [])], filmingAt(t));
    drawShark(ctx, shark, s, boil);

    // Notes.
    drawTags(ctx, t);
    drawSharkNotes(ctx, s, t);
    drawTextLine(ctx, "scientists'", CAMERA.x - 25, 925, LABEL_SIZE, 700, cameraLabel(t), { fill: INK, halo: PAPER });
    drawTextLine(ctx, 'camera', CAMERA.x - 25, 980, LABEL_SIZE, 700, cameraLabel(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSurferAudio };
}
