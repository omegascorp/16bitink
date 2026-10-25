import { closed, cub, type Draw, makeDraw, normals, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import { type Pt, withScratch } from '../pen';
import type { JawSpec } from '../snakes/cornJaws';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { type MouthPaint, snakeJaws } from './jungleSnakeJaws';
import { neckFromTile } from './jungleSnakePaint';

/**
 * A Jungle snake's head from above, facing +x, the frame centred between the
 * eyes, built from its species' HeadSpec: the neck is the body strip's own
 * tile painted mirrored (so it is exactly the strip under it), giving way
 * behind the crown to the head's own skin; the crown's plates in fine line
 * over a dome of light and shade; eyes set in the sides; the jaws gaping
 * under it. The back of the neck fades out where the strip takes over.
 */
export type HeadPose = 'shut' | 'open' | 'strike';

export const HEAD_FRAME = 76;
export const HALF_W = SNAKE_W / 2;
/** The neck's contours, as the strip's (y = 1.2 and SNAKE_W − 1.2). */
export const NECK = HALF_W - 1.2;
/** Where the neck starts fading into the strip under it, and where it has gone. */
export const FADE_FROM = -24;
export const FADE_TO = -37;

export interface EyeSpec {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  /** The iris from its lit heart to its rim. */
  readonly iris: readonly [string, string, string];
  /** A slit pupil (pythons) or a round one; and its size. */
  readonly slit?: boolean;
  readonly pupil: number;
}

export interface HeadSpec {
  /** The head's upper outline (y < 0), from the back of the neck (FADE_TO - 2, -NECK) to the snout tip (tip, 0). */
  readonly upper: readonly Pt[];
  /** The body strip's period and its tile painter (for the neck). */
  readonly period: number;
  readonly tile: (ctx: CanvasRenderingContext2D, ink: string, f: number) => void;
  /** Where the head's own skin takes over from the neck's strip (soft, over a few px). */
  readonly crownFrom: number;
  /** Paints the head's own skin (its washes and markings) in head coordinates, warped by `w`. */
  readonly skin: (d: Draw, w: Warp) => void;
  /** The crown's plates (upper half: mirrored), as hairlines. */
  readonly plates: readonly (readonly Pt[])[];
  /** The plates' ink, and the light caught on the far lip of each groove between them (none if unset). */
  readonly plateInk?: string;
  readonly plateLight?: string;
  readonly eye: EyeSpec;
  readonly nostril: Pt;
  readonly shadow: string;
  readonly jaw: Readonly<Record<'open' | 'strike', JawSpec>>;
  readonly mouth: MouthPaint;
}

interface Gape {
  readonly k: number;
  readonly push: number;
  readonly spread: number;
}
const GAPE: Record<HeadPose, Gape> = {
  shut: { k: 1, push: 0, spread: 0 },
  open: { k: 0.74, push: 0, spread: 1 },
  strike: { k: 0.86, push: 3.2, spread: 0.55 },
};

const ease = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** Points every ~`step` px along a polyline, so a warp bends it smoothly. */
export function dense(pts: readonly Pt[], step = 0.8): Pt[] {
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  }
  return out;
}

export type Warp = (p: Pt) => Pt;

function warpOf(g: Gape): Warp {
  return (p) => {
    let x = p.x > 2 ? 2 + (p.x - 2) * g.k : p.x;
    x += g.push * ease((p.x + 30) / 22);
    const jaw = 1 + g.spread * 0.06 * Math.max(0, 1 - Math.abs(p.x + 5) / 9);
    return pt(x, p.y * jaw);
  };
}

export const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
/** A closed outline from its upper half traced back to front (the tip on the midline). */
export const bilateral = (upper: readonly Pt[]): Pt[] => [...upper, ...mirror(upper).reverse().slice(1)];

/** The head's upper outline from its key points: the neck, then cubic pieces [c0, c1, end] to the tip. */
export function outlineOf(neckTo: number, pieces: readonly (readonly [Pt, Pt, Pt])[]): Pt[] {
  const pts: Pt[] = [pt(FADE_TO - 2, -NECK), pt(neckTo, -NECK)];
  let at = pt(neckTo, -NECK);
  for (const [c0, c1, end] of pieces) {
    pts.push(...cub(at, c0, c1, end, 8).slice(1));
    at = end;
  }
  return dense(pts);
}

function outward(upper: readonly Pt[], by: number): Pt[] {
  const n = normals(upper);
  return upper.map((p, i) => (p.y === 0 ? pt(p.x + by, 0) : pt(p.x + n[i]!.x * by, p.y + n[i]!.y * by)));
}

export function clipTo(ctx: CanvasRenderingContext2D, clip: readonly Pt[], paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  paint();
  ctx.restore();
}

/** Paints `paint` on a layer of its own, faded in from x = from - 3 to from + 2 (head coordinates), then lays it over. */
function fadedIn(ctx: CanvasRenderingContext2D, from: number, paint: (layer: CanvasRenderingContext2D) => void): void {
  const m = ctx.getTransform();
  withScratch(ctx.canvas.width, ctx.canvas.height, (lctx, layer) => {
    lctx.setTransform(m);
    paint(lctx);
    lctx.globalCompositeOperation = 'destination-in';
    const g = lctx.createLinearGradient(from - 3, 0, from + 2, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    lctx.fillStyle = g;
    lctx.fillRect(-HEAD_FRAME, -HEAD_FRAME, HEAD_FRAME * 2, HEAD_FRAME * 2);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  });
}

/** The skin of head and neck: the strip's tile on the neck, the head's own skin over the crown. */
function skin(d: Draw, spec: HeadSpec, w: Warp, body: readonly Pt[]): void {
  const { ctx } = d.pen;
  clipTo(ctx, body, () => {
    neckFromTile(ctx, spec.period, (tile) => spec.tile(tile, d.ink, d.f));
    fadedIn(ctx, spec.crownFrom, (layer) => clipTo(layer, body, () => spec.skin(makeDraw(layer, 900 + d.f, d.f, 0, d.ink), w)));
  });
  crown(d, spec, w, body);
}

/** The crown's dome: shade on its far side, hatched; the plates in fine line; nostrils; glints on brow and snout. */
function crown(d: Draw, spec: HeadSpec, w: Warp, body: readonly Pt[]): void {
  const { pen } = d;
  const head = dense([pt(spec.crownFrom, -15), pt(26, -15), pt(26, 15), pt(spec.crownFrom, 15)], 2).map(w);
  const ink = spec.plateInk ?? d.ink;
  clipTo(pen.ctx, body, () => {
    pen.crescent(head, pt(-3.2, -4.6), () => pen.fill(head, spec.shadow, 0.14));
    pen.crescent(body, pt(-2.2, -3.4), () => pen.hatch(head, 1.5, 0.95, 0.32, { color: d.ink, alpha: 0.28 }));
    for (const plate of spec.plates) {
      const light = spec.plateLight;
      if (light) for (const side of [1, -1]) pen.hair(dense(plate, 0.8).map((p) => w(pt(p.x + 0.45, p.y * side + 0.5))), 0.4, light, side < 0 ? 0.55 : 0.32);
      for (const side of [1, -1]) pen.hair(dense(plate, 0.8).map((p) => w(pt(p.x, p.y * side))), 0.36, ink, side < 0 ? 0.5 : 0.62);
    }
    const brow = w(pt(2, -6.6));
    glaze(pen.ctx, brow.x, brow.y, 4.4, 1.5, -0.1, PAPER_FILL, 0.36);
    const snout = w(pt(spec.nostril.x - 2, -2.4));
    glaze(pen.ctx, snout.x, snout.y, 2.8, 1.2, -0.5, PAPER_FILL, 0.34);
  });
  for (const side of [1, -1]) {
    const n = w(pt(spec.nostril.x, spec.nostril.y * side));
    pen.dot(n.x, n.y, 0.62, d.ink, 0.9);
    pen.dot(n.x - 0.3, n.y - 0.35, 0.26, PAPER_FILL, 0.6);
  }
}

function eye(d: Draw, spec: HeadSpec, w: Warp, side: 1 | -1): void {
  const { pen } = d;
  const { ctx } = pen;
  const e = spec.eye;
  const c = w(pt(e.x, e.y * side));
  const ball = Array.from({ length: 24 }, (_, i) => pt(c.x + Math.cos((i / 24) * Math.PI * 2) * e.rx, c.y + Math.sin((i / 24) * Math.PI * 2) * e.ry));
  pen.fill(ball.map((p) => pt(p.x + 0.5, p.y + 0.7)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.8, c.y - 0.7, 0.2, c.x, c.y, e.rx * 1.05);
    g.addColorStop(0, e.iris[0]);
    g.addColorStop(0.45, e.iris[1]);
    g.addColorStop(1, e.iris[2]);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - e.rx, c.y - e.ry, e.rx * 2, e.ry * 2);
    if (e.slit) {
      const slit = Array.from({ length: 16 }, (_, i) => pt(c.x + 0.2 + Math.cos((i / 16) * Math.PI * 2) * e.pupil * 1.25, c.y + side * 0.3 + Math.sin((i / 16) * Math.PI * 2) * e.pupil * 0.32));
      pen.fill(slit, '#120a08', 1);
    } else {
      pen.dot(c.x + 0.2, c.y + side * 0.5, e.pupil, '#0e0a08', 1);
    }
    // The brow plate's shadow over the top of the eye.
    pen.fill(ball.map((p) => pt(p.x + 0.4, p.y - side * e.ry * 1.3)), spec.shadow, 0.5);
  });
  pen.stroke(closed(ball), 0.75, d.ink, 0.95, false);
  pen.dot(c.x - e.rx * 0.32, c.y - e.ry * 0.34, 0.58, PAPER_FILL, 0.95);
  pen.dot(c.x + e.rx * 0.32, c.y + e.ry * 0.22, 0.28, PAPER_FILL, 0.5);
}

function fadeNeck(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(FADE_TO, 0, FADE_FROM, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-HEAD_FRAME / 2, -HEAD_FRAME / 2, FADE_FROM + HEAD_FRAME / 2, HEAD_FRAME);
  ctx.restore();
}

/** The head's outline (closed, a little outside the contour) in pose `pose`, for the hood's cut-out. */
export function headOutline(spec: HeadSpec, pose: HeadPose = 'shut'): Pt[] {
  return bilateral(outward(spec.upper, 0.7).map(warpOf(GAPE[pose])));
}

function drawHead(d: Draw, spec: HeadSpec, pose: HeadPose): void {
  const g = GAPE[pose];
  const w = warpOf(g);
  const upper = spec.upper.map(w);
  const body = bilateral(outward(spec.upper, 0.7).map(w));
  if (g.spread > 0) snakeJaws(d, spec.mouth, spec.jaw[pose === 'open' ? 'open' : 'strike'], body);
  skin(d, spec, w, body);
  for (const side of [-1, 1] as const) eye(d, spec, w, side);
  const tipAt = upper.length - 1;
  d.pen.stroke(upper.slice(0, tipAt).concat(mirror(upper.slice(tipAt - 6, tipAt)).reverse()), 1.15, d.ink, 0.95);
  d.pen.stroke(mirror(upper), 1.8, d.ink, 1);
  fadeNeck(d.pen.ctx);
}

/** A head sprite from its spec. */
export function headArt(spec: HeadSpec): SpriteArt<HeadPose> {
  return { frame: HEAD_FRAME, res: 4, poses: ['shut', 'open', 'strike'], draw: (d, pose) => drawHead(d, spec, pose) };
}

/** Tongue colours: the stem and its dark tips. */
export function tongueArt(stemColour: string, tipColour: string, sheen: string): SpriteArt<'flick'> {
  const draw = (d: Draw): void => {
    const { pen } = d;
    const { ctx } = pen;
    const stem = cub(pt(-1, 0), pt(4, -0.7), pt(8, 0.8), pt(11.2, 0.2), 12);
    const shape = ribbon(stem, (u) => 1.35 - 0.45 * u).shape;
    const tine = (s: 1 | -1): Pt[] => ribbon(cub(pt(10.8, 0.2), pt(13, 0.3 + s * 0.4), pt(15, s * 1.8), pt(17, s * 3), 8), (u) => 0.88 - 0.68 * u).shape;
    const fork = ctx.createLinearGradient(9, 0, 17, 0);
    fork.addColorStop(0, stemColour);
    fork.addColorStop(1, tipColour);
    for (const s of [1, -1] as const) {
      const t = tine(s);
      ctx.save();
      ctx.fillStyle = fork;
      ctx.beginPath();
      t.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      pen.hair(closed(t), 0.22, d.ink, 0.5);
    }
    pen.fill(shape, stemColour, 1);
    pen.clipped(shape, () => {
      pen.fill(shape.map((p) => pt(p.x, p.y + 0.55)), tipColour, 0.5);
      pen.hair(stem.map((p) => pt(p.x, p.y - 0.35)), 0.3, sheen, 0.6);
    });
    pen.hair(closed(shape), 0.25, d.ink, 0.55);
  };
  return { frame: 40, res: 4, poses: ['flick'], draw };
}
