import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, TAU, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { HOLE, TIMBER, TIMBER_DARK } from './build';
import { blob, crisp, dab, flat, gleam, LIGHT, mix, paint, polar, SHADOW, soft } from './paintKit';

/**
 * Natural and loose things the sites share: rock crags, ore lumps, logs
 * with their end grain, a mine cart on its rails, crystals, cut gems and
 * glass flasks. Local units, light from the upper left.
 */
export const ROCK = '#7d7464';
export const GOLD = '#c99a2e';
export const GOLD_DEEP = '#7a5012';
export const BARK = '#4f3520';
export const END_GRAIN = '#a8844f';
export const ORE = '#5a5b60';
export const IRON = '#34353a';
export const CRYSTAL = '#a8302c';
export const GEM = '#2e7a4e';
export const MERCURY = '#a9aeb6';
export const SULFUR = '#b89a2e';

/** A rocky crag from x0 to x1 standing on `base`, peaking `h` high: a lit face, a hatched shadow face down from its ridge, cracks. */
export function crag(d: Draw, rng: Rng, x0: number, x1: number, base: number, h: number, color = ROCK, peakAt = 0.45): Pt[] {
  const n = 18;
  const bumps = [[peakAt, 1, 0.26], [peakAt - 0.24, 0.62, 0.24], [peakAt + 0.26, 0.58, 0.24]] as const;
  const prof = (t: number): number => Math.max(...bumps.map(([c, k, w]) => k * Math.exp(-(((t - c) / w) ** 2))));
  const tops = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const edgeFade = Math.min(1, Math.min(t, 1 - t) * 7);
    const jag = (rng() - 0.5) * h * 0.1 * edgeFade;
    return pt(x0 + (x1 - x0) * t + (rng() - 0.5) * 1.2 * edgeFade, base - Math.max(0, h * prof(t) * edgeFade + jag));
  });
  const shape = crisp([pt(x0 - 1, base + 1), ...tops, pt(x1 + 1, base + 1)], 2.5);
  paint(d, shape, color, { shadow: 0.6, hatch: 0, line: 0 });
  const { pen } = d;
  pen.clipped(shape, () => {
    // Each summit's far face, from its top down and right to the foot, darker and hatched.
    for (const [c] of bumps) {
      const i = Math.max(1, Math.min(n - 1, Math.round(c * n)));
      let j = i + 1;
      while (j < n && tops[j + 1]!.y >= tops[j]!.y) j++;
      const p = tops[i]!;
      const foot = pt(p.x + (x1 - x0) * 0.1, base + 2);
      const face = [...tops.slice(i, j + 1), pt(tops[j]!.x + 3, base + 2), foot];
      pen.fill(face, mix(color, SHADOW, 0.55), 0.5);
      pen.hatch(face, 1.4, 1.1, 0.3, { color: d.ink, alpha: 0.42 });
      pen.hair([p, pt(p.x + (foot.x - p.x) * 0.45 - 1, p.y + (foot.y - p.y) * 0.5), foot], 0.5, d.ink, 0.65);
    }
    // Ledges: a lit lip with a dark shelf of shadow under it.
    for (let k = 0; k < 7; k++) {
      const t = 0.12 + rng() * 0.76;
      const top = base - h * prof(t);
      const y = top + (base - top) * (0.25 + rng() * 0.6);
      const x = x0 + (x1 - x0) * t;
      const l = 3 + rng() * 5;
      pen.fill([pt(x - l, y), pt(x + l, y + 0.6), pt(x + l - 1, y + 2.2), pt(x - l + 1.5, y + 1.4)], mix(color, SHADOW, 0.6), 0.4);
      pen.hair([pt(x - l, y), pt(x + l, y + 0.6)], 0.45, d.ink, 0.6);
      pen.hair([pt(x - l + 0.5, y - 0.6), pt(x + l - 1, y - 0.2)], 0.5, PAPER_FILL, 0.45);
    }
    pen.stipple(shape, Math.round((x1 - x0) * h * 0.25), (_, y) => ((y - (base - h)) / h) * 0.7, 0.4, mix(color, SHADOW, 0.6));
    soft(pen.ctx, 1.5, () => pen.fill([pt(x0 - 2, base - 4), pt(x1 + 2, base - 4), pt(x1 + 2, base + 2), pt(x0 - 2, base + 2)], mix(color, SHADOW, 0.5), 0.25));
  });
  pen.stroke(closed(shape), 0.75, d.ink, 0.95);
  return shape;
}

/** A faceted lump (a stone, an ore nugget): its top facets lit, the far side dark. */
export function lump(d: Draw, rng: Rng, c: Pt, rx: number, ry: number, color: string, line = 0.55): Pt[] {
  const n = 7;
  const turn = rng() * TAU;
  const pts = Array.from({ length: n }, (_, i) => polar(c, turn + (i / n) * TAU + (rng() - 0.5) * 0.4, 1)).map((p) => pt(c.x + (p.x - c.x) * rx * (0.85 + rng() * 0.25), c.y + (p.y - c.y) * ry * (0.85 + rng() * 0.25)));
  paint(d, pts, color, { shadow: 0.7, hatch: 0.25, line });
  // The top facet, catching the light.
  const k = pt(c.x - rx * 0.15, c.y - ry * 0.2);
  const facet = [pt(k.x - rx * 0.55, k.y + ry * 0.05), pt(k.x - rx * 0.1, k.y - ry * 0.55), pt(k.x + rx * 0.45, k.y - ry * 0.2), pt(k.x + rx * 0.1, k.y + ry * 0.25)];
  d.pen.clipped(pts, () => d.pen.fill(facet, mix(color, LIGHT, 0.5), 0.45));
  d.pen.hair([facet[3]!, facet[0]!], 0.35, d.ink, 0.45);
  d.pen.hair([facet[2]!, facet[3]!], 0.35, d.ink, 0.45);
  return pts;
}

/** A log seen end-on from the front: bark round its side going back, the sawn end grain with its rings. */
export function logEnd(d: Draw, rng: Rng, c: Pt, r: number, len: number): void {
  const { pen } = d;
  const back = pt(c.x + len * 0.16, c.y - len * 0.6);
  const sideShape = [pt(c.x - r, c.y), pt(back.x - r, back.y), ...bezier(pt(back.x - r, back.y), pt(back.x, back.y - r * 1.3), pt(back.x + r, back.y), 6).slice(1), pt(c.x + r, c.y)];
  paint(d, sideShape, BARK, { shadow: 0.6, hatch: 0.3, line: 0.55 });
  pen.clipped(sideShape, () => {
    for (let i = 0; i < 5; i++) {
      const x = c.x - r + ((i + 0.5) / 5) * 2 * r;
      pen.hair([pt(x, c.y), pt(x + len * 0.16, c.y - len * 0.6)], 0.4, mix(BARK, SHADOW, 0.6), 0.6);
    }
  });
  const end = oval(c.x, c.y, r, r * 0.95, 20);
  paint(d, end, END_GRAIN, { shadow: 0.35, hatch: 0, line: 0 });
  for (const k of [0.75, 0.5, 0.25]) pen.hair(closed(oval(c.x + (rng() - 0.5) * 0.4, c.y + (rng() - 0.5) * 0.4, r * k, r * k * 0.95, 14)), 0.35, mix(END_GRAIN, BARK, 0.6), 0.75);
  pen.hair([c, pt(c.x + r * 0.6, c.y - r * 0.3)], 0.35, mix(END_GRAIN, SHADOW, 0.5), 0.6);
  pen.stroke(closed(oval(c.x, c.y, r + 0.3, r * 0.95 + 0.3, 20)), 0.75, BARK, 1);
  pen.stroke(closed(end), 0.55, d.ink, 0.9);
}

/** A stack of logs seen end-on: rows from the bottom, each a little shorter. */
export function logStack(d: Draw, rng: Rng, c: Pt, r: number, rows: readonly number[], len: number): void {
  for (let row = 0; row < rows.length; row++) {
    const n = rows[row]!;
    for (let i = 0; i < n; i++) {
      const x = c.x + (i - (n - 1) / 2) * r * 2 + row * 0.3;
      logEnd(d, rng, pt(x, c.y - r - row * r * 1.7), r * (0.9 + rng() * 0.15), len);
    }
  }
}

/** Two rails on sleepers from `a` (front) back to `b`. */
export function rails(d: Draw, a: Pt, b: Pt, gauge: number): void {
  const { pen } = d;
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    const w = gauge * (1 - t * 0.25) * 0.75;
    const tie = crisp([pt(p.x - w, p.y - 0.7), pt(p.x + w, p.y - 0.7), pt(p.x + w, p.y + 0.7), pt(p.x - w, p.y + 0.7)], 2);
    pen.fill(tie, TIMBER, 0.9);
    pen.stroke(closed(tie), 0.4, d.ink, 0.8);
  }
  for (const s of [-1, 1]) pen.stroke([pt(a.x + s * gauge * 0.5, a.y), pt(b.x + s * gauge * 0.38, b.y)], 0.7, IRON, 0.95, false);
}

/** A mine cart with `bottom` at its wheels' foot: a riveted wooden tub, iron wheels, heaped with `load`. */
export function cart(d: Draw, rng: Rng, bottom: Pt, w: number, load: string, lumpy = true): void {
  const { pen } = d;
  const h = w * 0.5;
  const top = bottom.y - h - 2;
  // The heap first, so the tub's rim cuts across it.
  for (let i = 0; i < 6; i++) lump(d, rng, pt(bottom.x - w * 0.35 + (i / 5) * w * 0.7, top + 1 - Math.sin((i / 5) * Math.PI) * 3 - rng() * 1.5), lumpy ? 2.6 : 2, lumpy ? 2.2 : 1.6, mix(load, PAPER_FILL, rng() * 0.15), 0.4);
  const rim = crisp([pt(bottom.x - w / 2 - 1, top), pt(bottom.x + w / 2 + 1, top), pt(bottom.x + w / 2 - 1, bottom.y - 2.5), pt(bottom.x - w / 2 + 1, bottom.y - 2.5)], 2);
  flat(d, rim, TIMBER, { tone: 0.05, line: 0.6 });
  pen.clipped(rim, () => {
    for (let x = bottom.x - w / 2 + 3; x < bottom.x + w / 2; x += 3) pen.hair([pt(x, top), pt(x, bottom.y - 2.5)], 0.35, TIMBER_DARK, 0.6);
    for (const y of [top + 1, bottom.y - 3.5]) pen.stroke([pt(bottom.x - w / 2, y), pt(bottom.x + w / 2, y)], 1.1, IRON, 0.95, false);
  });
  for (const x of [bottom.x - w * 0.3, bottom.x + w * 0.3]) {
    const wh = oval(x, bottom.y - 1.6, 1.9, 1.9, 12);
    paint(d, wh, IRON, { shadow: 0.5, hatch: 0, line: 0.5 });
    pen.dot(x, bottom.y - 1.6, 0.5, '#9a9aa4', 1);
  }
}

/** A crystal: a six-sided prism from `root` along `ang`, its lit facet pale, its far facet deep, a pointed tip. */
export function prism(d: Draw, root: Pt, ang: number, len: number, w: number, color = CRYSTAL, line = 0.55): void {
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const n = pt(-dir.y, dir.x);
  const at = (s: number, t: number): Pt => pt(root.x + dir.x * s + n.x * t, root.y + dir.y * s + n.y * t);
  const shoulder = len - w * 0.9;
  const shape = [at(0, -w / 2), at(shoulder, -w / 2), at(len, 0), at(shoulder, w / 2), at(0, w / 2)];
  paint(d, shape, color, { shadow: 0.3, hatch: 0, line: 0, gloss: true });
  const litSide = n.x * -0.55 + n.y * -0.84 > 0 ? -1 : 1;
  const far = [at(0, -litSide * w * 0.08), at(shoulder, -litSide * w * 0.08), at(len, 0), at(shoulder, -litSide * w / 2), at(0, -litSide * w / 2)];
  d.pen.fill(far, mix(color, SHADOW, 0.55), 0.6);
  const lit = [at(0, litSide * w * 0.18), at(shoulder, litSide * w * 0.18), at(len, 0), at(shoulder, litSide * w / 2), at(0, litSide * w / 2)];
  d.pen.fill(lit, mix(color, LIGHT, 0.6), 0.5);
  d.pen.hair([at(0, -litSide * w * 0.08), at(shoulder, -litSide * w * 0.08), at(len, 0)], 0.4, d.ink, 0.7);
  d.pen.hair([at(0, litSide * w * 0.18), at(shoulder, litSide * w * 0.18), at(len, 0)], 0.35, d.ink, 0.5);
  gleam(d, [at(len * 0.15, litSide * w * 0.34), at(shoulder * 0.85, litSide * w * 0.34)], Math.max(0.4, w * 0.12), 0.8);
  d.pen.stroke(closed(crisp(shape, 2)), line, d.ink, 0.95);
}

/** A cluster of crystals splaying up from `root`, `size` the tallest. */
export function cluster(d: Draw, rng: Rng, root: Pt, size: number, color = CRYSTAL, line = 0.55): void {
  const spec = [[-0.95, 0.55], [0.75, 0.6], [-0.35, 0.85], [0.3, 1], [-0.05, 0.7]] as const;
  for (const [tilt, k] of spec) {
    const ang = -Math.PI / 2 + tilt * 0.75 + (rng() - 0.5) * 0.15;
    prism(d, pt(root.x + tilt * size * 0.18, root.y), ang, size * k, size * 0.24 * (0.8 + k * 0.3), mix(color, rng() < 0.5 ? LIGHT : SHADOW, rng() * 0.15), line);
  }
}

/** A cut gem seen from the front: the table across the top, crown facets, the pavilion drawn to a point. */
export function gem(d: Draw, c: Pt, r: number, color = GEM, line = 0.55): void {
  const { pen } = d;
  const t = c.y - r * 0.55;
  const g = c.y - r * 0.15;
  const bot = pt(c.x, c.y + r * 0.85);
  const outline = [pt(c.x - r * 0.5, t), pt(c.x + r * 0.5, t), pt(c.x + r, g), bot, pt(c.x - r, g)];
  paint(d, outline, color, { shadow: 0.35, hatch: 0, line: 0, gloss: true });
  pen.fill([pt(c.x - r * 0.5, t), pt(c.x + r * 0.5, t), pt(c.x + r * 0.25, g), pt(c.x - r * 0.25, g)], mix(color, LIGHT, 0.55), 0.6);
  pen.fill([pt(c.x + r * 0.25, g), pt(c.x + r, g), bot], mix(color, SHADOW, 0.55), 0.6);
  pen.fill([pt(c.x - r, g), pt(c.x - r * 0.25, g), bot], mix(color, LIGHT, 0.3), 0.4);
  for (const p of [pt(c.x - r * 0.25, g), pt(c.x + r * 0.25, g)]) pen.hair([pt(p.x + (p.x - c.x) * 1.0, t), p, bot], 0.35, d.ink, 0.6);
  pen.hair([pt(c.x - r, g), pt(c.x + r, g)], 0.35, d.ink, 0.6);
  pen.dot(c.x - r * 0.25, t + r * 0.15, Math.max(0.35, r * 0.12), PAPER_FILL, 0.95);
  pen.stroke(closed(crisp(outline, 1.5)), line, d.ink, 0.95);
}

/** A round glass flask standing on `foot`: silver mercury in its belly, a long neck, a cork. */
export function flask(d: Draw, foot: Pt, r: number, liquid = MERCURY, line = 0.55): void {
  const { pen } = d;
  const c = pt(foot.x, foot.y - r);
  const nw = r * 0.32;
  const neckTop = c.y - r * 1.9;
  const alpha = Math.acos(Math.min(0.95, nw / r));
  const arc = Array.from({ length: 25 }, (_, i) => {
    const th = -alpha + (i / 24) * (Math.PI + 2 * alpha);
    return pt(c.x + r * Math.cos(th), c.y + r * Math.sin(th));
  });
  const glass = [pt(c.x + nw, neckTop), ...arc, pt(c.x - nw, neckTop)];
  paint(d, glass, '#b9cbd6', { shadow: 0.25, hatch: 0, line: 0, alpha: 0.55, gloss: true });
  const fill = oval(c.x, c.y, r * 0.86, r * 0.86, 22).filter((p) => p.y > c.y - r * 0.15);
  paint(d, fill, liquid, { shadow: 0.55, hatch: 0, line: 0.35, gloss: true });
  gleam(d, [pt(c.x - r * 0.5, c.y + r * 0.2), pt(c.x - r * 0.2, c.y + r * 0.55)], Math.max(0.5, r * 0.18), 0.9);
  gleam(d, bezier(pt(c.x - r * 0.75, c.y - r * 0.05), pt(c.x - r * 0.7, c.y - r * 0.6), pt(c.x - r * 0.25, c.y - r * 0.8), 6), Math.max(0.4, r * 0.12), 0.8);
  const cork = crisp([pt(c.x - nw * 1.1, neckTop - r * 0.45), pt(c.x + nw * 1.1, neckTop - r * 0.45), pt(c.x + nw, neckTop + 0.3), pt(c.x - nw, neckTop + 0.3)], 1);
  paint(d, cork, '#a8794a', { shadow: 0.4, hatch: 0, line: 0.45 });
  pen.stroke(glass, line, d.ink, 0.95, false);
  pen.stroke([glass[glass.length - 1]!, glass[0]!], line * 0.6, d.ink, 0.6, false);
}

/** A dark opening in rock or earth (a mine's adit, a cave), its rim shaded inward. */
export function mouth(d: Draw, rng: Rng, c: Pt, w: number, h: number): Pt[] {
  const shape = [pt(c.x - w / 2, c.y), ...bezier(pt(c.x - w / 2, c.y), pt(c.x - w * 0.55, c.y - h * 1.25), pt(c.x + w * 0.1, c.y - h), 8).slice(1), ...bezier(pt(c.x + w * 0.1, c.y - h), pt(c.x + w * 0.6, c.y - h * 0.9), pt(c.x + w / 2, c.y), 8).slice(1)];
  d.pen.fill(shape, HOLE, 0.95);
  d.pen.clipped(shape, () => dab(d, blob(pt(c.x - w * 0.3, c.y - h * 0.5), w * 0.3, h * 0.7, rng), mix(HOLE, LIGHT, 0.2), 0.5, 1));
  d.pen.stroke(shape, 0.8, d.ink, 0.95, false);
  return shape;
}
