import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, type Pen, type Pt } from '../../../src/art/pen';
import { createRng, type Rng } from '../../../src/logic/rng';
import { ramp } from '../short';
import { bake, type Baked, blob, drawBaked, livePen, smoothClosed } from './ink';
import { cycles } from './story';

/**
 * The reef seen from above, in world mm: sand and rubble, coral heads round
 * the sandy flat the wobbegong lies on (brain corals, table corals throwing
 * big shadows, staghorn thickets, lumpy boulders, leather corals, a giant
 * clam, a few urchins), little fish hanging over them, and the caustics the
 * sun throws on the bottom. Baked twice from the same drawing: the whole
 * reef for the wide shots, and the patch round the head sharper for the
 * close-ups (it fades in as the camera comes close).
 */

const SAND = '#d4c49b';
const SAND_DARK = '#a8987a';
const SAND_LIGHT = '#e8dcb8';
const SHADOW = '#1d1a14';

const FAR = { x0: -1500, y0: -1850, x1: 1500, y1: 3300, res: 0.5 } as const;
const NEAR = { x0: -640, y0: -720, x1: 760, y1: 820, res: 1.5 } as const;

type Kind = 'brain' | 'table' | 'stag' | 'boulder' | 'leather' | 'clam' | 'urchin';
interface Coral {
  readonly kind: Kind;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly hue?: string;
}

/** Hand-placed round the flat (x -520 .. 520, y -460 .. 1480 is the sharks'). */
const CORALS: readonly Coral[] = [
  { kind: 'stag', x: -420, y: -640, r: 300, hue: '#c9a58c' },
  { kind: 'brain', x: 470, y: -110, r: 150 },
  { kind: 'table', x: -860, y: -260, r: 430, hue: '#7ea6a2' },
  { kind: 'boulder', x: 720, y: -620, r: 260 },
  { kind: 'brain', x: 150, y: -980, r: 210 },
  { kind: 'stag', x: -760, y: 640, r: 360, hue: '#b8a0c4' },
  { kind: 'boulder', x: 800, y: 470, r: 300 },
  { kind: 'clam', x: 600, y: 1020, r: 120 },
  { kind: 'table', x: 860, y: 1380, r: 400, hue: '#94a8b8' },
  { kind: 'brain', x: -660, y: 1320, r: 230 },
  { kind: 'leather', x: -1150, y: 230, r: 240 },
  { kind: 'stag', x: 1150, y: -80, r: 300, hue: '#d0b48e' },
  { kind: 'table', x: 950, y: -1500, r: 420, hue: '#86a99a' },
  { kind: 'boulder', x: -1150, y: -1250, r: 300 },
  { kind: 'stag', x: -420, y: -1500, r: 340, hue: '#c6a6b0' },
  { kind: 'brain', x: 1250, y: 1900, r: 250 },
  { kind: 'leather', x: -1200, y: 1850, r: 260 },
  { kind: 'brain', x: -900, y: 2250, r: 230 },
  { kind: 'stag', x: 600, y: 2250, r: 380, hue: '#b8a0c4' },
  { kind: 'table', x: -250, y: 2700, r: 430, hue: '#7ea6a2' },
  { kind: 'boulder', x: 1100, y: 2800, r: 300 },
  { kind: 'leather', x: 400, y: 1750, r: 200 },
  { kind: 'brain', x: -420, y: 1950, r: 160 },
  { kind: 'urchin', x: -560, y: 180, r: 38 },
  { kind: 'urchin', x: 590, y: 700, r: 34 },
  { kind: 'urchin', x: -330, y: 1640, r: 36 },
  { kind: 'urchin', x: 360, y: -560, r: 30 },
  { kind: 'clam', x: -950, y: 980, r: 110 },
  { kind: 'brain', x: 1250, y: 900, r: 180 },
  { kind: 'boulder', x: -1250, y: -450, r: 200 },
];

// ---------------------------------------------------------------- the bottom

function sand(pen: Pen, ctx: CanvasRenderingContext2D, rng: Rng): void {
  const b = FAR;
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.fillStyle = SAND;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.globalAlpha = 1;
  // Washes: rubble-dark and sunlit patches, laid over each other like watercolour.
  for (let i = 0; i < 160; i++) {
    const x = b.x0 + rng() * (b.x1 - b.x0);
    const y = b.y0 + rng() * (b.y1 - b.y0);
    const r = 90 + rng() * 320;
    pen.fill(blob(rng, x, y, r, r * (0.5 + rng() * 0.5), 0.35, 9, rng() * 3), rng() < 0.55 ? SAND_DARK : SAND_LIGHT, 0.12 + rng() * 0.12);
  }
  // Ripples in the sand.
  for (let i = 0; i < 260; i++) {
    const x = b.x0 + rng() * (b.x1 - b.x0);
    const y = b.y0 + rng() * (b.y1 - b.y0);
    const len = 80 + rng() * 160;
    const pts = Array.from({ length: 6 }, (_, k) => ({ x: x + (k / 5) * len, y: y + 8 * Math.sin(k * 1.3 + i) + (k / 5) * len * 0.25 }));
    pen.hair(pts, 1.6, SAND_DARK, 0.4);
  }
  // Rubble: bits of old coral and shell, each lit on top with a shadow below.
  for (let i = 0; i < 900; i++) {
    const x = b.x0 + rng() * (b.x1 - b.x0);
    const y = b.y0 + rng() * (b.y1 - b.y0);
    const r = 8 + rng() ** 2 * 34;
    const shape = blob(rng, x, y, r, r * (0.5 + rng() * 0.4), 0.3, 7, rng() * 3);
    pen.fill(shape.map((p) => ({ x: p.x + r * 0.4, y: p.y + r * 0.5 })), SHADOW, 0.22);
    pen.fill(shape, rng() < 0.5 ? '#bfb196' : rng() < 0.5 ? '#9d917a' : '#cbb9a0', 0.95);
    if (r > 18) pen.hair(shape.slice(0, Math.ceil(shape.length / 2)), 1.4, INK, 0.55);
  }
  pen.stipple([{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }], 9000, () => 0.6, 2.2, '#7d705a');
}

// ---------------------------------------------------------------- corals

function castShadow(pen: Pen, shape: readonly Pt[], dx: number, dy: number, alpha: number): void {
  pen.fill(shape.map((p) => ({ x: p.x + dx, y: p.y + dy })), SHADOW, alpha);
}

function brain(pen: Pen, rng: Rng, c: Coral): void {
  const mound = blob(rng, c.x, c.y, c.r, c.r * 0.92, 0.08, 12);
  castShadow(pen, mound, c.r * 0.22, c.r * 0.28, 0.35);
  pen.fill(mound, PAPER_FILL, 1);
  pen.fill(mound, '#b39d63', 0.95);
  pen.clipped(mound, () => {
    // The maze of grooves: wandering rings.
    for (let k = 1; k < 9; k++) {
      const rr = (c.r * k) / 9;
      const ring = Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2;
        const w = rr * (1 + 0.12 * Math.sin(a * (5 + k) + k * 2.1) + 0.06 * Math.sin(a * 13 + k));
        return { x: c.x + Math.cos(a) * w, y: c.y + Math.sin(a) * w * 0.92 };
      });
      pen.hair([...ring, ring[0]!], 2.2, '#5d4b28', 0.55);
      pen.hair(ring.map((p) => ({ x: p.x - 4, y: p.y - 4 })), 1.6, '#e2d39a', 0.45);
    }
    pen.fill(ellipse(c.x + c.r * 0.45, c.y + c.r * 0.45, c.r * 0.9, c.r * 0.8, 20), '#3b2f18', 0.3);
    pen.fill(ellipse(c.x - c.r * 0.35, c.y - c.r * 0.35, c.r * 0.5, c.r * 0.45, 20), '#f2e6b8', 0.25);
  });
  pen.stroke([...mound, mound[0]!], 3, INK, 1);
}

function table(pen: Pen, rng: Rng, c: Coral): void {
  const n = 64;
  const plate = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const w = c.r * (1 + 0.07 * Math.sin(a * 9 + c.x) + 0.04 * Math.sin(a * 23)) * (0.94 + 0.06 * rng());
    return { x: c.x + Math.cos(a) * w, y: c.y + Math.sin(a) * w * 0.9 };
  });
  castShadow(pen, plate, c.r * 0.35, c.r * 0.42, 0.42);
  const hue = c.hue ?? '#7ea6a2';
  pen.fill(plate, PAPER_FILL, 1);
  pen.fill(plate, hue, 0.92);
  pen.clipped(plate, () => {
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + rng() * 0.03;
      pen.hair([{ x: c.x, y: c.y }, { x: c.x + Math.cos(a) * c.r * 1.1, y: c.y + Math.sin(a) * c.r }], 1.4, '#35524f', 0.35);
    }
    pen.stipple(plate, 1600, (x, y) => 0.3 + 0.7 * Math.min(1, Math.hypot(x - c.x, y - c.y) / c.r), 3, '#e9f2ea');
    pen.fill(ellipse(c.x + c.r * 0.4, c.y + c.r * 0.4, c.r * 0.95, c.r * 0.85, 24), '#1d3433', 0.25);
    pen.fill(ellipse(c.x - c.r * 0.3, c.y - c.r * 0.3, c.r * 0.55, c.r * 0.5, 24), '#f4fbf2', 0.2);
  });
  pen.stroke([...plate, plate[0]!], 3, INK, 1);
  pen.hair(plate.map((p) => ({ x: c.x + (p.x - c.x) * 0.93, y: c.y + (p.y - c.y) * 0.93 })), 1.6, '#e8f1e8', 0.5);
}

/** A staghorn thicket: antler branches forking outward, pale tips. */
function stag(pen: Pen, rng: Rng, c: Coral): void {
  const hue = c.hue ?? '#c9a58c';
  const branches: { a: Pt; b: Pt; w: number }[] = [];
  const grow = (p: Pt, ang: number, len: number, w: number, depth: number): void => {
    const q = { x: p.x + Math.cos(ang) * len, y: p.y + Math.sin(ang) * len };
    branches.push({ a: p, b: q, w });
    if (depth <= 0) return;
    const forks = rng() < 0.6 ? 2 : 3;
    for (let k = 0; k < forks; k++) grow(q, ang + (k - (forks - 1) / 2) * (0.5 + rng() * 0.3), len * (0.7 + rng() * 0.2), w * 0.78, depth - 1);
  };
  const stems = 7 + Math.floor(rng() * 3);
  for (let i = 0; i < stems; i++) grow({ x: c.x + (rng() - 0.5) * 40, y: c.y + (rng() - 0.5) * 40 }, (i / stems) * Math.PI * 2 + rng() * 0.4, c.r * 0.34, 30, 3);
  for (const s of branches) pen.stroke([{ x: s.a.x + 26, y: s.a.y + 32 }, { x: s.b.x + 26, y: s.b.y + 32 }], s.w, SHADOW, 0.2, false);
  for (const s of branches) pen.stroke([s.a, s.b], s.w + 5, INK, 0.95, false);
  for (const s of branches) pen.stroke([s.a, s.b], s.w, hue, 1, false);
  for (const s of branches) pen.stroke([{ x: s.a.x - s.w * 0.15, y: s.a.y - s.w * 0.15 }, { x: s.b.x - s.w * 0.15, y: s.b.y - s.w * 0.15 }], s.w * 0.3, '#f6ead6', 0.5, false);
  for (const s of branches.filter((_, i) => i % 3 === 0)) pen.dot(s.b.x, s.b.y, s.w * 0.45, '#f7efe0', 0.95);
}

function boulder(pen: Pen, rng: Rng, c: Coral): void {
  const lumps = Array.from({ length: 6 }, () => ({ x: c.x + (rng() - 0.5) * c.r, y: c.y + (rng() - 0.5) * c.r, r: c.r * (0.4 + rng() * 0.25) }));
  for (const l of lumps) castShadow(pen, ellipse(l.x, l.y, l.r, l.r * 0.9, 20), l.r * 0.3, l.r * 0.35, 0.22);
  for (const l of lumps) {
    const shape = blob(rng, l.x, l.y, l.r, l.r * 0.9, 0.1, 10);
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, '#a4916f', 0.95);
    pen.clipped(shape, () => {
      pen.stipple(shape, 500, () => 0.7, 2.4, '#5b4c33');
      pen.fill(ellipse(l.x + l.r * 0.4, l.y + l.r * 0.45, l.r * 0.9, l.r * 0.8, 16), '#2e2416', 0.3);
      pen.fill(ellipse(l.x - l.r * 0.3, l.y - l.r * 0.3, l.r * 0.45, l.r * 0.4, 16), '#efe2c0', 0.3);
    });
    pen.stroke([...shape, shape[0]!], 2.6, INK, 1);
  }
}

function leather(pen: Pen, rng: Rng, c: Coral): void {
  const n = 48;
  const disc = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const w = c.r * (1 + 0.12 * Math.sin(a * 7 + rng()) + 0.05 * Math.sin(a * 17));
    return { x: c.x + Math.cos(a) * w, y: c.y + Math.sin(a) * w };
  });
  castShadow(pen, disc, c.r * 0.25, c.r * 0.3, 0.3);
  pen.fill(disc, PAPER_FILL, 1);
  pen.fill(disc, '#cfc690', 0.95);
  pen.clipped(disc, () => {
    for (let k = 0; k < 4; k++) {
      const ring = disc.map((p) => ({ x: c.x + (p.x - c.x) * (0.85 - k * 0.18), y: c.y + (p.y - c.y) * (0.85 - k * 0.18) }));
      pen.hair([...ring, ring[0]!], 1.8, '#7c7448', 0.5);
    }
    pen.stipple(disc, 900, () => 0.8, 2, '#f7f1d0');
    pen.fill(ellipse(c.x + c.r * 0.4, c.y + c.r * 0.4, c.r * 0.9, c.r * 0.8, 20), '#3e3a20', 0.25);
  });
  pen.stroke([...disc, disc[0]!], 2.6, INK, 1);
}

function clam(pen: Pen, rng: Rng, c: Coral): void {
  const shell = blob(rng, c.x, c.y, c.r * 1.5, c.r * 0.75, 0.06, 12, 0.5);
  castShadow(pen, shell, 20, 26, 0.3);
  pen.fill(shell, PAPER_FILL, 1);
  pen.fill(shell, '#cdbfa0', 1);
  const mantle = blob(rng, c.x, c.y, c.r * 1.3, c.r * 0.42, 0.05, 12, 0.5);
  pen.fill(mantle, '#2f86a8', 1);
  pen.clipped(mantle, () => {
    for (let i = 0; i < 40; i++) pen.dot(c.x + (rng() - 0.5) * c.r * 2.4, c.y + (rng() - 0.5) * c.r, 4 + rng() * 5, rng() < 0.5 ? '#9fe0ef' : '#174d68', 0.8);
  });
  const lip = Array.from({ length: 30 }, (_, i) => {
    const f = i / 29;
    const along = { x: Math.cos(0.5), y: Math.sin(0.5) };
    const d = (f - 0.5) * c.r * 2.5;
    return { x: c.x + along.x * d - along.y * 8 * Math.sin(f * 18), y: c.y + along.y * d + along.x * 8 * Math.sin(f * 18) };
  });
  pen.hair(lip, 2.4, INK, 0.9);
  pen.stroke([...shell, shell[0]!], 2.6, INK, 1);
}

function urchin(pen: Pen, rng: Rng, c: Coral): void {
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng() * 0.2;
    const len = c.r * (1.6 + rng() * 0.9);
    pen.hair([{ x: c.x, y: c.y }, { x: c.x + Math.cos(a) * len, y: c.y + Math.sin(a) * len }], 2.2, '#16121a', 0.9);
  }
  pen.fill(ellipse(c.x, c.y, c.r, c.r, 14), '#1e1622', 1);
  pen.dot(c.x - c.r * 0.3, c.y - c.r * 0.3, c.r * 0.25, '#8a7aa0', 0.7);
}

const PAINT: Readonly<Record<Kind, (pen: Pen, rng: Rng, c: Coral) => void>> = { brain, table, stag, boulder, leather, clam, urchin };

function paintReef(pen: Pen, ctx: CanvasRenderingContext2D, rng: Rng): void {
  sand(pen, ctx, rng);
  for (const c of CORALS) PAINT[c.kind](pen, createRng(Math.round(c.x * 7 + c.y * 13)), c);
}

export interface Reef {
  readonly far: Baked;
  readonly near: Baked;
  readonly caustics: CanvasPattern;
}

/** A tile of caustics: the bright net the waves' lenses throw on the bottom (the edges of cells, where two are nearly as close). */
function makeCaustics(): HTMLCanvasElement {
  const N = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(77);
  const seeds = Array.from({ length: 22 }, () => ({ x: rng() * N, y: rng() * N }));
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let d1 = Infinity;
      let d2 = Infinity;
      for (const s of seeds) {
        const dx = Math.min(Math.abs(x - s.x), N - Math.abs(x - s.x));
        const dy = Math.min(Math.abs(y - s.y), N - Math.abs(y - s.y));
        const d = Math.hypot(dx, dy);
        if (d < d1) [d1, d2] = [d, d1];
        else if (d < d2) d2 = d;
      }
      const v = Math.max(0, 1 - (d2 - d1) / 7) ** 2;
      const i = (y * N + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 250;
      img.data[i + 2] = 225;
      img.data[i + 3] = Math.round(255 * v);
    }
  }
  ctx.putImageData(img, 0, 0);
  // Softened, as light through moving water is.
  const soft = document.createElement('canvas');
  soft.width = soft.height = N;
  const sctx = soft.getContext('2d')!;
  sctx.filter = 'blur(2.5px)';
  for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) sctx.drawImage(canvas, dx, dy);
  return soft;
}

export function makeReef(): Reef {
  const caustics = document.createElement('canvas').getContext('2d')!.createPattern(makeCaustics(), 'repeat')!;
  return { far: bake(FAR, 909, 1.4, paintReef), near: bake(NEAR, 909, 1.4, paintReef), caustics };
}

/** The reef, the sharper patch fading in as the camera comes close (`zoom` px per mm). */
export function drawReef(ctx: CanvasRenderingContext2D, reef: Reef, zoom: number, boil: number): void {
  drawBaked(ctx, reef.far, boil);
  drawBaked(ctx, reef.near, boil, ramp(zoom, 0.6, 0.95));
}

/** The caustics over everything on the bottom (ctx in world mm), drifting in whole cycles a loop. */
export function drawCaustics(ctx: CanvasRenderingContext2D, reef: Reef, t: number, strength: number): void {
  if (strength <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [scale, n, phase, a] of [[2.3, 1, 0, 0.3], [1.8, -1, 2, 0.24]] as const) {
    const ox = 60 * Math.cos(cycles(n, t) + phase);
    const oy = 60 * Math.sin(cycles(n, t) + phase) + 30 * Math.sin(cycles(2 * n, t));
    reef.caustics.setTransform(new DOMMatrix().translateSelf(ox, oy).scaleSelf(scale * 1.6, scale * 1.4));
    ctx.globalAlpha = a * strength;
    ctx.fillStyle = reef.caustics;
    ctx.fillRect(FAR.x0, FAR.y0, FAR.x1 - FAR.x0, FAR.y1 - FAR.y0);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- fish

/** Little damselfish hanging over the corals in loose schools, circling. */
const SCHOOLS: readonly { readonly x: number; readonly y: number; readonly r: number; readonly n: number; readonly hue: string; readonly dir: 1 | -1 }[] = [
  { x: -760, y: 640, r: 260, n: 9, hue: '#7fd0d8', dir: 1 },
  { x: 860, y: 1380, r: 300, n: 8, hue: '#f2d064', dir: -1 },
  { x: 720, y: -620, r: 220, n: 7, hue: '#9ad0f0', dir: 1 },
  { x: -860, y: -260, r: 320, n: 8, hue: '#7fd0d8', dir: -1 },
];

export function drawSchools(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = livePen(ctx, 83, boil, 0.6);
  for (const s of SCHOOLS) {
    for (let i = 0; i < s.n; i++) {
      const a = s.dir * cycles(1, t) + (i / s.n) * Math.PI * 2 + 0.4 * Math.sin(i * 3.1);
      const rr = s.r * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7)));
      const x = s.x + Math.cos(a) * rr;
      const y = s.y + Math.sin(a) * rr * 0.8;
      const head = a + (s.dir * Math.PI) / 2;
      const u = { x: Math.cos(head), y: Math.sin(head) };
      const v = { x: -u.y, y: u.x };
      const L = 46;
      const wag = 0.35 * Math.sin(cycles(40, t) + i);
      const body = [
        { x: x + u.x * L * 0.5, y: y + u.y * L * 0.5 }, { x: x + v.x * 11, y: y + v.y * 11 }, { x: x - u.x * L * 0.35, y: y - u.y * L * 0.35 }, { x: x - v.x * 11, y: y - v.y * 11 },
      ];
      const tb = { x: x - u.x * L * 0.35, y: y - u.y * L * 0.35 };
      const ta = head + Math.PI + wag;
      const tail = [tb, { x: tb.x + Math.cos(ta + 0.45) * 20, y: tb.y + Math.sin(ta + 0.45) * 20 }, { x: tb.x + Math.cos(ta - 0.45) * 20, y: tb.y + Math.sin(ta - 0.45) * 20 }];
      pen.fill(body.map((p) => ({ x: p.x + 30, y: p.y + 38 })), SHADOW, 0.18);
      pen.fill(tail, s.hue, 0.95);
      pen.fill(smoothClosed(body, 3), s.hue, 1);
      pen.hair([...smoothClosed(body, 3), body[0]!], 1.4, INK, 0.9);
      pen.dot(x + u.x * L * 0.3 + v.x * 5, y + u.y * L * 0.3 + v.y * 5, 2.2, INK, 1);
    }
  }
}
