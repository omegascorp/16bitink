import { type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * Island homes, drawn like an architect's sketch: a timber frame and board
 * cladding, framed glass, and thatch laid in scalloped courses with a
 * ragged eave, a ridge cap and a finial.
 */
const THATCH = '#d9b877';
const THATCH_DARK = '#a8834a';
const TIMBER = '#b98e62';
const CLAD = '#e3cfa6';
const GLASS = '#7fc4cf';
const LEAF = '#5e9a55';

type Place = (dx: number, dy: number) => Pt;

const placer = (x: number, y: number, s: number): Place => (dx, dy) => pt(x + dx * s, y + dy * s);

/** A thatched slope: wash, scalloped courses rising from the eave, straw strokes, a shaded right side, a ragged fringe. */
function thatch(t: Draw, shape: readonly Pt[], eave: number, top: number, s: number): void {
  const { pen } = t;
  const xs = shape.map((p) => p.x);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, THATCH, 0.72);
  pen.clipped(shape, () => {
    const step = 2.1 * s;
    for (let y = eave - step * 0.6, row = 0; y > top; y -= step, row++) {
      const course: Pt[] = [];
      for (let x = x0 - (row % 2) * step * 0.5; x <= x1 + step; x += step) {
        course.push(pt(x, y), pt(x + step * 0.2, y + step * 0.32), pt(x + step * 0.5, y + step * 0.45), pt(x + step * 0.8, y + step * 0.32));
      }
      pen.hair(course, 0.4, t.ink, FAR * 0.55);
    }
    pen.hatch(shape, 1.4 * s, 1.35, 0.35, { color: t.ink, alpha: FAR * 0.3 });
    // Shade on the side away from the light.
    const mid = (x0 + x1) / 2;
    pen.fill([pt(mid + (x1 - mid) * 0.35, top), pt(x1 + 2, eave), pt(x1 + 2, top)], THATCH_DARK, 0.3);
    pen.hatch([pt(mid + (x1 - mid) * 0.4, top), pt(x1 + 2, eave + 1), pt(x1 + 2, top)], 1.1 * s, 0.9, 0.35, { color: t.ink, alpha: FAR * 0.55 });
  });
  pen.stroke(edges(shape), 0.85 * s, t.ink, FAR * 1.1, false);
  const fringe: Pt[] = [];
  for (let x = x0, k = 0; x <= x1; x += 1.4 * s, k++) fringe.push(pt(x, eave + (k % 2 ? 1.4 : 0.2) * s));
  pen.hair(fringe, 0.5, t.ink, FAR * 0.85);
}

/** A ridge cap of bound thatch and a carved finial. */
function ridge(t: Draw, P: Place, half: number, y: number): void {
  const { pen } = t;
  const cap = [P(-half - 0.6, y + 0.8), P(half + 0.6, y + 0.8), P(half, y - 1), P(-half, y - 1)];
  pen.fill(cap, THATCH_DARK, 0.75);
  pen.stroke(edges(cap), 0.6, t.ink, FAR, false);
  for (let k = -half + 1.5; k < half; k += 2.5) pen.hair([P(k, y + 0.7), P(k, y - 0.9)], 0.35, t.ink, FAR * 0.7);
  pen.stroke([P(0, y - 1), P(0, y - 4.5)], 0.7, t.ink, FAR, false);
  pen.fill(oval(P(0, y - 5).x, P(0, y - 5).y, 0.9, 0.9, 8), TIMBER, 0.9);
}

/** Framed sliding doors with sheers drawn to one side and a glint across the glass. */
function glazing(t: Draw, P: Place, x0: number, x1: number, y0: number, y1: number, panels: number): void {
  const { pen } = t;
  const pane = [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
  pen.fill(pane, GLASS, 0.45);
  pen.fill([P(x0, y0), P(x0 + (x1 - x0) * 0.22, y0), P(x0 + (x1 - x0) * 0.18, y1), P(x0, y1)], '#f3e6c8', 0.75);
  for (let k = 0; k < 3; k++) pen.hair([P(x0 + (x1 - x0) * (0.45 + k * 0.12), y0 - 1), P(x0 + (x1 - x0) * (0.3 + k * 0.12), y1 + 1)], 0.4, PAPER_FILL, 0.7);
  for (let k = 1; k < panels; k++) pen.hair([P(x0 + ((x1 - x0) * k) / panels, y0), P(x0 + ((x1 - x0) * k) / panels, y1)], 0.55, t.ink, FAR);
  pen.stroke(edges(pane), 0.7, t.ink, FAR, false);
}

/** A pot plant: a tapered pot under a spray of leaves. */
function potPlant(t: Draw, P: Place, dx: number, floor: number): void {
  const { pen } = t;
  const pot = [P(dx - 1.3, floor), P(dx + 1.3, floor), P(dx + 1.7, floor - 2.2), P(dx - 1.7, floor - 2.2)];
  pen.fill(pot, '#c97b5a', 0.7);
  pen.hair(edges(pot), 0.4, t.ink, FAR);
  for (let k = -2; k <= 2; k++) pen.hair([P(dx, floor - 2.2), P(dx + k * 1.4, floor - 5 + Math.abs(k) * 0.7)], 0.6, LEAF, 0.85);
}

/** A rail on posts between two deck points. */
function railing(t: Draw, P: Place, x0: number, x1: number, floor: number, h: number): void {
  const { pen } = t;
  for (let x = x0; x <= x1 + 0.01; x += 1.8) pen.hair([P(x, floor), P(x, floor - h)], 0.35, t.ink, FAR * 0.85);
  pen.hair([P(x0, floor - h), P(x1, floor - h)], 0.5, t.ink, FAR);
}

/**
 * A water villa: braced piles, a planked deck with a plunge pool or a
 * lounger, board-clad walls on a timber frame, glass doors, a shuttered
 * window, a lantern under the eave, and a thatched roof in one or two tiers.
 */
export function villa(t: Draw, x: number, water: number, s: number, variant = 0): void {
  const { pen } = t;
  const P = placer(x, water, s);
  // Piles with cross-bracing.
  const piles = [-18, -11, -4, 4, 11, 18];
  for (const px of piles) pen.hair([P(px, -8), P(px, 1.5)], 0.85 * s, t.ink, FAR * 0.9);
  for (let i = 0; i < piles.length - 1; i += 2) {
    pen.hair([P(piles[i]!, -7.5), P(piles[i + 1]!, -1.5)], 0.35, t.ink, FAR * 0.6);
    pen.hair([P(piles[i + 1]!, -7.5), P(piles[i]!, -1.5)], 0.35, t.ink, FAR * 0.6);
  }
  // Walls: board cladding between corner posts, under the eave's shadow.
  const walls = [P(-13, -10), P(13, -10), P(13, -23), P(-13, -23)];
  pen.fill(walls, PAPER_FILL, 1);
  pen.fill(walls, CLAD, 0.6);
  pen.clipped(walls, () => {
    for (let dx = -12; dx < 13; dx += 1.6) pen.hair([P(dx, -10), P(dx, -23)], 0.3, t.ink, FAR * 0.35);
    pen.fill([P(-13, -23), P(13, -23), P(13, -20.5), P(-13, -20.5)], t.ink, 0.18);
  });
  for (const px of [-13, 13]) {
    const post = [P(px - 0.8, -10), P(px + 0.8, -10), P(px + 0.8, -23), P(px - 0.8, -23)];
    pen.fill(post, TIMBER, 0.75);
    pen.hair(edges(post), 0.4, t.ink, FAR);
  }
  pen.stroke(edges(walls), 0.7 * s, t.ink, FAR, false);
  glazing(t, P, -9, 4, -10.5, -20, 3);
  // A shuttered window.
  const win = [P(6.5, -14.5), P(11, -14.5), P(11, -19.5), P(6.5, -19.5)];
  pen.fill(win, GLASS, 0.4);
  pen.hair(edges(win), 0.5, t.ink, FAR);
  pen.hair([P(8.75, -14.5), P(8.75, -19.5)], 0.4, t.ink, FAR * 0.8);
  for (const sx of [5.2, 11.2]) {
    const shutter = [P(sx, -14.3), P(sx + 1.6, -14.3), P(sx + 1.6, -19.7), P(sx, -19.7)];
    pen.fill(shutter, TIMBER, 0.6);
    for (let k = 1; k < 5; k++) pen.hair([P(sx, -14.3 - k * 1.1), P(sx + 1.6, -14.3 - k * 1.1)], 0.3, t.ink, FAR * 0.7);
    pen.hair(edges(shutter), 0.35, t.ink, FAR);
  }
  // The deck: planks end-on along its edge.
  const deck = [P(-21, -8), P(21, -8), P(21, -10.4), P(-21, -10.4)];
  pen.fill(deck, PAPER_FILL, 1);
  pen.fill(deck, TIMBER, 0.65);
  for (let dx = -20; dx < 21; dx += 1.6) pen.hair([P(dx, -8.2), P(dx, -10.2)], 0.3, t.ink, FAR * 0.5);
  pen.stroke(edges(deck), 0.7 * s, t.ink, FAR, false);
  potPlant(t, P, 5.6, -10.4);
  // Deck furniture differs from villa to villa.
  if (variant % 2 === 0) {
    const pool = [P(-20.5, -10.4), P(-14.5, -10.4), P(-14.5, -13.2), P(-20.5, -13.2)];
    pen.fill(pool, GLASS, 0.6);
    pen.hair([P(-20.2, -12.6), P(-14.8, -12.6)], 0.5, PAPER_FILL, 0.9);
    pen.hair(edges(pool), 0.5, t.ink, FAR);
    railing(t, P, 14, 20.5, -10.4, 3.6);
    pen.stroke([P(14.5, -11), P(18, -11), P(19.5, -13.5)], 0.8, t.ink, FAR, false);
  } else {
    pen.stroke([P(-20, -11), P(-16.5, -11), P(-15.5, -13.5)], 0.8, t.ink, FAR, false);
    railing(t, P, -20.5, -14, -10.4, 3.6);
    for (const dx of [0, 2.4]) pen.hair([P(17 + dx, -8), P(17 + dx, 1)], 0.45, t.ink, FAR * 0.9);
    for (let dy = -6.5; dy < 1; dy += 2) pen.hair([P(17, dy), P(19.4, dy)], 0.35, t.ink, FAR * 0.8);
  }
  if (variant % 3 === 1) pen.fill([P(15, -13.6), P(18, -13.6), P(18, -11.6), P(15, -11.6)], '#e3907a', 0.6);
  // The roof.
  if (variant % 3 === 2) {
    thatch(t, [P(-19, -21.5), P(19, -21.5), P(5, -38), P(-5, -38)], P(0, -21.5).y, P(0, -38).y, s);
    ridge(t, P, 5, -38);
  } else {
    thatch(t, [P(-19, -21.5), P(19, -21.5), P(12, -28.5), P(-12, -28.5)], P(0, -21.5).y, P(0, -28.5).y, s);
    thatch(t, [P(-13, -27.5), P(13, -27.5), P(6, -35.5), P(-6, -35.5)], P(0, -27.5).y, P(0, -35.5).y, s);
    ridge(t, P, 6, -35.5);
  }
  // A lantern hanging from the eave.
  pen.hair([P(-17, -21), P(-17, -19)], 0.35, t.ink, FAR);
  pen.fill(oval(P(-17, -18.2).x, P(-17, -18.2).y, 0.9 * s, 1.2 * s, 8), '#f0d88a', 0.95);
  pen.hair(edges(oval(P(-17, -18.2).x, P(-17, -18.2).y, 0.9 * s, 1.2 * s, 8)), 0.35, t.ink, FAR);
}

/**
 * A beach bungalow among the palms: short stilts, steps down to the sand,
 * a shiplap front with a panelled door and an open shuttered window, a
 * railed verandah with a bench and a surfboard, under a deep thatched hip.
 */
export function bungalow(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = placer(x, ground, s);
  for (const px of [-23, -9, 9, 25]) pen.stroke([P(px, -6), P(px, 0.5)], 1.1 * s, t.ink, FAR * 0.9, false);
  // Steps from the verandah down to the sand.
  for (let k = 0; k < 3; k++) {
    const tread = [P(27 + k * 2, -5 + k * 2), P(30 + k * 2, -5 + k * 2), P(30 + k * 2, -4 + k * 2), P(27 + k * 2, -4 + k * 2)];
    pen.fill(tread, TIMBER, 0.7);
    pen.hair(edges(tread), 0.4, t.ink, FAR);
  }
  pen.hair([P(27, -6), P(33, 0.5)], 0.5, t.ink, FAR);
  // The front wall: shiplap between posts.
  const wall = [P(-25, -8), P(10, -8), P(10, -28), P(-25, -28)];
  pen.fill(wall, PAPER_FILL, 1);
  pen.fill(wall, CLAD, 0.65);
  pen.clipped(wall, () => {
    for (let dy = -9.5; dy > -28; dy -= 1.8) pen.hair([P(-25, dy), P(10, dy + 0.3)], 0.35, t.ink, FAR * 0.45);
    pen.fill([P(-25, -28), P(10, -28), P(10, -25), P(-25, -25)], t.ink, 0.2);
  });
  pen.stroke(edges(wall), 0.8 * s, t.ink, FAR, false);
  // Window with its shutters swung open.
  const win = [P(-20, -14), P(-12, -14), P(-12, -22), P(-20, -22)];
  pen.fill(win, GLASS, 0.4);
  pen.fill([P(-20, -14), P(-17, -14), P(-17.5, -22), P(-20, -22)], '#f3e6c8', 0.7);
  pen.hair([P(-16, -14), P(-16, -22)], 0.45, t.ink, FAR);
  pen.hair([P(-20, -18), P(-12, -18)], 0.45, t.ink, FAR);
  pen.stroke(edges(win), 0.6, t.ink, FAR, false);
  for (const [a, b] of [[-23.5, -20.2], [-11.8, -8.5]] as const) {
    const shutter = [P(a, -13.6), P(b, -13.6), P(b, -22.4), P(a, -22.4)];
    pen.fill(shutter, '#5f9aa3', 0.55);
    for (let k = 1; k < 7; k++) pen.hair([P(a, -13.6 - k * 1.25), P(b, -13.6 - k * 1.25)], 0.3, t.ink, FAR * 0.7);
    pen.hair(edges(shutter), 0.45, t.ink, FAR);
  }
  // A panelled door with a handle.
  const door = [P(-6, -8), P(2, -8), P(2, -23), P(-6, -23)];
  pen.fill(door, TIMBER, 0.65);
  for (const [y0, y1] of [[-10, -15], [-16.5, -21.5]] as const) pen.hair(edges([P(-4.8, y0), P(0.8, y0), P(0.8, y1), P(-4.8, y1)]), 0.4, t.ink, FAR * 0.8);
  pen.dot(P(1, -15.8).x, P(1, -15.8).y, 0.5 * s, t.ink, FAR * 1.2);
  pen.stroke(edges(door), 0.6, t.ink, FAR, false);
  potPlant(t, P, 5, -8);
  // Floor and the open verandah.
  const floor = [P(-27, -6), P(28, -6), P(28, -8.4), P(-27, -8.4)];
  pen.fill(floor, PAPER_FILL, 1);
  pen.fill(floor, TIMBER, 0.65);
  for (let dx = -26; dx < 28; dx += 1.8) pen.hair([P(dx, -6.2), P(dx, -8.2)], 0.3, t.ink, FAR * 0.5);
  pen.stroke(edges(floor), 0.7 * s, t.ink, FAR, false);
  const bench = [P(13, -11.5), P(21, -11.5), P(21, -12.6), P(13, -12.6)];
  pen.fill(bench, TIMBER, 0.7);
  pen.hair(edges(bench), 0.4, t.ink, FAR);
  for (const bx of [14, 20]) pen.hair([P(bx, -11.5), P(bx, -8.4)], 0.4, t.ink, FAR);
  railing(t, P, 11, 27, -8.4, 5);
  for (const px of [10.5, 27]) {
    const post = [P(px - 0.8, -8.4), P(px + 0.8, -8.4), P(px + 0.8, -28), P(px - 0.8, -28)];
    pen.fill(post, TIMBER, 0.75);
    pen.hair(edges(post), 0.45, t.ink, FAR);
  }
  // A surfboard leaning on the corner post.
  const board = oval(P(30, -14).x, P(30, -14).y, 1.6 * s, 9 * s, 16).map((p) => pt(p.x + (p.y - P(30, -14).y) * -0.15, p.y));
  pen.fill(board, PAPER_FILL, 1);
  pen.fill(board, '#f0d88a', 0.65);
  pen.hair([P(31.3, -22), P(28.7, -6)], 0.6, '#e3907a', 0.8);
  pen.stroke(edges(board), 0.6, t.ink, FAR, false);
  // The roof: a deep hip with a wide overhang, then the ridge.
  thatch(t, [P(-31, -26.5), P(32, -26.5), P(16, -46), P(-15, -46)], P(0, -26.5).y, P(0, -46).y, s);
  ridge(t, P, 15.5, -46);
  pen.hair([P(8, -26), P(8, -24)], 0.35, t.ink, FAR);
  pen.fill(oval(P(8, -23.2).x, P(8, -23.2).y, 0.9 * s, 1.2 * s, 8), '#f0d88a', 0.95);
  // Stepping stones up the sand.
  for (const [dx, dy] of [[38, 1.5], [44, 3], [51, 4]] as const) {
    const stone = oval(P(dx, dy).x, P(dx, dy).y, 2.4 * s, 0.9 * s, 10);
    pen.fill(stone, '#cfc6b4', 0.8);
    pen.hair(edges(stone), 0.4, t.ink, FAR * 0.7);
  }
}
