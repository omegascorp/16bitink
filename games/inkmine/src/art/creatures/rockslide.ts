import { createRng } from '../../logic/rng';
import { capsule, cub, oval, pt, ribbon, setae, type Draw } from '../kit';
import { dab, gleam, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { sporeCloud } from './flesh';
import { kidneyOre, TALUS_STYLE, talusStone } from './rockcrab';

/**
 * The Rockslide (Talus's giant, hostile, inked in red): a crab the size of a
 * hill, asleep under the Throne in a long cave. It is the boulder crab grown
 * old beyond reckoning: its stone has grown on and on until its back is a
 * whole talus slope, a heap of loose boulders and gravel cemented to its
 * shell, the way old lobsters and spider crabs carry whole gardens of
 * barnacles, weed and sponge. Under the heap it is armoured in hematite,
 * plates of dull grey-red kidney ore along its rim and legs. Asleep it is
 * sunk down with its legs folded under, gravel banked round it, and it is a
 * mound of rock in a cave: only the curve of one vast claw half buried at
 * its front and a shut eye slit between the stones give it away. Stirring,
 * stones tumble off its back, its eyes open and a leg tip pushes out of the
 * gravel. Awake it rises on huge jointed legs, the heap still on its back,
 * gravel streaming off it, its great claws held forward and eyes up on
 * stalks. Seen from the front, facing right (the great claw on its right);
 * origin at the middle of its underside on the cave floor (y = 0).
 */
export const ROCKSLIDE_ART = { w: 320, h: 184, ox: 160, oy: 176 } as const;
export type RockslidePose = 'sleep' | 'stir' | 'awake';

interface Stance {
  /** How far its shell's underside is off the floor. */
  readonly lift: number;
  /** How open its eyes are (0 shut, 1 up on their stalks). */
  readonly eye: number;
  /** How far its claws are raised and opened. */
  readonly claw: number;
}

const STANCES: Readonly<Record<RockslidePose, Stance>> = {
  sleep: { lift: -4, eye: 0, claw: 0 },
  stir: { lift: 4, eye: 0.5, claw: 0.15 },
  awake: { lift: 40, eye: 1, claw: 1 },
};

const CHITIN = '#7f3a2b';
const CHITIN_DARK = '#4f231c';
const HEMATITE = '#5b4448';
const HEM_LIT = '#b3a3a6';
const TIP = '#2a1f22';
const EYE = '#1d1315';
const GRAVEL = mix(TALUS_STYLE.soil, TALUS_STYLE.shade, 0.42);

/** The shell's half-span, and how high its dome stands over its rim. */
const HALF = 114;
const DOME = 40;
/** How high the heap of rock stands on top of the dome. */
const HEAP = 56;

/** The top of the carapace's dome at `x`, over a rim whose underside is at `b`. */
const shellTop = (b: number, x: number): number => b - 24 - DOME * Math.max(0, 1 - (x / HALF) ** 2);
/** The top of the heap on its back at `x`: a slope of rock peaking a little behind its middle. */
const heapTop = (b: number, x: number): number => shellTop(b, x) - HEAP * Math.max(0, 1 - ((x + 8) / 108) ** 2) ** 1.1;

/** The carapace from the front: broad, its rim curving under, its dome (hidden under the heap) above. */
function shellShape(b: number): Pt[] {
  return [
    ...cub(pt(-HALF, b - 24), pt(-HALF + 6, b - 4), pt(-60, b + 4), pt(0, b + 4), 14),
    ...cub(pt(0, b + 4), pt(60, b + 4), pt(HALF - 6, b - 4), pt(HALF, b - 24), 14).slice(1),
    ...Array.from({ length: 23 }, (_, i) => {
      const x = HALF - (i + 1) * ((2 * HALF) / 24);
      return pt(x, shellTop(b, x));
    }),
  ];
}

interface Stone {
  readonly x: number;
  /** Its height up the heap, 0 at the rim to 1 at the top. */
  readonly t: number;
  readonly s: number;
  readonly seed: number;
  /** How far its stone is weathered towards the deep red (0..1), so the heap isn't one colour. */
  readonly tone: number;
}

/** The heap's stones, laid out once: big at the foot of the slope, smaller up it, every size between, as a real talus is. */
const STONES: readonly Stone[] = (() => {
  const rng = createRng(9400);
  const out: Stone[] = [];
  // Rows up the slope, each packed shoulder to shoulder with stones of mixed sizes, so little bare gravel shows.
  for (let row = 0; row < 7; row++) {
    const t = row / 6;
    // Every row runs the heap's whole width, so its outline is lumpy with stones all the way down its flanks.
    const span = 104 - t * 30;
    let x = -8 - span + rng() * 6;
    while (x < -8 + span) {
      // Mostly middling stones, now and then a great boulder (more of them low down) or a small one wedged in.
      const roll = rng();
      const k = roll < 0.16 - t * 0.12 ? 1.5 + rng() * 0.3 : roll > 0.78 ? 0.45 + rng() * 0.15 : 0.75 + rng() * 0.3;
      const size = (28 - t * 13) * k * (0.6 + 0.4 * Math.max(0, 1 - ((x + 8) / 112) ** 2));
      out.push({ x, t: Math.min(1, t + (rng() - 0.5) * 0.12), s: size, seed: 9400 + out.length * 31, tone: rng() * rng() });
      x += size * (0.55 + rng() * 0.25);
    }
  }
  // Top rows first, so the lower rocks sit in front (as talusGround lays a slope).
  return out.sort((a, b) => b.t - a.t);
})();

/** Where a heap stone sits for a shell whose rim is at `b`. */
function stoneAt(b: number, st: Stone): Pt {
  const lo = b - 16;
  const hi = heapTop(b, st.x) + st.s * 0.3;
  return pt(st.x, lo + (hi - lo) * st.t);
}

/** Which heap stones have tumbled off as it stirs: the ones highest on each shoulder. */
const TUMBLED = new Set(STONES.map((st, i) => [st, i] as const).filter(([st]) => st.t > 0.6 && Math.abs(st.x + 8) > 45).slice(0, 3).map(([, i]) => i));

/** The heap on its back: gravel packed over the dome, then the boulders, each in the loose rock's own language. */
function heap(d: Draw, b: number, pose: RockslidePose): void {
  const top = Array.from({ length: 33 }, (_, i) => {
    const x = -HALF + 4 + (i * (2 * HALF - 8)) / 32;
    return pt(x, heapTop(b, x) + 4);
  });
  const shape = [...top, pt(HALF - 4, b - 20), pt(-HALF + 4, b - 20)];
  paint(d, shape, GRAVEL, { alpha: 1, shadow: 0.55, hatch: 0.12, line: 0.9 });
  d.pen.clipped(shape, () => {
    d.pen.stipple(shape, 700, () => 0.6, 0.7, TALUS_STYLE.grain);
    d.pen.stipple(shape, 260, (_, y) => (y < b - 60 ? 0.7 : 0.25), 0.6, mix(TALUS_STYLE.soil, '#fff0dc', 0.4));
  });
  STONES.forEach((st, i) => {
    if (pose !== 'sleep' && TUMBLED.has(i)) return;
    const c = stoneAt(b, st);
    // Stirring, the heap shifts: each stone settles a little, differently each frame.
    const jog = pose === 'stir' ? ((i * 7 + d.f * 3) % 5) * 0.3 - 0.6 : 0;
    const style = { ...TALUS_STYLE, stone: mix(TALUS_STYLE.stone, TALUS_STYLE.deep, st.tone * 0.8) };
    talusStone(d, c.x + jog, c.y, st.s, st.seed, true, style);
  });
}

/** The rim of the shell below the heap: armoured in hematite plate with kidney ore, toothed along its front margin. */
function rim(d: Draw, b: number): Pt[] {
  const shape = shellShape(b);
  paint(d, shape, CHITIN, { alpha: 1, shadow: 0.6, hatch: 0.18, line: 1.2, cross: true });
  d.pen.clipped(shape, () => {
    for (let k = -5; k <= 5; k++) {
      const x = k * 21;
      const y0 = b - 26 - DOME * 0.35 * Math.max(0, 1 - (x / HALF) ** 2);
      // Overlapping plates of armour, rounded at their lower edge like scales.
      const plate = [pt(x - 13, y0), pt(x + 13, y0 - 1), ...cub(pt(x + 13, b - 6), pt(x + 10, b + 3), pt(x - 10, b + 3), pt(x - 13, b - 6), 8)];
      paint(d, plate, k % 2 ? mix(HEMATITE, CHITIN, 0.2) : mix(HEMATITE, CHITIN, 0.5), { alpha: 0.9, shadow: 0.5, hatch: 0, line: 0.5, lineAlpha: 0.6, gloss: true });
    }
    d.pen.stipple(shape, 300, () => 0.5, 0.6, mix(HEMATITE, SHADOW, 0.5));
  });
  for (const [x, r, n] of [[-88, 7, 5], [-38, 5, 4], [26, 6, 5], [78, 8, 6], [102, 4, 3]] as const) kidneyOre(d, pt(x, b - 12 + Math.abs(x) * 0.04), r, n, 9300 + x);
  // The front margin's teeth, along the rim's lower edge.
  for (let k = -8; k <= 8; k++) {
    const x = k * 12.5;
    const y = b + 3.6 - Math.abs(x) * 0.12 - (x / HALF) ** 2 * 12;
    paint(d, [pt(x - 4, y - 2), pt(x, y + 4), pt(x + 4, y - 2)], mix(HEMATITE, TIP, 0.3), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
  }
  gleam(d, Array.from({ length: 8 }, (_, i) => pt(-110 + i * 9, b - 18 - i * 0.6)), 1.4, 0.45);
  return shape;
}

/** The face under the rim's middle: the mouthparts closed over the mouth like great doors, bristled. */
function face(d: Draw, b: number): void {
  for (const sx of [-1, 1]) {
    const plate = [...cub(pt(sx * 1, b - 2), pt(sx * 1, b - 5), pt(sx * 12, b - 5), pt(sx * 12, b - 1), 8), ...cub(pt(sx * 12, b - 1), pt(sx * 12, b + 12), pt(sx * 1, b + 13), pt(sx * 1, b + 9), 8).slice(1)];
    paint(d, plate, mix(CHITIN, CHITIN_DARK, 0.4), { alpha: 1, shadow: 0.55, hatch: 0.2, line: 0.8 });
    for (let k = 0; k < 5; k++) d.pen.hair([pt(sx * 1.5, b + 1 + k * 2.6), pt(sx * -0.8, b + 2 + k * 2.6)], 0.5, PAPER_FILL, 0.55);
  }
}

/** An eye: shut (a slit in its socket under a heavy lid), half open, or up on a stalk over the face. */
function eye(d: Draw, b: number, sx: 1 | -1, open: number, f: number): void {
  const base = pt(sx * 17, b - 10);
  if (open <= 0) {
    // Shut and laid flat in its socket: a heavy lid over it, just a slit between the stones.
    dab(d, oval(base.x, base.y, 7.5, 4, 16), TIP, 0.55, 1.5);
    paint(d, oval(base.x, base.y - 0.4, 6, 3, 16), mix(HEMATITE, CHITIN, 0.4), { alpha: 1, shadow: 0.5, hatch: 0, line: 0 });
    d.pen.stroke(cub(pt(base.x - 6, base.y + 0.4), pt(base.x - 2.4, base.y + 1.2), pt(base.x + 2.4, base.y + 1.2), pt(base.x + 6, base.y + 0.2), 8), 0.9, TIP, 0.9, false);
    d.pen.hair(cub(pt(base.x - 5, base.y - 1.6), pt(base.x - 2, base.y - 3), pt(base.x + 2, base.y - 3), pt(base.x + 5, base.y - 1.4), 8), 0.5, HEM_LIT, 0.55);
    return;
  }
  d.pen.fill(oval(base.x, base.y, 9, 5.5, 18), TIP, 0.9);
  const height = open >= 1 ? 50 : 6;
  const tip = pt(base.x + sx * (open >= 1 ? 6 : 1.5), base.y - height + (f === 1 ? -0.8 : 0));
  if (open >= 1) {
    const stalk = ribbon([base, pt(base.x + sx * 1.5, base.y - height * 0.5), tip], (u) => 9 - 3 * u).shape;
    paint(d, stalk, CHITIN, { alpha: 1, shadow: 0.55, hatch: 0.15, line: 0.8 });
    for (let k = 1; k < 4; k++) d.pen.hair([pt(base.x - 4, base.y - k * 12), pt(base.x + 4, base.y - k * 12 - 0.6)], 0.5, mix(CHITIN, SHADOW, 0.5), 0.6);
  }
  const r = 6.5;
  paint(d, oval(tip.x, tip.y, r + 1.6, r + 1, 18), HEMATITE, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.7, gloss: true });
  paint(d, oval(tip.x + 0.4, tip.y - 1.4, r, r * (open >= 1 ? 1.05 : 0.6), 18), EYE, { alpha: 1, shadow: 0.35, hatch: 0, line: 0.6, gloss: true });
  d.pen.dot(tip.x - 1.6, tip.y - 3.2 + (open >= 1 ? 0 : 1.6), 1.2, PAPER_FILL, 0.9);
  if (open < 1) d.pen.stroke([pt(tip.x - r, tip.y - 1.6), pt(tip.x, tip.y - 3.4), pt(tip.x + r, tip.y - 1.6)], 1, d.ink, 0.9, false);
}

/** Points built in a chela's own frame (fingers along +x), mirrored if `flip`, turned by `dir`, set at `c`. */
function place(pts: readonly Pt[], c: Pt, dir: number, flip: boolean): Pt[] {
  const cs = Math.cos(dir);
  const sn = Math.sin(dir);
  return pts.map((p) => {
    const y = flip ? -p.y : p.y;
    return pt(c.x + p.x * cs - y * sn, c.y + p.x * sn + y * cs);
  });
}

/** A great chela: the palm a hematite shield crusted with kidney ore and a few stones, its fixed finger and hinged dactyl, toothed, dark at the tips. */
function chela(d: Draw, c: Pt, rx: number, ry: number, dir: number, open: number, flip: boolean): void {
  const at = (pts: readonly Pt[]): Pt[] => place(pts, c, dir, flip);
  const len = rx * 1.3;
  const pollex = ribbon(cub(pt(rx * 0.7, ry * 0.35), pt(rx + len * 0.4, ry * 0.5), pt(rx + len * 0.8, ry * 0.4), pt(rx + len, -ry * 0.05), 10), (u) => ry * 0.85 - ry * 0.7 * u).shape;
  const dactyl = ribbon(cub(pt(rx * 0.6, -ry * 0.55), pt(rx + len * 0.3, -ry * (1 + open * 1.4)), pt(rx + len * 0.8, -ry * (0.8 + open * 1.3)), pt(rx + len * 1.02, -ry * (0.2 + open * 0.8)), 12), (u) => ry * 0.8 - ry * 0.66 * u).shape;
  d.pen.fill(at([pt(rx * 0.75, ry * 0.1), pt(rx + len * 0.95, -ry * 0.05), pt(rx + len, -ry * (0.2 + open * 0.8)), pt(rx * 0.75, -ry * 0.5)]), TIP, 0.92);
  for (const [shape, color] of [[pollex, HEMATITE], [dactyl, mix(HEMATITE, CHITIN, 0.3)]] as const) {
    const s = at(shape);
    paint(d, s, color, { alpha: 1, shadow: 0.55, hatch: 0.15, line: 0.9, gloss: true });
    d.pen.clipped(s, () => dab(d, at(oval(rx + len, -ry * 0.1, len * 0.4, ry * 2.4, 12)), TIP, 0.8, 2));
  }
  for (let k = 1; k <= 6; k++) {
    const u = k / 7.2;
    const p = at([pt(rx + len * u, ry * 0.05)])[0]!;
    d.pen.dot(p.x, p.y, 1.1, PAPER_FILL, 0.85);
  }
  const palm = at(oval(0, 0, rx, ry, 24));
  paint(d, palm, HEMATITE, { alpha: 1, shadow: 0.6, hatch: 0.2, line: 1.1, gloss: true, cross: true });
  d.pen.clipped(palm, () => d.pen.stipple(palm, Math.round(rx * ry * 0.8), () => 0.5, 0.5, mix(HEMATITE, SHADOW, 0.5)));
  kidneyOre(d, at([pt(-rx * 0.25, -ry * 0.25)])[0]!, Math.min(rx, ry) * 0.42, 6, Math.round(rx * 13));
  const stone = at([pt(rx * 0.25, -ry * 0.7)])[0]!;
  talusStone(d, stone.x, stone.y, rx * 0.5, Math.round(rx * 17), false);
  gleam(d, at([pt(-rx * 0.6, -ry * 0.5), pt(-rx * 0.1, -ry * 0.78), pt(rx * 0.4, -ry * 0.7)]), 1.4, 0.5);
}

/** One jointed segment of a leg or claw arm, painted, a hematite plate along its top. */
function segment(d: Draw, a: Pt, b: Pt, w0: number, w1: number, color: string): void {
  paint(d, capsule(a, b, w0, w1), color, { alpha: 1, shadow: 0.6, hatch: 0.18, line: 0.9 });
  const n = pt(-(b.y - a.y), b.x - a.x);
  const l = Math.hypot(n.x, n.y) || 1;
  const off = (w0 * 0.28) / l;
  const side = n.y > 0 ? -1 : 1;
  d.pen.stroke([pt(a.x + (b.x - a.x) * 0.15 + n.x * off * side, a.y + (b.y - a.y) * 0.15 + n.y * off * side), pt(a.x + (b.x - a.x) * 0.85 + n.x * off * side, a.y + (b.y - a.y) * 0.85 + n.y * off * side)], w0 * 0.3, mix(HEMATITE, color, 0.25), 0.85, false);
}

/** A walking leg on side `s`, huge: merus up to the knee crusted with a stone or two, carpus and propodus down, the dactyl a dark spike, bristled. */
function leg(d: Draw, s: 1 | -1, base: Pt, knee: Pt, tip: Pt, depth: number): void {
  const color = mix(mix(CHITIN, CHITIN_DARK, 0.25), SHADOW, depth * 0.1);
  const ankle = pt(knee.x + (tip.x - knee.x) * 0.5 + s * 5, knee.y + (tip.y - knee.y) * 0.5);
  segment(d, base, knee, 20, 17, color);
  talusStone(d, base.x + (knee.x - base.x) * 0.5, base.y + (knee.y - base.y) * 0.5 - 8, 9 + depth, 9500 + depth * 7 + (s > 0 ? 1 : 0), false);
  segment(d, knee, ankle, 16, 13, color);
  const dactyl = ribbon([ankle, pt((ankle.x + tip.x) / 2 + s * 2, (ankle.y + tip.y) / 2), tip], (u) => 12 - 10.5 * u).shape;
  paint(d, dactyl, mix(color, TIP, 0.55), { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.8, gloss: true });
  setae(d, ankle, tip, 5, 5, s === 1 ? -1 : 1, 0.6);
  d.pen.hair([pt(knee.x - 6, knee.y + 3), pt(knee.x + 6, knee.y + 4)], 0.8, mix(color, SHADOW, 0.6), 0.7);
}

/** Risen: four pairs of legs splayed out to the sides, the far pairs darker. */
function legs(d: Draw, b: number, f: number): void {
  for (let i = 3; i >= 0; i--) {
    for (const s of [-1, 1] as const) {
      const step = (i + (s > 0 ? 0 : 1) + f) % 3 === 0 ? -1.5 : 0;
      // Arched as a crab stands: knee out past the shell and up, the leg coming down to a tip under its flank.
      const base = pt(s * (84 - i * 12), b - 6 + i * 2);
      const knee = pt(s * (126 + i * 8.5), b - 30 + i * 9 + step);
      const tip = pt(s * (96 + i * 17), -1 + step * 0.4);
      leg(d, s, base, knee, tip, i);
    }
  }
}

/** The claws, forward: the arms out from the face, the great claw on its right, both raised and opening as it wakes; asleep, the great one lies on the floor in front. */
function claws(d: Draw, b: number, s: Stance, f: number): void {
  const k = s.claw;
  if (k > 0.5) {
    segment(d, pt(-40, b - 2), pt(-62, b - 10), 15, 13, CHITIN);
    segment(d, pt(-62, b - 10), pt(-72, b), 13, 14, CHITIN);
    chela(d, pt(-86, b + 2), 16, 12, Math.PI + 0.35 - f * 0.02, 0.45 * k, true);
  }
  const lift = k * 10;
  if (k > 0.5) {
    segment(d, pt(40, b - 4), pt(70, b - 14), 22, 19, CHITIN);
    segment(d, pt(70, b - 14), pt(82, b - 4), 19, 21, CHITIN);
  }
  chela(d, pt(k > 0.5 ? 98 : 92, k > 0.5 ? b - lift + 4 : -17 - lift), 24, 18, k > 0.5 ? -0.35 + f * 0.02 : 0.12, 0.05 + 0.5 * k, false);
}

/** The gravel banked round it where it lies, burying its rim, legs and half its claw, a few fallen stones on the floor in front. */
function apron(d: Draw, f: number): void {
  const top = [...cub(pt(-160, 0.5), pt(-150, -30), pt(-110, -28), pt(-60, -14), 14), ...cub(pt(-60, -14), pt(-30, -6), pt(30, -6), pt(60, -12), 10).slice(1), ...cub(pt(60, -12), pt(100, -22), pt(150, -24), pt(160, 0.5), 14).slice(1)];
  const shape = [...top, pt(160, 1.5), pt(-160, 1.5)];
  paint(d, shape, GRAVEL, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.9 });
  d.pen.clipped(shape, () => {
    d.pen.stipple(shape, 420, () => 0.6, 0.65, TALUS_STYLE.grain);
    d.pen.stipple(shape, 160, (_, y) => (y < -10 ? 0.7 : 0.2), 0.55, mix(TALUS_STYLE.soil, '#fff0dc', 0.4));
  });
  for (const [x, s, seed] of [[-138, 22, 9601], [-112, 14, 9602], [-70, 16, 9603], [-36, 10, 9604], [44, 12, 9605], [72, 18, 9606], [128, 24, 9607], [150, 12, 9608]] as const) talusStone(d, x, -s * 0.42 + 0.5 + (f === 2 ? 0.2 : 0), s, seed, true);
}

/** Stones tumbling off its back as it stirs, mid-fall over its shoulders, the trail of their fall and dust where they left. */
function tumbling(d: Draw, b: number, f: number): void {
  const fallen = STONES.filter((_, i) => TUMBLED.has(i));
  fallen.forEach((st, i) => {
    const from = stoneAt(b, st);
    const side = st.x + 8 < 0 ? -1 : 1;
    const t = 0.45 + i * 0.18 + f * 0.05;
    const c = pt(from.x + side * (24 + t * 26), from.y + t * t * 70);
    sporeCloud(d, pt(from.x + side * 6, from.y + 4), 14, 0.9, TALUS_STYLE.soil);
    d.pen.hair(cub(from, pt(from.x + side * 16, from.y - 4), pt(c.x - side * 8, c.y - 14), pt(c.x, c.y - st.s * 0.4), 10), 0.7, d.ink, 0.35);
    talusStone(d, c.x, c.y, st.s * 0.9, st.seed, false);
  });
}

/** Gravel streaming off it as it walks: pebbles pouring off each side of its rim and down past its legs, dust at the foot of each stream. */
function streams(d: Draw, b: number, f: number): void {
  const rng = createRng(9700 + f);
  for (const s of [-1, 1]) {
    const x0 = s * (HALF - 14);
    for (let k = 0; k < 5; k++) {
      const t = (k + f / 3) / 5;
      const p = pt(x0 + s * (t * 12 + rng() * 6), b - 16 + t * (Math.abs(b) + 4));
      talusStone(d, p.x, p.y, 6 + rng() * 4, 9800 + k * 3 + (s > 0 ? 1 : 0), false);
    }
    sporeCloud(d, pt(x0 + s * 12, -6), 18, 0.9, TALUS_STYLE.soil);
  }
  for (let k = 0; k < 3; k++) {
    const p = pt(-50 + k * 45 + rng() * 10, b + 12 + rng() * 16);
    talusStone(d, p.x, p.y, 5 + rng() * 3, 9900 + k, false);
  }
}

/** A leg tip pushing out of the gravel as it stirs. */
function legTip(d: Draw, f: number): void {
  const tip = pt(-146, -2 - f * 0.6);
  const base = pt(-132, -24);
  const shape = ribbon([base, pt(-142, -14), tip], (u) => 11 - 9.5 * u).shape;
  paint(d, shape, mix(CHITIN, TIP, 0.45), { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.8, gloss: true });
  setae(d, base, tip, 4, 4, 1, 0.6);
  talusStone(d, -128, -8, 14, 9620, true);
}

/** The Rockslide facing right, in a pose: asleep under its heap, stirring, or risen and awake. */
export function drawRockslide(d: Draw, pose: RockslidePose): void {
  const s = STANCES[pose];
  const b = -s.lift - 6;
  const f = d.f;
  dab(d, oval(0, -1, 156, 6, 30), SHADOW, 0.24, 4);
  if (pose === 'awake') {
    legs(d, b, f);
    paint(d, oval(0, b + 2, 92, 12, 24), CHITIN_DARK, { alpha: 1, shadow: 0.6, hatch: 0.2, line: 0.9 });
  }
  const body = (): void => {
    rim(d, b);
    heap(d, b, pose);
    face(d, b);
    for (const sx of [-1, 1] as const) eye(d, b, sx, s.eye, f);
    claws(d, b, s, f);
  };
  // Sunk down, whatever is below the floor is out of sight.
  if (pose === 'awake') body();
  else d.pen.clipped([pt(-170, -190), pt(170, -190), pt(170, 0.5), pt(-170, 0.5)], body);
  if (pose !== 'awake') apron(d, f);
  if (pose === 'stir') {
    legTip(d, f);
    tumbling(d, b, f);
  }
  if (pose === 'awake') streams(d, b, f);
}
