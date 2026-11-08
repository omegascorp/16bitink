import type { Rng } from '../../logic/rng';
import { type Blade, boxOf, glaze, lanceBlade, mapBlade, model, petalBlade, rimLight } from '../critters/birdKit';
import { buildWing, covertRows, mapWing, mirrorY, paintWing, type Wing } from '../critters/birdWing';
import { bezier, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Bird, songFeather } from './mountainsCrittersBirdKit';

/**
 * The Mountains' songbirds' wings, in bird units: folded along the back
 * (the long primaries stacked to a point over the tail, the secondaries and
 * the broad tertials over them, the coverts at the shoulder), or spread in
 * flight (a pointed passerine wing, no fingers), downstroke or raised.
 */

export interface Folded {
  readonly primaries: readonly Blade[];
  readonly secondaries: readonly Blade[];
  readonly tertials: readonly Blade[];
  readonly coverts: Pt[];
}

/** The folded wing on the +y side (mirrored for the other); `droop` lets it slip off the back a little (fluffed, asleep). */
export function folded(bird: Bird, mirror: boolean, droop = 0): Folded {
  const { rx, ry, primaries: reach } = bird.b;
  const primaries = Array.from({ length: 5 }, (_, i) => lanceBlade(pt(rx * 0.05 - i * 1.1, ry * 0.72 - i * 0.12), Math.PI + 0.16 - i * 0.012, rx * 0.95 + reach - i * 1.4, 3, 0.01));
  const secondaries = Array.from({ length: 4 }, (_, i) => petalBlade(pt(rx * 0.42 - i * 1.5, ry * 0.8 - i * 0.08), Math.PI + 0.1 + i * 0.012, rx * 0.8 - i * 0.6, 3.6));
  const tertials = Array.from({ length: 3 }, (_, i) => petalBlade(pt(rx * 0.1 - i * 1.3, ry * 0.4 + i * 0.38), Math.PI + 0.05 + i * 0.02, rx * 0.7 - i * 0.8, 3.8));
  // The covert patch lies flush along the body's side, tapering back into the folded flight feathers.
  const coverts = [
    ...cub(pt(rx * 0.82, ry * 0.32), pt(rx * 0.84, ry * 0.72), pt(rx * 0.55, ry * 0.94), pt(rx * 0.2, ry * 0.93), 8),
    ...cub(pt(rx * 0.2, ry * 0.93), pt(-rx * 0.05, ry * 0.92), pt(-rx * 0.22, ry * 0.78), pt(-rx * 0.2, ry * 0.52), 6).slice(1),
    ...bezier(pt(-rx * 0.2, ry * 0.52), pt(rx * 0.3, ry * 0.36), pt(rx * 0.82, ry * 0.32), 6).slice(1, -1),
  ];
  const f = (p: Pt): Pt => {
    const q = pt(p.x, p.y + droop * (0.4 + Math.max(0, -p.x) * 0.06));
    return mirror ? mirrorY(q) : q;
  };
  return { primaries: primaries.map((b) => mapBlade(b, f)), secondaries: secondaries.map((b) => mapBlade(b, f)), tertials: tertials.map((b) => mapBlade(b, f)), coverts: coverts.map(f) };
}

export function foldedOutlines(w: Folded): Pt[][] {
  return [...w.primaries, ...w.secondaries, ...w.tertials].map((b) => b.shape).concat([w.coverts]);
}

/** The coverts' small feathers: dark-centred, pale-tipped, in rows (the greater coverts' tips make a wing bar). */
function covertFeathers(d: Draw, bird: Bird, shape: readonly Pt[], rng: Rng, rows: readonly { y: number; x0: number; x1: number; s: number }[]): void {
  const { p } = bird;
  const tone = p.covert ?? p.wing;
  d.pen.clipped(shape, () => {
    for (const r of rows) {
      for (let x = r.x0; x > r.x1; x -= r.s * 0.7) {
        const root = pt(x + r.s * 0.3, r.y + (rng() - 0.5) * 0.4);
        const f = petalBlade(root, Math.PI + 0.12 + (rng() - 0.5) * 0.15, r.s, r.s * 0.95, 0, 8);
        songFeather(d, f, r.s * 0.95, { base: tone, centre: mix(p.wingCentre, tone, 0.2), edge: p.wingEdge, centreK: 0.5, line: 0.22, edgeW: r.s * 0.3 });
      }
    }
  });
}

/** Paints a folded wing, the feathers under the coverts first. */
export function paintFolded(d: Draw, bird: Bird, w: Folded, rng: Rng): void {
  const { p, b } = bird;
  const prim = p.primary ?? p.wingCentre;
  for (const f of w.primaries) songFeather(d, f, 3.1, { base: prim, centre: mix(prim, '#000000', 0.3), edge: p.primaryEdge ?? p.wingEdge, centreK: 0.45, edgeW: 0.5, line: 0.35 });
  if (p.patch) {
    // A pale patch where the primaries leave the coverts.
    for (const f of w.primaries.slice(1, 4)) d.pen.fill([f.at(0.18, -1.2), f.at(0.36, -1.2), f.at(0.36, 1.2), f.at(0.18, 1.2)], p.patch, 0.85);
  }
  for (const f of [...w.secondaries].reverse()) songFeather(d, f, 3.7, { base: p.wing, centre: p.wingCentre, edge: p.wingEdge, centreK: 0.55, line: 0.35 });
  for (const f of w.tertials) songFeather(d, f, 3.9, { base: p.wing, centre: p.wingCentre, edge: p.wingEdge, centreK: 0.62, edgeW: 0.8, line: 0.4 });
  const c = w.coverts;
  const bx = boxOf(c);
  d.pen.fill(c, PAPER_FILL, 1);
  d.pen.fill(c, p.covert ?? p.wing, 0.9);
  const side = bx.cy > 0 ? 1 : -1;
  const y = (k: number): number => side * b.ry * k;
  covertFeathers(d, bird, c, rng, [
    { y: y(0.76), x0: b.rx * 0.45, x1: -b.rx * 0.3, s: 3 },
    { y: y(0.58), x0: b.rx * 0.6, x1: -b.rx * 0.1, s: 2.5 },
    { y: y(0.42), x0: b.rx * 0.8, x1: b.rx * 0.1, s: 2 },
  ]);
  d.pen.clipped(c, () => glaze(d, bx.cx + 1, bx.cy - side, bx.rx * 0.6, bx.ry * 0.5, 0, p.light, 0.25));
  model(d, c, 1.6, p.deep, { shade: 0.3, hatch: 0.15, lit: 0.08, line: 0 });
  rimLight(d, c, p.light, 0.5, 0.4);
  d.pen.stroke([...c, c[0]!], 0.4, d.ink, 0.8);
}

/** A spread wing on the +y side: `up` raises it (the upstroke, foreshortened and swept back). */
function openWing(bird: Bird, up: boolean): Wing {
  const sh = pt(4.5, bird.b.ry * 0.72);
  const lead = up
    ? [...cub(sh, pt(7.5, 8.5), pt(9, 11), pt(8.5, 14), 8), ...cub(pt(8.5, 14), pt(7.5, 17), pt(4, 20), pt(-1.5, 22), 8).slice(1)]
    : [...cub(sh, pt(8, 9), pt(10, 13), pt(10.2, 16.5), 8), ...cub(pt(10.2, 16.5), pt(10.4, 20.5), pt(9.4, 24), pt(7.5, 27), 8).slice(1)];
  const wrist = 0.5;
  const outward = up ? 0.95 : 0.45;
  return buildWing({
    lead,
    wrist,
    dir: (t) => {
      if (t < wrist) return Math.PI - 0.04 - (t / wrist) * 0.06;
      const u = (t - wrist) / (1 - wrist);
      return Math.PI - 0.1 - u ** 1.6 * (Math.PI / 2 - 0.1 - outward);
    },
    chord: (t) => {
      const k = up ? 0.86 : 1;
      if (t < wrist) return k * (11 + (t / wrist) * 0.6);
      const u = (t - wrist) / (1 - wrist);
      return k * (u < 0.55 ? 11.6 + u * 4 : 13.8 - (u - 0.55) * 11);
    },
    secondaries: 8,
    primaries: 9,
    secW: 3.4,
    priW: 3.6,
    coverts: (t) => (t < wrist ? 0.55 : 0.55 - ((t - wrist) / (1 - wrist)) * 0.32),
    fingers: 0,
  });
}

export function openWings(bird: Bird, up: boolean): Wing[] {
  const w = openWing(bird, up);
  return [w, mapWing(w, mirrorY)];
}

/** Paints a spread wing: flight feathers back to front (a pale patch at the primaries' base, if it has one), then rows of coverts. */
export function paintOpen(d: Draw, bird: Bird, w: Wing): void {
  const { p } = bird;
  const prim = p.primary ?? p.wingCentre;
  paintWing(d, w, {
    feather: (x) => {
      if (x.primary) songFeather(d, x.f, x.w, { base: prim, centre: mix(prim, '#000000', 0.25), edge: p.primaryEdge ?? p.wingEdge, centreK: 0.4, edgeW: 0.55, line: 0.3 });
      else songFeather(d, x.f, x.w, { base: p.wing, centre: p.wingCentre, edge: p.wingEdge, centreK: 0.5, edgeW: 0.65, line: 0.28 });
      if (x.primary && p.patch && x.t < 0.8) d.pen.clipped(x.f.shape, () => d.pen.fill([x.f.at(0.2, -x.w), x.f.at(0.34, -x.w), x.f.at(0.34, x.w), x.f.at(0.2, x.w)], p.patch!, 0.85));
    },
    coverts: (wing) => {
      const tone = p.covert ?? p.wing;
      const bx = boxOf(wing.coverts);
      d.pen.fill(wing.coverts, PAPER_FILL, 1);
      d.pen.fill(wing.coverts, tone, 0.9);
      d.pen.clipped(wing.coverts, () => {
        covertRows(wing, 3, (t) => (t < 0.5 ? 0.55 : 0.55 - ((t - 0.5) / 0.5) * 0.32), (t, r) => 3.4 - r * 0.6 - t * 0.6, (f, s) =>
          songFeather(d, f, s * 0.95, { base: tone, centre: mix(p.wingCentre, tone, 0.25), edge: p.wingEdge, centreK: 0.5, edgeW: s * 0.3, line: 0.2 }));
        glaze(d, bx.cx, bx.cy, bx.rx * 0.5, bx.ry * 0.4, 0.5, p.light, 0.2);
      });
      model(d, wing.coverts, 1.8, p.deep, { shade: 0.3, hatch: 0.12, lit: 0.06, line: 0 });
      rimLight(d, wing.coverts, p.light, 0.5, 0.4);
    },
  });
}
