import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { type Camera, cameraAt, ICE_PERIOD, ICE_Y, iceShift, LOOP_S, SNOW_LAPS } from './story';

/**
 * The world around the shark: cold dark water, the sea ice overhead in pen
 * and wash with light spilling through the cracks between its floes, and
 * marine snow. The ice is a strip ICE_PERIOD world px long, repeated, that
 * drifts by one strip per loop.
 */

const PALE = '#dff3fa';

export const toScreen = (cam: Camera, x: number, y: number): Pt => ({
  x: VIDEO.width / 2 + (x - cam.x) * cam.zoom,
  y: VIDEO.height / 2 + (y - cam.y) * cam.zoom,
});

/** The Arctic water: cold blue-green under the ice, black below. */
export function makeWater(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#16384a');
  g.addColorStop(0.35, '#0b2131');
  g.addColorStop(1, '#02060c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/** A glow in the water just under the ice, where the light comes through. */
export function drawIceGlow(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const top = toScreen(cam, 0, ICE_Y).y;
  const reach = 1100 * cam.zoom;
  if (top + reach < 0) return;
  const g = ctx.createLinearGradient(0, top, 0, top + reach);
  g.addColorStop(0, 'rgba(120,200,215,0.32)');
  g.addColorStop(0.4, 'rgba(70,150,175,0.1)');
  g.addColorStop(1, 'rgba(40,110,140,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.max(0, top - 10), VIDEO.width, reach + 10);
  ctx.restore();
}

// ---------------------------------------------------------------- the ice

/** Points along one strip's underside, every UNDER_STEP world px; the last meets the first, so strips tile. */
const UNDER_STEP = 20;

/** Pressure ridges: where the ice has buckled into keels hanging down, world x within a strip. */
const KEELS = [{ x: 380, depth: 46, width: 85 }, { x: 1180, depth: 36, width: 70 }] as const;

/** The cracks the sky shows through, world x within a strip, and how wide. */
const CRACKS = [{ x: 150, w: 14 }, { x: 640, w: 9 }, { x: 960, w: 16 }, { x: 1390, w: 8 }] as const;

/** Distance between two x in a strip, the short way round. */
const wrapDist = (a: number, b: number): number => {
  const d = Math.abs(a - b) % ICE_PERIOD;
  return Math.min(d, ICE_PERIOD - d);
};

/** The underside's depth below ICE_Y along one strip: gentle swells, keels, a crack's notch, and a ragged edge. */
const UNDER: readonly number[] = (() => {
  const rng = createRng(1642);
  const n = ICE_PERIOD / UNDER_STEP;
  const swells = [2, 3, 5, 9].map((k) => ({ k, a: 2 + rng() * 5, p: rng() * Math.PI * 2 }));
  const ragged = Array.from({ length: n }, () => (rng() - 0.5) * 7);
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = i * UNDER_STEP;
    let y = 22 + swells.reduce((sum, w) => sum + w.a * Math.sin((2 * Math.PI * w.k * x) / ICE_PERIOD + w.p), 0) + ragged[i % n]!;
    for (const k of KEELS) y += k.depth * Math.exp(-((wrapDist(x, k.x) / k.width) ** 2));
    // Thinner where it has cracked: the edges lift.
    for (const c of CRACKS) y -= 16 * Math.exp(-((wrapDist(x, c.x) / 40) ** 2));
    return y;
  });
})();

/** The lowest the ice reaches, world y (a keel's bottom). */
export const ICE_DEEPEST = ICE_Y + Math.max(...UNDER);

const underAt = (x: number): number => {
  const u = ((x % ICE_PERIOD) + ICE_PERIOD) % ICE_PERIOD / UNDER_STEP;
  const i = Math.floor(u);
  return ICE_Y + UNDER[i]! + (UNDER[i + 1]! - UNDER[i]!) * (u - i);
};

/** Each crack's jagged path from the top of the ice down to its underside, offsets from its middle. */
const CRACK_PATHS = (() => {
  const rng = createRng(77);
  return CRACKS.map(() => {
    const lean = (rng() - 0.5) * 30;
    // Meeting the underside at the crack's x, where its light falls from.
    return Array.from({ length: 7 }, (_, i) => (i === 6 ? 0 : lean * (1 - i / 6) + (rng() - 0.5) * 9));
  });
})();

/** The strips of ice in view: how far each is shifted, world px. */
function stripsInView(cam: Camera, t: number): number[] {
  const left = cam.x - VIDEO.width / 2 / cam.zoom - 200;
  const right = cam.x + VIDEO.width / 2 / cam.zoom + 200;
  const shift = -iceShift(t);
  const first = Math.floor((left - shift) / ICE_PERIOD);
  const out: number[] = [];
  for (let k = first; k * ICE_PERIOD + shift < right; k++) out.push(k * ICE_PERIOD + shift);
  return out;
}

/** Light falling through the cracks in the ice, slanting a little, shimmering. */
export function drawShafts(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const length = 1500;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const shift of stripsInView(cam, t)) {
    CRACKS.forEach((c, k) => {
      const top = toScreen(cam, c.x + shift, underAt(c.x) - 4);
      if (top.y > VIDEO.height) return;
      const lean = 0.16 + 0.05 * Math.sin(k * 1.7);
      const w = (c.w * 2 + 10) * cam.zoom;
      const spread = (70 + 18 * c.w) * cam.zoom;
      const len = length * cam.zoom;
      const shimmer = 0.7 + 0.3 * Math.sin((2 * Math.PI * (2 + (k % 3)) * t) / LOOP_S + k * 2.1);
      const g = ctx.createLinearGradient(top.x, top.y, top.x + lean * len, top.y + len);
      g.addColorStop(0, `rgba(190,240,250,${(0.22 * shimmer).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(150,220,235,${(0.07 * shimmer).toFixed(3)})`);
      g.addColorStop(1, 'rgba(150,220,235,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(top.x - w / 2, top.y);
      ctx.lineTo(top.x + w / 2, top.y);
      ctx.lineTo(top.x + lean * len + spread, top.y + len);
      ctx.lineTo(top.x + lean * len - spread, top.y + len);
      ctx.closePath();
      ctx.fill();
    });
  }
  ctx.restore();
}

/** One strip's underside as world points, shifted along. */
function underside(shift: number): Pt[] {
  return UNDER.map((d, i) => ({ x: i * UNDER_STEP + shift, y: ICE_Y + d }));
}

/** The underside raised by `lift` world px: a layer line in the ice above it. */
const raised = (under: readonly Pt[], lift: number): Pt[] => under.map((p) => ({ x: p.x, y: Math.min(p.y, ICE_Y + 30) - lift }));

/** The sea ice seen from the side, from below: pale slabs in pen and wash, ridge keels hanging down, and lit cracks, boiling like the game's ink. */
export function drawIce(ctx: CanvasRenderingContext2D, cam: Camera, t: number, boil: number): void {
  if (toScreen(cam, 0, ICE_Y + 160).y < 0) return;
  ctx.save();
  ctx.translate(VIDEO.width / 2 - cam.x * cam.zoom, VIDEO.height / 2 - cam.y * cam.zoom);
  ctx.scale(cam.zoom, cam.zoom);
  const roof = ICE_Y - 700;
  const pen = new Pen(ctx, 500 + boil * 31, 1.3);
  for (const shift of stripsInView(cam, t)) {
    const under = underside(shift);
    const slab = [{ x: shift, y: roof }, ...under, { x: shift + ICE_PERIOD, y: roof }];
    // Lit from above: pale near the top, deepening to blue-green where it is thickest.
    const g = ctx.createLinearGradient(0, ICE_Y - 200, 0, ICE_Y + 90);
    g.addColorStop(0, '#d8eef3');
    g.addColorStop(0.6, '#b2d6e1');
    g.addColorStop(1, '#8dbccc');
    ctx.fillStyle = g;
    ctx.beginPath();
    slab.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    // Layers in the ice, broken here and there, and shadow hatched along the underside.
    pen.clipped(slab, () => {
      for (const [lift, alpha] of [[34, 0.28], [72, 0.2], [125, 0.14]] as const) {
        const line = raised(under, lift);
        for (let i = 0; i + 6 < line.length; i += 9) pen.hair(line.slice(i, i + 6), 1.2, INK, alpha);
      }
    });
    // Shadow hatched in a band along the underside.
    const band = [...under, ...raised(under, 26).reverse()];
    pen.hatch(band, 7, -0.95, 0.9, { color: INK, alpha: 0.3 });
    // A rim of light along the underside, where the ice is thinnest.
    pen.stroke(under.map((p) => ({ x: p.x, y: p.y - 7 })), 3, '#effcff', 0.7, false);
    pen.stroke(under, 2.6, INK, 0.95, true);
    // The cracks: jagged slots of white sky, inked at their edges.
    CRACKS.forEach((c, k) => {
      const path = CRACK_PATHS[k]!;
      const bottom = underAt(c.x);
      const mid = path.map((dx, i) => ({ x: c.x + shift + dx, y: roof + 40 + ((bottom - roof - 40) * i) / (path.length - 1) }));
      // Narrow up in the ice, opening wider where it meets the water.
      const half = (i: number): number => (c.w / 2) * (0.35 + 0.65 * (i / (mid.length - 1)) ** 2) + (i === mid.length - 1 ? 5 : 0);
      const left = mid.map((p, i) => ({ x: p.x - half(i), y: p.y }));
      const right = mid.map((p, i) => ({ x: p.x + half(i), y: p.y }));
      pen.fill([...left, ...[...right].reverse()], '#f4ffff', 1);
      pen.stroke(left, 1.6, INK, 0.85, false);
      pen.stroke(right, 1.6, INK, 0.85, false);
    });
  }
  ctx.restore();
}

/** A bright glow where each crack opens under the ice. */
export function drawCrackGlow(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const shift of stripsInView(cam, t)) {
    CRACKS.forEach((c, k) => {
      const p = toScreen(cam, c.x + shift, underAt(c.x));
      if (p.y < -100 || p.y > VIDEO.height + 100) return;
      const reach = (40 + c.w * 4) * cam.zoom;
      const shimmer = 0.75 + 0.25 * Math.sin((2 * Math.PI * (3 + (k % 2)) * t) / LOOP_S + k);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, reach);
      g.addColorStop(0, `rgba(210,250,255,${(0.4 * shimmer).toFixed(3)})`);
      g.addColorStop(1, 'rgba(210,250,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - reach, p.y - reach, reach * 2, reach * 2);
    });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- marine snow

const SNOW = (() => {
  const rng = createRng(1916);
  return Array.from({ length: 240 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2.1, phase: rng() * Math.PI * 2 }));
})();
const BLUR_S = 1 / 25;

/**
 * Marine snow drifting by as the shark swims: carried left, sinking, and
 * smeared along its motion while the camera zooms, about one frame's worth.
 */
export function drawSnow(ctx: CanvasRenderingContext2D, t: number): void {
  const dt = 1 / 120;
  const [before, after] = [Math.max(t - dt, 0), Math.min(t + dt, LOOP_S - 1e-6)];
  const zoomRate = (Math.log(cameraAt(after).zoom) - Math.log(cameraAt(before).zoom)) / (after - before);
  const driftRate = -(SNOW_LAPS * VIDEO.width) / LOOP_S;
  ctx.save();
  ctx.fillStyle = PALE;
  ctx.strokeStyle = PALE;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.3;
  for (const m of SNOW) {
    const x = (((m.x - (SNOW_LAPS * VIDEO.width * t) / LOOP_S + 10 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase)) % VIDEO.width) + VIDEO.width) % VIDEO.width;
    const y = (m.y + (VIDEO.height * t) / LOOP_S) % VIDEO.height;
    const vx = driftRate + (x - VIDEO.width / 2) * zoomRate;
    const vy = (y - VIDEO.height / 2) * zoomRate;
    const sx = Math.max(-260, Math.min(260, vx * BLUR_S));
    const sy = Math.max(-260, Math.min(260, vy * BLUR_S));
    if (Math.hypot(sx, sy) > m.r) {
      ctx.lineWidth = m.r * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - sx, y - sy);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
