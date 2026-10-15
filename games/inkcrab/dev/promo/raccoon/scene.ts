import { glow } from '../../../src/art/backdrop/estuary';
import { seaStack, surf } from '../../../src/art/backdrop/fogCoast';
import { rock, joint } from '../../../src/art/backdrop/granite';
import { moonPath, nightSwell, BAY, BAY_DEEP, BAY_FAR } from '../../../src/art/backdrop/glowSea';
import { moonSand } from '../../../src/art/backdrop/nightShore';
import { fullMoon, HAZE, INDIGO, moonlit, NIGHT, NIGHT_BLUE, stars } from '../../../src/art/backdrop/nightSky';
import { wrackLine } from '../../../src/art/backdrop/pnw';
import { drawWrack } from '../../../src/art/kelp';
import { cub, type Draw, edge, makeDraw, pt, skin } from '../../../src/art/kit';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { PAPER, PAPER_FILL } from '../../../src/art/palette';
import { VIDEO } from '../short';

/**
 * The kelp beach (beach 6, the raccoon's level) at night: the Oregon coast
 * under a full moon, Haystack Rock in the surf, washed-up bull kelp on the
 * moonlit sand, and in front a tidepool cut in the rock, seen side-on as the
 * game sees everything. The backdrop is baked once; the pool's water is
 * laid over whatever is in it each frame. Screen px.
 */
const { width: W, height: H } = VIDEO;

/** The sea's far edge, the moon, and the sand's top. */
export const HORIZON = 770;
export const MOON = { x: 850, y: 330, r: 56 } as const;
const SAND_TOP = 870;

/** The rock ledge the raccoon crouches on, and the pool cut into it. */
export const LEDGE_Y = 1000;
export const POOL = { x0: 540, x1: 1052, surface: 1006, depth: 100 } as const;

/** The pool's floor at x (its deepest in the middle, a shelf near the raccoon). */
export function poolFloor(x: number): number {
  const u = Math.max(0, Math.min(1, (x - POOL.x0) / (POOL.x1 - POOL.x0)));
  return POOL.surface + POOL.depth * Math.sqrt(Math.sin(Math.PI * u));
}

/** The water in the pool, as a closed shape: the surface along the top, the floor below. */
export function waterShape(): Pt[] {
  const floor: Pt[] = [];
  for (let x = POOL.x0; x <= POOL.x1; x += 5) floor.push(pt(x, poolFloor(x) - 1));
  return [pt(POOL.x0, POOL.surface), pt(POOL.x1, POOL.surface), ...floor.reverse()];
}

/** Night's ink-blue over the beach (the game's NightView tint by moonlight). */
export const NIGHT_TINT = 'rgba(20,28,60,0.16)';
const WATER = '#27497a';
const WATER_LIT = '#9fc0e6';
const ROCK_WASH = '#8d8f99';
const ROCK_DEEP = '#2a3050';

/** The design scale the game's backdrop helpers are drawn at (they're made for a half-size world). */
const K = 2;

function sky(d: Draw): void {
  const { ctx } = d.pen;
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, NIGHT);
  g.addColorStop(0.5, INDIGO);
  g.addColorStop(0.86, NIGHT_BLUE);
  g.addColorStop(1, HAZE);
  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON);
  ctx.restore();
  ctx.save();
  ctx.scale(K, K);
  const t = makeDraw(ctx, 6601, 0, 0);
  stars(t, 0, HORIZON / K - 20, 520, MOON.x / K, MOON.y / K, 120);
  // The moon as seen from Oregon: the southern face the game draws, turned the right way up.
  ctx.save();
  ctx.translate(MOON.x / K, MOON.y / K);
  ctx.rotate(Math.PI);
  fullMoon(makeDraw(ctx, 6602, 0, 0), 0, 0, MOON.r / K, 92);
  ctx.restore();
  ctx.restore();
}

function sea(d: Draw): void {
  const { ctx } = d.pen;
  const g = ctx.createLinearGradient(0, HORIZON, 0, SAND_TOP + 20);
  g.addColorStop(0, BAY_FAR);
  g.addColorStop(0.4, BAY);
  g.addColorStop(1, BAY_DEEP);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, W, SAND_TOP + 20 - HORIZON);
  ctx.scale(K, K);
  const t = makeDraw(ctx, 6603, 0, 0);
  nightSwell(t, HORIZON / K + 2, SAND_TOP / K + 6, 260);
  moonPath(t, MOON.x / K, HORIZON / K + 1, SAND_TOP / K + 6, 260);
  // Haystack Rock in the surf, sunk into the night with a blue glaze.
  moonlit(t, NIGHT, 0.6, (s) => seaStack(s, 20, 118, HORIZON / K + 34, 82, (u) => Math.pow(Math.sin(Math.PI * u), 0.45) * (1 - 0.25 * u)));
  moonlit(t, NIGHT, 0.5, (s) => seaStack(s, 128, 150, HORIZON / K + 30, 34, (u) => Math.pow(Math.sin(Math.PI * u), 0.6)));
  surf(t, 0, W / K, SAND_TOP / K + 4);
  ctx.restore();
}

function sand(d: Draw): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(K, K);
  const t = makeDraw(ctx, 6604, 0, 0);
  moonSand(t, (x) => SAND_TOP / K + 2 + 1.5 * Math.sin(x * 0.02), LEDGE_Y / K + 10);
  wrackLine(t, 0, W / K, (x) => SAND_TOP / K + 20 + 2 * Math.sin(x * 0.03));
  ctx.restore();
  // A heap of washed-up bull kelp on the far sand: what the crab hides under in the game.
  ctx.save();
  ctx.translate(700, 0);
  drawWrack(ctx, 5, 30, () => 955, 6605);
  ctx.restore();
}

/** The ledge's top, from the left edge to the pool's lip. */
const LEDGE_TOP: Pt[] = [pt(-10, LEDGE_Y + 4), pt(60, LEDGE_Y - 4), pt(200, LEDGE_Y + 2), pt(330, LEDGE_Y - 1), pt(POOL.x0 - 10, LEDGE_Y)];

/** An ochre sea star stuck to the pool's wall: the Oregon tidepools' commonest. */
function seaStar(d: Draw, x: number, y: number, a: number): void {
  const pts: Pt[] = [];
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? 30 : 11;
    const ang = a + (k / 10) * Math.PI * 2;
    pts.push(pt(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.8));
  }
  skin(d, pts, '#c8643a', 0.75);
  d.pen.stipple(pts, 90, () => 0.8, 1.4, PAPER_FILL);
  edge(d, pts, 1.6, 0.85);
}

/** A blue mussel on the rock. */
function mussel(d: Draw, x: number, y: number): void {
  const shell = [...cub(pt(x - 14, y), pt(x - 8, y - 10), pt(x + 10, y - 9), pt(x + 15, y - 2), 8), ...cub(pt(x + 15, y - 2), pt(x + 8, y + 5), pt(x - 8, y + 4), pt(x - 14, y), 8).slice(1)];
  skin(d, shell, '#2f3550', 0.85);
  d.pen.hair([pt(x - 12, y - 1), pt(x + 13, y - 3)], 0.8, PAPER_FILL, 0.5);
  edge(d, shell, 1.2, 0.9);
}

/** The ledge, the pool's basin and the shelf of rock below, sunk dark towards the bottom. */
function rocks(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const basin: Pt[] = [];
  for (let x = POOL.x1; x >= POOL.x0; x -= 5) basin.push(pt(x, poolFloor(x)));
  const ledge: Pt[] = [
    ...LEDGE_TOP, pt(POOL.x0, POOL.surface - 2), ...basin, pt(POOL.x1 + 4, LEDGE_Y - 6), pt(W + 10, LEDGE_Y - 10),
    pt(W + 10, H + 10), pt(-10, H + 10),
  ];
  rock(d, ledge, { wash: ROCK_WASH, lichen: 0, form: false, hatch: false });
  pen.clipped(ledge, () => {
    // Darker with depth, as rock in shadow at night.
    const g = ctx.createLinearGradient(0, LEDGE_Y, 0, 1500);
    g.addColorStop(0, 'rgba(42,48,80,0.15)');
    g.addColorStop(0.25, 'rgba(42,48,80,0.75)');
    g.addColorStop(1, 'rgba(26,30,56,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, LEDGE_Y - 20, W, H);
    pen.hatch(ledge, 7, 0.9, 1.1, { color: ROCK_DEEP, alpha: 0.35, onlyBelow: LEDGE_Y + 40 });
  });
  // Cracks in the shelf and the wet dark line round the pool.
  for (const [x0, y0, x1, y1] of [[90, 1030, 150, 1090], [260, 1010, 230, 1080], [1000, 1020, 1050, 1085], [380, 1040, 420, 1100]] as const) {
    joint(d, [pt(x0, y0), pt((x0 + x1) / 2 + 6, (y0 + y1) / 2), pt(x1, y1)], 0.9);
  }
  pen.stroke(basin, 3, ROCK_DEEP, 0.6, false);
  // The ledge's lip, inked, so the raccoon sits on rock and not on the sand behind.
  pen.stroke(LEDGE_TOP, 2.4, d.ink, 0.85, false);
  pen.stroke([pt(POOL.x1 + 4, LEDGE_Y - 6), pt(W + 10, LEDGE_Y - 10)], 2.4, d.ink, 0.85, false);
  seaStar(d, POOL.x1 - 60, poolFloor(POOL.x1 - 60) - 16, 0.5);
  for (const [x, y] of [[POOL.x0 - 30, LEDGE_Y + 8], [POOL.x0 - 70, LEDGE_Y + 14], [POOL.x1 + 14, LEDGE_Y + 2]] as const) mussel(d, x, y);
  // The pool's back wall, dark under the water.
  pen.fill([pt(POOL.x0, POOL.surface), pt(POOL.x1, POOL.surface), ...basin.slice(1, -1)], ROCK_DEEP, 0.55);
}

/** The still backdrop, baked once. */
export function makeBackdrop(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const d = makeDraw(ctx, 6600, 0, LEDGE_Y);
  sky(d);
  sea(d);
  sand(d);
  rocks(d);
  return canvas;
}

/** The pool's water over whatever is in it: a translucent wash, the moon's shimmer on the surface, `stir` 0 .. 1 roughening it. */
export function drawWater(ctx: CanvasRenderingContext2D, t: number, boil: number, stir: number): void {
  const d = makeDraw(ctx, 6610 + boil, boil, POOL.surface);
  const shape = waterShape();
  d.pen.fill(shape, WATER, 0.3);
  d.pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, POOL.surface, 0, POOL.surface + POOL.depth);
    g.addColorStop(0, 'rgba(159,192,230,0.18)');
    g.addColorStop(1, 'rgba(20,28,60,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(POOL.x0, POOL.surface, POOL.x1 - POOL.x0, POOL.depth + 4);
    // Light wavering through the water.
    for (let k = 0; k < 7; k++) {
      const x = POOL.x0 + 40 + k * 66 + 10 * Math.sin(t * 2.1 + k);
      d.pen.hair([pt(x, POOL.surface + 12), pt(x + 18, POOL.surface + 28 + 6 * Math.sin(t * 1.7 + k * 2))], 1.2, WATER_LIT, 0.25);
    }
  });
  // The surface: a lit line, wobbling as it's stirred.
  const surface: Pt[] = [];
  for (let x = POOL.x0; x <= POOL.x1; x += 8) {
    surface.push(pt(x, POOL.surface + stir * 2.4 * Math.sin(x * 0.07 - t * 9) + 0.8 * Math.sin(x * 0.03 + t * 2)));
  }
  d.pen.stroke(surface, 3, PAPER_FILL, 0.75, false);
  d.pen.stroke(surface.map((p) => pt(p.x, p.y + 3)), 1.4, WATER, 0.6, false);
  glow(d, MOON.x - 120, POOL.surface + 2, 90, 6, PAPER_FILL, 0.35);
}

/** A ring spreading on the surface from x, `u` 0 .. 1 of its life. */
export function drawRipple(ctx: CanvasRenderingContext2D, x: number, u: number, size = 1): void {
  if (u <= 0 || u >= 1) return;
  ctx.save();
  ctx.globalAlpha = 0.85 * (1 - u);
  ctx.strokeStyle = PAPER_FILL;
  ctx.lineWidth = 3.5 * (1 - u * 0.5);
  ctx.beginPath();
  ctx.ellipse(x, POOL.surface, (16 + 90 * u) * size, (4 + 12 * u) * size, 0, Math.PI * 0.95, Math.PI * 2.05);
  ctx.stroke();
  ctx.restore();
}

/** Drops thrown up by a splash at x, `u` 0 .. 1 of its life. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, u: number, size = 1): void {
  if (u <= 0 || u >= 1) return;
  ctx.save();
  ctx.fillStyle = PAPER_FILL;
  ctx.strokeStyle = '#26316a';
  ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.32;
    const v = (170 + 40 * (k % 3)) * size;
    const px = x + Math.cos(a) * v * u * 0.9;
    const py = POOL.surface + Math.sin(a) * v * u + 420 * u * u * size;
    if (py > POOL.surface + 4) continue;
    ctx.globalAlpha = 1 - u * 0.6;
    ctx.beginPath();
    ctx.ellipse(px, py, 6 * size, 8 * size, a + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
