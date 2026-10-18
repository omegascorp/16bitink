import { type Draw, edge, eyeDot, glint, makeDraw, oval, pt, ribbon, shade, skin, tint } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { INK, PAPER_FILL } from '../../../src/art/palette';
import { clamp01, VIDEO } from '../short';
import { drawTentacle } from './manowarArt';
import { callout, drawZapBurst, glowBehind, wash } from './marks';
import { drawShrimp } from './shrimp';
import {
  blinkAt, colonyZoomAt, eatJob, eyesAt, floatJob, floatLabel, gulpAt, mouthAt, puffAt, shrimpAt, smileAt, stingJob, stingZapAt, swayAt, warmAt,
} from './story';

/**
 * Close up, under the float: the man o' war is a colony. Its polyps hang in
 * the water from the float's underside in three rows, each a little animal
 * with its own job: feeding polyps (flasks with a flared mouth) and stinging
 * ones (a bulb trailing a beaded tentacle). They open their eyes on "tiny
 * animals", sway in step for "living as one", and show their jobs in turn:
 * the float puffs up, the stingers zap, a feeder gulps a tiny shrimp.
 * Screen px.
 */
const { width: W, height: H } = VIDEO;
const WATER_TOP = '#c4e6ec';
const WATER_LOW = '#6fb4cb';
const FEED = '#e3add8';
const FEED_TIP = '#9b5fb8';
const STING = '#8fb0ec';
const DOME_TOP = '#b9a3ea';
const DOME_LOW = '#9ccbf2';

/** The float's underside: a big translucent dome across the top of the frame. */
const DOME = { x: 540, y: 180, rx: 760, ry: 250 } as const;
const PUFF = 0.15;
const domeBottom = (x: number, puff: number): number => DOME.y + DOME.ry * (1 + PUFF * puff) * Math.sqrt(Math.max(0, 1 - ((x - DOME.x) / DOME.rx) ** 2));

interface Zooid {
  readonly kind: 'feed' | 'sting';
  readonly x: number;
  /** A feeder's length (a stinger's bulb is sized by `w`). */
  readonly len: number;
  readonly w: number;
}
const row = (s: number, xs: readonly (readonly ['feed' | 'sting', number, number])[]): Zooid[] =>
  xs.map(([kind, x, len]) => ({ kind, x, len: len * s, w: (kind === 'feed' ? 104 : 92) * s }));
const FRONT = row(1, [['feed', 190, 330], ['sting', 395, 0], ['feed', 600, 360], ['sting', 800, 0], ['feed', 990, 310]]);
const MID = row(0.72, [['sting', 90, 0], ['feed', 300, 300], ['feed', 500, 290], ['sting', 700, 0], ['feed', 895, 300]]);
const BACK = row(0.5, [['feed', 40, 300], ['sting', 230, 0], ['feed', 420, 280], ['sting', 620, 0], ['feed', 800, 300], ['feed', 1040, 290]]);
/** The feeder that eats the shrimp. */
const EATER = FRONT[2]!;
/** Eyes open front row first, left to right, then the middle and back rows. */
const ORDER = new Map<Zooid, number>([...FRONT, ...MID, ...BACK].map((z, i) => [z, i]));

/** A polyp's spine, attach point down, bending more towards its tip as it sways. */
function spineOf(z: Zooid, t: number, len: number, puff: number): Pt[] {
  const a0 = swayAt(ORDER.get(z)!, t);
  let p = pt(z.x, domeBottom(z.x, puff) - 10);
  const out = [p];
  const n = 16;
  for (let i = 1; i <= n; i++) {
    const a = a0 * (0.5 + 0.9 * (i / n));
    p = pt(p.x - Math.sin(a) * (len / n), p.y + Math.cos(a) * (len / n));
    out.push(p);
  }
  return out;
}

/** Where the eater's mouth is now (the shrimp swims to it). */
export const eaterMouth = (t: number): Pt => spineOf(EATER, t, EATER.len, puffAt(t)).at(-1)!;

/** Eyes (popping open, blinking together) and, from "living as one", a smile. */
function face(d: Draw, c: Pt, w: number, t: number, z: Zooid): void {
  const open = eyesAt(ORDER.get(z)!, t);
  if (open <= 0) return;
  const r = w * 0.075 * (0.3 + 0.7 * open);
  const shut = blinkAt(t);
  for (const side of [-1, 1]) {
    const x = c.x + w * 0.17 * side;
    if (shut > 0.5) d.pen.hair([pt(x - r, c.y), pt(x + r, c.y + r * 0.25)], Math.max(1.4, r * 0.5), INK, 0.9);
    else eyeDot(d, x, c.y, r * (1 - 0.6 * shut));
  }
  const smile = smileAt(t) * open;
  if (smile > 0) {
    const y = c.y + w * 0.16;
    d.pen.hair([pt(c.x - w * 0.11, y), pt(c.x, y + w * 0.08 * smile), pt(c.x + w * 0.11, y)], Math.max(1.2, w * 0.03), INK, 0.85 * smile);
  }
}

/** A feeding polyp: a thin stalk swelling into a soft flask, a neck, and a flared mouth at its tip. */
function drawFeeder(d: Draw, z: Zooid, t: number, puff: number): void {
  const eater = z === EATER;
  const mouth = eater ? mouthAt(t) : 0;
  const g = eater ? gulpAt(t) : -1;
  const spine = spineOf(z, t, z.len, puff);
  const width = (u: number): number => {
    const body = Math.sin(Math.PI * clamp01((u - 0.03) / 0.86)) ** 0.85;
    const lip = clamp01((u - 0.84) / 0.16);
    const lump = g > 0 && g < 1 ? 0.38 * Math.exp(-(((u - (0.9 - 0.8 * g)) / 0.08) ** 2)) : 0;
    return z.w * (0.2 + 0.8 * body + 0.34 * lip * lip + lump + 0.45 * mouth * lip ** 3);
  };
  const { shape } = ribbon(spine, width);
  skin(d, shape, FEED, 0.72);
  d.pen.clipped(shape, () => {
    // Deeper violet towards the mouth, faint rings, a sheen down the lit side.
    tint(d, oval(spine.at(-1)!.x, spine.at(-1)!.y, z.w * 0.7, z.len * 0.32, 18), FEED_TIP, 0.5);
    for (let k = 3; k < 15; k += 2) {
      const p = spine[k]!;
      const half = width(k / 16) / 2;
      d.pen.hair([pt(p.x - half, p.y - 2), pt(p.x, p.y + 3), pt(p.x + half, p.y - 2)], 0.8, INK, 0.2);
    }
    d.pen.stipple(shape, 60, () => 0.6, z.w * 0.012 + 0.4, PAPER_FILL);
    shade(d, shape, 0.3);
  });
  glint(d, spine.slice(5, 11).map((p, i) => pt(p.x - width((5 + i) / 16) * 0.3, p.y)), Math.max(1.5, z.w * 0.03), 0.6);
  edge(d, shape, 1.4 + z.w * 0.006, 0.9);
  const tip = spine.at(-1)!;
  d.pen.fill(oval(tip.x, tip.y - 2, z.w * (0.12 + 0.2 * mouth), z.w * (0.05 + 0.14 * mouth), 16), '#4a2a5c', 0.8);
  face(d, spine[8]!, z.w, t, z);
}

/** A stinging polyp's bulb (where its face is) and its beaded tentacle, trailing down out of the frame. */
function stingerParts(z: Zooid, t: number, i: number): { readonly spine: Pt[]; readonly path: Pt[] } {
  const spine = spineOf(z, t, z.w * 1.5, puffAt(t));
  const a = swayAt(ORDER.get(z)!, t);
  const from = spine.at(-1)!;
  const path: Pt[] = [];
  for (let s = 0; s <= 1500; s += 25) path.push(pt(from.x - a * s * 0.45 + 24 * Math.sin(s * 0.011 - t * 2.2 + i) * Math.min(1, s / 220), from.y - 6 + s));
  return { spine, path };
}

function drawStinger(d: Draw, ctx: CanvasRenderingContext2D, z: Zooid, t: number, boil: number, i: number): void {
  const { spine, path } = stingerParts(z, t, i);
  drawTentacle(ctx, path, z.w * 0.16, boil, 40 + i, 1, z.w * 0.24);
  const { shape } = ribbon(spine, (u) => z.w * (0.22 + 0.78 * Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)) ** 0.6));
  skin(d, shape, STING, 0.72);
  d.pen.clipped(shape, () => {
    tint(d, oval(spine[12]!.x, spine[12]!.y, z.w * 0.5, z.w * 0.35, 16), '#5f7fd8', 0.35);
    shade(d, shape, 0.3);
  });
  tint(d, oval(spine[6]!.x - z.w * 0.18, spine[6]!.y, z.w * 0.1, z.w * 0.16, 10), PAPER_FILL, 0.6);
  edge(d, shape, 1.4 + z.w * 0.006, 0.9);
  face(d, spine[9]!, z.w, t, z);
}

/** The float overhead: violet at the top, blue and lit from inside towards its edge; puffing up on "float". */
function drawDome(d: Draw, ctx: CanvasRenderingContext2D, puff: number): void {
  const pts: Pt[] = [];
  for (let k = 0; k <= 48; k++) {
    const x = DOME.x - DOME.rx + (2 * DOME.rx * k) / 48;
    pts.push(pt(x, domeBottom(x, puff)));
  }
  // Wide enough to fill the frame while the colony is still zooming in.
  const shape = [pt(-400, -400), pt(W + 400, -400), pt(W + 400, domeBottom(W, puff) - 200), ...[...pts].reverse(), pt(-400, domeBottom(0, puff) - 200)];
  const low = domeBottom(DOME.x, puff);
  d.pen.fill(shape, PAPER_FILL, 0.6);
  d.pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -200, 0, low);
    g.addColorStop(0, DOME_TOP);
    g.addColorStop(1, DOME_LOW);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = g;
    ctx.fillRect(-400, -400, W + 800, low + 430);
    ctx.globalAlpha = 1;
    // The gas inside, glowing.
    const glow = ctx.createRadialGradient(540, low - 110, 20, 540, low - 110, 460);
    glow.addColorStop(0, 'rgba(255,250,240,0.42)');
    glow.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-400, -400, W + 800, low + 430);
    for (let k = 0; k < 9; k++) {
      const x = 40 + k * 125;
      d.pen.hair([pt(x, 120), pt(x + 26, 230), pt(x + 8, domeBottom(x + 8, puff) - 12)], 1, INK, 0.16);
    }
    d.pen.hatch(shape, 10, 0.9, 0.8, { color: INK, alpha: 0.16, onlyBelow: low - 70 });
  });
  d.pen.stroke(pts.map((p) => pt(p.x, p.y - 22)), 7, PAPER_FILL, 0.5, false);
  d.pen.stroke(pts.slice(8, 22).map((p) => pt(p.x, p.y - 60)), 4, PAPER_FILL, 0.55, false);
  d.pen.stroke(pts, 3, INK, 0.85, false);
}

/** A veil of water between the rows, wide enough to cover the frame while the colony zooms. */
function veil(ctx: CanvasRenderingContext2D, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = WATER_LOW;
  ctx.fillRect(-400, -400, W + 800, H + 800);
  ctx.restore();
}

export function drawColony(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  // The water: lit from above, deeper below, shafts of light slanting down.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, WATER_TOP);
  g.addColorStop(1, WATER_LOW);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = PAPER_FILL;
  for (let k = 0; k < 5; k++) {
    const x = 80 + k * 240;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 70, 0);
    ctx.lineTo(x - 160, H);
    ctx.lineTo(x - 300, H);
    ctx.fill();
  }
  ctx.restore();

  const zoom = colonyZoomAt(t);
  const puff = puffAt(t);
  ctx.save();
  ctx.translate(540, 560);
  ctx.scale(zoom, zoom);
  ctx.translate(-540, -560);
  const d = makeDraw(ctx, 5500 + boil, boil, 0);
  const drawRow = (zs: readonly Zooid[], from: number): void =>
    zs.forEach((z, i) => (z.kind === 'feed' ? drawFeeder(d, z, t, puff) : drawStinger(d, ctx, z, t, boil, from + i)));
  drawRow(BACK, 20);
  veil(ctx, 0.3);
  drawRow(MID, 10);
  veil(ctx, 0.22);
  // Whichever job is being named glows: the stingers, the feeders.
  for (const z of FRONT) {
    const hi = z.kind === 'sting' ? stingJob(t) : eatJob(t) * (z === EATER ? 1.2 : 0.75);
    glowBehind(ctx, z.x, domeBottom(z.x, puff) + (z.kind === 'sting' ? 260 : z.len * 0.55), z.w * 1.6, z.kind === 'sting' ? 380 : z.len * 0.7, hi);
  }
  drawRow(FRONT, 0);
  drawDome(d, ctx, puff);
  glowBehind(ctx, 540, domeBottom(540, puff) - 90, 640, 150, floatJob(t) * 0.8);
  // The stingers' zap, the shrimp the eater gulps.
  const zap = stingZapAt(t);
  if (zap > 0) {
    FRONT.forEach((z, i) => {
      if (z.kind !== 'sting') return;
      const { spine, path } = stingerParts(z, t, i);
      drawZapBurst(ctx, spine[10]!, 100, boil + i, zap, 7);
      for (const k of [9, 17]) drawZapBurst(ctx, path[k]!, 56, boil + i + k, zap, 5);
    });
  }
  const shrimp = shrimpAt(t, eaterMouth(t));
  if (shrimp) drawShrimp(ctx, shrimp, boil);
  ctx.restore();
  callout(ctx, 'float', { x: 540, y: 330 + 30 * puff }, [], floatLabel(t), 110);
  // Warm light for "living as one".
  wash(ctx, '#ffb98a', 0.2 * warmAt(t));
}
