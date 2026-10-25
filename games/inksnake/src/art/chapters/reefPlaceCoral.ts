import type { Rng } from '../../logic/rng';
import type { Pt } from '../../logic/vec';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { specks } from '../places/farmGroundParts';
import { mix } from '../wash';
import { DEEP_DARK, FOAM, glazeAt, MID, rngAt } from './reefPlaceKit';

/**
 * A coral head (bommie) from above, rising almost to the surface: a crowd of
 * colonies jostling on one rock, each its own kind, colour and texture (a
 * brain coral's meandering ridges, a branching bush's thousand tips, a
 * plate coral's radiating ribs and growth rings, a massive coral's polyp
 * pits), each shaded on its own and outlined in ink, the whole throwing a
 * soft blue shadow down on the sand. Every head is different (seeded by
 * where it stands).
 */
type Kind = 'brain' | 'bush' | 'plate' | 'massive';

const BASE = '#978d78';
const KINDS: readonly Kind[] = ['brain', 'bush', 'bush', 'plate', 'massive', 'massive'];
const COLOURS: Readonly<Record<Kind, readonly string[]>> = {
  brain: ['#c2a050', '#a3a25e', '#b98a56'],
  bush: ['#9c86ad', '#bf8f86', '#86a6ae', '#c4a46e'],
  plate: ['#b3a477', '#9ca986', '#b89c78'],
  massive: ['#bfa262', '#a97c58', '#c9b48a', '#9c8a6c'],
};

interface Colony {
  readonly p: Pt;
  readonly r: number;
  readonly kind: Kind;
  readonly colour: string;
  readonly shape: Pt[];
}

/** Meandering ridges over a brain coral, each groove dark with a lit edge. */
function ridges(d: Draw, col: Colony, rng: Rng): void {
  const deep = mix(col.colour, d.ink, 0.45);
  const lines: Pt[][] = [];
  for (let k = 0; k < Math.round(col.r * 1.6); k++) {
    let p = polar(col.p, rng() * TAU, Math.sqrt(rng()) * col.r);
    let h = rng() * TAU;
    const line: Pt[] = [p];
    for (let i = 0; i < 9; i++) {
      h += (rng() - 0.5) * 1.5;
      p = polar(p, h, 1.8);
      line.push(p);
    }
    lines.push(line);
  }
  for (const l of lines) d.pen.hair(l.map((q) => pt(q.x - 0.6, q.y - 0.6)), 0.7, PAPER_FILL, 0.4);
  for (const l of lines) d.pen.hair(l, 0.55, deep, 0.7);
}

/** A branching bush's tips seen end on: crowded little knobs, each with its shadow and a pale growing tip. */
function tips(d: Draw, col: Colony, rng: Rng): void {
  const n = Math.round(col.r * col.r * 0.75);
  const at = Array.from({ length: n }, () => {
    const q = polar(col.p, rng() * TAU, Math.sqrt(rng()) * col.r * 0.95);
    return [q.x, q.y, 0.8 + rng() * 0.7] as const;
  });
  specks(d, d.ink, 0.28, at.map(([x, y, r]) => [x + SHADOW.x * 0.9, y + SHADOW.y * 0.9, r] as const));
  specks(d, mix(col.colour, d.ink, 0.15), 0.9, at);
  specks(d, mix(col.colour, '#ffffff', 0.55), 0.85, at.map(([x, y, r]) => [x - 0.3, y - 0.3, r * 0.45] as const));
}

/** A plate coral's ribs radiating from its stem, and its growth rings. */
function ribs(d: Draw, col: Colony, rng: Rng): void {
  const deep = mix(col.colour, d.ink, 0.4);
  const n = Math.round(col.r * 1.8);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + (rng() - 0.5) * 0.1;
    d.pen.hair([polar(col.p, a, col.r * 0.12), polar(col.p, a + (rng() - 0.5) * 0.12, col.r * 1.05)], 0.4, deep, 0.5);
  }
  for (let k = 1; k <= 3; k++) d.pen.hair(closed(blob(col.p, col.r * (0.3 + k * 0.22), col.r * (0.28 + k * 0.2), rng, 0.15, 22)), 0.45, deep, 0.45);
  specks(d, mix(col.colour, '#ffffff', 0.5), 0.7, Array.from({ length: Math.round(col.r * 4) }, () => {
    const q = polar(col.p, rng() * TAU, col.r * (0.8 + rng() * 0.18));
    return [q.x, q.y, 0.4 + rng() * 0.4] as const;
  }));
}

/** A massive coral's lumps and polyp pits. */
function pits(d: Draw, col: Colony, rng: Rng): void {
  const deep = mix(col.colour, d.ink, 0.5);
  for (let k = 0; k < 3; k++) {
    const lump = blob(polar(col.p, rng() * TAU, col.r * 0.45), col.r * 0.42, col.r * 0.36, rng, 0.2, 16);
    d.pen.crescent(lump, pt(-SHADOW.x * col.r * 0.25, -SHADOW.y * col.r * 0.25), () => d.pen.fill(lump, deep, 0.25));
  }
  specks(d, deep, 0.55, Array.from({ length: Math.round(col.r * col.r * 0.6) }, () => {
    const q = polar(col.p, rng() * TAU, Math.sqrt(rng()) * col.r);
    return [q.x, q.y, 0.3 + rng() * 0.3] as const;
  }));
}

const TEXTURE: Readonly<Record<Kind, (d: Draw, col: Colony, rng: Rng) => void>> = { brain: ridges, bush: tips, plate: ribs, massive: pits };

/** One colony: paper, its colour, its texture, its shade and light, a fine contour. */
function paintColony(d: Draw, col: Colony, rng: Rng): void {
  const { pen } = d;
  pen.fill(col.shape.map((p) => pt(p.x + SHADOW.x * 1.8, p.y + SHADOW.y * 1.8)), d.ink, 0.2);
  pen.fill(col.shape, PAPER_FILL, 1);
  pen.fill(col.shape, col.colour, 0.85);
  pen.clipped(col.shape, () => {
    TEXTURE[col.kind](d, col, rng);
    pen.crescent(col.shape, pt(-SHADOW.x * col.r * 0.5, -SHADOW.y * col.r * 0.5), () => pen.fill(col.shape, mix(col.colour, DEEP_DARK, 0.6), 0.4));
    glazeAt(pen.ctx, col.p.x - col.r * 0.35, col.p.y - col.r * 0.4, col.r * 0.6, col.r * 0.4, 0, FOAM, 0.16);
  });
  pen.hair(closed(col.shape), col.r > 10 ? 0.9 : 0.7, d.ink, 0.65);
}

/** The colonies of one head: crowded at random over its rock, big and small, each kept about inside the solid's radius. */
function coloniesOf(c: Pt, r: number, rng: Rng): Colony[] {
  const pick = (): Kind => KINDS[Math.floor(rng() * KINDS.length)]!;
  const make = (p: Pt, cr: number, kind: Kind): Colony => {
    const list = COLOURS[kind];
    const colour = list[Math.floor(rng() * list.length)]!;
    return { p, r: cr, kind, colour, shape: blob(p, cr, cr * (0.7 + rng() * 0.25), rng, kind === 'plate' ? 0.16 : 0.34, 30, rng() * TAU) };
  };
  const n = 7 + Math.floor(rng() * 3);
  const first = rng() * TAU;
  return Array.from({ length: n }, (_, k) => {
    const cr = r * (k === 0 ? 0.5 + rng() * 0.1 : 0.26 + rng() * 0.2);
    // Spread round the head (golden-angle steps), then jostled.
    const at = polar(c, first + k * 2.4 + (rng() - 0.5) * 0.6, Math.min(r * 1.02 - cr, Math.sqrt((k + 0.5) / n) * r * 0.85));
    return make(at, cr, pick());
  });
}

/** The head's own rock between the colonies: dead coral, brown-grey, furred with algae. */
function rock(d: Draw, c: Pt, r: number, rng: Rng): Pt[] {
  const { pen } = d;
  const shape = blob(c, r, r * (0.88 + rng() * 0.1), rng, 0.2, 40, rng() * TAU);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BASE, 0.9);
  pen.clipped(shape, () => {
    specks(d, mix(BASE, '#5f7a4a', 0.5), 0.6, Array.from({ length: Math.round(r * r * 0.5) }, () => {
      const q = polar(c, rng() * TAU, Math.sqrt(rng()) * r);
      return [q.x, q.y, 0.4 + rng() * 0.7] as const;
    }));
    pen.crescent(shape, pt(-SHADOW.x * r * 0.4, -SHADOW.y * r * 0.4), () => pen.fill(shape, DEEP_DARK, 0.35));
  });
  return shape;
}

/** A coral head: its shadow on the sand, then its colonies back to front, a veil of water over the far side. */
export function coralHead(d: Draw, c: Pt, r: number): void {
  const { ctx } = d.pen;
  const rng = rngAt(c.x, c.y, 9);
  const cols = coloniesOf(c, r, rng);
  d.pen.fill(blob(c, r, r * 0.9, rngAt(c.x, c.y, 10), 0.2, 30).map((p) => pt(p.x + SHADOW.x * r * 0.45, p.y + SHADOW.y * r * 0.45)), DEEP_DARK, 0.32);
  glazeAt(ctx, c.x + SHADOW.x * r * 0.6, c.y + SHADOW.y * r * 0.6, r * 1.3, r * 1.15, 0, DEEP_DARK, 0.18);
  const base = rock(d, c, r, rng);
  for (const col of cols) paintColony(d, col, rng);
  d.pen.stroke(closed(base), 1.5, d.ink, 0.9);
  // The far side of the head sinks into the blue.
  glazeAt(ctx, c.x + SHADOW.x * r * 0.55, c.y + SHADOW.y * r * 0.55, r * 0.8, r * 0.6, 0.6, mix(DEEP_DARK, MID, 0.4), 0.22);
}
