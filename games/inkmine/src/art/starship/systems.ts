import { capsule, oval, pt, ribbon, tube, type Draw } from '../kit';
import { BOUNCE, dab, gleam, glow, LIGHT, mix, rgba, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { part, rivets, roundRect, seam } from '../prospector/parts';
import type { StarshipSlot } from '../../logic/starship';
import { COLOR, cylinder, drumShape, frameArc, navLight, stencil } from './hull';

/**
 * The starship's systems as the Starship tab's slots show them (techArt.ts),
 * drawn like the ship itself (index.ts): each the thing up close, broken the
 * way the wormhole left it until it's mended. The jump drive is always
 * burnt out. Each fits the technology frame (40 units), origin at the
 * centre, light from the upper left.
 */

/** Paint for a cylinder standing upright: lit down its left side, a core shadow down its right, light bounced into its far edge. */
function upright(d: Draw, shape: readonly Pt[], color: string, x0: number, x1: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const ys = shape.map((p) => p.y);
  const [y0, y1] = [Math.min(...ys) - 1, Math.max(...ys) + 1];
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, mix(color, SHADOW, 0.2));
    g.addColorStop(0.1, color);
    g.addColorStop(0.28, mix(color, LIGHT, 0.6));
    g.addColorStop(0.45, mix(color, LIGHT, 0.12));
    g.addColorStop(0.72, mix(color, SHADOW, 0.3));
    g.addColorStop(0.9, mix(color, SHADOW, 0.46));
    g.addColorStop(1, mix(color, BOUNCE, 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 1, y0, x1 - x0 + 2, y1 - y0);
  });
  const sx = x0 + (x1 - x0) * 0.7;
  pen.clipped([pt(sx, y0), pt(x1 + 1, y0), pt(x1 + 1, y1), pt(sx, y1)], () => pen.hatch(shape, 0.8, 1.45, 0.22, { color: d.ink, alpha: 0.2 }));
}

/** A band round an upright cylinder, seen a little from above: it sags at the front. */
function hoop(cx: number, r: number, y: number, sag: number, n = 14): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = -r + (2 * r * i) / n;
    return pt(cx + x, y + sag * Math.sqrt(Math.max(0, 1 - (x / r) ** 2)));
  });
}

function rotated(d: Draw, at: Pt, a: number, fn: () => void): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(a);
  fn();
  ctx.restore();
}

/** A gauge: a ceramic dial, its ticks and a red zone, the needle at `level` (0 to 1) under glass; cracked if `cracked`. */
function gauge(d: Draw, c: Pt, r: number, level: number, cracked = false): void {
  const { pen } = d;
  part(d, oval(c.x, c.y, r + 0.7, r + 0.7, 20), COLOR.gunmetal, { shadow: 0.35, line: 0.35, hatch: 0, gloss: true });
  pen.fill(oval(c.x, c.y, r, r, 20), COLOR.ceramic, 1);
  const at = (t: number, k: number): Pt => {
    const a = Math.PI * (0.75 + t * 1.5);
    return pt(c.x + Math.cos(a) * r * k, c.y + Math.sin(a) * r * k);
  };
  pen.hair(Array.from({ length: 7 }, (_, i) => at(0.82 + (i / 6) * 0.18, 0.8)), r * 0.16, COLOR.red, 0.8);
  for (let k = 0; k <= 8; k++) pen.hair([at(k / 8, 0.62), at(k / 8, 0.86)], 0.1, d.ink, 0.85);
  pen.stroke([pt(c.x, c.y), at(level, 0.78)], r * 0.12, COLOR.red, 1, false);
  pen.dot(c.x, c.y, r * 0.14, d.ink, 0.9);
  pen.hair(oval(c.x, c.y, r, r, 20), 0.18, d.ink, 0.85);
  if (cracked) {
    pen.hair([pt(c.x - r * 0.9, c.y - r * 0.2), pt(c.x - r * 0.1, c.y + r * 0.1), pt(c.x + r * 0.5, c.y - r * 0.7)], 0.12, d.ink, 0.9);
    pen.hair([pt(c.x - r * 0.1, c.y + r * 0.1), pt(c.x + r * 0.2, c.y + r * 0.9)], 0.1, d.ink, 0.85);
  } else gleam(d, [pt(c.x - r * 0.6, c.y - r * 0.3), pt(c.x - r * 0.2, c.y - r * 0.7)], r * 0.18, 0.7);
}

/**
 * Power: the ship's distribution cabinet, its cable bundle glanded in at
 * the side, a meter, breakers and lamps. Burnt out: soot up its face, the
 * meter's glass cracked, the breakers tripped, a cable burnt through and
 * hanging. Mended: lamps lit, breakers up, the needle well over.
 */
function power(d: Draw, broken: boolean): void {
  const { pen } = d;
  // The cables, behind the cabinet: two copper-cored, one grey, one in braid.
  const cables: readonly [number, string][] = [[-7.6, COLOR.dark], [-3.4, '#8b8f99'], [1, COLOR.copper], [5.2, COLOR.dark]];
  cables.forEach(([y, color], i) => {
    const end = broken && i === 1 ? pt(-14.8, y + 6.4) : pt(-11.4, y);
    const path = broken && i === 1 ? [pt(-18.6, 11.4), pt(-17.4, y + 9.2), end] : [pt(-18.6, 12.2 - i * 0.9), pt(-16, y + 3 - i), end];
    part(d, tube(path, 2, 2), color, { shadow: 0.4, line: 0.35, hatch: 0, gloss: true });
    if (color === COLOR.dark) pen.clipped(tube(path, 2, 2), () => { for (let k = 0; k < 9; k++) pen.hair([pt(-20 + k * 1.1, y - 4), pt(-19 + k * 1.1, y + 12)], 0.1, '#9aa3b0', 0.35); });
  });
  // The clamp the bundle runs out of, down to the deck.
  part(d, roundRect(-20.4, 9.4, -16.8, 14.8, 0.6), COLOR.gunmetal, { shadow: 0.35, line: 0.35, hatch: 0, gloss: true });
  rivets(d, [pt(-18.6, 10.4), pt(-18.6, 13.8)], 0.26);
  if (broken) {
    // The burnt-through end: insulation charred back, copper strands splayed.
    const e = pt(-14.8, -3.4 + 6.4);
    dab(d, oval(e.x, e.y, 1.6, 1.2, 12), COLOR.scorch, 0.6, 0.3);
    for (const [dx, dy] of [[1.6, -0.8], [1.8, 0.2], [1.3, 1], [0.6, 1.5]] as const) pen.hair([e, pt(e.x + dx, e.y + dy)], 0.12, COLOR.copper, 0.95);
  }
  const box = roundRect(-11.6, -14, 14.4, 13, 1.6);
  cylinder(d, box, '#c9cbd0', -14, 13, { gloss: true, hatch: 0.16 });
  pen.stroke([...box, box[0]!], 0.55, d.ink, 0.95, false);
  // The door's lip, its hinges on the left, bolts at the corners.
  pen.hair(roundRect(-10.4, -12.8, 13.2, 11.8, 1), 0.2, d.ink, 0.6);
  pen.hair(roundRect(-10.25, -12.6, 13.4, 12, 1), 0.14, PAPER_FILL, 0.5);
  for (const y of [-9, 7]) part(d, roundRect(-12.4, y - 1.6, -11, y + 1.6, 0.4), COLOR.gunmetal, { shadow: 0.25, line: 0.22, hatch: 0, gloss: true });
  rivets(d, [pt(-9.4, -11.6), pt(12.2, -11.6), pt(-9.4, 10.6), pt(12.2, 10.6)], 0.32);
  // Cable glands down the side, where the bundle comes in.
  for (const [y] of cables) part(d, roundRect(-12.6, y - 1.4, -10.8, y + 1.4, 0.3), COLOR.metal, { shadow: 0.3, line: 0.22, hatch: 0, gloss: true });
  gauge(d, pt(-3.6, -5.6), 4.2, broken ? 0.02 : 0.68, broken);
  // Lamps along the top right.
  [4.6, 7.8, 11].forEach((x, i) => navLight(d, pt(x, -10), [COLOR.green, COLOR.ochre, COLOR.green][i]!, !broken, 0.95));
  // The breakers: a row of toggles in a recess, up when on.
  const recess = roundRect(2.8, -7.4, 12.6, -1.4, 0.5);
  part(d, recess, '#2f3346', { shadow: 0.2, line: 0.3, hatch: 0 });
  for (const x of [4.4, 6.9, 9.4, 11.6]) {
    const down = broken && x !== 6.9;
    part(d, roundRect(x - 0.75, -6.6, x + 0.75, -2.2, 0.3), '#4a4f5e', { shadow: 0.2, line: 0.16, hatch: 0 });
    const lever = down ? roundRect(x - 0.45, -4.4, x + 0.45, -2.5, 0.2) : roundRect(x - 0.45, -6.3, x + 0.45, -4.4, 0.2);
    part(d, lever, down ? COLOR.red : COLOR.ceramic, { shadow: 0.2, line: 0.16, hatch: 0, gloss: true });
  }
  // A warning plate and a vent along the foot.
  const plate = [pt(5.4, 9.6), pt(8.6, 3.6), pt(11.8, 9.6)];
  pen.fill(plate, COLOR.ochre, 0.95);
  pen.hair([...plate, plate[0]!], 0.22, d.ink, 0.85);
  pen.stroke([pt(9, 5.2), pt(8, 7.2), pt(9.2, 7.2), pt(8.2, 9)], 0.32, d.ink, 1, false);
  for (let x = -8.6; x < 2; x += 1.3) pen.fill(roundRect(x, 6.4, x + 0.6, 10, 0.2), '#2a2e3c', 0.8);
  stencil(d, -8.6, 2.2, 8, 0.7);
  if (broken) {
    // Soot up the face from the burnt cable, and a crack in the casing.
    pen.clipped(box, () => {
      dab(d, [pt(-12, 6), pt(-12, -2), pt(-4, -14), pt(6, -14), pt(-1, 3)], COLOR.scorch, 0.55, 1.2);
      dab(d, [pt(-12, 4), pt(-8, -8), pt(-2, -14), pt(1, -14), pt(-6, 0)], '#14121a', 0.45, 0.8);
      dab(d, oval(-11, 2, 3, 3.6, 14), COLOR.scorch, 0.45, 1);
    });
    pen.hair([pt(14, -4), pt(12.6, -2.6), pt(13.2, -0.6), pt(12, 1.2)], 0.2, d.ink, 0.9);
  } else {
    // Fresh tape round the mended cable.
    part(d, roundRect(-17.2, -1.4, -15.8, 3.2, 0.3), COLOR.ochre, { shadow: 0.3, line: 0.2, hatch: 0 });
  }
}

/**
 * The fuel tank: an upright capsule wound in carbon fibre on a cradle,
 * bands round it, a valve and a gauge on top. Split and frosted, the
 * gauge at nothing, until it's mended; then a band of fresh wrap over the
 * split and the needle up.
 */
function tank(d: Draw, broken: boolean): void {
  const { pen } = d;
  const r = 8.4;
  const body = capsule(pt(0, -9.4), pt(0, 9.4), r * 2, r * 2);
  // The cradle behind and under it.
  part(d, roundRect(-13, 14.4, 13, 17.4, 0.8), COLOR.gunmetal, { shadow: 0.4, line: 0.45, hatch: 0, gloss: true });
  upright(d, body, COLOR.fibre, -r, r);
  pen.clipped(body, () => {
    for (let y = -40; y < 30; y += 0.85) {
      pen.hair([pt(-r, y), pt(r, y + 8)], 0.11, '#1a1b22', 0.42);
      pen.hair([pt(-r, y + 8), pt(r, y)], 0.11, mix(COLOR.fibre, LIGHT, 0.45), 0.24);
    }
    dab(d, [pt(-5.6, -16), pt(-3, -16), pt(-3, 16), pt(-5.6, 16)], LIGHT, 0.22, 0.6);
  });
  pen.stroke([...body, body[0]!], 0.55, d.ink, 0.95, false);
  // Bands, each with a bolted lug.
  for (const y of broken ? [-8, 8] : [-8, -3.6, 3.6, 8]) {
    const top = hoop(0, r + 0.2, y - 0.7, 1.4);
    const band = [...top, ...hoop(0, r + 0.2, y + 0.7, 1.4).reverse()];
    upright(d, band, COLOR.metal, -r, r);
    pen.hair([...band, band[0]!], 0.2, d.ink, 0.85);
    part(d, roundRect(r - 0.4, y - 0.9, r + 1.6, y + 1.4, 0.3), COLOR.gunmetal, { shadow: 0.25, line: 0.2, hatch: 0 });
  }
  // The saddles the tank sits in.
  for (const x of [-5.4, 5.4]) part(d, [pt(x - 2.4, 14.6), pt(x + 2.4, 14.6), pt(x + 1.6, 11.6), pt(x - 1.6, 11.6)], COLOR.metal, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  // The boss on top, its valve, and the gauge on a short pipe.
  part(d, oval(0, -17.4, 2.6, 1.1, 14), COLOR.metal, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  part(d, roundRect(-1, -19.6, 1, -17.6, 0.3), COLOR.copper, { shadow: 0.3, line: 0.25, hatch: 0, gloss: true });
  part(d, roundRect(-2.6, -20.2, 2.6, -19.2, 0.4), COLOR.red, { shadow: 0.25, line: 0.25, hatch: 0 });
  part(d, tube([pt(1, -18.6), pt(5, -18.4), pt(7, -15.4)], 0.9, 0.9), COLOR.copper, { shadow: 0.3, line: 0.22, hatch: 0, gloss: true });
  gauge(d, pt(8.6, -13.6), 2.8, broken ? 0.02 : 0.74);
  // The label band.
  const label = roundRect(-4.6, 10.2, 4.6, 12.6, 0.3);
  pen.fill(label, COLOR.ochre, 0.9);
  pen.hair([...label, label[0]!], 0.18, d.ink, 0.75);
  stencil(d, -3.8, 10.9, 7.4, 0.9, COLOR.dark, 0.75);
  if (broken) splitTank(d, body);
  else {
    const wrap = [...hoop(0, r + 0.12, -2.8, 1.4), ...hoop(0, r + 0.12, 2.8, 1.4).reverse()];
    upright(d, wrap, mix(COLOR.fibre, '#6b5a48', 0.4), -r, r);
    pen.clipped(wrap, () => { for (let y = -12; y < 8; y += 0.7) pen.hair([pt(-r, y), pt(r, y + 3)], 0.1, '#1a1b22', 0.45); });
    for (const y of [-2.8, 2.8]) pen.hair(hoop(0, r + 0.12, y, 1.4), 0.3, '#c9a46a', 0.95);
    navLight(d, pt(-6.2, 6.6), COLOR.green, true, 0.6);
  }
}

/** The split down the tank: a ragged black gash, fibres fraying out of it, frost round it. */
function splitTank(d: Draw, body: readonly Pt[]): void {
  const { pen } = d;
  const lip = [pt(1.2, -12), pt(-0.6, -8.6), pt(1.4, -5.4), pt(-0.4, -1.8), pt(1.8, 1.4), pt(0, 4.8), pt(1, 7.4)];
  const gash = [...lip, ...lip.map((p, i) => pt(p.x + 0.9 + (i % 2) * 0.5, p.y)).reverse()];
  pen.clipped(body, () => {
    dab(d, oval(1, -2, 6.4, 11, 18), '#e8f4fa', 0.42, 1.4);
    for (const y of [-6, 0, 5]) dab(d, [pt(0, y - 0.6), pt(-6, y + 1.6), pt(-6, y + 2.4), pt(0, y + 0.4)], '#e8f4fa', 0.3, 0.5);
  });
  pen.stipple(body, 300, (x, y) => Math.max(0, 1 - Math.hypot((x - 1) / 6, (y + 2) / 11)), 0.16, '#f6fcff');
  pen.fill(gash, '#0d0e14', 0.95);
  pen.hair(lip.map((p) => pt(p.x - 0.25, p.y)), 0.2, mix(COLOR.fibre, LIGHT, 0.6), 0.85);
  pen.hair(lip, 0.3, d.ink, 0.95);
  for (let i = 0; i < 16; i++) {
    const p = lip[Math.floor(pen.rng() * (lip.length - 1))]!;
    const y = p.y + pen.rng() * 3;
    const side = pen.rng() < 0.5 ? -1 : 1;
    const l = 0.8 + pen.rng() * 1.6;
    pen.hair([pt(p.x + (side > 0 ? 1 : 0), y), pt(p.x + side * l * 0.6, y - l * 0.4), pt(p.x + side * l, y - l * 0.2)], 0.1, '#2a2b33', 0.9);
  }
}

/**
 * The telescope: a tube on a fork mount, tipped up, its hood open and the
 * mirror's silver showing deep inside. Cracked across, the tube dented,
 * the lid bent back and glass drifting out, until it's mended.
 */
function telescope(d: Draw, broken: boolean): void {
  const { pen } = d;
  // The mount: a base, its pillar and the fork.
  part(d, oval(-2, 15.4, 9, 2.4, 22), COLOR.gunmetal, { shadow: 0.4, line: 0.45, hatch: 0, gloss: true });
  part(d, roundRect(-3.6, 4.4, -0.4, 15, 0.6), COLOR.metal, { shadow: 0.45, line: 0.4, hatch: 0, gloss: true });
  part(d, [pt(-7, 2.8), pt(4, 2.8), pt(3, 5.2), pt(-6, 5.2)], COLOR.gunmetal, { shadow: 0.35, line: 0.35, hatch: 0, gloss: true });
  const a = -0.7;
  rotated(d, pt(-1.2, -1), a, () => {
    // The instrument box at the back, finned.
    const box = roundRect(-17.4, -4, -12.4, 4, 0.7);
    part(d, box, COLOR.gunmetal, { shadow: 0.45, line: 0.4, hatch: 0.1, gloss: true });
    for (let x = -16.8; x < -12.8; x += 0.8) pen.hair([pt(x, -3.4), pt(x, 3.4)], 0.12, '#1c1d27', 0.6);
    const body = drumShape(-12.6, 9.6, 4.8, 1.3);
    cylinder(d, body, '#e3e1da', -4.8, 4.8, { gloss: true, hatch: 0.16 });
    pen.clipped(body, () => {
      for (const x of [-6, 1]) seam(d, frameArc(x, 4.8, 1.3), 0.2);
      if (broken) {
        dab(d, oval(-2.6, -1.4, 2.6, 1.8, 14), SHADOW, 0.3, 0.6);
        pen.hair([pt(-3.6, -4.8), pt(-2.4, -2), pt(-3.2, 0), pt(-1.6, 2.6)], 0.22, d.ink, 0.95);
      }
    });
    pen.stroke([...body, body[0]!], 0.45, d.ink, 0.95, false);
    for (const x of [-9, 4.6]) {
      const band = [...frameArc(x + 0.7, 5.05, 1.3), ...frameArc(x - 0.7, 5.05, 1.3).reverse()];
      cylinder(d, band, COLOR.metal, -4.8, 4.8, { hatch: 0, gloss: true });
      pen.hair([...band, band[0]!], 0.2, d.ink, 0.85);
    }
    // The finder on top, and the pivot where the fork holds it.
    const finder = drumShape(-6.4, 0.6, 1.1, 0.4, -6.6);
    cylinder(d, finder, COLOR.metal, -7.7, -5.5, { gloss: true, hatch: 0 });
    pen.hair([...finder, finder[0]!], 0.2, d.ink, 0.9);
    for (const x of [-4.8, -1]) pen.hair([pt(x, -5.6), pt(x, -4.6)], 0.2, d.ink, 0.9);
    part(d, oval(-3, 0.2, 1.6, 1.6, 14), COLOR.gunmetal, { shadow: 0.3, line: 0.3, hatch: 0, gloss: true });
    // The hood, a little wider, open at the front.
    const hood = drumShape(9.2, 13.2, 5.6, 1.6);
    cylinder(d, hood, mix('#e3e1da', SHADOW, 0.06), -5.6, 5.6, { gloss: true, hatch: 0.1 });
    pen.stroke([...hood, hood[0]!], 0.42, d.ink, 0.95, false);
    pen.fill(oval(13.2, 0, 1.6, 5.6, 22), '#15161e', 0.97);
    // The mirror deep in the tube: silver, catching the light; cracked across until it's mended.
    const mirror = oval(13, 0.5, 0.95, 3.6, 18);
    pen.fill(mirror, '#cfd8e4', 0.9);
    pen.clipped(mirror, () => {
      dab(d, oval(12.6, -1.2, 0.6, 1.6, 10), PAPER_FILL, 0.8, 0.2);
      if (broken) {
        for (const [x, y] of [[13.8, -3], [12.2, 3.8], [13.9, 2], [12.2, -1.6]] as const) pen.hair([pt(13, 0.6), pt(x, y)], 0.14, d.ink, 0.95);
        pen.fill([pt(13, 0.6), pt(14, 1.4), pt(13.6, 3.2)], '#15161e', 0.9);
      }
    });
    // The lid on its hinge at the hood's top.
    const hinge = pt(13.4, -5.6);
    const lid = broken ? [hinge, pt(16.6, -4.2), pt(18.4, -0.6), pt(17.6, 0), pt(16, -3.4), pt(13.2, -4.8)] : [hinge, pt(10.4, -12.4), pt(11.4, -12.8), pt(14.2, -5.4)];
    part(d, lid, '#d9d7cf', { shadow: 0.4, line: 0.35, hatch: 0, gloss: true });
    part(d, oval(hinge.x, hinge.y, 0.75, 0.75, 10), COLOR.gunmetal, { shadow: 0.2, line: 0.2, hatch: 0 });
    gleam(d, [pt(-11, -3), pt(9, -3)], 0.45, 0.75);
  });
  if (broken) {
    // Glass drifting out of the hood.
    for (const [x, y, s, r] of [[14.6, -16.4, 1, 0.4], [17.4, -12.6, 0.8, 1.6], [12.4, -18.6, 0.6, 2.4], [17.8, -17.6, 0.5, 0.9]] as const) {
      const tri = [0, 2.1, 4.2].map((k) => pt(x + Math.cos(r + k) * s, y + Math.sin(r + k) * s * 0.8));
      pen.fill(tri, '#cfe0ee', 0.95);
      pen.hair([...tri, tri[0]!], 0.14, d.ink, 0.8);
    }
  }
}

/**
 * The engine: an ion thruster three-quarters on, its domed grid of holes
 * in a heavy bolted rim, a copper magnet ring and white insulators round
 * its body, cables out of the back. Cold, the grid cracked and a chunk out
 * of the insulators, until it's mended; then blue light in every hole.
 */
function engine(d: Draw, broken: boolean): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const r = 12.6;
  const e = 6.8;
  const [back, front] = [-8.4, 4.8];
  // Cables and the feed pipe out of the back.
  for (const [y, w, color] of [[-5, 2, COLOR.dark], [1, 1.4, COLOR.copper], [6, 2, COLOR.dark]] as const) {
    part(d, tube([pt(back - 4, y * 0.8), pt(back - 7.6, y * 0.9 + 5), pt(-17.6, y * 0.5 + 12.4)], w, w), color, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  }
  part(d, roundRect(-20.4, 8.6, -16.4, 16.2, 0.6), COLOR.gunmetal, { shadow: 0.35, line: 0.35, hatch: 0, gloss: true });
  rivets(d, [pt(-18.4, 9.8), pt(-18.4, 15)], 0.26);
  const body = drumShape(back, front, r, e);
  cylinder(d, body, COLOR.engine, -r, r, { gloss: true, hatch: 0.2 });
  pen.stroke([...body, body[0]!], 0.55, d.ink, 0.95, false);
  const band = (x0: number, x1: number, color: string): Pt[] => {
    const shape = [...frameArc(x1, r + 0.3, e), ...frameArc(x0, r + 0.3, e).reverse()];
    cylinder(d, shape, color, -r, r, { hatch: 0, gloss: true });
    pen.hair([...shape, shape[0]!], 0.24, d.ink, 0.9);
    return shape;
  };
  const coil = band(-6.6, -3.8, COLOR.copper);
  pen.clipped(coil, () => {
    for (let y = -r; y < r; y += 0.6) pen.hair([pt(-14, y), pt(4, y + 0.3)], 0.1, d.ink, 0.35);
  });
  const ins = band(-1.6, 0.8, COLOR.ceramic);
  for (const x of [-0.8, 0]) pen.hair(frameArc(x, r + 0.3, e), 0.12, d.ink, 0.5);
  if (broken) {
    pen.clipped(ins, () => {
      pen.fill([pt(4, -10.4), pt(6.6, -9.2), pt(7.2, -6.4), pt(4.8, -6.8)], COLOR.dark, 0.95);
    });
    pen.hair([pt(5.6, -6.4), pt(6.2, -4.6), pt(5.4, -3.2)], 0.14, d.ink, 0.85);
  }
  // The rim: a heavy ring, bolted.
  const outer = oval(front, 0, e, r, 40);
  part(d, outer, mix(COLOR.metal, SHADOW, 0.1), { shadow: 0.35, line: 0.5, hatch: 0, gloss: true });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.2;
    rivets(d, [pt(front + Math.cos(a) * e * 0.9, Math.sin(a) * r * 0.9)], 0.3);
  }
  // The grid: a dome of holes in rows.
  const gr = r * 0.78;
  const ge = e * 0.78;
  const grid = oval(front + 0.3, 0, ge, gr, 36);
  pen.fill(grid, broken ? '#2c303f' : '#3f6fb8', 1);
  pen.clipped(grid, () => {
    const g = ctx.createRadialGradient(front - ge * 0.3, -gr * 0.35, 0, front, 0, gr * 1.1);
    if (broken) {
      g.addColorStop(0, rgba(COLOR.metal, 0.5));
      g.addColorStop(1, rgba(SHADOW, 0.4));
    } else {
      g.addColorStop(0, 'rgba(235, 246, 255, 0.95)');
      g.addColorStop(0.5, 'rgba(150, 200, 255, 0.6)');
      g.addColorStop(1, 'rgba(60, 110, 200, 0.3)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(front - ge - 1, -gr - 1, ge * 2 + 2, gr * 2 + 2);
    const s = 0.16;
    for (let v = -1; v <= 1; v += s * 0.87) {
      const row = Math.round(v / (s * 0.87));
      for (let u = -1 + (row % 2 ? s / 2 : 0); u <= 1; u += s) {
        if (u * u + v * v > 0.92) continue;
        const c = pt(front + 0.3 + u * ge, v * gr);
        pen.fill(oval(c.x, c.y, 0.3 * (1 - u * u * 0.5), 0.5, 8), broken ? '#14161f' : '#f2f9ff', broken ? 0.9 : 0.85);
      }
    }
    if (broken) {
      // Cracked across, its edges bright where the metal shows, and a piece gone.
      const crack = [pt(front - 4, -9), pt(front - 1, -4.4), pt(front - 2.2, -1), pt(front + 1.6, 3), pt(front + 0.4, 6.2), pt(front + 3, 10)];
      pen.stroke(crack, 0.5, '#0b0c12', 1, false);
      pen.hair(crack.map((p) => pt(p.x - 0.35, p.y - 0.1)), 0.16, COLOR.metal, 0.9);
      pen.fill([pt(front + 2, -6.6), pt(front + 4.4, -4.8), pt(front + 3.2, -2)], '#0b0c12', 0.95);
    }
  });
  pen.hair(grid.concat([grid[0]!]), 0.3, d.ink, 0.9);
  gleam(d, oval(front + 0.3, 0, ge * 0.86, gr * 0.86, 36).slice(19, 27), 0.4, broken ? 0.6 : 0.35);
  if (!broken) glow(ctx, pt(front + 0.6, 0), 9, COLOR.ion, 0.35);
}

/** The jump ring's spine, three-quarters on and tipped: angle 0 is to the right, the near run is the lower half. */
function ringSpine(a0: number, a1: number, n: number): Pt[] {
  const tilt = -0.32;
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = Math.cos(a) * 15.2;
    const y = Math.sin(a) * 8.6;
    return pt(x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt) + 0.6);
  });
}

/** One run of the jump ring: burnt dark, heat-blued, its coils banded. */
function ringRun(d: Draw, a0: number, a1: number, near: boolean): void {
  const { pen } = d;
  const n = 36;
  const spine = ringSpine(a0, a1, n);
  // Thicker as it comes towards you.
  const { shape } = ribbon(spine, (u) => {
    const a = a0 + (a1 - a0) * u;
    return 4.4 + 2 * Math.sin(a);
  });
  part(d, shape, near ? COLOR.ring : mix(COLOR.ring, SHADOW, 0.35), { shadow: 0.45, line: 0.45, hatch: 0, gloss: true });
  pen.clipped(shape, () => {
    for (const [t, c] of [[0.25, '#5d4a8a'], [0.6, '#3d5a8c'], [0.85, '#6a4c6e']] as const) {
      const p = spine[Math.round(t * n)]!;
      dab(d, oval(p.x, p.y, 4, 3, 12), c, near ? 0.38 : 0.2, 1.4);
    }
    // The coils in segments, every other one a shade lighter where its winding catches the light.
    for (let i = 0; i + 2 <= n; i += 4) {
      const seg = ribbon(spine.slice(i, i + 3), () => 9).shape;
      pen.fill(seg, LIGHT, near ? 0.16 : 0.07);
    }
    for (let i = 1; i < n; i += 2) {
      const p = spine[i]!;
      const q = spine[i + 1]!;
      const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const nx = -(q.y - p.y) / l;
      const ny = (q.x - p.x) / l;
      pen.hair([pt(p.x - nx * 3.6, p.y - ny * 3.6), pt(p.x + nx * 3.6, p.y + ny * 3.6)], 0.16, '#14151d', near ? 0.75 : 0.4);
    }
  });
  if (!near) return;
  // The inner face showing along the near run's top edge, and the light along its outer curve.
  const inner = ribbon(spine, (u) => 4.4 + 2 * Math.sin(a0 + (a1 - a0) * u)).bot;
  pen.hair(inner, 0.5, mix(COLOR.ring, LIGHT, 0.35), 0.7);
  gleam(d, spine.slice(2, 14).map((p) => pt(p.x, p.y + 1.2)), 0.35, 0.35);
}

/** The jump drive: the ring that steadies a wormhole, burnt black and torn by the wild one, its emitters dead. Past mending here. */
function jump(d: Draw): void {
  const { pen } = d;
  // Its mounting brackets, where it bolts to the ship.
  for (const a of [Math.PI * 0.98, Math.PI * 0.02]) {
    const p = ringSpine(a, a, 1)[0]!;
    part(d, roundRect(p.x - 1.6, p.y - 2.4, p.x + 1.6, p.y + 2.4, 0.4), COLOR.gunmetal, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  }
  ringRun(d, Math.PI, Math.PI * 2, false);
  // Torn open at the front right: two runs with a gap.
  const gap = [0.62, 0.92] as const;
  ringRun(d, 0, gap[0], true);
  ringRun(d, gap[1], Math.PI, true);
  for (const a of gap) {
    const p = ringSpine(a, a, 1)[0]!;
    pen.fill(oval(p.x, p.y, 1.6, 2.3, 10), '#0d0e14', 0.95);
    for (const [dx, dy] of [[0.6, 2.2], [-0.4, 2.8], [1, 3.2]] as const) pen.hair([p, pt(p.x + dx, p.y + dy), pt(p.x + dx * 1.6, p.y + dy * 1.4)], 0.13, COLOR.copper, 0.9);
  }
  // Emitter nodes round the near run, dead; one hanging off by its cable.
  for (const a of [0.25, 1.3, 1.75, 2.2, 2.7]) {
    const p = ringSpine(a, a, 1)[0]!;
    part(d, roundRect(p.x - 1.3, p.y - 1, p.x + 1.3, p.y + 1, 0.35), '#4a4e60', { shadow: 0.35, line: 0.25, hatch: 0, gloss: true });
    pen.dot(p.x + 0.4, p.y, 0.45, '#5f6f96', 0.9);
    pen.dot(p.x + 0.25, p.y - 0.2, 0.15, PAPER_FILL, 0.7);
  }
  const hang = ringSpine(1.02, 1.02, 1)[0]!;
  pen.hair([hang, pt(hang.x + 0.6, hang.y + 2.4), pt(hang.x - 0.2, hang.y + 4.4)], 0.16, d.ink, 0.9);
  part(d, roundRect(hang.x - 1.4, hang.y + 4.2, hang.x + 1, hang.y + 6, 0.3), '#4a4e60', { shadow: 0.3, line: 0.24, hatch: 0 });
  // Cracks, and soot over the lower run.
  for (const a of [2, 0.4]) {
    const p = ringSpine(a, a, 1)[0]!;
    pen.hair([pt(p.x - 1, p.y - 1.6), pt(p.x, p.y - 0.4), pt(p.x - 0.6, p.y + 0.8), pt(p.x + 0.4, p.y + 2)], 0.16, '#c9a27a', 0.85);
  }
}

/** How each picture sits in its frame: moved and scaled so it fits with room round it. */
const FIT: Readonly<Record<StarshipSlot, readonly [number, number, number]>> = {
  power: [1.6, 0.6, 0.84],
  tank: [0, 1.4, 0.84],
  engine: [1.8, 0, 0.86],
  telescope: [-0.8, 1.2, 0.84],
  jump: [0, -1.4, 0.98],
};

/** A starship system's picture: `broken` until it's mended (the jump drive is always burnt out). */
export function drawStarshipSystem(d: Draw, id: StarshipSlot, broken: boolean): void {
  const [dx, dy, s] = FIT[id];
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(dx, dy);
  if (id === 'power') power(d, broken);
  else if (id === 'tank') tank(d, broken);
  else if (id === 'engine') engine(d, broken);
  else if (id === 'telescope') telescope(d, broken);
  else jump(d);
  ctx.restore();
}
