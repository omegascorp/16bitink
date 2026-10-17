import { oval, pt, ribbon, tube, type Draw } from '../kit';
import { dab, gleam, LIGHT, mix, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { part, rivets, roundRect, seam } from '../prospector/parts';
import { COLOR, cylinder, drumShape, frameArc, navLight, stencil, type ShipLook } from './hull';

/**
 * The stern (index.ts): three ion thrusters behind a power bay, radiator
 * wings above and below it, and the jump drive's ring round the waist on
 * struts, burnt black by the wild wormhole.
 */

/** The thrusters' grids (the back of the ship), their bodies' front, and where each sits. */
const GRID_X = -111;
const BODY_X = -97.5;
const THRUSTERS = [{ y: 0, r: 5.8, far: true }, { y: -10.6, r: 6.2, far: false }, { y: 10.6, r: 6.2, far: false }] as const;
/** The power bay the thrusters and wings hang off. */
const BAY = { x0: -98, x1: -84, h: 14.5 } as const;
/** The jump ring: its centre, its radius across the ship and its depth into the picture, and how thick it is. */
export const RING = { x: -80, r: 31, e: 5.6, t: 4.4 } as const;

/** An ion thruster: a drum with a magnet ring and ceramic insulators, its grids at the back; cracked and chipped until mended. */
function thruster(d: Draw, y: number, r: number, far: boolean, mended: boolean, lit: boolean): void {
  const { pen } = d;
  const body = drumShape(GRID_X + 1.2, BODY_X, r, 1.1, y);
  const tone = far ? mix(COLOR.engine, SHADOW, 0.35) : COLOR.engine;
  cylinder(d, body, tone, y - r, y + r, { hatch: far ? 0.1 : 0.2, gloss: true });
  pen.stroke([...body, body[0]!], 0.42, d.ink, 0.9, false);
  // The magnet ring, copper-wound, then the insulators' sheds in white ceramic.
  const band = (x0: number, x1: number, color: string): Pt[] => {
    const shape = [...frameArc(x1, r + 0.35, 1.1, y), ...frameArc(x0, r + 0.35, 1.1, y).reverse()];
    cylinder(d, shape, color, y - r, y + r, { hatch: 0, gloss: true });
    pen.hair([...shape, shape[0]!], 0.3, d.ink, 0.85);
    return shape;
  };
  const coil = band(-106.6, -104.4, far ? mix(COLOR.copper, SHADOW, 0.3) : COLOR.copper);
  pen.clipped(coil, () => {
    for (let k = -r; k < r; k += 0.55) pen.hair([pt(-106.4, y + k), pt(-104.5, y + k + 0.2)], 0.12, d.ink, 0.35);
  });
  const ins = band(-101.6, -99.6, far ? mix(COLOR.ceramic, SHADOW, 0.3) : COLOR.ceramic);
  for (const x of [-101, -100.2]) pen.hair(frameArc(x, r + 0.35, 1.1, y), 0.16, d.ink, 0.5);
  if (!mended && !far) {
    // Chunks gone from the insulators, showing the dark under them.
    pen.clipped(ins, () => {
      pen.fill([pt(-101.8, y - r * 0.7), pt(-100.6, y - r * 0.55), pt(-100.2, y - r * 0.2), pt(-101.4, y - r * 0.05)], COLOR.dark, 0.9);
      pen.fill([pt(-100.6, y + r * 0.3), pt(-99.4, y + r * 0.42), pt(-99.6, y + r * 0.75), pt(-100.9, y + r * 0.6)], COLOR.dark, 0.85);
    });
    pen.hair([pt(-101.4, y - r * 0.9), pt(-100.9, y - r * 0.6), pt(-101.3, y - r * 0.3)], 0.14, d.ink, 0.8);
  }
  // The grids, seen edge on: a dark disc in a heavy rim, its holes in rows.
  const face = oval(GRID_X + 0.4, y, 1.9, r * 0.92, 24);
  pen.fill(face, '#1c1d27', 0.95);
  if (mended && lit) pen.fill(face, COLOR.ion, far ? 0.35 : 0.55);
  pen.clipped(face, () => {
    for (let k = -r; k < r; k += 0.7) pen.hair([pt(GRID_X - 2, y + k), pt(GRID_X + 3, y + k)], 0.14, mix(COLOR.metal, SHADOW, 0.3), 0.55);
    if (!mended) {
      pen.hair([pt(GRID_X - 1, y - r * 0.8), pt(GRID_X + 0.6, y - r * 0.3), pt(GRID_X - 0.2, y + r * 0.1), pt(GRID_X + 1.2, y + r * 0.6)], 0.22, COLOR.metal, 0.9);
      pen.hair([pt(GRID_X + 0.4, y - r * 0.3), pt(GRID_X + 1.6, y - r * 0.1)], 0.16, COLOR.metal, 0.8);
    }
  });
  pen.stroke(oval(GRID_X + 0.4, y, 2.1, r, 24).concat([pt(GRID_X + 2.5, y)]), 0.55, mix(COLOR.metal, SHADOW, 0.2), 1, false);
  pen.hair(oval(GRID_X + 0.4, y, 2.35, r + 0.25, 24).concat([pt(GRID_X + 2.75, y)]), 0.28, d.ink, 0.9);
  gleam(d, [pt(-109, y - r * 0.62), pt(BODY_X - 1, y - r * 0.62)], 0.35, far ? 0.3 : 0.6);
  // Its feed: a cable looping forward into the bay.
  if (!far) {
    const dir = Math.sign(y);
    const cable = tube([pt(-103, y + dir * (r - 0.4)), pt(-101, y + dir * (r + 1.6)), pt(-98, y + dir * (r + 0.9)), pt(BAY.x0 + 1, y + dir * (r - 1.6))], 0.9, 0.9);
    part(d, cable, COLOR.dark, { shadow: 0.3, line: 0.3, hatch: 0, gloss: true });
  }
}

/** The power bay: chamfered gunmetal, louvres, an access panel, warning plates and pipes, rivets round it, a thruster quad on each corner. */
function bay(d: Draw, lit: boolean): void {
  const { pen } = d;
  const { x0, x1, h } = BAY;
  const shape = [pt(x0, -h + 3.5), pt(x0 + 3, -h), pt(x1 - 2, -h), pt(x1, -h + 2), pt(x1, h - 2), pt(x1 - 2, h), pt(x0 + 3, h), pt(x0, h - 3.5)];
  cylinder(d, shape, COLOR.gunmetal, -h, h, { gloss: true, hatch: 0.22 });
  pen.stroke([...shape, shape[0]!], 0.55, d.ink, 0.9, false);
  pen.clipped(shape, () => {
    seam(d, [pt(x0, -h + 4.5), pt(x1, -h + 4.5)], 0.25);
    seam(d, [pt(x0, h - 4.5), pt(x1, h - 4.5)], 0.25);
    seam(d, [pt(-91.2, -h), pt(-91.2, h)], 0.25);
  });
  // Louvres, each slat lit on its upper lip.
  for (let y = -8.6; y <= -1.4; y += 1.2) {
    pen.fill(roundRect(-96.4, y, -92.2, y + 0.55, 0.15), '#1c1d27', 0.85);
    pen.hair([pt(-96.2, y - 0.08), pt(-92.4, y - 0.08)], 0.12, PAPER_FILL, 0.45);
  }
  // The access panel, its handle and its latches.
  const panel = roundRect(-90.4, -9.4, -85.4, 2.2, 0.5);
  part(d, panel, mix(COLOR.gunmetal, LIGHT, 0.12), { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  part(d, roundRect(-88.5, -5, -87.3, -1.6, 0.4), COLOR.dark, { shadow: 0.2, line: 0.2, hatch: 0 });
  rivets(d, [pt(-89.8, -8.8), pt(-86, -8.8), pt(-89.8, 1.6), pt(-86, 1.6)], 0.16);
  // A warning plate: ochre and ink, high voltage.
  const plate = roundRect(-96.4, 1.6, -92.2, 4.6, 0.2);
  pen.fill(plate, COLOR.ochre, 0.92);
  pen.clipped(plate, () => {
    for (let x = -97; x < -92; x += 0.9) pen.fill([pt(x, 4.6), pt(x + 0.4, 4.6), pt(x + 1.2, 1.6), pt(x + 0.8, 1.6)], COLOR.dark, 0.85);
  });
  pen.hair([...plate, plate[0]!], 0.2, d.ink, 0.8);
  stencil(d, -96.2, 6.2, 4, 0.7);
  stencil(d, -90, 4.2, 4.2, 0.6, COLOR.ochre, 0.7);
  // A status lamp, dark until the power's back.
  navLight(d, pt(-86.6, 6.6), COLOR.green, lit, 0.45);
  rivets(d, [-12.6, -6, 0, 6, 12.6].flatMap((y) => [pt(x0 + 0.9, y), pt(x1 - 0.9, y)]).filter((p) => Math.abs(p.y) < h - 3), 0.18);
  for (const dir of [-1, 1] as const) quad(d, pt(-95, dir * (h + 0.6)), dir);
}

/** A thruster quad for steering: a block with three small nozzles. */
export function quad(d: Draw, at: Pt, dir: 1 | -1): void {
  const block = roundRect(at.x - 1.6, at.y - 1, at.x + 1.6, at.y + 1, 0.35);
  part(d, block, COLOR.metal, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  for (const [nx, ny] of [[0, dir], [-1, 0], [1, 0]] as const) {
    const c = pt(at.x + nx * 1.9, at.y + ny * 1.3);
    const w = 0.55;
    const n = nx === 0 ? [pt(c.x - w, c.y - dir * 0.4), pt(c.x + w, c.y - dir * 0.4), pt(c.x + w * 1.4, c.y + dir * 0.5), pt(c.x - w * 1.4, c.y + dir * 0.5)] : [pt(c.x - nx * 0.4, c.y - w), pt(c.x - nx * 0.4, c.y + w), pt(c.x + nx * 0.5, c.y + w * 1.4), pt(c.x + nx * 0.5, c.y - w * 1.4)];
    part(d, n, COLOR.dark, { shadow: 0.2, line: 0.22, hatch: 0 });
  }
}

/** A radiator wing, above or below the bay: ribbed panels in a frame, a coolant header at the root, heat-tinted near it, a light on the tip. */
function radiator(d: Draw, dir: 1 | -1, lit: boolean): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const root = BAY.h - 0.5;
  const tip = 47;
  const at = (u: number, v: number): Pt => pt(-97.5 + (-113.5 + 97.5) * v + (11.5 - 2.5 * v) * u, dir * (root + (tip - root) * v));
  const shape = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
  part(d, shape, COLOR.radiator, { shadow: 0.25, line: 0.5, hatch: 0, gloss: true });
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, dir * root, 0, dir * tip);
    g.addColorStop(0, 'rgba(184, 114, 63, 0.42)');
    g.addColorStop(0.35, 'rgba(150, 96, 140, 0.16)');
    g.addColorStop(1, 'rgba(110, 130, 190, 0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(-116, Math.min(dir * root, dir * tip), 32, Math.abs(tip - root));
    // The coolant channels, close ribs down each panel.
    for (let u = 0.03; u < 1; u += 0.028) pen.hair([at(u, 0.02), at(u, 0.98)], 0.13, d.ink, 0.32);
    for (let u = 0.04; u < 1; u += 0.056) pen.hair([at(u + 0.008, 0.02), at(u + 0.008, 0.98)], 0.1, PAPER_FILL, 0.3);
    // Panel joints across, and a shadow cast by the wing's spar.
    for (let v = 1 / 6; v < 0.99; v += 1 / 6) seam(d, [at(0, v), at(1, v)], 0.22);
    seam(d, [at(0.5, 0), at(0.5, 1)], 0.26);
    dab(d, [at(0, 0), at(1, 0), at(1, 0.08), at(0, 0.08)], SHADOW, 0.18, 0.6);
    // Scorch from the wormhole, and a panel buckled by it.
    dab(d, [at(0.05, 0.55), at(0.6, 0.48), at(0.7, 0.75), at(0.15, 0.82)], COLOR.scorch, 0.1, 2.2);
  });
  // The frame round it: spars down both edges, a cap along the tip.
  for (const u of [0, 1]) {
    const spar = tube([at(u, -0.02), at(u, 1.01)], 0.85, 0.65);
    part(d, spar, COLOR.metal, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  }
  part(d, tube([at(-0.02, 1), at(1.02, 1)], 1, 1), mix(COLOR.metal, SHADOW, 0.15), { shadow: 0.3, line: 0.32, hatch: 0, gloss: true });
  // The header pipe along the root, with its hinge knuckles.
  part(d, tube([at(-0.05, 0.015), at(1.05, 0.015)], 1.5, 1.5), COLOR.copper, { shadow: 0.4, line: 0.35, hatch: 0, gloss: true });
  for (const u of [0.15, 0.5, 0.85]) part(d, roundRect(at(u, 0).x - 0.8, at(u, 0).y - 0.9, at(u, 0).x + 0.8, at(u, 0).y + 0.9, 0.3), COLOR.gunmetal, { shadow: 0.3, line: 0.25, hatch: 0 });
  rivets(d, [0.2, 0.4, 0.6, 0.8].flatMap((v) => [at(0.02, v), at(0.98, v)]), 0.17);
  navLight(d, at(-0.04, 1.03), dir < 0 ? COLOR.red : COLOR.green, lit, 0.75);
}

/** The ring's spine: the ellipse it makes, from angle a0 to a1 (0 is its near side, towards the nose). */
function ringArc(a0: number, a1: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return pt(RING.x + Math.cos(a) * RING.e, Math.sin(a) * RING.r);
  });
}

/** One run of the ring, coil by coil: burnt dark, heat-blued, scorched, its emitters dead. */
function ringRun(d: Draw, a0: number, a1: number, far: boolean): void {
  const { pen } = d;
  const spine = ringArc(a0, a1, 40);
  const { shape } = ribbon(spine, () => RING.t);
  const tone = far ? mix(COLOR.ring, SHADOW, 0.3) : COLOR.ring;
  part(d, shape, tone, { shadow: 0.45, line: 0.5, hatch: 0, gloss: true });
  pen.clipped(shape, () => {
    // Heat-blued in patches, as the wormhole cooked it.
    for (const [a, c] of [[0.2, '#5d4a8a'], [0.55, '#3d5a8c'], [0.8, '#6a4c6e']] as const) {
      const p = spine[Math.round(a * 40)]!;
      dab(d, oval(p.x, p.y, 4, 6, 12), c, far ? 0.15 : 0.32, 2);
    }
    // The coils: a band every few degrees.
    for (let i = 1; i < 40; i += 2) {
      const p = spine[i]!;
      const q = spine[i + 1]!;
      const nx = -(q.y - p.y);
      const ny = q.x - p.x;
      const l = Math.hypot(nx, ny) || 1;
      const h = RING.t * 0.62;
      pen.hair([pt(p.x - (nx / l) * h, p.y - (ny / l) * h), pt(p.x + (nx / l) * h, p.y + (ny / l) * h)], 0.16, '#14151d', far ? 0.4 : 0.7);
    }
  });
  if (!far) gleam(d, spine.slice(4, 18).map((p) => pt(p.x - 1.2, p.y - 0.4)), 0.35, 0.35);
}

/** The back half of the ring, behind the hull and its struts. */
export function ringBack(d: Draw): void {
  ringRun(d, Math.PI / 2, (Math.PI * 3) / 2, true);
  // Struts from the bay and the truss up to it.
  for (const dir of [-1, 1] as const) {
    part(d, tube([pt(RING.x + 1.5, dir * 11.5), pt(RING.x + 0.8, dir * (RING.r - 2.6))], 1.4, 1.1), COLOR.gunmetal, { shadow: 0.4, line: 0.35, hatch: 0, gloss: true });
    part(d, tube([pt(BAY.x1 - 1, dir * 13), pt(RING.x - 3.6, dir * (RING.r - 6))], 1, 0.9), mix(COLOR.gunmetal, SHADOW, 0.2), { shadow: 0.4, line: 0.3, hatch: 0 });
  }
}

/** The near half of the ring, over everything at the waist: its emitter nodes, the segment the wormhole tore open, and its cracks. */
export function ringFront(d: Draw): void {
  const { pen } = d;
  // Torn open near the top: two runs with a gap, the coils' ends ragged.
  const gap = [-1.2, -0.95] as const;
  ringRun(d, -Math.PI / 2, gap[0], false);
  ringRun(d, gap[1], Math.PI / 2, false);
  for (const a of gap) {
    const p = ringArc(a, a, 1)[0]!;
    pen.fill([pt(p.x - 2, p.y - 0.4), pt(p.x + 2, p.y + 0.3), pt(p.x + 1.2, p.y + (a === gap[0] ? 1.3 : -1.3)), pt(p.x - 0.8, p.y + (a === gap[0] ? 0.8 : -0.9))], '#14151d', 0.95);
  }
  const mid = ringArc((gap[0] + gap[1]) / 2, (gap[0] + gap[1]) / 2, 1)[0]!;
  for (const [dx, dy] of [[-1.5, 0.6], [0.4, -0.5], [1.4, 1.1]] as const) pen.hair([pt(mid.x + dx, mid.y - 1.3), pt(mid.x + dx * 1.6, mid.y + dy * 1.4), pt(mid.x + dx * 1.2, mid.y + dy * 2.6 + 1)], 0.2, COLOR.copper, 0.85);
  // Emitter nodes round its near side, dead: dull lenses in boxy housings.
  for (const a of [-1.45, -0.6, -0.25, 0.1, 0.45, 0.8, 1.2]) {
    const p = ringArc(a, a, 1)[0]!;
    part(d, roundRect(p.x - 1.3, p.y - 1, p.x + 1.3, p.y + 1, 0.35), '#4a4e60', { shadow: 0.35, line: 0.28, hatch: 0, gloss: true });
    pen.dot(p.x + 0.6, p.y, 0.42, '#5f6f96', 0.85);
    pen.dot(p.x + 0.45, p.y - 0.18, 0.14, PAPER_FILL, 0.6);
  }
  // Cracks through the casing, edged in bare metal, and a scorch over its lower run.
  pen.hair([pt(RING.x + 4.9, 8), pt(RING.x + 5.6, 10.5), pt(RING.x + 4.8, 12.2), pt(RING.x + 5.4, 14.8)], 0.2, '#c9a27a', 0.8);
  pen.hair([pt(RING.x + 3.4, -22), pt(RING.x + 4.4, -19.6), pt(RING.x + 3.8, -17.8)], 0.18, '#c9a27a', 0.75);
  dab(d, oval(RING.x + 3.5, 18, 3, 7, 12), '#0e0f16', 0.35, 1.2);
}

/** The thrusters, the bay and the wings: everything aft of the ring. */
export function stern(d: Draw, look: ShipLook): void {
  for (const dir of [-1, 1] as const) radiator(d, dir, look.power);
  for (const t of THRUSTERS) thruster(d, t.y, t.r, t.far, look.engine, look.power);
  bay(d, look.power);
}

/** An ion engine's blue in its grids once it's mended and powered: painted round the craft, outside its outline. */
export function engineGlow(d: Draw, look: ShipLook): void {
  if (!look.engine || !look.power) return;
  const ctx = d.pen.ctx;
  ctx.save();
  // Behind the ship, so it only shows round the grids.
  ctx.globalCompositeOperation = 'destination-over';
  for (const t of THRUSTERS) {
    const r = t.r * 2;
    const g = ctx.createRadialGradient(GRID_X, t.y, 0, GRID_X, t.y, r);
    g.addColorStop(0, 'rgba(160, 205, 255, 0.55)');
    g.addColorStop(0.4, 'rgba(120, 175, 255, 0.22)');
    g.addColorStop(1, 'rgba(120, 175, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(GRID_X - r, t.y - r, r * 2, r * 2);
  }
  ctx.restore();
}
