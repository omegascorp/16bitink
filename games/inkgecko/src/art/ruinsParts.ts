import { createRng, type Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, normals, oval, pt, ribbon, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { ashlar, ivyMat, ivyRun, LICHEN, LIMESTONE, LIMESTONE_COOL, mossPatch, rect, worn } from './ruinsThings';
import { coverEnds, coverHalf, unit } from './tunnel';
import { mix } from './wash';

/**
 * The ruins' standing columns, seat, cover and deck: a broken fluted
 * column on its plinth (shots glance off it), a fallen column drum lying
 * flat for the gecko, carved lintels fallen along a stretch of groove
 * between two arch springings, and a little stone bridge with a balustrade
 * carrying a groove over a crossing.
 */
const HOLLOW = '#2a2a33';
/** The ground tone under a raised groove in the ruins. */
export const RUINS_BED = '#d6ccb4';
/** The angle the light comes from (upper left). */
const LIGHT = Math.atan2(-SHADOW.y, -SHADOW.x);

/** A fluted round outline radius r: `n` concave flutes between sharp arrises, `depth` deep. */
export function fluted(c: Pt, r: number, n: number, depth: number, turn: number): Pt[] {
  const steps = n * 6;
  return Array.from({ length: steps }, (_, i) => {
    const a = turn + (i / steps) * TAU;
    return polar(c, a, r - depth * Math.sin(Math.PI * ((i % 6) / 6)));
  });
}

/** The long shadow of an upright round thing radius r at c, `reach` down-right, its far end ragged. */
function longShadow(c: Pt, r: number, reach: number, rng: Rng): Pt[] {
  const phi = Math.atan2(SHADOW.y, SHADOW.x);
  const e = polar(c, phi, reach);
  const back = Array.from({ length: 13 }, (_, i) => polar(c, phi + Math.PI / 2 + (i / 12) * Math.PI, r));
  const front = Array.from({ length: 15 }, (_, i) => polar(e, phi - Math.PI / 2 + (i / 14) * Math.PI, r * (0.82 + rng() * 0.18)));
  return [...back, ...front];
}

/**
 * A broken column standing at c, radius exactly r to its fluted face: a
 * worn square plinth and a moulded base ring round its foot, a long shadow
 * thrown down-right, and its top snapped off in a jagged break, higher on
 * the side towards the light. `ivy` climbs it.
 */
export function brokenColumn(d: Draw, c: Pt, r: number, rng: Rng, ivy: boolean): void {
  const { pen } = d;
  const turn = rng() * TAU;
  const u = pt(Math.cos(turn), Math.sin(turn));
  // The plinth: low and worn, quieter than the shaft so the column's own round edge is what reads.
  const plinth = outline(worn(rect(c, u, 2 * r + 18, 2 * r + 18), 5 + rng() * 4), 6);
  castShadow(d, plinth, 4, 0.16);
  body(d, plinth, mix(LIMESTONE, PAPER_FILL, 0.2), 0.55);
  pen.stipple(plinth, Math.round(r * 8), () => 0.6, 0.5, STONE_DARK);
  pen.crescent(plinth, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(plinth, STONE_DARK, 0.3));
  pen.stroke(plinth, 0.7, d.ink, 0.55, false);
  const shadow = longShadow(c, r, r * 2.2, rng);
  pen.fill(longShadow(c, r + 3, r * 2.4, rng), d.ink, 0.07);
  pen.fill(shadow, d.ink, 0.17);
  pen.hatch(shadow, 3.4, 0.9, 0.45, { color: d.ink, alpha: 0.16 });
  // The torus of the base, just proud of the shaft.
  const ring = oval(c.x, c.y, r + 5, r + 5, 40);
  body(d, ring, LIMESTONE_COOL, 0.7);
  pen.crescent(ring, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(ring, mix(STONE_DARK, d.ink, 0.2), 0.45));
  pen.stroke(closed(ring), 0.8, d.ink, 0.7, false);
  // The shaft's top: fluted round, broken across.
  const flutes = Math.max(10, Math.round(r / 2.1));
  const rim = fluted(c, r, flutes, Math.min(1.3, r * 0.045), turn);
  castShadow(d, rim, 2.5, 0.25);
  body(d, rim, mix(LIMESTONE, LIMESTONE_COOL, rng() * 0.5), 0.8);
  const hd = LIGHT + (rng() - 0.5) * 1.2;
  const across = (k: number): Pt => polar(c, hd + Math.PI / 2, k);
  const n = 8;
  const fracture = Array.from({ length: n + 1 }, (_, i) => {
    const k = (i / n - 0.5) * 2 * r * 1.15;
    const side = i === 0 || i === n ? 0 : (rng() - 0.5) * r * 0.32;
    return polar(across(k), hd, -r * 0.12 + side);
  });
  const high = [...fracture, ...Array.from({ length: 9 }, (_, i) => polar(c, hd - Math.PI / 2 + 0.25 - (i / 8) * (Math.PI - 0.5) + Math.PI, r * 1.3))];
  pen.clipped(rim, () => {
    // The lower break darker and grainier, the high one catching the light.
    pen.fill(rim, mix(STONE_DARK, LIMESTONE, 0.4), 0.38);
    pen.stipple(rim, Math.round(r * r * 0.4), () => 0.7, 0.5, STONE_DARK);
    pen.fill(high, PAPER_FILL, 0.45);
    pen.fill(high, LIMESTONE, 0.25);
    pen.stipple(high, Math.round(r * r * 0.12), () => 0.6, 0.45, STONE_DARK);
    // The step down from the high break throws its shadow on the lower one.
    const drop = high.map((p) => pt(p.x + SHADOW.x * r * 0.22, p.y + SHADOW.y * r * 0.22));
    pen.crescent(drop, pt(-SHADOW.x * r * 0.22, -SHADOW.y * r * 0.22), () => {
      pen.fill(drop, d.ink, 0.22);
      pen.hatch(drop, 2.4, 0.9, 0.5, { color: d.ink, alpha: 0.35 });
    });
    // A lesser step within the high part, and moss where the lower part holds the damp.
    const k = polar(c, hd, r * 0.35);
    pen.hair([polar(k, hd + 1.6, r * 0.5), polar(k, hd + 0.2, r * 0.1), polar(k, hd - 1.5, r * 0.45)], 0.6, d.ink, 0.55);
    for (let m = 0; m < Math.max(1, r / 14); m++) mossPatch(d, polar(c, hd + Math.PI + (rng() - 0.5) * 1.6, r * (0.45 + rng() * 0.4)), r * (0.12 + rng() * 0.08), rng);
    for (let m = 0; m < Math.max(1, r / 16); m++) {
      const p = polar(c, hd + (rng() - 0.5) * 2, r * (0.3 + rng() * 0.5));
      pen.fill(blob(p, 2.5 + rng() * 3, 2 + rng() * 2.4, rng, 0.25, 12), LICHEN, 0.55);
    }
    // The top falls away at its edge on the shadow side; lit along the other.
    pen.crescent(rim, pt(-SHADOW.x * r * 0.14, -SHADOW.y * r * 0.14), () => pen.fill(rim, mix(STONE_DARK, d.ink, 0.3), 0.4));
    pen.crescent(rim, pt(SHADOW.x * r * 0.1, SHADOW.y * r * 0.1), () => pen.fill(rim, PAPER_FILL, 0.4));
  });
  pen.clipped(rim, () => pen.stroke(fracture, 1.1, d.ink, 0.9, false));
  for (let i = 0; i < flutes; i++) {
    const a = turn + (i / flutes) * TAU;
    pen.hair([polar(c, a, r), polar(c, a, r - Math.min(4, r * 0.12))], 0.5, d.ink, 0.5);
  }
  pen.stroke(closed(rim), 1.6, d.ink, 1);
  if (ivy) {
    const a = LIGHT + Math.PI * (0.55 + rng() * 0.9);
    ivyRun(d, polar(c, a, r + 16), a + Math.PI + 0.7, r * 1.4, rng, Math.min(7, 4 + r / 10));
    ivyRun(d, polar(c, a + 0.4, r + 12), a + 0.4 + Math.PI - 0.6, r * 0.9, rng, Math.min(6.5, 4 + r / 12));
  }
}

/**
 * A fallen column drum lying flat, radius r at c, the gecko's seat: its
 * fluted edge, the smooth margin of the joint face round a roughly picked
 * middle, the dowel hole, lichen and moss, sunk a little into grass.
 */
export function columnDrum(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(c.x * 29 + c.y * 13));
  const turn = rng() * TAU;
  const bed = blob(c, r + 13, r + 11, rng, 0.1, 30);
  pen.fill(bed, MOSS, 0.32);
  for (let k = 0; k < 70; k++) {
    const a = rng() * TAU;
    const p = polar(c, a, r + 2 + rng() * 10);
    pen.hair([p, polar(p, a + (rng() - 0.5) * 1.2, 4 + rng() * 5)], 0.5, mix(LEAF, d.ink, 0.3), 0.55);
  }
  const rim = fluted(c, r, 24, 2.6, turn);
  castShadow(d, rim, 7, 0.24);
  body(d, rim, mix(LIMESTONE, '#d8c9a4', 0.4), 0.82);
  const margin = r * 0.84;
  const middle = oval(c.x, c.y, margin, margin, 40);
  pen.clipped(rim, () => {
    pen.fill(blob(pt(c.x - r * 0.15, c.y - r * 0.2), r * 0.7, r * 0.55, rng, 0.2, 20), PAPER_FILL, 0.25);
    pen.stipple(middle, 900, () => 0.7, 0.55, STONE_DARK);
    for (let k = 0; k < 90; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * margin * 0.95);
      const a = rng() * TAU;
      pen.hair([p, polar(p, a, 1.6 + rng() * 1.4)], 0.45, d.ink, 0.3);
    }
    for (let k = 0; k < 5; k++) {
      const p = polar(c, rng() * TAU, r * (0.86 + rng() * 0.08));
      pen.fill(blob(p, 3 + rng() * 4, 2.5 + rng() * 2.5, rng, 0.25, 12), LICHEN, 0.55);
    }
    for (let k = 0; k < 18; k++) {
      const p = polar(c, LIGHT + Math.PI + (rng() - 0.5) * 1.6, r * (0.9 + rng() * 0.12));
      pen.fill(oval(p.x, p.y, 1.4 + rng() * 2, 1.2 + rng() * 1.4, 8), rng() < 0.4 ? LEAF : MOSS, 0.6);
    }
    pen.hair([polar(c, turn + 1, r), polar(c, turn + 1.1, r * 0.75), polar(c, turn + 0.95, r * 0.5)], 0.6, d.ink, 0.5);
    pen.crescent(rim, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(rim, STONE_DARK, 0.4));
    pen.crescent(rim, pt(-SHADOW.x * 8, -SHADOW.y * 8), () => pen.hatch(rim, 3, 0.9, 0.45, { color: d.ink, alpha: 0.28 }));
  });
  pen.hair(closed(middle), 0.6, d.ink, 0.45);
  // The dowel hole in the middle of the joint face.
  const hole = rect(c, pt(Math.cos(turn), Math.sin(turn)), r * 0.16, r * 0.16);
  pen.fill(hole, HOLLOW, 0.75);
  pen.crescent(hole, pt(SHADOW.x * 2, SHADOW.y * 2), () => pen.fill(hole, PAPER_FILL, 0.35));
  pen.stroke(closed(hole), 0.8, d.ink, 0.85, false);
  for (let i = 0; i < 24; i++) {
    const a = turn + (i / 24) * TAU;
    pen.hair([polar(c, a, r), polar(c, a, r - 3)], 0.5, d.ink, 0.45);
  }
  pen.stroke(closed(rim), 1.5, d.ink, 0.95);
}

/** One carved lintel along `span`, `half` wide either side: a moulded face with dentils on one long side. */
function lintel(d: Draw, span: readonly Pt[], half: number, carved: number, rng: Rng): void {
  const { pen } = d;
  const band = { shape: worn(ribbon(span, () => half * 2).shape, 4) };
  const nrm = normals(span);
  const off = (k: number): Pt[] => span.map((p, i) => pt(p.x + nrm[i]!.x * k, p.y + nrm[i]!.y * k));
  body(d, band.shape, mix(rng() < 0.6 ? LIMESTONE : LIMESTONE_COOL, STONE_DARK, rng() * 0.2), 0.75);
  pen.clipped(band.shape, () => {
    pen.stipple(band.shape, span.length * 22, () => 0.6, 0.5, STONE_DARK);
    for (let k = 0; k < 3; k++) pen.fill(blob(span[Math.floor(rng() * span.length)]!, 8 + rng() * 10, 5 + rng() * 6, rng, 0.3, 12), STONE_DARK, 0.1);
    // Fasciae and dentils along the carved face; a plain fillet along the other.
    const strip = (k0: number, k1: number): Pt[] => [...off(carved * k0), ...off(carved * k1).reverse()];
    // A recessed fascia, then a row of dentils along the edge with dark between them.
    pen.fill(strip(half - 5, half - 10), STONE_DARK, 0.2);
    pen.hatch(strip(half - 5, half - 10), 2.2, 0.9, 0.4, { color: d.ink, alpha: 0.3 });
    pen.fill(strip(half, half - 5), mix(STONE_DARK, d.ink, 0.3), 0.4);
    for (let i = 0; i + 1 < span.length; i += 2) {
      const tooth = [...off(carved * (half - 0.3)).slice(i, i + 2), ...off(carved * (half - 4.6)).slice(i, i + 2).reverse()];
      const c = pt(tooth.reduce((s, p) => s + p.x, 0) / 4, tooth.reduce((s, p) => s + p.y, 0) / 4);
      const t = tooth.map((p) => pt(c.x + (p.x - c.x) * 0.72, c.y + (p.y - c.y) * 0.95));
      pen.fill(t, mix(LIMESTONE, PAPER_FILL, 0.3), 0.85);
      pen.hair(closed(t), 0.4, d.ink, 0.55);
    }
    pen.hair(off(carved * (half - 5)), 0.55, d.ink, 0.6);
    pen.hair(off(carved * (half - 10)), 0.5, d.ink, 0.5);
    pen.hair(off(-carved * (half - 4)), 0.5, d.ink, 0.4);
    if (rng() < 0.5) {
      const p = span[Math.floor(span.length / 2)]!;
      const q = nrm[Math.floor(span.length / 2)]!;
      pen.stroke([pt(p.x + q.x * half, p.y + q.y * half), pt(p.x + q.x * 4 + 3, p.y + q.y * 4), pt(p.x - q.x * half * 0.6, p.y - q.y * half * 0.6 + 2)], 0.8, d.ink, 0.6, false);
    }
    for (let k = 0; k < 2; k++) mossPatch(d, span[Math.floor(rng() * span.length)]!, 4 + rng() * 4, rng, 0.5);
  });
  pen.crescent(band.shape, pt(-SHADOW.x * 5, -SHADOW.y * 5), () => pen.fill(band.shape, mix(STONE_DARK, d.ink, 0.2), 0.4));
  pen.crescent(band.shape, pt(-SHADOW.x * 9, -SHADOW.y * 9), () => pen.hatch(band.shape, 2.8, 0.9, 0.45, { color: d.ink, alpha: 0.3 }));
  pen.crescent(band.shape, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(band.shape, PAPER_FILL, 0.3));
  pen.stroke(closed(band.shape), 1.1, d.ink, 0.92);
}

/** An arch's springing across the groove at pts[i]: wedge-shaped voussoirs either side of a keystone, reaching past the lintels. */
function springing(d: Draw, pts: readonly Pt[], i: number, inward: Pt, half: number, rng: Rng): void {
  const across = pt(-inward.y, inward.x);
  const reach = half + 12;
  const count = 3;
  for (let k = 0; k < count; k++) {
    const s0 = -reach + (2 * reach * k) / count;
    const s1 = -reach + (2 * reach * (k + 1)) / count;
    const key = k === Math.floor(count / 2);
    const deep = key ? 26 : 21 + rng() * 3;
    const o0 = pt(pts[i]!.x + across.x * s0, pts[i]!.y + across.y * s0);
    const o1 = pt(pts[i]!.x + across.x * s1, pts[i]!.y + across.y * s1);
    const back = key ? -4 : 0;
    ashlar(d, [pt(o0.x - inward.x * back, o0.y - inward.y * back), pt(o1.x - inward.x * back, o1.y - inward.y * back), pt(o1.x + inward.x * deep, o1.y + inward.y * deep), pt(o0.x + inward.x * deep, o0.y + inward.y * deep)], rng, 8);
  }
}

/**
 * The ruins' cover over a stretch of groove: carved lintels fallen end to
 * end along it from a collapsed arcade, an arch springing standing across
 * each end, rubble at their sides and ivy grown over. Follows a curve;
 * covers coverHalf(grooveW) either side and more.
 */
export function fallenArch(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const rng = createRng(Math.round(pts[0]!.x * 17 + pts[0]!.y * 5 + pts.length));
  coverEnds(d, pts, grooveW);
  const half = coverHalf(grooveW) + 3;
  const last = pts.length - 1;
  const nrm = normals(pts);
  castShadow(d, ribbon(pts, () => half * 2 + 4).shape, 11, 0.2);
  for (let i = 3; i < last - 2; i += 6 + Math.floor(rng() * 6)) {
    const s = rng() < 0.5 ? 1 : -1;
    const p = pt(pts[i]!.x + nrm[i]!.x * s * (half + 5), pts[i]!.y + nrm[i]!.y * s * (half + 5));
    const l = 10 + rng() * 8;
    ashlar(d, rect(p, polar(pt(0, 0), rng() * TAU, 1), l, l * 0.7), rng, 4);
  }
  const cuts = [0];
  while (cuts[cuts.length - 1]! < last) cuts.push(Math.min(last, cuts[cuts.length - 1]! + 10 + Math.floor(rng() * 5)));
  if (cuts.length > 2 && last - cuts[cuts.length - 2]! < 6) cuts.splice(cuts.length - 2, 1);
  const carved = rng() < 0.5 ? 1 : -1;
  for (let k = 0; k + 1 < cuts.length; k++) lintel(d, pts.slice(cuts[k]!, Math.min(last, cuts[k + 1]! + 1) + 1), half - (k % 2) * 1.5, k % 3 === 2 ? -carved : carved, rng);
  const near = Math.min(3, last);
  springing(d, pts, 0, unit(pts[0]!, pts[near]!), half, rng);
  springing(d, pts, last, unit(pts[last]!, pts[last - near]!), half, rng);
  // Ivy grown over from one side to the other.
  for (let k = 0; k < Math.max(1, Math.round(pts.length / 30)); k++) {
    const i = Math.floor(last * (0.2 + rng() * 0.6));
    const s = rng() < 0.5 ? 1 : -1;
    const from = pt(pts[i]!.x + nrm[i]!.x * s * (half + 2), pts[i]!.y + nrm[i]!.y * s * (half + 2));
    ivyMat(d, from, 12 + rng() * 5, rng);
    ivyRun(d, from, Math.atan2(-nrm[i]!.y * s, -nrm[i]!.x * s) + (rng() - 0.5) * 0.6, half * 1.6, rng, 7.5);
  }
}

/**
 * The ruins' deck: a small stone bridge, a low balustrade either side of
 * the groove (bellied balusters under a coping rail, a length of rail
 * fallen away), square pedestals at its four corners.
 */
export function balustradeDeck(d: Draw, pts: readonly Pt[], half: number, grooveW: number, rng: Rng): void {
  const { pen } = d;
  const deck = ribbon(pts, () => half * 2);
  body(d, deck.shape, LIMESTONE, 0.75);
  pen.stipple(deck.shape, pts.length * 14, () => 0.6, 0.5, STONE_DARK);
  pen.stroke(closed(deck.shape), 1, d.ink, 0.85);
  const nrm = normals(pts);
  const last = pts.length - 1;
  const railOff = grooveW / 2 + (half - grooveW / 2) / 2;
  const gapSide = rng() < 0.5 ? 1 : -1;
  const g0 = Math.floor(last * (0.3 + rng() * 0.3));
  const g1 = g0 + 4 + Math.floor(rng() * 3);
  for (const s of [1, -1]) {
    const line = pts.map((p, i) => pt(p.x + nrm[i]!.x * s * railOff, p.y + nrm[i]!.y * s * railOff));
    // The balusters, bellying out under the rail.
    for (let i = 1; i < last; i += 2) {
      if (s === gapSide && i > g0 && i < g1 && rng() < 0.35) continue;
      const b = oval(line[i]!.x, line[i]!.y, 4.2, 4.2, 12);
      castShadow(d, b, 3, 0.25);
      body(d, b, LIMESTONE_COOL, 0.75);
      pen.crescent(b, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(b, STONE_DARK, 0.5));
      pen.hair(closed(b), 0.5, d.ink, 0.8);
    }
    const runs = s === gapSide ? [line.slice(0, g0 + 1), line.slice(g1)] : [line];
    for (const run of runs) {
      if (run.length < 2) continue;
      const rail = ribbon(run, () => 5.5);
      castShadow(d, rail.shape, 4, 0.2);
      body(d, rail.shape, mix(LIMESTONE, PAPER_FILL, 0.2), 0.75);
      pen.crescent(rail.shape, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(rail.shape, STONE_DARK, 0.4));
      pen.stroke(rail.top, 0.8, d.ink, 0.85, false);
      pen.stroke(rail.bot, 0.8, d.ink, 0.85, false);
    }
  }
  // Pedestals at the corners, a ball finial on most.
  for (const i of [0, last]) {
    const along = unit(pts[i === 0 ? 0 : last]!, pts[i === 0 ? Math.min(2, last) : Math.max(0, last - 2)]!);
    for (const s of [1, -1]) {
      const c = pt(pts[i]!.x + nrm[i]!.x * s * railOff, pts[i]!.y + nrm[i]!.y * s * railOff);
      ashlar(d, rect(c, along, 15, 15), rng, 9);
      d.pen.hair(closed(rect(c, along, 10, 10)), 0.5, d.ink, 0.5);
      if (rng() < 0.75) {
        const ball = oval(c.x, c.y, 4.5, 4.5, 14);
        castShadow(d, ball, 5, 0.25);
        body(d, ball, LIMESTONE, 0.8);
        pen.crescent(ball, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(ball, mix(STONE_DARK, d.ink, 0.2), 0.55));
        pen.dot(c.x - 1.4, c.y - 1.8, 1, PAPER_FILL, 0.8);
        pen.stroke(closed(ball), 0.7, d.ink, 0.9, false);
      }
    }
  }
  const i = Math.floor(last * (0.6 + rng() * 0.3));
  const s = -gapSide;
  ivyRun(d, pt(pts[i]!.x + nrm[i]!.x * s * (half + 6), pts[i]!.y + nrm[i]!.y * s * (half + 6)), Math.atan2(pts[Math.max(0, i - 2)]!.y - pts[i]!.y, pts[Math.max(0, i - 2)]!.x - pts[i]!.x) + s * 0.4, 40, rng, 5);
}
