import type { OreKind } from '../logic/ore';
import { createRng, type Rng } from '../logic/rng';
import { INK, PAPER_FILL } from './palette';

/**
 * Ore glyphs: each mineral drawn the way it really grows, in its
 * true colour with a ballpoint outline, on a highlighter swipe, so kinds read apart by shape
 * as well as colour. Native copper comes in nuggets, galena in cubes,
 * graphite in flat hexagonal flakes, quartz in pointed hexagonal prisms and
 * native silver in wires; on Mycel, malachite in banded bubbles, pyrite in
 * cubes, calcite in rhombs, amber in drops with a flier inside, lignite in
 * grained lumps and water in beads. Drawn centred on the origin, fitting a tile of
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

const GLYPHS = { nugget, cube: cubes, flake: flakes, prism: prisms, wire: wires, rime, botryoid, rhomb: rhombs, resin, chunk: chunks, bead: beads } as const;

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
