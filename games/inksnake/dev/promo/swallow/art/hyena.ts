import { cub, type Draw, pt } from '../../../../src/art/kit';
import type { Pt } from '../../../../src/art/pen';
import type { SpriteArt } from '../../../../src/art/types';
import { mix } from '../../../../src/art/wash';
import { glaze } from '../../../../src/art/critters/preyKit';
import { tube } from '../../../../src/art/critters/tomcatParts';
import { clumps, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, softShadow, trunkShape } from '../../../../src/art/chapters/barrensCrittersBeast';
import { HY, type HyenaHead, hyenaHeadShape, inSpot, paintHyenaHead, paintTail, paw, scatter, type Spot, spotted, washSpots } from './hyenaParts';
import type { MealArt } from './index';

/**
 * The spotted hyena from above, 'limp' (see index.ts): a heavy, sloping
 * build about 100 from nose to rump, the thick neck and big shoulders
 * running back to smaller hindquarters, a sandy-grey to tawny coat covered
 * in soft dark-brown spots, darker down the spine, a short bristly mane on
 * the neck, the big blunt head with its dark face, eyes shut and round ears
 * laid flat. Stretched straight out: forelegs folded back along the chest,
 * hind legs trailing back past the rump, the short black-tipped tail lying
 * between them.
 */
const K = HY;
const LEN = 100;

/** The trunk's half width from the throat back to the rump: thick neck, big shoulders, a sloping, narrower back end. */
const TRUNK: readonly (readonly [number, number])[] = [[30, 7], [23, 9.2], [14, 14.6], [4, 16.8], [-7, 15.4], [-19, 12.2], [-30, 10.3], [-41, 8.6], [-50, 0]];

/** The half width at x, from the knots (for placing spots). */
function halfAt(x: number): number {
  for (let i = 1; i < TRUNK.length; i++) {
    const [x0, w0] = TRUNK[i - 1]!;
    const [x1, w1] = TRUNK[i]!;
    if (x <= x0 && x >= x1) return w0 + ((w1 - w0) * (x0 - x)) / (x0 - x1);
  }
  return 0;
}

const HEAD: HyenaHead = { C: pt(33, 0), snout: 16.8 };
/** Fore +y, fore −y, hind +y, hind −y: forelegs folded back under the chest, hind legs stretched out behind. */
const FORE: LegKey = leg(pt(8, 10), pt(0, 13.8), pt(-8.5, 15.4));
const HIND: LegKey = leg(pt(-38, 6.8), pt(-52, 9.8), pt(-67, 8.2));
const TAIL: readonly Pt[] = cub(pt(-46, 0), pt(-54, 0.4), pt(-61, -0.5), pt(-71, 0.3), 16);

const coat = (p: Pt, r: number): string => {
  const v = Math.max(0, 1 - Math.abs(p.y) / 9);
  const dark = 0.05 + 0.3 * v;
  return r < dark ? K.saddle : r < dark + 0.22 * (1 - v * 0.6) ? K.light : r < 0.72 ? K.base : r < 0.86 ? K.grey : K.tawny;
};
const PELT: Pelt = { base: K.base, deep: K.deep, light: K.light, hair: coat };
const LEG_PELT: Pelt = { base: mix(K.base, K.light, 0.15), deep: K.deep, light: K.cream, hair: (_p, r) => (r < 0.1 ? K.saddle : r < 0.4 ? K.light : r < 0.85 ? K.base : K.tawny) };

/** The body's spots: dense on the flanks and haunches, smaller and fading forward up the neck, none on the throat. */
const BODY_SPOTS: Spot[] = scatter(7401, 900, 1.5, (rng) => {
  const x = -48 + rng() * 72;
  const h = halfAt(x);
  const y = (rng() * 2 - 1) * h * 0.97;
  const fwd = Math.max(0, Math.min(1, (x - 6) / 18));
  if (rng() < fwd * 0.65) return null;
  const edge = Math.abs(y) / h;
  return { c: pt(x, y), r: (2.1 + rng() * 1.5) * (1 - 0.45 * fwd), squash: Math.sqrt(Math.max(0.2, 1 - edge * edge)), rot: Math.sign(y) * edge * 0.4 };
});

/** A leg's spots along its upper part. */
function legSpots(l: Leg, seed: number, from: number, to: number): Spot[] {
  const n = l.spine.length - 1;
  return scatter(seed, 60, 0.8, (rng) => {
    const t = from + rng() * (to - from);
    const p = l.spine[Math.round(t * n)]!;
    const o = (rng() - 0.5) * 4;
    return { c: pt(p.x + o * 0.3, p.y + o), r: 1.2 + rng() * 0.8, squash: 0.85, rot: l.ang };
  });
}

function paintLeg(d: Draw, l: Leg, k: number): void {
  const spots = legSpots(l, 7420 + k, l.front ? 0.3 : 0.15, l.front ? 0.85 : 0.75);
  paintFur(d, LEG_PELT, {
    shape: l.limb,
    dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x),
    wet: () => {
      washSpots(d, spots, 0.85);
      // The lower leg darkening to the foot.
      const n = l.spine.length - 1;
      for (let i = Math.round(n * 0.7); i <= n; i++) glaze(d, l.spine[i]!.x, l.spine[i]!.y, 3, 2.6, 0, K.saddle, 0.35);
    },
    hair: spotted(spots, LEG_PELT.hair),
    n: l.front ? 220 : 380, len: 2, seed: 7410 + k, tuft: 0.9, line: 0.65,
  });
  paw(d, l, LEG_PELT);
}

/** The coat lies back along the body, splaying out over the flanks. */
const lie = (p: Pt): number => Math.PI + Math.sign(p.y) * Math.min(0.8, Math.abs(p.y) / 22) * (p.x > -36 ? 1 : 1.8);

function paintBody(d: Draw, shape: readonly Pt[]): void {
  paintFur(d, PELT, {
    shape,
    dir: lie,
    wet: () => {
      // Countershading: the spine and neck darker, the flanks paler and warmer.
      glaze(d, -8, 0, 42, 8, 0, K.saddle, 0.6);
      glaze(d, 16, 0, 16, 7, 0, K.saddle, 0.55);
      glaze(d, -10, 0, 34, 3.5, 0, K.deep, 0.3);
      for (const side of [-1, 1]) {
        glaze(d, -10, side * 12.5, 32, 3.4, 0, K.cream, 0.45);
        glaze(d, 6, side * 13.5, 12, 3, 0, K.tawny, 0.4);
        // The big shoulders and the smaller haunches rounding under the coat.
        glaze(d, 6, side * 8 - 1.5, 9, 6.5, side * 0.3, K.light, side < 0 ? 0.4 : 0.16);
        glaze(d, -34, side * 6.5 - 1.2, 8, 5, side * 0.3, K.light, side < 0 ? 0.36 : 0.14);
      }
      washSpots(d, BODY_SPOTS);
    },
    hair: spotted(BODY_SPOTS, coat),
    over: () => clumps(d, shape, lie, 260, 7403, 3.6, K.spot, K.light, (p) => 0.25 + 0.6 * Math.max(inSpot(BODY_SPOTS, p) > 0 ? 1 : 0, 1 - Math.abs(p.y) / 8)),
    n: 3200, len: 3.2, seed: 7402, tuft: 1.2, line: 0.95,
  });
  // Thin interior ink: the shoulder blades and the hips under the skin.
  for (const side of [-1, 1]) {
    d.pen.hair(cub(pt(16, side * 4), pt(11, side * 9), pt(4, side * 11), pt(-3, side * 10.5), 8), 0.4, K.deep, 0.35);
    d.pen.hair(cub(pt(-30, side * 3), pt(-34, side * 7.5), pt(-40, side * 8.4), pt(-45, side * 6.4), 8), 0.4, K.deep, 0.35);
  }
}

/** The short bristly mane along the top of the neck and shoulders: dark, coarse hairs standing a little. */
function mane(d: Draw, trunk: readonly Pt[]): void {
  const { pen } = d;
  pen.clipped(trunk, () => {
    glaze(d, 13, 0, 16, 3.2, 0, K.dark, 0.5);
    for (let i = 0; i < 170; i++) {
      const t = ((i * 37) % 170) / 170;
      const x = 29 - t * 34;
      const y = (((i * 53) % 17) / 17 - 0.5) * (5.6 - t * 2.4);
      const l = 3.4 + ((i * 7) % 5) * 0.5 - t * 1.2;
      const a = Math.PI + Math.sign(y || 1) * (0.25 + ((i * 11) % 4) * 0.08);
      pen.hair([pt(x, y), pt(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 - 0.15), pt(x + Math.cos(a) * l, y + Math.sin(a) * l)], 0.38, i % 4 ? K.dark : K.spot, 0.8);
    }
  });
}

function draw(d: Draw): void {
  const trunk = trunkShape(TRUNK, 0, 0.55);
  const legs = [makeLeg(HIND, 1, false, 11.5, 3.8), makeLeg(HIND, -1, false, 11.5, 3.8), makeLeg(FORE, 1, true, 7, 3.6), makeLeg(FORE, -1, true, 7, 3.6)];
  const head = hyenaHeadShape(HEAD);
  softShadow(d, [tube(TAIL, () => 9), trunk, head, ...legs.map((l) => l.limb)], pt(2.6, 3.8), 0.18, 1.6);
  legs.slice(0, 2).forEach((l, i) => paintLeg(d, l, i));
  paintTail(d, TAIL, PELT);
  legs.slice(2).forEach((l, i) => paintLeg(d, l, i + 2));
  paintBody(d, trunk);
  mane(d, trunk);
  // The head's shadow on the neck.
  d.pen.clipped(trunk, () => d.pen.fill(head.map((q) => pt(q.x + 1.6, q.y + 2.4)), K.deep, 0.35));
  paintHyenaHead(d, HEAD, head);
}

export const HYENA: MealArt = { art: { frame: 160, res: 3, poses: ['limp'] as const, draw: (d) => draw(d) } satisfies SpriteArt<'limp'>, len: LEN, cm: 130 };
