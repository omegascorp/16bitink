import { cub, oval, pt, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { pulseTool } from '../prospector/pulse';
import { hexGlass, lash, rib, shell } from './gear';
import { ASTER, starGlyph } from './style';

/**
 * The pulse: the Aster's weapon, a resonator worn on the wrist that throws
 * a ring of teal force. Theirs is a ribbed ceramic cuff with a bell on its
 * back, eight petals round the bell's mouth and a hexagon of glass in its
 * throat, where the ring is rung. Studied, the printer builds our own
 * (prospector/pulse.ts). The pictures fit a frame of 40 units, origin at
 * the centre, as a technology slot's do; the shot is its own small frame.
 */
export const SHOT_ART = { w: 24, h: 24, ox: 12, oy: 12 } as const;

/** The bell's eight petals round its mouth, seen side on; `missing` is the one snapped off. */
function petals(d: Draw, mouth: Pt, rx: number, ry: number, missing: number): void {
  for (let k = 0; k < 8; k++) {
    if (k === missing) continue;
    const a = (k / 8) * Math.PI * 2;
    const base = pt(mouth.x + Math.cos(a) * rx * 0.3, mouth.y + Math.sin(a) * ry);
    const tip = pt(base.x + 4.6 + Math.cos(a) * 1.2, base.y + Math.sin(a) * 3.4);
    const n = pt(-Math.sin(a) * 1.4, Math.cos(a) * 0.9);
    const petal = [pt(base.x + n.x, base.y + n.y), ...cub(pt(base.x + n.x, base.y + n.y), pt(tip.x - 1 + n.x, tip.y + n.y), tip, tip, 4), ...cub(tip, tip, pt(tip.x - 1 - n.x, tip.y - n.y), pt(base.x - n.x, base.y - n.y), 4)];
    paint(d, petal, k % 2 ? mix(ASTER.shell, ASTER.glaze, 0.45) : ASTER.shell, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
  }
}

/** The Aster's own pulse, as it lies broken on Mycel: the cuff cracked, a petal snapped off beside it, a cord frayed loose, the glass barely lit. */
export function drawAsterPulse(d: Draw): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(-1, 1.5);
  ctx.scale(0.88, 0.88);
  ctx.rotate(-0.18);
  // The cuff: a ribbed ceramic sleeve, open underneath where the wrist goes.
  const cuff = [pt(-15, -6), ...cub(pt(-15, -6), pt(-6, -9.6), pt(4, -9.6), pt(10, -7.4), 8), pt(11, 7.4), ...cub(pt(11, 7.4), pt(4, 9.6), pt(-6, 9.6), pt(-15, 6), 8), ...cub(pt(-15, 6), pt(-17, 2), pt(-17, -2), pt(-15, -6), 4)];
  shell(d, cuff, 8);
  for (const x of [-10, -5, 0, 5]) rib(d, pt(x, -8.8), pt(x, 8.8), 1.4);
  // The open wrist end, dark inside.
  const wrist = oval(-15.4, 0, 2.6, 6, 14);
  paint(d, wrist, '#2a2238', { alpha: 1, shadow: 0, hatch: 0, line: 0.6 });
  lash(d, pt(-12, -8), pt(-12, 8), 2);
  // The frayed end of a cord, hanging loose.
  d.pen.stroke([pt(-12, 8), pt(-13.4, 12), pt(-11.6, 15)], 1.1, ASTER.cord, 1, false);
  for (const dx of [-0.8, 0, 0.9]) d.pen.hair([pt(-11.6, 15), pt(-11.6 + dx * 1.6, 16.8)], 0.35, ASTER.cord, 0.9);
  starGlyph(d, pt(-4, 3.2), 2.6, ASTER.cord);
  // The bell over the front of the cuff, opening forward, its petals round the mouth.
  const bell = [pt(2, -6), ...cub(pt(2, -6), pt(8, -8), pt(12, -11.5), pt(15, -12), 6), pt(15, 4), ...cub(pt(15, 4), pt(12, 3.4), pt(8, 0), pt(2, -1), 6)];
  shell(d, bell, 2);
  for (const x of [6, 10]) rib(d, pt(x, -8.6 - (x - 6) * 0.5), pt(x, 0.6 + (x - 6) * 0.3), 0.6);
  petals(d, pt(15, -4), 4, 7.4, 2);
  const mouth = oval(15.4, -4, 2.6, 7, 16);
  paint(d, mouth, '#2a2238', { alpha: 1, shadow: 0, hatch: 0, line: 0.6 });
  hexGlass(d, pt(15.2, -4), 2.6, false);
  glow(ctx, pt(15.2, -4), 5, ASTER.glow, 0.25 + d.f * 0.05);
  // The crack: across the cuff and up into the bell, with a chip lost from its edge.
  const crack = [pt(-1, 9.4), pt(0.6, 5), pt(-0.6, 2.4), pt(1.8, -1.6), pt(3.4, -4.6), pt(2.6, -7)];
  d.pen.stroke(crack, 0.75, d.ink, 0.95, false);
  d.pen.hair(crack.map((p) => pt(p.x + 0.6, p.y + 0.3)), 0.4, PAPER_FILL, 0.6);
  dab(d, oval(1, 6, 2, 3, 10), SHADOW, 0.25, 0.8);
  ctx.restore();
  // The snapped-off petal, lying below.
  const fallen = [pt(4, 14.6), pt(9, 12.6), pt(11.6, 13.4), pt(8.4, 15.8)];
  paint(d, fallen, ASTER.shell, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
  dab(d, oval(4, 17, 16, 1.6, 16), SHADOW, 0.16, 1);
}

/** Our pulse for the tool slot: printed to our silhouette from what the Aster's taught (prospector/pulse.ts). */
export function drawPulseTool(d: Draw): void {
  pulseTool(d);
}

/** The shot: a ring of teal force seen edge on, a bright crescent travelling right, two fading echoes behind it. Centre origin. */
export function drawPulseShot(d: Draw): void {
  const { ctx } = d.pen;
  glow(ctx, pt(1, 0), 12, ASTER.glow, 0.4);
  const crescent = (cx: number, r: number, t: number): Pt[] => {
    const outer: Pt[] = [];
    const inner: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = -1.25 + (i / 14) * 2.5;
      outer.push(pt(cx + Math.cos(a) * r, Math.sin(a) * r));
      inner.push(pt(cx - t + Math.cos(a) * (r - t * 0.2), Math.sin(a) * (r - t * 0.25)));
    }
    return [...outer, ...inner.reverse()];
  };
  // The echoes: thinner, fainter, further behind.
  for (const [cx, alpha] of [[-7, 0.35], [-3.6, 0.6]] as const) {
    const echo = crescent(cx, 7.6, 1.2);
    dab(d, echo, ASTER.glow, alpha, 0.6);
    d.pen.hair(echo.slice(0, 15), 0.4, '#e9fff8', alpha);
  }
  const ring = crescent(-1, 9, 3);
  paint(d, ring, ASTER.glow, { alpha: 1, shadow: 0.25, hatch: 0, line: 0.55, gloss: true });
  glow(ctx, pt(6.4, 0), 5, '#e9fff8', 0.6);
  gleam(d, ring.slice(2, 13).map((p) => pt(p.x - 1.1, p.y * 0.95)), 1, 0.95);
  for (const [x, y] of [[-9, -6], [-10, 3], [-6, 7.4], [-8, -1]] as const) d.pen.dot(x, y, 0.45, ASTER.glow, 0.8);
}
