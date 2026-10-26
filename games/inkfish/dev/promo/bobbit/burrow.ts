import { INK, makeCanvas, PAPER, Pen } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { drawTextLine } from '../captions';
import { lerp, VIDEO } from '../short';
import { drawVignette, wash } from './mood';
import { drawBeam, drawSpecks, drawWater, type Wash } from './night';
import { TEXT } from './script';
import { barAt, barLabelAt, cycles, diverAt, type Pt, revealAt, type Worm } from './story';
import { drawBody, drawHead } from './worm';

/**
 * Under the sand, cut away like a diagram in an old natural history: the
 * night water above, the seabed's layers below, and the burrow running down
 * through them with the whole worm in it, its jaws and antennae just out at
 * the top. The camera rushes back from the hole to show all of it; then a
 * bar grows beside it, "10 ft / 3 m", with a diver's outline for scale.
 */

/** The sand's surface, and the burrow from its mouth to the bottom (screen px, camera at rest). */
export const SURFACE_Y = 390;
export const BAR = { x: 820, top: SURFACE_Y, bottom: SURFACE_Y + 720 } as const;
const SIZE = 0.36;
const TUBE_W = 98;

/** The burrow's centre line, top to bottom: a slow S down through the layers. */
const TUBE: readonly Pt[] = Array.from({ length: 40 }, (_, i) => {
  const u = i / 39;
  return { x: 540 + 70 * Math.sin(u * Math.PI * 1.6) * u, y: SURFACE_Y + 10 + u * 700 };
});

const MURK: Wash = { top: [14, 22, 40], mid: [8, 12, 24], bottom: [4, 6, 12] };

export interface BurrowCast {
  readonly sheet: HTMLCanvasElement;
  /** The cut-away seabed, one per boil frame. */
  readonly ground: readonly HTMLCanvasElement[];
}

function makeGround(f: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  const rng = createRng(6060 + f * 31);
  const pen = new Pen(ctx, 6061 + f * 977, 1.4);
  const g = ctx.createLinearGradient(0, SURFACE_Y, 0, VIDEO.height);
  g.addColorStop(0, '#5b4c58');
  g.addColorStop(0.35, '#3e3242');
  g.addColorStop(1, '#17111b');
  ctx.fillStyle = g;
  ctx.fillRect(0, SURFACE_Y, VIDEO.width, VIDEO.height - SURFACE_Y);
  // Layers: wavy bands of lighter and darker silt.
  for (let i = 0; i < 9; i++) {
    const y = SURFACE_Y + 50 + i * 120 + rng() * 30;
    const top = Array.from({ length: 28 }, (_, j) => ({ x: -20 + (j / 27) * (VIDEO.width + 40), y: y + 14 * Math.sin(j * 0.55 + i * 2.1) }));
    const band = [...top, ...[...top].reverse().map((p) => ({ x: p.x, y: p.y + 34 + 10 * Math.sin(p.x / 90 + i) }))];
    pen.fill(band, i % 2 ? '#2a2030' : '#6d5d63', 0.35);
    pen.hair(top, 1.6, INK, 0.5);
  }
  // Grains, pebbles and bits of shell.
  for (let i = 0; i < 2200; i++) {
    const x = rng() * VIDEO.width;
    const y = SURFACE_Y + rng() * (VIDEO.height - SURFACE_Y);
    ctx.globalAlpha = 0.2 + rng() * 0.35;
    ctx.fillStyle = rng() < 0.7 ? INK : '#c8b8b0';
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rng() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 30; i++) {
    const x = rng() * VIDEO.width;
    const y = SURFACE_Y + 30 + rng() * (VIDEO.height - SURFACE_Y - 30);
    const r = 6 + rng() * 16;
    const pts = Array.from({ length: 12 }, (_, j) => ({ x: x + Math.cos(j * 0.524) * r * (1 + 0.15 * Math.sin(j * 1.7 + i)), y: y + Math.sin(j * 0.524) * r * 0.65 }));
    pen.fill(pts, rng() < 0.3 ? '#d8cbbd' : '#4a3f48', 0.75);
    pen.closed(pts, 1.6);
  }
  // The burrow: a dark tube with a faint glow along it.
  const tube = new Pen(ctx, 6070 + f * 977, 1.5);
  const edge = (k: number): Pt[] => TUBE.map((p, i) => {
    const q = TUBE[Math.min(TUBE.length - 1, i + 1)]!;
    const r = TUBE[Math.max(0, i - 1)]!;
    const l = Math.hypot(q.x - r.x, q.y - r.y) || 1;
    return { x: p.x + (k * TUBE_W * (q.y - r.y)) / l / 2, y: p.y - (k * TUBE_W * (q.x - r.x)) / l / 2 };
  });
  const outline = [...edge(1), ...edge(-1).reverse()];
  tube.fill(outline, '#0b0810', 0.95);
  tube.stroke(edge(1), 3);
  tube.stroke(edge(-1), 3);
  // The rounded bottom of the burrow.
  const end = TUBE[TUBE.length - 1]!;
  ctx.fillStyle = '#0b0810';
  ctx.beginPath();
  ctx.arc(end.x, end.y, TUBE_W / 2, 0, Math.PI);
  ctx.fill();
  tube.stroke(Array.from({ length: 11 }, (_, i) => ({ x: end.x + Math.cos((i / 10) * Math.PI) * TUBE_W / 2, y: end.y + Math.sin((i / 10) * Math.PI) * TUBE_W / 2 })), 3);
  // The sand's surface line, a little mound round the mouth.
  const surface = Array.from({ length: 30 }, (_, i) => {
    const x = -20 + (i / 29) * (VIDEO.width + 40);
    return { x, y: SURFACE_Y - 22 * Math.exp(-(((x - 540) / 120) ** 2)) + 4 * Math.sin(i * 1.3) };
  });
  pen.fill([...surface, { x: VIDEO.width + 20, y: SURFACE_Y + 30 }, { x: -20, y: SURFACE_Y + 30 }], '#6a5a64', 1);
  pen.stroke(surface, 3.4);
  return canvas;
}

export function makeBurrow(): BurrowCast {
  return { sheet: makePaper(), ground: Array.from({ length: BOIL_FRAMES }, (_, f) => makeGround(f)) };
}

/** The worm in its burrow: its body along the tube, wriggling a little, its head just out of the sand. */
function wormLine(t: number): { line: Pt[]; worm: Worm } {
  const line = TUBE.map((p, i) => {
    const u = i / (TUBE.length - 1);
    return { x: p.x + 9 * Math.sin(u * 9 - cycles(5, t)), y: p.y };
  }).reverse();
  const top = line[line.length - 1]!;
  const head = { x: top.x + 4 * Math.sin(cycles(3, t)), y: SURFACE_Y - 24 };
  return { line: [...line, head], worm: { head, axis: 0.04 * Math.sin(cycles(2, t)), jaw: 0.22 + 0.06 * Math.sin(cycles(4, t)), twitch: 0.3 } };
}

/** A diver's outline, standing, feet on `foot`, `h` tall: mask, tank, fins. */
function drawDiver(ctx: CanvasRenderingContext2D, x: number, foot: number, h: number, alpha: number, boil: number): void {
  if (alpha <= 0.01) return;
  const s = h / 6;
  const pts: Pt[] = [
    { x: 0, y: -6 }, { x: 0.22, y: -5.95 }, { x: 0.38, y: -5.75 }, { x: 0.42, y: -5.45 }, { x: 0.33, y: -5.15 }, { x: 0.55, y: -4.85 }, { x: 0.72, y: -4.3 },
    { x: 0.78, y: -3.2 }, { x: 0.66, y: -2.9 }, { x: 0.56, y: -3.6 }, { x: 0.5, y: -2.6 }, { x: 0.42, y: -1.5 }, { x: 0.4, y: -0.3 }, { x: 0.9, y: -0.05 },
    { x: 0.95, y: 0 }, { x: 0.08, y: 0 }, { x: 0.08, y: -1.4 }, { x: -0.08, y: -1.4 }, { x: -0.08, y: 0 }, { x: -0.6, y: 0 }, { x: -0.5, y: -0.3 },
    { x: -0.42, y: -1.5 }, { x: -0.5, y: -2.6 }, { x: -0.75, y: -3.0 }, { x: -0.8, y: -4.4 }, { x: -0.55, y: -4.85 }, { x: -0.36, y: -5.2 }, { x: -0.42, y: -5.6 },
    { x: -0.24, y: -5.95 },
  ].map((p) => ({ x: x + p.x * s, y: foot + p.y * s }));
  const pen = new Pen(ctx, 6200 + boil * 1013, 1.2);
  ctx.save();
  ctx.globalAlpha = alpha;
  pen.fill(pts, PAPER, 0.16);
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = 'rgba(244,237,220,0.75)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  // The tank on the back and the mask's glass.
  ctx.setLineDash([]);
  ctx.strokeRect(x - 0.95 * s, foot - 4.6 * s, 0.32 * s, 1.5 * s);
  ctx.beginPath();
  ctx.ellipse(x + 0.3 * s, foot - 5.5 * s, 0.14 * s, 0.2 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The "10 ft" bar: grows down beside the worm, end ticks, the labels beside it. */
function drawBar(ctx: CanvasRenderingContext2D, grow: number, label: number): void {
  if (grow <= 0.001) return;
  const y1 = lerp(BAR.top, BAR.bottom, grow);
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, width] of [['#050914', 16], [PAPER, 6]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(BAR.x, BAR.top);
    ctx.lineTo(BAR.x, y1);
    ctx.moveTo(BAR.x - 26, BAR.top);
    ctx.lineTo(BAR.x + 26, BAR.top);
    if (grow > 0.98) {
      ctx.moveTo(BAR.x - 26, BAR.bottom);
      ctx.lineTo(BAR.x + 26, BAR.bottom);
    }
    ctx.stroke();
  }
  ctx.restore();
  const ink = { fill: PAPER, halo: '#050914' };
  const pop = 1 + 0.25 * Math.sin(Math.PI * Math.min(1, label * 1.2)) * (1 - label);
  drawTextLine(ctx, '10 ft', TEXT.barFt.x, TEXT.barFt.y, TEXT.barFt.size * pop, 700, label, { fill: '#f5c84a', halo: '#050914' });
  drawTextLine(ctx, '3 m', TEXT.barM.x, TEXT.barM.y, TEXT.barM.size, 700, label, ink);
}

export function drawBurrow(ctx: CanvasRenderingContext2D, cast: BurrowCast, t: number, boil: number): void {
  // The camera rushes back from the burrow's mouth to the whole cut-away.
  const r = revealAt(t);
  const zoom = lerp(2.1, 1, r);
  const focus = { x: lerp(540, 540, r), y: lerp(SURFACE_Y - 40, 960, r) };
  const at = { x: 540, y: lerp(760, 960, r) };
  drawWater(ctx, cast.sheet, MURK);
  drawBeam(ctx, t, 0.5);
  drawSpecks(ctx, t, 0.6);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-focus.x, -focus.y);
  ctx.drawImage(cast.ground[boil]!, 0, 0);
  const { line, worm } = wormLine(t);
  // A sickly glow down the burrow.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createLinearGradient(0, SURFACE_Y, 0, BAR.bottom);
  glow.addColorStop(0, 'rgba(90,160,110,0.25)');
  glow.addColorStop(1, 'rgba(90,60,140,0.05)');
  ctx.fillStyle = glow;
  ctx.fillRect(400, SURFACE_Y, 300, 760);
  ctx.restore();
  drawBody(ctx, line, SIZE, t, boil, 3);
  drawHead(ctx, worm, SIZE, t, boil, 'all', 3);
  ctx.restore();
  // Creepy: a sour purple-green cast.
  wash(ctx, 'soft-light', 'rgb(120,190,120)', 0.25);
  wash(ctx, 'multiply', 'rgb(205,180,225)', 0.35);
  drawVignette(ctx, 0.6);
  drawDiver(ctx, 230, BAR.bottom, 0.6 * (BAR.bottom - BAR.top), diverAt(t), boil);
  drawBar(ctx, barAt(t), barLabelAt(t));
}
