import { bezier, type Draw, pt } from '../kit';
import { INK } from '../palette';
import type { SpriteArt } from '../types';
import { onLayer } from '../critters/tomcatKit';
import { FOX } from './barrensFoxArtFur';
import { paintHead } from './barrensFoxArtHead';
import { paintBody, paintEar, paintLeg, paintTail } from './barrensFoxArtPaint';
import { type Fox, fox, FOX_POSES, type FoxPose } from './barrensFoxArtParts';

/**
 * The Red Fox, chapter 2's boss, seen from above facing +x: a slim
 * red-orange fox with white cheeks and throat, black-backed ears, black
 * stockings and a long white-tipped brush. It trots with its legs in
 * diagonal pairs and its tail streaming ('walk0', 'walk1'), sinks low with
 * its ears pricked at the snake ('crouch'), dives in the high mousing
 * pounce, forepaws tucked to its chest ('leap'), puts its nose down to a
 * snake playing dead, tail up ('sniff'), and springs back fluffed out with
 * its ears flat ('startle').
 */
const FRAME = 190;

/** The soft shadow under it: fainter and further off in mid-air (the game lifts the sprite off the ground). */
function shadow(d: Draw, c: Fox): void {
  const air = c.pose === 'leap';
  const off = air ? pt(6, 9) : pt(2.4, 3.4);
  const tail = c.tail.raised ? [] : [c.tail.shape];
  const parts = [...tail, ...c.legs.flatMap((l) => (l.tucked ? [] : [l.limb, l.paw])), c.body, c.head, ...c.ears.map((e) => e.shape)];
  onLayer(d, (l) => parts.forEach((s) => l.pen.fill(s.map((q) => pt(q.x + off.x, q.y + off.y)), INK, 1)), air ? 0.08 : 0.15, air ? 2.4 : 1.1);
  // A tail held up throws its shadow well off to the side.
  if (c.tail.raised) onLayer(d, (l) => l.pen.fill(c.tail.shape.map((q) => pt(q.x + 10, q.y + 14)), INK, 1), 0.1, 2.2);
}

/** The pounce from above: the body arched up towards the eye, so the light runs along its spine; a whoosh of air past its flanks. */
function airborne(d: Draw): void {
  for (const side of [-1, 1]) {
    for (const [y, x0, len, a] of [[16, -14, 22, 0.5], [19, -24, 18, 0.38]] as const) {
      const p = pt(x0, side * y);
      d.pen.hair(bezier(p, pt(p.x - len * 0.5, p.y + side * 0.6), pt(p.x - len, p.y + side * 1.8), 6), 0.7, d.ink, a);
    }
  }
}

/** The tell before the leap: ears twitching (little ticks by their tips) as it pinpoints the sound. */
function listening(d: Draw, c: Fox): void {
  for (const e of c.ears) {
    // Little arcs round the tip, opening away from the head.
    const out = Math.atan2(e.tip.y - e.base.y, e.tip.x - e.base.x);
    for (const [r, a] of [[3.6, 0.75], [6.4, 0.5]] as const) {
      const t = e.tip;
      const arc = Array.from({ length: 7 }, (_, i) => {
        const q = out - 0.8 + (i / 6) * 1.6;
        return pt(t.x - Math.cos(out) * 1.2 + Math.cos(q) * r, t.y - Math.sin(out) * 1.2 + Math.sin(q) * r);
      });
      d.pen.hair(arc, 0.65, d.ink, a);
    }
  }
}

/** Sniffs: little puffs of scent lines curling up from the ground at its nose. */
function sniffs(d: Draw, c: Fox): void {
  const N = pt(c.headC.x + c.snout + 2.5, c.headC.y);
  for (const [dy, len, a] of [[-2.6, 5, 0.6], [2.6, 5, 0.6], [0, 7.5, 0.45]] as const) {
    const p = pt(N.x + 1, N.y + dy);
    d.pen.hair(bezier(p, pt(p.x + len * 0.5, p.y + dy * 0.8 - 1.4), pt(p.x + len, p.y + dy * 1.2 + 0.6), 6), 0.6, d.ink, a);
  }
}

/** Fright jolts bursting out round the startled fox. */
function jolts(d: Draw): void {
  for (const [a, r] of [[-2.4, 34], [-1.65, 28], [-0.7, 36], [0.7, 37], [1.65, 29], [2.45, 34]] as const) {
    const u = pt(Math.cos(a), Math.sin(a));
    const v = pt(-u.y, u.x);
    for (const o of [-3, 0, 3]) {
      const b = pt(u.x * (r - Math.abs(o) * 0.6) * 1.15 + v.x * o, u.y * (r - Math.abs(o) * 0.6) + v.y * o);
      const len = o === 0 ? 6.5 : 4.2;
      d.pen.stroke([b, pt(b.x + (u.x + v.x * o * 0.06) * len, b.y + (u.y + v.y * o * 0.06) * len)], 0.8, d.ink, 0.8, false);
    }
  }
}

function draw(d: Draw, pose: FoxPose): void {
  const c = fox(pose);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.shift.x, c.shift.y);
  shadow(d, c);
  if (pose === 'leap') airborne(d);
  if (!c.tail.raised) paintTail(d, c);
  // Forepaws folded to the chest in the pounce paint only their black tips, peeking out beside the neck.
  c.legs.forEach((l, i) => paintLeg(d, l, i));
  // The body's shadow falling across the legs beneath it.
  c.legs.forEach((l) => !l.tucked && d.pen.clipped(l.limb, () => d.pen.fill(c.body.map((q) => pt(q.x + 1.4, q.y + 2.2)), FOX.deep, 0.4)));
  paintBody(d, c);
  d.pen.clipped(c.body, () => d.pen.fill(c.head.map((q) => pt(q.x + 1.4, q.y + 2.2)), FOX.deep, 0.32));
  if (c.tail.raised) {
    d.pen.clipped(c.body, () => d.pen.fill(c.tail.shape.map((q) => pt(q.x + 3, q.y + 4.4)), FOX.deep, 0.3));
    paintTail(d, c);
  }
  paintHead(d, c);
  // The ears stand up off the crown: each throws a little shadow back across the head first.
  c.ears.forEach((e) => d.pen.clipped(c.head, () => d.pen.fill(e.shape.map((q) => pt(q.x + 1.3, q.y + 2)), FOX.deep, 0.35)));
  c.ears.forEach((e, i) => paintEar(d, e, 7501 + i));
  if (pose === 'crouch') listening(d, c);
  if (pose === 'sniff') sniffs(d, c);
  if (pose === 'startle') jolts(d);
  ctx.restore();
}

/** The Red Fox's drawings. */
const ART: SpriteArt<FoxPose> = { frame: FRAME, res: 2, poses: FOX_POSES, draw };
export const FOX_ART: SpriteArt | undefined = ART;
