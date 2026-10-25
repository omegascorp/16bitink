import type { Rng } from '../../logic/rng';
import { MAP } from '../../scenes/map/layout';
import { closed, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { blob, type Brush, scalloped } from './brush';
import { hash } from './common';

/**
 * Water as the map paints it: a pond or pool in a ragged bank, a creek or
 * channel running across the map, ripple rings and lily pads, in colour
 * (a wash deepening away from the bank, the bank's shadow on it, the sky's
 * glint) or in pencil (the bank traced, ripples and a few ruled wave lines).
 */
export interface WaterLook {
  readonly shallow: string;
  readonly deep: string;
  /** The bank's colour (mud, sand) round the water. */
  readonly bank: string;
}

export const POND: WaterLook = { shallow: '#8fb7b5', deep: '#3f6f78', bank: '#8a7350' };

/** Short wave dashes across a shape: ruled lines in a draft, glints and dark ripples in colour. */
function waves(b: Brush, shape: readonly Pt[], look: WaterLook, rng: Rng, n: number): void {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  b.pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const c = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
      const l = 8 + rng() * 16;
      const wave = [pt(c.x - l, c.y), pt(c.x - l / 3, c.y - 2), pt(c.x + l / 3, c.y + 1), pt(c.x + l, c.y - 1)];
      if (b.draft) b.line(wave, 0.5, 0.45);
      else if (rng() < 0.5) b.pen.hair(wave, 1.1, PAPER_FILL, 0.55);
      else b.pen.hair(wave, 0.6, mix(look.deep, '#26316a', 0.4), 0.4);
    }
  });
}

/** A body of water in `shape` (its bank drawn round it), deepening towards `deepAt`. */
export function waterBody(b: Brush, shape: readonly Pt[], look: WaterLook, rng: Rng, waveCount = 14): void {
  const { pen } = b;
  const cx = shape.reduce((s, p) => s + p.x, 0) / shape.length;
  const cy = shape.reduce((s, p) => s + p.y, 0) / shape.length;
  const bankRing = shape.map((p) => pt(cx + (p.x - cx) * 1.06 + 2, cy + (p.y - cy) * 1.08 + 3));
  if (!b.draft) {
    pen.fill(bankRing, look.bank, 0.35);
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, look.shallow, 0.6);
    pen.fill(shape.map((p) => pt(cx + (p.x - cx) * 0.7 + 4, cy + (p.y - cy) * 0.65 + 4)), look.deep, 0.35);
    pen.fill(shape.map((p) => pt(cx + (p.x - cx) * 0.42 + 6, cy + (p.y - cy) * 0.38 + 6)), look.deep, 0.25);
    // The bank nearer the light throws its shadow on the water.
    pen.crescent(shape, pt(9, 12), () => pen.fill(shape, mix(look.deep, '#1b2a36', 0.4), 0.35));
    pen.hair(oval(cx - 10, cy - 8, 30, 8, 16).slice(9, 15), 1.6, PAPER_FILL, 0.6);
  } else {
    pen.fill(shape, PAPER_FILL, 0.5);
    pen.crescent(shape, pt(9, 12), () => b.hatch(shape, 3.4, 0.9, 0.35));
  }
  waves(b, shape, look, rng, waveCount);
  b.edge(shape, 1.1, 0.8);
  if (!b.draft) pen.hair(closed(bankRing).slice(0, Math.floor(bankRing.length * 0.6)), 0.6, b.deep(look.bank), 0.45);
}

/** A pond: an irregular pool rx × ry round c. */
export function pond(b: Brush, c: Pt, rx: number, ry: number, rng: Rng, look: WaterLook = POND): Pt[] {
  const shape = blob(c, rx, ry, rng, 0.16, 40, (rng() - 0.5) * 0.6);
  waterBody(b, shape, look, rng);
  return shape;
}

/** A creek's banks across the map at world y, `half` either side, wandering a little. */
export function creekBanks(y: number, half: number, salt: number): { top: Pt[]; bot: Pt[] } {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let x = -40; x <= MAP.width + 40; x += 20) {
    const w = Math.sin(x / 140 + salt) * 10 + Math.sin(x / 53 + salt * 3) * 4;
    top.push(pt(x, y - half + w + (hash(x, salt, 1) - 0.5) * 4));
    bot.push(pt(x, y + half + w * 0.7 + (hash(x, salt, 2) - 0.5) * 4));
  }
  return { top, bot };
}

/** A creek or channel across the map at y (its water and banks), as one shape. */
export function creek(b: Brush, y: number, half: number, look: WaterLook, rng: Rng, salt: number): void {
  const { top, bot } = creekBanks(y, half, salt);
  const shape = [...top, ...[...bot].reverse()];
  waterBody(b, shape, look, rng, 40);
  // Stones and roots along its banks.
  for (let i = 0; i < 22; i++) {
    const p = (rng() < 0.5 ? top : bot)[Math.floor(rng() * top.length)]!;
    if (Math.abs(p.x - MAP.mid) < 90) continue;
    const s = scalloped(p, 4 + rng() * 6, 5, rng, 0.1);
    b.cast(s, 3, 0.15);
    b.body(s, '#a9a08e', 0.6);
    b.shade(s, 3, '#6d675b', 0.4);
    b.edge(s, 0.6, 0.7);
  }
}

/** Rings spreading where something rose. */
export function ripple(b: Brush, c: Pt, r: number, rng: Rng): void {
  for (const k of [1, 0.66, 0.36]) {
    const a0 = Math.floor(rng() * 28);
    const ring = oval(c.x, c.y, r * k, r * k * 0.9, 28);
    b.line([...ring.slice(a0), ...ring.slice(0, a0)].slice(0, 20), 0.5, 0.3 * k + 0.12);
  }
}

/** A lily pad with its notch, and perhaps a flower. */
export function lilyPad(b: Brush, c: Pt, r: number, rng: Rng, flower: string | null, leaf = '#6f9a52'): void {
  const ang = rng() * TAU;
  const n = 20;
  const pad = [c, ...Array.from({ length: n + 1 }, (_, i) => {
    const a = ang + 0.22 + (i / n) * (TAU - 0.44);
    return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.92);
  })];
  b.cast(pad, 3, 0.12, '#2c4f5c');
  b.body(pad, leaf, 0.62);
  b.shade(pad, r * 0.4, '#3f6b3a', 0.3);
  for (let i = 0; i < 5; i++) {
    const a = ang + 0.6 + (i / 4) * (TAU - 1.2);
    b.line([c, pt(c.x + Math.cos(a) * r * 0.85, c.y + Math.sin(a) * r * 0.8)], 0.35, 0.25);
  }
  b.edge(pad, 0.8, 0.7);
  if (!flower) return;
  const f = pt(c.x + (rng() - 0.5) * r * 0.4, c.y + (rng() - 0.5) * r * 0.4);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const petal = oval(f.x + Math.cos(a) * 4, f.y + Math.sin(a) * 4, 4, 2.2, 8).map((p) => {
      const dx = p.x - (f.x + Math.cos(a) * 4);
      const dy = p.y - (f.y + Math.sin(a) * 4);
      return pt(f.x + Math.cos(a) * 4 + dx * Math.cos(a) - dy * Math.sin(a), f.y + Math.sin(a) * 4 + dx * Math.sin(a) + dy * Math.cos(a));
    });
    b.body(petal, flower, 0.6);
    b.line(closed(petal), 0.35, 0.45);
  }
  b.dot(f.x, f.y, 2, '#e9c23b', 1);
}
