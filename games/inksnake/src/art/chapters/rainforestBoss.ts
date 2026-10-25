import { createRng } from '../../logic/rng';
import { polar } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { looseFeather, shadowOf, swish } from '../critters/birdKit';
import { type TailSpec, tailShape, talons } from '../critters/birdHawkParts';
import { mapWing, mirrorY, type Wing, wingOutlines } from '../critters/birdWing';
import { type EagleHead, eagleHead, eaglePlumage, eagleTail, perchBranch } from './rainforestBossParts';
import { eagleFlight, foldedEagle, foldedOutlines, paintEagleWing, paintFoldedEagle, type WingShape, WINGS, wingOf } from './rainforestBossWings';

/**
 * The Crested Serpent Eagle, chapter 5's boss, seen from above facing +x
 * (span about 170): broad rounded wings, dark brown with white-pearled
 * coverts and a grey band across the flight feathers, the blackish tail
 * with one broad white band, a black head with its crest always raised in
 * a ruff, yellow bare face, yellow eyes and feet.
 *  - 'perch': sitting up in a tall crown, wings folded, gripping a branch;
 *  - 'soar': wings spread full, tail fanned; 'flap0', 'flap1': the beat;
 *  - 'stoop': the swoop, wings folded back, talons thrust forward;
 *  - 'land': down on a crown after a miss, wings half open (the open moment);
 *  - 'startle': struck, wings flung up, crest up, feathers flying.
 */
type Pose = 'perch' | 'soar' | 'flap0' | 'flap1' | 'stoop' | 'land' | 'startle';

const SEED = 7901;
const SCALE = 1.1;

function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * TAU;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.3 * Math.max(0, -c) ** 1.5));
  });
}

interface Build {
  readonly wing?: WingShape;
  readonly tail: TailSpec;
  readonly body: Pt[];
  readonly head: EagleHead;
  readonly crest: number;
}

const BODY = egg(0, 17, 10.5);
const HEAD: EagleHead = { c: pt(19, 0), r: 7.6 };

const BUILDS: Record<Pose, Build> = {
  perch: { tail: { x: -12, len: 24, half: 6 }, body: egg(0, 16.5, 10.2), head: { c: pt(19.5, 0), r: 7.9 }, crest: 0.8 },
  soar: { wing: WINGS.soar, tail: { x: -12, len: 26, half: 18 }, body: BODY, head: HEAD, crest: 0.5 },
  flap0: { wing: WINGS.down, tail: { x: -12, len: 25, half: 12 }, body: BODY, head: HEAD, crest: 0.5 },
  flap1: { wing: WINGS.up, tail: { x: -12, len: 25, half: 9 }, body: BODY, head: HEAD, crest: 0.5 },
  stoop: { wing: WINGS.stoop, tail: { x: -12, len: 22, half: 4.5 }, body: egg(1, 17.5, 9.5), head: { c: pt(20, 0), r: 6.9 }, crest: 0.3 },
  land: { wing: WINGS.mantle, tail: { x: -12, len: 23, half: 14 }, body: egg(0, 16.5, 11.5), head: { c: pt(19.5, 0), r: 7.2 }, crest: 1 },
  startle: { wing: WINGS.flung, tail: { x: -12, len: 24, half: 20 }, body: egg(-1, 16.5, 11.5), head: { c: pt(18, 0), r: 7.6 }, crest: 1.5 },
};

function wingsOf(b: Build): Wing[] {
  if (!b.wing) return [];
  const right = wingOf(b.wing);
  return [right, mapWing(right, mirrorY)];
}

/** Speed in the swoop: swept strokes off the wingtips and tail. */
function swoopLines(d: Draw, wings: readonly Wing[]): void {
  for (const [i, s] of [[0, 1], [1, -1]] as const) {
    const tip = wings[i]!.feathers[0]!.f.at(1, 0);
    swish(d, pt(tip.x - 4, tip.y + s * 2), Math.PI, 20, s * 1.5, 0.6);
    swish(d, pt(tip.x + 6, tip.y + s * 6), Math.PI, 15, s, 0.45);
  }
  swish(d, pt(-38, 0), Math.PI, 14, 0, 0.5);
}

/** Struck: loose feathers flying off and a few shock marks round it. */
function knocked(d: Draw): void {
  for (const [x, y, a, l] of [[-6, -30, -0.6, 9], [4, 32, 2.4, 8], [-24, 22, 1.2, 7], [16, -26, -2.2, 6.5]] as const) {
    looseFeather(d, pt(x, y), a, l, (f, w) => eagleFlight(d, f, w, false, 0.4));
  }
  for (const a of [-0.5, 0, 0.5]) {
    const p = polar(pt(30, 0), a, 9);
    d.pen.hair([p, polar(p, a, 5)], 0.9, d.ink, 0.8);
  }
}

function draw(d: Draw, pose: Pose): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(SCALE * (pose === 'perch' ? 1.12 : 1), SCALE * (pose === 'perch' ? 1.12 : 1));
  const rng = createRng(SEED);
  const b = BUILDS[pose];
  const wings = wingsOf(b);
  const folded = pose === 'perch' ? [foldedEagle(1, 0), foldedEagle(-1, 0)] : [];
  const grounded = pose === 'perch' || pose === 'land';
  if (grounded) shadowOf(d, [b.body, tailShape(b.tail), ...wings.flatMap(wingOutlines), ...folded.flatMap(foldedOutlines)], 3, 0.16);
  if (pose === 'perch') {
    perchBranch(d, 8, 30);
    talons(d, pt(9, 5), 0.1, 1);
    talons(d, pt(9, -5), -0.1, -1);
  }
  // Landed: the feet under the breast, only the toes peeping out.
  if (pose === 'land') {
    talons(d, pt(11, 6.5), 0.3, 1);
    talons(d, pt(11, -6.5), -0.3, -1);
  }
  if (pose === 'stoop') swoopLines(d, wings);
  eagleTail(d, b.tail);
  for (const w of wings) paintEagleWing(d, w, rng);
  eaglePlumage(d, b.body, rng, { n: 95, size: 4.4, spots: 0.1, line: 1 });
  for (const w of folded) paintFoldedEagle(d, rng, w);
  if (pose === 'stoop') {
    talons(d, pt(27, 8), 0.25, 1);
    talons(d, pt(27, -8), -0.25, -1);
  }
  eagleHead(d, rng, b.head, b.crest, pose === 'land' || pose === 'stoop' ? 1 : 0);
  if (pose === 'startle') knocked(d);
  ctx.restore();
}

export const EAGLE_ART: SpriteArt<Pose> | undefined = {
  frame: 190,
  res: 2,
  poses: ['perch', 'soar', 'flap0', 'flap1', 'stoop', 'land', 'startle'],
  draw,
};
