import { INK } from '../../../src/art/pen';
import { halo } from '../../../src/art/glowArt';
import { createRng } from '../../../src/logic/rng';
import { CABIN, type Pt } from './crew';

/**
 * A little sport-fishing boat at dusk, in pen, side-on with its bow to the
 * left: a white hull with a blue boot stripe and dark bottom paint, a bow
 * rail, a cabin with warm-lit windows, whip antennas and spare rods, and a
 * masthead light. In the boat's own frame (crew.ts): the waterline at y 0,
 * the cockpit deck at y -80. Drawn in two parts so what's in the boat sits
 * between them: the cabin behind, the hull side and rail in front.
 */

const HULL = '#ece6d6';
const HULL_SHADE = '#c9c3b6';
const STRIPE = '#24519a';
const BOTTOM = '#6e2c30';
const GLASS = '#f4cf72';
const CABIN_WALL = '#e4ddcc';

type P = readonly [number, number];

/** A hand-drawn line: the points nudged a little, differently on each boil frame, so the ink lives like the game's. */
function wobbly(pts: readonly P[], boil: number, seed: number, amount = 0.9): P[] {
  const rng = createRng(seed * 101 + boil * 7919);
  return pts.map(([x, y]) => [x + (rng() - 0.5) * 2 * amount, y + (rng() - 0.5) * 2 * amount] as const);
}

function path(ctx: CanvasRenderingContext2D, pts: readonly P[], close: boolean): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (close) ctx.closePath();
}

/** Points along a quadratic curve. */
function curve(a: P, c: P, b: P, n: number): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return [(1 - u) ** 2 * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]] as const;
  });
}

/** The sheer (top of the hull side), bow to stern. */
export const SHEER: readonly P[] = [...curve([-432, -152], [-300, -112], [-60, -106], 12), [400, -104]];
/** The whole hull outline: sheer, transom, bottom, and up the stem to the bow. */
const HULL_OUTLINE: readonly P[] = [
  ...SHEER,
  [394, 30],
  ...curve([394, 30], [80, 46], [-250, 22], 10).slice(1),
  ...curve([-250, 22], [-388, -20], [-432, -152], 10).slice(1),
];

/** The sheer's height at boat-frame x. */
export function sheerAt(x: number): number {
  for (let i = 1; i < SHEER.length; i++) {
    const [x0, y0] = SHEER[i - 1]!;
    const [x1, y1] = SHEER[i]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return SHEER[SHEER.length - 1]![1];
}

/** The bow tip, where the rail starts. */
export const BOW: Pt = { x: -432, y: -152 };

/** The cabin, the antennas and rods on its roof, the masthead light: behind whatever is in the boat. */
export function drawBoatBack(ctx: CanvasRenderingContext2D, boil: number, px: number, light: number): void {
  const { front, back, roof } = CABIN;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  // Whip antennas and the spare rods in their holders, raked aft.
  ctx.lineWidth = 2.4 * px;
  for (const [x, top, lean] of [[40, -360, 30], [96, -322, 22]] as const) {
    path(ctx, wobbly([[x, roof], [x + lean * 0.5, (roof + top) / 2], [x + lean, top]], boil, x), false);
    ctx.strokeStyle = '#c9d2e6';
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  for (const [x, lean] of [[206, 78], [220, 92]] as const) {
    path(ctx, wobbly([[x, roof + 4], [x + lean * 0.6, roof - 100], [x + lean, roof - 150]], boil, x + 5, 0.6), false);
    ctx.lineWidth = 3 * px;
    ctx.strokeStyle = '#2b2f3a';
    ctx.stroke();
    ctx.lineWidth = 1.4 * px;
    ctx.strokeStyle = '#c9d2e6';
    ctx.stroke();
  }
  // The mast and its light.
  ctx.strokeStyle = '#c9d2e6';
  ctx.lineWidth = 4 * px;
  path(ctx, [[150, roof], [150, roof - 58]], false);
  ctx.stroke();
  halo(ctx, 150, roof - 64, 60, '#fff2c8', 0.55 * light);
  ctx.fillStyle = '#fff6dc';
  ctx.beginPath();
  ctx.arc(150, roof - 64, 6, 0, Math.PI * 2);
  ctx.fill();
  // The cabin: raked windscreen, flat roof with a lip, after wall.
  const cabin: P[] = [[front, -104], [front + 52, roof], [back + 10, roof], [back + 10, roof + 10], [back, roof + 10], [back, -104]];
  path(ctx, wobbly(cabin, boil, 3), true);
  ctx.fillStyle = CABIN_WALL;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * px;
  ctx.stroke();
  // Hatched shadow under the roof's lip.
  ctx.save();
  path(ctx, cabin, true);
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.3 * px;
  for (let x = front; x < back + 20; x += 9) {
    path(ctx, [[x, roof + 10], [x + 12, roof + 24]], false);
    ctx.stroke();
  }
  ctx.restore();
  // Warm-lit windows: the windscreen and two side lights.
  const glassFront: P[] = [[front + 14, -132], [front + 50, roof + 22], [front + 76, roof + 22], [front + 76, -132]];
  const panes: P[][] = [glassFront, [[front + 96, roof + 24], [front + 168, roof + 24], [front + 168, -140], [front + 96, -140]], [[front + 186, roof + 24], [back - 14, roof + 24], [back - 14, -140], [front + 186, -140]]];
  for (const [i, pane] of panes.entries()) {
    path(ctx, wobbly(pane, boil, 20 + i, 0.6), true);
    ctx.fillStyle = GLASS;
    ctx.globalAlpha = 0.55 + 0.35 * light;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.2 * px;
    ctx.stroke();
  }
  ctx.restore();
}

/** The hull side, its stripe and bottom paint, and the bow rail: in front of whatever is in the boat. */
export function drawHull(ctx: CanvasRenderingContext2D, boil: number, px: number): void {
  const hull = wobbly(HULL_OUTLINE, boil, 1, 0.7);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  path(ctx, hull, true);
  ctx.fillStyle = HULL;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Bottom paint below the waterline, the boot stripe just above it.
  ctx.fillStyle = BOTTOM;
  ctx.fillRect(-460, 2, 900, 60);
  ctx.fillStyle = STRIPE;
  ctx.fillRect(-460, -16, 900, 14);
  // A darker band under the rub rail, and pen hatching in the shadow towards the stern.
  ctx.fillStyle = HULL_SHADE;
  path(ctx, [...SHEER.map(([x, y]) => [x, y + 6] as const), ...[...SHEER].reverse().map(([x, y]) => [x, y + 20] as const)], true);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.3 * px;
  for (let x = 120; x < 400; x += 10) {
    path(ctx, [[x, -86], [x + 22, -30]], false);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2 * px;
  path(ctx, hull, true);
  ctx.stroke();
  // The rub rail along the sheer.
  ctx.lineWidth = 2 * px;
  path(ctx, wobbly(SHEER.map(([x, y]) => [x, y + 6] as const), boil, 2, 0.6), false);
  ctx.stroke();
  // The bow rail: stanchions up from the sheer, the rail along their tops.
  const posts = [-410, -350, -280, -210, -140, -70];
  ctx.strokeStyle = '#d6dcea';
  ctx.lineWidth = 3 * px;
  for (const x of posts) {
    path(ctx, [[x, sheerAt(x)], [x, sheerAt(x) - 28]], false);
    ctx.stroke();
  }
  path(ctx, wobbly(posts.map((x) => [x, sheerAt(x) - 28] as const), boil, 4, 0.5), false);
  ctx.stroke();
  ctx.restore();
}
