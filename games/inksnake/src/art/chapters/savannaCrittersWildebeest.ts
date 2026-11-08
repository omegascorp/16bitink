import { createRng } from '../../logic/rng';
import { cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze } from '../critters/preyKit';
import { tube } from '../critters/tomcatParts';
import { grizzle, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, softShadow, trunkShape } from './barrensCrittersBeast';
import { GNU, GNU_PELT, neckShape, paintGnuHead, paintNeck, shag } from './savannaCrittersWildebeestHead';

/**
 * The front of a blue wildebeest stampede, seen from above, galloping +x:
 * five of them, three abreast in front and two behind between them, about
 * 96 across, each a heavy-shouldered slate-grey body barred dark over the
 * shoulders, a black mane and beard, cow-like horns, slim legs flung out,
 * a black switch of a tail streaming back; dust kicked up behind them.
 * 'run0' and 'run1' are the two halves of the gallop (each animal is on
 * its own beat, so the herd never moves in step).
 */
type Pose = 'run0' | 'run1';

const G = GNU;
const LEG_PELT: Pelt = { base: G.leg, deep: G.black, light: G.coat, hair: (_p, r) => grizzle(G.black, G.leg, G.coat, G.warm, 0.15)(r) };

/** Half width along the trunk, shoulders (+x) to rump: heavy in front, light behind. */
const TRUNK: readonly (readonly [number, number])[] = [[13, 6.2], [9, 8.2], [4, 8.4], [-2, 7.1], [-8, 6.6], [-13, 7], [-17, 6.2], [-21, 0]];

/** Gathered (legs under) and stretched (legs flung out), for the +y side; the −y legs are a step off. */
const GATHERED = { fore: leg(pt(9, 5), pt(5, 8.5), pt(1, 7.6)), hind: leg(pt(-13, 5), pt(-7, 8.5), pt(-2.5, 7.4)) };
const STRETCHED = { fore: leg(pt(10, 5), pt(17, 8.4), pt(25, 7.2)), hind: leg(pt(-14, 5), pt(-21, 8.4), pt(-30, 6.6)) };

interface Gnu {
  readonly at: Pt;
  readonly k: number;
  /** Which half of the gallop it's in on 'run0'. */
  readonly beat: 0 | 1;
  /** The head's sideways toss. */
  readonly toss: number;
  readonly seed: number;
}

/** Back row first (drawn under the front). */
const HERD: readonly Gnu[] = [
  { at: pt(-30, -15), k: 0.92, beat: 1, toss: -1.5, seed: 9101 },
  { at: pt(-27, 16), k: 0.95, beat: 0, toss: 1.2, seed: 9111 },
  { at: pt(1, -31), k: 0.97, beat: 0, toss: -1, seed: 9121 },
  { at: pt(5, 30), k: 0.98, beat: 1, toss: 1.4, seed: 9131 },
  { at: pt(9, 0), k: 1.03, beat: 1, toss: 0.6, seed: 9141 },
];

function legsOf(stretched: boolean): Leg[] {
  const a = stretched ? STRETCHED : GATHERED;
  const off = (l: LegKey, dx: number): LegKey => leg(pt(l.root.x, l.root.y), pt(l.joint.x + dx, l.joint.y - 0.6), pt(l.paw.x + dx * 1.6, l.paw.y - 1));
  return [
    makeLeg(a.hind, 1, false, 4.6, 1.7), makeLeg(off(a.hind, stretched ? 2.5 : -1.5), -1, false, 4.6, 1.7),
    makeLeg(a.fore, 1, true, 3.8, 1.6), makeLeg(off(a.fore, stretched ? -2.5 : 1.5), -1, true, 3.8, 1.6),
  ];
}

function paintLeg(d: Draw, l: Leg, seed: number): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 60, len: 1.1, seed, tuft: 0.3, line: 0.55 });
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const hoof = ellipseAt(l.c.x + u.x * 0.8, l.c.y + u.y * 0.8, 1.4, 1.1, l.ang, 10);
  d.pen.fill(hoof, G.hoof, 1);
  d.pen.hair([pt(l.c.x + u.x * 1.6, l.c.y + u.y * 1.6 - 0.5), pt(l.c.x + u.x * 1.6, l.c.y + u.y * 1.6 + 0.5)], 0.3, G.hornLit, 0.6);
}

/** The tail: a thin root and a long black switch streaming back, flicked by `flick`. */
function paintTail(d: Draw, x: number, flick: number, seed: number): void {
  const spine = cub(pt(x, 0), pt(x - 4, flick * 0.4), pt(x - 8, flick), pt(x - 13, flick * 1.4), 10);
  d.pen.fill(tube(spine.slice(0, 5), () => 1.6), G.coat, 1);
  const end = spine[spine.length - 1]!;
  shag(d, spine.slice(3), (p) => Math.atan2(end.y - p.y + flick * 0.2, end.x - p.x - 4), 4.2, 40, seed, G.black, 0.5);
}

function paintBody(d: Draw, shape: readonly Pt[], seed: number): void {
  paintFur(d, GNU_PELT, {
    shape,
    dir: (p) => Math.PI + Math.sign(p.y) * Math.min(0.7, Math.abs(p.y) / 14),
    wet: () => {
      glaze(d, -2, 0, 18, 4.5, 0, G.deep, 0.35);
      for (const s of [-1, 1]) glaze(d, -3, s * 7, 14, 2, 0, G.silver, 0.45);
      // The brindle: dark bars down the flanks over the shoulders and fore-body, fading to the rump.
      for (let x = 12; x > -10; x -= 2.4) {
        for (const side of [-1, 1]) {
          const bar = Array.from({ length: 5 }, (_, i) => {
            const y = side * (2.6 + i * 1.6);
            return pt(x - 0.05 * y * y, y);
          });
          d.pen.stroke(bar, 1.1, G.stripe, 0.55 * Math.min(1, (x + 12) / 14), false);
        }
      }
      glaze(d, -14, 0, 6, 5, 0, G.warm, 0.3);
      // The withers' hump and the hip bones catch the light.
      glaze(d, 7, -2, 6, 4, 0, G.silver, 0.45);
      for (const side of [-1, 1]) glaze(d, -14, side * 4.6, 2.6, 1.8, 0, G.silver, side < 0 ? 0.55 : 0.3);
    },
    n: 620, len: 1.6, seed, tuft: 0.6, line: 0.85,
  });
  // The dark line of the spine, from the mane back to the tail.
  d.pen.hair([pt(13, 0), pt(0, 0), pt(-17, 0)], 1.2, G.black, 0.45);
}

function paintGnu(d: Draw, g: Gnu, stretched: boolean): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(g.at.x, g.at.y);
  ctx.scale(g.k, g.k);
  const trunk = trunkShape(TRUNK, 0, 0.4);
  const C = pt(stretched ? 28 : 26, g.toss * 1.6);
  const neck = neckShape(pt(6, 0), C);
  const legs = legsOf(stretched);
  legs.forEach((l, i) => paintLeg(d, l, g.seed + 20 + i));
  paintTail(d, -18, g.toss * -1.6, g.seed + 9);
  // The neck runs forward and down from under the shoulders' hump; the head lies over its end.
  paintNeck(d, neck, g.seed + 30);
  paintBody(d, trunk, g.seed);
  shag(d, neck.spine.slice(0, 4).map((p) => pt(p.x + 4, p.y)), () => Math.PI, 2.4, 24, g.seed + 50, G.black, 0.5);
  paintGnuHead(d, C, g.seed + 40);
  ctx.restore();
}

/** Dust kicked up behind the herd: soft buff clouds, a few clods and pen swirls. */
function dust(d: Draw, f: number): void {
  const rng = createRng(9301 + f);
  for (const [x, y, r] of [[-62, -24, 14], [-60, 6, 16], [-56, 32, 12], [-34, -40, 10], [-30, 42, 10], [-48, -6, 12]] as const) {
    glaze(d, x, y, r, r * 0.75, 0.2, G.dust, 0.55);
    glaze(d, x + r * 0.2, y + r * 0.25, r * 0.6, r * 0.45, 0.2, G.dustDeep, 0.25);
    const swirl = Array.from({ length: 8 }, (_, i) => {
      const a = i * 0.7 + rng();
      return pt(x + Math.cos(a) * r * (0.3 + i * 0.07), y + Math.sin(a) * r * 0.5 * (0.3 + i * 0.07));
    });
    d.pen.hair(swirl, 0.4, G.dustDeep, 0.5);
  }
  for (let i = 0; i < 22; i++) d.pen.dot(-66 + rng() * 40, (rng() - 0.5) * 90, 0.4 + rng() * 0.6, G.dustDeep, 0.7);
}

function draw(d: Draw, pose: Pose): void {
  const beat = pose === 'run0' ? 0 : 1;
  dust(d, beat);
  const shapes = HERD.map((g) => trunkShape(TRUNK, 0, 0).map((p) => pt(g.at.x + p.x * g.k, g.at.y + p.y * g.k)));
  softShadow(d, shapes, pt(3, 5), 0.18, 2);
  for (const g of HERD) paintGnu(d, g, g.beat !== beat);
  // A last veil of dust over the back row's heels.
  for (const [x, y] of [[-50, -14], [-46, 18]] as const) glaze(d, x, y, 9, 6, 0, G.dust, 0.35);
}

export const WILDEBEEST_ART: SpriteArt<Pose> = { frame: 140, res: 2, poses: ['run0', 'run1'], draw };
