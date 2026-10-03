import { createRng, type Rng } from '../logic/rng';
import { ellipse, INK, PAPER, Pen, type Pt } from './pen';

/**
 * Props are drawn at ART_RES× their in-game size and displayed at
 * 1 / ART_RES scale, so fine pen lines stay crisp instead of blurring.
 */
export const ART_RES = 2;

const PAPER_FILL = '#fffaf0';
const KELP_INK = '#24392a';
const KELP_WASH = '#6f8f5f';

function bez(p0: Pt, c: Pt, p1: Pt, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

/** Offsets a centreline both ways by `width(u)` to make a ribbon polygon. */
function ribbon(center: readonly Pt[], width: (u: number) => number): { left: Pt[]; right: Pt[]; shape: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  center.forEach((p, i) => {
    const a = center[Math.max(0, i - 1)]!;
    const b = center[Math.min(center.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const w = width(i / (center.length - 1));
    left.push({ x: p.x - (dy / d) * w, y: p.y + (dx / d) * w });
    right.push({ x: p.x + (dy / d) * w, y: p.y - (dx / d) * w });
  });
  return { left, right, shape: [...left, ...[...right].reverse()] };
}

// ---------------------------------------------------------------- weeds

/** A kelp blade with a midrib, ruffled edges and fine veins. */
function blade(pen: Pen, center: readonly Pt[], maxW: number, rng: Rng): void {
  const ruffle = rng() * 6;
  const { left, right, shape } = ribbon(center, (u) => maxW * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.7) * (1 + 0.12 * Math.sin(u * 22 + ruffle)));
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, KELP_WASH, 0.3);
  // Shade one side of the blade with fine hatching.
  pen.clipped(shape, () => {
    right.forEach((p, i) => {
      if (i % 2) return;
      const c = center[i]!;
      pen.hair([p, { x: (p.x + c.x) / 2, y: (p.y + c.y) / 2 + 2 }], 0.6, KELP_INK, 0.55);
    });
  });
  pen.hair(center, 0.9, KELP_INK, 0.8);
  left.forEach((p, i) => {
    if (i % 3 || i === 0) return;
    pen.hair([center[i]!, p], 0.5, KELP_INK, 0.4);
  });
  pen.stroke(left, 1.4, KELP_INK, 1, false);
  pen.stroke(right, 1.4, KELP_INK, 1, false);
}

function kelp(pen: Pen, w: number, h: number, rng: Rng): void {
  const x0 = w / 2 + (rng() - 0.5) * 30;
  const height = h * (0.72 + rng() * 0.22);
  const stem: Pt[] = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30;
    stem.push({ x: x0 + Math.sin(u * 4 + rng()) * 16 * u, y: h - 4 - u * height });
  }
  const { left, right, shape } = ribbon(stem, (u) => 4.5 * (1 - u * 0.6));
  pen.fill(shape, KELP_WASH, 0.45);
  pen.stroke(left, 1.3, KELP_INK, 1, false);
  pen.stroke(right, 1.3, KELP_INK, 1, false);
  // Blades sprout alternately, longer near the base.
  for (let i = 4; i < stem.length - 1; i += 3) {
    const p = stem[i]!;
    const side = i % 2 ? 1 : -1;
    const len = (60 + rng() * 40) * (1 - i / stem.length * 0.5);
    const tip = { x: p.x + side * len * 0.75, y: p.y - len * 0.75 };
    blade(pen, bez(p, { x: p.x + side * len * 0.65, y: p.y - len * 0.05 }, tip, 18), 9 + rng() * 4, rng);
  }
  // Holdfast: a tangle of little roots.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.15 + rng() * 0.7);
    pen.hair([{ x: x0, y: h - 6 }, { x: x0 + Math.cos(a) * 18, y: h - 6 + Math.sin(a) * 6 }], 0.9, KELP_INK, 0.8);
  }
}

function eelgrass(pen: Pen, w: number, h: number, rng: Rng): void {
  const n = 6 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const x0 = w / 2 + (i - n / 2) * 7 + (rng() - 0.5) * 6;
    const height = h * (0.5 + rng() * 0.45);
    const lean = (rng() - 0.5) * 120;
    const center = bez({ x: x0, y: h - 4 }, { x: x0 + lean * 0.2, y: h - height * 0.6 }, { x: x0 + lean, y: h - height }, 24);
    const { left, right, shape } = ribbon(center, (u) => 5.5 * (1 - Math.pow(u, 1.6)) + 0.4);
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, KELP_WASH, 0.28 + rng() * 0.12);
    // Parallel veins run the length of each blade.
    pen.hair(center, 0.5, KELP_INK, 0.55);
    pen.stroke(left, 1.2, KELP_INK, 1, false);
    pen.stroke(right, 1.2, KELP_INK, 1, false);
    pen.clipped(shape, () => {
      for (let k = 0; k < center.length * 0.35; k++) {
        const p = left[k]!;
        pen.hair([p, { x: p.x + 4, y: p.y - 3 }], 0.5, KELP_INK, 0.5);
      }
    });
  }
}

function seaFern(pen: Pen, w: number, h: number, rng: Rng): void {
  const x0 = w / 2;
  const height = h * (0.6 + rng() * 0.25);
  const stem = bez({ x: x0, y: h - 4 }, { x: x0 + (rng() - 0.5) * 50, y: h - height * 0.5 }, { x: x0 + (rng() - 0.5) * 40, y: h - height }, 30);
  pen.stroke(stem, 1.8, KELP_INK, 1, false);
  for (let i = 3; i < stem.length; i += 2) {
    const p = stem[i]!;
    const side = i % 4 === 1 ? 1 : -1;
    const len = (46 + rng() * 26) * (1 - (i / stem.length) * 0.65);
    const branch = bez(p, { x: p.x + side * len * 0.6, y: p.y - len * 0.1 }, { x: p.x + side * len, y: p.y - len * 0.55 }, 10);
    pen.stroke(branch, 1, KELP_INK, 1, false);
    // Leaflets alternate along each branch.
    branch.forEach((b, j) => {
      if (j === 0 || j % 2) return;
      const leaf = ellipse(b.x + side * 1.5, b.y - 4, 2.6, 5, 10);
      pen.fill(leaf, KELP_WASH, 0.45);
      pen.hair(leaf.concat([leaf[0]!]), 0.6, KELP_INK, 0.85);
    });
  }
}

export type WeedKind = 0 | 1 | 2;

/** One boil frame of a weed clump. Canvas is w×h at ART_RES. */
export function drawWeed(ctx: CanvasRenderingContext2D, seed: number, kind: WeedKind, frame: number, w: number, h: number): void {
  // Same shape every frame (seeded by `seed`), different pen wobble (`frame`).
  const pen = new Pen(ctx, seed * 31 + frame * 977, 0.7);
  const rng = createRng(seed);
  if (kind === 0) kelp(pen, w, h, rng);
  else if (kind === 1) eelgrass(pen, w, h, rng);
  else seaFern(pen, w, h, rng);
}

// ---------------------------------------------------------------- rocks

export function drawRock(ctx: CanvasRenderingContext2D, seed: number, w: number, h: number): void {
  const pen = new Pen(ctx, seed, 0.9);
  const rng = createRng(seed);
  const cx = w / 2;
  const base = h - 14;
  // Lumpy dome: radius modulated by a few random harmonics.
  const harmonics = [rng() * 6, rng() * 6, rng() * 6];
  const pts: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI + (i / 40) * Math.PI;
    const r = 1 + 0.08 * Math.sin(a * 3 + harmonics[0]!) + 0.05 * Math.sin(a * 7 + harmonics[1]!) + 0.03 * Math.sin(a * 13 + harmonics[2]!);
    pts.push({ x: cx + Math.cos(a) * (w / 2 - 18) * r, y: base + Math.sin(a) * (h - 30) * r * (0.75 + rng() * 0.02) });
  }
  pts.push({ x: w - 14, y: base + 6 }, { x: 14, y: base + 6 });
  pen.fill(pts, PAPER_FILL, 1);
  pen.fill(pts, '#8a7f70', 0.22);
  // Form shading: contour lines echoing the dome on the shadow (right) side.
  pen.clipped(pts, () => {
    for (let k = 1; k <= 9; k++) {
      const inset = k * 5;
      const arc = pts.slice(18, 41).map((p) => ({ x: p.x - inset * 0.7, y: p.y + inset * 0.55 }));
      pen.hair(arc, 0.7, INK, 0.65 - k * 0.04);
    }
    for (let x = cx; x < w; x += 4) pen.hair([{ x, y: base + 6 }, { x: x - 10, y: base - h * 0.35 }], 0.5, INK, 0.35);
  });
  pen.stipple(pts, 2600, (x, y) => Math.min(1, ((x - cx) / w + 0.5) * 0.6 + ((y - (base - h)) / h) * 0.6), 0.75);
  // Cracks.
  for (let c = 0; c < 2; c++) {
    let p = pts[10 + Math.floor(rng() * 20)]!;
    const crack: Pt[] = [p];
    for (let i = 0; i < 5; i++) {
      p = { x: p.x + (rng() - 0.5) * 14, y: p.y + 6 + rng() * 6 };
      crack.push(p);
    }
    pen.hair(crack, 0.9, INK, 0.8);
  }
  pen.stroke(pts.slice(0, 41), 2.2, INK, 1);
  // Pebbles at the foot.
  for (let i = 0; i < 7; i++) {
    const px = 20 + rng() * (w - 40);
    const pr = 3 + rng() * 4;
    const pebble = ellipse(px, base + 4, pr * 1.3, pr * 0.8, 10);
    pen.fill(pebble, PAPER_FILL, 1);
    pen.hair(pebble.concat([pebble[0]!]), 0.9, INK, 0.9);
    pen.hair([{ x: px, y: base + 4 + pr * 0.3 }, { x: px + pr, y: base + 4 + pr * 0.1 }], 0.5, INK, 0.6);
  }
}

// ---------------------------------------------------------------- creatures & items

export function drawHook(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.5);
  const s = ART_RES;
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const shank = [P(32, 9), P(32, 52), P(30, 62), P(22, 68), P(13, 64), P(10, 54), P(14, 48)];
  pen.stroke(shank, 1.8 * s, INK, 1);
  // Highlight along the metal and the barb.
  pen.hair([P(33.4, 14), P(33.4, 50)], 0.4 * s, PAPER_FILL, 0.9);
  pen.stroke([P(14, 48), P(17, 52), P(13.5, 52.5)], 1.1 * s, INK, 1, false);
  pen.stroke(ellipse(32 * s, 6 * s, 3.2 * s, 3.2 * s, 12).concat([P(35.2, 6)]), 1.1 * s, INK, 1, false);
  // The bait worm is drawn live in scenes/game/worm.ts so it can squirm.
}

export function drawBubble(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.25);
  const s = ART_RES;
  pen.hair(ellipse(8 * s, 8 * s, 6 * s, 6 * s, 16).concat([{ x: 14 * s, y: 8 * s }]), 0.7 * s, INK, 0.8);
  pen.hair(bez({ x: 4.5 * s, y: 7 * s }, { x: 5 * s, y: 4.5 * s }, { x: 7.5 * s, y: 4 * s }, 6), 0.6 * s, INK, 0.7);
}

// ---------------------------------------------------------------- wreck

/** A broken-backed sailing ship lying on the seabed, in pen. */
/** Tileable sketchbook paper: fibres and speckles on cream. */
export function drawPaper(ctx: CanvasRenderingContext2D, size: number): void {
  const rng = createRng(16);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = rng() < 0.5 ? 'rgba(120,100,70,0.06)' : 'rgba(255,255,255,0.25)';
    ctx.fillRect(rng() * size, rng() * size, 1 + rng() * 2, 1 + rng() * 2);
  }
  ctx.strokeStyle = 'rgba(110,90,60,0.07)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 140; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const a = rng() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
    ctx.stroke();
  }
}
