import { lookOf } from '../../logic/gear';
import type { Draw } from '../kit';
import { glow, mix, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { hexWindow, lashing, ribs } from './asterMotifs';
import { markOf } from './marks';
import { amberBead, band, frost, gem, glowLine, oval, part, patch, pores, pt, roundRect, seam, sheen, weave } from './parts';

/**
 * Each mark's own touches on the suit (suit.ts draws the family's shape):
 * Mk 0, the starter's patched cobalt work suit: patches, a zip and a chest
 *    pocket, laced leather boots;
 * Mk 1, Graphite's glass-fibre suit: charcoal twill, quilted, copper piping
 *    down the front, copper cuffs and toecaps, quilted knee pads;
 * Mk 2, Mycel's calcite wool, built to the Aster's designs: cream and
 *    padded, bound in amber (a binding down the front, amber cuffs, knee
 *    wraps and boot tops, each lashed with their dark cord), a ribbed
 *    malachite shell plate on the chest with a hexagonal window glowing
 *    teal at its root, a malachite collar and belt over lignite boots;
 * Mk 3, Brine's oilskin: glossy teal, pearl buttons, a rope belt, waders;
 * Mk 4–7 on the guild's plate: a dust scarf (Talus), quartz facets and a
 *    crystal (Prism), a glowing heat seam and a diamond (Ember), pores
 *    (Pumice);
 * Mk 8–10 on the armour: frost (Rime), willemite seams (Umbra), a
 *    heartstone on the chest (Cardia).
 */

/** Cloth folds: a darker crease with a lit ridge beside it. */
export function fold(d: Draw, cloth: string, pts: readonly Pt[]): void {
  d.pen.hair(pts, 0.4, mix(cloth, SHADOW, 0.6), 0.8);
  d.pen.hair(pts.map((p) => pt(p.x - 0.35, p.y - 0.3)), 0.3, mix(cloth, '#ffffff', 0.45), 0.6);
}

/** A pearl: a small bright bead with a pink lustre. */
function pearl(d: Draw, x: number, y: number, r: number): void {
  d.pen.dot(x + r * 0.2, y + r * 0.25, r, d.ink, 0.5);
  d.pen.dot(x, y, r * 0.85, '#efe8de', 1);
  d.pen.dot(x + r * 0.2, y + r * 0.2, r * 0.4, '#e6c3cc', 0.7);
  d.pen.dot(x - r * 0.3, y - r * 0.3, r * 0.3, PAPER_FILL, 0.95);
}

/** The belt's leather (or what stands for it). */
export function beltOf(mk: number): string {
  const m = markOf(mk);
  if (mk === 2) return m.shell;
  if (mk === 3) return '#c4b088';
  return lookOf(mk) === 2 ? mix(m.shell, SHADOW, 0.5) : mix(m.trim, SHADOW, 0.2);
}

/** The front of a work suit (Mk 0–3). */
export function workTorso(d: Draw, mk: number, body: readonly Pt[]): void {
  const m = markOf(mk);
  if (mk === 0) {
    // A zip down the front, a chest pocket with its flap, a patch on the side, a fold under the arm.
    d.pen.hair([pt(2.2, -3.2), pt(2.4, 5.4)], 0.35, mix(m.cloth, SHADOW, 0.6), 0.9);
    for (let y = -2.6; y < 5; y += 1.1) d.pen.hair([pt(1.9, y), pt(2.7, y + 0.3)], 0.25, '#e9ecf2', 0.8);
    const pocket = roundRect(-4.8, -1.4, -0.6, 2.6, 0.6);
    part(d, pocket, mix(m.cloth, SHADOW, 0.12), { shadow: 0.35, line: 0.4, hatch: 0 });
    const flap = [pt(-5, -1.6), pt(-0.4, -1.8), pt(-0.6, 0), pt(-2.7, 0.5), pt(-4.8, 0.1)];
    part(d, flap, m.cloth, { shadow: 0.25, line: 0.4, hatch: 0 });
    patch(d, 4.6, 5, 1.3, '#a7b6d6');
    fold(d, m.cloth, [pt(-6.4, 5.6), pt(-4.6, 4.2), pt(-3, 4.6)]);
    return;
  }
  if (mk === 1) {
    // Twill, quilted across, copper piping down the front and a copper tab.
    weave(d, body, m.cloth, 0.9);
    seam(d, [pt(-7.4, 1.4), pt(-2, 1.1), pt(6.6, 0.8)], 0.4);
    seam(d, [pt(-7.6, 3.6), pt(-2, 3.3), pt(6.6, 3)], 0.4);
    d.pen.stroke([pt(2.2, -3.4), pt(2.4, 5.4)], 0.8, d.ink, 0.85, false);
    d.pen.stroke([pt(2.15, -3.4), pt(2.35, 5.4)], 0.5, m.fitting, 1, false);
    part(d, roundRect(-5.4, 1.8, -3.2, 3, 0.3), m.fitting, { shadow: 0.3, line: 0.35, gloss: true, hatch: 0 });
    fold(d, m.cloth, [pt(-6.4, 5.4), pt(-4.6, 4.4), pt(-3, 4.7)]);
    return;
  }
  if (mk === 2) {
    // Padded wool, a malachite collar, an amber binding down the front lashed with cord,
    // and a ribbed shell plate on the chest with a glowing hexagonal window at its root.
    for (const x of [-6.4, 4.8]) fold(d, m.cloth, [pt(x, -2.8), pt(x + 0.3, 1.6), pt(x + 0.1, 5.4)]);
    const collar = [pt(-7.4, -0.4), pt(6.6, -0.9), pt(6.8, 0.8), pt(-7.5, 1.3)];
    part(d, collar, m.shell, { shadow: 0.4, line: 0.4, hatch: 0, gloss: true });
    const root = pt(-2.2, 5.2);
    const fan = [root, ...Array.from({ length: 9 }, (_, i) => {
      const a = -Math.PI * 0.92 + (i / 8) * Math.PI * 0.84;
      return pt(root.x + Math.cos(a) * 5, root.y + Math.sin(a) * 4.6);
    })];
    part(d, fan, m.shell, { shadow: 0.45, line: 0.45, gloss: true });
    ribs(d, fan, root, m.shell, 6, Math.PI * 0.7, -Math.PI / 2, 6);
    hexWindow(d, pt(root.x, root.y - 0.9), 0.9);
    const binding = [pt(1.5, -3.4), pt(2.9, -3.5), pt(3, 5.3), pt(1.6, 5.4)];
    part(d, binding, m.accent, { alpha: 0.8, shadow: 0.3, line: 0.35, hatch: 0, gloss: true });
    for (const y of [1.6, 3.8]) lashing(d, pt(2.25, y), 2.2, 0, 2);
    amberBead(d, pt(4.6, 2.4), 0.8, 0.7, m.accent);
    return;
  }
  // Oilskin: a shine down the cloth, pearl buttons on a placket.
  sheen(d, [pt(-5.8, 0.4), pt(-5.4, 4.6)], 0.6);
  d.pen.hair([pt(2.6, -3.2), pt(2.8, 5.4)], 0.35, mix(m.cloth, SHADOW, 0.6), 0.9);
  for (const y of [0.6, 2.4, 4.2]) pearl(d, 2.2, y, 0.6);
}

/** A work suit's leg (Mk 0–3). */
export function legTouches(d: Draw, mk: number, shape: readonly Pt[], hip: Pt, foot: Pt, knee: Pt, front: boolean): void {
  const m = markOf(mk);
  if (mk === 0) {
    fold(d, m.cloth, [pt(knee.x - 1.8, knee.y + 0.8), pt(knee.x, knee.y + 0.2), pt(knee.x + 1.6, knee.y + 0.9)]);
    if (front) patch(d, knee.x, knee.y - 0.6, 1.5, '#9db0d6');
  } else if (mk === 1) {
    weave(d, shape, m.cloth, 0.9);
    const pad = oval(knee.x + 0.4, knee.y, 2.4, 2, 14);
    part(d, pad, m.trim, { shadow: 0.45, line: 0.45, gloss: true });
    d.pen.hair(oval(knee.x + 0.4, knee.y, 1.6, 1.3, 12), 0.3, m.fitting, 0.95);
  } else if (mk === 2) {
    band(d, shape, hip, foot, 0.42, 0.56, m.accent, 0.82);
    lashing(d, pt(hip.x + (foot.x - hip.x) * 0.49, hip.y + (foot.y - hip.y) * 0.49), 3, Math.atan2(foot.y - hip.y, foot.x - hip.x) + Math.PI / 2, 2);
    fold(d, m.cloth, [pt(knee.x - 1.6, knee.y - 2.4), pt(knee.x, knee.y - 2.8), pt(knee.x + 1.4, knee.y - 2.2)]);
  } else {
    sheen(d, [pt(knee.x - 1.4, knee.y - 2), pt(knee.x - 1.2, knee.y + 1.6)], 0.45);
  }
}

/** A work suit's arm (Mk 0–3). */
export function armTouches(d: Draw, mk: number, shape: readonly Pt[], shoulder: Pt, hand: Pt, elbow: Pt): void {
  const m = markOf(mk);
  if (mk === 0) {
    fold(d, m.cloth, [pt(elbow.x - 1, elbow.y - 1.2), pt(elbow.x, elbow.y), pt(elbow.x - 0.4, elbow.y + 1.2)]);
  } else if (mk === 1) {
    weave(d, shape, m.cloth, 0.9);
    band(d, shape, shoulder, hand, 0.66, 0.78, m.fitting);
  } else if (mk === 2) {
    fold(d, m.cloth, [pt(elbow.x - 1, elbow.y - 1.2), pt(elbow.x, elbow.y), pt(elbow.x - 0.4, elbow.y + 1.2)]);
    band(d, shape, shoulder, hand, 0.62, 0.8, m.accent, 0.82);
    const cuff = pt(shoulder.x + (hand.x - shoulder.x) * 0.71, shoulder.y + (hand.y - shoulder.y) * 0.71);
    lashing(d, cuff, 2.6, Math.atan2(hand.y - shoulder.y, hand.x - shoulder.x) + Math.PI / 2, 2);
  } else {
    sheen(d, [pt(elbow.x - 1.2, elbow.y - 1.4), pt(elbow.x - 0.4, elbow.y + 1)], 0.4);
    pearl(d, hand.x - (hand.x - shoulder.x) * 0.3, hand.y - (hand.y - shoulder.y) * 0.3, 0.5);
  }
}

/** A boot's touches: laces, a toecap, a band. */
export function bootTouches(d: Draw, mk: number, at: Pt, sole: number): void {
  const m = markOf(mk);
  const { x, y } = at;
  if (mk === 0) {
    // Laces, and a scuff on the toe.
    d.pen.hair([pt(x - 0.5, y - 2.1), pt(x + 1.2, y - 1.1)], 0.35, '#f1e3c4', 0.95);
    d.pen.hair([pt(x + 1.2, y - 2.1), pt(x - 0.5, y - 1.1)], 0.35, '#f1e3c4', 0.95);
    sheen(d, [pt(x + 2.4, y - 1.2), pt(x + 3.6, y - 0.4)], 0.45);
  } else if (mk === 1) {
    // A copper toecap.
    const cap = [pt(x + 1.8, y - 2), pt(x + 3.2, y - 1.2), pt(x + 4.6, sole - 1), pt(x + 2.4, sole - 1)];
    part(d, cap, m.fitting, { shadow: 0.4, line: 0.4, gloss: true, hatch: 0 });
    sheen(d, [pt(x + 2.4, y - 1.4), pt(x + 3.4, y - 0.7)], 0.4);
  } else if (mk === 2) {
    // An amber band round the top.
    const top = [pt(x - 2.7, y - 2.5), pt(x + 1.7, y - 2.3), pt(x + 2, y - 1.2), pt(x - 2.8, y - 1.4)];
    part(d, top, m.accent, { alpha: 0.85, shadow: 0.3, line: 0.4, hatch: 0, gloss: true });
    lashing(d, pt(x - 0.4, y - 1.85), 1.4, Math.PI / 2, 3);
  } else if (mk === 3) {
    // Waders: a turned-down cuff.
    const cuff = [pt(x - 2.9, y - 3.2), pt(x + 1.9, y - 3), pt(x + 1.8, y - 1.8), pt(x - 2.8, y - 2)];
    part(d, cuff, mix(m.trim, '#ffffff', 0.25), { shadow: 0.3, line: 0.4, hatch: 0 });
  } else if (mk === 6) {
    // Heat in the welt.
    d.pen.stroke([pt(x - 2.6, sole - 1.1), pt(x + 4.4, sole - 1.1)], 0.3, m.accent, 0.9, false);
  }
}

/** The guild's chest plate, as each planet prints it (Mk 4–7). */
export function plateTouches(d: Draw, mk: number, plate: readonly Pt[]): void {
  const m = markOf(mk);
  if (mk === 4) {
    // Red dust settled on the plate, and a dust scarf knotted at the neck.
    pores(d, plate, mix(m.shell, '#e0b08a', 0.6), 10);
    const scarf = [pt(-6.2, -0.6), pt(-2.6, -0.4), pt(-3.6, 1.6), pt(-4.6, 4.6), pt(-6.6, 4), pt(-5.6, 1.4)];
    part(d, scarf, m.accent, { shadow: 0.45, line: 0.45 });
    d.pen.hair([pt(-5.6, 0.6), pt(-5, 3.6)], 0.3, mix(m.accent, SHADOW, 0.5), 0.8);
  } else if (mk === 5) {
    // Facets ground into the quartz, and a crystal set in it.
    for (const [a, b] of [[pt(-5, -2), pt(-1.8, 3.8)], [pt(3, -2.4), pt(5.2, 1.6)], [pt(-5.4, 1.2), pt(-2.4, -2.4)]] as const) d.pen.hair([a, b], 0.25, mix(m.shell, SHADOW, 0.35), 0.7);
    gem(d, pt(-3.6, 2.4), 1.2, m.accent);
  } else if (mk === 6) {
    glowLine(d, [pt(-5, 2.6), pt(-2.6, 1.8), pt(-0.6, 2.8), pt(2.4, 2), pt(5, 2.6)], m.accent, 0.45);
    gem(d, pt(-3.8, 0.4), 0.9, '#f4f8ff');
  } else if (mk === 7) {
    pores(d, plate, m.shell, 26);
  }
}

/** The deep-space armour, as each planet prints it (Mk 8–10). */
export function armourTouches(d: Draw, mk: number): void {
  const m = markOf(mk);
  if (mk === 8) {
    frost(d, [pt(-5, 0.9), pt(-3.6, 0.7), pt(-2, 0.8), pt(-0.4, 0.5), pt(1.2, 0.6), pt(3, 0.3), pt(4.6, 0.4)]);
  } else if (mk === 9) {
    glowLine(d, [pt(-5.4, 3.7), pt(0, 4.1), pt(6, 3.5)], m.accent, 0.35);
  } else if (mk === 10) {
    glow(d.pen.ctx, pt(0, 2), 3.4, m.accent, 0.4);
    gem(d, pt(0, 2), 1.5, m.accent);
  }
}
