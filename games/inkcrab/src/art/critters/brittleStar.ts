import { closed, cub, type Draw, edge, oval, pt, ribbon, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

/**
 * A brittle star (an ophiuroid, such as Ophiocoma or Ophiolepis) out on
 * the sand at night, side-on and low, as if from a little above: a small,
 * flat, round central disc, quite separate from its five long, thin,
 * snaking arms. It doesn't creep on tube feet as a sea star does; one arm
 * leads, the two beside it row it along in jerky strokes, and the last two
 * trail. Each arm is a chain of little jointed plates fringed with short
 * spines along its sides, banded dark and pale. Pale grey-violet, the
 * disc patterned with the paler shields at the arms' roots.
 */
const ARM = '#bdb0cc';
const FAR = '#a597b8';
const BAND = '#6c5a86';
const DISC = '#a493bb';
const PALE = '#ece6f3';

/**
 * One arm along `spine`, base first: tapering to a thread, banded across
 * every few plates, short spines raked towards the tip along both sides.
 */
function arm(d: Draw, spine: readonly Pt[], w0: number, far: boolean): void {
  const { pen } = d;
  const body = ribbon(spine, (u) => 0.5 + (w0 - 0.5) * (1 - u) ** 0.85);
  skin(d, body.shape, far ? FAR : ARM, far ? 0.9 : 0.75);
  if (far) pen.fill(body.shape, d.ink, 0.12);
  const n = spine.length;
  // Dark bands of a plate or two, every few plates, and a pale line of shields along the top between them.
  for (let k = 2; k < n - 2; k += 3) {
    const band = [body.top[k]!, body.top[k + 1]!, body.bot[k + 1]!, body.bot[k]!];
    pen.fill(band, BAND, far ? 0.45 : 0.7);
  }
  if (!far) pen.hair(spine.slice(1, -3).map((p, i) => pt(p.x, p.y - w0 * 0.14 * (1 - i / n))), 0.6, PALE, 0.65);
  if (!far) {
    // The fringe of spines along each side, standing out of the contour and raked towards the tip.
    for (let k = 1; k < n - 2; k += 2) {
      const a = spine[k]!;
      const b = spine[k + 1]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const [ux, uy] = [(b.x - a.x) / l, (b.y - a.y) / l];
      const len = 1.2 + w0 * 0.4 * (1 - k / n);
      for (const side of [body.top[k]!, body.bot[k]!]) {
        const nx = side.x - a.x;
        const ny = side.y - a.y;
        const m = Math.hypot(nx, ny) || 1;
        pen.hair([side, pt(side.x + (nx / m) * len * 0.8 + ux * len * 0.7, side.y + (ny / m) * len * 0.8 + uy * len * 0.7)], 0.5, d.ink, 0.8);
      }
    }
  }
  pen.stroke(closed(body.shape), far ? 0.6 : 0.85, d.ink, far ? 0.55 : 0.95, false);
}

/** The disc: a low dome, seen a little from above, the arm-root shields and the radiating pattern on top. */
function disc(d: Draw, c: Pt): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(c.x - 9.6, c.y + 1.6), pt(c.x - 9.4, c.y - 6.4), pt(c.x + 9.4, c.y - 6.4), pt(c.x + 9.6, c.y + 1.6), 14),
    ...cub(pt(c.x + 9.6, c.y + 1.6), pt(c.x + 8, c.y + 4.8), pt(c.x - 8, c.y + 4.8), pt(c.x - 9.6, c.y + 1.6), 10).slice(1),
  ];
  skin(d, shape, DISC, 0.8);
  pen.clipped(shape, () => {
    // Five pale pairs of shields where the arms join, foreshortened around the dome.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.5;
      const p = pt(c.x + Math.cos(a) * 7, c.y - 1.8 + Math.sin(a) * 3);
      tint(d, oval(p.x, p.y, 2.2, 1.2, 8), PALE, 0.9);
      pen.hair([pt(c.x, c.y - 2.2), pt(c.x + Math.cos(a + 0.63) * 8.6, c.y - 1.8 + Math.sin(a + 0.63) * 3.6)], 0.8, BAND, 0.6);
    }
    pen.dot(c.x, c.y - 2, 1.2, BAND, 0.7);
    pen.stipple(shape, 40, () => 0.5, 0.3, BAND);
    // The disc's underside in shadow.
    tint(d, oval(c.x, c.y + 4, 9, 2.4, 14), d.ink, 0.15);
  });
  shade(d, shape, 0.35);
  pen.stroke(cub(pt(c.x - 6, c.y - 3), pt(c.x - 4, c.y - 4.6), pt(c.x - 1, c.y - 4.8), pt(c.x + 1, c.y - 4.6), 6), 0.9, PAPER_FILL, 0.6, false);
  edge(d, shape, 0.95);
}

/** An arm's spine: an arch from the disc down to the sand at `foot`, then along it to a curled tip `dx` further on. */
function arched(base: Pt, rise: number, foot: Pt, dx: number, curl: number): Pt[] {
  const dir = Math.sign(dx);
  return [
    ...cub(base, pt(base.x + dir * 3, base.y - rise), pt(foot.x - dir * 4.5, foot.y - 4), foot, 12),
    ...cub(foot, pt(foot.x + dx * 0.4, foot.y + 0.6), pt(foot.x + dx * 0.8, foot.y - 0.2), pt(foot.x + dx, foot.y - curl), 8).slice(1),
  ];
}

export function brittleStar(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(0, g - 1, 30, 2.2, 24), d.ink, 0.09);
  // One stroke of the rowing arms per cycle: reach forward lifted, plant, sweep back, the disc lurching on.
  const ph = -d.f * (TAU / 3);
  const row = Math.cos(ph) * 3;
  const lift = Math.max(0, Math.sin(ph)) * 2.4;
  const c = pt(-row * 0.4, g - 12.5 - lift * 0.5);
  const wave = Math.sin(ph);
  // The far arms, behind: one raised in a snaking S, feeling the night air, one reaching ahead, one trailing on the sand.
  arm(d, [...cub(pt(c.x - 3, c.y - 1), pt(c.x - 8, c.y - 8), pt(c.x - 16, c.y - 2), pt(c.x - 19, c.y - 8 - wave), 10), ...cub(pt(c.x - 19, c.y - 8 - wave), pt(c.x - 20, c.y - 13), pt(c.x - 25, c.y - 14 + wave), pt(c.x - 27, c.y - 10 + wave), 6).slice(1)], 3.8, true);
  arm(d, arched(pt(c.x + 4, c.y), 5, pt(16 - row * 0.5, g - 1.4), 13, 3 + wave), 3.8, true);
  arm(d, [...cub(pt(c.x - 5, c.y + 1), pt(c.x - 10, c.y + 4), pt(-14, g - 2), pt(-20, g - 1.2), 8), ...cub(pt(-20, g - 1.2), pt(-24, g - 0.6 - wave), pt(-28, g - 3 + wave), pt(-31, g - 1.6), 8).slice(1)], 3.8, true);
  // The two rowing arms towards us, foreshortened, arched off the disc and planted, their tips hooked on the sand.
  arm(d, arched(pt(c.x - 4, c.y + 2.4), 5, pt(-11 - row, g - lift * 0.5), -13, 2.4 - wave), 4.6, false);
  arm(d, arched(pt(c.x + 4, c.y + 2.4), 6 + lift, pt(10 - row, g - lift), 14, 2.6 + wave * 1.2), 4.6, false);
  disc(d, c);
}
