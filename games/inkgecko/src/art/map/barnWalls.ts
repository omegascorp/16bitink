import type { Rng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { MOSS, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts } from './band';
import { bale, hayHeap } from './barnKit';
import { ladder } from './orchardKit';

/**
 * The old barn's fabric, its roof cut away as on an architect's drawing:
 * tarred weatherboard walls in section, a strip of the clay-tiled roof
 * left along each side with the rafters' cut ends showing, the oak aisle
 * posts, the front wall drawn a little from the front with its great doors
 * swung open, the back wall's boards letting the daylight through, and the
 * hay loft over one aisle with its ladder.
 */
export const BARN_WALL = 16;
/** The front face's height below the wall top, as drawn. */
export const FACE = 44;
const TAR = '#34343c';
const OAK = '#9a7a56';
const TILE = '#b4603e';
const DOOR = '#8a3a2e';

/** A stretch of side wall along x from y0 to y1 in section: tarred boards, the oak wall plate along its top. */
export function sideWall(d: Draw, x: number, y0: number, y1: number): void {
  const { pen } = d;
  const w = boxPts(x - BARN_WALL / 2, y0, x + BARN_WALL / 2, y1, 16);
  pen.fill(w, PAPER_FILL, 1);
  pen.fill(w, TAR, 0.82);
  const plate = boxPts(x - 4, y0, x + 4, y1, 16);
  pen.fill(plate, OAK, 0.85);
  for (let y = y0 + 30; y < y1 - 4; y += 60) pen.hair([pt(x - 4, y), pt(x + 4, y)], 0.5, d.ink, 0.7);
  pen.hair([pt(x - 4, y0), pt(x - 4, y1)], 0.4, d.ink, 0.6);
  pen.stroke([pt(x - BARN_WALL / 2, y0), pt(x - BARN_WALL / 2, y1)], 1, d.ink, 0.9, false);
  pen.stroke([pt(x + BARN_WALL / 2, y0), pt(x + BARN_WALL / 2, y1)], 1, d.ink, 0.9, false);
}

/**
 * The strip of roof left over a side wall, y0..y1, from its eave at
 * `eave` to the cut at `cut`: clay tiles in courses, mossy towards the
 * eave, the section through battens and rafters inked at the cut, the
 * rafters' cut ends reaching on in, the strip's shadow.
 */
export function roofStrip(d: Draw, eave: number, cut: number, y0: number, y1: number, rng: Rng): void {
  const { pen } = d;
  const xa = Math.min(eave, cut);
  const xb = Math.max(eave, cut);
  const inward = Math.sign(cut - eave);
  const roof = boxPts(xa, y0, xb, y1, 12);
  pen.fill(roof.map((p) => pt(p.x + 24, p.y + 34)), d.ink, 0.14);
  // Rafters, cut off where the roof was taken away: they reach in past the tiles.
  for (let y = Math.ceil((y0 + 8) / 64) * 64; y < y1 - 6; y += 64) {
    const r = boxPts(Math.min(cut, cut + inward * 58), y - 4, Math.max(cut, cut + inward * 58), y + 5, 8);
    pen.fill(r.map((p) => pt(p.x + 10, p.y + 14)), d.ink, 0.12);
    pen.fill(r, PAPER_FILL, 1);
    pen.fill(r, OAK, 0.8);
    pen.crescent(r, pt(0, -2.5), () => pen.fill(r, d.ink, 0.22));
    pen.stroke(closed(r), 0.7, d.ink, 0.85, false);
    const end = boxPts(cut + inward * 56 - 2, y - 4, cut + inward * 56 + 2, y + 4, 4);
    pen.fill(end, '#e8d0a8', 0.95);
    pen.hair(closed(end), 0.5, d.ink, 0.8);
  }
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, TILE, 0.62);
  const ctx = pen.ctx;
  const dark = new Path2D();
  const pale = new Path2D();
  const joints = new Path2D();
  for (let x = xa; x < xb - 2; x += 10) {
    joints.moveTo(x, y0);
    joints.lineTo(x, y1);
    const col = Math.round(x / 10);
    for (let y = y0 - ((y0 % 14) + 14) % 14 + (col % 2) * 7; y < y1; y += 14) {
      if (y < y0) continue;
      joints.moveTo(x, y);
      joints.lineTo(x + 10, y);
      const v = rng();
      if (v < 0.2) dark.rect(x + 1, y + 1, 8, Math.min(12, y1 - y - 1));
      else if (v > 0.86) pale.rect(x + 1, y + 1, 8, Math.min(12, y1 - y - 1));
    }
  }
  ctx.save();
  ctx.fillStyle = mix(TILE, '#5a2a1a', 0.5);
  ctx.globalAlpha = 0.22;
  ctx.fill(dark);
  ctx.fillStyle = PAPER_FILL;
  ctx.globalAlpha = 0.2;
  ctx.fill(pale);
  ctx.strokeStyle = '#5a2a1a';
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 0.6;
  ctx.stroke(joints);
  ctx.restore();
  // The slope falls to the eave: lit where it faces the light (the left roof), in shade on the right.
  if (inward < 0) pen.fill(roof, '#3a2a2a', 0.18);
  else pen.fill(boxPts(xa, y0, xa + 18, y1, 12), PAPER_FILL, 0.15);
  for (let k = 0; k < (y1 - y0) / 14; k++) pen.dot(eave + inward * (4 + rng() * 18), y0 + rng() * (y1 - y0), 1.6 + rng() * 2.6, rng() < 0.6 ? MOSS : '#c9c78a', 0.6);
  // The section at the cut: battens and the tiles' edge, inked dark.
  const section = boxPts(Math.min(cut, cut - inward * 6), y0, Math.max(cut, cut - inward * 6), y1, 12);
  pen.fill(section, d.ink, 0.55);
  pen.hatch(section, 3, 0.8, 0.4, { color: PAPER_FILL, alpha: 0.35 });
  pen.stroke([pt(cut, y0), pt(cut, y1)], 1.1, d.ink, 0.9, false);
  pen.stroke([pt(eave, y0), pt(eave, y1)], 1.2, d.ink, 0.85, false);
  pen.hair([pt(eave + inward * 3, y0), pt(eave + inward * 3, y1)], 0.6, '#4a4a52', 0.6);
}

/**
 * The front wall across the barn at y (its section), with the face below
 * it drawn a little from the front: tarred boards, the great doors at the
 * opening (gx ± open) swung right back against it.
 */
export function frontWall(d: Draw, x0: number, x1: number, y: number, gx: number, open: number, rng: Rng): void {
  const { pen } = d;
  for (const [a, b] of [[x0 - BARN_WALL / 2, gx - open], [gx + open, x1 + BARN_WALL / 2]] as const) {
    const face = boxPts(a, y, b, y + FACE, 14);
    pen.fill(boxPts(a + 6, y + FACE - 2, b + 10, y + FACE + 12, 14), d.ink, 0.13);
    pen.fill(face, PAPER_FILL, 1);
    pen.fill(face, TAR, 0.78);
    for (let yy = y + 7; yy < y + FACE - 1; yy += 7) pen.hair([pt(a + 1, yy), pt(b - 1, yy + (rng() - 0.5))], 0.6, '#6a6a72', 0.6);
    pen.fill(boxPts(a, y + FACE - 9, b, y + FACE, 14), mix('#8a8070', TAR, 0.4), 0.5);
    pen.stroke(closed(face), 1, d.ink, 0.9, false);
    const top = boxPts(a, y - BARN_WALL / 2, b, y + BARN_WALL / 2, 14);
    pen.fill(top, PAPER_FILL, 1);
    pen.fill(top, TAR, 0.85);
    pen.fill(boxPts(a, y - 4, b, y + 4, 14), OAK, 0.85);
    pen.stroke(closed(top), 1, d.ink, 0.9, false);
  }
  // The doors: planked leaves, ledged and braced, faded red, standing open against the face.
  for (const s of [-1, 1]) {
    const xa = s < 0 ? gx - open * 2 + 4 : gx + open;
    const xb = xa + open - 4;
    const leaf = boxPts(xa, y - 4, xb, y + FACE + 2, 10);
    pen.fill(leaf.map((p) => pt(p.x + 7, p.y + 5)), d.ink, 0.18);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, mix(DOOR, '#b08070', rng() * 0.3), 0.8);
    for (let x = xa + 8; x < xb - 2; x += 8) pen.hair([pt(x, y - 3), pt(x, y + FACE + 1)], 0.45, d.ink, 0.5);
    for (const yy of [y + 4, y + FACE - 6]) pen.fill(boxPts(xa + 2, yy - 3, xb - 2, yy + 3, 10), mix(DOOR, d.ink, 0.25), 0.8);
    pen.stroke([pt(xa + 4, y + FACE - 6), pt(xb - 4, y + 4)], 3, mix(DOOR, d.ink, 0.25), 0.85, false);
    pen.crescent(leaf, pt(-3, 0), () => pen.fill(leaf, d.ink, 0.15));
    pen.stroke(closed(leaf), 0.9, d.ink, 0.9, false);
    for (const yy of [y + 4, y + FACE - 6]) pen.stroke([pt(s < 0 ? xb + 2 : xa - 2, yy), pt(s < 0 ? xb - 22 : xa + 22, yy)], 2, '#2a2a30', 0.9, false);
  }
}

/** The back wall at y in section, its inner face below it in shadow with daylight between the boards, the doorway at gx ± open. */
export function backWall(d: Draw, x0: number, x1: number, y: number, gx: number, open: number, rng: Rng): void {
  const { pen } = d;
  for (const [a, b] of [[x0 - BARN_WALL / 2, gx - open], [gx + open, x1 + BARN_WALL / 2]] as const) {
    const face = boxPts(a, y, b, y + 30, 14);
    pen.fill(face, PAPER_FILL, 1);
    pen.fill(face, mix(OAK, TAR, 0.55), 0.75);
    for (let yy = y + 6; yy < y + 29; yy += 6) {
      pen.hair([pt(a + 1, yy), pt(b - 1, yy)], 0.5, d.ink, 0.5);
      if (rng() < 0.5) {
        const xs = a + rng() * (b - a - 40);
        pen.hair([pt(xs, yy + 0.8), pt(xs + 20 + rng() * 40, yy + 0.8)], 0.9, '#fff3c8', 0.75);
      }
    }
    pen.fill(boxPts(a, y + 20, b, y + 30, 14), d.ink, 0.15);
    pen.stroke(closed(face), 0.9, d.ink, 0.85, false);
    const top = boxPts(a, y - BARN_WALL / 2, b, y + BARN_WALL / 2, 14);
    pen.fill(top, PAPER_FILL, 1);
    pen.fill(top, TAR, 0.85);
    pen.fill(boxPts(a, y - 4, b, y + 4, 14), OAK, 0.85);
    pen.stroke(closed(top), 1, d.ink, 0.9, false);
  }
  for (const x of [gx - open, gx + open]) {
    const jamb = boxPts(x - 5, y - 10, x + 5, y + 30, 6);
    pen.fill(jamb, OAK, 0.9);
    pen.stroke(closed(jamb), 0.8, d.ink, 0.9, false);
  }
}

/** An oak aisle post from above, with its shadow. */
export function aislePost(d: Draw, c: Pt): void {
  const { pen } = d;
  const p = boxPts(c.x - 9, c.y - 9, c.x + 9, c.y + 9, 4);
  pen.fill(p.map((q) => pt(q.x + 18, q.y + 26)), d.ink, 0.15);
  pen.fill(p, PAPER_FILL, 1);
  pen.fill(p, mix(OAK, '#6a5038', 0.3), 0.9);
  pen.crescent(p, pt(-3, -4), () => pen.fill(p, d.ink, 0.3));
  pen.hair([pt(c.x - 5, c.y - 3), pt(c.x + 4, c.y - 2)], 0.4, d.ink, 0.5);
  pen.stroke(closed(p), 1, d.ink, 0.9, false);
}

/** The hay loft over an aisle, x0..x1 × y0..y1: its boarded floor, its edge beam, hay heaped and bales stacked on it, and its shadow below. */
export function loft(d: Draw, x0: number, x1: number, y0: number, y1: number, rng: Rng): void {
  const { pen } = d;
  const floor = boxPts(x0, y0, x1, y1, 12);
  pen.fill(floor.map((p) => pt(p.x + 22, p.y + 32)), d.ink, 0.2);
  pen.fill(floor, PAPER_FILL, 1);
  pen.fill(floor, mix(OAK, '#d8c0a0', 0.3), 0.7);
  for (let y = y0 + 11; y < y1 - 4; y += 11) pen.hair([pt(x0 + 2, y), pt(x1 - 2, y + (rng() - 0.5))], 0.45, d.ink, 0.45);
  hayHeap(d, pt(x0 + (x1 - x0) * 0.55, y0 + (y1 - y0) * 0.35), Math.min(70, (x1 - x0) * 0.42), rng);
  for (let k = 0; k < 4; k++) bale(d, pt(x0 + 26 + (k % 2) * 36, y1 - 40 - Math.floor(k / 2) * 20), 34, 18, (rng() - 0.5) * 0.1, rng, 0.1);
  const edge = boxPts(x0 - 2, y1 - 6, x1, y1 + 2, 12);
  pen.fill(edge, mix(OAK, d.ink, 0.2), 0.9);
  pen.stroke(closed(edge), 0.9, d.ink, 0.9, false);
  pen.stroke(closed(floor), 1.1, d.ink, 0.85, false);
}

/** The loft ladder: from its foot on the floor up to the loft's edge. */
export function loftLadder(d: Draw, foot: Pt, top: Pt): void {
  ladder(d, foot, top);
}
