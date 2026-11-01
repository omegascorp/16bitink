import { ART_RES, INK } from './palette';
import { makeCanvas, Pen, type Pt } from './pen';
import { SAND, SAND_DARK, SAND_LIGHT } from './tomb';
import { carveGlyph, type Glyph } from './tombGlyphs';
import { mix, rgba } from './wash';

/**
 * The Desert Tomb's plates and the doors they work, so the board reads at a
 * glance: each plate has a symbol carved into it and painted in its own
 * tint (ankh, scarab, eye, feather), and every door it works has the same
 * symbol cut into its face. Nothing here is gold or ringed: only pins are.
 * A plate is a stone slab set level with its floor, with a row of weight
 * notches either side of its symbol that light as weight lands on it; full,
 * it sinks and its symbol glows. A door is a heavy carved slab sliding in a
 * stone frame. An inverse door (open while its plate is up) has its symbol
 * struck through.
 */

export type { Glyph } from './tombGlyphs';

export interface PlateMark {
  readonly glyph: Glyph;
  /** The symbol's paint, carved and dim while the plate is up. */
  readonly tint: string;
  /** Its light while the plate is down (and the groove's glow). */
  readonly glow: string;
}

/**
 * In order of a level's `plates`. Levels name their plates by these (the
 * Burial Gold's ankh pit, scarab pit and eye closet). No gold or amber:
 * that is the pins' colour.
 */
export const PLATE_MARKS: readonly PlateMark[] = [
  { glyph: 'ankh', tint: '#3c6fc4', glow: '#a6d2ff' },
  { glyph: 'scarab', tint: '#23917a', glow: '#8ff0c4' },
  { glyph: 'eye', tint: '#b8487e', glow: '#ffa8d0' },
  { glyph: 'feather', tint: '#7a55c2', glow: '#d6c2ff' },
];

/** The mark of a level's plate, by its index in `plates`. */
export const plateMark = (i: number): PlateMark => PLATE_MARKS[((i % PLATE_MARKS.length) + PLATE_MARKS.length) % PLATE_MARKS.length]!;

/** The slab's top, from the plate's `y` (just under the floor's surface), and its depth (px). */
export const PLATE_TOP = -6;
export const PLATE_SLAB = 20;
/** How far a pressed plate sinks (px); weight short of its need sinks it up to PLATE_GIVE. */
export const PLATE_SINK = 4;
export const PLATE_GIVE = 1.5;
/** The socket picture's padding: the plate's left end sits PLATE_PX in, the slab's top PLATE_PT down. */
export const PLATE_PX = 7;
export const PLATE_PT = 4;
/** The slab picture's padding all round (px). */
export const SLAB_PAD = 3;
/** The symbol's centre below the plate's `y`. */
export const PLATE_GLYPH_DY = PLATE_TOP + PLATE_SLAB / 2;
/** A weight notch: its width and height (px), and the gap between notches. */
export const NOTCH_W = 2.6;
export const NOTCH_H = 9;
const NOTCH_STEP = 5;
/** Notches per side, at most. */
const NOTCHES_MAX = 4;

/** The symbol's half-height on a plate `w` wide: smaller on a narrow plate, so notches still fit. */
export const plateGlyphR = (w: number): number => Math.max(5, Math.min(8, (w - 16) / 2));

/**
 * The weight notches' centres, from the plate's left end, in the order they
 * light: from the plate's ends in toward its symbol, a side at a time. The
 * last one lights as the plate goes down.
 */
export function plateNotches(w: number, glyphX: number): number[] {
  const gap = plateGlyphR(w) + 3.5;
  const left: number[] = [];
  const right: number[] = [];
  for (let x = glyphX - gap - NOTCH_W / 2; x >= 3 + NOTCH_W / 2 && left.length < NOTCHES_MAX; x -= NOTCH_STEP) left.push(x);
  for (let x = glyphX + gap + NOTCH_W / 2; x <= w - 3 - NOTCH_W / 2 && right.length < NOTCHES_MAX; x += NOTCH_STEP) right.push(x);
  // Keep the sides even, so the row reads as one gauge round the symbol.
  const n = left.length && right.length ? Math.min(left.length, right.length) : Math.max(left.length, right.length);
  const l = left.slice(0, n).reverse();
  const r = right.slice(0, n).reverse();
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (l[i] !== undefined) out.push(l[i]!);
    if (r[i] !== undefined) out.push(r[i]!);
  }
  return out;
}

/** A door picture's padding past its capsule (board px). */
export const DOOR_PAD = 8;

function poly(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/**
 * The plate's socket, `w` wide: a dark slot cut in the floor with a worn
 * stone lip at each end, that the slab sits in. The plate's left end is at
 * PLATE_PX of the picture, the slab's top at PLATE_PT.
 */
export function paintPlateSocket(w: number): HTMLCanvasElement {
  const W = w + PLATE_PX * 2;
  const H = PLATE_PT + PLATE_SLAB + PLATE_SINK + 4;
  const { canvas, ctx } = makeCanvas(Math.ceil(W * ART_RES), Math.ceil(H * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  const pen = new Pen(ctx, 300 + Math.round(w), 0.35);
  const top = PLATE_PT;
  const deep = PLATE_SLAB + PLATE_SINK;
  const slot = ctx.createLinearGradient(0, top, 0, top + deep);
  slot.addColorStop(0, '#20180f');
  slot.addColorStop(1, '#4a3a28');
  ctx.fillStyle = slot;
  ctx.fillRect(PLATE_PX - 1.5, top - 1, w + 3, deep + 1);
  for (const x of [PLATE_PX - 5, PLATE_PX + w + 0.5]) {
    const lip: Pt[] = [{ x, y: top - 2.5 }, { x: x + 4.5, y: top - 2.5 }, { x: x + 4.5, y: top + deep }, { x, y: top + deep }];
    pen.fill(lip, mix(SAND, SAND_DARK, 0.45), 1);
    pen.hair([{ x: x + 0.5, y: top - 2 }, { x: x + 4, y: top - 2 }], 1, SAND_LIGHT, 0.9);
    pen.stroke([...lip, lip[0]!], 0.9, INK, 0.9, false);
  }
  return canvas;
}

/**
 * The plate's slab, `w` wide: dressed stone faintly washed with its mark's
 * tint, its symbol carved and painted at `glyphX`, and the weight notches
 * cut either side of it (dark: the scene lights them as weight builds).
 * `lit` (down): the symbol glows. The slab's top-left is at SLAB_PAD.
 */
export function paintPlateSlab(w: number, mark: PlateMark, lit: boolean, glyphX: number): HTMLCanvasElement {
  const P = SLAB_PAD;
  const H = PLATE_SLAB;
  const { canvas, ctx } = makeCanvas(Math.ceil((w + P * 2) * ART_RES), Math.ceil((H + P * 2) * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(P, P);
  const pen = new Pen(ctx, 330 + Math.round(w), 0.3);
  const stone = mix(SAND, mark.tint, 0.1);
  const slab: Pt[] = [{ x: 0.5, y: 1.5 }, { x: 1.8, y: 0 }, { x: w - 1.8, y: 0 }, { x: w - 0.5, y: 1.5 }, { x: w - 0.5, y: H }, { x: 0.5, y: H }];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix(SAND_LIGHT, mark.tint, 0.06));
  g.addColorStop(0.3, stone);
  g.addColorStop(1, mix(mix(SAND_DARK, mark.tint, 0.12), INK, 0.2));
  ctx.fillStyle = g;
  poly(ctx, slab);
  ctx.fill();
  pen.hatch(slab, 2.6, 0.6, 0.5, { color: INK, alpha: 0.18, onlyBelow: H * 0.55 });
  // A few pits and a crack in the worn stone.
  const rng = pen.rng;
  for (let k = 0; k < w / 14; k++) pen.dot(2 + rng() * (w - 4), 3 + rng() * (H - 6), 0.45, mix(SAND_DARK, INK, 0.4), 0.5);
  pen.hair([{ x: 1.5, y: 1.2 }, { x: w - 1.5, y: 1.2 }], 1.3, '#fff6dc', 0.85);
  // The tile's dressed margin: a carved line just inside its face.
  const m = 2.6;
  // Its band of paint in the mark's tint, the same as on its doors.
  pen.hair([{ x: m, y: m + 0.6 }, { x: w - m, y: m + 0.6 }], 1.1, mark.tint, 0.75);
  pen.hair([{ x: m, y: H - m }, { x: w - m, y: H - m }], 1.1, mark.tint, 0.75);
  pen.hair([{ x: m, y: H - m + 0.8 }, { x: w - m, y: H - m + 0.8 }], 0.6, SAND_LIGHT, 0.6);
  // The weight notches: deep slots, each with a lit lower lip.
  const cy = H / 2;
  for (const x of plateNotches(w, glyphX)) {
    const n: Pt[] = [{ x: x - NOTCH_W / 2, y: cy - NOTCH_H / 2 }, { x: x + NOTCH_W / 2, y: cy - NOTCH_H / 2 }, { x: x + NOTCH_W / 2, y: cy + NOTCH_H / 2 }, { x: x - NOTCH_W / 2, y: cy + NOTCH_H / 2 }];
    pen.fill(n, mix(SAND_DARK, INK, 0.62), 0.95);
    pen.hair([{ x: x - NOTCH_W / 2, y: cy + NOTCH_H / 2 + 0.7 }, { x: x + NOTCH_W / 2, y: cy + NOTCH_H / 2 + 0.7 }], 0.8, SAND_LIGHT, 0.9);
  }
  ctx.save();
  poly(ctx, slab);
  ctx.clip();
  carveGlyph(ctx, mark.glyph, plateGlyphR(w), glyphX, cy, mark.tint, { lit, glow: mark.glow, stone });
  ctx.restore();
  pen.stroke([...slab, slab[0]!], 1.1, INK, 0.95, false);
  return canvas;
}

/**
 * A stone door, `len` long and `t2` thick, lying along x from its ring end
 * (it slides back that way to open): a heavy dressed slab with a carved
 * panel washed in its plate's tint, and its plate's symbol cut into the
 * middle, kept upright for a door turned by `turn` radians. An inverse
 * door's symbol is struck through. `lit` (its plate down): the symbol glows.
 */
export function paintDoor(len: number, t2: number, mark: PlateMark, inverse: boolean, turn: number, lit = false): HTMLCanvasElement {
  const P = DOOR_PAD;
  const w = len + t2;
  const { canvas, ctx } = makeCanvas(Math.ceil((w + P * 2) * ART_RES), Math.ceil((t2 + P * 2) * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(P, P);
  const pen = new Pen(ctx, 400 + Math.round(len), 0.3);
  const c = 2.2;
  const body: Pt[] = [{ x: c, y: 0 }, { x: w - c, y: 0 }, { x: w, y: c }, { x: w, y: t2 - c }, { x: w - c, y: t2 }, { x: c, y: t2 }, { x: 0, y: t2 - c }, { x: 0, y: c }];
  // Its shadow on the wall behind.
  ctx.save();
  ctx.translate(1.5, 2.5);
  ctx.fillStyle = rgba('#2c2118', 0.3);
  poly(ctx, body);
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, t2);
  g.addColorStop(0, mix(SAND_LIGHT, SAND, 0.3));
  g.addColorStop(0.45, mix(SAND, SAND_DARK, 0.35));
  g.addColorStop(1, mix(SAND_DARK, INK, 0.25));
  ctx.fillStyle = g;
  poly(ctx, body);
  ctx.fill();
  pen.hatch(body, 3, 0.85, 0.5, { color: INK, alpha: 0.2, onlyBelow: t2 * 0.4 });
  // The carved panel: sunken, washed with the mark's paint, lit on its lower lip.
  const inset = Math.min(3.2, t2 * 0.2);
  const panel: Pt[] = [{ x: inset + 2, y: inset }, { x: w - inset - 2, y: inset }, { x: w - inset - 2, y: t2 - inset }, { x: inset + 2, y: t2 - inset }];
  pen.fill(panel, mark.tint, 0.32);
  pen.stroke([...panel, panel[0]!], 0.8, mix(SAND_DARK, INK, 0.5), 0.75, false);
  pen.hair([{ x: inset + 3, y: t2 - inset + 0.9 }, { x: w - inset - 3, y: t2 - inset + 0.9 }], 0.8, SAND_LIGHT, 0.8);
  // A band of little chevrons in the mark's paint, broken by the symbol.
  const r = Math.max(5, Math.min(7.5, t2 / 2 - 1));
  const mid = w / 2;
  for (let x = inset + 8; x < w - inset - 8; x += 7) {
    if (Math.abs(x + 1 - mid) < r + 4) continue;
    pen.hair([{ x, y: t2 / 2 - 1.6 }, { x: x + 2, y: t2 / 2 }, { x, y: t2 / 2 + 1.6 }], 0.8, mark.tint, 0.7);
  }
  ctx.save();
  poly(ctx, body);
  ctx.clip();
  carveGlyph(ctx, mark.glyph, r, mid, t2 / 2, mark.tint, { lit, glow: mark.glow, stone: mix(SAND, SAND_DARK, 0.35), turn: -turn });
  if (inverse) {
    // Struck through: open only while the plate is up.
    ctx.translate(mid, t2 / 2);
    ctx.rotate(-turn);
    ctx.lineCap = 'round';
    for (const [width, color] of [[r * 0.38, INK], [r * 0.22, '#d4442f']] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.9);
      ctx.lineTo(r * 0.9, -r * 0.9);
      ctx.stroke();
    }
  }
  ctx.restore();
  pen.stroke([...body, body[0]!], 1.3, INK, 0.95, false);
  return canvas;
}

/** A door frame picture's padding (board px). */
const FRAME_PAD = 3;
/** How far the frame's rails sit off the door's axis, past its half-thickness (px). */
const RAIL_GAP = 2.5;
/** The sill's depth past the door's end (px), and the frame's reach to either side. */
const SILL = 6;
const JAMB = 5.5;

/**
 * The door's frame, lying along x like the door, from its ring end (A) to
 * its shut end (B): carved rails to either side of the doorway and a sill
 * stone at B, so an open door still reads as a doorway. Point A sits at
 * `frameAnchor(t)` of the picture.
 */
export function paintDoorFrame(len: number, t: number): HTMLCanvasElement {
  const P = FRAME_PAD;
  const half = t + JAMB;
  const W = len + t + SILL + P * 2;
  const H = half * 2 + P * 2;
  const { canvas, ctx } = makeCanvas(Math.ceil(W * ART_RES), Math.ceil(H * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(P, P + half);
  const pen = new Pen(ctx, 470 + Math.round(len), 0.3);
  // The doorway: a shadowed recess where the slab runs, between two stone jambs.
  ctx.fillStyle = rgba('#3a2a1c', 0.3);
  ctx.fillRect(0, -t - RAIL_GAP, len + t, (t + RAIL_GAP) * 2);
  for (const s of [-1, 1]) {
    const yin = s * (t + RAIL_GAP);
    const yout = s * half;
    const jamb: Pt[] = [{ x: 0, y: yin }, { x: len + t, y: yin }, { x: len + t, y: yout }, { x: 0, y: yout }];
    const jg = ctx.createLinearGradient(0, yin, 0, yout);
    jg.addColorStop(0, mix(SAND_DARK, INK, 0.15));
    jg.addColorStop(1, mix(SAND, SAND_LIGHT, 0.3));
    ctx.fillStyle = jg;
    poly(ctx, jamb);
    ctx.fill();
    pen.hatch(jamb, 2.4, 0.9, 0.45, { color: INK, alpha: 0.18 });
    pen.hair([{ x: 0, y: yin }, { x: len + t, y: yin }], 1, INK, 0.75);
    pen.hair([{ x: 0, y: yout }, { x: len + t, y: yout }], 1, INK, 0.75);
  }
  // The sill: the stone the door shuts against.
  const sill: Pt[] = [{ x: len + t - 1, y: -half }, { x: len + t + SILL, y: -half + 1 }, { x: len + t + SILL, y: half - 1 }, { x: len + t - 1, y: half }];
  const g = ctx.createLinearGradient(len + t, 0, len + t + SILL, 0);
  g.addColorStop(0, mix(SAND, SAND_LIGHT, 0.3));
  g.addColorStop(1, mix(SAND_DARK, INK, 0.2));
  ctx.fillStyle = g;
  poly(ctx, sill);
  ctx.fill();
  pen.hatch(sill, 2.4, 0.9, 0.5, { color: INK, alpha: 0.22 });
  pen.stroke([...sill, sill[0]!], 1.1, INK, 0.9, false);
  return canvas;
}

/** Where a frame picture's point A sits, as an origin (0..1). */
export function frameOrigin(len: number, t: number): { x: number; y: number } {
  const W = len + t + SILL + FRAME_PAD * 2;
  return { x: FRAME_PAD / W, y: 0.5 };
}

/**
 * The lintel at a door's ring end: a heavy block across the doorway that
 * the slab slides in behind, drawn over the door. Point A at `lintelOrigin`.
 */
export function paintLintel(t: number, mark: PlateMark): HTMLCanvasElement {
  const P = FRAME_PAD;
  const half = t + JAMB + 1;
  const depth = t + 9;
  const W = depth + P * 2;
  const H = half * 2 + P * 2;
  const { canvas, ctx } = makeCanvas(Math.ceil(W * ART_RES), Math.ceil(H * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(P, P + half);
  const pen = new Pen(ctx, 480 + t, 0.3);
  const block: Pt[] = [{ x: 0, y: -half + 1 }, { x: 1, y: -half }, { x: depth, y: -half }, { x: depth, y: half }, { x: 1, y: half }, { x: 0, y: half - 1 }];
  ctx.save();
  ctx.translate(1.5, 2);
  ctx.fillStyle = rgba('#2c2118', 0.3);
  poly(ctx, block);
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, -half, 0, half);
  g.addColorStop(0, SAND_LIGHT);
  g.addColorStop(0.5, SAND);
  g.addColorStop(1, mix(SAND_DARK, INK, 0.2));
  ctx.fillStyle = g;
  poly(ctx, block);
  ctx.fill();
  pen.hatch(block, 2.6, 0.9, 0.5, { color: INK, alpha: 0.2, onlyBelow: 0 });
  // A notch of the mark's colour on its face: whose door this is.
  pen.hair([{ x: depth - 3, y: -half + 3 }, { x: depth - 3, y: half - 3 }], 1.6, mark.tint, 0.8);
  pen.stroke([...block, block[0]!], 1.2, INK, 0.95, false);
  return canvas;
}

/** Where a lintel picture's point A sits, as an origin (0..1): the slot's mouth, 3 px in from its door side. */
export function lintelOrigin(t: number): { x: number; y: number } {
  const depth = t + 9;
  return { x: (FRAME_PAD + depth - 3) / (depth + FRAME_PAD * 2), y: 0.5 };
}
