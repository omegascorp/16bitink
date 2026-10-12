import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, INK_ON_PAPER } from '../captions';
import { clamp01, VIDEO } from '../short';
import { CRIMSON } from './ribbon';
import { CHART_COLS, dimmed, LOOP_S, MATCH_INDEX, ringed, SIGHTINGS, sightingsShown, verdict } from './story';

/**
 * The evidence, as an ink chart on paper: one little oarfish for each of
 * the 336 deep-sea fish sightings in Japan from 1928 to 2011 (Tokai
 * University, 2019). All but one fade: only one came within 30 days and
 * 100 km of a big (M6+) quake. And the wave that washes the shore away to
 * show it, and washes it away again.
 */
const GRID = { left: 152, top: 500, dx: 51.5, dy: 24.6 } as const;
const ROWS = Math.ceil(SIGHTINGS / CHART_COLS);
const SILVER = '#b9c3cb';
const RED_INK = '#b3261e';

/** Where sighting i sits on the chart, with a little hand-placed wobble. */
const SPOTS = (() => {
  const rng = createRng(1928);
  return Array.from({ length: SIGHTINGS }, (_, i) => ({
    x: GRID.left + (i % CHART_COLS) * GRID.dx + (rng() - 0.5) * 6,
    y: GRID.top + Math.floor(i / CHART_COLS) * GRID.dy + (rng() - 0.5) * 4,
    tilt: (rng() - 0.5) * 0.25,
  }));
})();
export const CHART_BOTTOM = GRID.top + (ROWS - 1) * GRID.dy;

/** A tiny oarfish: a silver dash with a red back and crest, `len` px long, facing right. */
function glyph(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, tilt: number, body: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.lineCap = 'round';
  ctx.strokeStyle = CRIMSON;
  ctx.lineWidth = len * 0.07;
  ctx.beginPath();
  ctx.moveTo(-len * 0.42, -len * 0.08);
  ctx.quadraticCurveTo(0, -len * 0.17, len * 0.36, -len * 0.1);
  ctx.moveTo(len * 0.36, -len * 0.1);
  ctx.lineTo(len * 0.3, -len * 0.3);
  ctx.moveTo(len * 0.4, -len * 0.08);
  ctx.lineTo(len * 0.38, -len * 0.28);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = len * 0.2;
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, len * 0.02);
  ctx.quadraticCurveTo(0, -len * 0.08, len * 0.5, 0);
  ctx.stroke();
  ctx.strokeStyle = body;
  ctx.lineWidth = len * 0.12;
  ctx.stroke();
  ctx.restore();
}

export function drawChart(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const shown = sightingsShown(t);
  const dim = dimmed(t);
  const ring = ringed(t);
  drawTextLine(ctx, 'Tokai University study, 2019', 540, 300, 38, 500, 0.6, INK_ON_PAPER);
  drawTextLine(ctx, `${shown} sightings`, 540, 384, 92, 700, 1, INK_ON_PAPER);
  drawTextLine(ctx, 'of deep-sea fish in Japan, 1928–2011', 540, 446, 48, 500, 0.85, INK_ON_PAPER);
  const count = shown;
  for (let i = 0; i < count; i++) {
    if (i === MATCH_INDEX) continue;
    const s = SPOTS[i]!;
    const pop = clamp01((shown - i) / 14);
    ctx.globalAlpha = 1 - 0.8 * dim;
    glyph(ctx, s.x, s.y, 40 * (0.6 + 0.4 * pop), s.tilt + (boil % 3) * 0.015, SILVER);
  }
  ctx.globalAlpha = 1;
  if (count > MATCH_INDEX) {
    const s = SPOTS[MATCH_INDEX]!;
    glyph(ctx, s.x, s.y, 40 * (1 + 1.1 * ring), s.tilt * (1 - ring), ring > 0 ? CRIMSON : SILVER);
    drawRing(ctx, s.x, s.y, ring, t);
  }
  const v = verdict(t);
  drawTextLine(ctx, '1 matched a big quake', 540, 1056, 74, 700, v, { fill: RED_INK, halo: PAPER });
}

/** A hand-drawn ring round the match, drawn in one go. */
function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number): void {
  if (u <= 0) return;
  const w = (2 * Math.PI * t) / LOOP_S;
  ctx.save();
  ctx.strokeStyle = RED_INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(x, y, 74 + Math.sin(w * 7) * 1.5, 50, -0.15, -0.5, -0.5 + Math.PI * 2.15 * u);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the wipe

const BAND = 430;
const WAVE_DEEP = '#22406a';
const WAVE_LIGHT = '#4f7aa0';
const FOAM = '#f6f1e4';

/**
 * A great wave washing across the picture (`dir` 1: left to right): the old
 * scene ahead of it, the new one left behind as it passes. Its face leans
 * forward at the top into a curling, clawed lip; woodblock lines run
 * through its body; it leaves foam behind.
 */
export function drawWipe(ctx: CanvasRenderingContext2D, u: number, dir: 1 | -1, drawOld: () => void, drawNew: () => void, t: number): void {
  const e = 1 - (1 - u) ** 1.5;
  const front = -260 + (VIDEO.width + BAND + 520) * e;
  const mx = (x: number): number => (dir > 0 ? x : VIDEO.width - x);
  const faceAt = (y: number): number => front + 190 * (1 - y / VIDEO.height) ** 3 + 16 * Math.sin(y / 70 + u * 9);
  const backAt = (y: number): number => front - BAND + 40 * Math.sin(y / 120 + 2 + u * 4) - 110 * (1 - y / VIDEO.height) ** 2;
  const edge = (f: (y: number) => number): { x: number; y: number }[] =>
    Array.from({ length: 49 }, (_, i) => ({ x: mx(f((i / 48) * VIDEO.height)), y: (i / 48) * VIDEO.height }));
  const face = edge(faceAt);
  const back = edge(backAt);
  const far = mx(-400);
  drawOld();
  // Behind the wave: the new scene.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(far, 0);
  back.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(far, VIDEO.height);
  ctx.closePath();
  ctx.clip();
  drawNew();
  ctx.restore();
  // The wave's body, between its back and its face.
  ctx.save();
  ctx.beginPath();
  back.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  [...face].reverse().forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  const g = ctx.createLinearGradient(mx(front - BAND), 0, mx(front), 0);
  g.addColorStop(0, WAVE_LIGHT);
  g.addColorStop(1, WAVE_DEEP);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Woodblock lines, parallel to the face.
  ctx.strokeStyle = FOAM;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  for (let k = 1; k <= 7; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const y = (i / 48) * VIDEO.height;
      const x = mx(faceAt(y) - k * 52 - 20 * Math.sin(y / 160 + k));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  face.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  // Foam along the face: a white band breaking into claws near the top.
  ctx.strokeStyle = FOAM;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  face.slice(0, 30).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x - dir * 10, p.y) : ctx.lineTo(p.x - dir * 10, p.y)));
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  for (let k = 0; k < 14; k++) {
    const y = 40 + k * 62;
    const p = { x: mx(faceAt(y)), y };
    const len = 70 + 30 * Math.sin(k * 1.9 + t * 3) - k * 2.5;
    claw(ctx, p.x, p.y, len, dir > 0 ? 0.55 + k * 0.03 : Math.PI - 0.55 - k * 0.03, dir);
  }
  // Foam left behind: dots along the back edge.
  ctx.fillStyle = FOAM;
  const rng = createRng(7);
  for (let k = 0; k < 90; k++) {
    const y = rng() * VIDEO.height;
    const x = mx(backAt(y) - rng() * 70 + 20);
    ctx.beginPath();
    ctx.arc(x, y, 3 + rng() * 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/** One clawed curl of foam, hooking forward and down. */
function claw(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, dir: number): void {
  const tip = { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len };
  const hookA = a + dir * 2.1;
  const hook = { x: tip.x + Math.cos(hookA) * len * 0.35, y: tip.y + Math.sin(hookA) * len * 0.35 };
  const n = { x: -Math.sin(a) * len * 0.18, y: Math.cos(a) * len * 0.18 };
  ctx.fillStyle = FOAM;
  ctx.beginPath();
  ctx.moveTo(x - n.x, y - n.y);
  ctx.quadraticCurveTo(tip.x - n.x * 0.8, tip.y - n.y * 0.8, hook.x, hook.y);
  ctx.quadraticCurveTo(tip.x - Math.cos(a) * len * 0.2, tip.y - Math.sin(a) * len * 0.2, x + n.x, y + n.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
