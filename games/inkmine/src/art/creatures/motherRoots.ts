import { cub, pt, type Draw } from '../kit';
import { glow, mix } from '../paint';
import type { Pt } from '../pen';
import { FLESH, tube } from './flesh';

/**
 * The Mother Mycel's roots: cords of mycelium as thick as an arm where they
 * leave it, running out over the chamber's floor, up its walls and into
 * its roof, splitting into threads that bore into the rock. Light pulses out
 * along them with each beat. Same origin as the Mother (middle of its base).
 */

/** One cord: its path (four control points), its width where it leaves the Mother and at the rock. */
interface Cord {
  readonly p: readonly [Pt, Pt, Pt, Pt];
  readonly w0: number;
  readonly w1: number;
}

const CORDS: readonly Cord[] = [
  // Over the floor.
  { p: [pt(-60, -10), pt(-95, -4), pt(-130, -6), pt(-160, -12)], w0: 15, w1: 4 },
  { p: [pt(60, -10), pt(100, -3), pt(132, -8), pt(160, -6)], w0: 15, w1: 4 },
  // Low up the walls.
  { p: [pt(-70, -48), pt(-110, -52), pt(-135, -80), pt(-160, -88)], w0: 12, w1: 3 },
  { p: [pt(72, -44), pt(112, -56), pt(140, -74), pt(160, -100)], w0: 12, w1: 3 },
  // Across the walls at the middle.
  { p: [pt(-80, -120), pt(-112, -128), pt(-138, -150), pt(-160, -158)], w0: 9, w1: 2.5 },
  { p: [pt(80, -125), pt(115, -140), pt(138, -165), pt(160, -170)], w0: 9, w1: 2.5 },
  // Up into the roof.
  { p: [pt(-48, -170), pt(-80, -200), pt(-104, -222), pt(-128, -236)], w0: 11, w1: 3 },
  { p: [pt(46, -175), pt(72, -205), pt(92, -222), pt(116, -236)], w0: 11, w1: 3 },
  { p: [pt(-6, -188), pt(-14, -205), pt(4, -222), pt(-2, -236)], w0: 13, w1: 5 },
];

const CORD_WASH = mix(FLESH.heart, FLESH.pale, 0.5);

/** A point `t` along a cord. */
function along(c: Cord, t: number): Pt {
  return cub(c.p[0], c.p[1], c.p[2], c.p[3], 20)[Math.round(t * 20)]!;
}

/** Threads splitting off a cord into the rock: fine tapered lines, each with a fork. */
function threads(d: Draw, c: Cord, i: number): void {
  for (const [t, s] of [[0.45, 1], [0.72, -1], [0.92, 1]] as const) {
    const a = along(c, t);
    const b = along(c, Math.min(1, t + 0.1));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = 26 - t * 10;
    const l = Math.hypot(dx, dy) || 1;
    const end = pt(a.x + (dx / l) * len * 0.6 - (dy / l) * len * s, a.y + (dy / l) * len * 0.6 + (dx / l) * len * s);
    const mid = pt((a.x + end.x) / 2 + s * 3, (a.y + end.y) / 2 - 2);
    d.pen.stroke([a, mid, end], 1.4 - t * 0.6, d.ink, 0.75, false);
    d.pen.hair([a, mid, end], 0.6, FLESH.pale, 0.85);
    const fork = pt(end.x + (i % 2 ? 6 : -6), end.y - 5);
    d.pen.hair([mid, pt((mid.x + fork.x) / 2, (mid.y + fork.y) / 2 + 2), fork], 0.55, d.ink, 0.6);
  }
}

/** All the roots, with a bead of light running out along each: further out the further the beat has got. */
export function motherRoots(d: Draw, beat: 0 | 1 | 2): void {
  CORDS.forEach((c, i) => {
    threads(d, c, i);
    const pts = cub(c.p[0], c.p[1], c.p[2], c.p[3], 24);
    const t = tube(d, pts, (u) => c.w0 + (c.w1 - c.w0) * u, CORD_WASH);
    // Knuckles along the cord where it grips the rock.
    for (let k = 4; k < pts.length - 2; k += 5) {
      const a = t.top[k]!;
      const b = t.bot[k]!;
      d.pen.hair([a, pt((a.x + b.x) / 2 + 0.6, (a.y + b.y) / 2 + 0.8), b], 0.5, mix(CORD_WASH, '#1e2350', 0.55), 0.75);
    }
    const lit = along(c, 0.18 + beat * 0.28);
    glow(d.pen.ctx, lit, 7 + beat * 3, FLESH.pore, 0.35 + beat * 0.15);
    d.pen.dot(lit.x, lit.y, 1.4 + beat * 0.4, mix(FLESH.pore, '#ffffff', 0.4), 0.9);
  });
}
