import { claw } from '../../../src/art/crabArt';
import { limb } from '../../../src/art/critters/limb';
import { capsule, cub, type Draw, edge, eyeDot, mottle, oval, pt, shade, skin, TAU, tube } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { lerp } from '../short';

/**
 * One ten-legged crustacean that can be anything from a long-tailed,
 * lobster-like ancestor (m = 0) to a crab (m = 1): the morph the short is
 * about. Carcinization in one parameter: the shell widens and deepens, the
 * tail shortens and folds under the body (its fan shrinking away), the legs
 * splay out sideways and the long antennae shorten. Drawn with the game's
 * pen kit (skin, shade, edge, the critters' jointed limbs and the hermit
 * crab's claw), side-on and facing right, standing on local y = 0.
 */
export interface Look {
  readonly wash: string;
  /** The dark tips of legs and claws. */
  readonly tip: string;
  /** Claw size, 0.5 slender .. 1 big. */
  readonly claw: number;
}

/** The fixed parts of the drawing at a given m: shell centre and radii, tail spine. */
function bodyOf(m: number): { readonly c: Pt; readonly rx: number; readonly ry: number } {
  return { c: pt(0, -lerp(16, 28, m)), rx: lerp(21, 31, m), ry: lerp(9, 14, m) };
}

/** The shell, side-on: a dome over a flatter belly. */
function carapace(m: number): Pt[] {
  const { c, rx, ry } = bodyOf(m);
  return Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * TAU;
    const s = Math.sin(a);
    return pt(c.x + rx * Math.cos(a), c.y + (s < 0 ? ry : ry * 0.72) * s);
  });
}

const SEGMENTS = 6;

/** The tail's spine: straight back (drooping a little) when long, curled down and under the body as it becomes a crab. */
function tailSpine(m: number): Pt[] {
  const { c, rx, ry } = bodyOf(m);
  const len = lerp(10.5, 2.8, m);
  const turn = lerp(0.07, (1.2 * Math.PI) / SEGMENTS, m);
  const pts = [pt(c.x - rx * lerp(0.82, 0.3, m), c.y + ry * lerp(-0.05, 0.1, m))];
  for (let i = 0; i < SEGMENTS; i++) {
    const a = Math.PI - turn * (i + 0.5);
    const p = pts[i]!;
    pts.push(pt(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len));
  }
  return pts;
}

function tail(d: Draw, m: number, look: Look): void {
  const spine = tailSpine(m);
  const shrink = lerp(1, 0.5, m);
  const fan = 1 - m;
  if (fan > 0.04) {
    // The tail fan: five blades spread from the last segment.
    const end = spine[SEGMENTS]!;
    const prev = spine[SEGMENTS - 1]!;
    const a = Math.atan2(end.y - prev.y, end.x - prev.x);
    for (const spread of [-0.75, -0.38, 0, 0.38, 0.75]) {
      const b = a + spread;
      const tip = pt(end.x + Math.cos(b) * 12 * fan, end.y + Math.sin(b) * 12 * fan);
      const blade = tube(cub(end, end, tip, tip, 6), 6 * fan, 1.5 * fan);
      skin(d, blade, look.wash, 0.5);
      edge(d, blade, 0.8);
    }
  }
  for (let i = SEGMENTS - 1; i >= 0; i--) {
    const w0 = lerp(12.5, 7, i / SEGMENTS) * shrink;
    const w1 = lerp(12.5, 7, (i + 1) / SEGMENTS) * shrink;
    const plate = capsule(spine[i]!, spine[i + 1]!, w0, w1);
    skin(d, plate, look.wash, 0.6);
    shade(d, plate, 0.35);
    edge(d, plate, 0.9);
  }
}

/**
 * Four walking legs a side: tucked under a long body; on a crab (as the
 * game's shore crab) splayed low and wide, knees arched up level with the
 * shoulder, feet far out in front and behind.
 */
const CRAB_FEET = [48, 37, -37, -48] as const;
function legs(d: Draw, m: number, look: Look, far: boolean): void {
  const { c, rx, ry } = bodyOf(m);
  const bottom = c.y + ry * 0.72;
  CRAB_FEET.forEach((crabFoot, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * lerp(2.4, 3.5, m);
    const lift = Math.max(0, Math.sin(ph)) * lerp(2.4, 4, m);
    const hip = pt(c.x + lerp(rx * lerp(0.32, -0.42, i / 3), crabFoot * 0.3, m) + (far ? -3 : 0), bottom - lerp(2, 3, m) + (far ? -2.5 : 0));
    const footX = lerp(hip.x + [9, 3, -3, -9][i]!, crabFoot, m);
    const foot = pt(footX + step + (far ? -4 : 0), -lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.5, lerp(hip.y - 1, bottom - 8, m) - lift);
    const ankle = pt(hip.x + reach * 0.88, lerp(hip.y * 0.45, bottom + 2, m) - lift * 0.6);
    const w = lerp(2.6, 5.2, m);
    limb(d, [hip, knee, ankle, foot], { widths: [w, w * 0.85, w * 0.6, 0.6], wash: look.wash, band: look.tip, hairs: far ? 0 : 2, far });
  });
}

/** The big claws, from the hermit crab's own: the far one smaller and behind. */
function claws(d: Draw, m: number, look: Look, far: boolean, open: number): void {
  const { c, rx, ry } = bodyOf(m);
  const s = look.claw * lerp(0.4, 0.56, m) * (far ? 0.82 : 1);
  const shoulder = pt(c.x + rx * lerp(0.62, 0.7, m) + (far ? -3 : 0), c.y + ry * lerp(0.4, 0.45, m) + (far ? -3 : 0));
  claw(d, shoulder.x - 34 * s, shoulder.y - 8 * s, s, look.wash, open, far, look.tip);
}

function head(d: Draw, m: number): void {
  const { pen } = d;
  const { c, rx, ry } = bodyOf(m);
  // Long whips for antennae on a lobster, short feelers on a crab.
  const base = pt(c.x + rx * 0.92, c.y - ry * 0.25);
  const a = lerp(62, 18, m);
  const sway = [0, 1.5, -1][d.f]!;
  pen.stroke(cub(base, pt(base.x + a * 0.35, base.y - a * 0.42), pt(base.x + a * 0.7, base.y - a * 0.5 + sway), pt(base.x + a, base.y - a * 0.28 + sway), 12), 0.8, d.ink, 0.9, false);
  pen.stroke(cub(base, pt(base.x + a * 0.3, base.y - a * 0.15), pt(base.x + a * 0.6, base.y - a * 0.1), pt(base.x + a * 0.82, base.y + a * 0.04 - sway), 12), 0.6, d.ink, 0.75, false);
  // An eye on a short stalk at the front of the shell.
  const root = pt(c.x + rx * 0.72, c.y - ry * 0.62);
  const eye = pt(root.x + 3, root.y - lerp(4, 7, m));
  pen.stroke([root, eye], 1.8, d.ink, 1, false);
  eyeDot(d, eye.x, eye.y, 2.1);
}

/**
 * The whole animal at m (0 lobster-like .. 1 crab). Back to front: far legs
 * and claw, the tail (so a crab's tucks out of sight under its shell), the
 * shell, then the near legs, claw, eye and antennae.
 */
export function drawDecapod(d: Draw, m: number, look: Look): void {
  const open = [1, 3, 2][d.f]!;
  legs(d, m, look, true);
  claws(d, m, look, true, open * 0.6);
  tail(d, m, look);
  const shell = carapace(m);
  const { c, rx, ry } = bodyOf(m);
  // A rostrum spike in front of a lobster's shell; a crab has none.
  if (m < 0.85) {
    const spike = tube([pt(c.x + rx * 0.8, c.y - ry * 0.35), pt(c.x + rx + 9 * (1 - m), c.y - ry * 0.55)], 3.5 * (1 - m), 0.4);
    skin(d, spike, look.wash, 0.6);
    edge(d, spike, 0.8);
  }
  skin(d, shell, look.wash, 0.62);
  mottle(d, shell, 40, c.y - ry, c.y + ry, look.tip);
  shade(d, shell, 0.45);
  // The groove across the shell, and the row of small teeth along a crab's front edge.
  d.pen.hair(cub(pt(c.x - rx * 0.1, c.y - ry), pt(c.x - rx * 0.2, c.y - ry * 0.3), pt(c.x - rx * 0.1, c.y + ry * 0.2), pt(c.x - rx * 0.25, c.y + ry * 0.6), 8), 0.6, d.ink, 0.6);
  edge(d, shell, 1.15);
  if (m > 0.5) {
    for (let i = 0; i < 4; i++) {
      const a = -0.35 - i * 0.28;
      const p = pt(c.x + rx * Math.cos(a), c.y + ry * Math.sin(a));
      d.pen.hair([p, pt(p.x + Math.cos(a) * 2.6, p.y + Math.sin(a) * 2.6)], 0.8, d.ink, (m - 0.5) * 2 * 0.8);
    }
  }
  legs(d, m, look, false);
  claws(d, m, look, false, open);
  head(d, m);
  d.pen.fill(oval(c.x, 0.5, rx * 1.1, 2.5, 20), d.ink, 0.08);
}
