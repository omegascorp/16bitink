import { furEdge, glaze } from '../../../src/art/critters/preyKit';
import { cub, type Draw, oval, pt } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import { BEAR, claw, paintFur, strays } from './bearKit';

/**
 * The sun bear's back half, side on, rump to the left, going head first into
 * the python's mouth to the right (the jaws' rim stands at x ≈ 100; the body
 * runs on under the stretched neck past it): a round, glossy black rump, the
 * haunch, the stubby tail; and, as their own sprite so they can swing, the
 * hind legs hanging from the hips with the bare pale soles and long claws.
 * Cartoon-tasteful: no face, no wound, just the back end.
 */

export const RUMP_HIP_NEAR: Pt = pt(-66, 62);
export const RUMP_HIP_FAR: Pt = pt(-14, 74);

export const RUMP_OUTLINE: readonly Pt[] = [
  ...cub(pt(170, -102), pt(110, -106), pt(30, -108), pt(-70, -97), 16),
  ...cub(pt(-70, -97), pt(-116, -88), pt(-142, -52), pt(-144, -8), 12).slice(1),
  ...cub(pt(-144, -8), pt(-145, 40), pt(-122, 80), pt(-86, 96), 12).slice(1),
  ...cub(pt(-86, 96), pt(-40, 110), pt(70, 110), pt(170, 104), 16).slice(1),
];

/** The tail: a short round stub of fur low on the rump. */
const TAIL: readonly Pt[] = [
  ...cub(pt(-138, -44), pt(-150, -50), pt(-162, -42), pt(-160, -30), 8),
  ...cub(pt(-160, -30), pt(-158, -18), pt(-146, -14), pt(-138, -20), 8).slice(1),
];

/** Hair runs back towards the rump and wraps down over it. */
const rumpCoat = (p: Pt): number => Math.PI - 0.25 - 0.55 * Math.max(0, Math.min(1, (-50 - p.x) / 90)) * Math.sign(p.y + 20);

function drawRump(d: Draw): void {
  const { pen } = d;
  paintFur(d, TAIL, { lights: [[-152, -38, 10, 8, 0]], dir: () => Math.PI + 0.6, hairs: 90, len: 4, seed: 7101, line: 1.2 });
  paintFur(d, RUMP_OUTLINE, {
    lights: [[-78, -66, 70, 34, -0.5], [30, -86, 110, 20, 0], [-120, -20, 18, 40, 0.2]],
    dir: rumpCoat, hairs: 5200, len: 5.5, seed: 7102,
  });
  // The haunch: a soft fold of the thigh over the flank.
  pen.clipped(RUMP_OUTLINE, () => {
    glaze(d, -50, 30, 46, 40, 0.3, BEAR.sheen, 0.22);
    glaze(d, -20, 70, 60, 26, 0, BEAR.line, 0.6);
  });
  pen.hair(cub(pt(-28, -40), pt(-6, -6), pt(-8, 40), pt(-30, 84), 14), 0.9, BEAR.line, 0.85);
  pen.hair(cub(pt(-27, -38), pt(-8, -6), pt(-10, 38), pt(-31, 82), 14), 0.5, BEAR.sheen, 0.4);
  strays(d, RUMP_OUTLINE.slice(10, 48), 7103, 4);
}

export const BEAR_RUMP: SpriteArt<'rump'> = { frame: 360, res: 4, poses: ['rump'], draw: drawRump };

/** A hind leg hanging from the hip (the origin): the lower thigh, the shank, the bare sole turned out with its pad and toes, and the claws. */
function drawLeg(d: Draw, pose: 'near' | 'far'): void {
  const { pen } = d;
  const leg: Pt[] = [
    ...cub(pt(-28, -14), pt(-30, 16), pt(-26, 40), pt(-22, 62), 12),
    ...cub(pt(-22, 62), pt(-20, 70), pt(-10, 72), pt(4, 70), 6).slice(1),
    ...cub(pt(4, 70), pt(16, 50), pt(26, 20), pt(26, -14), 12).slice(1),
  ];
  paintFur(d, leg, { lights: [[-12, 10, 16, 40, 0.1]], dir: () => Math.PI / 2 + 0.15, hairs: 900, len: 4.5, seed: 7201 + (pose === 'far' ? 50 : 0), line: 1.3 });
  // The foot, sole turned out to us: the bare pad, five toes, the claws curling down.
  const sole: Pt[] = [
    ...cub(pt(-24, 58), pt(-34, 70), pt(-34, 92), pt(-20, 100), 10),
    ...cub(pt(-20, 100), pt(-4, 106), pt(14, 96), pt(14, 78), 10).slice(1),
    ...cub(pt(14, 78), pt(14, 64), pt(-12, 52), pt(-24, 58), 10).slice(1),
  ];
  pen.fill(sole, BEAR.black, 1);
  const pad = oval(-8, 82, 16, 12, 22);
  pen.fill(pad, BEAR.sole, 1);
  pen.clipped(pad, () => {
    glaze(d, -12, 78, 10, 7, 0, '#d8c0ad', 0.8);
    glaze(d, -2, 90, 14, 6, 0, BEAR.soleDeep, 0.7);
  });
  pen.stroke([...pad, pad[0]!], 0.8, BEAR.line, 0.9, false);
  const toes = [pt(-26, 98), pt(-16, 104), pt(-4, 106), pt(8, 102), pt(15, 93)];
  toes.forEach((c, i) => {
    const toe = oval(c.x, c.y, 4.6, 4, 12);
    pen.fill(toe, BEAR.sole, 1);
    pen.clipped(toe, () => glaze(d, c.x + 1, c.y + 1.5, 3.4, 2.4, 0, BEAR.soleDeep, 0.7));
    pen.stroke([...toe, toe[0]!], 0.6, BEAR.line, 0.9, false);
    claw(d, pt(c.x - 1 + i * 0.4, c.y + 3.4), Math.PI / 2 + 0.5 - i * 0.22, 15);
  });
  furEdge(d, sole.slice(0, 12), 1.1, 7202, 2, 1.6, 0.8);
  if (pose === 'far') pen.fill([...leg, ...sole], BEAR.line, 0.32);
  // The top melts into the haunch it hangs from.
  const { ctx } = pen;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(0, -16, 0, 6);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-40, -30, 80, 36);
  ctx.restore();
}

export const BEAR_LEG: SpriteArt<'near' | 'far'> = { frame: 230, res: 4, poses: ['near', 'far'], draw: drawLeg };
