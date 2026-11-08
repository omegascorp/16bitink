import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO, ramp, window01 } from '../short';
import {
  AND_ITS_AT, BALANCE_OUT, cycles, FOCUS, GAPE_MAX, inWhale, type Krill, NEARLY_AT, onWhale, REWINDS, toScreen, type View, type WhalePose, wrap,
} from './story';
import { bodyOutline, drawOneKrill, lipsOf, throatOf } from './whale';

/**
 * The open ocean round the whale: deep blue water, bright near the surface
 * far above, light rays slanting down, specks drifting; the krill swarm and
 * its pink haze; water squirting out through the baleen; the colour of each
 * beat's mood washed over the picture, and the ⏪ of a rewind.
 */

export const INK_BG = '#041026';
export const CHALK = '#e4ecf2';
export const SPOKEN = '#f5c84a';

/** The water: a full-frame wash, lighter at the top where the surface is. */
export function makeWater(): HTMLCanvasElement {
  const paper = makePaper();
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  ctx.drawImage(paper, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, 'rgba(36,98,150,0.93)');
  g.addColorStop(0.35, 'rgba(16,58,104,0.95)');
  g.addColorStop(0.75, 'rgba(7,30,64,0.97)');
  g.addColorStop(1, 'rgba(3,14,34,0.98)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // A few broad soft wash marks, like a wet brush dragged across.
  const rng = createRng(330);
  for (let i = 0; i < 14; i++) {
    const x = rng() * VIDEO.width;
    const y = rng() * VIDEO.height;
    const r = 200 + rng() * 360;
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, rng() < 0.5 ? 'rgba(80,140,190,0.10)' : 'rgba(0,8,24,0.16)');
    blob.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blob;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return canvas;
}

/** Shafts of light from the surface far above, swaying; brighter for the excited beats. */
export function drawRays(ctx: CanvasRenderingContext2D, t: number, strength: number, shift: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 260 + shift * 0.35) % 1700) - 300;
    const sway = 40 * Math.sin(cycles(1, t) + i * 1.7);
    const w = 70 + ((i * 47) % 90);
    const g = ctx.createLinearGradient(0, 0, 0, 1500);
    g.addColorStop(0, `rgba(170,215,255,${(0.16 * strength).toFixed(3)})`);
    g.addColorStop(1, 'rgba(170,215,255,0)');
    ctx.fillStyle = g;
    // Three passes, narrower each time: soft edges, a brighter core.
    for (const k of [1.25, 0.85, 0.45]) {
      const mid = x + sway + w / 2;
      const half = (w / 2) * k;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(mid - half, -20);
      ctx.lineTo(mid + half, -20);
      ctx.lineTo(mid + 380 + w * 0.8 + half * 2.2, 1500);
      ctx.lineTo(mid + 380 + w * 0.8 - half * 2.2, 1500);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

const SPECKS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 150 }, () => ({ x: rng() * 1600, y: rng() * 2400, r: 0.8 + rng() * 2, phase: rng() * Math.PI * 2, depth: 0.3 + rng() * 0.7 }));
})();

/** Specks in the water, drifting with a parallax on the camera, so a move reads as a move. */
export function drawSpecks(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  ctx.save();
  ctx.fillStyle = '#d8ecff';
  for (const m of SPECKS) {
    const x = (((m.x - v.x * m.depth * 0.5 + 12 * Math.sin(cycles(1, t) + m.phase)) % 1600) + 1600) % 1600 - 260;
    const y = (((m.y - v.y * m.depth * 0.5 + 10 * Math.sin(cycles(2, t) + m.phase)) % 2400) + 2400) % 2400 - 240;
    ctx.globalAlpha = 0.12 + 0.2 * m.depth;
    ctx.beginPath();
    ctx.arc(x, y, m.r * (0.6 + v.zoom * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The swarm's pink haze, centred on the krill that are left. */
export function drawKrillHaze(ctx: CanvasRenderingContext2D, v: View, krill: readonly Krill[], alpha: number): void {
  if (alpha <= 0.01) return;
  const c = krill.reduce((s, k) => ({ x: s.x + k.x / krill.length, y: s.y + k.y / krill.length }), { x: 0, y: 0 });
  const p = toScreen(v, c);
  const r = 520 * v.zoom;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, `rgba(240,120,150,${(0.42 * alpha).toFixed(3)})`);
  g.addColorStop(0.6, `rgba(240,120,150,${(0.16 * alpha).toFixed(3)})`);
  g.addColorStop(1, 'rgba(240,120,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(p.x - r, p.y - r, 2 * r, 2 * r);
}

/** Is a world point inside the whale's body or its pouch? (Then the krill there are inside it, out of sight.) */
function insideWhale(w: WhalePose, p: Pt, body: readonly Pt[], pouch: readonly Pt[]): boolean {
  const q = inWhale(w, p);
  return pointIn(body, q) || pointIn(pouch, q);
}

function pointIn(poly: readonly Pt[], p: Pt): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The krill round the whale (not those already inside it). */
export function drawKrill(ctx: CanvasRenderingContext2D, v: View, w: WhalePose, krill: readonly Krill[], alpha: number): void {
  if (alpha <= 0.01) return;
  const body = bodyOutline(w);
  const throat = throatOf(w.gape * GAPE_MAX, w.balloon);
  const pouch = [...throat.inner, ...[...throat.outer].reverse()];
  const size = Math.min(1.1, Math.max(0.6, v.zoom * 1.2));
  for (const k of krill) {
    if (insideWhale(w, k, body, pouch)) continue;
    const p = toScreen(v, k);
    if (p.x < -30 || p.x > VIDEO.width + 30 || p.y < -30 || p.y > VIDEO.height + 30) continue;
    drawOneKrill(ctx, p, k.angle, size * k.size, 0.92 * alpha);
  }
}

// ---------------------------------------------------------------- water rushing in

const INRUSH = Array.from({ length: 16 }, (_, i) => ({ side: ((i * 7) % 16) / 15 - 0.5, phase: (i * 0.61) % 1, len: 0.7 + ((i * 5) % 7) / 10 }));

/** Water rushing into the open mouth: pale streaks pouring in from ahead of the lips. */
export function drawInrush(ctx: CanvasRenderingContext2D, v: View, w: WhalePose, amount: number, t: number): void {
  if (amount <= 0.01) return;
  const a = w.gape * GAPE_MAX;
  const out = { x: Math.cos(a / 2), y: Math.sin(a / 2) };
  const across = { x: -out.y, y: out.x };
  const mouth = { x: 300 * Math.cos(a / 2), y: 300 * Math.sin(a / 2) };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#d8efff';
  for (const r of INRUSH) {
    const f = (t * 1.6 + r.phase) % 1;
    const dist = 560 * (1 - f) * r.len;
    const spread = 340 * r.side * (0.3 + 0.7 * (1 - f));
    const head = { x: mouth.x + out.x * dist + across.x * spread, y: mouth.y + out.y * dist + across.y * spread };
    const tail = { x: head.x + out.x * 120, y: head.y + out.y * 120 };
    const p = toScreen(v, onWhale(w, head));
    const q = toScreen(v, onWhale(w, tail));
    ctx.globalAlpha = amount * 0.4 * Math.sin(Math.PI * f);
    ctx.lineWidth = Math.max(2, 7 * v.zoom);
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- water squirting out

const JETS = Array.from({ length: 30 }, (_, i) => ({
  u: 0.25 + ((i * 7) % 30) / 30 * 0.72,
  angle: 0.15 + ((i * 11) % 13) / 13 * 1.1,
  phase: (i * 0.37) % 1,
  len: 0.6 + ((i * 53) % 10) / 18,
}));

/** Water spraying out between the lips, through the baleen: streams fanning out from the gap, droplets at their heads. */
export function drawSquirt(ctx: CanvasRenderingContext2D, v: View, w: WhalePose, amount: number, t: number): void {
  if (amount <= 0.01) return;
  const { upper, lower } = lipsOf(w);
  ctx.save();
  // A haze of spray along the gap.
  for (const u of [0.45, 0.7, 0.92]) {
    const i = Math.round(u * (upper.length - 1));
    const c = toScreen(v, onWhale(w, { x: (upper[i]!.x + lower[i]!.x) / 2 + 40, y: (upper[i]!.y + lower[i]!.y) / 2 + 40 }));
    const r = 150 * v.zoom;
    const mist = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    mist.addColorStop(0, `rgba(225,242,255,${(0.28 * amount).toFixed(3)})`);
    mist.addColorStop(1, 'rgba(225,242,255,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(c.x - r, c.y - r, 2 * r, 2 * r);
  }
  ctx.lineCap = 'round';
  for (const j of JETS) {
    const i = Math.min(upper.length - 1, Math.round(j.u * (upper.length - 1)));
    const top = upper[i]!;
    const bottom = lower[i]!;
    const from = { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 };
    const dir = { x: Math.cos(j.angle), y: Math.sin(j.angle) };
    for (let k = 0; k < 2; k++) {
      const f = (t * 1.8 + j.phase + k / 2) % 1;
      const reach = 380 * j.len * f;
      const tail = Math.max(0, reach - 130);
      const sag = (r: number): number => 0.0016 * r * r;
      const pts = [tail, (tail + reach) / 2, reach].map((r) => toScreen(v, onWhale(w, { x: from.x + dir.x * r, y: from.y + dir.y * r + sag(r) })));
      ctx.globalAlpha = amount * 0.85 * (1 - f) ** 0.7;
      ctx.strokeStyle = '#e8f6ff';
      ctx.lineWidth = Math.max(2, 14 * v.zoom * (1 - 0.6 * f));
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      ctx.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);
      ctx.stroke();
      ctx.fillStyle = '#f4fbff';
      for (const [dx, dy, r] of [[0, 0, 7], [14, -10, 4], [-10, 12, 3.5]] as const) {
        ctx.beginPath();
        ctx.arc(pts[2]!.x + dx * f * v.zoom, pts[2]!.y + dy * f * v.zoom, Math.max(1.5, r * v.zoom * (1 - 0.5 * f)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the mood

interface Grade {
  /** Brighter, clearer water for the excited beats. */
  readonly bright: number;
  readonly teal: number;
  /** Dark and heavy for the drama of the weight. */
  readonly heavy: number;
  readonly warm: number;
  readonly sly: number;
}

/** Each beat's colour (video time). */
export function gradeAt(t: number): Grade {
  const u = wrap(t);
  return {
    bright: Math.max(1 - ramp(u, REWINDS[0].from, REWINDS[0].to), ramp(u, REWINDS[1].from, REWINDS[1].to), 0.7 * window01(u, AND_ITS_AT - 0.1, 8.7, 0.3)),
    teal: window01(u, REWINDS[0].from + 0.2, AND_ITS_AT + 0.1, 0.3),
    heavy: 0,
    warm: window01(u, BALANCE_OUT.from, NEARLY_AT + 0.1, 0.25),
    sly: window01(u, NEARLY_AT - 0.1, REWINDS[1].from + 0.3, 0.3),
  };
}

function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function drawGrade(ctx: CanvasRenderingContext2D, g: Grade): void {
  wash(ctx, 'soft-light', '#7fd0ff', 0.35 * g.bright);
  wash(ctx, 'soft-light', '#5fe0c8', 0.35 * g.teal);
  wash(ctx, 'multiply', '#5a6bb0', 0.45 * g.heavy);
  wash(ctx, 'soft-light', '#ffd08a', 0.38 * g.warm);
  wash(ctx, 'soft-light', '#ff9ad5', 0.4 * g.sly);
  wash(ctx, 'soft-light', '#ffd27a', 0.22 * g.sly);
}

/** A flash of light, `alpha` of white over the picture. */
export function drawFlash(ctx: CanvasRenderingContext2D, alpha: number): void {
  wash(ctx, 'screen', '#cfefff', alpha);
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, amount = 1): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 760, 420, VIDEO.width / 2, 820, 1250);
  g.addColorStop(0, 'rgba(1,4,12,0)');
  g.addColorStop(1, `rgba(1,4,12,${(0.6 * amount).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** ⏪ while the story runs back, with streaks rolling down as on a tape being rewound. */
export function drawRewind(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.fillStyle = CHALK;
  for (let i = 0; i < 3; i++) {
    const y = ((t * 1400 + i * 640) % (VIDEO.height + 200)) - 100;
    ctx.globalAlpha = 0.07 * amount;
    ctx.fillRect(0, y, VIDEO.width, 10 + i * 6);
  }
  const x = 150;
  const y = 380;
  const h = 76;
  ctx.globalAlpha = amount * (0.85 + 0.15 * Math.sin(t * 38));
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK_BG;
  ctx.fillStyle = CHALK;
  for (const pass of ['halo', 'fill'] as const) {
    for (const dx of [0, h * 0.62]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y);
      ctx.lineTo(x + dx + h * 0.66, y - h / 2);
      ctx.lineTo(x + dx + h * 0.66, y + h / 2);
      ctx.closePath();
      if (pass === 'halo') ctx.stroke();
      else ctx.fill();
    }
  }
  ctx.restore();
}

/** Streaks of a whip pan, `amount` 0 .. 1 at its fastest. */
export function drawWhip(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  if (amount <= 0.01) return;
  const pen = new Pen(ctx, Math.floor(t * 30), 2);
  for (let i = 0; i < 16; i++) {
    const x = ((i * 197 + t * 900) % 1240) - 80;
    pen.hair([{ x, y: -50 }, { x: x + 10, y: VIDEO.height + 50 }], 3 + (i % 3) * 3, CHALK, 0.18 * amount);
  }
}

export { FOCUS };
