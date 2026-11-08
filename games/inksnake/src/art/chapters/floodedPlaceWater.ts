import type { Rng } from '../../logic/rng';
import { blob, edgeWash, wash } from '../groundKit';
import { type Draw, oval, pt, TAU } from '../kit';
import { PAPER, PAPER_FILL } from '../palette';
import { makeCanvas, type Pt } from '../pen';
import { type Busy, noiseOf, perArea } from '../places/farmKit';
import { specks } from '../places/farmGroundParts';
import { glaze } from '../snakes/cornPaint';
import { mix } from '../wash';
import {
  CANOPY, FOAM, H, inland, smoothLoop, LEAF_DRY, LEAF_LITTER, PAD_DEEP, SHADE, SKY, strokePath, TEA, TEA_AMBER, TEA_DEEP, TEA_GLOW, W,
} from './floodedPlaceKit';

/**
 * The blackwater of the flooded forest from above: tea-dark water stained
 * by the leaves rotting in it, laid in as a wash that dried unevenly
 * (amber where the light gets through, near-black in the shade of the
 * canopy at the board's edges), the pale sky and the dark crowns mirrored
 * in it, wind ripples drawn in fine ink and lit lines, and what floats:
 * fallen leaves, drifts of duckweed, flecks of foam. Busy detail keeps to
 * the edges and off the level's things, so the snake and its prey read.
 */

/** The water's tone from a low-resolution field, smoothed up: soft-edged pools of amber and deep shade. */
function toneField(d: Draw, rng: Rng): void {
  const n1 = noiseOf(rng, 260);
  const n2 = noiseOf(rng, 90);
  const cell = 8;
  const cols = Math.ceil(W / cell) + 2;
  const rows = Math.ceil(H / cell) + 2;
  const { canvas, ctx } = makeCanvas(cols, rows);
  const img = ctx.createImageData(cols, rows);
  const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const deep = hex(TEA_DEEP);
  const amber = hex(TEA_AMBER);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = 0.6 * n1(x * cell, y * cell) + 0.4 * n2(x * cell, y * cell);
      const t = Math.max(0, Math.min(1, 0.5 + v * 0.9));
      const i = (y * cols + x) * 4;
      for (let k = 0; k < 3; k++) img.data[i + k] = Math.round(deep[k]! + (amber[k]! - deep[k]!) * t);
      img.data[i + 3] = Math.round(255 * (0.22 + 0.3 * Math.abs(v)));
    }
  }
  ctx.putImageData(img, 0, 0);
  const out = d.pen.ctx;
  out.save();
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';
  out.drawImage(canvas, -cell, -cell, cols * cell, rows * cell);
  out.restore();
}

/** Watercolour blooms: blobs of tea laid wet, pooled darker at their edges, and lifted paler patches. */
function blooms(d: Draw, rng: Rng): void {
  for (let k = 0; k < perArea(22); k++) {
    const p = pt(rng() * W, rng() * H);
    const colour = rng() < 0.45 ? TEA_DEEP : rng() < 0.6 ? TEA_AMBER : TEA_GLOW;
    wash(d, smoothLoop(blob(p, 50 + rng() * 120, 30 + rng() * 60, rng, 0.3, 12, rng() * TAU), 5), colour, 0.04 + rng() * 0.05, 0.35);
  }
}

/** The sky in the water: pale soft patches where the canopy opens, lying along the light, and the crowns mirrored dark round the edges. */
function reflections(d: Draw, rng: Rng, busy: Busy): void {
  const { ctx } = d.pen;
  for (let k = 0; k < 9; k++) {
    const x = 120 + rng() * (W - 240);
    const y = 60 + rng() * (H - 120);
    glaze(ctx, x, y, 70 + rng() * 90, 14 + rng() * 18, -0.5 + (rng() - 0.5) * 0.3, SKY, 0.07 + rng() * 0.06);
  }
  for (let k = 0; k < perArea(26); k++) {
    // Crowns mirrored: mostly at the edges, where the forest stands.
    const side = Math.floor(rng() * 4);
    const along = rng();
    const x = side === 0 ? rng() * 80 : side === 1 ? W - rng() * 80 : along * W;
    const y = side === 2 ? rng() * 70 : side === 3 ? H - rng() * 70 : along * H;
    glaze(ctx, x, y, 50 + rng() * 80, 30 + rng() * 50, rng() * TAU, CANOPY, 0.1 + 0.14 * busy(x, y));
  }
}

/** Wind ripples: short, nearly level ink lines and lit lines, sparse in the middle of the board, gathering at the edges. */
function ripples(d: Draw, rng: Rng, busy: Busy, onLand: (x: number, y: number) => boolean): void {
  const dark: [number, number, number, number, number][] = [];
  const lit: [number, number, number, number, number][] = [];
  for (let k = 0; k < perArea(2600); k++) {
    const x = rng() * W;
    const y = rng() * H;
    if (onLand(x, y) || rng() > 0.2 + 0.8 * busy(x, y)) continue;
    const l = 5 + rng() * 16;
    const a = -0.12 + (rng() - 0.5) * 0.18;
    const mark: [number, number, number, number, number] = [x, y, a, l, (rng() - 0.5) * 2.4];
    (rng() < 0.55 ? dark : lit).push(mark);
  }
  strokePath(d.pen.ctx, dark, d.ink, 0.16, 0.6);
  strokePath(d.pen.ctx, lit, SKY, 0.22, 0.7);
}

/** A fallen leaf floating: a pointed oval, its midrib, a hair of shadow on the water. */
function leaf(d: Draw, c: Pt, s: number, rng: Rng): void {
  const a = rng() * TAU;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const at = (u: number, v: number): Pt => pt(c.x + ca * u - sa * v, c.y + sa * u + ca * v);
  const shape = [...Array.from({ length: 7 }, (_, i) => at(-s + (i / 6) * 2 * s, Math.sin((i / 6) * Math.PI) * s * 0.42)), ...Array.from({ length: 5 }, (_, i) => at(s - ((i + 1) / 6) * 2 * s, -Math.sin(((i + 1) / 6) * Math.PI) * s * 0.42))];
  d.pen.fill(shape.map((p) => pt(p.x + 1, p.y + 1.4)), SHADE, 0.25);
  d.pen.fill(shape, rng() < 0.5 ? LEAF_DRY : mix(LEAF_LITTER, LEAF_DRY, rng()), 0.82);
  d.pen.hair([at(-s * 0.95, 0), at(s * 0.95, 0)], 0.35, LEAF_LITTER, 0.7);
  d.pen.hair([...shape, shape[0]!], 0.3, d.ink, 0.35);
}

/** Leaves sunk under the tea, only just seen: faint dark shapes on the bottom, more towards the edges. */
function sunken(d: Draw, rng: Rng, busy: Busy): void {
  for (let k = 0; k < perArea(260); k++) {
    const p = pt(rng() * W, rng() * H);
    if (rng() > 0.3 + 0.7 * busy(p.x, p.y)) continue;
    const a = rng() * TAU;
    const s = 3 + rng() * 4;
    d.pen.fill(oval(p.x, p.y, s, s * 0.45, 10).map((q) => pt(p.x + (q.x - p.x) * Math.cos(a) - (q.y - p.y) * Math.sin(a), p.y + (q.x - p.x) * Math.sin(a) + (q.y - p.y) * Math.cos(a))), TEA_DEEP, 0.16 + rng() * 0.12);
  }
}

/** What floats: leaves, drifts of duckweed and foam where the water is still, by the banks and the edges. */
function floaters(d: Draw, rng: Rng, busy: Busy, onLand: (x: number, y: number) => boolean): void {
  for (let k = 0; k < perArea(70); k++) {
    const p = pt(rng() * W, rng() * H);
    if (onLand(p.x, p.y) || rng() > busy(p.x, p.y) * 1.2) continue;
    leaf(d, p, 2.6 + rng() * 2.6, rng);
  }
  const weed: (readonly [number, number, number])[] = [];
  const foam: [number, number, number, number, number][] = [];
  const bubbles: (readonly [number, number, number])[] = [];
  for (let k = 0; k < 16; k++) {
    const c = pt(rng() * W, rng() * H);
    if (busy(c.x, c.y) < 0.4 || onLand(c.x, c.y)) continue;
    const rx = 24 + rng() * 50;
    const ry = 5 + rng() * 10;
    const turn = -0.15 + (rng() - 0.5) * 0.4;
    const along = (u: number, v: number): Pt => pt(c.x + Math.cos(turn) * u - Math.sin(turn) * v, c.y + Math.sin(turn) * u + Math.cos(turn) * v);
    if (k % 3 === 0) {
      // A drift of foam: curling pale threads and a few bubbles, strung out by the current.
      for (let i = 0; i < 26; i++) {
        const p = along((rng() - 0.5) * 2 * rx, (rng() - 0.5) * 2 * ry);
        if (!onLand(p.x, p.y)) foam.push([p.x, p.y, turn + (rng() - 0.5) * 0.8, 3 + rng() * 7, (rng() - 0.5) * 3]);
        if (rng() < 0.4) bubbles.push([p.x + 2, p.y + 1, 0.5 + rng() * 0.6]);
      }
      continue;
    }
    // Duckweed: a raft of tiny bright fronds, thick in its heart, ragged at its ends.
    glaze(d.pen.ctx, c.x, c.y, rx, ry, turn, PAD_DEEP, 0.22);
    for (let i = 0; i < 420; i++) {
      const r = Math.sqrt(rng());
      const a = rng() * TAU;
      const p = along(Math.cos(a) * rx * r, Math.sin(a) * ry * r * (1.3 - r * 0.5));
      if (!onLand(p.x, p.y)) weed.push([p.x, p.y, 0.4 + rng() * 0.55]);
    }
  }
  specks(d, PAD_DEEP, 0.7, weed.map(([x, y, r]) => [x + 0.3, y + 0.4, r] as const));
  specks(d, '#8fb054', 0.85, weed);
  specks(d, '#c6dc84', 0.6, weed.filter((_, i) => i % 3 === 0).map(([x, y, r]) => [x - 0.2, y - 0.2, r * 0.45] as const));
  strokePath(d.pen.ctx, foam, FOAM, 0.4, 0.7);
  for (const [x, y, r] of bubbles) d.pen.hair(oval(x, y, r, r, 8).concat([pt(x + r, y)]), 0.25, FOAM, 0.6);
}

/** The whole board's water: paper, the tea wash and its pools, reflections, ripples, floaters, the canopy's shade at the edges. */
export function paintWater(d: Draw, banks: readonly (readonly Pt[])[], busy: Busy, rng: Rng): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAPER_FILL;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.86;
  ctx.fillStyle = TEA;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  toneField(d, rng);
  blooms(d, rng);
  // Granulation: the pigment settled into the paper's tooth.
  const grain = (n: number, r0: number, r1: number): (readonly [number, number, number])[] => Array.from({ length: perArea(n) }, () => [rng() * W, rng() * H, r0 + rng() * (r1 - r0)] as const);
  specks(d, TEA_DEEP, 0.22, grain(26000, 0.3, 0.8));
  specks(d, TEA_GLOW, 0.14, grain(9000, 0.3, 0.7));
  sunken(d, rng, busy);
  reflections(d, rng, busy);
  const onLand = (x: number, y: number): boolean => inland(banks, x, y) > -3;
  ripples(d, rng, busy, onLand);
  floaters(d, rng, busy, onLand);
  edgeWash(d, W, H, SHADE, 0.38, W * 0.16);
}
