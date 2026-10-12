import { SEADEVIL_UNMATED } from '../../../src/art/fish/species/seadevil';
import { halo } from '../../../src/art/glowArt';
import { PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import type { Pose } from '../chain';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { lureOf } from '../light/render';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderMatesAudio } from './audio';
import { drawLens, drawMale } from './male';
import {
  type Camera, cameraAt, captionAt, chomp, foundRing, fusion, heAt, herAt, himRing, LENS, LOOP_S, magnifier, type MalePose, mouthOfMale, nextMaleAt, othersAt,
  popRing, snowShift, veins,
} from './story';

/** Draws the "this tiny fish is about to become part of her body" short (story.ts has the choreography). */

/** She is drawn up to about 2.5x her sprite's size on screen at the closest framing she appears in. */
const SPRITE_RES = 8;
const LURE = '#d8f4ff';
const CHALK = '#dcd6e6';
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const SPOKEN = '#f5c84a';
const CAPTION_Y = 1170;
const CAPTION_SIZE = 96;

const toScreen = (cam: Camera, x: number, y: number): { x: number; y: number } => ({
  x: VIDEO.width / 2 + (x - cam.x) * cam.zoom,
  y: VIDEO.height / 2 + (y - cam.y) * cam.zoom,
});

/** The deep: near-black water, a touch lighter at the top. */
function makeWater(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#0c1633');
  g.addColorStop(1, '#03060f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/**
 * Marine snow drifting in the dark: carried sideways by the pan, and
 * smeared along its motion (outwards or inwards while the camera zooms),
 * about one frame's worth, so it blurs and sharpens smoothly.
 */
const SNOW = (() => {
  const rng = createRng(4242);
  return Array.from({ length: 260 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2, phase: rng() * Math.PI * 2 }));
})();
const BLUR_S = 1 / 25;

function drawSnow(ctx: CanvasRenderingContext2D, t: number): void {
  const dt = 1 / 120;
  const [before, after] = [Math.max(t - dt, 0), Math.min(t + dt, LOOP_S - 1e-6)];
  const zoomRate = (Math.log(cameraAt(after).zoom) - Math.log(cameraAt(before).zoom)) / (after - before);
  const panRate = (snowShift(after) - snowShift(before)) / (after - before);
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = '#dfe8ff';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.28;
  for (const m of SNOW) {
    const x = (((m.x + snowShift(t) + 10 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase)) % VIDEO.width) + VIDEO.width) % VIDEO.width;
    const y = (m.y + (VIDEO.height * t) / LOOP_S) % VIDEO.height;
    // Its speed on screen, px/s: the pan, plus moving away from (or towards) the middle as the camera zooms.
    const vx = panRate + (x - VIDEO.width / 2) * zoomRate;
    const vy = (y - VIDEO.height / 2) * zoomRate;
    const sx = Math.max(-260, Math.min(260, vx * BLUR_S));
    const sy = Math.max(-260, Math.min(260, vy * BLUR_S));
    if (Math.hypot(sx, sy) > m.r) {
      ctx.lineWidth = m.r * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - sx, y - sy);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function maleOnScreen(ctx: CanvasRenderingContext2D, cam: Camera, m: MalePose, alpha = 1): void {
  const p = toScreen(cam, m.x, m.y);
  const len = m.length * cam.zoom;
  if (p.x < -len || p.x > VIDEO.width + len || p.y < -len || p.y > VIDEO.height + len) return;
  drawMale(ctx, p.x, p.y, len, m.angle, { beat: m.beat, effort: m.effort, fused: m.fused, alpha });
}

/** Her, black on black, lit by her own lure. */
function drawHer(ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, sprite: Sprite, cam: Camera, t: number, boil: number): void {
  const her = herAt(t);
  const c = toScreen(cam, her.x, her.y);
  const reach = her.length * 0.8 * cam.zoom;
  if (c.x < -reach || c.x > VIDEO.width + reach || c.y < -reach || c.y > VIDEO.height + reach) return;
  const pose: Pose = { ...her, x: c.x, y: c.y, length: her.length * cam.zoom };
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(layer, sprite, pose, boil);
  const lure = lureOf(sprite, pose);
  const shade = layer.createRadialGradient(lure.x, lure.y, 60 * cam.zoom, lure.x, lure.y, 900 * cam.zoom);
  shade.addColorStop(0, 'rgba(3,6,15,0)');
  shade.addColorStop(1, 'rgba(3,6,15,0.55)');
  layer.save();
  layer.globalCompositeOperation = 'source-atop';
  layer.fillStyle = shade;
  layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer.restore();
  ctx.drawImage(layer.canvas, 0, 0);
  const glow = 0.9 + 0.1 * Math.sin((2 * Math.PI * 7 * t) / LOOP_S);
  halo(ctx, lure.x, lure.y, 260 * cam.zoom, LURE, 0.22 * glow);
  halo(ctx, lure.x, lure.y, 70 * cam.zoom, LURE, glow);
}

/** A ring popping round each male as he appears on her. */
function drawPops(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3;
  for (const o of othersAt(t)) {
    const u = popRing(o.since);
    if (u >= 1) continue;
    const p = toScreen(cam, o.pose.x, o.pose.y);
    ctx.globalAlpha = 1 - u;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14 + 46 * u, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** One ring pulsing out from the lone male, so the eye finds him in all that dark. */
function drawFoundRing(ctx: CanvasRenderingContext2D, cam: Camera, m: MalePose, u: number): void {
  if (u < 0 || u > 1) return;
  const p = toScreen(cam, m.x, m.y);
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3;
  ctx.globalAlpha = Math.sin(Math.PI * u);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 26 + 70 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A hand-drawn ring round him, labelled. */
function drawHimRing(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const show = himRing(t);
  if (show <= 0) return;
  const he = heAt(t);
  const p = toScreen(cam, he.x, he.y);
  const r = Math.max(34, he.length * cam.zoom * 0.9);
  ctx.save();
  ctx.globalAlpha = show;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  // Not quite closed, as if drawn in one go.
  ctx.ellipse(p.x, p.y, r * 1.15, r, -0.2, -0.3, Math.PI * 2 * show - 0.1);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'him', p.x - r - 60, p.y + r + 50, 64, 700, show, PAPER_ON_INK);
}

/** The bite: a burst of pale strokes from his mouth. */
function drawBite(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const u = chomp(t);
  if (u < 0 || u > 1) return;
  const he = heAt(t);
  const m = toScreen(cam, mouthOfMale(he).x, mouthOfMale(he).y);
  const size = Math.max(40, he.length * cam.zoom);
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 1 - u;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    const r0 = size * (0.25 + 0.4 * u);
    const r1 = size * (0.45 + 0.6 * u);
    ctx.beginPath();
    ctx.moveTo(m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0);
    ctx.lineTo(m.x + Math.cos(a) * r1, m.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: '#05091a' } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + widths[i]! / 2, CAPTION_Y, CAPTION_SIZE, 700, i <= now.word ? 1 : 0.55, colours);
    x += widths[i]! + space;
  });
}

export function createMates(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const sprite = makeSprite('seadevil', SPRITE_RES, 'light', SEADEVIL_UNMATED);
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const cam = cameraAt(t);
    ctx.drawImage(water, 0, 0);
    drawSnow(ctx, t);
    drawHer(ctx, layer, sprite, cam, t, boil);
    for (const o of othersAt(t)) maleOnScreen(ctx, cam, o.pose);
    drawPops(ctx, cam, t);
    maleOnScreen(ctx, cam, heAt(t));
    const next = nextMaleAt(t);
    if (next) {
      maleOnScreen(ctx, cam, next);
      drawFoundRing(ctx, cam, next, foundRing(t));
    }
    drawHimRing(ctx, cam, t);
    drawBite(ctx, cam, t);
    const he = heAt(t);
    const join = toScreen(cam, mouthOfMale(he).x, mouthOfMale(he).y);
    const open = magnifier(t);
    drawLens(ctx, LENS, join, open, fusion(t), veins(t), he.beat);
    if (open > 0.5) {
      drawTextLine(ctx, 'her skin', LENS.x, LENS.y - LENS.r * 0.45, 66, 700, (open - 0.5) * 2, PAPER_ON_INK);
      drawTextLine(ctx, 'him', LENS.x + LENS.r * 0.45, LENS.y + LENS.r * 0.5, 66, 700, (open - 0.5) * 2, PAPER_ON_INK);
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderMatesAudio };
}
