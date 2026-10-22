import { createRng, type Rng } from '../../logic/rng';
import { MAP } from '../../scenes/map/layout';
import { closed, type Draw, pt, ribbon } from '../kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts } from './band';
import { castShadow, tuft } from './flora';

/**
 * The thresholds at the feet of chapters 6–8, drawn a little from the
 * front like the garden wall: a chestnut paling fence with its gate swung
 * back into the allotment; a post-and-rail fence with a wooden stile over
 * into the meadow; and the farmyard's stone gate piers with the iron field
 * gate standing open (the cattle grid between them is the barn band's own
 * floor, so the groove runs over it).
 */
const CHESTNUT = '#9c7d5c';
const RAIL = '#a88a62';
const IRON = '#5d6670';
const WIRE = '#4a4a52';
/** Half the opening the groove passes through. */
const OPEN = 46;

/** A square post from above with its shadow, `s` across. */
function post(d: Draw, c: Pt, s: number, colour = CHESTNUT): void {
  const { pen } = d;
  const p = boxPts(c.x - s / 2, c.y - s / 2, c.x + s / 2, c.y + s / 2, 4);
  castShadow(d, p, s, 0.16);
  pen.fill(p, PAPER_FILL, 1);
  pen.fill(p, colour, 0.7);
  pen.crescent(p, pt(-2, -3), () => pen.fill(p, d.ink, 0.28));
  pen.stroke(closed(p), 0.9, d.ink, 0.9, false);
  pen.dot(c.x - s * 0.15, c.y - s * 0.15, 1.1, PAPER_FILL, 0.6);
}

/** Chestnut pales x0..x1 standing on y, `h` tall, wired top and bottom, posts every ~110 px. */
function palings(d: Draw, x0: number, x1: number, y: number, h: number, rng: Rng): void {
  const { pen } = d;
  pen.fill([pt(x0 + 6, y - 2), pt(x1 + 10, y - 2), pt(x1 + 22, y + 12), pt(x0 + 18, y + 12)], d.ink, 0.09);
  for (let x = x0; x < x1 - 3; x += 7 + rng() * 2) {
    const w = 3.6 + rng() * 1.6;
    const top = y - h + (rng() - 0.5) * 5;
    const pale = [pt(x, y), pt(x, top + 4), pt(x + w / 2, top), pt(x + w, top + 4), pt(x + w, y)];
    pen.fill(pale, PAPER_FILL, 1);
    pen.fill(pale, mix(CHESTNUT, '#cbb08a', rng() * 0.6), 0.75);
    pen.fill([pt(x + w * 0.55, y), pt(x + w * 0.55, top + 3), pt(x + w, top + 4), pt(x + w, y)], d.ink, 0.16);
    pen.hair(closed(pale), 0.45, d.ink, 0.7);
  }
  for (const k of [0.25, 0.78]) {
    const wy = y - h * k;
    pen.hair([pt(x0, wy), pt((x0 + x1) / 2, wy + 0.8), pt(x1, wy)], 0.9, WIRE, 0.75);
    pen.hair([pt(x0, wy + 1.4), pt(x1, wy + 1.6)], 0.4, WIRE, 0.4);
  }
  for (let x = x0 + 40 + rng() * 40; x < x1 - 10; x += 110 + rng() * 30) {
    const p = boxPts(x - 4, y - h - 8, x + 4, y + 1, 6);
    pen.fill(p, PAPER_FILL, 1);
    pen.fill(p, mix(CHESTNUT, d.ink, 0.25), 0.8);
    pen.stroke(closed(p), 0.7, d.ink, 0.85, false);
  }
  for (let x = x0 + rng() * 60; x < x1; x += 50 + rng() * 70) tuft(d, pt(x, y + 2), 9 + rng() * 5, rng);
}

/** The allotment's threshold: a chestnut paling fence across the band, its ledged gate swung back to the left of the opening. */
export function palingGate(d: Draw, gate: Pt): void {
  const { pen } = d;
  const rng = createRng(d.pen.rng() * 1e9);
  const foot = gate.y + 14;
  palings(d, -30, gate.x - OPEN - 8, foot, 40, rng);
  palings(d, gate.x + OPEN + 8, MAP.width + 30, foot, 40, rng);
  // The gate: upright boards on two ledges and a brace, standing open against the fence.
  const x1 = gate.x - OPEN - 12;
  const x0 = x1 - 2 * OPEN;
  const base = foot + 10;
  const h = 46;
  for (let x = x0; x < x1 - 2; x += 9) {
    const board = [pt(x, base), pt(x, base - h + 3), pt(x + 4.5, base - h), pt(x + 9, base - h + 3), pt(x + 9, base)];
    pen.fill(board.map((p) => pt(p.x + 7, p.y + 5)), d.ink, 0.12);
    pen.fill(board, PAPER_FILL, 1);
    pen.fill(board, '#a3b08a', 0.7);
    pen.crescent(board, pt(-2.5, 0), () => pen.fill(board, d.ink, 0.18));
    pen.hair(closed(board), 0.6, d.ink, 0.85);
  }
  for (const y of [base - 10, base - h + 12]) {
    const ledge = boxPts(x0 + 2, y - 3, x1 - 2, y + 3, 10);
    pen.fill(ledge, mix('#a3b08a', d.ink, 0.25), 0.8);
    pen.hair(closed(ledge), 0.55, d.ink, 0.8);
    pen.stroke([pt(x1 + 8, y), pt(x1 - 20, y + 0.5)], 2, WIRE, 0.85, false);
  }
  const brace = ribbon([pt(x1 - 6, base - 12), pt(x0 + 6, base - h + 14)], () => 5).shape;
  pen.fill(brace, mix('#a3b08a', d.ink, 0.25), 0.8);
  pen.hair(closed(brace), 0.55, d.ink, 0.8);
  post(d, pt(gate.x - OPEN - 2, foot - 6), 14);
  post(d, pt(gate.x + OPEN + 2, foot - 6), 14);
}

/** A post-and-rail fence x0..x1 with its foot at y: two rails between stout posts, long grass at its foot. */
function railFence(d: Draw, x0: number, x1: number, y: number, rng: Rng): void {
  const { pen } = d;
  const posts: number[] = [];
  for (let x = x0 + 30 + rng() * 40; x < x1 - 20; x += 150 + rng() * 30) posts.push(x);
  for (const ry of [y - 12, y - 32]) {
    const rail = boxPts(x0, ry - 3, x1, ry + 3, 16);
    pen.fill(rail.map((p) => pt(p.x + 10, p.y + 16)), d.ink, 0.1);
    pen.fill(rail, PAPER_FILL, 1);
    pen.fill(rail, RAIL, 0.72);
    pen.fill(boxPts(x0, ry + 0.5, x1, ry + 3, 16), d.ink, 0.15);
    pen.stroke(closed(rail), 0.7, d.ink, 0.85, false);
    for (let x = x0 + rng() * 40; x < x1; x += 30 + rng() * 40) pen.hair([pt(x, ry - 1), pt(x + 14 + rng() * 10, ry - 1 + (rng() - 0.5))], 0.35, d.ink, 0.4);
  }
  for (const x of posts) {
    const p = boxPts(x - 5, y - 42, x + 5, y + 1, 6);
    pen.fill(p.map((q) => pt(q.x + 8, q.y + 12)), d.ink, 0.1);
    pen.fill(p, PAPER_FILL, 1);
    pen.fill(p, mix(RAIL, d.ink, 0.25), 0.8);
    pen.crescent(p, pt(-3, 0), () => pen.fill(p, d.ink, 0.2));
    pen.stroke(closed(p), 0.8, d.ink, 0.85, false);
  }
  for (let x = x0 + rng() * 30; x < x1; x += 22 + rng() * 30) {
    tuft(d, pt(x, y + 3), 11 + rng() * 8, rng, mix(LEAF, '#7a6a2a', 0.35));
    if (rng() < 0.25) pen.dot(x + (rng() - 0.5) * 8, y - 4 - rng() * 10, 2, rng() < 0.5 ? '#d23a2a' : '#f2efe6', 0.9);
  }
}

/** The meadow's threshold: a post-and-rail fence across the band, the stile's tall posts either side of the groove (its steps lie under it). */
export function stileFence(d: Draw, gate: Pt): void {
  const rng = createRng(d.pen.rng() * 1e9);
  const foot = gate.y + 14;
  railFence(d, -30, gate.x - OPEN, foot, rng);
  railFence(d, gate.x + OPEN, MAP.width + 30, foot, rng);
  const { pen } = d;
  for (const s of [-1, 1]) {
    const x = gate.x + s * OPEN;
    const p = boxPts(x - 6, foot - 58, x + 6, foot + 1, 6);
    pen.fill(p.map((q) => pt(q.x + 10, q.y + 14)), d.ink, 0.12);
    pen.fill(p, PAPER_FILL, 1);
    pen.fill(p, mix(RAIL, d.ink, 0.2), 0.8);
    pen.crescent(p, pt(-3, 0), () => pen.fill(p, d.ink, 0.22));
    pen.stroke(closed(p), 0.9, d.ink, 0.9, false);
    pen.fill(boxPts(x - 6, foot - 58, x + 6, foot - 54, 6), PAPER_FILL, 0.4);
  }
}

/** A dressed stone gate pier with a flat cap, drawn a little from the front. */
function pier(d: Draw, x: number, foot: number, rng: Rng): void {
  const { pen } = d;
  const w = 30;
  const face = boxPts(x - w / 2, foot - 40, x + w / 2, foot, 8);
  const cap = boxPts(x - w / 2 - 4, foot - 56, x + w / 2 + 4, foot - 40, 8);
  pen.fill(boxPts(x - w / 2 + 6, foot - 4, x + w / 2 + 26, foot + 18, 8), d.ink, 0.13);
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, STONE_DARK, 0.5);
  for (const y of [foot - 27, foot - 14]) pen.hair([pt(x - w / 2 + 1, y), pt(x + w / 2 - 1, y)], 0.45, d.ink, 0.45);
  pen.hair([pt(x - 3 + rng() * 6, foot - 40), pt(x - 3 + rng() * 6, foot - 27)], 0.45, d.ink, 0.45);
  pen.hair([pt(x - 6 + rng() * 12, foot - 14), pt(x - 6 + rng() * 12, foot)], 0.45, d.ink, 0.45);
  pen.stroke(closed(face), 0.9, d.ink, 0.8, false);
  pen.fill(cap, PAPER_FILL, 1);
  pen.fill(cap, STONE, 0.65);
  pen.crescent(cap, pt(-2, -3), () => pen.fill(cap, STONE_DARK, 0.4));
  for (let k = 0; k < 5; k++) pen.dot(x + (rng() - 0.5) * w, foot - 48 + (rng() - 0.5) * 10, 1.5 + rng() * 2, rng() < 0.6 ? '#c9c78a' : MOSS, 0.75);
  pen.stroke(closed(cap), 1.1, d.ink, 0.9, false);
}

/** The barnyard's threshold: a field-stone wall across the band, two piers at the opening, the iron field gate swung back to the right. */
export function farmGate(d: Draw, gate: Pt): void {
  const { pen } = d;
  const rng = createRng(d.pen.rng() * 1e9);
  const foot = gate.y + 16;
  const half = OPEN + 22;
  for (const [a, b] of [[-30, gate.x - half - 14], [gate.x + half + 14, MAP.width + 30]] as const) fieldWall(d, a, b, foot, rng);
  // The galvanised gate: five tubular bars and a diagonal, standing open against the wall right of the opening.
  const x0 = gate.x + half + 18;
  const x1 = x0 + 2 * half + 8;
  const h = 46;
  const base = foot + 8;
  const bars: Pt[][] = [];
  for (let k = 0; k < 5; k++) bars.push([pt(x0, base - 4 - (k * (h - 8)) / 4), pt(x1, base - 4 - (k * (h - 8)) / 4)]);
  bars.push([pt(x0 + 4, base - 4), pt(x1 - 4, base - h + 4)]);
  bars.push([pt(x0, base), pt(x0, base - h)], [pt(x1, base), pt(x1, base - h)]);
  for (const b of bars) pen.stroke(b.map((p) => pt(p.x + 8, p.y + 6)), 2.2, d.ink, 0.1, false);
  for (const b of bars) {
    pen.stroke(b, 3, mix(IRON, '#b8c0c4', 0.4), 0.95, false);
    pen.hair(b.map((p) => pt(p.x, p.y + 1.2)), 0.6, d.ink, 0.75);
  }
  for (const y of [base - 8, base - h + 8]) pen.stroke([pt(x0 - 10, y), pt(x0 + 6, y)], 2.4, WIRE, 0.85, false);
  pier(d, gate.x - half, foot, rng);
  pier(d, gate.x + half, foot, rng);
}

/** A low wall of rounded field stones, mortared, grass at its foot. */
function fieldWall(d: Draw, x0: number, x1: number, y: number, rng: Rng): void {
  const { pen } = d;
  const top = y - 26;
  pen.fill([pt(x0 + 4, y - 2), pt(x1 + 8, y - 2), pt(x1 + 20, y + 14), pt(x0 + 16, y + 14)], d.ink, 0.1);
  const body = boxPts(x0, top, x1, y, 16);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(STONE, '#d8cfb8', 0.4), 0.55);
  for (let r = 0; r < 3; r++) {
    for (let x = x0 - rng() * 10; x < x1 - 4; ) {
      const w = 12 + rng() * 14;
      const cy = top + 4 + r * 8 + rng() * 2;
      if (x > x0 + 2) {
        const s = boxPts(x + 1, cy - 3.6, Math.min(x1 - 1, x + w - 1), cy + 3.6, 5);
        pen.fill(s, mix(STONE, rng() < 0.5 ? '#b8a88a' : '#a8aca4', rng()), 0.8);
        pen.fill(s.map((p) => pt(p.x, Math.max(p.y, cy + 0.5))), STONE_DARK, 0.25);
        pen.hair(closed(s), 0.4, d.ink, 0.5);
      }
      x += w;
    }
  }
  pen.stroke([pt(x0, top), pt((x0 + x1) / 2, top + 0.6), pt(x1, top)], 1, d.ink, 0.8, false);
  pen.stroke([pt(x0, y), pt(x1, y + 0.5)], 1.2, d.ink, 0.85, false);
  for (let x = x0 + rng() * 40; x < x1; x += 40 + rng() * 50) tuft(d, pt(x, y + 3), 9 + rng() * 6, rng);
}
