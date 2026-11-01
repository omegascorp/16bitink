import { ART_RES, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { SAND, SAND_DARK, SAND_LIGHT } from './tomb';
import { mix, rgba } from './wash';

/**
 * The Desert Tomb's plates and the doors they work, so the board reads at a
 * glance: each plate carries a carved symbol in its own tint (sun, moon,
 * scarab, eye), and every door it works carries the same symbol. A plate is
 * a stone tile sunk in the floor that sinks further and lights up when
 * weighed; a door is a heavy carved slab sliding in a stone frame. An
 * inverse door (open while its plate is up) shows its symbol hollow and
 * struck through.
 */

export type Glyph = 'sun' | 'moon' | 'scarab' | 'eye';

export interface PlateMark {
  readonly glyph: Glyph;
  /** The symbol's paint, carved and dim while the plate is up. */
  readonly tint: string;
  /** Its light while the plate is down (and the groove's glow). */
  readonly glow: string;
}

export const PLATE_MARKS: readonly PlateMark[] = [
  { glyph: 'sun', tint: '#e09a2a', glow: '#ffd25e' },
  { glyph: 'moon', tint: '#5f8fd0', glow: '#a9d6ff' },
  { glyph: 'scarab', tint: '#2f9a7e', glow: '#8ff0c4' },
  { glyph: 'eye', tint: '#b8487e', glow: '#ffa8d0' },
];

/** The mark of a level's plate, by its index in `plates`. */
export const plateMark = (i: number): PlateMark => PLATE_MARKS[((i % PLATE_MARKS.length) + PLATE_MARKS.length) % PLATE_MARKS.length]!;

/** A plate picture's padding: the plate's left end sits PLATE_PX in, its top PLATE_PT down. */
export const PLATE_PX = 7;
export const PLATE_PT = 16;
/** How far a pressed plate sinks (px). */
export const PLATE_SINK = 4;
const PLATE_SLAB = 12;
/** The plate's symbol disc: its radius, and its centre below the slab's top. */
export const PLATE_DISC_R = 13;
export const PLATE_DISC_DY = 8;

/** A door picture's padding past its capsule (board px). */
export const DOOR_PAD = 22;

function poly(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/** A symbol of radius `r` centred on (0, 0), in `color`: drawn as carved lines with the pen. */
export function drawGlyph(pen: Pen, glyph: Glyph, r: number, color: string, alpha = 1): void {
  const w = Math.max(0.8, r * 0.17);
  if (glyph === 'sun') {
    pen.fill(ellipse(0, 0, r * 0.4, r * 0.4, 14), color, alpha);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + Math.PI / 8;
      // Each ray a solid wedge, so the sun reads by its shape even when small.
      const side = 0.2;
      pen.fill([{ x: Math.cos(a - side) * r * 0.58, y: Math.sin(a - side) * r * 0.58 }, { x: Math.cos(a) * r, y: Math.sin(a) * r }, { x: Math.cos(a + side) * r * 0.58, y: Math.sin(a + side) * r * 0.58 }], color, alpha);
    }
  } else if (glyph === 'moon') {
    // A crescent opening to the right.
    const pts: Pt[] = [];
    for (let a = Math.PI * 0.32; a <= Math.PI * 1.68; a += 0.12) pts.push({ x: Math.cos(a) * r * 0.85, y: Math.sin(a) * r * 0.85 });
    for (let a = Math.PI * 1.55; a >= Math.PI * 0.45; a -= 0.12) pts.push({ x: r * 0.32 + Math.cos(a) * r * 0.66, y: Math.sin(a) * r * 0.7 });
    pen.fill(pts, color, alpha);
  } else if (glyph === 'scarab') {
    pen.fill(ellipse(0, r * 0.14, r * 0.42, r * 0.58, 14), color, alpha);
    pen.fill(ellipse(0, -r * 0.6, r * 0.24, r * 0.18, 10), color, alpha);
    for (const s of [-1, 1]) {
      for (const k of [-0.15, 0.2, 0.5]) pen.hair([{ x: s * r * 0.35, y: r * k }, { x: s * r * 0.85, y: r * (k + 0.18) }], w * 0.8, color, alpha);
      pen.hair([{ x: s * r * 0.15, y: -r * 0.72 }, { x: s * r * 0.45, y: -r * 0.95 }], w * 0.8, color, alpha);
    }
  } else {
    const lid: Pt[] = [{ x: -r * 0.95, y: 0 }, { x: -r * 0.4, y: -r * 0.45 }, { x: r * 0.4, y: -r * 0.45 }, { x: r * 0.95, y: 0 }, { x: r * 0.4, y: r * 0.38 }, { x: -r * 0.4, y: r * 0.38 }, { x: -r * 0.95, y: 0 }];
    pen.hair(lid, w, color, alpha);
    pen.dot(0, -r * 0.02, r * 0.26, color, alpha);
    pen.hair([{ x: -r * 0.15, y: r * 0.38 }, { x: -r * 0.3, y: r * 0.95 }], w * 0.9, color, alpha);
  }
}

/** A carved medallion: a ring in the mark's tint and its symbol; `lit` glows, `inverse` is hollow and struck through. */
function medallion(ctx: CanvasRenderingContext2D, pen: Pen, mark: PlateMark, r: number, lit: boolean, inverse: boolean, turn = 0): void {
  if (lit) {
    const R = r * 1.7;
    const halo = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, R);
    halo.addColorStop(0, rgba(mark.glow, 0.9));
    halo.addColorStop(1, rgba(mark.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-R, -R, R * 2, R * 2);
  }
  const disc = ellipse(0, 0, r, r, 22);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  if (lit) {
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(0.6, mark.glow);
    g.addColorStop(1, mark.tint);
  } else if (inverse) {
    g.addColorStop(0, mix(SAND_DARK, INK, 0.45));
    g.addColorStop(1, mix(SAND_DARK, INK, 0.25));
  } else {
    g.addColorStop(0, mix(mark.tint, SAND_LIGHT, 0.45));
    g.addColorStop(1, mix(mark.tint, SAND_DARK, 0.3));
  }
  ctx.fillStyle = g;
  poly(ctx, disc);
  ctx.fill();
  pen.circle(0, 0, r, Math.max(1, r * 0.16), lit ? mix(mark.tint, INK, 0.3) : mark.tint);
  pen.circle(0, 0, r + 0.6, Math.max(1.4, r * 0.11), INK);
  ctx.save();
  ctx.rotate(turn);
  const glyphColor = lit ? mix(mark.tint, INK, 0.7) : inverse ? mark.glow : mix(mark.tint, INK, 0.85);
  drawGlyph(pen, mark.glyph, r * 0.8, glyphColor, 1);
  ctx.restore();
  if (inverse) {
    // Struck through: open only while the plate is up.
    pen.stroke([{ x: -r * 0.78, y: r * 0.78 }, { x: r * 0.78, y: -r * 0.78 }], Math.max(1.2, r * 0.2), '#c8402f', 0.95, false);
  }
}

/**
 * A pressure plate `w` across: a sandstone tile sunk in a socket in the
 * floor, with the plate's symbol on a disc in its face. Down, it sits
 * PLATE_SINK lower and the disc glows. The plate's top-left is at
 * (PLATE_PX, PLATE_PT) of the picture; the disc's centre is `discX` in from
 * the plate's left end (clear of the pins that cross it).
 */
export function paintPlate(w: number, mark: PlateMark, down: boolean, discX = w / 2): HTMLCanvasElement {
  const W = w + PLATE_PX * 2;
  const H = PLATE_PT + PLATE_SLAB + PLATE_SINK + 16;
  const { canvas, ctx } = makeCanvas(Math.ceil(W * ART_RES), Math.ceil(H * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  const pen = new Pen(ctx, 300 + Math.round(w), 0.35);
  const top = PLATE_PT;
  // The socket: a dark slot cut in the floor, with a worn lip at each end.
  const slot = ctx.createLinearGradient(0, top, 0, top + PLATE_SLAB + PLATE_SINK);
  slot.addColorStop(0, '#2c2118');
  slot.addColorStop(1, '#5a4630');
  ctx.fillStyle = slot;
  ctx.fillRect(PLATE_PX - 1.5, top - 1, w + 3, PLATE_SLAB + PLATE_SINK + 1);
  for (const x of [PLATE_PX - 5, PLATE_PX + w + 0.5]) {
    const lip: Pt[] = [{ x, y: top - 2.5 }, { x: x + 4.5, y: top - 2.5 }, { x: x + 4.5, y: top + PLATE_SLAB + PLATE_SINK }, { x, y: top + PLATE_SLAB + PLATE_SINK }];
    pen.fill(lip, mix(SAND, SAND_DARK, 0.45), 1);
    pen.hair([{ x: x + 0.5, y: top - 2 }, { x: x + 4, y: top - 2 }], 1, SAND_LIGHT, 0.9);
    pen.stroke([...lip, lip[0]!], 0.9, INK, 0.9, false);
  }
  // The tile itself.
  const y0 = top + (down ? PLATE_SINK : 0);
  const slab: Pt[] = [{ x: PLATE_PX + 0.5, y: y0 + 1 }, { x: PLATE_PX + 1.5, y: y0 }, { x: PLATE_PX + w - 1.5, y: y0 }, { x: PLATE_PX + w - 0.5, y: y0 + 1 }, { x: PLATE_PX + w - 0.5, y: y0 + PLATE_SLAB }, { x: PLATE_PX + 0.5, y: y0 + PLATE_SLAB }];
  const g = ctx.createLinearGradient(0, y0, 0, y0 + PLATE_SLAB);
  g.addColorStop(0, down ? mix(SAND, SAND_DARK, 0.2) : SAND_LIGHT);
  g.addColorStop(0.35, SAND);
  g.addColorStop(1, mix(SAND_DARK, INK, 0.15));
  ctx.fillStyle = g;
  poly(ctx, slab);
  ctx.fill();
  pen.hatch(slab, 2.8, 0.6, 0.5, { color: INK, alpha: 0.2, onlyBelow: y0 + PLATE_SLAB * 0.45 });
  pen.hair([{ x: PLATE_PX + 2, y: y0 + 1.2 }, { x: PLATE_PX + w - 2, y: y0 + 1.2 }], 1.3, '#fff6dc', down ? 0.4 : 0.85);
  // Carved border lines on the face, broken by the disc.
  const cx = PLATE_PX + discX;
  const cy = y0 + PLATE_DISC_DY;
  for (const s of [-1, 1]) {
    const from = cx + s * (PLATE_DISC_R + 4);
    const to = s < 0 ? PLATE_PX + 4 : PLATE_PX + w - 4;
    if ((to - from) * s > 4) {
      pen.hair([{ x: from, y: cy - 2.5 }, { x: to, y: cy - 2.5 }], 0.7, INK, 0.45);
      pen.hair([{ x: from, y: cy + 2.5 }, { x: to, y: cy + 2.5 }], 0.7, INK, 0.45);
      for (let x = from + s * 4; (to - x) * s > 2; x += s * 9) pen.hair([{ x, y: cy - 2.5 }, { x: x + s * 3, y: cy + 2.5 }], 0.7, mark.tint, 0.55);
    }
  }
  pen.stroke([...slab, slab[0]!], 1.1, INK, 0.95, false);
  ctx.save();
  ctx.translate(cx, cy);
  medallion(ctx, pen, mark, PLATE_DISC_R, down, false);
  ctx.restore();
  return canvas;
}

/**
 * A stone door, `len` long and `t2` thick, lying along x from its ring end
 * (it slides back that way to open): a heavy dressed slab with a carved
 * panel and its plate's symbol in the middle, kept upright for a door
 * turned by `turn` radians. An inverse door's symbol is hollow and struck.
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
  // The carved panel: a sunken border, lit on its lower lip.
  const inset = Math.min(3.2, t2 * 0.2);
  const panel: Pt[] = [{ x: inset + 2, y: inset }, { x: w - inset - 2, y: inset }, { x: w - inset - 2, y: t2 - inset }, { x: inset + 2, y: t2 - inset }];
  pen.stroke([...panel, panel[0]!], 0.8, mix(SAND_DARK, INK, 0.5), 0.75, false);
  pen.hair([{ x: inset + 3, y: t2 - inset + 0.9 }, { x: w - inset - 3, y: t2 - inset + 0.9 }], 0.8, SAND_LIGHT, 0.8);
  // Chisel marks, and the mark's colour in a band of little chevrons along the panel.
  for (let x = inset + 8; x < w - inset - 8; x += 7) pen.hair([{ x, y: t2 / 2 - 1.6 }, { x: x + 2, y: t2 / 2 }, { x, y: t2 / 2 + 1.6 }], 0.7, mark.tint, 0.5);
  pen.stroke([...body, body[0]!], 1.3, INK, 0.95, false);
  // The plate's symbol on a round boss standing proud of the slab: lit while its plate is down.
  const r = (t2 / 2 + 3) * 1.6;
  ctx.save();
  ctx.translate(w / 2, t2 / 2);
  medallion(ctx, pen, mark, r, lit, inverse, -turn);
  ctx.restore();
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
