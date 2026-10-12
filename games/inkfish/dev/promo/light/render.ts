import { FISH_TEX } from '../../../src/art/fish/kit';
import { SEADEVIL_ESCA } from '../../../src/art/fish/species/seadevil';
import { halo } from '../../../src/art/glowArt';
import { INK, PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import type { Pose } from '../chain';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { makePaper } from '../backdrop';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderLightAudio } from './audio';
import {
  anglerAt, anglerEyes, CAPTIONS, captionAlpha, darkAt, depthAt, depthRate, FISH_Y, LOOP_S, lureGlow, sunlight, surfaceY,
} from './story';

/** Draws the "there is a light, anglerfish" short (story.ts has the choreography). */

const SPRITE_RES = 5;
const LURE = '#d8f4ff';
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const PALE = '#dfe8ff';

type Rgba = readonly [number, number, number, number];
const SUNLIT: Rgba = [70, 120, 170, 0.18];
const DEEP: Rgba = [5, 10, 28, 0.97];

const waterAt = (depth: number): string => {
  const u = darkAt(depth);
  const c = SUNLIT.map((v, k) => v + (DEEP[k]! - v) * u);
  return `rgba(${Math.round(c[0]!)},${Math.round(c[1]!)},${Math.round(c[2]!)},${c[3]!.toFixed(3)})`;
};

/** The surface's height on screen at x: rolling gently, three times round per loop. */
function waterlineAt(x: number, t: number): number {
  const roll = (2 * Math.PI * t * 3) / LOOP_S;
  return surfaceY(t) + 7 * Math.sin(x * 0.022 + roll) + 3 * Math.sin(x * 0.051 - roll * 2);
}

/** The sea, darkening with depth below the surface (or the whole screen, once the surface is out of sight). */
function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  const top = Math.max(0, surfaceY(t) - 12);
  const gradient = ctx.createLinearGradient(0, top, 0, VIDEO.height);
  for (let i = 0; i <= 12; i++) {
    const y = top + ((VIDEO.height - top) * i) / 12;
    gradient.addColorStop(i / 12, waterAt(depthAt(t) + y - FISH_Y));
  }
  ctx.save();
  ctx.beginPath();
  if (surfaceY(t) > -20) {
    ctx.moveTo(-10, VIDEO.height);
    for (let x = -10; x <= VIDEO.width + 10; x += 8) ctx.lineTo(x, waterlineAt(x, t));
    ctx.lineTo(VIDEO.width + 10, VIDEO.height);
    ctx.closePath();
  } else {
    ctx.rect(0, 0, VIDEO.width, VIDEO.height);
  }
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

/** Sunlight slanting down from the surface, fading with depth. */
const RAYS = [{ x: 90, w: 70, lean: 0.2 }, { x: 330, w: 120, lean: 0.14 }, { x: 600, w: 80, lean: 0.1 }, { x: 860, w: 140, lean: 0.16 }];
const RAY_LENGTH = 1500;

function drawRays(ctx: CanvasRenderingContext2D, t: number): void {
  const top = surfaceY(t);
  if (top + RAY_LENGTH < 0) return;
  ctx.save();
  RAYS.forEach((r, k) => {
    const shimmer = 0.75 + 0.25 * Math.sin((2 * Math.PI * t * (k + 2)) / LOOP_S + k);
    const g = ctx.createLinearGradient(0, top, 0, top + RAY_LENGTH);
    g.addColorStop(0, `rgba(255,252,235,${(0.34 * shimmer).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,252,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(r.x - r.w * 0.3, top);
    ctx.lineTo(r.x + r.w * 0.3, top);
    ctx.lineTo(r.x + r.w + r.lean * RAY_LENGTH, top + RAY_LENGTH);
    ctx.lineTo(r.x - r.w + r.lean * RAY_LENGTH, top + RAY_LENGTH);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** The sun in pen, high on the left above the captions, and the waterline in ink. */
function drawSurface(ctx: CanvasRenderingContext2D, t: number): void {
  const top = surfaceY(t);
  if (top < -200) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const sun = { x: 140, y: top - 335 };
  ctx.fillStyle = 'rgba(245,200,90,0.35)';
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(sun.x + Math.cos(a) * 70, sun.y + Math.sin(a) * 70);
    ctx.lineTo(sun.x + Math.cos(a) * (k % 2 ? 88 : 100), sun.y + Math.sin(a) * (k % 2 ? 88 : 100));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  for (let x = -10; x <= VIDEO.width + 10; x += 8) {
    if (x === -10) ctx.moveTo(x, waterlineAt(x, t));
    else ctx.lineTo(x, waterlineAt(x, t));
  }
  ctx.stroke();
  ctx.restore();
}

/** Marine snow fixed in the water, so it streams past as she rises and sinks: specks in the light, pale motes in the dark. */
interface Mote { readonly x: number; readonly depth: number; readonly r: number; readonly phase: number }

function makeSnow(): readonly Mote[] {
  const rng = createRng(2025);
  return Array.from({ length: 700 }, () => ({ x: rng() * VIDEO.width, depth: 40 + rng() * 4300, r: 1 + rng() * 2.2, phase: rng() * Math.PI * 2 }));
}

function drawSnow(ctx: CanvasRenderingContext2D, snow: readonly Mote[], t: number): void {
  const depth = depthAt(t);
  const rate = depthRate(t);
  // Smeared into streaks while she moves fast; trailing behind each mote as it streams past.
  const streak = Math.max(0, Math.min(150, (Math.abs(rate) - 500) / 6));
  ctx.save();
  ctx.lineCap = 'round';
  for (const m of snow) {
    const y = FISH_Y + m.depth - depth;
    if (y < -streak - 10 || y > VIDEO.height + streak + 10) continue;
    const dark = darkAt(m.depth);
    const x = m.x + 8 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase);
    const colour = dark > 0.5 ? PALE : INK;
    ctx.globalAlpha = dark > 0.5 ? 0.2 + 0.3 * dark : 0.2;
    if (streak > 3) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = m.r * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + Math.sign(rate) * streak);
      ctx.stroke();
    } else {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Where her lure's bulb is on screen. */
export function lureOf(sprite: Sprite, pose: Pose): { readonly x: number; readonly y: number } {
  const scale = (pose.length / sprite.bodyPx) * sprite.res;
  const lx = (SEADEVIL_ESCA.x - FISH_TEX / 2) * scale;
  const ly = (SEADEVIL_ESCA.y - FISH_TEX / 2) * scale;
  const cos = Math.cos(pose.tilt);
  const sin = Math.sin(pose.tilt);
  return { x: pose.x + pose.facing * (lx * cos + ly * sin), y: pose.y - lx * sin + ly * cos };
}

/** Her, black on black: the dark water hides all but what her own lure lights, until the sun reaches her. */
function drawAngler(ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, boil: number, t: number): void {
  const dark = darkAt(depthAt(t));
  const lure = lureOf(sprite, pose);
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(layer, sprite, pose, boil, { eyes: anglerEyes(t) });
  if (dark > 0.01) {
    const shade = layer.createRadialGradient(lure.x, lure.y, 40, lure.x, lure.y, 420);
    shade.addColorStop(0, 'rgba(5,10,28,0)');
    shade.addColorStop(1, `rgba(5,10,28,${(0.88 * dark).toFixed(3)})`);
    layer.save();
    layer.globalCompositeOperation = 'source-atop';
    layer.fillStyle = shade;
    layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
    layer.restore();
  }
  ctx.drawImage(layer.canvas, 0, 0);
  const glow = lureGlow(t);
  halo(ctx, lure.x, lure.y, 340, LURE, 0.22 * glow);
  halo(ctx, lure.x, lure.y, 95, LURE, glow);
}

/** A warm wash over the sunlit water around her as she basks. */
function drawSunWash(ctx: CanvasRenderingContext2D, t: number): void {
  const light = sunlight(t);
  if (light < 0.02) return;
  const top = Math.max(0, surfaceY(t));
  const g = ctx.createLinearGradient(0, top, 0, top + 900);
  g.addColorStop(0, `rgba(255,236,170,${(0.18 * light).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, top, VIDEO.width, 900);
  ctx.restore();
}

export function createLight(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const snow = makeSnow();
  const sprite = makeSprite('seadevil', SPRITE_RES);
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    ctx.drawImage(paper, 0, 0);
    drawWater(ctx, t);
    drawRays(ctx, t);
    drawSunWash(ctx, t);
    drawSurface(ctx, t);
    drawSnow(ctx, snow, t);
    drawAngler(ctx, layer, sprite, anglerAt(t), boil, t);
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t), c.pale ? PAPER_ON_INK : INK_ON_PAPER);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderLightAudio };
}
