import { closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze, skinWash } from '../critters/preyKit';
import { type Body, bodyOf, off, widthOf } from './reefCrittersKit';
import { LEN, PEDUNCLE, type SharkPose } from './reefBossShape';

/**
 * The Tiger Shark's fins and jaws: the broad sickle pectorals, the small
 * pelvics, the tall first dorsal seen edge-on from above with its shadow
 * on the back, the tail's long upper lobe, and the jaws thrust out under
 * the snout when it thrashes.
 */
export const SHARK = {
  base: '#7f8489',
  back: '#5e646a',
  deep: '#2c3036',
  bar: '#33373c',
  pale: '#b9bcb7',
  fin: '#6c7277',
  finTip: '#3d4247',
  gum: '#d99a95',
  throat: '#5b2026',
  tooth: '#f8f4e8',
  eye: '#1a1c20',
} as const;

/** A solid fin: a wash rounded by the light, darker to its tip, fine pen lines along it and a firm contour. */
function solidFin(d: Draw, shape: readonly Pt[], tip: Pt, root: Pt, line = 0.8): void {
  const { pen } = d;
  skinWash(d, shape, SHARK.fin, SHARK.deep, { at: pt(root.x - 1, root.y - 2), r: 9 }, 0.4);
  pen.clipped(shape, () => {
    glaze(d, tip.x, tip.y, 11, 7, Math.atan2(tip.y - root.y, tip.x - root.x), SHARK.finTip, 0.55);
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const a = pt(root.x + (tip.x - root.x) * t * 0.2, root.y + (tip.y - root.y) * t * 0.2);
      pen.hair([pt(a.x + (i - 3) * 1.6, a.y), pt(tip.x + (root.x - tip.x) * 0.15 + (i - 3) * 0.8, tip.y + (root.y - tip.y) * 0.15)], 0.3, SHARK.deep, 0.25);
    }
  });
  pen.stroke(closed(shape), line, d.ink, 0.95);
}

/** The pectoral fins: broad, sickle-shaped, held out and back (swept further back in a charge). */
export function pectorals(d: Draw, z: Body, pose: SharkPose): void {
  const tuck = pose === 'charge' ? 1 : pose === 'struck' ? 0.5 : 0;
  for (const side of [-1, 1]) {
    const front = z.at(29, side * 0.9);
    const rear = z.at(42, side * 0.9);
    const tip = off(z, 40, side, 27 - 8 * tuck, 21 + 10 * tuck);
    const leadC = off(z, 31, side, 14 - 4 * tuck, 2 + 4 * tuck);
    const trailC = off(z, 44, side, 10 - 3 * tuck, 3);
    const shape = [...cub(front, leadC, pt(tip.x + (leadC.x - tip.x) * 0.3, tip.y + (leadC.y - tip.y) * 0.3), tip, 12), ...cub(tip, pt(tip.x + (trailC.x - tip.x) * 0.5, tip.y + (trailC.y - tip.y) * 0.5), trailC, rear, 10).slice(1)];
    solidFin(d, shape, tip, pt((front.x + rear.x) / 2, (front.y + rear.y) / 2));
  }
}

/** The small pelvic fins near the vent. */
export function pelvics(d: Draw, z: Body): void {
  for (const side of [-1, 1]) {
    const front = z.at(80, side * 0.8);
    const rear = z.at(87, side * 0.8);
    const tip = off(z, 88, side, 7, 4);
    const shape = [...cub(front, off(z, 81, side, 5, 0), tip, tip, 6), ...cub(tip, tip, off(z, 89, side, 1, 0), rear, 6).slice(1)];
    solidFin(d, shape, tip, front, 0.6);
  }
}

/** The tail: its long upper lobe seen nearly edge-on from above, a narrow blade sweeping back, the lower lobe peeking out beside it. */
export function tail(d: Draw, spine: (s: number) => Pt, pose: SharkPose): Body {
  const { pen } = d;
  const lobe = bodyOf((s) => spine(PEDUNCLE + s), widthOf([[0, 6.4], [4, 5], [10, 6.4], [24, 4.6], [36, 3], [LEN - PEDUNCLE, 0.4]]), LEN - PEDUNCLE, 36);
  // The lower lobe: shorter, flaring a little to the side the tail is swinging from.
  const swing = pose === 'swim0' || pose === 'turn' || pose === 'tell' ? 1 : -1;
  const l0 = lobe.at(4, swing * 0.6);
  const lTip = off(lobe, 17, swing, 6, 2);
  const lower = [...cub(l0, off(lobe, 8, swing, 4, 0), lTip, lTip, 8), ...cub(lTip, lTip, off(lobe, 14, swing, 0, 0), lobe.at(12, swing * 0.4), 6).slice(1), lobe.at(8, 0)];
  solidFin(d, lower, lTip, l0, 0.6);
  skinWash(d, lobe.shape, SHARK.fin, SHARK.deep, { at: lobe.at(8, -0.3), r: 6 }, 0.45);
  pen.clipped(lobe.shape, () => {
    const t = lobe.at(36, 0);
    glaze(d, t.x, t.y, 12, 4, 0, SHARK.finTip, 0.6);
    pen.hair(Array.from({ length: 12 }, (_, i) => lobe.at(2 + i * 3.6, -0.2)), 0.6, PAPER_FILL, 0.3);
    pen.hair(Array.from({ length: 12 }, (_, i) => lobe.at(2 + i * 3.6, 0.35)), 0.3, SHARK.deep, 0.4);
  });
  pen.stroke(closed(lobe.shape), 0.75, d.ink, 0.95);
  return lobe;
}

/** A dorsal fin seen from above: a narrow blade on the midline, lit on its left face, shading on its right, its shadow cast on the back. */
export function dorsal(d: Draw, z: Body, s0: number, s1: number, w: number): void {
  const { pen } = d;
  const n = 10;
  const side = (v: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const s = s0 + (s1 - s0) * t;
    const c = z.at(s, 0);
    const { n: nn } = z.frame(s);
    const half = w * Math.sin(Math.PI * Math.min(1, t * 1.25)) * (1 - t * 0.6) * 0.5;
    return pt(c.x + nn.x * v * half, c.y + nn.y * v * half);
  });
  const left = side(-1);
  const right = side(1);
  const shape = [...left, ...right.reverse().slice(1, -1)];
  pen.fill(shape.map((p) => pt(p.x + 3.5, p.y + 5.5)), d.ink, 0.22);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SHARK.fin, 0.9);
  pen.fill([...side(0), ...side(1).reverse()], SHARK.deep, 0.45);
  pen.hair(side(-0.55), 0.5, PAPER_FILL, 0.45);
  pen.hair(side(0), 0.45, SHARK.deep, 0.9);
  pen.stroke(closed(shape), 0.6, d.ink, 0.95);
}

/** The jaws thrust out under the snout, wide open: the pale gums and rows of serrated teeth, the dark throat. */
export function jaws(d: Draw, z: Body): void {
  const { pen } = d;
  const tip = z.at(0, 0);
  const { f, n } = z.frame(0);
  const at = (fw: number, side: number): Pt => pt(tip.x + f.x * fw + n.x * side, tip.y + f.y * fw + n.y * side);
  const arc = (reach: number, half: number, k = 14): Pt[] => Array.from({ length: k + 1 }, (_, i) => {
    const v = -1 + (2 * i) / k;
    return at(reach * (1 - v * v) - 3, half * v);
  });
  const outer = [...arc(9, 15), ...arc(1, 13).reverse()];
  pen.fill(outer, SHARK.gum, 0.95);
  pen.clipped(outer, () => glaze(d, tip.x + f.x * 2, tip.y + f.y * 2, 8, 6, 0, SHARK.throat, 0.8));
  // Two rows of triangular serrated teeth along the jaw's rim, pointing in.
  for (const [reach, half, size] of [[8.4, 14.2, 2.1], [6.4, 12, 1.5]] as const) {
    const rim = arc(reach, half, 12);
    for (let i = 1; i < rim.length - 1; i++) {
      const p = rim[i]!;
      const into = pt(tip.x - f.x * 1 - p.x, tip.y - f.y * 1 - p.y);
      const l = Math.hypot(into.x, into.y) || 1;
      const u = pt(into.x / l, into.y / l);
      const tri = [pt(p.x - u.y * size * 0.55, p.y + u.x * size * 0.55), pt(p.x + u.x * size * 1.2 + u.y * size * 0.25, p.y + u.y * size * 1.2 - u.x * size * 0.25), pt(p.x + u.y * size * 0.55, p.y - u.x * size * 0.55)];
      pen.fill(tri, SHARK.tooth, 1);
      pen.hair(closed(tri), 0.2, d.ink, 0.7);
    }
  }
  pen.stroke(closed(outer), 0.7, d.ink, 0.95);
}
