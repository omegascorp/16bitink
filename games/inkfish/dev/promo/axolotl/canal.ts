import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, type Pt } from '../../../src/art/pen';
import { drawRock, drawWeed, type WeedKind } from '../../../src/art/propArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { livePen, pt } from './ink';
import { BED_Y, type Camera, LOOP_S, SURFACE_Y, toScreen } from './story';

/**
 * Under the canal: murky green water, lighter toward the surface, with sun
 * rays slanting down and specks drifting; the game's own waterweeds (its
 * eelgrass and fern drawings, tinted to the canal's green) standing on a mud
 * bed in two rows; and the bed itself, inked with pebbles and the game's rocks.
 * Everything stands in the world, so it slides and scales with the camera.
 */

export const CANAL_INK = '#0e2219';
/** The game draws a weed on a 256 x 512 canvas (128 x 256 at ART_RES 2), a rock on 512 x 256. */
const WEED = { w: 128, h: 256 } as const;
const ROCK = { w: 256, h: 128 } as const;

/** The bed's height at world x: a soft, uneven line of mud. */
export const bedAt = (x: number): number => BED_Y + 10 * Math.sin(x * 0.004) + 6 * Math.sin(x * 0.011 + 1) + 3 * Math.sin(x * 0.031 + 2);

interface Stand {
  readonly x: number;
  readonly kind: WeedKind;
  readonly scale: number;
  readonly phase: number;
  /** 0 the back row (darker, behind the axolotl) .. 1 the front row. */
  readonly row: 0 | 1;
}

const STANDS: readonly Stand[] = (() => {
  const rng = createRng(2626);
  const out: Stand[] = [];
  for (let x = -2200; x < 3400; x += 150 + rng() * 170) out.push({ x, kind: rng() < 0.6 ? 1 : 2, scale: 2.4 + rng() * 1.4, phase: rng() * 6.3, row: 0 });
  // The front row keeps clear of the axolotl's spot on the bed.
  for (let x = -2100; x < 3400; x += 420 + rng() * 380) {
    if (x > 150 && x < 1200) continue;
    out.push({ x, kind: rng() < 0.5 ? 1 : 2, scale: 3.2 + rng() * 1.2, phase: rng() * 6.3, row: 1 });
  }
  return out;
})();

const ROCKS: readonly { readonly x: number; readonly scale: number; readonly i: number }[] = [
  { x: -260, scale: 1.5, i: 0 },
  { x: 1180, scale: 1.1, i: 1 },
  { x: 2300, scale: 1.7, i: 2 },
];

const PEBBLES = (() => {
  const rng = createRng(919);
  return Array.from({ length: 70 }, () => ({ x: -2400 + rng() * 6000, r: 5 + rng() * 10, dy: 4 + rng() * 26, shade: rng() }));
})();

const SPECKS = (() => {
  const rng = createRng(3131);
  return Array.from({ length: 110 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.8 + rng() * 2, phase: rng() * 6.3, a: 0.08 + rng() * 0.2 }));
})();

export interface Canal {
  readonly drawWater: (ctx: CanvasRenderingContext2D, cam: Camera, t: number) => void;
  readonly drawWeeds: (ctx: CanvasRenderingContext2D, cam: Camera, boil: number, t: number, row: 0 | 1) => void;
  readonly drawBed: (ctx: CanvasRenderingContext2D, cam: Camera, boil: number) => void;
}

/** Bakes the weed and rock drawings once (tinted per row), and returns the painters. */
export function makeCanal(): Canal {
  const weedFrames = (kind: WeedKind, row: 0 | 1): HTMLCanvasElement[] =>
    Array.from({ length: BOIL_FRAMES }, (_, f) => {
      const { canvas, ctx } = makeCanvas(WEED.w * 2, WEED.h * 2);
      ctx.filter = row === 0 ? 'sepia(0.5) hue-rotate(45deg) saturate(1.5) brightness(0.48)' : 'sepia(0.4) hue-rotate(40deg) saturate(1.7) brightness(0.62)';
      const { canvas: raw, ctx: rawCtx } = makeCanvas(WEED.w * 2, WEED.h * 2);
      rawCtx.scale(2, 2);
      drawWeed(rawCtx, 7 + kind * 13 + row * 5, kind, f, WEED.w, WEED.h);
      ctx.drawImage(raw, 0, 0);
      return canvas;
    });
  const weeds = new Map<string, HTMLCanvasElement[]>();
  for (const kind of [1, 2] as const) for (const row of [0, 1] as const) weeds.set(`${kind}-${row}`, weedFrames(kind, row));
  const rocks = [0, 1, 2].map((i) => {
    const { canvas, ctx } = makeCanvas(ROCK.w * 2, ROCK.h * 2);
    ctx.filter = 'sepia(0.6) hue-rotate(35deg) saturate(1.1) brightness(0.55)';
    const { canvas: raw, ctx: rawCtx } = makeCanvas(ROCK.w * 2, ROCK.h * 2);
    drawRock(rawCtx, 40 + i, ROCK.w * 2, ROCK.h * 2);
    ctx.drawImage(raw, 0, 0);
    return canvas;
  });

  const drawWater = (ctx: CanvasRenderingContext2D, cam: Camera, t: number): void => {
    const top = toScreen(cam, pt(0, SURFACE_Y)).y;
    const bottom = toScreen(cam, pt(0, BED_Y + 150)).y;
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#86ad8c');
    g.addColorStop(0.18, '#5d8a6a');
    g.addColorStop(0.55, '#355f48');
    g.addColorStop(1, '#1b3a2b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    // Sun rays slanting down from the surface.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const from = Math.max(0, top);
    const len = (BED_Y - SURFACE_Y) * cam.zoom;
    for (const [x, w, a] of [[-250, 160, 0.06], [80, 90, 0.05], [420, 200, 0.055], [760, 110, 0.045], [1100, 170, 0.05]] as const) {
      const sx = toScreen(cam, pt(x * 2, 0)).x;
      const ray = ctx.createLinearGradient(0, from, 0, from + len);
      ray.addColorStop(0, `rgba(230,240,170,${a})`);
      ray.addColorStop(1, 'rgba(230,240,170,0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(sx - (w * cam.zoom) / 2, from);
      ctx.lineTo(sx + (w * cam.zoom) / 2, from);
      ctx.lineTo(sx + (w * cam.zoom) / 2 + len * 0.35, from + len);
      ctx.lineTo(sx - (w * cam.zoom) / 2 + len * 0.3, from + len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Specks drifting: each sways once a loop and drifts one lap up.
    ctx.save();
    ctx.fillStyle = '#e8f2c8';
    const loop = t / LOOP_S;
    for (const s of SPECKS) {
      const y = (((s.y - VIDEO.height * loop) % VIDEO.height) + VIDEO.height) % VIDEO.height;
      if (y < top) continue;
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x + 16 * Math.sin(2 * Math.PI * loop + s.phase), y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawWeeds = (ctx: CanvasRenderingContext2D, cam: Camera, boil: number, t: number, row: 0 | 1): void => {
    STANDS.forEach((s, i) => {
      if (s.row !== row) return;
      const w = WEED.w * s.scale * cam.zoom;
      const h = WEED.h * s.scale * cam.zoom;
      const base = toScreen(cam, pt(s.x, bedAt(s.x) + (row === 0 ? -8 : 36)));
      if (base.x < -w || base.x > VIDEO.width + w || base.y - h > VIDEO.height) return;
      const frames = weeds.get(`${s.kind}-${row}`)!;
      ctx.save();
      ctx.translate(base.x, base.y);
      ctx.rotate(0.05 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S + s.phase));
      ctx.drawImage(frames[(boil + i) % BOIL_FRAMES]!, -w / 2, -h, w, h);
      ctx.restore();
    });
  };

  const drawBed = (ctx: CanvasRenderingContext2D, cam: Camera, boil: number): void => {
    const step = 14 / cam.zoom;
    const x0 = cam.x - (VIDEO.width / 2 + 40) / cam.zoom;
    const x1 = cam.x + (VIDEO.width / 2 + 40) / cam.zoom;
    const line: Pt[] = [];
    for (let x = x0; x <= x1 + step; x += step) line.push(toScreen(cam, pt(x, bedAt(x))));
    const top = Math.min(...line.map((p) => p.y));
    if (top > VIDEO.height) return;
    const g = ctx.createLinearGradient(0, top, 0, top + 500 * cam.zoom + 200);
    g.addColorStop(0, '#4a4a2c');
    g.addColorStop(1, '#14160d');
    const pen = livePen(ctx, boil, 3, 0.8);
    const shape = [...line, pt(VIDEO.width + 40, VIDEO.height + 40), pt(-40, VIDEO.height + 40)];
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Silt hatching just under the edge, and pebbles half sunk in it.
    pen.clipped(shape, () => {
      for (let i = 0; i < line.length; i += 2) {
        const p = line[i]!;
        pen.hair([pt(p.x, p.y + 8 * cam.zoom), pt(p.x - 18 * cam.zoom, p.y + 40 * cam.zoom)], Math.max(0.6, 1.4 * cam.zoom), CANAL_INK, 0.45);
      }
      for (const b of PEBBLES) {
        const c = toScreen(cam, pt(b.x, bedAt(b.x) + b.dy));
        if (c.x < -30 || c.x > VIDEO.width + 30) continue;
        const peb = ellipse(c.x, c.y, b.r * 1.4 * cam.zoom, b.r * 0.8 * cam.zoom, 12);
        pen.fill(peb, PAPER_FILL, 1);
        pen.fill(peb, b.shade < 0.5 ? '#6f6a4c' : '#8a7f5e', 0.8);
        pen.hair([...peb, peb[0]!], Math.max(0.6, 1.6 * cam.zoom), CANAL_INK, 0.85);
      }
    });
    pen.stroke(line, Math.max(1.2, 3 * cam.zoom), CANAL_INK, 1);
    for (const r of ROCKS) {
      const w = ROCK.w * r.scale * cam.zoom;
      const h = ROCK.h * r.scale * cam.zoom;
      const at = toScreen(cam, pt(r.x, bedAt(r.x) + 18));
      if (at.x < -w || at.x > VIDEO.width + w) continue;
      ctx.drawImage(rocks[r.i]!, at.x - w / 2, at.y - h, w, h);
    }
  };

  return { drawWater, drawWeeds, drawBed };
}

/** The axolotl's shadow on the bed. */
export function drawShadow(ctx: CanvasRenderingContext2D, at: Pt, w: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = 0.35 * alpha;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, w / 2, w * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
