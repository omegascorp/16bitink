import type { Rng } from '../logic/rng';
import { arc, body, castShadow, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * The meadow's wildflowers and butterflies seen from above, each a little
 * watercolour with a pen contour: ox-eye daisy, poppy, cornflower,
 * buttercup, red clover, knapweed and cow parsley umbels, and butterflies
 * resting wings-open on them. Board coordinates; each takes the rng it
 * draws its variety from.
 */
export type Bloom = 'daisy' | 'poppy' | 'cornflower' | 'buttercup' | 'clover' | 'knapweed' | 'umbel';
export const BLOOMS: readonly Bloom[] = ['daisy', 'poppy', 'cornflower', 'buttercup', 'clover', 'knapweed', 'umbel'];

const DAISY_HEART = '#e6b22a';
const POPPY = '#d8402c';
const POPPY_DEEP = '#8f2219';
const CORNFLOWER = '#4f78c8';
const CORNFLOWER_DEEP = '#2b4688';
const BUTTERCUP = '#f2c62a';
const CLOVER = '#cf7fa3';
const CLOVER_DEEP = '#934468';
const KNAPWEED = '#9b5ea8';
const KNAP_BRACT = '#6b5a3a';
const UMBEL = '#fbf7ea';
export const LEAFY = '#6a9346';
const LEAFY_DEEP = '#3e6236';

/** A few leaves round a flower's foot, under it: a rosette of narrow blades. */
function foliage(d: Draw, c: Pt, size: number, rng: Rng, n = 3): void {
  const { pen } = d;
  for (let k = 0; k < n; k++) {
    const a = rng() * TAU;
    const tip = polar(c, a, size * (1.3 + rng() * 0.8));
    const base = polar(c, a, size * 0.3);
    const blade = [...arc(base, tip, size * 0.22, 5), ...arc(tip, base, size * 0.22, 5).slice(1)];
    pen.fill(blade, mix(LEAFY, LEAFY_DEEP, rng() * 0.5), 0.6);
    pen.hair(closed(blade), 0.35, d.ink, 0.35);
  }
}

/** Ox-eye daisy: a ring of white rays round a domed yellow heart. */
function daisy(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  const n = 14 + Math.floor(rng() * 5);
  pen.fill(oval(c.x + SHADOW.x * 1.6, c.y + SHADOW.y * 1.6, s, s, 14), d.ink, 0.12);
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * TAU + (rng() - 0.5) * 0.12;
    pen.hair([polar(c, a, s * 0.3), polar(c, a, s * (0.92 + rng() * 0.12))], s * 0.32, PAPER_FILL, 1);
  }
  pen.hair(closed(oval(c.x, c.y, s * 1.02, s * 1.02, 16)), 0.35, d.ink, 0.3);
  pen.fill(oval(c.x, c.y, s * 0.33, s * 0.33, 10), DAISY_HEART, 1);
  pen.fill(oval(c.x + s * 0.08, c.y + s * 0.1, s * 0.22, s * 0.2, 8), '#b07f14', 0.45);
  pen.hair(closed(oval(c.x, c.y, s * 0.33, s * 0.33, 10)), 0.4, d.ink, 0.6);
}

/** Poppy: four round, crumpled scarlet petals overlapping in a cup, dark blotches at their bases, the seed-head in the middle. */
function poppy(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  const petals = [0, 2, 1, 3].map((k) => {
    const a = turn + (k * Math.PI) / 2 + (rng() - 0.5) * 0.25;
    const pc = polar(c, a, s * 0.45);
    return { a, pc, shape: Array.from({ length: 16 }, (_, i) => polar(pc, (i / 16) * TAU, s * (0.62 + 0.04 * Math.sin(i * 2.3 + k)))) };
  });
  castShadow(d, oval(c.x, c.y, s * 1.05, s * 1.05, 16), 2, 0.14);
  for (const { a, pc, shape } of petals) {
    body(d, shape, POPPY, 0.85);
    pen.clipped(shape, () => {
      pen.fill(oval(c.x, c.y, s * 0.42, s * 0.42, 12), '#2a1d22', 0.5);
      for (let k = 0; k < 3; k++) pen.hair([polar(c, a + (k - 1) * 0.35, s * 0.3), polar(pc, a + (k - 1) * 0.5, s * 0.55)], 0.35, POPPY_DEEP, 0.45);
      pen.fill(oval(pc.x - s * 0.12, pc.y - s * 0.16, s * 0.28, s * 0.2, 10), '#f58a5c', 0.4);
    });
    pen.crescent(shape, pt(-SHADOW.x * s * 0.25, -SHADOW.y * s * 0.25), () => pen.fill(shape, POPPY_DEEP, 0.3));
    pen.hair(closed(shape), 0.5, d.ink, 0.6);
  }
  pen.fill(oval(c.x, c.y, s * 0.2, s * 0.2, 10), '#8fa06a', 0.95);
  for (let k = 0; k < 6; k++) pen.hair([c, polar(c, (k / 6) * TAU + turn, s * 0.2)], 0.3, '#2a1d22', 0.8);
  for (let k = 0; k < 10; k++) pen.dot(polar(c, (k / 10) * TAU, s * 0.3).x, polar(c, (k / 10) * TAU, s * 0.3).y, 0.4, '#2a1d22', 0.8);
}

/** Cornflower: a ragged ring of frilled blue florets round a darker middle. */
function cornflower(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const n = 8;
  const turn = rng() * TAU;
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * TAU;
    const tip = polar(c, a, s);
    pen.hair([polar(c, a, s * 0.3), tip], s * 0.42, CORNFLOWER, 0.9);
    for (const f of [-0.35, 0, 0.35]) pen.hair([tip, polar(tip, a + f, s * 0.22)], 0.6, CORNFLOWER_DEEP, 0.7);
  }
  pen.fill(oval(c.x, c.y, s * 0.36, s * 0.36, 10), CORNFLOWER_DEEP, 0.9);
  pen.stipple(oval(c.x, c.y, s * 0.34, s * 0.34, 10), 8, () => 0.8, 0.35, '#d8ddf4');
}

/** Buttercup: five glossy round petals with a lit glint. */
function buttercup(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  for (let k = 0; k < 5; k++) {
    const pc = polar(c, turn + (k / 5) * TAU, s * 0.5);
    const petal = oval(pc.x, pc.y, s * 0.52, s * 0.52, 10);
    pen.fill(petal, BUTTERCUP, 0.95);
    pen.hair(closed(petal).slice(2, 9), 0.35, '#9a7a14', 0.6);
  }
  pen.dot(c.x - s * 0.35, c.y - s * 0.35, s * 0.18, PAPER_FILL, 0.8);
  pen.dot(c.x, c.y, s * 0.18, '#8a7a2a', 0.9);
  pen.hair(closed(oval(c.x, c.y, s, s, 14)), 0.35, d.ink, 0.4);
}

/** Red clover: a round head of pink florets over its trefoil leaves. */
function clover(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < 3; k++) {
    const a = rng() * TAU;
    const base = polar(c, a, s * 1.1);
    for (let l = 0; l < 3; l++) {
      const lc = polar(base, a + (l - 1) * 2.1, s * 0.42);
      const leaf = oval(lc.x, lc.y, s * 0.42, s * 0.42, 10);
      pen.fill(leaf, LEAFY, 0.6);
      pen.hair(closed(oval(lc.x, lc.y, s * 0.22, s * 0.16, 8)), 0.35, PAPER_FILL, 0.5);
    }
  }
  const head = oval(c.x, c.y, s * 0.7, s * 0.7, 14);
  castShadow(d, head, 1.5, 0.15);
  pen.fill(head, CLOVER, 0.9);
  pen.clipped(head, () => {
    for (let k = 0; k < 12; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * s * 0.6);
      pen.hair([p, polar(p, rng() * TAU, s * 0.25)], 0.5, rng() < 0.5 ? CLOVER_DEEP : '#f0c2d6', 0.7);
    }
  });
  pen.crescent(head, pt(-SHADOW.x * s * 0.3, -SHADOW.y * s * 0.3), () => pen.fill(head, CLOVER_DEEP, 0.3));
  pen.hair(closed(head), 0.4, d.ink, 0.55);
}

/** Knapweed: a shaggy purple brush on a knobbly bract cup. */
function knapweed(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(oval(c.x + SHADOW.x, c.y + SHADOW.y, s * 0.45, s * 0.45, 10), KNAP_BRACT, 0.7);
  for (let k = 0; k < 16; k++) {
    const a = rng() * TAU;
    const tip = polar(c, a, s * (0.6 + rng() * 0.45));
    pen.hair([polar(c, a, s * 0.15), tip], 0.9, mix(KNAPWEED, '#c69ad0', rng() * 0.5), 0.9);
  }
  pen.dot(c.x, c.y, s * 0.18, mix(KNAPWEED, d.ink, 0.4), 0.8);
}

/** Cow parsley: a flat lacy umbel of little rings of florets on fine rays. */
function umbel(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const n = 7 + Math.floor(rng() * 4);
  const heads = Array.from({ length: n }, (_, k) => polar(c, (k / n) * TAU + rng() * 0.4, s * (0.45 + rng() * 0.45)));
  heads.push(polar(c, rng() * TAU, s * 0.12));
  for (const h of heads) pen.hair([c, h], 0.35, '#6f7f48', 0.55);
  for (const h of heads) {
    const r = s * (0.17 + rng() * 0.05);
    pen.fill(oval(h.x + SHADOW.x * 1.4, h.y + SHADOW.y * 1.4, r, r, 10), d.ink, 0.08);
    pen.dot(h.x, h.y, r * 0.35, '#a8b47a', 0.7);
    const m = 7;
    for (let j = 0; j < m; j++) {
      const f = polar(h, (j / m) * TAU + rng() * 0.3, r * (0.7 + rng() * 0.3));
      pen.dot(f.x, f.y, 0.55 + rng() * 0.25, UMBEL, 1);
    }
    for (let j = 0; j < 2; j++) {
      const f = polar(h, rng() * TAU, r * 0.3);
      pen.dot(f.x, f.y, 0.5, UMBEL, 0.95);
    }
  }
}

/** One wildflower of `kind`, about `size` across its radius, with a few of its leaves. */
export function bloom(d: Draw, kind: Bloom, c: Pt, size: number, rng: Rng, leaves = true): void {
  if (leaves && kind !== 'clover' && kind !== 'umbel') foliage(d, c, size, rng, 2 + Math.floor(rng() * 2));
  if (kind === 'daisy') daisy(d, c, size, rng);
  else if (kind === 'poppy') poppy(d, c, size, rng);
  else if (kind === 'cornflower') cornflower(d, c, size, rng);
  else if (kind === 'buttercup') buttercup(d, c, size * 0.75, rng);
  else if (kind === 'clover') clover(d, c, size * 0.8, rng);
  else if (kind === 'knapweed') knapweed(d, c, size * 0.9, rng);
  else umbel(d, c, size * 1.7, rng);
}

/** How big each kind is drawn, as a radius. */
export const BLOOM_SIZE: Readonly<Record<Bloom, number>> = {
  daisy: 6.5,
  poppy: 7,
  cornflower: 5.5,
  buttercup: 4.5,
  clover: 5.5,
  knapweed: 5.5,
  umbel: 7,
};

/** A butterfly's livery: fore and hind wing colours, the dark of its margins, and whether it has eye-spots. */
interface Livery {
  readonly fore: string;
  readonly hind: string;
  readonly edge: string;
  readonly eyes: boolean;
}
const LIVERIES: readonly Livery[] = [
  { fore: '#e08a2e', hind: '#d8742a', edge: '#3a2a26', eyes: false },
  { fore: '#7aa0e0', hind: '#8aaee6', edge: '#3d4a6a', eyes: false },
  { fore: '#f1e07a', hind: '#e8d36a', edge: '#a28a2a', eyes: false },
  { fore: '#b8442e', hind: '#a23a2c', edge: '#2e2224', eyes: true },
];

/**
 * A butterfly resting wings-open, seen from above, centred at c with its
 * head towards `a`, `span` across: four washed wings with darker margins
 * and veins, spots, a slender body and clubbed antennae.
 */
export function butterfly(d: Draw, c: Pt, a: number, span: number, rng: Rng): void {
  const { pen } = d;
  const lv = LIVERIES[Math.floor(rng() * LIVERIES.length)]!;
  const fwd = pt(Math.cos(a), Math.sin(a));
  const side = pt(-fwd.y, fwd.x);
  const at = (f: number, s: number): Pt => pt(c.x + fwd.x * f * span + side.x * s * span, c.y + fwd.y * f * span + side.y * s * span);
  const wings: Pt[][] = [];
  for (const s of [1, -1]) {
    const fore = [at(0.08, 0), at(0.28, s * 0.22), at(0.3, s * 0.48), at(0.12, s * 0.52), at(-0.02, s * 0.36), at(-0.03, s * 0.04)];
    const hind = [at(-0.02, s * 0.03), at(-0.02, s * 0.34), at(-0.18, s * 0.42), at(-0.32, s * 0.3), at(-0.3, s * 0.1), at(-0.12, 0)];
    wings.push(smoothLoop(hind), smoothLoop(fore));
  }
  for (const w of wings) castShadow(d, w, 3, 0.12);
  wings.forEach((w, i) => {
    const isFore = i % 2 === 1;
    body(d, w, isFore ? lv.fore : lv.hind, 0.85);
    pen.clipped(w, () => {
      const s = i < 2 ? 1 : -1;
      // Dark margins and veins fanning from the root.
      const root = at(0, s * 0.03);
      for (let k = 0; k < 5; k++) {
        const tip = isFore ? at(0.3 - k * 0.08, s * (0.25 + k * 0.06)) : at(-0.04 - k * 0.07, s * (0.36 - k * 0.04));
        pen.hair([root, tip], 0.35, lv.edge, 0.55);
      }
      pen.hair(closed(w), span * 0.07, lv.edge, 0.8);
      if (isFore) pen.dot(at(0.15, s * 0.3).x, at(0.15, s * 0.3).y, span * 0.035, lv.edge, 0.85);
      if (lv.eyes) {
        const e = isFore ? at(0.2, s * 0.4) : at(-0.2, s * 0.3);
        pen.dot(e.x, e.y, span * 0.07, '#2c3a6a', 0.9);
        pen.dot(e.x, e.y, span * 0.04, '#f2d27a', 0.95);
      } else if (isFore) {
        for (let k = 0; k < 3; k++) pen.dot(at(0.26 - k * 0.07, s * (0.45 - k * 0.02)).x, at(0.26 - k * 0.07, s * (0.45 - k * 0.02)).y, span * 0.022, PAPER_FILL, 0.85);
      }
    });
    pen.hair(closed(w), 0.5, d.ink, 0.85);
  });
  // The body and antennae.
  pen.stroke([at(0.14, 0), at(0.02, 0), at(-0.24, 0)], span * 0.07, '#2a2430', 0.95, false);
  for (const s of [1, -1]) {
    const tip = at(0.34, s * 0.12);
    pen.hair([at(0.14, s * 0.01), at(0.25, s * 0.05), tip], 0.4, d.ink, 0.9);
    pen.dot(tip.x, tip.y, 0.7, d.ink, 0.9);
  }
}

/** A closed outline through a few control points, rounded (Chaikin twice). */
function smoothLoop(poly: readonly Pt[]): Pt[] {
  let out = [...poly];
  for (let r = 0; r < 2; r++) {
    out = out.flatMap((p, i) => {
      const q = out[(i + 1) % out.length]!;
      return [pt(p.x * 0.75 + q.x * 0.25, p.y * 0.75 + q.y * 0.25), pt(p.x * 0.25 + q.x * 0.75, p.y * 0.25 + q.y * 0.75)];
    });
  }
  return out;
}
