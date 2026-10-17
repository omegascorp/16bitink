import { capsule, edge, oval, pt, tube, type Draw } from './kit';
import { BOUNCE, dab, gleam, glow, LIGHT, mix, rgba, SHADOW } from './paint';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { guildMark } from './landerParts';
import { part, rivets, roundRect, seam, WASH } from './prospector/parts';

/** The ship's frame. */
export const SHIP_ART = { w: 104, h: 44 } as const;

const HULL = '#cfcbc0';
const STRIPE = '#3d4f86';
const POD = '#b48a55';
const RING = '#3a3d4c';
const BELL = '#6d6874';
const SCORCH = '#2f2b36';
const WINDOW_LIT = '#ffe6a3';
const WINDOW_DARK = '#3a3f55';
const NAV_RED = '#e0533f';
const NAV_GREEN = '#63c27f';

/** Her hull, from the engine collar to the nose. */
const HULL_SHAPE: readonly Pt[] = [pt(-29, -7), pt(26, -7), pt(36, -4.6), pt(42, -1), pt(42, 1.6), pt(36, 4.6), pt(26, 7), pt(-29, 7)];
/** The frames round her, and the plate rows' seams along her. */
const FRAMES = [-16, -3, 10, 23] as const;
const ROWS = [-3.8, 4.4] as const;
const PORTHOLES = [-24, -19, 6, 12, 18] as const;
const PODS = [-21, -6, 9] as const;
/** How far back the engine bells' mouths reach (the frame's edge is at 52). */
const MOUTH = 49.6;

/**
 * Plate rolled round a cylinder lying on its side, lit from above: a bright
 * band a third of the way down, a core shadow under it, light bounced up
 * into the keel, the stern a little brighter than the nose, and an
 * engraver's hatching along the shadow.
 */
function lyingTube(d: Draw, shape: readonly Pt[], color: string, x0: number, x1: number, y0: number, y1: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const v = ctx.createLinearGradient(0, y0, 0, y1);
    v.addColorStop(0, mix(color, SHADOW, 0.22));
    v.addColorStop(0.1, color);
    v.addColorStop(0.27, mix(color, LIGHT, 0.62));
    v.addColorStop(0.42, mix(color, LIGHT, 0.2));
    v.addColorStop(0.7, mix(color, SHADOW, 0.26));
    v.addColorStop(0.88, mix(color, SHADOW, 0.44));
    v.addColorStop(1, mix(color, BOUNCE, 0.45));
    ctx.fillStyle = v;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    const h = ctx.createLinearGradient(x0, 0, x1, 0);
    h.addColorStop(0, rgba(LIGHT, 0.14));
    h.addColorStop(0.5, rgba(LIGHT, 0));
    h.addColorStop(1, rgba(SHADOW, 0.14));
    ctx.fillStyle = h;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  });
  const sy = y0 + (y1 - y0) * 0.64;
  pen.clipped([pt(x0 - 2, sy), pt(x1 + 2, sy), pt(x1 + 2, y1 + 2), pt(x0 - 2, y1 + 2)], () => pen.hatch(shape, 1.3, 0.05, 0.3, { color: d.ink, alpha: 0.22 }));
}

/** A light on a fin tip or mast: a coloured lens, glowing once her power's on. */
function navLight(d: Draw, at: Pt, color: string, lit: boolean, r = 0.8): void {
  if (lit) glow(d.pen.ctx, at, r * 4, color, 0.6);
  d.pen.dot(at.x, at.y, r, lit ? color : mix(color, SHADOW, 0.55));
  d.pen.hair(oval(at.x, at.y, r, r, 10), 0.3, d.ink, 0.8);
  if (lit) d.pen.dot(at.x - r * 0.3, at.y - r * 0.3, r * 0.35, '#fff6e2', 0.9);
}

/** A radiator fin, above or below the engine block: ribbed panels in a frame, heat-tinted at the root, a light on the tip. */
function fin(d: Draw, dir: 1 | -1, lit: boolean, fine: boolean): void {
  const shape = [pt(-40, dir * 5), pt(-30, dir * 5), pt(-32, dir * 15), pt(-44, dir * 15)];
  part(d, shape, '#9aa6b8', { shadow: 0.35, line: 0.6, hatch: 0 });
  d.pen.clipped(shape, () => {
    const g = d.pen.ctx.createLinearGradient(0, dir * 5, 0, dir * 15);
    g.addColorStop(0, 'rgba(176, 112, 70, 0.35)');
    g.addColorStop(0.5, 'rgba(120, 96, 150, 0.12)');
    g.addColorStop(1, 'rgba(120, 96, 150, 0)');
    d.pen.ctx.fillStyle = g;
    d.pen.ctx.fillRect(-45, Math.min(dir * 5, dir * 15), 16, 10);
  });
  const step = fine ? 1.1 : 2;
  for (let x = -42.6; x < -31; x += step) d.pen.hair([pt(x + 1, dir * 5.8), pt(x, dir * 14.3)], fine ? 0.25 : 0.35, d.ink, 0.45);
  // The frame round the panels, and a spar across their middle.
  d.pen.hair([pt(-39.4, dir * 5.6), pt(-43, dir * 14.4), pt(-32.6, dir * 14.4), pt(-30.8, dir * 5.6)], 0.35, d.ink, 0.7);
  if (fine) seam(d, [pt(-41.6, dir * 10), pt(-31.1, dir * 10)], 0.3);
  navLight(d, pt(-43.4, dir * 15.4), dir < 0 ? NAV_RED : NAV_GREEN, lit, 0.75);
}

/** An engine bell out of the back, lying on its side: dark metal blued and bronzed by heat in bands towards its mouth, the throat dark. */
function bell(d: Draw, y: number, w: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = [pt(-44, y - w * 0.5), pt(-44, y + w * 0.5), pt(-MOUTH, y + w), pt(-MOUTH, y - w)];
  part(d, b, BELL, { shadow: 0.5, line: 0.7, gloss: true, hatch: 0 });
  pen.clipped(b, () => {
    const g = ctx.createLinearGradient(-44, 0, -MOUTH, 0);
    g.addColorStop(0, 'rgba(160, 120, 70, 0.4)');
    g.addColorStop(0.45, 'rgba(110, 80, 150, 0.32)');
    g.addColorStop(0.75, 'rgba(70, 90, 160, 0.3)');
    g.addColorStop(1, 'rgba(30, 28, 44, 0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-MOUTH - 1, y - w - 1, MOUTH - 42, w * 2 + 2);
  });
  for (let k = 1; k < 4; k++) {
    const x = -44 - ((MOUTH - 44) * k) / 4;
    const half = w * (0.5 + 0.5 * (k / 4));
    pen.hair([pt(x, y - half), pt(x - 0.6, y), pt(x, y + half)], 0.35, '#1d1c24', 0.6);
  }
  gleam(d, [pt(-44.6, y - w * 0.4), pt(-MOUTH + 0.6, y - w * 0.8)], 0.5, 0.55);
  pen.fill(oval(-MOUTH, y, 0.75, w * 0.86, 14), '#1d1c24', 0.85);
  edge(d, oval(-MOUTH, y, 0.9, w, 14), 0.6, 0.9);
}

/** The engine block: dark metal, a grille of cooling slots, an access panel, coolant pipes into the hull, and a bolted collar where it meets her. */
function engineBlock(d: Draw, fine: boolean): void {
  for (const dir of [-1, 1] as const) {
    const pipe = tube([pt(-39, dir * 6), pt(-36, dir * 8), pt(-31, dir * 7.9), pt(-28, dir * 6.6)], 1.1, 1.1);
    part(d, pipe, WASH.metal, { shadow: 0.45, line: 0.45, gloss: true, hatch: 0 });
  }
  const block = roundRect(-45, -6.5, -28, 6.5, 2);
  part(d, block, WASH.darkMetal, { shadow: 0.5, line: 0.8, gloss: true, hatch: 0.2 });
  if (fine) {
    for (let y = -4.2; y <= 4.4; y += 1.2) d.pen.hair([pt(-43, y), pt(-38.6, y)], 0.4, '#1d1c24', 0.7);
    d.pen.hair(roundRect(-37, -4.6, -32.6, 4.6, 0.6), 0.35, d.ink, 0.7);
    rivets(d, [pt(-36.3, -3.9), pt(-33.3, -3.9), pt(-36.3, 3.9), pt(-33.3, 3.9)], 0.3);
  }
  const collar = roundRect(-30.4, -7.7, -28, 7.7, 0.8);
  part(d, collar, mix(WASH.metal, SHADOW, 0.15), { shadow: 0.45, line: 0.6, gloss: true, hatch: 0 });
  if (fine) rivets(d, [-6, -3, 0, 3, 6].map((y) => pt(-29.2, y)), 0.3);
}

/** Her deck along her back: a row of cabin windows, a handrail on stanchions, and the docking collar behind it where the lander locks on. */
function deck(d: Draw, lit: boolean, fine: boolean): void {
  const shape = [pt(-20, -7), pt(-17, -10.4), pt(20, -10.4), pt(26, -7)];
  part(d, shape, mix(HULL, SHADOW, 0.12), { shadow: 0.45, line: 0.75, gloss: true, hatch: 0.1 });
  for (const x of [-12, -6, 0, 6, 12]) {
    if (lit) glow(d.pen.ctx, pt(x, -8.6), 1.8, WINDOW_LIT, 0.45);
    part(d, roundRect(x - 1.6, -9.4, x + 1.6, -7.8, 0.4), lit ? WINDOW_LIT : WINDOW_DARK, { shadow: 0, line: 0.35, hatch: 0, alpha: 1 });
    if (fine) d.pen.hair([pt(x, -9.3), pt(x, -7.9)], 0.25, d.ink, 0.6);
  }
  if (fine) {
    for (const x of [-15, -9, -3, 3, 9, 15, 19]) d.pen.hair([pt(x, -10.4), pt(x, -11.8)], 0.3, d.ink, 0.8);
    d.pen.hair([pt(-15.4, -11.6), pt(19.4, -11.6)], 0.35, d.ink, 0.85);
    seam(d, [pt(-17.6, -9.9), pt(20.6, -9.9)], 0.25);
  }
  // The docking collar: a short drum with a flange, and the target the lander lines up on.
  part(d, roundRect(-27.2, -10, -22.6, -6.6, 0.6), WASH.metal, { shadow: 0.45, line: 0.6, gloss: true, hatch: 0 });
  part(d, roundRect(-28.2, -11.2, -21.6, -9.8, 0.5), mix(WASH.metal, SHADOW, 0.2), { shadow: 0.4, line: 0.6, hatch: 0 });
  if (fine) {
    d.pen.hair([pt(-24.9, -9.4), pt(-24.9, -7.2)], 0.3, d.ink, 0.8);
    d.pen.hair([pt(-26, -8.3), pt(-23.8, -8.3)], 0.3, d.ink, 0.8);
    rivets(d, [pt(-27.2, -10.5), pt(-24.9, -10.5), pt(-22.6, -10.5)], 0.26);
  }
}

/** Her hull plate: frames round her, a seam along each plate row and the joints staggered between, rivets down every frame. */
function plating(d: Draw, fine: boolean): void {
  d.pen.clipped(HULL_SHAPE, () => {
    for (const x of FRAMES) seam(d, [pt(x, -6.9), pt(x + 0.2, 0), pt(x, 6.9)], 0.45);
    for (const y of ROWS) seam(d, [pt(-29, y), pt(42, y + (y < 0 ? 0.4 : -0.4))], 0.32);
    if (!fine) return;
    for (const x of [-22.5, -9.5, 3.5, 16.5]) {
      seam(d, [pt(x, -6.9), pt(x, ROWS[0])], 0.28);
      seam(d, [pt(x, ROWS[1]), pt(x, 6.9)], 0.28);
    }
    for (const x of FRAMES) rivets(d, [-5.6, -2.4, 3.3, 5.7].map((y) => pt(x + 0.9, y)), 0.28);
    for (let x = -27; x < 34; x += 3.25) {
      d.pen.dot(x, ROWS[0] - 0.5, 0.14, d.ink, 0.35);
      d.pen.dot(x + 1.6, ROWS[1] + 0.5, 0.14, d.ink, 0.35);
    }
  });
}

/** The cargo hold's doors, in her flank between two frames: two leaves in a recessed frame, hinges along the top, a handle, and hazard chevrons along the sill. */
function holdDoors(d: Draw, fine: boolean): void {
  const frame = roundRect(-14.8, -6.3, -4.2, 0.1, 0.6);
  part(d, frame, mix(HULL, SHADOW, 0.32), { shadow: 0.3, line: 0.55, hatch: 0 });
  const leaves = [roundRect(-14.1, -5.7, -9.6, -0.5, 0.35), roundRect(-9.4, -5.7, -4.9, -0.5, 0.35)];
  for (const leaf of leaves) part(d, leaf, mix(HULL, LIGHT, 0.1), { shadow: 0.4, line: 0.5, gloss: true, hatch: 0 });
  d.pen.stroke([pt(-9.5, -5.8), pt(-9.5, -0.4)], 0.5, d.ink, 0.9, false);
  if (!fine) return;
  for (const x of [-13.2, -10.6, -8.4, -5.8]) part(d, roundRect(x - 0.45, -6.1, x + 0.45, -5.3, 0.15), WASH.darkMetal, { shadow: 0.2, line: 0.25, hatch: 0 });
  part(d, roundRect(-10.6, -3.6, -10, -2.2, 0.2), WASH.darkMetal, { shadow: 0.2, line: 0.25, hatch: 0 });
  part(d, roundRect(-9, -3.6, -8.4, -2.2, 0.2), WASH.darkMetal, { shadow: 0.2, line: 0.25, hatch: 0 });
  // Chevrons along the sill: ochre and ink.
  const sill = roundRect(-14, -1.4, -5, -0.6, 0.1);
  d.pen.fill(sill, '#d8b04c', 0.9);
  d.pen.clipped(sill, () => {
    for (let x = -14.4; x < -4.6; x += 1.1) d.pen.fill([pt(x, -0.6), pt(x + 0.5, -0.6), pt(x + 1.1, -1.4), pt(x + 0.6, -1.4)], '#2a2733', 0.85);
  });
}

/** The bridge in her nose: three panes under a visor, the nose cone seamed on, its tip capped, thrusters top and bottom, and a whip aerial out front. */
function bridge(d: Draw, lit: boolean, fine: boolean): void {
  const cone = [pt(37.4, -4.1), pt(42, -1), pt(42, 1.6), pt(37.4, 4.1)];
  d.pen.clipped(HULL_SHAPE, () => {
    seam(d, [pt(37.4, -4.4), pt(38.2, 0), pt(37.4, 4.4)], 0.4);
    dab(d, cone, SHADOW, 0.1, 0.6);
  });
  part(d, [pt(40.4, -1.9), pt(42, -1), pt(42, 1.6), pt(40.4, 2.5)], WASH.darkMetal, { shadow: 0.3, line: 0.5, hatch: 0, gloss: true });
  const glass = [pt(30, -4.6), pt(37, -3), pt(40.4, -0.6), pt(30, -0.6)];
  if (lit) glow(d.pen.ctx, pt(35, -2.4), 7, WINDOW_LIT, 0.55);
  part(d, glass, lit ? WINDOW_LIT : '#26314f', { shadow: lit ? 0 : 0.3, line: 0.6, hatch: 0, gloss: !lit, alpha: 1 });
  d.pen.stroke([pt(33.4, -3.9), pt(33.4, -0.6)], 0.45, d.ink, 0.9, false);
  d.pen.stroke([pt(36.8, -3.05), pt(36.8, -0.6)], 0.45, d.ink, 0.9, false);
  d.pen.stroke([pt(29.4, -5.3), pt(37.2, -3.6), pt(39.6, -2.2)], 0.6, d.ink, 0.9, false);
  if (!lit) gleam(d, [pt(31, -3.8), pt(32.6, -1.2)], 0.4, 0.6);
  for (const dir of [-1, 1] as const) {
    const y = dir * 5.6;
    part(d, roundRect(30.2, y - 0.8, 32.6, y + 0.8, 0.3), WASH.metal, { shadow: 0.4, line: 0.4, hatch: 0 });
    d.pen.stroke([pt(31.4, y + dir * 0.8), pt(31.4, y + dir * 1.7)], 0.5, d.ink, 0.9, false);
    d.pen.stroke([pt(32.6, y), pt(33.5, y)], 0.45, d.ink, 0.9, false);
  }
  d.pen.hair([pt(41.4, -1.4), pt(45.6, -3), pt(49.6, -4.4)], 0.35, d.ink, 0.9);
  navLight(d, pt(49.8, -4.5), '#fff6e2', lit, 0.5);
  if (fine) rivets(d, [pt(30.4, -5.9), pt(34.6, -5.2), pt(30.4, 5.9), pt(34.6, 5.2)], 0.26);
}

/** Portholes down her flank, each in a bright rim. */
function portholes(d: Draw, lit: boolean, fine: boolean): void {
  for (const x of PORTHOLES) {
    if (lit) glow(d.pen.ctx, pt(x, -2.2), 2.4, WINDOW_LIT, 0.5);
    if (fine) d.pen.fill(oval(x, -2.2, 1.55, 1.55, 14), mix(HULL, LIGHT, 0.5), 0.9);
    d.pen.dot(x, -2.2, 1, lit ? WINDOW_LIT : WINDOW_DARK);
    d.pen.hair(oval(x, -2.2, 1.15, 1.15, 10), 0.35, d.ink, 0.8);
    if (fine) {
      d.pen.hair(oval(x, -2.2, 1.6, 1.6, 14), 0.25, d.ink, 0.6);
      d.pen.dot(x - 0.35, -2.55, 0.3, '#fff6e2', lit ? 0.6 : 0.8);
    }
  }
}

/** Three ore pods under her, each clamped on by two pylons, with darker end caps, bands round it and a load hatch. */
function pods(d: Draw, fine: boolean): void {
  for (const x of PODS) {
    for (const px of [x + 2.2, x + 8.8]) {
      part(d, [pt(px - 0.7, 6.8), pt(px + 0.7, 6.8), pt(px + 0.5, 9.2), pt(px - 0.5, 9.2)], WASH.darkMetal, { shadow: 0.3, line: 0.4, hatch: 0 });
    }
    const pod = capsule(pt(x, 12), pt(x + 11, 12), 3.4, 3.4);
    part(d, pod, POD, { shadow: 0.5, line: 0.75, gloss: true });
    d.pen.clipped(pod, () => {
      d.pen.fill([pt(x - 2, 8), pt(x + 1.2, 8), pt(x + 1.2, 16), pt(x - 2, 16)], SHADOW, 0.2);
      d.pen.fill([pt(x + 9.8, 8), pt(x + 13, 8), pt(x + 13, 16), pt(x + 9.8, 16)], SHADOW, 0.2);
      if (fine) d.pen.hatch(pod, 0.9, 0.06, 0.25, { color: d.ink, alpha: 0.2, onlyBelow: 13.2 });
    });
    for (const bx of [x + 1.2, x + 9.8]) d.pen.hair([pt(bx, 10.4), pt(bx + 0.15, 12), pt(bx, 13.6)], 0.4, d.ink, 0.75);
    if (fine) {
      d.pen.hair(roundRect(x + 3.4, 10.9, x + 7.6, 13.1, 0.3), 0.3, d.ink, 0.75);
      gleam(d, [pt(x + 1.4, 11), pt(x + 9.6, 11)], 0.4, 0.6);
    }
  }
}

/** The jump drive's ring round her waist on two struts, with emitter nodes round it: burnt dark, scorched and cracked by the wild wormhole. */
function jumpRing(d: Draw, fine: boolean): void {
  const ring = oval(-33, 0, 3.4, 16, 28);
  d.pen.stroke(ring.slice(7, 22), 2.6, '#2b2e3c', 0.9, false);
  for (const dir of [-1, 1] as const) {
    part(d, [pt(-33.6, dir * 7.4), pt(-32, dir * 7.4), pt(-32.8, dir * 13.2), pt(-34.2, dir * 13.2)], WASH.darkMetal, { shadow: 0.4, line: 0.45, hatch: 0 });
  }
  part(d, roundRect(-35, -16.5, -31, -13, 1), RING, { shadow: 0.4, line: 0.6, hatch: 0 });
  part(d, roundRect(-35, 13, -31, 16.5, 1), RING, { shadow: 0.4, line: 0.6, hatch: 0 });
  const front = [...ring.slice(21), ...ring.slice(0, 8)];
  d.pen.stroke(front, 2.6, RING, 1, false);
  d.pen.hair(front, 0.5, d.ink, 0.9);
  // Emitter nodes round the front of the ring, dead.
  for (const i of [23, 26, 2, 5]) {
    const p = ring[i]!;
    part(d, roundRect(p.x - 0.9, p.y - 0.7, p.x + 0.9, p.y + 0.7, 0.25), '#4a4e60', { shadow: 0.3, line: 0.35, hatch: 0 });
    d.pen.dot(p.x + 0.4, p.y, 0.25, '#7d93c4', 0.5);
  }
  dab(d, oval(-31, -6, 2.4, 4, 10), '#141622', 0.4, 1);
  if (fine) {
    d.pen.hair([pt(-30.4, -9.4), pt(-31.2, -8.2), pt(-30.2, -7.4), pt(-31, -6.2)], 0.3, '#c9a27a', 0.7);
    gleam(d, ring.slice(23, 27), 0.4, 0.35);
  }
}

/** The dish on its mast, with a feed horn on struts, and the sensor mast forward of it with its beacon. */
function masts(d: Draw, lit: boolean, fine: boolean): void {
  part(d, capsule(pt(16.6, -10.2), pt(18, -13.2), 0.9, 0.7), WASH.metal, { shadow: 0.4, line: 0.45, hatch: 0 });
  const bowl = [pt(13.4, -14), pt(22.6, -15.6), pt(21, -12.4), pt(15.4, -11.6)];
  part(d, bowl, '#d9dce2', { shadow: 0.4, line: 0.6, hatch: 0, gloss: true });
  if (fine) for (const t of [0.33, 0.66]) d.pen.hair([pt(13.4 + 9.2 * t, -14 - 1.6 * t), pt(15.4 + 5.6 * t, -11.6 - 0.8 * t)], 0.25, d.ink, 0.5);
  d.pen.hair([pt(15.4, -12.8), pt(17.6, -18), pt(21.4, -14.4)], 0.3, d.ink, 0.85);
  d.pen.dot(17.6, -18, 0.55, d.ink);
  // The sensor mast, with two crossbars and a beacon on top.
  d.pen.stroke([pt(23.6, -8.6), pt(24.2, -16.6)], 0.5, d.ink, 0.9, false);
  d.pen.hair([pt(22.6, -12.4), pt(25.2, -12.6)], 0.35, d.ink, 0.85);
  d.pen.hair([pt(23, -14.6), pt(25.2, -14.8)], 0.35, d.ink, 0.85);
  navLight(d, pt(24.25, -17.2), NAV_RED, lit, 0.6);
}

/** Her marks: the guild's stripe and pinstripe along her, its mark under the hold, and the wormhole's scorch over her stern. */
function marks(d: Draw, fine: boolean): void {
  d.pen.clipped(HULL_SHAPE, () => {
    d.pen.fill([pt(-29, 0.6), pt(36, 0.6), pt(39, 2.4), pt(-29, 2.4)], STRIPE, 0.85);
    d.pen.fill([pt(-29, 3), pt(36.6, 3), pt(37, 3.35), pt(-29, 3.35)], STRIPE, 0.6);
    dab(d, oval(-25, -1, 7, 6, 18), SCORCH, 0.2, 2);
    dab(d, [pt(-29, -3), pt(-18, -2.2), pt(-17, -1.4), pt(-29, -0.4)], SCORCH, 0.16, 1);
    // Grime streaked back from the frames, as the exhaust and the years leave it.
    if (fine) for (const x of FRAMES) dab(d, [pt(x - 0.4, -6.6), pt(x + 0.4, -6.6), pt(x - 2.4, 6.6), pt(x - 3.8, 6.6)], '#5a5560', 0.08, 0.8);
  });
  guildMark(d, pt(-9, 4.6), 1.6);
}

/**
 * Your ship, side on, nose to the right (spec, "Your starship and
 * travel"): a long plated mining hull on a spine, three ore pods slung
 * under it, the cargo hold's doors in her flank, an engine block at the
 * back with radiator fins, coolant pipes and two bells, the jump drive's
 * ring round her waist (burnt dark: it's dead), a deck with a docking
 * collar for the lander, a bridge with a strip of windows, a dish and a
 * sensor mast, and the guild's mark. Her windows and lights are dark until
 * her power's back (`lit`). `fine` adds the small work (rivets, grilles,
 * hinges, grime) for the big picture on the Starship tab; the star map's
 * little ship leaves it out. Origin at the centre.
 */
export function drawShip(d: Draw, lit: boolean, fine = false): void {
  for (const dir of [-1, 1] as const) fin(d, dir, lit, fine);
  bell(d, -3.4, 3.5);
  bell(d, 3.4, 3.5);
  engineBlock(d, fine);
  deck(d, lit, fine);
  lyingTube(d, HULL_SHAPE, HULL, -29, 42, -7, 7);
  marks(d, fine);
  plating(d, fine);
  edge(d, HULL_SHAPE, 1);
  holdDoors(d, fine);
  bridge(d, lit, fine);
  portholes(d, lit, fine);
  pods(d, fine);
  jumpRing(d, fine);
  masts(d, lit, fine);
  gleam(d, [pt(-26, -6), pt(24, -6)], 0.7, 0.85);
  if (!lit) dab(d, oval(0, 0, 40, 7, 24), SHADOW, 0.12, 2);
}
