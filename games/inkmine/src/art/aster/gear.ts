import type { Piece } from '../../logic/gear';
import { capsule, cub, edge, oval, pt, type Draw } from '../kit';
import { dab, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ASTER, starGlyph } from './style';

/**
 * The Aster's own gear (spec, "The Aster"), as their broken pieces lie on
 * Mycel: what the suit studies to learn Mk 2. Nothing like ours: ribbed
 * glazed ceramic, cord lashings, hexagonal glass with a teal glow, their
 * star on each. Each fits a frame of 40 units, origin at the centre, as a
 * technology slot's picture does (techArt.ts).
 */

/** A shell part: glazed ceramic, lit, with the glaze pooled along its lower edge. */
export function shell(d: Draw, shape: readonly Pt[], low: number, gloss = true): void {
  paint(d, shape, ASTER.shell, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.8, gloss });
  d.pen.clipped(shape, () => dab(d, oval(0, low, 40, 8, 16), ASTER.glaze, 0.5, 2.5));
}

/** Ribs across a part: a shadowed groove with a lit ridge beside it, between two points, curving by `bow`. */
export function rib(d: Draw, a: Pt, b: Pt, bow: number): void {
  const m = pt((a.x + b.x) / 2 + bow, (a.y + b.y) / 2);
  const line = cub(a, m, m, b, 8);
  d.pen.hair(line, 0.7, mix(ASTER.glaze, SHADOW, 0.45), 0.8);
  d.pen.hair(line.map((p) => pt(p.x - 0.7, p.y - 0.3)), 0.45, PAPER_FILL, 0.6);
}

/** Cord lashed round a part, across from `a` to `b`: a few tight turns. */
export function lash(d: Draw, a: Pt, b: Pt, turns = 3): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 1.1;
  const ny = (dx / len) * 1.1;
  for (let k = 0; k < turns; k++) {
    const o = (k - (turns - 1) / 2) * 1.5;
    d.pen.stroke([pt(a.x + nx * o, a.y + ny * o), pt(b.x + nx * o, b.y + ny * o)], 1.1, ASTER.cord, 1, false);
    d.pen.hair([pt(a.x + nx * o - 0.3, a.y + ny * o - 0.3), pt(b.x + nx * o - 0.3, b.y + ny * o - 0.3)], 0.35, '#c98b6c', 0.8);
  }
}

/** A hexagonal glass window with the teal glow behind it. */
export function hexGlass(d: Draw, c: Pt, r: number, lit = true): void {
  const hex = Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos((i / 6) * Math.PI * 2 + Math.PI / 6) * r, c.y + Math.sin((i / 6) * Math.PI * 2 + Math.PI / 6) * r));
  if (lit) glow(d.pen.ctx, c, r * 2, ASTER.glow, 0.35);
  paint(d, hex, ASTER.glass, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.6, gloss: true });
  d.pen.dot(c.x - r * 0.35, c.y - r * 0.35, r * 0.18, PAPER_FILL, 0.9);
}

/** The coring drill: a ribbed barrel with a cord grip, ending in a crown of eight teeth that cuts a ring, not a hole. */
function drill(d: Draw): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.rotate(-0.6);
  const grip = capsule(pt(-16, 0), pt(-6, 0), 6, 6);
  paint(d, grip, mix(ASTER.cord, '#2a1a20', 0.2), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.6 });
  for (let x = -14.5; x < -6; x += 2) d.pen.hair([pt(x, -2.8), pt(x + 0.8, 2.8)], 0.4, '#c98b6c', 0.8);
  const barrel = [pt(-7, -6), ...cub(pt(-7, -6), pt(2, -8.4), pt(9, -7.6), pt(12, -6.6), 6), pt(12, 6.6), ...cub(pt(12, 6.6), pt(9, 7.6), pt(2, 8.4), pt(-7, 6), 6)];
  shell(d, barrel, 7);
  for (const x of [-2, 3, 8]) rib(d, pt(x, -7.4), pt(x, 7.4), 1.2);
  hexGlass(d, pt(-1, 0), 2.4);
  // The crown: a short collar, then teeth all round its rim, seen side on as a zigzag.
  const collar = [pt(12, -7), pt(17, -6.4), pt(17, 6.4), pt(12, 7)];
  paint(d, collar, mix(ASTER.shell, ASTER.glaze, 0.5), { alpha: 1, shadow: 0.5, hatch: 0.15, line: 0.7, gloss: true });
  const teeth: Pt[] = [pt(17, -6.4)];
  for (let k = 0; k < 8; k++) teeth.push(pt(k % 2 ? 17 : 21.5, -6.4 + (k + 0.5) * 1.6), pt(17, -6.4 + (k + 1) * 1.6));
  paint(d, [...teeth, pt(17, 6.4)], '#d8cfc0', { alpha: 1, shadow: 0.5, hatch: 0, line: 0.6, gloss: true });
  starGlyph(d, pt(4, -4.2), 1.6, ASTER.cord);
  ctx.restore();
}

/** The cell: a hexagonal glass prism standing in ribbed ceramic end caps, teal veins of charge glowing in it, bound with cord. */
function cell(d: Draw): void {
  glow(d.pen.ctx, pt(0, 0), 14, ASTER.glow, 0.3);
  const prism = [pt(-7, -10), pt(7, -10), pt(9, 0), pt(7, 10), pt(-7, 10), pt(-9, 0)];
  paint(d, prism, ASTER.glass, { alpha: 0.9, shadow: 0.35, hatch: 0, line: 0.7, gloss: true });
  d.pen.clipped(prism, () => {
    for (let k = -2; k <= 2; k++) d.pen.hair([pt(k * 3, 10), pt(k * 2.2 + 1, 3), pt(k * 3.2 - 1, -4), pt(k * 2, -10)], 0.6, '#e9fff8', 0.85);
    d.pen.hair([pt(-2.4, -10), pt(-2.4, 10)], 0.4, '#3f8d80', 0.5);
    d.pen.hair([pt(2.4, -10), pt(2.4, 10)], 0.4, '#3f8d80', 0.5);
  });
  for (const y of [-1, 1]) {
    const capShape = [pt(-9, y * 10), ...cub(pt(-9, y * 10), pt(-9, y * 15), pt(9, y * 15), pt(9, y * 10), 8)];
    shell(d, capShape, y * 12);
    for (const x of [-5, 0, 5]) rib(d, pt(x, y * 10.4), pt(x * 0.7, y * 13.6), 0);
  }
  starGlyph(d, pt(0, -15.6), 2.6, ASTER.shell, true);
  lash(d, pt(-9.4, 2), pt(9.4, 2));
  d.pen.dot(-4.4, -5, 0.9, PAPER_FILL, 0.9);
}

/** The pack: a ribbed shell pod like a clam, its two halves lashed shut, a star clasp, straps of cord. */
function pack(d: Draw): void {
  d.pen.stroke([pt(-8, -8), pt(-10, -15), pt(10, -15), pt(8, -8)], 1.4, ASTER.cord, 1, false);
  const pod = [...cub(pt(-15, 4), pt(-16, -9), pt(-6, -12), pt(0, -12), 8), ...cub(pt(0, -12), pt(6, -12), pt(16, -9), pt(15, 4), 8), ...cub(pt(15, 4), pt(12, 12), pt(-12, 12), pt(-15, 4), 8)];
  shell(d, pod, 9);
  for (let k = -3; k <= 3; k++) rib(d, pt(k * 1.2, -11.6), pt(k * 4.4, 10.6), k * 0.8);
  // The seam between its halves, and the lashing across it.
  d.pen.hair(cub(pt(-15, 1), pt(-6, 3.4), pt(6, 3.4), pt(15, 1), 10), 0.8, d.ink, 0.85);
  lash(d, pt(-2, -4), pt(-2, 9), 2);
  starGlyph(d, pt(-2, 2.4), 3.4, ASTER.shell, true);
  hexGlass(d, pt(8.5, -4), 2, false);
}

/** The helmet: a faceted glass dome of hexagons on a ribbed ceramic collar, their star for a crest, two fronds of antenna. */
function helmet(d: Draw): void {
  for (const s of [-1, 1]) d.pen.stroke([pt(s * 6, -11), pt(s * 9, -16), pt(s * 12, -17)], 0.9, ASTER.cord, 1, false);
  const dome = oval(0, -2, 12.5, 12, 30).filter((p) => p.y <= 4);
  paint(d, dome, ASTER.glass, { alpha: 0.75, shadow: 0.4, hatch: 0, line: 0, gloss: true });
  d.pen.clipped(dome, () => {
    // The facets: a honeycomb over the glass.
    for (let row = -3; row <= 2; row++) {
      for (let col = -3; col <= 3; col++) {
        const c = pt(col * 5.6 + (row % 2 ? 2.8 : 0), row * 4.8);
        const hex = Array.from({ length: 7 }, (_, i) => pt(c.x + Math.cos((i / 6) * Math.PI * 2 + Math.PI / 6) * 3.1, c.y + Math.sin((i / 6) * Math.PI * 2 + Math.PI / 6) * 3.1));
        d.pen.hair(hex, 0.4, '#2f6a63', 0.6);
      }
    }
    dab(d, oval(-5, -8, 4, 2.4, 12), PAPER_FILL, 0.5, 0.6);
  });
  edge(d, dome, 0.8, 0.95);
  const collar = [pt(-14, 3), ...cub(pt(-14, 3), pt(-8, 1), pt(8, 1), pt(14, 3), 8), pt(13, 9), ...cub(pt(13, 9), pt(7, 11), pt(-7, 11), pt(-13, 9), 8)];
  shell(d, collar, 9);
  for (let k = -4; k <= 4; k++) rib(d, pt(k * 3, 1.6 + Math.abs(k) * 0.2), pt(k * 2.8, 10.4 - Math.abs(k) * 0.2), 0);
  starGlyph(d, pt(0, -15.4), 3.6, ASTER.shell, true);
}

/** The jetpack: a fan of four petal nozzles round a ribbed hub, a hexagon of glass at its heart. */
function jetpack(d: Draw): void {
  for (const [i, a] of [2.15, 1.8, 1.35, 1.0].entries()) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const at = (u: number, v: number): Pt => pt(c * u - s * v, 2 + s * u + c * v);
    const len = 16 - Math.abs(i - 1.5) * 1.6;
    const p = [at(3, -3.4), ...cub(at(3, -3.4), at(len * 0.5, -5.4), at(len * 0.9, -3), at(len, 0), 6), ...cub(at(len, 0), at(len * 0.9, 3), at(len * 0.5, 5.4), at(3, 3.4), 6)];
    paint(d, p, mix(ASTER.shell, ASTER.glaze, 0.35), { alpha: 1, shadow: 0.5, hatch: 0.14, line: 0.7, gloss: true });
    dab(d, oval(at(len * 0.82, 0).x, at(len * 0.82, 0).y, 2.4, 1.8, 10), '#2a2238', 0.5, 0.7);
  }
  const hub = oval(0, -2, 10, 9, 24);
  shell(d, hub, 4);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    rib(d, pt(Math.cos(a) * 4, -2 + Math.sin(a) * 3.6), pt(Math.cos(a) * 9.4, -2 + Math.sin(a) * 8.4), 0);
  }
  hexGlass(d, pt(0, -2), 3.4);
  lash(d, pt(-10, -9), pt(-4, -13), 2);
  lash(d, pt(4, -13), pt(10, -9), 2);
}

/** The suit: bands of ribbed shell plate overlapping down a sleeve of woven cord, laced up the front, their star at the breast. */
function suit(d: Draw): void {
  // The woven undersleeve: arms and the body under the plates.
  for (const s of [-1, 1]) {
    const arm = capsule(pt(s * 9, -8), pt(s * 13, 8), 5, 4.4);
    paint(d, arm, mix(ASTER.cord, '#4b3346', 0.4), { alpha: 1, shadow: 0.45, hatch: 0.3, line: 0.6 });
    for (let k = 0; k < 3; k++) {
      const y = -4 + k * 5;
      const band = [pt(s * (9 + k * 1.2) - 3, y - 1.6), pt(s * (9 + k * 1.2) + 3, y - 1.6), pt(s * (9.6 + k * 1.2) + 3, y + 1.8), pt(s * (9.6 + k * 1.2) - 3, y + 1.8)];
      shell(d, band, y + 2, false);
    }
  }
  const body = [pt(-9, -11), pt(9, -11), pt(10, 12), pt(-10, 12)];
  paint(d, body, mix(ASTER.cord, '#4b3346', 0.4), { alpha: 1, shadow: 0.45, hatch: 0.3, line: 0.7 });
  // Overlapping plates, the lowest first so each sits over the one below.
  for (let k = 4; k >= 0; k--) {
    const y = -10 + k * 4.6;
    const plate = [pt(-9.6, y), ...cub(pt(-9.6, y), pt(-4, y - 1.6), pt(4, y - 1.6), pt(9.6, y), 6), pt(9.8, y + 4.2), ...cub(pt(9.8, y + 4.2), pt(4, y + 5.6), pt(-4, y + 5.6), pt(-9.8, y + 4.2), 6)];
    shell(d, plate, y + 5);
  }
  // Lacing up the front.
  for (let k = 0; k < 5; k++) {
    const y = -8 + k * 4.4;
    d.pen.stroke([pt(-2, y), pt(2, y + 2.2)], 0.8, ASTER.cord, 1, false);
    d.pen.stroke([pt(2, y), pt(-2, y + 2.2)], 0.8, ASTER.cord, 1, false);
  }
  starGlyph(d, pt(-5.4, -6.4), 2.4, ASTER.glass, true);
}

const DRAW: Readonly<Record<Piece, (d: Draw) => void>> = { drill, cell, pack, helmet, jetpack, suit };

/** One of the Aster's own gear pieces, as it was before it broke. */
export function drawAsterGear(d: Draw, piece: Piece): void {
  DRAW[piece](d);
}
