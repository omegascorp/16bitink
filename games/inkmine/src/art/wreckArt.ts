import type { Piece } from '../logic/gear';
import { drawAsterGear } from './aster/gear';
import { drawAsterPulse } from './aster/weapon';
import { edge, oval, pt, tint, type Draw } from './kit';
import { HIGHLIGHT } from './palette';
import { dab, mix, SHADOW } from './paint';
import { drawTech, TECH_FRAME } from './techArt';

/**
 * A broken part in the world (spec, "Gear"): somebody's old gear piece of
 * mark `mk` (its blueprint's), drawn as the technology slot draws that
 * mark, or for Mycel's (Mk 2) as the Aster's own equipment it really is
 * (aster/gear.ts), but tipped over, half sunk in grey dust, cracked and
 * scorched. Each kind tips its own way, so a drill
 * and a cell lying side by side don't look stamped out. A faint highlighter
 * pool sits under it, as under anything you can take. Fits WRECK_FRAME
 * units, origin at the centre.
 */
export const WRECK_FRAME = TECH_FRAME;

const DUST = '#8f8d8a';
/** How each part lies: tipped this far (radians) and sunk this deep (units). */
const LIE: Readonly<Record<Piece, { readonly tip: number; readonly sink: number }>> = {
  drill: { tip: 0.5, sink: 3 },
  cell: { tip: -0.8, sink: 5 },
  pack: { tip: 0.35, sink: 6 },
  suit: { tip: -0.25, sink: 8 },
  helmet: { tip: 0.6, sink: 6 },
  jetpack: { tip: -0.55, sink: 5 },
};

/** A crack: a zigzag hairline in ink, with a pale lip beside it. */
function crack(d: Draw, x: number, y: number, len: number, dir: number): void {
  const pts = [pt(x, y)];
  for (let k = 1; k <= 4; k++) pts.push(pt(x + Math.cos(dir) * (len * k) / 4 + (k % 2 ? 1.2 : -1.2), y + Math.sin(dir) * (len * k) / 4));
  d.pen.hair(pts, 0.6, d.ink, 0.9);
  d.pen.hair(pts.map((p) => pt(p.x + 0.6, p.y + 0.5)), 0.4, '#f1ece0', 0.6);
}

/** The mark whose broken parts are the Aster's own gear, not ours. */
const ASTER_MK = 2;

export function drawWreck(d: Draw, piece: Piece, mk: number): void {
  lying(d, LIE[piece], () => (mk === ASTER_MK ? drawAsterGear(d, piece) : drawTech(d, { kind: 'gear', piece }, mk)));
}

/** The Aster's broken resonator by their wreck (the pulse's design), lying as their gear does. */
export function drawPulseWreck(d: Draw): void {
  lying(d, { tip: -0.4, sink: 4 }, () => drawAsterPulse(d));
}

/** A broken thing lying as `lie` says: tipped, grimed and cracked, half sunk in dust, a bit broken off beside it. */
function lying(d: Draw, lie: { readonly tip: number; readonly sink: number }, drawPart: () => void): void {
  const ctx = d.pen.ctx;
  // What's left to find: a faint highlighter pool, like any pickup.
  tint(d, oval(0, 9, 16, 6, 24), HIGHLIGHT, 0.35);
  ctx.save();
  ctx.translate(0, lie.sink * 0.4);
  ctx.rotate(lie.tip);
  ctx.scale(0.86, 0.86);
  drawPart();
  // Age: soot and grime washed over the whole part, heavier low down.
  dab(d, oval(2, 6, 15, 10, 20), mix(SHADOW, DUST, 0.5), 0.32, 2);
  crack(d, -6, -6, 11, 0.9);
  crack(d, 4, -2, 8, 2.2);
  ctx.restore();
  // Half sunk: a drift of dust over its lower edge, inked along its top.
  const drift = [pt(-17, 12), pt(-12, 9 - lie.sink * 0.5), pt(-4, 8 - lie.sink * 0.6), pt(5, 8.6 - lie.sink * 0.5), pt(13, 9.4), pt(17, 12), pt(17, 15), pt(-17, 15)];
  d.pen.fill(drift, mix(DUST, '#d8d3c8', 0.4), 0.95);
  dab(d, oval(0, 13, 16, 3, 18), SHADOW, 0.18, 1.5);
  edge(d, drift.slice(0, 6), 0.9, 0.85);
  // A broken-off bit lying beside it.
  const bit = [pt(11, 7.6), pt(14.4, 6.8), pt(15, 9), pt(11.6, 9.6)];
  d.pen.fill(bit, '#b9c0c8', 1);
  edge(d, [...bit, bit[0]!], 0.7);
}
