import type { Rng } from '../../logic/rng';
import { MAP } from '../../scenes/map/layout';
import { closed, pt } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { blob, boxPts, type Brush } from './brush';
import { grassClump } from './plants';
import { GRANITE, ROCK_DEEP } from './rocks';

/**
 * Fences and walls across the map, drawn a little from the front like the
 * boards' solids (their shadows thrown down-right on the ground): a
 * post-and-rail fence, a zigzag split-rail fence, a slatted sand fence, a
 * thorn boma, a dry-stone wall. Each runs from the gate's opening outwards;
 * in a draft only as far as the draftsman got, then a ruled line.
 */
export const OAK = '#9a7650';
export const OAK_GREY = '#a39580';

/** How far out from the opening a fence is drawn: all the way when painted, partly in a draft. */
export const reachOf = (b: Brush, rng: Rng): number => (b.draft ? 260 + rng() * 380 : MAP.width);

/** The runs a fence takes either side of an opening `half` wide at x: [from, to] pairs, outwards. */
export function runs(x: number, half: number, reach: number): readonly (readonly [number, number])[] {
  return [
    [x - half, Math.max(-30, x - half - reach)],
    [x + half, Math.min(MAP.width + 30, x + half + reach)],
  ];
}

/** A light ruled line run on where a draft's fence stops, as when laying it out. */
export function ruled(b: Brush, y: number): void {
  if (b.draft) b.line([pt(-10, y + 1), pt(MAP.mid, y), pt(MAP.width + 10, y - 1)], 0.45, 0.16);
}

/** A squared post, `w` wide and `h` tall, its foot at (x, foot). */
export function post(b: Brush, x: number, foot: number, w: number, h: number, colour = OAK): void {
  const p = boxPts(x - w / 2, foot - h, x + w / 2, foot + 1, 6);
  b.cast(boxPts(x - w / 2, foot - 4, x + w / 2 + h * 0.5, foot + h * 0.35, 8), 0, 0.12);
  b.body(p, mix(colour, b.d.ink, 0.15), 0.8);
  b.pen.crescent(p, pt(-w * 0.45, 0), () => (b.draft ? b.hatch(p, 2.2, 1.2, 0.38) : b.pen.fill(p, b.d.ink, 0.22)));
  b.edge(p, 0.85, 0.85);
  b.glint([pt(x - w / 2 + 1, foot - h + 2), pt(x - w / 2 + 1, foot - 2)], 0.8, 0.4);
}

/** A rail from x0 to x1 at height y, `t` thick, sagging a touch. */
export function rail(b: Brush, x0: number, x1: number, y: number, t: number, rng: Rng, colour = OAK): void {
  const sag = (rng() - 0.3) * 2;
  const r = [...boxPts(Math.min(x0, x1), y - t / 2, Math.max(x0, x1), y + t / 2, 14)].map((p) => pt(p.x, p.y + sag * Math.sin((Math.PI * (p.x - Math.min(x0, x1))) / (Math.abs(x1 - x0) || 1))));
  b.cast(r, 14, 0.08);
  b.body(r, colour, 0.72);
  b.tint(r.map((p) => pt(p.x, Math.max(p.y, y + 0.5 + sag * 0.5))), b.d.ink, 0.15);
  b.edge(r, 0.7, 0.85);
  for (let x = Math.min(x0, x1) + rng() * 30; x < Math.max(x0, x1) - 10; x += 26 + rng() * 34) b.line([pt(x, y - 0.8), pt(x + 10 + rng() * 10, y - 0.6)], 0.35, 0.4);
}

/** Long grass and the odd flower along a fence's foot. */
export function footGrass(b: Brush, x0: number, x1: number, y: number, rng: Rng, tone = '#7f9a4a', every = 34): void {
  const [a, z] = [Math.min(x0, x1), Math.max(x0, x1)];
  for (let x = a + rng() * every; x < z; x += every * (0.6 + rng() * 0.9)) {
    if (Math.abs(x - MAP.mid) < 60) continue;
    grassClump(b, pt(x, y + 3), 10 + rng() * 9, rng, tone, rng() < 0.3 ? (rng() < 0.5 ? '#d23a2a' : '#f2efe6') : null);
  }
}

/** A post-and-rail fence with its foot at y, from the opening out. */
export function postAndRail(b: Brush, x: number, half: number, y: number, rng: Rng, colour = OAK): void {
  const reach = reachOf(b, rng);
  ruled(b, y);
  for (const [from, to] of runs(x, half, reach)) {
    const dir = Math.sign(to - from);
    for (const ry of [y - 13, y - 33]) rail(b, from, to, ry, 6, rng, colour);
    for (let p = from + dir * 8; dir * (to - p) > 0; p += dir * (140 + rng() * 30)) post(b, p, y, 11, 44, mix(colour, '#000000', 0.1));
    footGrass(b, from, to, y, rng);
  }
}

/** A zigzag split-rail ("worm") fence: rails stacked three high, angled panel to panel, crossing at each corner. */
export function splitRail(b: Brush, x: number, half: number, y: number, rng: Rng): void {
  const reach = reachOf(b, rng);
  ruled(b, y);
  const panel = 92;
  for (const [from, to] of runs(x, half, reach)) {
    const dir = Math.sign(to - from);
    const corners: Pt[] = [];
    for (let k = 0, p = from; dir * (to - p) > -panel; k++, p += dir * panel * 0.92) corners.push(pt(p, y + (k % 2 === 0 ? -9 : 9)));
    for (let i = 0; i + 1 < corners.length; i++) {
      const a = corners[i]!;
      const z = corners[i + 1]!;
      for (const [k, lift] of [[0, 8], [1, 20], [2, 32]] as const) {
        const r = [pt(a.x, a.y - lift - 2.5), pt(z.x, z.y - lift - 2.5), pt(z.x, z.y - lift + 2.5), pt(a.x, a.y - lift + 2.5)];
        if (k === 0) b.cast([pt(a.x, a.y), pt(z.x, z.y), pt(z.x + 22, z.y + 16), pt(a.x + 22, a.y + 16)], 0, 0.08);
        b.body(r, mix(OAK_GREY, '#c8bca6', rng() * 0.5), 0.72);
        b.tint([r[2]!, r[3]!, pt(r[3]!.x, r[3]!.y - 1.6), pt(r[2]!.x, r[2]!.y - 1.6)], b.d.ink, 0.2);
        b.line(closed(r), 0.55, 0.8);
      }
    }
    for (const c of corners) b.line([pt(c.x - 2, c.y), pt(c.x - 1, c.y - 40)], 0.9, 0.7);
    footGrass(b, from, to, y + 8, rng, '#9aa060', 46);
  }
}

/** A slatted sand fence, wired top and bottom, leaning, its foot drifted over with sand. */
export function sandFence(b: Brush, x: number, half: number, y: number, rng: Rng): void {
  const reach = reachOf(b, rng);
  ruled(b, y);
  for (const [from, to] of runs(x, half, reach)) {
    const dir = Math.sign(to - from);
    const lean = (rng() - 0.5) * 6;
    for (let p = from; dir * (to - p) > 0; p += dir * (7 + rng() * 2)) {
      const h = 30 + (rng() - 0.5) * 6;
      const s = [pt(p, y), pt(p + lean, y - h), pt(p + lean + 3.5, y - h), pt(p + 3.5, y)];
      b.tint(s.map((q) => pt(q.x + 6, q.y + 4)), b.d.ink, 0.08);
      b.body(s, mix('#b8a07a', '#e0d0b0', rng()), 0.72);
      b.line(closed(s), 0.4, 0.75);
    }
    for (const k of [0.25, 0.8]) b.line([pt(from, y - 30 * k), pt(to + lean, y - 30 * k)], 0.7, 0.7, '#4a4a52');
    // Sand drifted against its foot.
    for (let p = from; dir * (to - p) > 0; p += dir * 60) {
      const drift = blob(pt(p + dir * 30, y + 2), 38, 7, rng, 0.3, 14);
      b.body(drift, '#ead8aa', 0.85);
      b.line(closed(drift).slice(10, 22), 0.45, 0.4);
    }
  }
}

/** A thorn boma: cut acacia branches heaped into a hedge, a tangle of thorny twigs. */
export function thornBoma(b: Brush, x: number, half: number, y: number, rng: Rng): void {
  const reach = reachOf(b, rng);
  ruled(b, y);
  for (const [from, to] of runs(x, half, reach)) {
    const dir = Math.sign(to - from);
    const body = [...boxPts(Math.min(from, to), y - 26, Math.max(from, to), y + 2, 20)];
    b.cast(body, 12, 0.1);
    b.tint(body, '#8a7a5a', 0.25);
    for (let p = from; dir * (to - p) > 0; p += dir * 5) {
      const a = -Math.PI / 2 + (rng() - 0.5) * 2.4;
      const base = pt(p, y - rng() * 6);
      const l = 10 + rng() * 18;
      const tip = pt(base.x + Math.cos(a) * l, base.y + Math.sin(a) * l * 0.9);
      b.line([base, pt((base.x + tip.x) / 2 + (rng() - 0.5) * 4, (base.y + tip.y) / 2), tip], 0.6, 0.7, '#4a3a2a');
      if (rng() < 0.4) b.line([tip, pt(tip.x + (rng() - 0.5) * 6, tip.y - 3)], 0.4, 0.6);
      if (!b.draft && rng() < 0.15) b.pen.dot(tip.x, tip.y, 1.3, '#9aa65f', 0.8);
    }
  }
}

/** A dry-stone wall: rough courses of field stone, a row of upright coping stones along its top. */
export function stoneWall(b: Brush, x0: number, x1: number, y: number, rng: Rng, tone = GRANITE): void {
  const top = y - 28;
  const [a, z] = [Math.min(x0, x1), Math.max(x0, x1)];
  b.cast([pt(a + 4, y - 2), pt(z + 8, y - 2), pt(z + 22, y + 14), pt(a + 18, y + 14)], 0, 0.1);
  b.body(boxPts(a, top, z, y, 16), mix(tone, '#d8cfb8', 0.4), 0.5);
  for (let r = 0; r < 3; r++) {
    for (let p = a - rng() * 10; p < z - 4; ) {
      const w = 12 + rng() * 14;
      const cy = top + 6 + r * 7.5 + rng() * 2;
      if (p > a + 2) {
        const s = blob(pt(p + w / 2, cy), w / 2 - 1, 3.4, rng, 0.15, 10);
        b.body(s, mix(tone, rng() < 0.5 ? '#b8a88a' : '#a8aca4', rng()), 0.75);
        b.tint(s.map((q) => pt(q.x, Math.max(q.y, cy + 0.5))), ROCK_DEEP, 0.25);
        b.line(closed(s), 0.4, 0.55);
      }
      p += w;
    }
  }
  for (let p = a + 3; p < z - 3; p += 5 + rng() * 2) {
    const cope = [pt(p, top + 1), pt(p + 0.6, top - 7 - rng() * 2), pt(p + 4, top - 7 - rng() * 2), pt(p + 4.5, top + 1)];
    b.body(cope, mix(tone, '#cfc8b4', rng()), 0.7);
    b.line(closed(cope), 0.35, 0.65);
  }
  b.stroke([pt(a, y), pt((a + z) / 2, y + 0.5), pt(z, y)], 1.1, 0.85);
  for (let i = 0; i < 4; i++) b.dot(a + rng() * (z - a), top + rng() * 20, 2 + rng() * 2, '#b8c07a', 0.6);
}
