import { INK, pathOf, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { cycles, DECK, FOCUS, PILING, SURFACE_Y, type View } from './story';

/**
 * Under a fishing pier on the Gulf coast: murky green water with light
 * slanting down, pier pilings fading into the murk behind, and the near
 * piling the sheepshead feeds on, crusted in barnacles and weed, up to the
 * surface and the pier's deck. Plus the mugshot wall and the jail bars.
 */

export const INK_BG = '#06120f';

// ---------------------------------------------------------------- the water

/** The far pilings: a layer that moves and zooms less than the camera (parallax). */
const FAR = [
  { x: 150, w: 330, shade: 1 },
  { x: 1050, w: 260, shade: 0.8 },
  { x: -820, w: 280, shade: 0.75 },
  { x: 1900, w: 300, shade: 0.7 },
] as const;
const farView = (v: View): View => ({ x: v.x * 0.5, y: v.y * 0.5, zoom: 0.36 + 0.36 * v.zoom });
const farScreen = (v: View, p: Pt): Pt => {
  const f = farView(v);
  return { x: FOCUS.x + (p.x - f.x) * f.zoom, y: FOCUS.y + (p.y - f.y) * f.zoom };
};

const FAR_SPECKS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 60 }, () => ({ u: rng(), y: rng() * 2600 - 900, r: 2 + rng() * 5 }));
})();

export function drawWater(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#1c3c35');
  g.addColorStop(0.5, '#10261f');
  g.addColorStop(1, '#06120e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // The far surface: brighter water above, if the camera looks up there.
  const surf = farScreen(v, { x: 0, y: SURFACE_Y }).y;
  if (surf > -200) {
    const s = ctx.createLinearGradient(0, surf - 200, 0, surf + 300);
    s.addColorStop(0, 'rgba(120,170,150,0.35)');
    s.addColorStop(1, 'rgba(120,170,150,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, Math.max(0, surf - 200), VIDEO.width, 500);
  }
  drawRays(ctx, t);
  // The far pilings: dark, soft, a lit edge on the left.
  const f = farView(v);
  for (const p of FAR) {
    const left = farScreen(v, { x: p.x - p.w / 2, y: 0 }).x;
    const w = p.w * f.zoom;
    if (left > VIDEO.width || left + w < 0) continue;
    const top = Math.max(0, farScreen(v, { x: 0, y: DECK.bottom }).y);
    const pg = ctx.createLinearGradient(left, 0, left + w, 0);
    pg.addColorStop(0, `rgba(78,116,92,${0.9 * p.shade})`);
    pg.addColorStop(0.12, `rgba(48,84,66,${0.92 * p.shade})`);
    pg.addColorStop(0.4, `rgba(30,60,48,${0.92 * p.shade})`);
    pg.addColorStop(1, `rgba(14,34,28,${0.95 * p.shade})`);
    ctx.fillStyle = pg;
    ctx.fillRect(left, top, w, VIDEO.height - top);
    // Barnacle specks and grain, faint.
    ctx.fillStyle = `rgba(150,180,160,${0.18 * p.shade})`;
    for (const s of FAR_SPECKS) {
      const sy = farScreen(v, { x: 0, y: s.y }).y;
      if (sy < top) continue;
      ctx.beginPath();
      ctx.arc(left + s.u * w, sy, s.r * f.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(8,20,16,${0.5 * p.shade})`;
    ctx.lineWidth = 2;
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(left + (w * k) / 5, top);
      ctx.lineTo(left + (w * k) / 5 + 6, VIDEO.height);
      ctx.stroke();
    }
  }
  // A veil of murk over the far layer.
  ctx.fillStyle = 'rgba(16,40,34,0.22)';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const RAYS = [
  { x: -120, w: 150, slant: 300 },
  { x: 300, w: 90, slant: 340 },
  { x: 640, w: 170, slant: 260 },
  { x: 1000, w: 110, slant: 300 },
] as const;

function drawRays(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height * 0.9);
  g.addColorStop(0, 'rgba(200,236,200,0.16)');
  g.addColorStop(1, 'rgba(200,236,200,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  RAYS.forEach((r, i) => {
    const sway = 26 * Math.sin(cycles(1, t) + i * 1.3);
    ctx.beginPath();
    ctx.moveTo(r.x + sway, 0);
    ctx.lineTo(r.x + r.w + sway, 0);
    ctx.lineTo(r.x + r.w * 2.2 + r.slant, VIDEO.height);
    ctx.lineTo(r.x + r.slant - r.w * 0.4, VIDEO.height);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- the near piling and the pier

const BARNACLE_SPOTS = (() => {
  const rng = createRng(4242);
  return Array.from({ length: 150 }, () => ({ x: PILING.left + 20 + rng() * (PILING.right - PILING.left - 30), y: SURFACE_Y + 60 + rng() * 2600, r: 9 + rng() * 14 }));
})();
const WEED = (() => {
  const rng = createRng(99);
  return Array.from({ length: 34 }, () => ({ x: PILING.left + rng() * (PILING.right - PILING.left), y: SURFACE_Y + 40 + rng() * 2400, len: 40 + rng() * 70, phase: rng() * 6 }));
})();

/** An acorn barnacle: a little volcano of chalky plates with a dark slit on top. */
export function drawBarnacle(pen: Pen, x: number, y: number, r: number, light = '#d9d1bb'): void {
  const cone = [
    { x: x - r, y: y + r * 0.45 }, { x: x - r * 0.5, y: y - r * 0.7 }, { x: x + r * 0.5, y: y - r * 0.7 }, { x: x + r, y: y + r * 0.45 },
  ];
  pen.fill(cone, light, 0.92);
  pen.fill([{ x: x + r * 0.1, y: y - r * 0.7 }, { x: x + r * 0.5, y: y - r * 0.7 }, { x: x + r, y: y + r * 0.45 }, { x: x + r * 0.3, y: y + r * 0.45 }], '#8e8672', 0.5);
  pen.hair([{ x: x - r * 0.3, y: y + r * 0.4 }, { x: x - r * 0.18, y: y - r * 0.62 }], 1.4, INK, 0.5);
  pen.hair([{ x: x + r * 0.35, y: y + r * 0.4 }, { x: x + r * 0.2, y: y - r * 0.62 }], 1.4, INK, 0.5);
  pen.stroke(cone, 2, INK, 0.85, false);
  pen.fill([{ x: x - r * 0.38, y: y - r * 0.7 }, { x: x, y: y - r * 0.82 }, { x: x + r * 0.38, y: y - r * 0.7 }, { x: x, y: y - r * 0.6 }], INK, 0.9);
}

/** The near piling, in world px (ctx in world px), skipping barnacles inside `bitten` (the ones it scraped off). */
export function drawPiling(ctx: CanvasRenderingContext2D, boil: number, t: number, bitten: { x: number; y: number; r: number; gone: number }): void {
  const pen = new Pen(ctx, 300 + boil * 17, 1.2);
  const w = PILING.right - PILING.left;
  const top = DECK.bottom;
  const bottom = 3200;
  const g = ctx.createLinearGradient(PILING.left, 0, PILING.right, 0);
  g.addColorStop(0, '#2a3a2c');
  g.addColorStop(0.3, '#46603f');
  g.addColorStop(0.75, '#2f4a33');
  g.addColorStop(1, '#16261b');
  ctx.fillStyle = g;
  ctx.fillRect(PILING.left, top, w, bottom - top);
  // Above the water: bare, weathered wood.
  ctx.fillStyle = 'rgba(120,96,64,0.55)';
  ctx.fillRect(PILING.left, top, w, SURFACE_Y - top);
  // Wood grain.
  for (let k = 1; k < 7; k++) pen.hair([{ x: PILING.left + (w * k) / 7, y: top }, { x: PILING.left + (w * k) / 7 + 8, y: bottom }], 1.6, '#0d1a12', 0.45);
  // A green weed fur and barnacles below the waterline.
  for (const wd of WEED) {
    const sway = 10 * Math.sin(cycles(2, t) + wd.phase);
    pen.hair([{ x: wd.x, y: wd.y }, { x: wd.x + sway, y: wd.y + wd.len * 0.5 }, { x: wd.x + sway * 1.6 + 6, y: wd.y + wd.len }], 3, '#5f8a4a', 0.7);
  }
  for (const b of BARNACLE_SPOTS) {
    const d = Math.hypot(b.x - bitten.x, b.y - bitten.y);
    if (d < bitten.r && bitten.gone > 0) continue;
    drawBarnacle(pen, b.x, b.y, b.r);
  }
  pen.stroke([{ x: PILING.left, y: top }, { x: PILING.left, y: bottom }], 4, INK);
  pen.stroke([{ x: PILING.right, y: top }, { x: PILING.right, y: bottom }], 4, INK);
}

/** The surface and the pier above it: sky, deck planks, rail, the other pilings' tops. */
export function drawPier(ctx: CanvasRenderingContext2D, v: View, boil: number, t: number): void {
  const pen = new Pen(ctx, 500 + boil * 23, 1.4);
  const left = v.x - FOCUS.x / v.zoom - 50;
  const right = v.x + (VIDEO.width - FOCUS.x) / v.zoom + 50;
  const skyTop = v.y - FOCUS.y / v.zoom - 50;
  if (skyTop > SURFACE_Y + 40) return;
  // Sky.
  const sky = ctx.createLinearGradient(0, skyTop, 0, SURFACE_Y);
  sky.addColorStop(0, '#e9e2cd');
  sky.addColorStop(1, '#c9d5c6');
  ctx.fillStyle = sky;
  ctx.fillRect(left, skyTop, right - left, SURFACE_Y - skyTop);
  // Other pilings above the water, behind the deck.
  for (const x of [700, 1500, -1100]) {
    ctx.fillStyle = '#6f5a40';
    ctx.fillRect(x, DECK.top, 200, SURFACE_Y - DECK.top + 10);
    pen.stroke([{ x, y: DECK.bottom }, { x, y: SURFACE_Y }], 3, INK);
    pen.stroke([{ x: x + 200, y: DECK.bottom }, { x: x + 200, y: SURFACE_Y }], 3, INK);
  }
  // The deck: a thick beam, planks, a rail.
  ctx.fillStyle = '#7b6446';
  ctx.fillRect(left, DECK.top, right - left, DECK.bottom - DECK.top);
  ctx.fillStyle = 'rgba(40,30,20,0.35)';
  ctx.fillRect(left, DECK.bottom - 18, right - left, 18);
  for (let x = Math.floor(left / 90) * 90; x < right; x += 90) pen.hair([{ x, y: DECK.top + 4 }, { x: x + 2, y: DECK.bottom - 4 }], 1.6, INK, 0.5);
  pen.stroke([{ x: left, y: DECK.top }, { x: right, y: DECK.top }], 4, INK);
  pen.stroke([{ x: left, y: DECK.bottom }, { x: right, y: DECK.bottom }], 4, INK);
  for (let x = Math.floor(left / 400) * 400; x < right; x += 400) {
    pen.stroke([{ x, y: DECK.top }, { x: x + 4, y: DECK.top - 150 }], 5, INK);
  }
  pen.stroke([{ x: left, y: DECK.top - 150 }, { x: right, y: DECK.top - 150 }], 5, INK);
  pen.stroke([{ x: left, y: DECK.top - 80 }, { x: right, y: DECK.top - 80 }], 3, INK, 0.7);
  // The surface: an inked, rippling line, light catching under it.
  const pts: Pt[] = [];
  for (let x = left; x <= right; x += 20) pts.push({ x, y: SURFACE_Y + 6 * Math.sin(x / 60 + cycles(3, t)) + 3 * Math.sin(x / 23 - cycles(5, t)) });
  ctx.save();
  ctx.strokeStyle = 'rgba(220,240,230,0.4)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + 7) : ctx.lineTo(p.x, p.y + 7)));
  ctx.stroke();
  ctx.restore();
  pen.stroke(pts, 4, INK);
}

/** Specks of silt hanging in the water, drifting: screen px, nudged by the camera. */
const SILT = (() => {
  const rng = createRng(2026);
  return Array.from({ length: 70 }, () => ({ x: rng() * 1300, y: rng() * 2100, r: 1.4 + rng() * 2.8, phase: rng() * 6.28, alpha: 0.1 + rng() * 0.25 }));
})();

export function drawSilt(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  ctx.save();
  ctx.fillStyle = '#d6e6d6';
  for (const m of SILT) {
    const x = ((((m.x - v.x * 0.9 + 14 * Math.sin(cycles(1, t) + m.phase)) % 1300) + 1300) % 1300) - 110;
    const y = ((((m.y - v.y * 0.9 + 10 * Math.sin(cycles(2, t) + m.phase * 1.7)) % 2100) + 2100) % 2100) - 90;
    ctx.globalAlpha = m.alpha;
    ctx.beginPath();
    ctx.arc(x, y, m.r * Math.min(1.8, 0.6 + v.zoom * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the mugshot, the bars

/** The mugshot wall: pale, with the height board's lines behind the fish. */
export function drawMugWall(ctx: CanvasRenderingContext2D, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = new Pen(ctx, 900 + boil * 11, 1.2);
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(560, 760, 100, 540, 860, 1100);
  g.addColorStop(0, '#d9d8cf');
  g.addColorStop(1, '#8f948c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  for (let i = 0; i < 16; i++) {
    const y = 180 + i * 72;
    const major = i % 4 === 0;
    pen.stroke([{ x: 0, y }, { x: VIDEO.width, y: y + 2 }], major ? 5 : 2.4, '#2b2b2c', major ? 0.75 : 0.45);
    if (!major) continue;
    pen.stroke([{ x: 40, y }, { x: 40, y: y + 36 }], 4, '#2b2b2c', 0.7);
    pen.stroke([{ x: VIDEO.width - 40, y }, { x: VIDEO.width - 40, y: y + 36 }], 4, '#2b2b2c', 0.7);
  }
  ctx.restore();
}

/** Jail bars sliding in from the right (`k` 0 out .. 1 across the frame). */
export function drawBars(ctx: CanvasRenderingContext2D, k: number, boil: number): void {
  if (k <= 0) return;
  const pen = new Pen(ctx, 1200 + boil * 7, 1);
  const shift = (1 - k) * (VIDEO.width + 200);
  ctx.save();
  ctx.translate(shift, 0);
  for (let i = 0; i < 8; i++) {
    const x = 70 + i * 140;
    const g = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
    g.addColorStop(0, '#2a2c30');
    g.addColorStop(0.35, '#80848a');
    g.addColorStop(1, '#1a1b1e');
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, 0, 32, VIDEO.height);
    pen.stroke([{ x: x - 16, y: 0 }, { x: x - 16, y: VIDEO.height }], 3, INK);
    pen.stroke([{ x: x + 16, y: 0 }, { x: x + 16, y: VIDEO.height }], 3, INK);
  }
  for (const y of [300, 1330]) {
    const g = ctx.createLinearGradient(0, y - 22, 0, y + 22);
    g.addColorStop(0, '#2a2c30');
    g.addColorStop(0.4, '#8a8e94');
    g.addColorStop(1, '#1a1b1e');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 22, VIDEO.width + 200, 44);
    pen.stroke([{ x: 0, y: y - 22 }, { x: VIDEO.width + 200, y: y - 22 }], 3, INK);
    pen.stroke([{ x: 0, y: y + 22 }, { x: VIDEO.width + 200, y: y + 22 }], 3, INK);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- finish

export function drawFill(ctx: CanvasRenderingContext2D, colour: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function drawGrade(ctx: CanvasRenderingContext2D, grade: readonly [number, number, number, number]): void {
  const [r, g, b, a] = grade;
  drawFill(ctx, `rgb(${r},${g},${b})`, a);
}

/** The dentist's lamp: a warm pool of light on the mouth, the rest dimmed. */
export function drawLamp(ctx: CanvasRenderingContext2D, at: Pt, k: number): void {
  if (k <= 0) return;
  ctx.save();
  const g = ctx.createRadialGradient(at.x, at.y, 60, at.x, at.y, 760);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, `rgba(2,8,8,${(0.25 * k).toFixed(3)})`);
  g.addColorStop(1, `rgba(2,8,8,${(0.6 * k).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.globalCompositeOperation = 'lighter';
  const l = ctx.createRadialGradient(at.x, at.y, 10, at.x, at.y, 360);
  l.addColorStop(0, `rgba(255,244,210,${(0.22 * k).toFixed(3)})`);
  l.addColorStop(1, 'rgba(255,244,210,0)');
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function drawVignette(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(540, 820, 420, 540, 900, 1250);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(2,8,6,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

export { pathOf };
