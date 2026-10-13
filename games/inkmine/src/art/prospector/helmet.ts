import type { Look } from '../../logic/gear';
import { edge, shade, skin, tint, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { oval, part, pt, rivets, roundRect, sheen, WASH } from './parts';

/**
 * The helmet, in three looks, with the prospector's face inside:
 * 0, a glass fishbowl on a bolted collar, a clip-on lamp, a stub antenna;
 * 1, the fishbowl in a protective cage, twin lamps on the cage's top bar,
 *    a radio with a whip antenna and an ear-piece;
 * 2, a hard shell with a wide tinted visor, a lamp strip over it and a
 *    sensor fin.
 * `look` is where the face looks (the drill's direction).
 */
export const HEAD = pt(1, -11);
const R = 8.6;

/** Skin, washed in under the glass. */
const SKIN = '#efd2b8';
const HAIR = '#8a6a4f';

/** The head inside the glass: a round face, a tuft of hair, an ear. */
function head(d: Draw, look: Pt): void {
  const c = pt(HEAD.x + 1 + look.x * 0.4, HEAD.y + 1.2 + look.y * 0.3);
  const skull = oval(c.x, c.y, 6.2, 6, 22);
  part(d, skull, SKIN, { shadow: 0.25, line: 0.9, alpha: 0.65 });
  const tuft = [pt(c.x - 6, c.y - 1.4), pt(c.x - 4.6, c.y - 5.6), pt(c.x - 0.6, c.y - 6.8), pt(c.x + 3.4, c.y - 5.8), pt(c.x + 1.4, c.y - 4.2), pt(c.x - 2.6, c.y - 3.6), pt(c.x - 4.4, c.y - 1)];
  part(d, tuft, HAIR, { shadow: 0, line: 0.8, alpha: 0.55 });
  const ear = oval(c.x - 3.6, c.y + 0.6, 1.3, 1.7, 10);
  part(d, ear, SKIN, { shadow: 0, line: 0.7, alpha: 0.7 });
}

function face(d: Draw, look: Pt, dim: boolean): void {
  const c = pt(HEAD.x + 2.6 + look.x, HEAD.y + 1 + look.y);
  const a = dim ? 0.45 : 1;
  // Eyes with a glint, brows, a small mouth, a few freckles.
  for (const dx of [-1.6, 1.6]) {
    d.pen.dot(c.x + dx, c.y, 0.95, d.ink, a);
    if (!dim) d.pen.dot(c.x + dx + 0.3, c.y - 0.35, 0.3, PAPER_FILL, 0.9);
    d.pen.hair([pt(c.x + dx - 0.9, c.y - 1.9), pt(c.x + dx + 0.8, c.y - 2.1)], 0.45, d.ink, 0.7 * a);
  }
  d.pen.stroke([pt(c.x - 0.8, c.y + 2.2), pt(c.x + 0.1, c.y + 2.6), pt(c.x + 1, c.y + 2.2)], 0.5, d.ink, 0.8 * a, false);
  if (!dim) for (const [fx, fy] of [[-2.6, 1.1], [-2.1, 1.6], [2.6, 1.3]] as const) d.pen.dot(c.x + fx, c.y + fy, 0.25, d.ink, 0.5);
}

function collar(d: Draw, look: Look): void {
  const ring = [pt(-6.2, -2.8), pt(6.6, -3.3), pt(6.9, -0.6), pt(-6.3, -0.1)];
  part(d, ring, look === 2 ? WASH.armour : WASH.metal, { shadow: 0.3, line: 1 });
  if (look < 2) rivets(d, [pt(-4.2, -1.5), pt(0, -1.7), pt(4.2, -1.8)], 0.4);
}

function bubble(d: Draw, gaze: Pt): void {
  const glass = oval(HEAD.x, HEAD.y, R, R * 0.96, 30);
  skin(d, glass, WASH.glass, 0.45);
  head(d, gaze);
  face(d, gaze, false);
  // The glass over the face: a faint tint so the head reads as behind it.
  tint(d, glass, WASH.glass, 0.18);
  shade(d, glass, 0.22);
  edge(d, glass, 1.4);
  sheen(d, [pt(HEAD.x - 5.6, HEAD.y - 3.8), pt(HEAD.x - 3.6, HEAD.y - 6.4), pt(HEAD.x - 0.6, HEAD.y - 7.6)], 1.2);
  d.pen.dot(HEAD.x + 5.2, HEAD.y - 4.6, 0.6, PAPER_FILL, 0.9);
}

function lamp(d: Draw, at: Pt, s = 1): void {
  const body = roundRect(at.x - 1.8 * s, at.y - 1.4 * s, at.x + 1.6 * s, at.y + 1.4 * s, 0.5);
  part(d, body, WASH.metal, { shadow: 0, line: 0.8 });
  const lens = oval(at.x + 2 * s, at.y, 0.9 * s, 1.3 * s, 10);
  skin(d, lens, '#f1ecc8', 0.8);
  edge(d, lens, 0.6);
}

export function helmet(d: Draw, look: Look, gaze: Pt): void {
  collar(d, look);
  if (look === 0) {
    // Stub antenna at the back, the fishbowl, a lamp clipped on the front.
    d.pen.stroke([pt(HEAD.x - 5.5, HEAD.y - 6), pt(HEAD.x - 7.5, HEAD.y - 10)], 0.9, d.ink, 0.95, false);
    d.pen.dot(HEAD.x - 7.6, HEAD.y - 10.4, 0.9, d.ink);
    bubble(d, gaze);
    lamp(d, pt(HEAD.x + 4.2, HEAD.y - 8.6));
    return;
  }
  if (look === 1) {
    // Whip antenna and a comm unit over the ear.
    d.pen.stroke([pt(HEAD.x - 6.5, HEAD.y - 3), pt(HEAD.x - 9.5, HEAD.y - 14), pt(HEAD.x - 10.2, HEAD.y - 17)], 0.7, d.ink, 0.95, false);
    d.pen.dot(HEAD.x - 10.3, HEAD.y - 17.4, 0.8, d.ink);
    bubble(d, gaze);
    // The cage: two bars over the glass.
    for (const k of [-0.35, 0.3]) {
      const bar: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i / 12) * Math.PI;
        bar.push(pt(HEAD.x + Math.cos(a) * R * 1.03 + k * 3 * Math.sin(a), HEAD.y + Math.sin(a) * R * 1.03));
      }
      d.pen.stroke(bar, 1.2, d.ink, 0.9, false);
    }
    const ear = oval(HEAD.x - 4.6, HEAD.y + 2.2, 2.2, 2.6, 12);
    part(d, ear, WASH.darkMetal, { shadow: 0, line: 0.9, alpha: 0.6 });
    lamp(d, pt(HEAD.x - 1, HEAD.y - 10.2), 0.85);
    lamp(d, pt(HEAD.x + 4.4, HEAD.y - 8.4), 0.85);
    return;
  }
  // Deep-space: a hard shell with a tinted visor.
  const fin = [pt(HEAD.x - 4, HEAD.y - 7.6), pt(HEAD.x - 9, HEAD.y - 12.5), pt(HEAD.x - 7.6, HEAD.y - 6.4)];
  part(d, fin, WASH.armour, { shadow: 0, line: 0.9 });
  const shell = oval(HEAD.x, HEAD.y, R * 1.02, R, 30);
  part(d, shell, WASH.armour, { shadow: 0.4, cross: true, line: 1.5 });
  const visor = [pt(HEAD.x - 1.6, HEAD.y - 4.8), pt(HEAD.x + 7.4, HEAD.y - 4.2), pt(HEAD.x + 8.6, HEAD.y + 0.6), pt(HEAD.x + 6.4, HEAD.y + 4.6), pt(HEAD.x - 0.6, HEAD.y + 4.2), pt(HEAD.x - 2.4, HEAD.y)];
  skin(d, visor, WASH.visor, 0.28);
  d.pen.clipped(visor, () => head(d, pt(gaze.x * 0.6 + 1.2, gaze.y * 0.6)));
  face(d, pt(gaze.x * 0.6, gaze.y * 0.6), false);
  // The tint over the face: you can see who's inside, just.
  tint(d, visor, WASH.visor, 0.3);
  edge(d, visor, 1.1);
  sheen(d, [pt(HEAD.x + 0.4, HEAD.y - 3.4), pt(HEAD.x + 4.6, HEAD.y - 3.2)], 0.9);
  sheen(d, [pt(HEAD.x + 6.2, HEAD.y - 2), pt(HEAD.x + 7, HEAD.y + 0.6)], 0.6);
  // Lamp strip over the visor.
  const strip = [pt(HEAD.x - 0.6, HEAD.y - 6.4), pt(HEAD.x + 6.6, HEAD.y - 5.8), pt(HEAD.x + 6.4, HEAD.y - 5), pt(HEAD.x - 0.8, HEAD.y - 5.6)];
  skin(d, strip, '#f1ecc8', 0.85);
  edge(d, strip, 0.6);
}
