import { createRng } from '../../logic/rng';
import { polar } from '../groundKit';
import { type Draw, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, shadowOf } from '../critters/birdKit';
import { jolts, leg, legWheel, skidMarks, skidSpray, speed, tailShadow } from './dunesBossFx';
import { paintHead, paintNeck } from './dunesBossHead';
import { paintTail, plumage, wingsOf } from './dunesBossPaint';
import { runner, RUNNER_POSES, type Runner, type RunnerPose } from './dunesBossParts';

/**
 * The Roadrunner, chapter 3's boss, seen from above facing +x: a lanky
 * streaked ground cuckoo with a shaggy crest, a long heavy bill, a long
 * white-tipped tail and long blue-grey legs. It trots, crest down ('walk0',
 * 'walk1'); gives its tell, head low and forward with its tail cocked
 * straight up, throwing a long shadow ('aim'); runs flat out, neck
 * stretched and legs a cartoon blur ('dash0', 'dash1'); skids, feet braced,
 * wings thrown out and tail flung forward, off balance ('skid'); and hops
 * back startled, crest up and wings flared ('startle').
 */
const FRAME = 120;
const SEED = 6901;

/** A rough outline of the tail, for the shadow. */
function tailOutline(r: Runner): Pt[] {
  const t = r.tail;
  const tip = polar(t.root, t.ang, t.len);
  return ribbon([t.root, polar(t.root, t.ang, t.len * 0.5), tip], (u) => t.w * (1 + t.spread * 3 * u)).shape;
}

function headOutline(r: Runner): Pt[] {
  return ellipseAt(r.head.x + r.bill * 0.35, r.head.y, r.headR + r.bill * 0.45, r.headR * 0.85, 0, 18);
}

function draw(d: Draw, pose: RunnerPose): void {
  const r = runner(pose);
  const rng = createRng(SEED);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(r.shift.x, r.shift.y);
  const dashing = r.blur !== null;
  const wings = wingsOf(r);
  if (pose === 'skid') skidMarks(d, r);
  if (dashing) speed(d, r, r.blur!);
  if (r.tail.up) tailShadow(d, r);
  const neckShape = ribbon(r.neck, () => r.neckW[0]).shape;
  const parts = [r.body, neckShape, headOutline(r), ...(r.tail.up ? [] : [tailOutline(r)]), ...wings.outlines];
  shadowOf(d, parts, r.lift ? 9 : dashing ? 4 : 2.6, r.lift ? 0.1 : 0.16);
  r.feet.forEach((f) => leg(d, r, f));
  if (dashing) legWheel(d, r, r.blur!);
  const over = r.tail.up || pose === 'skid';
  if (!over) paintTail(d, r.tail);
  if (r.wings !== 'folded') wings.paint(d, rng);
  plumage(d, r.body, rng, { n: 80, size: 3.8, line: 1 });
  if (r.wings === 'folded') wings.paint(d, rng);
  if (over) {
    // Cocked up or flung forward over the back: it throws a shadow on the body beneath it.
    d.pen.clipped(r.body, () => d.pen.fill(tailOutline(r).map((p) => pt(p.x + 2, p.y + 3)), d.ink, 0.2));
    paintTail(d, r.tail);
  }
  paintNeck(d, r, rng);
  paintHead(d, r, rng);
  if (pose === 'skid') skidSpray(d, r);
  if (pose === 'startle') jolts(d, pt(r.bodyC.x + 6, r.bodyC.y));
  ctx.restore();
}

/** The Roadrunner's drawings. */
const ART: SpriteArt<RunnerPose> = { frame: FRAME, res: 2, poses: RUNNER_POSES, draw };
export const ROADRUNNER_ART: SpriteArt | undefined = ART;
