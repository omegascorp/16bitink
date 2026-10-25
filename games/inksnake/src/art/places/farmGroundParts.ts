import type { Rng } from '../../logic/rng';
import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, normals, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { EARTH, EARTH_DEEP, EARTH_LIT, GRASS, GRASS_DEEP, GRASS_LIT, noiseOf, SOIL, SOIL_DARK, SOIL_LIT, strokes } from './farmKit';

/**
 * The farmyard ground's pieces, seen from above, light from the upper left:
 * trodden earth (a path, a patch, a cart track's ruts) sunk a little below
 * the grass, tilled soil beds, dark grass tufts, lawn flowers and pebbles.
 * Board coordinates; each takes the rng it draws its variety from.
 */

/** A band either side of a polyline: left half-width `a(i)`, right `b(i)`. */
export function stripShape(pts: readonly Pt[], a: (i: number) => number, b: (i: number) => number): { left: Pt[]; right: Pt[]; shape: Pt[] } {
  const nrm = normals(pts);
  const left = pts.map((p, i) => pt(p.x + nrm[i]!.x * a(i), p.y + nrm[i]!.y * a(i)));
  const right = pts.map((p, i) => pt(p.x - nrm[i]!.x * b(i), p.y - nrm[i]!.y * b(i)));
  return { left, right, shape: [...left, ...[...right].reverse()] };
}

/** Little round marks laid as one path. */
export function specks(d: Draw, colour: string, alpha: number, at: readonly (readonly [number, number, number])[]): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = rgba(colour, alpha);
  ctx.beginPath();
  for (const [x, y, r] of at) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** A pen line broken into lengths, some left out: a contour that comes and goes. */
function brokenLine(d: Draw, pts: readonly Pt[], w: number, alpha: number, rng: Rng, keep = 0.6): void {
  for (let i = 0; i < pts.length - 2; ) {
    const n = 4 + Math.floor(rng() * 8);
    if (rng() < keep) d.pen.hair(pts.slice(i, i + n + 1), w, d.ink, alpha);
    i += n;
  }
}

/**
 * Bare trodden earth in a shape: a pale wash, darker blooms where it dried,
 * grit, the shade of the grass edge on its upper-left rim (it lies a little
 * sunk), its lit far rim, and blades leaning in over the edge.
 */
export function bareEarth(d: Draw, shape: readonly Pt[], edges: readonly (readonly Pt[])[], area: () => Pt, size: number, rng: Rng, tone = EARTH): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 0.4);
  pen.fill(shape, tone, 0.5);
  pen.clipped(shape, () => {
    for (let k = 0; k < size / 50; k++) {
      const p = area();
      pen.fill(blob(p, 18 + rng() * 40, 10 + rng() * 22, rng, 0.35, 14, rng() * TAU), rng() < 0.5 ? EARTH_DEEP : EARTH_LIT, 0.1 + rng() * 0.08);
    }
    const grit: [number, number, number][] = [];
    const lit: [number, number, number][] = [];
    for (let k = 0; k < size * 1.4; k++) {
      const p = area();
      (rng() < 0.7 ? grit : lit).push([p.x, p.y, 0.35 + rng() * 0.55]);
    }
    specks(d, mix(tone, d.ink, 0.45), 0.55, grit);
    specks(d, PAPER_FILL, 0.6, lit);
    for (let k = 0; k < size / 14; k++) pebble(d, area(), 1.2 + rng() * 2.2, rng);
  });
  pen.crescent(shape, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(shape, EARTH_DEEP, 0.32));
  pen.crescent(shape, pt(SHADOW.x * 7, SHADOW.y * 7), () => pen.hatch(shape, 2.6, 0.9, 0.4, { color: d.ink, alpha: 0.18 }));
  pen.crescent(shape, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(shape, PAPER_FILL, 0.3));
  for (const e of edges) {
    brokenLine(d, e, 0.6, 0.4, rng);
    overhang(d, e, rng);
  }
}

/** Grass blades along an edge, leaning in over whatever is inside it (the side the polyline's normal points away from is in). */
export function overhang(d: Draw, edge: readonly Pt[], rng: Rng, reach = 6): void {
  const nrm = normals(edge);
  for (const [colour, alpha, wd] of [[GRASS_DEEP, 0.6, 1], [GRASS, 0.7, 0.9], [GRASS_LIT, 0.6, 0.7]] as const) {
    let i = 0;
    strokes(d, colour, alpha, wd, edge.length * 2, () => {
      const k = i++ % edge.length;
      if (rng() < 0.45) return null;
      const p = edge[k]!;
      const n = nrm[k]!;
      // Each blade roots a little outside and leans in.
      const out = rng() * 4;
      const a = Math.atan2(-n.y, -n.x) + (rng() - 0.5) * 1.6;
      const s = rng();
      return [p.x + n.x * out + (s - 0.5) * 6, p.y + n.y * out, a, 2 + rng() * reach, (rng() - 0.5) * 2];
    });
  }
}

/** A trodden footpath along `pts` (a smooth polyline), `half` either side, wandering. */
export function footpath(d: Draw, pts: readonly Pt[], half: number, rng: Rng, tone = EARTH): void {
  const n = noiseOf(rng, 60);
  const wob = (i: number, s: number): number => half * (1 + 0.22 * n(pts[i]!.x + s * 300, pts[i]!.y));
  const strip = stripShape(pts, (i) => wob(i, 0), (i) => wob(i, 1));
  const area = (): Pt => {
    const i = Math.floor(rng() * pts.length);
    return polar(pts[i]!, rng() * TAU, Math.sqrt(rng()) * half);
  };
  bareEarth(d, strip.shape, [strip.left, [...strip.right].reverse()], area, pts.length * half * 0.18, rng, tone);
  // The polished line down the middle where feet go most.
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(EARTH_LIT, 0.22);
  ctx.lineWidth = half * 0.8;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** A cart track: two wheel ruts `gauge` apart with a strip of grass between, along `pts`. */
export function cartTrack(d: Draw, pts: readonly Pt[], gauge: number, rng: Rng): void {
  const nrm = normals(pts);
  const drift = noiseOf(rng, 90);
  for (const s of [1, -1]) {
    const rut = pts.map((p, i) => pt(p.x + nrm[i]!.x * s * (gauge / 2 + drift(p.x, p.y) * 2), p.y + nrm[i]!.y * s * (gauge / 2 + drift(p.x, p.y) * 2)));
    footpath(d, rut, 7.5, rng);
  }
  // The middle strip: a little longer, darker grass.
  const mid = (): readonly [number, number, number, number, number] | null => {
    const i = Math.floor(rng() * pts.length);
    const p = pts[i]!;
    const t = (rng() - 0.5) * (gauge - 18);
    return [p.x + nrm[i]!.x * t, p.y + nrm[i]!.y * t, -Math.PI / 2 + (rng() - 0.5) * 2.4, 3 + rng() * 6, (rng() - 0.5) * 2];
  };
  strokes(d, GRASS_DEEP, 0.4, 0.9, pts.length * 3, mid);
  strokes(d, GRASS, 0.5, 0.8, pts.length * 3, mid);
}

/** A patch of trodden earth round c, rx × ry, its edge ragged. */
export function earthPatch(d: Draw, c: Pt, rx: number, ry: number, rng: Rng, tone = EARTH, turn = rng() * TAU): Pt[] {
  const shape = blob(c, rx, ry, rng, 0.3, 40, turn);
  const area = (): Pt => {
    const a = rng() * TAU;
    const r = Math.sqrt(rng());
    return pt(c.x + Math.cos(a) * rx * r * Math.cos(turn) - Math.sin(a) * ry * r * Math.sin(turn), c.y + Math.cos(a) * rx * r * Math.sin(turn) + Math.sin(a) * ry * r * Math.cos(turn));
  };
  bareEarth(d, shape, [closed(shape)], area, (rx * ry) / 30, rng, tone);
  return shape;
}

/** A dug bed of dark tilled soil round c, a little bigger than r: furrows across it, crumbs, a weed or two, the grass edge cut sharp. */
export function soilBed(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const turn = (rng() - 0.5) * 0.5;
  const shape = blob(c, r * 1.24, r * 1.1, rng, 0.16, 40, turn);
  pen.fill(shape, PAPER_FILL, 0.45);
  pen.fill(shape, SOIL, 0.6);
  pen.clipped(shape, () => {
    const u = pt(Math.cos(turn), Math.sin(turn));
    const n = pt(-u.y, u.x);
    for (let off = -r * 1.4; off < r * 1.4; off += 12) {
      const a = pt(c.x + n.x * off - u.x * r * 1.5, c.y + n.y * off - u.y * r * 1.5);
      const b = pt(c.x + n.x * off + u.x * r * 1.5, c.y + n.y * off + u.y * r * 1.5);
      const line = arc(a, b, (rng() - 0.5) * 3, 12);
      // Each ridge: its lit crest towards the light, the furrow's shade beyond it.
      pen.hair(line.map((p) => pt(p.x - n.x * 2, p.y - n.y * 2)), 2.4, SOIL_LIT, 0.45);
      pen.hair(line.map((p) => pt(p.x + n.x * 3, p.y + n.y * 3)), 1.6, SOIL_DARK, 0.5);
    }
    const crumbs: [number, number, number][] = [];
    const lit: [number, number, number][] = [];
    for (let k = 0; k < r * r * 0.5; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 1.35);
      (rng() < 0.6 ? crumbs : lit).push([p.x, p.y, 0.4 + rng() * 0.8]);
    }
    specks(d, SOIL_DARK, 0.55, crumbs);
    specks(d, mix(SOIL_LIT, PAPER_FILL, 0.3), 0.5, lit);
  });
  pen.crescent(shape, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(shape, SOIL_DARK, 0.35));
  pen.crescent(shape, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(shape, SOIL_LIT, 0.3));
  // A weed seedling or two out in the ring the crop leaves bare.
  for (let k = 0; k < 3; k++) {
    const p = polar(c, rng() * TAU, r * (1.08 + rng() * 0.12));
    for (const side of [0, Math.PI]) {
      const a = rng() * TAU + side;
      const tip = polar(p, a, 3.5);
      const leaf = [...arc(p, tip, 2, 4), ...arc(tip, p, 2, 4).slice(1)];
      pen.fill(leaf, '#8fbd58', 0.9);
      pen.hair(closed(leaf), 0.35, d.ink, 0.6);
    }
  }
  pen.stroke(closed(shape), 0.9, d.ink, 0.55, false);
  overhang(d, closed(shape), rng, 8);
}

/** A tuft of darker, uncut grass: a fan of blades sprung from one root, leaning the way `lean` points, the shadow-side blades deep and the lit ones pale. */
export function tuft(d: Draw, c: Pt, s: number, rng: Rng, lean = -2.2 + (rng() - 0.5) * 1.2): void {
  const { pen } = d;
  pen.fill(blob(pt(c.x + SHADOW.x * s * 0.35, c.y + SHADOW.y * s * 0.35), s * 0.5, s * 0.32, rng, 0.3, 12, lean), GRASS_DEEP, 0.16);
  const n = 9 + Math.floor(rng() * 9);
  const blades = Array.from({ length: n }, () => {
    const a = lean + (rng() - 0.5) * (rng() < 0.8 ? 1.9 : 4.5);
    return { a, len: s * (0.45 + rng() * 0.6), base: pt(c.x + (rng() - 0.5) * s * 0.25, c.y + (rng() - 0.5) * s * 0.15) };
  });
  blades.sort((p, q) => q.len - p.len);
  for (const b of blades) {
    const lightness = (1 - Math.cos(b.a - 0.99)) / 2;
    const colour = mix(mix(GRASS_DEEP, '#5c7a46', 0.3), GRASS_LIT, lightness * 0.7 + rng() * 0.25);
    const tip = polar(b.base, b.a, b.len);
    pen.hair(arc(b.base, tip, (rng() - 0.5) * b.len * 0.35, 6), 0.7 + rng() * 0.5, colour, 0.85);
  }
}

/** A small pebble: washed grey-buff, lit on top, shadow down-right, a fine outline. */
export function pebble(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(c, s, s * (0.65 + rng() * 0.25), rng, 0.25, 9, rng() * TAU);
  castShadow(d, shape, s * 0.55, 0.2);
  body(d, shape, mix('#d2c8b2', '#9a9080', rng()), 0.75);
  pen.fill(oval(c.x - s * 0.25, c.y - s * 0.3, s * 0.45, s * 0.3, 8), PAPER_FILL, 0.45);
  pen.hair(closed(shape), 0.45, d.ink, 0.65);
}

/** Ox-eye daisy: white rays round a yellow heart. */
export function daisy(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  const n = 12 + Math.floor(rng() * 4);
  pen.fill(oval(c.x + SHADOW.x * 1.4, c.y + SHADOW.y * 1.4, s, s, 12), d.ink, 0.12);
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * TAU + (rng() - 0.5) * 0.15;
    pen.hair([polar(c, a, s * 0.3), polar(c, a, s * (0.9 + rng() * 0.15))], s * 0.34, PAPER_FILL, 1);
  }
  pen.hair(closed(oval(c.x, c.y, s * 1.02, s * 1.02, 14)), 0.3, d.ink, 0.3);
  pen.fill(oval(c.x, c.y, s * 0.34, s * 0.34, 10), '#e6b22a', 1);
  pen.fill(oval(c.x + s * 0.08, c.y + s * 0.1, s * 0.22, s * 0.2, 8), '#b07f14', 0.45);
}

/** White clover: a round creamy head over a trefoil or two. */
export function clover(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < 2; k++) {
    const a = rng() * TAU;
    const base = polar(c, a, s * 1.1);
    for (let l = 0; l < 3; l++) {
      const lc = polar(base, a + (l - 1) * 2.1, s * 0.45);
      const leaf = oval(lc.x, lc.y, s * 0.45, s * 0.45, 10);
      pen.fill(leaf, mix(GRASS, '#5d8a3e', rng()), 0.75);
      pen.hair(closed(oval(lc.x, lc.y, s * 0.25, s * 0.17, 8)), 0.35, PAPER_FILL, 0.6);
    }
  }
  const head = oval(c.x, c.y, s * 0.68, s * 0.68, 12);
  castShadow(d, head, 1.3, 0.14);
  pen.fill(head, PAPER_FILL, 0.95);
  pen.clipped(head, () => {
    for (let k = 0; k < 10; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * s * 0.6);
      pen.hair([p, polar(p, rng() * TAU, s * 0.22)], 0.45, rng() < 0.5 ? '#e7c6cf' : '#c9c2a8', 0.8);
    }
  });
  pen.crescent(head, pt(-SHADOW.x * s * 0.3, -SHADOW.y * s * 0.3), () => pen.fill(head, '#b9a8a0', 0.35));
  pen.hair(closed(head), 0.35, d.ink, 0.5);
}

/** Buttercup: five glossy petals with a glint. */
export function buttercup(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  pen.fill(oval(c.x + SHADOW.x * 1.2, c.y + SHADOW.y * 1.2, s, s, 12), d.ink, 0.1);
  for (let k = 0; k < 5; k++) {
    const pc = polar(c, turn + (k / 5) * TAU, s * 0.5);
    pen.fill(oval(pc.x, pc.y, s * 0.5, s * 0.5, 10), '#f2c62a', 0.95);
  }
  pen.dot(c.x - s * 0.3, c.y - s * 0.3, s * 0.16, PAPER_FILL, 0.8);
  pen.dot(c.x, c.y, s * 0.17, '#8a7a2a', 0.9);
  pen.hair(closed(oval(c.x, c.y, s, s, 14)), 0.3, d.ink, 0.4);
}

/** A fallen leaf (autumn): a small pointed leaf in russet or gold, its midrib, a little shadow. */
export function fallenLeaf(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const a = rng() * TAU;
  const base = polar(c, a, -s / 2);
  const tip = polar(c, a, s / 2);
  const leaf = [...arc(base, tip, s * 0.3, 6), ...arc(tip, base, s * 0.3, 6).slice(1)];
  castShadow(d, leaf, 1.6, 0.15);
  body(d, leaf, ['#d3a24c', '#c4733f', '#a3743a', '#c98f46'][Math.floor(rng() * 4)]!, 0.8);
  pen.hair([base, tip], 0.35, mix('#7a4a22', d.ink, 0.3), 0.6);
  pen.hair(closed(leaf), 0.4, d.ink, 0.55);
}
