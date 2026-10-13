import type { Look } from '../../logic/gear';
import { capsule, edge, type Draw } from '../kit';
import type { Pt } from '../pen';
import { oval, part, patch, pt, rivets, roundRect, sheen, WASH } from './parts';

/**
 * The suit: legs, boots, torso and the front arm, in three looks.
 * 0, a prospector's patched work suit: soft fabric, stitched patches, a
 *    zip and a chest pocket, lace-up work boots.
 * 1, guild contractor's issue: the same cut with a chest plate stamped with
 *    the guild's mark, a shoulder plate, knee pads and steel-capped boots.
 * 2, deep-space armour: overlapping plates, jointed knees and sealed boots.
 */
const SUIT_WASH: readonly string[] = [WASH.fabric, WASH.contractor, WASH.armour];

export function leg(d: Draw, look: Look, hip: Pt, foot: Pt, front: boolean): void {
  const shape = capsule(hip, foot, 5, 4.4);
  part(d, shape, SUIT_WASH[look]!, { shadow: 0.35, line: 1 });
  const knee = pt((hip.x + foot.x) / 2 + 0.6, (hip.y + foot.y) / 2);
  if (look === 0 && front) patch(d, knee.x, knee.y, 1.5, '#c9c2ad');
  if (look === 1) {
    const pad = oval(knee.x + 0.6, knee.y, 2.5, 2, 12);
    part(d, pad, WASH.metal, { shadow: 0.3, line: 0.9 });
    rivets(d, [pt(knee.x + 0.6, knee.y)], 0.4);
  }
  if (look === 2) {
    edge(d, oval(knee.x + 0.4, knee.y, 2.2, 2.2, 12), 0.8);
    for (const t of [0.25, 0.75]) {
      const y = hip.y + (foot.y - hip.y) * t;
      d.pen.hair([pt(hip.x + (foot.x - hip.x) * t - 2.4, y), pt(hip.x + (foot.x - hip.x) * t + 2.4, y + 0.3)], 0.55, d.ink, 0.7);
    }
  }
  boot(d, look, foot);
}

function boot(d: Draw, look: Look, at: Pt): void {
  const { x, y } = at;
  const sole = y + 1.8;
  const shape = look === 2
    ? [pt(x - 2.8, y - 2.6), pt(x + 2.6, y - 2.6), pt(x + 4.6, y - 0.4), pt(x + 4.6, sole), pt(x - 3, sole)]
    : [pt(x - 2.6, y - 2.2), pt(x + 1.6, y - 2.2), pt(x + 4.4, y - 0.4), pt(x + 4.8, sole - 0.4), pt(x + 4.2, sole), pt(x - 2.8, sole)];
  part(d, shape, look === 0 ? '#b4a68a' : WASH.metal, { shadow: 0.4, line: 1.05 });
  // A heavy sole, with tread.
  d.pen.hair([pt(x - 2.8, sole - 0.9), pt(x + 4.6, sole - 0.9)], 0.6, d.ink, 0.8);
  for (let k = 0; k < 4; k++) d.pen.hair([pt(x - 2 + k * 1.8, sole - 0.9), pt(x - 2.4 + k * 1.8, sole)], 0.4, d.ink, 0.7);
  if (look === 0) {
    // Laces.
    d.pen.hair([pt(x - 0.5, y - 2), pt(x + 1.2, y - 1)], 0.4, d.ink, 0.8);
    d.pen.hair([pt(x + 1.2, y - 2), pt(x - 0.5, y - 1)], 0.4, d.ink, 0.8);
  }
  if (look === 1) {
    // Steel toecap.
    d.pen.stroke([pt(x + 1.8, y - 2), pt(x + 3.6, y - 0.8), pt(x + 4.4, sole - 1)], 0.7, d.ink, 0.8, false);
    sheen(d, [pt(x + 2.4, y - 1.4), pt(x + 3.5, y - 0.6)], 0.6);
  }
  if (look === 2) {
    d.pen.hair([pt(x - 2.8, y - 1.4), pt(x + 2.6, y - 1.4)], 0.6, d.ink, 0.75);
  }
}

export function torso(d: Draw, look: Look): void {
  const body = [pt(-7, -3.2), pt(5.4, -3.8), pt(7, 1.5), pt(6.4, 8.6), pt(-6.4, 9), pt(-7.8, 3)];
  part(d, body, SUIT_WASH[look]!, { shadow: 0.4, line: 1.3 });
  if (look === 0) {
    // Zip, chest pocket with its flap, a patch on the side.
    for (let y = -2.6; y < 7; y += 1.4) d.pen.hair([pt(2.1, y), pt(2.3, y + 0.7)], 0.5, d.ink, 0.75);
    const pocket = roundRect(-4.6, -1.6, -0.6, 2.4, 0.6);
    edge(d, pocket, 0.7, 0.8);
    d.pen.hair([pt(-4.8, -0.6), pt(-0.4, -0.7)], 0.6, d.ink, 0.8);
    patch(d, 4.6, 5.2, 1.3, '#c9c2ad');
  }
  if (look === 1) {
    const plate = roundRect(-5.6, -2.6, 5.6, 4.4, 1.6);
    part(d, plate, WASH.metal, { shadow: 0.35, line: 1 });
    // The guild's stamp: a pick crossed over a star.
    d.pen.hair([pt(-1.4, -0.6), pt(1.6, 2.4)], 0.6, d.ink, 0.9);
    d.pen.hair([pt(-1.9, 0.1), pt(-0.6, -1.2)], 0.6, d.ink, 0.9);
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
      d.pen.hair([pt(1.5, 0.5), pt(1.5 + Math.cos(a) * 1.4, 0.5 + Math.sin(a) * 1.4)], 0.4, d.ink, 0.8);
    }
    rivets(d, [pt(-4.6, -1.6), pt(4.6, -1.6), pt(-4.6, 3.4), pt(4.6, 3.4)], 0.35);
    sheen(d, [pt(-4.2, -1.8), pt(-1, -2.1)], 0.6);
  }
  if (look === 2) {
    for (const y of [-0.6, 2.4, 5.4]) d.pen.stroke([pt(-7.4, y), pt(0, y + 0.5), pt(6.8, y)], 0.7, d.ink, 0.75, false);
    // Status light on the chest plate.
    edge(d, oval(3.6, -1.6, 1.1, 1.1, 10), 0.6);
    sheen(d, [pt(-5.6, -2), pt(-1, -2.6)], 0.6);
  }
  // Belt with a buckle and a tool pouch.
  const belt = [pt(-7.3, 5.6), pt(6.8, 5.2), pt(6.8, 7), pt(-7.2, 7.4)];
  part(d, belt, look === 2 ? WASH.darkMetal : '#9c8d70', { shadow: 0, line: 0.8 });
  edge(d, roundRect(0.8, 5.1, 3, 7.5, 0.4), 0.7);
  if (look < 2) {
    const pouch = roundRect(-6.8, 6.6, -3.6, 10, 0.8);
    part(d, pouch, '#b4a68a', { shadow: 0.3, line: 0.8 });
  }
}

/** The front arm, from shoulder to a gloved hand. */
export function arm(d: Draw, look: Look, shoulder: Pt, hand: Pt): void {
  const a = capsule(shoulder, hand, 4.2, 3.6);
  part(d, a, SUIT_WASH[look]!, { shadow: 0.3, line: 1 });
  if (look === 1) {
    // A domed shoulder plate.
    const plate = [pt(shoulder.x - 3.4, shoulder.y + 0.6), pt(shoulder.x - 2.6, shoulder.y - 2.6), pt(shoulder.x + 1.2, shoulder.y - 3.4), pt(shoulder.x + 3.6, shoulder.y - 1.2), pt(shoulder.x + 3, shoulder.y + 1.2)];
    part(d, plate, WASH.metal, { shadow: 0.4, line: 1 });
    rivets(d, [pt(shoulder.x, shoulder.y - 1.4)], 0.4);
  }
  if (look === 2) {
    const mid = pt((shoulder.x + hand.x) / 2, (shoulder.y + hand.y) / 2);
    const guard = capsule(mid, hand, 4.4, 4);
    part(d, guard, WASH.armour, { shadow: 0.35, line: 0.9 });
  }
  const glove = oval(hand.x, hand.y, 2.4, 2.2, 12);
  part(d, glove, look === 0 ? '#b4a68a' : WASH.darkMetal, { shadow: 0, line: 0.9, alpha: 0.6 });
  if (look === 0) d.pen.hair([pt(hand.x - 2.6, hand.y - 1), pt(hand.x - 1.6, hand.y + 1.8)], 0.5, d.ink, 0.8);
}
