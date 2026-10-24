import { createRng, type Rng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { castShadow, ellipseAt, glaze } from '../propsKit';
import { mix } from '../wash';
import { SCARE } from './scarecrowHat';

/**
 * One of the Scarecrow's arms, from under its hat out along +x: an old
 * sun-faded blue shirt sleeve hung over a wooden crossbar, draped in folds
 * either side of the bar, patched, holed and stitched, gathered with twine
 * at the cuff where straw bursts out round the bar's sawn end. About 24
 * across from x ≈ 16 to the cuff at 80; straw to x ≈ 89.
 */
const CUFF = 80;
const START = 16;

/** Half-width of the sleeve at x: full at the shoulder, slimmer mid-arm, a little puffed before the twine. */
function half(x: number): number {
  const u = (x - START) / (CUFF - START);
  return 12.4 - 1.4 * Math.sin(Math.PI * Math.min(1, u * 1.15)) - (u > 0.9 ? (u - 0.9) * 14 : 0);
}

/** The sleeve's outline: hems that sag a little between the folds, a ragged cuff. */
function outline(rng: Rng): Pt[] {
  const n = 28;
  const xs = Array.from({ length: n + 1 }, (_, i) => START + ((CUFF - START) * i) / n);
  const top = xs.map((x) => pt(x, -half(x) + 0.5 * Math.sin(x * 0.42)));
  const bot = xs.map((x) => pt(x, half(x) + 0.6 * Math.sin(x * 0.37 + 1)));
  const end = Array.from({ length: 9 }, (_, i) => {
    const y = -half(CUFF) + (2 * half(CUFF) * (i + 1)) / 10;
    return pt(CUFF + (i % 2 === 0 ? 1.6 : -0.4) + rng() * 0.6, y);
  });
  return [...top, ...end, ...[...bot].reverse()];
}

/** Straw bursting from the cuff, fanned round the bar; `front` draws the ones lying over it. */
function straw(d: Draw, front: boolean): void {
  const { pen } = d;
  const rng = createRng(SCARE.seed + (front ? 31 : 37));
  const count = front ? 14 : 34;
  for (let k = 0; k < count; k++) {
    const y0 = (rng() - 0.5) * (front ? 11 : 17);
    const a = y0 * 0.09 + (rng() - 0.5) * 0.8;
    const len = 6 + rng() * 5;
    const a0 = pt(CUFF - 2, y0);
    const reach = Math.min(len, (87 - a0.x) / Math.max(0.3, Math.cos(a)));
    const b = pt(a0.x + Math.cos(a) * reach, a0.y + Math.sin(a) * reach);
    const mid = pt((a0.x + b.x) / 2, (a0.y + b.y) / 2 + (rng() - 0.5) * 0.8);
    if (!front) pen.hair([a0, mid, b].map((p) => pt(p.x + 1.6, p.y + 3.6)), 1.1, d.ink, 0.1);
    if (k % 3 === 0) pen.hair([a0, mid, b], 1.6, d.ink, 0.7);
    pen.hair([a0, mid, b], 1.15, k % 4 === 1 ? SCARE.strawDeep : SCARE.straw, 1);
    if (k % 2 === 0) pen.hair([a0, mid], 0.45, PAPER_FILL, 0.55);
  }
}

/** The crossbar's sawn end poking out of the cuff: weathered wood, end grain rings. */
function barEnd(d: Draw): void {
  const { pen } = d;
  const bar = [pt(CUFF - 3, -3.2), pt(CUFF + 4.5, -3), pt(CUFF + 4.8, 3.1), pt(CUFF - 3, 3.2)];
  pen.fill(bar, PAPER_FILL, 1);
  pen.fill(bar, SCARE.wood, 0.9);
  pen.clipped(bar, () => {
    for (const y of [-1.6, 0.2, 1.8]) pen.hair([pt(CUFF - 3, y), pt(CUFF + 4.6, y + 0.2)], 0.3, mix(SCARE.wood, '#2a1c10', 0.5), 0.7);
    pen.fill([pt(CUFF - 3, 1.2), pt(CUFF + 5, 1.4), pt(CUFF + 5, 3.3), pt(CUFF - 3, 3.3)], '#2a1c10', 0.25);
  });
  pen.hair(closed(bar), 0.7, d.ink, 0.9);
  pen.hair([pt(CUFF + 4.6, -1.2), pt(CUFF + 4.7, 1.2)], 0.35, '#2a1c10', 0.6);
}

/** Folds of cloth hanging from the bar to either hem: a dark crease with a lit ridge beside it. */
function folds(d: Draw): void {
  const { pen } = d;
  const deep = mix(SCARE.shirt, SCARE.shirtDeep, 0.6);
  for (const [x, s, k] of [[30, 1, 1], [37, -1, 0.8], [47, 1, 1.1], [60, -1, 0.9], [66, 1, 1], [72, -1, 0.7]] as const) {
    const root = pt(x, s * 1.6);
    const end = pt(x + 4 * k, s * (half(x) - 0.3));
    const mid = pt(x + 1.2 * k, s * (half(x) * 0.55));
    pen.hair([root, mid, end], 0.55, deep, 0.7);
    pen.hair([pt(root.x - 1.6, root.y), pt(mid.x - 1.5, mid.y), pt(end.x - 1.8, end.y)], 1.1, SCARE.shirtPale, 0.45);
  }
}

/** A square patch of faded check sewn on with big cross stitches. */
function patch(d: Draw): void {
  const { pen } = d;
  const p = [pt(43, -9.6), pt(55.5, -10.4), pt(56.4, -0.6), pt(43.6, 0.4)];
  pen.fill(p, PAPER_FILL, 1);
  pen.fill(p, '#c08a52', 0.85);
  pen.clipped(p, () => {
    for (let x = 44; x < 57; x += 2.6) pen.fill([pt(x, -11), pt(x + 1.2, -11), pt(x + 1.3, 1), pt(x + 0.1, 1)], '#a2483a', 0.35);
    for (let y = -9.5; y < 1; y += 2.6) pen.fill([pt(42, y), pt(58, y - 0.6), pt(58, y + 0.6), pt(42, y + 1.2)], '#a2483a', 0.3);
    pen.crescent(p, pt(-1, -1.2), () => pen.fill(p, SCARE.shirtDeep, 0.3));
  });
  pen.hair(closed(p), 0.65, d.ink, 0.88);
  // Cross stitches all round, in pale thread.
  for (let i = 0; i < 4; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % 4]!;
    for (let t = 0.12; t < 0.95; t += 0.16) {
      const m = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      pen.hair([pt(m.x - 0.7, m.y - 0.7), pt(m.x + 0.7, m.y + 0.7)], 0.32, '#f2e4c4', 0.95);
      pen.hair([pt(m.x - 0.7, m.y + 0.7), pt(m.x + 0.7, m.y - 0.7)], 0.32, '#f2e4c4', 0.95);
    }
  }
}

/** A torn hole with straw poking out of it. */
function hole(d: Draw): void {
  const { pen } = d;
  const h = ellipseAt(63, 5.6, 2.6, 1.7, 0.3, 12);
  pen.fill(h, '#3a2c18', 0.85);
  for (const a of [-0.4, 0.2, 0.7]) pen.hair([pt(63, 5.6), pt(63 + Math.cos(a) * 4.2, 5.6 + Math.sin(a) * 3.2)], 0.9, SCARE.straw, 1);
  pen.hair(closed(h), 0.5, d.ink, 0.85);
  for (const a of [0.8, 2.4, 3.9, 5.3]) pen.hair([pt(63 + Math.cos(a) * 2.4, 5.6 + Math.sin(a) * 1.6), pt(63 + Math.cos(a) * 3.4, 5.6 + Math.sin(a) * 2.3)], 0.35, d.ink, 0.6);
}

export function paintSleeve(d: Draw): void {
  const { pen } = d;
  const rng = createRng(SCARE.seed + 5);
  const shape = outline(rng);
  castShadow(d, shape, pt(3, 4.6), 0.18);
  straw(d, false);
  barEnd(d);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SCARE.shirt, 0.85);
  pen.clipped(shape, () => {
    // Sun-bleached along the top of the bar, the cloth falling into shade either side and deepest below.
    glaze(d, 48, -1.5, 34, 5, 0, SCARE.shirtPale, 0.6);
    glaze(d, 36, -6, 10, 4, 0.1, SCARE.shirtPale, 0.4);
    pen.crescent(shape, pt(0, -5), () => pen.fill(shape, SCARE.shirtDeep, 0.38));
    pen.crescent(shape, pt(0, 3.5), () => pen.fill(shape, SCARE.shirtDeep, 0.15));
    for (let y = -11; y < 12; y += 1.7) pen.hair([pt(START, y), pt(CUFF, y + 0.3)], 0.22, SCARE.shirtDeep, 0.18);
    folds(d);
    // The cuff: doubled cloth, a button, the seam's running stitch along the hem.
    pen.fill([pt(73, -14), pt(CUFF + 3, -14), pt(CUFF + 3, 14), pt(73.6, 14)], SCARE.shirtDeep, 0.18);
    pen.hair([pt(73.2, -12), pt(73.8, 0), pt(73.4, 12)], 0.5, SCARE.shirtDeep, 0.75);
    for (let x = 20; x < 72; x += 2.6) pen.hair([pt(x, half(x) - 1.9), pt(x + 1.3, half(x + 1.3) - 1.9)], 0.35, '#e8dcc0', 0.75);
    pen.stipple(shape, 160, () => 0.6, 0.28, SCARE.shirtDeep);
  });
  patch(d);
  hole(d);
  pen.dot(76.6, 6.4, 1.3, '#e8dcc0', 0.95);
  pen.dot(76.3, 6.1, 0.3, d.ink, 0.8);
  pen.dot(77, 6.7, 0.3, d.ink, 0.8);
  pen.stroke(closed(shape), 1, d.ink, 0.92);
  // Twine tied round the cuff, its loose ends.
  for (const dx of [0, 1.3]) pen.stroke([pt(77.6 + dx, -half(77.6) - 0.4), pt(78 + dx, 0), pt(77.8 + dx, half(77.6) + 0.4)], 0.9, '#8a6a3a', 0.95, false);
  pen.hair([pt(78.6, half(77.6)), pt(77, half(77.6) + 3.4)], 0.6, '#8a6a3a', 0.9);
  pen.hair([pt(78.8, half(77.6)), pt(80.6, half(77.6) + 3)], 0.6, '#8a6a3a', 0.9);
  straw(d, true);
}
