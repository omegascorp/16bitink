import type { Look } from '../../logic/gear';
import { capsule, type Draw } from '../kit';
import { mix, SHADOW } from '../paint';
import type { Pt } from '../pen';
import { oval, part, patch, pt, rivets, roundRect, seam, sheen, WASH } from './parts';

/**
 * The suit: legs, boots, torso and the front arm, in three looks.
 * 0, a prospector's patched work suit: cobalt cloth, stitched patches, a
 *    zip and a chest pocket, ochre leather lace-up boots.
 * 1, guild contractor's issue: a deeper blue with an enamel chest plate
 *    stamped with the guild's mark, a shoulder plate, knee pads and
 *    steel-capped boots.
 * 2, deep-space armour: ceramic plates over a cobalt undersuit, jointed
 *    knees and sealed boots.
 */
const CLOTH: readonly string[] = [WASH.fabric, WASH.contractor, WASH.undersuit];
/** Cloth folds: a darker crease with a lit ridge beside it. */
function fold(d: Draw, look: Look, pts: readonly Pt[]): void {
  d.pen.hair(pts, 0.4, mix(CLOTH[look]!, SHADOW, 0.6), 0.8);
  d.pen.hair(pts.map((p) => pt(p.x - 0.35, p.y - 0.3)), 0.3, mix(CLOTH[look]!, '#ffffff', 0.45), 0.6);
}

export function leg(d: Draw, look: Look, hip: Pt, foot: Pt, front: boolean): void {
  const shape = capsule(hip, foot, 5.2, 4.4);
  // The far leg sits in the body's shadow.
  part(d, shape, front ? CLOTH[look]! : mix(CLOTH[look]!, SHADOW, 0.25), { shadow: 0.55, line: 0.55 });
  const knee = pt((hip.x + foot.x) / 2 + 0.6, (hip.y + foot.y) / 2);
  if (look === 0) {
    fold(d, look, [pt(knee.x - 1.8, knee.y + 0.8), pt(knee.x, knee.y + 0.2), pt(knee.x + 1.6, knee.y + 0.9)]);
    if (front) patch(d, knee.x, knee.y - 0.6, 1.5, '#9db0d6');
  }
  if (look === 1) {
    const pad = oval(knee.x + 0.6, knee.y, 2.6, 2.1, 14);
    part(d, pad, WASH.enamel, { shadow: 0.5, line: 0.5, gloss: true });
    rivets(d, [pt(knee.x + 0.6, knee.y)], 0.38);
  }
  if (look === 2) {
    const shin = capsule(pt(knee.x + 0.2, knee.y + 0.6), pt(foot.x + 0.4, foot.y - 2), 4.6, 4.2);
    part(d, shin, WASH.armour, { shadow: 0.55, line: 0.5, gloss: true });
    const cap = oval(knee.x + 0.4, knee.y, 2.3, 2.2, 14);
    part(d, cap, WASH.armour, { shadow: 0.6, line: 0.55, gloss: true });
    sheen(d, [pt(knee.x - 0.8, knee.y - 1.2), pt(knee.x + 0.6, knee.y - 1.6)], 0.4);
  }
  boot(d, look, foot);
}

function boot(d: Draw, look: Look, at: Pt): void {
  const { x, y } = at;
  const sole = y + 1.8;
  const shape = look === 2
    ? [pt(x - 2.8, y - 2.6), pt(x + 2.6, y - 2.6), pt(x + 4.6, y - 0.4), pt(x + 4.6, sole), pt(x - 3, sole)]
    : [pt(x - 2.6, y - 2.4), pt(x + 1.6, y - 2.2), pt(x + 4.4, y - 0.4), pt(x + 4.8, sole - 0.4), pt(x + 4.2, sole), pt(x - 2.8, sole)];
  part(d, shape, look === 0 ? WASH.leather : look === 1 ? WASH.darkMetal : WASH.armour, { shadow: 0.55, line: 0.6, gloss: look > 0 });
  // A heavy dark sole with tread.
  const s = [pt(x - 2.9, sole - 1), pt(x + 4.7, sole - 1), pt(x + 4.6, sole + 0.1), pt(x - 2.9, sole + 0.1)];
  part(d, s, WASH.rubber, { shadow: 0.3, line: 0.4, hatch: 0 });
  for (let k = 0; k < 4; k++) d.pen.hair([pt(x - 2 + k * 1.8, sole - 0.9), pt(x - 2.4 + k * 1.8, sole)], 0.3, '#1e2030', 0.7);
  if (look === 0) {
    // Laces, and a scuff on the toe.
    d.pen.hair([pt(x - 0.5, y - 2.1), pt(x + 1.2, y - 1.1)], 0.35, '#f1e3c4', 0.95);
    d.pen.hair([pt(x + 1.2, y - 2.1), pt(x - 0.5, y - 1.1)], 0.35, '#f1e3c4', 0.95);
    sheen(d, [pt(x + 2.4, y - 1.2), pt(x + 3.6, y - 0.4)], 0.45);
  }
  if (look === 1) {
    // Steel toecap.
    d.pen.stroke([pt(x + 1.8, y - 2), pt(x + 3.6, y - 0.8), pt(x + 4.4, sole - 1)], 0.5, d.ink, 0.8, false);
    sheen(d, [pt(x + 2.4, y - 1.4), pt(x + 3.5, y - 0.6)], 0.5);
  }
  if (look === 2) seam(d, [pt(x - 2.8, y - 1.3), pt(x + 2.6, y - 1.3)], 0.35);
}

export function torso(d: Draw, look: Look): void {
  const body = [pt(-7, -3.2), pt(5.4, -3.8), pt(7, 1.5), pt(6.4, 8.6), pt(-6.4, 9), pt(-7.8, 3)];
  part(d, body, CLOTH[look]!, { shadow: 0.55, line: 0.65 });
  if (look === 0) {
    // A zip down the front, a chest pocket with its flap, a patch on the side, a fold under the arm.
    d.pen.hair([pt(2.2, -3.2), pt(2.4, 5.4)], 0.35, mix(WASH.fabric, SHADOW, 0.6), 0.9);
    for (let y = -2.6; y < 5; y += 1.1) d.pen.hair([pt(1.9, y), pt(2.7, y + 0.3)], 0.25, '#e9ecf2', 0.8);
    const pocket = roundRect(-4.8, -1.4, -0.6, 2.6, 0.6);
    part(d, pocket, mix(WASH.fabric, SHADOW, 0.12), { shadow: 0.35, line: 0.4, hatch: 0 });
    const flap = [pt(-5, -1.6), pt(-0.4, -1.8), pt(-0.6, 0), pt(-2.7, 0.5), pt(-4.8, 0.1)];
    part(d, flap, WASH.fabric, { shadow: 0.25, line: 0.4, hatch: 0 });
    patch(d, 4.6, 5, 1.3, '#a7b6d6');
    fold(d, look, [pt(-6.4, 5.6), pt(-4.6, 4.2), pt(-3, 4.6)]);
  }
  if (look === 1) {
    const plate = roundRect(-5.6, -2.6, 5.6, 4.4, 1.6);
    part(d, plate, WASH.enamel, { shadow: 0.55, line: 0.55, gloss: true });
    // The guild's stamp: a pick crossed over a star, in worn paint.
    const stamp = '#4a5f97';
    d.pen.stroke([pt(-1.4, -0.6), pt(1.6, 2.4)], 0.5, stamp, 0.95, false);
    d.pen.stroke([pt(-1.9, 0.1), pt(-0.4, -1.3)], 0.5, stamp, 0.95, false);
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
      d.pen.hair([pt(1.5, 0.5), pt(1.5 + Math.cos(a) * 1.4, 0.5 + Math.sin(a) * 1.4)], 0.4, stamp, 0.95);
    }
    rivets(d, [pt(-4.6, -1.6), pt(4.6, -1.6), pt(-4.6, 3.4), pt(4.6, 3.4)], 0.33);
    sheen(d, [pt(-4.2, -1.8), pt(-1, -2.1)], 0.6);
  }
  if (look === 2) {
    // Overlapping ceramic plates, each lit along its top edge.
    for (const [y0, y1] of [[-3.2, -0.2], [0.6, 3.4]] as const) {
      const plate = [pt(-5.6, y0 + 0.2), pt(5.4, y0 - 0.3), pt(6.2, y1), pt(0, y1 + 0.6), pt(-5.8, y1 + 0.2)];
      part(d, plate, WASH.armour, { shadow: 0.5, line: 0.5, gloss: true });
      sheen(d, [pt(-4.6, y0 + 0.7), pt(-1, y0 + 0.4)], 0.4);
    }
    // A status light on the chest.
    d.pen.dot(3.6, -1.6, 1, '#7fd0c0', 0.9);
    d.pen.dot(3.3, -1.9, 0.35, '#ffffff', 0.9);
  }
  // Belt with a buckle, and a tool pouch.
  const belt = [pt(-7.3, 5.6), pt(6.8, 5.2), pt(6.8, 7), pt(-7.2, 7.4)];
  part(d, belt, look === 2 ? WASH.darkMetal : mix(WASH.leather, SHADOW, 0.2), { shadow: 0.3, line: 0.45, hatch: 0 });
  const buckle = roundRect(0.8, 5, 3, 7.5, 0.4);
  part(d, buckle, WASH.metal, { shadow: 0.3, line: 0.4, gloss: true, hatch: 0 });
  if (look < 2) {
    const pouch = roundRect(-6.8, 6.6, -3.6, 10, 0.8);
    part(d, pouch, WASH.leather, { shadow: 0.5, line: 0.5 });
    d.pen.hair([pt(-6.7, 7.6), pt(-3.7, 7.5)], 0.35, d.ink, 0.6);
    rivets(d, [pt(-5.2, 8.1)], 0.3);
  }
}

/** The front arm, from shoulder to a gloved hand. */
export function arm(d: Draw, look: Look, shoulder: Pt, hand: Pt): void {
  const a = capsule(shoulder, hand, 4.2, 3.6);
  part(d, a, CLOTH[look]!, { shadow: 0.5, line: 0.55 });
  const elbow = pt((shoulder.x + hand.x) / 2, (shoulder.y + hand.y) / 2);
  if (look === 0) fold(d, look, [pt(elbow.x - 1, elbow.y - 1.2), pt(elbow.x, elbow.y), pt(elbow.x - 0.4, elbow.y + 1.2)]);
  if (look === 1) {
    // A domed shoulder plate.
    const plate = [pt(shoulder.x - 3.4, shoulder.y + 0.6), pt(shoulder.x - 2.6, shoulder.y - 2.6), pt(shoulder.x + 1.2, shoulder.y - 3.4), pt(shoulder.x + 3.6, shoulder.y - 1.2), pt(shoulder.x + 3, shoulder.y + 1.2)];
    part(d, plate, WASH.enamel, { shadow: 0.55, line: 0.55, gloss: true });
    rivets(d, [pt(shoulder.x, shoulder.y - 1.4)], 0.38);
  }
  if (look === 2) {
    const guard = capsule(elbow, hand, 4.4, 4);
    part(d, guard, WASH.armour, { shadow: 0.5, line: 0.5, gloss: true });
  }
  const glove = oval(hand.x, hand.y, 2.5, 2.3, 14);
  part(d, glove, look === 0 ? WASH.leather : WASH.darkMetal, { shadow: 0.5, line: 0.5 });
  if (look === 0) d.pen.hair([pt(hand.x - 2.6, hand.y - 1), pt(hand.x - 1.6, hand.y + 1.8)], 0.4, d.ink, 0.7);
  sheen(d, [pt(hand.x - 1.4, hand.y - 1.2), pt(hand.x, hand.y - 1.7)], 0.4);
}
