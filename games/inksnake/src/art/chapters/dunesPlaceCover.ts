import type { Rng } from '../../logic/rng';
import type { CoverDef } from '../../level/types';
import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, cub, type Draw, oval, pt, ribbon, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { rngAt } from './dunesPlaceKit';

/**
 * The Dunes' cover, painted on the layer over the snake: a honey mesquite
 * thicket, the desert's shade tree grown low and wide: a dark tangle of
 * crooked, thorny branches under layer on layer of feathery leaves (each a
 * spray of tiny paired leaflets), lit from the upper left, a few pale bean
 * pods and yellow catkins among them. It stays inside about r × 1.15 of its
 * centre and is opaque, so the snake under it is hidden.
 */
const REACH = 1.15;
const LEAF = '#7a9150';
const LEAF_DEEP = '#3c4f2e';
const LEAF_LIT = '#c2cc84';
const BRANCH = '#4e3e30';
const POD = '#d9c38a';
const CATKIN = '#e6c64a';

/** Tones from deep to lit; each leaflet takes the nearest. */
const TONES = Array.from({ length: 6 }, (_, i) => mix(mix(LEAF_DEEP, LEAF, Math.min(1, i / 3)), LEAF_LIT, Math.max(0, (i - 3) / 2.5)));

type Segment = readonly [Pt, Pt];

/** A feathery spray: a rachis from p towards a, `l` long, with leaflet pairs along it, each pushed into its tone's bucket. */
function spray(buckets: Segment[][], p: Pt, a: number, l: number, tone: number, rng: Rng, fits: (q: Pt) => boolean): Segment {
  const tip = polar(p, a, l);
  const n = Math.max(3, Math.round(l / 1.5));
  for (let i = 1; i <= n; i++) {
    const q = polar(p, a, (l * i) / n);
    const len = 2.4 * (1 - (i / n) * 0.35);
    for (const s of [1, -1]) {
      const end = polar(q, a + s * (1.0 + rng() * 0.25), len);
      if (!fits(end)) continue;
      const t = Math.max(0, Math.min(TONES.length - 1, Math.round(tone + (rng() - 0.5) * 1.6)));
      buckets[t]!.push([q, end]);
    }
  }
  return [p, tip];
}

/** Lays a tier's leaflets: their shadow, then each tone, then the rachises in fine dark line. */
function layTier(d: Draw, buckets: readonly Segment[][], rachises: readonly Segment[], lift: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = rgba(d.ink, 0.2);
  ctx.beginPath();
  for (const b of buckets) for (const [a, e] of b) {
    ctx.moveTo(a.x + SHADOW.x * lift, a.y + SHADOW.y * lift);
    ctx.lineTo(e.x + SHADOW.x * lift, e.y + SHADOW.y * lift);
  }
  ctx.stroke();
  buckets.forEach((b, i) => {
    ctx.strokeStyle = TONES[i]!;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    for (const [a, e] of b) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(e.x, e.y);
    }
    ctx.stroke();
  });
  ctx.strokeStyle = rgba('#2c3320', 0.55);
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  for (const [a, e] of rachises) {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(e.x, e.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** A pale bean pod, curved, its seeds showing as bumps. */
function pod(d: Draw, p: Pt, a: number, rng: Rng): void {
  const end = polar(p, a, 9 + rng() * 4);
  const spine = cub(p, polar(p, a + 0.3, 4), polar(end, a + Math.PI - 0.3, 4), end, 10);
  const shape = ribbon(spine, (u) => 1.8 * Math.sin(Math.PI * (0.08 + u * 0.84)) + 0.3).shape;
  d.pen.fill(shape.map((q) => pt(q.x + 1, q.y + 1.5)), d.ink, 0.25);
  body(d, shape, POD, 0.95);
  for (let i = 2; i < spine.length - 1; i += 2) d.pen.dot(spine[i]!.x - 0.2, spine[i]!.y - 0.3, 0.45, PAPER_FILL, 0.5);
  d.pen.hair(closed(shape), 0.4, d.ink, 0.75);
}

/** A mesquite thicket: see the module comment. */
function mesquite(d: Draw, c: CoverDef, rng: Rng): void {
  const { pen } = d;
  const r = c.r;
  const centre = pt(c.x, c.y);
  const fits = (q: Pt): boolean => Math.hypot(q.x - c.x, q.y - c.y) < r * (REACH - 0.03);
  const mass = blob(centre, r * 0.88, r * 0.84, rng, 0.18, 32);
  castShadow(d, mass, r * 0.18, 0.26);
  body(d, mass, '#34402a', 0.94);
  // Crooked branches out from the trunk, thorns at the bends.
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU + rng() * 0.5;
    const pts = [centre];
    let p = centre;
    for (let i = 0; i < 4; i++) {
      p = polar(p, a + (i % 2 ? 0.35 : -0.35) + (rng() - 0.5) * 0.3, r * 0.22);
      pts.push(p);
    }
    pen.hair(pts, 1.8, BRANCH, 0.9);
    for (const q of pts.slice(1)) pen.hair([q, polar(q, a + (rng() - 0.5) * 3, 2)], 0.5, '#2a221c', 0.8);
  }
  const litAt = (q: Pt, dark: number): number => {
    const facing = -((q.x - c.x) * SHADOW.x + (q.y - c.y) * SHADOW.y) / r;
    return Math.max(0, Math.min(TONES.length - 1, (1.4 + facing * 2.2 - dark) * 1.1));
  };
  const tiers: readonly (readonly [number, number, number, number])[] = [
    // sprays, how far out (share of r), darkness, shadow lift
    [70, 0.95, 1.6, 1],
    [55, 0.9, 0.8, 1.6],
    [40, 0.75, 0, 2.2],
    [22, 0.55, -0.8, 2.6],
    [12, 0.3, -0.4, 2.8],
  ];
  for (const [count, out, dark, lift] of tiers) {
    const buckets = TONES.map(() => [] as Segment[]);
    const rachises: Segment[] = [];
    for (let k = 0; k < count; k++) {
      const base = polar(centre, rng() * TAU, r * out * Math.sqrt(rng()));
      const a = Math.atan2(base.y - c.y, base.x - c.x) + (rng() - 0.5) * 1.6;
      rachises.push(spray(buckets, base, a, 8 + rng() * 6, litAt(base, dark), rng, fits));
    }
    layTier(d, buckets, rachises, lift);
  }
  for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) pod(d, polar(centre, rng() * TAU, r * (0.2 + rng() * 0.5)), rng() * TAU, rng);
  for (let k = 0; k < 4; k++) {
    const p = polar(centre, rng() * TAU, r * (0.15 + rng() * 0.6));
    const a = rng() * TAU;
    const cat = ribbon(arc(p, polar(p, a, 6), 1, 5), () => 1.6).shape;
    body(d, cat, CATKIN, 0.9);
    for (let i = 0; i < 6; i++) pen.dot(p.x + Math.cos(a) * i + (rng() - 0.5), p.y + Math.sin(a) * i + (rng() - 0.5), 0.4, '#b08a20', 0.7);
  }
  const top = blob(centre, r * 0.95, r * 0.92, rng, 0.15, 30);
  pen.crescent(top, pt(-SHADOW.x * r * 0.45, -SHADOW.y * r * 0.45), () => pen.fill(top, '#1a1f2a', 0.18));
  pen.crescent(top, pt(SHADOW.x * r * 0.5, SHADOW.y * r * 0.5), () => pen.fill(top, PAPER_FILL, 0.08));
}

/** One patch of the Dunes' cover. */
export function paintDunesCover(d: Draw, c: CoverDef): void {
  const rng = rngAt(c.x, c.y, 13);
  d.pen.clipped(oval(c.x, c.y, c.r * REACH, c.r * REACH, 48), () => mesquite(d, c, rng));
}
