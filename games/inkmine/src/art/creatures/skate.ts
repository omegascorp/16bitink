import { createRng, type Rng } from '../../logic/rng';
import { cub, oval, pt, ribbon, type Draw } from '../kit';
import { dab, gleam, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { sporeCloud } from './flesh';

/**
 * The sand skate (a burrower, hostile, inked in red): a flat ray-shaped
 * animal that swims just under the salt crust of Talus's flats, as a
 * sandfish skink "swims" through dune sand on Earth and a ray lies buried
 * on the seabed with only its eyes showing. All that gives it away is a low
 * bulge in the crust, two eyes peeping through and the tip of the thorny
 * ridge along its back. When something walks over it, it strikes straight
 * up out of the ground on its tail, mouth first, in a spray of sand and
 * crust chips, its broad pectoral wings rippling as a ray's do: we see its
 * pale underside, which is where a ray carries its mouth, its nostrils and
 * the five pairs of gill slits. Talus's dried seas were once a ray's
 * seabed; this is what stayed when the water went.
 * Origin at the middle of the ground line over it (y = 0, the crust's
 * surface); at reach `r` its snout is r × SKATE_REACH above the ground.
 */
export const SKATE_ART = { w: 44, h: 62, ox: 22, oy: 58 } as const;
/** Px of its full strike above the ground. */
export const SKATE_REACH = 51.2;
/** How far up it's drawn, in baked steps (its reach, 0..1, rounded to the nearest). */
export const SKATE_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

const SALT = '#f4eee3';
const SALT_SHADE = '#c9b9a6';
const SOIL = '#c98f66';
const SOIL_DARK = '#8a5a40';
const BACK = '#c49a74';
const SPOT = '#7a5238';
const BELLY = '#f3e4d6';
const BLUSH = '#dfae9c';
const THORN = '#6e3f2c';
const MOUTH = '#3a1c22';
const IRIS = '#d6b25a';

/** The disc's size, ventral side to us: its half-span and length, and where the wingtips sit along it. */
const SPAN = 20.5;
const DISC = 27;
const TIP_AT = 15;

/** The right edge of the disc, snout to the root of the tail, its wing rippling: a wave running back along it, phase `ph`. */
function edge(ph: number, ripple: number): Pt[] {
  // A skate's pointed snout, the leading edge sweeping out to a pointed wingtip, the trailing edge curving back in to the tail.
  const front = cub(pt(0, 0), pt(2.4, 2.8), pt(11.5, 5.4), pt(SPAN, TIP_AT), 12);
  const rear = cub(pt(SPAN, TIP_AT), pt(15.5, 17.6), pt(9.5, 21.5), pt(5.2, DISC), 10).slice(1);
  const pts = [...front, ...rear];
  return pts.map((p, i) => {
    const u = i / (pts.length - 1);
    const wave = Math.sin(u * Math.PI * 2.4 - ph) * ripple * Math.sin(Math.PI * Math.min(1, u * 1.15));
    return pt(p.x + wave * 0.5, p.y - wave);
  });
}

/** The whole disc's outline in its own frame (snout at the origin), both wings rippling a little out of step. */
function discShape(ph: number, ripple: number): { right: Pt[]; left: Pt[]; shape: Pt[] } {
  const right = edge(ph, ripple);
  const left = edge(ph + 1.3, ripple).map((p) => pt(-p.x, p.y));
  return { right, left, shape: [...right, ...[...left].reverse().slice(1, -1)] };
}

/** Points in the disc's frame, set with its snout at `top`. */
const up = (pts: readonly Pt[], top: number): Pt[] => pts.map((p) => pt(p.x, p.y + top));

/** The tail and pelvic fins below the disc, down into the ground: a thick tapering stalk it stands on, thorned along its edge. */
function tail(d: Draw, top: number): void {
  // It stands on its tail, bent a little under the strain.
  const sway = d.f - 1;
  const spine = [pt(0, top + DISC - 3), pt(1.2 + sway * 0.4, top + DISC + 9), pt(-0.8 - sway * 0.3, top + DISC + 20), pt(0.4, top + DISC + 34)];
  const t = ribbon(spine, (u) => 5.4 - 2.6 * u);
  // The pelvic fins: two rounded lobes either side of the tail's root, as a skate's are.
  for (const s of [-1, 1]) {
    const fin = [pt(s * 2.2, top + DISC - 3), ...cub(pt(s * 4.6, top + DISC - 2.6), pt(s * 6.6, top + DISC - 0.6), pt(s * 6.4, top + DISC + 2.6), pt(s * 2.4, top + DISC + 4.4), 8)];
    paint(d, fin, mix(BELLY, BLUSH, 0.5), { alpha: 1, shadow: 0.5, hatch: 0, line: 0.5 });
    for (let k = 0; k < 3; k++) d.pen.hair([pt(s * 2.8, top + DISC - 1.5 + k * 1.6), pt(s * (5.6 - k * 0.6), top + DISC - 1 + k * 1.9)], 0.25, mix(BLUSH, SHADOW, 0.3), 0.55);
  }
  paint(d, t.shape, mix(BELLY, BLUSH, 0.25), { alpha: 1, shadow: 0.6, hatch: 0.18, line: 0.7 });
  // Thorns along the tail's edges, the skate's armour.
  for (let k = 1; k < t.top.length - 1; k++) {
    for (const [p, s] of [[t.top[k]!, 1], [t.bot[k]!, -1]] as const) d.pen.hair([p, pt(p.x - s * 1.2, p.y - 1.3)], 0.45, THORN, 0.8);
  }
}

/** Where a wing curls back towards us at its edge, its sandy, speckled back shows: a band along the outer wing, with the fold drawn in. */
function curl(d: Draw, rim: readonly Pt[], side: 1 | -1, shape: readonly Pt[]): void {
  const from = Math.round(rim.length * 0.36);
  const to = Math.round(rim.length * 0.7);
  const run = rim.slice(from, to);
  const fold = run.map((p, i) => {
    const k = Math.sin((Math.PI * i) / (run.length - 1));
    return pt(p.x - side * (0.5 + 1.8 * k), p.y + 0.3 + 0.9 * k);
  });
  const band = [...run, ...[...fold].reverse()];
  d.pen.clipped(shape, () => {
    paint(d, band, BACK, { alpha: 1, shadow: 0.35, hatch: 0, line: 0 });
    d.pen.stipple(band, 30, () => 0.7, 0.35, SPOT);
  });
  d.pen.hair(fold, 0.45, mix(BACK, SHADOW, 0.5), 0.8);
}

/** The face on the underside: two nostrils with their flaps, the mouth gaping with rows of pale tooth plates, five pairs of gill slits. */
function face(d: Draw, top: number, gape: number): void {
  // The nostrils: slots slanting in towards the mouth, the nasal curtain hanging between them.
  for (const s of [-1, 1]) {
    const n = [pt(s * 4.2, top + 4.4), pt(s * 3, top + 5.2), pt(s * 1.8, top + 6.2)];
    d.pen.stroke(n, 0.9, MOUTH, 0.85, false);
    d.pen.hair(n.map((p) => pt(p.x, p.y + 0.6)), 0.3, PAPER_FILL, 0.55);
  }
  const my = top + 8.6;
  const mw = 5.4 + gape * 0.6;
  const mh = 1 + gape * 2.6;
  const upper = cub(pt(-mw, my), pt(-mw * 0.5, my - mh * 0.7), pt(mw * 0.5, my - mh * 0.7), pt(mw, my), 12);
  const lower = cub(pt(mw, my), pt(mw * 0.55, my + mh * 1.3), pt(-mw * 0.55, my + mh * 1.3), pt(-mw, my), 12);
  const mouth = [...upper, ...lower.slice(1, -1)];
  paint(d, mouth, MOUTH, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.75 });
  d.pen.clipped(mouth, () => dab(d, oval(0, my + mh * 0.4, mw * 0.5, mh * 0.5, 12), '#12080a', 0.9, 0.6));
  // Teeth: rows of small hooked cusps along each jaw, pointing into the throat (a skate's teeth are sharp, for gripping).
  const teeth = (jaw: readonly Pt[], dir: 1 | -1): void => {
    for (let k = 2; k < jaw.length - 2; k++) {
      const p = jaw[k]!;
      const h = 0.6 + gape * 0.45;
      d.pen.fill([pt(p.x - 0.42, p.y), pt(p.x, p.y + dir * h), pt(p.x + 0.42, p.y)], '#f1e6d2', 0.95);
    }
  };
  teeth(upper, 1);
  teeth(lower, -1);
  d.pen.hair(upper.map((p) => pt(p.x, p.y - 0.8)), 0.4, mix(BELLY, PAPER_FILL, 0.5), 0.8);
  for (let k = 0; k < 5; k++) {
    const y = top + 12 + k * 2.1;
    for (const s of [-1, 1]) {
      const x = s * (4.6 + k * 0.25);
      const slit = [pt(x - s * 0.9, y - 0.3), pt(x, y + 0.3), pt(x + s * 1.1, y - 0.1)];
      d.pen.stroke(slit, 0.75, mix(MOUTH, BLUSH, 0.25), 0.9, false);
      d.pen.hair(slit.map((p) => pt(p.x, p.y + 0.6)), 0.3, PAPER_FILL, 0.6);
    }
  }
}

/** The disc, ventral side to us: pale, blushing towards its rim, the belly's midline and pores, the curled wing edges, then its face. */
function disc(d: Draw, top: number, r: number): void {
  const ph = d.f * 2.1 + r * 3;
  const ripple = 0.9 + r * 1.2;
  const ds = discShape(ph, ripple);
  const shape = up(ds.shape, top);
  paint(d, shape, BELLY, { alpha: 1, shadow: 0.55, hatch: 0.16, line: 0.85 });
  d.pen.clipped(shape, () => {
    // The rim blushes where the skin thins over the wing's rays.
    const inner = up(discShape(ph, ripple).shape.map((p) => pt(p.x * 0.62, p.y * 0.86 + 2)), top);
    d.pen.ctx.save();
    d.pen.ctx.globalCompositeOperation = 'source-atop';
    dab(d, shape, BLUSH, 0.45, 1.5);
    dab(d, inner, BELLY, 0.85, 2.4);
    d.pen.ctx.restore();
    // The wing's fin rays, fanning out under the skin.
    for (let k = 0; k < 7; k++) {
      for (const s of [-1, 1]) {
        const a = pt(s * 4, top + 9 + k * 2.4);
        const b = pt(s * (SPAN - 2 - Math.abs(k - 2.5) * 1.6), top + 6 + k * 3.4);
        d.pen.hair([a, b], 0.3, mix(BLUSH, SHADOW, 0.25), 0.35);
      }
    }
    d.pen.hair([pt(0, top + 11), pt(0.2, top + 20), pt(0, top + DISC)], 0.4, mix(BELLY, SHADOW, 0.3), 0.5);
    d.pen.stipple(shape, 50, (x, y) => (Math.abs(x) < 9 && y > top + 9 ? 0.6 : 0.1), 0.22, mix(BLUSH, SHADOW, 0.3));
  });
  curl(d, up(ds.right, top), 1, shape);
  curl(d, up(ds.left, top), -1, shape);
  face(d, top, 0.3 + 0.7 * r);
  gleam(d, up(ds.left.slice(2, 10), top).map((p) => pt(p.x + 1.3, p.y + 1.2)), 0.6, 0.6);
}

/** A crust chip: a broken plate of salt, white on top, its broken edge showing the soil it lay on. */
function chip(d: Draw, c: Pt, s: number, turn: number): void {
  const pts = [0, 1.7, 3, 4.4].map((a, i) => pt(c.x + Math.cos(a + turn) * s * (i % 2 ? 1 : 0.7), c.y + Math.sin(a + turn) * s * (i % 2 ? 0.7 : 1)));
  d.pen.fill(pts.map((p) => pt(p.x + 0.3, p.y + 0.5)), SOIL_DARK, 0.9);
  paint(d, pts, SALT, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.45 });
}

/** Crust chips flung up and out as it bursts, higher and wider the further it has risen (behind it, so they never sit on its face). */
function chips(d: Draw, r: number, rng: Rng): void {
  const n = 7;
  for (let k = 0; k < n; k++) {
    const side = k % 2 ? 1 : -1;
    const spread = 6 + rng() * 12;
    const lift = (4 + rng() * 10) * (0.5 + r * 1.6);
    const c = pt(side * (spread * (0.5 + r * 0.6)), Math.max(-55, -lift));
    if (Math.abs(c.x) > 20.5) continue;
    chip(d, c, 0.8 + rng() * 1.2, rng() * 6);
  }
}

/** Sand dust thrown up round its base, and sand pouring off its wingtips: thin hazes, under the outline's threshold, so they stay dust. */
function sand(d: Draw, top: number, r: number, rng: Rng): void {
  sporeCloud(d, pt(0, -2.5 - r * 2), 9 + r * 7, 1.2 - r * 0.5, SOIL);
  for (const s of [-1, 1]) {
    const x = s * (SPAN - 2);
    const from = top + TIP_AT + 1;
    if (from > -2) continue;
    const fall = [pt(x, from), pt(x + s * 0.8, Math.min(-1, from + 6)), pt(x + s * 0.6 + (rng() - 0.5), Math.min(-0.5, from + 14))];
    d.pen.hair(fall, 1.4, SOIL, 0.28);
  }
}

/**
 * The crater it bursts from: sand heaved up round it in a low bank, and a
 * few slabs of crust broken and tipped up on edge, leaning out, so where it
 * leaves the ground is hidden and the burst reads at a glance.
 */
function crater(d: Draw, r: number, rng: Rng): void {
  const bank = [...cub(pt(-17, 0.6), pt(-11, -3.6 - r), pt(11, -3.6 - r), pt(17, 0.6), 16), pt(17, 0.8), pt(-17, 0.8)];
  paint(d, bank, SOIL, { alpha: 1, shadow: 0.55, hatch: 0.15, line: 0.6 });
  d.pen.stipple(bank, 50, () => 0.7, 0.3, SOIL_DARK);
  const slabs: [number, number, number, number][] = [[-11.5, 4.2, 4.2, -0.55], [-4.8, 2.6, 2.6, -0.2], [5.4, 3, 3.2, 0.25], [12, 4, 4.6, 0.6]];
  for (const [x, w, h0, tilt] of slabs) {
    const h = h0 * (0.85 + rng() * 0.3) + r * 0.6;
    const lean = tilt * h;
    const slab = [pt(x - w * 0.55, 0.5), pt(x - w * 0.5 + lean, -h), pt(x + w * 0.5 + lean, -h * 0.82), pt(x + w * 0.55, 0.5)];
    paint(d, slab, SALT, { alpha: 1, shadow: 0.55, hatch: 0.14, line: 0.6 });
    // The slab's broken edge: the crust's thickness, soil-stained underneath.
    d.pen.fill([pt(x - w * 0.5 + lean, -h), pt(x + w * 0.5 + lean, -h * 0.82), pt(x + w * 0.48 + lean, -h * 0.82 + 0.8), pt(x - w * 0.48 + lean, -h + 0.8)], SOIL_DARK, 0.55);
    d.pen.hair([pt(x - w * 0.1, 0), pt(x + lean * 0.4, -h * 0.55)], 0.3, SALT_SHADE, 0.8);
  }
}

/** Bursting up out of the crust on its tail, up to reach × SKATE_REACH high. */
function striking(d: Draw, r: number): void {
  const rng = createRng(7600 + Math.round(r * 100) + d.f * 7);
  const top = -r * SKATE_REACH;
  chips(d, r, rng);
  d.pen.clipped([pt(-30, -70), pt(30, -70), pt(30, 0.2), pt(-30, 0.2)], () => {
    tail(d, top);
    disc(d, top, r);
  });
  sand(d, top, r, rng);
  crater(d, r, rng);
}

/** A crust plate on the bulge: salt, a little domed, cracked from its neighbours with soil showing in the cracks. */
function bulge(d: Draw): Pt[] {
  const top = cub(pt(-18, 0.4), pt(-10, -5.6), pt(10, -5.6), pt(18, 0.4), 18);
  const shape = [...top, pt(18, 0.8), pt(-18, 0.8)];
  dab(d, oval(0, 0.2, 20, 1.6, 18), SHADOW, 0.14, 1);
  paint(d, shape, SALT, { alpha: 1, shadow: 0.5, hatch: 0.14, line: 0.75 });
  d.pen.clipped(shape, () => {
    d.pen.stipple(shape, 60, () => 0.6, 0.25, SALT_SHADE);
    // Cracks: the crust split into plates as it was pushed up, soil showing dark in the gaps.
    for (const crack of [[pt(-13, 0.6), pt(-11.5, -1.8), pt(-12.4, -3.4)], [pt(-6, 0.6), pt(-5.2, -2), pt(-6.6, -4.4)], [pt(11.5, 0.6), pt(10.8, -2.2), pt(12, -3.4)], [pt(-12, -2), pt(-8, -2.6), pt(-5.4, -2)], [pt(5, -4.9), pt(6.4, -2.6), pt(5.8, 0.6)]]) {
      d.pen.stroke(crack, 0.75, SOIL_DARK, 0.8, false);
      d.pen.hair(crack.map((p) => pt(p.x + 0.4, p.y + 0.3)), 0.3, PAPER_FILL, 0.6);
    }
  });
  return shape;
}

/** The thorny ridge along its back, just its tip breaking the crust behind the eyes. */
function ridge(d: Draw): void {
  for (const [x, h, w] of [[-9.5, 1.6, 1], [-6.4, 2.4, 1.2], [-3, 3, 1.3], [0.2, 2.2, 1.1]] as const) {
    const base = -4.4 - Math.cos((x / 18) * Math.PI * 0.5) * 0.6;
    const thorn = [pt(x - w, base + 0.6), pt(x + w * 0.5, base - h), pt(x + w, base + 0.6)];
    paint(d, thorn, THORN, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.5, gloss: true });
  }
}

/** Its two eyes peeping through the crust: domes with a gold iris and a slit pupil, watching. */
function eyes(d: Draw): void {
  for (const [x, far] of [[4.6, true], [8.4, false]] as const) {
    const y = far ? -5.4 : -4.8;
    paint(d, oval(x, y, 2, 1.5, 14), mix(BACK, SHADOW, far ? 0.25 : 0.1), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.55 });
    paint(d, oval(x + 0.2, y - 0.3, 1.25, 0.95, 12), IRIS, { alpha: 1, shadow: 0.35, hatch: 0, line: 0.35, gloss: true });
    d.pen.fill(oval(x + 0.25, y - 0.3, 0.75, 0.25, 10), '#140c0c', 0.95);
    d.pen.dot(x - 0.25, y - 0.75, 0.3, PAPER_FILL, 0.95);
  }
}

/** Under the crust: a low cracked bulge, a ripple either side where the crust has heaved, the ridge's tip and two eyes showing. */
function buried(d: Draw): void {
  for (const s of [-1, 1]) {
    d.pen.hair(cub(pt(s * 18.5, 0), pt(s * 19.5, -1.2), pt(s * 21, -1.2), pt(s * 21.8, 0), 6), 0.4, SOIL_DARK, 0.6);
    d.pen.hair(cub(pt(s * 15.5, -0.1), pt(s * 16.5, -0.8), pt(s * 17.4, -0.8), pt(s * 18, 0), 6), 0.35, SALT_SHADE, 0.55);
  }
  const shape = bulge(d);
  ridge(d);
  eyes(d);
  gleam(d, shape.slice(3, 9).map((p) => pt(p.x, p.y + 0.8)), 0.6, 0.5);
}

/** The sand skate at a `reach` from 0 (under the crust) to 1 (struck full up out of the ground). */
export function drawSkate(d: Draw, reach: number): void {
  const r = Math.max(0, Math.min(1, reach));
  if (r <= 0) buried(d);
  else striking(d, r);
}
