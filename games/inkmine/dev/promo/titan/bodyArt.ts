import { cub, oval, pt, type Draw } from '../../../src/art/kit';
import { dab, mix, paint, SHADOW } from '../../../src/art/paint';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { HEAD, helmet } from '../../../src/art/prospector/helmet';
import { R } from '../../../src/art/prospector/helmetMarks';
import { pack } from '../../../src/art/prospector/pack';
import { frost } from '../../../src/art/prospector/parts';
import { leg, torso } from '../../../src/art/prospector/suit';
import type { ProspectorLook } from '../../../src/logic/gear';
import type { Face, Legs } from './story';

/**
 * The prospector's body for this short, from the game's own parts (suit,
 * pack, helmet), without the jetpack, the cell and the drill: it flies by
 * flapping, so its arms are the wings' (wingArt.ts). Same frame and origin
 * as the game's drawing (PROSPECTOR_FRAME, the feet on PROSPECTOR_GROUND).
 */
export const SHOULDER = pt(2, -0.6);
/** The far shoulder, a little behind and above the near one. */
export const FAR_SHOULDER = pt(-0.4, -1.4);

/** Where the face looks: ahead and up in flight, down at the lake in the shock. */
const GAZE: Readonly<Record<Face, Pt>> = { calm: pt(0.8, -0.5), shock: pt(0.5, 1.5) };

function legs(d: Draw, mk: number, pose: Legs): void {
  const g = d.g;
  if (pose === 'fly') {
    leg(d, mk, pt(-3, 6.6), pt(-5.6, g - 2.4), false);
    leg(d, mk, pt(2.4, 6.6), pt(0.2, g - 1), true);
    return;
  }
  leg(d, mk, pt(-3, 6.6), pt(-3.4, g - 2), false);
  leg(d, mk, pt(2.4, 6.6), pt(2.8, g - 2), true);
}

/** Eyes wide with fright and a small "o" of a mouth, over the face inside the glass. */
function shockFace(d: Draw, gaze: Pt): void {
  const c = pt(HEAD.x + 2.4 + gaze.x * 0.9, HEAD.y + 0.8 + gaze.y * 0.8);
  for (const [dx, rx, ry] of [[-0.7, 1.9, 2.3], [3, 1.4, 2]] as const) {
    paint(d, oval(c.x + dx, c.y - 0.4, rx + 0.45, ry + 0.45, 16), '#8ecab6', { alpha: 1, shadow: 0.2, hatch: 0, line: 0 });
    paint(d, oval(c.x + dx, c.y - 0.4, rx, ry, 16), '#1c2140', { alpha: 1, shadow: 0, hatch: 0, line: 0.35, gloss: true });
    // Tiny pupils of light: the stare.
    d.pen.dot(c.x + dx - rx * 0.25, c.y - 0.4 - ry * 0.35, Math.max(0.35, rx * 0.26), PAPER_FILL, 0.95);
  }
  paint(d, oval(c.x + 1.3, c.y + 3.3, 0.75, 0.95, 12), '#3a2030', { alpha: 0.95, shadow: 0, hatch: 0, line: 0.3 });
}

/** The body below the helmet: legs, suit, pack. */
export function drawBody(d: Draw, look: ProspectorLook, pose: Legs): void {
  legs(d, look.suit, pose);
  torso(d, look.suit);
  pack(d, look.pack);
}

/** The helmet with the face in it, drawn over the near wing so a raised wing passes behind the head. */
export function drawHead(d: Draw, look: ProspectorLook, face: Face): void {
  helmet(d, look.helmet, GAZE[face]);
  if (face === 'shock') shockFace(d, GAZE[face]);
}

/** Frost over the body (faded in over it): the glass fogging with rime from its rim, frost on the shoulders and boots. */
export function drawBodyFrost(d: Draw): void {
  const ctx = d.pen.ctx;
  const glass = oval(HEAD.x, HEAD.y, R, R * 0.96, 36);
  d.pen.clipped(glass, () => {
    const g = ctx.createRadialGradient(HEAD.x + 1.5, HEAD.y + 0.5, R * 0.35, HEAD.x, HEAD.y, R);
    g.addColorStop(0, 'rgba(225, 242, 255, 0)');
    g.addColorStop(0.7, 'rgba(225, 242, 255, 0.35)');
    g.addColorStop(1, 'rgba(240, 250, 255, 0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(HEAD.x - R, HEAD.y - R, R * 2, R * 2);
    // Fern-like ice crystals growing in from the rim.
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2 + 0.3;
      const root = pt(HEAD.x + Math.cos(a) * R, HEAD.y + Math.sin(a) * R * 0.96);
      const tip = pt(HEAD.x + Math.cos(a) * R * 0.55, HEAD.y + Math.sin(a) * R * 0.55);
      d.pen.hair([root, tip], 0.28, '#ffffff', 0.9);
      for (let j = 1; j <= 3; j++) {
        const p = pt(root.x + (tip.x - root.x) * (j / 4), root.y + (tip.y - root.y) * (j / 4));
        const s = 1.2 - j * 0.2;
        d.pen.hair([p, pt(p.x + Math.cos(a + 2.4) * s, p.y + Math.sin(a + 2.4) * s)], 0.2, '#ffffff', 0.85);
        d.pen.hair([p, pt(p.x + Math.cos(a - 2.4) * s, p.y + Math.sin(a - 2.4) * s)], 0.2, '#ffffff', 0.85);
      }
    }
  });
  frost(d, [pt(-6.5, -3.3), pt(-4, -3.6), pt(-1.5, -3.8), pt(1, -3.9), pt(3.5, -4), pt(5.5, -3.9)]);
  frost(d, [pt(-6.4, -0.3), pt(-3, -0.6), pt(0, -0.8), pt(3.4, -1), pt(6.4, -1.1)]);
  frost(d, [pt(-7.6, 3), pt(-7.4, 5), pt(-7, 7.6)]);
  for (const x of [-5.6, 0.2]) frost(d, [pt(x - 2.4, 9.5), pt(x - 1, 9.4), pt(x + 0.6, 9.4), pt(x + 2, 9.6)]);
}

/** A puffy quilted coat over the suit, a fleece collar, and a knitted scarf round the neck. */
export const COAT = '#d65a3a';
export const SCARF = '#e7b53c';
export const SCARF_STRIPE = '#3f7f8c';

export function drawCoat(d: Draw): void {
  const body = [pt(-9.2, -4.2), pt(6.6, -4.6), pt(9, 1), pt(8.6, 10.4), pt(-8.4, 10.8), pt(-10, 3)];
  paint(d, body, COAT, { alpha: 0.96, shadow: 0.55, hatch: 0.14, line: 0.6, gloss: true });
  // Quilted rows, each puffed out a little past the outline.
  for (const [y0, y1] of [[-3.8, 0.2], [0.4, 4.4], [4.6, 8.4], [8.6, 10.6]] as const) {
    const row = [
      ...cub(pt(-9.8, y0), pt(-4, y0 - 0.9), pt(3, y0 - 0.9), pt(8.8, y0 + 0.2), 8),
      ...cub(pt(9.2, y1), pt(3, y1 + 0.8), pt(-4, y1 + 0.8), pt(-10, y1), 8),
    ];
    paint(d, row, COAT, { alpha: 0.6, shadow: 0.5, hatch: 0, line: 0.45, gloss: true });
  }
  // The zip down the front.
  d.pen.hair([pt(6.2, -3.6), pt(7.6, 2), pt(7.4, 10)], 0.4, mix(COAT, SHADOW, 0.5), 0.9);
  // A fleece collar up round the helmet's ring.
  const collar = [...cub(pt(-8.4, -2.4), pt(-6, -6.4), pt(4, -7), pt(8.2, -2.8), 10), pt(7.6, -1.4), pt(-7.8, -1)];
  paint(d, collar, '#f1e7d2', { alpha: 1, shadow: 0.4, hatch: 0.1, line: 0.5 });
  d.pen.stipple(collar, 50, () => 0.7, 0.28, mix('#f1e7d2', SHADOW, 0.25));
  // The scarf wound round over it.
  const scarf = [...cub(pt(-8.8, -3.8), pt(-4, -6), pt(4, -6.4), pt(8.8, -4.2), 10), pt(8.6, -1.6), ...cub(pt(8.4, -1.8), pt(4, -3.6), pt(-4, -3.4), pt(-9, -1.4), 10)];
  paint(d, scarf, SCARF, { alpha: 1, shadow: 0.45, hatch: 0.12, line: 0.55 });
  d.pen.clipped(scarf, () => {
    for (const x of [-6, -1.5, 3, 7]) d.pen.fill([pt(x - 0.8, -7), pt(x + 0.8, -7), pt(x + 0.8, 0), pt(x - 0.8, 0)], SCARF_STRIPE, 0.85);
  });
  // A knot hanging at the throat.
  const knot = [pt(5.6, -3.4), pt(9, -3), pt(9.4, 2.4), pt(7.6, 4.2), pt(5.8, 1.6)];
  paint(d, knot, SCARF, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.5 });
  d.pen.clipped(knot, () => d.pen.fill([pt(5, 0.4), pt(10, 0.4), pt(10, 1.6), pt(5, 1.6)], SCARF_STRIPE, 0.85));
  dab(d, oval(-4, -2, 3, 1, 10), '#fff2d8', 0.25, 0.4);
}
