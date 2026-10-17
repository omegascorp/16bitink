import { capsule, oval, pt, tube, type Draw } from '../kit';
import { dab, gleam, LIGHT, mix, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { guildMark } from '../landerParts';
import { part, rivets, roundRect, seam } from '../prospector/parts';
import { COLOR, cylinder, drumShape, faceted, frameArc, letters, navLight, pitting, plates, repairPlate, stencil, streaks, type ShipLook } from './hull';

/**
 * Midships (index.ts): an open truss holding the fuel tank, then the hold,
 * a faceted box with its doors in its flank, the docking collar the lander
 * locks onto on top, the dish and the sensor mast, and three ore pods slung
 * under it.
 */

/** The truss between the stern and the hold. */
const TRUSS = { x0: -86, x1: -44, h: 11.6, bays: [-86, -78, -70, -62, -54, -44] } as const;
/** The fuel tank, wound in carbon fibre, nested in the truss. */
const TANK = { x0: -78, x1: -48, r: 9.2 } as const;
/** The hold: its ends, its half height and its chines (where its side meets its top and keel). */
export const HOLD = { x0: -41, x1: 28, r: 16, e: 1.8, chines: [-10, 9.4] as const, frames: [-30, -18, -6, 6, 17] } as const;
const PODS = [-37, -14, 9] as const;
const POD = { len: 18, r: 5.2, y: 24.6 } as const;

/** A truss member: a thin tube. */
function member(d: Draw, a: Pt, b: Pt, w: number, color: string): void {
  part(d, tube([a, b], w, w), color, { shadow: 0.3, line: 0.26, hatch: 0, gloss: true });
}

/** The far side of the truss, behind the tank: darker, thinner. */
function trussBack(d: Draw): void {
  const far = mix(COLOR.gunmetal, SHADOW, 0.4);
  const { h, bays } = TRUSS;
  for (const y of [-h + 1.6, h - 1.6]) member(d, pt(TRUSS.x0, y), pt(TRUSS.x1, y), 0.9, far);
  for (let i = 0; i + 1 < bays.length; i++) member(d, pt(bays[i]!, h - 1.6), pt(bays[i + 1]!, -h + 1.6), 0.6, far);
  // Feed lines along it, tank to bay: one copper, one in a sleeve.
  part(d, tube([pt(TRUSS.x1, 6.8), pt(-60, 7.2), pt(TRUSS.x0, 7)], 1.1, 1.1), mix(COLOR.copper, SHADOW, 0.15), { shadow: 0.4, line: 0.3, hatch: 0, gloss: true });
  part(d, tube([pt(TRUSS.x1, -7.4), pt(TRUSS.x0, -7.6)], 1.3, 1.3), COLOR.dark, { shadow: 0.3, line: 0.3, hatch: 0 });
}

/** The near side of the truss, in front of the tank: longerons, posts at each bay and a diagonal across it. */
function trussFront(d: Draw): void {
  const { h, bays } = TRUSS;
  for (const y of [-h, h]) member(d, pt(TRUSS.x0, y), pt(TRUSS.x1, y), 1.5, COLOR.gunmetal);
  bays.forEach((x, i) => {
    member(d, pt(x, -h), pt(x, h), 0.9, COLOR.gunmetal);
    // Braced across the end bays only, so the tank shows between.
    if (i === 0 || i === bays.length - 2) member(d, pt(x + 0.6, i % 2 ? h - 0.6 : -h + 0.6), pt(bays[i + 1]! - 0.6, i % 2 ? -h + 0.6 : h - 0.6), 0.75, mix(COLOR.gunmetal, LIGHT, 0.1));
    // The node plates where they meet.
    for (const y of [-h, h]) {
      part(d, roundRect(x - 1.2, y - 1.2, x + 1.2, y + 1.2, 0.3), COLOR.metal, { shadow: 0.3, line: 0.25, hatch: 0, gloss: true });
      rivets(d, [pt(x - 0.5, y - 0.5), pt(x + 0.5, y + 0.5)], 0.14);
    }
  });
}

/**
 * The fuel tank: carbon fibre wound in crossing helices over a liner, metal
 * bosses at its ends, clamp bands round it. Split along a seam, frosted and
 * fraying, until it's mended; then a fresh wrap over the split, new bands
 * and a gauge.
 */
function tank(d: Draw, look: ShipLook): void {
  const { pen } = d;
  const { x0, x1, r } = TANK;
  const shape = capsule(pt(x0 + r * 0.7, 0), pt(x1 - r * 0.7, 0), r * 2, r * 2);
  cylinder(d, shape, COLOR.fibre, -r, r, { gloss: true, hatch: 0.15 });
  pen.clipped(shape, () => {
    // The weave: helices crossing both ways, fine and close.
    for (let x = x0 - 20; x < x1 + 4; x += 0.9) {
      pen.hair([pt(x, -r), pt(x + 13, r)], 0.1, '#1a1b22', 0.4);
      pen.hair([pt(x + 13, -r), pt(x, r)], 0.1, mix(COLOR.fibre, LIGHT, 0.4), 0.22);
    }
    // A satin sheen along it.
    dab(d, [pt(x0, -r * 0.62), pt(x1, -r * 0.62), pt(x1, -r * 0.4), pt(x0, -r * 0.4)], LIGHT, 0.2, 0.8);
  });
  pen.stroke([...shape, shape[0]!], 0.5, d.ink, 0.9, false);
  // Bosses at the domes, with their fittings.
  for (const [x, dir] of [[x0 + 0.4, -1], [x1 - 0.4, 1]] as const) {
    part(d, oval(x, 0, 1.3, 2.6, 14), COLOR.metal, { shadow: 0.4, line: 0.3, hatch: 0, gloss: true });
    part(d, roundRect(x + dir * 1.2 - 0.7, -0.7, x + dir * 1.2 + 0.7, 0.7, 0.2), COLOR.copper, { shadow: 0.3, line: 0.22, hatch: 0 });
  }
  // Clamp bands, each with its lug and bolt.
  const bands = look.tank ? [-71, -66.2, -59.5, -54.8] : [-70, -56];
  for (const x of bands) {
    const band = [...frameArc(x + 0.8, r + 0.25, 1.2), ...frameArc(x - 0.5, r + 0.25, 1.2).reverse()];
    cylinder(d, band, look.tank && Math.abs(x + 63) < 4 ? mix(COLOR.metal, LIGHT, 0.25) : COLOR.metal, -r, r, { hatch: 0, gloss: true });
    pen.hair([...band, band[0]!], 0.22, d.ink, 0.8);
    part(d, roundRect(x - 0.9, -r - 1.3, x + 1.3, -r + 0.2, 0.3), COLOR.gunmetal, { shadow: 0.3, line: 0.22, hatch: 0 });
  }
  // A label band: ochre, stencilled.
  const label = roundRect(-52.5, 2.2, -49.6, 5.4, 0.2);
  pen.fill(label, COLOR.ochre, 0.85);
  pen.hair([...label, label[0]!], 0.18, d.ink, 0.7);
  stencil(d, -52.2, 3.2, 2.4, 0.45, COLOR.dark, 0.7);
  if (look.tank) mendedTank(d, look.power);
  else splitTank(d);
}

/** The split the wormhole tore along the tank's top: a ragged black gash, fibre fraying out of it, frost round it. */
function splitTank(d: Draw): void {
  const { pen } = d;
  const lip = [pt(-69, -6.4), pt(-66.5, -5.3), pt(-64.6, -6.2), pt(-62, -4.8), pt(-59.8, -5.6), pt(-57.2, -4.4), pt(-55.4, -5)];
  const under = [...lip.map((p, i) => pt(p.x, p.y + 0.9 + (i % 2) * 0.5)).reverse()];
  pen.fill([...lip, ...under], '#0d0e14', 0.95);
  pen.hair(lip.map((p) => pt(p.x, p.y - 0.25)), 0.22, mix(COLOR.fibre, LIGHT, 0.55), 0.8);
  pen.hair(lip, 0.3, d.ink, 0.9);
  // Fraying strands curling out of the lip.
  for (let i = 0; i < 14; i++) {
    const p = lip[Math.floor(pen.rng() * (lip.length - 1))]!;
    const x = p.x + pen.rng() * 2;
    const up = 0.8 + pen.rng() * 1.6;
    pen.hair([pt(x, p.y), pt(x + 0.4 + pen.rng() * 0.6, p.y - up * 0.6), pt(x + 0.2 + pen.rng(), p.y - up)], 0.1, '#2a2b33', 0.85);
  }
  // Frost: the fuel froze as it boiled off, in crystals round the split and streaks down the side.
  const frosted = capsule(pt(TANK.x0 + 6.4, 0), pt(TANK.x1 - 6.4, 0), TANK.r * 2, TANK.r * 2);
  pen.clipped(frosted, () => {
    dab(d, oval(-62, -4.8, 9, 3.4, 18), '#e8f4fa', 0.35, 1.2);
    for (const x of [-66, -61, -57.5]) dab(d, [pt(x - 0.8, -4), pt(x + 0.8, -4), pt(x + 0.3, 5), pt(x - 0.4, 5)], '#e8f4fa', 0.22, 0.6);
  });
  pen.stipple(frosted, 260, (x, y) => Math.max(0, 1 - Math.hypot((x + 62) / 9, (y + 5) / 4)), 0.16, '#f4fbff');
}

/** The split mended: a band of fresh fibre wound over it, edged with resin, and a gauge on a clamp. */
function mendedTank(d: Draw, lit: boolean): void {
  const { pen } = d;
  const wrap = [...frameArc(-58.2, TANK.r + 0.12, 1.2), ...frameArc(-67.6, TANK.r + 0.12, 1.2).reverse()];
  cylinder(d, wrap, mix(COLOR.fibre, '#6b5a48', 0.35), -TANK.r, TANK.r, { gloss: true, hatch: 0 });
  pen.clipped(wrap, () => {
    for (let x = -80; x < -50; x += 0.7) pen.hair([pt(x, -TANK.r), pt(x + 6, TANK.r)], 0.1, '#1a1b22', 0.4);
  });
  for (const x of [-67.6, -58.2]) pen.hair(frameArc(x, TANK.r + 0.12, 1.2), 0.32, '#c9a46a', 0.9);
  pen.hair([...wrap, wrap[0]!], 0.24, d.ink, 0.85);
  // The gauge, on a clamp below the wrap.
  const c = pt(-65.4, 4.4);
  part(d, oval(c.x, c.y, 1.7, 1.7, 16), COLOR.ceramic, { shadow: 0.3, line: 0.28, hatch: 0, gloss: true });
  pen.hair([pt(c.x, c.y), pt(c.x + 1, c.y - 0.9)], 0.18, COLOR.red, 0.95);
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.8 + (k / 6) * 1.4);
    pen.hair([pt(c.x + Math.cos(a) * 1.2, c.y + Math.sin(a) * 1.2), pt(c.x + Math.cos(a) * 1.5, c.y + Math.sin(a) * 1.5)], 0.08, d.ink, 0.8);
  }
  navLight(d, pt(-59.4, 4.6), COLOR.green, lit, 0.4);
}

/** The truss, the tank in it and the feed lines. */
export function waist(d: Draw, look: ShipLook): void {
  trussBack(d);
  tank(d, look);
  trussFront(d);
}

/** An ore pod: bronze-washed, domed ends darker, bands round it, a load hatch and its number. */
function pod(d: Draw, x: number, i: number): void {
  const { pen } = d;
  const { len, r, y } = POD;
  for (const px of [x + 3.5, x + len - 3.5]) {
    const pylon = [pt(px - 1.1, HOLD.r - 0.5), pt(px + 1.1, HOLD.r - 0.5), pt(px + 0.7, y - r + 0.6), pt(px - 0.7, y - r + 0.6)];
    part(d, pylon, COLOR.gunmetal, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
    pen.hair([pt(px - 0.2, HOLD.r + 0.4), pt(px - 0.2, y - r)], 0.14, PAPER_FILL, 0.4);
  }
  const body = capsule(pt(x + r * 0.8, y), pt(x + len - r * 0.8, y), r * 2, r * 2);
  cylinder(d, body, COLOR.pod, y - r, y + r, { gloss: true, hatch: 0.22 });
  pen.clipped(body, () => {
    for (const [a, b] of [[x - 1, x + 2.6], [x + len - 2.6, x + len + 1]] as const) pen.fill([pt(a, y - r - 1), pt(b, y - r - 1), pt(b, y + r + 1), pt(a, y + r + 1)], SHADOW, 0.22);
    pitting(d, body, 60);
    dab(d, [pt(x + 4, y + 1), pt(x + 13, y + 0.4), pt(x + 12, y + 3.6), pt(x + 5, y + 4)], COLOR.grime, 0.12, 1);
  });
  pen.stroke([...body, body[0]!], 0.48, d.ink, 0.9, false);
  for (const bx of [x + 2.6, x + len - 2.6]) {
    const band = [...frameArc(bx + 0.6, r + 0.2, 0.7, y), ...frameArc(bx - 0.6, r + 0.2, 0.7, y).reverse()];
    cylinder(d, band, mix(COLOR.pod, SHADOW, 0.3), y - r, y + r, { hatch: 0 });
    pen.hair([...band, band[0]!], 0.2, d.ink, 0.8);
  }
  // The load hatch with its hinges and dogs.
  const hatch = roundRect(x + 6, y - 3.4, x + 12, y + 0.6, 0.5);
  pen.hair([...hatch, hatch[0]!], 0.26, d.ink, 0.85);
  pen.hair(hatch.map((p) => pt(p.x + 0.12, p.y + 0.2)), 0.18, PAPER_FILL, 0.4);
  for (const hx of [x + 7, x + 11]) part(d, roundRect(hx - 0.5, y - 3.8, hx + 0.5, y - 3, 0.15), COLOR.dark, { shadow: 0.2, line: 0.18, hatch: 0 });
  rivets(d, [pt(x + 6.6, y - 0.1), pt(x + 11.4, y - 0.1)], 0.16);
  letters(d, `0${i + 1}`, x + 13.2, y + 2.2, 2.4, '#3a2f2a');
  gleam(d, [pt(x + 2, y - r * 0.55), pt(x + len - 2, y - r * 0.55)], 0.4, 0.55);
}

/**
 * The cargo hold's doors: two leaves in a recessed frame, braced, hinged
 * along the top, latches and a control panel, chevrons along the sill.
 */
function holdDoors(d: Draw, lit: boolean): void {
  const { pen } = d;
  const frame = roundRect(-17.4, -8.4, 3.4, 7, 0.8);
  part(d, frame, mix(COLOR.hold, SHADOW, 0.35), { shadow: 0.35, line: 0.45, hatch: 0 });
  for (const [a, b] of [[-16.6, -7.2], [-6.8, 2.6]] as const) {
    const leaf = roundRect(a, -7.6, b, 5.2, 0.4);
    part(d, leaf, mix(COLOR.hold, LIGHT, 0.08), { shadow: 0.4, line: 0.38, gloss: true, hatch: 0.1 });
    // Pressed stiffeners: a cross brace in each leaf.
    for (const [p, q] of [[pt(a + 0.8, -6.8), pt(b - 0.8, 4.4)], [pt(b - 0.8, -6.8), pt(a + 0.8, 4.4)]] as const) seam(d, [p, q], 0.22);
    pen.hair(roundRect(a + 0.6, -7, b - 0.6, 4.6, 0.3), 0.16, d.ink, 0.5);
  }
  pen.stroke([pt(-7, -7.8), pt(-7, 5.4)], 0.45, d.ink, 0.9, false);
  for (const x of [-15, -10, -4.2, 0.8]) part(d, roundRect(x - 0.6, -8.2, x + 0.6, -7.2, 0.2), COLOR.dark, { shadow: 0.2, line: 0.2, hatch: 0 });
  for (const x of [-8.2, -5.8]) part(d, roundRect(x - 0.35, -2.4, x + 0.35, 0.2, 0.15), COLOR.dark, { shadow: 0.2, line: 0.18, hatch: 0 });
  // Chevrons along the sill.
  const sill = roundRect(-16.6, 5.6, 2.6, 6.6, 0.15);
  pen.fill(sill, COLOR.ochre, 0.92);
  pen.clipped(sill, () => {
    for (let x = -17.2; x < 3; x += 1.25) pen.fill([pt(x, 6.6), pt(x + 0.55, 6.6), pt(x + 1.2, 5.6), pt(x + 0.65, 5.6)], COLOR.dark, 0.85);
  });
  // The door's control panel: a plate, two lamps, a lever.
  part(d, roundRect(4.6, -6.4, 7.6, -1.4, 0.3), COLOR.gunmetal, { shadow: 0.3, line: 0.25, hatch: 0, gloss: true });
  navLight(d, pt(5.5, -5.3), COLOR.ochre, lit, 0.32);
  navLight(d, pt(6.8, -5.3), COLOR.green, lit, 0.32);
  pen.stroke([pt(6.1, -2.2), pt(6.9, -3.6)], 0.32, COLOR.dark, 1, false);
}

/** The docking collar on top, where the lander locks on: a flanged drum, its latches, its target, and a hatch. */
function dockingCollar(d: Draw, lit: boolean): void {
  const { pen } = d;
  const top = -HOLD.r;
  part(d, roundRect(-34.6, top - 1.6, -19.4, top + 0.6, 0.5), mix(COLOR.metal, SHADOW, 0.1), { shadow: 0.35, line: 0.35, hatch: 0, gloss: true });
  const body = [pt(-32.4, top - 7), pt(-21.6, top - 7), pt(-21.6, top - 1.4), pt(-32.4, top - 1.4)];
  part(d, body, COLOR.metal, { shadow: 0.45, line: 0.45, gloss: true, hatch: 0.1 });
  for (const x of [-30, -27, -24]) seam(d, [pt(x, top - 6.8), pt(x, top - 1.6)], 0.2);
  part(d, roundRect(-33.8, top - 8.8, -20.2, top - 6.8, 0.6), mix(COLOR.metal, SHADOW, 0.25), { shadow: 0.35, line: 0.4, hatch: 0, gloss: true });
  // Latches round the ring, and guide pins.
  for (const x of [-32.6, -29.2, -24.8, -21.4]) part(d, roundRect(x - 0.6, top - 10, x + 0.6, top - 8.6, 0.2), COLOR.dark, { shadow: 0.2, line: 0.2, hatch: 0 });
  for (const x of [-31, -23]) pen.stroke([pt(x, top - 8.8), pt(x, top - 11.2)], 0.3, COLOR.dark, 1, false);
  // The target the lander lines up on.
  pen.hair([pt(-27, top - 6.4), pt(-27, top - 2)], 0.22, d.ink, 0.85);
  pen.hair([pt(-29.2, top - 4.2), pt(-24.8, top - 4.2)], 0.22, d.ink, 0.85);
  pen.hair(oval(-27, top - 4.2, 1.4, 1.4, 14), 0.18, d.ink, 0.8);
  navLight(d, pt(-20.8, top - 9.6), COLOR.white, lit, 0.4);
  rivets(d, [-33.4, -30.2, -27, -23.8, -20.6].map((x) => pt(x, top - 0.5)), 0.15);
}

/** The dish on its mast, with a feed horn on struts, and the sensor mast forward of it. */
function masts(d: Draw, lit: boolean): void {
  const { pen } = d;
  const top = -HOLD.r;
  part(d, tube([pt(12, top + 0.4), pt(13.2, top - 9)], 1.4, 1), COLOR.metal, { shadow: 0.4, line: 0.32, hatch: 0, gloss: true });
  part(d, roundRect(10.6, top - 1, 14.6, top + 0.6, 0.4), COLOR.gunmetal, { shadow: 0.3, line: 0.3, hatch: 0 });
  // The gimbal, then the bowl: tipped up and forward, its back to us.
  part(d, oval(13.4, top - 9.6, 1.4, 1.4, 14), COLOR.gunmetal, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  const rim = oval(15.4, top - 14.2, 8.6, 2.8, 30).map((p) => rotate(p, pt(15.4, top - 14.2), -0.32));
  const back = [...rim.slice(0, 16), pt(14, top - 9.4)];
  part(d, back, '#cfd3da', { shadow: 0.45, line: 0.45, hatch: 0.12, gloss: true });
  for (const k of [3, 6, 9, 12]) pen.hair([rim[k]!, pt(14, top - 9.6)], 0.14, d.ink, 0.45);
  part(d, rim, '#e6e8ec', { shadow: 0.25, line: 0.45, hatch: 0, gloss: true });
  pen.fill(oval(15.6, top - 14.4, 6.6, 1.8, 26).map((p) => rotate(p, pt(15.4, top - 14.2), -0.32)), SHADOW, 0.12);
  const horn = pt(17.6, top - 22.4);
  for (const k of [2, 14, 23]) pen.hair([rim[k]!, horn], 0.18, d.ink, 0.85);
  part(d, roundRect(horn.x - 0.8, horn.y - 1, horn.x + 0.8, horn.y + 0.6, 0.3), COLOR.gunmetal, { shadow: 0.2, line: 0.22, hatch: 0 });
  // The sensor mast: a lattice, two booms and a beacon.
  const mx = 23.6;
  pen.stroke([pt(mx, top + 0.3), pt(mx + 0.4, top - 15)], 0.45, d.ink, 0.95, false);
  pen.stroke([pt(mx + 1.4, top + 0.3), pt(mx + 0.9, top - 12)], 0.35, d.ink, 0.9, false);
  for (let y = top - 1.5; y > top - 12; y -= 2.2) pen.hair([pt(mx, y), pt(mx + 1.3, y - 1.1)], 0.14, d.ink, 0.8);
  pen.hair([pt(mx - 2.2, top - 10.2), pt(mx + 3.2, top - 10.6)], 0.24, d.ink, 0.9);
  pen.hair([pt(mx - 1.4, top - 13), pt(mx + 2.4, top - 13.2)], 0.22, d.ink, 0.9);
  part(d, oval(mx - 2.4, top - 10.2, 0.6, 0.6, 10), COLOR.ceramic, { shadow: 0.2, line: 0.18, hatch: 0 });
  navLight(d, pt(mx + 0.42, top - 15.8), COLOR.red, lit, 0.6);
}

function rotate(p: Pt, c: Pt, a: number): Pt {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return pt(c.x + (p.x - c.x) * cos - (p.y - c.y) * sin, c.y + (p.x - c.x) * sin + (p.y - c.y) * cos);
}

/** A handrail along the top on stanchions, for walking it in a suit. */
function handrail(d: Draw, x0: number, x1: number, y: number): void {
  const { pen } = d;
  for (let x = x0; x <= x1; x += 3.4) pen.hair([pt(x, y), pt(x, y - 1.6)], 0.2, d.ink, 0.85);
  pen.hair([pt(x0 - 0.4, y - 1.5), pt(x1 + 0.4, y - 1.5)], 0.24, d.ink, 0.9);
  pen.hair([pt(x0 - 0.4, y - 1.7), pt(x1 + 0.4, y - 1.7)], 0.1, PAPER_FILL, 0.5);
}

/** The hold: faceted plate, its frames and plates, its doors, the guild's mark and stripe, worn and pitted. */
export function hold(d: Draw, look: ShipLook): void {
  const { pen } = d;
  const { x0, x1, r, e, chines, frames } = HOLD;
  for (const x of PODS) pod(d, x, PODS.indexOf(x));
  // The bulkhead collar the truss bolts to.
  const collar = drumShape(x0 - 3.4, x0 + 0.2, r - 1.6, e);
  cylinder(d, collar, mix(COLOR.metal, SHADOW, 0.12), -r + 1.6, r - 1.6, { gloss: true, hatch: 0.15 });
  pen.stroke([...collar, collar[0]!], 0.5, d.ink, 0.9, false);
  rivets(d, frameArc(x0 - 1.6, r - 2.4, e, 0, 12).slice(1, -1), 0.18);
  const shape = drumShape(x0, x1, r, e);
  faceted(d, shape, COLOR.hold, -r, chines, r);
  plates(d, shape, frames, [-3], r, e, { rivet: 0.18 });
  pen.clipped(shape, () => {
    for (const y of chines) seam(d, [pt(x0 - 2, y), pt(x1 + 2, y)], 0.34);
    gleam(d, [pt(x0 + 1, chines[0] - 0.5), pt(x1 - 1, chines[0] - 0.5)], 0.35, 0.6);
    // The guild's stripe and pinstripe along the side.
    pen.fill([pt(x0 - 2, 2.6), pt(x1 + 3, 2.6), pt(x1 + 3, 4.6), pt(x0 - 2, 4.6)], COLOR.stripe, 0.85);
    pen.fill([pt(x0 - 2, 5.3), pt(x1 + 3, 5.3), pt(x1 + 3, 5.7), pt(x0 - 2, 5.7)], COLOR.stripe, 0.6);
    repairPlate(d, roundRect(-38.4, -8.6, -34.2, -5, 0.4), mix(COLOR.hold, '#b9b09a', 0.6));
    repairPlate(d, roundRect(19.6, 10.6, 24.4, 13.6, 0.4), mix(COLOR.hold, SHADOW, 0.2));
    pitting(d, shape, 520);
    streaks(d, shape, frames.flatMap((x) => [pt(x - 0.3, -12.5), pt(x - 0.3, 12)]), 7);
    // The wormhole's scorch over the aft end.
    dab(d, oval(x0 + 2, -2, 10, 16, 20), COLOR.scorch, 0.16, 3);
  });
  pen.stroke([...shape, shape[0]!], 0.6, d.ink, 0.95, false);
  holdDoors(d, look.power);
  // The guild's mark in a roundel.
  pen.fill(oval(12.6, -3.8, 4.6, 4.6, 24), mix(COLOR.ceramic, LIGHT, 0.3), 0.95);
  pen.hair(oval(12.6, -3.8, 4.6, 4.6, 24), 0.5, COLOR.stripe, 0.9);
  pen.hair(oval(12.6, -3.8, 3.9, 3.9, 24), 0.16, COLOR.stripe, 0.7);
  guildMark(d, pt(12.6, -3.6), 2.4);
  letters(d, 'GM 117', 7.6, 7.6, 3.6);
  stencil(d, -38, 7.4, 6, 0.6);
  stencil(d, -38, 8.6, 4, 0.6);
  handrail(d, -16, 8, -r);
  dockingCollar(d, look.power);
  masts(d, look.power);
}
