import type { Rng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Blade, boxOf, coat, glaze, model, petalBlade, rimLight, vane } from '../critters/birdKit';

/**
 * The Secretary Bird's paint: soft pale ash-grey upperparts, every small
 * feather edged paler, the flight feathers and rump black, the long tail
 * grey with a black band and white tips, black thighs ("trousers"), bare
 * pink-orange legs, an orange face and a long black crest of quills.
 * Board px, facing +x, light from the upper left.
 */
export const SEC = {
  grey: '#b4b6b2',
  pale: '#dcddd7',
  mid: '#9a9c99',
  deep: '#5f6262',
  shadow: '#3c3f42',
  black: '#1c1b1e',
  ink: '#0c0b0d',
  sheen: '#5a6070',
  white: '#f3f1ea',
  face: '#e2782f',
  faceDeep: '#b24f1c',
  bill: '#9aa0a8',
  billDark: '#3b3e44',
  leg: '#e4a184',
  legDeep: '#b06a52',
  claw: '#2b2523',
  eye: '#6b4a24',
} as const;

const S = SEC;

/** One flight feather: black, a faint cool sheen, a fine pale shaft. */
export function blackFeather(d: Draw, f: Blade, w: number, line = 0.5): void {
  vane(d, f, w, {
    base: S.black, alpha: 0.96, deep: S.ink,
    glazes: [S.sheen, S.deep], glazeAlpha: 0.22,
    shaft: S.mid, barbs: S.deep, barbAlpha: 0.25, lit: S.mid, line, lineAlpha: 0.8,
  });
}

/** A tail feather: grey, a black band near the end, the tip white. */
export function tailFeather(d: Draw, f: Blade, w: number): void {
  vane(d, f, w, {
    base: S.grey, alpha: 0.92, deep: S.deep,
    glazes: [S.mid, S.pale], glazeAlpha: 0.3,
    bars: 0, tip: S.black, tipFrom: 0.72, tipAlpha: 0.9,
    shaft: S.deep, barbs: S.deep, barbAlpha: 0.2, lit: S.pale, line: 0.5, lineAlpha: 0.75,
  });
  d.pen.clipped(f.shape, () => d.pen.fill([f.at(0.9, -w), f.at(0.9, w), f.at(1.2, w), f.at(1.2, -w)], S.white, 0.95));
}

/** A small grey body feather: a soft tone, a paler edge at its tip, a fine dark line under it. */
function smallFeather(d: Draw, f: Blade, s: number, r: number, dark: boolean): void {
  const { pen } = d;
  const tone = dark ? (r < 0.6 ? S.black : S.shadow) : r < 0.2 ? S.mid : r < 0.85 ? S.grey : S.pale;
  pen.fill(f.shape, tone, dark ? 0.6 : 0.25);
  pen.hair(f.shape.slice(4, 12), Math.max(0.35, s * 0.12), dark ? S.deep : S.white, dark ? 0.45 : 0.6);
  pen.hair(f.shape.slice(3, 14), 0.28, S.deep, 0.35);
}

/** Grey plumage over a shape: wash, a coat of pale-edged feathers (`dark(p)` makes them black), volume, contour. */
export function greyPlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; dir?: (p: Pt) => number; dark?: (p: Pt) => boolean; base?: string; line?: number; ruffle?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  const base = o.base ?? S.grey;
  pen.fill(shape, base, 0.92);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx - b.rx * 0.25, b.cy - b.ry * 0.3, b.rx * 0.6, b.ry * 0.45, 0, o.base ? S.sheen : S.pale, 0.55);
    glaze(d, b.cx + b.rx * 0.2, b.cy + b.ry * 0.3, b.rx * 0.6, b.ry * 0.5, 0, o.base ? S.ink : S.mid, 0.4);
  });
  coat(d, shape, rng, {
    dir: o.dir ?? (() => Math.PI), n: o.n, size: o.size, ruffle: o.ruffle,
    paint: ({ f, s, r }) => smallFeather(d, f, s, r, o.dark ? o.dark(f.at(0.4, 0)) : false),
  });
  model(d, shape, Math.max(3, Math.min(b.rx, b.ry) * 0.42), S.shadow, { shade: 0.3, hatch: 0.22, lit: 0.12, line: 0 });
  rimLight(d, shape, S.white, 0.9, 0.4);
  pen.stroke(closed(shape), o.line ?? 1.1, d.ink, 1);
}

/**
 * The tail: long and graduated, the two middle feathers far the longest,
 * fanned by `spread` (radians) from its root at x, its length `len`.
 */
export function paintTail(d: Draw, x: number, len: number, spread: number): Pt[][] {
  const n = 8;
  const blades: Blade[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5;
    const l = len * (0.55 - Math.abs(u) * 0.35);
    blades.push(petalBlade(pt(x, u * 6), Math.PI + u * spread, l, 5.4));
  }
  // The outer feathers first, the middle ones over them, then the two long central streamers.
  const order = [0, 7, 1, 6, 2, 5, 3, 4];
  for (const i of order) tailFeather(d, blades[i]!, 5.4);
  const streamers = [-1, 1].map((s) => petalBlade(pt(x, s * 0.9), Math.PI + s * spread * 0.05, len, 4.4, s * 0.01));
  for (const f of streamers) tailFeather(d, f, 4.4);
  return [...blades, ...streamers].map((b) => b.shape);
}

/** The black rump over the tail's root. */
export function rump(d: Draw, x: number, rng: Rng): void {
  const shape = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    return pt(x - 3 + Math.cos(a) * 8, Math.sin(a) * 7.5);
  });
  greyPlumage(d, shape, rng, { n: 18, size: 4, dark: () => true, base: S.black, line: 0.8 });
}

/** `colour` lifted towards paper by t. */
export const lit = (colour: string, t: number): string => mix(colour, PAPER_FILL, t);
