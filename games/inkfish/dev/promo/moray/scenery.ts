import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { HOLE, LOOP_S, type Pt } from './story';

/** The reef round the moray: its rock with the crevice it lives in, the sand, and weed swaying in the current. */

/** The rock's outline, a boulder filling the left edge; the crevice opens in its right face. */
export const ROCK: readonly Pt[] = [
  { x: -60, y: 870 }, { x: 20, y: 846 }, { x: 105, y: 868 }, { x: 175, y: 946 }, { x: 205, y: 1046 }, { x: 203, y: 1156 },
  { x: 237, y: 1248 }, { x: 190, y: 1318 }, { x: -60, y: 1330 },
];
const FLOOR_Y = 1290;
const STONE = '#c9bd9b';
const SAND = '#e6d6aa';

const rockPath = (ctx: CanvasRenderingContext2D | Path2D): void => {
  ROCK.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
};

/** The crevice's mouth. */
export function holePath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, HOLE.turn, 0, Math.PI * 2);
}

/** Everything but the rock, to clip the moray to (with even-odd filling). */
export const OUTSIDE_ROCK: Path2D = (() => {
  const region = new Path2D();
  region.rect(-100, -100, VIDEO.width + 200, VIDEO.height + 200);
  rockPath(region);
  return region;
})();

/** The rock and the sand, drawn once: stone washed over paper, hatched in shadow, cracks, and the dark crevice. */
export function makeReef(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(808);
  // The sand: a pale band with a wavy top and pebbles.
  ctx.beginPath();
  ctx.moveTo(-20, VIDEO.height + 20);
  for (let x = -20; x <= VIDEO.width + 20; x += 30) ctx.lineTo(x, FLOOR_Y + 14 * Math.sin(x * 0.011) + 6 * Math.sin(x * 0.037));
  ctx.lineTo(VIDEO.width + 20, VIDEO.height + 20);
  ctx.closePath();
  ctx.fillStyle = SAND;
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(rng() * VIDEO.width, FLOOR_Y + 30 + rng() * 560, 1.5 + rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The rock.
  ctx.save();
  ctx.beginPath();
  rockPath(ctx);
  ctx.fillStyle = STONE;
  ctx.fill();
  ctx.clip();
  // Shadow hatching low and to the right, and pits.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.28;
  for (let y = 860; y < 1340; y += 15) {
    ctx.beginPath();
    ctx.moveTo(105 + (y - 860) * 0.05, y);
    ctx.lineTo(275, y - 60);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 28; i++) {
    ctx.beginPath();
    ctx.ellipse(rng() * 200 - 20, 870 + rng() * 440, 4 + rng() * 9, 3 + rng() * 5, rng(), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 3;
  for (const crack of [[{ x: 10, y: 930 }, { x: 50, y: 990 }, { x: 40, y: 1060 }], [{ x: 40, y: 1180 }, { x: 90, y: 1230 }, { x: 70, y: 1300 }]]) {
    ctx.beginPath();
    crack.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
  // The crevice: dark inside, an inked rim.
  holePath(ctx);
  ctx.fillStyle = '#1d1a1e';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  rockPath(ctx);
  ctx.lineWidth = 6;
  ctx.stroke();
  return canvas;
}

/** Weed on the rock and the sand, swaying a whole number of times a loop. */
const WEEDS = [
  { x: 10, y: 852, len: 150, sways: 2, phase: 0 },
  { x: 75, y: 856, len: 110, sways: 3, phase: 1.3 },
  { x: 880, y: FLOOR_Y + 6, len: 230, sways: 2, phase: 2.1 },
  { x: 950, y: FLOOR_Y + 2, len: 170, sways: 3, phase: 0.4 },
  { x: 560, y: FLOOR_Y + 12, len: 140, sways: 2, phase: 3.3 },
] as const;

export function drawWeed(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  for (const w of WEEDS) {
    const sway = Math.sin((2 * Math.PI * w.sways * t) / LOOP_S + w.phase);
    const pts: Pt[] = Array.from({ length: 9 }, (_, i) => {
      const u = i / 8;
      return { x: w.x + sway * 34 * u * u + 8 * Math.sin(u * 6 + w.phase), y: w.y - w.len * u };
    });
    for (const [width, colour] of [[11, INK], [6, '#7f9a4a']] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  ctx.restore();
}
