import { SNAKE_W } from '../../../src/art/types';
import { VIDEO } from '../short';
import { drawSprite, type Pt } from '../sprites';
import { along, axisOf, drawBoaBody, drawDark, drawJaws, drawMouth, type Jaws, zoomAbout } from './boaRig';
import type { Cast } from './cast';
import { drawVignette } from './night';
import { ORIGIN_A, PER_ART } from './ratArt';
import { GULP_AT, heaveShake, lumpSlide, RAT_LEN, ratHalf, rimAt, swallowGape, SWALLOW_AT } from './story';

/**
 * The swallow: the jaws at the rim, big, the rat going in head first along a
 * diagonal (a tall frame's longest line), the boa's neck running off behind
 * them, swollen to the rat's own outline: the lump in the snake is the rat.
 * The head stays put on screen and the ground goes by with the meal.
 */
const HEADING = -2.0;
const AXIS = axisOf(HEADING);
const RIM: Pt = { x: 410, y: 610 };
const JAW = 340;
const NECK = 140;
const BODY = 250;
const SKIN = 12;
const REACH = 2100;
const STEP = 12;

/** Where the neck runs, d back from the rim: straight, then bending away down the frame. */
const spineAt = (d: number): Pt => {
  const bend = Math.max(0, d - 620);
  return along(RIM, AXIS, -d, 0.00036 * bend * bend);
};

const smoothMax = (a: number, b: number): number => (a ** 6 + b ** 6) ** (1 / 6);

/** The body's half width d back from the rim: the neck, swollen to the rat's outline round the meal. */
function halfAt(t: number, d: number): number {
  const a = rimAt(t) - d - lumpSlide(t);
  const base = NECK + (BODY - NECK) * Math.max(0, Math.min(1, (d - JAW) / 900));
  const meal = a > 0 && a < RAT_LEN ? ratHalf(a) + SKIN : 0;
  return smoothMax(base / 2, meal);
}

function neckBody(t: number, from: number): { spine: Pt[]; widths: number[] } {
  const spine: Pt[] = [];
  const widths: number[] = [];
  for (let d = from; d <= REACH; d += STEP) {
    spine.push(spineAt(d));
    widths.push(2 * halfAt(t, d));
  }
  return { spine, widths };
}

/** How far behind the rim the hinges sit: nearer as the gape stretches the jaws' fixed length out sideways. */
function reachAt(t: number, gape: number): number {
  let reach = JAW;
  for (let i = 0; i < 3; i++) reach = Math.sqrt(Math.max(JAW * JAW * 0.34, JAW * JAW - (gape - halfAt(t, reach)) ** 2));
  return reach;
}

/** The rat from the rim on, sliding in. */
function drawRat(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, rim: number, reach: number): void {
  const at = along(RIM, AXIS, ORIGIN_A - rim, 0);
  ctx.save();
  // Only what's still outside shows (the body's skin covers the rest).
  const hinge = along(RIM, AXIS, -reach * 0.8, 0);
  const far = 3000;
  const corners = [along(hinge, AXIS, 0, far), along(hinge, AXIS, far, far), along(hinge, AXIS, far, -far), along(hinge, AXIS, 0, -far)];
  ctx.beginPath();
  corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  drawSprite(ctx, cast.rat.shut, boil, { x: at.x, y: at.y, scale: PER_ART, rotation: HEADING + Math.PI, flip: 1 });
  ctx.restore();
}

function jaws(t: number): Jaws {
  const g = swallowGape(t);
  const walk = 16 * Math.sin((t - SWALLOW_AT) * 11) * (t < GULP_AT ? 1 : 0);
  const size = Math.min(1, g / 60);
  const len = reachAt(t, g);
  const half = halfAt(t, len);
  return {
    rim: RIM, heading: HEADING, len, neck: NECK, hingeTop: half, hingeBottom: half, top: g + walk * size, bottom: g - walk * size,
    eye: heaveShake(t) > 0.3 || t > GULP_AT - 0.1 ? 'squeeze' : 'open',
  };
}

export function drawSwallowShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const rim = rimAt(t);
  const shake = heaveShake(t);
  const zoom = 1 + 0.07 * ((t - SWALLOW_AT) / 1.5);
  const j = jaws(t);
  const body = neckBody(t, j.len * 0.84);
  ctx.save();
  drawDark(ctx, cast.dark, { x: AXIS.e.x * -(rim - 170) * 0.16, y: AXIS.e.y * -(rim - 170) * 0.16 });
  zoomAbout(ctx, RIM, zoom, 0, 9 * shake);
  drawMouth(ctx, j);
  drawRat(ctx, cast, boil, rim, j.len);
  drawBoaBody(ctx, cast.body, boil, { spine: body.spine, widths: body.widths, along: 190 / SNAKE_W, offset: rim * 0.02 });
  drawJaws(ctx, cast, boil, j);
  ctx.restore();
  drawVignette(ctx, VIDEO.width, VIDEO.height, 0.45);
}
