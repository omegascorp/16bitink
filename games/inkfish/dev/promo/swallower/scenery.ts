import { halo } from '../../../src/art/glowArt';
import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { drawTextLine, INK_ON_PAPER } from '../captions';
import { INK_BG, SPOKEN } from '../gulper/scenery';
import { VIDEO } from '../short';
import { type Camera, SURF, toScreen } from './story';

/**
 * The sea around the swallower: the game's paper under a wash that runs
 * from the near-black of the deep to the blue under the surface as the
 * camera climbs, marine snow streaming past as it moves, soft shafts of
 * light near the top, and the surface itself: a pale sky, the waterline,
 * and a little island with a palm, inked like the game's scenery.
 */

/** The game's sketchbook paper, once. */
export const makeSheet = (): HTMLCanvasElement => makePaper();

const DEEP_TOP = [13, 23, 51] as const;
const DEEP_BOTTOM = [3, 6, 15] as const;
const SHALLOW_TOP = [52, 92, 126] as const;
const SHALLOW_BOTTOM = [12, 30, 60] as const;

const rgba = (a: readonly number[], b: readonly number[], u: number, alpha: number): string =>
  `rgba(${a.map((v, i) => Math.round(v + (b[i]! - v) * u)).join(',')},${alpha})`;

/** The water: paper under a wash, deep (`light` 0) or just under the surface (1). */
export function drawWater(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, light: number): void {
  ctx.drawImage(sheet, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, rgba(DEEP_TOP, SHALLOW_TOP, light, 0.94));
  g.addColorStop(0.55, rgba([7, 12, 31], [24, 52, 88], light, 0.95));
  g.addColorStop(1, rgba(DEEP_BOTTOM, SHALLOW_BOTTOM, light, 0.96));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const SNOW = (() => {
  const rng = createRng(4243);
  return Array.from({ length: 200 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2.1, phase: rng() * Math.PI * 2, depth: 0.45 + rng() * 0.55 }));
})();

/**
 * Marine snow, fixed to the water so it streams past as the camera moves
 * (nearer flakes faster), streaking when it moves fast; fewer flakes near the
 * surface. A function of the camera alone, so it loops with it.
 */
export function drawSnow(ctx: CanvasRenderingContext2D, cam: Camera, loop: number, light: number): void {
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = '#dfe8ff';
  ctx.lineCap = 'round';
  const H = VIDEO.height;
  for (const m of SNOW) {
    const par = 0.5 + 0.5 * m.depth;
    const x = (((m.x - cam.x * par * 0.4 + 12 * Math.sin(2 * Math.PI * loop + m.phase)) % VIDEO.width) + VIDEO.width) % VIDEO.width;
    const y = (((m.y - cam.y * par) % H) + H) % H;
    ctx.globalAlpha = (0.14 + 0.18 * m.depth) * (1 - 0.65 * light);
    const len = Math.abs(cam.vy) * cam.zoom * par * 0.035;
    if (len > m.r * 1.5) {
      ctx.lineWidth = m.r * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + Math.sign(cam.vy) * len);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Where the waterline is on screen. */
export const waterlineY = (cam: Camera): number => toScreen(cam, { x: 0, y: SURF }).y;

const RAYS = [{ x: 0.16, w: 90, lean: 0.32 }, { x: 0.36, w: 150, lean: 0.27 }, { x: 0.58, w: 110, lean: 0.24 }, { x: 0.8, w: 170, lean: 0.2 }, { x: 0.98, w: 100, lean: 0.17 }] as const;

/** Soft shafts of light slanting down from the surface, swaying, `strength` 0 .. 1. */
export function drawRays(ctx: CanvasRenderingContext2D, cam: Camera, strength: number, loop: number): void {
  if (strength <= 0.01) return;
  const top = Math.max(-200, waterlineY(cam));
  if (top > VIDEO.height) return;
  const len = 1500 * cam.zoom;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  RAYS.forEach((r, i) => {
    const sway = 0.03 * Math.sin(2 * Math.PI * loop * 2 + i * 1.7);
    const x0 = r.x * VIDEO.width;
    const a = r.lean + sway;
    const w = r.w * cam.zoom;
    const g = ctx.createLinearGradient(x0, top, x0 - Math.sin(a) * len, top + Math.cos(a) * len);
    g.addColorStop(0, `rgba(205,225,240,${(0.16 * strength).toFixed(3)})`);
    g.addColorStop(1, 'rgba(205,225,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - w / 2, top);
    ctx.lineTo(x0 + w / 2, top);
    ctx.lineTo(x0 + w / 2 - Math.sin(a) * len + w * 0.6, top + Math.cos(a) * len);
    ctx.lineTo(x0 - w / 2 - Math.sin(a) * len - w * 0.6, top + Math.cos(a) * len);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** The island off to the right of where it floats up, world px on the surface: a low hill and one palm. */
const ISLAND = { from: 690, to: 1300, peak: 950, height: 120 } as const;
const PALM = { x: 900, height: 150 } as const;

/** The sky over the surface, the island and its palm, and the waterline, where they're on screen. */
export function drawSurface(ctx: CanvasRenderingContext2D, cam: Camera, boil: number, loop: number): void {
  const wl = waterlineY(cam);
  if (wl < -10) return;
  const z = cam.zoom;
  const sky = ctx.createLinearGradient(0, 0, 0, wl);
  sky.addColorStop(0, '#e6dcc4');
  sky.addColorStop(1, '#f6efdf');
  ctx.save();
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, wl);
  const pen = new Pen(ctx, 9001 + boil * 977, 0.8);
  const at = (x: number, up: number): Pt => {
    const p = toScreen(cam, { x, y: SURF });
    return { x: p.x, y: p.y - up * z };
  };
  // A low sun behind it.
  halo(ctx, at(1130, 210).x, at(1130, 210).y, 160 * z, '#fff3cf', 0.6);
  // The hill: a soft bump, inked solid, with hatching on its flank.
  const hill = Array.from({ length: 25 }, (_, i) => {
    const u = i / 24;
    const x = ISLAND.from + (ISLAND.to - ISLAND.from) * u;
    const d = (x - ISLAND.peak) / (x < ISLAND.peak ? ISLAND.peak - ISLAND.from : ISLAND.to - ISLAND.peak);
    return at(x, ISLAND.height * Math.max(0, 1 - d * d) ** 0.8);
  });
  pen.fill(hill, '#3b3a34', 0.92);
  pen.stroke(hill, 2.2, INK, 1, true);
  pen.clipped(hill, () => {
    for (let x = ISLAND.from; x < ISLAND.to; x += 18) pen.hair([at(x, 0), at(x + 40, ISLAND.height)], 0.8, INK, 0.5);
  });
  // The palm: a leaning trunk and fronds drooping from its crown.
  const base = at(PALM.x, ISLAND.height * 0.85);
  const crown = { x: base.x - 50 * z, y: base.y - PALM.height * z };
  const trunk = Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return { x: base.x + (crown.x - base.x) * u + Math.sin(Math.PI * u) * 22 * z, y: base.y + (crown.y - base.y) * u };
  });
  pen.stroke(trunk, 7 * z, '#3b3a34', 1, false);
  pen.stroke(trunk, 2 * z, INK, 1, false);
  trunk.forEach((p, i) => i % 2 && pen.hair([{ x: p.x - 5 * z, y: p.y }, { x: p.x + 5 * z, y: p.y + 2 * z }], 1, INK, 0.7));
  const sway = 0.05 * Math.sin(2 * Math.PI * loop * 3);
  // Fronds: long leaves arching out of the crown and drooping at the tips, cut into leaflets along their edges.
  for (const a of [-2.85, -2.35, -1.85, -1.3, -0.8, -0.3]) {
    const ang = a + sway;
    const len = 105 * z;
    const spine = Array.from({ length: 13 }, (_, i) => {
      const u = i / 12;
      return { x: crown.x + Math.cos(ang) * len * u, y: crown.y + Math.sin(ang) * len * u - Math.sin(Math.PI * u * 0.8) * 22 * z + u * u * 38 * z };
    });
    const side = (s: number): Pt[] =>
      spine.map((p, i) => {
        const q = spine[Math.min(12, i + 1)]!;
        const r = spine[Math.max(0, i - 1)]!;
        const d = Math.hypot(q.x - r.x, q.y - r.y) || 1;
        const w = 13 * z * Math.sin(Math.PI * Math.min(1, (i / 12) * 1.05)) * (i % 2 ? 0.55 : 1);
        return { x: p.x - ((q.y - r.y) / d) * w * s, y: p.y + ((q.x - r.x) / d) * w * s };
      });
    const leaf = [...side(1), ...side(-1).reverse()];
    pen.fill(leaf, '#3b3a34', 0.95);
    pen.stroke(spine, 1.6 * z, INK, 1, false);
    pen.hair([...leaf, leaf[0]!], 1, INK, 0.8);
  }
  // The waterline: a wavy inked line with a pale band of light under it.
  const band = ctx.createLinearGradient(0, wl, 0, wl + 90 * z);
  band.addColorStop(0, 'rgba(190,215,232,0.35)');
  band.addColorStop(1, 'rgba(190,215,232,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, wl, VIDEO.width, 90 * z);
  const wave = Array.from({ length: 28 }, (_, i) => ({ x: (i / 27) * (VIDEO.width + 40) - 20, y: wl + 4 * Math.sin(i * 1.3 + 2 * Math.PI * loop * 4) }));
  pen.stroke(wave, 2.4, INK, 1, true);
  ctx.restore();
}

/** The dark closing in at the edges, lighter near the surface. */
export function drawVignette(ctx: CanvasRenderingContext2D, light: number): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 760, 380, VIDEO.width / 2, 800, 1250);
  g.addColorStop(0, 'rgba(1,2,6,0)');
  g.addColorStop(1, `rgba(1,2,6,${(0.7 * (1 - 0.6 * light)).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** A soft pool of light round the fish, so a black fish reads on black water. */
export function drawPool(ctx: CanvasRenderingContext2D, at: Pt, r: number, strength: number): void {
  const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
  g.addColorStop(0, `rgba(150,170,215,${(0.2 * strength).toFixed(3)})`);
  g.addColorStop(0.5, `rgba(130,150,205,${(0.08 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(130,150,205,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(at.x - r, at.y - r, 2 * r, 2 * r);
  ctx.restore();
}

/** An open dashed chalk line through `pts`, drawn on over `drawn` 0 .. 1. */
export function drawDashedOpen(ctx: CanvasRenderingContext2D, pts: readonly Pt[], drawn: number, alpha: number, colour = SPOKEN, width = 6): void {
  if (drawn <= 0 || alpha <= 0 || pts.length < 2) return;
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
  let left = lens.reduce((s, l) => s + l, 0) * Math.min(1, drawn);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.setLineDash([20, 14]);
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const u = Math.min(1, left / (lens[i - 1]! || 1));
    ctx.lineTo(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
    left -= lens[i - 1]!;
  }
  ctx.stroke();
  ctx.restore();
}

/** A hand-drawn ring (slightly open, overshooting where it closes) round `at`, drawn on over `drawn`. */
export function drawRing(ctx: CanvasRenderingContext2D, at: Pt, rx: number, ry: number, drawn: number, alpha: number, width = 6, colour = SPOKEN): void {
  if (drawn <= 0 || alpha <= 0) return;
  const start = -2.2;
  const sweep = Math.PI * 2.12 * Math.min(1, drawn);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK_BG;
  ctx.lineCap = 'round';
  ctx.lineWidth = width + 5;
  const path = (): void => {
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = start + (sweep * i) / 60;
      const wob = 1 + 0.03 * Math.sin(a * 3);
      const p = { x: at.x + Math.cos(a) * rx * wob, y: at.y + Math.sin(a) * ry * wob };
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  };
  ctx.globalAlpha = alpha * 0.5;
  path();
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  path();
  ctx.stroke();
  ctx.restore();
}

/** A label in ink on the pale sky. */
export function drawSkyLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number): void {
  drawTextLine(ctx, text, x, y, size, 700, alpha, INK_ON_PAPER);
}

export { INK_BG, SPOKEN };
