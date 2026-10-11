import type { FishShape } from '../../src/art/fishArt';
import { INK, PAPER } from '../../src/art/pen';
import { ART_RES, drawBubble, drawPaper, drawRock, drawWeed, type WeedKind } from '../../src/art/propArt';
import { CLOUD_SIZE, drawCloud } from '../../src/art/skyArt';
import { BIRD_TEX, drawBird } from '../../src/art/birdArt';
import type { BirdId } from '../../src/logic/birds';
import { createRng } from '../../src/logic/rng';
import type { Pose } from './chain';
import { drawExclaim } from './render';
import { makeSprite } from './sprites';
import { drawSwimmer } from './swimmer';

/**
 * The YouTube channel banner, 2560x1440, from the game's own art.
 *
 * YouTube shows different crops: TVs the whole image, desktops the middle
 * 2560x423 strip, phones only its centre 1546x423. So the logo and the head
 * of the food chain sit inside that centre; the shark finishing the chain is
 * for desktops; the sky and the seabed are for TVs.
 */
export const BANNER = { width: 2560, height: 1440 } as const;
/** The crop every device shows, and the wider one desktops show. */
export const SAFE = { x: 507, y: 508, width: 1546, height: 423 } as const;
export const DESKTOP = { x: 0, y: 508, width: 2560, height: 423 } as const;

const SURFACE_Y = 330;
const BLUE_INK = '#1f3f8a';
const INK_SOFT = '#4a463e';

function paper(ctx: CanvasRenderingContext2D): void {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  drawPaper(tile.getContext('2d')!, 512);
  ctx.save();
  ctx.scale(2, 2);
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
  ctx.fillRect(0, 0, BANNER.width / 2, BANNER.height / 2);
  ctx.restore();
  // The game's shallow-water wash, darkening with depth, below the surface only.
  const wash = ctx.createLinearGradient(0, SURFACE_Y, 0, BANNER.height);
  wash.addColorStop(0, 'rgba(44,79,134,0.03)');
  wash.addColorStop(1, 'rgba(44,79,134,0.2)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, SURFACE_Y, BANNER.width, BANNER.height - SURFACE_Y);
}

function wavy(ctx: CanvasRenderingContext2D, y: (x: number) => number, width: number, alpha: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = -10; x <= BANNER.width + 10; x += 12) {
    if (x === -10) ctx.moveTo(x, y(x));
    else ctx.lineTo(x, y(x));
  }
  ctx.stroke();
  ctx.restore();
}

/** Draws a piece of game art made at ART_RES onto the banner at `size` times its game size. */
function stamp(ctx: CanvasRenderingContext2D, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, x: number, y: number, size: number, flip = false): void {
  const art = document.createElement('canvas');
  art.width = w * ART_RES;
  art.height = h * ART_RES;
  draw(art.getContext('2d')!);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -size : size, size);
  ctx.drawImage(art, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function sky(ctx: CanvasRenderingContext2D): void {
  stamp(ctx, CLOUD_SIZE.w, CLOUD_SIZE.h, (c) => drawCloud(c, 61), 420, 150, 1.3);
  stamp(ctx, CLOUD_SIZE.w, CLOUD_SIZE.h, (c) => drawCloud(c, 78), 1500, 110, 1.1, true);
  stamp(ctx, CLOUD_SIZE.w, CLOUD_SIZE.h, (c) => drawCloud(c, 95), 2250, 180, 1.4);
  const birds: [BirdId, number, number, number, boolean][] = [['gull', 1050, 200, 0.9, false], ['tern', 1900, 250, 0.7, true]];
  for (const [kind, x, y, size, flip] of birds) stamp(ctx, BIRD_TEX.w, BIRD_TEX.h, (c) => drawBird(c, kind, 1, 5), x, y, size, flip);
  // The surface: the game's wavy double pen line.
  wavy(ctx, (x) => SURFACE_Y + Math.sin(x / 70) * 7, 2.8, 0.75);
  wavy(ctx, (x) => SURFACE_Y + 16 + Math.sin(x / 70 + 1) * 6, 1.4, 0.3);
}

const floorAt = (x: number): number => 1210 + Math.sin(x / 260) * 30 + Math.sin(x / 97 + 2) * 12;

function seabed(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(1440);
  ctx.save();
  ctx.fillStyle = 'rgba(230,216,184,0.6)';
  ctx.beginPath();
  ctx.moveTo(0, BANNER.height);
  for (let x = 0; x <= BANNER.width; x += 16) ctx.lineTo(x, floorAt(x));
  ctx.lineTo(BANNER.width, BANNER.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  for (let i = 0; i < 2600; i++) {
    const x = rng() * BANNER.width;
    const depth = rng();
    ctx.globalAlpha = 0.25 + depth * 0.35;
    ctx.beginPath();
    ctx.arc(x, floorAt(x) + 6 + depth * depth * (BANNER.height - floorAt(x)), 0.6 + rng() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  wavy(ctx, floorAt, 2.6, 0.85);
  // Weeds frame the strip from the edges; rocks sit on the sand.
  const weeds: [WeedKind, number, number][] = [[0, 150, 2.3], [2, 330, 1.6], [1, 2270, 1.9], [0, 2440, 2.5], [2, 980, 1.2], [1, 1700, 1.1]];
  for (const [kind, x, size] of weeds) {
    // Weeds draw at whatever size their canvas is, rooted at its bottom.
    const art = document.createElement('canvas');
    art.width = 128 * ART_RES;
    art.height = 256 * ART_RES;
    drawWeed(art.getContext('2d')!, 7 + kind * 13 + x, kind, 0, art.width, art.height);
    const w = 128 * size;
    const h = 256 * size;
    ctx.drawImage(art, x - w / 2, floorAt(x) - h + 14, w, h);
  }
  for (const [x, w] of [[620, 340], [1300, 260], [2050, 380]] as const) {
    const art = document.createElement('canvas');
    art.width = w;
    art.height = w / 2;
    drawRock(art.getContext('2d')!, 40 + x, w, w / 2);
    ctx.drawImage(art, x - w / 2, floorAt(x) - w / 2 + 22);
  }
}

/** The game's "~" current marks, scattered through the open water. */
function currents(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(77);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const x = rng() * BANNER.width;
    const y = SURFACE_Y + 60 + rng() * (floorAt(x) - SURFACE_Y - 120);
    const len = 50 + rng() * 40;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = x + (k / 6) * len;
      const py = y + Math.sin(k * 1.4) * 4;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The site's logo, big: "16bit" in pixel type and ".ink" in blue handwriting, then the strapline. */
function logo(ctx: CanvasRenderingContext2D): void {
  const cx = 925;
  const base = 735;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.font = '150px Silkscreen';
  const bits = ctx.measureText('16bit').width;
  ctx.font = '700 240px Caveat';
  const ink = ctx.measureText('.ink').width;
  const left = cx - (bits + ink - 18) / 2;
  // A paper halo so passing current marks never cross the letters.
  for (const pass of ['halo', 'fill'] as const) {
    ctx.font = '150px Silkscreen';
    ctx.lineJoin = 'round';
    if (pass === 'halo') {
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 26;
      ctx.globalAlpha = 0.85;
      ctx.strokeText('16bit', left, base);
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = INK;
      ctx.fillText('16bit', left, base);
    }
    ctx.save();
    ctx.translate(left + bits - 18, base + 12);
    ctx.rotate(-0.07);
    ctx.font = '700 240px Caveat';
    if (pass === 'halo') ctx.strokeText('.ink', 0, 0);
    else {
      ctx.fillStyle = BLUE_INK;
      ctx.fillText('.ink', 0, 0);
    }
    ctx.restore();
  }
  ctx.font = '500 78px Caveat';
  ctx.textAlign = 'center';
  ctx.fillStyle = INK_SOFT;
  ctx.fillText('little games, drawn by code', cx, base + 108);
  ctx.restore();
}

/** The food chain heading for the logo: each fish gaping at the smaller one ahead; the little inkling flees. */
const CHAIN: readonly { shape: FishShape; length: number }[] = [
  { shape: 'inkling', length: 82 },
  { shape: 'clownfish', length: 118 },
  { shape: 'perch', length: 160 },
  { shape: 'mahi', length: 214 },
  { shape: 'grouper', length: 270 },
  { shape: 'shark', length: 360 },
];

function foodChain(ctx: CanvasRenderingContext2D): void {
  let tail = 1330;
  CHAIN.forEach(({ shape, length }, i) => {
    // Nose just behind the tail of the fish ahead.
    const x = tail + 12 + length / 2;
    tail = x + length * 0.74;
    const y = 712 + Math.sin(i * 1.7 + 0.4) * 26;
    const pose: Pose = { j: i, shape, age: 0, x, y, length, facing: -1, tilt: Math.sin(i * 2.3) * 0.06, beat: i * 1.9, effort: 0.7 };
    drawSwimmer(ctx, makeSprite(shape), pose, i, { jaw: i === 0 ? 0 : 0.62 });
    if (i === 0) drawExclaim(ctx, x - length * 0.15, y - length * 0.62, length * 0.5, -0.12);
  });
  // A few bubbles trailing up from the chase.
  const rng = createRng(9);
  for (let i = 0; i < 9; i++) {
    const bx = 1420 + rng() * 700;
    const by = 560 + rng() * 120;
    const size = 1.4 + rng() * 1.8;
    stamp(ctx, 16, 16, (c) => drawBubble(c, 3 + i), bx, by, size);
  }
}

/** Dashed outlines of the device crops, for checking the layout (?guides). */
export function drawGuides(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.lineWidth = 4;
  ctx.setLineDash([24, 14]);
  ctx.strokeStyle = '#d23';
  ctx.strokeRect(DESKTOP.x + 2, DESKTOP.y, DESKTOP.width - 4, DESKTOP.height);
  ctx.strokeStyle = '#2a2';
  ctx.strokeRect(SAFE.x, SAFE.y, SAFE.width, SAFE.height);
  ctx.restore();
}

export function drawBanner(ctx: CanvasRenderingContext2D): void {
  paper(ctx);
  sky(ctx);
  currents(ctx);
  seabed(ctx);
  logo(ctx);
  foodChain(ctx);
}
