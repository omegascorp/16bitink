import { bezier, capsule, closed, cub, type Draw, edge, mottle, oval, pt, ribbon, shade, skin, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, ROCK } from '../palette';

/**
 * A common octopus peering out of its den in the granite, facing right: the
 * dark crevice mouth behind, the bulging eyes with their bar-shaped pupils
 * and the soft, warty mantle filling the opening, and the tips of three arms
 * curled out over the lip, suckers showing. Mottled red-brown that shifts a
 * little from frame to frame. (The long reaching arm is drawn by the game.)
 */
const SKINS = ['#ab5a3a', '#b5683f', '#a0523a'] as const;
const DARK = '#5c2a1e';
const PALE = '#e9cfae';
const IRIS = '#d9b45a';
const HOLE = '#24222b';
/** The crevice mouth and the rock's outer edge, as [x, y above the ground]. */
const HOLE_PTS = [[-31, 0], [-33, -10], [-30, -22], [-25, -32], [-16, -41], [-7, -45], [1, -48.5], [9, -45], [18, -44], [25, -36], [30, -25], [33, -13], [31, 0]] as const;
const RIM_PTS = [[-38, 0], [-40, -12], [-37, -26], [-30, -37], [-20, -48], [-8, -52], [3, -55], [13, -51], [22, -50.5], [31, -40], [37, -27], [40, -13], [38, 0]] as const;

/** An arm tip as a tapering ribbon along `spine`, suckers in a row on the inside of its curl (`inner`: 1 is left of travel). */
function arm(d: Draw, spineIn: readonly Pt[], w0: number, wash: string, inner: 1 | -1): void {
  const { pen } = d;
  const a = ribbon(spineIn, (u) => w0 * (1 - u * 0.85));
  skin(d, a.shape, wash, 0.8);
  const side = inner > 0 ? a.top : a.bot;
  pen.clipped(a.shape, () => tint(d, [...side, ...[...spineIn].reverse()], PALE, 0.55));
  mottle(d, a.shape, 30, Math.min(...spineIn.map((p) => p.y)) - w0, Math.max(...spineIn.map((p) => p.y)) + w0, DARK, 0.5);
  edge(d, a.shape, 1);
  // Suckers: pale rings sitting on the underside edge, smaller towards the tip.
  for (let i = 1; i < spineIn.length - 1; i += 2) {
    const u = i / (spineIn.length - 1);
    const p = side[i]!;
    const q = spineIn[i]!;
    const r = Math.max(0.5, w0 * 0.3 * (1 - u * 0.75));
    const c = pt(p.x + (q.x - p.x) * 0.15, p.y + (q.y - p.y) * 0.15);
    pen.fill(oval(c.x, c.y, r, r, 8), PAPER_FILL, 0.95);
    pen.hair(closed(oval(c.x, c.y, r, r, 8)), 0.45, d.ink, 0.85);
    pen.dot(c.x, c.y, r * 0.35, d.ink, 0.5);
  }
}

/** A bulging eye: a gold iris with a bar of a pupil, hooded by a heavy lid, a little horn of skin above. */
function eye(d: Draw, x: number, y: number, r: number, wash: string, far: boolean): void {
  const { pen } = d;
  const bulge = oval(x, y, r * 1.4, r * 1.25, 16);
  skin(d, bulge, wash, 0.85);
  tint(d, bulge, wash, 0.35);
  if (far) pen.fill(bulge, d.ink, 0.15);
  pen.stroke(bezier(pt(x - r * 1.4, y + r * 0.2), pt(x - r * 0.6, y - r * 1.9), pt(x + r * 1.4, y - r * 0.2), 8), far ? 0.8 : 1.1, d.ink, far ? 0.55 : 1, false);
  const cx = x + r * 0.2;
  const cy = y + r * 0.15;
  const ball = oval(cx, cy, r, r * 0.85, 14);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, IRIS, far ? 0.6 : 0.85);
  pen.fill(capsule(pt(cx - r * 0.62, cy + r * 0.1), pt(cx + r * 0.62, cy + r * 0.1), r * 0.42, r * 0.42), d.ink, far ? 0.7 : 0.95);
  // The lid comes down over the top third: a hooded, watchful look.
  pen.clipped(ball, () => {
    const lid = [pt(cx - r * 1.2, cy - r * 1.2), pt(cx + r * 1.2, cy - r * 1.2), pt(cx + r * 1.2, cy - r * 0.4), pt(cx - r * 1.2, cy - r * 0.25)];
    pen.fill(lid, PAPER_FILL, 1);
    pen.fill(lid, wash, 0.9);
  });
  if (!far) pen.dot(cx + r * 0.45, cy - r * 0.05, r * 0.16, PAPER_FILL, 0.95);
  pen.stroke(closed(ball), far ? 0.6 : 0.8, d.ink, far ? 0.55 : 0.95, false);
  pen.hair([pt(cx - r * 1.05, cy - r * 0.25), pt(cx + r * 1.05, cy - r * 0.4)], far ? 0.6 : 0.9, d.ink, far ? 0.5 : 0.95);
  if (!far) pen.stroke(bezier(pt(x - r * 0.3, y - r * 1.25), pt(x - r * 0.1, y - r * 2.2), pt(x - r * 0.7, y - r * 2.6), 5), 1, d.ink, 0.9, false);
}

export function octopus(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const wash = SKINS[d.f]!;
  // The den: a dark, ragged crack in the granite, with a broken rim of rock around its top.
  const hole = HOLE_PTS.map(([x, y]) => pt(x, g + y));
  const rim = [...RIM_PTS.map(([x, y]) => pt(x, g + y)), ...[...hole].reverse()];
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, ROCK, 0.75);
  // Granite: dark and pale grains, and a crack or two.
  pen.stipple(rim, 110, () => 0.7, 0.55, '#4a463f');
  pen.stipple(rim, 50, () => 0.7, 0.6, PAPER_FILL);
  pen.hair([pt(-35, g - 20), pt(-31, g - 22), pt(-29.5, g - 26)], 0.5, d.ink, 0.6);
  pen.hair([pt(20, g - 47), pt(23, g - 44), pt(27, g - 43.5)], 0.5, d.ink, 0.6);
  shade(d, rim, 0.35);
  pen.stroke(RIM_PTS.map(([x, y]) => pt(x, g + y)), 1.1, d.ink, 0.85, false);
  pen.fill(hole, HOLE, 0.9);
  pen.clipped(hole, () => pen.hatch(hole, 1.6, 0.6, 0.5, { color: d.ink, alpha: 0.6 }));
  pen.stroke(hole, 1.2, d.ink, 1, false);
  // An arm tip curled up the back wall of the den.
  arm(d, cub(pt(-18, g - 2), pt(-26, g - 14), pt(-30, g - 28), pt(-24, g - 36), 14), 6.5, wash, -1);
  // Mantle and head in one soft body: the warty bag slumped back into the dark, the head
  // pushed forward to the opening, a dip behind the eyes where they join.
  const body = [
    ...cub(pt(21, g - 6), pt(25, g - 12), pt(25, g - 24), pt(18, g - 30), 10),
    ...cub(pt(18, g - 30), pt(15, g - 33), pt(11, g - 33), pt(8, g - 34), 6).slice(1),
    ...cub(pt(8, g - 34), pt(4, g - 44), pt(-10, g - 48), pt(-19, g - 42), 12).slice(1),
    ...cub(pt(-19, g - 42), pt(-28, g - 35), pt(-26, g - 18), pt(-14, g - 10), 12).slice(1),
    ...cub(pt(-14, g - 10), pt(-4, g - 3), pt(12, g - 2), pt(21, g - 6), 10).slice(1),
  ];
  skin(d, body, wash, 0.85);
  tint(d, body, wash, 0.3);
  pen.clipped(body, () => {
    tint(d, oval(-17, g - 20, 12, 10, 14), DARK, 0.35);
    tint(d, oval(12, g - 6, 12, 5, 14), PALE, 0.35);
    for (let i = 0; i < 14; i++) tint(d, oval(-22 + pen.rng() * 40, g - 44 + pen.rng() * 36, 1.6 + pen.rng() * 2.4, 1.2 + pen.rng() * 1.6, 8), DARK, 0.4);
    for (let i = 0; i < 14; i++) tint(d, oval(-22 + pen.rng() * 32, g - 44 + pen.rng() * 30, 1 + pen.rng(), 0.8 + pen.rng(), 8), PALE, 0.45);
    // The soft crease where the mantle meets the head.
    pen.hair(cub(pt(8, g - 33), pt(2, g - 26), pt(0, g - 16), pt(4, g - 7), 8), 0.7, d.ink, 0.5);
  });
  mottle(d, body, 120, g - 48, g - 4, DARK, 0.55);
  shade(d, body, 0.45);
  edge(d, body, 1.2);
  // Papillae: little raised warts along the mantle's crown.
  for (let i = 18; i < 40; i += 3) {
    const p = body[i]!;
    pen.dot(p.x, p.y + 0.6, 1, wash, 1);
    pen.hair(bezier(pt(p.x - 1, p.y + 0.6), pt(p.x, p.y - 1.4), pt(p.x + 1, p.y + 0.6), 3), 0.55, d.ink, 0.85);
  }
  // The siphon, a soft tube at the side under the mantle.
  const siphon = [pt(0, g - 13), pt(-3.5, g - 14), pt(-5, g - 11), pt(-1.5, g - 9.5)];
  pen.fill(siphon, wash, 0.7);
  pen.hair(closed(siphon), 0.6, d.ink, 0.75);
  // The eyes bulging out of the top of the head, the far one peeping over behind.
  eye(d, 9, g - 33, 4.4, wash, true);
  eye(d, 16, g - 27, 5.8, wash, false);
  // Two arm tips curled out over the lip of the den, suckers outward.
  arm(d, cub(pt(4, g - 4), pt(16, g - 1), pt(28, g - 2), pt(33, g - 8), 14).concat(bezier(pt(33, g - 8), pt(35, g - 14), pt(29, g - 13), 5).slice(1)), 6.5, wash, 1);
  arm(d, cub(pt(-4, g - 6), pt(-14, g - 1), pt(-28, g - 1), pt(-33, g - 8), 14).concat(bezier(pt(-33, g - 8), pt(-35, g - 14), pt(-29, g - 13), 5).slice(1)), 5.5, wash, -1);
}
