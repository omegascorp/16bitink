import type { Piece } from '../logic/gear';
import { drawAsterGear } from './aster/gear';
import { drawAsterPulse } from './aster/weapon';
import { cub, edge, oval, pt, ribbon, tint, type Draw } from './kit';
import { HIGHLIGHT } from './palette';
import { dab, mix, paint, SHADOW } from './paint';
import { drawTech, TECH_FRAME } from './techArt';
import { drawTidesingerGear } from './tidesinger/gear';

/**
 * A broken part in the world (spec, "Gear"): somebody's old gear piece of
 * mark `mk` (its blueprint's), drawn as the technology slot draws that
 * mark, or for Mycel's (Mk 2) as the Aster's own equipment it really is
 * (aster/gear.ts), or for Brine's (Mk 3) as the Tidesingers' own tools
 * (tidesinger/gear.ts), but tipped over, half sunk in grey dust, cracked and
 * scorched; Brine's lie on the seabed instead, half sunk in silt, filmed
 * with purple slime, weed growing up round them. Each kind tips its own way, so a drill
 * and a cell lying side by side don't look stamped out. A faint highlighter
 * pool sits under it, as under anything you can take. Fits WRECK_FRAME
 * units, origin at the centre.
 */
export const WRECK_FRAME = TECH_FRAME;

const DUST = '#8f8d8a';

/** What a broken part lies in: the dust it's sunk in and its broken-off bit; on a seabed, silt, slime and weed. */
interface Ground {
  readonly drift: string;
  readonly bit: string;
  readonly sea: boolean;
}
const DUSTY: Ground = { drift: mix(DUST, '#d8d3c8', 0.4), bit: '#b9c0c8', sea: false };
/** Brine's seabed: grey-violet silt, a chip of shell broken off. */
const SEABED: Ground = { drift: '#b2ab99', bit: '#ece0cd', sea: true };
/** The purple of Brine's microbes, as slime and weed. */
const SLIME = '#7b4a98';
const WEED = ['#8a4a86', '#5f3b74', '#9b5a7a'] as const;
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
/** The mark whose broken parts are the Tidesingers' own tools, lying on Brine's seabed. */
const TIDE_MK = 3;

export function drawWreck(d: Draw, piece: Piece, mk: number): void {
  const draw = (): void => {
    if (mk === ASTER_MK) drawAsterGear(d, piece);
    else if (mk === TIDE_MK) drawTidesingerGear(d, piece);
    else drawTech(d, { kind: 'gear', piece }, mk);
  };
  lying(d, LIE[piece], draw, mk === TIDE_MK ? SEABED : DUSTY);
}

/** Slime over a sunk part, only where the part is: blotches of purple film, heavier low down, with specks in it. */
function slime(d: Draw): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (const [x, y, rx, ry] of [[-7, 4, 6, 3.4], [5, 2, 5, 2.6], [-1, -3, 3.4, 2], [9, -6, 2.6, 1.8], [-10, -4, 2.4, 1.6]] as const) dab(d, oval(x, y, rx, ry, 16), SLIME, 0.45, 1);
  dab(d, oval(1, 8, 16, 5, 20), mix(SLIME, SEABED.drift, 0.3), 0.45, 2);
  d.pen.stipple(oval(0, 3, 14, 7, 20), 70, () => 0.6, 0.3, mix(SLIME, SHADOW, 0.4));
  ctx.restore();
}

/** Weed growing up out of the silt round a sunk part: wavy purple fronds rooted where the silt will cover them, tall ones `behind` the part, short ones in front. */
function weed(d: Draw, behind: boolean): void {
  const fronds: readonly [number, number, number, number][] = behind
    ? [[-14.4, -2.6, 17, 2.2], [-11.8, 2.4, 13, 1.7], [13.6, 3.4, 16, 2], [15.6, -1.6, 11, 1.5]]
    : [[-8.4, -2, 7, 1.5], [9.4, 2.2, 6.4, 1.4]];
  fronds.forEach(([x, lean, h, w], i) => {
    const base = pt(x, 11);
    const spine = cub(base, pt(x + lean * 0.2 - 1.2, 11 - h * 0.35), pt(x + lean * 0.7 + 1.4, 11 - h * 0.7), pt(x + lean, 11 - h), 12);
    const frond = ribbon(spine, (u) => w * (1 - u * 0.75) * (0.8 + 0.4 * Math.sin(u * 9 + i)));
    paint(d, frond.shape, WEED[i % WEED.length]!, { alpha: 0.95, shadow: 0.35, hatch: 0, line: 0.45 });
    d.pen.hair(spine.slice(1, -2), 0.25, mix(WEED[i % WEED.length]!, '#f0d8ee', 0.5), 0.6);
  });
}

/** The Aster's broken resonator by their wreck (the pulse's design), lying as their gear does. */
export function drawPulseWreck(d: Draw): void {
  lying(d, { tip: -0.4, sink: 4 }, () => drawAsterPulse(d));
}

/** A broken thing lying as `lie` says: tipped, grimed and cracked, half sunk in dust (or silt, slimed, weed round it), a bit broken off beside it. */
function lying(d: Draw, lie: { readonly tip: number; readonly sink: number }, drawPart: () => void, ground: Ground = DUSTY): void {
  const ctx = d.pen.ctx;
  // What's left to find: a faint highlighter pool, like any pickup (under water, laid in last, beneath, so the slime can't tint it).
  const pool = (): void => tint(d, oval(0, 9, 16, 6, 24), HIGHLIGHT, 0.35);
  if (!ground.sea) pool();
  if (ground.sea) weed(d, true);
  ctx.save();
  ctx.translate(0, lie.sink * 0.4);
  ctx.rotate(lie.tip);
  ctx.scale(0.86, 0.86);
  drawPart();
  if (ground.sea) {
    // Age under water: silt settled on it, and the purple film of Brine's microbes.
    slime(d);
  } else {
    // Age: soot and grime washed over the whole part, heavier low down.
    dab(d, oval(2, 6, 15, 10, 20), mix(SHADOW, DUST, 0.5), 0.32, 2);
  }
  crack(d, -6, -6, 11, 0.9);
  crack(d, 4, -2, 8, 2.2);
  ctx.restore();
  if (ground.sea) weed(d, false);
  // Half sunk: a drift of dust over its lower edge, inked along its top.
  const drift = [pt(-17, 12), pt(-12, 9 - lie.sink * 0.5), pt(-4, 8 - lie.sink * 0.6), pt(5, 8.6 - lie.sink * 0.5), pt(13, 9.4), pt(17, 12), pt(17, 15), pt(-17, 15)];
  d.pen.fill(drift, ground.drift, 0.95);
  if (ground.sea) {
    d.pen.stipple(drift, 90, (_, y) => (y > 10 ? 0.7 : 0.3), 0.3, mix(ground.drift, SHADOW, 0.35));
    // Mats of purple slime on the silt.
    for (const [x, rx] of [[-9, 3.4], [3, 4.4], [11, 2.4]] as const) dab(d, oval(x, 10.4, rx, 1.1, 14), SLIME, 0.4, 0.6);
  }
  dab(d, oval(0, 13, 16, 3, 18), SHADOW, 0.18, 1.5);
  edge(d, drift.slice(0, 6), 0.9, 0.85);
  // A broken-off bit lying beside it.
  const bit = [pt(11, 7.6), pt(14.4, 6.8), pt(15, 9), pt(11.6, 9.6)];
  d.pen.fill(bit, ground.bit, 1);
  edge(d, [...bit, bit[0]!], 0.7);
  if (ground.sea) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    pool();
    ctx.restore();
  }
}
