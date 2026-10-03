import { INK, type Pt } from './pen';
import { barnacle, clip, type Draw, drift, frame, hair, ink, lerp, oval, paint, PAPER_FILL, pt, puff, qb, ring, S, SHADOW, TAU, WOOD } from './decorKit';

/**
 * The sunken ship: the landmark of every shipwreck level and of its chapter
 * on the map. A wooden hull lying on the sand, bow raised, half buried, with
 * a hole stove in its side showing the ribs, a snapped mast and its rigging,
 * barnacles and weed. Same canvas contract as decorArt.ts.
 */
export const SHIPWRECK_SIZE = { w: 360, h: 200 } as const;

const HULL = '#7d6650';
const HOLD = '#231d20';
const WEED = '#5c7a48';

interface HullShape {
  /** Deck edge, stern to bow. */
  readonly sheer: Pt[];
  /** Keel, stern to bow (same length as sheer, matching points). */
  readonly keel: Pt[];
  readonly outline: Pt[];
}

function hullShape(): HullShape {
  const n = 28;
  const sheer = qb(pt(-160, -86), pt(-10, -78), pt(150, -122), n);
  const keel = qb(pt(-150, -14), pt(10, 2), pt(140, -24), n);
  // The bow stem curves forward from the deck down to the keel.
  const stem = qb(pt(150, -122), pt(172, -70), pt(140, -24), 12).slice(1, -1);
  const outline = [...sheer, ...stem, ...[...keel].reverse()];
  return { sheer, keel, outline };
}

/** A point `t` of the way down the hull side from deck (0) to keel (1), at plank station `i`. */
const side = (h: HullShape, i: number, t: number): Pt => pt(lerp(h.sheer[i]!.x, h.keel[i]!.x, t), lerp(h.sheer[i]!.y, h.keel[i]!.y, t));

function shipwreck(d: Draw): void {
  const { rng } = d;
  const h = hullShape();
  puff(d, 0, -4, 175, 9, SHADOW, 0.5);
  mast(d, h);
  paint(d, h.outline, HULL, 0.5);
  clip(d, h.outline, () => {
    // Planks follow the hull's curve from stern to bow.
    for (let k = 1; k < 8; k++) hair(d, h.sheer.map((_, i) => side(h, i, k / 8)), 0.6, 0.65);
    // Butt joints, staggered plank to plank.
    for (let k = 0; k < 8; k++) {
      for (let i = 2 + (k % 3); i < h.sheer.length - 2; i += 5) hair(d, [side(h, i, k / 8), side(h, i, (k + 1) / 8)], 0.5, 0.55);
    }
    // Shadowed lower hull, hatched.
    d.pen.hatch(d.L(h.outline), 2.6 * S, 1.15, 0.45 * S, { alpha: 0.45, onlyBelow: d.P(0, -46).y });
    hole(d, h);
    // Portholes forward of the hole.
    for (const i of [19, 22, 25]) {
      const c = side(h, i, 0.3);
      const port = oval(c.x, c.y, 4.2, 4.2, 14);
      d.pen.fill(d.L(port), HOLD, 0.85);
      ring(d, port, 1);
      ring(d, oval(c.x, c.y, 5.6, 5.6, 14), 0.6);
    }
  });
  ink(d, h.outline, 1.8);
  rail(d, h);
  // Barnacles along the waterline band and weed sprouting from the deck.
  for (let i = 0; i < 16; i++) {
    const p = side(h, 2 + Math.floor(rng() * (h.sheer.length - 4)), 0.55 + rng() * 0.3);
    barnacle(d, p.x, p.y, 1.6 + rng() * 1.6);
  }
  for (let i = 0; i < 4; i++) weed(d, h.sheer[4 + i * 6]!, 20 + rng() * 22, rng() * TAU);
  // Half buried: sand heaped along the keel.
  drift(d, -176, 164, -1, 26);
  drift(d, -90, 20, -1, 14);
}

/** The hole stove in the side: dark hold, ribs showing, splintered plank ends. */
function hole(d: Draw, h: HullShape): void {
  const { rng } = d;
  const rim: Pt[] = [];
  // Ragged: plank ends snapped off at different lengths all the way round.
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * TAU;
    const r = 0.78 + rng() * 0.4 + (k % 3 === 0 ? 0.18 : 0);
    rim.push(pt(-12 + Math.cos(a) * 34 * r, -46 + Math.sin(a) * 19 * r));
  }
  d.pen.fill(d.L(rim), HOLD, 0.9);
  clip(d, rim, () => {
    // Ribs inside, curving like the hull.
    for (let x = -44; x <= 20; x += 9) hair(d, qb(pt(x, -72), pt(x - 4, -44), pt(x + 2, -18), 8), 2.2, 0.55, '#8a7766');
  });
  ink(d, [...rim, rim[0]!], 1.2);
  // Splintered plank ends sticking into the hole.
  for (let k = 0; k < rim.length; k += 3) {
    const p = rim[k]!;
    const inward = pt(-12 - p.x, -46 - p.y);
    const len = 0.12 + rng() * 0.14;
    hair(d, [p, pt(p.x + inward.x * len, p.y + inward.y * len)], 0.9, 0.9);
  }
}

/** A broken rail along the deck: posts and a top rail with a gap where it gave way. */
function rail(d: Draw, h: HullShape): void {
  const posts = h.sheer.filter((_, i) => i % 3 === 0);
  for (const p of posts) hair(d, [p, pt(p.x, p.y - 10)], 1, 0.9);
  const top = posts.map((p) => pt(p.x, p.y - 10));
  ink(d, top.slice(0, 4), 1);
  ink(d, top.slice(6), 1);
  // The broken section hangs down.
  hair(d, [top[4]!, pt(top[4]!.x + 10, top[4]!.y + 9)], 1, 0.9);
}

/** The mast snapped a third of the way up, its stay lines slack. */
function mast(d: Draw, h: HullShape): void {
  const foot = h.sheer[9]!;
  const top = pt(foot.x - 16, -182);
  const left = [pt(foot.x - 3.5, foot.y + 6), pt(top.x - 2.5, top.y + 4)];
  const right = [pt(top.x + 3, top.y), pt(foot.x + 3.5, foot.y + 6)];
  // Jagged break at the top.
  const breakLine = [pt(top.x - 2.5, top.y + 4), pt(top.x - 1, top.y - 3), pt(top.x + 0.5, top.y + 2), pt(top.x + 2, top.y - 5), pt(top.x + 3, top.y)];
  const spar = [...left, ...breakLine.slice(1, -1), ...right];
  paint(d, spar, WOOD, 0.75);
  ink(d, spar, 1.3);
  for (let y = foot.y - 8; y > top.y + 6; y -= 7) hair(d, [pt(lerp(foot.x, top.x, (foot.y - y) / (foot.y - top.y)) - 3, y), pt(lerp(foot.x, top.x, (foot.y - y) / (foot.y - top.y)) + 3, y - 1)], 0.4, 0.5);
  // A yard still lashed across it, hanging askew.
  const yardC = pt(lerp(foot.x, top.x, 0.62), lerp(foot.y, top.y, 0.62));
  const yard = [pt(yardC.x - 44, yardC.y - 10), pt(yardC.x + 50, yardC.y + 12)];
  ink(d, yard, 2.2);
  hair(d, [pt(yard[0]!.x, yard[0]!.y + 1.5), pt(yard[1]!.x, yard[1]!.y + 1.5)], 0.6, 0.6, PAPER_FILL);
  // Stays: one still taut to the bow, one sagging to the stern.
  hair(d, [pt(top.x, top.y + 6), h.sheer[h.sheer.length - 2]!], 0.6, 0.75);
  hair(d, qb(pt(top.x - 1, top.y + 8), pt(-120, -70), h.sheer[1]!, 14), 0.6, 0.65);
}

/** A strand of weed growing up off the wreck, swaying. */
function weed(d: Draw, root: Pt, height: number, phase: number): void {
  const stem = Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return pt(root.x + Math.sin(u * 4 + phase) * 4 * u, root.y - 9 - u * height);
  });
  d.pen.stroke(d.L(stem), 1.4 * S, WEED, 0.85, false);
  stem.forEach((p, i) => {
    if (i < 2 || i % 2) return;
    const s = i % 4 ? 1 : -1;
    const leaf = oval(p.x + s * 3, p.y, 3, 1.4, 8);
    d.pen.fill(d.L(leaf), WEED, 0.55);
    hair(d, leaf, 0.4, 0.7, INK);
  });
}

/** Draws the sunken ship into a canvas of SHIPWRECK_SIZE times ART_RES. */
export function drawShipwreck(ctx: CanvasRenderingContext2D, seed: number): void {
  shipwreck(frame(ctx, seed, false));
}
