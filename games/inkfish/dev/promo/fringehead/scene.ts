import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import type { TextInk } from '../captions';
import { PAPER } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { cycles, FLOOR_Y, SHELL_MOUTH, SHELL_SCALE, type View } from './story';

/**
 * The water each beat plays in: paper under a wash of sea colour (plain dark
 * green for the clash, cool blue for the close-up, a sandy floor and a snail
 * shell for the duel, bright shallows over sand for the bottle), drifting
 * specks, shafts of light, and the colour of each beat's mood over the top.
 */

export const INK_BG = '#04100f';
export const CHALK = '#e2ebe4';
export const SPOKEN = '#f5c84a';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };

export interface Water {
  readonly top: string;
  readonly bottom: string;
  readonly ray: string;
  /** Sand from this screen y down, or none. */
  readonly floor?: number;
  readonly sand?: readonly [string, string];
}

export const CLASH_WATER: Water = { top: 'rgba(30,78,76,0.94)', bottom: 'rgba(4,22,26,0.98)', ray: 'rgba(190,235,215,0.10)' };
export const SOLO_WATER: Water = { top: 'rgba(30,66,96,0.94)', bottom: 'rgba(5,16,32,0.98)', ray: 'rgba(190,220,245,0.12)' };
export const DUEL_WATER: Water = { top: 'rgba(38,84,80,0.93)', bottom: 'rgba(10,32,32,0.97)', ray: 'rgba(210,240,210,0.12)', floor: FLOOR_Y, sand: ['#8f7d55', '#4c4230'] };
export const BOTTLE_FLOOR = 1062;
export const BOTTLE_WATER: Water = { top: 'rgba(70,146,150,0.9)', bottom: 'rgba(24,82,90,0.94)', ray: 'rgba(240,255,230,0.2)', floor: BOTTLE_FLOOR, sand: ['#c8b282', '#7e6c4a'] };

/** Enters a view: the scene zoomed about its focus. */
export function enterView(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.translate(v.focus.x, v.focus.y);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.focus.x, -v.focus.y);
}

/** The still part of a backdrop: paper, the sea's wash, the sand. Drawn a little bigger than the frame, for zooms and shakes. */
export function makeWater(w: Water, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  ctx.drawImage(makePaper(), 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, w.top);
  g.addColorStop(1, w.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // Soft blooms of deeper and paler water, like a wet wash drying unevenly.
  const rng = createRng(seed);
  for (let i = 0; i < 14; i++) {
    const x = rng() * VIDEO.width;
    const y = rng() * VIDEO.height;
    const r = 160 + rng() * 320;
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    const pale = rng() < 0.4;
    b.addColorStop(0, pale ? 'rgba(220,240,230,0.05)' : 'rgba(0,10,12,0.12)');
    b.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = b;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  if (w.floor !== undefined && w.sand) drawSand(ctx, w.floor, w.sand, seed);
  return canvas;
}

/** The seabed: a band of sand with an inked, uneven edge, stipple, ripples and pebbles. */
function drawSand(ctx: CanvasRenderingContext2D, floor: number, [light, dark]: readonly [string, string], seed: number): void {
  const pen = new Pen(ctx, seed + 7, 1.4);
  const edge: Pt[] = [];
  for (let x = -40; x <= VIDEO.width + 40; x += 24) edge.push({ x, y: floor + 10 * Math.sin(x / 140 + seed) + 5 * Math.sin(x / 47) });
  const shape = [...edge, { x: VIDEO.width + 40, y: VIDEO.height + 40 }, { x: -40, y: VIDEO.height + 40 }];
  const g = ctx.createLinearGradient(0, floor - 20, 0, VIDEO.height);
  g.addColorStop(0, light);
  g.addColorStop(0.5, dark);
  g.addColorStop(1, '#1a160f');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.stipple(shape, 2600, (_x, y) => 0.25 + 0.5 * Math.min(1, (y - floor) / 500), 1.2, '#2b2418');
  pen.stipple(shape, 700, () => 0.5, 1.1, '#efe2bf');
  // Ripples in the sand.
  const rng = createRng(seed + 31);
  for (let i = 0; i < 16; i++) {
    const y = floor + 30 + rng() * 520;
    const x = rng() * VIDEO.width;
    const len = 90 + rng() * 160;
    pen.hair(Array.from({ length: 8 }, (_, k) => ({ x: x + (k / 7 - 0.5) * len, y: y + 5 * Math.sin(k * 0.9) })), 1.4, '#2b2418', 0.35);
  }
  // Pebbles.
  for (let i = 0; i < 12; i++) {
    const x = rng() * VIDEO.width;
    const y = floor + 20 + rng() * 300;
    const rx = 8 + rng() * 18;
    const p = ellipse(x, y, rx, rx * 0.6, 14);
    pen.fill(p, rng() < 0.5 ? '#8c8270' : '#6b5f4c', 0.9);
    pen.fill(ellipse(x - rx * 0.25, y - rx * 0.2, rx * 0.45, rx * 0.22, 10), '#f1e6c8', 0.35);
    pen.stroke([...p, p[0]!], 1.6, INK, 0.9);
  }
  pen.stroke(edge, 3.2, INK, 0.85);
}

// ---------------------------------------------------------------- light and specks

const RAYS = [
  { x: -200, w: 150, slant: 300 },
  { x: 220, w: 100, slant: 340 },
  { x: 560, w: 180, slant: 260 },
  { x: 980, w: 120, slant: 300 },
] as const;

/** Shafts of light slanting down from above, swaying. */
export function drawRays(ctx: CanvasRenderingContext2D, colour: string, t: number, depth = 1500): void {
  const g = ctx.createLinearGradient(0, 0, 0, depth);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  RAYS.forEach((r, i) => {
    const sway = 30 * Math.sin(cycles(1, t) + i * 1.3);
    ctx.beginPath();
    ctx.moveTo(r.x + sway, -100);
    ctx.lineTo(r.x + r.w + sway, -100);
    ctx.lineTo(r.x + r.w * 2.2 + r.slant, depth);
    ctx.lineTo(r.x + r.slant - r.w * 0.4, depth);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

const SPECKS = (() => {
  const rng = createRng(66);
  return Array.from({ length: 70 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 1.2 + rng() * 2.6, phase: rng() * Math.PI * 2, alpha: 0.1 + rng() * 0.25 }));
})();

/** Specks hanging in the water, drifting a little (whole cycles a loop). */
export function drawSpecks(ctx: CanvasRenderingContext2D, t: number, colour = '#d6e6d6'): void {
  ctx.save();
  ctx.fillStyle = colour;
  for (const m of SPECKS) {
    ctx.globalAlpha = m.alpha;
    ctx.beginPath();
    ctx.arc(m.x + 14 * Math.sin(cycles(1, t) + m.phase), m.y + 10 * Math.sin(cycles(2, t) + m.phase * 1.7), m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength = 0.6): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 800, 420, VIDEO.width / 2, 840, 1250);
  g.addColorStop(0, 'rgba(1,6,6,0)');
  g.addColorStop(1, `rgba(1,6,6,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** A colour washed over the whole frame (a mood's light). */
export function drawTint(ctx: CanvasRenderingContext2D, colour: string, alpha: number, mode: GlobalCompositeOperation = 'source-over'): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = colour;
  ctx.fillRect(-60, -60, VIDEO.width + 120, VIDEO.height + 120);
  ctx.restore();
}

/** The dramatic beat's light: red closing in from the edges. */
export function drawRedEdge(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  const g = ctx.createRadialGradient(VIDEO.width / 2, 820, 360, VIDEO.width / 2, 820, 1150);
  g.addColorStop(0, 'rgba(120,10,20,0)');
  g.addColorStop(1, `rgba(120,10,20,${0.5 * alpha})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

// ---------------------------------------------------------------- the snail shell

export interface ShellArt {
  /** The dark inside of the opening (drawn behind the fish) and the shell itself, with the opening cut out (in front). */
  readonly back: readonly HTMLCanvasElement[];
  readonly front: readonly HTMLCanvasElement[];
}

const SHELL_BOX = { x: SHELL_MOUTH.x - 90, y: SHELL_MOUTH.y - 190, w: 360, h: 300 };
const OPENING = { x: 90, y: 190, rx: 46, ry: 70, tilt: 0.12 };

/** The shell's outline, in its box: a fat body whorl, the spire rising to the right. */
function shellShape(): Pt[] {
  // Round the outside of the opening's lip (so the opening is inside the outline), from its top to its bottom.
  const pts: Pt[] = Array.from({ length: 13 }, (_, i) => {
    const a = -Math.PI / 2 - (i / 12) * Math.PI;
    return { x: OPENING.x + Math.cos(a) * (OPENING.rx + 7), y: OPENING.y + Math.sin(a) * (OPENING.ry + 7) };
  });
  // Then along the underside to the spire tip, and back along the top.
  const under = [{ x: 96, y: 262 }, { x: 160, y: 286 }, { x: 240, y: 272 }, { x: 300, y: 222 }, { x: 336, y: 150 }, { x: 330, y: 92 }];
  const over = [{ x: 296, y: 70 }, { x: 250, y: 64 }, { x: 196, y: 86 }, { x: 140, y: 112 }, { x: 98, y: 126 }];
  for (const p of [...under, ...over]) pts.push(p);
  return pts;
}

export function makeShell(): ShellArt {
  const back: HTMLCanvasElement[] = [];
  const front: HTMLCanvasElement[] = [];
  for (let f = 0; f < BOIL_FRAMES; f++) {
    const b = makeCanvas(SHELL_BOX.w, SHELL_BOX.h);
    const pb = new Pen(b.ctx, 700 + f * 37, 0.9);
    const hole = ellipse(OPENING.x, OPENING.y, OPENING.rx, OPENING.ry, 28);
    pb.fill(hole, '#140d0b', 1);
    const glow = b.ctx.createRadialGradient(OPENING.x - 10, OPENING.y, 4, OPENING.x, OPENING.y, OPENING.ry);
    glow.addColorStop(0, 'rgba(90,50,40,0.6)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    b.ctx.fillStyle = glow;
    b.ctx.fillRect(0, 0, SHELL_BOX.w, SHELL_BOX.h);
    back.push(b.canvas);

    const c = makeCanvas(SHELL_BOX.w, SHELL_BOX.h);
    const ctx = c.ctx;
    const pen = new Pen(ctx, 900 + f * 53, 1);
    const outline = shellShape();
    ctx.save();
    ctx.beginPath();
    outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    hole.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 60, 0, 290);
    g.addColorStop(0, '#e6cfa4');
    g.addColorStop(0.5, '#b88c5c');
    g.addColorStop(1, '#5e4027');
    ctx.fillStyle = g;
    ctx.fill('evenodd');
    ctx.clip('evenodd');
    // Spiral growth bands and lines, darker towards the underside.
    for (let i = 0; i < 9; i++) {
      const cx = 300 - i * 22;
      pen.stroke(Array.from({ length: 10 }, (_, k) => ({ x: cx - 12 * Math.sin((k / 9) * Math.PI), y: 60 + k * 26 })), 1.4, '#4a3020', 0.5);
    }
    for (let i = 0; i < 5; i++) {
      const y = 120 + i * 34;
      pen.fill(Array.from({ length: 12 }, (_, k) => ({ x: 100 + k * 22, y: y + 10 * Math.sin(k * 0.6 + i) })).concat([{ x: 340, y: y + 14 }, { x: 100, y: y + 14 }]), '#7a4e2c', 0.2);
    }
    pen.stipple(outline, 900, (_x, y) => Math.min(1, (y - 60) / 260), 0.9, '#3a2516');
    // The suture of the spire's whorls.
    pen.stroke([{ x: 330, y: 96 }, { x: 290, y: 118 }, { x: 250, y: 104 }, { x: 214, y: 128 }, { x: 170, y: 120 }], 1.6, INK, 0.75);
    ctx.restore();
    // The lip round the opening, pale and thick, then the outline.
    pen.stroke([...hole, hole[0]!], 7, '#f2e3c2', 0.95, false);
    pen.stroke([...hole, hole[0]!], 2, INK, 1);
    pen.stroke([...outline, outline[0]!], 2.6, INK, 1);
    front.push(c.canvas);
  }
  return { back, front };
}

/** Into the shell's scale, about its opening. */
function enterShell(ctx: CanvasRenderingContext2D): void {
  ctx.translate(SHELL_MOUTH.x, SHELL_MOUTH.y);
  ctx.scale(SHELL_SCALE, SHELL_SCALE);
  ctx.translate(-SHELL_MOUTH.x, -SHELL_MOUTH.y);
}

export function drawShellPart(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], boil: number): void {
  ctx.save();
  enterShell(ctx);
  ctx.drawImage(frames[boil % frames.length]!, SHELL_BOX.x, SHELL_BOX.y);
  ctx.restore();
}

/** Clips to everything outside the shell, plus its opening (where a fish inside still shows). */
export function clipOutsideShell(ctx: CanvasRenderingContext2D): void {
  const outline = shellShape().map((p) => ({ x: p.x + SHELL_BOX.x, y: p.y + SHELL_BOX.y }));
  const hole = ellipse(OPENING.x + SHELL_BOX.x, OPENING.y + SHELL_BOX.y, OPENING.rx, OPENING.ry, 28);
  enterShell(ctx);
  ctx.beginPath();
  ctx.rect(-2000, -2000, VIDEO.width + 4000, VIDEO.height + 4000);
  outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  hole.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
  ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix().translate(SHELL_MOUTH.x, SHELL_MOUTH.y).scale(1 / SHELL_SCALE).translate(-SHELL_MOUTH.x, -SHELL_MOUTH.y)));
}
