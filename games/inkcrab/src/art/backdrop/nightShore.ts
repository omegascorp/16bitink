import { bezier, closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, edges, FAR } from './common';
import { glow } from './estuary';
import { glowBreakers, PLANKTON, PLANKTON_CORE, spark } from './glowSea';
import { NIGHT } from './nightSky';

/**
 * The near beach of a Queensland bay on a summer night: pale sand gone
 * blue-grey under the moon, wet and shining at the water's edge, where the
 * little waves running up it glow with plankton; the tracks of nesting
 * loggerheads hauled up the beach, one turtle still digging her nest in a
 * spray of thrown sand, one long gone back to the sea; coconuts washed
 * up, one sprouting; spinifex and goat's-foot runners creeping down from
 * the dunes.
 */
const W = BACKDROP_W;
export const MOON_SAND = '#a8a9c6';
const WET_SAND = '#6a7299';
const GRAIN = '#4b4d70';
const CARAPACE = '#9a5a34';
const SCUTE = '#6b3a22';
const SKIN = '#b88a5f';
const PLASTRON = '#e0c48a';
const HUSK = '#9a7448';
const SPINIFEX = '#9fae8a';
const VINE = '#5f8a4c';
const BLOOM = '#c27bb8';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/**
 * The beach floor from the line `top(x)` down to `bottom`, across exactly
 * one tile: moonlit sand, darker and shining where the last wave wet it,
 * a scatter of grains.
 */
export function moonSand(t: Draw, top: (x: number) => number, bottom: number): void {
  const { pen } = t;
  const edge: Pt[] = [];
  for (let x = 0; x <= W; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W, bottom), pt(0, bottom)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MOON_SAND, 0.78);
  // Bluer and darker going back towards the water, paler nearer under the moon.
  const g = pen.ctx.createLinearGradient(0, top(0) - 10, 0, bottom);
  g.addColorStop(0, 'rgba(43,58,120,0.35)');
  g.addColorStop(0.6, 'rgba(43,58,120,0.06)');
  g.addColorStop(1, 'rgba(43,58,120,0)');
  pen.clipped(shape, () => {
    pen.ctx.fillStyle = g;
    pen.ctx.fillRect(0, top(0) - 20, W, bottom - top(0) + 20);
  });
  pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 14))], WET_SAND, 0.4);
  pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 6))], WET_SAND, 0.35);
  pen.stipple(shape, 2600, (_, y) => 0.25 + 0.5 * Math.min(1, (y - top(0) + 10) / 80), 0.45, GRAIN);
  // The moon caught in the wet sand: short bright glints laid flat.
  for (let k = 0; k < 70; k++) {
    const x = pen.rng() * W;
    const y = top(x) + 2 + pen.rng() * 11;
    pen.hair([pt(x, y), pt(x + 2 + pen.rng() * 6, y)], 0.6, PAPER_FILL, 0.4 + pen.rng() * 0.4);
  }
}

/**
 * The glowing tideline along `top(x)`: a little wave curling over on the
 * sand, lit up blue by the plankton, the thin sheet of its swash running
 * up the wet sand with a glowing lace edge, sparks left where it drew back.
 * `reach(x)` is how far down the sand (towards the viewer) the swash runs.
 */
export function tideline(t: Draw, top: (x: number) => number, reach: (x: number) => number): void {
  const { pen } = t;
  for (let x = -20; x < W; x += 130) glowBreakers(t, x, x + 140, top(x + 70) - 1, 1.1);
  const lead: Pt[] = [];
  for (let x = 0; x <= W; x += 5) lead.push(pt(x, top(x) + reach(x) + pen.jitter(0.5)));
  const sheet = [...lead, ...[...lead].reverse().map((p) => pt(p.x, top(p.x)))];
  pen.fill(sheet, NIGHT, 0.18);
  pen.fill(sheet, PLANKTON, 0.08);
  // The lace edge, glowing, broken where the swash has thinned out.
  for (let i = 0; i < lead.length - 1; i += 1) {
    if ((i * 7) % 11 < 2) continue;
    const a = lead[i]!;
    const b = lead[i + 1]!;
    glow(t, (a.x + b.x) / 2, a.y, 5, 2, PLANKTON, 0.35);
    pen.hair([a, pt((a.x + b.x) / 2, a.y + 0.6), b], 0.9, PLANKTON, 0.85);
  }
  pen.hair(lead.filter((_, i) => i % 4 < 3), 0.4, PLANKTON_CORE, 0.8);
  for (let k = 0; k < 120; k++) {
    const x = pen.rng() * W;
    spark(t, x, top(x) + reach(x) + 1 + pen.rng() * 8, 0.4 + pen.rng() * 0.5, 0.4 + pen.rng() * 0.5);
  }
}

/**
 * A loggerhead's track up the beach along `path`: a broad band of
 * ploughed sand with a ridge thrown up along each side, her flippers'
 * comma-shaped marks in it alternating side to side (she walks with a
 * rolling gait), `w(u)` wide along it (narrower far off), `fresh` 0..1 as
 * crisp as it is (the wind softens an old one). Where it crosses the wet
 * sand by the water (y < `wet`) the plankton in it glows.
 */
export function turtleTrack(t: Draw, path: readonly Pt[], w: (u: number) => number, wet: number, fresh = 1): void {
  const { pen } = t;
  const { top, bot, shape } = ribbon(path, w);
  pen.fill(shape, GRAIN, 0.14 * fresh);
  for (const edge of [top, bot]) {
    pen.hair(edge.map((p) => pt(p.x + pen.jitter(0.3), p.y + 0.4)), 0.7, PAPER_FILL, 0.45 * fresh);
    pen.hair(edge.map((p) => pt(p.x, p.y - 0.3)), 0.35, GRAIN, 0.35 * fresh);
  }
  for (let i = 1; i < path.length - 1; i++) {
    const c = path[i]!;
    const back = path[i - 1]!;
    const edge = (i % 2 ? top : bot)[i]!;
    const from = pt(c.x + (edge.x - c.x) * 0.2, c.y + (edge.y - c.y) * 0.2);
    const to = pt(edge.x + (back.x - c.x) * 0.5, edge.y + (back.y - c.y) * 0.5);
    const mark = bezier(from, pt((from.x + edge.x) / 2 + (c.x - back.x) * 0.25, (from.y + edge.y) / 2 + (c.y - back.y) * 0.25), to, 5);
    pen.hair(mark, 0.6 + w(i / path.length) * 0.07, GRAIN, 0.7 * fresh);
    pen.hair(mark.map((p) => pt(p.x, p.y - 0.7)), 0.45, PAPER_FILL, 0.55 * fresh);
    if (c.y < wet) spark(t, edge.x, edge.y, 0.6, 0.8 * fresh);
  }
}

/**
 * A loggerhead turtle digging her nest, side-on and facing right, settled
 * in the pit she has scooped: the great reddish-brown carapace with its
 * scutes, the big blunt head with its heavy beak and a tear of salt at the
 * eye, a front flipper flinging sand back over her shoulder, and the
 * thrown sand heaped and sprayed behind her.
 */
export function loggerhead(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  // The body pit, and the mound of sand she has thrown out behind her.
  pen.fill(oval(x + 1 * s, ground + 1 * s, 30 * s, 4 * s, 24), GRAIN, 0.3);
  const mound = [...cub(P(-46, 2), P(-40, -5), P(-30, -8), P(-22, -3), 10), P(-22, 2)];
  washed(t, mound, MOON_SAND, 0.65, 0.5, 0.6);
  pen.stipple(mound, 120, () => 0.6, 0.4, GRAIN);
  // Sand flung up behind her, in arcs of grains.
  for (let k = 0; k < 36; k++) {
    const u = pen.rng();
    const p = P(-20 - u * 22 + pen.jitter(2), -8 - Math.sin(u * Math.PI) * 10 + pen.jitter(2));
    pen.dot(p.x, p.y, (0.3 + pen.rng() * 0.4) * s, k % 3 ? MOON_SAND : GRAIN, 0.85);
  }
  // The far flippers, just showing, then the carapace.
  washed(t, [P(-22, -1), P(-27, 1.5), P(-21, 2), P(-17, 0)], SKIN, 0.55, 0.4, 0.7);
  const shell = [...cub(P(-24, -2), P(-20, -16), P(4, -19), P(16, -7), 18), ...cub(P(16, -7), P(13, -3), P(0, -1), P(-24, -2), 12).slice(1)];
  washed(t, shell, CARAPACE, 0.62, 0.8);
  pen.clipped(shell, () => {
    // The scutes: a row along the spine, the costals down the flank, the marginals round the rim.
    for (const dx of [-14, -6, 2, 9]) pen.hair(bezier(P(dx, -16), P(dx - 1.5, -10), P(dx + 1, -5), 5), 0.5, SCUTE, 0.75);
    pen.hair(cub(P(-21, -9), P(-10, -13.5), P(5, -13), P(14, -8), 12), 0.5, SCUTE, 0.7);
    pen.hair(cub(P(-23, -3.6), P(-8, -3), P(6, -3.4), P(15, -6), 12), 0.5, SCUTE, 0.6);
    for (let dx = -20; dx < 14; dx += 3) pen.hair([P(dx, -2), P(dx + 0.6, -4)], 0.35, SCUTE, 0.6);
    pen.hatch(shell, 1.3, 0.9, 0.35, { color: t.ink, alpha: FAR * 0.5, onlyBelow: ground - 9 * s });
    // The moon on her back.
    pen.hair(cub(P(-18, -11), P(-12, -16.5), P(0, -18), P(8, -15), 10), 1.2, PAPER_FILL, 0.6);
  });
  pen.fill(shell.slice(-10).concat([P(-20, 0), P(12, -2)]), PLASTRON, 0.3);
  // The head: big and blunt, the beak hooked, scales on the cheek, the eye with its salt tear.
  const head = [...cub(P(13, -6), P(16, -11), P(24, -11), P(27, -6.5), 10), ...cub(P(27, -6.5), P(28, -4), P(25, -2), P(21, -2.4), 6).slice(1), ...cub(P(21, -2.4), P(17, -2), P(14, -2.5), P(13, -6), 6).slice(1)];
  washed(t, head, SKIN, 0.6, 0.75);
  pen.clipped(head, () => {
    for (const [dx, dy, r] of [[18, -8.5, 1.8], [21, -9, 1.4], [16, -5.5, 1.5], [19.5, -5, 1.2]] as const) pen.hair(closed(oval(x + dx * s, ground + dy * s, r * s, r * 0.8 * s, 8)), 0.35, SCUTE, 0.7);
  });
  pen.hair(bezier(P(24.5, -4.3), P(26, -4.6), P(27.4, -5.2), 4), 0.5, t.ink, FAR);
  pen.dot(x + 23.4 * s, ground - 7.4 * s, 0.7 * s, '#1f1f22', 0.9);
  pen.dot(x + 23.9 * s, ground - 7.7 * s, 0.25 * s, PAPER_FILL, 0.9);
  pen.hair([P(23.2, -6.6), P(22.8, -4.6)], 0.5, PAPER_FILL, 0.8);
  // The near front flipper, a broad paddle reaching down beside her shoulder, its tip dug in mid-stroke.
  const flipper = [...cub(P(13, -6), P(9, -4), P(4, -1), P(-1, 1.5), 10), ...cub(P(-1, 1.5), P(1, 2.5), P(7, 1.5), P(14, -2.5), 10).slice(1)];
  washed(t, flipper, SKIN, 0.62, 0.7);
  pen.clipped(flipper, () => {
    for (const [dx, dy] of [[8, -2], [5, -0.6], [2, 0.6]] as const) pen.hair(closed(oval(x + dx * s, ground + dy * s, 1.3 * s, 0.8 * s, 8)), 0.3, SCUTE, 0.6);
    pen.hatch(flipper, 1.3, -0.4, 0.3, { color: t.ink, alpha: FAR * 0.4, onlyBelow: ground - 1 * s });
  });
  pen.hair(cub(P(12.5, -5.6), P(8.5, -3.8), P(4, -1), P(0, 1), 8), 0.4, PAPER_FILL, 0.6);
  // Sand kicked off its tip.
  for (let k = 0; k < 8; k++) pen.dot(x + (-3 - pen.rng() * 6) * s, ground + (-1 - pen.rng() * 4) * s, 0.35 * s, k % 2 ? MOON_SAND : GRAIN, 0.85);
}

/** A coconut washed up, lying on its side in its husk, three faint ridges along it. */
export function coconut(t: Draw, x: number, ground: number, s: number, tilt = 0): void {
  const { pen } = t;
  const nut = oval(x, ground - 3 * s, 4.4 * s, 3.3 * s, 14).map((p) => pt(x + (p.x - x) * Math.cos(tilt) - (p.y - ground + 3 * s) * Math.sin(tilt), ground - 3 * s + (p.x - x) * Math.sin(tilt) + (p.y - ground + 3 * s) * Math.cos(tilt)));
  pen.fill(oval(x + 1 * s, ground, 5 * s, 1.2 * s, 10), GRAIN, 0.3);
  washed(t, nut, HUSK, 0.6, 0.7);
  pen.clipped(nut, () => {
    for (const k of [-1.2, 0.4]) pen.hair(bezier(pt(x - 4 * s, ground - 3 * s + k * s), pt(x, ground - 4.5 * s + k * s), pt(x + 4 * s, ground - 3 * s + k * s), 6), 0.4, t.ink, FAR * 0.5);
    pen.hatch(nut, 1.1, 0.8, 0.3, { color: t.ink, alpha: FAR * 0.4, onlyBelow: ground - 3 * s });
  });
}

/** A tussock of beach spinifex: stiff, arching grey-green blades and a spiky seed head or two. */
export function spinifex(t: Draw, x: number, ground: number, h: number): void {
  const { pen } = t;
  for (let k = 0; k < 11; k++) {
    const a = -Math.PI / 2 + (k / 10 - 0.5) * 2.2 + pen.jitter(0.1);
    const l = h * (0.6 + pen.rng() * 0.4);
    const tip = pt(x + Math.cos(a) * l, ground + Math.sin(a) * l * 0.8 + Math.abs(Math.cos(a)) * l * 0.25);
    pen.hair(bezier(pt(x + pen.jitter(1.5), ground), pt(x + Math.cos(a) * l * 0.4, ground + Math.sin(a) * l * 0.7), tip, 6), 0.6, k % 3 ? SPINIFEX : t.ink, k % 3 ? 0.9 : FAR * 0.6);
  }
  const head = pt(x + pen.jitter(3), ground - h * 0.9);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    pen.hair([head, pt(head.x + Math.cos(a) * h * 0.18, head.y + Math.sin(a) * h * 0.18)], 0.4, SPINIFEX, 0.9);
  }
}

/**
 * Goat's-foot convolvulus running down the sand from `a` to `b`: a long
 * creeping stem with its notched, two-lobed leaves either side, a pink
 * trumpet flower here and there (closed tight for the night).
 */
export function goatsFoot(t: Draw, a: Pt, b: Pt): void {
  const { pen } = t;
  const stem = bezier(a, pt((a.x + b.x) / 2 + pen.jitter(6), (a.y + b.y) / 2 + 2), b, 20);
  pen.hair(stem, 0.6, VINE, 0.85);
  stem.forEach((p, i) => {
    if (i % 2 || i === 0) return;
    const side = i % 4 ? -1 : 1;
    const c = pt(p.x + pen.jitter(1), p.y + side * 1.8);
    for (const lobe of [-1, 1]) washed(t, oval(c.x + lobe * 1.1, c.y, 1.4, 1.1, 8), VINE, 0.6, 0.3, 0.6);
    if (i % 6 === 0) washed(t, [pt(p.x, p.y), pt(p.x + 1.2, p.y - 3.4), pt(p.x - 1.2, p.y - 3.4)], BLOOM, 0.6, 0.3, 0.6);
  });
}
