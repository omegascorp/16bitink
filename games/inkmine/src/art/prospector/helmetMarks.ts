import { capsule, cub, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import type { Pt } from '../pen';
import { hexWindow, ribs, star8 } from './asterMotifs';
import { markOf } from './marks';
import { amberBead, frost, gem, glowLine, oval, part, pt, rivets, roundRect, sheen, WASH } from './parts';

/**
 * The helmet's fittings (lamps, antennas) and each mark's own touches
 * (helmet.ts draws the family's shape):
 * Mk 0, the starter's steel collar, a clip-on lamp and a stub antenna;
 * Mk 1, Graphite's: a carbon collar with copper rivets, clear quartz glass
 *    with a sharp glint, a copper hoop round the bowl, a copper-wound
 *    antenna and a carbon lamp with a copper bezel;
 * Mk 2, Mycel's, built to the Aster's designs: a malachite collar lashed
 *    with their cord, calcite glass under an amber filter shade pinned on a
 *    brass eight-pointed star, a ribbed malachite filter canister with a
 *    hexagonal window glowing teal, a brass lamp and a brass antenna tipped
 *    with amber;
 * Mk 3, Brine's: a teal collar, a snorkel up the back, a pearl lens;
 * Mk 4–7 on the cage: a dust brim (Talus), a crystal crest and crystal
 *    lenses (Prism), a heat shield over the crown (Ember), a helium-3
 *    bottle (Pumice);
 * Mk 8–10 on the shell: frost (Rime), a glowing willemite stripe (Umbra),
 *    a heartstone at the brow (Cardia).
 */
export const HEAD = pt(1, -11);
export const R = 8.6;

/** A lamp: its housing (`body`), a bezel round the lens (`bezel`), the lens lit in `lens`. */
export function lamp(d: Draw, at: Pt, s = 1, body: string = WASH.darkMetal, lens: string = WASH.lamp, bezel?: string): void {
  const box = roundRect(at.x - 1.9 * s, at.y - 1.5 * s, at.x + 1.6 * s, at.y + 1.5 * s, 0.6);
  part(d, box, body, { shadow: 0.5, line: 0.5, gloss: true });
  sheen(d, [pt(at.x - 1.4 * s, at.y - 0.9 * s), pt(at.x + 0.9 * s, at.y - 1 * s)], 0.35);
  glow(d.pen.ctx, pt(at.x + 2.2 * s, at.y), 3.2 * s, lens, 0.55);
  if (bezel) part(d, oval(at.x + 2 * s, at.y, 1.35 * s, 1.75 * s, 12), bezel, { shadow: 0.3, line: 0.4, gloss: true, hatch: 0 });
  const glass = oval(at.x + 2 * s, at.y, 0.95 * s, 1.35 * s, 12);
  paint(d, glass, lens, { alpha: 1, shadow: 0.15, hatch: 0, line: 0.4, gloss: true });
}

export function antenna(d: Draw, from: Pt, to: Pt, w: number): void {
  d.pen.stroke([from, to], w, d.ink, 0.95, false);
  d.pen.stroke([pt(from.x + 0.2, from.y - 0.1), pt(to.x + 0.2, to.y - 0.1)], w * 0.35, '#c9d1dc', 0.7, false);
}

/** The collar's metal: bare steel on the starter, cast in the mark's shell on printed sets. */
export function collarOf(mk: number): string {
  const m = markOf(mk);
  return mk === 0 ? m.fitting : m.shell;
}

/** A band round the lower bowl, curving with the glass. */
function hoop(d: Draw, glass: readonly Pt[], wash: string): void {
  const top: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const x = -R + (i / 12) * R * 2;
    top.push(pt(HEAD.x + x, HEAD.y + 4.2 + 1.5 * Math.sqrt(Math.max(0, 1 - (x / R) ** 2))));
  }
  const strip = [...top, ...[...top].reverse().map((p) => pt(p.x, p.y + 1.5))];
  d.pen.clipped(glass, () => {
    part(d, strip, wash, { shadow: 0.4, line: 0.4, gloss: true, hatch: 0 });
  });
  rivets(d, [top[3]!, top[6]!, top[9]!].map((p) => pt(p.x, p.y + 0.75)), 0.3, mix(wash, '#ffffff', 0.3));
}

/** What sits behind the fishbowl (Mk 0–3): the antenna or the snorkel. */
export function fishbowlBehind(d: Draw, mk: number): void {
  const m = markOf(mk);
  const base = pt(HEAD.x - 5.5, HEAD.y - 6);
  const tip = pt(HEAD.x - 7.5, HEAD.y - 10);
  if (mk === 0) {
    antenna(d, base, tip, 0.8);
    d.pen.dot(tip.x - 0.1, tip.y - 0.4, 0.85, d.ink);
  } else if (mk === 1) {
    // Copper wire wound up the stub.
    antenna(d, base, pt(tip.x - 0.4, tip.y - 1.2), 0.8);
    for (let k = 0; k < 4; k++) {
      const p = pt(base.x - 0.6 - k * 0.55, base.y - 0.8 - k * 1.1);
      d.pen.stroke([pt(p.x - 0.8, p.y + 0.2), pt(p.x + 0.8, p.y - 0.4)], 0.45, m.fitting, 1, false);
    }
    d.pen.dot(tip.x - 0.5, tip.y - 1.6, 0.8, m.fitting);
  } else if (mk === 2) {
    // A brass stub tipped with a bead of amber.
    d.pen.stroke([base, tip], 1, d.ink, 0.95, false);
    d.pen.stroke([pt(base.x + 0.15, base.y), pt(tip.x + 0.15, tip.y)], 0.5, m.fitting, 1, false);
    amberBead(d, pt(tip.x - 0.3, tip.y - 0.9), 1.1, 1.1, m.accent);
  } else {
    // A snorkel up the back of the bowl.
    const tube = [pt(HEAD.x - 6.6, -2.4), pt(HEAD.x - 10.2, HEAD.y - 1), pt(HEAD.x - 9.8, HEAD.y - 8), pt(HEAD.x - 6.6, HEAD.y - 12.4)];
    d.pen.stroke(tube, 2.4, d.ink, 0.95, false);
    d.pen.stroke(tube, 1.6, m.shell, 1, false);
    d.pen.stroke(tube.map((p) => pt(p.x - 0.3, p.y - 0.2)), 0.4, '#ffffff', 0.6, false);
    part(d, roundRect(HEAD.x - 8, HEAD.y - 14.2, HEAD.x - 5, HEAD.y - 12, 0.6), m.fitting, { shadow: 0.3, line: 0.45, gloss: true, hatch: 0 });
  }
}

/** What goes over the fishbowl (Mk 0–3): hoops, a filter shade, glints, then the lamp. */
export function fishbowlFront(d: Draw, mk: number, glass: readonly Pt[]): void {
  const m = markOf(mk);
  const at = pt(HEAD.x + 4.2, HEAD.y - 8.6);
  if (mk === 0) {
    lamp(d, at);
  } else if (mk === 1) {
    hoop(d, glass, m.fitting);
    // Quartz: a sharp straight glint down the far side.
    d.pen.clipped(glass, () => gleam(d, [pt(HEAD.x + 5.8, HEAD.y - 4), pt(HEAD.x + 6.8, HEAD.y + 1.6)], 0.55, 0.95));
    lamp(d, at, 1, m.shell, WASH.lamp, m.fitting);
  } else if (mk === 2) {
    // The amber filter shade over the top of the bowl, hinged at the side.
    const edge = cub(pt(HEAD.x - 9, HEAD.y - 2.4), pt(HEAD.x - 2, HEAD.y - 0.6), pt(HEAD.x + 4, HEAD.y - 1.6), pt(HEAD.x + 10, HEAD.y - 0.8), 12);
    const shade = [...edge, pt(HEAD.x + 10, HEAD.y - R - 2), pt(HEAD.x - 9, HEAD.y - R - 2)];
    d.pen.clipped(glass, () => {
      dab(d, shade, m.accent, 0.4, 0.3);
      dab(d, shade.map((p) => pt(p.x, p.y - 2.4)), mix(m.accent, SHADOW, 0.25), 0.25, 0.6);
      d.pen.hair(edge, 0.45, mix(m.accent, SHADOW, 0.5), 0.9);
      gleam(d, edge.slice(2, 8).map((p) => pt(p.x, p.y - 0.6)), 0.4, 0.8);
    });
    star8(d, pt(HEAD.x - 7.2, HEAD.y - 1.8), 1.3, m.fitting);
    // A ribbed malachite filter canister on the collar, with a window onto its glow.
    const can = roundRect(HEAD.x + 4.6, -5.8, HEAD.x + 8.6, -1, 1.8);
    part(d, can, m.shell, { shadow: 0.5, line: 0.5, gloss: true });
    ribs(d, can, pt(HEAD.x + 6.6, -0.4), m.shell, 5, Math.PI * 0.5, -Math.PI / 2, 6);
    hexWindow(d, pt(HEAD.x + 6.6, -3.6), 0.95);
    lamp(d, at, 1, m.fitting);
  } else {
    lamp(d, at, 1, m.shell, '#f6f1e8');
  }
}

/** The cage's touches (Mk 4–7), drawn over the caged bowl. */
export function cageTouches(d: Draw, mk: number): void {
  const m = markOf(mk);
  if (mk === 4) {
    // A peaked dust brim over the front of the cage.
    const brim = [pt(HEAD.x + 0.4, HEAD.y - 8.6), pt(HEAD.x + 11, HEAD.y - 6.4), pt(HEAD.x + 10.4, HEAD.y - 5.2), pt(HEAD.x + 1.2, HEAD.y - 6.8)];
    part(d, brim, m.shell, { shadow: 0.45, line: 0.5, gloss: true });
  } else if (mk === 5) {
    gem(d, pt(HEAD.x - 1, HEAD.y - R - 2.6), 1.5, m.accent);
  } else if (mk === 6) {
    // A heat shield over the crown, its rim glowing.
    const arc: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 1.08 + (i / 10) * Math.PI * 0.84;
      arc.push(pt(HEAD.x + Math.cos(a) * (R + 1.4), HEAD.y + Math.sin(a) * (R + 1.4)));
    }
    const shield = [...arc, ...[...arc].reverse().map((p) => pt(HEAD.x + (p.x - HEAD.x) * 0.84, HEAD.y + (p.y - HEAD.y) * 0.84))];
    part(d, shield, m.shell, { shadow: 0.4, line: 0.5, gloss: true });
    glowLine(d, arc.slice(2, 9).map((p) => pt(HEAD.x + (p.x - HEAD.x) * 0.86, HEAD.y + (p.y - HEAD.y) * 0.86)), m.accent, 0.35);
  } else if (mk === 7) {
    // A helium-3 bottle strapped over the ear.
    const bottle = capsule(pt(HEAD.x - 7.4, HEAD.y - 2), pt(HEAD.x - 7.4, HEAD.y + 5.4), 3, 3);
    part(d, bottle, m.accent, { shadow: 0.5, line: 0.5, gloss: true });
    d.pen.stroke([pt(HEAD.x - 9, HEAD.y + 1.6), pt(HEAD.x - 5.8, HEAD.y + 1.6)], 0.5, m.fitting, 1, false);
  }
}

/** The hard shell's touches (Mk 8–10). */
export function shellTouches(d: Draw, mk: number, shell: readonly Pt[]): void {
  const m = markOf(mk);
  if (mk === 8) {
    const along = Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI * 1.1 + (i / 8) * Math.PI * 0.6;
      return pt(HEAD.x + Math.cos(a) * (R - 0.6), HEAD.y + Math.sin(a) * (R - 0.8));
    });
    d.pen.clipped(shell, () => frost(d, along));
  } else if (mk === 9) {
    d.pen.clipped(shell, () => glowLine(d, [pt(HEAD.x - 1, HEAD.y - R), pt(HEAD.x - 3.2, HEAD.y - 4), pt(HEAD.x - 5.4, HEAD.y + 1.6)], m.accent, 0.45));
  } else if (mk === 10) {
    glow(d.pen.ctx, pt(HEAD.x + 3, HEAD.y - 7), 3, m.accent, 0.4);
    gem(d, pt(HEAD.x + 3, HEAD.y - 7.2), 1.2, m.accent);
  }
}
