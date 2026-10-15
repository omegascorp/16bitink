import { fishLights, type FishShape } from '../../../src/art/fishArt';
import { FISH_TEX } from '../../../src/art/fish/kit';
import { halo } from '../../../src/art/glowArt';
import { drawPaper } from '../../../src/art/propArt';
import { createRng } from '../../../src/logic/rng';
import { lureOf } from '../light/render';
import { makeSprite } from '../sprites';
import { caption, divider, drawFish, FULL, poseOf, RED, RED_MOUTH, sticker, water, YELLOW, type Fish, type Rect } from '../thumbnailKit';

/**
 * The thumbnails for the first long-form video, "fish get weirder the deeper
 * you go… until they can't", from the game's own art. Three ideas for
 * YouTube's Test & Compare (docs/longform-playbook.md has the research):
 * - split:  a cute reef fish at 10 m against the black seadevil's open mouth
 *           at 4,000 m, the depth split behind Bright Side's 12.7M-view video;
 * - line:   the deep's strangest faces above a red dashed line, "NO FISH",
 *           and something pale in the lamp's light below it: the curiosity gap;
 * - layers: the ocean's layers as bands, one fish each, stranger and darker
 *           down to a glowing "?", like the hand-painted 2M-view layer video.
 */
export const DESCENT_THUMBNAILS = ['split', 'line', 'layers'] as const;
export type DescentThumbnail = (typeof DESCENT_THUMBNAILS)[number];

const W = 1280;
const H = 720;

/** The deep: blue-black water over the paper's grain, lit from `light`. */
function deepWater(ctx: CanvasRenderingContext2D, area: Rect, light: { readonly x: number; readonly y: number }, top = '#123a7a', bottom = '#02050f'): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();
  const g = ctx.createLinearGradient(0, area.y, 0, area.y + area.height);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(area.x, area.y, area.width, area.height);
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  drawPaper(tile.getContext('2d')!, 512);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
  ctx.fillRect(area.x, area.y, area.width, area.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, 460);
  glow.addColorStop(0, 'rgba(80,140,255,0.35)');
  glow.addColorStop(1, 'rgba(80,140,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(area.x, area.y, area.width, area.height);
  // Marine snow.
  const rng = createRng(9);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#dfe8ff';
  for (let i = 0; i < 140; i++) {
    ctx.globalAlpha = 0.25 + rng() * 0.35;
    ctx.beginPath();
    ctx.arc(area.x + rng() * area.width, area.y + rng() * area.height, 1 + rng() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A fish's own lights, glowing over it. */
function glowOf(ctx: CanvasRenderingContext2D, fish: Fish, j: number, strength = 1): void {
  const sprite = makeSprite(fish.shape, undefined, fish.variant);
  const pose = poseOf(fish, j);
  const scale = pose.length / sprite.bodyPx;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(scale, scale);
  for (const l of fishLights(fish.shape)) halo(ctx, (l.x - FISH_TEX / 2) * sprite.res, (l.y - FISH_TEX / 2) * sprite.res, Math.max(14, l.r * 8) * sprite.res, l.color, strength);
  ctx.restore();
}

/** The seadevil's lure, lit. */
function lure(ctx: CanvasRenderingContext2D, fish: Fish, j: number): void {
  const sprite = makeSprite(fish.shape, undefined, fish.variant);
  const p = lureOf(sprite, poseOf(fish, j));
  halo(ctx, p.x, p.y, 260, '#d8f4ff', 0.45);
  halo(ctx, p.x, p.y, 70, '#ffffff', 1);
}

const SPLIT = 560;
const LEFT: Rect = { x: 0, y: 0, width: SPLIT, height: H };
const RIGHT: Rect = { x: SPLIT, y: 0, width: W - SPLIT, height: H };

function split(ctx: CanvasRenderingContext2D): void {
  water(ctx, LEFT, { x: 260, y: 420 });
  deepWater(ctx, RIGHT, { x: 820, y: 260 });
  const clown: Fish = { shape: 'clownfish', variant: 'light', x: 280, y: 450, length: 360, facing: 1, tilt: 0.06, look: { jaw: 0.3 } };
  sticker(ctx, (c) => drawFish(c, clown, 0), { outline: 7, clip: LEFT });
  const devil: Fish = { shape: 'seadevil', variant: 'heavy', x: 1000, y: 470, length: 780, facing: -1, tilt: 0.08, look: { jaw: 1, mouth: { ...RED_MOUTH, teeth: true } } };
  sticker(ctx, (c) => drawFish(c, devil, 1), { outline: 6, clip: RIGHT });
  ctx.save();
  ctx.beginPath();
  ctx.rect(RIGHT.x, RIGHT.y, RIGHT.width, RIGHT.height);
  ctx.clip();
  lure(ctx, devil, 1);
  ctx.restore();
  divider(ctx, SPLIT);
  caption(ctx, '10 m', SPLIT / 2, 100, 120, 460);
  caption(ctx, '4,000 m', SPLIT + (W - SPLIT) / 2 + 40, 92, 110, 600, YELLOW);
}

function line(ctx: CanvasRenderingContext2D): void {
  deepWater(ctx, FULL, { x: 640, y: 200 }, '#0f2f66', '#010309');
  const fang: Fish = { shape: 'fangtooth', variant: 'heavy', x: 270, y: 240, length: 460, facing: 1, tilt: 0.04, look: { jaw: 1, mouth: { ...RED_MOUTH, teeth: true } } };
  const viper: Fish = { shape: 'viperfish', variant: 'light', x: 1000, y: 250, length: 560, facing: -1, tilt: -0.05 };
  sticker(ctx, (c) => drawFish(c, fang, 0), { outline: 6 });
  // Drawn as it is: its drawing is already all gape and fangs, so it is never opened any wider.
  sticker(ctx, (c) => drawFish(c, viper, 1), { outline: 6 });
  glowOf(ctx, viper, 1, 0.8);
  // The lamp's light below the line, and something pale in it.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(1220, 470, 10, 1220, 470, 900);
  g.addColorStop(0, 'rgba(190,215,255,0.5)');
  g.addColorStop(0.6, 'rgba(140,175,245,0.14)');
  g.addColorStop(1, 'rgba(120,160,240,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(1220, 470);
  ctx.arc(1220, 470, 900, Math.PI * 0.82, Math.PI * 1.0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Half in the light, half still in the dark.
  const ghost: Fish = { shape: 'snailfish', variant: 'light', x: 560, y: 610, length: 420, facing: 1, tilt: 0.05 };
  ctx.save();
  ctx.globalAlpha = 0.32;
  drawFish(ctx, ghost, 2);
  ctx.restore();
  // The line.
  ctx.save();
  ctx.strokeStyle = '#111014';
  ctx.lineWidth = 22;
  ctx.setLineDash([60, 34]);
  ctx.beginPath();
  ctx.moveTo(-20, 470);
  ctx.lineTo(W + 20, 470);
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.restore();
  caption(ctx, 'NO FISH', 300, 560, 110, 520, YELLOW);
  caption(ctx, '?', 980, 600, 170, 200);
}

const BANDS: readonly { readonly shape: FishShape; readonly top: string; readonly bottom: string; readonly glow: boolean }[] = [
  { shape: 'clownfish', top: '#47d4f5', bottom: '#1e9ee0', glow: false },
  { shape: 'lanternfish', top: '#1b6fc0', bottom: '#134c93', glow: true },
  { shape: 'seadevil', top: '#103a75', bottom: '#0a2552', glow: false },
  { shape: 'loosejaw', top: '#081a3c', bottom: '#050f26', glow: true },
];

function layers(ctx: CanvasRenderingContext2D): void {
  const h = H / (BANDS.length + 1);
  BANDS.forEach((b, i) => {
    const area: Rect = { x: 0, y: i * h, width: W, height: h };
    const g = ctx.createLinearGradient(0, area.y, 0, area.y + h);
    g.addColorStop(0, b.top);
    g.addColorStop(1, b.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(area.x, area.y, area.width, area.height);
  });
  deepWater(ctx, { x: 0, y: BANDS.length * h, width: W, height: h + 2 }, { x: 640, y: H - h / 2 }, '#03091a', '#000000');
  // One fish per band, stranger and bigger going down, alternating sides.
  BANDS.forEach((b, i) => {
    const length = [200, 240, 200, 290][i]!;
    const fish: Fish = {
      shape: b.shape, variant: i >= 2 ? 'heavy' : 'light', x: i % 2 ? 860 : 420, y: i * h + h / 2 + 6, length, facing: i % 2 ? -1 : 1, tilt: 0.04,
      look: i === 2 ? { jaw: 1, mouth: { ...RED_MOUTH, teeth: true } } : undefined,
    };
    sticker(ctx, (c) => drawFish(c, fish, i), { outline: 5 });
    if (b.glow) glowOf(ctx, fish, i, 0.9);
    if (b.shape === 'seadevil') lure(ctx, fish, i);
  });
  // The dashed lines between the layers, in ink.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 12]);
  for (let i = 1; i <= BANDS.length; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * h);
    ctx.lineTo(W, i * h);
    ctx.stroke();
  }
  ctx.restore();
  // The bottom layer: just a glowing "?".
  halo(ctx, 640, BANDS.length * h + h / 2, 200, '#9fd0ff', 0.6);
  caption(ctx, '?', 640, BANDS.length * h + h / 2 + 4, 120, 200, YELLOW);
  caption(ctx, 'EVERY DEPTH', 1060, 60, 64, 400);
}

const DRAW: Readonly<Record<DescentThumbnail, (ctx: CanvasRenderingContext2D) => void>> = { split, line, layers };

export function drawDescentThumbnail(ctx: CanvasRenderingContext2D, id: DescentThumbnail): void {
  DRAW[id](ctx);
}
