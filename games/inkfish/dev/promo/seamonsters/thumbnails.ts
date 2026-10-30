import { caption, divider, FULL, sticker, water, YELLOW } from '../thumbnailKit';
import { drawDiver, drawYou } from '../swallowyou/art/people';
import { drawLegend, prepare as prepareLegends } from './art/legends';
import { drawSiphonophoreAlong, prepare as prepareSiphonophore } from './art/siphonophore';
import { drawMonster, prepareCast, SQUID_EYE } from './cast';
import { type Monster } from './species';

/**
 * The thumbnails for the fourth long-form video, "sea monsters size
 * comparison… but every one is real" (script.md, "Thumbnails"):
 * - legend: a hard split, the sepia kraken engraving wrapping a ship on the
 *           left, the real giant squid on saturated blue on the right; "REAL";
 * - lineup: the row on blue, small to huge, you to the blue whale, and a
 *           pale string over them running off the right edge; "LONGER?";
 * - eye:    the giant squid's eye filling the right two-thirds, a tiny
 *           yellow diver on the left; "IT'S REAL".
 */
export const SEAMONSTERS_THUMBNAILS = ['legend', 'lineup', 'eye'] as const;
export type SeamonstersThumbnail = (typeof SEAMONSTERS_THUMBNAILS)[number];

const W = 1280;
const H = 720;

function drawLegendSplit(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 960, y: 120 });
  // The engraving on the left 45%, cropped so the kraken and the ship fill it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 580, H);
  ctx.clip();
  drawLegend(ctx, 'kraken', -330, -40, 1240, 800, 0.4, {});
  ctx.restore();
  divider(ctx, 580);
  // The whole squid, mantle up and to the left, its arms spread below it in the frame.
  sticker(ctx, (c) => drawMonster(c, 'squid', { x: 640, y: 250 }, 700, -1, 0.6, {}, 0.42), { outline: 7 });
  caption(ctx, 'REAL', 930, 120, 150, 560, YELLOW);
}

/** The row, sizes to scale: you, then each animal, front to tail, left to right. */
const ROW: readonly { readonly m: Monster; readonly feet: number }[] = [
  { m: 'frilled', feet: 6.5 },
  { m: 'manatee', feet: 13 },
  { m: 'oarfish', feet: 26 },
  { m: 'squid', feet: 40 },
  { m: 'sperm', feet: 52 },
  { m: 'blue', feet: 100 },
];

function drawLineup(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 80 });
  const ppf = 6;
  const bed = 650;
  let x = 30;
  sticker(ctx, (c) => drawYou(c, x + 6, bed, 5.75 * ppf * 1.6, 0, { fill: YELLOW, halo: 0 }), { outline: 4 });
  x += 22;
  for (const { m, feet } of ROW) {
    const len = feet * ppf;
    const y = bed - Math.max(14, len * 0.11);
    sticker(ctx, (c) => drawMonster(c, m, { x, y }, len, -1, 0.3, m === 'sperm' ? { gape: 0.3 } : {}), { outline: 5 });
    x += len + 14;
  }
  // The siphonophore, 150 ft at the same scale, above the row and off the right edge.
  const path = Array.from({ length: 121 }, (_, i) => ({ x: 260 + i * 9, y: 330 + 26 * Math.sin(i * 0.17) }));
  drawSiphonophoreAlong(ctx, path, 0.5, { glow: 1, width: 14, side: 1, sway: 0 });
  caption(ctx, 'LONGER?', 760, 170, 120, 560, YELLOW);
}

function drawEye(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 900, y: 200 });
  const len = 3200;
  sticker(ctx, (c) => drawMonster(c, 'squid', { x: 860 - SQUID_EYE.along * len, y: 380 }, len, -1, 0.6), { outline: 7 });
  sticker(ctx, (c) => drawDiver(c, 200, 470, 200, 1, 0.4, { fill: YELLOW, halo: 0 }), { outline: 6 });
  caption(ctx, "IT'S REAL", 330, 130, 110, 560, YELLOW);
}

export async function drawSeamonstersThumbnail(ctx: CanvasRenderingContext2D, id: SeamonstersThumbnail): Promise<void> {
  await Promise.all([prepareCast(), prepareLegends(), prepareSiphonophore()]);
  ctx.clearRect(0, 0, W, H);
  if (id === 'legend') drawLegendSplit(ctx);
  else if (id === 'lineup') drawLineup(ctx);
  else drawEye(ctx);
}
