import { hash } from '../../logic/noise';
import { capsule, closed, cub, oval, pt, ribbon, setae, shade, type Draw } from '../kit';
import { dab, gleam, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL, type GroundStyle } from '../palette';
import type { Pt } from '../pen';
import { boulder } from '../talusGround';
import { blob } from './flesh';

/**
 * The boulder crab (a mimic, hostile, inked in red once it moves): Talus's
 * crab-form, the third world's take on the shape that evolved again and
 * again on Earth (docs/inkmine-xenobiology.md). It sits among the loose rock
 * at the mesas' feet, and its carapace has grown into a rounded, broken
 * boulder of the same red-brown mesa stone, as decorator crabs on Earth wear
 * sponge and stone; where the stone weathers back, a dull armour of hematite
 * shows through, kidney ore of the iron it takes in, dark grey-red and
 * faintly lustrous. Sitting still it is a boulder among boulders (drawn with
 * the very same stone as the loose rock), its only tells a fine seam where
 * the shell meets the body and two eye nubs laid flat. Disturbed it rears
 * up on its legs, eyes up on long stalks to see over its rock, both claws
 * raised and open; then it scuttles sideways after you. Seen from the front
 * (the way it walks across the screen) and facing right, the big claw on
 * its right; origin at the middle of its underside on the ground (y = 0).
 */
export const ROCKCRAB_ART = { w: 64, h: 44, ox: 32, oy: 40 } as const;
export type RockcrabPose = 'boulder' | 'rear' | 'run';

/** Talus's ground washes (content/planet4.ts), for drawing its stone off the map: the boulder crab and the Rockslide. */
export const TALUS_STYLE: GroundStyle = {
  soil: '#c98f66', stone: '#93533d', deep: '#6a3a2e', bedrock: '#311f1e', grain: '#6d3a2a', shade: '#4d2b28', tunnel: '#f1e1cd', sky: '#f3dcc4',
};

const CHITIN = '#76301f';
const CHITIN_DARK = '#57271f';
const UNDER = '#b98068';
const HEMATITE = '#5b4448';
const HEM_LIT = '#b3a3a6';
const HEM_STREAK = '#7b3a33';
const TIP = '#2c2024';
const EYE = '#1f1416';

/** The shell's stone: one boulder's seed, and its size (it fills the 30-wide hit box). */
const SHELL_SEED = 4417;
const SHELL_S = 30;

/** A boulder's outline, exactly as talusGround.ts draws the loose rock: rounded, a couple of faces knocked flat, squat. */
export function stoneOutline(cx: number, cy: number, s: number, seed: number): Pt[] {
  const n = 11;
  const turn = hash(seed, 1, 7) * Math.PI * 2;
  const flat = [Math.floor(hash(seed, 2, 7) * n), Math.floor(hash(seed, 3, 7) * n)];
  return Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    const r = (s / 2) * (0.84 + hash(seed, i, 11) * 0.22) * (flat.includes(i) ? 0.86 : 1);
    return pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8);
  });
}

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/** The stone's washes as the loose rock has them: its colour, warm light on the upper left, cool shade lower right, a flat broken face, grit and rust. */
function stoneWash(ctx: CanvasRenderingContext2D, pts: readonly Pt[], cx: number, cy: number, s: number, seed: number, style: GroundStyle): void {
  fillPath(ctx, pts);
  ctx.fillStyle = mix(style.stone, style.soil, 0.25 + hash(seed, 4, 7) * 0.3);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const light = ctx.createLinearGradient(cx - s * 0.5, cy - s * 0.45, cx + s * 0.5, cy + s * 0.45);
  light.addColorStop(0, 'rgba(255, 236, 210, 0.55)');
  light.addColorStop(0.4, 'rgba(255, 236, 210, 0)');
  light.addColorStop(0.7, 'rgba(70, 40, 60, 0.18)');
  light.addColorStop(1, 'rgba(50, 30, 60, 0.45)');
  ctx.fillStyle = light;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  const fx = cx - s * (0.1 + hash(seed, 5, 7) * 0.15);
  const fy = cy - s * 0.18;
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#fff3e0';
  fillPath(ctx, [pt(fx - s * 0.22, fy - s * 0.05), pt(fx + s * 0.08, fy - s * 0.22), pt(fx + s * 0.16, fy + s * 0.04), pt(fx - s * 0.1, fy + s * 0.12)]);
  ctx.fill();
  for (let k = 0; k < 6; k++) {
    ctx.globalAlpha = 0.25 + hash(seed, 20 + k, 7) * 0.3;
    ctx.fillStyle = k % 2 ? style.grain : '#b4553a';
    ctx.beginPath();
    ctx.arc(cx + (hash(seed, 30 + k, 7) - 0.5) * s * 0.7, cy + (hash(seed, 40 + k, 7) - 0.4) * s * 0.5, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Its soft contact shadow on whatever it rests on, as the loose rock's. */
function stoneShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.save();
  ctx.translate(cx + s * 0.06, cy + s * 0.38);
  ctx.scale(1, 0.3);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
  g.addColorStop(0, 'rgba(40, 20, 20, 0.35)');
  g.addColorStop(1, 'rgba(40, 20, 20, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2);
  ctx.restore();
}

/**
 * A boulder in the loose rock's own language (talusGround.ts `boulder`),
 * but inked with the drawing's pen and ink, so a creature's rocks take its
 * red: the same washes, a crack, the pen round it and a rim of light on top.
 * Returns its outline.
 */
export function talusStone(d: Draw, cx: number, cy: number, s: number, seed: number, shadow = true, style: GroundStyle = TALUS_STYLE): Pt[] {
  const { ctx } = d.pen;
  const pts = stoneOutline(cx, cy, s, seed);
  if (shadow) stoneShadow(ctx, cx, cy, s);
  stoneWash(ctx, pts, cx, cy, s, seed, style);
  if (hash(seed, 6, 7) < 0.7) {
    const a = hash(seed, 7, 7) * Math.PI * 2;
    const crack = [pt(cx + Math.cos(a) * s * 0.42, cy + Math.sin(a) * s * 0.33), pt(cx + Math.cos(a + 0.4) * s * 0.18, cy + Math.sin(a + 0.4) * s * 0.12), pt(cx + Math.cos(a + 0.1) * s * 0.02, cy + Math.sin(a - 0.3) * s * 0.06)];
    d.pen.hair(crack, Math.max(0.5, s * 0.028), d.ink, 0.6);
  }
  d.pen.stroke(closed(pts), Math.max(0.8, s * 0.045), d.ink, 0.9, false);
  const top = pts.filter((p) => p.y < cy - s * 0.1).sort((a, b) => a.x - b.x);
  if (top.length > 1) d.pen.hair(top.map((p) => pt(p.x, p.y + s * 0.04)), Math.max(0.5, s * 0.03), '#fff1dc', 0.5);
  return pts;
}

/**
 * Hematite weathering out of stone: a cluster of kidney-ore lumps (the
 * botryoidal habit of real hematite), each a dull grey-red dome with a soft
 * metallic sheen on its upper left and a rust-red streak where it meets the rock.
 */
export function kidneyOre(d: Draw, c: Pt, r: number, n: number, seed: number): void {
  for (let k = 0; k < n; k++) {
    const a = hash(seed, k, 3) * Math.PI * 2;
    const dist = k === 0 ? 0 : r * (0.45 + hash(seed, k, 5) * 0.5);
    const lr = r * (k === 0 ? 0.6 : 0.32 + hash(seed, k, 9) * 0.25);
    const p = pt(c.x + Math.cos(a) * dist, c.y + Math.sin(a) * dist * 0.7);
    d.pen.fill(oval(p.x + lr * 0.25, p.y + lr * 0.35, lr * 1.1, lr * 0.9, 12), HEM_STREAK, 0.55);
    paint(d, oval(p.x, p.y, lr, lr * 0.85, 14), HEMATITE, { alpha: 1, shadow: 0.55, hatch: 0, line: Math.min(0.5, lr * 0.3), gloss: true });
    d.pen.dot(p.x - lr * 0.35, p.y - lr * 0.35, Math.max(0.3, lr * 0.22), HEM_LIT, 0.85);
  }
}

/** Where a chela's points go: built in its own frame (fingers along +x), mirrored if `flip`, then turned by `dir` and set at `c`. */
function place(pts: readonly Pt[], c: Pt, dir: number, flip: boolean): Pt[] {
  const cs = Math.cos(dir);
  const sn = Math.sin(dir);
  return pts.map((p) => {
    const y = flip ? -p.y : p.y;
    return pt(c.x + p.x * cs - y * sn, c.y + p.x * sn + y * cs);
  });
}

const xy = (p: Pt): [number, number] => [p.x, p.y];

/** One jointed segment of a leg or claw arm, painted. */
function segment(d: Draw, a: Pt, b: Pt, w0: number, w1: number, color: string, line = 0.55): void {
  paint(d, capsule(a, b, w0, w1), color, { alpha: 1, shadow: 0.55, hatch: 0, line });
}

/**
 * A chela, armoured: the palm a shield of hematite plate with kidney-ore
 * lumps, its fixed finger and hinged dactyl reaching along `dir`, toothed,
 * dark at the tips; `open` 0..1 how wide the dactyl gapes.
 */
function chela(d: Draw, c: Pt, rx: number, ry: number, dir: number, open: number, flip = false): void {
  const at = (pts: readonly Pt[]): Pt[] => place(pts, c, dir, flip);
  const len = rx * 1.35;
  const pollex = ribbon(cub(pt(rx * 0.7, ry * 0.35), pt(rx + len * 0.4, ry * 0.5), pt(rx + len * 0.8, ry * 0.4), pt(rx + len, -ry * 0.05), 8), (u) => ry * 0.85 - ry * 0.7 * u).shape;
  const dactyl = ribbon(cub(pt(rx * 0.6, -ry * 0.55), pt(rx + len * 0.3, -ry * (1 + open * 1.6)), pt(rx + len * 0.8, -ry * (0.8 + open * 1.5)), pt(rx + len * 1.02, -ry * (0.2 + open * 0.9)), 10), (u) => ry * 0.8 - ry * 0.66 * u).shape;
  // The gape between the fingers: dark, so the open claw reads at play size.
  d.pen.fill(at([pt(rx * 0.75, ry * 0.1), pt(rx + len * 0.95, -ry * 0.05), pt(rx + len, -ry * (0.2 + open * 0.9)), pt(rx * 0.75, -ry * 0.5)]), TIP, 0.9);
  for (const [shape, color] of [[pollex, HEMATITE], [dactyl, mix(HEMATITE, CHITIN, 0.3)]] as const) {
    const s = at(shape);
    paint(d, s, color, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.6, gloss: true });
    d.pen.clipped(s, () => dab(d, at(oval(rx + len, -ry * 0.1, len * 0.4, ry * 2.4, 12)), TIP, 0.8, 0.5));
  }
  // Teeth along both cutting edges.
  for (let k = 1; k <= 4; k++) {
    const u = k / 5.2;
    d.pen.dot(...xy(at([pt(rx + len * u, ry * 0.05)])[0]!), 0.34, PAPER_FILL, 0.85);
    d.pen.dot(...xy(at([pt(rx + len * u * 0.95, -ry * (0.45 + open * 1.1 * (0.6 + u * 0.5)))])[0]!), 0.3, PAPER_FILL, 0.75);
  }
  const palm = at(oval(0, 0, rx, ry, 20));
  paint(d, palm, HEMATITE, { alpha: 1, shadow: 0.6, hatch: 0.18, line: 0.75, gloss: true });
  d.pen.clipped(palm, () => {
    d.pen.stipple(palm, Math.round(rx * ry * 2.2), () => 0.5, 0.28, mix(HEMATITE, SHADOW, 0.5));
    dab(d, at(oval(-rx * 0.1, ry * 0.5, rx * 0.8, ry * 0.4, 12)), HEM_STREAK, 0.35, 0.8);
  });
  kidneyOre(d, at([pt(-rx * 0.2, -ry * 0.2)])[0]!, Math.min(rx, ry) * 0.55, 4, Math.round(rx * 100));
  gleam(d, at([pt(-rx * 0.6, -ry * 0.5), pt(-rx * 0.1, -ry * 0.78), pt(rx * 0.4, -ry * 0.7)]), 0.6, 0.55);
}


/** A walking leg on side `s`: merus up to the knee, carpus and propodus down, the dactyl a dark hematite spike, hairy along its edge. */
function leg(d: Draw, s: 1 | -1, base: Pt, knee: Pt, tip: Pt, depth: number): void {
  const color = mix(CHITIN, SHADOW, depth * 0.1);
  const ankle = pt(knee.x + (tip.x - knee.x) * 0.5 + s * 1, knee.y + (tip.y - knee.y) * 0.5);
  segment(d, base, knee, 3.6, 3, color);
  // A hematite plate along the top of the merus, as the shell's armour.
  d.pen.stroke([pt(base.x + (knee.x - base.x) * 0.2, base.y + (knee.y - base.y) * 0.2 - 0.6), pt(base.x + (knee.x - base.x) * 0.8, base.y + (knee.y - base.y) * 0.8 - 0.6)], 1.1, mix(HEMATITE, color, 0.3), 0.8, false);
  segment(d, knee, ankle, 2.8, 2.3, color);
  const dactyl = ribbon([ankle, pt((ankle.x + tip.x) / 2 + s * 0.4, (ankle.y + tip.y) / 2), tip], (u) => 2.1 - 1.8 * u).shape;
  paint(d, dactyl, mix(color, TIP, 0.55), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.5, gloss: true });
  setae(d, ankle, tip, 3, 1.1, s === 1 ? -1 : 1, 0.55);
  d.pen.hair([pt(knee.x - 1, knee.y + 0.6), pt(knee.x + 1, knee.y + 0.9)], 0.35, mix(color, SHADOW, 0.6), 0.7);
}

/** The body under the stone: the front face between shell and legs, with the mouthparts closed over the mouth like doors. */
function underbody(d: Draw, cy: number): void {
  const face = [...cub(pt(-13, cy), pt(-9, cy - 6.5), pt(9, cy - 6.5), pt(13, cy), 12), ...cub(pt(13, cy), pt(9, cy + 3.6), pt(-9, cy + 3.6), pt(-13, cy), 10).slice(1, -1)];
  paint(d, face, CHITIN_DARK, { alpha: 1, shadow: 0.5, hatch: 0.18, line: 0.7 });
  d.pen.clipped(face, () => dab(d, oval(0, cy + 2.5, 12, 2.2, 14), UNDER, 0.45, 0.8));
  for (const sx of [-1, 1]) paint(d, oval(sx * 1.4, cy - 0.8, 1.4, 1.9, 12), mix(CHITIN, UNDER, 0.4), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.35, lineAlpha: 0.7 });
}

/**
 * The stone's weathering, so the shell reads as rock under a painter's
 * brush and not a glazed pebble: grit, a few pits wind has scoured out of
 * the sandstone (dark, with a lit lower lip), and pen hatching across its
 * shadow side.
 */
function weathering(d: Draw, pts: readonly Pt[], cy: number): void {
  const st = TALUS_STYLE;
  d.pen.clipped(pts, () => {
    d.pen.stipple(pts, 70, (_, y) => (y < cy ? 0.4 : 0.75), 0.2, mix(st.grain, SHADOW, 0.2));
    d.pen.stipple(pts, 30, (_, y) => (y < cy ? 0.7 : 0.1), 0.2, '#f6dcc0');
    for (const [x, y, r] of [[-6.5, -3.5, 0.9], [-1.5, 2, 0.6], [5.5, -6.5, 0.7], [-10.5, 0.5, 0.55]] as const) {
      d.pen.fill(oval(x, cy + y, r, r * 0.7, 10), st.shade, 0.55);
      d.pen.hair([pt(x - r, cy + y + r * 0.4), pt(x, cy + y + r * 0.8), pt(x + r, cy + y + r * 0.4)], 0.3, '#f6dcc0', 0.6);
    }
  });
  shade(d, pts, 0.3);
}

/** The carapace: the boulder it has grown, inked red, with hematite armour weathering out along its lower flanks and the seam where it meets the body. */
function shell(d: Draw, cy: number): Pt[] {
  const cx = 0;
  const pts = talusStone(d, cx, cy, SHELL_S, SHELL_SEED, false);
  d.pen.clipped(pts, () => {
    // The armour's edge: a band of plate along the shell's rim, where the stone has worn back.
    const rim = blob(pt(cx, cy + SHELL_S * 0.42), SHELL_S * 0.55, SHELL_S * 0.14, 0.25, SHELL_SEED, 18);
    paint(d, rim, HEMATITE, { alpha: 0.95, shadow: 0.5, hatch: 0, line: 0.5, gloss: true });
    d.pen.hair(rim.filter((p) => p.y < cy + SHELL_S * 0.42).sort((a, b) => a.x - b.x), 0.4, HEM_LIT, 0.5);
  });
  weathering(d, pts, cy);
  kidneyOre(d, pt(cx + 8.5, cy + 4), 2.6, 4, 7401);
  kidneyOre(d, pt(cx - 9.5, cy + 5.5), 2, 3, 7402);
  kidneyOre(d, pt(cx + 2.5, cy - 7.5), 1.4, 3, 7403);
  return pts;
}

/** The eyes on long stalks (to see over its own rock), from the seam at the front, up in front of the stone. */
function eyestalks(d: Draw, base: number, top: number, lean: number): void {
  for (const [x, far] of [[-2.6, true], [2.8, false]] as const) {
    const b = pt(x, base);
    const t = pt(x * 1.9 + lean, top - (far ? 0 : 0.6));
    const mid = pt((b.x + t.x) / 2 + x * 0.15, (b.y + t.y) / 2);
    const stalk = ribbon([b, mid, t], (u) => 2 - 0.6 * u).shape;
    paint(d, stalk, far ? mix(CHITIN, SHADOW, 0.25) : CHITIN, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.5 });
    // The eye's cup: a ring of hematite round the cornea, as its armour.
    paint(d, oval(t.x, t.y - 0.4, 1.9, 1.7, 12), HEMATITE, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.45, gloss: true });
    paint(d, oval(t.x + 0.2, t.y - 1, 1.45, 1.75, 12), EYE, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.45, gloss: true });
    d.pen.dot(t.x - 0.2, t.y - 1.6, 0.42, PAPER_FILL, 0.95);
  }
}

/** Reared up: high on spread legs, eyestalks up, both claws raised and open over its rock, ready to pinch. */
function rearing(d: Draw): void {
  const cy = -21.5;
  const f = d.f;
  for (let i = 3; i >= 0; i--) {
    for (const s of [-1, 1] as const) {
      const base = pt(s * (10.5 - i * 0.6), -11.5 + i * 0.4);
      const knee = pt(s * (19 + i * 2.6), -19 + i * 1.3 + (i === f ? -0.4 : 0));
      const tip = pt(s * (16.6 + i * 3), -0.2);
      leg(d, s, base, knee, tip, i);
    }
  }
  underbody(d, -11.2);
  shell(d, cy);
  eyestalks(d, -12, -24.5, 0.4);
  // The claws: the arms up from the body's front corners, the chelae raised and gaping.
  segment(d, pt(-9.5, -10.6), pt(-14.8, -16.6), 3.2, 2.9, CHITIN, 0.6);
  segment(d, pt(-14.8, -16.6), pt(-17.4, -20.4), 2.9, 3, CHITIN, 0.6);
  chela(d, pt(-18.6, -23.4), 3.4, 2.6, -Math.PI / 2 - 0.6 - f * 0.03, 0.55 + f * 0.05, true);
  segment(d, pt(9.5, -10.6), pt(15.8, -15), 4, 3.6, CHITIN, 0.65);
  segment(d, pt(15.8, -15), pt(19.4, -18.8), 3.6, 3.8, CHITIN, 0.65);
  chela(d, pt(21.2, -22.4), 4.7, 3.6, -Math.PI / 2 + 0.78 + f * 0.03, 0.6 + (f === 1 ? 0.08 : 0));
}

/** The legs' footing for a scuttle step, as the shore crab's: pairs lifted mid-stride, the leading side reaching, the trailing side pushing. */
function runLegs(d: Draw, f: number, cy: number): void {
  for (let i = 3; i >= 0; i--) {
    for (const s of [-1, 1] as const) {
      const phase = (i + (s === 1 ? 0 : 1) + f) % 3;
      const lift = phase === 0 ? 3 : 0;
      const reach = phase === 0 ? 1.8 : phase === 1 ? 0 : -1.2;
      const base = pt(s * (10.5 - i * 0.6), cy - 11.6 + i * 0.4);
      const knee = pt(s * (15.5 + i * 2.3) + reach * 0.5, cy - 18.5 + i * 1.6 - lift * 0.5);
      const tip = pt(s * (16.4 + i * 2.6) + reach, -0.2 - lift);
      leg(d, s, base, knee, tip, i);
    }
  }
}

/** Scuttling sideways to the right: legs in a three-step cycle, body bobbing, claws held up in front of its face. */
function running(d: Draw): void {
  const f = d.f;
  const bob = [0, -0.8, -0.3][f]!;
  runLegs(d, f, bob);
  underbody(d, bob - 11.4);
  shell(d, bob - 21.6);
  eyestalks(d, bob - 12.4, bob - 23.5, 1.2);
  segment(d, pt(-8.6, bob - 10.2), pt(-12.6, bob - 13.6), 3, 2.7, CHITIN, 0.6);
  chela(d, pt(-11.4, bob - 8.6), 3, 2.3, 0.5, 0.15, false);
  segment(d, pt(9, bob - 10.6), pt(14.4, bob - 14.2), 3.8, 3.4, CHITIN, 0.65);
  segment(d, pt(14.4, bob - 14.2), pt(17.4, bob - 12.4), 3.4, 3.6, CHITIN, 0.65);
  chela(d, pt(19.4, bob - 10.4), 5, 3.8, -0.15 + f * 0.04, 0.25 + (f === 1 ? 0.15 : 0));
}

/**
 * Disguised: legs and claws folded under, so all that shows is its stone,
 * drawn by the loose rock's own `boulder` so it can't be told from them.
 * The tells, for a sharp eye: a fine seam low on the front where the stone
 * gives way to plate, a shadowed slot beneath it, and two eye nubs laid flat.
 */
function disguised(d: Draw): void {
  const cy = -SHELL_S * 0.42;
  boulder(d.pen.ctx, 0, cy, SHELL_S, SHELL_SEED, TALUS_STYLE);
  const pts = stoneOutline(0, cy, SHELL_S, SHELL_SEED);
  d.pen.clipped(pts, () => {
    const seam = cub(pt(-11, -3.2), pt(-5, -5.4), pt(5, -5.4), pt(11.5, -3), 12);
    dab(d, [...seam, pt(12, 1), pt(-12, 1)], TALUS_STYLE.shade, 0.22, 0.8);
    d.pen.hair(seam, 0.4, d.ink, 0.45);
    // The eye nubs, folded flat into their sockets just under the seam.
    for (const x of [4.4, 7.4]) {
      paint(d, oval(x, -3.6, 1.15, 0.7, 10), mix(TALUS_STYLE.stone, HEMATITE, 0.5), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.3, lineAlpha: 0.5 });
      d.pen.dot(x - 0.3, -3.85, 0.25, PAPER_FILL, 0.55);
    }
  });
}

/** The boulder crab facing right: `boulder` (disguised), `rear` (about to pinch) or `run` with `d.f` as the step. */
export function drawRockcrab(d: Draw, pose: RockcrabPose): void {
  if (pose === 'boulder') {
    disguised(d);
    return;
  }
  dab(d, oval(0, 0.3, 24, 1.9, 20), SHADOW, 0.18, 1.2);
  if (pose === 'rear') rearing(d);
  else running(d);
}
