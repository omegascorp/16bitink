import { cub, oval, pt, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { FLESH, sporeCloud, veins } from './flesh';

/**
 * The puffball (a spitter, hostile, inked in red): a squat sac of fungal
 * flesh on a short foot, rooted to a cave floor by pale threads. It's a
 * spore pocket that learned to aim: it pumps its sac full of air and dry
 * spores, and its pleats are what let it swell, opening out like a
 * drawstring bag. The puckered vent on top fires the charge. A ring of dark
 * light pits round the vent is how it notices you move against the lamp.
 * Drawn with the origin at the middle of its foot on the floor (y = 0),
 * up is -y.
 */
export const PUFFBALL_ART = { w: 48, h: 48, ox: 24, oy: 44 } as const;
export type PuffPose = 'idle' | 'swell' | 'spit' | 'burst';

export const GLOB_ART = { w: 16, h: 16, ox: 8, oy: 8 } as const;

/** How the sac sits in each pose: its middle height, half-width, half-height, how slack (1) or taut (0) it is. */
const SAC: Readonly<Record<Exclude<PuffPose, 'burst'>, { cy: number; rx: number; ry: number; pleat: number }>> = {
  idle: { cy: -14.5, rx: 13.5, ry: 9.5, pleat: 1 },
  swell: { cy: -19, rx: 17, ry: 14, pleat: 0.1 },
  spit: { cy: -14.5, rx: 14, ry: 9, pleat: 0.75 },
};

/** Pale root threads spreading over the floor from the foot. */
function rootlets(d: Draw): void {
  for (const [x, len, s] of [[-3, 13, -1], [3, 14, 1], [-1, 9, -1], [2, 8, 1]] as const) {
    const end = pt(x + s * len, 1.2 + (len % 3) * 0.3);
    const mid = pt(x + s * len * 0.5, -0.6);
    d.pen.stroke([pt(x, -1), mid, end], 0.9, d.ink, 0.75, false);
    d.pen.hair([pt(x, -1.2), mid, end], 0.45, FLESH.pale, 0.9);
  }
}

/** The foot: a short knobbled stem, wider where it grips the floor. */
function foot(d: Draw, top: number): void {
  const shape = [pt(-5.6, 0.4), ...cub(pt(-5.6, 0.4), pt(-3.6, -2), pt(-4.6, top + 2), pt(-3.8, top), 6), pt(3.8, top), ...cub(pt(3.8, top), pt(4.6, top + 2), pt(3.6, -2), pt(5.8, 0.4), 6)];
  paint(d, shape, mix(FLESH.pale, FLESH.sac, 0.35), { alpha: 1, shadow: 0.55, hatch: 0.2, line: 0.7 });
  for (const y of [-2, top + 2.2]) d.pen.hair([pt(-3.6, y), pt(3.4, y + 0.4)], 0.4, mix(FLESH.sac, SHADOW, 0.5), 0.7);
}

/** The sac's outline: a lumpy squat bag, drawn in to the foot below, a touch flat on top round the vent. */
function sacShape(cy: number, rx: number, ry: number, slack: number, f: number): Pt[] {
  const pts: Pt[] = [];
  const n = 32;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = Math.sin(a);
    const pinch = s > 0 ? 1 - 0.42 * Math.pow(s, 3) : 1 - 0.06 * Math.pow(-s, 4);
    // Slack, the bag sags in lobes; taut, it's nearly round.
    const lump = 1 + slack * (0.045 * Math.sin(a * 3 + 0.8) + 0.03 * Math.sin(a * 7 + 2.1)) + 0.008 * Math.sin(a * 5 + f);
    pts.push(pt(Math.cos(a) * rx * pinch * lump, cy + s * ry * (s > 0 ? 1.1 : 1) * lump));
  }
  return pts;
}

/** Bellows folds round the lower sac, from the foot up: what lets it swell. Deep when slack, smoothed out when taut. */
function folds(d: Draw, sac: readonly Pt[], cy: number, rx: number, ry: number, k: number): void {
  d.pen.clipped(sac, () => {
    for (let i = -4; i <= 4; i++) {
      const u = i / 4.4;
      const bot = pt(u * 4, cy + ry * 1.05);
      const top = pt(u * rx * 1.05, cy - ry * (0.05 + 0.25 * (1 - Math.abs(u))) + (i % 2) * 1.5);
      const bow = pt(u * rx * 0.9, cy + ry * 0.6);
      const line = cub(bot, bow, bow, top, 10);
      d.pen.hair(line, 0.3 + 0.45 * k, mix(FLESH.sac, SHADOW, 0.6), 0.25 + 0.6 * k);
      if (k > 0.3) d.pen.hair(line.map((p) => pt(p.x - 0.9, p.y - 0.2)), 0.5, mix(FLESH.sac, PAPER_FILL, 0.5), 0.5 * k);
    }
  });
}

/** The vent on top: puckered shut (lips drawn in with radial creases), or open with raw flesh inside. */
function vent(d: Draw, at: Pt, open: boolean, r: number): void {
  if (open) {
    const lips = oval(at.x, at.y, r * 1.3, r * 0.75, 16);
    paint(d, lips, FLESH.raw, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.6 });
    d.pen.fill(oval(at.x, at.y + 0.2, r * 0.85, r * 0.42, 14), '#2a1426', 0.95);
    return;
  }
  const nub = [pt(at.x - r, at.y + r * 0.5), ...cub(pt(at.x - r, at.y + r * 0.5), pt(at.x - r * 0.6, at.y - r * 0.7), pt(at.x + r * 0.6, at.y - r * 0.7), pt(at.x + r, at.y + r * 0.5), 8)];
  paint(d, nub, mix(FLESH.sac, FLESH.raw, 0.55), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.6 });
  for (let i = -2; i <= 2; i++) d.pen.hair([pt(at.x + i * 0.35, at.y - r * 0.25), pt(at.x + i * r * 0.42, at.y + r * 0.45)], 0.35, mix(FLESH.raw, SHADOW, 0.5), 0.85);
}

/**
 * The crown round the vent: a ring of short fleshy horns (as Mycel's caps
 * wear), each with a dark light pit at its foot. Seen from the side, the
 * near ones overlap the vent; `spread` 0..1 splays them as the sac fills.
 */
function crown(d: Draw, top: Pt, rx: number, spread: number, back: boolean): void {
  const ring = rx * (0.36 + spread * 0.12);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.2;
    const behind = Math.sin(a) < 0;
    if (behind !== back) continue;
    const base = pt(top.x + Math.cos(a) * ring, top.y + 1.2 + Math.sin(a) * ring * 0.32);
    const lean = Math.cos(a) * (0.5 + spread * 0.35);
    const h = 3.6 - spread * 1.2;
    const tip = pt(base.x + lean * h, base.y - h);
    const horn = [pt(base.x - 1.3, base.y + 0.4), pt(tip.x - 0.3, tip.y + 0.3), tip, pt(tip.x + 0.4, tip.y + 0.5), pt(base.x + 1.3, base.y + 0.4)];
    paint(d, horn, behind ? mix(FLESH.raw, SHADOW, 0.25) : mix(FLESH.sac, FLESH.raw, 0.4), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.5 });
    if (!behind) {
      d.pen.fill(oval(base.x, base.y + 1.3, 0.85, 0.65, 8), '#2a1426', 0.92);
      d.pen.dot(base.x - 0.25, base.y + 1.05, 0.25, PAPER_FILL, 0.9);
    }
  }
}

/** The sac in one of its whole poses: painted flesh mottled violet low down, veins, folds, its bloom of spores, crown and vent. */
function sac(d: Draw, pose: Exclude<PuffPose, 'burst'>): void {
  const { cy, rx, ry, pleat } = SAC[pose];
  const shape = sacShape(cy, rx, ry, pleat, d.f);
  const taut = pose === 'swell';
  const top = pt(0, cy - ry);
  crown(d, top, rx, 1 - pleat, true);
  paint(d, shape, taut ? mix(FLESH.sac, FLESH.raw, 0.2) : FLESH.sac, { alpha: 1, shadow: 0.6, hatch: 0.22, line: 0.8, gloss: taut });
  d.pen.clipped(shape, () => {
    // Violet seeping up from the foot, as the peat's colour runs into it.
    dab(d, oval(0, cy + ry * 1.1, rx * 1.1, ry * 0.7, 18), FLESH.vein, 0.28, 2.5);
    // Spores bloom on the upper sac like dust on a plum.
    dab(d, oval(-rx * 0.15, cy - ry * 0.7, rx * 0.75, ry * 0.4, 16), mix(FLESH.spore, PAPER_FILL, 0.3), taut ? 0.18 : 0.4, 2);
    d.pen.stipple(shape, 80, (_, y) => Math.max(0, (cy - y) / ry + 0.1), 0.35, mix(FLESH.spore, '#7a6a3a', 0.35));
    d.pen.stipple(shape, 26, () => 0.7, 0.55, mix(FLESH.sac, SHADOW, 0.35));
  });
  // Veins show through the skin as it stretches thin.
  if (pleat < 0.9) {
    d.pen.clipped(shape, () => {
      for (const s of [-1, 1]) veins(d, pt(s * 2, cy - ry * 0.75), pt(s * rx * 0.9, cy + ry * 0.6), FLESH.vein, 0.6, 0.35 + (1 - pleat) * 0.4, 3);
    });
  }
  folds(d, shape, cy, rx, ry, pleat);
  if (taut) gleam(d, cub(pt(-rx * 0.66, cy - ry * 0.15), pt(-rx * 0.64, cy - ry * 0.65), pt(-rx * 0.35, cy - ry * 0.85), pt(-rx * 0.12, cy - ry * 0.9), 8), 1.2, 0.75);
  vent(d, pt(0, top.y + 0.6), pose === 'spit', taut ? 2 : 2.4);
  crown(d, top, rx, 1 - pleat, false);
}

/** The charge leaving the vent: a jet of spores shooting up and forward, streaked where it's fastest. */
function puff(d: Draw, from: Pt): void {
  const tip = pt(from.x + 9, from.y - 12);
  for (let k = 0; k < 4; k++) d.pen.hair([pt(from.x + (k - 1.5) * 1.2, from.y - 1), pt(tip.x + (k - 1.5) * 2.6 - 2, tip.y + 3)], 0.45, mix(FLESH.spore, '#4a3a1a', 0.6), 0.2);
  sporeCloud(d, pt(from.x + 3, from.y - 5), 5, 0.9);
  sporeCloud(d, tip, 8, 1);
}

/** Burst: the skin torn open and slumped round the foot, rags hanging over it, a cloud of spores where it was. */
function burst(d: Draw): void {
  sporeCloud(d, pt(0, -18), 18, 0.9);
  foot(d, -4);
  // The empty skin: a flattened rag with a torn, ragged top edge.
  const tear: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = 14 - i * 2.8;
    tear.push(pt(x + Math.sin(i * 2.3) * 0.8, -8.5 - [0, 4.2, 1, 2.4, 0.4, 5.4, 1.6, 0.2, 3.2, 0.8, 0][i]! - Math.sin(i * 1.7 + d.f) * 0.4));
  }
  const rag = [pt(15, -2.6), ...cub(pt(15, -2.6), pt(16, -6), pt(15.4, -8), pt(14, -9), 4), ...tear, ...cub(pt(-14, -9), pt(-15.4, -8), pt(-16, -6), pt(-15, -2.6), 4), ...cub(pt(-15, -2.6), pt(-6, -0.6), pt(6, -0.6), pt(15, -2.6), 8)];
  paint(d, rag, mix(FLESH.sac, SHADOW, 0.12), { alpha: 1, shadow: 0.65, hatch: 0.3, line: 0.8 });
  // Inside the tear: the raw lining and the last of the spores in it.
  const lining = [pt(-11, -8.4), pt(11, -8.4), pt(9, -5.4), pt(-9, -5.4)];
  paint(d, lining, mix(FLESH.raw, SHADOW, 0.3), { alpha: 0.9, shadow: 0.3, hatch: 0, line: 0 });
  d.pen.stipple(lining, 30, () => 0.8, 0.4, FLESH.spore);
  for (const x of [-9, -2, 6]) d.pen.hair([pt(x, -8.6), pt(x + 1, -3)], 0.4, mix(FLESH.sac, SHADOW, 0.55), 0.7);
  // A flap of skin hanging over the side, and a shred blown loose.
  const flap = [pt(10, -9), pt(13.6, -10.6), pt(15.6, -6), pt(13, -4.4)];
  paint(d, flap, FLESH.sac, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.6 });
  const shred = [pt(-12, -24), pt(-8.6, -25.4), pt(-9.4, -22.6), pt(-12.6, -21.6)];
  paint(d, shred, FLESH.sac, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.55 });
}

/** The puffball in a pose: `idle` about a tile tall; `swell` bigger and taut; `spit` with the vent open and a charge leaving; `burst`, its skin torn. */
export function drawPuffball(d: Draw, pose: PuffPose): void {
  rootlets(d);
  if (pose === 'burst') {
    burst(d);
    return;
  }
  const { cy, ry } = SAC[pose];
  if (pose === 'swell') glow(d.pen.ctx, pt(0, cy - ry), 6, FLESH.spore, 0.25);
  foot(d, -5);
  sac(d, pose);
  if (pose === 'spit') puff(d, pt(0, cy - ry - 1));
  else if (pose === 'idle') sporeCloud(d, pt(0, cy - ry - 3), 3.5, 0.35);
}

/** The spat glob: a clot of spores gummed together, travelling right, with a dusty trail behind it. Centre origin. */
export function drawSporeGlob(d: Draw): void {
  sporeCloud(d, pt(-3.5, 0.3), 3.5, 0.6);
  for (let k = 0; k < 3; k++) d.pen.hair([pt(-7, -1.6 + k * 1.6), pt(-1.5, -1.2 + k * 1.2)], 0.35, mix(FLESH.spore, '#4a3a1a', 0.6), 0.32);
  const clot = [pt(4.4, 0), ...cub(pt(4.4, 0), pt(4.6, -3.6), pt(0.4, -4), pt(-1.8, -2.6), 6), pt(-3, 0.2), ...cub(pt(-3, 0.2), pt(-1.8, 3.2), pt(2.6, 3.8), pt(4.4, 0), 6)];
  paint(d, clot, mix(FLESH.spore, FLESH.sac, 0.4), { alpha: 1, shadow: 0.55, hatch: 0, line: 0.7 });
  d.pen.stipple(clot, 30, () => 0.8, 0.35, mix(FLESH.spore, '#5a4a2a', 0.5));
  d.pen.dot(0.6, -1.6, 0.8, PAPER_FILL, 0.85);
  glow(d.pen.ctx, pt(1, 0), 6, FLESH.spore, 0.25);
}
