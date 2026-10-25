import { polar } from '../groundKit';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/preyKit';
import { lit } from './barrensCrittersKit';
import { CROC_U, crocHalf, type CrocPaint } from './floodedCrittersCroc';
import { type Body, local, shapeIn } from './floodedCrittersKit';

/**
 * The black caiman's head thrown open in the lunge, seen from above: the
 * skull tipped up and so foreshortened, its eyes and the upper teeth along
 * its edge; beyond it the long lower jaw, its pale mouth and tongue ringed
 * by teeth. No blood, nothing caught: just the snap.
 */
export const MOUTH = { inner: '#f0dfae', deep: '#b08a5c', tongue: '#dc9f7e', tooth: '#fbf7ea' } as const;

/** A row of teeth along an edge, pointing `out` (an angle per point), `len` long. */
function teeth(d: Draw, edge: readonly Pt[], out: (i: number) => number, len: number): void {
  edge.forEach((p, i) => {
    const a = out(i);
    const l = len * (0.7 + 0.5 * (((i * 7) % 5) / 4));
    const t = [polar(p, a + Math.PI / 2, l * 0.32), polar(p, a, l), polar(p, a - Math.PI / 2, l * 0.32)];
    d.pen.fill(t, MOUTH.tooth, 1);
    d.pen.stroke(t, 0.25, d.ink, 0.75, false);
  });
}

/** Paints the gaping head over the body's front, its skull at b's u = CROC_U.skull. */
export function gape(d: Draw, b: Body, p: CrocPaint, len: number): void {
  const { pen } = d;
  const k = len / 108;
  const L = CROC_U.skull * len;
  const hw = crocHalf(CROC_U.skull, k);
  const f = local(b.at(CROC_U.skull, 0), b.ang(CROC_U.skull));
  // The lower jaw, reaching on past where the snout would be.
  const jawKeys: readonly (readonly [number, number])[] = [[-1, -hw * 1], [L * 0.3, -hw * 1.15], [L * 0.8, -hw * 0.98], [L * 1.2, -hw * 0.62], [L * 1.32, 0], [L * 1.2, hw * 0.62], [L * 0.8, hw * 0.98], [L * 0.3, hw * 1.15], [-1, hw * 1]];
  const jaw = shapeIn(f, jawKeys, 4);
  pen.fill(jaw.map((q) => pt(q.x + 2.5 * k, q.y + 3.5 * k)), d.ink, 0.18);
  pen.fill(jaw, PAPER_FILL, 1);
  pen.fill(jaw, p.jaw, 0.9);
  pen.clipped(jaw, () => pen.crescent(jaw, pt(-0.6 * k, -0.9 * k), () => pen.fill(jaw, p.deep, 0.45)));
  pen.stroke(closed(jaw), 0.6 * k, d.ink, 0.95, false);
  const mouth = shapeIn(f, jawKeys.map(([x, y]) => [x * 0.95 + L * 0.03, y * 0.8] as const), 4);
  pen.fill(mouth, MOUTH.inner, 1);
  pen.clipped(mouth, () => {
    pen.crescent(mouth, pt(1 * k, 1.2 * k), () => pen.fill(mouth, MOUTH.deep, 0.5));
    const tg = f(L * 0.55, 0);
    pen.fill(ellipseAt(tg.x, tg.y, L * 0.32, hw * 0.42, b.ang(CROC_U.skull), 18), MOUTH.tongue, 0.85);
    pen.hair([f(L * 0.3, 0), f(L * 0.82, 0)], 0.4 * k, MOUTH.deep, 0.6);
    glaze(d, f(L * 0.7, -hw * 0.2).x, f(L * 0.7, -hw * 0.2).y, L * 0.2, hw * 0.15, b.ang(CROC_U.skull), PAPER_FILL, 0.35);
  });
  pen.stroke(closed(mouth), 0.35 * k, d.ink, 0.85, false);
  // Lower teeth along the inner rim, pointing up and in.
  const rim = mouth.filter((_, i) => i % 3 === 0 && i > 1 && i < mouth.length - 2);
  const c = f(L * 0.55, 0);
  teeth(d, rim, (i) => Math.atan2(c.y - rim[i]!.y, c.x - rim[i]!.x), 2.6 * k);
  // The skull, tipped up: short in projection, its teeth showing along its edge.
  const top: readonly (readonly [number, number])[] = [[-L * 0.15, -hw * 1.02], [L * 0.2, -hw * 1.02], [L * 0.45, -hw * 0.78], [L * 0.6, -hw * 0.5], [L * 0.64, 0], [L * 0.6, hw * 0.5], [L * 0.45, hw * 0.78], [L * 0.2, hw * 1.02], [-L * 0.15, hw * 1.02]];
  const skull = shapeIn(f, top, 4);
  const edge = skull.filter((q, i) => i % 2 === 0 && i > 3 && i < skull.length - 4);
  const fc = f(-L * 0.2, 0);
  teeth(d, edge, (i) => Math.atan2(edge[i]!.y - fc.y, edge[i]!.x - fc.x), 2.8 * k);
  pen.fill(skull, PAPER_FILL, 1);
  pen.fill(skull, p.head, 0.95);
  pen.clipped(skull, () => {
    glaze(d, f(L * 0.2, -hw * 0.3).x, f(L * 0.2, -hw * 0.3).y, L * 0.45, hw * 0.5, b.ang(CROC_U.skull), lit(p.head, 0.3), 0.4);
    pen.crescent(skull, pt(-1 * k, -1.4 * k), () => pen.fill(skull, p.deep, 0.5));
    for (let i = 0; i < 26; i++) {
      const q = f(L * 0.6 * (((i * 37) % 26) / 26) - L * 0.1, hw * 0.8 * ((((i * 53) % 26) / 13) - 1));
      pen.dot(q.x, q.y, 0.3 * k, p.deep, 0.5);
    }
  });
  pen.stroke(closed(skull), 0.6 * k, d.ink, 0.95, false);
  // The nostrils at its tip, the eyes wide on their orbits behind.
  const n = f(L * 0.55, 0);
  for (const s of [-1, 1]) pen.fill(ellipseAt(n.x, n.y + 0, 0.7 * k, 0.4 * k, b.ang(CROC_U.skull) + s * 0.5, 8).map((q) => polar(q, b.ang(CROC_U.skull) + s * Math.PI / 2, 0.9 * k)), '#141214', 0.95);
  for (const s of [-1, 1]) {
    const e = f(L * 0.05, s * hw * 0.55);
    const orbit = ellipseAt(e.x, e.y, 2.8 * k, 2.2 * k, b.ang(CROC_U.skull), 16);
    pen.fill(orbit, p.head, 1);
    pen.stroke(closed(orbit), 0.45 * k, d.ink, 0.95, false);
    pen.fill(ellipseAt(e.x, e.y, 1.7 * k, 1.3 * k, b.ang(CROC_U.skull), 14), p.iris, 1);
    pen.fill(ellipseAt(e.x, e.y, 0.35 * k, 1.15 * k, b.ang(CROC_U.skull), 10), '#0f0e10', 1);
    pen.dot(e.x - 0.5 * k, e.y - 0.5 * k, 0.3 * k, PAPER_FILL, 0.9);
  }
}
