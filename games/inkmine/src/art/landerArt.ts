import type { Look } from '../logic/gear';
import type { Wreck } from '../logic/repairs';
import { capsule, edge, oval, pt, skin, tint, type Draw } from './kit';
import type { Pt } from './pen';
import { part, rivets, roundRect, sheen, WASH } from './prospector/parts';

/**
 * The lander, the prospector's ship, refitted as the game goes on (spec,
 * "The lander"), in three looks:
 * 0, the tin can (planets 1–3): a dented can on spindly legs, heat-shield
 *    tiles, one engine, a porthole, a hatch with a ladder, a dish, an RCS
 *    quad and a strapped-on spare tank;
 * 1, refitted (planets 4–7): a cargo pod clamped on, a solar wing, a
 *    floodlight mast, braced legs and a bigger dish;
 * 2, the deep hauler (planets 8–10): a wider hull with twin engines,
 *    radiator fins and a loading crane.
 * Every look has the ore hopper the prospector tips the bag into when
 * banking. Origin at the feet's middle, drawn up from y = 0 within
 * LANDER_W × LANDER_H units.
 *
 * After the crash the tin can shows what's still broken (spec, "The
 * lander"), each system mended on its own: a dark, cracked porthole until
 * the printer runs (then its glow), the dish snapped off until the comms
 * work, a gash in the hull and missing heat-shield tiles until it's plated
 * (then a welded patch), and a crumpled, scorched engine bell until the
 * thrusters are fixed.
 */
export const SOUND: Wreck = { printer: false, comms: false, hull: false, thrusters: false };

/** A wreck as a small number, for texture keys: one bit per broken system. */
export function wreckCode(w: Wreck): number {
  return (w.printer ? 1 : 0) | (w.comms ? 2 : 0) | (w.hull ? 4 : 0) | (w.thrusters ? 8 : 0);
}
export const LANDER_W = 170;
export const LANDER_H = 150;

const HULL: readonly string[] = ['#d5d9df', '#d0d7e0', '#c9d1dc'];
const SCORCH = '#4a4750';

function leg(d: Draw, side: 1 | -1, braced: boolean): void {
  const hip = pt(side * 20, -30);
  const foot = pt(side * 44, -2);
  const upper = capsule(hip, pt(side * 33, -16), 3.6, 3.2);
  part(d, upper, WASH.metal, { shadow: 0.4, line: 1.1 });
  // Shock absorber: a piston into the lower leg.
  const lower = capsule(pt(side * 32, -17), foot, 2.6, 2.4);
  part(d, lower, WASH.darkMetal, { shadow: 0, line: 1, alpha: 0.55 });
  edge(d, oval(side * 33, -16.4, 2.4, 2.4, 12), 0.8);
  d.pen.stroke([pt(side * 12, -22), pt(side * 36, -10)], 1, d.ink, 0.85, false);
  if (braced) d.pen.stroke([pt(side * 24, -32), pt(side * 40, -8)], 1.4, d.ink, 0.85, false);
  const pad = oval(foot.x, -1.6, 8, 2.4, 16);
  part(d, pad, WASH.metal, { shadow: 0, line: 1.1, alpha: 0.65 });
}

/** The engine bell, crumpled after the crash: one rim pushed in, the wall dented. */
function crumpledBell(d: Draw, x: number, w: number): void {
  const b = [pt(x - w * 0.6, -30), pt(x + w * 0.55, -30), pt(x + w * 0.7, -22), pt(x + w * 0.95, -15), pt(x + w * 0.1, -18.5), pt(x - w * 0.9, -14)];
  part(d, b, WASH.darkMetal, { shadow: 0.5, cross: true, line: 1.2, alpha: 0.6 });
  // Burnt black round the throat, and the crease of the dent.
  tint(d, [pt(x - w * 0.6, -30), pt(x + w * 0.55, -30), pt(x + w * 0.3, -24), pt(x - w * 0.5, -23)], SCORCH, 0.55);
  d.pen.stroke([pt(x + w * 0.7, -22), pt(x + w * 0.2, -20), pt(x + w * 0.1, -18.5)], 0.8, d.ink, 0.85, false);
  // A burnt wire hanging loose.
  d.pen.stroke([pt(x - w * 0.3, -30), pt(x - w * 0.6, -24), pt(x - w * 0.4, -19)], 0.7, d.ink, 0.8, false);
  d.pen.fill(oval(x, -0.6, w * 2.2, 2.2, 18), SCORCH, 0.3);
}

function bell(d: Draw, x: number, w: number): void {
  const b = [pt(x - w * 0.6, -30), pt(x + w * 0.6, -30), pt(x + w, -16), pt(x - w, -16)];
  part(d, b, WASH.darkMetal, { shadow: 0.5, cross: true, line: 1.2, alpha: 0.6 });
  for (let k = 1; k < 3; k++) {
    const y = -30 + k * 4.6;
    const half = w * (0.6 + 0.4 * (k * 4.6) / 14);
    d.pen.hair([pt(x - half, y), pt(x + half, y)], 0.6, d.ink, 0.7);
  }
  // Scorched ground under it.
  d.pen.fill(oval(x, -0.6, w * 1.8, 1.8, 18), SCORCH, 0.18);
}

/** A row of heat-shield tiles round the hull's base. */
function heatShield(d: Draw, x0: number, x1: number, y: number): void {
  const band = [pt(x0, y - 5.6), pt(x1, y - 5.6), pt(x1, y), pt(x0, y)];
  skin(d, band, '#8d8a8f', 0.6);
  for (let x = x0 + 4; x < x1; x += 5) d.pen.hair([pt(x, y - 5.6), pt(x + 0.3, y)], 0.55, d.ink, 0.7);
  d.pen.hair([pt(x0, y - 2.8), pt(x1, y - 2.8)], 0.5, d.ink, 0.6);
  edge(d, band, 1);
}

/** The porthole. `lit`: the printer is running behind it; `dark`: dead and cracked. */
function porthole(d: Draw, c: Pt, r: number, state: 'plain' | 'lit' | 'dark' = 'plain'): void {
  const frame = oval(c.x, c.y, r + 2.6, r + 2.6, 24);
  part(d, frame, WASH.metal, { shadow: 0.3, line: 1.2 });
  const glass = oval(c.x, c.y, r, r, 24);
  skin(d, glass, state === 'dark' ? '#6d7480' : '#bcd6e4', 0.65);
  if (state === 'lit') tint(d, oval(c.x, c.y + r * 0.2, r * 0.75, r * 0.6, 18), '#ffd27a', 0.55);
  edge(d, glass, 1.2);
  if (state === 'dark') {
    d.pen.hair([pt(c.x - r * 0.7, c.y - r * 0.3), pt(c.x - r * 0.1, c.y + r * 0.1), pt(c.x + r * 0.5, c.y - r * 0.5)], 0.6, d.ink, 0.85);
    d.pen.hair([pt(c.x - r * 0.1, c.y + r * 0.1), pt(c.x + r * 0.2, c.y + r * 0.75)], 0.6, d.ink, 0.85);
  }
  sheen(d, [pt(c.x - r * 0.6, c.y - r * 0.2), pt(c.x - r * 0.3, c.y - r * 0.65), pt(c.x + r * 0.1, c.y - r * 0.8)], 1);
  rivets(d, Array.from({ length: 8 }, (_, i) => pt(c.x + Math.cos((i / 8) * Math.PI * 2) * (r + 1.4), c.y + Math.sin((i / 8) * Math.PI * 2) * (r + 1.4))), 0.4);
}

/** The hatch with its little window and handle, and the ladder down from it. */
function hatch(d: Draw, x: number): void {
  const door = roundRect(x, -62, x + 13, -34, 2);
  part(d, door, '#c3c9d1', { shadow: 0.3, line: 1.2 });
  edge(d, roundRect(x + 3, -58, x + 10, -51, 1.2), 0.8);
  d.pen.stroke([pt(x + 10.4, -46), pt(x + 10.4, -42)], 1.2, d.ink, 0.9, false);
  for (const lx of [x + 2.6, x + 10]) d.pen.hair([pt(lx, -33), pt(lx + 2.4, 0)], 0.9, d.ink, 0.9);
  for (let y = -28; y < 0; y += 5.5) d.pen.hair([pt(x + 2.6 + (-y / 33) * 2.4, y), pt(x + 10 + (-y / 33) * 2.4, y)], 0.8, d.ink, 0.85);
}

/** The RCS quad: a block with three small nozzles. */
function rcs(d: Draw, x: number, y: number, side: 1 | -1): void {
  const block = roundRect(x - 2.4, y - 2.4, x + 2.4, y + 2.4, 0.6);
  part(d, block, WASH.metal, { shadow: 0, line: 0.9 });
  for (const [dx, dy] of [[side * 2.4, 0], [0, -2.4], [0, 2.4]] as const) {
    d.pen.stroke([pt(x + dx, y + dy), pt(x + dx * 1.8 + (dx === 0 ? 0 : side), y + dy * 1.8)], 1.6, d.ink, 0.85, false);
  }
}

function dish(d: Draw, at: Pt, r: number): void {
  d.pen.stroke([pt(at.x, at.y), pt(at.x + 2, at.y - r * 1.2)], 1, d.ink, 0.95, false);
  const bowl = [pt(at.x - r + 2, at.y - r * 1.6), pt(at.x + r + 2, at.y - r * 2.2), pt(at.x + r * 0.6 + 2, at.y - r * 1.2), pt(at.x + 2, at.y - r * 1)];
  part(d, bowl, '#e3e6ea', { shadow: 0.35, line: 1 });
  d.pen.hair([pt(at.x + 2, at.y - r * 1.5), pt(at.x + 5, at.y - r * 2.4)], 0.6, d.ink, 0.9);
  d.pen.dot(at.x + 5.2, at.y - r * 2.5, 0.8, d.ink);
}

/** The dish after the crash: its mast snapped, the bowl hanging off the hull by its cable. */
function snappedDish(d: Draw, at: Pt, r: number): void {
  d.pen.stroke([pt(at.x, at.y), pt(at.x + 1, at.y - r * 0.5)], 1, d.ink, 0.95, false);
  d.pen.stroke([pt(at.x + 0.2, at.y - r * 0.5), pt(at.x + 1.6, at.y - r * 0.62), pt(at.x + 1, at.y - r * 0.45)], 0.7, d.ink, 0.9, false);
  const x = at.x - r * 1.6;
  const y = at.y + r * 0.9;
  const bowl = [pt(x - r * 0.4, y - r * 0.9), pt(x + r * 0.2, y + r * 0.9), pt(x + r * 0.9, y + r * 0.5), pt(x + r * 0.7, y - r * 0.2)];
  part(d, bowl, '#e3e6ea', { shadow: 0.35, line: 1 });
  // The cable it hangs by.
  d.pen.stroke([pt(at.x + 0.6, at.y - r * 0.4), pt(at.x - r * 0.6, at.y + r * 0.2), pt(x + r * 0.7, y - r * 0.2)], 0.6, d.ink, 0.8, false);
}

/** The hull's gash after the crash, low on the left: torn metal round a dark hole. */
function gash(d: Draw): void {
  const hole = [pt(-26, -41), pt(-21, -44.5), pt(-16, -42.5), pt(-13, -38), pt(-18, -36.5), pt(-22, -39), pt(-25, -37)];
  tint(d, hole, '#3a3a44', 0.75);
  edge(d, hole, 1);
  // Peeled edges and a crack running off it.
  d.pen.stroke([pt(-21, -44.5), pt(-19, -47.5), pt(-17, -45.5)], 0.7, d.ink, 0.85, false);
  d.pen.hair([pt(-26, -41), pt(-28, -43.5)], 0.55, d.ink, 0.8);
  d.pen.hair([pt(-13, -38), pt(-10, -40), pt(-7, -39)], 0.55, d.ink, 0.8);
}

/** The welded plate over where the gash was. */
function weldPlate(d: Draw): void {
  const plate = roundRect(-28, -45.6, -11, -35.6, 1.2);
  part(d, plate, '#c4cad3', { shadow: 0.25, line: 1 });
  rivets(d, [pt(-26, -44), pt(-13, -44), pt(-26, -37.4), pt(-13, -37.4)], 0.45);
  // Weld bead along the top.
  for (let x = -27; x < -11; x += 2.2) d.pen.dot(x, -45.9, 0.55, d.ink, 0.7);
}

/** The ore hopper: a funnel on a bracket where the bag is tipped in. */
function hopper(d: Draw, x: number, look: Look): void {
  const funnel = [pt(x, -46), pt(x + 16, -46), pt(x + 10, -34), pt(x + 6, -34)];
  part(d, funnel, look === 0 ? '#bfae86' : WASH.metal, { shadow: 0.45, line: 1.1 });
  d.pen.hair([pt(x + 1.4, -43.4), pt(x + 14.6, -43.4)], 0.6, d.ink, 0.7);
  const chute = [pt(x + 6, -34), pt(x + 10, -34), pt(x + 4, -26), pt(x, -27)];
  part(d, chute, WASH.darkMetal, { shadow: 0, line: 0.9, alpha: 0.55 });
  // A few ore lumps on the lip, in highlighter: the last load.
  for (const [lx, c] of [[x + 4, '#ffa94d'], [x + 9, '#f3e04a'], [x + 12.5, '#74c7f2']] as const) {
    const lump = oval(lx, -47.2, 1.8, 1.4, 10);
    skin(d, lump, c, 0.9);
    edge(d, lump, 0.6);
  }
}

function tinCan(d: Draw, wreck: Wreck): void {
  for (const side of [-1, 1] as const) leg(d, side, false);
  if (wreck.thrusters) crumpledBell(d, 0, 12);
  else bell(d, 0, 12);
  const hull = [pt(-29, -30), pt(29, -30), pt(30, -68), pt(25, -82), pt(14, -91), pt(0, -94), pt(-14, -91), pt(-25, -82), pt(-30, -68)];
  part(d, hull, HULL[0]!, { shadow: 0.42, line: 1.8 });
  heatShield(d, -29, 29, -30);
  if (wreck.hull) {
    // Heat-shield tiles torn away on the right.
    const torn = [pt(8, -35.6), pt(22, -35.6), pt(20, -30), pt(10, -30)];
    skin(d, torn, HULL[0]!, 1);
    d.pen.stroke([pt(8, -35.6), pt(10, -32), pt(10, -30)], 0.8, d.ink, 0.85, false);
    d.pen.stroke([pt(22, -35.6), pt(20.5, -33), pt(20, -30)], 0.8, d.ink, 0.85, false);
  }
  for (const y of [-46, -70]) {
    d.pen.hair([pt(-29.6, y), pt(29.6, y)], 0.8, d.ink, 0.75);
    rivets(d, Array.from({ length: 9 }, (_, i) => pt(-24 + i * 6, y + 2.2)), 0.45);
  }
  // A dent and a weld patch: this can has had a hard life.
  d.pen.stroke([pt(-24, -56), pt(-20, -54), pt(-17, -57)], 0.7, d.ink, 0.7, false);
  tint(d, roundRect(16, -78, 24, -72, 1), '#a8683f', 0.25);
  edge(d, roundRect(16, -78, 24, -72, 1), 0.6, 0.8);
  porthole(d, pt(-8, -58), 7, wreck.printer ? 'dark' : 'lit');
  hatch(d, 10);
  if (wreck.hull) gash(d);
  else weldPlate(d);
  rcs(d, -30, -76, -1);
  // The spare fuel tank strapped to the left leg.
  const tank = capsule(pt(-34, -24), pt(-34, -10), 4.6, 4.6);
  part(d, tank, WASH.can, { shadow: 0.4, line: 1 });
  for (const y of [-20, -13]) d.pen.hair([pt(-38.6, y), pt(-29.4, y)], 0.9, d.ink, 0.85);
  if (wreck.comms) snappedDish(d, pt(-6, -93), 7);
  else dish(d, pt(-6, -93), 7);
  d.pen.stroke([pt(6, -93), pt(8, -110)], 1, d.ink, 1, false);
  const pennant = [pt(8, -110), pt(19, -107), pt(8, -104)];
  part(d, pennant, '#e8d9a8', { shadow: 0, line: 0.9 });
  // Landing light under the hull.
  edge(d, oval(-18, -28, 2.4, 1.4, 10), 0.8);
  hopper(d, 31, 0);
}

function refitted(d: Draw): void {
  // Solar wing on a hinged arm, behind everything.
  d.pen.stroke([pt(-24, -80), pt(-52, -92)], 1.6, d.ink, 0.9, false);
  const wing = [pt(-50, -104), pt(-74, -96), pt(-70, -78), pt(-46, -86)];
  part(d, wing, '#b9c6d6', { shadow: 0, line: 1.2, alpha: 0.6 });
  for (let k = 1; k < 4; k++) {
    d.pen.hair([pt(-50 - k * 6, -104 + k * 2), pt(-46 - k * 6, -86 + k * 2)], 0.5, d.ink, 0.7);
  }
  d.pen.hair([pt(-48, -95), pt(-72, -87)], 0.5, d.ink, 0.7);
  for (const side of [-1, 1] as const) leg(d, side, true);
  bell(d, 0, 13);
  const hull = [pt(-30, -30), pt(30, -30), pt(31, -70), pt(26, -84), pt(14, -93), pt(0, -96), pt(-14, -93), pt(-26, -84), pt(-31, -70)];
  part(d, hull, HULL[1]!, { shadow: 0.42, line: 1.8 });
  heatShield(d, -30, 30, -30);
  for (const y of [-46, -72]) {
    d.pen.hair([pt(-30.6, y), pt(30.6, y)], 0.8, d.ink, 0.75);
    rivets(d, Array.from({ length: 9 }, (_, i) => pt(-24 + i * 6, y + 2.2)), 0.45);
  }
  // The guild's painted band round the hull, between the seams.
  const band = [pt(-30.8, -66), pt(30.8, -66), pt(30.9, -60), pt(-30.9, -60)];
  tint(d, band, '#8fa3c0', 0.35);
  porthole(d, pt(-8, -60), 7);
  hatch(d, 10);
  rcs(d, -31, -78, -1);
  // Cargo pod clamped to the left side.
  const pod = roundRect(-48, -60, -30, -32, 2);
  part(d, pod, '#cfc2a2', { shadow: 0.45, cross: true, line: 1.3 });
  for (const y of [-52, -40]) d.pen.hair([pt(-50, y), pt(-28, y)], 1.1, d.ink, 0.85);
  edge(d, roundRect(-44, -50, -34, -42, 0.8), 0.7);
  // Floodlight mast and a bigger dish.
  d.pen.stroke([pt(18, -90), pt(26, -118)], 1.2, d.ink, 1, false);
  const flood = roundRect(23, -124, 33, -117, 1.2);
  part(d, flood, WASH.metal, { shadow: 0, line: 0.9 });
  skin(d, oval(33.4, -120.5, 1.4, 2.8, 10), '#f1ecc8', 0.85);
  dish(d, pt(-8, -95), 10);
  hopper(d, 32, 1);
}

function hauler(d: Draw): void {
  for (const side of [-1, 1] as const) leg(d, side, true);
  bell(d, -14, 10);
  bell(d, 14, 10);
  const hull = [pt(-40, -30), pt(40, -30), pt(42, -64), pt(34, -84), pt(18, -94), pt(-18, -94), pt(-34, -84), pt(-42, -64)];
  part(d, hull, HULL[2]!, { shadow: 0.45, cross: true, line: 1.9 });
  heatShield(d, -40, 40, -30);
  for (const y of [-48, -66]) d.pen.stroke([pt(-41, y), pt(0, y + 1), pt(41, y)], 0.8, d.ink, 0.75, false);
  sheen(d, [pt(-30, -82), pt(-12, -90)], 1.2);
  // Radiator fins down the left flank.
  const rack = [pt(-41, -80), pt(-47, -82), pt(-47, -44), pt(-41.5, -42)];
  part(d, rack, '#b9c6d6', { shadow: 0.4, line: 1 });
  for (let y = -79; y < -44; y += 3) d.pen.hair([pt(-47, y), pt(-41.2, y + 0.4)], 0.55, d.ink, 0.75);
  // A wide cockpit window.
  const window = [pt(-20, -82), pt(14, -84), pt(20, -74), pt(-22, -72)];
  skin(d, window, '#bcd6e4', 0.65);
  edge(d, window, 1.3);
  sheen(d, [pt(-16, -79), pt(4, -80.5)], 1);
  hatch(d, 16);
  rcs(d, -42, -88, -1);
  rcs(d, 42, -60, 1);
  // Loading crane over the hopper.
  d.pen.stroke([pt(30, -90), pt(30, -112), pt(56, -100)], 1.6, d.ink, 0.95, false);
  d.pen.hair([pt(52, -102), pt(52, -60)], 0.7, d.ink, 0.85);
  edge(d, oval(52, -58.6, 1.6, 1.6, 10), 0.8);
  dish(d, pt(-10, -94), 11);
  hopper(d, 43, 2);
}

/** The lander in a look; the tin can also shows what the crash broke, if anything. */
export function drawLander(d: Draw, look: Look, wreck: Wreck = SOUND): void {
  if (look === 0) tinCan(d, wreck);
  else if (look === 1) refitted(d);
  else hauler(d);
}

/** The lander's look for a planet: refitted on reaching planet 4, a hauler from planet 8. */
export function landerLook(planet: number): Look {
  return planet >= 8 ? 2 : planet >= 4 ? 1 : 0;
}
