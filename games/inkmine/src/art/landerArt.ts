import type { Look } from '../logic/gear';
import type { Wreck } from '../logic/repairs';
import { cub, edge, pt, type Draw } from './kit';
import {
  bell, crumpledBell, dish, ENAMEL, foil, groundShadow, guildMark, gash, hatch, heatShield, hopper, hullPlate, ladder, lamp, leg,
  pennant, porthole, rcs, smoke, snappedDish, spareTank, weather, weldPlate,
} from './landerParts';
import { gleam, glow, paint } from './paint';
import type { Pt } from './pen';
import { part, rivets, roundRect, seam, WASH } from './prospector/parts';

/**
 * The lander, the prospector's ship, refitted as the game goes on (spec,
 * "The lander"), in three looks:
 * 0, the tin can (planets 1–3): an enamelled can with a domed top on a
 *    descent stage wrapped in gold foil, four spindly legs, heat-shield
 *    tiles, one engine, a porthole, a hatch with a ladder, a dish, RCS
 *    quads, a pennant and a strapped-on spare tank;
 * 1, refitted (planets 4–7): a cargo pod clamped on, a solar wing, a
 *    floodlight mast, braced legs, the guild's band and a bigger dish;
 * 2, the deep hauler (planets 8–10): a wider hull with twin engines,
 *    radiator fins, a cockpit window and a loading crane.
 * Every look has the ore hopper the prospector tips the bag into when
 * banking. Origin at the feet's middle, drawn up from y = 0 within
 * LANDER_W × LANDER_H units.
 *
 * After the crash the tin can shows what's still broken (spec, "The
 * lander"), each system mended on its own: a dark, cracked porthole until
 * the printer runs (then its glow), the dish snapped off until the comms
 * work, a gash in the hull, torn heat-shield tiles and the hatch hanging
 * open until it's plated (then a welded patch), and a crumpled bell with
 * smoke still coming off it until the thrusters are fixed.
 *
 * `drawLander` is the craft itself, which gets the sprite's ink silhouette;
 * `drawLanderAir` is what's round it (its shadow on the ground, smoke, a
 * floodlight's glow), painted after so it isn't outlined.
 */
export const SOUND: Wreck = { printer: false, comms: false, hull: false, thrusters: false };

/** A wreck as a small number, for texture keys: one bit per broken system. */
export function wreckCode(w: Wreck): number {
  return (w.printer ? 1 : 0) | (w.comms ? 2 : 0) | (w.hull ? 4 : 0) | (w.thrusters ? 8 : 0);
}
export const LANDER_W = 170;
export const LANDER_H = 150;

/** A hull: straight sides from `base` up to `shoulder`, then a dome to `top`. */
function hullShape(half: number, base: number, shoulder: number, top: number, flat = 0): Pt[] {
  const s = half - 1.4;
  return [
    pt(-half, base),
    pt(-half + 0.6, (base + shoulder) / 2),
    pt(-s, shoulder),
    ...cub(pt(-s, shoulder), pt(-s + 1.6, top + 10), pt(-flat - s * 0.45, top), pt(-flat, top), 10).slice(1),
    ...(flat > 0 ? [pt(flat, top)] : []),
    ...cub(pt(flat, top), pt(flat + s * 0.45, top), pt(s - 1.6, top + 10), pt(s, shoulder), 10).slice(1),
    pt(half - 0.6, (base + shoulder) / 2),
    pt(half, base),
  ];
}

/** The descent stage: an octagonal box seen side-on, wrapped in foil. */
function stage(d: Draw, half: number, top: number, bottom: number, seed: number): void {
  const shape = [pt(-half, top), pt(half, top), pt(half + 3, top + 4), pt(half + 3, bottom - 4), pt(half, bottom), pt(-half, bottom), pt(-half - 3, bottom - 4), pt(-half - 3, top + 4)];
  foil(d, shape, -half - 3, half + 3, top, bottom, seed);
  // The stage's frame edges, catching the light.
  for (const x of [-half, half]) d.pen.hair([pt(x, top + 0.5), pt(x, bottom - 0.5)], 0.45, '#5e3f12', 0.7);
}

/** Panel seams and rivet rows round a hull, and a weathered finish. */
function plating(d: Draw, hull: readonly Pt[], half: number, rows: readonly number[], cols: readonly number[], top: number, base: number, seed: number): void {
  weather(d, hull, -half, half, top, base, seed);
  d.pen.clipped(hull, () => {
    for (const y of rows) {
      seam(d, [pt(-half, y), pt(0, y + 0.6), pt(half, y)], 0.45);
      rivets(d, Array.from({ length: Math.floor((half * 2 - 8) / 6) + 1 }, (_, i) => pt(-half + 4 + i * 6, y + 2.2)), 0.42);
    }
    for (const x of cols) seam(d, [pt(x, top + 6), pt(x, base)], 0.4);
  });
}

/** The guild's band round a hull, painted as cobalt rolled round the cylinder. */
function band(d: Draw, hull: readonly Pt[], half: number, y0: number, y1: number): void {
  d.pen.clipped(hull, () => hullPlate(d, [pt(-half - 2, y0), pt(half + 2, y0), pt(half + 2, y1), pt(-half - 2, y1)], WASH.fabric, -half, half, y0, y1, 0));
}

function tinCan(d: Draw, wreck: Wreck): void {
  leg(d, pt(-20, -30), pt(-28, -16), pt(-31, -2), pt(-12, -27), true);
  leg(d, pt(20, -30), pt(28, -16), pt(31, -2), pt(12, -27), true);
  if (wreck.thrusters) crumpledBell(d, 0, -31, -11, 12);
  else bell(d, 0, -31, -11, 12);
  stage(d, 33, -46, -30, 11);
  leg(d, pt(-30, -34), pt(-40, -18), pt(-46, -2), pt(-24, -27));
  leg(d, pt(30, -34), pt(40, -18), pt(46, -2), pt(24, -27));
  spareTank(d, -44, -17, -7);
  const hull = hullShape(30, -46, -76, -102);
  hullPlate(d, hull, ENAMEL, -30, 30, -102, -46, 0.55);
  plating(d, hull, 30, [-62, -82], [-20, 24], -102, -46, 21);
  guildMark(d, pt(-16, -88), 2.2);
  edge(d, hull, 1, 0.95);
  gleam(d, [pt(-21, -96), pt(-25, -84), pt(-26, -60)], 1.2, 0.55);
  heatShield(d, -30.4, 30.4, -53, -45, wreck.hull ? [6, 22] : undefined);
  if (wreck.hull) {
    // The tiles torn away show bare, scorched hull.
    paint(d, [pt(7, -52.6), pt(21, -52.6), pt(19.5, -45.4), pt(8.5, -45.4)], '#7b7680', { alpha: 1, shadow: 0.3, hatch: 0.2, line: 0.6 });
  }
  porthole(d, pt(-11, -69), 7, wreck.printer ? 'dark' : 'lit');
  hatch(d, 8, -79, -55, wreck.hull);
  ladder(d, 10, 20, -54, 0);
  if (wreck.hull) gash(d, pt(-18, -57));
  else weldPlate(d, pt(-18, -57));
  rcs(d, -30, -86, -1);
  rcs(d, 30, -86, 1);
  if (wreck.comms) snappedDish(d, pt(-8, -101), 7);
  else dish(d, pt(-8, -101), 7);
  pennant(d, pt(8, -101), pt(10, -122));
  hopper(d, 33, -65, '#c4a676');
}

function refitted(d: Draw): void {
  // Solar wing on a hinged arm, behind everything: dark cells in a bright frame.
  d.pen.stroke([pt(-24, -82), pt(-50, -94)], 1.6, d.ink, 0.9, false);
  const wing = [pt(-50, -106), pt(-76, -98), pt(-72, -78), pt(-46, -86)];
  paint(d, wing, '#2f3e72', { alpha: 1, shadow: 0.3, hatch: 0, line: 0.9, gloss: true });
  d.pen.clipped(wing, () => {
    for (let k = 1; k < 4; k++) d.pen.hair([pt(-50 - k * 6.5, -106 + k * 2), pt(-46 - k * 6.5, -86 + k * 2)], 0.45, '#9fb2dc', 0.7);
    d.pen.hair([pt(-48, -96), pt(-74, -88)], 0.45, '#9fb2dc', 0.7);
    gleam(d, [pt(-70, -96), pt(-52, -102)], 1.4, 0.5);
  });
  for (const side of [-1, 1] as const) leg(d, pt(side * 20, -30), pt(side * 28, -16), pt(side * 31, -2), pt(side * 12, -27), true);
  bell(d, 0, -31, -10, 13);
  stage(d, 34, -46, -30, 12);
  for (const side of [-1, 1] as const) {
    leg(d, pt(side * 31, -34), pt(side * 41, -18), pt(side * 47, -2), pt(side * 24, -27));
    // The refit's extra brace.
    d.pen.stroke([pt(side * 34, -40), pt(side * 44, -9)], 1.5, d.ink, 0.85, false);
  }
  const hull = hullShape(31, -46, -78, -104);
  hullPlate(d, hull, '#d6dadf', -31, 31, -104, -46, 0.5);
  plating(d, hull, 31, [-62, -84], [-20, 25], -104, -46, 22);
  band(d, hull, 31, -78, -72);
  edge(d, hull, 1, 0.95);
  gleam(d, [pt(-22, -98), pt(-26, -86), pt(-27, -60)], 1.2, 0.55);
  heatShield(d, -31.4, 31.4, -53, -45);
  porthole(d, pt(-11, -64), 7);
  hatch(d, 9, -80, -55);
  ladder(d, 11, 21, -54, 0);
  rcs(d, -31, -88, -1);
  // Cargo pod clamped to the left side.
  const pod = roundRect(-50, -66, -30, -34, 2.4);
  hullPlate(d, pod, '#cdbf9c', -50, -30, -66, -34, 0.3);
  edge(d, pod, 1);
  for (const y of [-58, -42]) {
    const rib = roundRect(-51.4, y - 1.2, -28.6, y + 1.2, 0.6);
    part(d, rib, WASH.darkMetal, { shadow: 0.4, line: 0.5, gloss: true, hatch: 0 });
  }
  guildMark(d, pt(-40, -50), 2.6);
  // Floodlight mast and a bigger dish.
  d.pen.stroke([pt(18, -94), pt(26, -120)], 1.3, d.ink, 1, false);
  const flood = roundRect(22, -127, 33, -119, 1.4);
  part(d, flood, WASH.darkMetal, { shadow: 0.5, line: 0.6, gloss: true });
  lamp(d, pt(33.6, -123), 2.6);
  dish(d, pt(-8, -103), 10);
  hopper(d, 34, -66, WASH.metal);
}

function hauler(d: Draw): void {
  for (const side of [-1, 1] as const) leg(d, pt(side * 26, -30), pt(side * 36, -16), pt(side * 40, -2), pt(side * 16, -27), true);
  bell(d, -15, -31, -11, 10);
  bell(d, 15, -31, -11, 10);
  stage(d, 44, -46, -30, 13);
  for (const side of [-1, 1] as const) {
    leg(d, pt(side * 40, -34), pt(side * 50, -18), pt(side * 55, -2), pt(side * 32, -27));
    d.pen.stroke([pt(side * 43, -40), pt(side * 53, -9)], 1.6, d.ink, 0.85, false);
  }
  // Radiator fins down the left flank, behind the hull.
  const rack = [pt(-41, -84), pt(-49, -86), pt(-49, -48), pt(-41.5, -46)];
  paint(d, rack, '#b9c6d6', { alpha: 1, shadow: 0.5, hatch: 0.15, line: 0.8, gloss: true });
  for (let y = -83; y < -48; y += 3) seam(d, [pt(-49, y), pt(-41.2, y + 0.4)], 0.4);
  const hull = hullShape(42, -46, -70, -98, 14);
  hullPlate(d, hull, '#d2d8df', -42, 42, -98, -46, 0.5);
  plating(d, hull, 42, [-58, -76], [-26, 30], -98, -46, 23);
  band(d, hull, 42, -66, -61);
  edge(d, hull, 1.1, 0.95);
  gleam(d, [pt(-30, -92), pt(-37, -80), pt(-38, -58)], 1.3, 0.55);
  heatShield(d, -42.4, 42.4, -53, -45);
  // A wide cockpit window, the sky's glow caught along it.
  const win = [pt(-22, -88), pt(14, -90), pt(21, -79), pt(-24, -77)];
  paint(d, win, '#33406a', { alpha: 1, shadow: 0.5, hatch: 0, line: 0.9, gloss: true });
  d.pen.clipped(win, () => gleam(d, [pt(-19, -85), pt(8, -87)], 2, 0.5));
  hatch(d, 16, -78, -55);
  ladder(d, 18, 28, -54, 0);
  rcs(d, -42, -84, -1);
  rcs(d, 42, -66, 1);
  // Loading crane over the hopper.
  for (const [a, b] of [[pt(30, -94), pt(30, -116)], [pt(30, -116), pt(58, -104)]] as const) {
    const boom = [pt(a.x - 1.4, a.y), pt(b.x - 1.4, b.y), pt(b.x + 1.4, b.y + 1.4), pt(a.x + 1.4, a.y + 1.4)];
    part(d, boom, WASH.can, { shadow: 0.5, line: 0.7, gloss: true, hatch: 0 });
  }
  d.pen.hair([pt(55, -103), pt(55, -62)], 0.6, d.ink, 0.85);
  part(d, roundRect(53.4, -62, 56.6, -58, 0.8), WASH.darkMetal, { shadow: 0.3, line: 0.5, hatch: 0 });
  dish(d, pt(-10, -98), 11);
  hopper(d, 45, -66, WASH.metal);
}

/** The lander in a look; the tin can also shows what the crash broke, if anything. */
export function drawLander(d: Draw, look: Look, wreck: Wreck = SOUND): void {
  if (look === 0) tinCan(d, wreck);
  else if (look === 1) refitted(d);
  else hauler(d);
}

/** What's round the lander, not part of it: its shadow on the ground (under it), smoke from a dead engine, a floodlight's glow. */
export function drawLanderAir(d: Draw, look: Look, wreck: Wreck = SOUND): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  const half = look === 2 ? 62 : 54;
  groundShadow(d, -half, half);
  ctx.restore();
  if (look === 0 && wreck.thrusters) smoke(d, 8, -14, 31 + d.f);
  if (look === 1) glow(ctx, pt(36, -123), 14, '#fff1c0', 0.35);
}

/** The lander's look for a planet: refitted on reaching planet 4, a hauler from planet 8. */
export function landerLook(planet: number): Look {
  return planet >= 8 ? 2 : planet >= 4 ? 1 : 0;
}
