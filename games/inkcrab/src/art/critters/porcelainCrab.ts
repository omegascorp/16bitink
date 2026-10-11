import { bezier, capsule, closed, cub, type Draw, edge, glint, oval, pt, setae, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A porcelain crab (Petrolisthes), side-on and facing right: a tiny crab
 * from under the rocks, with a very flat, round, smooth carapace (glossy,
 * hence the name), one pair of huge flattened claws held out in front,
 * nearly as long as the body, fringed with hairs, short hairy legs and a
 * pair of very long antennae sweeping back over the shell. Mottled tan and
 * brown, with a cream belly.
 */
const TAN = '#b99c70';
const BROWN = '#7c5c3e';
const DARK = '#4f3b29';
const BELLY = '#ebe1c9';
const LEG = '#b0936a';
const BAND = '#7c5c3e';

/** Frame units the crab is set back, so the body and the long claws sit about the frame centre. */
const SHIFT = -12;
/** How far the claws are raised from level, radians. */
const CLAW_TILT = -0.2;

/** Three short, hairy walking legs a side, tucked close under the flat shell, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-32, -24, 15, 23].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 2.5;
    const lift = Math.max(0, Math.sin(ph)) * 3;
    const hip = pt(dx * 0.4 + (far ? -2 : 0), bottom - 1 + (far ? -2 : 0));
    const foot = pt(dx + step + (far ? -3 : 0), d.g - lift * 0.4 - (far ? 1.5 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.5, bottom - 4 - lift);
    const ankle = pt(hip.x + reach * 0.86, d.g - 5 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 0.8, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [4, 3.4, 2.4, 0.4], wash: LEG, band: BAND, hairs: far ? 0 : 3, far });
  });
}

/**
 * A huge, flat claw held forward and a little raised, seen a touch from
 * above so its broad face shows: a short arm, a wide leaf of a wrist, a
 * long flat palm and long fingers meeting at hooked tips, fringed with hairs.
 */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  // Raised a little from the shoulder, so the claw stands clear of the shell.
  const [c, sn] = [Math.cos(CLAW_TILT), Math.sin(CLAW_TILT)];
  const P = (dx: number, dy: number): Pt => pt(x + (dx * c - dy * sn) * s, y + (dx * sn + dy * c) * s);
  const arm = capsule(P(0, 0), P(6, -1.6), 4.6 * s, 4.4 * s);
  const wrist = [
    ...cub(P(5, 1.6), P(5, -6), P(10, -7.6), P(15, -6.8), 8),
    ...cub(P(15, -6.8), P(18.5, -6), P(18.5, 2), P(15, 3.4), 6).slice(1),
    ...cub(P(15, 3.4), P(11, 4.6), P(7, 3.8), P(5, 1.6), 6).slice(1),
  ];
  const palm = [
    ...cub(P(15, 2), P(14.5, -8), P(19, -9.6), P(26, -9.2), 8),
    ...cub(P(26, -9.2), P(31, -8.8), P(33.5, -6), P(33.5, -2.6), 6).slice(1),
    ...cub(P(33.5, -2.6), P(33, 2.6), P(27, 4.8), P(21, 4.6), 6).slice(1),
    ...cub(P(21, 4.6), P(17.5, 4.4), P(15.2, 3.6), P(15, 2), 4).slice(1),
  ];
  const fixedSpine = bezier(P(32, 1.4), P(39, 2), P(45, -2.2), 8);
  const movingSpine = bezier(P(31.6, -6.6), P(39.4, -7.8), P(45.4, -2.8), 8);
  const fixed = tube(fixedSpine, 5.2 * s, 1 * s);
  const moving = tube(movingSpine, 4.6 * s, 1 * s);
  for (const part of [arm, wrist, fixed, moving, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, TAN, far ? 0.85 : 0.75);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  if (!far) {
    // Brown blotches over the flat face, a darker band at the base of the fingers.
    for (const part of [wrist, palm]) {
      pen.clipped(part, () => {
        for (let i = 0; i < 5; i++) {
          const b = P(6 + pen.rng() * 27, -7 + pen.rng() * 9);
          tint(d, oval(b.x, b.y, (1.2 + pen.rng() * 1.8) * s, (0.9 + pen.rng() * 1.2) * s, 8), BROWN, 0.55);
        }
        const belly = P(24, 4);
        tint(d, oval(belly.x, belly.y, 10 * s, 1.8 * s, 12), BELLY, 0.6);
      });
    }
    const knuckle = P(33, -2.4);
    for (const f of [fixed, moving]) pen.clipped(f, () => tint(d, oval(knuckle.x, knuckle.y, 3.4 * s, 7 * s, 10), DARK, 0.45));
    shade(d, palm, 0.35);
    glint(d, [P(19, -7.4), P(26, -7.8)], 0.9, 0.7);
    // The fringe of hairs along the outer edge of wrist and palm.
    setae(d, P(7, 3.8), P(33, 3.6), 9, 2 * s, -1, 0.6);
    // Small teeth along the cutting edges.
    for (let k = 2; k < 7; k++) pen.dot(fixedSpine[k]!.x, fixedSpine[k]!.y - 1.3 * s, 0.4 * s, d.ink, 0.6);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.6 : 0.95, d.ink, far ? 0.55 : 1, false);
}

/** A long, whip-thin antenna from the front of the shell, arching up and back over it. */
function antenna(d: Draw, from: Pt, reach: number, lift: number, far: boolean): void {
  const sway = Math.sin(d.f * (TAU / 3)) * 1.5;
  const tip = pt(from.x - reach, from.y - lift + sway);
  d.pen.hair(cub(from, pt(from.x + 6, from.y - lift * 0.7), pt(from.x - reach * 0.35, from.y - lift * 1.15), tip, 16), far ? 0.45 : 0.6, d.ink, far ? 0.5 : 0.85);
}

export function porcelainCrab(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(SHIFT, 0);
  pen.fill(oval(2, d.g - 1, 36, 2.6, 24), d.ink, 0.1);
  const top = d.g - 28;
  const bottom = d.g - 14;
  antenna(d, pt(16, top + 4), 46, 18, true);
  legs(d, bottom, true);
  claw(d, 13, bottom - 8, 0.9, true);
  // Very flat and round: a low dome, smooth, with the cream body just showing beneath.
  const shape = [
    ...cub(pt(-19, bottom), pt(-23, bottom - 2), pt(-22, top + 4), pt(-15, top + 1.6), 8),
    ...cub(pt(-15, top + 1.6), pt(-6, top - 0.6), pt(6, top - 0.6), pt(14, top + 1.6), 10).slice(1),
    ...cub(pt(14, top + 1.6), pt(20, top + 3.4), pt(21, bottom - 2), pt(17, bottom), 8).slice(1),
    ...cub(pt(17, bottom), pt(7, bottom + 1.8), pt(-9, bottom + 1.8), pt(-19, bottom), 10).slice(1),
  ];
  skin(d, shape, TAN, 0.8);
  const margin = cub(pt(-22, top + 9), pt(-8, top + 11), pt(8, top + 11), pt(21, top + 8.6), 12);
  pen.clipped(shape, () => {
    // Brown mottling over the back, the cream belly below the side edge.
    for (let i = 0; i < 12; i++) {
      const bx = -17 + pen.rng() * 32;
      const by = top + 1.5 + pen.rng() * 7;
      tint(d, oval(bx, by, 1.4 + pen.rng() * 2.2, 0.9 + pen.rng() * 1.1, 10), BROWN, 0.6);
    }
    tint(d, oval(-2, top + 3, 13, 3, 14), DARK, 0.2);
    tint(d, [...margin, pt(24, bottom + 3), pt(-24, bottom + 3)], BELLY, 0.75);
  });
  shade(d, shape, 0.38);
  pen.hair(margin, 0.55, d.ink, 0.5);
  // Porcelain: a long bright highlight along the smooth back.
  glint(d, cub(pt(-13, top + 2), pt(-6, top + 0.6), pt(3, top + 0.6), pt(8, top + 1.4), 8), 1.1, 0.8);
  pen.clipped(shape, () => pen.hatch([pt(-24, bottom - 2.4), pt(24, bottom - 2.4), pt(24, bottom + 3), pt(-24, bottom + 3)], 1.6, 0.35, 0.4, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.2);
  // A small eye at the front of the shell.
  pen.fill(oval(18, top + 5, 2.2, 2, 10), PAPER_FILL, 0.8);
  pen.dot(18.2, top + 5, 1.5, d.ink, 0.95);
  pen.dot(18.7, top + 4.5, 0.45, PAPER_FILL, 0.95);
  legs(d, bottom, false);
  claw(d, 15, bottom - 3, 1.05, false);
  antenna(d, pt(19, top + 3.4), 50, 20, false);
  ctx.restore();
}
