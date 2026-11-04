import { INK, makeCanvas, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { softLine } from '../../seal/art/paint';
import { MOUTH } from './catfishShape';
import { cloud, field, glint, open, skin, step } from './skin';

/**
 * The long eel-like body behind the head: a tube laid along a fixed path in the
 * world, from the gravel out into the river. The path runs away to the right,
 * turns back on itself and crosses the frame behind the head, smaller and
 * smaller with distance, so the fish's length is what the eye takes in.
 *
 * The skin is baked once as the tube unrolled (along the fish one way, round it
 * the other), then laid down slice by slice along the path. Each slice shows the
 * half of the tube that faces the camera, so the dark back stays uppermost as
 * the body turns. To slide back the fish simply moves along the path, tail
 * first, into the water, the way an eel goes.
 */

/** The path in frame 1's pixels: from the mouth, the neck, round the turn, to where the tail is lost in the river; and how far away each point is (1 near). */
const PATH: readonly (readonly [number, number, number])[] = [
  [MOUTH.x, MOUTH.y, 1], [600, 812, 1], [760, 762, 1], [896, 716, 0.97], [1030, 650, 0.92], [1130, 560, 0.86], [1172, 460, 0.8], [1112, 372, 0.74], [960, 338, 0.68],
  [780, 330, 0.62], [600, 328, 0.56], [430, 318, 0.5], [270, 300, 0.44], [130, 272, 0.38], [10, 240, 0.33], [-110, 205, 0.28],
];

/** Fish-length units from the mouth to the neck, and from the neck to the tail's tip. */
const NECK = 330;
const BODY = 3000;
/** Half the body's depth at the neck. */
const DEPTH = 232;
/** Half the depth at a point `s` of the way from the neck to the tail, before distance. */
const depthAt = (s: number): number => DEPTH * (1 - 0.95 * Math.min(1, s) ** 1.25);

const STEP = 6;

export interface SpinePoint { readonly x: number; readonly y: number; readonly a: number; readonly p: number; readonly turn: number }

/** The path resampled at even steps of length along the fish (a far stretch of the fish looks shorter). */
const SPINE: readonly SpinePoint[] = (() => {
  const line = open(PATH.map(([x, y]) => ({ x, y })), 24);
  const size = open(PATH.map(([x,, p]) => ({ x, y: p })), 24).map((q) => q.y);
  const out: SpinePoint[] = [];
  let a = 0;
  let due = 0;
  let along = 0;
  for (let i = 1; i < line.length; i++) {
    const [p0, p1] = [line[i - 1]!, line[i]!];
    const d = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const raw = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    a += Math.atan2(Math.sin(raw - a), Math.cos(raw - a));
    const p = size[i]!;
    along += d / p;
    while (along >= due) {
      // Which half of the tube faces the camera: one flank before the turn, the other after it.
      out.push({ x: p1.x, y: p1.y, a, p, turn: step(-0.75, -2.75, a) });
      due += STEP;
    }
  }
  return out;
})();

/** How far along the path (fish-length units) it runs out, in the river. */
const SPINE_END = (SPINE.length - 1) * STEP;

export function spineAt(along: number): SpinePoint {
  const u = Math.max(0, Math.min(SPINE.length - 1.001, along / STEP));
  const i = Math.floor(u);
  const [a, b] = [SPINE[i]!, SPINE[i + 1]!];
  const f = u - i;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: a.a + (b.a - a.a) * f, p: a.p + (b.p - a.p) * f, turn: a.turn + (b.turn - a.turn) * f };
}

/** A point of the path (frame 1's pixels), `lift` to the left of travel. */
export function spineSide(along: number, lift: number): Pt {
  const s = spineAt(along);
  return { x: s.x + Math.sin(s.a) * lift, y: s.y - Math.cos(s.a) * lift };
}

// ---------------------------------------------------------------- the skin

const TEX = { w: 2200, h: 880 };
/** The skin starts this far (of the body's length) ahead of the neck, under the head. */
const LEAD_IN = 0.07;
const texAt = (s: number): number => ((s + LEAD_IN) / (1 + LEAD_IN)) * TEX.w;

/** Round the tube, 0 the ridge of the back .. 1 the belly, to the row: rows run belly, one flank, back, other flank, belly. */
const rowOf = (theta: number): number => ((Math.PI - theta) / (2 * Math.PI)) * TEX.h;

function bakeTube(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TEX.w, TEX.h);
  const grain = 0.34;
  field(ctx, 0, 0, TEX.w, TEX.h, 0.5, (x, y) => {
    const s = (x / TEX.w) * (1 + LEAD_IN) - LEAD_IN;
    const round = Math.abs(y / TEX.h - 0.5) * 2;
    const dark = 1.02 - step(0.34, 0.74, round);
    return skin(dark, cloud((s * BODY + 900) * grain, (y - TEX.h / 2) * (depthAt(Math.max(0, s)) / DEPTH) * grain * 0.75 + 60));
  });
  // Form: the ridge, the light along the upper flank, the turn under to the belly.
  const g = ctx.createLinearGradient(0, TEX.h / 2, 0, TEX.h);
  for (const [at, c] of [[0, 'rgba(12,12,6,0.34)'], [0.13, 'rgba(12,12,6,0.06)'], [0.26, 'rgba(214,226,206,0.2)'], [0.4, 'rgba(214,226,206,0)'], [0.62, 'rgba(26,24,14,0.3)'], [0.8, 'rgba(30,28,16,0.05)'], [0.93, 'rgba(30,28,16,0.14)'], [1, 'rgba(30,28,16,0.5)']] as const) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, TEX.h / 2, TEX.w, TEX.h / 2);
  ctx.save();
  ctx.translate(0, TEX.h);
  ctx.scale(1, -1);
  ctx.fillRect(0, TEX.h / 2, TEX.w, TEX.h / 2);
  ctx.restore();
  // The lateral line, and the wet: long soft lights and a few hard ones along both flanks.
  const rng = createRng(29);
  for (const side of [-1, 1]) {
    const row = (d: number): number => TEX.h / 2 + side * d * (TEX.h / 2);
    softLine(ctx, Array.from({ length: 40 }, (_, i) => ({ x: (i / 39) * TEX.w, y: row(0.56) + 3 * Math.sin(i * 0.7) })), 2.4, '#16140a', 0.42, 1);
    for (let i = 0; i < 26; i++) {
      const x = rng() * TEX.w;
      const len = 50 + rng() * 160;
      softLine(ctx, [{ x, y: row(0.25) + rng() * 16 }, { x: x + len, y: row(0.25) + rng() * 16 }], 7, '#f4faf0', 0.46, 3);
    }
    for (let i = 0; i < 46; i++) glint(ctx, rng() * TEX.w, row(0.16 + rng() * 0.46), 6 + rng() * 13, 1 + rng(), (rng() - 0.5) * 0.2, 0.7);
  }
  return canvas;
}

let tube: HTMLCanvasElement | null = null;

// ---------------------------------------------------------------- on screen

export interface BodyLook {
  /** How far the fish has slid back along the path. */
  readonly back: number;
  /** The head's sway, frame 1's pixels; it dies away along the body. */
  readonly lead: Pt;
  /** Tail-beat phase, radians. */
  readonly beat: number;
}

interface Slice { readonly x: number; readonly y: number; readonly a: number; readonly h: number; readonly s: number; readonly turn: number; readonly fade: number; readonly along: number }

/** Where the fish lies this frame, neck to tail. */
function slices(look: BodyLook): Slice[] {
  const out: Slice[] = [];
  const first = look.back + NECK - 200;
  for (let along = first; along <= look.back + NECK + BODY && along <= SPINE_END; along += STEP) {
    const pt = spineAt(along);
    const s = (along - look.back - NECK) / BODY;
    const swing = 34 * step(0.16, 1, s) * Math.sin(look.beat - s * 8);
    const die = Math.exp(-Math.max(0, s) * 7);
    out.push({
      x: pt.x + Math.sin(pt.a) * swing + look.lead.x * die,
      y: pt.y - Math.cos(pt.a) * swing + look.lead.y * die,
      a: pt.a,
      h: depthAt(Math.max(0, s)) * pt.p,
      s,
      turn: pt.turn,
      fade: (1 - step(SPINE_END - 420, SPINE_END - 30, along)) * (1 - step(0.86, 0.99, s)),
      along,
    });
  }
  return out;
}

function layTube(ctx: CanvasRenderingContext2D, list: readonly Slice[]): void {
  tube ??= bakeTube();
  const skinH = TEX.h / 2;
  for (let i = list.length - 2; i >= 0; i--) {
    const [a, b] = [list[i]!, list[i + 1]!];
    const mid = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // Long enough to meet its neighbour on the outside of a bend.
    const rim = Math.max(...[1, -1].map((k) => Math.hypot(b.x + Math.sin(b.a) * b.h * k - a.x - Math.sin(a.a) * a.h * k, b.y - Math.cos(b.a) * b.h * k - a.y + Math.cos(a.a) * a.h * k)));
    const len = Math.max(mid, rim) + 3;
    const sx = Math.max(0, Math.min(TEX.w - 3, texAt(a.s)));
    const sw = (texAt(b.s) - texAt(a.s)) * (len / mid);
    const top = rowOf(Math.PI * a.turn);
    ctx.save();
    ctx.globalAlpha = a.fade;
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    ctx.drawImage(tube, sx, Math.max(0, top), sw, skinH, 0, -a.h, len, 2 * a.h);
    ctx.restore();
  }
}

const edge = (list: readonly Slice[], side: number): Pt[] => list.map((p) => ({ x: p.x + Math.sin(p.a) * p.h * side, y: p.y - Math.cos(p.a) * p.h * side }));

function outline(ctx: CanvasRenderingContext2D, list: readonly Slice[], ink: number): void {
  const seen = list.filter((p) => p.fade > 0.5 && p.s > -0.02);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.4 * ink;
  ctx.globalAlpha = 0.82;
  for (const side of [1, -1]) {
    const line = edge(seen, side);
    ctx.beginPath();
    line.forEach((p, i) => {
      // Inside a tight bend the edge runs backwards over itself: lift the pen there.
      const q = line[i - 1];
      const on = q && (p.x - q.x) * Math.cos(seen[i]!.a) + (p.y - q.y) * Math.sin(seen[i]!.a) > 0;
      if (on) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/** A fin on the body between s0 and s1, raked towards the tail, standing `tall(u)` (fish units) out of the side given (+1 is to the left of travel). */
function fin(ctx: CanvasRenderingContext2D, list: readonly Slice[], s0: number, s1: number, side: 1 | -1, tall: (u: number) => number, ink: number, rays: number, colours: readonly [string, string]): void {
  const part = list.filter((p) => p.s >= s0 && p.s <= s1);
  if (part.length < 3) return;
  const root = part.map((p) => ({ x: p.x + Math.sin(p.a) * p.h * 0.94 * side, y: p.y - Math.cos(p.a) * p.h * 0.94 * side }));
  const tip = part.map((p, i) => {
    const t = tall(i / (part.length - 1)) * spineSize(p);
    return { x: p.x + Math.sin(p.a) * (p.h + t) * side + Math.cos(p.a) * t * 0.4, y: p.y - Math.cos(p.a) * (p.h + t) * side + Math.sin(p.a) * t * 0.4 };
  });
  const shape = [...root, ...[...tip].reverse()];
  const g = ctx.createLinearGradient(root[0]!.x, root[0]!.y, root[0]!.x, tip[0]!.y + 1);
  g.addColorStop(0, colours[0]);
  g.addColorStop(1, colours[1]);
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.globalAlpha = part[Math.floor(part.length / 2)]!.fade;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * ink;
  ctx.globalAlpha = 0.34;
  for (let i = 0; i < part.length; i += rays) {
    ctx.beginPath();
    ctx.moveTo(root[i]!.x, root[i]!.y);
    ctx.lineTo(tip[i]!.x, tip[i]!.y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6 * ink;
  ctx.globalAlpha = 0.74;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  tip.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

const spineSize = (p: Slice): number => (p.h > 0 ? p.h / Math.max(1e-6, depthAt(Math.max(0, p.s))) : 1);

/** The body in the current own-unit frame (frame 1's pixels). `ink` is one world px in own units. */
export function drawBody(ctx: CanvasRenderingContext2D, look: BodyLook, ink: number): void {
  const list = slices(look);
  fin(ctx, list, 0.3, 0.985, 1, (u) => 74 * step(0, 0.1, u) * (1 - 0.32 * u), ink, 3, ['#4d4c34', '#8d8a64']);
  layTube(ctx, list);
  outline(ctx, list, ink);
  fin(ctx, list, 0.33, 0.375, -1, (u) => 74 * Math.sin(Math.PI * u ** 0.7), ink, 2, ['#3d3a26', '#7b7652']);
}

/** Bright streams running off the belly (frame 1's pixels): where water leaves the body. */
export function bodyEdge(look: BodyLook, from: number, to: number, n: number): Pt[] {
  const list = slices(look);
  return Array.from({ length: n }, (_, i) => {
    const s = from + ((to - from) * i) / Math.max(1, n - 1);
    const p = list.reduce((best, q) => (Math.abs(q.s - s) < Math.abs(best.s - s) ? q : best), list[0]!);
    const side = p.turn > 0.5 ? 1 : -1;
    return { x: p.x + Math.sin(p.a) * p.h * side, y: p.y - Math.cos(p.a) * p.h * side };
  });
}

/** The tail, where the river takes it (frame 1's pixels). */
export function tailEnd(look: BodyLook): Pt {
  const list = slices(look);
  const live = list.filter((p) => p.fade > 0.35);
  const p = live[live.length - 1] ?? list[list.length - 1]!;
  return { x: p.x, y: p.y };
}
