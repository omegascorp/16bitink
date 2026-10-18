import { oval, pt, type Draw } from './kit';
import { mix } from './paint';
import type { GroundStyle } from './palette';
import type { Pt } from './pen';
import { part, rivets, roundRect } from './prospector/parts';
import { BROKEN_SHIP, drawStarship } from './starship';
import { COLOR, letters, porthole } from './starship/hull';
import { boulder } from './talusGround';

/**
 * The search party's ship on Talus (spec, "Talus: The story"): a guild ship
 * like yours, a sister of the same yard, cobalt and white enamel, with the
 * search service's ring painted on its hold and its hull number. It came
 * down hard years ago and ran nose-first into the loose rock at the big
 * mesa's foot: it lies tipped down by the bow, its stern and ring up in the
 * air, the rock it brought down heaped over its nose, and the planet's red
 * dust settled on everything that faces up. The ground is the world's own:
 * the ship is cut off along it (`ground`), and only rubble shows where it
 * goes in. Origin on the ground at its hatch, which lies under the rock
 * (drawn on its own by `drawSearchHatch`, once it's dug free).
 */
export const SEARCH_SHIP = { w: 360, h: 210, ox: 300, oy: 180 } as const;

/** How it lies: the starship's picture tipped down by the bow (radians), this big, its middle here. */
const LIE = { tip: 0.24, scale: 1.4, at: pt(-128, -14) } as const;
/** The search service's mark on the hold, and its hull number, in the ship's own drawing units. */
const RING_MARK = pt(-6, -1);
const DUST = '#b8714d';

/** Where the ground is under drawing x, as drawing y (the world's surface, measured from the hatch). */
export type GroundLine = (x: number) => number;

/** A point in the ship's own units, as it lies on Talus. */
function laid(p: Pt): Pt {
  const c = Math.cos(LIE.tip);
  const s = Math.sin(LIE.tip);
  return pt(LIE.at.x + (p.x * c - p.y * s) * LIE.scale, LIE.at.y + (p.x * s + p.y * c) * LIE.scale);
}

/** The search service's mark: a white disc in a cobalt ring, a lamp's three rays inside, as painted big on a hold. */
function searchRing(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const disc = oval(c.x, c.y, r, r * 0.92, 24);
  pen.fill(disc, COLOR.white, 0.95);
  const ring = oval(c.x, c.y, r * 0.8, r * 0.74, 24);
  pen.hair([...ring, ring[0]!], r * 0.18, COLOR.stripe, 0.9);
  for (const a of [-0.5, 0, 0.5]) {
    const dir = pt(Math.sin(a), -Math.cos(a));
    pen.hair([pt(c.x + dir.x * r * 0.18, c.y + dir.y * r * 0.18), pt(c.x + dir.x * r * 0.55, c.y + dir.y * r * 0.52)], r * 0.1, COLOR.stripe, 0.9);
  }
  pen.fill(oval(c.x, c.y + r * 0.2, r * 0.16, r * 0.14, 12), COLOR.stripe, 0.9);
  pen.hair([...disc, disc[0]!], 0.35, d.ink, 0.8);
}

/** Red dust settled on what faces up: a wash heavier towards the top, and drifts in the lee of each ridge. */
function dust(d: Draw): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, -SEARCH_SHIP.oy, 0, 40);
  g.addColorStop(0, 'rgba(184, 113, 77, 0.42)');
  g.addColorStop(0.55, 'rgba(184, 113, 77, 0.2)');
  g.addColorStop(1, 'rgba(184, 113, 77, 0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(-SEARCH_SHIP.ox, -SEARCH_SHIP.oy, SEARCH_SHIP.w, SEARCH_SHIP.h);
  // Drifts: soft streaks along the hull's upper line, where dust piles against each frame.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = mix(DUST, '#e8b893', 0.3);
  for (let i = 0; i < 26; i++) {
    const p = laid(pt(-105 + i * 8.6, -20 - d.pen.rng() * 9));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 7 + d.pen.rng() * 6, 1.6 + d.pen.rng(), LIE.tip, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The ship as it lies: the starship drawn tipped and scaled, its search
 * markings and dust over it, cut off along the ground, rock heaped where it
 * goes in and lying on its nose.
 */
export function drawSearchShip(d: Draw, ground: GroundLine, style: GroundStyle): void {
  const ctx = d.pen.ctx;
  const x0 = -SEARCH_SHIP.ox;
  const x1 = SEARCH_SHIP.w - SEARCH_SHIP.ox;
  // Only what stands above the ground: the rest of it is in the rock.
  const line: Pt[] = [];
  for (let x = x1; x >= x0; x -= 4) line.push(pt(x, ground(x)));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, -SEARCH_SHIP.oy);
  ctx.lineTo(x1, -SEARCH_SHIP.oy);
  for (const p of line) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  ctx.save();
  ctx.translate(LIE.at.x, LIE.at.y);
  ctx.rotate(LIE.tip);
  ctx.scale(LIE.scale, LIE.scale);
  drawStarship(d, BROKEN_SHIP);
  // Its own markings: the search ring on the hold, its number, a lit-less porthole row repainted cobalt round the rims.
  searchRing(d, RING_MARK, 9);
  letters(d, 'SR 3', -36, 9, 7);
  for (const x of [52.4, 64.4]) porthole(d, pt(x, -2.4), 1.25, false);
  ctx.restore();
  dust(d);
  ctx.restore();
  // Rock it brought down, heaped along where it goes into the ground, and fallen on its bow.
  const T = 32;
  const heap: [number, number, number][] = [];
  for (let x = -60; x <= 24; x += 13) heap.push([x + d.pen.rng() * 6, ground(x) - 3, T * (0.55 + d.pen.rng() * 0.45)]);
  for (const k of [0.2, 0.55, 0.85]) {
    const p = laid(pt(70 + k * 40, -14 - k * 4));
    heap.push([p.x, p.y, T * (0.45 + d.pen.rng() * 0.3)]);
  }
  heap.sort((a, b) => a[1] - b[1]);
  heap.forEach(([x, y, s], i) => boulder(ctx, x, y - s * 0.3, s, 4100 + i * 37, style));
}

/** The hatch's frame, in drawing units: origin at the bottom of its tile, in the middle. */
export const SEARCH_HATCH = { w: 44, h: 44, ox: 22, oy: 40 } as const;

/**
 * The hatch, dug free: a patch of the ship's enamel plate in the rock, a
 * round door set in it with a cobalt rim and a hand wheel, dust in its
 * seams. Drawn over the open tile once the rock in front of it is gone.
 */
export function drawSearchHatch(d: Draw): void {
  const { pen } = d;
  const plate = roundRect(-19, -36, 19, 0, 3);
  part(d, plate, COLOR.hull, { shadow: 0.4, line: 0.6, hatch: 0.1, gloss: true });
  rivets(d, [pt(-16, -33), pt(16, -33), pt(-16, -3), pt(16, -3)], 0.6);
  const door = oval(0, -18, 12, 12, 24);
  part(d, door, mix(COLOR.hull, COLOR.metal, 0.4), { shadow: 0.5, line: 0.8, hatch: 0.12, gloss: true });
  pen.hair([...door, door[0]!], 2.2, COLOR.stripe, 0.9);
  // The hand wheel: a rim and four spokes.
  const wheel = oval(0, -18, 6, 6, 18);
  pen.hair([...wheel, wheel[0]!], 1.1, COLOR.gunmetal, 0.95);
  for (const a of [0.4, 0.4 + Math.PI / 2, 0.4 + Math.PI, 0.4 + Math.PI * 1.5]) pen.hair([pt(0, -18), pt(Math.cos(a) * 6, -18 + Math.sin(a) * 6)], 0.8, COLOR.gunmetal, 0.95);
  pen.fill(oval(0, -18, 1.4, 1.4, 10), COLOR.dark, 1);
  // Red dust in the seams and settled along the top.
  pen.hair([pt(-17, -34.5), pt(17, -34.5)], 1.6, DUST, 0.6);
  pen.hair([pt(-9, -28), pt(-3, -30.5), pt(4, -30.4), pt(9, -28)], 0.9, DUST, 0.5);
}
