import { closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { mix } from '../wash';
import { chain, fur, locks, tufted } from './beastFur';
import { dab, gleam, paint, SHADOW } from './beastPaint';

/**
 * The timber wolf's head, lowered and snarling: a broad skull with the
 * brow knotted down over an amber eye, ears laid half back, the muzzle's
 * bridge wrinkled and the upper lip curled off the fangs, the jaw a little
 * open. A white cheek and muzzle against the grey crown, a ruff of cheek
 * fur flaring back into the neck. Local units, facing right.
 */
export const WOLF = {
  grey: '#9c978d',
  saddle: '#4b433b',
  umber: '#6d5a45',
  tan: '#b48c5c',
  buff: '#d6c39b',
  cream: '#efe5cc',
  nose: '#2a2527',
  eye: '#e2a12c',
  mouth: '#4a2427',
  gum: '#a86064',
  tooth: '#f6eedb',
} as const;

const SEED = 4100;

/** Ears: near one laid half back, the far one peeking ahead of it. */
function ears(d: Draw, near: boolean): void {
  const [base0, base1, tip] = near ? [pt(31.6, -45), pt(38.6, -47.8), pt(31.8, -57)] : [pt(37.6, -47.6), pt(42, -47.8), pt(39.6, -55.4)];
  const ear = [...chain(base0, [pt(30.4, -49), pt(30.6, -54), tip], [pt(34, -54.6), pt(37.4, -50.4), base1]), pt((base0.x + base1.x) / 2, base0.y + 1.4)];
  paint(d, ear, near ? WOLF.grey : mix(WOLF.grey, WOLF.saddle, 0.4), { shadow: 0.5, hatch: 0.18, line: 0.6 });
  dab(d, ear.slice(4, 14), WOLF.saddle, 0.55, 0.5);
  if (!near) return;
  // The inner ear: a cream hollow lined with long hairs.
  const inner = chain(pt(33, -46.2), [pt(32.2, -49.6), pt(32.4, -53), pt(32.4, -55)], [pt(34.4, -52), pt(36, -49.4), pt(37.2, -47.4)]);
  paint(d, inner, mix(WOLF.cream, WOLF.tan, 0.3), { shadow: 0.6, hatch: 0, line: 0.35, lineAlpha: 0.6 });
  for (let k = 0; k < 5; k++) d.pen.hair([pt(33.2 + k * 0.8, -46.4), pt(33.2 + k * 0.5, -50.5 - k * 0.3)], 0.3, WOLF.saddle, 0.7);
}

/** The skull and upper muzzle, ending in the curled lip; its cheek edge tufted into a ruff. */
function skull(): Pt[] {
  const top = chain(
    pt(31, -44),
    [pt(33, -47.5), pt(36, -48.8), pt(39, -48.5)],
    [pt(42, -48.4), pt(44.5, -46.8), pt(46.5, -45)],
    [pt(48.5, -43.6), pt(51.5, -42.6), pt(53.5, -41.6)],
    [pt(55, -41.2), pt(55.8, -40), pt(55.6, -38.8)],
    [pt(55.6, -37.6), pt(55, -36.8), pt(54.2, -36.6)],
    [pt(51.5, -37.8), pt(47.5, -37.8), pt(44.5, -35.8)],
    [pt(43, -34.8), pt(41.5, -34), pt(40, -34)],
  );
  const cheek = tufted(chain(pt(40, -34), [pt(37, -33.4), pt(33, -34.6), pt(30.6, -37.4)], [pt(30, -39.6), pt(30.2, -42), pt(31, -44)]), {
    len: 2.4, every: 2.2, rake: pt(-0.5, 0.35), side: 1, seed: SEED + 1,
  });
  return [...top, ...cheek.slice(1, -1)];
}

/** The lower jaw, dropped open a little. */
const JAW = chain(pt(41, -35.4), [pt(45, -35.2), pt(49, -34.8), pt(52.6, -34.6)], [pt(53.6, -34.2), pt(53.4, -32.6), pt(51.6, -32.2)], [pt(48, -31.4), pt(43, -31.4), pt(40, -32.8)]);

/** The open mouth behind the jaws: dark, with the fangs and the gum under the curled lip. */
function mouth(d: Draw): void {
  const gap = [pt(44.5, -35.8), ...chain(pt(47.5, -37.6), [pt(50, -38), pt(52.5, -37.6), pt(54.4, -36.6)]), pt(53.6, -34.2), pt(49, -34.6), pt(44.5, -35.2)];
  d.pen.fill(gap, WOLF.mouth, 1);
  d.pen.stroke([pt(47, -37.2), pt(50, -37.6), pt(53.6, -36.8)], 0.9, WOLF.gum, 0.9, false);
  const tooth = (x: number, top: number, tip: number, w: number): void => {
    const t = [pt(x - w / 2, top), pt(x + w / 2, top), pt(x + w * 0.1, tip)];
    d.pen.fill(t, WOLF.tooth, 1);
    d.pen.hair(closed(t), 0.25, d.ink, 0.7);
  };
  // Lower fang and incisors first, then the upper fang over them.
  tooth(49.4, -34.6, -36.8, 1.2);
  for (const x of [52.2, 53.1]) tooth(x, -34.6, -35.6, 0.8);
  for (const x of [52.6, 53.6]) tooth(x, -36.9, -35.8, 0.8);
  tooth(51.2, -37.6, -34.7, 1.5);
  for (const x of [45.8, 47.2]) tooth(x, -36.4, -35.2, 1);
}

/** The amber eye under a knotted brow. */
function eye(d: Draw): void {
  const lid = [...chain(pt(41.8, -44.4), [pt(43, -45.6), pt(45, -45), pt(46.4, -43.6)], [pt(45, -42.6), pt(43, -42.8), pt(41.8, -44.4)])];
  d.pen.fill(lid, WOLF.nose, 1);
  const iris = oval(44.1, -43.9, 1.35, 0.95, 14);
  d.pen.fill(iris, WOLF.eye, 1);
  d.pen.clipped(iris, () => d.pen.fill(oval(43.6, -44.6, 1.6, 0.8, 12), mix(WOLF.eye, '#6a3a10', 0.6), 0.7));
  d.pen.dot(44.3, -43.8, 0.55, WOLF.nose);
  d.pen.dot(43.7, -44.3, 0.32, PAPER_FILL, 0.95);
  d.pen.stroke(lid.slice(0, 11), 0.55, d.ink, 1, false);
  // The brow knotted down towards the nose; furrows over the bridge.
  d.pen.stroke([pt(40.4, -46.4), pt(43, -46.6), pt(46.8, -44.9)], 0.75, d.ink, 0.9, false);
  for (const [x, y] of [[48.2, -44.6], [49.8, -43.9], [51.3, -43.2]] as const) {
    d.pen.hair([pt(x - 0.4, y - 0.9), pt(x + 0.4, y + 0.2), pt(x + 0.2, y + 1.3)], 0.4, d.ink, 0.75);
  }
}

/** The whole head: far ear, open mouth, jaw, skull, then the near ear, face markings and the eye. */
export function wolfHead(d: Draw): void {
  ears(d, false);
  mouth(d);
  paint(d, JAW, WOLF.cream, { shadow: 0.7, hatch: 0.2, line: 0.6 });
  const head = skull();
  paint(d, head, WOLF.grey, { shadow: 0.55, hatch: 0, line: 0 });
  d.pen.clipped(head, () => {
    // The dark crown and the white of cheek and muzzle, soft-edged as washes.
    dab(d, [pt(30, -50), pt(46, -49), pt(52, -43), pt(46, -43.4), pt(38, -44), pt(30, -42)], WOLF.saddle, 0.5, 1.4);
    dab(d, [pt(54, -38), pt(47, -37.4), pt(42, -38.6), pt(38, -39.5), pt(32, -38), pt(34, -32), pt(44, -33)], WOLF.cream, 0.95, 1.1);
    dab(d, oval(38.6, -42.6, 3.4, 2.2, 14), WOLF.tan, 0.5, 1);
    fur(d, head, { flow: (x) => Math.PI + (x < 40 ? 0.45 : 0.1), count: 70, len: 1.9, width: 0.3, color: WOLF.saddle, alpha: 0.75, seed: SEED + 2, keep: (_, y) => (y < -40 ? 0.9 : 0.3) });
    fur(d, head, { flow: () => Math.PI - 0.3, count: 30, len: 1.6, width: 0.35, color: PAPER_FILL, alpha: 0.7, seed: SEED + 3, keep: (x, y) => (y < -42 && x < 46 ? 0.8 : 0.1) });
    dab(d, [pt(30, -36), pt(40, -33), pt(45, -34), pt(42, -30), pt(30, -30)], SHADOW, 0.25, 1.2);
  });
  locks(d, chain(pt(39, -33.6), [pt(36, -33.4), pt(32, -35), pt(30.6, -38.4)]), { every: 1.8, len: 2.2, rake: pt(-0.6, 0.3), side: 1, width: 0.32, color: WOLF.umber, alpha: 0.8, seed: SEED + 4 });
  d.pen.stroke(closed(head), 0.75, d.ink, 0.95);
  ears(d, true);
  // The nose leather, wet and glossy.
  const nose = [...chain(pt(53, -41.2), [pt(54.6, -41.8), pt(56.4, -40.8), pt(56.2, -39)], [pt(56, -37.8), pt(54.4, -37.8), pt(53.4, -38.6)], [pt(52.8, -39.2), pt(52.6, -40.6), pt(53, -41.2)])];
  paint(d, nose, WOLF.nose, { gloss: true, shadow: 0.4, hatch: 0, line: 0.5 });
  gleam(d, [pt(53.8, -40.9), pt(55, -41)], 0.45, 0.8);
  eye(d);
  // Whisker pores on the muzzle, the lip line and the jaw's edge.
  for (const [x, y] of [[50.6, -39.2], [51.8, -39.6], [50.2, -40.2], [49.2, -39.4]] as const) d.pen.dot(x, y, 0.22, d.ink, 0.7);
  d.pen.stroke([pt(44.5, -35.8), pt(47.5, -37.8), pt(51.5, -37.8), pt(54.2, -36.6)], 0.6, d.ink, 0.95, false);
}
