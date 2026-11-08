import { type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { glaze } from '../critters/preyKit';
import { softShadow } from './barrensCrittersBeast';
import { type BadgerPose, type Build, BUILDS, legsOf, paintCoat, paintLeg, paintTail, trunkOf } from './heathBossBody';
import { BADGER as B, badgerHead, paintBadgerHead } from './heathBossHead';
import { clods, HOLE, jolts, rush, sett, sniffs } from './heathBossSett';

/**
 * The Badger, chapter 8's boss, seen from above facing +x: the broad grey
 * grizzled digger with the black-and-white striped face. It bursts up out
 * of its sett, head and shoulders out and soil flying ('emerge'), lunges
 * with its jaws open and forepaws out ('lunge'), snuffles about nose down,
 * swinging its head side to side ('sniff0', 'sniff1'), flinches back with
 * its coat on end when struck ('startle'), and dives head first back down
 * the hole, rump and kicking hind legs last ('dive'). In 'emerge' the
 * frame's centre is the sett's mouth; in 'dive' the hole lies just ahead.
 */
const FRAME = 160;
const NECK = pt(16, 0);
const PI = Math.PI;

/** The head, swung round the neck. */
function head(d: Draw, b: Build): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(NECK.x, NECK.y);
  ctx.rotate(b.turn);
  ctx.translate(-NECK.x, -NECK.y);
  paintBadgerHead(d, b.head);
  if (b.turn !== 0) sniffs(d, pt(b.head.C.x + b.head.R + b.head.snout, b.head.C.y), Math.sign(b.turn));
  ctx.restore();
}

/** Out in the open: the whole badger. */
function whole(d: Draw, pose: BadgerPose): void {
  const b = BUILDS[pose];
  const trunk = trunkOf(b);
  const legs = legsOf(b);
  const h = badgerHead(b.head.C, b.head.R, b.head.snout);
  softShadow(d, [trunk, h, ...legs.map((l) => l.limb)], pt(2.6, 3.8), 0.18, 1.5);
  if (pose === 'lunge') rush(d);
  paintTail(d, b.tail);
  legs.forEach((l, i) => paintLeg(d, l, i));
  legs.forEach((l) => d.pen.clipped(l.limb, () => d.pen.fill(trunk.map((q) => pt(q.x + 1.4, q.y + 2.2)), B.black, 0.35)));
  paintCoat(d, b, trunk);
  d.pen.clipped(trunk, () => d.pen.fill(h.map((q) => pt(q.x + 1.4, q.y + 2.2)), B.greyDeep, 0.35));
  head(d, b);
  if (pose === 'startle') jolts(d);
}

/** Everything outside an ellipse's `side` half (−1 behind, +1 ahead) plus the ellipse: where the body shows round a hole. */
function showing(c: Pt, side: 1 | -1): Pt[] {
  const arc = Array.from({ length: 17 }, (_, i) => {
    const a = side < 0 ? -PI / 2 - (i / 16) * PI : -PI / 2 + (i / 16) * PI;
    return pt(c.x + Math.cos(a) * HOLE.rx * 0.96, c.y + Math.sin(a) * HOLE.ry * 0.96);
  });
  const far = -side * 90;
  return [...arc, pt(c.x, 90), pt(c.x + far, 90), pt(c.x + far, -90), pt(c.x, -90)];
}

/** Bursting up: the sett at the centre, head, shoulders and forepaws out over its lip, soil flying. */
function emerge(d: Draw): void {
  const b = BUILDS.emerge;
  const { pen } = d;
  const { ctx } = pen;
  const mouth = pt(0, 0);
  sett(d, mouth, 9601);
  const show = showing(mouth, -1);
  const SHIFT = 1;
  pen.clipped(show, () => {
    ctx.translate(SHIFT, 0);
    const trunk = trunkOf(b);
    const legs = legsOf(b).slice(0, 2);
    softShadow(d, [badgerHead(b.head.C, b.head.R, b.head.snout), ...legs.map((l) => l.limb)], pt(2.6, 3.8), 0.18, 1.5);
    legs.forEach((l, i) => paintLeg(d, l, i));
    paintCoat(d, b, trunk);
    // Going down into the dark of the hole behind the shoulders.
    pen.clipped(trunk, () => {
      glaze(d, -SHIFT - 6, 0, 18, 22, 0, B.hole, 0.95);
      glaze(d, -SHIFT - 14, 0, 14, 22, 0, B.hole, 1);
    });
    head(d, b);
    ctx.translate(-SHIFT, 0);
  });
  clods(d, mouth, HOLE.rx + 3, HOLE.rx + 24, PI * 0.42, PI * 1.58, 16, 9602);
}

/** Going down head first: the hole just ahead, the rump and scrabbling hind legs last, soil kicked back. */
function dive(d: Draw): void {
  const b = BUILDS.dive;
  const { pen } = d;
  const { ctx } = pen;
  const mouth = pt(18, 0);
  sett(d, mouth, 9611);
  const show = showing(mouth, 1);
  const SHIFT = 6;
  pen.clipped(show, () => {
    ctx.translate(SHIFT, 0);
    const trunk = trunkOf(b);
    const legs = legsOf(b).slice(2);
    softShadow(d, [trunk.filter((p) => p.x < 12), ...legs.map((l) => l.limb)], pt(2.6, 3.8), 0.16, 1.5);
    paintTail(d, b.tail);
    legs.forEach((l, i) => paintLeg(d, l, i + 2));
    paintCoat(d, b, trunk);
    pen.clipped(trunk, () => {
      glaze(d, mouth.x - SHIFT + 4, 0, 16, 22, 0, B.hole, 1);
      glaze(d, mouth.x - SHIFT - 6, 0, 10, 20, 0, B.hole, 0.6);
    });
    ctx.translate(-SHIFT, 0);
  });
  clods(d, pt(-36, 0), 10, 30, PI * 0.72, PI * 1.28, 12, 9612);
}

function draw(d: Draw, pose: BadgerPose): void {
  if (pose === 'emerge') emerge(d);
  else if (pose === 'dive') dive(d);
  else whole(d, pose);
}

const ART: SpriteArt<BadgerPose> = { frame: FRAME, res: 2, poses: ['emerge', 'lunge', 'sniff0', 'sniff1', 'startle', 'dive'], draw };

/** The Badger, chapter 8's boss (poses as listed in heath.ts). */
export const BADGER_ART: SpriteArt | undefined = ART;
