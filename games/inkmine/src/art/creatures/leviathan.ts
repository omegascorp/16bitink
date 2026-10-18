import { createRng } from '../../logic/rng';
import { closed, cub, normals, oval, pt, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import { pathOf, type Pt } from '../pen';
import { blob } from './flesh';

/**
 * The Leviathan (Brine's giant, hostile, inked in red): the oldest thing in
 * Brine's flooded underworld, ten tiles long, asleep in the deepest cave. It
 * is a filter-feeder, as Earth's biggest animals all are (the blue whale,
 * the whale shark, the manta): a vast arched mouth like a bowhead whale's,
 * which can open wide enough to swallow the cave's water, combs of baleen
 * inside it, and pleated throat grooves that balloon as it gulps, as a
 * rorqual's do. It is old: its back is crusted with salt and barnacle-like
 * cones, as old whales carry barnacles, and scarred; its flippers are knobbed
 * along their leading edge like a humpback's. Down each flank runs a row of
 * photophores, lights of its own (lanternfish and many deep animals carry
 * them), and it has one great eye on each side of its head. It cannot be
 * hurt, but noise wakes it. Asleep it lies curled a little, eye shut, a
 * string of bubbles leaking from a gill; stirring, its eye half opens and
 * its lights come up; awake it stretches out to swim, eye open, mouth
 * opening, lights bright. Facing right, origin at the bottom centre (x = 0
 * at its middle, y = 0 under its belly).
 *
 * The bubbles are a second pass (`drawLeviathanAir`), laid on after the
 * finish so they keep a fine line of their own.
 */
export const LEVIATHAN_ART = { w: 368, h: 176, ox: 184, oy: 168 } as const;
export type LeviathanPose = 'sleep' | 'stir' | 'awake';

interface Stance {
  /** How curled it lies (1 asleep, 0 stretched out). */
  readonly curl: number;
  /** How far it's risen off the floor. */
  readonly lift: number;
  /** How open its eye is. */
  readonly eye: number;
  /** How bright its lights are. */
  readonly lit: number;
  /** How far its jaw is dropped. */
  readonly gape: number;
  /** How far its flipper is swept back on a stroke. */
  readonly fin: number;
}

const STANCES: Readonly<Record<LeviathanPose, Stance>> = {
  sleep: { curl: 1, lift: 0, eye: 0, lit: 0, gape: 0, fin: 0 },
  stir: { curl: 0.55, lift: 3, eye: 0.45, lit: 0.55, gape: 0.1, fin: 0.25 },
  awake: { curl: 0, lift: 20, eye: 1, lit: 1, gape: 1, fin: 1 },
};

const BACK = '#36334f';
const BELLY = '#a99fbb';
const JAW = '#7f779a';
const SPOT = '#9b95b8';
const CRUST = '#ece7df';
const THROAT = '#241626';
const BALEEN = '#e6dbc0';
const TONGUE = '#9c5a78';
const PHOTO = '#bdf4ff';
const EYE_GLOW = '#9fe7ff';

/** Samples along the body, tail (0) to snout (1). */
const N = 64;
/** Its full height along the body, as (u, height) stations. */
const GIRTH: readonly (readonly [number, number])[] = [[0, 10], [0.1, 20], [0.25, 46], [0.4, 78], [0.55, 104], [0.7, 116], [0.82, 114], [0.92, 104], [1, 90]];
/** Where the mouth's corner sits along the body. */
const CORNER_U = 0.76;

function girth(u: number): number {
  for (let i = 1; i < GIRTH.length; i++) {
    const [u0, h0] = GIRTH[i - 1]!;
    const [u1, h1] = GIRTH[i]!;
    if (u <= u1) {
      const t = (u - u0) / (u1 - u0);
      return h0 + (h1 - h0) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    }
  }
  return GIRTH[GIRTH.length - 1]![1];
}

/** The body's top and bottom edges along a spine bent for a stance, with knuckles along the back, as a grey whale has. */
interface Body {
  readonly spine: Pt[];
  readonly top: Pt[];
  readonly bot: Pt[];
  readonly nrm: Pt[];
  readonly depth: number[];
}

function body(s: Stance): Body {
  const spine: Pt[] = [];
  const up: number[] = [];
  const down: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const w = girth(u);
    const knuckle = u > 0.14 && u < 0.5 ? 1.8 * Math.pow(Math.max(0, Math.sin((u - 0.14) * 70)), 2) : 0;
    up.push(w * 0.55 + knuckle);
    down.push(w * 0.45);
    const arch = -14 * Math.pow(Math.sin(Math.PI * u), 1.2);
    const swim = -22 * Math.pow(Math.max(0, (0.35 - u) / 0.35), 1.6) - 5 * Math.sin(Math.PI * 2 * u + 0.5) * (1 - u);
    spine.push(pt(-150 + 300 * u, -w * 0.45 - s.lift + s.curl * arch + (1 - s.curl) * swim));
  }
  const nrm = normals(spine);
  return {
    spine,
    nrm,
    top: spine.map((p, i) => pt(p.x + nrm[i]!.x * up[i]!, p.y + nrm[i]!.y * up[i]!)),
    bot: spine.map((p, i) => pt(p.x - nrm[i]!.x * down[i]!, p.y - nrm[i]!.y * down[i]!)),
    depth: up.map((a, i) => a + down[i]!),
  };
}

/** A point `k` of the way down from the top edge at sample `i`. */
const at = (b: Body, i: number, k: number): Pt => pt(b.top[i]!.x + (b.bot[i]!.x - b.top[i]!.x) * k, b.top[i]!.y + (b.bot[i]!.y - b.top[i]!.y) * k);

/** The blunt snout: a curve bulging forward from the top edge's end to the bottom's. */
function snout(b: Body): Pt[] {
  const t = b.top[N]!;
  const o = b.bot[N]!;
  return cub(t, pt(t.x + 20, t.y + 8), pt(o.x + 18, o.y - 14), o, 14);
}

/** The mouth: the corner, the front, and the great arched lip line between them. */
function mouth(b: Body): { corner: Pt; front: Pt; lip: Pt[]; capBelow: Pt[]; botFrom: number } {
  const ci = Math.round(CORNER_U * N);
  const corner = at(b, ci, 0.72);
  const cap = snout(b);
  const fi = Math.round(cap.length * 0.5);
  const front = cap[fi]!;
  const lip = cub(corner, pt(corner.x + 26, corner.y - 30), pt(front.x - 34, front.y - 6), front, 18);
  return { corner, front, lip, capBelow: cap.slice(fi), botFrom: ci };
}

/** The fluke at the tail's end: two lobes, curled forward under it while it sleeps. */
function fluke(d: Draw, b: Body, s: Stance): void {
  const end = b.spine[0]!;
  const next = b.spine[3]!;
  const heading = Math.atan2(end.y - next.y, end.x - next.x);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(end.x + 2, end.y);
  ctx.rotate(heading + s.curl * 0.75);
  const lobe = (side: 1 | -1): Pt[] => [pt(-2, 0), ...cub(pt(-2, side * 4), pt(8, side * 10), pt(18, side * 20), pt(30, side * 24), 8), ...cub(pt(30, side * 24), pt(26, side * 14), pt(22, side * 5), pt(12, 0), 6)];
  for (const side of [-1, 1] as const) {
    const shape = lobe(side);
    paint(d, shape, side === 1 ? mix(BACK, SHADOW, 0.25) : BACK, { alpha: 1, shadow: 0.5, hatch: 0.15, line: 0.9 });
    d.pen.hair([pt(4, side * 2), pt(14, side * 9), pt(22, side * 18)], 0.5, mix(BACK, PAPER_FILL, 0.35), 0.5);
  }
  ctx.restore();
}

/** Skin over the body: pale belly, spots on the back like a whale shark's, old pale scars. */
function skin(d: Draw, b: Body, outline: readonly Pt[]): void {
  const rng = createRng(7350);
  d.pen.clipped(outline, () => {
    const belly = [...b.bot, ...b.spine.map((_, i) => at(b, i, 0.58)).reverse()];
    dab(d, belly, BELLY, 0.8, 5);
    for (let i = 8; i < N - 2; i += 2) {
      for (const k of [0.12, 0.24, 0.36, 0.48]) {
        if (rng() < 0.3) continue;
        const p = at(b, i, k + (rng() - 0.5) * 0.06);
        d.pen.dot(p.x + (rng() - 0.5) * 3, p.y, 0.9 + rng() * 1.1, SPOT, 0.55);
      }
    }
    d.pen.stipple(outline, 500, (_, y) => (y < -60 ? 0.6 : 0.25), 0.5, mix(BACK, SHADOW, 0.45));
    for (const [i, k, len] of [[22, 0.3, 26], [34, 0.2, 18], [44, 0.42, 22]] as const) {
      const p = at(b, i, k);
      d.pen.hair([p, pt(p.x + len * 0.5, p.y + 2), pt(p.x + len, p.y + 1)], 0.6, mix(BELLY, PAPER_FILL, 0.4), 0.55);
    }
  });
}

/** A barnacle-like cone: a crusted volcano with a dark slot at its top and plates round its sides. */
function barnacle(d: Draw, c: Pt, r: number): void {
  const cone = [pt(c.x - r, c.y + r * 0.35), pt(c.x - r * 0.5, c.y - r * 0.7), pt(c.x + r * 0.5, c.y - r * 0.7), pt(c.x + r, c.y + r * 0.35)];
  paint(d, cone, CRUST, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.35, lineAlpha: 0.7 });
  d.pen.fill(oval(c.x, c.y - r * 0.62, r * 0.42, r * 0.18, 10), THROAT, 0.9);
  for (const k of [-0.5, 0, 0.5]) d.pen.hair([pt(c.x + k * r * 0.9, c.y + r * 0.3), pt(c.x + k * r * 0.4, c.y - r * 0.55)], 0.3, mix(CRUST, SHADOW, 0.45), 0.7);
}

/** Salt crust and barnacle clusters on the head and along the back. */
function crust(d: Draw, b: Body, outline: readonly Pt[]): void {
  const rng = createRng(7360);
  d.pen.clipped(outline, () => crusts(d, b, rng));
}

function crusts(d: Draw, b: Body, rng: () => number): void {
  for (const [i, k, rx, ry, n] of [[60, 0.08, 15, 6, 5], [52, 0.07, 10, 4, 4], [44, 0.08, 9, 4, 3], [36, 0.1, 7, 3, 3], [28, 0.12, 5, 2.4, 2], [56, 0.3, 6, 3, 2]] as const) {
    const c = at(b, i, k);
    const patch = blob(c, rx, ry, 0.5, 7370 + i, 16);
    dab(d, patch, mix(CRUST, BACK, 0.3), 0.6, 1.5);
    paint(d, blob(c, rx * 0.8, ry * 0.75, 0.5, 7390 + i, 16), CRUST, { alpha: 0.85, shadow: 0.4, hatch: 0, line: 0 });
    d.pen.stipple(patch, Math.round(rx * ry * 2), () => 0.6, 0.35, mix(CRUST, SHADOW, 0.3));
    for (let j = 0; j < n; j++) barnacle(d, pt(c.x + (rng() - 0.5) * rx * 1.4, c.y + (rng() - 0.5) * ry), 2 + rng() * 2.2);
  }
}

/** The gill slits behind the head, each a dark curved cut with a lit lip. */
function gills(d: Draw, b: Body): Pt {
  let first = pt(0, 0);
  [40, 42.5, 45, 47.5].forEach((i, k) => {
    const j = Math.round(i);
    const a = at(b, j, 0.36);
    const z = at(b, j, 0.7);
    const line = cub(a, pt(a.x - 4, a.y + 10), pt(z.x - 5, z.y - 10), z, 10);
    d.pen.stroke(line, 1.6, THROAT, 0.85, false);
    d.pen.hair(line.map((p) => pt(p.x + 1.4, p.y)), 0.6, mix(BACK, PAPER_FILL, 0.4), 0.6);
    if (k === 0) first = a;
  });
  return first;
}

/** The photophores: two rows of lights down the flank, dim pits asleep, glowing cold as it wakes. */
function photophores(d: Draw, b: Body, lit: number): void {
  for (let i = 12; i <= 40; i += 2) {
    for (const [k, off] of [[0.62, 0], [0.76, 1]] as const) {
      const p = at(b, i + off, k);
      const r = 1.2 + (b.depth[i]! / 116) * 1.1;
      if (lit > 0) glow(d.pen.ctx, p, r * (2 + lit * 2.2), PHOTO, 0.15 + lit * 0.3);
      d.pen.fill(oval(p.x, p.y, r * 0.85, r * 0.75, 10), mix('#1e1a2e', PHOTO, lit * 0.8), 0.45 + lit * 0.5);
      if (lit > 0.3) d.pen.dot(p.x, p.y, r * 0.5, '#ffffff', lit);
      d.pen.hair([pt(p.x - r, p.y - r * 0.3), pt(p.x, p.y - r * 1.05), pt(p.x + r, p.y - r * 0.3)], 0.35, mix(BELLY, PAPER_FILL, 0.4), 0.5);
    }
  }
}

/** The great eye in its wrinkled socket: shut, half open or wide, a cold light in its iris. */
function eye(d: Draw, c: Pt, open: number): void {
  const r = 9;
  for (const k of [1.35, 1.65, 1.95]) {
    d.pen.hair(Array.from({ length: 9 }, (_, i) => pt(c.x + Math.cos(Math.PI * (0.85 + i * 0.16)) * r * k, c.y + Math.sin(Math.PI * (0.85 + i * 0.16)) * r * k * 0.85)), 0.5, mix(BACK, SHADOW, 0.55), 0.6);
    d.pen.hair(Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos(Math.PI * (0.1 + i * 0.12)) * r * k, c.y + Math.sin(Math.PI * (0.1 + i * 0.12)) * r * k * 0.85)), 0.45, mix(BACK, SHADOW, 0.55), 0.5);
  }
  const socket = oval(c.x, c.y, r * 1.18, r, 22);
  paint(d, socket, mix(BACK, JAW, 0.4), { alpha: 1, shadow: 0.55, hatch: 0, line: 0.6, lineAlpha: 0.6 });
  const globe = oval(c.x, c.y, r * 0.95, r * 0.8, 22);
  if (open > 0) {
    glow(d.pen.ctx, c, r * 1.6, EYE_GLOW, 0.25 * open);
    paint(d, globe, '#1a1424', { alpha: 1, shadow: 0.3, hatch: 0, line: 0.6, gloss: true });
    d.pen.clipped(globe, () => {
      glow(d.pen.ctx, c, r * 0.75, EYE_GLOW, 0.75 * open);
      d.pen.fill(oval(c.x + 0.6, c.y, r * 0.42, r * 0.12, 12), '#07050a', 1);
      // The upper lid, drawn down over what isn't open.
      const lid = c.y - r * 0.8 + r * 1.6 * (1 - open);
      d.pen.fill([pt(c.x - r * 1.2, c.y - r * 1.2), pt(c.x + r * 1.2, c.y - r * 1.2), pt(c.x + r * 1.2, lid + 1), pt(c.x - r * 1.2, lid - 1)], mix(BACK, JAW, 0.5), 1);
      d.pen.stroke([pt(c.x - r, lid - 0.8), pt(c.x, lid + 0.8), pt(c.x + r, lid + 0.6)], 1, d.ink, 0.9, false);
    });
    d.pen.dot(c.x - r * 0.35, c.y - r * 0.05 + (1 - open) * r * 0.4, 1.1, PAPER_FILL, 0.9);
  } else {
    // Shut: the heavy upper lid down over it, a slit with a fold of skin above.
    paint(d, globe, mix(BACK, JAW, 0.35), { alpha: 1, shadow: 0.55, hatch: 0, line: 0 });
    d.pen.stroke(cub(pt(c.x - r * 0.95, c.y + r * 0.15), pt(c.x - r * 0.4, c.y - r * 0.12), pt(c.x + r * 0.4, c.y - r * 0.12), pt(c.x + r * 0.95, c.y + r * 0.2), 10), 1.1, d.ink, 0.9, false);
    d.pen.hair(cub(pt(c.x - r * 0.8, c.y - r * 0.35), pt(c.x - r * 0.3, c.y - r * 0.62), pt(c.x + r * 0.3, c.y - r * 0.62), pt(c.x + r * 0.8, c.y - r * 0.3), 10), 0.6, mix(BACK, SHADOW, 0.55), 0.7);
    d.pen.hair(cub(pt(c.x - r * 0.7, c.y + r * 0.25), pt(c.x - r * 0.2, c.y + r * 0.05), pt(c.x + r * 0.3, c.y + r * 0.05), pt(c.x + r * 0.75, c.y + r * 0.3), 10), 0.5, mix(BACK, PAPER_FILL, 0.4), 0.5);
  }
}

/** The near flipper: a long knobbed wing from the low flank, folded down along the side asleep, swept back on an upstroke awake. */
function flipper(d: Draw, b: Body, s: Stance): void {
  const root = at(b, Math.round(0.6 * N), 0.74);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(Math.PI - 0.42 + s.fin * 0.22);
  const len = 80;
  // Rotated about half a turn, so its leading edge (local +y) ends up on top.
  const lead = cub(pt(0, 9), pt(len * 0.35, 12), pt(len * 0.75, 6), pt(len, 0), 14);
  const trail = cub(pt(len, 0), pt(len * 0.7, -6), pt(len * 0.3, -14), pt(-4, -10), 12);
  const shape = [...lead, ...trail.slice(1)];
  // Its shadow on the flank, so it reads as standing off the body.
  dab(d, shape.map((p) => pt(p.x + 3, p.y - 5)), SHADOW, 0.35, 3);
  paint(d, shape, mix(BACK, JAW, 0.15), { alpha: 1, shadow: 0.55, hatch: 0.18, line: 1 });
  d.pen.clipped(shape, () => dab(d, [...trail, pt(len * 0.4, -4)], BELLY, 0.35, 3));
  // Knobs along the leading edge, as a humpback's flipper has.
  for (let i = 3; i < lead.length - 2; i += 3) d.pen.dot(lead[i]!.x, lead[i]!.y + 0.6, 1.6, mix(BACK, JAW, 0.5), 1);
  gleam(d, lead.slice(2, 10).map((p) => pt(p.x, p.y - 3)), 1, 0.45);
  ctx.restore();
}

/** The lower jaw: the lip line, the snout below it and the belly back to the corner, its throat pleated. */
function jaw(d: Draw, b: Body, m: ReturnType<typeof mouth>, line: number): Pt[] {
  const belly = b.bot.slice(m.botFrom - 4).reverse();
  const shape = [...m.lip, ...m.capBelow.slice(1), ...belly.slice(1), ...cub(belly[belly.length - 1]!, pt(m.corner.x - 10, m.corner.y + 12), pt(m.corner.x - 4, m.corner.y + 4), m.corner, 6).slice(1, -1)];
  paint(d, shape, JAW, { alpha: line > 0 ? 1 : 0.85, shadow: 0.5, hatch: 0.12, line });
  d.pen.clipped(shape, () => {
    dab(d, oval(m.front.x - 22, m.front.y + 22, 26, 14, 16), CRUST, 0.35, 5);
    for (let k = 1; k <= 6; k++) {
      const pleat = b.bot.slice(m.botFrom - 8).map((p, i, arr) => pt(p.x, p.y - k * 4.2 * (0.4 + 0.6 * (i / arr.length))));
      d.pen.hair(pleat, 0.6, mix(JAW, SHADOW, 0.55), 0.6);
      d.pen.hair(pleat.map((p) => pt(p.x, p.y - 1.2)), 0.4, mix(JAW, PAPER_FILL, 0.5), 0.45);
    }
  });
  return shape;
}

const rot = (p: Pt, c: Pt, a: number): Pt => pt(c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a), c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a));

/** The mouth opening: the closed jaw erased, the dark gape with its baleen comb and tongue, then the jaw dropped about the corner. */
function openMouth(d: Draw, b: Body, m: ReturnType<typeof mouth>, gape: number): void {
  const { ctx } = d.pen;
  const angle = gape * 0.36;
  const closedJaw = [...m.lip, ...m.capBelow.slice(1), ...b.bot.slice(m.botFrom - 4).reverse().slice(1)];
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  pathOf(ctx, closedJaw);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.beginPath();
  [...m.capBelow, ...b.bot.slice(m.botFrom - 4).reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
  const lower = m.lip.map((p) => rot(p, m.corner, angle));
  const gap = [...m.lip, ...[...lower].reverse()];
  d.pen.fill(gap, THROAT, 1);
  d.pen.clipped(gap, () => {
    dab(d, oval(m.corner.x + 34, lower[10]!.y - 2, 26, 7, 14), TONGUE, 0.85, 2);
    for (let i = 1; i < m.lip.length * 3; i++) {
      const t = i / (m.lip.length * 3);
      const k = Math.floor(t * (m.lip.length - 1));
      const f = t * (m.lip.length - 1) - k;
      const a = pt(m.lip[k]!.x + (m.lip[k + 1]!.x - m.lip[k]!.x) * f, m.lip[k]!.y + (m.lip[k + 1]!.y - m.lip[k]!.y) * f);
      const z = pt(lower[k]!.x + (lower[k + 1]!.x - lower[k]!.x) * f, lower[k]!.y + (lower[k + 1]!.y - lower[k]!.y) * f);
      d.pen.hair([a, pt(a.x + (z.x - a.x) * 0.75 - 1, a.y + (z.y - a.y) * 0.75)], 0.45, BALEEN, 0.85);
    }
  });
  ctx.save();
  ctx.translate(m.corner.x, m.corner.y);
  ctx.rotate(angle);
  ctx.translate(-m.corner.x, -m.corner.y);
  jaw(d, b, m, 0.9);
  ctx.restore();
}

/** The Leviathan in a pose: asleep and curled, stirring, or awake and swimming with its mouth opening. */
export function drawLeviathan(d: Draw, pose: LeviathanPose): void {
  const s = STANCES[pose];
  const b = body(s);
  const m = mouth(b);
  if (s.lit > 0) glow(d.pen.ctx, at(b, 28, 0.68), 100, PHOTO, 0.05 * s.lit);
  dab(d, oval(0, -1, 150, 6, 30), SHADOW, 0.22 - s.lift * 0.006, 4);
  fluke(d, b, s);
  const outline = [...b.top, ...snout(b).slice(1, -1), ...[...b.bot].reverse()];
  paint(d, outline, BACK, { alpha: 1, shadow: 0.6, hatch: 0.14, line: 1.2, cross: true });
  skin(d, b, outline);
  crust(d, b, outline);
  if (s.gape > 0.05) openMouth(d, b, m, s.gape);
  else jaw(d, b, m, 0);
  d.pen.stroke(m.lip, 1.5, d.ink, 0.95, false);
  d.pen.hair(m.lip.map((p) => pt(p.x, p.y - 1.6)), 0.7, mix(BACK, PAPER_FILL, 0.45), 0.6);
  gills(d, b);
  photophores(d, b, s.lit);
  eye(d, at(b, Math.round(0.8 * N), 0.48), s.eye);
  flipper(d, b, s);
  gleam(d, b.top.slice(20, 58).map((p, i) => pt(p.x, p.y + 4 + Math.sin(i * 0.3) * 0.4)), 1.4, 0.4);
}

/** Bubbles, laid on after the finish: a string from a gill as it sleeps, a few as it stirs, a stream trailing back as it swims. */
export function drawLeviathanAir(d: Draw, pose: LeviathanPose): void {
  const s = STANCES[pose];
  const b = body(s);
  const from = at(b, 40, 0.36);
  const rng = createRng(7380 + d.f);
  const n = pose === 'sleep' ? 9 : pose === 'stir' ? 4 : 12;
  for (let k = 0; k < n; k++) {
    const t = k / Math.max(1, n - 1);
    const c = pose === 'awake'
      ? pt(from.x - 8 - t * 90, from.y - 4 - t * 26 + (rng() - 0.5) * 8)
      : pt(from.x + Math.sin(k * 1.3 + d.f) * 3, from.y - 6 - t * (pose === 'sleep' ? 70 : 34));
    const r = pose === 'awake' ? 1.2 + rng() * 1.6 : 3.4 - t * 2 + rng() * 0.6;
    d.pen.fill(oval(c.x, c.y, r, r, 12), '#f1ecfa', 0.55);
    d.pen.stroke(closed(oval(c.x, c.y, r, r, 12)), 0.45, '#5e5578', 0.8);
    d.pen.dot(c.x - r * 0.35, c.y - r * 0.35, Math.max(0.35, r * 0.28), PAPER_FILL, 0.95);
  }
}
