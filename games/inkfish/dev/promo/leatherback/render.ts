import { makeCanvas } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { clamp01, lerp, ramp, VIDEO, type Short } from '../short';
import { renderLeatherbackAudio } from './audio';
import { drawDiver } from './diver';
import { drawFace, drawFrontBody, type FaceView, mouthHole } from './face';
import { drawJelly } from './jelly';
import { glow, hash, pathOf } from './paint';
import { drawFill, drawGrade, drawSea, drawSnow, drawVignette, INK_BG, makeBackdrop, type Backdrop, type SeaMix } from './scene';
import { captionAt, TEXT } from './script';
import { drawSection } from './section';
import {
  boilAt, camDepthAt, counterAt, countAt, cycles, diverAt, FACE_AT, FOCAL, flashAt, frontTurnAt, gapeAt, type Grade, gradeAt, GULPS, LOOP_S,
  perDayAt, PULL, sceneAt, SECTION_IN, shakeAt, sideZoomAt, sizeLabelAt, sizePopAt, spikeGlintAt, turtleAt, type TurtlePose, wrap,
} from './story';
import { drawTunnel } from './tunnel';
import { drawTurtle, MOUTH, THROAT, turtleToScreen } from './turtle';

/** Draws the "this turtle's mouth is a nightmare" short (story.ts has the choreography). */

const CAPTION_Y = TEXT.caption.y;
const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 980;
const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: '#f4eddc', halo: INK_BG };

/** The spoken line, word by word, the word being said in yellow. */
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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

const seaOf = (g: Grade): SeaMix => ({ blue: Math.max(g.clear, 0.6 * g.vivid, 0.5 * g.sun), teal: g.vivid, sun: g.sun });

/** Head-on: the water, the turtle's front, the throat through its open mouth, its face. */
function drawFront(ctx: CanvasRenderingContext2D, b: Backdrop, t: number, boil: number): void {
  const sea = seaOf(gradeAt(t));
  drawSea(ctx, b, { ...sea, blue: Math.max(sea.blue, 0.32) }, t, 0);
  drawSnow(ctx, t, 0, 0.5);
  const camD = camDepthAt(t);
  const squeeze = frontTurnAt(t);
  const s0 = camD < 0 ? FOCAL / -camD : Infinity;
  const face: FaceView = { at: FACE_AT, s: s0, squeeze, gape: gapeAt(t) };
  const tunnel = { camD, at: FACE_AT, squeeze, glint: spikeGlintAt(t) };
  // Past the lips (or nearly): only the throat.
  if (s0 > 7) {
    drawTunnel(ctx, tunnel, boil, t);
    return;
  }
  drawFrontBody(ctx, face, boil, t);
  ctx.save();
  pathOf(ctx, mouthHole(face));
  ctx.clip();
  drawTunnel(ctx, tunnel, boil, t);
  ctx.restore();
  drawFace(ctx, face, boil);
}

/** The pull-out's transform on the side view: zoomed on its throat, out to the whole turtle. */
interface SideCam {
  readonly zoom: number;
  readonly focus: { readonly x: number; readonly y: number };
  readonly throat: { readonly x: number; readonly y: number };
}
function sideCamAt(t: number, pose: TurtlePose): SideCam {
  const zoom = sideZoomAt(t);
  const p = 1 - Math.log(zoom) / Math.log(5.5);
  const throat = turtleToScreen(pose, THROAT);
  return { zoom, throat, focus: { x: lerp(540, throat.x, p), y: lerp(900, throat.y, p) } };
}

/** Side on: the sea, the diver for scale, the jellyfish streaming into its mouth, the turtle. */
function drawSide(ctx: CanvasRenderingContext2D, b: Backdrop, t: number, boil: number): void {
  const u = wrap(t);
  const g = gradeAt(u);
  const drift = u * 300;
  drawSea(ctx, b, seaOf(g), u, drift);
  drawSnow(ctx, u, drift, 0.55);
  const pose = turtleAt(u);
  const cam = sideCamAt(u, pose);
  ctx.save();
  ctx.translate(cam.focus.x, cam.focus.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.throat.x, -cam.throat.y);
  const len = 720 * pose.scale;
  drawDiver(ctx, pose.x + 50 - (u - PULL.from) * 22, pose.y + 380, len * 1.05, u, diverAt(u));
  drawFeast(ctx, pose, u, boil);
  drawTurtle(ctx, pose, { sun: g.sun }, boil);
  if (g.sun > 0.05) drawSparkles(ctx, pose, u, g.sun);
  ctx.restore();
}

/** The jellyfish streaming into its mouth, one after another, each gone with a gulp. */
function drawFeast(ctx: CanvasRenderingContext2D, pose: TurtlePose, u: number, boil: number): void {
  const mouth = turtleToScreen(pose, MOUTH);
  GULPS.forEach((g, i) => {
    const ahead = g - u;
    if (ahead > 1.6 || ahead < -0.1) return;
    const x = mouth.x + 30 + Math.max(0, ahead) * 620;
    const y = mouth.y + 6 + (40 + 60 * hash(i)) * Math.sin(i * 2.1) * clamp01(ahead / 0.5);
    const gone = ahead < 0 ? 1 - clamp01(-ahead / 0.08) : 1;
    const size = 92 * pose.scale * gone;
    drawJelly(ctx, x - (1 - gone) * 20, y, size, { squash: 1, pulse: 0.5 + 0.5 * Math.sin(u * 8 + i), tilt: -0.3, trail: 0.2, face: null, alpha: clamp01((1.6 - ahead) / 0.3) }, boil, 10 + i);
  });
}

/** Twinkles along the shell's ridges in the sunlit beat. */
function drawSparkles(ctx: CanvasRenderingContext2D, pose: TurtlePose, u: number, sun: number): void {
  for (let i = 0; i < 9; i++) {
    const f = Math.max(0, Math.sin(cycles(12, u) * 0.5 + i * 1.9));
    if (f < 0.4) continue;
    const at = turtleToScreen(pose, { x: -330 + i * 60, y: -120 + Math.abs(i - 4.5) * 14 + (i % 2) * 40 });
    glow(ctx, at.x, at.y, 26 * f, '#fff0c0', 0.55 * sun * f);
    ctx.save();
    ctx.globalAlpha = 0.8 * sun * f;
    ctx.strokeStyle = '#fff6d8';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const r = 14 * f;
    ctx.beginPath();
    ctx.moveTo(at.x - r, at.y);
    ctx.lineTo(at.x + r, at.y);
    ctx.moveTo(at.x, at.y - r);
    ctx.lineTo(at.x, at.y + r);
    ctx.stroke();
    ctx.restore();
  }
}

/** The cutaway, shrunk into the turtle's neck as the camera pulls out (from its own canvas). */
function drawLens(ctx: CanvasRenderingContext2D, section: HTMLCanvasElement, t: number): void {
  const u = wrap(t);
  const fade = 1 - ramp(u, PULL.from + 0.2, PULL.to + 0.15);
  if (fade <= 0.01) return;
  const pose = turtleAt(u);
  const cam = sideCamAt(u, pose);
  const k = cam.zoom / 5.5;
  const r = Math.max(50, 540 * k);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.beginPath();
  ctx.arc(cam.focus.x, cam.focus.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cam.focus.x, cam.focus.y);
  ctx.scale(k, k);
  ctx.drawImage(section, -540, -900);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = fade * 0.8;
  ctx.strokeStyle = '#f4eddc';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cam.focus.x, cam.focus.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The size label and the jellyfish counter. */
function drawLabels(ctx: CanvasRenderingContext2D, t: number): void {
  const size = sizeLabelAt(t);
  if (size > 0) {
    const pop = 1 + (TEXT.sizeLb.pop - 1) * sizePopAt(t);
    drawTextLine(ctx, 'up to 1,000 lb', VIDEO.width / 2, TEXT.sizeLb.y, TEXT.sizeLb.size * pop * (0.7 + 0.3 * size), 700, size, PAPER_ON_INK);
    drawTextLine(ctx, '(450 kg)', VIDEO.width / 2, TEXT.sizeKg.y, TEXT.sizeKg.size * (0.7 + 0.3 * size), 700, size, PAPER_ON_INK);
  }
  const shown = counterAt(t);
  if (shown > 0) {
    const n = countAt(t);
    drawTextLine(ctx, `≈ ${n}`, VIDEO.width / 2, TEXT.count.y, TEXT.count.size * (0.75 + 0.25 * shown), 700, shown, { fill: SPOKEN, halo: INK_BG });
    const day = perDayAt(t);
    if (day > 0) drawTextLine(ctx, 'jellyfish / day', VIDEO.width / 2, TEXT.perDay.y, TEXT.perDay.size * (0.6 + 0.4 * day) * (1 + (TEXT.perDay.pop - 1) * Math.sin(Math.PI * day)), 700, shown * day, PAPER_ON_INK);
  }
}

export function createLeatherback(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop();
  const section = makeCanvas(VIDEO.width, VIDEO.height);

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const scene = sceneAt(t);
    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    const inPull = t >= PULL.from && t < PULL.to + 0.4;
    if (scene.section > 0 || inPull) drawSection(section.ctx, t, boil);
    if (scene.side > 0) {
      drawSide(ctx, backdrop, t, boil);
      if (inPull) drawLens(ctx, section.canvas, t);
    } else if (scene.front > 0) {
      drawFront(ctx, backdrop, t, boil);
    }
    if (!inPull && scene.section > 0) {
      ctx.save();
      ctx.globalAlpha = scene.section;
      // Sliding in from below as the throat is cut open.
      const slide = (1 - ramp(t, SECTION_IN.from, SECTION_IN.to)) * 180;
      ctx.drawImage(section.canvas, 0, slide);
      ctx.restore();
    }
    ctx.restore();
    drawGrade(ctx, gradeAt(t));
    drawVignette(ctx, 0.55 + 0.15 * (1 - clamp01(scene.side)));
    drawFill(ctx, '#fff6ea', flashAt(t));
    drawLabels(ctx, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderLeatherbackAudio };
}
