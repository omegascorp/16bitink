import { bezier, type Draw, oval, pt, ribbon, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * The plants of a Gulf shelling beach, Sanibel or Captiva: sea oats nodding
 * on the dunes, thickets of sea grape with their big round leathery leaves,
 * cabbage palms (Sabal) with their criss-crossed boots and round heads of
 * fan fronds; and the wrack line, sargassum and turtle grass thrown up by
 * the tide and studded with shells. Things face right.
 */
const OAT_LEAF = '#a3ad6a';
const OAT_STEM = '#c4b27a';
const OAT_HEAD = '#d9c48e';
const GRAPE_LEAF = '#6f9550';
const GRAPE_DARK = '#3f5c34';
const GRAPE_RED = '#a8704a';
const GRAPE_YELLOW = '#b8ad5e';
const VEIN = '#a8503a';
const BARK = '#8b7660';
const PALM_TRUNK = '#9d8f78';
const BOOT = '#7c6a52';
const FROND = '#5f8f55';
const FROND_DARK = '#3f6440';
const DEAD_FROND = '#b08c5a';
const SARGASSUM = '#9a7a2e';
const TURTLE_GRASS = '#4f5a2c';
const SHELLS = ['#f3e9d6', '#e9c9a8', '#dba48a', '#efe0c4', '#d8c7b4'];

/** An oval turned by `a` radians about its centre. */
function turned(cx: number, cy: number, rx: number, ry: number, a: number, n = 10): Pt[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return oval(0, 0, rx, ry, n).map((p) => pt(cx + p.x * c - p.y * s, cy + p.x * s + p.y * c));
}

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.6, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/**
 * A clump of sea oats on the dune: long narrow leaves arching out low
 * down, and tall slender stems standing over them, each nodding under a
 * loose head of flat, straw-coloured spikelets.
 */
export function seaOats(t: Draw, x: number, ground: number, h: number): void {
  const { pen } = t;
  for (let k = 0; k < 8; k++) {
    const a = -1.1 + (k / 7) * 2.2 + pen.jitter(0.15);
    const len = h * (0.3 + pen.rng() * 0.2);
    const tip = pt(x + Math.sin(a) * len * 1.1, ground - Math.cos(a) * len * 0.55 + len * 0.12);
    const blade = bezier(pt(x + pen.jitter(1.5), ground), pt(x + Math.sin(a) * len * 0.4, ground - len * 0.8), tip, 6);
    pen.hair(blade, 0.9, OAT_LEAF, 0.85);
    pen.hair(blade, 0.3, t.ink, FAR * 0.6);
  }
  const stems = 3 + Math.floor(pen.rng() * 3);
  for (let k = 0; k < stems; k++) {
    const lean = 0.08 + pen.jitter(0.22);
    const H = h * (0.75 + pen.rng() * 0.3);
    const tip = pt(x + lean * H + pen.jitter(2), ground - H);
    const stem = bezier(pt(x + pen.jitter(2), ground), pt(x + lean * H * 0.3, ground - H * 0.6), tip, 10);
    const nod = bezier(tip, pt(tip.x + h * 0.06, tip.y - h * 0.02), pt(tip.x + h * 0.1, tip.y + h * 0.08), 5);
    pen.hair([...stem, ...nod.slice(1)], 0.55, OAT_STEM, 0.9);
    pen.hair(stem, 0.25, t.ink, FAR * 0.55);
    // The head: spikelets hung along the top of the stem and its nodding tip, alternately each side.
    [...stem.slice(7), ...nod.slice(1)].forEach((p, i) => {
      const side = i % 2 ? 1 : -1;
      const sp = turned(p.x + side * 1.1, p.y + 1.6, 1.9, 0.75, 1.25 - side * 0.35);
      pen.fill(sp, PAPER_FILL, 0.8);
      pen.fill(sp, OAT_HEAD, 0.85);
      pen.hair(sp.slice(0, 6), 0.25, t.ink, FAR * 0.6);
    });
  }
}

/**
 * A sea grape thicket: a few gnarled grey trunks under a mound of big,
 * round, leathery leaves, each with its red midrib, a few turned red or
 * yellow, and a bunch or two of green grapes hanging.
 */
export function seaGrape(t: Draw, x: number, ground: number, w: number, h: number): void {
  const { pen } = t;
  for (let k = 0; k < 3; k++) {
    const bx = x + (k - 1) * w * 0.24 + pen.jitter(3);
    const limb = bezier(pt(bx, ground + 1), pt(bx + pen.jitter(6), ground - h * 0.3), pt(bx + pen.jitter(10), ground - h * 0.6), 6);
    washed(t, tube(limb, 2.6, 1.2), BARK, 0.5, 0.45);
  }
  const env = (u: number): number => Math.sin(Math.PI * u) ** 0.6 * (0.9 + 0.12 * Math.sin(u * 13 + x));
  const mound: Pt[] = [pt(x - w / 2, ground + 2)];
  for (let i = 0; i <= 20; i++) mound.push(pt(x - w / 2 + (w * i) / 20, ground - h * env(i / 20)));
  mound.push(pt(x + w / 2, ground + 2));
  pen.fill(mound, GRAPE_DARK, 0.3);
  const r0 = Math.max(2.4, h / 10);
  const leaves = Array.from({ length: Math.round((w * h) / (r0 * r0 * 2.2)) }, () => {
    const u = 0.04 + pen.rng() * 0.92;
    return { lx: x - w / 2 + w * u, ly: ground - pen.rng() ** 0.7 * h * env(u) + r0 * 0.8, r: r0 * (0.8 + pen.rng() * 0.45) };
  }).sort((a, b) => a.ly - b.ly);
  for (const { lx, ly, r } of leaves) {
    const leaf = oval(lx, ly, r, r * 0.9, 12).map((p) => pt(p.x + pen.jitter(0.3), p.y + pen.jitter(0.3)));
    const roll = pen.rng();
    pen.fill(leaf, PAPER_FILL, 0.85);
    pen.fill(leaf, roll < 0.03 ? GRAPE_RED : roll < 0.07 ? GRAPE_YELLOW : GRAPE_LEAF, 0.62 + pen.rng() * 0.2);
    pen.clipped(leaf, () => pen.fill(oval(lx + r * 0.4, ly + r * 0.45, r, r * 0.8, 10), GRAPE_DARK, 0.22));
    pen.hair([pt(lx - r * 0.1, ly + r * 0.8), pt(lx, ly - r * 0.5)], 0.35, VEIN, 0.55);
    for (const side of [-1, 1]) pen.hair([pt(lx, ly + r * 0.1), pt(lx + side * r * 0.6, ly - r * 0.25)], 0.25, VEIN, 0.4);
    pen.hair(leaf.slice(5, 12), 0.35, t.ink, FAR * 0.55);
  }
  for (let k = 0; k < Math.max(1, Math.round(w / 40)); k++) {
    const gx = x - w * 0.3 + pen.rng() * w * 0.6;
    const gy = ground - h * (0.25 + pen.rng() * 0.3);
    for (let i = 0; i < 7; i++) pen.dot(gx + pen.jitter(1.2), gy + i * 0.9, 0.7, '#8fae5a', 0.85);
  }
  pen.hair(mound.slice(1, -1).filter((_, i) => i % 5 < 3), 0.4, t.ink, FAR * 0.4);
}

/**
 * One costapalmate frond: a stalk arching out from the crown at angle `a`,
 * its blade a drooping fan of folded segments set along the curved midrib,
 * their tips split into threads.
 */
function fanFrond(t: Draw, top: Pt, a: number, len: number, front: boolean): void {
  const { pen } = t;
  const end = pt(top.x + Math.cos(a) * len, top.y + Math.sin(a) * len * 0.7 + len * 0.22);
  const costa = bezier(top, pt(top.x + Math.cos(a) * len * 0.55, top.y + Math.sin(a) * len * 0.62 - len * 0.12), end, 10);
  const left: Pt[] = [];
  const right: Pt[] = [];
  const segs: Pt[][] = [];
  for (let i = 4; i < costa.length; i++) {
    const p = costa[i]!;
    const q = costa[i - 1]!;
    const d = Math.hypot(p.x - q.x, p.y - q.y) || 1;
    const tx = (p.x - q.x) / d;
    const ty = (p.y - q.y) / d;
    const k = (i - 3) / (costa.length - 3);
    const L = len * (0.22 + 0.2 * Math.sin(Math.PI * Math.min(1, k * 1.1)));
    for (const side of [-1, 1]) {
      const nx = -ty * side;
      const ny = tx * side;
      const tip = pt(p.x + (nx * 0.8 + tx * 0.5) * L, p.y + (ny * 0.8 + ty * 0.5) * L + L * 0.45);
      segs.push(bezier(p, pt(p.x + (nx + tx * 0.3) * L * 0.55, p.y + (ny + ty * 0.3) * L * 0.55 - L * 0.1), tip, 5));
      (side < 0 ? left : right).push(tip);
    }
  }
  const blade = [costa[4]!, ...left, pt(end.x + (end.x - costa[8]!.x) * 0.5, end.y + (end.y - costa[8]!.y) * 0.5 + len * 0.06), ...right.reverse()];
  pen.fill(blade, PAPER_FILL, front ? 0.9 : 0.75);
  pen.fill(blade, front ? FROND : FROND_DARK, front ? 0.55 : 0.45);
  for (const seg of segs) {
    pen.hair(seg, 0.55, front ? FROND_DARK : FROND, 0.6);
    const tip = seg[seg.length - 1]!;
    pen.hair([tip, pt(tip.x + pen.jitter(1), tip.y + 2 + pen.rng() * 2)], 0.3, t.ink, FAR * 0.5);
  }
  pen.hair(costa, 0.6, t.ink, FAR * (front ? 0.8 : 0.5));
  pen.hair(blade.slice(1, -1).filter((_, i) => i % 3 !== 2), 0.35, t.ink, FAR * 0.45);
}

/**
 * A cabbage palm (Sabal palmetto): a straight grey trunk, its upper part
 * still wrapped in the criss-crossed boots of old leaf bases, a skirt of
 * dead fronds hanging under a round head of fan fronds.
 */
export function sabalPalm(t: Draw, x: number, ground: number, h: number, lean: number): void {
  const { pen } = t;
  const top = pt(x + lean * h, ground - h);
  const spine = bezier(pt(x, ground), pt(x + lean * h * 0.2, ground - h * 0.55), top, 20);
  const trunk = ribbon(spine, (u) => 7.4 - 1.8 * u + (u < 0.04 ? 2.4 * (1 - u / 0.04) : 0)).shape;
  washed(t, trunk, PALM_TRUNK, 0.55, 0.85);
  pen.clipped(trunk, () => {
    for (let i = 1; i < spine.length * 0.55; i++) pen.hair([pt(spine[i]!.x - 3.6, spine[i]!.y + 0.4), pt(spine[i]!.x + 3.6, spine[i]!.y - 0.2)], 0.3, t.ink, FAR * 0.35);
    const boots = [...spine.slice(10).map((p) => pt(p.x - 6, p.y)), ...[...spine.slice(10)].reverse().map((p) => pt(p.x + 6, p.y))];
    pen.fill(boots, BOOT, 0.45);
    pen.hatch(boots, 2, 0.95, 0.45, { color: t.ink, alpha: FAR * 0.6 });
    pen.hatch(boots, 2, Math.PI - 0.95, 0.45, { color: t.ink, alpha: FAR * 0.6 });
    pen.fill(trunk.map((p) => pt(p.x + 3.2, p.y)), '#4f4436', 0.25);
  });
  // The skirt of dead fronds, hanging close round the top of the trunk.
  const skirt: Pt[] = [pt(top.x - 4, top.y + 1)];
  for (let i = 0; i <= 8; i++) skirt.push(pt(top.x - 5 + i * 1.25 + pen.jitter(0.4), top.y + h * (0.1 + 0.05 * Math.sin(i * 2.1)) + pen.rng() * 3));
  skirt.push(pt(top.x + 4, top.y + 1));
  washed(t, skirt, DEAD_FROND, 0.5, 0.4, 0.8);
  pen.clipped(skirt, () => {
    for (let i = 0; i < 9; i++) pen.hair([pt(top.x - 4.5 + i * 1.1, top.y + 1), pt(top.x - 4.8 + i * 1.2, top.y + h * 0.16)], 0.3, t.ink, FAR * 0.5);
  });
  const len = h * 0.3 + 14;
  const angles = [-3.0, -2.6, -2.15, -1.75, -1.35, -0.95, -0.5, -0.12, 0.35, 2.8];
  angles.forEach((a, i) => i % 2 === 1 && fanFrond(t, top, a + pen.jitter(0.08), len * (0.8 + pen.rng() * 0.15), false));
  angles.forEach((a, i) => i % 2 === 0 && fanFrond(t, top, a + pen.jitter(0.08), len * (0.85 + pen.rng() * 0.2), true));
}

/** One small shell in the wrack, a couple of px across: a scallop's fan, a cockle, a whelk's spiral or an ark. */
function wrackShell(t: Draw, x: number, y: number, kind: number, color: string): void {
  const { pen } = t;
  const ink = FAR * 0.55;
  if (kind === 0) {
    const fan = [pt(x, y + 1), ...bezier(pt(x - 1.9, y - 0.2), pt(x, y - 2.6), pt(x + 1.9, y - 0.2), 6)];
    pen.fill(fan, color, 0.9);
    for (const dx of [-0.9, 0, 0.9]) pen.hair([pt(x, y + 0.8), pt(x + dx * 1.3, y - 1.3)], 0.2, t.ink, ink);
    pen.hair(fan.slice(1), 0.3, t.ink, ink);
  } else if (kind === 1) {
    const body = oval(x, y, 1.5, 1.3, 10);
    pen.fill(body, color, 0.9);
    pen.hair(body.slice(0, 6), 0.3, t.ink, ink);
  } else if (kind === 2) {
    const whelk = [pt(x - 2.4, y + 0.3), ...bezier(pt(x - 1.2, y - 1.2), pt(x + 1.2, y - 1.6), pt(x + 2, y + 0.4), 5), pt(x - 0.6, y + 0.9)];
    pen.fill(whelk, color, 0.9);
    pen.hair([pt(x + 1.4, y - 0.6), pt(x + 0.6, y + 0.4), pt(x - 0.4, y - 0.4)], 0.25, t.ink, ink);
    pen.hair(edges(whelk), 0.3, t.ink, ink);
  } else {
    const ark = oval(x, y, 1.8, 0.9, 10);
    pen.fill(ark, color, 0.9);
    pen.hair([pt(x - 1.2, y), pt(x + 1.2, y)], 0.2, t.ink, ink);
  }
}

/**
 * The wrack line where the last tide turned: tangles of golden sargassum
 * with its tiny float bladders, dark ribbons of turtle grass, and the
 * shells the Gulf leaves on this coast, small and pale at this distance.
 */
export function shellWrack(t: Draw, x0: number, x1: number, y: (x: number) => number): void {
  const { pen } = t;
  for (let x = x0; x < x1; x += 2.5 + pen.rng() * 5) {
    if (pen.rng() < 0.3) continue;
    const yy = y(x) + pen.jitter(2.5);
    const len = 3 + pen.rng() * 8;
    const strand = bezier(pt(x, yy), pt(x + len / 2, yy + pen.jitter(2)), pt(x + len, yy + pen.jitter(1.5)), 5);
    const grass = pen.rng() < 0.3;
    pen.hair(strand, grass ? 0.8 : 0.6, grass ? TURTLE_GRASS : SARGASSUM, grass ? 0.5 : 0.7);
    if (!grass && pen.rng() < 0.5) for (const p of strand.filter((_, i) => i % 2)) pen.dot(p.x, p.y + pen.jitter(0.8), 0.45, SARGASSUM, 0.8);
  }
  for (let x = x0 + pen.rng() * 10; x < x1; x += 7 + pen.rng() * 16) {
    wrackShell(t, x, y(x) + pen.jitter(3.5), Math.floor(pen.rng() * 4), SHELLS[Math.floor(pen.rng() * SHELLS.length)]!);
  }
}
