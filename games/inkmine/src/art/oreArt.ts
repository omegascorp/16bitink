import type { OreKind } from '../logic/ore';
import { createRng, type Rng } from '../logic/rng';
import { mix, rgba } from './paint';
import { INK, PAPER_FILL } from './palette';

/**
 * Ore glyphs: each mineral drawn the way it really grows, in its
 * true colour with a ballpoint outline, on a highlighter swipe, so kinds read apart by shape
 * as well as colour. Native copper comes in nuggets, galena in cubes,
 * graphite in flat hexagonal flakes, quartz in pointed hexagonal prisms and
 * native silver in wires; on Mycel, malachite in banded bubbles, pyrite in
 * cubes, calcite in rhombs, amber in drops with a flier inside, lignite in
 * grained lumps and water in beads; on Brine, manganese in knobbed nodules,
 * halite in hollow-faced cubes, magnetite in glossy octahedra and pearls,
 * one still in its shell. Drawn centred on the origin, fitting a tile of
 * `T` px. Plain canvas paths (not the Pen), since a chunk may hold dozens.
 */
type P = readonly [number, number];

function poly(ctx: CanvasRenderingContext2D, pts: readonly P[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** Highlighter fill modelled like a stone (lit on the upper left, shaded on the lower right), then a pen outline. */
function inked(ctx: CanvasRenderingContext2D, pts: readonly P[], color: string, width = 1.1): void {
  poly(ctx, pts);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = color;
  ctx.fill();
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, 'rgba(255, 252, 235, 0.6)');
  g.addColorStop(0.35, 'rgba(255, 252, 235, 0)');
  g.addColorStop(0.7, 'rgba(60, 30, 40, 0.12)');
  g.addColorStop(1, 'rgba(40, 24, 60, 0.38)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * A highlighter swipe behind the glyph, as if someone marked the find: one
 * curved stroke of a broad nib at a slant, doubled where it was pressed
 * harder, with the rock's shadow in the pocket under it.
 */
function swipe(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  // The pocket the ore sits in: rock darkened round it.
  const pocket = ctx.createRadialGradient(r * 0.1, r * 0.15, r * 0.2, r * 0.1, r * 0.15, r * 1.25);
  pocket.addColorStop(0, 'rgba(30, 28, 50, 0.22)');
  pocket.addColorStop(1, 'rgba(30, 28, 50, 0)');
  ctx.fillStyle = pocket;
  ctx.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
  const a = -0.35 + (rng() - 0.5) * 0.3;
  const len = r * (0.75 + rng() * 0.2);
  const bow = (rng() - 0.5) * r * 0.5;
  ctx.save();
  ctx.rotate(a);
  ctx.translate((rng() - 0.5) * 2, (rng() - 0.5) * 2);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  // One stroke of the nib, curved a little, then a narrower second pass where it was pressed harder.
  for (const [w, al] of [[r * 1.15, 0.3], [r * 0.6, 0.14]] as const) {
    ctx.globalAlpha = al;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(-len, bow * 0.3);
    ctx.quadraticCurveTo(0, bow, len, -bow * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function nugget(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  for (let k = 0; k < 3; k++) {
    const cx = (rng() - 0.5) * r * 0.9;
    const cy = (rng() - 0.5) * r * 0.9;
    const s = r * (0.3 + rng() * 0.22);
    const pts: P[] = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const q = s * (0.75 + rng() * 0.4);
      return [cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.85];
    });
    inked(ctx, pts, color);
    ctx.fillStyle = PAPER_FILL;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(cx - s * 0.3, cy - s * 0.3, Math.max(0.7, s * 0.18), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function cubes(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  for (let k = 0; k < 3; k++) {
    const cx = (rng() - 0.5) * r;
    const cy = (rng() - 0.5) * r * 0.8;
    const s = r * (0.28 + rng() * 0.14);
    const h = s * 0.55;
    const top: P[] = [[cx, cy - h], [cx + s, cy - h * 0.2], [cx, cy + h * 0.6], [cx - s, cy - h * 0.2]];
    const left: P[] = [[cx - s, cy - h * 0.2], [cx, cy + h * 0.6], [cx, cy + h * 0.6 + s], [cx - s, cy - h * 0.2 + s]];
    const right: P[] = [[cx + s, cy - h * 0.2], [cx, cy + h * 0.6], [cx, cy + h * 0.6 + s], [cx + s, cy - h * 0.2 + s]];
    inked(ctx, left, color, 1);
    inked(ctx, right, color, 1);
    // The shadowed face hatched, as a cube catches light on one side.
    poly(ctx, right);
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.55;
    for (let o = -s; o < s * 2; o += 1.8) {
      ctx.beginPath();
      ctx.moveTo(cx + o, cy - h);
      ctx.lineTo(cx + o - s, cy + s * 1.5);
      ctx.stroke();
    }
    ctx.restore();
    inked(ctx, top, color, 1);
  }
}

function flakes(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  for (let k = 0; k < 4; k++) {
    const cx = (rng() - 0.5) * r * 1.1;
    const cy = (rng() - 0.5) * r * 0.9;
    const s = r * (0.22 + rng() * 0.16);
    const tilt = rng() * Math.PI;
    const squash = 0.4 + rng() * 0.25;
    const hex = (q: number): P[] =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * q;
        const y = Math.sin(a) * q * squash;
        return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];
      });
    inked(ctx, hex(s), color, 0.9);
    poly(ctx, hex(s * 0.55));
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function prisms(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const bx = (rng() - 0.5) * r * 0.4;
  const by = r * 0.45;
  const n = 2 + Math.floor(rng() * 2);
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.55 + (rng() - 0.5) * 0.2;
    const len = r * (0.95 + rng() * 0.45);
    const w = r * (0.2 + rng() * 0.08);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const nx = -dy;
    const ny = dx;
    const shaft = len * 0.72;
    const pts: P[] = [
      [bx + nx * w, by + ny * w],
      [bx + nx * w + dx * shaft, by + ny * w + dy * shaft],
      [bx + dx * len, by + dy * len],
      [bx - nx * w + dx * shaft, by - ny * w + dy * shaft],
      [bx - nx * w, by - ny * w],
    ];
    inked(ctx, pts, color, 1);
    // The ridge down the middle of the prism and the facets of its point.
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(bx + nx * w * 0.2, by + ny * w * 0.2);
    ctx.lineTo(bx + nx * w * 0.2 + dx * shaft, by + ny * w * 0.2 + dy * shaft);
    ctx.lineTo(bx + dx * len, by + dy * len);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function wires(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const strands: P[][] = [];
  for (let k = 0; k < 3; k++) {
    let x = (rng() - 0.5) * r * 0.8;
    let y = (rng() - 0.5) * r * 0.8;
    let a = rng() * Math.PI * 2;
    const pts: P[] = [[x, y]];
    for (let i = 0; i < 7; i++) {
      a += (rng() - 0.5) * 1.6;
      x += Math.cos(a) * r * 0.2;
      y += Math.sin(a) * r * 0.2;
      pts.push([Math.max(-r, Math.min(r, x)), Math.max(-r, Math.min(r, y))]);
    }
    strands.push(pts);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, style, alpha] of [[3.6, INK, 0.9], [2.2, color, 1]] as const) {
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.globalAlpha = alpha;
    for (const pts of strands) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** Water ice: glassy lumps with a frost star scratched on each, and a glint. */
function rime(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  for (let k = 0; k < 2; k++) {
    const cx = (k === 0 ? -0.22 : 0.28) * r + (rng() - 0.5) * r * 0.3;
    const cy = (k === 0 ? 0.12 : -0.2) * r + (rng() - 0.5) * r * 0.3;
    const s = r * (k === 0 ? 0.62 : 0.42);
    const pts: P[] = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rng() * 0.3;
      const q = s * (0.7 + rng() * 0.35);
      return [cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.8];
    });
    inked(ctx, pts, color, 1);
    // The frost star: three crossing strokes, with little barbs.
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * Math.PI + 0.3;
      const [dx, dy] = [Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42];
      ctx.moveTo(cx - dx, cy - dy);
      ctx.lineTo(cx + dx, cy + dy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER_FILL;
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.32, cy - s * 0.3, s * 0.14, s * 0.07, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Malachite: a cluster of rounded bubbles, banded in darker and lighter green like cut agate. */
function botryoid(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const blobs = Array.from({ length: 4 }, (_, k) => ({ x: (rng() - 0.5) * r * 0.9, y: (rng() - 0.5) * r * 0.7 + (k % 2) * r * 0.1, s: r * (0.3 + rng() * 0.18) }));
  for (const b of blobs) {
    const pts: P[] = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return [b.x + Math.cos(a) * b.s, b.y + Math.sin(a) * b.s * 0.92];
    });
    inked(ctx, pts, color, 0.9);
    // The growth bands: rings inside, dark and pale by turns.
    for (let k = 1; k <= 2; k++) {
      ctx.globalAlpha = k === 1 ? 0.5 : 0.35;
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = k === 1 ? '#1b4d33' : PAPER_FILL;
      ctx.beginPath();
      ctx.arc(b.x + b.s * 0.08, b.y + b.s * 0.1, b.s * (1 - k * 0.3), Math.PI * 0.9, Math.PI * 2.2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = PAPER_FILL;
    ctx.beginPath();
    ctx.arc(b.x - b.s * 0.35, b.y - b.s * 0.35, Math.max(0.6, b.s * 0.15), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Calcite: leaning rhombs, the way it cleaves, with a doubled edge seen through the clear crystal. */
function rhombs(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  for (let k = 0; k < 2; k++) {
    const cx = (k === 0 ? -0.2 : 0.3) * r + (rng() - 0.5) * r * 0.25;
    const cy = (k === 0 ? 0.15 : -0.2) * r + (rng() - 0.5) * r * 0.25;
    const s = r * (k === 0 ? 0.62 : 0.44);
    const lean = s * 0.45;
    const pts: P[] = [[cx - s + lean, cy - s * 0.6], [cx + s + lean * 0.4, cy - s * 0.6], [cx + s - lean, cy + s * 0.6], [cx - s - lean * 0.4, cy + s * 0.6]];
    inked(ctx, pts, color, 1);
    // The doubled image: one edge seen twice through the crystal.
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5 + lean * 0.6, cy - s * 0.25);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.25);
    ctx.moveTo(cx - s * 0.55 + lean * 0.5, cy + s * 0.05);
    ctx.lineTo(cx + s * 0.35, cy + s * 0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Amber: a rounded drop of resin, glowing at its heart, a tiny six-legged flier caught inside. */
function resin(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const s = r * 0.78;
  const tilt = (rng() - 0.5) * 0.6;
  const pts: P[] = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const q = s * (0.85 + rng() * 0.2) * (Math.sin(a) < 0 ? 0.92 : 1.05);
    const x = Math.cos(a) * q;
    const y = Math.sin(a) * q * 0.82;
    return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)];
  });
  inked(ctx, pts, color, 1);
  // Light through it: a warm glow at the heart.
  const g = ctx.createRadialGradient(-s * 0.1, -s * 0.05, 0, 0, 0, s);
  g.addColorStop(0, 'rgba(255, 236, 160, 0.75)');
  g.addColorStop(1, 'rgba(255, 236, 160, 0)');
  poly(ctx, pts);
  ctx.fillStyle = g;
  ctx.fill();
  // The flier: a body, two wings, six legs, in ink.
  ctx.save();
  ctx.rotate(tilt + (rng() - 0.5) * 0.8);
  ctx.strokeStyle = '#4a2a12';
  ctx.fillStyle = '#4a2a12';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(s * 0.05, s * 0.05, s * 0.2, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  for (const k of [-1, 0, 1]) {
    ctx.moveTo(s * (0.05 + k * 0.1), s * 0.1);
    ctx.lineTo(s * (0.02 + k * 0.14), s * 0.26);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(-s * 0.02, -s * 0.08, s * 0.16, s * 0.07, -0.5, 0, Math.PI * 2);
  ctx.ellipse(s * 0.14, -s * 0.08, s * 0.16, s * 0.07, 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = PAPER_FILL;
  ctx.beginPath();
  ctx.ellipse(-s * 0.42, -s * 0.38, s * 0.18, s * 0.08, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Lignite: blocky lumps of brown coal, the grain of what it grew from still running through them. */
function chunks(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  for (let k = 0; k < 3; k++) {
    const cx = (rng() - 0.5) * r;
    const cy = (rng() - 0.5) * r * 0.8;
    const s = r * (0.3 + rng() * 0.16);
    const pts: P[] = [[cx - s, cy - s * 0.5], [cx - s * 0.2, cy - s * 0.8], [cx + s, cy - s * 0.45], [cx + s * 0.85, cy + s * 0.55], [cx - s * 0.1, cy + s * 0.75], [cx - s * 0.95, cy + s * 0.35]];
    inked(ctx, pts, color, 0.9);
    poly(ctx, pts);
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#2a1e12';
    for (let j = -2; j <= 2; j++) {
      ctx.beginPath();
      ctx.moveTo(cx - s, cy + j * s * 0.3);
      ctx.bezierCurveTo(cx - s * 0.3, cy + j * s * 0.3 - s * 0.15, cx + s * 0.3, cy + j * s * 0.3 + s * 0.15, cx + s, cy + j * s * 0.3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/** Water: beads pooled in the rock, each with a bright meniscus and a glint. */
function beads(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  for (let k = 0; k < 3; k++) {
    const cx = (k - 1) * r * 0.45 + (rng() - 0.5) * r * 0.2;
    const cy = (k === 1 ? -0.15 : 0.15) * r + (rng() - 0.5) * r * 0.2;
    const s = r * (k === 1 ? 0.48 : 0.36);
    // A drop: round below, drawn up to a point.
    const pts: P[] = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
      const pinch = Math.sin(a) < -0.6 ? 0.55 : 1;
      return [cx + Math.cos(a) * s * pinch, cy + Math.sin(a) * s * (Math.sin(a) < 0 ? 1.25 : 0.95)];
    });
    inked(ctx, pts, color, 0.9);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = PAPER_FILL;
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.32, cy - s * 0.05, s * 0.12, s * 0.28, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.1, s * 0.6, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Carbon: light, porous lumps of char, pitted with holes, the cap's gills still ridging one face, a glint where it's glassy. */
function char(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  for (let k = 0; k < 2; k++) {
    const cx = (k === 0 ? -0.25 : 0.3) * r + (rng() - 0.5) * r * 0.15;
    const cy = (k === 0 ? 0.1 : -0.15) * r;
    const s = r * (k === 0 ? 0.55 : 0.42);
    const pts: P[] = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const q = s * (0.75 + rng() * 0.35);
      return [cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.8];
    });
    inked(ctx, pts, color, 0.9);
    poly(ctx, pts);
    ctx.save();
    ctx.clip();
    // The gills: fine fanned ridges across one face.
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#7b6f8c';
    ctx.lineWidth = 0.45;
    for (let j = -3; j <= 3; j++) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.2, cy + s * 0.9);
      ctx.lineTo(cx + j * s * 0.3, cy - s * 0.9);
      ctx.stroke();
    }
    // Pores, dark with a pale lower lip.
    for (let j = 0; j < 5; j++) {
      const px = cx + (rng() - 0.5) * s * 1.2;
      const py = cy + (rng() - 0.5) * s;
      const pr = s * (0.07 + rng() * 0.07);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#141218';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = PAPER_FILL;
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.arc(px, py, pr, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = PAPER_FILL;
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.4, cy - s * 0.35, s * 0.12, s * 0.06, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Brine's ores (chapter 3), painted with more layers than the plain fills above: each has its own light, sheen and reflected colour.

const TAU = Math.PI * 2;

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry = rx): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
}

/** A soft radial dab of colour, fading out from its middle. */
function dab(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

/** Runs `draw` clipped to a closed outline. */
function inside(ctx: CanvasRenderingContext2D, pts: readonly P[], draw: () => void): void {
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  draw();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, pts: readonly P[], color: string, width: number, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A lumpy outline: a circle of florets, each bulging out between cusps, as a cauliflower or a botryoidal crust. */
function lumpy(cx: number, cy: number, s: number, lobes: number, rng: Rng, squash = 0.86): P[] {
  const amps = Array.from({ length: lobes }, () => 0.6 + rng() * 0.6);
  const per = 5;
  const turn = rng() * TAU;
  return Array.from({ length: lobes * per }, (_, i) => {
    const a = (i / (lobes * per)) * TAU + turn;
    const q = s * (0.84 + 0.16 * Math.sin(((i % per) / per) * Math.PI) * amps[Math.floor(i / per)]!);
    return [cx + Math.cos(a) * q, cy + Math.sin(a) * q * squash];
  });
}

/** A soft shadow where a rounded thing rests on the rock. */
function restShadow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.4);
  dab(ctx, 0, 0, s, '#1a1626', 0.35);
  ctx.restore();
}

/** Manganese nodules: black-brown concretions, knobbed all over like a cauliflower, a dull sheen on their tops, seabed grit settled on them. */
function nodules(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const lumps = [
    { x: 0.42 * r, y: -0.3 * r, s: 0.34 * r },
    { x: -0.16 * r, y: 0.1 * r, s: 0.6 * r },
  ];
  for (const n of lumps) {
    restShadow(ctx, n.x + n.s * 0.15, n.y + n.s * 0.75, n.s * 1.1);
    const pts = lumpy(n.x, n.y, n.s, 7, rng);
    inked(ctx, pts, color, 1);
    inside(ctx, pts, () => {
      // Warm iron brown in the body, cooler where it turns away.
      dab(ctx, n.x - n.s * 0.1, n.y + n.s * 0.1, n.s * 0.9, '#6b4b36', 0.45);
      dab(ctx, n.x + n.s * 0.5, n.y + n.s * 0.5, n.s * 0.7, '#120f18', 0.5);
      // The knobs: small domes, each lit on its upper left and shadowed under its lower right.
      for (let k = 0; k < 9; k++) {
        const a = rng() * TAU;
        const q = Math.sqrt(rng()) * n.s * 0.72;
        const kx = n.x + Math.cos(a) * q;
        const ky = n.y + Math.sin(a) * q * 0.86;
        const kr = n.s * (0.14 + rng() * 0.12);
        const top = 1 - (ky - n.y + n.s) / (n.s * 2);
        // The crease under each knob is a soft pool of shade, not a line; only a few get a fine pen touch.
        dab(ctx, kx + kr * 0.45, ky + kr * 0.55, kr * 0.8, '#0c0a10', 0.45);
        dab(ctx, kx - kr * 0.3, ky - kr * 0.35, kr * 0.75, '#cbbfd6', 0.1 + 0.28 * top);
        if (k < 3) {
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.35;
          ctx.beginPath();
          ctx.arc(kx, ky, kr, 0.05 * Math.PI, 0.6 * Math.PI);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // A dull sheen over the crown, wide and soft (it is earthy, not glassy).
      dab(ctx, n.x - n.s * 0.3, n.y - n.s * 0.42, n.s * 0.55, '#ddd3e6', 0.3);
      // Grit settled on top.
      ctx.fillStyle = '#e4d7bd';
      for (let k = 0; k < 9; k++) {
        const gx = n.x + (rng() - 0.5) * n.s * 1.4;
        const gy = n.y - n.s * (0.25 + rng() * 0.6);
        ctx.globalAlpha = 0.5 + rng() * 0.4;
        disc(ctx, gx, gy, n.s * (0.025 + rng() * 0.035));
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    // The outline again, heavier under the lower right where it sits.
    const s2 = n.s * 2;
    inside(ctx, [[n.x + s2, n.y - s2 + n.s * 0.15], [n.x + s2, n.y + s2], [n.x - s2 + n.s * 0.15, n.y + s2]], () => line(ctx, [...pts, pts[0]!], INK, 1.1, 0.6));
  }
  // Loose grit on the rock round the base.
  ctx.fillStyle = '#d9cdb2';
  for (let k = 0; k < 7; k++) {
    ctx.globalAlpha = 0.6;
    disc(ctx, (rng() - 0.5) * r * 1.6, r * (0.55 + rng() * 0.3), r * (0.02 + rng() * 0.03));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** One translucent face of a salt cube: a thin wash with its light, the crystal behind it showing through. */
function saltFace(ctx: CanvasRenderingContext2D, pts: readonly P[], color: string, tone: number): void {
  poly(ctx, pts);
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = tone >= 0 ? mix(color, '#fffaf5', tone) : mix(color, '#7e4a62', -tone);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Steps cut into a face, shrinking to its centre: the hollow, terraced "hopper" face salt grows as it crystallises fast. */
function hopper(ctx: CanvasRenderingContext2D, face: readonly P[], steps: number, color: string): void {
  const cx = face.reduce((s, [x]) => s + x, 0) / face.length;
  const cy = face.reduce((s, [, y]) => s + y, 0) / face.length;
  for (let k = 1; k <= steps; k++) {
    const t = 1 - k / (steps + 1.2);
    const ring: P[] = face.map(([x, y]) => [cx + (x - cx) * t, cy + (y - cy) * t]);
    poly(ctx, ring);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = mix(color, '#9a5d76', 0.6);
    ctx.fill();
    // Each step's riser: in shade on its upper-left walls (they face away), catching light on the lower right.
    line(ctx, [ring[3]!, ring[0]!, ring[1]!], mix(color, '#5a2c45', 0.7), 0.5, 0.55);
    line(ctx, [ring[1]!, ring[2]!, ring[3]!], '#fffaf0', 0.6, 0.55);
  }
}

/** Halite: pale pink cubes, half clear, their faces stepped into hollow terraces, the back edges seen faintly through them. */
function salt(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const crystals = [
    { x: 0.42 * r, y: -0.42 * r, s: 0.3 * r },
    { x: -0.12 * r, y: -0.1 * r, s: 0.5 * r },
  ];
  for (const c of crystals) {
    const { x: cx, y: cy, s } = c;
    const h = s * 0.55;
    const tilt = (rng() - 0.5) * 0.1 * s;
    const top: P[] = [[cx + tilt, cy - h], [cx + s, cy - h * 0.2 + tilt], [cx - tilt, cy + h * 0.6], [cx - s, cy - h * 0.2 - tilt]];
    const left: P[] = [top[3]!, top[2]!, [top[2]![0], top[2]![1] + s], [top[3]![0], top[3]![1] + s]];
    const right: P[] = [top[1]!, top[2]!, [top[2]![0], top[2]![1] + s], [top[1]![0], top[1]![1] + s]];
    restShadow(ctx, cx + s * 0.2, cy + h * 0.6 + s, s * 1.2);
    // The hidden back corner, seen through the clear crystal.
    const back: P = [top[0]![0], top[0]![1] + s];
    saltFace(ctx, left, color, 0.25);
    saltFace(ctx, right, color, -0.35);
    line(ctx, [left[3]!, back, right[3]!], INK, 0.45, 0.3);
    line(ctx, [back, top[0]!], INK, 0.45, 0.3);
    // Light through the body: a warm glow low in it, as clear salt carries light.
    inside(ctx, [...left, ...right], () => dab(ctx, cx - s * 0.2, cy + s * 0.6, s * 0.8, '#fff3e8', 0.35));
    hopper(ctx, left, 1, color);
    inside(ctx, right, () => {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#6b3a52';
      ctx.lineWidth = 0.45;
      for (let o = -s; o < s * 2; o += Math.max(1.4, s * 0.16)) {
        ctx.beginPath();
        ctx.moveTo(cx + o, cy - h);
        ctx.lineTo(cx + o - s, cy + s * 1.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
    saltFace(ctx, top, color, 0.55);
    hopper(ctx, top, 2, color);
    // Light caught inside the clear crystal: a few bright flecks.
    for (let k = 0; k < 3; k++) dab(ctx, cx + (rng() - 0.6) * s, cy + s * (0.2 + rng() * 0.6), s * 0.12, '#ffffff', 0.7);
    for (const f of [left, right, top]) line(ctx, [...f, f[0]!], INK, 0.9, 0.85);
    // The glint along the lit top edge, and a spark at its corner.
    line(ctx, [[top[3]![0] + s * 0.12, top[3]![1] - h * 0.02], [top[0]![0] - s * 0.1, top[0]![1] + h * 0.12]], '#ffffff', Math.max(0.6, s * 0.08), 0.9);
    dab(ctx, top[3]![0] + s * 0.1, top[3]![1], s * 0.3, '#ffffff', 0.6);
  }
}

/** Magnetite: black glossy octahedra, each face catching the light differently, the lit ones sheened steel blue, edges glinting. */
function octahedra(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const crystals = [
    { x: 0.5 * r, y: 0.38 * r, s: 0.3 * r, rot: 0.5 },
    { x: 0.5 * r, y: -0.45 * r, s: 0.24 * r, rot: -0.35 },
    { x: -0.14 * r, y: 0, s: 0.68 * r, rot: -0.12 },
  ];
  const steel = '#8fa3c4';
  for (const c of crystals) {
    const rot = c.rot + (rng() - 0.5) * 0.2;
    const at = (x: number, y: number): P => [c.x + (x * Math.cos(rot) - y * Math.sin(rot)) * c.s, c.y + (x * Math.sin(rot) + y * Math.cos(rot)) * c.s];
    const T = at(0, -1);
    const B = at(0.04, 0.98);
    const L = at(-0.8, 0.04);
    const F = at(-0.1, 0.2);
    const R = at(0.74, -0.04);
    restShadow(ctx, c.x + c.s * 0.1, c.y + c.s * 0.9, c.s * 1.1);
    const faces: readonly (readonly [readonly P[], string])[] = [
      [[T, L, F], mix(color, steel, 0.6)],
      [[T, F, R], mix(color, steel, 0.28)],
      [[B, L, F], mix(color, '#5a6480', 0.32)],
      [[B, F, R], mix(color, '#0b0c10', 0.55)],
    ];
    for (const [pts, col] of faces) {
      poly(ctx, pts);
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // The sheen: a band of cold light sliding across the lit face, and the sky reflected in the upper right one.
    inside(ctx, [T, L, F], () => {
      const g = ctx.createLinearGradient(L[0], L[1], F[0], T[1]);
      g.addColorStop(0, rgba('#e8f0ff', 0));
      g.addColorStop(0.45, rgba('#e8f0ff', 0.55));
      g.addColorStop(0.6, rgba('#e8f0ff', 0.08));
      g.addColorStop(1, rgba('#e8f0ff', 0));
      ctx.fillStyle = g;
      ctx.fillRect(c.x - c.s * 1.2, c.y - c.s * 1.2, c.s * 2.4, c.s * 2.4);
      // Growth striations, parallel to the face's lower edge.
      for (const k of [0.3, 0.55]) line(ctx, [[L[0] + (T[0] - L[0]) * k, L[1] + (T[1] - L[1]) * k], [F[0] + (T[0] - F[0]) * k, F[1] + (T[1] - F[1]) * k]], '#1d2230', 0.35, 0.25);
    });
    inside(ctx, [T, F, R], () => dab(ctx, (T[0] + R[0]) / 2, (T[1] + R[1]) / 2, c.s * 0.5, '#b9c8e4', 0.35));
    inside(ctx, [B, L, F], () => dab(ctx, L[0] + (B[0] - L[0]) * 0.5, L[1] + (B[1] - L[1]) * 0.6, c.s * 0.4, '#7d8db0', 0.3));
    // Edges between the faces, then the outline.
    line(ctx, [L, F, R], INK, 0.55, 0.7);
    line(ctx, [T, F, B], INK, 0.55, 0.7);
    line(ctx, [T, L, B, R, T], INK, 1.1, 0.95);
    // Glints on the lit edges and a star at the apex: it's glassy, where the nodule is dull.
    line(ctx, [at(-0.08, -0.86), at(-0.68, 0)], '#ffffff', Math.max(0.6, c.s * 0.07), 0.85);
    line(ctx, [at(0.02, -0.8), at(-0.08, 0.08)], '#eaf2ff', Math.max(0.4, c.s * 0.04), 0.6);
    dab(ctx, T[0], T[1] + c.s * 0.08, c.s * 0.28, '#ffffff', 0.75);
  }
}

/** A pearl's sphere: lilac-white, lit from the upper left, an orient of pink, green and blue round its shadow side, a sharp highlight and light bounced up into its foot. */
function pearlBall(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  const ball: P[] = Array.from({ length: 24 }, (_, i) => [x + Math.cos((i / 24) * TAU) * s, y + Math.sin((i / 24) * TAU) * s]);
  inside(ctx, ball, () => {
    const g = ctx.createRadialGradient(x - s * 0.35, y - s * 0.4, s * 0.05, x, y, s * 1.1);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, color);
    g.addColorStop(0.8, mix(color, '#9c88b4', 0.55));
    g.addColorStop(1, mix(color, '#6d5a8c', 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    // The orient: iridescence in a crescent round the far side.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, s, 0, TAU);
    ctx.arc(x - s * 0.28, y - s * 0.3, s * 0.92, 0, TAU, true);
    ctx.clip('evenodd');
    const o = ctx.createLinearGradient(x + s, y - s * 0.6, x - s * 0.5, y + s);
    o.addColorStop(0, 'rgba(250, 196, 222, 0.75)');
    o.addColorStop(0.45, 'rgba(196, 238, 222, 0.7)');
    o.addColorStop(1, 'rgba(186, 204, 250, 0.75)');
    ctx.fillStyle = o;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    ctx.restore();
    // Light bounced up from the rock into its foot.
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#fbf3ff';
    ctx.lineWidth = Math.max(0.5, s * 0.1);
    ctx.beginPath();
    ctx.arc(x, y, s * 0.82, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  // A window of light, sharp, then its softer bloom.
  dab(ctx, x - s * 0.36, y - s * 0.4, s * 0.55, '#ffffff', 0.55);
  ctx.save();
  ctx.translate(x - s * 0.38, y - s * 0.42);
  ctx.rotate(-0.7);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.95;
  disc(ctx, 0, 0, s * 0.22, s * 0.12);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  line(ctx, [...ball, ball[0]!], INK, 0.9, 0.85);
}

/** Brine pearls: one nestled in a broken shell, its nacre shining inside, and two loose beside it. */
function pearls(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const sx = -0.16 * r;
  const sy = 0.22 * r;
  const rx = 0.7 * r;
  const lip = 0.2 * r;
  // The shell's mouth, seen from a little above: nacre, its far rim broken away in a jagged bite.
  const mouth: P[] = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * TAU;
    const bite = Math.sin(a) < 0 && Math.cos(a) > 0.1 ? 0.75 + rng() * 0.3 : 1;
    return [sx + Math.cos(a) * rx, sy + Math.sin(a) * lip * bite];
  });
  restShadow(ctx, sx + r * 0.1, sy + r * 0.45, rx * 1.15);
  inked(ctx, mouth, mix(color, '#d8c9e6', 0.5), 0.7);
  inside(ctx, mouth, () => {
    const g = ctx.createLinearGradient(sx - rx, sy, sx + rx, sy);
    g.addColorStop(0, 'rgba(250, 210, 230, 0.55)');
    g.addColorStop(0.5, 'rgba(210, 240, 230, 0.45)');
    g.addColorStop(1, 'rgba(200, 210, 250, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - rx, sy - lip, rx * 2, lip * 2);
  });
  pearlBall(ctx, sx + r * 0.02, sy - r * 0.2, r * 0.36, color);
  // The front wall of the shell, over the pearl's foot: grey-brown outside, ridged with growth lines.
  const wall: P[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    wall.push([sx + Math.cos(a) * rx, sy + Math.sin(a) * lip]);
  }
  for (let i = 12; i >= 0; i--) {
    const a = (i / 12) * Math.PI;
    wall.push([sx + Math.cos(a) * rx * 0.96, sy + Math.sin(a) * lip * 2.1 + r * 0.02]);
  }
  inked(ctx, wall, '#8d7f86', 0.9);
  inside(ctx, wall, () => {
    for (let k = 1; k <= 3; k++) {
      const pts: P[] = [];
      for (let i = 1; i < 12; i++) {
        const a = (i / 12) * Math.PI;
        pts.push([sx + Math.cos(a) * rx * (0.98 - k * 0.01), sy + Math.sin(a) * lip * (1 + k * 0.32) + r * 0.01]);
      }
      line(ctx, pts, '#3b2f3a', 0.45, 0.45);
    }
  });
  // The nacre's bright lip along the rim.
  line(ctx, wall.slice(1, 12), '#fdf6ff', Math.max(0.6, r * 0.05), 0.8);
  restShadow(ctx, 0.52 * r, -0.12 * r, r * 0.3);
  pearlBall(ctx, 0.52 * r, -0.36 * r, r * 0.25, color);
  restShadow(ctx, 0.62 * r, 0.6 * r, r * 0.18);
  pearlBall(ctx, 0.62 * r, 0.48 * r, r * 0.14, color);
}

const GLYPHS = { nugget, cube: cubes, flake: flakes, prism: prisms, wire: wires, rime, botryoid, rhomb: rhombs, resin, chunk: chunks, bead: beads, char, nodule: nodules, salt, octahedron: octahedra, pearl: pearls } as const;

export function drawOreGlyph(ctx: CanvasRenderingContext2D, ore: OreKind, T: number, seed: number): void {
  const rng = createRng(seed);
  const r = T * 0.36;
  swipe(ctx, ore.mark, r, rng);
  GLYPHS[ore.glyph](ctx, ore.color, r, rng);
}

/** A loose piece: a lump of rock with the ore in it, for pieces on the ground and in the HUD. */
export function drawOrePiece(ctx: CanvasRenderingContext2D, ore: OreKind, size: number, seed: number, rock: string): void {
  const rng = createRng(seed);
  const r = size * 0.42;
  const lump: P[] = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const q = r * (0.8 + rng() * 0.3);
    return [Math.cos(a) * q, Math.sin(a) * q * 0.85];
  });
  inked(ctx, lump, rock, 1.1);
  ctx.save();
  ctx.scale(0.85, 0.85);
  GLYPHS[ore.glyph](ctx, ore.color, r, rng);
  ctx.restore();
}
