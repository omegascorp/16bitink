import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { resample, spline } from '../../kraken/whale';
import { unit } from '../../polarshark/art/bearFur';
import { blit, type Box, type Brush, type Bucket, curve, frames, lazily, path, px, screenScale, softLine, taper, turn } from '../../seal/art/paint';
import type { DrawHead } from './contract';

/**
 * The rig the bite-force video's mammal heads (the jaguar, the lion, the dog) are drawn through, and the brushwork
 * they share. Own units: the head 100 long (snout tip to the back of the skull), the bite point at 0,0, facing +x,
 * y down. Parts are baked once per line-boil frame into sprites at a few sizes, like ../../seal/art/paint.ts:
 * the body (the head without its lower jaw, the neck and shoulders), the lower jaw, and the upper and lower teeth
 * on their gums. Drawn back to front: the mouth's inside (live, between the roof line and the turned jaw), the lower
 * teeth (turned), the upper teeth, the lower jaw (turned about the hinge), the body over the jaw's back and the
 * teeth's roots (its edge from the corner of the mouth down the throat is the cheek the jaw swings out from under),
 * then the live parts: the eye (so it can blink) and the whiskers.
 */

export interface MouthLook {
  /** The inside at the back of the throat and toward the lips. */
  readonly deep: string;
  readonly near: string;
  readonly tongue: string;
  readonly tongueLit: string;
  /** How far the tongue lies forward along the floor (0..1) and its thickness. */
  readonly tongueReach: number;
  readonly tongueThick: number;
}

export interface HeadRig {
  readonly seed: number;
  readonly box: Box;
  readonly jawBox: Box;
  readonly teethBox: Box;
  readonly hinge: Pt;
  /** The jaw's turn at jaw = 1, radians. */
  readonly jawMax: number;
  /** The upper lip line, front to the corner of the mouth. */
  readonly roof: readonly Pt[];
  /** The lower lip line with the jaw shut, front to back. */
  readonly floor: readonly Pt[];
  readonly mouth: MouthLook;
  readonly paintBody: (k: Brush) => void;
  readonly paintJaw: (k: Brush) => void;
  readonly paintUpper: (k: Brush) => void;
  readonly paintLower: (k: Brush) => void;
  /** Live, over everything: the eye and the whiskers. `lw` = local units per screen px, `open` the jaw's turn. */
  readonly live: (ctx: CanvasRenderingContext2D, t: number, lw: number, open: number) => void;
}

/** Head sprites go big (the video fills the frame with one head), so finer buckets than the seal kit's. */
const HEAD_BUCKETS: readonly Bucket[] = [
  { res: 1.4, w: 1.25 },
  { res: 2.6, w: 1.1 },
  { res: 4.2, w: 1 },
  { res: 6.4, w: 1 },
  { res: 9.5, w: 1 },
];

function headBucket(pxPerUnit: number): Bucket {
  return HEAD_BUCKETS.find((b) => b.res >= pxPerUnit * 0.92) ?? HEAD_BUCKETS[HEAD_BUCKETS.length - 1]!;
}

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** 0 .. 1 .. 0 over `dur` seconds once every `period`: a blink. */
export function blink(t: number, period: number, offset: number, dur = 0.16): number {
  const u = ((((t + offset) % period) + period) % period) / dur;
  return u >= 1 ? 0 : Math.sin(Math.PI * u);
}

// ---------------------------------------------------------------- geometry

export function inside(shape: readonly Pt[], p: Pt): boolean {
  let c = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i]!;
    const b = shape[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

export function bounds(shape: readonly Pt[]): Box {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

export const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** A line's unit normal at each point, turned to `side` (1: left of travel in screen terms, y down). */
function normals(line: readonly Pt[], side: 1 | -1): Pt[] {
  return line.map((_, i) => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(line.length - 1, i + 1)]!;
    const d = unit(b.x - a.x, b.y - a.y);
    return { x: d.y * side, y: -d.x * side };
  });
}

// ---------------------------------------------------------------- paint

/** A shape filled flat, then a vertical gradient over it (light from above). */
export function wash(k: Brush, shape: readonly Pt[], base: string, y0: number, y1: number, stops: readonly (readonly [number, string])[]): void {
  const { ctx, pen } = k;
  pen.fill(shape, base, 1);
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, c] of stops) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(-400, -400, 800, 800);
  ctx.restore();
}

/** Soft darkening just inside a shape's edge, so it turns away from us. */
export function rimShade(k: Brush, shape: readonly Pt[], colour: string, width: number, alpha: number): void {
  k.pen.clipped(shape, () => softLine(k.ctx, [...shape, shape[0]!], width, colour, alpha));
}

export interface FurOpts {
  readonly n: number;
  /** The way the fur lies at p, unit. */
  readonly flow: (p: Pt) => Pt;
  readonly len: readonly [number, number];
  /** Colour and alpha of a stroke at p (r: a random 0..1), or null to skip it. */
  readonly tint: (p: Pt, r: number) => readonly [string, number] | null;
  /** Width in screen px. */
  readonly width?: readonly [number, number];
  readonly bend?: number;
}

/** Fur strokes laid the way the coat lies, clipped to the shape. */
export function fur(k: Brush, shape: readonly Pt[], o: FurOpts): void {
  const { pen } = k;
  const b = bounds(shape);
  const [w0, w1] = o.width ?? [0.6, 1.1];
  pen.clipped(shape, () => {
    for (let i = 0; i < o.n; i++) {
      const p = { x: b.x0 + pen.rng() * (b.x1 - b.x0), y: b.y0 + pen.rng() * (b.y1 - b.y0) };
      if (!inside(shape, p)) continue;
      const tint = o.tint(p, pen.rng());
      if (!tint) continue;
      const d = o.flow(p);
      const len = o.len[0] + pen.rng() * (o.len[1] - o.len[0]);
      const n = { x: -d.y, y: d.x };
      const bend = (pen.rng() - 0.5) * (o.bend ?? 0.3) * len;
      pen.hair([
        p,
        { x: p.x + d.x * len * 0.5 + n.x * bend * 0.4, y: p.y + d.y * len * 0.5 + n.y * bend * 0.4 },
        { x: p.x + d.x * len + n.x * bend, y: p.y + d.y * len + n.y * bend },
      ], px(k, w0 + pen.rng() * (w1 - w0)), tint[0], tint[1]);
    }
  });
}

export interface FringeOpts {
  /** Which side of the line is outside: 1 left of travel, -1 right. */
  readonly side: 1 | -1;
  /** The way the fur lies (unit), mixed with the outward normal. */
  readonly flow: (p: Pt) => Pt;
  readonly len: (p: Pt) => readonly [number, number];
  readonly every: number;
  readonly colour: (p: Pt, r: number) => readonly [string, number];
  /** Root width, local units. */
  readonly width: number;
  readonly lean?: number;
}

/** Tufts of fur growing across an edge, breaking the silhouette: tapered strokes from just inside to past it. */
export function fringe(k: Brush, line: readonly Pt[], o: FringeOpts): void {
  const { pen, ctx } = k;
  let total = 0;
  for (let i = 1; i < line.length; i++) total += Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y);
  const pts = resample(line, Math.max(2, Math.round(total / o.every)));
  const ns = normals(pts, o.side);
  const lean = o.lean ?? 0.8;
  pts.forEach((p, i) => {
    const n = ns[i]!;
    const f = o.flow(p);
    const d = unit(n.x * 0.55 + f.x * lean, n.y * 0.55 + f.y * lean);
    const [a, b] = o.len(p);
    const len = a + pen.rng() * (b - a);
    const from = { x: p.x - n.x * len * 0.45 + (pen.rng() - 0.5) * o.every, y: p.y - n.y * len * 0.45 };
    const curl = (pen.rng() - 0.3) * 0.25 * len;
    const mid = { x: from.x + d.x * len * 0.55 - d.y * curl * 0.4, y: from.y + d.y * len * 0.55 + d.x * curl * 0.4 };
    const tip = { x: from.x + d.x * len - d.y * curl, y: from.y + d.y * len + d.x * curl };
    const [c, al] = o.colour(p, pen.rng());
    taper(ctx, curve(from, mid, tip, 7), o.width * (0.4 + pen.rng() * 0.5), 0.05, c, al);
  });
}

/** A few ink hairs on the tips of a fringe, so the broken outline still reads as a firm drawing. */
export function inkTufts(k: Brush, line: readonly Pt[], side: 1 | -1, flow: (p: Pt) => Pt, len: number, every: number, weight: number, alpha = 0.8): void {
  const { pen } = k;
  let total = 0;
  for (let i = 1; i < line.length; i++) total += Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y);
  const pts = resample(line, Math.max(2, Math.round(total / every)));
  const ns = normals(pts, side);
  pts.forEach((p, i) => {
    if (pen.rng() < 0.35) return;
    const n = ns[i]!;
    const f = flow(p);
    const d = unit(n.x * 0.5 + f.x, n.y * 0.5 + f.y);
    const l = len * (0.5 + pen.rng() * 0.8);
    pen.hair([{ x: p.x - d.x * l * 0.3, y: p.y - d.y * l * 0.3 }, { x: p.x + d.x * l * 0.4, y: p.y + d.y * l * 0.4 + 0.2 }, { x: p.x + d.x * l, y: p.y + d.y * l }], px(k, weight), INK, alpha * (0.6 + pen.rng() * 0.4));
  });
}

// ---------------------------------------------------------------- teeth

const IVORY_ROOT = '#d8c8a2';
const IVORY = '#f6efdc';
const IVORY_TIP = '#fffdf4';

/** A fang from `base` toward `dir` (unit), `len` long and `width` wide at the gum, curving back by `curve` × len. */
export function fang(k: Brush, base: Pt, dir: Pt, len: number, width: number, curve: number, dim = 0): void {
  const { ctx, pen } = k;
  const n = { x: -dir.y, y: dir.x };
  const w = width / 2;
  const tip = { x: base.x + dir.x * len + n.x * curve * len, y: base.y + dir.y * len + n.y * curve * len };
  const a = { x: base.x - n.x * w, y: base.y - n.y * w };
  const b = { x: base.x + n.x * w, y: base.y + n.y * w };
  const ca = { x: base.x + dir.x * len * 0.55 - n.x * w * 0.85 + n.x * curve * len * 0.2, y: base.y + dir.y * len * 0.55 - n.y * w * 0.85 + n.y * curve * len * 0.2 };
  const cb = { x: base.x + dir.x * len * 0.6 + n.x * w * 1.1 + n.x * curve * len * 0.7, y: base.y + dir.y * len * 0.6 + n.y * w * 1.1 + n.y * curve * len * 0.7 };
  const q = (p0: Pt, c: Pt, p1: Pt): Pt[] => Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    const v = 1 - u;
    return { x: v * v * p0.x + 2 * u * v * c.x + u * u * p1.x, y: v * v * p0.y + 2 * u * v * c.y + u * u * p1.y };
  });
  const shape = [...q(a, ca, tip), ...q(tip, cb, b).slice(1)];
  const g = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
  g.addColorStop(0, IVORY_ROOT);
  g.addColorStop(0.35, IVORY);
  g.addColorStop(1, IVORY_TIP);
  ctx.save();
  path(ctx, shape);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Round: shade down the back edge, a highlight down the front.
  softLine(ctx, q(b, cb, tip), w * 0.9, '#9c8a68', 0.5);
  softLine(ctx, q({ x: a.x + n.x * w * 0.5, y: a.y + n.y * w * 0.5 }, ca, tip), w * 0.45, '#ffffff', 0.7);
  if (dim > 0) {
    ctx.fillStyle = `rgba(40,16,18,${dim})`;
    ctx.fillRect(-400, -400, 800, 800);
  }
  ctx.restore();
  pen.stroke([...shape], px(k, 0.9), INK, 0.85 * (1 - dim * 0.5), false);
}

/** A cheek tooth along the gum from `a` to `b`, its crown rising toward `dir` in rounded cusps: [u along, height]. */
export function cheekTooth(k: Brush, a: Pt, b: Pt, dir: Pt, cusps: readonly (readonly [number, number])[], dim = 0): void {
  const { ctx, pen } = k;
  const at = (u: number, h: number): Pt => ({ x: a.x + (b.x - a.x) * u + dir.x * h, y: a.y + (b.y - a.y) * u + dir.y * h });
  const knots: Pt[] = [at(0, -0.5), at(0.02, 0.8)];
  cusps.forEach(([u, h], i) => {
    if (i > 0) {
      const [pu, ph] = cusps[i - 1]!;
      knots.push(at((u + pu) / 2, Math.min(h, ph) * 0.45));
    }
    knots.push(at(u, h));
  });
  knots.push(at(0.98, 0.8), at(1, -0.5));
  const crown = spline(knots, 5);
  const back = at(0.5, -2.5);
  const shape = [...crown, back];
  const hMax = Math.max(...cusps.map(([, h]) => h));
  const g = ctx.createLinearGradient(back.x, back.y, back.x + dir.x * hMax, back.y + dir.y * hMax);
  g.addColorStop(0, IVORY_ROOT);
  g.addColorStop(0.45, IVORY);
  g.addColorStop(1, IVORY_TIP);
  ctx.save();
  path(ctx, shape);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Round: the far end of the crown in shade, the near face lit, a dark seam at the gum.
  softLine(ctx, [at(0.7, 0), at(1, hMax * 0.5)], hMax * 0.5, '#9c8a68', 0.45);
  softLine(ctx, crown.slice(2, -2).map((p) => ({ x: p.x - dir.x * 1, y: p.y - dir.y * 1 })), 1, '#ffffff', 0.55);
  softLine(ctx, [at(0, 0), at(1, 0)], 1.6, '#8a6a58', 0.5);
  if (dim > 0) {
    ctx.fillStyle = `rgba(40,16,18,${dim})`;
    ctx.fillRect(-400, -400, 800, 800);
  }
  ctx.restore();
  pen.stroke(crown, px(k, 1.05), INK, 0.85 * (1 - dim * 0.5), false);
}

/** The gum along a tooth row: pink, darker toward the lip, scalloped round the roots, a wet highlight. */
export function gum(k: Brush, line: readonly Pt[], dir: Pt, depth: number, colour = '#c86f7a'): void {
  const { ctx, pen } = k;
  const out = line.map((p, i) => ({ x: p.x + dir.x * (1.6 + 0.6 * Math.sin(i * 1.7)), y: p.y + dir.y * (1.6 + 0.6 * Math.sin(i * 1.7)) }));
  const back = [...line].reverse().map((p) => ({ x: p.x - dir.x * depth, y: p.y - dir.y * depth }));
  const shape = [...out, ...back];
  pen.fill(shape, colour, 1);
  pen.clipped(shape, () => {
    softLine(ctx, back, depth * 1.2, '#6a2630', 0.55);
    softLine(ctx, out.map((p) => ({ x: p.x - dir.x * 1.1, y: p.y - dir.y * 1.1 })), 1.2, '#f2b8bd', 0.6);
  });
  pen.hair(out, px(k, 0.7), '#5a1e26', 0.6);
}

// ---------------------------------------------------------------- the mouth's inside

function drawCavity(ctx: CanvasRenderingContext2D, rig: HeadRig, open: number, lw: number): void {
  if (open < 0.004) return;
  const lower = rig.floor.map((p) => turn(p, rig.hinge, open));
  const shape = [...rig.roof, rig.hinge, ...[...lower].reverse()];
  const front = rig.roof[0]!;
  ctx.save();
  path(ctx, shape);
  const g = ctx.createLinearGradient(rig.hinge.x, rig.hinge.y, front.x, front.y + 10 * open);
  g.addColorStop(0, rig.mouth.deep);
  g.addColorStop(0.55, rig.mouth.deep);
  g.addColorStop(1, rig.mouth.near);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // The palate: soft ridges under the roof.
  ctx.strokeStyle = 'rgba(220,140,150,0.35)';
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const p = rig.roof[Math.floor(((i + 0.5) / 6) * (rig.roof.length - 1) * 0.8)]!;
    ctx.beginPath();
    ctx.moveTo(p.x + 2, p.y + 2.5);
    ctx.quadraticCurveTo(p.x - 1, p.y + 4.5, p.x - 4, p.y + 3);
    ctx.stroke();
  }
  // The tongue, lying along the floor of the jaw.
  const m = rig.mouth;
  const reach = Math.floor((1 - m.tongueReach) * (lower.length - 1));
  const along = lower.slice(reach);
  if (along.length > 1) {
    const ns = normals(along, -1);
    const top = along.map((p, i) => {
      const u = i / (along.length - 1);
      const lift = m.tongueThick * Math.sin(Math.PI * (0.15 + 0.85 * u)) ** 0.6 * (0.5 + 0.5 * Math.min(1, open * 2));
      return { x: p.x + ns[i]!.x * lift, y: p.y + ns[i]!.y * lift };
    });
    const tongue = [...top, ...[...along].reverse().map((p) => turn(p, rig.hinge, 0.02))];
    path(ctx, tongue);
    const tg = ctx.createLinearGradient(top[0]!.x, top[0]!.y, along[0]!.x, along[0]!.y);
    tg.addColorStop(0, m.tongue);
    tg.addColorStop(1, m.tongue);
    ctx.fillStyle = tg;
    ctx.fill();
    softLine(ctx, top.slice(1, -2).map((p, i) => ({ x: p.x - ns[i + 1]!.x * 1.2, y: p.y - ns[i + 1]!.y * 1.2 })), 2.2, m.tongueLit, 0.75);
    ctx.strokeStyle = 'rgba(90,24,34,0.6)';
    ctx.lineWidth = 0.9 * lw;
    ctx.beginPath();
    top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  // The far side's lips across the front of the gape, bowing back toward the throat.
  const tip = lower[0]!;
  const bow = { x: (front.x + tip.x) / 2 - 7 * open, y: (front.y + tip.y) / 2 - 2 * open };
  ctx.strokeStyle = 'rgba(40,14,18,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(front.x - 2, front.y + 1);
  ctx.quadraticCurveTo(bow.x, bow.y, tip.x - 2, tip.y - 1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,110,120,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Shadow deep in the throat and under the roof.
  const sg = ctx.createRadialGradient(rig.hinge.x, rig.hinge.y, 0, rig.hinge.x, rig.hinge.y, 40);
  sg.addColorStop(0, 'rgba(10,2,4,0.85)');
  sg.addColorStop(1, 'rgba(10,2,4,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(rig.hinge.x - 40, rig.hinge.y - 40, 80, 80);
  ctx.restore();
}

function drawTurned(ctx: CanvasRenderingContext2D, about: Pt, a: number, c: HTMLCanvasElement, box: Box, res: number): void {
  ctx.save();
  ctx.translate(about.x, about.y);
  ctx.rotate(a);
  ctx.translate(-about.x, -about.y);
  blit(ctx, c, box, res);
  ctx.restore();
}

/** Turns a rig into the contract's draw function and its prepare. */
export function makeHead(rig: HeadRig): { readonly draw: DrawHead; readonly prepare: () => Promise<void> } {
  const spritesFor = lazily((b: Bucket) => ({
    res: b.res,
    body: frames(rig.box, b, rig.seed, rig.paintBody),
    jaw: frames(rig.jawBox, b, rig.seed + 31, rig.paintJaw),
    upper: frames(rig.teethBox, b, rig.seed + 57, rig.paintUpper),
    lower: frames(rig.teethBox, b, rig.seed + 83, rig.paintLower),
  }));
  const draw: DrawHead = (ctx, p) => {
    const k = p.size / 100;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(k, k);
    const scale = screenScale(ctx);
    const s = spritesFor(headBucket(scale));
    const f = ((Math.floor(p.t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
    const open = clamp01(p.jaw) * rig.jawMax;
    drawCavity(ctx, rig, open, 1 / scale);
    drawTurned(ctx, rig.hinge, open, s.lower[f]!, rig.teethBox, s.res);
    blit(ctx, s.upper[f]!, rig.teethBox, s.res);
    drawTurned(ctx, rig.hinge, open, s.jaw[f]!, rig.jawBox, s.res);
    blit(ctx, s.body[f]!, rig.box, s.res);
    rig.live(ctx, p.t, 1 / scale, open);
    ctx.restore();
  };
  // Bake the size the kit preview and the video's close-ups use first.
  const prepare = async (): Promise<void> => {
    spritesFor(headBucket(6));
  };
  return { draw, prepare };
}

// ---------------------------------------------------------------- the eye

export interface EyeLook {
  readonly at: Pt;
  /** Corner to corner, and the opening's half height. */
  readonly w: number;
  readonly h: number;
  /** Radians: + lowers the front (right) corner. */
  readonly tilt: number;
  readonly irisIn: string;
  readonly irisOut: string;
  /** Pupil radius as a share of the half height. */
  readonly pupil: number;
  /** The fur colour of the lid, for the blink. */
  readonly lid: string;
  /** Pale fur ringing the eye (rgb "r,g,b"), or null. */
  readonly ring: string | null;
}

/** An almond eye in profile: a dark rim, the iris filling it, a round pupil, a catchlight, the lid's shadow; it blinks. */
export function drawEye(ctx: CanvasRenderingContext2D, e: EyeLook, shut: number, lw: number): void {
  const { w, h } = e;
  const hw = w / 2;
  const lidY = (s: number): number => -h + 2 * h * 0.92 * s;
  const almond = (grow: number, top: number): Path2D => {
    const p = new Path2D();
    p.moveTo(-hw - grow, 0.6);
    p.bezierCurveTo(-hw * 0.4, top - grow * 1.2, hw * 0.45, top - grow * 1.2, hw + grow, -0.2);
    p.bezierCurveTo(hw * 0.4, h * 1.05 + grow, -hw * 0.4, h * 1.1 + grow, -hw - grow, 0.6);
    p.closePath();
    return p;
  };
  ctx.save();
  ctx.translate(e.at.x, e.at.y);
  ctx.rotate(e.tilt);
  if (e.ring) {
    const g = ctx.createRadialGradient(0, h * 0.4, h, 0, h * 0.4, w * 1.05);
    g.addColorStop(0, `rgba(${e.ring},0.75)`);
    g.addColorStop(1, `rgba(${e.ring},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-w * 1.2, -w, w * 2.4, w * 2);
  }
  // The dark rim of the lids.
  ctx.fillStyle = '#1a110b';
  ctx.fill(almond(1.1, -h * 1.15));
  const open = almond(0, -h);
  ctx.save();
  ctx.clip(open);
  // The iris fills most of the visible eye; the white just shows at the back corner.
  ctx.fillStyle = '#d9cdb4';
  ctx.fillRect(-hw - 2, -h - 2, w + 4, 2 * h + 4);
  const ix = hw * 0.18;
  const ir = h * 1.18;
  const ig = ctx.createRadialGradient(ix, 0, ir * 0.15, ix, 0, ir);
  ig.addColorStop(0, e.irisIn);
  ig.addColorStop(0.75, e.irisOut);
  ig.addColorStop(1, '#3a2410');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.ellipse(ix, 0.1 * h, ir * 0.82, ir, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fine radial streaks in the iris.
  ctx.strokeStyle = 'rgba(90,50,10,0.35)';
  ctx.lineWidth = 0.6 * lw;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(ix + Math.cos(a) * ir * 0.35, Math.sin(a) * ir * 0.4);
    ctx.lineTo(ix + Math.cos(a) * ir * 0.75, Math.sin(a) * ir * 0.85);
    ctx.stroke();
  }
  ctx.fillStyle = '#0a0706';
  ctx.beginPath();
  ctx.ellipse(ix + hw * 0.05, 0.12 * h, h * e.pupil * 0.82, h * e.pupil, 0, 0, Math.PI * 2);
  ctx.fill();
  // The upper lid's shadow across the top of the eye.
  const sg = ctx.createLinearGradient(0, -h, 0, h * 0.2);
  sg.addColorStop(0, 'rgba(20,10,4,0.75)');
  sg.addColorStop(1, 'rgba(20,10,4,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-hw - 2, -h - 2, w + 4, h * 1.4);
  // Catchlights: a bright one up front, a faint one low behind.
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(ix + hw * 0.32, -h * 0.28, h * 0.26, h * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(ix - hw * 0.3, h * 0.5, h * 0.12, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  if (shut > 0.01) {
    // The lid, furred, drawn down over the eye.
    ctx.fillStyle = e.lid;
    ctx.fillRect(-hw - 3, -h - 3, w + 6, lidY(shut) + h + 3);
    ctx.fillStyle = '#1a110b';
    ctx.fillRect(-hw - 3, lidY(shut) - 0.5, w + 6, 0.9);
  }
  ctx.restore();
  // The upper lid's ink line, heavier toward the front.
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6 * lw;
  ctx.beginPath();
  ctx.moveTo(-hw - 1, 0.4);
  ctx.bezierCurveTo(-hw * 0.4, -h * 1.15 - 1, hw * 0.45, -h * 1.15 - 1, hw + 1.1, -0.2);
  ctx.stroke();
  ctx.lineWidth = 0.9 * lw;
  ctx.beginPath();
  ctx.moveTo(hw + 1.1, -0.2);
  ctx.bezierCurveTo(hw * 0.4, h * 1.05 + 1, -hw * 0.4, h * 1.1 + 1, -hw - 1, 0.6);
  ctx.stroke();
  ctx.restore();
}

/** Whiskers: long tapered hairs from the pad, `sway` a slow idle drift. */
export function whiskers(ctx: CanvasRenderingContext2D, roots: readonly Pt[], aims: readonly Pt[], colour: string, lw: number, sway: number, alpha = 0.85): void {
  roots.forEach((r, i) => {
    const a = aims[i % aims.length]!;
    const tip = { x: r.x + a.x, y: r.y + a.y + sway * (0.5 + 0.5 * Math.sin(i * 2.3)) };
    const mid = { x: r.x + a.x * 0.5, y: r.y + a.y * 0.42 + sway * 0.2 - Math.abs(a.x) * 0.06 };
    const pts = resample([r, mid, tip], 8);
    taper(ctx, pts.map((p) => ({ x: p.x + 0.35, y: p.y + 0.45 })), 1.6 * lw, 0.3 * lw, 'rgba(30,20,10,1)', alpha * 0.35);
    taper(ctx, pts, 1.6 * lw, 0.3 * lw, colour, alpha);
  });
}

/** An irregular blob of colour (a spot): `rng` fixed per animal so the markings hold still while the ink boils. */
export function blobShape(c: Pt, rx: number, ry: number, angle: number, rng: () => number, points = 8): Pt[] {
  const [cs, sn] = [Math.cos(angle), Math.sin(angle)];
  const radii = Array.from({ length: points }, () => 0.72 + rng() * 0.45);
  return Array.from({ length: points * 3 }, (_, i) => {
    const a = (i / (points * 3)) * Math.PI * 2;
    const f = (i % 3) / 3;
    const r = radii[Math.floor(i / 3)]! * (1 - f) + radii[(Math.floor(i / 3) + 1) % points]! * f;
    const x = Math.cos(a) * rx * r;
    const y = Math.sin(a) * ry * r;
    return { x: c.x + x * cs - y * sn, y: c.y + x * sn + y * cs };
  });
}
