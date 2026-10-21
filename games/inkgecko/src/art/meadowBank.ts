import { createRng, type Rng } from '../logic/rng';
import { blob, body, castShadow, polar, SHADOW } from './groundKit';
import { closed, type Draw, normals, pt, TAU } from './kit';
import { type Bloom, bloom } from './meadowFlora';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { coverEnds, coverHalf, unit } from './tunnel';
import { mix } from './wash';

/**
 * The meadow's cover over a stretch of groove: a soft rounded hummock of
 * turf humped over it like an old field bank, following the stretch
 * whether straight or curved, with a little stone culvert headwall at each
 * end where the marbles roll in under it and wildflowers on its crown.
 */
const TURF = '#86a650';
const TURF_LIT = '#d2dc8e';
const TURF_DEEP = '#3f6332';
const BLADE_DEEP = '#4d6e38';
const WALL = '#a9a293';
const LICHEN = '#cdc684';
/** How far the turf spreads past the cover's band either side, and how far its lobes round past each end. */
const SKIRT = 6;
const LOBE = 3;

/** A blade of grass from p pointing along a, l long. */
export function blade(d: Draw, p: Pt, a: number, l: number, colour: string, alpha: number, rng: Rng): void {
  d.pen.hair([p, polar(polar(p, a, l * 0.5), a + 1.4, (rng() - 0.5) * l * 0.25), polar(p, a, l)], 0.8 + rng() * 0.4, colour, alpha);
}

/**
 * The bank's outline: its two flanks along the stretch, and at each end a
 * rounded lobe of turf either side of the groove's mouth, the mouth itself
 * left open across the groove.
 */
function bankShape(pts: readonly Pt[], half: number, mouth: number): { shape: Pt[]; top: Pt[]; bot: Pt[] } {
  const last = pts.length - 1;
  const nrm = normals(pts);
  const width = (i: number): number => half + Math.sin(i * 0.37 + pts.length) * 1.5 + Math.sin(i * 0.13) * 2;
  const top = pts.map((p, i) => pt(p.x + nrm[i]!.x * width(i), p.y + nrm[i]!.y * width(i)));
  const bot = pts.map((p, i) => pt(p.x - nrm[i]!.x * width(i), p.y - nrm[i]!.y * width(i)));
  /** From the flank at offset `from` round the lobe in to the mouth's edge at `to`, bulging out along `out`. */
  const lobe = (end: Pt, n: Pt, out: Pt, from: number, to: number): Pt[] =>
    Array.from({ length: 9 }, (_, k) => {
      const t = (k + 1) / 9;
      const s = from + (to - from) * (1 - Math.cos((t * Math.PI) / 2));
      const bulge = Math.sin(Math.min(1, t * 1.25) * Math.PI) * LOBE;
      return pt(end.x + n.x * s + out.x * bulge, end.y + n.y * s + out.y * bulge);
    });
  const capEnd = (i: number, out: Pt, side: number): Pt[] => {
    const n = pt(nrm[i]!.x * side, nrm[i]!.y * side);
    const w = width(i);
    return [...lobe(pts[i]!, n, out, w, mouth), ...lobe(pts[i]!, pt(-n.x, -n.y), out, w, mouth).reverse()];
  };
  const outEnd = unit(pts[Math.max(0, last - 3)]!, pts[last]!);
  const outStart = unit(pts[Math.min(last, 3)]!, pts[0]!);
  // Down the top flank, round the far end (top side first), back along the bottom, round the near end.
  const far = capEnd(last, outEnd, 1);
  const near = capEnd(0, outStart, -1);
  return { shape: [...top, ...far, ...[...bot].reverse(), ...near], top, bot };
}

/** One rough coping stone of a culvert's headwall: a lumpy quad, washed grey, lichened, shaded, outlined. */
function coping(d: Draw, quad: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  const c = pt(quad.reduce((s, p) => s + p.x, 0) / 4, quad.reduce((s, p) => s + p.y, 0) / 4);
  const shape = quad.flatMap((p, i) => {
    const q = quad[(i + 1) % 4]!;
    return [0.12, 0.5, 0.88].map((t) => {
      const m = pt(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t);
      const k = 0.86 + rng() * 0.08 + (t === 0.5 ? 0.05 : 0);
      return pt(c.x + (m.x - c.x) * k, c.y + (m.y - c.y) * k);
    });
  });
  castShadow(d, shape, 3, 0.25);
  body(d, shape, mix(WALL, rng() < 0.5 ? STONE_DARK : '#b8a888', rng() * 0.45), 0.85);
  pen.clipped(shape, () => {
    pen.fill(blob(pt(c.x - 2, c.y - 2), 5, 3.5, rng, 0.3, 10), PAPER_FILL, 0.25);
    pen.stipple(shape, 26, () => 0.7, 0.5, mix(STONE_DARK, d.ink, 0.3));
    if (rng() < 0.6) pen.fill(blob(polar(c, rng() * TAU, 3), 3 + rng() * 2.5, 2.4 + rng() * 1.5, rng, 0.3, 10), rng() < 0.5 ? LICHEN : MOSS, 0.6);
  });
  pen.crescent(shape, pt(-SHADOW.x * 2.6, -SHADOW.y * 2.6), () => pen.fill(shape, mix(STONE_DARK, d.ink, 0.25), 0.5));
  pen.stroke(closed(shape), 0.9, d.ink, 0.9, false);
}

/**
 * A culvert's headwall across the end of the bank: a course of rough
 * coping stones the full width of the bank, the middle one (over the
 * arch) the biggest, set into the turf with grass nodding over the back.
 */
function culvert(d: Draw, end: Pt, inward: Pt, half: number, rng: Rng): void {
  const across = pt(-inward.y, inward.x);
  const wing = half + SKIRT + 1;
  const depth = 10;
  const cuts = [-1, -0.62, -0.24, 0.24, 0.62, 1].map((t, i, a) => (i === 0 || i === a.length - 1 ? t : t + (rng() - 0.5) * 0.08));
  const at = (t: number, k: number): Pt => pt(end.x + across.x * t * wing + inward.x * k, end.y + across.y * t * wing + inward.y * k);
  // The dark of the joints behind the stones.
  d.pen.fill([at(-1, -0.5), at(1, -0.5), at(1, depth + 1), at(-1, depth + 1)], mix(STONE_DARK, d.ink, 0.5), 0.6);
  for (let k = 0; k + 1 < cuts.length; k++) {
    const mid = (cuts[k]! + cuts[k + 1]!) / 2;
    // The keystone over the arch stands proud of the rest.
    const front = Math.abs(mid) < 0.2 ? -2 : 0;
    const back = depth + (Math.abs(mid) < 0.2 ? 2 : rng() * 2 - 1);
    coping(d, [at(cuts[k]!, front), at(cuts[k + 1]!, front), at(cuts[k + 1]!, back), at(cuts[k]!, back)], rng);
  }
  for (let k = 0; k < 9; k++) {
    const p = at(-1 + rng() * 2, depth + 1);
    blade(d, p, Math.atan2(-inward.y, -inward.x) + (rng() - 0.5) * 1.2, 3 + rng() * 4, mix(LEAF, TURF_DEEP, rng() * 0.5), 0.8, rng);
  }
}

/**
 * The meadow's cover over a stretch of groove `pts`: see the module
 * comment. Covers coverHalf(grooveW) either side, ends included.
 */
export function grassBank(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const { pen } = d;
  const rng = createRng(Math.round(pts[0]!.x * 13 + pts[0]!.y * 7 + pts.length));
  coverEnds(d, pts, grooveW);
  const half = coverHalf(grooveW) + 2;
  const last = pts.length - 1;
  const nrm = normals(pts);
  const bank = bankShape(pts, half + SKIRT, grooveW / 2 + 2);
  const span = half + SKIRT;
  // Its shadow on the meadow, then the turf, rounded by soft light and shade.
  castShadow(d, bank.shape, 13, 0.14);
  castShadow(d, bank.shape, 7, 0.14);
  body(d, bank.shape, TURF, 0.75);
  for (const k of [1.3, 0.95, 0.65, 0.4]) {
    pen.crescent(bank.shape, pt(-SHADOW.x * span * k, -SHADOW.y * span * k), () => pen.fill(bank.shape, TURF_DEEP, 0.13));
    pen.crescent(bank.shape, pt(SHADOW.x * span * k, SHADOW.y * span * k), () => pen.fill(bank.shape, TURF_LIT, 0.13));
  }
  // Turf combed down the slopes from the crown, darker on the shaded flank.
  pen.clipped(bank.shape, () => {
    for (let i = 0; i <= last; i++) {
      for (const s of [1, -1]) {
        const lit = nrm[i]!.x * s * -SHADOW.x + nrm[i]!.y * s * -SHADOW.y > 0;
        for (let k = 0; k < 4; k++) {
          const t = 0.1 + rng() * 0.95;
          const p = pt(pts[i]!.x + nrm[i]!.x * s * span * t, pts[i]!.y + nrm[i]!.y * s * span * t);
          const a = Math.atan2(nrm[i]!.y * s, nrm[i]!.x * s) + (rng() - 0.5) * 0.8;
          const colour = lit ? mix(TURF_LIT, TURF, rng() * 0.7) : mix(BLADE_DEEP, TURF, rng() * 0.4);
          blade(d, p, a, 3 + rng() * 5 * (0.5 + t), colour, 0.8, rng);
        }
      }
    }
    // Dabs of clover and moss in the turf.
    for (let k = 0; k < last * 1.2; k++) {
      const i = Math.floor(rng() * (last + 1));
      const off = (rng() - 0.5) * 2 * span * 0.9;
      const p = pt(pts[i]!.x + nrm[i]!.x * off, pts[i]!.y + nrm[i]!.y * off);
      pen.fill(blob(p, 1.6 + rng() * 1.6, 1.3 + rng() * 1.2, rng, 0.2, 8), rng() < 0.5 ? LEAF : MOSS, 0.55);
    }
  });
  pen.crescent(bank.shape, pt(-SHADOW.x * span * 0.6, -SHADOW.y * span * 0.6), () => pen.hatch(bank.shape, 2.6, 0.9, 0.45, { color: d.ink, alpha: 0.3 }));
  pen.crescent(bank.shape, pt(-SHADOW.x * span * 0.3, -SHADOW.y * span * 0.3), () => pen.hatch(bank.shape, 3, -0.55, 0.4, { color: d.ink, alpha: 0.22 }));
  pen.stroke(closed(bank.shape), 1, d.ink, 0.6, false);
  // Grass spilling over the outline along both flanks.
  for (const [line, s] of [[bank.top, 1], [bank.bot, -1]] as const) {
    for (let i = 0; i <= last; i += 2) {
      const a = Math.atan2(nrm[i]!.y * s, nrm[i]!.x * s) + (rng() - 0.5) * 1.1;
      blade(d, polar(line[i]!, a + Math.PI, 2.5), a, 4 + rng() * 6, mix(TURF, BLADE_DEEP, rng()), 0.8, rng);
    }
  }
  culvert(d, pts[0]!, unit(pts[0]!, pts[Math.min(last, 3)]!), half, rng);
  culvert(d, pts[last]!, unit(pts[last]!, pts[Math.max(0, last - 3)]!), half, rng);
  // Wildflowers along the crown between the culverts.
  const kinds: readonly Bloom[] = ['daisy', 'buttercup', 'daisy', 'clover', 'poppy', 'daisy', 'cornflower', 'buttercup'];
  for (let i = Math.min(last, 5); i <= Math.max(5, last - 5); i += 1 + Math.floor(rng() * 3)) {
    const off = (rng() - 0.5) * span * 1.3;
    const p = pt(pts[i]!.x + nrm[i]!.x * off, pts[i]!.y + nrm[i]!.y * off);
    bloom(d, kinds[Math.floor(rng() * kinds.length)]!, p, 3.5 + rng() * 2, rng, false);
  }
}
