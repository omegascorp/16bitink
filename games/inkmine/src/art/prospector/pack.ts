import { lookOf } from '../../logic/gear';
import type { Draw } from '../kit';
import { mix, SHADOW } from '../paint';
import { lashing, star8 } from './asterMotifs';
import { markOf } from './marks';
import { amberBead, frost, gem, glowLine, part, pores, pt, rivets, roundRect, seam, sheen, weave } from './parts';

/**
 * The pack, where the ore goes: a bag hung from the belt at the hip,
 * bigger with each mark (more slots). Its shape comes in three families:
 * 0, a soft bag. The starter's is a small leather pouch; Graphite's (Mk 1)
 *    a carbon satchel on a copper frame with copper corners and buckle;
 *    Mycel's (Mk 2) lignite carbon fibre bound in amber, lashed with cord
 *    and fastened on a brass eight-pointed star (the Aster's design);
 *    Brine's (Mk 3) a teal net bag with a pearl toggle;
 * 1, a stiff case on a frame, latched, with the mark's touch;
 * 2, a hard sample canister with a lit band.
 */
export function pack(d: Draw, mk: number): void {
  const look = lookOf(mk);
  const m = markOf(mk);
  if (mk === 0) {
    // The starter's pouch.
    const pouch = roundRect(-6.8, 6.6, -3.6, 10, 0.8);
    part(d, pouch, m.trim, { shadow: 0.5, line: 0.5 });
    d.pen.hair([pt(-6.7, 7.6), pt(-3.7, 7.5)], 0.35, d.ink, 0.6);
    rivets(d, [pt(-5.2, 8.1)], 0.3);
    return;
  }
  if (look === 0) {
    softBag(d, mk);
    return;
  }
  if (look === 1) {
    const bag = roundRect(-9, 5.4, -2.6, 11.4, 0.8);
    part(d, bag, m.shell, { shadow: 0.55, line: 0.6, gloss: true });
    if (mk === 7) pores(d, bag, m.shell, 14);
    for (const y of [5.6, 11.2]) d.pen.stroke([pt(-8.8, y), pt(-2.8, y)], 0.6, m.fitting, 1, false);
    part(d, roundRect(-6.6, 7, -5, 8.8, 0.3), m.fitting, { shadow: 0.3, line: 0.35, gloss: true, hatch: 0 });
    if (mk === 4) d.pen.hair([pt(-8.4, 9.4), pt(-6.2, 10.2), pt(-3.4, 9.6)], 0.4, mix(m.accent, SHADOW, 0.2), 0.8);
    if (mk === 5) gem(d, pt(-4, 9.6), 0.9, m.accent);
    if (mk === 6) glowLine(d, [pt(-8.6, 9.8), pt(-3, 9.6)], m.accent, 0.35);
    sheen(d, [pt(-8.4, 6.4), pt(-8.2, 10)], 0.45);
    return;
  }
  const can = roundRect(-9.4, 5.2, -2.4, 11.6, 2.6);
  part(d, can, m.shell, { shadow: 0.55, line: 0.6, gloss: true });
  if (mk === 9) glowLine(d, [pt(-9, 8.4), pt(-2.8, 8.4)], m.accent, 0.4);
  else part(d, roundRect(-9.3, 7.8, -2.5, 9, 0.4), m.accent, { shadow: 0.2, line: 0.35, hatch: 0, gloss: true });
  if (mk === 8) frost(d, [pt(-8.4, 5.8), pt(-7, 5.4), pt(-5.6, 5.4), pt(-4.2, 5.5), pt(-3, 6)]);
  if (mk === 10) gem(d, pt(-5.9, 10.2), 0.9, m.fitting);
  seam(d, [pt(-9, 10.2), pt(-2.8, 10.2)], 0.3);
  sheen(d, [pt(-8.6, 6.4), pt(-5, 5.8)], 0.45);
}

/** A work bag (Mk 1–3), a size up each mark. */
function softBag(d: Draw, mk: number): void {
  const m = markOf(mk);
  const w = 4.4 + (mk - 1) * 0.5;
  const [x1, y0] = [-3.2 + (mk - 1) * 0.1, 5.8];
  const x0 = x1 - w;
  const y1 = y0 + w * 1.05;
  const bag = [pt(x0, y0), pt(x1, y0), pt(x1 + 0.3, y1 - 1), pt(x1 - 0.8, y1), pt(x0 + 0.6, y1), pt(x0 - 0.3, y1 - 1)];
  const wash = mk === 3 ? m.shell : m.trim;
  part(d, bag, wash, { shadow: 0.55, line: 0.55, gloss: mk === 1 });
  if (mk === 2) weave(d, bag, wash, 0.8, true);
  if (mk === 3) weave(d, bag, wash, 1, true);
  const flap = [pt(x0 - 0.2, y0 - 0.2), pt(x1 + 0.2, y0 - 0.2), pt(x1, y0 + w * 0.45), pt((x0 + x1) / 2, y0 + w * 0.55), pt(x0, y0 + w * 0.45)];
  const mid = pt((x0 + x1) / 2, y0 + w * 0.5);
  if (mk === 1) {
    // A carbon satchel on a copper frame: copper piping, corners and buckle.
    part(d, flap, mix(wash, '#ffffff', 0.08), { shadow: 0.3, line: 0.45, hatch: 0, gloss: true });
    d.pen.stroke([pt(x0, y0 - 0.1), pt(x1, y0 - 0.1)], 0.6, m.fitting, 1, false);
    for (const [x, s] of [[x0 + 0.2, 1], [x1 - 0.2, -1]] as const) d.pen.stroke([pt(x, y1 - 1.8), pt(x, y1 - 0.4), pt(x + s * 1.4, y1 - 0.2)], 0.55, m.fitting, 1, false);
    part(d, roundRect(mid.x - 0.8, mid.y - 0.6, mid.x + 0.8, mid.y + 0.8, 0.2), m.fitting, { shadow: 0.3, line: 0.35, gloss: true, hatch: 0 });
  } else if (mk === 2) {
    // Bound in amber, lashed with cord, fastened on a brass star.
    for (const x of [x0 + w * 0.22, x1 - w * 0.22]) part(d, [pt(x - 0.5, y0), pt(x + 0.5, y0), pt(x + 0.5, y1 - 0.2), pt(x - 0.5, y1 - 0.2)], m.accent, { alpha: 0.8, shadow: 0.3, line: 0.3, hatch: 0, gloss: true });
    part(d, flap, mix(wash, '#ffffff', 0.06), { shadow: 0.3, line: 0.45, hatch: 0 });
    lashing(d, pt(mid.x, y1 - 1.4), w * 0.8, 0, 2);
    star8(d, mid, 1.2, m.fitting);
    amberBead(d, pt(x1 - 0.9, y0 + 0.9), 0.6, 0.5, m.accent);
  } else {
    // A net bag drawn shut with a cord and a pearl toggle.
    d.pen.stroke([pt(x0, y0 + 0.4), pt(x1, y0 + 0.4)], 0.6, m.trim, 1, false);
    d.pen.dot(mid.x, y0 + 0.6, 0.7, m.accent);
    d.pen.dot(mid.x - 0.2, y0 + 0.4, 0.25, '#ffffff', 0.9);
  }
  sheen(d, [pt(x0 + 0.6, y0 + 1.2), pt(x0 + 0.5, y1 - 1.4)], 0.4);
}
