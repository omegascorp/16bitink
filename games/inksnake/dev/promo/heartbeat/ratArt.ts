import { createRng } from '../../../src/logic/rng';
import { ellipseAt, furEdge, beadEye, glaze, hairs, type Coat } from '../../../src/art/critters/preyKit';
import { paintTail, rodentFoot, rodentHand } from '../../../src/art/critters/preyRodentParts';
import type { RodentLook } from '../../../src/art/critters/preyRodent';
import { cub, type Draw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';

/**
 * The game's brown rat (critters/rat.ts) walked round to the camera: the same
 * paint box and shaggy coat, from the side, facing +x, for the close shots.
 * Its eye is open or shut. Art units: nose at x = 72, rump at −70, the tail
 * running back to about −150 (nose to tail root is 142; the story's RAT_LEN
 * is drawn at PER_ART px to the unit).
 */
export const PER_ART = 5.4;
/** The body's origin, world px back from the nose. */
export const ORIGIN_A = 72 * PER_ART;

const LOOK: RodentLook = {
  len: 130, wide: 62,
  fur: '#8a6a4b', warm: '#9c6936', back: '#56402d', pale: '#c2ab8d', deep: '#2f2219',
  pink: '#d99c92', pinkDeep: '#a1625c', tail: '#c7a39a', tailDeep: '#76605b',
  earR: 11, eyeR: 4.8, snout: 1,
  tailLen: 90, tailW: 8, ring: 2.6, ringAlpha: 0.62,
  hairLen: 6, hairN: 3400, guard: 700, tuft: 2.4, line: 1.25, whisker: 26, seed: 6203,
};

const OUTLINE: readonly Pt[] = [
  ...cub(pt(72, 3), pt(66, -6), pt(52, -13), pt(40, -18), 10),
  ...cub(pt(40, -18), pt(26, -25), pt(10, -29), pt(-14, -32), 12).slice(1),
  ...cub(pt(-14, -32), pt(-40, -35), pt(-64, -26), pt(-70, -4), 14).slice(1),
  ...cub(pt(-70, -4), pt(-72, 14), pt(-52, 30), pt(-22, 31), 12).slice(1),
  ...cub(pt(-22, 31), pt(0, 31), pt(18, 26), pt(34, 20), 10).slice(1),
  ...cub(pt(34, 20), pt(48, 15), pt(62, 13), pt(72, 3), 10).slice(1),
];

/** The coat lies back from the nose, combing down over the flanks. */
const COAT: Coat = {
  dir: (p) => Math.PI - 0.012 * p.y,
  color: (p, r) => {
    const up = (p.y + 34) / 66;
    const from = up < 0.45 ? [LOOK.back, LOOK.deep, LOOK.fur] : up < 0.75 ? [LOOK.fur, LOOK.back, LOOK.warm] : [LOOK.pale, LOOK.fur, PAPER_FILL];
    return from[Math.floor(r * 3)]!;
  },
};

function paintCoat(d: Draw): void {
  const { pen } = d;
  pen.fill(OUTLINE, PAPER_FILL, 1);
  pen.fill(OUTLINE, LOOK.pale, 0.95);
  pen.clipped(OUTLINE, () => {
    glaze(d, -14, -16, 62, 22, 0, LOOK.fur, 0.95);
    glaze(d, -18, -22, 50, 12, 0, LOOK.back, 0.8);
    glaze(d, 16, -14, 30, 11, 0.2, LOOK.fur, 0.85);
    glaze(d, -12, -12, 34, 9, 0, LOOK.warm, 0.4);
    glaze(d, 62, 4, 15, 9, 0, '#e4cdb4', 0.7);
    glaze(d, -8, 28, 60, 9, 0, LOOK.deep, 0.42);
  });
  hairs(d, OUTLINE, COAT, LOOK.hairN, LOOK.seed, LOOK.hairLen, 0.42, 0.68);
  hairs(d, OUTLINE, { ...COAT, color: () => LOOK.deep }, LOOK.guard, LOOK.seed + 7, LOOK.hairLen * 1.6, 0.38, 0.5);
  pen.clipped(OUTLINE, () => glaze(d, -6, -24, 38, 6, 0, PAPER_FILL, 0.22));
  furEdge(d, OUTLINE, LOOK.line, LOOK.seed + 3, 1, LOOK.tuft, 0.9);
}

function ear(d: Draw): void {
  const { pen } = d;
  const c = pt(23, -24);
  const outer = ellipseAt(c.x, c.y, 12, 14, -0.3, 26);
  const inner = ellipseAt(c.x + 1, c.y + 1, 8.2, 10, -0.3, 22);
  pen.fill(outer, LOOK.fur, 1);
  pen.fill(inner, LOOK.pink, 0.95);
  pen.clipped(inner, () => glaze(d, c.x + 3, c.y + 5, 8, 9, 0, LOOK.pinkDeep, 0.8));
  pen.stroke([...outer, outer[0]!], 1, d.ink, 0.95, false);
}

function whiskers(d: Draw): void {
  const rng = createRng(6281);
  for (let i = 0; i < 9; i++) {
    const a = pt(60 + rng() * 6, 2 + rng() * 6);
    const b = pt(a.x + 8 + rng() * 14, a.y + 8 + i * 3);
    const c = pt(a.x - 2 + rng() * 22, a.y + 16 + i * 5.2);
    d.pen.hair(cub(a, pt(a.x + 6, a.y + 2), b, c, 8), 0.34, '#f4ead6', 0.85);
  }
}

function face(d: Draw, shut: boolean): void {
  const { pen } = d;
  glaze(d, 44, -8, 9, 7, 0, LOOK.deep, 0.4);
  if (shut) pen.stroke(cub(pt(39, -8), pt(42, -5.4), pt(47, -5.4), pt(50, -8), 10), 1.1, LOOK.deep, 1, false);
  else beadEye(d, pt(44.5, -8), LOOK.eyeR);
  const nose = ellipseAt(70.5, 2.6, 3.2, 2.6, 0.3, 14);
  pen.fill(nose, LOOK.pink, 1);
  pen.clipped(nose, () => glaze(d, 71, 4, 3, 2, 0, LOOK.pinkDeep, 0.8));
  pen.stroke([...nose, nose[0]!], 0.6, d.ink, 0.9, false);
  pen.hair(cub(pt(68, 6), pt(65, 9.6), pt(61, 9.4), pt(58, 8), 8), 0.6, LOOK.deep, 0.8);
}

function drawRat(d: Draw, pose: 'open' | 'shut'): void {
  paintTail(d, LOOK, cub(pt(-66, 8), pt(-98, 26), pt(-112, -6), pt(-146, 8), 30));
  rodentFoot(d, LOOK, pt(-44, 28), 1, 0.15);
  paintCoat(d);
  ear(d);
  rodentHand(d, LOOK, pt(26, 24), 1, 0.35);
  face(d, pose === 'shut');
  whiskers(d);
}

export const RAT_SIDE: SpriteArt<'open' | 'shut'> = { frame: 320, res: 6, poses: ['open', 'shut'], draw: drawRat };
