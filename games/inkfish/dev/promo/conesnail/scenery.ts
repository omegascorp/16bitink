import { DECOR_SIZE, drawDecor, type DecorId } from '../../../src/art/decorArt';
import { ellipse, makeCanvas, PAPER, Pen } from '../../../src/art/pen';
import { ART_RES } from '../../../src/art/propArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import type { TextInk } from '../captions';
import { VIDEO } from '../short';
import { GROUND_Y } from './shape';
import { type Camera, cycles, LOOP_S, type Mood, moodAt, toScreen } from './story';

/**
 * The reef round the cone snail: paper under a wash in the mood's colours
 * with sunbeams, soft far coral in the haze, the sand (baked with ripples,
 * pebbles, shells and some of the game's own reef decor), then the grade
 * on top: a tint per mood, a haze for the sleepy beat, the vignette and
 * the flashes.
 */

export const INK_BG = '#07080f';
export const SPOKEN = '#f5c84a';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };

interface Palette {
  readonly top: string;
  readonly mid: string;
  readonly low: string;
  readonly far: string;
  readonly sand: string;
  readonly rays: number;
  readonly vignette: number;
  /** The whole picture multiplied by this colour, this much. */
  readonly grade: string;
  readonly gradeAlpha: number;
  /** A soft lavender haze over everything (the sleepy beat). */
  readonly haze: number;
}

const PALETTES: Readonly<Record<Mood, Palette>> = {
  creepy: { top: '#20384c', mid: '#0f1c2a', low: '#04070d', far: '#1a2a38', sand: '#5a5048', rays: 0.05, vignette: 0.85, grade: '#7a6a9a', gradeAlpha: 0.16, haze: 0 },
  comic: { top: '#74cde0', mid: '#3796bb', low: '#175c80', far: '#4b98b4', sand: '#dcc590', rays: 0.26, vignette: 0.2, grade: '#fff2c8', gradeAlpha: 0.1, haze: 0 },
  sly: { top: '#5d4482', mid: '#2f2150', low: '#120a24', far: '#46336a', sand: '#87707c', rays: 0.1, vignette: 0.6, grade: '#cf94e0', gradeAlpha: 0.26, haze: 0 },
  drowsy: { top: '#9095c6', mid: '#5c62a0', low: '#2b2e5e', far: '#6a6fa6', sand: '#ad9fa6', rays: 0.16, vignette: 0.45, grade: '#dccbf2', gradeAlpha: 0.25, haze: 0.16 },
  suspense: { top: '#15324c', mid: '#091c30', low: '#020810', far: '#122c40', sand: '#454a4e', rays: 0.03, vignette: 1, grade: '#3e5c84', gradeAlpha: 0.38, haze: 0 },
  surprise: { top: '#62d8ea', mid: '#2390b8', low: '#0c3c5c', far: '#2f82a0', sand: '#d8c690', rays: 0.3, vignette: 0.25, grade: '#ffffff', gradeAlpha: 0, haze: 0 },
  grave: { top: '#2c1d24', mid: '#150c12', low: '#050304', far: '#24171e', sand: '#3c3232', rays: 0.02, vignette: 1, grade: '#5e3c48', gradeAlpha: 0.45, haze: 0 },
  laugh: { top: '#92deea', mid: '#44b3ce', low: '#1c6a8a', far: '#52a6bc', sand: '#e8d49c', rays: 0.32, vignette: 0.12, grade: '#fff0c0', gradeAlpha: 0.14, haze: 0 },
};

const rgbOf = (hex: string): readonly [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixHex = (a: string, b: string, u: number): string => {
  const [p, q] = [rgbOf(a), rgbOf(b)];
  return `rgb(${p.map((v, i) => Math.round(v + (q[i]! - v) * u)).join(',')})`;
};
type Mixed = { readonly [K in keyof Palette]: Palette[K] extends number ? number : string };

/** The palette now, faded between the last mood and this one. */
export function paletteAt(t: number): Mixed {
  const { from, to, u } = moodAt(t);
  const a = PALETTES[from];
  const b = PALETTES[to];
  const num = (k: 'rays' | 'vignette' | 'gradeAlpha' | 'haze'): number => a[k] + (b[k] - a[k]) * u;
  return {
    top: mixHex(a.top, b.top, u),
    mid: mixHex(a.mid, b.mid, u),
    low: mixHex(a.low, b.low, u),
    far: mixHex(a.far, b.far, u),
    sand: mixHex(a.sand, b.sand, u),
    grade: mixHex(a.grade, b.grade, u),
    rays: num('rays'),
    vignette: num('vignette'),
    gradeAlpha: num('gradeAlpha'),
    haze: num('haze'),
  };
}

// ---------------------------------------------------------------- water

export const makeSheet = (): HTMLCanvasElement => makePaper();

const RAYS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 8 }, (_, i) => ({ x: -200 + i * 190 + rng() * 120, w: 50 + rng() * 110, sway: rng() * Math.PI * 2, a: 0.6 + rng() * 0.6 }));
})();

export function drawWater(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  const p = paletteAt(t);
  ctx.drawImage(sheet, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, p.top);
  g.addColorStop(0.55, p.mid);
  g.addColorStop(1, p.low);
  ctx.save();
  ctx.globalAlpha = 0.93;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  if (p.rays <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const r of RAYS) {
    const x0 = r.x + 40 * Math.sin(cycles(1, t) + r.sway);
    const ray = ctx.createLinearGradient(0, -100, 0, 1500);
    ray.addColorStop(0, `rgba(220,245,255,${(p.rays * r.a).toFixed(3)})`);
    ray.addColorStop(1, 'rgba(220,245,255,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(x0 - r.w / 2, -100);
    ctx.lineTo(x0 + r.w / 2, -100);
    ctx.lineTo(x0 - 380 + r.w * 1.5, 1500);
    ctx.lineTo(x0 - 380 - r.w * 1.5, 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Far coral heads and fans in the haze, on a slower camera. */
const FAR = (() => {
  const rng = createRng(311);
  return Array.from({ length: 14 }, (_, i) => ({ x: -900 + i * 190 + rng() * 120, r: 70 + rng() * 110, h: 0.5 + rng() * 0.7, fan: i % 4 === 1, shade: rng() }));
})();

export function drawFarReef(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  const far: Camera = { x: 200 + (cam.x - 200) * 0.45, y: cam.y * 0.45, zoom: 0.6 + (cam.zoom - 1) * 0.3 };
  const base = GROUND_Y - 40;
  ctx.save();
  ctx.fillStyle = p.far;
  ctx.strokeStyle = p.far;
  for (const c of FAR) {
    ctx.globalAlpha = 0.45 + 0.3 * c.shade;
    const at = toScreen(far, { x: c.x, y: base });
    const r = c.r * far.zoom;
    if (c.fan) {
      ctx.lineWidth = 3;
      for (let k = -4; k <= 4; k++) {
        ctx.beginPath();
        ctx.moveTo(at.x, at.y);
        ctx.quadraticCurveTo(at.x + k * r * 0.12, at.y - r * c.h, at.x + k * r * 0.26, at.y - r * 1.6 * c.h);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, r, r * c.h, 0, Math.PI, 0);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the sand and the reef (baked)

/** The baked layer's extent in sp, and its pixels per sp. */
const LAYER = { x0: -760, y0: -460, w: 2120, h: 1400, res: 1 } as const;

export interface ReefLayer {
  readonly frames: readonly HTMLCanvasElement[];
}

const PLACED: readonly (readonly [DecorId, number, number, number])[] = [
  // [kind, x, base y, scale]
  ['seafan', -600, GROUND_Y - 30, 2.6],
  ['braincoral', -380, GROUND_Y + 10, 1.7],
  ['tubesponge', -500, GROUND_Y + 40, 1.6],
  ['anemone', 860, GROUND_Y + 20, 1.5],
  ['staghorn', 1080, GROUND_Y - 10, 2.2],
  ['seafan', 1250, GROUND_Y - 40, 2.2],
  ['scallops', 520, GROUND_Y + 150, 1.3],
  ['starfish', -200, GROUND_Y + 230, 1.4],
  ['pebbles', 300, GROUND_Y + 60, 1.4],
  ['pebbles', -120, GROUND_Y + 330, 1.6],
];

export function makeReefLayer(): ReefLayer {
  const decor = PLACED.map(([kind, x, base, scale], i) => {
    const size = DECOR_SIZE[kind];
    const { canvas, ctx } = makeCanvas(size.w * ART_RES, size.h * ART_RES);
    drawDecor(ctx, kind, 50 + i);
    return { canvas, x, base, w: size.w * scale, h: size.h * scale };
  });
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(LAYER.w * LAYER.res), Math.ceil(LAYER.h * LAYER.res));
    ctx.scale(LAYER.res, LAYER.res);
    ctx.translate(-LAYER.x0, -LAYER.y0);
    const pen = new Pen(ctx, 1201 + f * 977, 0.8);
    const rng = createRng(1203);
    const right = LAYER.x0 + LAYER.w;
    const bottom = LAYER.y0 + LAYER.h;
    // The sand's top edge, gently rolling.
    const edge = Array.from({ length: 60 }, (_, i) => {
      const x = LAYER.x0 + (i / 59) * LAYER.w;
      return { x, y: GROUND_Y - 4 + 10 * Math.sin(x / 210) + 5 * Math.sin(x / 77) };
    });
    const sand = [...edge, { x: right, y: bottom }, { x: LAYER.x0, y: bottom }];
    pen.fill(sand, '#d8c6a0', 1);
    pen.clipped(sand, () => {
      const g = ctx.createLinearGradient(0, GROUND_Y - 10, 0, GROUND_Y + 600);
      g.addColorStop(0, 'rgba(60,50,40,0.45)');
      g.addColorStop(0.3, 'rgba(60,50,40,0.1)');
      g.addColorStop(1, 'rgba(255,248,230,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(LAYER.x0, GROUND_Y - 20, LAYER.w, bottom - GROUND_Y + 20);
      // Ripples, stipple and scattered grit.
      for (let i = 0; i < 140; i++) {
        const x = LAYER.x0 + rng() * LAYER.w;
        const y = GROUND_Y + 20 + rng() ** 1.4 * (bottom - GROUND_Y - 40);
        const len = 30 + rng() * 70;
        pen.hair(Array.from({ length: 6 }, (_, k) => ({ x: x + (k / 5) * len, y: y + 3 * Math.sin(k * 1.2) })), 0.9, '#6a5a44', 0.32);
      }
      pen.stipple(sand, 3000, (_x, y) => 0.2 + 0.5 * Math.max(0, 1 - (y - GROUND_Y) / 500), 0.9, '#5d4e3a');
      for (let i = 0; i < 40; i++) {
        const x = LAYER.x0 + rng() * LAYER.w;
        const y = GROUND_Y + 30 + rng() * 700;
        const r = 3 + rng() * 7;
        const pebble = ellipse(x, y, r * 1.3, r, 10);
        pen.fill(pebble, '#a3927a', 0.8);
        pen.hair([...pebble, pebble[0]!], 0.7, '#3a3028', 0.6);
      }
    });
    pen.stroke(edge, 1.6, '#3a3028', 0.7);
    for (const d of decor) ctx.drawImage(d.canvas, d.x - d.w / 2, d.base - d.h, d.w, d.h);
    return canvas;
  });
  return { frames };
}

export function drawReef(ctx: CanvasRenderingContext2D, cam: Camera, reef: ReefLayer, boil: number, t: number): void {
  const p = paletteAt(t);
  // Sand all the way down, under the baked layer (wide shots see further than it reaches).
  const top = toScreen(cam, { x: 0, y: GROUND_Y + 200 }).y;
  ctx.save();
  ctx.fillStyle = '#c9b48c';
  ctx.fillRect(0, top, VIDEO.width, VIDEO.height - top);
  const at = toScreen(cam, { x: LAYER.x0, y: LAYER.y0 });
  ctx.drawImage(reef.frames[boil % reef.frames.length]!, at.x, at.y, LAYER.w * cam.zoom, LAYER.h * cam.zoom);
  // The mood's sand colour, multiplied in below the horizon.
  const horizon = toScreen(cam, { x: 0, y: GROUND_Y - 20 }).y;
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = p.sand;
  ctx.fillRect(0, horizon, VIDEO.width, VIDEO.height - horizon);
  ctx.restore();
}

// ---------------------------------------------------------------- grade

const SPECKS = (() => {
  const rng = createRng(909);
  return Array.from({ length: 110 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.8 + rng() * 2, phase: rng() * Math.PI * 2, a: 0.1 + rng() * 0.22 }));
})();

/** Specks drifting in the water: each sways once a loop and drifts one lap up. */
export function drawSpecks(ctx: CanvasRenderingContext2D, t: number): void {
  const loop = t / LOOP_S;
  ctx.save();
  ctx.fillStyle = '#eaf6ff';
  for (const s of SPECKS) {
    const x = s.x + 14 * Math.sin(2 * Math.PI * loop + s.phase);
    const y = (((s.y - VIDEO.height * loop) % VIDEO.height) + VIDEO.height) % VIDEO.height;
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The mood's tint, the sleepy haze, the vignette. */
export function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const p = paletteAt(t);
  ctx.save();
  if (p.gradeAlpha > 0.005) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = p.gradeAlpha;
    ctx.fillStyle = p.grade;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  if (p.haze > 0.005) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = p.haze * (0.85 + 0.15 * Math.sin(cycles(6, t)));
    ctx.fillStyle = '#d9cdf5';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(VIDEO.width / 2, 800, 360, VIDEO.width / 2, 860, 1250);
  g.addColorStop(0, 'rgba(2,3,8,0)');
  g.addColorStop(1, `rgba(2,3,8,${p.vignette.toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function drawFlash(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, amount);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}
