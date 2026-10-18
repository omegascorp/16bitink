import { capsule, cub, oval, pt, ribbon, setae, type Draw } from '../kit';
import { dab, gleam, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blob } from './flesh';

/**
 * The shore crab (a walker, harmless, inked in blue): Brine's crab-form,
 * scuttling over the salt-crusted basalt of the islands. On Earth the crab
 * shape evolved at least five separate times ("carcinisation"), so a crab
 * on a sea world is the likeliest animal there is. Its carapace is a broad
 * purple-grey shield, granular, toothed along its front edges, and crusted
 * white where spray dries on it to salt; it walks sideways on four pairs of
 * jointed legs, as real crabs do, its eyes up on stalks. Like a fiddler crab
 * it has one great claw (for show and for fights) and one small one that
 * picks food to its mouth. Frightened, it pulls everything in and sits
 * still: legs folded under, the claw over its face, eyes laid flat in their
 * sockets, and a salt-crusted crab is a stone among stones. Seen from the
 * front (the way it walks across the screen) and facing right, the big claw
 * on its right; origin at the middle of its underside on the ground (y = 0).
 */
export const CRAB_ART = { w: 56, h: 34, ox: 27, oy: 31 } as const;
export type CrabPose = 'walk' | 'tucked';

const SHELL = '#877b98';
const SHELL_FACE = '#665b78';
const LEG = '#9b8daa';
const CLAW = '#a08fae';
const TIP = '#3a3048';
const SALT = '#f7f4ef';
const SALT_SHADE = '#bdb5c9';
const EYE = '#241e30';

/** One jointed segment of a leg or claw, painted. */
function segment(d: Draw, a: Pt, b: Pt, w0: number, w1: number, color: string, line = 0.55): void {
  paint(d, capsule(a, b, w0, w1), color, { alpha: 1, shadow: 0.5, hatch: 0, line });
}

/**
 * A walking leg on side `s` (1 right, -1 left): the merus up to the knee,
 * the carpus and propodus down to the ankle, then the dactyl tapering to a
 * point, hairy along its edge. The far pairs are a little darker.
 */
function leg(d: Draw, s: 1 | -1, base: Pt, knee: Pt, tip: Pt, depth: number): void {
  const color = mix(LEG, SHADOW, depth * 0.12);
  const ankle = pt(knee.x + (tip.x - knee.x) * 0.5 + s * 0.9, knee.y + (tip.y - knee.y) * 0.5);
  segment(d, base, knee, 2.7, 2.3, color);
  segment(d, knee, ankle, 2.1, 1.8, color);
  const dactyl = ribbon([ankle, pt(ankle.x + (tip.x - ankle.x) * 0.5 + s * 0.4, ankle.y + (tip.y - ankle.y) * 0.5), tip], (u) => 1.6 - 1.35 * u).shape;
  paint(d, dactyl, mix(color, TIP, 0.35), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.5 });
  setae(d, ankle, tip, 3, 1.1, s === 1 ? -1 : 1, 0.6);
  // A pale band at the knee, and a speck of dried salt.
  d.pen.hair([pt(knee.x - 1, knee.y + 0.6), pt(knee.x + 1, knee.y + 0.9)], 0.35, mix(color, SHADOW, 0.6), 0.7);
  d.pen.dot(knee.x - s * 0.3, knee.y - 0.7, 0.45, SALT, 0.9);
}

/** The carapace's outline, `cy` lower than when standing: a broad shield, toothed along its front edges, its underside edge curving in. */
function shellShape(cy: number): Pt[] {
  const y = (v: number): number => v + cy;
  const side = (s: number): Pt[] => [pt(s * 15.5, y(-10.4)), pt(s * 16.6, y(-12.5)), pt(s * 15.1, y(-13.2)), pt(s * 15.9, y(-15.3)), pt(s * 14, y(-15.9))];
  return [
    ...side(-1),
    ...cub(pt(-14, y(-15.9)), pt(-10.5, y(-22)), pt(10.5, y(-22)), pt(14, y(-15.9)), 14).slice(1, -1),
    ...side(1).reverse(),
    ...cub(pt(15.5, y(-10.4)), pt(12, y(-6.2)), pt(-12, y(-6.2)), pt(-15.5, y(-10.4)), 12).slice(1, -1),
  ];
}

/** Salt crust: a patch of dried white, raised and crystalline, with a grey rim where it meets the shell. */
function crust(d: Draw, c: Pt, rx: number, ry: number, seed: number): void {
  const shape = blob(c, rx, ry, 0.55, seed, 14);
  paint(d, shape, SALT, { alpha: 1, shadow: 0.35, hatch: 0, line: 0.35, lineAlpha: 0.55 });
  d.pen.stipple(shape, Math.round(rx * ry * 3), () => 0.6, 0.28, SALT_SHADE);
  d.pen.hair([pt(c.x - rx * 0.4, c.y + ry * 0.1), pt(c.x, c.y - ry * 0.3), pt(c.x + rx * 0.3, c.y + ry * 0.2)], 0.25, SALT_SHADE, 0.7);
}

/** The carapace: painted, granular, its grooves and front face, crusted with salt. */
function carapace(d: Draw, cy: number): void {
  const shape = shellShape(cy);
  paint(d, shape, SHELL, { alpha: 1, shadow: 0.55, hatch: 0.2, line: 0.85 });
  const y = (v: number): number => v + cy;
  d.pen.clipped(shape, () => {
    // The front face below the frontal margin, turned away from the light.
    const face = [pt(-17, y(-11.6)), ...cub(pt(-13, y(-11.6)), pt(-6, y(-13.2)), pt(6, y(-13.2)), pt(13, y(-11.6)), 10), pt(17, y(-11.6)), pt(17, y(-4)), pt(-17, y(-4))];
    dab(d, face, SHELL_FACE, 0.55, 0.6);
    d.pen.hair(cub(pt(-13, y(-11.6)), pt(-6, y(-13.2)), pt(6, y(-13.2)), pt(13, y(-11.6)), 10), 0.45, mix(SHELL, PAPER_FILL, 0.45), 0.7);
    // Grooves: the cervical arc across the back, and the H between the regions.
    d.pen.hair(cub(pt(-11, y(-14.4)), pt(-6, y(-18.4)), pt(6, y(-18.4)), pt(11, y(-14.4)), 12), 0.4, mix(SHELL, SHADOW, 0.55), 0.7);
    d.pen.hair([pt(-2.6, y(-20.2)), pt(-2.2, y(-17.4)), pt(-3.4, y(-15.2))], 0.35, mix(SHELL, SHADOW, 0.55), 0.6);
    d.pen.hair([pt(2.6, y(-20.2)), pt(2.2, y(-17.4)), pt(3.4, y(-15.2))], 0.35, mix(SHELL, SHADOW, 0.55), 0.6);
    // Granules: dark specks with lit ones over them, thicker on the top.
    d.pen.stipple(shape, 70, (_, py) => (py < y(-13) ? 0.8 : 0.3), 0.32, mix(SHELL, SHADOW, 0.5));
    d.pen.stipple(shape, 40, (_, py) => (py < y(-14) ? 0.7 : 0.1), 0.28, mix(SHELL, PAPER_FILL, 0.55));
  });
  crust(d, pt(-7.5, y(-17.6)), 3.6, 2.1, 7011);
  crust(d, pt(6.4, y(-19)), 2.8, 1.5, 7012);
  crust(d, pt(11.4, y(-13.6)), 2, 1.4, 7013);
  crust(d, pt(-12.4, y(-12.6)), 1.8, 1.3, 7014);
  crust(d, pt(0.8, y(-15.6)), 1.3, 0.9, 7015);
  gleam(d, cub(pt(-11.5, y(-15.5)), pt(-9, y(-19.5)), pt(-5, y(-20.6)), pt(-2, y(-20.8)), 8), 0.8, 0.55);
}

/** The eyes on their stalks, leaning the way it faces; `tucked`, laid flat along the front edge in their sockets. */
function eyes(d: Draw, cy: number, tucked: boolean): void {
  for (const [x, far] of [[-3.2, true], [3.4, false]] as const) {
    const base = pt(x, cy - 17.6);
    const tip = tucked ? pt(x + 3.2, cy - 17.4) : pt(x + 1.8, cy - 25.2);
    const mid = pt((base.x + tip.x) / 2 + (tucked ? 0 : -0.5), (base.y + tip.y) / 2 - (tucked ? 0.6 : 0));
    d.pen.stroke([base, mid, tip], 2.3, d.ink, 0.9, false);
    d.pen.stroke([base, mid, tip], 1.4, far ? mix(LEG, SHADOW, 0.2) : LEG, 1, false);
    const cornea = oval(tip.x + (tucked ? 0.6 : 0.2), tip.y - (tucked ? 0 : 0.6), tucked ? 1.6 : 1.35, tucked ? 1.05 : 1.75, 12);
    paint(d, cornea, EYE, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.45, gloss: true });
    d.pen.dot(tip.x - 0.1, tip.y - (tucked ? 0.3 : 1.1), 0.4, PAPER_FILL, 0.95);
  }
}

/** A chela: the palm (an oval at `c`, `rx`×`ry`) with its fixed finger and hinged dactyl reaching along `dir`, toothed, dark at the tips. */
function chela(d: Draw, c: Pt, rx: number, ry: number, dir: number, open: number, salt: boolean): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(dir);
  const len = rx * 1.3;
  const pollex = ribbon(cub(pt(rx * 0.7, ry * 0.35), pt(rx + len * 0.4, ry * 0.45), pt(rx + len * 0.8, ry * 0.35), pt(rx + len, -ry * 0.05), 8), (u) => ry * 0.8 - ry * 0.65 * u).shape;
  const dactyl = ribbon(cub(pt(rx * 0.6, -ry * 0.55), pt(rx + len * 0.35, -ry * (0.95 + open)), pt(rx + len * 0.85, -ry * (0.75 + open * 0.6)), pt(rx + len * 1.02, -ry * 0.18), 10), (u) => ry * 0.75 - ry * 0.62 * u).shape;
  // The gap between the fingers: a dark slit with a row of pale teeth.
  d.pen.fill([pt(rx * 0.8, 0), pt(rx + len, -ry * 0.12), pt(rx * 0.8, -ry * 0.35)], TIP, 0.85);
  for (const [shape, color] of [[pollex, CLAW], [dactyl, mix(CLAW, PAPER_FILL, 0.12)]] as const) {
    paint(d, shape, color, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.6 });
    d.pen.clipped(shape, () => dab(d, oval(rx + len, -ry * 0.1, len * 0.45, ry * 1.4, 12), TIP, 0.75, 0.5));
  }
  for (let k = 1; k <= 4; k++) d.pen.dot(rx + (len * k) / 5.2, ry * 0.02 - k * 0.04, 0.32, PAPER_FILL, 0.85);
  const palm = oval(0, 0, rx, ry, 20);
  paint(d, palm, CLAW, { alpha: 1, shadow: 0.55, hatch: 0.18, line: 0.75 });
  d.pen.stipple(palm, Math.round(rx * ry * 2.4), (_, y) => (y < 0 ? 0.8 : 0.35), 0.3, mix(CLAW, SHADOW, 0.5));
  d.pen.hair([pt(-rx * 0.6, ry * 0.45), pt(0, ry * 0.62), pt(rx * 0.7, ry * 0.4)], 0.35, mix(CLAW, SHADOW, 0.5), 0.7);
  gleam(d, [pt(-rx * 0.55, -ry * 0.45), pt(-rx * 0.1, -ry * 0.72), pt(rx * 0.35, -ry * 0.68)], 0.7, 0.65);
  ctx.restore();
  if (salt) crust(d, pt(c.x - rx * 0.15, c.y - ry * 0.55), rx * 0.35, ry * 0.22, 7016);
}

/** The legs' footing for a walk step: which pairs are lifted mid-stride, the leading side reaching, the trailing side pushing. */
function legs(d: Draw, f: number, cy: number): void {
  for (let i = 3; i >= 0; i--) {
    for (const s of [-1, 1] as const) {
      const phase = (i + (s === 1 ? 0 : 1) + f) % 3;
      const lift = phase === 0 ? 2.6 : 0;
      const reach = phase === 0 ? 1.4 : phase === 1 ? 0 : -0.9;
      const base = pt(s * (11.8 - i * 0.6), cy - 10.4 + i * 0.4);
      const knee = pt(s * (14 + i * 2.1) + reach * 0.5, cy - 16.4 + i * 1.5 - lift * 0.5);
      const tip = pt(s * (14.6 + i * 2.2) + reach, -0.2 - lift);
      leg(d, s, base, knee, tip, i);
    }
  }
}

/** Walking sideways to the right: legs in a three-step cycle, the body bobbing, the great claw held up and a little open. */
function walking(d: Draw): void {
  const f = d.f;
  const cy = [0, -0.6, -0.2][f]!;
  legs(d, f, cy);
  carapace(d, cy);
  // The small claw picking at the mouth, and the mouthparts between the claws.
  segment(d, pt(-7.5, cy - 9), pt(-8.6, cy - 6), 2.2, 2, LEG);
  chela(d, pt(-7.6, cy - 4.8), 2.2, 1.5, 0.35, 0.1, false);
  // The mouthparts: a pair of folded plates (third maxillipeds) closing the mouth like doors.
  for (const sx of [-1, 1]) {
    const plate = oval(sx * 1.25, cy - 8.6, 1.3, 1.7, 12);
    paint(d, plate, mix(SHELL_FACE, LEG, 0.45), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.35, lineAlpha: 0.7 });
  }
  eyes(d, cy, false);
  // The great claw: merus and carpus out from the front corner, the palm held up to the right.
  segment(d, pt(9.4, cy - 9.8), pt(12.6, cy - 12.4), 3.6, 3.2, CLAW, 0.65);
  segment(d, pt(12.6, cy - 12.4), pt(14.6, cy - 11), 3.2, 3.5, CLAW, 0.65);
  chela(d, pt(16.4, cy - 9.4), 4.7, 3.7, 0.14 + f * 0.03, 0.12 + (f === 1 ? 0.12 : 0), true);
}

/** Tucked: sunk to the ground, legs folded under the shell, the great claw over its face, eyes laid flat. A stone with salt on it. */
function tucked(d: Draw): void {
  const cy = 5.8;
  for (let i = 3; i >= 0; i--) {
    for (const s of [-1, 1] as const) {
      const base = pt(s * 12.6, -2.8);
      const knee = pt(s * (16.2 + i * 0.9), -4.6 + i * 0.9);
      segment(d, base, knee, 3, 2.7, mix(LEG, SHADOW, 0.12 + i * 0.06));
      segment(d, knee, pt(s * (13.6 + i * 0.5), -0.5), 2.4, 1.6, mix(LEG, SHADOW, 0.18 + i * 0.06));
    }
  }
  carapace(d, cy);
  eyes(d, cy, true);
  chela(d, pt(5.6, -3.6), 5.2, 3.5, Math.PI - 0.12, 0, true);
}

/** The shore crab facing right: `walk` with `d.f` as the step, or `tucked` up like a stone. */
export function drawCrab(d: Draw, pose: CrabPose): void {
  dab(d, oval(0, 0.3, 21, 1.8, 20), SHADOW, 0.16, 1.2);
  if (pose === 'tucked') tucked(d);
  else walking(d);
}
