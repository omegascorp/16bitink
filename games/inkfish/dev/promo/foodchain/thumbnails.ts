import { createRng } from '../../../src/logic/rng';
import { makeSprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { arrow, caption, divider, FULL, RED_MOUTH, sticker, water, YELLOW, type Rect } from '../thumbnailKit';
import * as blueWhale from './art/blueWhale';
import * as greatWhite from './art/greatWhite';
import * as orca from './art/orca';
import * as plankton from './art/plankton';

/**
 * The thumbnails for the second long-form video, "fish eat fish size
 * comparison… but every animal is real" (script.md, "Thumbnail"):
 * - split:  MrBeast's "$1 vs $X": only the two ends, the one-eyed copepod
 *           against the blue whale's open mouth, each with its weight;
 * - nest:   mouths inside mouths, tuna ← mackerel ← anchovy ← copepod, "UNTIL…";
 * - wrong:  small fish climbing a staircase while the blue whale's arrow points
 *           down to a krill, "WRONG WAY?";
 * - lunch:  an orca's open jaws over a small, worried great white, "LUNCH".
 */
export const FOODCHAIN_THUMBNAILS = ['split', 'nest', 'wrong', 'lunch'] as const;
export type FoodchainThumbnail = (typeof FOODCHAIN_THUMBNAILS)[number];

const W = 1280;
const H = 720;

/** Sunlit plankton water: pale green, lit from the top. */
function planktonWater(ctx: CanvasRenderingContext2D, area: Rect): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#c9f0d6');
  g.addColorStop(1, '#5fbfa8');
  ctx.fillStyle = g;
  ctx.fillRect(area.x, area.y, area.width, area.height);
}

/** The blue whale lunging left with its mouth wide and throat ballooned, its snout's tip at `tipX`. */
function lungingWhale(c: CanvasRenderingContext2D, tipX: number, y: number, length: number, krill: number): void {
  const pose = { gape: 1, throat: 0.8, tail: 0 };
  const x = tipX + 0.5 * length;
  blueWhale.drawBlueWhaleBack(c, x, y, length, Math.PI, 0, pose, true);
  const mouth = blueWhale.blueWhaleMouth(x, y, length, Math.PI, pose, true);
  const rng = createRng(5);
  for (let i = 0; i < krill; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * mouth.radius * 1.6;
    plankton.drawKrill(c, mouth.x - mouth.radius * 0.6 + Math.cos(a) * r, mouth.y + Math.sin(a) * r * 0.7, 46 + rng() * 26, Math.PI + (rng() - 0.5), 0, { kick: rng() });
  }
  blueWhale.drawBlueWhaleFront(c, x, y, length, Math.PI, 0, pose, true);
}

function drawSplit(ctx: CanvasRenderingContext2D): void {
  const left: Rect = { x: 0, y: 0, width: 440, height: H };
  const right: Rect = { x: 440, y: 0, width: W - 440, height: H };
  planktonWater(ctx, left);
  water(ctx, right, { x: 1000, y: 120 });
  sticker(ctx, (c) => plankton.drawCopepod(c, 220, 320, 360, 0.15, 0, { kick: 0.2 }), { clip: left, outline: 7 });
  sticker(ctx, (c) => lungingWhale(c, 470, 300, 3300, 10), { clip: right, outline: 7 });
  divider(ctx, 440);
  caption(ctx, '0.0000002 lb', 220, 620, 54, 400, YELLOW);
  caption(ctx, '330,000 lb', 820, 620, 96, 620, '#ffffff');
}

function drawNest(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 300, y: 80 });
  // Each one with its mouth open round the next: drawn inside to outside, mouth then body, so the smaller one sits in the throat.
  const chain = [
    { shape: 'tuna', length: 1500, x: 1500, y: 420, sprite: makeSprite('tuna', 10) },
    { shape: 'mackerel', length: 600, x: 650, y: 400, sprite: makeSprite('mackerel', 8) },
    { shape: 'anchovy', length: 250, x: 322, y: 392, sprite: makeSprite('anchovy', 6) },
  ] as const;
  const look = (part: 'mouth' | 'body') => ({ jaw: 1, part, mouth: RED_MOUTH });
  sticker(ctx, (c) => {
    chain.forEach((f, i) => {
      drawSwimmer(c, f.sprite, { j: i, shape: f.shape, age: 0, x: f.x, y: f.y, length: f.length, facing: -1, tilt: 0.05, beat: i * 1.9, effort: 0.8 }, i, look('mouth'));
    });
    plankton.drawCopepod(c, 175, 388, 110, Math.PI, 0, { kick: 0.6 });
    [...chain].reverse().forEach((f, k) => {
      const i = chain.length - 1 - k;
      drawSwimmer(c, f.sprite, { j: i, shape: f.shape, age: 0, x: f.x, y: f.y, length: f.length, facing: -1, tilt: 0.05, beat: i * 1.9, effort: 0.8 }, i, look('body'));
    });
  }, { outline: 7 });
  // Silkscreen has no ellipsis character: three full stops.
  caption(ctx, 'UNTIL...', 340, 120, 120, 600, YELLOW);
}

function drawWrong(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 400, y: 60 });
  sticker(ctx, (c) => lungingWhale(c, 640, 330, 3000, 0), { outline: 7 });
  // A staircase of small fish going up and to the left.
  const steps = [
    { shape: 'anchovy', length: 90 },
    { shape: 'mackerel', length: 120 },
    { shape: 'tuna', length: 170 },
  ] as const;
  sticker(ctx, (c) => {
    c.save();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 10;
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * 130;
      const y = 600 - i * 120;
      c.moveTo(x, y);
      c.lineTo(x + 130, y);
      c.lineTo(x + 130, y - 120);
    }
    c.stroke();
    c.restore();
    steps.forEach((s, i) => drawSwimmer(c, makeSprite(s.shape, 4), { j: i, shape: s.shape, age: 0, x: 140 + i * 130, y: 560 - i * 120, length: s.length, facing: 1, tilt: 0.3, beat: i, effort: 0.6 }, i));
    orca.drawOrca(c, 140 + 3 * 130 + 20, 560 - 3 * 120 - 10, 230, -0.3, 0, { jaw: 0 });
    plankton.drawKrill(c, 520, 590, 190, 0.2, 0, { kick: 0.3 });
  }, { outline: 6 });
  arrow(ctx, 660, 450, 170, 2.45);
  caption(ctx, 'WRONG WAY?', 900, 90, 84, 620, YELLOW);
}

function drawLunch(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 900, y: 80 });
  sticker(ctx, (c) => orca.drawOrca(c, 1350, 300, 2700, Math.PI, 0, { jaw: 0.85 }, true), { outline: 8 });
  sticker(ctx, (c) => greatWhite.drawGreatWhite(c, 300, 520, 460, -0.25, 0, { jaw: 0.1, worried: 1 }), { outline: 7 });
  caption(ctx, 'LUNCH', 300, 130, 130, 520, YELLOW);
}

export function drawFoodchainThumbnail(ctx: CanvasRenderingContext2D, id: FoodchainThumbnail): void {
  ctx.clearRect(0, 0, W, H);
  ({ split: drawSplit, nest: drawNest, wrong: drawWrong, lunch: drawLunch })[id](ctx);
}
