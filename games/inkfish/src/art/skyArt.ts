import { ellipse, INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

/**
 * What floats on and above the surface: the boats the hooks come from, and
 * clouds. Boats are drawn bow to the right, sitting on their waterline.
 */
export type BoatKind = 'dinghy' | 'skiff' | 'trawler';
export const BOAT_KINDS: readonly BoatKind[] = ['dinghy', 'skiff', 'trawler'];

export interface BoatSpec {
  /** In-game size (textures are ART_RES times larger). */
  readonly w: number;
  readonly h: number;
  /** Waterline, px from the top. */
  readonly waterline: number;
  /** Rod tip in px from the texture's top-left: where the fishing line hangs from. */
  readonly rod: Pt;
}

export const BOAT_SPEC: Readonly<Record<BoatKind, BoatSpec>> = {
  dinghy: { w: 220, h: 140, waterline: 112, rod: { x: 6, y: 44 } },
  skiff: { w: 280, h: 160, waterline: 128, rod: { x: 6, y: 44 } },
  trawler: { w: 360, h: 240, waterline: 200, rod: { x: 8, y: 80 } },
};

const PAPER_FILL = '#fffaf0';
const WOOD = '#8a6a4a';
const PAINT = '#a3342b';
const WATER_WASH = '#2c4f86';

function bez(p0: Pt, c: Pt, p1: Pt, n = 14): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

/** A hull from stern (left) to a raised bow (right), with planking and a wet band below the waterline. */
function hull(pen: Pen, P: (x: number, y: number) => Pt, spec: { left: number; right: number; top: number; bow: number; keel: number; water: number }, color: string): Pt[] {
  const { left, right, top, bow, keel, water } = spec;
  const gunwale = bez(P(left, top), P((left + right) / 2, top + 6), P(right, bow));
  const underside = [
    ...bez(P(right, bow), P(right - 8, keel - 4), P(right - 40, keel)),
    ...bez(P(right - 40, keel), P((left + right) / 2, keel + 3), P(left + 18, keel - 2)),
    ...bez(P(left + 18, keel - 2), P(left + 2, keel - 10), P(left, top)),
  ];
  const shape = [...gunwale, ...underside];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, color, 0.32);
  pen.clipped(shape, () => {
    for (let i = 1; i < 4; i++) {
      const f = i / 4;
      pen.hair(bez(P(left, top + (keel - top) * f), P((left + right) / 2, top + 6 + (keel - top) * f), P(right, bow + (keel - bow) * f)), 0.6 * ART_RES, INK, 0.45);
    }
    // Below the waterline the hull is seen through water.
    const wet = [P(left - 10, water), P(right + 10, water), P(right + 10, keel + 20), P(left - 10, keel + 20)];
    pen.fill(wet, WATER_WASH, 0.28);
  });
  pen.stroke([...shape, shape[0]!], 1.6 * ART_RES, INK, 1, false);
  pen.stroke(gunwale, 2.2 * ART_RES, INK, 1, false);
  return shape;
}

/** A small seated or standing angler holding a rod over the stern. */
function angler(pen: Pen, P: (x: number, y: number) => Pt, at: Pt, standing: boolean, rodTip: Pt): void {
  const s = ART_RES;
  const hip = P(at.x, at.y);
  const shoulder = P(at.x + 3, at.y - (standing ? 40 : 28));
  const head = P(at.x + 2, at.y - (standing ? 50 : 38));
  // Coat, then head with a hat.
  const coat = [P(at.x - 8, at.y), P(at.x - 5, at.y - (standing ? 40 : 28)), P(at.x + 10, at.y - (standing ? 40 : 28)), P(at.x + 12, at.y)];
  pen.fill(coat, '#c9a23a', 0.75);
  pen.stroke([...coat, coat[0]!], 1.2 * s, INK, 1, false);
  if (standing) pen.stroke([hip, P(at.x - 3, at.y + 18)], 1.4 * s, INK, 1, false);
  pen.fill(ellipse(head.x, head.y, 6.5 * s, 7 * s, 14), PAPER_FILL, 1);
  pen.stroke(ellipse(head.x, head.y, 6.5 * s, 7 * s, 14).concat([{ x: head.x + 6.5 * s, y: head.y }]), 1 * s, INK, 1, false);
  const brim = [P(at.x - 9, at.y - (standing ? 54 : 42)), P(at.x + 13, at.y - (standing ? 55 : 43))];
  pen.stroke(brim, 1.6 * s, INK, 1, false);
  const crown = [brim[0]!, P(at.x - 4, at.y - (standing ? 62 : 50)), P(at.x + 8, at.y - (standing ? 62 : 50)), brim[1]!];
  pen.fill(crown, '#c9a23a', 0.8);
  pen.stroke(crown, 1.1 * s, INK, 1, false);
  // Arms out to the rod butt, and the rod bending up to its tip over the stern.
  const hands = P(at.x - 10, at.y - (standing ? 26 : 16));
  pen.stroke([shoulder, hands], 1.3 * s, INK, 1, false);
  const butt = P(at.x + 2, at.y - (standing ? 14 : 6));
  pen.stroke(bez(butt, { x: (butt.x + rodTip.x) / 2, y: Math.min(butt.y, rodTip.y) + 6 * s }, rodTip, 16), 1.3 * s, INK, 1, false);
  pen.dot(hands.x, hands.y, 2 * s, INK);
}

export function drawBoat(ctx: CanvasRenderingContext2D, kind: BoatKind, seed: number): void {
  const pen = new Pen(ctx, seed, 0.6);
  const s = ART_RES;
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const spec = BOAT_SPEC[kind];
  const rod = P(spec.rod.x, spec.rod.y);
  const wl = spec.waterline;
  if (kind === 'dinghy') {
    angler(pen, P, { x: 70, y: wl - 18 }, false, rod);
    hull(pen, P, { left: 30, right: 210, top: wl - 22, bow: wl - 34, keel: wl + 14, water: wl }, WOOD);
    // Oars shipped along the side.
    pen.stroke([P(95, wl - 30), P(170, wl - 12)], 1.4 * s, INK, 1, false);
    pen.fill(ellipse(172 * s, (wl - 11) * s, 9 * s, 3 * s, 10), WOOD, 0.6);
  } else if (kind === 'skiff') {
    angler(pen, P, { x: 76, y: wl - 22 }, true, rod);
    hull(pen, P, { left: 40, right: 270, top: wl - 26, bow: wl - 40, keel: wl + 14, water: wl }, '#5d7d9a');
    // Outboard motor hanging off the stern.
    const motor = [P(22, wl - 40), P(44, wl - 40), P(44, wl - 22), P(36, wl - 20), P(34, wl + 12), P(28, wl + 12), P(26, wl - 20), P(22, wl - 22)];
    pen.fill(motor, '#3a3a40', 0.75);
    pen.stroke([...motor, motor[0]!], 1.2 * s, INK, 1, false);
    pen.hair([P(140, wl - 30), P(250, wl - 36)], 1 * s, PAINT, 0.8);
  } else {
    // Wheelhouse, mast and a long outrigger rod off the stern.
    const house = [P(190, wl - 30), P(196, wl - 92), P(282, wl - 92), P(292, wl - 30)];
    pen.fill(house, PAPER_FILL, 1);
    pen.fill(house, '#d8d0bd', 0.6);
    pen.stroke([...house, house[0]!], 1.5 * s, INK, 1, false);
    for (const x of [208, 236, 264]) {
      const win = [P(x, wl - 82), P(x + 18, wl - 82), P(x + 18, wl - 64), P(x, wl - 64)];
      pen.fill(win, '#2c4f86', 0.35);
      pen.stroke([...win, win[0]!], 1 * s, INK, 1, false);
    }
    pen.fill([P(186, wl - 92), P(296, wl - 92), P(290, wl - 102), P(192, wl - 102)], PAINT, 0.7);
    pen.stroke([P(150, wl - 30), P(150, wl - 170)], 2 * s, INK, 1, false);
    pen.stroke([P(150, wl - 160), P(spec.rod.x, spec.rod.y)], 1.4 * s, INK, 1, false);
    pen.hair([P(150, wl - 170), P(250, wl - 92)], 0.7 * s, INK, 0.8);
    pen.hair([P(150, wl - 170), P(60, wl - 30)], 0.7 * s, INK, 0.8);
    hull(pen, P, { left: 20, right: 350, top: wl - 32, bow: wl - 54, keel: wl + 22, water: wl }, PAINT);
    for (let x = 60; x < 330; x += 34) pen.circle(x * s, (wl - 14) * s, 3.4 * s, 0.9 * s);
  }
}

export const CLOUD_SIZE = { w: 300, h: 120 } as const;

/** A loose pen-outlined cloud: overlapping round puffs on a flat base, outlined only where they meet the sky. */
export function drawCloud(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.8);
  const s = ART_RES;
  const { w, h } = CLOUD_SIZE;
  const base = h - 16;
  const count = 4 + Math.floor(pen.rng() * 3);
  const span = w - 80;
  const puffs = Array.from({ length: count }, (_, i) => {
    const middle = Math.sin(((i + 0.5) / count) * Math.PI);
    return { cx: 40 + (span * (i + 0.5)) / count, r: Math.min(base - 8, (span / count) * (0.6 + 0.55 * middle) * (0.85 + pen.rng() * 0.3)) };
  });
  // The top edge is the highest puff at each x.
  const height = (x: number): number => Math.max(0, ...puffs.map((p) => (Math.abs(x - p.cx) < p.r ? Math.sqrt(p.r * p.r - (x - p.cx) ** 2) : 0)));
  const left = Math.min(...puffs.map((p) => p.cx - p.r));
  const right = Math.max(...puffs.map((p) => p.cx + p.r));
  const edge: Pt[] = [];
  for (let x = left; x <= right + 0.001; x += 3) edge.push({ x: x * s, y: (base - height(x)) * s });
  pen.fill([...edge, { x: right * s, y: base * s }, { x: left * s, y: base * s }], PAPER_FILL, 0.9);
  pen.stroke(edge, 1.1 * s, INK, 0.5, false);
  pen.hair([{ x: (left + 12) * s, y: base * s }, { x: (right - 12) * s, y: base * s }], 0.7 * s, INK, 0.25);
}
