import { DECOR_SIZE, drawDecor, type DecorId } from '../../../src/art/decorArt';
import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { ART_RES } from '../../../src/art/propArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import type { TextInk } from '../captions';
import { VIDEO } from '../short';
import { type Camera, cycles, GROUND, LOOP_S, type Mood, moodAt, toScreen } from './story';

/**
 * The reef round the frogfish: water in the mood's colours with sunbeams,
 * a soft far reef, the sand, the rock it sits on, and the round sponges it
 * passes for (painted the same warm orange, lumpy, pocked with holes), with
 * some of the game's own seabed decor further off. Then the grading on top:
 * a tint per mood, the vignette, the spotlight, the blink, flashes and
 * speed lines.
 */

export const INK_BG = '#04100f';
export const SPOKEN = '#f5c84a';
export const CHALK = '#eef3ea';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };

interface Palette {
  readonly top: string;
  readonly mid: string;
  readonly low: string;
  readonly reef: string;
  readonly sand: string;
  readonly rays: number;
  readonly vignette: number;
  /** The whole picture multiplied by this colour, this much. */
  readonly grade: string;
  readonly gradeAlpha: number;
}

const PALETTES: Readonly<Record<Mood, Palette>> = {
  thrill: { top: '#3aa6c4', mid: '#13658a', low: '#062c46', reef: '#1f6680', sand: '#c9b37e', rays: 0.16, vignette: 0.5, grade: '#ffffff', gradeAlpha: 0 },
  sneaky: { top: '#7a92cc', mid: '#40549c', low: '#1b184a', reef: '#4b5596', sand: '#b8a888', rays: 0.12, vignette: 0.4, grade: '#d4c2ff', gradeAlpha: 0.3 },
  hush: { top: '#1f4668', mid: '#0d2540', low: '#030a16', reef: '#15324c', sand: '#6c6a6a', rays: 0.03, vignette: 1, grade: '#5672aa', gradeAlpha: 0.5 },
  shock: { top: '#5cd6e8', mid: '#1f88b2', low: '#0a3858', reef: '#2b7a98', sand: '#d6c48e', rays: 0.24, vignette: 0.35, grade: '#ffffff', gradeAlpha: 0 },
  laugh: { top: '#86dcea', mid: '#36abca', low: '#165c82', reef: '#4498b2', sand: '#e2cf96', rays: 0.3, vignette: 0.15, grade: '#fff1c8', gradeAlpha: 0.12 },
  drama: { top: '#123038', mid: '#081a20', low: '#020608', reef: '#0f2a30', sand: '#4e4c48', rays: 0.03, vignette: 1, grade: '#4a6c7c', gradeAlpha: 0.38 },
};

const rgbOf = (hex: string): readonly [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixHex = (a: string, b: string, u: number): string => {
  const [p, q] = [rgbOf(a), rgbOf(b)];
  return `rgb(${p.map((v, i) => Math.round(v + (q[i]! - v) * u)).join(',')})`;
};
type Mixed = { readonly [K in keyof Palette]: Palette[K] extends number ? number : string };

/** The palette now, faded between the last mood and this one. */
export function paletteAt(t: number): Mixed {
  const { from, to, u } = moodAt(t);
  const a = PALETTES[from];
  const b = PALETTES[to];
  const num = (k: 'rays' | 'vignette' | 'gradeAlpha'): number => a[k] + (b[k] - a[k]) * u;
  return {
    top: mixHex(a.top, b.top, u),
    mid: mixHex(a.mid, b.mid, u),
    low: mixHex(a.low, b.low, u),
    reef: mixHex(a.reef, b.reef, u),
    sand: mixHex(a.sand, b.sand, u),
    grade: mixHex(a.grade, b.grade, u),
    rays: num('rays'),
    vignette: num('vignette'),
    gradeAlpha: num('gradeAlpha'),
  };
}

// ---------------------------------------------------------------- water and the far reef

export function drawWater(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  // Lighter up towards the surface: the gradient is pinned to the world, so it shifts as the camera moves.
  const top = toScreen(cam, { x: 0, y: -300 }).y;
  const bottom = toScreen(cam, { x: 0, y: GROUND + 200 }).y;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, p.top);
  g.addColorStop(0.55, p.mid);
  g.addColorStop(1, p.low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  drawRays(ctx, t, p.rays);
}

const RAYS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 9 }, (_, i) => ({ x: -300 + i * 210 + rng() * 120, w: 50 + rng() * 110, sway: rng() * Math.PI * 2, a: 0.6 + rng() * 0.6 }));
})();

function drawRays(ctx: CanvasRenderingContext2D, t: number, strength: number): void {
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const r of RAYS) {
    const x0 = r.x + 40 * Math.sin(cycles(1, t) + r.sway);
    const g = ctx.createLinearGradient(0, -100, 0, 1500);
    g.addColorStop(0, `rgba(220,245,255,${(strength * r.a).toFixed(3)})`);
    g.addColorStop(1, 'rgba(220,245,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - r.w / 2, -100);
    ctx.lineTo(x0 + r.w / 2, -100);
    ctx.lineTo(x0 - 380 + r.w * 1.5, 1500);
    ctx.lineTo(x0 - 380 - r.w * 1.5, 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The far reef: soft coral heads and fans in the haze, moving slower than the near reef. */
const FAR = (() => {
  const rng = createRng(311);
  return Array.from({ length: 16 }, (_, i) => ({
    x: -900 + i * 190 + rng() * 120,
    r: 70 + rng() * 120,
    h: 0.5 + rng() * 0.7,
    fan: i % 4 === 1,
    shade: rng(),
  }));
})();

export function drawFarReef(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  // A camera for the far layer: it moves and zooms less.
  const far: Camera = { x: 520 + (cam.x - 520) * 0.4, y: 900 + (cam.y - 900) * 0.4, zoom: 0.55 + (cam.zoom - 0.6) * 0.3 };
  const base = GROUND - 60;
  ctx.save();
  ctx.fillStyle = p.reef;
  ctx.strokeStyle = p.reef;
  for (const c of FAR) {
    ctx.globalAlpha = 0.55 + 0.3 * c.shade;
    if (c.fan) {
      const root = toScreen(far, { x: c.x, y: base });
      ctx.lineWidth = 6 * far.zoom;
      ctx.lineCap = 'round';
      for (let k = -3; k <= 3; k++) {
        const tip = toScreen(far, { x: c.x + k * c.r * 0.35, y: base - c.r * 2.2 * c.h + Math.abs(k) * 30 });
        ctx.beginPath();
        ctx.moveTo(root.x, root.y);
        ctx.quadraticCurveTo((root.x + tip.x) / 2 + k * 6, (root.y + tip.y) / 2, tip.x, tip.y);
        ctx.stroke();
      }
      continue;
    }
    const at = toScreen(far, { x: c.x, y: base });
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, c.r * far.zoom, c.r * c.h * far.zoom, 0, Math.PI, 0);
    ctx.fill();
  }
  // A band of reef along the bottom.
  const left = toScreen(far, { x: -2000, y: base - 10 });
  const right = toScreen(far, { x: 3000, y: base - 10 });
  ctx.globalAlpha = 0.85;
  ctx.fillRect(left.x, left.y, right.x - left.x, VIDEO.height - left.y + 10);
  ctx.restore();
}

// ---------------------------------------------------------------- the sand

export function drawSand(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  const pts: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 20) {
    const wx = cam.x + (x - VIDEO.width / 2) / cam.zoom;
    pts.push(toScreen(cam, { x: wx, y: GROUND + 110 + 18 * Math.sin(wx * 0.004) + 10 * Math.sin(wx * 0.011 + 1) }));
  }
  const top = Math.min(...pts.map((q) => q.y));
  if (top > VIDEO.height) return;
  const g = ctx.createLinearGradient(0, top, 0, top + 900 * cam.zoom);
  g.addColorStop(0, p.sand);
  g.addColorStop(1, p.low);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-20, VIDEO.height + 20);
  pts.forEach((q) => ctx.lineTo(q.x, q.y));
  ctx.lineTo(VIDEO.width + 20, VIDEO.height + 20);
  ctx.closePath();
  ctx.fill();
  // Ripples and grains, inked faintly.
  ctx.clip();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, 1.6 * cam.zoom);
  ctx.globalAlpha = 0.18;
  for (let k = 0; k < 14; k++) {
    const wy = GROUND + 150 + k * 70;
    const wx0 = -900 + ((k * 337) % 700);
    for (let j = 0; j < 6; j++) {
      const a = toScreen(cam, { x: wx0 + j * 420, y: wy + 12 * Math.sin(j + k) });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(a.x + 60 * cam.zoom, a.y - 10 * cam.zoom, a.x + 130 * cam.zoom, a.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- baked pieces: the rock, the sponges, the game's decor

/** A baked piece of scenery: frames (one per boil frame), its box in world px. */
export interface Piece {
  readonly frames: readonly HTMLCanvasElement[];
  readonly x0: number;
  readonly y0: number;
  readonly w: number;
  readonly h: number;
}

const PIECE_RES = 1.3;

function bakePiece(x0: number, y0: number, w: number, h: number, seed: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D) => void, frames = BOIL_FRAMES): Piece {
  return {
    frames: Array.from({ length: frames }, (_, f) => {
      const { canvas, ctx } = makeCanvas(Math.ceil(w * PIECE_RES), Math.ceil(h * PIECE_RES));
      ctx.scale(PIECE_RES, PIECE_RES);
      ctx.translate(-x0, -y0);
      draw(new Pen(ctx, seed + f * 977, 1.1), ctx);
      return canvas;
    }),
    x0, y0, w, h,
  };
}

export function drawPiece(ctx: CanvasRenderingContext2D, cam: Camera, piece: Piece, boil: number): void {
  const at = toScreen(cam, { x: piece.x0, y: piece.y0 });
  if (at.x > VIDEO.width || at.y > VIDEO.height || at.x + piece.w * cam.zoom < 0 || at.y + piece.h * cam.zoom < 0) return;
  ctx.drawImage(piece.frames[boil % piece.frames.length]!, at.x, at.y, piece.w * cam.zoom, piece.h * cam.zoom);
}

/** A closed lumpy blob round (cx, cy). */
function blob(cx: number, cy: number, rx: number, ry: number, seed: number, lumps = 1): Pt[] {
  const rng = createRng(seed);
  const phases = [rng() * 6, rng() * 6, rng() * 6];
  return Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    const k = 1 + lumps * (0.05 * Math.sin(a * 3 + phases[0]!) + 0.035 * Math.sin(a * 7 + phases[1]!) + 0.02 * Math.sin(a * 13 + phases[2]!));
    return { x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k };
  });
}

const ROCK = '#8a7f8c';
const ROCK_DARK = '#4a4252';
const CORALLINE = '#c9788e';

/** The rock the frog sits on: a rounded boulder crusted with pink coralline, hatched on its shadow side. */
export function makeRock(): Piece {
  const top = GROUND + 4;
  return bakePiece(140, top - 40, 820, 420, 501, (pen, ctx) => {
    const shape = [
      { x: 170, y: top + 300 }, { x: 205, y: top + 150 }, { x: 260, y: top + 50 }, { x: 330, y: top + 12 }, { x: 430, y: top + 2 },
      { x: 560, y: top }, { x: 680, y: top + 8 }, { x: 790, y: top + 40 }, { x: 870, y: top + 120 }, { x: 930, y: top + 300 },
    ];
    pen.fill(shape, PAPER_FILL, 1);
    pen.clipped(shape, () => {
      pen.fill(shape, ROCK, 0.85);
      const g = ctx.createLinearGradient(0, top, 0, top + 300);
      g.addColorStop(0, 'rgba(255,240,230,0.25)');
      g.addColorStop(1, 'rgba(20,10,30,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(140, top - 40, 820, 420);
      const rng = createRng(77);
      for (let i = 0; i < 22; i++) pen.fill(blob(180 + rng() * 740, top + rng() * 260, 20 + rng() * 40, 10 + rng() * 20, 900 + i), i % 3 ? CORALLINE : '#7a6a8c', 0.45);
      pen.stipple(shape, 2600, (_x, y) => 0.25 + (y - top) / 400, 1.1, ROCK_DARK);
      pen.hatch(shape, 9, 0.75, 1, { color: INK, alpha: 0.25, onlyBelow: top + 90 });
    });
    pen.stroke(shape, 3.4, INK, 1);
  });
}

const SPONGE_COLOURS = ['#eda63e', '#e3832f', '#f2bc4c', '#d96a2b'] as const;

/** A round sponge: lumpy, pocked with pores, a few big dark holes (oscula) on top; painted like the frog. */
function sponge(pen: Pen, ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, colour: string, seed: number, holes: number): void {
  const shape = blob(cx, cy, rx, ry, seed, 1.4);
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.fill(shape, colour, 0.9);
    const lit = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.45, rx * 0.1, cx, cy, rx * 1.1);
    lit.addColorStop(0, 'rgba(255,246,214,0.45)');
    lit.addColorStop(1, 'rgba(150,56,14,0.28)');
    ctx.fillStyle = lit;
    ctx.fillRect(cx - rx * 1.3, cy - ry * 1.3, rx * 2.6, ry * 2.6);
    // Lumps and pores, like the frog's warts.
    const rng = createRng(seed + 5);
    for (let i = 0; i < Math.round((rx * ry) / 90); i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng());
      const p = { x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d };
      const r = 2 + rng() * 4.5;
      pen.fill(ellipse(p.x + r * 0.3, p.y + r * 0.3, r, r * 0.9, 8), '#a8461c', 0.3);
      pen.fill(ellipse(p.x - r * 0.2, p.y - r * 0.25, r * 0.7, r * 0.6, 8), '#fbe7b4', 0.35);
    }
    pen.stipple(shape, Math.round(rx * ry * 0.07), () => 0.5, 1, '#5a2410');
    pen.hatch(shape, 6, 0.8, 1, { color: INK, alpha: 0.18, onlyBelow: cy + ry * 0.2 });
  });
  // The big holes on top.
  for (let k = 0; k < holes; k++) {
    const hx = cx + (k - (holes - 1) / 2) * rx * 0.42;
    const hy = cy - ry * (0.62 - 0.18 * Math.abs(k - (holes - 1) / 2));
    const hole = blob(hx, hy, rx * 0.13, ry * 0.07, seed + k * 31, 0.5);
    pen.fill(blob(hx, hy - 3, rx * 0.17, ry * 0.1, seed + k * 37, 0.5), '#fbe7b4', 0.5);
    pen.fill(hole, '#2a120a', 0.92);
    pen.stroke([...hole, hole[0]!], 1.6, INK, 1, false);
  }
  pen.stroke(shape, 3, INK, 1);
}

/** A barrel sponge: a tall vase with a dark mouth, ribbed down its sides. */
function barrel(pen: Pen, ctx: CanvasRenderingContext2D, cx: number, base: number, w: number, h: number, colour: string, seed: number): void {
  const lip = base - h;
  const shape: Pt[] = [
    { x: cx - w * 0.36, y: base }, { x: cx - w * 0.48, y: base - h * 0.45 }, { x: cx - w * 0.5, y: lip + 12 },
    ...Array.from({ length: 13 }, (_, i) => ({ x: cx - w * 0.5 + (w * i) / 12, y: lip + 6 * Math.sin(i * 1.7 + seed) - 4 })),
    { x: cx + w * 0.5, y: lip + 12 }, { x: cx + w * 0.48, y: base - h * 0.45 }, { x: cx + w * 0.36, y: base },
  ];
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.fill(shape, colour, 0.9);
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, 'rgba(255,246,214,0.4)');
    g.addColorStop(0.6, 'rgba(255,246,214,0)');
    g.addColorStop(1, 'rgba(110,30,10,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - w, lip - 20, w * 2, h + 40);
    for (let k = -3; k <= 3; k++) {
      const x = cx + k * w * 0.13;
      pen.stroke([{ x: x + k * 2, y: lip + 20 }, { x: x * 1 + k * 4, y: base - h * 0.4 }, { x: x + k * 2, y: base }], 1.6, INK, 0.45, false);
    }
    pen.stipple(shape, Math.round(w * h * 0.1), () => 0.5, 1.1, '#5a2410');
  });
  const mouth = blob(cx, lip + 8, w * 0.42, 14, seed, 0.4);
  pen.fill(mouth, '#2a120a', 0.95);
  pen.stroke([...mouth, mouth[0]!], 2, INK, 1, false);
  pen.stroke(shape, 3, INK, 1);
}

export interface Reef {
  readonly behind: readonly Piece[];
  readonly front: readonly Piece[];
  readonly rock: Piece;
  readonly decor: readonly { readonly canvas: HTMLCanvasElement; readonly x: number; readonly base: number; readonly scale: number; readonly w: number; readonly h: number }[];
}

export function makeReef(): Reef {
  const decor = ([['seafan', -260, GROUND + 60, 3.6], ['tubesponge', 1260, GROUND + 150, 3.2], ['braincoral', 1380, GROUND + 190, 2.4], ['seafan', 1500, GROUND + 80, 3]] as const).map(([kind, x, base, scale], i) => {
    const size = DECOR_SIZE[kind as DecorId];
    const { canvas, ctx } = makeCanvas(size.w * ART_RES, size.h * ART_RES);
    drawDecor(ctx, kind as DecorId, 40 + i);
    return { canvas, x, base, scale, w: size.w, h: size.h };
  });
  return {
    decor,
    behind: [
      bakePiece(-260, GROUND - 260, 320, 330, 601, (pen, ctx) => sponge(pen, ctx, -100, GROUND - 100, 140, 120, SPONGE_COLOURS[2], 61, 3)),
      bakePiece(40, GROUND - 260, 300, 300, 611, (pen, ctx) => sponge(pen, ctx, 190, GROUND - 110, 130, 125, SPONGE_COLOURS[0], 71, 3)),
      bakePiece(760, GROUND - 160, 300, 300, 621, (pen, ctx) => sponge(pen, ctx, 905, GROUND - 10, 125, 120, SPONGE_COLOURS[1], 81, 1)),
      bakePiece(1130, GROUND - 150, 220, 360, 631, (pen, ctx) => barrel(pen, ctx, 1240, GROUND + 200, 170, 290, SPONGE_COLOURS[3], 91)),
    ],
    front: [
      bakePiece(260, GROUND - 90, 420, 200, 641, (pen, ctx) => sponge(pen, ctx, 470, GROUND + 10, 190, 72, SPONGE_COLOURS[0], 101, 3)),
      // Out on the sand, nearer.
      bakePiece(20, GROUND + 230, 260, 200, 661, (pen, ctx) => sponge(pen, ctx, 150, GROUND + 330, 110, 85, SPONGE_COLOURS[3], 121, 1)),
      bakePiece(560, GROUND + 290, 280, 200, 671, (pen, ctx) => sponge(pen, ctx, 700, GROUND + 390, 120, 80, SPONGE_COLOURS[2], 131, 3)),
      bakePiece(900, GROUND + 200, 240, 200, 681, (pen, ctx) => sponge(pen, ctx, 1020, GROUND + 300, 100, 88, SPONGE_COLOURS[0], 141, 1)),
      bakePiece(780, GROUND + 120, 220, 170, 651, (pen, ctx) => sponge(pen, ctx, 890, GROUND + 210, 95, 66, SPONGE_COLOURS[2], 111, 3)),
    ],
    rock: makeRock(),
  };
}

export function drawDecorPieces(ctx: CanvasRenderingContext2D, cam: Camera, reef: Reef): void {
  for (const d of reef.decor) {
    const w = d.w * d.scale;
    const h = d.h * d.scale;
    const at = toScreen(cam, { x: d.x - w / 2, y: d.base - h });
    ctx.drawImage(d.canvas, at.x, at.y, w * cam.zoom, h * cam.zoom);
  }
}

// ---------------------------------------------------------------- drifting specks

const SPECKS = (() => {
  const rng = createRng(909);
  return Array.from({ length: 110 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.8 + rng() * 2, phase: rng() * Math.PI * 2, a: 0.12 + rng() * 0.25 }));
})();

/** Specks drifting in the water: each sways once a loop and drifts one lap up. */
export function drawSpecks(ctx: CanvasRenderingContext2D, t: number): void {
  const loop = t / LOOP_S;
  ctx.save();
  ctx.fillStyle = '#eaf6ff';
  for (const s of SPECKS) {
    const x = s.x + 14 * Math.sin(2 * Math.PI * loop + s.phase);
    const y = (((s.y - VIDEO.height * loop) % VIDEO.height) + VIDEO.height) % VIDEO.height;
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- grading and the cuts

/** The mood's tint over everything, and the vignette. */
export function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const p = paletteAt(t);
  if (p.gradeAlpha > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = p.gradeAlpha;
    ctx.fillStyle = p.grade;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.restore();
  }
  const g = ctx.createRadialGradient(VIDEO.width / 2, 820, 360, VIDEO.width / 2, 860, 1250);
  g.addColorStop(0, 'rgba(1,4,8,0)');
  g.addColorStop(1, `rgba(1,4,8,${(0.82 * p.vignette).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** The spotlight: dark everywhere but a circle round `at` (screen px), `size` a share of the screen's height. */
export function drawIris(ctx: CanvasRenderingContext2D, at: Pt, size: number): void {
  if (size >= 1.15) return;
  const r = Math.max(0, size * VIDEO.height);
  ctx.save();
  ctx.fillStyle = INK_BG;
  ctx.beginPath();
  ctx.rect(0, 0, VIDEO.width, VIDEO.height);
  if (r > 0.5) ctx.arc(at.x, at.y, r, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  if (r > 0.5) {
    // A soft edge inside the circle.
    const g = ctx.createRadialGradient(at.x, at.y, r * 0.7, at.x, at.y, r);
    g.addColorStop(0, 'rgba(4,16,15,0)');
    g.addColorStop(1, 'rgba(4,16,15,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The screen blinking: eyelids from the top and the bottom, 0 open .. 1 shut. */
export function drawLids(ctx: CanvasRenderingContext2D, shut: number): void {
  if (shut <= 0) return;
  const mid = VIDEO.height * 0.43;
  const reach = shut * (mid + 140);
  ctx.save();
  ctx.fillStyle = '#0b0606';
  for (const dir of [1, -1] as const) {
    const edge = dir === 1 ? reach - 140 : VIDEO.height - (VIDEO.height - mid + 140) * shut + 140;
    const bow = 160 * (1 - shut);
    ctx.beginPath();
    if (dir === 1) {
      ctx.moveTo(0, -10);
      ctx.lineTo(VIDEO.width, -10);
      ctx.lineTo(VIDEO.width, edge);
      ctx.quadraticCurveTo(VIDEO.width / 2, edge + 2 * bow, 0, edge);
    } else {
      ctx.moveTo(0, VIDEO.height + 10);
      ctx.lineTo(VIDEO.width, VIDEO.height + 10);
      ctx.lineTo(VIDEO.width, edge);
      ctx.quadraticCurveTo(VIDEO.width / 2, edge - 2 * bow, 0, edge);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawFlash(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** Its innocent whistle: two chalk notes rising and swaying off its head, `u` 0 .. 1 over their life. */
export function drawWhistle(ctx: CanvasRenderingContext2D, at: Pt, u: number, size: number): void {
  ctx.save();
  ctx.fillStyle = CHALK;
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  for (const [k, dx] of [[0, 0], [1, 1]] as const) {
    const v = u - k * 0.22;
    if (v < 0 || v > 1) continue;
    const x = at.x + dx * size * 0.9 + size * 0.3 * Math.sin(v * 7);
    const y = at.y - size * (0.2 + 1.8 * v);
    ctx.globalAlpha = Math.min(1, v * 6) * (1 - v) * 1.4;
    const r = size * 0.22;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.2, r * 0.85, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.moveTo(x + r * 1.05, y - r * 0.2);
    ctx.lineTo(x + r * 1.05, y - size * 1.05);
    ctx.quadraticCurveTo(x + r * 1.05 + size * 0.45, y - size * 0.85, x + r * 1.05 + size * 0.4, y - size * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}
