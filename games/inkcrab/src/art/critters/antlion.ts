import { bezier, closed, cub, type Draw, edge, mottle, oval, pt, shade, skin, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, SAND_DRY, SAND_GRAIN } from '../palette';

/**
 * An antlion larva at the bottom of its pit, side-on and facing right,
 * buried to the jaws: a flat head tipped up out of the sand, two huge,
 * spined sickle jaws held wide open, and the bristly hump of its fat body
 * just breaking the surface behind. Most of it is under the ground line.
 */
const BODY = '#9c8458';
const HEAD = '#a8915f';
const DARK = '#5a4a32';
const JAW = '#c9a86a';

/** A sickle jaw: stout at the base, curving to a hooked tip, with spines along its inner edge. */
function jaw(d: Draw, base: Pt, ctrl: Pt, tip: Pt, inner: 1 | -1, far: boolean): void {
  const { pen } = d;
  const spine = bezier(base, ctrl, tip, 14);
  const shape = tube(spine, far ? 4 : 5.2, 0.6);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, JAW, far ? 0.75 : 0.7);
  if (far) pen.fill(shape, d.ink, 0.14);
  // Dark, hardened tip.
  pen.clipped(shape, () => tint(d, oval(tip.x, tip.y, 5, 5, 12), DARK, far ? 0.4 : 0.55));
  pen.stroke(closed(shape), far ? 0.8 : 1.2, d.ink, far ? 0.6 : 1, false);
  if (far) return;
  // Three long spines on the inner edge, raking towards the tip.
  for (const t of [4, 7, 10]) {
    const a = spine[t]!;
    const b = spine[t + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / l) * inner;
    const ny = ((b.x - a.x) / l) * inner;
    const w = 2 - t * 0.12;
    const root = pt(a.x + nx * w * 0.5, a.y + ny * w * 0.5);
    pen.stroke([pt(root.x - (b.x - a.x) / l, root.y - (b.y - a.y) / l), pt(root.x + nx * 5 + (b.x - a.x) / l * 2.4, root.y + ny * 5 + (b.y - a.y) / l * 2.4)], 1.4, d.ink, 0.95, false);
  }
  // Fine bristles on the outer edge.
  for (const t of [2, 5, 8]) {
    const a = spine[t]!;
    const b = spine[t + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / l) * -inner;
    const ny = ((b.x - a.x) / l) * -inner;
    const root = pt(a.x + nx * 1.8, a.y + ny * 1.8);
    pen.hair([root, pt(root.x + nx * 2.2 - (b.x - a.x) / l, root.y + ny * 2.2 - (b.y - a.y) / l)], 0.45, d.ink, 0.7);
  }
}

export function antlion(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  // The jaws twitch a little open and shut.
  const gape = [0, 1.6, -1][d.f]!;
  // The hump of the abdomen: only its bristly top shows above the sand.
  const hump = [
    ...cub(pt(-33, g + 1), pt(-31, g - 13), pt(-6, g - 16), pt(2, g - 6), 14),
    ...cub(pt(2, g - 6), pt(4, g - 3), pt(2, g), pt(-4, g + 1), 6).slice(1),
  ];
  skin(d, hump, BODY, 0.8);
  mottle(d, hump, 60, g - 16, g, DARK, 0.6);
  pen.clipped(hump, () => {
    // The segments' folds.
    for (const x of [-24, -16, -8]) pen.hair(bezier(pt(x, g - 14), pt(x + 2.5, g - 7), pt(x + 1, g + 2), 6), 0.6, d.ink, 0.55);
  });
  shade(d, hump, 0.4);
  edge(d, hump, 1.15);
  // Bristles in tufts along the back.
  for (let i = 0; i < 9; i++) {
    const u = 0.08 + i * 0.1;
    const p = hump[Math.round(u * 14)]!;
    const lean = -0.4 + u * 0.5;
    pen.hair([p, pt(p.x + lean * 3 - 1, p.y - 3 - pen.rng() * 1.5)], 0.5, d.ink, 0.8);
    pen.hair([p, pt(p.x + lean * 3 + 1, p.y - 2.5 - pen.rng())], 0.45, d.ink, 0.6);
  }
  // The far jaw, behind the head.
  jaw(d, pt(13, g - 9), pt(25, g - 27 - gape), pt(32, g - 23 - gape), 1, true);
  // The head: flat and broad, tipped up out of the sand, with a neck fold behind.
  const head = [
    ...cub(pt(0, g - 4), pt(2, g - 11), pt(10, g - 14), pt(17, g - 11), 10),
    ...cub(pt(17, g - 11), pt(20, g - 9), pt(19, g - 4), pt(15, g - 3), 6).slice(1),
    ...cub(pt(15, g - 3), pt(10, g - 1), pt(3, g), pt(0, g - 4), 6).slice(1),
  ];
  skin(d, head, HEAD, 0.8);
  pen.clipped(head, () => {
    // Two dark stripes run along the head.
    pen.stroke(bezier(pt(3, g - 9), pt(9, g - 12), pt(16, g - 10), 8), 1.6, DARK, 0.55, false);
    pen.stroke(bezier(pt(4, g - 5), pt(10, g - 6), pt(16, g - 5), 8), 1.2, DARK, 0.4, false);
  });
  shade(d, head, 0.4);
  edge(d, head, 1.1);
  // A tuft of tiny eyes on a knob at the side of the head.
  pen.dot(14, g - 10.5, 1.5, d.ink, 0.9);
  for (const [ex, ey] of [[12.6, g - 11.6], [15.3, g - 11.4], [13.2, g - 9.4]] as const) pen.dot(ex, ey, 0.55, d.ink, 0.9);
  pen.dot(14.4, g - 11, 0.45, PAPER_FILL, 0.9);
  // The near jaws: one sweeping up, one forward, wide open with tips hooked towards each other.
  jaw(d, pt(15, g - 10), pt(22, g - 32 - gape), pt(33, g - 27 - gape), 1, false);
  jaw(d, pt(17, g - 5), pt(33, g - 6 + gape * 0.3), pt(34, g - 15 + gape * 0.3), -1, false);
  // Sand slumped over the body, and over the ground line in front.
  const sand = [
    pt(-35, g + 1),
    ...cub(pt(-35, g + 1), pt(-30, g - 5), pt(-20, g - 3), pt(-12, g - 2.5), 10).slice(1),
    ...cub(pt(-12, g - 2.5), pt(-4, g - 2), pt(2, g - 1), pt(8, g - 1.5), 8).slice(1),
    ...cub(pt(8, g - 1.5), pt(18, g - 2.5), pt(28, g - 0.5), pt(35, g + 1), 8).slice(1),
    pt(35, g + 5),
    pt(-35, g + 5),
  ];
  pen.fill(sand, SAND_DRY, 0.95);
  pen.stipple(sand, 90, () => 0.7, 0.45, SAND_GRAIN);
  pen.stroke(sand.slice(0, -2), 0.8, d.ink, 0.6, false);
  // Grains flicked up by the jaws, on their way back down.
  const flick = [
    [[-8, -24], [-3, -29], [3, -21], [-14, -18], [7, -27]],
    [[-6, -27], [0, -31], [4, -24], [-12, -21], [9, -30]],
    [[-4, -21], [1, -26], [6, -18], [-10, -15], [10, -24]],
  ][d.f]!;
  for (const [x, y] of flick) pen.dot(x!, g + y!, 0.75, SAND_GRAIN, 0.9);
  for (const [x, y] of flick.slice(0, 2)) pen.hair([pt(x! - 1, g + y! + 3), pt(x! - 0.3, g + y! + 1.2)], 0.4, d.ink, 0.4);
}
