import { edges } from './backdrop/common';
import { bezier, cub, type Draw, lerp, makeDraw, oval, pt, skin, tube } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import type { DeckKind } from '../logic/decks';
import { createRng, type Rng } from '../logic/rng';

/**
 * Monsoon Harbour's wooden floors, side-on: a vallam drawn up keel-up on
 * trestles, the plank floor of a stilt house with its cadjan hut, and a
 * fish-drying rack under a thrown net. The deck row is always a hard,
 * heavily inked band of wood; everything under it is thin posts and legs
 * over a soft shadow, so the shelter beneath reads as open.
 */
/** Tiles drawn past each end of a deck (a boat's upswept ends, bracing, a ladder). */
export const DECK_OVERHANG = 1.5;
/** Tiles drawn above the deck row (the hut's walls and roof, a boat's raised ends). */
export const DECK_HEADROOM = 5;

const TAR = '#4a3628';
const WOOD = '#b98e62';
const WOOD_DARK = '#7a5a3c';
const COCO = '#8a6a48';
const BAMBOO = '#c9b06a';
const CADJAN = '#c9a865';
const THATCH = '#b8955a';
const THATCH_DARK = '#80643a';
const CLAY = '#b8613f';
const DOORWAY = '#3e322a';
const CLOTH = '#3f5f8f';
const FISH = '#9fb0b6';
const FLOAT = '#e8862e';
/** A vallam's paint, bottom to gunwale: a pinstripe, the broad band, a second stripe and the rubbing strake. */
const PAINTS: readonly (readonly string[])[] = [
  ['#f4f1ea', '#2f6fb0', '#f4f1ea', '#c4483a', '#3f8f5a'],
  ['#f2d64b', '#3f8f5a', '#f4f1ea', '#2f6fb0', '#c4483a'],
  ['#f4f1ea', '#c4483a', '#f2d64b', '#2f6fb0', '#f4f1ea'],
];
const NETS = ['#2f7f8f', '#3b6fa3', '#4f8f5a'];

/** Where a deck is drawn: its ends, the wood row's top and bottom, the sand under it. */
interface Site {
  readonly d: Draw;
  readonly rng: Rng;
  readonly T: number;
  readonly x0: number;
  readonly x1: number;
  readonly top: number;
  readonly bot: number;
  readonly ground: (x: number) => number;
}

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];

/** Evenly spaced x across [a, b], `n` steps. */
const across = (a: number, b: number, n: number): number[] => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/** A straight-sided shape washed over paper and inked as a ruled line drawn freehand. */
function board(s: Site, shape: readonly Pt[], wash: string, alpha = 0.75, w = 0.7): void {
  skin(s.d, shape, wash, alpha);
  s.d.pen.stroke(edges(shape), w, s.d.ink, 0.9, false);
}

/** Paper and a wash printed in register: for poles too thin, and edges too important, to show a misprint. */
function solid(s: Site, shape: readonly Pt[], wash: string, alpha: number): void {
  s.d.pen.fill(shape, PAPER_FILL, 1);
  s.d.pen.fill(shape, wash, alpha);
}

/** A round pole from a to b: bamboo with nodes, or a coconut-wood post with growth rings. */
function pole(s: Site, a: Pt, b: Pt, w: number, wash: string, ring: number): void {
  const shape = tube([a, lerp(a, b, 0.5), b], w, w * 1.1);
  solid(s, shape, wash, 0.85);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  // Its shadow side: the side turned down and right, away from the light.
  const flip = (a.y - b.y) * 0.55 + (b.x - a.x) * 0.84 < 0 ? -1 : 1;
  const away = pt((flip * (a.y - b.y) * w * 0.3) / len, (flip * (b.x - a.x) * w * 0.3) / len);
  s.d.pen.clipped(shape, () => s.d.pen.fill(tube([a, b], w * 0.45, w * 0.5).map((p) => pt(p.x + away.x, p.y + away.y)), s.d.ink, 0.2));
  s.d.pen.hair([pt(a.x - away.x * 0.9, a.y - away.y * 0.9), pt(b.x - away.x * 0.9, b.y - away.y * 0.9)], w * 0.18, PAPER_FILL, 0.7);
  for (let k = ring * 0.6; k < len - ring * 0.3; k += ring) {
    const c = lerp(a, b, k / len);
    const n = pt(((b.y - a.y) / len) * w * 0.5, (-(b.x - a.x) / len) * w * 0.5);
    s.d.pen.hair([pt(c.x - n.x, c.y - n.y), pt(c.x + n.x, c.y + n.y)], 0.4, s.d.ink, 0.6);
  }
  s.d.pen.stroke(edges(shape, 1.5), 0.55, s.d.ink, 0.85, false);
}

/** A soft shadow cast on the sand under the floor, falling right, away from the light. */
function shelter(s: Site): void {
  const { d, T, x0, x1 } = s;
  for (const [grow, alpha] of [[0.55, 0.07], [0.15, 0.1]] as const) {
    const sx = across(x0 - grow * T + 0.3 * T, x1 + grow * T + 0.3 * T, 24);
    const thick = (i: number): number => Math.sin((Math.PI * i) / 24) ** 0.5;
    const upper = sx.map((x, i) => pt(x, s.ground(x) - 0.12 * T * thick(i)));
    const lower = sx.map((x, i) => pt(x, s.ground(x) + 0.32 * T * thick(i)));
    d.pen.fill([...upper, ...lower.reverse()], d.ink, alpha);
  }
}

/** The lowest gap (px) between the underside of the wood and the sand. */
function gapUnder(s: Site): number {
  return Math.min(...across(s.x0, s.x1, 12).map((x) => s.ground(x) - s.bot));
}

// ── boat ────────────────────────────────────────────────────────────

/** A sawhorse under the hull's gunwale: a cap beam on splayed legs with a stretcher. */
function trestle(s: Site, cx: number, gun: number): void {
  const { T } = s;
  const foot = (dx: number): Pt => pt(cx + dx, s.ground(cx + dx) + 1);
  for (const side of [-1, 1]) pole(s, pt(cx + side * 0.3 * T, gun), foot(side * 0.62 * T), 0.15 * T, COCO, 99);
  const mid = (gun + s.ground(cx)) / 2;
  board(s, rect(cx - 0.45 * T, mid - 0.06 * T, cx + 0.45 * T, mid + 0.06 * T), WOOD_DARK, 0.7, 0.45);
  board(s, rect(cx - 0.6 * T, gun - 0.06 * T, cx + 0.6 * T, gun + 0.16 * T), WOOD, 0.8, 0.6);
}

/**
 * The hull's keel line along the top and its gunwale along the bottom, as matched
 * polylines: flat over the deck, then both drooping down and out past each end to
 * the stem heads, which stop halfway down to the sand. Strakes lerp between them.
 */
function hullLines(s: Site, gun: number): { keel: Pt[]; rim: Pt[] } {
  const { T, x0, x1, top } = s;
  const L = DECK_OVERHANG * T * 0.85;
  const tipY = Math.max(gun + 0.1 * T, s.bot + Math.min(0.5 * gapUnder(s), 1.4 * T));
  const end = (side: 1 | -1, keel: boolean): Pt[] => {
    const at = side < 0 ? x0 : x1;
    const tip = pt(at + side * L, tipY);
    const drop = tipY - top;
    const curve = keel
      ? cub(pt(at, top), pt(at + side * 0.55 * L, top), pt(at + side * 0.95 * L, top + drop * 0.45), tip, 10)
      : cub(pt(at - side * 0.15 * T, gun), pt(at + side * 0.3 * L, gun), pt(at + side * 0.75 * L, tipY - 0.15 * T), tip, 10);
    return side < 0 ? [...curve].reverse() : curve;
  };
  const middle = (y: number, inset: number): Pt[] => across(x0 + inset, x1 - inset, Math.max(2, Math.round((x1 - x0) / 3))).map((x) => pt(x, y));
  return {
    keel: [...end(-1, true), ...middle(top, 0).slice(1, -1), ...end(1, true)],
    rim: [...end(-1, false), ...middle(gun, 0.15 * T).slice(1, -1), ...end(1, false)],
  };
}

/** A painted eye near the bow, to see the way home. */
function boatEye(s: Site, at: Pt): void {
  const { pen } = s.d;
  const r = 0.2 * s.T;
  const eye = [...bezier(pt(at.x - r, at.y), pt(at.x, at.y - r * 0.9), pt(at.x + r, at.y), 6), ...bezier(pt(at.x + r, at.y), pt(at.x, at.y + r * 0.7), pt(at.x - r, at.y), 6).slice(1)];
  pen.fill(eye, PAPER_FILL, 0.95);
  pen.dot(at.x + r * 0.15, at.y, r * 0.38, s.d.ink);
  pen.stroke(eye, 0.45, s.d.ink, 0.9, false);
}

/** A glimpse up into the open hull between the trestles: dark bilge and the ends of the thwarts. */
function interior(s: Site, gun: number): void {
  const { d, T, x0, x1 } = s;
  const xs = across(x0 + 0.5 * T, x1 - 0.5 * T, 16);
  const dark = [...xs.map((x) => pt(x, gun - 0.05 * T)), ...[...xs].reverse().map((x, i) => pt(x, gun + 0.2 * T * Math.sin((Math.PI * (16 - i)) / 16) ** 0.4))];
  d.pen.fill(dark, DOORWAY, 0.8);
  for (let x = x0 + 1.1 * T; x < x1 - 0.8 * T; x += 1.4 * T) {
    const thwart = rect(x, gun - 0.02 * T, x + 0.18 * T, gun + 0.16 * T);
    solid(s, thwart, WOOD_DARK, 0.9);
    d.pen.stroke(edges(thwart, 1), 0.4, d.ink, 0.8, false);
  }
}

function drawBoat(s: Site): void {
  const { d, T, x1, top, bot } = s;
  const gun = bot + Math.min(0.45 * T, gapUnder(s) * 0.4);
  shelter(s);
  const span = x1 - s.x0;
  for (const u of [0.22, 0.78]) trestle(s, s.x0 + span * u, gun);
  const { keel, rim } = hullLines(s, gun);
  const hull = [...keel, ...[...rim].reverse()];
  interior(s, gun);
  // A mooring line from the bow's stem head down to a stake in the sand.
  const bow = keel[keel.length - 1]!;
  const stake = pt(x1 + 1.38 * T, s.ground(x1 + 1.38 * T));
  d.pen.stroke([stake, pt(stake.x + 0.08 * T, stake.y - 0.45 * T)], 1.4, d.ink, 0.85, false);
  d.pen.hair(bezier(bow, pt((bow.x + stake.x) / 2, Math.max(bow.y, stake.y - 0.2 * T)), pt(stake.x + 0.06 * T, stake.y - 0.35 * T), 8), 0.5, d.ink, 0.75);
  solid(s, hull, TAR, 0.85);
  const strake = (k: number): Pt[] => keel.map((p, i) => lerp(p, rim[i]!, k));
  const paints = PAINTS[Math.floor(s.rng() * PAINTS.length)]!;
  const stops = [0.42, 0.48, 0.72, 0.78, 0.88, 1];
  d.pen.clipped(hull, () => {
    paints.forEach((c, k) => d.pen.fill([...strake(stops[k]!), ...strake(stops[k + 1]!).reverse()], c, 0.82));
    // The keel along the top, and the weathered bottom planking under it: tarred, its seams showing pale.
    d.pen.fill([...strake(0), ...strake(0.1).reverse()], WOOD_DARK, 0.8);
    d.pen.hair(strake(0.1), 0.45, d.ink, 0.7);
    for (const k of [0.2, 0.31]) d.pen.hair(strake(k), 0.4, PAPER_FILL, 0.35);
    for (const k of [0.42, 0.88]) d.pen.hair(strake(k), 0.45, d.ink, 0.6);
    for (let x = s.x0 + s.rng() * T; x < x1; x += (0.8 + s.rng()) * T) d.pen.hair([pt(x, top + 0.12 * T), pt(x + 0.02 * T, top + 0.38 * T)], 0.4, d.ink, 0.55);
    d.pen.hatch(hull, 1.5, 0.9, 0.35, { color: d.ink, alpha: 0.28, onlyBelow: bot });
  });
  const band = strake(0.6);
  for (const side of [-1, 1] as const) stemPost(s, side < 0 ? keel.slice(0, 3).reverse() : keel.slice(-3));
  boatName(s, (s.x0 + x1) / 2, band[Math.floor(band.length / 2)]!.y, span);
  const eye = band[band.length - 8]!;
  boatEye(s, eye);
  d.pen.stroke(edges(hull, 1.5), 0.9, d.ink, 1, false);
  // The keel side is the floor: a heavy plank line along it.
  d.pen.stroke(keel.filter((p) => p.x > s.x0 - 0.3 * T && p.x < x1 + 0.3 * T), 1.5, d.ink, 1, false);
}

/** A stem post carrying the keel on past an end, pointing down and out: a stout timber, its head capped. */
function stemPost(s: Site, run: readonly Pt[]): void {
  const { T } = s;
  const tip = run[run.length - 1]!;
  const prev = run[0]!;
  const len = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1;
  const dir = pt((tip.x - prev.x) / len, (tip.y - prev.y) / len);
  const head = pt(tip.x + dir.x * 0.22 * T, tip.y + dir.y * 0.22 * T);
  const post = tube([pt(tip.x - dir.x * 0.5 * T, tip.y - dir.y * 0.5 * T), tip, head], 0.2 * T, 0.16 * T);
  solid(s, post, WOOD_DARK, 0.85);
  s.d.pen.stroke([...post, post[0]!], 0.7, s.d.ink, 1, false);
  s.d.pen.fill(oval(head.x, head.y, 0.09 * T, 0.09 * T, 10), '#3f8f5a', 0.9);
}

/** The boat's name in white loops along its band, more a flourish than letters. */
function boatName(s: Site, cx: number, y: number, span: number): void {
  const n = Math.min(5, Math.floor(span / s.T) + 1);
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * 0.32 * s.T;
    const r = 0.08 * s.T;
    s.d.pen.hair([pt(x - r, y + r), ...oval(x, y, r, r * 1.1, 8).slice(2), pt(x + r * 1.4, y + r * 0.9)], 0.4, PAPER_FILL, 0.85);
  }
}

// ── house ───────────────────────────────────────────────────────────

/** Stilts of coconut wood under the floor, braced with bamboo where there's room. */
function stilts(s: Site): void {
  const { T, x0, x1, bot } = s;
  const n = Math.max(1, Math.ceil((x1 - x0 - 0.6 * T) / (2.6 * T)));
  const xs = across(x0 + 0.3 * T, x1 - 0.3 * T, n);
  const tall = gapUnder(s) > 1.4 * T;
  xs.slice(1).forEach((xb, i) => {
    const xa = xs[i]!;
    if (tall) {
      pole(s, pt(xa, bot + 0.15 * T), pt(xb, s.ground(xb) - 0.3 * T), 0.1 * T, BAMBOO, 0.7 * T);
      pole(s, pt(xb, bot + 0.15 * T), pt(xa, s.ground(xa) - 0.3 * T), 0.1 * T, BAMBOO, 0.7 * T);
    } else {
      pole(s, pt(xa, bot + 0.55 * T), pt(xa + 0.5 * T, bot), 0.09 * T, BAMBOO, 99);
      pole(s, pt(xb, bot + 0.55 * T), pt(xb - 0.5 * T, bot), 0.09 * T, BAMBOO, 99);
    }
  });
  for (const x of xs) pole(s, pt(x, bot - 0.1 * T), pt(x + (s.rng() - 0.5) * 0.08 * T, s.ground(x) + 0.2 * T), 0.3 * T, COCO, 0.32 * T);
}

/** The floor: boards laid across on a bearer, joist ends showing, its top inked hard. */
function floor(s: Site): void {
  const { d, T, x0, x1, top, bot } = s;
  const boards = rect(x0 - 0.12 * T, top, x1 + 0.12 * T, top + 0.38 * T);
  board(s, rect(x0, top + 0.38 * T, x1, bot), COCO, 0.8);
  for (let x = x0 + 0.35 * T; x < x1; x += 0.9 * T) board(s, rect(x, top + 0.42 * T, x + 0.24 * T, top + 0.68 * T), WOOD, 0.85, 0.45);
  d.pen.hatch(rect(x0, top + 0.7 * T, x1, bot), 1.4, 0.9, 0.35, { color: d.ink, alpha: 0.3 });
  board(s, boards, WOOD, 0.8);
  for (let x = x0 + s.rng() * 0.8 * T; x < x1; x += (0.7 + s.rng() * 0.9) * T) d.pen.hair([pt(x, top + 0.04 * T), pt(x, top + 0.34 * T)], 0.4, d.ink, 0.65);
  d.pen.stroke([pt(x0 - 0.14 * T, top), pt(x1 + 0.14 * T, top)], 1.5, d.ink, 1, false);
}

/** Walls of woven palm-leaf (cadjan) panels on a pole frame, with a doorway and maybe a barred window. */
function walls(s: Site, hx0: number, hx1: number, eave: number): void {
  const { d, T, top } = s;
  const wall = rect(hx0, eave, hx1, top);
  skin(d, wall, CADJAN, 0.75);
  d.pen.clipped(wall, () => {
    d.pen.hatch(wall, 1.3, 0.85, 0.3, { color: d.ink, alpha: 0.22 });
    d.pen.hatch(wall, 1.3, -0.85, 0.3, { color: d.ink, alpha: 0.18 });
    for (let y = eave + 0.55 * T; y < top; y += 0.6 * T) d.pen.hair([pt(hx0, y), pt(hx1, y)], 0.5, WOOD_DARK, 0.8);
    d.pen.fill(rect(hx0, eave, hx1, eave + 0.35 * T), d.ink, 0.14);
  });
  for (const x of [hx0, hx1]) board(s, rect(x - 0.08 * T, eave, x + 0.08 * T, top), COCO, 0.85, 0.5);
  const door = hx0 + 0.3 * T + s.rng() * Math.max(0, hx1 - hx0 - 1.3 * T);
  board(s, rect(door, top - 1.55 * T, door + 0.62 * T, top), DOORWAY, 0.88, 0.7);
  // A cloth hung across half the doorway, in folds.
  const cloth = rect(door + 0.04 * T, top - 1.5 * T, door + 0.3 * T, top - 0.35 * T);
  d.pen.fill(cloth, CLOTH, 0.75);
  for (const k of [0.1, 0.18]) d.pen.hair([pt(door + k * T, top - 1.5 * T), pt(door + k * T + 0.03 * T, top - 0.4 * T)], 0.4, d.ink, 0.6);
  if (hx1 - door - 0.62 * T > 1.1 * T) {
    const wx = door + 0.62 * T + (hx1 - door - 0.62 * T) / 2 - 0.25 * T;
    board(s, rect(wx, top - 1.6 * T, wx + 0.5 * T, top - 1.1 * T), DOORWAY, 0.8, 0.6);
    for (const k of [0.17, 0.33]) d.pen.stroke([pt(wx + k * T, top - 1.6 * T), pt(wx + k * T, top - 1.1 * T)], 0.9, BAMBOO, 1, false);
  }
}

/** A steep hipped roof seen from the long side, in palm thatch or Mangalore clay tiles. */
function roof(s: Site, hx0: number, hx1: number, eave: number): void {
  const { d, T } = s;
  // A narrow hut gets a lower roof, so it never stands like a tower.
  const ridge = Math.max(s.top - (DECK_HEADROOM - 0.2) * T, eave - 0.45 * (hx1 - hx0) - 0.5 * T);
  const inset = Math.min((hx1 - hx0) / 2 - 0.15 * T, 1.1 * T);
  const shape = [pt(hx0 - 0.45 * T, eave + 0.2 * T), pt(hx1 + 0.45 * T, eave + 0.2 * T), pt(hx1 - inset, ridge), pt(hx0 + inset, ridge)];
  const tiled = s.rng() < 0.5;
  skin(d, shape, tiled ? CLAY : THATCH, 0.8);
  d.pen.clipped(shape, () => {
    const step = (tiled ? 0.3 : 0.38) * T;
    for (let y = eave + 0.2 * T - step, row = 0; y > ridge; y -= step, row++) {
      d.pen.hair([pt(hx0 - T, y), pt(hx1 + T, y)], 0.45, d.ink, tiled ? 0.6 : 0.4);
      for (let x = hx0 - T + (row % 2) * step * 0.6; x < hx1 + T; x += step * (tiled ? 1.1 : 0.45)) {
        d.pen.hair(tiled ? [pt(x, y), pt(x, y + step * 0.9)] : [pt(x, y + step * 0.1), pt(x + step * 0.25, y + step)], 0.35, d.ink, tiled ? 0.5 : 0.35);
      }
    }
    // The side away from the light, glazed darker and hatched.
    const back = [pt(hx1 - inset - 0.4 * T, ridge), pt(hx1 + T, ridge), pt(hx1 + T, eave + T), pt(hx1 - 0.2 * T, eave + T)];
    d.pen.fill(back, tiled ? '#7a3a28' : THATCH_DARK, 0.3);
    d.pen.hatch(back, 1.3, 0.9, 0.35, { color: d.ink, alpha: 0.35 });
  });
  d.pen.stroke(edges(shape, 1.5), 0.85, d.ink, 1, false);
  board(s, rect(hx0 + inset - 0.1 * T, ridge - 0.12 * T, hx1 - inset + 0.1 * T, ridge + 0.06 * T), tiled ? '#7a3a28' : THATCH_DARK, 0.8, 0.6);
  if (!tiled) {
    const fringe = across(hx0 - 0.45 * T, hx1 + 0.45 * T, Math.round((hx1 - hx0 + 0.9 * T) / 1.3)).map((x, k) => pt(x, eave + (k % 2 ? 0.32 : 0.2) * T));
    d.pen.hair(fringe, 0.5, d.ink, 0.8);
  }
}

/** A bamboo ladder leaning on one end of the floor, down to the sand. */
function ladder(s: Site, side: 1 | -1): void {
  const { T } = s;
  const edge = side < 0 ? s.x0 : s.x1;
  const head = pt(edge + side * 0.05 * T, s.top - 0.3 * T);
  const footX = edge + side * 1.15 * T;
  const foot = pt(footX, s.ground(footX) + 0.1 * T);
  const rails = [0, 0.38 * T].map((dx) => [pt(head.x + side * dx * 0.6, head.y), pt(foot.x + side * dx, foot.y)] as const);
  const len = Math.hypot(foot.x - head.x, foot.y - head.y);
  for (let k = 0.45 * T; k < len - 0.2 * T; k += 0.42 * T) {
    const u = k / len;
    s.d.pen.stroke([lerp(rails[0]![0], rails[0]![1], u), lerp(rails[1]![0], rails[1]![1], u)], 1.2, s.d.ink, 0.85, false);
  }
  for (const [a, b] of rails) pole(s, a, b, 0.1 * T, BAMBOO, 0.8 * T);
}

function drawHouse(s: Site): void {
  const { T, x0, x1 } = s;
  shelter(s);
  stilts(s);
  const hutW = Math.min(x1 - x0 - 0.7 * T, 6 * T);
  const hx0 = x0 + 0.35 * T + s.rng() * (x1 - x0 - 0.7 * T - hutW);
  const eave = s.top - 2.3 * T;
  walls(s, hx0, hx0 + hutW, eave);
  roof(s, hx0, hx0 + hutW, eave);
  floor(s);
  ladder(s, s.rng() < 0.5 ? -1 : 1);
}

// ── rack ────────────────────────────────────────────────────────────

/** A pair of bamboo legs crossed under the platform, lashed where they cross, their tops standing proud. */
function crossedLegs(s: Site, cx: number): void {
  const { T, top } = s;
  for (const side of [-1, 1]) {
    const footX = cx + side * 0.55 * T;
    pole(s, pt(footX, s.ground(footX) + 1), pt(cx - side * 0.25 * T, top - 0.45 * T), 0.14 * T, BAMBOO, 0.9 * T);
  }
  // Where the legs cross: 0.55 of their 0.8-tile lean from the feet.
  const g = s.ground(cx);
  const y = g + (top - 0.45 * T - g) * (0.55 / 0.8);
  for (let k = -1; k <= 1; k++) s.d.pen.hair([pt(cx - 0.12 * T, y + k * 0.06 * T - 0.04 * T), pt(cx + 0.12 * T, y + k * 0.06 * T + 0.04 * T)], 0.45, s.d.ink, 0.8);
}

/** The platform: a mat of split-bamboo slats on two rails, top inked hard. */
function slats(s: Site): void {
  const { d, T, x0, x1, top, bot } = s;
  pole(s, pt(x0 - 0.2 * T, bot - 0.2 * T), pt(x1 + 0.2 * T, bot - 0.2 * T), 0.2 * T, BAMBOO, 1.3 * T);
  pole(s, pt(x0 - 0.35 * T, top + 0.42 * T), pt(x1 + 0.35 * T, top + 0.42 * T), 0.28 * T, BAMBOO, 1.6 * T);
  const mat = rect(x0 - 0.1 * T, top, x1 + 0.1 * T, top + 0.25 * T);
  skin(d, mat, '#ddc98a', 0.8);
  for (let x = x0; x < x1; x += 0.2 * T) d.pen.hair([pt(x, top + 0.03 * T), pt(x, top + 0.23 * T)], 0.35, d.ink, 0.5);
  d.pen.stroke(edges(mat, 1.5), 0.7, d.ink, 0.9, false);
  d.pen.stroke([pt(x0 - 0.12 * T, top), pt(x1 + 0.12 * T, top)], 1.5, d.ink, 1, false);
}

/** The net's outline: lying on the platform, folded over each end and hanging, its hem in swags along the front. */
function netShape(s: Site): { shape: Pt[]; hem: Pt[] } {
  const { T, x0, x1, top, bot } = s;
  const low = (x: number): number => Math.min(s.ground(x) - 0.3 * T, bot + 1.7 * T);
  const outL = pt(x0 - 0.65 * T, low(x0 - 0.65 * T));
  const outR = pt(x1 + 0.6 * T, low(x1 + 0.6 * T) - 0.2 * T);
  const front: Pt[] = [];
  const n = Math.max(1, Math.round((x1 - x0) / (1.3 * T)));
  across(x1 - 0.3 * T, x0 + 0.3 * T, n).forEach((x, i, xs) => {
    if (i === 0) return;
    const a = xs[i - 1]!;
    front.push(...bezier(pt(a, bot + 0.1 * T), pt((a + x) / 2, bot + (0.5 + s.rng() * 0.3) * T), pt(x, bot + 0.1 * T), 6).slice(1));
  });
  const hem = [outR, ...bezier(outR, pt(x1 + 0.1 * T, outR.y), pt(x1 - 0.3 * T, bot + 0.1 * T), 6).slice(1), ...front, ...bezier(pt(x0 + 0.3 * T, bot + 0.1 * T), pt(x0 - 0.2 * T, outL.y + 0.1 * T), outL, 6).slice(1)];
  const over = [...cub(outL, pt(x0 - 0.5 * T, top + 0.6 * T), pt(x0 - 0.3 * T, top - 0.1 * T), pt(x0, top - 0.08 * T), 8), ...cub(pt(x1, top - 0.08 * T), pt(x1 + 0.3 * T, top - 0.1 * T), pt(x1 + 0.55 * T, top + 0.6 * T), outR, 8)];
  return { shape: [...over, ...hem.slice(1)], hem };
}

/** A light mesh over a shape, so whatever is behind or under it still shows. */
function mesh(s: Site, shape: readonly Pt[], color: string): void {
  s.d.pen.fill(shape, color, 0.16);
  s.d.pen.hatch(shape, 0.24 * s.T, 0.75, 0.35, { color, alpha: 0.75 });
  s.d.pen.hatch(shape, 0.24 * s.T, -0.75, 0.35, { color, alpha: 0.75 });
}

/**
 * A fishing net thrown over the rack: the mesh hangs behind the platform,
 * folds over its ends in front, and its cork line is hung with floats.
 */
function net(s: Site, color: string, front: boolean): void {
  const { d, T, x0, x1, top } = s;
  const { shape, hem } = netShape(s);
  if (!front) {
    mesh(s, shape, color);
    return;
  }
  for (const fold of [rect(x0 - T, top - 0.3 * T, x0 + 0.4 * T, top + 3 * T), rect(x1 - 0.4 * T, top - 0.3 * T, x1 + T, top + 3 * T)]) d.pen.clipped(fold, () => mesh(s, shape, color));
  d.pen.stroke(across(x0 - 0.05 * T, x1 + 0.05 * T, 12).map((x) => pt(x, top - 0.05 * T)), 0.6, color, 0.9, false);
  d.pen.stroke(hem, 0.7, color, 0.95, false);
  d.pen.hair(hem, 0.35, d.ink, 0.5);
  for (const k of [0.04, 0.55 + s.rng() * 0.2, 0.97]) {
    const p = hem[Math.floor(k * (hem.length - 1))]!;
    const float = oval(p.x, p.y + 0.06 * T, 0.16 * T, 0.12 * T, 12);
    solid(s, float, FLOAT, 0.9);
    d.pen.stroke([...float, float[0]!], 0.5, d.ink, 0.9, false);
  }
}

/** Little fish (sardines, mackerel) laid head to tail on top to dry, silver with darker backs. */
function fish(s: Site): void {
  const { d, T, x0, x1, top } = s;
  for (let x = x0 + 0.3 * T; x < x1 - 0.2 * T; x += (0.48 + s.rng() * 0.15) * T) {
    if (s.rng() < 0.15) continue;
    const dir = s.rng() < 0.5 ? -1 : 1;
    const y = top - 0.08 * T;
    const body = oval(x, y, 0.2 * T, 0.075 * T, 14);
    const tail = [pt(x - dir * 0.15 * T, y), pt(x - dir * 0.32 * T, y - 0.11 * T), pt(x - dir * 0.28 * T, y), pt(x - dir * 0.32 * T, y + 0.1 * T)];
    for (const shape of [tail, body]) {
      solid(s, shape, FISH, 0.85);
      d.pen.stroke([...shape, shape[0]!], 0.4, d.ink, 0.85, false);
    }
    d.pen.clipped(body, () => d.pen.fill(oval(x, y - 0.07 * T, 0.22 * T, 0.05 * T, 12), '#3f5a6a', 0.6));
    d.pen.dot(x + dir * 0.12 * T, y - 0.01 * T, 0.4, d.ink);
  }
}

function drawRack(s: Site): void {
  const { T, x0, x1 } = s;
  shelter(s);
  const n = Math.max(1, Math.ceil((x1 - x0 - 0.7 * T) / (3 * T)));
  for (const cx of across(x0 + 0.35 * T, x1 - 0.35 * T, n)) crossedLegs(s, cx);
  const color = NETS[Math.floor(s.rng() * NETS.length)]!;
  net(s, color, false);
  slats(s);
  net(s, color, true);
  fish(s);
}

const DRAW: Record<DeckKind, (s: Site) => void> = { boat: drawBoat, house: drawHouse, rack: drawRack };

/**
 * Draws a deck `width` tiles long into `ctx` (already scaled to world px; origin at the
 * top-left of the drawing, which starts DECK_OVERHANG tiles left of the deck's first column
 * and DECK_HEADROOM tiles above the deck row). The wood row's top edge is at y = `deckTop`,
 * its bottom at deckTop + tile. `ground(x)` is the canvas y of the sand surface under canvas x
 * (posts and trestles stand on it; it can step by whole tiles). Deterministic for a given seed.
 */
export function drawDeck(ctx: CanvasRenderingContext2D, kind: DeckKind, width: number, tile: number, deckTop: number, ground: (x: number) => number, seed: number): void {
  const x0 = DECK_OVERHANG * tile;
  const site: Site = {
    d: makeDraw(ctx, seed, 0, deckTop + tile),
    rng: createRng(seed * 7 + 3),
    T: tile,
    x0,
    x1: x0 + width * tile,
    top: deckTop,
    bot: deckTop + tile,
    ground,
  };
  DRAW[kind](site);
}
