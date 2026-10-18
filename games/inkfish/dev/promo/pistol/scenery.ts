import { halo } from '../../../src/art/glowArt';
import { makeCanvas, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import type { TextInk } from '../captions';
import { VIDEO } from '../short';
import { type Bubble, type Camera, type Flash, type Pt, SHRIMP_HOME, SHRIMP_K, SHRIMP_TILT, toScreen } from './story';

/**
 * The night reef round the shrimp: dark water with a little moonlight, drifting
 * specks, rock and rubble in ink silhouette, and the water's violence: the
 * jet, the bubble, the white-hot point, the flash and the shock.
 */

export const INK_BG = '#05091a';
export const CHALK = '#dfe4f2';
export const SPOKEN = '#f5c84a';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };
const HOT_WHITE = '#fffbea';

/** Night water: deep blue at the top where the moon is, near black below. */
export function makeWater(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#13234a');
  g.addColorStop(0.4, '#0a1534');
  g.addColorStop(0.75, '#060c22');
  g.addColorStop(1, '#03060f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // Faint moonlight slanting down from the top.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, w, a] of [[220, 120, 0.05], [470, 70, 0.04], [760, 150, 0.045], [960, 60, 0.03]] as const) {
    const ray = ctx.createLinearGradient(0, 0, 0, 1300);
    ray.addColorStop(0, `rgba(150,180,255,${a})`);
    ray.addColorStop(1, 'rgba(150,180,255,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, 0);
    ctx.lineTo(x + w / 2, 0);
    ctx.lineTo(x + w / 2 - 260, 1300);
    ctx.lineTo(x - w / 2 - 330, 1300);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  return canvas;
}

const SPECKS = (() => {
  const rng = createRng(808);
  return Array.from({ length: 130 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.8 + rng() * 1.8, phase: rng() * Math.PI * 2, a: 0.1 + rng() * 0.22 }));
})();

/** Plankton drifting, `loop` 0 .. 1 over the loop (each speck sways once a loop and drifts one lap up). */
export function drawSpecks(ctx: CanvasRenderingContext2D, loop: number): void {
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
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

// ---------------------------------------------------------------- the reef

interface Ridge {
  readonly pts: readonly Pt[];
  readonly fill: string;
  readonly rim: number;
}

/** A line of rounded rocks across the world from x0 to x1, standing on height y (world px), from a seed. */
function rubble(x0: number, x1: number, y: number, lump: number, seed: number): Pt[] {
  const rng = createRng(seed);
  const out: Pt[] = [];
  for (let x = x0; x < x1; ) {
    const w = 90 + rng() * 170;
    const h = lump * (0.35 + rng() * 0.65);
    const base = y + (rng() - 0.5) * lump * 0.3;
    for (let i = 0; i < 8; i++) out.push({ x: x + (w * i) / 8, y: base - h * Math.sin((Math.PI * i) / 8) ** 0.7 });
    x += w;
  }
  return out;
}

const RIDGES: readonly Ridge[] = [
  { pts: rubble(-2600, 3800, 1020, 60, 13), fill: '#0e1a3c', rim: 0.1 },
  { pts: rubble(-2600, 3800, 1110, 70, 31), fill: '#0b1531', rim: 0.16 },
  { pts: rubble(-2600, 3800, 1250, 60, 57), fill: '#070d22', rim: 0.3 },
];

/** The boulder the shrimp perches on: its top face slopes with the shrimp, under its feet, and drops away in front of the claw. */
const BOULDER: readonly Pt[] = (() => {
  const ahead = { x: Math.cos(SHRIMP_TILT), y: -Math.sin(SHRIMP_TILT) };
  const belly = { x: Math.sin(SHRIMP_TILT), y: Math.cos(SHRIMP_TILT) };
  const k = SHRIMP_K;
  const face = Array.from({ length: 12 }, (_, i) => {
    const x = -112 + (i / 11) * 190;
    const y = 33 + 3 * Math.sin(i * 1.9);
    return { x: SHRIMP_HOME.x + (x * ahead.x + y * belly.x) * k, y: SHRIMP_HOME.y + (x * ahead.y + y * belly.y) * k };
  });
  const front = face[face.length - 1]!;
  const back = face[0]!;
  return [
    { x: back.x - 160, y: 1300 },
    { x: back.x - 70, y: back.y + 50 },
    ...face,
    { x: front.x + 50, y: front.y + 40 },
    { x: front.x + 80, y: front.y + 160 },
    { x: front.x + 40, y: 1300 },
  ];
})();
/** Rock and rubble in ink silhouette, the near ridge under the shrimp, a chalk rim catching the moon. */
export function drawReef(ctx: CanvasRenderingContext2D, cam: Camera, layer: 0 | 1 | 2): void {
  const r = RIDGES[layer]!;
  drawRock(ctx, cam, r.pts, r.fill, r.rim, true);
  if (layer === 2) drawRock(ctx, cam, BOULDER, r.fill, r.rim * 1.3, false);
}

/** One rock outline: filled to the bottom of the screen (a ridge) or closed (a boulder), rimmed in chalk along the top. */
function drawRock(ctx: CanvasRenderingContext2D, cam: Camera, world: readonly Pt[], fill: string, rim: number, ridge: boolean): void {
  const r = { fill, rim };
  const pts = world.map((p) => toScreen(cam, p));
  const bottom = VIDEO.height + 40;
  ctx.save();
  ctx.fillStyle = r.fill;
  ctx.beginPath();
  if (ridge) ctx.moveTo(pts[0]!.x, bottom);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  if (ridge) ctx.lineTo(pts[pts.length - 1]!.x, bottom);
  ctx.closePath();
  ctx.fill();
  const top = ridge ? pts : pts.slice(1, -1);
  ctx.strokeStyle = CHALK;
  ctx.globalAlpha = r.rim;
  ctx.lineWidth = Math.max(1.5, 3.5 * cam.zoom);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  top.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 780, 420, VIDEO.width / 2, 820, 1250);
  g.addColorStop(0, 'rgba(1,2,6,0)');
  g.addColorStop(1, 'rgba(1,2,6,0.65)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

// ---------------------------------------------------------------- the snap

/** The jet: chalk streaks shooting straight out of the claw, `u` 0 .. 1 over its life, `reach` screen px. */
export function drawJet(ctx: CanvasRenderingContext2D, from: Pt, dir: Pt, u: number, reach: number, zoom: number): void {
  const head = reach * (1 - (1 - u) ** 3);
  const tail = reach * Math.max(0, (u - 0.25) / 0.75) ** 1.5;
  if (head - tail < 2) return;
  const side = { x: -dir.y, y: dir.x };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = CHALK;
  for (let k = -2; k <= 2; k++) {
    const off = k * 9 * zoom;
    const shrink = 1 - Math.abs(k) * 0.18;
    ctx.globalAlpha = (1 - u) * (k === 0 ? 0.95 : 0.55);
    ctx.lineWidth = Math.max(1.5, (k === 0 ? 7 : 3.5) * zoom);
    ctx.beginPath();
    ctx.moveTo(from.x + dir.x * tail + side.x * off, from.y + dir.y * tail + side.y * off);
    ctx.lineTo(from.x + dir.x * head * shrink + side.x * off * 1.6, from.y + dir.y * head * shrink + side.y * off * 1.6);
    ctx.stroke();
  }
  ctx.restore();
}

/** The cavitation bubble: a glassy chalk ring with a highlight, squashing as it collapses. */
export function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble, at: Pt, zoom: number, clock: number): void {
  const r = b.r * zoom;
  if (r < 1) return;
  const wob = 1 + 0.05 * Math.sin(clock * 31) * (1 - b.collapse);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(wob * (1 + 0.25 * b.collapse * Math.sin(clock * 70)), (1 / wob) * (1 - 0.3 * b.collapse));
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, 'rgba(220,235,255,0.35)');
  g.addColorStop(0.7, 'rgba(160,190,255,0.12)');
  g.addColorStop(1, 'rgba(220,235,255,0.5)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.globalAlpha = 0.95;
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath();
  ctx.arc(-r * 0.15, -r * 0.15, r * 0.6, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
  // Heating up as it squeezes: a glow inside.
  if (b.collapse > 0.3) halo(ctx, at.x, at.y, r * 2.5 + 20 * zoom, '#ffe9a8', (b.collapse - 0.3) * 0.9);
}

/** The white-hot point the fired bubble leaves, pulsing, heat shimmering off it. `heat` 0 .. 1, `grow` how hot so far 0 .. 1. */
export function drawHeat(ctx: CanvasRenderingContext2D, at: Pt, heat: number, grow: number, zoom: number, clock: number): void {
  if (heat <= 0) return;
  const pulse = 1 + 0.12 * Math.sin(clock * 24) + 0.06 * Math.sin(clock * 57);
  const r = (14 + 22 * grow) * zoom * pulse;
  halo(ctx, at.x, at.y, r * 9, '#ff8a3c', 0.55 * heat);
  halo(ctx, at.x, at.y, r * 4.5, '#ffd66e', 0.8 * heat);
  halo(ctx, at.x, at.y, r * 1.8, HOT_WHITE, heat);
  ctx.save();
  ctx.globalAlpha = heat;
  ctx.fillStyle = HOT_WHITE;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  // Heat shimmer: wavy chalk lines rising off it.
  ctx.strokeStyle = '#ffe6b0';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, 4 * zoom);
  for (let k = -1; k <= 1; k++) {
    const rise = ((clock * 0.9 + k * 0.33) % 1 + 1) % 1;
    ctx.globalAlpha = heat * 0.7 * Math.sin(Math.PI * rise) * (0.4 + 0.6 * grow);
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const y = at.y - r * 1.6 - rise * 120 * zoom - i * 9 * zoom;
      const x = at.x + k * 34 * zoom + Math.sin(i * 0.9 + clock * 9 + k) * 7 * zoom;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

const RAYS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 16 }, (_, k) => ({ a: (k / 16) * Math.PI * 2 + (rng() - 0.5) * 0.25, len: 0.65 + rng() * 0.5, w: 0.6 + rng() * 0.6 }));
})();

/** A bubble's flash from its peak: a white-hot core, a hot glow, comic burst rays. */
export function drawFlash(ctx: CanvasRenderingContext2D, f: Flash, at: Pt, zoom: number): void {
  const size = (f.big ? 420 : 250) * zoom;
  // Bright for the first part, then cooling fast.
  const life = f.u < 0.25 ? 1 : (1 - (f.u - 0.25) / 0.75) ** 2.2;
  const grow = 1 - (1 - Math.min(1, f.u / 0.5)) ** 3;
  // Cooling: the white goes first, then the yellow, leaving an orange glow.
  halo(ctx, at.x, at.y, size * (1.5 + 0.5 * grow), '#ff9a3c', 0.6 * Math.sqrt(life));
  halo(ctx, at.x, at.y, size * (0.8 + 0.3 * grow) * (0.5 + 0.5 * life), '#ffe08a', 0.9 * life);
  halo(ctx, at.x, at.y, size * 0.45 * (0.4 + 0.6 * life), HOT_WHITE, life * life);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.fillStyle = HOT_WHITE;
  ctx.globalAlpha = Math.min(1, life * 1.2);
  for (const ray of RAYS) {
    const r0 = size * (0.12 + 0.2 * grow);
    const r1 = size * (0.35 + 0.55 * grow) * ray.len;
    const w = size * 0.05 * ray.w * (1 - 0.6 * f.u);
    const c = Math.cos(ray.a);
    const s = Math.sin(ray.a);
    ctx.beginPath();
    ctx.moveTo(c * r0 - s * w, s * r0 + c * w);
    ctx.lineTo(c * r1, s * r1);
    ctx.lineTo(c * r0 + s * w, s * r0 - c * w);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = Math.min(1, life * 1.2) ** 2;
  ctx.beginPath();
  ctx.arc(0, 0, size * (0.16 + 0.06 * (1 - f.u)) * Math.min(1, 0.4 + life), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The shock of the BANG: chalk rings racing out from the burst. */
export function drawShock(ctx: CanvasRenderingContext2D, at: Pt, u: number, zoom: number): void {
  ctx.save();
  ctx.strokeStyle = CHALK;
  for (const lag of [0, 0.18, 0.36]) {
    const v = (u - lag) / (1 - lag);
    if (v <= 0 || v >= 1) continue;
    ctx.globalAlpha = 0.7 * (1 - v);
    ctx.lineWidth = Math.max(2, 10 * zoom * (1 - v));
    ctx.beginPath();
    ctx.arc(at.x, at.y, (60 + 900 * (1 - (1 - v) ** 2)) * zoom, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The flash lighting up the whole picture. */
export function drawWhite(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.fillStyle = HOT_WHITE;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}
