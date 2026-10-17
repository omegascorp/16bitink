import { cub, oval, pt, ribbon, type Draw } from '../kit';
import { mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blob, FLESH, tube, veins } from './flesh';

/**
 * The snap tendril (a dropper, hostile, inked in red): a single hypha of
 * the cave roof grown thick and muscular. A knotted anchor bores into the
 * ceiling, rooted through the rock by pale threads; from it hangs a whip
 * ringed like a worm, which coils up tight under the anchor and lashes down
 * when something warm passes. It ends in a frond of hooked fingers that
 * close round what it catches and haul it up to be digested. Drawn with the
 * origin at the anchor on the ceiling; it hangs down (+y).
 */
export const TENDRIL_ART = { w: 40, h: 128, ox: 20, oy: 6 } as const;
/** Units from the anchor to the frond's tip at full reach (3.5 tiles). */
export const TENDRIL_REACH = 112;

/** Where the whip leaves the knot. */
const ROOT_Y = 8;
/** The frond's length past the whip's end. */
const FROND = 16;
/** The whip's length coiled up at reach 0 (it contracts as it coils, as muscle does). */
const COILED = 44;

/** The whip's spine for a reach: a lazy S hanging down, then whatever's left of it wound into a coil. */
function spine(reach: number, f: number): Pt[] {
  const hang = 6 + reach * (TENDRIL_REACH - ROOT_Y - FROND - 6);
  const coil = (1 - reach) * COILED;
  const ds = 2;
  const pts: Pt[] = [];
  const sway = 3.5 * (1 - reach * 0.6);
  for (let s = 0; s <= hang; s += ds) {
    const u = s / hang;
    pts.push(pt(Math.sin(u * Math.PI * 1.4 + f * 0.3) * sway * u - u * reach * 1.5, ROOT_Y + s));
  }
  if (coil < 2) return pts;
  // The coil: heading on from the hang, turning ever tighter.
  let p = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2] ?? pt(p.x, p.y - 1);
  let heading = Math.atan2(p.y - prev.y, p.x - prev.x);
  const r0 = 5 + coil * 0.17;
  for (let s = 0; s < coil; s += ds * 0.75) {
    const r = r0 - (r0 - 3) * (s / coil);
    heading -= (ds * 0.75) / r;
    p = pt(p.x + Math.cos(heading) * ds * 0.75, p.y + Math.sin(heading) * ds * 0.75);
    pts.push(p);
  }
  return pts;
}

/** Width of the whip along its length, u 0 (the knot) .. 1 (the frond). */
const girth = (u: number): number => 6.6 - 3.6 * u;

/** Rings round the whip every few units, and pale barbs along its inner side to grip with. */
function rings(d: Draw, pts: readonly Pt[], top: readonly Pt[], bot: readonly Pt[]): void {
  for (let i = 3; i < pts.length - 1; i += 3) {
    const a = top[i]!;
    const b = bot[i]!;
    const m = pt((a.x + b.x) / 2 + 0.4, (a.y + b.y) / 2 + 0.6);
    d.pen.hair([a, m, b], 0.4, mix(FLESH.whip, SHADOW, 0.7), 0.8);
    d.pen.hair([pt(a.x, a.y - 0.6), pt(m.x, m.y - 0.6), pt(b.x, b.y - 0.6)], 0.3, FLESH.pale, 0.45);
    if (i % 6 === 0) d.pen.dot(b.x + (a.x - b.x) * 0.15, b.y + (a.y - b.y) * 0.15, 0.55, FLESH.pale, 0.9);
  }
}

/** The anchor: a knot of flesh bored into the ceiling, threads spreading out through the rock from it. */
function anchor(d: Draw): void {
  for (const [x, y, s] of [[-19, -2, 1], [19, -3, -1], [-14, -6, 1], [13, -6, -1], [-6, -6, 1], [7, -6, -1]] as const) {
    const end = pt(x, y);
    const mid = pt(x * 0.5 + s * 1.5, y * 0.4 + 1.2);
    d.pen.stroke([pt(s * -1, 1.5), mid, end], 1, d.ink, 0.7, false);
    d.pen.hair([pt(s * -1, 1.3), mid, end], 0.55, FLESH.pale, 0.9);
  }
  const knot = blob(pt(0, 3), 7.5, 6, 0.25, 41, 20);
  paint(d, knot, mix(FLESH.whip, FLESH.raw, 0.3), { alpha: 1, shadow: 0.6, hatch: 0.25, line: 0.8 });
  // Lumps and the twist of the knot.
  d.pen.hair(cub(pt(-5, 0), pt(-2, 3), pt(2, 1), pt(5, 5), 8), 0.45, mix(FLESH.whip, SHADOW, 0.6), 0.8);
  d.pen.hair(cub(pt(-4.6, 5), pt(-1, 7), pt(2, 6), pt(4, 7.6), 8), 0.45, mix(FLESH.whip, SHADOW, 0.6), 0.7);
  d.pen.clipped(knot, () => veins(d, pt(-6, 1), pt(3, 8), FLESH.vein, 0.45, 0.6, 1));
  d.pen.dot(-2.6, 0.6, 0.9, PAPER_FILL, 0.6);
}

/** One hooked finger of the frond, from `base` along `angle`, curling by `curl` at its end. */
function finger(d: Draw, base: Pt, angle: number, len: number, curl: number): void {
  const pts: Pt[] = [];
  let a = angle;
  let p = base;
  const n = 7;
  for (let i = 0; i <= n; i++) {
    pts.push(p);
    a += curl * (i / n) * 0.55;
    p = pt(p.x + Math.cos(a) * (len / n), p.y + Math.sin(a) * (len / n));
  }
  const shape = ribbon(pts, (u) => 3.2 - 2.4 * u).shape;
  paint(d, shape, mix(FLESH.whip, FLESH.raw, 0.4), { alpha: 1, shadow: 0.5, hatch: 0, line: 0.6 });
  // The hook: a bone-pale claw at its tip.
  const tip = pts[pts.length - 1]!;
  const ta = a;
  const claw = [pt(tip.x - Math.sin(ta) * 0.7, tip.y + Math.cos(ta) * 0.7), pt(tip.x + Math.cos(ta + curl * 0.6) * 4.2, tip.y + Math.sin(ta + curl * 0.6) * 4.2), pt(tip.x + Math.sin(ta) * 0.7, tip.y - Math.cos(ta) * 0.7)];
  paint(d, claw, FLESH.pale, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
}

/** The frond at the whip's end: a club of flesh with five hooked fingers, splayed open or clenched shut. */
function frond(d: Draw, at: Pt, dir: number, grab: boolean): void {
  const spread = grab ? [-0.32, -0.12, 0.1, 0.28] : [-1.15, -0.45, 0.35, 1.05];
  const len = grab ? 11 : 13;
  const base = (k: number): Pt => pt(at.x + Math.cos(dir) * 2 + Math.cos(dir + Math.PI / 2) * k, at.y + Math.sin(dir) * 2 + Math.sin(dir + Math.PI / 2) * k);
  // The far fingers first, the near ones over them.
  spread.forEach((s, i) => {
    const side = s < 0 ? -1 : 1;
    finger(d, base(s * 2.8), dir + s, len - Math.abs(i - 1.5) * 0.8, grab ? -side * 2.6 : -side * 1.6);
  });
  finger(d, base(0), dir, len + 1, grab ? 2.2 : 0.5);
  const club = oval(at.x + Math.cos(dir) * 1, at.y + Math.sin(dir) * 1, 4.4, 4.4, 14);
  paint(d, club, mix(FLESH.whip, FLESH.raw, 0.25), { alpha: 1, shadow: 0.55, hatch: 0, line: 0.7 });
  d.pen.dot(at.x - 1, at.y - 0.6, 0.6, PAPER_FILL, 0.7);
}

/**
 * The tendril at a `reach` from 0 (coiled tight under its anchor) to 1
 * (lashed down its full length), its frond open, or clenched when `grab`.
 */
export function drawTendril(d: Draw, reach: number, grab: boolean): void {
  const r = Math.max(0, Math.min(1, reach));
  const pts = spine(r, d.f);
  const t = tube(d, pts, girth, FLESH.whip);
  rings(d, pts, t.top, t.bot);
  const end = pts[pts.length - 1]!;
  const before = pts[pts.length - 3] ?? pts[0]!;
  frond(d, end, Math.atan2(end.y - before.y, end.x - before.x), grab);
  anchor(d);
}
