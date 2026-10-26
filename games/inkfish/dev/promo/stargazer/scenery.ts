import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import type { TextInk } from '../captions';
import { VIDEO } from '../short';
import { type Burst, burstAge, BURSTS, type Camera, cycles, headAt, LOOP_S, type Mood, moodAt, toScreen } from './story';

/**
 * The seabed round the stargazer, seen low: dark water with a beam of light
 * from above, a hazy far sand, and the near sand it's buried in (a little
 * mound round its head), with grains of sand thrown up when it strikes. Then
 * the grading on top: a tint per mood, the vignette and the flash.
 */

export const INK_BG = '#050914';
export const SPOKEN = '#f5c84a';
export const CHALK = '#eef3ea';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };

interface Palette {
  readonly top: string;
  readonly mid: string;
  readonly low: string;
  readonly sand: string;
  readonly beam: number;
  readonly vignette: number;
  /** The whole picture multiplied by this colour, this much. */
  readonly grade: string;
  readonly gradeAlpha: number;
}

const PALETTES: Readonly<Record<Mood, Palette>> = {
  terror: { top: '#24486a', mid: '#0c1d30', low: '#03070e', sand: '#b39a6c', beam: 0.3, vignette: 0.75, grade: '#ffffff', gradeAlpha: 0 },
  eerie: { top: '#244a44', mid: '#0e2421', low: '#030a09', sand: '#867c5c', beam: 0.08, vignette: 0.95, grade: '#a4ccb6', gradeAlpha: 0.25 },
  dread: { top: '#43283e', mid: '#1c1020', low: '#060308', sand: '#86685a', beam: 0.06, vignette: 1, grade: '#cc94a2', gradeAlpha: 0.28 },
  curious: { top: '#58bccf', mid: '#217c9a', low: '#0c3852', sand: '#dcc48e', beam: 0.28, vignette: 0.3, grade: '#ffffff', gradeAlpha: 0 },
  suspense: { top: '#1a2d44', mid: '#0a1524', low: '#020509', sand: '#655e52', beam: 0.05, vignette: 1, grade: '#7084b0', gradeAlpha: 0.38 },
  shock: { top: '#86e2f2', mid: '#2e98ba', low: '#0e4664', sand: '#e2ce96', beam: 0.4, vignette: 0.2, grade: '#ffffff', gradeAlpha: 0 },
  electric: { top: '#2e2e84', mid: '#140f44', low: '#05041c', sand: '#625c84', beam: 0.08, vignette: 0.9, grade: '#a294ff', gradeAlpha: 0.28 },
  sarcastic: { top: '#7f8f8b', mid: '#4b5957', low: '#1d2525', sand: '#aca290', beam: 0.1, vignette: 0.45, grade: '#d6d6cc', gradeAlpha: 0.3 },
  laugh: { top: '#94deec', mid: '#40b2ce', low: '#18668c', sand: '#efd89c', beam: 0.34, vignette: 0.15, grade: '#fff0c0', gradeAlpha: 0.12 },
  mischief: { top: '#22503f', mid: '#0d2722', low: '#030a08', sand: '#8e7f5a', beam: 0.1, vignette: 0.85, grade: '#b4e2a4', gradeAlpha: 0.2 },
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
  const num = (k: 'beam' | 'vignette' | 'gradeAlpha'): number => a[k] + (b[k] - a[k]) * u;
  return {
    top: mixHex(a.top, b.top, u),
    mid: mixHex(a.mid, b.mid, u),
    low: mixHex(a.low, b.low, u),
    sand: mixHex(a.sand, b.sand, u),
    grade: mixHex(a.grade, b.grade, u),
    beam: num('beam'),
    vignette: num('vignette'),
    gradeAlpha: num('gradeAlpha'),
  };
}

// ---------------------------------------------------------------- the water

export function drawWater(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  const top = toScreen(cam, { x: 0, y: -1100 }).y;
  const bottom = toScreen(cam, { x: 0, y: 0 }).y;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, p.top);
  g.addColorStop(0.6, p.mid);
  g.addColorStop(1, p.low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  drawBeam(ctx, cam, t, p.beam);
}

/** A beam of light from above, falling on the head, with fainter shafts either side; they sway once a loop. */
function drawBeam(ctx: CanvasRenderingContext2D, cam: Camera, t: number, strength: number): void {
  if (strength <= 0.005) return;
  const foot = toScreen(cam, { x: 0, y: 0 });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [dx, w, a, phase] of [[0, 260, 1, 0], [-420, 120, 0.45, 1.7], [460, 150, 0.4, 3.1], [-860, 90, 0.3, 4.4]] as const) {
    const sway = 30 * Math.sin(cycles(1, t) + phase);
    const x0 = foot.x + (dx + sway + 160) * cam.zoom;
    const x1 = foot.x + (dx + sway) * cam.zoom;
    const g = ctx.createLinearGradient(0, -100, 0, foot.y + 60);
    g.addColorStop(0, `rgba(215,240,255,${(strength * a * 0.9).toFixed(3)})`);
    g.addColorStop(1, `rgba(215,240,255,${(strength * a * 0.15).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - w * 0.45 * cam.zoom, -100);
    ctx.lineTo(x0 + w * 0.45 * cam.zoom, -100);
    ctx.lineTo(x1 + w * cam.zoom, foot.y + 60);
    ctx.lineTo(x1 - w * cam.zoom, foot.y + 60);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the sand

/** The sand's surface, world y at x: low dunes, and a mound round the head that flattens as it bursts out. */
function sandY(x: number, mound: number): number {
  return 8 * Math.sin(x * 0.006 + 0.7) + 5 * Math.sin(x * 0.017) - mound * Math.exp(-((x / 420) ** 2));
}

/** Far sand: a hazy band from the horizon down to the near sand. */
export function drawFarSand(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  const horizon = toScreen(cam, { x: 0, y: -60 }).y;
  const near = toScreen(cam, { x: 0, y: 10 }).y;
  const g = ctx.createLinearGradient(0, horizon, 0, near);
  g.addColorStop(0, p.mid);
  g.addColorStop(1, p.sand);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, VIDEO.width, VIDEO.height - horizon);
  ctx.restore();
}

/** Pebbles and shells lying on the near sand, world px. */
const STONES = (() => {
  const rng = createRng(611);
  return Array.from({ length: 26 }, () => ({ x: -1400 + rng() * 2800, y: 40 + rng() * 520, r: 6 + rng() * 14, shell: rng() < 0.3, tone: rng() }));
})();

/** The near sand, over the buried head: a mound round it, ripples, pebbles and shells. */
export function drawSand(ctx: CanvasRenderingContext2D, cam: Camera, t: number, rise: number): void {
  const p = paletteAt(t);
  const mound = 26 * (1 - Math.min(1, rise / 260)) + 10;
  const pts: { x: number; y: number }[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 15) {
    const wx = cam.x + (x - VIDEO.width / 2) / cam.zoom;
    pts.push(toScreen(cam, { x: wx, y: sandY(wx, mound) }));
  }
  const top = Math.min(...pts.map((q) => q.y));
  if (top > VIDEO.height) return;
  const g = ctx.createLinearGradient(0, top, 0, top + 700 * cam.zoom);
  g.addColorStop(0, p.sand);
  g.addColorStop(1, p.low);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-20, VIDEO.height + 20);
  pts.forEach((q) => ctx.lineTo(q.x, q.y));
  ctx.lineTo(VIDEO.width + 20, VIDEO.height + 20);
  ctx.closePath();
  ctx.fill();
  ctx.clip();
  // The lit rim of the surface, then ripples, grains, pebbles and shells inked faintly.
  ctx.strokeStyle = 'rgba(255,246,220,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y + 2) : ctx.lineTo(q.x, q.y + 2)));
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, 1.6 * cam.zoom);
  ctx.globalAlpha = 0.2;
  for (let k = 0; k < 12; k++) {
    const wy = 40 + k * 55 + k * k * 4;
    const wx0 = -1300 + ((k * 337) % 500);
    for (let j = 0; j < 9; j++) {
      const a = toScreen(cam, { x: wx0 + j * 330, y: wy + 10 * Math.sin(j * 1.3 + k) });
      const w = (110 + 20 * k) * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(a.x + w * 0.5, a.y - 8 * cam.zoom, a.x + w, a.y);
      ctx.stroke();
    }
  }
  for (const s of STONES) {
    const a = toScreen(cam, { x: s.x, y: s.y });
    const r = s.r * cam.zoom * (0.7 + s.y / 900);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = s.shell ? '#efe2c4' : s.tone < 0.5 ? '#6e6250' : '#9a8a6e';
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(1, 1.4 * cam.zoom);
    ctx.stroke();
    if (s.shell) {
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        ctx.moveTo(a.x, a.y + r * 0.45);
        ctx.lineTo(a.x + k * r * 0.35, a.y - r * 0.4);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- grains of sand thrown up

interface Grain {
  readonly x: number;
  readonly vx: number;
  readonly vy: number;
  readonly r: number;
  readonly tone: number;
}
const GRAINS = new Map<number, readonly Grain[]>();
function grainsOf(b: Burst): readonly Grain[] {
  const have = GRAINS.get(b.seed);
  if (have) return have;
  const rng = createRng(b.seed);
  const made = Array.from({ length: b.count }, () => {
    const x = (rng() * 2 - 1) * b.width;
    const out = x / b.width;
    return { x, vx: out * (260 + rng() * 420), vy: -(380 + rng() * 820) * (1 - 0.4 * Math.abs(out)), r: 2 + rng() * 6, tone: rng() };
  });
  GRAINS.set(b.seed, made);
  return made;
}

/** Sand flung up from round the head (world px, gravity pulling it back), fading as it settles. Clouds of fine silt behind. */
export function drawSpray(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  ctx.save();
  for (const b of BURSTS) {
    const age = burstAge(b, t);
    if (age === null) continue;
    const k = b.power;
    const fade = (1 - age / 1.7) ** 1.3;
    // The silt cloud: a soft billow rising off the sand.
    const cloud = toScreen(cam, { x: 0, y: -60 * k - 120 * k * Math.sqrt(age) });
    const rad = (220 + 260 * Math.sqrt(age)) * k * cam.zoom;
    const g = ctx.createRadialGradient(cloud.x, cloud.y, rad * 0.1, cloud.x, cloud.y, rad);
    g.addColorStop(0, `rgba(214,196,150,${(0.32 * fade * Math.min(1, age * 8)).toFixed(3)})`);
    g.addColorStop(1, 'rgba(214,196,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cloud.x - rad, cloud.y - rad, rad * 2, rad * 2);
    for (const gr of grainsOf(b)) {
      const drag = 1 - Math.exp(-2.2 * age);
      const x = gr.x + (gr.vx * k * drag) / 2.2;
      const y = -10 + (gr.vy * k * drag) / 2.2 + 520 * age * age;
      if (y > 30) continue;
      const at = toScreen(cam, { x, y });
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = gr.tone < 0.6 ? p.sand : gr.tone < 0.85 ? '#f2e4bc' : INK;
      ctx.beginPath();
      ctx.arc(at.x, at.y, gr.r * cam.zoom * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- drifting specks, grading, the flash

const SPECKS = (() => {
  const rng = createRng(909);
  return Array.from({ length: 110 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.8 + rng() * 2, phase: rng() * Math.PI * 2, a: 0.12 + rng() * 0.25 }));
})();

/** Specks drifting in the water: each sways once a loop and drifts one lap down. */
export function drawSpecks(ctx: CanvasRenderingContext2D, t: number): void {
  const loop = t / LOOP_S;
  ctx.save();
  ctx.fillStyle = '#eaf6ff';
  for (const s of SPECKS) {
    const x = s.x + 14 * Math.sin(2 * Math.PI * loop + s.phase);
    const y = (((s.y + VIDEO.height * loop) % VIDEO.height) + VIDEO.height) % VIDEO.height;
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The mood's tint over everything, and the vignette round the head. */
export function drawGrade(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const p = paletteAt(t);
  if (p.gradeAlpha > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = p.gradeAlpha;
    ctx.fillStyle = p.grade;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.restore();
  }
  const c = toScreen(cam, { x: 0, y: headAt(t).y - 60 });
  const cy = Math.max(500, Math.min(1100, c.y));
  const g = ctx.createRadialGradient(VIDEO.width / 2, cy, 380, VIDEO.width / 2, cy, 1250);
  g.addColorStop(0, 'rgba(1,4,8,0)');
  g.addColorStop(1, `rgba(1,4,8,${(0.85 * p.vignette).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

export function drawFlash(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}
