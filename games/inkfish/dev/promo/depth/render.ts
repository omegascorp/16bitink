import { fishLights, type FishShape } from '../../../src/art/fishArt';
import { FISH_TEX } from '../../../src/art/fish/kit';
import { halo } from '../../../src/art/glowArt';
import { INK, PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import type { Pose } from '../chain';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { makePaper } from '../backdrop';
import { clamp01, smooth, VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderDepthAudio } from './audio';
import {
  bubbleAt, cameraAt, captionAlpha, counterAlpha, counterMetres, darknessAt, formatMetres, HOOK_CAPTIONS, LOOP_S, metresAt, PAYOFF_CAPTIONS,
  PLAIN_M, SNAIL_LENGTH, snailfishAt, SNAILFISH_M, SWIMMERS, swimmerAt, swimmerMetres, toScreen, yAt, zoneAt, ZONES,
} from './dive';

/** Draws the "how deep do fish live?" short (dive.ts has the choreography). */

/** The fish here are at most half the video's width, so a lighter sprite will do. */
const SPRITE_RES = 4;
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const PALE = '#dfe8ff';

type Rgba = readonly [number, number, number, number];

/** The water's colour over the paper by depth: a blue wash near the top, nearly opaque night in the deep. */
const WATER: readonly (readonly [number, Rgba])[] = [
  [0, [70, 110, 160, 0.1]],
  [50, [60, 100, 150, 0.3]],
  [200, [40, 72, 126, 0.62]],
  [600, [20, 40, 90, 0.86]],
  [1000, [11, 33, 80, 0.93]],
  [2500, [8, 19, 47, 0.96]],
  [4000, [6, 12, 32, 0.97]],
  [6000, [4, 8, 23, 0.98]],
  [SNAILFISH_M, [2, 4, 13, 0.985]],
];

function waterAt(metres: number): Rgba {
  if (metres <= WATER[0]![0]) return WATER[0]![1];
  for (let i = 1; i < WATER.length; i++) {
    const [m1, c1] = WATER[i]!;
    if (metres <= m1) {
      const [m0, c0] = WATER[i - 1]!;
      const u = (metres - m0) / (m1 - m0);
      return c0.map((v, k) => v + (c1[k]! - v) * u) as unknown as Rgba;
    }
  }
  return WATER[WATER.length - 1]![1];
}

const css = (c: Rgba, alpha = c[3]): string => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha.toFixed(3)})`;

/** The water over the paper: a gradient down the screen, sampled from depth, cut sharp at the surface. */
function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  const surface = toScreen(0, t);
  if (surface >= VIDEO.height) return;
  const top = Math.max(0, surface);
  const gradient = ctx.createLinearGradient(0, top, 0, VIDEO.height);
  const camera = cameraAt(t);
  const samples = 12;
  for (let i = 0; i <= samples; i++) {
    const y = top + ((VIDEO.height - top) * i) / samples;
    gradient.addColorStop(i / samples, css(waterAt(metresAt(y + camera - VIDEO.height / 2))));
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, top, VIDEO.width, VIDEO.height - top);
}

/** Sunlight slanting down from the surface, fading out with depth. Fixed to the water, so they scroll with it. */
const RAYS = [{ x: 140, w: 70, lean: 0.25 }, { x: 380, w: 120, lean: 0.22 }, { x: 610, w: 60, lean: 0.27 }, { x: 820, w: 140, lean: 0.2 }, { x: 1010, w: 80, lean: 0.24 }];
const RAY_LENGTH = 2300;

function drawRays(ctx: CanvasRenderingContext2D, t: number): void {
  const surface = toScreen(0, t);
  if (surface + RAY_LENGTH < 0) return;
  ctx.save();
  RAYS.forEach((r, k) => {
    const shimmer = 0.75 + 0.25 * Math.sin((2 * Math.PI * t * (k + 2)) / LOOP_S + k);
    const g = ctx.createLinearGradient(0, surface, 0, surface + RAY_LENGTH);
    g.addColorStop(0, `rgba(255,255,250,${(0.32 * shimmer).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(r.x - r.w * 0.3, surface);
    ctx.lineTo(r.x + r.w * 0.3, surface);
    ctx.lineTo(r.x + r.w + r.lean * RAY_LENGTH, surface + RAY_LENGTH);
    ctx.lineTo(r.x - r.w + r.lean * RAY_LENGTH, surface + RAY_LENGTH);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** The sky and the sea's surface: a sun, the waterline in ink with little waves. */
function drawSurface(ctx: CanvasRenderingContext2D, t: number): void {
  const y = toScreen(0, t);
  if (y < -200 || y > VIDEO.height + 50) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The sun, in pen: a circle and short rays.
  const sun = { x: 950, y: y - 545 };
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 56, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(sun.x + Math.cos(a) * 76, sun.y + Math.sin(a) * 76);
    ctx.lineTo(sun.x + Math.cos(a) * (k % 2 ? 96 : 108), sun.y + Math.sin(a) * (k % 2 ? 96 : 108));
    ctx.stroke();
  }
  // The waterline, rolling gently (a whole number of rolls per loop).
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  const roll = (2 * Math.PI * t * 3) / LOOP_S;
  for (let x = -10; x <= VIDEO.width + 10; x += 8) {
    const wy = y + 7 * Math.sin(x * 0.022 + roll) + 3 * Math.sin(x * 0.051 - roll * 2);
    if (x === -10) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();
  // A few "~" wavelets on the water.
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55;
  for (const [wx, dy] of [[120, 40], [330, 70], [560, 36], [760, 80], [960, 50]] as const) {
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = wx - 30 + k * 10;
      const py = y + dy + Math.sin(k * 1.4 + roll) * 4;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Marine snow fixed in the water: ink specks in the light, pale motes in the dark; streaks when the camera rushes. */
interface Mote { readonly x: number; readonly y: number; readonly r: number; readonly phase: number }

function makeSnow(): readonly Mote[] {
  const rng = createRng(808);
  return Array.from({ length: 1100 }, () => ({ x: rng() * VIDEO.width, y: 60 + rng() * 11600, r: 1 + rng() * 2.2, phase: rng() * Math.PI * 2 }));
}

function drawSnow(ctx: CanvasRenderingContext2D, snow: readonly Mote[], t: number): void {
  const speed = (cameraAt(t + 1 / 60) - cameraAt(t - 1 / 60)) * 30;
  // Only the rush back up is fast enough to smear the motes; the glides between stops stay crisp.
  const streak = Math.max(0, Math.min(220, (Math.abs(speed) - 3500) / 20));
  ctx.save();
  ctx.lineCap = 'round';
  for (const m of snow) {
    const y = toScreen(m.y, t);
    if (y < -streak - 10 || y > VIDEO.height + streak + 10) continue;
    const dark = darknessAt(metresAt(m.y));
    const x = m.x + 8 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase);
    const colour = dark > 0.5 ? PALE : INK;
    ctx.globalAlpha = dark > 0.5 ? 0.25 + 0.3 * dark : 0.22;
    if (streak > 3) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = m.r * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + Math.sign(speed) * streak);
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

/** A label fixed at one depth: ink in sunlit water, pale in the dark. */
function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number, dark: number): void {
  drawTextLine(ctx, text, x, y, size, 700, alpha, dark > 0.45 ? PAPER_ON_INK : INK_ON_PAPER);
}

/** The darkness of the water behind screen height y. */
const darkBehind = (y: number, t: number): number => darknessAt(metresAt(y + cameraAt(t) - VIDEO.height / 2));

/** A dashed pencil line where each zone starts, with its depth on the left and name on the right. */
function drawZoneLines(ctx: CanvasRenderingContext2D, t: number): void {
  for (const z of ZONES) {
    if (z.from === 0) continue;
    const y = toScreen(yAt(z.from), t);
    if (y < -60 || y > VIDEO.height + 60) continue;
    const dark = darknessAt(z.from);
    ctx.save();
    ctx.strokeStyle = dark > 0.45 ? PALE : INK;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIDEO.width, y);
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, formatMetres(z.from), 120, y - 16, 50, 0.85, dark);
    drawLabel(ctx, z.name, VIDEO.width - 190, y - 16, 50, 0.85, dark);
  }
}

/** The abyssal plain's floor, with the trench cut into it: rock ledges from both sides, walls closing in below. */
const WALL_NOISE = (() => {
  const rng = createRng(61);
  return Array.from({ length: 400 }, () => rng() - 0.5);
})();
const noiseAt = (y: number, side: number): number => {
  const f = (y / 40 + side * 137) % WALL_NOISE.length;
  const i = Math.floor(f);
  const u = f - i;
  return WALL_NOISE[i]! * (1 - u) + WALL_NOISE[(i + 1) % WALL_NOISE.length]! * u;
};

/** How far in from its screen edge a trench wall reaches at world y. */
function wallReach(y: number, side: number): number {
  const plain = yAt(PLAIN_M);
  if (y < plain) return 0;
  const deep = clamp01((y - plain) / 2400);
  return 190 + 70 * deep + 40 * noiseAt(y, side) + 14 * noiseAt(y * 3.1, side + 1);
}

function drawTrench(ctx: CanvasRenderingContext2D, t: number): void {
  const plain = yAt(PLAIN_M);
  const top = toScreen(plain, t);
  if (top > VIDEO.height + 40) return;
  const camera = cameraAt(t);
  for (const side of [-1, 1]) {
    const edge = side < 0 ? 0 : VIDEO.width;
    const pts: { x: number; y: number }[] = [];
    for (let sy = Math.max(top, -40); sy <= VIDEO.height + 40; sy += 14) {
      const wy = sy + camera - VIDEO.height / 2;
      pts.push({ x: edge - side * wallReach(wy, side), y: sy });
    }
    if (pts.length < 2) continue;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(edge, pts[0]!.y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(edge, VIDEO.height + 40);
    ctx.closePath();
    ctx.fillStyle = '#121a2e';
    ctx.fill();
    // Hatching on the rock, then a pale inked edge.
    ctx.clip();
    ctx.strokeStyle = '#3b4766';
    ctx.lineWidth = 2;
    for (let k = -40; k < 120; k++) {
      const hy = top + k * 22 - (camera % 22);
      ctx.beginPath();
      ctx.moveTo(edge, hy);
      ctx.lineTo(edge - side * 320, hy + 160);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = '#7d8db5';
    ctx.lineWidth = 3.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(edge, pts[0]!.y);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  }
}

function poseFor(shape: FishShape, x: number, y: number, length: number, facing: 1 | -1, tilt: number, beat: number): Pose {
  return { j: 0, shape, age: 0, x, y, length, facing, tilt, beat, effort: 0.35 };
}

/** The glow of a fish's own lights, drawn over it in its frame. */
function drawGlow(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, strength: number): void {
  const lights = fishLights(pose.shape);
  if (lights.length === 0 || strength <= 0.01) return;
  const scale = pose.length / sprite.bodyPx;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(scale, scale);
  for (const l of lights) {
    halo(ctx, (l.x - FISH_TEX / 2) * sprite.res, (l.y - FISH_TEX / 2) * sprite.res, Math.max(14, l.r * 8) * sprite.res, l.color, strength);
  }
  ctx.restore();
}

/** The lander's lights, which filmed the record: a pale pool around the snailfish. */
function drawLanderLight(ctx: CanvasRenderingContext2D, x: number, y: number, strength: number): void {
  if (strength <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 520);
  g.addColorStop(0, `rgba(170,200,255,${(0.32 * strength).toFixed(3)})`);
  g.addColorStop(0.5, `rgba(120,160,240,${(0.12 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(120,160,240,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - 520, y - 520, 1040, 1040);
  ctx.restore();
}

function drawBubble(ctx: CanvasRenderingContext2D, t: number): void {
  const b = bubbleAt(t);
  if (!b) return;
  const dark = darkBehind(b.y, t);
  ctx.save();
  ctx.strokeStyle = dark > 0.45 ? PALE : INK;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.2, b.r * 0.55, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
  ctx.restore();
}

export function createDepth(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const snow = makeSnow();
  const sprites = new Map<FishShape, Sprite>([...SWIMMERS.map((s) => s.shape), 'snailfish' as const].map((shape) => [shape, makeSprite(shape, SPRITE_RES)] as const));

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    ctx.drawImage(paper, 0, 0);
    drawWater(ctx, t);
    drawRays(ctx, t);
    drawSurface(ctx, t);
    drawSnow(ctx, snow, t);
    drawTrench(ctx, t);
    drawZoneLines(ctx, t);

    for (const s of SWIMMERS) {
      const p = swimmerAt(s, t);
      if (p.y < -s.length || p.y > VIDEO.height + s.length || p.x < -s.length || p.x > VIDEO.width + s.length) continue;
      const sprite = sprites.get(s.shape)!;
      const pose = poseFor(s.shape, p.x, p.y, s.length, s.dir, 0.04 * Math.sin(p.beat * 0.25), p.beat);
      drawSwimmer(ctx, sprite, pose, boil);
      const dark = darknessAt(swimmerMetres(s));
      drawGlow(ctx, sprite, pose, dark * (0.85 + 0.15 * Math.sin(t * 3 + s.x)));
      drawLabel(ctx, s.name, p.x, p.y + s.length * 0.3 + 46, 54, 0.9, dark);
    }

    const snail = snailfishAt(t);
    if (snail.y > -400 && snail.y < VIDEO.height + 400) {
      drawLanderLight(ctx, snail.x, snail.y, smooth((t - 12) / 2));
      drawSwimmer(ctx, sprites.get('snailfish')!, poseFor('snailfish', snail.x, snail.y, SNAIL_LENGTH, 1, snail.tilt, snail.beat), boil);
    }
    drawBubble(ctx, t);

    for (const c of HOOK_CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, c.weight, captionAlpha(c, t));
    for (const c of PAYOFF_CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, c.weight, captionAlpha(c, t), PAPER_ON_INK);
    const show = counterAlpha(t);
    if (show > 0) {
      const metres = counterMetres(t);
      // White on an ink outline reads over sunlit and black water alike.
      drawTextLine(ctx, formatMetres(metres), VIDEO.width / 2, 390, 150, 700, show, PAPER_ON_INK);
      drawTextLine(ctx, zoneAt(metres).name, VIDEO.width / 2, 465, 64, 700, show, PAPER_ON_INK);
    }
  };

  return { loopSeconds: LOOP_S, draw, audio: renderDepthAudio };
}
