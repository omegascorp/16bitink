import { bezier, capsule, closed, cub, type Draw, edge, lerp, mottle, oval, pt, shade, skin, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { fin } from './fin';

/**
 * A mudskipper (Periophthalmus) out on the mud, side-on and facing right: a
 * blunt head with puffed cheeks, frog-like eyes bulging on top, a long body
 * lying flat and tapering to a rounded tail, propped on muscular pectoral
 * fins like little arms. A tall, spotted first dorsal with a blue-and-orange
 * edge. Mottled olive-brown, flecked pale blue, paler below. By frame it
 * skips: fins planted forward, pushed back with the tail flicked up, then
 * the tail flicked down.
 */
const BODY = '#7d774a';
const DARK = '#463f24';
const BELLY = '#ddd5b2';
const FIN = '#8c8054';
const SPOT = '#9fcbe0';
const BLUE = '#3f86c4';
const ORANGE = '#e3893a';
const IRIS = '#c9a24a';

/** Pose by frame: wrist reach along the mud, body lift, tail flick. */
const POSE = [
  { reach: 5, lift: 0, flick: 0 },
  { reach: -5, lift: 3, flick: -7 },
  { reach: 0.5, lift: 1.2, flick: 4.5 },
] as const;

/** Points along a line from a to b, `n` segments. */
const line = (a: Pt, b: Pt, n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));

/** A pectoral "arm": a fleshy lobe from the body down to a fan of rays splayed on the mud. */
function pectoral(d: Draw, root: Pt, reach: number, far: boolean): void {
  const { pen } = d;
  const wrist = pt(root.x + 3 + reach, d.g - 3);
  const lobe = capsule(root, wrist, 6.4, 4.2);
  pen.fill(lobe, PAPER_FILL, 1);
  pen.fill(lobe, BODY, far ? 0.85 : 0.7);
  if (far) pen.fill(lobe, d.ink, 0.14);
  else shade(d, lobe, 0.35);
  pen.stroke(closed(lobe), far ? 0.7 : 0.9, d.ink, far ? 0.55 : 1, false);
  const base = line(pt(wrist.x - 1.8, wrist.y - 1), pt(wrist.x + 1.8, wrist.y + 0.8), 6);
  const edgeLine = bezier(pt(wrist.x - 4.5, d.g + 0.4), pt(wrist.x + 3.5, d.g + 1.4), pt(wrist.x + 10, d.g - 1.5), 6);
  fin(d, base, edgeLine, { wash: FIN, alpha: 0.6, rays: 6, far });
}

export function mudskipper(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const p = POSE[d.f]!;
  const y = (v: number, x = 0): number => g + v - p.lift * Math.max(0, Math.min(1, (x + 30) / 50));
  pen.fill(oval(2, g - 1, 38, 3, 24), d.ink, 0.1);
  pectoral(d, pt(17, y(-7, 17)), p.reach - 2, true);
  // The tail: a rounded fan off the tail stalk, flicked up or down.
  const tailEdge = bezier(pt(-36, y(-12) + p.flick), pt(-50, y(-6) + p.flick * 1.3), pt(-37, y(0) + p.flick * 0.7), 10);
  fin(d, line(pt(-31.5, y(-8.5)), pt(-31.5, y(-3.5)), 10), tailEdge, { wash: FIN, rays: 9 });
  // Second dorsal: long and low, edged like the first.
  const d2Base = bezier(pt(-3, y(-14.6, -3)), pt(-16, y(-12.4, -16)), pt(-30, y(-8.6, -30)), 10);
  const d2Edge = d2Base.map((q, i) => pt(q.x - 1.6, q.y - 5.4 * (i === 10 ? 0.3 : i === 0 ? 0.6 : 1) + i * 0.1));
  const d2 = fin(d, d2Base, d2Edge, { wash: FIN, rays: 11 });
  pen.clipped(d2, () => pen.stroke(d2Edge, 1.2, BLUE, 0.6, false));
  // First dorsal: a tall rounded sail, spotted, with a blue margin over an orange band.
  const d1Base = bezier(pt(15, y(-16.4, 15)), pt(8, y(-16, 8)), pt(1, y(-15, 1)), 8);
  const d1Edge = cub(pt(14, y(-31, 15)), pt(9, y(-36, 8)), pt(1.5, y(-29, 1)), pt(-1.5, y(-17.5, 0)), 8);
  const d1 = fin(d, d1Base, d1Edge, { wash: FIN, alpha: 0.55, rays: 7 });
  pen.clipped(d1, () => {
    for (let i = 0; i < 9; i++) pen.dot(2 + pen.rng() * 11, y(-27, 8) + pen.rng() * 9, 0.75, DARK, 0.55);
    pen.stroke(d1Edge.map((q) => pt(q.x, q.y + 1.8)), 1.6, ORANGE, 0.75, false);
    pen.stroke(d1Edge, 1.5, BLUE, 0.8, false);
  });
  pen.stroke(d1Edge, 0.8, d.ink, 0.9, false);
  // The body: blunt, steep-browed head, puffed cheek, flat belly lying on the mud.
  const body = [
    ...cub(pt(38, y(-4.5, 38)), pt(40, y(-10, 38)), pt(37.5, y(-15, 37)), pt(31, y(-16.8, 31)), 8),
    ...cub(pt(31, y(-16.8, 31)), pt(20, y(-18, 20)), pt(4, y(-16.5, 4)), pt(-8, y(-13.5, -8)), 12).slice(1),
    ...cub(pt(-8, y(-13.5, -8)), pt(-18, y(-11.5)), pt(-26, y(-9.5)), pt(-31.5, y(-8.5)), 8).slice(1),
    pt(-32, y(-3.5)),
    ...cub(pt(-31.5, y(-3.5)), pt(-16, y(-1.4)), pt(6, y(-0.6, 6)), pt(24, y(-1, 24)), 12).slice(1),
    ...cub(pt(24, y(-1, 24)), pt(31, y(-1.2, 31)), pt(36, y(-2, 36)), pt(38, y(-4.5, 38)), 6).slice(1),
  ];
  skin(d, body, BODY, 0.8);
  tint(d, body, BODY, 0.25);
  pen.clipped(body, () => {
    tint(d, [...cub(pt(42, y(-6, 40)), pt(20, y(-5, 20)), pt(-8, y(-4)), pt(-34, y(-5)), 12), pt(-34, g + 2), pt(42, g + 2)], BELLY, 0.75);
    // Dark saddles along the back, then pale blue flecks over the flank and cheek.
    for (let i = 0; i < 7; i++) tint(d, oval(18 - i * 7.4, y(-12 + i * 0.6, 18 - i * 7.4), 2.6, 2, 10), DARK, 0.45);
    for (let i = 0; i < 22; i++) {
      const sx = -26 + pen.rng() * 62;
      const sy = y(-13 + pen.rng() * 8, sx);
      pen.dot(sx, sy, 0.75, PAPER_FILL, 0.9);
      pen.dot(sx, sy, 0.6, SPOT, 0.9);
    }
  });
  mottle(d, body, 110, y(-17, 10), y(-4, 10), DARK, 0.5);
  shade(d, body, 0.38);
  edge(d, body, 1.2);
  // Gill cover round the puffed cheek, the wide mouth under the snout.
  pen.hair(cub(pt(20, y(-14, 20)), pt(16.5, y(-9, 17)), pt(17, y(-4, 17)), pt(21, y(-1.5, 21)), 8), 0.7, d.ink, 0.75);
  pen.hair(bezier(pt(38.5, y(-4.6, 38)), pt(35, y(-4, 35)), pt(30, y(-5.2, 30)), 6), 0.9, d.ink, 0.95);
  pen.hair(bezier(pt(36.5, y(-2.8, 36)), pt(33, y(-2.6, 33)), pt(30.5, y(-4, 30)), 4), 0.5, d.ink, 0.6);
  // The eyes: two domes bulging up out of the top of the head, the far one just behind.
  for (const [ex, far] of [[27.5, true], [30, false]] as const) {
    const ey = y(far ? -19.6 : -18.4, ex);
    const dome = oval(ex, ey, 3.5, 3.3, 14);
    pen.fill(dome, PAPER_FILL, 1);
    pen.fill(dome, IRIS, far ? 0.6 : 0.7);
    if (far) pen.fill(dome, d.ink, 0.15);
    pen.dot(ex + 0.6, ey - 0.2, 2, d.ink, far ? 0.7 : 0.95);
    if (!far) pen.dot(ex + 1.3, ey - 1.1, 0.7, PAPER_FILL, 0.95);
    pen.stroke(closed(dome), far ? 0.6 : 0.85, d.ink, far ? 0.6 : 1, false);
  }
  pen.hair(bezier(pt(26, y(-16.6, 26)), pt(30, y(-15.2, 30)), pt(33.6, y(-16.8, 33)), 5), 0.6, d.ink, 0.7);
  // Pelvic fins: a small fused cup under the chest.
  fin(d, line(pt(14, y(-1.2, 14)), pt(9, y(-1.2, 9)), 3), bezier(pt(15, g + 0.3), pt(11, g + 1.2), pt(7.5, g - 0.4), 3), { wash: FIN, rays: 3 });
  pectoral(d, pt(19, y(-6.5, 19)), p.reach, false);
}
