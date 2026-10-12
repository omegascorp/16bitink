import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import {
  crestOf, DEPTH_RATIO, edgesAt, FIN_FROM, finHeight, HEAD_S, PELVIC_LEN, PELVIC_S, placeOn, type Pt, type RibbonPose, rippleAt, spineOf,
  type SpinePoint,
} from './body';

/**
 * Draws the giant oarfish (body.ts has its shape) in the game's pen and ink,
 * as vector paths so it stays crisp from a close-up of its eye to the whole
 * eight metres: a silver ribbon with dark streaks, a crimson fin rippling
 * down its whole back, the tall red crest on its head, a big eye, a small
 * mouth, and the long pelvic "oars" with paddle tips. The outline boils
 * (wobbles a little, three frames over) like the game's drawings.
 */
export const CRIMSON = '#d8302b';
const CRIMSON_DARK = '#7a1414';
const SILVER = '#c9d1d8';
const SILVER_SHADE = '#7f8c99';
const SHINE = '#f1f5f7';

/** The camera's view of the world: metres to screen px. */
export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  /** Screen px added after the camera (a shake). */
  readonly dx: number;
  readonly dy: number;
}

export const toScreen = (v: View, p: Pt): Pt => ({ x: 540 + (p.x - v.x) * v.zoom + v.dx, y: 960 + (p.y - v.y) * v.zoom + v.dy });

/** A smooth wobble in [-1, 1] for line boil: value noise along a stroke, a fresh one each boil frame. */
function wobble(i: number, boil: number, channel: number): number {
  const hash = (k: number): number => {
    let h = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(boil + 7, 0xc2b2ae35) ^ Math.imul(channel + 3, 0x27d4eb2f);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h ^= h >>> 12;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  };
  const q = i / 5;
  const k = Math.floor(q);
  const f = q - k;
  const e = f * f * (3 - 2 * f);
  return hash(k) * (1 - e) + hash(k + 1) * e;
}

/** Streaks and spots on the silver, fixed for every frame (where along, how far down, slant). */
const MARKS = (() => {
  const rng = createRng(808);
  const streaks: { s: number; down: number; slant: number; w: number }[] = [];
  for (let s = HEAD_S + 0.012; s < 0.985; s += 0.011 + rng() * 0.008) streaks.push({ s, down: 0.55 + rng() * 0.5, slant: 0.006 + rng() * 0.01, w: 0.6 + rng() * 0.6 });
  const spots: { s: number; v: number; r: number }[] = [];
  for (let k = 0; k < 110; k++) spots.push({ s: HEAD_S + rng() * (0.97 - HEAD_S), v: -0.3 + rng() * 0.55, r: 0.012 + rng() * 0.026 });
  return { streaks, spots };
})();

/** The spine carried onto the screen: same shape, in px. */
function screenSpine(pose: RibbonPose, view: View): SpinePoint[] {
  return spineOf(pose).map((p) => {
    const q = toScreen(view, p);
    return { s: p.s, x: q.x, y: q.y, tx: p.tx, ty: p.ty };
  });
}

function path(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close: boolean): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (close) ctx.closePath();
}

/** Is any of the fish on screen (with a margin for the crest)? */
function onScreen(spine: readonly SpinePoint[], margin: number): boolean {
  return spine.some((p, i) => i % 6 === 0 && p.x > -margin && p.x < 1080 + margin && p.y > -margin && p.y < 1920 + margin);
}

export interface RibbonLook {
  /** Line-boil frame. */
  readonly boil: number;
  /** 0..1: the whole fish's opacity. */
  readonly alpha?: number;
}

export function drawOarfish(ctx: CanvasRenderingContext2D, pose: RibbonPose, view: View, look: RibbonLook): void {
  const spine = screenSpine(pose, view);
  const px = view.zoom;
  const d = pose.length * DEPTH_RATIO * px;
  if (!onScreen(spine, d * 3)) return;
  const at = (s: number, v: number): Pt => placeOn(spine, s, v * px);
  const line = Math.max(1.4, Math.min(4.2, 1 + d * 0.016));
  const boilPx = Math.min(1.6, 0.6 + d * 0.01);
  ctx.save();
  ctx.globalAlpha = look.alpha ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawPelvic(ctx, pose, at, line, -1);
  drawFin(ctx, pose, at, line, look.boil, boilPx, d);
  drawCrest(ctx, pose, at, line);
  drawBody(ctx, pose, spine, at, line, look.boil, boilPx, d);
  drawPelvic(ctx, pose, at, line, 1);
  ctx.restore();
}

/** The dorsal fin: crimson, its rays leaning back and rippling in a wave from head to tail. */
function drawFin(ctx: CanvasRenderingContext2D, pose: RibbonPose, at: (s: number, v: number) => Pt, line: number, boil: number, boilPx: number, d: number): void {
  const L = pose.length;
  const n = 220;
  const base: Pt[] = [];
  const tips: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = FIN_FROM + (1 - FIN_FROM) * (i / n) ** 1.15;
    const h = finHeight(L, s);
    const { lean, reach } = rippleAt(pose, s);
    const top = edgesAt(L, s).top;
    base.push(at(s, top * 0.7));
    const tip = at(s + (h * reach * Math.sin(lean)) / L, top + h * reach * Math.cos(lean));
    const j = wobble(i, boil, 1) * boilPx;
    tips.push({ x: tip.x + j, y: tip.y - j });
  }
  ctx.fillStyle = CRIMSON;
  ctx.globalAlpha *= 0.9;
  path(ctx, [...base, ...[...tips].reverse()], true);
  ctx.fill();
  ctx.globalAlpha /= 0.9;
  // Rays, only as many as stay a few px apart.
  const step = Math.max(1, Math.round(5 / Math.max(0.5, (d * 22) / n)));
  ctx.strokeStyle = CRIMSON_DARK;
  ctx.lineWidth = Math.max(0.8, line * 0.45);
  ctx.beginPath();
  for (let i = 0; i <= n; i += step) {
    ctx.moveTo(base[i]!.x, base[i]!.y);
    ctx.lineTo(tips[i]!.x, tips[i]!.y);
  }
  ctx.stroke();
  ctx.lineWidth = line * 0.8;
  path(ctx, tips, false);
  ctx.stroke();
}

/** The crest: long red rays rising from the head, a thin membrane between them, a red flag at each tip. */
function drawCrest(ctx: CanvasRenderingContext2D, pose: RibbonPose, at: (s: number, v: number) => Pt, line: number): void {
  const L = pose.length;
  const rays = crestOf(pose).map((r) => {
    const top = edgesAt(L, r.root).top;
    const point = (k: number, bendBack: number): Pt => {
      const lean = r.lean * (0.7 + 0.3 * k) + bendBack;
      return at(r.root + (r.length * k * Math.sin(lean)) / L, top * 0.8 + r.length * k * Math.cos(lean));
    };
    return { root: point(0, 0), mid: point(0.5, 0), tip: point(1, 0.12), near: point(0.62, 0) };
  });
  // Membrane between neighbouring rays, most of the way up.
  ctx.fillStyle = CRIMSON;
  ctx.globalAlpha *= 0.42;
  for (let i = 0; i + 1 < rays.length; i++) {
    const a = rays[i]!;
    const b = rays[i + 1]!;
    path(ctx, [a.root, a.mid, a.near, b.near, b.mid, b.root], true);
    ctx.fill();
  }
  ctx.globalAlpha /= 0.42;
  for (const [i, r] of rays.entries()) {
    ctx.strokeStyle = CRIMSON;
    ctx.lineWidth = line * (1.5 - i * 0.06);
    ctx.beginPath();
    ctx.moveTo(r.root.x, r.root.y);
    ctx.quadraticCurveTo(2 * r.mid.x - (r.root.x + r.tip.x) / 2, 2 * r.mid.y - (r.root.y + r.tip.y) / 2, r.tip.x, r.tip.y);
    ctx.stroke();
    ctx.strokeStyle = CRIMSON_DARK;
    ctx.lineWidth = Math.max(0.7, line * 0.35);
    ctx.stroke();
    // A small fleshy flag at the tip.
    const dx = r.tip.x - r.near.x;
    const dy = r.tip.y - r.near.y;
    const flag = Math.max(2.5, line * 2.4);
    ctx.fillStyle = CRIMSON;
    ctx.beginPath();
    ctx.ellipse(r.tip.x, r.tip.y, flag * 1.6, flag * 0.75, Math.atan2(dy, dx), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CRIMSON_DARK;
    ctx.lineWidth = Math.max(0.7, line * 0.4);
    ctx.stroke();
  }
}

/** The two pelvic rays from the throat, trailing back under the belly, with paddle tips. `side` -1 draws the far one (behind the body). */
function drawPelvic(ctx: CanvasRenderingContext2D, pose: RibbonPose, at: (s: number, v: number) => Pt, line: number, side: number): void {
  const L = pose.length;
  const d = L * DEPTH_RATIO;
  const sway = Math.sin(pose.crest * 1 + (side > 0 ? 0 : 1.3)) * (1 - pose.limp);
  const pts: Pt[] = [];
  for (let k = 0; k <= 16; k++) {
    const u = k / 16;
    const s = PELVIC_S + PELVIC_LEN * u * (side > 0 ? 1 : 0.88);
    const droop = d * (0.15 + (0.55 + 0.25 * sway) * Math.sin(u * Math.PI * 0.6) + 0.08 * sway * u) * (1 - 0.6 * pose.limp);
    pts.push(at(s, edgesAt(L, PELVIC_S).bottom * 0.7 - droop));
  }
  ctx.save();
  ctx.globalAlpha *= side > 0 ? 1 : 0.6;
  ctx.strokeStyle = CRIMSON;
  ctx.lineWidth = Math.max(0.8, line * 0.6);
  path(ctx, pts, false);
  ctx.stroke();
  const tip = pts[pts.length - 1]!;
  const prev = pts[pts.length - 3]!;
  const a = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const r = Math.max(3, line * 3.2);
  ctx.fillStyle = CRIMSON;
  ctx.beginPath();
  ctx.ellipse(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r, r * 1.5, r * 0.6, a, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(0.7, line * 0.4);
  ctx.stroke();
  ctx.restore();
}

/** The silver body: outline, sheen, streaks and spots, gill cover, eye and mouth. */
function drawBody(
  ctx: CanvasRenderingContext2D, pose: RibbonPose, spine: readonly SpinePoint[], at: (s: number, v: number) => Pt, line: number, boil: number, boilPx: number,
  dPx: number,
): void {
  const L = pose.length;
  const d = L * DEPTH_RATIO;
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  spine.forEach((p, i) => {
    const e = edgesAt(L, p.s);
    const jt = wobble(i, boil, 2) * boilPx;
    const jb = wobble(i, boil, 3) * boilPx;
    top.push(at(p.s, e.top));
    bottom.push(at(p.s, e.bottom));
    const t = top[i]!;
    const b = bottom[i]!;
    top[i] = { x: t.x + jt * 0.7, y: t.y + jt * 0.7 };
    bottom[i] = { x: b.x + jb * 0.7, y: b.y - jb * 0.7 };
  });
  const outline = [...top, ...[...bottom].reverse()];
  ctx.fillStyle = SILVER;
  path(ctx, outline, true);
  ctx.fill();
  ctx.save();
  path(ctx, outline, true);
  ctx.clip();
  // Shade along the belly, shine along the back.
  const along = (v: (s: number) => number, from = 0): Pt[] => spine.filter((p) => p.s >= from).map((p) => at(p.s, v(p.s)));
  ctx.strokeStyle = SILVER_SHADE;
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = dPx * 0.42;
  path(ctx, along((s) => edgesAt(L, s).bottom * 0.75), false);
  ctx.stroke();
  ctx.globalAlpha /= 0.55;
  ctx.strokeStyle = SHINE;
  ctx.globalAlpha *= 0.8;
  ctx.lineWidth = dPx * 0.12;
  path(ctx, along((s) => edgesAt(L, s).top * 0.42, 0.01), false);
  ctx.stroke();
  ctx.globalAlpha /= 0.8;
  // Dark streaks slanting back from the top, and scattered spots.
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  const markAlpha = Math.min(0.5, Math.max(0.18, dPx / 90));
  ctx.globalAlpha *= markAlpha;
  for (const m of MARKS.streaks) {
    const e = edgesAt(L, m.s);
    const span = e.top - e.bottom;
    ctx.lineWidth = Math.max(0.7, dPx * 0.035 * m.w);
    const a = at(m.s, e.top);
    const b = at(m.s + m.slant * 0.5, e.top - span * m.down * 0.5);
    const c = at(m.s + m.slant, e.top - span * m.down);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x + (b.x - (a.x + c.x) / 2) * 0.6, b.y + (b.y - (a.y + c.y) / 2) * 0.6, c.x, c.y);
    ctx.stroke();
  }
  for (const m of MARKS.spots) {
    const e = edgesAt(L, m.s);
    const p = at(m.s, (e.top + e.bottom) / 2 + m.v * (e.top - e.bottom));
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.6, m.r * dPx), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha /= markAlpha;
  // The head a touch darker above the eye.
  const brow = at(0.02, edgesAt(L, 0.02).top);
  const g = ctx.createRadialGradient(brow.x, brow.y, 0, brow.x, brow.y, dPx * 0.9);
  g.addColorStop(0, 'rgba(80,92,110,0.45)');
  g.addColorStop(1, 'rgba(80,92,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(brow.x - dPx, brow.y - dPx, dPx * 2, dPx * 2);
  ctx.restore();
  // Outline.
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  path(ctx, outline, true);
  ctx.stroke();
  if (dPx < 8) return;
  // Gill cover: its rear edge bowing back from the nape to the throat, with a few bony ridges.
  ctx.lineWidth = line * 0.6;
  const gill = [0, 0.25, 0.5, 0.75, 1].map((k) => {
    const s = HEAD_S * (1.3 - 0.28 * k + 0.06 * Math.sin(k * Math.PI));
    const e = edgesAt(L, s);
    return at(s, e.top * 0.92 + (e.bottom * 0.9 - e.top * 0.92) * k);
  });
  path(ctx, gill, false);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.7, line * 0.4);
  for (const k of [0.3, 0.5, 0.7]) {
    const e = edgesAt(L, HEAD_S * 0.7);
    const v = e.top + (e.bottom - e.top) * k;
    const a = at(HEAD_S * (1.12 - 0.28 * k), v * 0.8);
    const b = at(HEAD_S * (1.28 - 0.28 * k), v);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Pectoral fin: a little fan behind the gill cover.
  const pec = at(HEAD_S * 1.12, -d * 0.12);
  ctx.lineWidth = Math.max(0.8, line * 0.5);
  for (const k of [0, 1, 2]) {
    const q = at(HEAD_S * 1.12 + d * (0.35 + 0.05 * k) / L, -d * (0.04 + 0.08 * k));
    ctx.beginPath();
    ctx.moveTo(pec.x, pec.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  // The big eye: silver ring, dark pupil, a glint.
  const lift = d * 0.06;
  const eye = at(0.42 * HEAD_S, lift + d * 0.11);
  const r = dPx * 0.15;
  ctx.fillStyle = '#e8ecef';
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = line * 0.8;
  ctx.stroke();
  ctx.fillStyle = '#0b0c12';
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, r * 0.66, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eye.x - r * 0.22, eye.y - r * 0.24, r * 0.17, 0, Math.PI * 2);
  ctx.fill();
  // A small mouth at the very front, its gape slanting back and down, a dark corner.
  const m0 = at(0.0015, lift + d * 0.01);
  const m1 = at(0.006, lift - d * 0.1);
  const m2 = at(0.011, lift - d * 0.16);
  ctx.lineWidth = line * 0.9;
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y);
  ctx.quadraticCurveTo(m1.x, m1.y, m2.x, m2.y);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(m2.x, m2.y, Math.max(1, line * 0.7), 0, Math.PI * 2);
  ctx.fill();
}
