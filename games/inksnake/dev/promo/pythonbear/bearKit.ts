import { createRng } from '../../../src/logic/rng';
import { furEdge, glaze, hairs, type Coat } from '../../../src/art/critters/preyKit';
import { cub, type Draw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';

/**
 * The sun bear's paint box and brushwork, shared by the standing bear
 * (bearStand.ts) and the rump in the python's jaws (bearRump.ts): a short,
 * glossy black coat lit cool from the upper left, the pale muzzle, the
 * cream-to-gold chest crescent, bare pale soles and long pale claws.
 */
export const BEAR = {
  black: '#19181c', coal: '#26242a', sheen: '#6f7787', sheenHi: '#a9b2c2', brown: '#3a2c24',
  muzzle: '#d7b48a', muzzleDeep: '#a07850', crescent: '#f0cf86', crescentDeep: '#d59a48',
  sole: '#b59a86', soleDeep: '#7e6656', claw: '#e2d8c0', clawDeep: '#9c9078', nose: '#0e0d10', line: '#0d0c10',
} as const;

/** The coat: lying down and back over the body; mostly black, a few cool-grey hairs catching the light. */
export const coatLying = (dir: (p: Pt) => number): Coat => ({
  dir,
  color: (_p, r) => (r < 0.62 ? BEAR.black : r < 0.88 ? BEAR.coal : BEAR.sheen),
});

/** Black fur: the ground, the sheen where the light falls, deeper black away from it, hairs and a soft furry edge. */
export function paintFur(d: Draw, shape: readonly Pt[], o: {
  readonly lights: readonly (readonly [number, number, number, number, number])[];
  readonly dir: (p: Pt) => number;
  readonly hairs: number;
  readonly len: number;
  readonly seed: number;
  readonly line?: number;
}): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BEAR.black, 1);
  pen.clipped(shape, () => {
    for (const [x, y, rx, ry, rot] of o.lights) {
      glaze(d, x, y, rx, ry, rot, BEAR.coal, 1);
      glaze(d, x - rx * 0.1, y - ry * 0.15, rx * 0.7, ry * 0.55, rot, BEAR.sheen, 0.55);
      glaze(d, x - rx * 0.18, y - ry * 0.25, rx * 0.35, ry * 0.25, rot, BEAR.sheenHi, 0.35);
    }
  });
  hairs(d, shape, coatLying(o.dir), o.hairs, o.seed, o.len, 0.5, 0.75);
  hairs(d, shape, { dir: o.dir, color: () => BEAR.sheenHi }, Math.round(o.hairs * 0.08), o.seed + 5, o.len * 1.2, 0.35, 0.4);
  furEdge(d, shape, o.line ?? 1.4, o.seed + 9, 1, 2.2, 0.95);
}

/** Long pale claws curving down from a toe tip `at`, pointing `dir` radians. */
export function claw(d: Draw, at: Pt, dir: number, len: number): void {
  const tip = pt(at.x + Math.cos(dir) * len, at.y + Math.sin(dir) * len);
  const bend = pt(at.x + Math.cos(dir) * len * 0.6 + Math.cos(dir + 1.57) * len * 0.22, at.y + Math.sin(dir) * len * 0.6 + Math.sin(dir + 1.57) * len * 0.22);
  const w = len * 0.17;
  const side = (s: number): Pt => pt(at.x + Math.cos(dir + 1.57) * w * s, at.y + Math.sin(dir + 1.57) * w * s);
  const shape = [...cub(side(1), bend, bend, tip, 6), ...cub(tip, bend, bend, side(-1), 6).slice(1)];
  d.pen.fill(shape, BEAR.claw, 1);
  d.pen.fill(shape.slice(6), BEAR.clawDeep, 0.5);
  d.pen.stroke([...shape, shape[0]!], 0.55, BEAR.line, 0.9, false);
}

/** A few stray guard hairs standing off an edge (a black coat's halo against the light). */
export function strays(d: Draw, edge: readonly Pt[], seed: number, len: number): void {
  const rng = createRng(seed);
  for (let i = 0; i < edge.length; i += 2) {
    const p = edge[i]!;
    const a = rng() * Math.PI * 2;
    d.pen.hair([p, pt(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len)], 0.3, BEAR.sheen, 0.35);
  }
}
