import { type Draw, edge, makeDraw, oval, shade } from '../../../src/art/kit';
import { BOIL, INK, PAPER_FILL } from '../../../src/art/palette';
import { makeCanvas, type Pt as PenPt } from '../../../src/art/pen';
import { boilAt, type Pt } from '../sprites';
import { shakeAt } from './moves';
import {
  COIL, CROC_L, crocPoint, GROUND, gapeOf, HIPS_U, type HookShot, hookShot, NECK_HALF, neckHalf, RIM, S_BODY_END, S_RIM, TRACK, VIEW,
} from './profile';
import { type BodySide, OLIVE, outline, paintBody } from './profileBody';
import { drawCroc, drawCrocInside } from './profileCroc';
import { cycles } from './story';

/**
 * Draws the side-on hook (profile.ts has the pose): the lake shore at night
 * behind, the python's coil, the croc's back half sticking out of the mouth,
 * the neck swollen round its shoulders, and the head on top with its jaws
 * stretched round the croc's body.
 */

/** The warm dusk light catching the tops of the bodies. */
export const DUSK = '#f2a65a';

/** The backdrop is painted once per boil frame over this part of the view (art units). */
const BACK = { x: -30, y: -40, w: 290, h: 470, res: 5 } as const;

function paintBackdrop(d: Draw): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const sky = ctx.createLinearGradient(0, BACK.y, 0, 128);
  sky.addColorStop(0, '#141a33');
  sky.addColorStop(0.62, '#4a3446');
  sky.addColorStop(1, '#a8603e');
  ctx.fillStyle = sky;
  ctx.fillRect(BACK.x, BACK.y, BACK.w, 170);
  // The far bank: trees and reeds, dark against the sky.
  const bank: Pt[] = [{ x: BACK.x, y: 132 }];
  for (let x = BACK.x; x <= BACK.x + BACK.w; x += 3) {
    const tree = Math.max(0, Math.sin(x * 0.045 + 1.3)) * 16 + Math.max(0, Math.sin(x * 0.11 + 0.4)) * 7 + Math.sin(x * 0.7) * 1.2;
    bank.push({ x, y: 124 - tree });
  }
  bank.push({ x: BACK.x + BACK.w, y: 132 });
  pen.fill(bank, '#1c1a1e', 1);
  pen.hair(bank.slice(1, -1), 0.5, '#d08a52', 0.5);
  // The lake.
  const lake = ctx.createLinearGradient(0, 124, 0, 174);
  lake.addColorStop(0, '#6a4c48');
  lake.addColorStop(0.25, '#3a4048');
  lake.addColorStop(1, '#34474a');
  ctx.fillStyle = lake;
  ctx.fillRect(BACK.x, 124, BACK.w, 52);
  for (let i = 0; i < 26; i++) {
    const x = BACK.x + d.pen.rng() * BACK.w;
    const y = 128 + d.pen.rng() * 42;
    pen.hair([{ x, y }, { x: x + 6 + d.pen.rng() * 14, y: y + 0.3 }], 0.35, '#f0b07a', 0.22 + d.pen.rng() * 0.14);
  }
  // The mud, wet at the water's edge.
  const mud = ctx.createLinearGradient(0, 170, 0, BACK.y + BACK.h);
  mud.addColorStop(0, '#7a6040');
  mud.addColorStop(0.3, '#5c4630');
  mud.addColorStop(1, '#2e2218');
  const edgeLine: Pt[] = [];
  for (let x = BACK.x; x <= BACK.x + BACK.w; x += 4) edgeLine.push({ x, y: 172 + Math.sin(x * 0.09) * 1.6 + Math.sin(x * 0.23) * 0.8 });
  const ground = [...edgeLine, { x: BACK.x + BACK.w, y: BACK.y + BACK.h }, { x: BACK.x, y: BACK.y + BACK.h }];
  ctx.save();
  ctx.fillStyle = mud;
  ctx.beginPath();
  ground.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.fill([...edgeLine, ...edgeLine.map((p) => ({ x: p.x, y: p.y + 5 })).reverse()], '#7d6847', 0.35);
  pen.hair(edgeLine, 0.6, '#a9967a', 0.45);
  pen.stipple(ground, 2600, (_, y) => Math.min(0.9, (y - 170) / 120), 0.45, '#140e08');
  for (const [x, y, rx, ry] of [[22, 238, 20, 2.6], [178, 230, 24, 3], [96, 286, 30, 4], [10, 330, 26, 4.5]] as const) {
    pen.fill(oval(x, y, rx, ry, 26), '#20333a', 0.75);
    pen.hair([{ x: x - rx * 0.6, y: y - ry * 0.3 }, { x: x + rx * 0.3, y: y - ry * 0.4 }], 0.5, '#8fb0a6', 0.4);
  }
  for (let i = 0; i < 40; i++) {
    const x = BACK.x + d.pen.rng() * BACK.w;
    const y = 182 + d.pen.rng() * 200;
    const w = 3 + d.pen.rng() * 8;
    pen.hair([{ x, y }, { x: x + w / 2, y: y - 0.6 }, { x: x + w, y }], 0.35, '#120c06', 0.35);
  }
  // Reeds at the water's edge, at both sides.
  for (const [x0, lean] of [[-4, 0.1], [3, -0.05], [9, 0.16], [206, -0.12], [213, 0.05], [219, -0.2]] as const) {
    const base = { x: x0, y: 176 };
    const tip = { x: x0 + lean * 70, y: 96 + Math.abs(lean) * 40 };
    pen.stroke([base, { x: (base.x + tip.x) / 2 + lean * 6, y: (base.y + tip.y) / 2 }, tip], 1.1, '#1d2a1a', 0.95, false);
  }
}

function paintCoil(d: Draw): void {
  const spine: Pt[] = [];
  for (let s = 0; s <= COIL.length; s += 1) spine.push(COIL.at(s));
  const b: BodySide = { spine, halves: spine.map(() => NECK_HALF), stretch: spine.map(() => 0) };
  const shape = outline(b);
  paintBody(d, b, shape);
  edge(d, shape, 1.3);
}

let backdrops: HTMLCanvasElement[] | null = null;

function backdrop(boil: number): HTMLCanvasElement {
  if (!backdrops) {
    backdrops = Array.from({ length: BOIL }, (_, f) => {
      const { canvas, ctx } = makeCanvas(BACK.w * BACK.res, BACK.h * BACK.res);
      ctx.scale(BACK.res, BACK.res);
      ctx.translate(-BACK.x, -BACK.y);
      paintBackdrop(makeDraw(ctx, 7100, f, GROUND));
      paintCoil(makeDraw(ctx, 7200 + f, f, GROUND));
      return canvas;
    });
  }
  return backdrops[boil % BOIL]!;
}

// ---------------------------------------------------------------- the head

interface Head {
  /** Head-local (x back from the upper lip's front, y down) to art units. */
  readonly at: (q: Pt) => Pt;
  readonly lipFront: Pt;
  readonly chin: Pt;
  readonly hinge: Pt;
}

function headOf(shot: HookShot): Head {
  const g = gapeOf(shot);
  const front = { x: RIM.x - 3, y: RIM.y - g.top };
  const pivot = { x: front.x + 44, y: front.y + 2 };
  const [cs, sn] = [Math.cos(shot.tilt), Math.sin(shot.tilt)];
  const at = (q: Pt): Pt => {
    const x = front.x + q.x - pivot.x;
    const y = front.y + q.y - pivot.y;
    return { x: pivot.x + x * cs - y * sn, y: pivot.y + x * sn + y * cs };
  };
  return { at, lipFront: at({ x: 0, y: 0 }), chin: { x: RIM.x - 1, y: RIM.y + g.bottom + 0.6 }, hinge: at({ x: 44, y: 6.5 }) };
}

const LIP: readonly Pt[] = [{ x: 0, y: 0 }, { x: 10, y: 0.7 }, { x: 22, y: 1.9 }, { x: 33, y: 3.4 }, { x: 42, y: 5 }];
const SNOUT: readonly Pt[] = [
  { x: 0, y: 0 }, { x: -4, y: -0.6 }, { x: -7.5, y: -2.6 }, { x: -9, y: -5.5 }, { x: -8.6, y: -8.6 }, { x: -6.4, y: -11.4 }, { x: -2.4, y: -13.4 },
  { x: 4, y: -14.6 }, { x: 12, y: -15.3 }, { x: 21, y: -15.5 }, { x: 31, y: -14.8 }, { x: 40, y: -13.2 },
];

/** A quadratic curve's points. */
function quad(a: Pt, c: Pt, b: Pt, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  });
}

/** The neck's top edge point at track place s. */
function neckTop(shot: HookShot, s: number): Pt {
  const p = TRACK.at(s);
  const h = TRACK.heading(s);
  const w = neckHalf(shot, s);
  return { x: p.x + Math.sin(h) * w, y: p.y - Math.cos(h) * w };
}

/** A cubic curve's points. */
function cubic(a: Pt, c0: Pt, c1: Pt, b: Pt, n = 20): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * b.y,
    };
  });
}

/** The lips' ring seen side on: from the upper lip's front, round the croc's back, bulging forward round its flank, to the chin under its belly. */
function rimCurve(h: Head): Pt[] {
  const depth = h.chin.y - h.lipFront.y;
  return cubic(h.lipFront, { x: h.lipFront.x - 7, y: h.lipFront.y + depth * 0.12 }, { x: h.chin.x - 11, y: h.chin.y - depth * 0.1 }, h.chin, 24);
}

function neckSide(shot: HookShot): BodySide {
  const spine: Pt[] = [];
  const halves: number[] = [];
  const stretch: number[] = [];
  const bow: number[] = [];
  for (let s = S_RIM - 14; s <= S_BODY_END; s += 1) {
    const w = neckHalf(shot, Math.max(S_RIM, s));
    const st = Math.min(1, Math.max(0, (w - NECK_HALF - 1) / 9));
    spine.push(TRACK.at(s));
    halves.push(w);
    stretch.push(st);
    bow.push(st * (3 + 4 * Math.max(0, 1 - (s - S_RIM) / 50)));
  }
  return { spine, halves, stretch, bow };
}

/** Where the neck turns off the right of the view and the body comes back across the foreground. */
const S_TURN = S_RIM + 100;

/** The neck's top and bottom edges from the lips on. */
function neckEdges(shot: HookShot, head: Head): { after: Pt[]; below: Pt[] } {
  const after: Pt[] = [];
  const below: Pt[] = [];
  // Behind the skull the skin runs from its crown down over the croc, smoothly.
  const crown = head.at(SNOUT[SNOUT.length - 1]!);
  for (let s = S_RIM; s <= S_BODY_END; s += 2) {
    const q = neckTop(shot, s);
    const k = s > S_RIM + 80 ? 1 : Math.min(1, Math.max(0, (q.x - crown.x) / 30));
    const lift = crown.y + 1.5 + (q.y - crown.y - 1.5) * k * k * (3 - 2 * k);
    after.push({ x: q.x, y: Math.min(q.y, lift) });
    const p = TRACK.at(s);
    const h = TRACK.heading(s);
    const w = neckHalf(shot, s);
    below.push({ x: p.x - Math.sin(h) * w, y: p.y + Math.cos(h) * w });
  }
  return { after, below };
}

/** The neck's outline: the lips' ring at its front. */
function neckClip(shot: HookShot, head: Head): Pt[] {
  const { after, below } = neckEdges(shot, head);
  return [...rimCurve(head), ...below, ...[...after].reverse()];
}

function drawNeck(d: Draw, shot: HookShot, head: Head): void {
  const body = neckSide(shot);
  const { after, below } = neckEdges(shot, head);
  const clip = neckClip(shot, head);
  d.pen.clipped(clip, () => {
    paintBody(d, body, clip);
    // The croc's shape showing faintly through the stretched skin.
    drawCrocInside(d, shot);
  });
  d.pen.stroke(below, 1.4, INK, 1, false);
  d.pen.stroke(after, 1.4, INK, 1, false);
  // The dusk light on its back: the neck's top edge, then (the body having turned) the foreground strand's.
  const turn = Math.round((S_TURN - S_RIM) / 2);
  const inset = (pts: readonly Pt[], dy: number): Pt[] => pts.map((p) => ({ x: p.x, y: p.y + dy }));
  d.pen.stroke(inset(after.slice(4, turn), 1.3), 1.2, DUSK, 0.5, false);
  d.pen.stroke(inset(below.slice(turn + 20), 1.3), 1.2, DUSK, 0.5, false);
}

function drawHead(d: Draw, shot: HookShot, head: Head): void {
  const { pen } = d;
  const at = head.at;
  // The skull: snout, crown, and down its back to the jaw's hinge (the neck's skin runs on from the crown).
  const crown = at(SNOUT[SNOUT.length - 1]!);
  const back = quad(crown, at({ x: 47, y: -7 }), head.hinge, 10);
  const top = [...SNOUT].reverse().map(at);
  const shape = [...SNOUT.map(at), ...back.slice(1), ...[...LIP].reverse().map(at)];
  pen.fill(shape, OLIVE.back, 1);
  pen.fill([...SNOUT.slice(5).map(at), at({ x: 46, y: -10 }), at({ x: 36, y: -9 }), at({ x: 18, y: -10.5 }), at({ x: 2, y: -9.5 })], OLIVE.lit, 0.75);
  // Small head scales, a stippled grain.
  pen.stipple(shape, 700, () => 0.45, 0.35, OLIVE.deep);
  // Lip scales along the upper jaw.
  const lipBand = [...LIP.map(at), ...[...LIP].reverse().map((q) => at({ x: q.x, y: q.y - 2.2 }))];
  pen.fill(lipBand, OLIVE.belly, 0.6);
  LIP.forEach((q, i) => {
    if (i > 0) pen.hair([at({ x: q.x - 5, y: q.y - 2.6 }), at({ x: q.x - 4.8, y: q.y - 0.4 })], 0.35, OLIVE.deep, 0.6);
  });
  shade(d, shape, 0.34);
  // The nostril near the snout's tip and the eye with its brow shield.
  pen.fill(oval(0, 0, 1, 1, 12).map((q) => at({ x: -5.3 + q.x * 1.4, y: -9.4 + q.y * 1 })), '#1a1710', 1);
  pen.hair([at({ x: -6.6, y: -10.8 }), at({ x: -4.4, y: -11.2 }), at({ x: -3.6, y: -9.6 })], 0.5, OLIVE.belly, 0.8);
  drawEye(d, at({ x: 14, y: -8.3 }));
  pen.stroke([at({ x: 8.5, y: -12.4 }), at({ x: 14, y: -13.6 }), at({ x: 20, y: -12.6 })], 0.9, INK, 0.9, false);
  pen.stroke(top.slice(0, -2).map((p) => ({ x: p.x + 0.4, y: p.y + 1.2 })), 1.3, DUSK, 0.6, false);
  pen.stroke(top, 1.6, INK, 1, false);
  pen.stroke(LIP.map(at), 1.2, INK, 1, false);
}

function drawEye(d: Draw, c: Pt): void {
  const { pen } = d;
  const r = 3.9;
  pen.fill(oval(c.x, c.y, r + 1.1, r + 1, 22), OLIVE.belly, 0.85);
  const ctx = pen.ctx;
  const iris = ctx.createRadialGradient(c.x - 1, c.y - 1, 0.4, c.x, c.y, r);
  iris.addColorStop(0, '#e8c25a');
  iris.addColorStop(1, '#94701f');
  ctx.save();
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  pen.fill(oval(c.x, c.y, 0.75, 3.1, 16), '#0d0b07', 1);
  pen.closed(oval(c.x, c.y, r, r, 22), 0.9, INK);
  pen.dot(c.x - 1.3, c.y - 1.5, 0.8, PAPER_FILL, 0.95);
}

/** The lower jaw: from the chin under the croc back up to the hinge, pale lip scales along it. */
function drawJaw(d: Draw, head: Head): void {
  const { pen } = d;
  const ctrl = { x: head.chin.x + 26, y: head.chin.y - 1.5 };
  const line = quad(head.chin, ctrl, head.hinge, 18);
  const inner = quad({ x: head.chin.x - 0.3, y: head.chin.y - 2 }, { x: ctrl.x - 0.5, y: ctrl.y - 2 }, { x: head.hinge.x - 1, y: head.hinge.y - 1.2 }, 18);
  pen.fill([...line, ...[...inner].reverse()], OLIVE.belly, 0.7);
  line.forEach((p, i) => {
    if (i % 2 === 1 && i < line.length - 1) pen.hair([p, inner[i]!], 0.35, OLIVE.deep, 0.7);
  });
  pen.stroke(line, 1.1, INK, 1, false);
  pen.hair(inner, 0.4, INK, 0.5);
}

/** The lips' edge round the croc: a dark gap, a sliver of pink mouth, the pale lip scales and the ink line. */
function drawRim(d: Draw, head: Head): void {
  const { pen } = d;
  const rim = rimCurve(head);
  const shift = (dx: number): Pt[] => rim.map((p) => ({ x: p.x + dx, y: p.y }));
  pen.stroke(shift(-2.2), 3.4, '#0b0906', 0.4, false);
  pen.stroke(shift(-0.6), 1.3, '#c27b74', 0.95, false);
  pen.stroke(shift(1.1), 1.8, OLIVE.belly, 0.75, false);
  rim.forEach((p, i) => {
    if (i % 2 === 0 && i > 0 && i < rim.length - 1) pen.hair([{ x: p.x + 0.2, y: p.y }, { x: p.x + 2.6, y: p.y + 0.3 }], 0.35, OLIVE.deep, 0.7);
  });
  pen.stroke(rim, 1.3, INK, 1, false);
}

function drawTongue(d: Draw, head: Head, out: number): void {
  if (out <= 0) return;
  const root = head.at({ x: -8.6, y: -4.6 });
  const len = 13 * out;
  const tip = { x: root.x - len, y: root.y + len * 0.12 };
  const col = '#7a2433';
  d.pen.stroke([root, { x: (root.x + tip.x) / 2, y: (root.y + tip.y) / 2 + 0.4 }, tip], 0.9, col, 1, false);
  d.pen.stroke([tip, { x: tip.x - 3.2 * out, y: tip.y - 1.6 * out }], 0.6, col, 1, false);
  d.pen.stroke([tip, { x: tip.x - 3.2 * out, y: tip.y + 1.6 * out }], 0.6, col, 1, false);
}

/** Soft shadows where the bodies meet the mud. */
function drawContact(d: Draw, shot: HookShot): void {
  const hips = crocPoint(shot, HIPS_U * CROC_L);
  const out = Math.min(1, Math.max(0, (RIM.x - 8 - hips.x) / 20)) * (1 - shot.fold);
  if (out > 0) d.pen.fill(oval(hips.x, GROUND + 1.5, 24, 3.2, 28), '#0a0705', 0.45 * out);
  d.pen.fill(oval(RIM.x + 4, GROUND + 1, 16, 2.4, 24), '#0a0705', 0.4);
  d.pen.fill(oval(96, 248, 120, 3.6, 40), '#0a0705', 0.45);
}

/** Water glints, twinkling in place in whole cycles a loop. */
function drawGlints(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const h = Math.abs(Math.sin(i * 91.7)) % 1;
    const a = Math.max(0, Math.sin(cycles(2 + (i % 3), t) + i * 1.7)) * 0.4;
    if (a < 0.03) continue;
    const x = -10 + ((i * 37.3) % 236);
    const y = 130 + h * 40;
    ctx.strokeStyle = `rgba(255,205,150,${a})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3 + h * 5, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws the hook at time t. */
export function drawProfileHook(ctx: CanvasRenderingContext2D, t: number): void {
  const shot = hookShot(t);
  const boil = boilAt(t);
  const shake = shakeAt(t);
  const k = VIEW.scale * shot.zoom;
  ctx.save();
  ctx.fillStyle = '#2e2218';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.translate(ctx.canvas.width / 2 + shake.x, ctx.canvas.height / 2 + shake.y);
  ctx.scale(k, k);
  ctx.translate(-VIEW.focus.x, -VIEW.focus.y);
  ctx.drawImage(backdrop(boil), BACK.x, BACK.y, BACK.w, BACK.h);
  drawGlints(ctx, t);
  const draw = (seed: number): Draw => makeDraw(ctx, seed * 13 + boil * 1009, boil, GROUND);
  drawContact(draw(1), shot);
  const head = headOf(shot);
  const rim = rimCurve(head);
  // The croc outside the mouth: left of the lips' ring.
  const outside: PenPt[] = [{ x: head.lipFront.x, y: -100 }, ...rim, { x: head.chin.x, y: 500 }, { x: -100, y: 500 }, { x: -100, y: -100 }];
  draw(2).pen.clipped(outside, () => drawCroc(draw(3), draw(4), shot));
  drawNeck(draw(5), shot, head);
  drawJaw(draw(6), head);
  draw(11).pen.clipped(neckClip(shot, head), () => draw(12).pen.fill([...LIP.map(head.at), ...[...LIP].reverse().map((q) => head.at({ x: q.x + 2, y: q.y + 5 }))], '#1a160c', 0.3));
  drawHead(draw(7), shot, head);
  drawRim(draw(8), head);
  drawTongue(draw(9), head, shot.tongue);
  ctx.restore();
}
