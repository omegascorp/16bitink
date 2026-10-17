import { createRng } from '../../logic/rng';
import { cub, oval, pt, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blob, FLESH, pore, sporeCloud, tube, veins } from './flesh';
import { motherRoots } from './motherRoots';

/**
 * The Mother Mycel (Mycel's giant, hostile, inked in red): the moon's oldest
 * fungus, a heart of flesh the size of a house grown into a cavern, every
 * cord of mycelium in the region running back to it. It pumps: water and
 * spores are drawn up through its roots and forced out through chimneys on
 * its crown, so it swells and slackens like a heart. Two see-through
 * bladders at its shoulders slosh with water (the caps are its children,
 * and look it); its flesh is pitted with pores that glow as it fills.
 * Drawn with the origin at the middle of its base on the chamber floor.
 */
export const MOTHER_ART = { w: 320, h: 240, ox: 160, oy: 236 } as const;

type Beat = 0 | 1 | 2;

/** How swollen it is at each beat. */
const SWELL: Readonly<Record<Beat, number>> = { 0: 1, 1: 1.035, 2: 1.07 };
/** How bright its pores are at each beat. */
const LIT: Readonly<Record<Beat, number>> = { 0: 0.2, 1: 0.55, 2: 1 };

const BLADDER = '#c87aa6';
const WATER = '#7fb8c4';

/** Buttresses: flared roots where its base grips the floor. */
function buttresses(d: Draw): void {
  for (const [x0, x1, y0, w] of [[-44, -82, -46, 22], [44, 84, -44, 22], [-18, -36, -26, 18], [20, 40, -26, 18]] as const) {
    const pts = cub(pt(x0, y0), pt(x0 + (x1 - x0) * 0.3, y0 + 18), pt(x1 * 0.95, -8), pt(x1, 0), 14);
    tube(d, pts, (u) => w - u * (w - 8), mix(FLESH.heart, FLESH.pale, 0.2));
  }
}

/** One lobe of its flesh: where it sits, its size, and a seed for its lumps and pores. */
interface Lobe {
  readonly c: Pt;
  readonly rx: number;
  readonly ry: number;
  readonly seed: number;
  /** How many pores pit it. */
  readonly pores: number;
}

/** The lobes, back to front: a knot on the crown, the broad base fused into the floor, the great main lobe, two low ones in front. */
const LOBES: readonly Lobe[] = [
  { c: pt(14, -164), rx: 40, ry: 30, seed: 21, pores: 4 },
  { c: pt(0, -40), rx: 104, ry: 42, seed: 22, pores: 6 },
  { c: pt(-8, -104), rx: 74, ry: 80, seed: 23, pores: 12 },
  { c: pt(-52, -50), rx: 42, ry: 34, seed: 24, pores: 4 },
  { c: pt(50, -56), rx: 40, ry: 32, seed: 25, pores: 4 },
];

/** Creases of gathered flesh across a lobe, curving with its form: arcs at different depths, each a dark fold with a lit ridge over it. */
function creases(d: Draw, l: Lobe, shape: readonly Pt[]): void {
  const rng = createRng(l.seed * 7);
  d.pen.clipped(shape, () => {
    for (let k = 0; k < 6; k++) {
      const r = 0.35 + rng() * 0.55;
      const a0 = Math.PI * (0.05 + rng() * 0.5);
      const a1 = a0 + Math.PI * (0.35 + rng() * 0.35);
      const arc = Array.from({ length: 12 }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / 11 + Math.PI * (k % 2);
        return pt(l.c.x + Math.cos(a) * l.rx * r, l.c.y + Math.sin(a) * l.ry * r * 0.9);
      });
      const w = Math.max(0.6, l.rx / 60);
      d.pen.hair(arc, w, mix(FLESH.heart, SHADOW, 0.6), 0.55);
      d.pen.hair(arc.map((p) => pt(p.x - 1.2, p.y - 1.4)), w, mix(FLESH.heart, '#fff2d8', 0.45), 0.4);
    }
  });
}

/** A lobe painted: the flesh, mottled, creased, veined and pitted with pores lit by the beat (none round the heart's window). */
function lobe(d: Draw, l: Lobe, lit: number): void {
  const shape = blob(l.c, l.rx, l.ry, 0.1, l.seed, 36);
  paint(d, shape, FLESH.heart, { alpha: 1, shadow: 0.6, hatch: 0.16, line: 1 });
  d.pen.clipped(shape, () => {
    dab(d, oval(l.c.x + l.rx * 0.2, l.c.y + l.ry * 0.5, l.rx * 0.7, l.ry * 0.4, 18), FLESH.vein, 0.22, 4);
    dab(d, oval(l.c.x - l.rx * 0.35, l.c.y - l.ry * 0.45, l.rx * 0.4, l.ry * 0.25, 16), FLESH.raw, 0.2, 4);
  });
  d.pen.stipple(shape, Math.round(l.rx * 1.2), () => 0.6, 0.6, mix(FLESH.heart, SHADOW, 0.4));
  creases(d, l, shape);
  const rng = createRng(l.seed);
  d.pen.clipped(shape, () => {
    veins(d, pt(l.c.x - l.rx * 0.2, l.c.y - l.ry * 0.8), pt(l.c.x - l.rx * 0.8, l.c.y + l.ry * 0.3), FLESH.vein, l.rx / 70, 0.6, 3, rng);
    veins(d, pt(l.c.x + l.rx * 0.3, l.c.y - l.ry * 0.7), pt(l.c.x + l.rx * 0.85, l.c.y + l.ry * 0.4), FLESH.vein, l.rx / 70, 0.6, 3, rng);
    for (let k = 0; k < l.pores; k++) {
      const a = rng() * Math.PI * 2;
      const r = 0.3 + rng() * 0.55;
      const c = pt(l.c.x + Math.cos(a) * l.rx * r, l.c.y + Math.sin(a) * l.ry * r);
      if (Math.hypot(c.x - CORE.x, c.y - CORE.y) < 42) continue;
      // Pores come in little clusters, as a sponge's do.
      for (let j = 0; j < 3; j++) pore(d, pt(c.x + (rng() - 0.5) * 9, c.y + (rng() - 0.5) * 7), 1.4 + rng() * 2, lit * (0.6 + rng() * 0.4), k % 4 === 0 ? FLESH.glowTeal : FLESH.pore);
    }
  });
}

/** A shoulder bladder: see-through flesh with a waterline sloshing in it, threads of light hanging inside. */
function bladder(d: Draw, c: Pt, rx: number, ry: number, lit: number, seed: number): void {
  const shape = blob(c, rx, ry, 0.1, seed, 30);
  glow(d.pen.ctx, c, rx * 1.2, FLESH.glowTeal, 0.12 + lit * 0.18);
  paint(d, shape, BLADDER, { alpha: 0.6, shadow: 0.45, hatch: 0.12, line: 0.9, gloss: true });
  d.pen.clipped(shape, () => {
    // The water inside, its surface tipped a little by the beat.
    const level = c.y - ry * 0.05 + (1 - lit) * ry * 0.15;
    const water = [pt(c.x - rx * 1.2, level + lit * 2), pt(c.x + rx * 1.2, level - lit * 2), pt(c.x + rx * 1.2, c.y + ry * 1.2), pt(c.x - rx * 1.2, c.y + ry * 1.2)];
    d.pen.fill(water, WATER, 0.45);
    d.pen.hair([water[0]!, water[1]!], 0.7, PAPER_FILL, 0.8);
    const rng = createRng(seed);
    for (let k = 0; k < 6; k++) {
      const x = c.x - rx * 0.6 + k * rx * 0.24;
      const top = c.y - ry * 0.75 + rng() * ry * 0.2;
      const end = pt(x + (rng() - 0.5) * 6, c.y + ry * (0.3 + rng() * 0.4));
      d.pen.hair([pt(x, top), pt(x + 2, (top + end.y) / 2), end], 0.5, FLESH.pale, 0.7);
      glow(d.pen.ctx, end, 3 + lit * 3, FLESH.glowTeal, 0.4 + lit * 0.4);
      d.pen.dot(end.x, end.y, 0.9, '#e9fff8', 0.6 + lit * 0.4);
    }
  });
  gleam(d, cub(pt(c.x - rx * 0.7, c.y - ry * 0.1), pt(c.x - rx * 0.7, c.y - ry * 0.6), pt(c.x - rx * 0.35, c.y - ry * 0.85), pt(c.x - rx * 0.05, c.y - ry * 0.9), 10), 1.6, 0.7);
}

/** Where the heart's window sits on the main lobe. */
const CORE = pt(-6, -110);

/** The heart within: a round window of thin membrane, ribbed like a paper lantern, a knot of glowing threads behind it, bright as it fills. */
function core(d: Draw, lit: number): void {
  const c = CORE;
  const r = 27 + lit * 3;
  glow(d.pen.ctx, c, r * 1.6, FLESH.pore, 0.2 + lit * 0.45);
  // A thick rim of paler flesh round it, as scar tissue rings a wound that never closed.
  const rim = blob(c, r + 7, r + 6, 0.12, 31, 28);
  paint(d, rim, mix(FLESH.heart, FLESH.pale, 0.3), { alpha: 1, shadow: 0.55, hatch: 0.2, line: 0.9 });
  const win = blob(c, r, r * 0.95, 0.06, 32, 28);
  paint(d, win, mix(FLESH.heart, FLESH.pore, 0.3 + lit * 0.45), { alpha: 0.9, shadow: 0.4, hatch: 0, line: 0.8, gloss: true });
  d.pen.clipped(win, () => {
    const rng = createRng(99);
    for (let k = 0; k < 10; k++) {
      const a = rng() * Math.PI * 2;
      const b = a + 1.5 + rng() * 2;
      const rr = 6 + rng() * r * 0.8;
      d.pen.hair([pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr), pt(c.x + Math.cos((a + b) / 2) * 4, c.y + Math.sin((a + b) / 2) * 4), pt(c.x + Math.cos(b) * rr, c.y + Math.sin(b) * rr)], 0.8, mix(FLESH.pore, '#ffffff', lit * 0.5), 0.5 + lit * 0.4);
    }
    glow(d.pen.ctx, c, 10 + lit * 8, '#fff6d8', 0.4 + lit * 0.5);
    // The membrane's ribs, curving round the form like a lantern's.
    for (const k of [-0.6, -0.2, 0.2, 0.6]) d.pen.hair(cub(pt(c.x + k * r * 0.4, c.y - r), pt(c.x + k * r * 1.3, c.y - r * 0.4), pt(c.x + k * r * 1.3, c.y + r * 0.4), pt(c.x + k * r * 0.4, c.y + r), 10), 0.6, mix(FLESH.heart, SHADOW, 0.5), 0.55);
  });
  gleam(d, cub(pt(c.x - r * 0.7, c.y - r * 0.2), pt(c.x - r * 0.7, c.y - r * 0.6), pt(c.x - r * 0.4, c.y - r * 0.8), pt(c.x - r * 0.15, c.y - r * 0.85), 8), 1.4, 0.7);
}

/** A chimney on the crown: a short puckered tube; open and venting spores when full. */
function chimney(d: Draw, at: Pt, h: number, lean: number, beat: Beat): void {
  const top = pt(at.x + lean, at.y - h);
  tube(d, cub(at, pt(at.x, at.y - h * 0.5), pt(top.x, top.y + h * 0.3), top, 8), (u) => 16 - u * 4, mix(FLESH.heart, FLESH.raw, 0.4));
  const open = beat === 2;
  const lips = oval(top.x, top.y, open ? 8 : 6.4, open ? 3.6 : 2.6, 16);
  paint(d, lips, FLESH.raw, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.7 });
  d.pen.fill(oval(top.x, top.y + 0.3, open ? 5 : 1.6, open ? 2 : 0.8, 12), '#2a1426', 0.95);
  if (beat >= 1) {
    sporeCloud(d, pt(top.x + lean * 0.5, top.y - 8 - beat * 5), 6 + beat * 7, 0.6 + beat * 0.2);
    if (beat === 2) sporeCloud(d, pt(top.x + lean * 2.6, top.y - 12), 15, 0.8);
  }
}

/** The Mother at a `beat`: 0 at rest, 1 swelling, 2 full (pores bright, its chimneys venting spores). */
export function drawMotherMycel(d: Draw, beat: Beat): void {
  const { ctx } = d.pen;
  const lit = LIT[beat];
  if (beat === 2) glow(ctx, pt(0, -110), 150, FLESH.pore, 0.14);
  motherRoots(d, beat);
  dab(d, oval(0, -2, 120, 7, 30), SHADOW, 0.2, 3);
  buttresses(d);
  ctx.save();
  // The beat swells everything above its footing.
  const s = SWELL[beat];
  ctx.translate(0, -8);
  ctx.scale(s, s);
  ctx.translate(0, 8);
  for (const [x, h, lean] of [[-34, 22, -6], [4, 28, 2], [40, 20, 7]] as const) chimney(d, pt(x * 1.1 + 10, -178 + Math.abs(x) * 0.25), h + 2, lean, beat);
  bladder(d, pt(-74, -128), 38, 46, lit, 11);
  bladder(d, pt(76, -118), 34, 40, lit, 12);
  for (const l of LOBES) lobe(d, l, lit);
  core(d, lit);
  gleam(d, cub(pt(-70, -110), pt(-68, -150), pt(-50, -175), pt(-28, -182), 14), 2.2, 0.5);
  ctx.restore();
}
