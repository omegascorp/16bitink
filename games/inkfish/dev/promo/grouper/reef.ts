import { ellipse, INK, makeCanvas, pathOf, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { makeBackdrop } from '../backdrop';
import { VIDEO } from '../short';
import { CRACK, HOLE, MOUND, ROCK, sandEdge } from './place';
import { LOOP_S } from './story';

/**
 * The reef, drawn once per boil frame with the game's pen: reef water, the
 * sand, the boulder with the moray's hole, the coral mound with its crack,
 * and the corals growing on them; weed swaying over it all. Also the clip
 * regions that hide a fish going into the rock or the coral.
 */

const SAND = '#e6d6aa';
const STONE = '#c9bd9b';
const MOUND_WASH = '#d6b49c';
const DARK = '#1d1a1e';
const BRAIN = '#e3b55e';
const ORANGE = '#e98a7a';
const PURPLE = '#b98fd0';
const FAN = '#c8577a';
const WEED = '#7f9a4a';

const trace = (path: Path2D | CanvasRenderingContext2D, pts: readonly Pt[]): void => {
  pts.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
  path.closePath();
};

/** The open water: everything but the boulder and the mound (they don't overlap, so even-odd cuts both out). */
export function waterPath(): Path2D {
  const region = new Path2D();
  region.rect(-100, -100, VIDEO.width + 200, VIDEO.height + 200);
  trace(region, ROCK);
  trace(region, MOUND);
  return region;
}

export const rockPath = (): Path2D => {
  const p = new Path2D();
  trace(p, ROCK);
  return p;
};
export const holePath = (): Path2D => {
  const p = new Path2D();
  p.ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, 0, 0, Math.PI * 2);
  return p;
};
export const crackPath = (): Path2D => {
  const p = new Path2D();
  trace(p, CRACK);
  return p;
};

/** A dome of brain coral on the edge at (x, base): washed, inked, with its meandering grooves. */
function brain(pen: Pen, x: number, base: number, rx: number, ry: number): void {
  const dome = [...ellipse(x, base, rx, ry, 28).filter((p) => p.y <= base + 2), { x: x - rx, y: base + 6 }];
  pen.fill(dome, BRAIN, 0.85);
  pen.clipped(dome, () => {
    for (let k = 1; k < 5; k++) {
      const r = k / 5;
      const groove = Array.from({ length: 13 }, (_, i) => {
        const a = Math.PI + (i / 12) * Math.PI;
        return { x: x + Math.cos(a) * rx * r + 4 * Math.sin(i * 2.1 + k), y: base + Math.sin(a) * ry * r + 3 * Math.cos(i * 1.7 + k) };
      });
      pen.hair(groove, 1.6, INK, 0.55);
    }
    pen.hatch(dome, 7, 0.9, 1.1, { onlyBelow: base - ry * 0.35, alpha: 0.3 });
  });
  pen.stroke(dome.slice(0, -1), 3.2);
}

/** A branching coral growing up from (x, base), `size` 1 about 120 px tall. */
function branching(pen: Pen, x: number, base: number, size: number, wash: string, seed: number): void {
  const rng = createRng(seed);
  const branch = (from: Pt, angle: number, len: number, width: number, depth: number): void => {
    const to = { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len };
    const bend = { x: (from.x + to.x) / 2 + (rng() - 0.5) * len * 0.2, y: (from.y + to.y) / 2 };
    pen.stroke([from, bend, to], width + 5, INK, 1, false);
    pen.stroke([from, bend, to], width, wash, 1, false);
    if (depth <= 0) return;
    for (const turn of [-0.5, 0.42]) branch(to, angle + turn + (rng() - 0.5) * 0.3, len * (0.66 + rng() * 0.15), width * 0.74, depth - 1);
  };
  branch({ x, y: base + 6 }, -Math.PI / 2 + (rng() - 0.5) * 0.2, 60 * size, 18 * size, 3);
}

/** A sea fan: a lattice of fine ink ribs spreading up from a stalk. */
function seaFan(pen: Pen, x: number, base: number, h: number, seed: number): void {
  const rng = createRng(seed);
  const ribs = 11;
  const tips = Array.from({ length: ribs }, (_, i) => {
    const a = -Math.PI / 2 + ((i / (ribs - 1)) - 0.5) * 1.5;
    const r = h * (0.85 + 0.15 * rng());
    return { x: x + Math.cos(a) * r * 0.8, y: base - h * 0.15 + Math.sin(a) * r };
  });
  const root = { x, y: base - h * 0.15 };
  pen.fill([root, ...tips], FAN, 0.22);
  for (const tip of tips) pen.stroke([root, { x: (root.x + tip.x) / 2 + (rng() - 0.5) * 10, y: (root.y + tip.y) / 2 }, tip], 2.4, FAN, 0.9, false);
  for (let k = 1; k < 6; k++) pen.hair(tips.map((p) => ({ x: root.x + (p.x - root.x) * (k / 6), y: root.y + (p.y - root.y) * (k / 6) })), 1.2, INK, 0.45);
  pen.stroke([{ x, y: base }, root], 6);
}

/** Tube sponges: a cluster of upright open tubes on the edge at (x, base). */
function sponges(pen: Pen, x: number, base: number): void {
  for (const [dx, h, w] of [[-26, 92, 22], [4, 128, 26], [32, 74, 20]] as const) {
    const cx = x + dx;
    const tube = [{ x: cx - w / 2, y: base + 4 }, { x: cx - w / 2 - 3, y: base - h }, { x: cx + w / 2 + 3, y: base - h }, { x: cx + w / 2, y: base + 4 }];
    pen.fill(tube, '#c98a3e', 0.9);
    pen.hatch(tube, 6, 1.4, 1, { alpha: 0.35 });
    pen.stroke([tube[0]!, tube[1]!], 2.8);
    pen.stroke([tube[2]!, tube[3]!], 2.8);
    pen.fill(ellipse(cx, base - h, w / 2 + 3, 6, 14), '#5a3418', 0.9);
    pen.closed(ellipse(cx, base - h, w / 2 + 3, 6, 14), 2.6);
  }
}

/** A region filled with a wash darkening downwards, as reef rock does away from the light. */
function shaded(ctx: CanvasRenderingContext2D, pts: readonly Pt[], top: number, bottom: number, light: string, dark: string): void {
  const wash = ctx.createLinearGradient(0, top, 0, bottom);
  wash.addColorStop(0, light);
  wash.addColorStop(1, dark);
  ctx.save();
  pathOf(ctx, pts);
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.restore();
}

/** Far off: the reef fading into blue behind everything, and light slanting down from the surface. */
function drawDistance(pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number): void {
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const x = 120 + i * 190 + rng() * 60;
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - 30, -20);
    ctx.lineTo(x + 40, -20);
    ctx.lineTo(x - 160, 1100);
    ctx.lineTo(x - 300, 1100);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const far: Pt[] = [{ x: -20, y: 1000 }];
  for (let x = -20; x <= VIDEO.width + 20; x += 18) far.push({ x, y: 820 - 70 * Math.abs(Math.sin(x / 140 + 0.6)) - 24 * Math.sin(x / 47) - 8 * rng() });
  far.push({ x: VIDEO.width + 20, y: 1000 });
  pen.fill(far, '#5b8fae', 0.12);
  pen.stroke(far.slice(1, -1), 1.6, '#4a7590', 0.35, false);
}

function drawSand(pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number): void {
  const edge = Array.from({ length: 56 }, (_, i) => ({ x: -20 + i * 20.4, y: sandEdge(-20 + i * 20.4) }));
  pen.fill([...edge, { x: VIDEO.width + 20, y: VIDEO.height + 20 }, { x: -20, y: VIDEO.height + 20 }], SAND, 0.8);
  pen.stroke(edge, 3.5);
  ctx.save();
  ctx.fillStyle = INK;
  for (let i = 0; i < 260; i++) {
    const x = rng() * VIDEO.width;
    ctx.globalAlpha = 0.2 + 0.3 * rng();
    ctx.beginPath();
    ctx.arc(x, sandEdge(x) + 16 + rng() * 700, 1 + rng() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBoulder(pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number): void {
  shaded(ctx, ROCK, 690, 1300, STONE, '#9d9174');
  pen.clipped(ROCK, () => {
    pen.hatch(ROCK, 14, -0.6, 1.6, { onlyBelow: 880, alpha: 0.32 });
    for (let i = 0; i < 26; i++) pen.closed(ellipse(rng() * 240 - 30, 720 + rng() * 560, 4 + rng() * 8, 3 + rng() * 5, 8), 1.4);
  });
  // The hole, dark in the rock's face.
  ctx.save();
  ctx.clip(rockPath());
  pen.fill(ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, 26), DARK, 1);
  ctx.restore();
  pen.stroke(ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, 26).filter((p) => p.x < 262), 4);
  pen.closed(ROCK, 5);
  seaFan(pen, 70, 694, 210, 61);
  branching(pen, 175, 732, 0.75, PURPLE, 62);
}

function drawMound(pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number): void {
  shaded(ctx, MOUND, 940, 1300, MOUND_WASH, '#a8806e');
  pen.clipped(MOUND, () => {
    pen.hatch(MOUND, 13, -0.55, 1.5, { onlyBelow: 1110, alpha: 0.3 });
    pen.stipple(MOUND, 2600, (_, y) => 0.35 + 0.4 * Math.min(1, (y - 940) / 200), 1.3);
    for (let i = 0; i < 30; i++) pen.closed(ellipse(320 + rng() * 820, 990 + rng() * 300, 3 + rng() * 6, 2 + rng() * 4, 8), 1.2);
  });
  // The crack: dark inside, inked round.
  pen.fill(CRACK, DARK, 1);
  ctx.save();
  ctx.clip(crackPath());
  pen.hatch(CRACK, 9, 0.8, 1.2, { color: '#3a3238', alpha: 0.6 });
  ctx.restore();
  pen.closed(CRACK, 4);
  pen.closed(MOUND, 5);
  // Corals on the mound, clear of the crack's two openings.
  branching(pen, 330, 996, 0.62, PURPLE, 71);
  brain(pen, 448, 972, 74, 48);
  brain(pen, 572, 956, 40, 26);
  brain(pen, 806, 942, 34, 16);
  branching(pen, 1060, 952, 0.85, ORANGE, 72);
  sponges(pen, 1118, 962);
}

/** The reef in each boil frame: the same shapes (rng), drawn with a different wobble (pen). */
export function makeReef(): readonly HTMLCanvasElement[] {
  const water = makeBackdrop({ top: 'rgba(70,165,205,0.08)', bottom: 'rgba(40,125,170,0.3)' });
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
    ctx.drawImage(water, 0, 0);
    const pen = new Pen(ctx, 3301 + f * 977, 1.4);
    drawDistance(pen, ctx, createRng(80));
    drawSand(pen, ctx, createRng(81));
    drawBoulder(pen, ctx, createRng(82));
    drawMound(pen, ctx, createRng(83));
    return canvas;
  });
}

/** Weed on the boulder and the mound, swaying a whole number of times a loop. */
const WEEDS = [
  { x: 128, y: 700, len: 140, sways: 2, phase: 0.6 },
  { x: 1040, y: 960, len: 110, sways: 2, phase: 1.2 },
] as const;

export function drawWeed(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const w of WEEDS) {
    const sway = Math.sin((2 * Math.PI * w.sways * t) / LOOP_S + w.phase);
    const pts = Array.from({ length: 9 }, (_, i) => {
      const u = i / 8;
      return { x: w.x + sway * 30 * u * u + 7 * Math.sin(u * 6 + w.phase), y: w.y - w.len * u };
    });
    for (const [width, colour] of [[10, INK], [5, WEED]] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  ctx.restore();
}
