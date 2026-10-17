import { lookOf } from '../../logic/gear';
import { capsule, type Draw } from '../kit';
import { mix, SHADOW } from '../paint';
import type { Pt } from '../pen';
import { markOf } from './marks';
import { oval, part, pt, rivets, roundRect, seam, sheen, WASH } from './parts';
import { armourTouches, armTouches, beltOf, bootTouches, legTouches, plateTouches, workTorso } from './suitMarks';

/**
 * The suit: legs, boots, torso and the front arm. Its shape comes in three
 * families, each mark painted in its planet's cloth and trim (marks.ts)
 * with its own touches on top (suitMarks.ts):
 * 0, a prospector's work suit: cloth with a zip or a front, belted, boots;
 * 1, guild contractor's issue: an enamelled chest plate stamped with the
 *    guild's mark, a shoulder plate, knee pads and capped boots;
 * 2, deep-space armour: plates over an undersuit, jointed knees and
 *    sealed boots.
 */
export function leg(d: Draw, mk: number, hip: Pt, foot: Pt, front: boolean): void {
  const look = lookOf(mk);
  const m = markOf(mk);
  const shape = capsule(hip, foot, 5.2, 4.4);
  // The far leg sits in the body's shadow.
  part(d, shape, front ? m.cloth : mix(m.cloth, SHADOW, 0.25), { shadow: 0.55, line: 0.55, gloss: mk === 3 });
  const knee = pt((hip.x + foot.x) / 2 + 0.6, (hip.y + foot.y) / 2);
  if (look === 0) legTouches(d, mk, shape, hip, foot, knee, front);
  if (look === 1) {
    const pad = oval(knee.x + 0.6, knee.y, 2.6, 2.1, 14);
    part(d, pad, m.shell, { shadow: 0.5, line: 0.5, gloss: true });
    rivets(d, [pt(knee.x + 0.6, knee.y)], 0.38, m.fitting);
  }
  if (look === 2) {
    const shin = capsule(pt(knee.x + 0.2, knee.y + 0.6), pt(foot.x + 0.4, foot.y - 2), 4.6, 4.2);
    part(d, shin, m.shell, { shadow: 0.55, line: 0.5, gloss: true });
    const cap = oval(knee.x + 0.4, knee.y, 2.3, 2.2, 14);
    part(d, cap, m.shell, { shadow: 0.6, line: 0.55, gloss: true });
    sheen(d, [pt(knee.x - 0.8, knee.y - 1.2), pt(knee.x + 0.6, knee.y - 1.6)], 0.4);
  }
  boot(d, mk, foot);
}

function boot(d: Draw, mk: number, at: Pt): void {
  const look = lookOf(mk);
  const m = markOf(mk);
  const { x, y } = at;
  const sole = y + 1.8;
  const shape = look === 2
    ? [pt(x - 2.8, y - 2.6), pt(x + 2.6, y - 2.6), pt(x + 4.6, y - 0.4), pt(x + 4.6, sole), pt(x - 3, sole)]
    : [pt(x - 2.6, y - 2.4), pt(x + 1.6, y - 2.2), pt(x + 4.4, y - 0.4), pt(x + 4.8, sole - 0.4), pt(x + 4.2, sole), pt(x - 2.8, sole)];
  part(d, shape, look === 2 ? m.shell : m.trim, { shadow: 0.55, line: 0.6, gloss: mk > 0 });
  // A heavy dark sole with tread.
  const s = [pt(x - 2.9, sole - 1), pt(x + 4.7, sole - 1), pt(x + 4.6, sole + 0.1), pt(x - 2.9, sole + 0.1)];
  part(d, s, WASH.rubber, { shadow: 0.3, line: 0.4, hatch: 0 });
  for (let k = 0; k < 4; k++) d.pen.hair([pt(x - 2 + k * 1.8, sole - 0.9), pt(x - 2.4 + k * 1.8, sole)], 0.3, '#1e2030', 0.7);
  if (look === 1) {
    // A capped toe in the mark's metal.
    d.pen.stroke([pt(x + 1.8, y - 2), pt(x + 3.6, y - 0.8), pt(x + 4.4, sole - 1)], 0.5, d.ink, 0.8, false);
    d.pen.stroke([pt(x + 2, y - 1.7), pt(x + 3.5, y - 0.7)], 0.45, m.fitting, 0.95, false);
    sheen(d, [pt(x + 2.4, y - 1.4), pt(x + 3.5, y - 0.6)], 0.5);
  }
  if (look === 2) seam(d, [pt(x - 2.8, y - 1.3), pt(x + 2.6, y - 1.3)], 0.35);
  bootTouches(d, mk, at, sole);
}

export function torso(d: Draw, mk: number): void {
  const look = lookOf(mk);
  const m = markOf(mk);
  const body = [pt(-7, -3.2), pt(5.4, -3.8), pt(7, 1.5), pt(6.4, 8.6), pt(-6.4, 9), pt(-7.8, 3)];
  part(d, body, m.cloth, { shadow: 0.55, line: 0.65, gloss: mk === 3 });
  if (look === 0) workTorso(d, mk, body);
  if (look === 1) {
    const plate = roundRect(-5.6, -2.6, 5.6, 4.4, 1.6);
    part(d, plate, m.shell, { shadow: 0.55, line: 0.55, gloss: true });
    // The guild's stamp: a pick crossed over a star, in worn paint.
    const stamp = mix(m.shell, SHADOW, 0.55);
    d.pen.stroke([pt(-1.4, -0.6), pt(1.6, 2.4)], 0.5, stamp, 0.95, false);
    d.pen.stroke([pt(-1.9, 0.1), pt(-0.4, -1.3)], 0.5, stamp, 0.95, false);
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
      d.pen.hair([pt(1.5, 0.5), pt(1.5 + Math.cos(a) * 1.4, 0.5 + Math.sin(a) * 1.4)], 0.4, stamp, 0.95);
    }
    rivets(d, [pt(-4.6, -1.6), pt(4.6, -1.6), pt(-4.6, 3.4), pt(4.6, 3.4)], 0.33, m.fitting);
    sheen(d, [pt(-4.2, -1.8), pt(-1, -2.1)], 0.6);
    plateTouches(d, mk, plate);
  }
  if (look === 2) {
    // Overlapping plates, each lit along its top edge.
    for (const [y0, y1] of [[-3.2, -0.2], [0.6, 3.4]] as const) {
      const plate = [pt(-5.6, y0 + 0.2), pt(5.4, y0 - 0.3), pt(6.2, y1), pt(0, y1 + 0.6), pt(-5.8, y1 + 0.2)];
      part(d, plate, m.shell, { shadow: 0.5, line: 0.5, gloss: true });
      sheen(d, [pt(-4.6, y0 + 0.7), pt(-1, y0 + 0.4)], 0.4);
    }
    // A status light on the chest, in the mark's colour.
    d.pen.dot(3.6, -1.6, 1, m.accent, 0.9);
    d.pen.dot(3.3, -1.9, 0.35, '#ffffff', 0.9);
    armourTouches(d, mk);
  }
  // Belt with a buckle (the pack hangs from it: pack.ts).
  const belt = [pt(-7.3, 5.6), pt(6.8, 5.2), pt(6.8, 7), pt(-7.2, 7.4)];
  part(d, belt, beltOf(mk), { shadow: 0.3, line: 0.45, hatch: 0 });
  const buckle = roundRect(0.8, 5, 3, 7.5, 0.4);
  part(d, buckle, m.fitting, { shadow: 0.3, line: 0.4, gloss: true, hatch: 0 });
}

/** The front arm, from shoulder to a gloved hand. */
export function arm(d: Draw, mk: number, shoulder: Pt, hand: Pt): void {
  const look = lookOf(mk);
  const m = markOf(mk);
  const a = capsule(shoulder, hand, 4.2, 3.6);
  part(d, a, m.cloth, { shadow: 0.5, line: 0.55, gloss: mk === 3 });
  const elbow = pt((shoulder.x + hand.x) / 2, (shoulder.y + hand.y) / 2);
  if (look === 0) armTouches(d, mk, a, shoulder, hand, elbow);
  if (look === 1) {
    // A domed shoulder plate.
    const plate = [pt(shoulder.x - 3.4, shoulder.y + 0.6), pt(shoulder.x - 2.6, shoulder.y - 2.6), pt(shoulder.x + 1.2, shoulder.y - 3.4), pt(shoulder.x + 3.6, shoulder.y - 1.2), pt(shoulder.x + 3, shoulder.y + 1.2)];
    part(d, plate, m.shell, { shadow: 0.55, line: 0.55, gloss: true });
    rivets(d, [pt(shoulder.x, shoulder.y - 1.4)], 0.38, m.fitting);
  }
  if (look === 2) {
    const guard = capsule(elbow, hand, 4.4, 4);
    part(d, guard, m.shell, { shadow: 0.5, line: 0.5, gloss: true });
  }
  const glove = oval(hand.x, hand.y, 2.5, 2.3, 14);
  part(d, glove, m.trim, { shadow: 0.5, line: 0.5, gloss: mk > 0 });
  if (mk === 0) d.pen.hair([pt(hand.x - 2.6, hand.y - 1), pt(hand.x - 1.6, hand.y + 1.8)], 0.4, d.ink, 0.7);
  sheen(d, [pt(hand.x - 1.4, hand.y - 1.2), pt(hand.x, hand.y - 1.7)], 0.4);
}
