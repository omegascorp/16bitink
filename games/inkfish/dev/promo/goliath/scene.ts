import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { ART_RES, drawHook } from '../../../src/art/propArt';
import { BOAT_SPEC, drawBoat } from '../../../src/art/skyArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { BOAT_SCALE, BOAT_X, boatBob, cycles, DOOR, DOOR_SIZE, FOCUS, type Pt, rodTipAt, toScreen, type View } from './story';

/**
 * The Gulf around the grouper: a paper sky over the surface, the angler's
 * skiff, murky green water darkening fast with depth (suspended silt drifting
 * in it, a few shafts of light near the top), the fishing line and hook, and
 * the chalk notes: the door and the "4 ft" bar.
 */

export const INK_BG = '#04100f';
export const CHALK = '#e2ebe4';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };
export const SPOKEN = '#f5c84a';

/** Water colour by depth (world px below the surface): murky Gulf green, near black by the bottom of the scene. */
const WATER: readonly (readonly [number, string])[] = [
  [0, 'rgba(52,96,88,0.9)'],
  [260, 'rgba(30,66,62,0.93)'],
  [800, 'rgba(16,44,44,0.95)'],
  [1500, 'rgba(9,30,32,0.96)'],
  [2400, 'rgba(5,19,21,0.97)'],
  [3600, 'rgba(3,11,13,0.98)'],
];

/** The world rectangle the view shows. */
function bounds(v: View): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
  return {
    left: v.x - FOCUS.x / v.zoom,
    right: v.x + (VIDEO.width - FOCUS.x) / v.zoom,
    top: v.y - FOCUS.y / v.zoom,
    bottom: v.y + (VIDEO.height - FOCUS.y) / v.zoom,
  };
}

/** Sky, surface and water, for the view. */
export function drawWater(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, v: View, t: number): void {
  ctx.drawImage(paper, 0, 0);
  const surface = toScreen(v, { x: 0, y: 0 }).y;
  if (surface > 0) {
    // A pale wash of sky over the paper, warmer towards the horizon.
    const sky = ctx.createLinearGradient(0, 0, 0, surface);
    sky.addColorStop(0, 'rgba(150,180,190,0.28)');
    sky.addColorStop(1, 'rgba(230,214,180,0.22)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIDEO.width, surface);
  }
  const deep = toScreen(v, { x: 0, y: WATER[WATER.length - 1]![0] }).y;
  const g = ctx.createLinearGradient(0, surface, 0, Math.max(surface + 1, deep));
  for (const [depth, colour] of WATER) g.addColorStop(depth / WATER[WATER.length - 1]![0], colour);
  ctx.fillStyle = g;
  const top = Math.max(0, surface);
  ctx.fillRect(0, top, VIDEO.width, VIDEO.height - top);
  drawRays(ctx, v, t);
  if (surface > -40 && surface < VIDEO.height + 40) drawSurface(ctx, v, t);
}

/** Shafts of light slanting down from the surface, fading within a few metres. */
const RAYS = [
  { x: -300, w: 140, slant: 260 },
  { x: 160, w: 90, slant: 300 },
  { x: 620, w: 170, slant: 240 },
  { x: 1150, w: 110, slant: 280 },
  { x: 1600, w: 150, slant: 250 },
] as const;
const RAY_DEPTH = 1700;

function drawRays(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const top = toScreen(v, { x: 0, y: 0 }).y;
  const bottom = toScreen(v, { x: 0, y: RAY_DEPTH }).y;
  if (bottom < 0 || top > VIDEO.height) return;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, 'rgba(200,230,200,0.13)');
  g.addColorStop(1, 'rgba(200,230,200,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  RAYS.forEach((r, i) => {
    const sway = 30 * Math.sin(cycles(1, t) + i * 1.3);
    const pts = [
      { x: r.x + sway, y: 0 }, { x: r.x + r.w + sway, y: 0 },
      { x: r.x + r.w * 2.2 + r.slant, y: RAY_DEPTH }, { x: r.x + r.slant - r.w * 0.4, y: RAY_DEPTH },
    ].map((p) => toScreen(v, p));
    ctx.beginPath();
    pts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** The surface: an inked, rippling line, light catching under it. */
function drawSurface(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const b = bounds(v);
  const pts: Pt[] = [];
  for (let x = b.left - 40; x <= b.right + 40; x += 18) pts.push(toScreen(v, { x, y: 7 * Math.sin(x / 55 + cycles(3, t)) + 3 * Math.sin(x / 23 - cycles(5, t)) }));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(220,240,230,0.35)';
  ctx.lineWidth = Math.max(2, 9 * v.zoom);
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + 5 * v.zoom) : ctx.lineTo(p.x, p.y + 5 * v.zoom)));
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, 4 * v.zoom);
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- silt

const TILE = 640;
const SILT = (() => {
  const rng = createRng(2014);
  return Array.from({ length: 16 }, () => ({ x: rng() * TILE, y: rng() * TILE, r: 1.2 + rng() * 2.6, phase: rng() * Math.PI * 2, alpha: 0.1 + rng() * 0.22 }));
})();

/** Specks of silt hanging in the water, drifting a little: the murk. */
export function drawSilt(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const b = bounds(v);
  ctx.save();
  ctx.fillStyle = '#d6e6d6';
  for (let ty = Math.floor(Math.max(0, b.top) / TILE); ty * TILE < b.bottom; ty++) {
    for (let tx = Math.floor(b.left / TILE); tx * TILE < b.right; tx++) {
      SILT.forEach((m, i) => {
        const wx = tx * TILE + m.x + 14 * Math.sin(cycles(1, t) + m.phase + tx);
        const wy = ty * TILE + m.y + 10 * Math.sin(cycles(2, t) + m.phase * 1.7 + ty);
        if (wy < 20) return;
        const p = toScreen(v, { x: wx, y: wy });
        if (p.x < -10 || p.x > VIDEO.width + 10 || p.y < -10 || p.y > VIDEO.height + 10) return;
        ctx.globalAlpha = m.alpha * (i % 3 === 0 ? 1.4 : 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, m.r * Math.max(0.6, Math.sqrt(v.zoom)), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 780, 420, VIDEO.width / 2, 820, 1250);
  g.addColorStop(0, 'rgba(1,6,6,0)');
  g.addColorStop(1, 'rgba(1,6,6,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

// ---------------------------------------------------------------- the boat, the line, the hook

const SKIFF = BOAT_SPEC.skiff;
/** Texture px per game px: the boat drawing's own ART_RES, doubled for a sharp line at video size. */
const BOAT_RES = ART_RES * 2;

export function makeBoatFrames(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(SKIFF.w * BOAT_RES, SKIFF.h * BOAT_RES);
    ctx.scale(BOAT_RES / ART_RES, BOAT_RES / ART_RES);
    drawBoat(ctx, 'skiff', 911 + f * 173);
    return canvas;
  });
}

/** The skiff on its waterline, riding the swell. */
export function drawSkiff(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], v: View, t: number, boil: number): void {
  const at = toScreen(v, { x: BOAT_X, y: -SKIFF.waterline * BOAT_SCALE + boatBob(t) });
  const k = (BOAT_SCALE * v.zoom) / BOAT_RES;
  const frame = frames[boil % frames.length]!;
  if (at.y > VIDEO.height || at.y + frame.height * k < 0) return;
  ctx.drawImage(frame, at.x, at.y, frame.width * k, frame.height * k);
}

/** The rod bent hard by the shark: an extra arc from the angler's hands out to the tip, drawn over the boat's own rod. */
export function drawBentRod(ctx: CanvasRenderingContext2D, v: View, t: number, pull: Pt): void {
  const tip = toScreen(v, rodTipAt(t));
  const butt = toScreen(v, { x: BOAT_X + 78 * BOAT_SCALE, y: (SKIFF.waterline - 36 - SKIFF.waterline) * BOAT_SCALE + boatBob(t) });
  const bend = { x: (butt.x + tip.x) / 2 + (pull.x - tip.x) * 0.02, y: Math.min(butt.y, tip.y) - 40 * v.zoom };
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, 6 * v.zoom);
  ctx.beginPath();
  ctx.moveTo(butt.x, butt.y);
  ctx.quadraticCurveTo(bend.x, bend.y, tip.x, tip.y);
  ctx.stroke();
  ctx.restore();
}

/** The fishing line from the rod tip to `end`, bowed sideways by `bow` world px at its middle: dark with a pale core, so it shows on sky and water. */
export function drawFishingLine(ctx: CanvasRenderingContext2D, v: View, t: number, end: Pt, bow: number): void {
  const top = rodTipAt(t);
  const len = Math.hypot(end.x - top.x, end.y - top.y) || 1;
  const n = { x: -(end.y - top.y) / len, y: (end.x - top.x) / len };
  const a = toScreen(v, top);
  const b = toScreen(v, end);
  const c = toScreen(v, { x: (top.x + end.x) / 2 + n.x * bow * 2, y: (top.y + end.y) / 2 + n.y * bow * 2 });
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, width, alpha] of [[INK, 4.2, 0.55], ['#e9efe6', 2, 0.9]] as const) {
    ctx.strokeStyle = colour;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

const HOOK_RES = 4;
/** The hook drawing's eye and bend, in its own units (propArt.drawHook). */
const HOOK_EYE = { x: 32, y: 4 };
const HOOK_BEND = { x: 22, y: 68 };
/** Eye to bend, world px. */
const HOOK_LEN = 62;
const HOOK_SCALE = HOOK_LEN / Math.hypot(HOOK_BEND.x - HOOK_EYE.x, HOOK_BEND.y - HOOK_EYE.y);
const HOOK_AXIS = Math.atan2(HOOK_BEND.y - HOOK_EYE.y, HOOK_BEND.x - HOOK_EYE.x);

export function makeHookFrames(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(48 * HOOK_RES, 76 * HOOK_RES);
    ctx.scale(HOOK_RES / ART_RES, HOOK_RES / ART_RES);
    drawHook(ctx, 301 + f * 211);
    // Pale metal: ink on the dark water would vanish.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = CHALK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  });
}

/** The hook hanging from the line with its bend at `bend` (world px), with a soft glint so it shows on dark water. */
export function drawHookAt(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], v: View, t: number, boil: number, bend: Pt): void {
  const top = rodTipAt(t);
  const len = Math.hypot(bend.x - top.x, bend.y - top.y) || 1;
  const dir = { x: (bend.x - top.x) / len, y: (bend.y - top.y) / len };
  const eye = toScreen(v, { x: bend.x - dir.x * HOOK_LEN, y: bend.y - dir.y * HOOK_LEN });
  const k = HOOK_SCALE * v.zoom;
  ctx.save();
  ctx.translate(eye.x, eye.y);
  ctx.rotate(Math.atan2(dir.y, dir.x) - HOOK_AXIS);
  ctx.shadowColor = 'rgba(230,240,230,0.9)';
  ctx.shadowBlur = 6;
  ctx.drawImage(frames[boil % frames.length]!, -HOOK_EYE.x * k, -HOOK_EYE.y * k, 48 * k, 76 * k);
  ctx.restore();
}

// ---------------------------------------------------------------- the door and the size bar

/** A wobbly chalk line through points, the wobble changing with the line boil. */
function chalkPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], boil: number, closed: boolean): void {
  const rng = createRng(77 + (boil % BOIL_FRAMES) * 13);
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = { x: p.x + (rng() - 0.5) * 2.4, y: p.y + (rng() - 0.5) * 2.4 };
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  if (closed) ctx.closePath();
}

/** Corner points of a rectangle with extra points along its sides, so the chalk wobbles along it. */
function rectPts(x0: number, y0: number, x1: number, y1: number): Pt[] {
  const side = (a: Pt, b: Pt): Pt[] => Array.from({ length: 6 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 6, y: a.y + ((b.y - a.y) * i) / 6 }));
  return [...side({ x: x0, y: y0 }, { x: x1, y: y0 }), ...side({ x: x1, y: y0 }, { x: x1, y: y1 }), ...side({ x: x1, y: y1 }, { x: x0, y: y1 }), ...side({ x: x0, y: y1 }, { x: x0, y: y0 })];
}

/** An ink door outline standing beside the grouper: frame, four panels and a knob, popping up by `pop` (over 1 overshoots). */
export function drawDoor(ctx: CanvasRenderingContext2D, v: View, pop: number, boil: number): void {
  if (pop <= 0) return;
  const tl = toScreen(v, { x: DOOR.x - DOOR_SIZE.w / 2, y: DOOR.top });
  const br = toScreen(v, { x: DOOR.x + DOOR_SIZE.w / 2, y: DOOR.top + DOOR_SIZE.h });
  const c = { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 };
  const w = br.x - tl.x;
  const h = br.y - tl.y;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(pop, pop);
  ctx.globalAlpha = Math.min(1, pop);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // A faint paper face so it reads as a door, not a box.
  ctx.fillStyle = 'rgba(226,235,228,0.07)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = Math.max(3, 7 * v.zoom);
  chalkPath(ctx, rectPts(-w / 2, -h / 2, w / 2, h / 2), boil, true);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, 4 * v.zoom);
  const m = w * 0.16;
  const mid = -h * 0.02;
  for (const [y0, y1] of [[-h / 2 + m, mid - m * 0.5], [mid + m * 0.5, h / 2 - m]] as const) {
    for (const [x0, x1] of [[-w / 2 + m, -m * 0.35], [m * 0.35, w / 2 - m]] as const) {
      chalkPath(ctx, rectPts(x0, y0, x1, y1), boil + 1, true);
      ctx.stroke();
    }
  }
  ctx.fillStyle = CHALK;
  ctx.beginPath();
  ctx.arc(w / 2 - m * 0.55, mid, Math.max(4, 11 * v.zoom), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A dimension bar under the shark, nose to tail tip, with "4 ft" under its middle (screen px). */
export function drawSizeBar(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, alpha: number): void {
  if (alpha <= 0) return;
  const y = Math.max(from.y, to.y);
  const x0 = Math.min(from.x, to.x);
  const x1 = Math.max(from.x, to.x);
  const grow = Math.min(1, alpha * 1.6);
  const mid = (x0 + x1) / 2;
  const half = ((x1 - x0) / 2) * grow;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SPOKEN;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(mid - half, y);
  ctx.lineTo(mid + half, y);
  for (const x of [mid - half, mid + half]) {
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x, y + 18);
  }
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, '4 ft', mid, y + 78, 84, 700, alpha, { fill: SPOKEN, halo: INK_BG });
}

/** A small note in paper-on-ink. */
export function drawNote(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number): void {
  drawTextLine(ctx, text, x, y, size, 700, alpha, PAPER_ON_INK);
}
