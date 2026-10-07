import { bezier, closed, cub, type Draw, edge, lerp, mottle, oval, pt, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { fin } from './fin';

/**
 * A long-spined sea scorpion (Taurulus bubalis), side-on and facing right,
 * swimming: a huge, broad, bony head bristling with spines, a wide frowning
 * mouth, eyes high under spiny brows, a short spiny first dorsal and a soft
 * second one, great fan pectorals and a body tapering hard to a small tail.
 * Blotched red-brown over cream, fins barred.
 */
const BODY = '#a65a3a';
const DARK = '#5e2c1e';
const CREAM = '#ecdcb8';
const FIN = '#b47450';
const IRIS = '#d8a640';

/** Points along a fin line from a to b, `n` segments. */
const line = (a: Pt, b: Pt, n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));

/** A stiff head spine: a short dark cone from `root` towards `tip`. */
function spine(d: Draw, root: Pt, tip: Pt, w: number): void {
  const nx = -(tip.y - root.y);
  const ny = tip.x - root.x;
  const l = Math.hypot(nx, ny) || 1;
  const shape = [pt(root.x + (nx / l) * w, root.y + (ny / l) * w), tip, pt(root.x - (nx / l) * w, root.y - (ny / l) * w)];
  d.pen.fill(shape, CREAM, 0.9);
  d.pen.stroke(shape, 0.7, d.ink, 0.95, false);
}

export function sculpin(d: Draw): void {
  const { pen } = d;
  const cy = d.g - 16;
  const ph = -d.f * (TAU / 3);
  const wave = (x: number, amp: number): number => Math.sin(x * 0.25 + ph) * amp;
  const sway = [0, 1.5, -1.3][d.f]!;
  // A small rounded tail on a thin stalk.
  const tailEdge = bezier(pt(-36, cy - 7 + sway), pt(-48, cy - 1 + sway), pt(-36, cy + 6.5 + sway), 10);
  fin(d, tailEdge.map((_, i) => pt(-30, cy - 2.2 + (4.4 * i) / (tailEdge.length - 1))), tailEdge, { wash: FIN, rays: 8 });
  // The far pectoral, showing above and below the near one.
  fin(d, line(pt(12, cy - 3), pt(11, cy + 6), 4), bezier(pt(0, cy - 14 + wave(0, 1)), pt(-12, cy - 2), pt(-2, cy + 11), 4), { wash: FIN, rays: 0, far: true });
  // First dorsal: stout spines standing out of a scalloped membrane; then a long soft dorsal and the anal fin opposite it.
  const d1Base = bezier(pt(13, cy - 14.4), pt(7, cy - 13.6), pt(1, cy - 12), 8);
  const d1Edge = d1Base.map((p, i) => pt(p.x - 1.6, p.y - (i % 2 === 0 ? 8.5 - Math.abs(i - 3) * 0.6 : 4.6) + wave(p.x, 0.5)));
  fin(d, d1Base, d1Edge, { wash: FIN, alpha: 0.6, rays: 0 });
  for (let i = 0; i < d1Base.length; i += 2) pen.stroke([d1Base[i]!, pt(d1Edge[i]!.x - 0.4, d1Edge[i]!.y - 1)], 1, d.ink, 0.95, false);
  const d2Base = bezier(pt(0, cy - 11.8), pt(-14, cy - 8.4), pt(-29, cy - 2.6), 12);
  const d2Edge = d2Base.map((p, i) => pt(p.x - 2, p.y - 7.5 * (i === 12 ? 0.3 : 1) + (i / 12) * 1.5 + wave(p.x, 0.9)));
  fin(d, d2Base, d2Edge, { wash: FIN, rays: 14 });
  const aBase = bezier(pt(-2, cy + 9.4), pt(-16, cy + 7), pt(-29, cy + 2.4), 10);
  const aEdge = aBase.map((p, i) => pt(p.x - 2, p.y + 5.4 * (i === 10 ? 0.3 : 1) - wave(p.x + 2, 0.7)));
  fin(d, aBase, aEdge, { wash: FIN, rays: 12 });
  // Body: a huge blunt head flattened on top, bony brow lumps, tapering hard to the tail stalk.
  const body = [
    ...cub(pt(42, cy + 1.5), pt(42, cy - 6), pt(37, cy - 12), pt(31, cy - 13.4), 8),
    ...cub(pt(31, cy - 13.4), pt(28, cy - 18), pt(21, cy - 18), pt(18, cy - 15), 6).slice(1),
    ...cub(pt(18, cy - 15), pt(4, cy - 14), pt(-14, cy - 8), pt(-30, cy - 2.4), 16).slice(1),
    pt(-30.5, cy + 2.4),
    ...cub(pt(-30, cy + 2.4), pt(-14, cy + 6), pt(4, cy + 12), pt(20, cy + 13), 14).slice(1),
    ...cub(pt(20, cy + 13), pt(32, cy + 13), pt(40, cy + 9), pt(43, cy + 4), 8).slice(1),
  ];
  skin(d, body, BODY, 0.8);
  // A second, lighter wash so the off-register rim reads as a sheen along the back, not a gap.
  tint(d, body, BODY, 0.3);
  pen.clipped(body, () => {
    // A cream belly and cream saddles breaking up the red-brown, then dark blotches.
    tint(d, [...cub(pt(44, cy + 5), pt(20, cy + 6), pt(-6, cy + 6), pt(-34, cy + 1.5), 12), pt(-34, cy + 14), pt(44, cy + 14)], CREAM, 0.8);
    for (const [x, y, rx, ry] of [[6, cy - 6, 4.5, 3], [-14, cy - 4, 3.5, 2.6], [-26, cy - 1, 2.6, 2], [26, cy + 2, 3.5, 2.5]] as const) tint(d, oval(x, y, rx, ry, 12), CREAM, 0.6);
    for (let i = 0; i < 14; i++) {
      const x = 34 - pen.rng() * 64;
      const y = cy - 9 + pen.rng() * 13;
      tint(d, oval(x, y, 1.6 + pen.rng() * 2.6, 1.2 + pen.rng() * 1.6, 10), DARK, 0.45);
    }
    pen.hair(cub(pt(16, cy - 7), pt(4, cy - 5), pt(-12, cy - 2), pt(-31, cy), 12), 0.45, d.ink, 0.45);
  });
  mottle(d, body, 150, cy - 13, cy + 6, DARK, 0.55);
  shade(d, body, 0.42, true);
  edge(d, body, 1.3);
  // The gill cover and its spines: a long one raking back from the cheek, short ones on the rim.
  pen.hair(cub(pt(19, cy - 13.5), pt(12, cy - 5), pt(12, cy + 5), pt(17, cy + 12), 10), 0.8, d.ink, 0.8);
  pen.hair(bezier(pt(26, cy - 3), pt(22, cy + 2), pt(25, cy + 8), 6), 0.55, d.ink, 0.55);
  spine(d, pt(15, cy - 1), pt(5, cy - 4.5), 1.2);
  spine(d, pt(15, cy + 3), pt(8, cy + 4.5), 0.9);
  spine(d, pt(15.5, cy + 7), pt(10.5, cy + 10), 0.8);
  // Spines on the crown and over the eye.
  spine(d, pt(30, cy - 15), pt(33, cy - 19.5), 0.9);
  spine(d, pt(25.5, cy - 16.6), pt(25.5, cy - 21), 0.9);
  spine(d, pt(20, cy - 15.6), pt(18, cy - 19.4), 0.8);
  // A wide, down-turned mouth with thick lips and a row of small teeth.
  const gape = bezier(pt(42.5, cy + 3), pt(36, cy + 4), pt(27, cy + 7.2), 8);
  pen.stroke(gape, 1.3, d.ink, 1, false);
  pen.hair(bezier(pt(41, cy + 0.6), pt(35, cy + 1.6), pt(28.5, cy + 5.2), 6), 0.55, d.ink, 0.6);
  pen.hair(bezier(pt(42, cy + 5.6), pt(36, cy + 6.4), pt(28.5, cy + 8.6), 6), 0.55, d.ink, 0.6);
  for (let k = 1; k < 6; k++) {
    const p = gape[k]!;
    pen.hair([pt(p.x, p.y - 0.2), pt(p.x - 0.3, p.y + 1)], 0.5, PAPER_FILL, 0.9);
  }
  // The eye: high on the head, a gold iris, glaring from under a heavy brow.
  const eye = oval(28, cy - 11, 3.4, 3.1, 14);
  pen.fill(eye, PAPER_FILL, 1);
  pen.fill(eye, IRIS, 0.75);
  pen.dot(28.8, cy - 10.6, 1.9, d.ink, 0.95);
  pen.dot(29.5, cy - 11.4, 0.6, PAPER_FILL, 0.95);
  pen.stroke(closed(eye), 0.85, d.ink, 1, false);
  pen.stroke(bezier(pt(23.6, cy - 14.6), pt(28, cy - 13.2), pt(32.6, cy - 11), 6), 1.3, d.ink, 0.95, false);
  // The near pectoral: a great fan with dark bars across its rays.
  const pBase = line(pt(14, cy - 2), pt(13.5, cy + 7.5), 10);
  const pEdge = cub(pt(4, cy - 13 + wave(2, 1)), pt(-8, cy - 10 + wave(5, 1.2)), pt(-10, cy + 8 + wave(8, 1)), pt(3, cy + 13), 10);
  const pec = fin(d, pBase, pEdge, { wash: FIN, alpha: 0.65, rays: 12 });
  pen.clipped(pec, () => {
    for (const r of [7, 12]) pen.stroke(cub(pt(14 - r * 0.6, cy - 12), pt(14 - r * 1.2, cy - 6), pt(14 - r * 1.2, cy + 6), pt(14 - r * 0.6, cy + 12), 8), 1.6, DARK, 0.4, false);
  });
  // Pelvic fin under the throat.
  fin(d, line(pt(19, cy + 11), pt(15, cy + 11), 3), [pt(16, cy + 14.5 + wave(3, 0.5)), pt(13, cy + 14.5), pt(11, cy + 13.6), pt(11.5, cy + 12)], { wash: FIN, rays: 4 });
}
