import type { Rng } from '../../logic/rng';
import { closed, type Draw, oval, pt } from '../kit';
import { PAPER_FILL, STONE, STONE_DARK } from '../palette';
import { mix } from '../wash';
import { boxPts } from './band';
import { DOOR_OPEN, FRAME, GLASS, WALL } from './greenhouseKit';

/**
 * The glasshouse's walls: the long side walls as on a plan (a low brick
 * wall, the white sill, the eaves' glass leaning in over the benches), and
 * the two end walls drawn a little from the front, like the garden wall,
 * so the doors the groove passes through stand up as thresholds: a brick
 * plinth, tall panes in white glazing bars, door posts, and the glazed door
 * swung back against the wall.
 */
const BRICK = '#b9765a';
/** The end wall's courses, from its foot up: brick plinth, sill, panes, top rail. */
const PLINTH = 16;
const SILL = 4;
const PANES = 32;
const RAIL = 5;
const BAR_GAP = 30;
const POST = 10;

/**
 * A stretch of the low side wall along x from y0 to y1 (y0 < y1). `out` is
 * the side the garden is on (-1 left, 1 right).
 */
export function sideWall(d: Draw, x: number, y0: number, y1: number, out: 1 | -1, rng: Rng): void {
  const { pen } = d;
  const inner = x - (out * WALL) / 2;
  const outer = x + (out * WALL) / 2;
  const [wx0, wx1] = [Math.min(inner, outer), Math.max(inner, outer)];
  pen.fill(boxPts(wx0 + 6, y0 + 9, wx1 + 8, y1 + 9, 16), d.ink, 0.13);
  const wall = boxPts(wx0, y0, wx1, y1, 16);
  pen.fill(wall, PAPER_FILL, 1);
  pen.fill(wall, BRICK, 0.55);
  for (let y = y0 + 4 + rng() * 5; y < y1 - 2; y += 9) pen.hair([pt(wx0 + 1, y), pt(wx1 - 1, y)], 0.4, d.ink, 0.3);
  // The eaves' glass leaning in over the benches, its bars across it.
  const edge = inner - out * 30;
  const glass = boxPts(Math.min(inner, edge), y0, Math.max(inner, edge), y1, 16);
  pen.fill(glass, GLASS, 0.42);
  pen.fill(boxPts(Math.min(inner, edge), y0, Math.max(inner, edge), y1, 16).map((p) => pt(p.x + (p.x === edge ? -out * 18 : 0), p.y)), PAPER_FILL, 0.12);
  const first = y0 + (BAR_GAP * 2 - (((y0 % (BAR_GAP * 2)) + BAR_GAP * 2) % (BAR_GAP * 2)));
  for (let y = first; y < y1; y += BAR_GAP * 2) {
    pen.hair([pt(inner, y), pt(edge, y)], 1.8, FRAME, 0.95);
    pen.hair([pt(inner, y + 1.4), pt(edge, y + 1.4)], 0.4, d.ink, 0.45);
  }
  if (rng() < 0.6 && y1 - y0 > 150) {
    const gy = y0 + 20 + rng() * Math.max(10, y1 - y0 - 120);
    pen.fill([pt(inner - out * 4, gy), pt(edge + out * 3, gy + 16), pt(edge + out * 3, gy + 70), pt(inner - out * 4, gy + 54)], PAPER_FILL, 0.45);
  }
  pen.stroke([pt(inner, y0), pt(inner, y1)], 2.6, FRAME, 1, false);
  pen.hair([pt(inner - out * 1.7, y0), pt(inner - out * 1.7, y1)], 0.55, d.ink, 0.6);
  pen.hair([pt(edge, y0), pt(edge, y1)], 0.6, d.ink, 0.4);
  pen.stroke([pt(outer, y0), pt(outer, y1)], 1.15, d.ink, 0.85, false);
  pen.stroke([pt(outer + out * 5, y0), pt(outer + out * 5, y1)], 1.8, '#5d5a62', 0.4, false);
}

/** One stretch of end wall x0..x1, its foot at y + PLINTH: plinth, sill, panes and their bars, top rail. */
function frontStretch(d: Draw, x0: number, x1: number, y: number, rng: Rng): void {
  const { pen } = d;
  const top = y - SILL - PANES - RAIL;
  pen.fill(boxPts(x0 + 4, y + PLINTH - 2, x1 + 7, y + PLINTH + 9, 30), d.ink, 0.11);
  const plinth = boxPts(x0, y, x1, y + PLINTH, 20);
  pen.fill(plinth, PAPER_FILL, 1);
  pen.fill(plinth, BRICK, 0.55);
  pen.fill(plinth, d.ink, 0.06);
  pen.hair([pt(x0 + 1, y + PLINTH / 2), pt(x1 - 1, y + PLINTH / 2)], 0.4, d.ink, 0.3);
  for (let x = x0 + rng() * 12; x < x1 - 4; x += 22) {
    pen.hair([pt(x, y + 1), pt(x, y + PLINTH / 2 - 1)], 0.4, d.ink, 0.3);
    if (x + 11 < x1 - 2) pen.hair([pt(x + 11, y + PLINTH / 2 + 1), pt(x + 11, y + PLINTH - 1)], 0.4, d.ink, 0.3);
  }
  const panes = boxPts(x0, y - SILL - PANES, x1, y - SILL, 20);
  pen.fill(panes, PAPER_FILL, 0.75);
  pen.fill(panes, GLASS, 0.55);
  // Glare running across a few panes.
  for (let x = x0 + 20 + rng() * 40; x < x1 - 30; x += 90 + rng() * 80) {
    pen.fill([pt(x, y - SILL - 2), pt(x + 12, y - SILL - PANES + 2), pt(x + 22, y - SILL - PANES + 2), pt(x + 10, y - SILL - 2)], PAPER_FILL, 0.55);
  }
  for (let x = x0 + BAR_GAP - (((x0 % BAR_GAP) + BAR_GAP) % BAR_GAP); x < x1 - 2; x += BAR_GAP) {
    pen.hair([pt(x, y - SILL - PANES), pt(x, y - SILL)], 2.2, FRAME, 1);
    pen.hair([pt(x + 1.5, y - SILL - PANES + 1), pt(x + 1.5, y - SILL)], 0.4, d.ink, 0.5);
  }
  for (const [ya, yb] of [[y - SILL, y], [top, top + RAIL]] as const) {
    const s = boxPts(x0, ya, x1, yb, 20);
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, FRAME, 1);
    pen.fill(s, STONE, 0.12);
    pen.stroke(closed(s), 0.7, d.ink, 0.8, false);
  }
  pen.stroke([pt(x0, y + PLINTH), pt((x0 + x1) / 2, y + PLINTH + 0.6), pt(x1, y + PLINTH)], 1.2, d.ink, 0.85, false);
  for (const x of [x0, x1]) pen.hair([pt(x, top), pt(x, y + PLINTH)], 0.8, d.ink, 0.8);
}

/** A white door post standing beside the opening, its cap a little proud. */
function doorPost(d: Draw, x0: number, y: number): void {
  const { pen } = d;
  const top = y - SILL - PANES - RAIL - 6;
  const post = boxPts(x0, top, x0 + POST, y + PLINTH + 2, 6);
  pen.fill(boxPts(x0 + 4, y + PLINTH, x0 + POST + 8, y + PLINTH + 9, 6), d.ink, 0.14);
  pen.fill(post, PAPER_FILL, 1);
  pen.fill(post, FRAME, 1);
  pen.crescent(post, pt(-2.5, 0), () => pen.fill(post, STONE_DARK, 0.35));
  pen.stroke(closed(post), 0.9, d.ink, 0.9, false);
  const ball = oval(x0 + POST / 2, top - 3, 5, 5, 12);
  pen.fill(ball, FRAME, 1);
  pen.crescent(ball, pt(-1.5, -2), () => pen.fill(ball, STONE_DARK, 0.4));
  pen.hair(closed(ball), 0.7, d.ink, 0.85);
}

/** The glazed door standing open against the wall left of the opening: white frame, six panes, a kick panel, its shadow on the wall. */
function glazedDoor(d: Draw, x1: number, y: number): void {
  const { pen } = d;
  const w = 2 * DOOR_OPEN - 4;
  const x0 = x1 - w;
  const top = y - SILL - PANES - RAIL - 2;
  const foot = y + PLINTH - 1;
  const leaf = boxPts(x0, top, x1, foot, 8);
  pen.fill(leaf.map((p) => pt(p.x + 7, p.y + 5)), d.ink, 0.15);
  pen.fill(leaf, PAPER_FILL, 1);
  pen.fill(leaf, FRAME, 1);
  const kick = boxPts(x0 + 5, foot - 15, x1 - 5, foot - 4, 8);
  pen.fill(kick, mix(FRAME, STONE, 0.6), 1);
  pen.hair(closed(kick), 0.5, d.ink, 0.6);
  const ph = (foot - 19 - (top + 5)) / 2;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 3; i++) {
      const px0 = x0 + 5 + (i * (w - 10)) / 3 + 1.5;
      const px1 = x0 + 5 + ((i + 1) * (w - 10)) / 3 - 1.5;
      const pane = boxPts(px0, top + 5 + j * ph + 1.5, px1, top + 5 + (j + 1) * ph - 1.5, 6);
      pen.fill(pane, GLASS, 0.75);
      if (i === 1) pen.fill([pt(px0 + 3, top + 5 + (j + 1) * ph - 3), pt(px0 + 8, top + 5 + j * ph + 3), pt(px0 + 12, top + 5 + j * ph + 3), pt(px0 + 7, top + 5 + (j + 1) * ph - 3)], PAPER_FILL, 0.7);
      pen.hair(closed(pane), 0.45, d.ink, 0.6);
    }
  }
  pen.stroke(closed(leaf), 0.95, d.ink, 0.9, false);
  pen.dot(x0 + 6, (top + foot) / 2 + 4, 1.8, '#a08a4a', 1);
  for (const yy of [top + 8, foot - 8]) pen.stroke([pt(x1 + 4, yy), pt(x1 - 14, yy)], 1.8, '#3a3a40', 0.8, false);
}

/**
 * An end wall across x0..x1 at y (its plinth's top), drawn a little from
 * the front: the doorway on doorX, a white post either side, the glazed
 * door swung back against the wall to the left.
 */
export function glassFront(d: Draw, y: number, x0: number, x1: number, doorX: number, rng: Rng): void {
  const a = doorX - DOOR_OPEN;
  const b = doorX + DOOR_OPEN;
  for (const [s, e] of [[x0, a - POST], [b + POST, x1]] as const) {
    for (let x = s; x < e - 2; x += 220) frontStretch(d, x, Math.min(e, x + 220), y, rng);
  }
  doorPost(d, a - POST, y);
  doorPost(d, b, y);
  glazedDoor(d, a - POST - 2, y);
}
