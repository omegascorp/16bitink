import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { VIDEO } from '../short';
import type { Sprite } from '../sprites';
import { drawDogfish, type Swim } from './dogfish';
import { ARM_W, type Body, drawArm, drawBody, drawWeb, FAR, NEAR } from './octoArt';
import { cycles } from './story';

/**
 * The Seattle Aquarium's big tank, seen through the glass from the dark
 * gallery: lit water, a rock pile with the octopus's den, plumose anemones,
 * sand, dogfish cruising, the glass and its frame, the aquarium's sign, and
 * visitors' silhouettes in front. Drawn in world px (the tank fills the
 * frame at zoom 1) through a camera.
 */

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** The screen point the camera centres on. */
export const FOCUS = { x: 540, y: 800 } as const;
export const toScreen = (v: Camera, p: Pt): Pt => ({ x: (p.x - v.x) * v.zoom + FOCUS.x, y: (p.y - v.y) * v.zoom + FOCUS.y });

/** The water inside the glass, world px. */
export const TANK = { x0: 70, x1: 1010, y0: 380, y1: 1330 } as const;
const FLOOR = 1262;

interface Rock {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly seed: number;
  readonly tone: string;
}

/** The rock pile (the octopus's den on the left) and a few boulders on the right; back to front. */
const ROCKS: readonly Rock[] = [
  { x: 300, y: 1150, rx: 150, ry: 95, seed: 11, tone: '#4f5552' },
  { x: 140, y: 1200, rx: 110, ry: 120, seed: 12, tone: '#565a55' },
  { x: 880, y: 1220, rx: 150, ry: 90, seed: 13, tone: '#4f5552' },
  { x: 430, y: 1250, rx: 120, ry: 70, seed: 14, tone: '#5d605a' },
  { x: 250, y: 1270, rx: 140, ry: 70, seed: 15, tone: '#62645d' },
  { x: 720, y: 1290, rx: 90, ry: 45, seed: 16, tone: '#5d605a' },
  { x: 980, y: 1285, rx: 110, ry: 60, seed: 17, tone: '#62645d' },
];

function rockShape(r: Rock): Pt[] {
  const rng = createRng(r.seed);
  const bumps = Array.from({ length: 5 }, () => ({ k: 2 + Math.floor(rng() * 5), a: 0.04 + rng() * 0.06, p: rng() * 6 }));
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    let k = 1;
    for (const b of bumps) k += b.a * Math.sin(a * b.k + b.p);
    // Flatter underneath, where it sits on the sand.
    const y = Math.sin(a) > 0 ? Math.sin(a) * 0.55 : Math.sin(a);
    return { x: r.x + Math.cos(a) * r.rx * k, y: r.y + y * r.ry * k };
  });
}

function drawRock(ctx: CanvasRenderingContext2D, r: Rock, boil: number): void {
  const pen = new Pen(ctx, r.seed * 31 + (boil % BOIL_FRAMES) * 977, 1.1);
  const shape = rockShape(r);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, r.tone, 0.9);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(r.x - r.rx, r.y - r.ry, r.x + r.rx * 0.6, r.y + r.ry);
    g.addColorStop(0, 'rgba(170,200,190,0.35)');
    g.addColorStop(0.5, 'rgba(120,140,130,0)');
    g.addColorStop(1, 'rgba(8,16,18,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(r.x - r.rx * 1.3, r.y - r.ry * 1.3, r.rx * 2.6, r.ry * 2.6);
    pen.clipped(ellipse(r.x + r.rx * 0.6, r.y + r.ry * 0.5, r.rx * 0.9, r.ry * 0.9, 20), () => pen.hatch(shape, 6, 0.9, 0.7, { alpha: 0.4 }));
    pen.stipple(shape, 160, () => 0.5, 1.4, '#1d2422');
    // Pale encrusting life: spots of coralline pink and sponge.
    const rng = createRng(r.seed + 5);
    for (let i = 0; i < 6; i++) {
      const x = r.x + (rng() - 0.5) * r.rx * 1.4;
      const y = r.y - r.ry * (0.2 + rng() * 0.7);
      pen.fill(ellipse(x, y, 6 + rng() * 10, 4 + rng() * 5, 10), i % 2 ? '#c98b8b' : '#d8c890', 0.45);
    }
  });
  pen.stroke([...shape, shape[0]!], 2.2, INK);
}

/** A white plumose anemone: a column with a fluffy crown of tentacles. */
function drawAnemone(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, t: number, seed: number, boil: number): void {
  const pen = new Pen(ctx, seed + (boil % BOIL_FRAMES) * 977, 0.8);
  const sway = 6 * Math.sin(cycles(3, t) + seed);
  const col = [{ x: x - h * 0.14, y }, { x: x - h * 0.11 + sway * 0.5, y: y - h * 0.75 }, { x: x + h * 0.11 + sway * 0.5, y: y - h * 0.75 }, { x: x + h * 0.14, y }];
  pen.fill(col, PAPER_FILL, 1);
  pen.fill(col, '#d9d2c2', 0.6);
  pen.hair([{ x: x - h * 0.03, y: y - 4 }, { x: x - h * 0.02 + sway * 0.4, y: y - h * 0.7 }], 0.7, INK, 0.4);
  pen.stroke([...col], 1.4, INK, 1, false);
  const crown = { x: x + sway, y: y - h * 0.92 };
  const blob = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const lobe = 1 + 0.12 * Math.sin(a * 7 + seed) + 0.06 * Math.sin(a * 13);
    return { x: crown.x + Math.cos(a) * h * 0.48 * lobe, y: crown.y + Math.sin(a) * h * 0.3 * lobe - (Math.sin(a) < 0 ? h * 0.06 : 0) };
  });
  pen.fill(blob, '#f2ede2', 0.95);
  const rng = createRng(seed);
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2;
    const k = Math.sqrt(rng());
    const px = crown.x + Math.cos(a) * h * 0.42 * k;
    const py = crown.y + Math.sin(a) * h * 0.26 * k;
    pen.hair([...ellipse(px, py, 3.2, 2.6, 8), { x: px + 3.2, y: py }], 0.5, '#7d7468', 0.6);
  }
  pen.stroke([...blob, blob[0]!], 1.3, INK, 0.9);
}

const WALL_ROCKS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 9 }, (_, i) => ({ x: TANK.x0 + (i / 8) * (TANK.x1 - TANK.x0) + (rng() - 0.5) * 60, h: 220 + rng() * 260, w: 120 + rng() * 120 }));
})();

/** The water, light, the back wall's dim rocks, the sand. */
function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, TANK.y0, 0, TANK.y1);
  g.addColorStop(0, '#5f9ea0');
  g.addColorStop(0.18, '#3a7f86');
  g.addColorStop(0.7, '#1b5560');
  g.addColorStop(1, '#123f48');
  ctx.fillStyle = g;
  ctx.fillRect(TANK.x0, TANK.y0, TANK.x1 - TANK.x0, TANK.y1 - TANK.y0);
  // Dim rocks on the back wall, lost in the blue.
  ctx.fillStyle = 'rgba(14,52,60,0.55)';
  for (const r of WALL_ROCKS) {
    ctx.beginPath();
    ctx.ellipse(r.x, FLOOR - r.h * 0.3, r.w, r.h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shafts of light from the lamps over the tank.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rays = ctx.createLinearGradient(0, TANK.y0, 0, TANK.y0 + 900);
  rays.addColorStop(0, 'rgba(210,240,230,0.16)');
  rays.addColorStop(1, 'rgba(210,240,230,0)');
  ctx.fillStyle = rays;
  [120, 400, 690, 900].forEach((x, i) => {
    const sway = 20 * Math.sin(cycles(1, t) + i);
    ctx.beginPath();
    ctx.moveTo(x + sway, TANK.y0);
    ctx.lineTo(x + 110 + sway, TANK.y0);
    ctx.lineTo(x + 260, TANK.y0 + 900);
    ctx.lineTo(x + 40, TANK.y0 + 900);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
  // The surface, seen from below: a bright rippling band at the top.
  ctx.save();
  ctx.strokeStyle = 'rgba(225,245,238,0.5)';
  ctx.lineWidth = 3;
  for (let row = 0; row < 3; row++) {
    ctx.beginPath();
    for (let x = TANK.x0; x <= TANK.x1; x += 16) {
      const y = TANK.y0 + 16 + row * 14 + 5 * Math.sin(x / 40 + cycles(6, t) + row * 2);
      if (x === TANK.x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.7 - row * 0.2;
    ctx.stroke();
  }
  ctx.restore();
  // Sand.
  const sand = ctx.createLinearGradient(0, FLOOR - 20, 0, TANK.y1);
  sand.addColorStop(0, 'rgba(150,160,130,0.0)');
  sand.addColorStop(0.3, 'rgba(150,160,130,0.55)');
  sand.addColorStop(1, 'rgba(110,120,96,0.8)');
  ctx.fillStyle = sand;
  ctx.fillRect(TANK.x0, FLOOR - 20, TANK.x1 - TANK.x0, TANK.y1 - FLOOR + 20);
}

export interface TankState {
  readonly cam: Camera;
  readonly body: Body;
  readonly arms: readonly Pt[][];
  /** Web depth between the arms (0.14 at rest; deep when it spreads to engulf). */
  readonly web: number;
  /** Cruising sharks behind the octopus, and ones in front of it. */
  readonly back: readonly Swim[];
  readonly front: readonly (Swim & { readonly alpha?: number })[];
  /** Front sharks drawn between the octopus's back and front arms (caught). */
  readonly caught: readonly (Swim & { readonly alpha?: number })[];
  readonly visitors: number;
  readonly sign: number;
}

const armSeed = (i: number, boil: number): number => 9001 + i * 113 + (boil % BOIL_FRAMES) * 977;

/** The octopus in its den: back arms, body, (a caught shark), front arms, in world px. */
function drawOcto(ctx: CanvasRenderingContext2D, dogfish: Sprite, s: TankState, boil: number): void {
  const b = boil % BOIL_FRAMES;
  const w0 = ARM_W * s.body.scale;
  const flush = s.body.flush;
  const side = (i: number): 1 | -1 => (i < 2 || i > 5 ? -1 : 1);
  for (const i of FAR) drawArm(ctx, s.arms[i]!, { w0: w0 * 0.92, seed: armSeed(i, b), side: side(i), far: true, flush });
  for (const [a, z] of [[4, 5], [5, 6], [6, 7]] as const) drawWeb(ctx, s.arms[a]!, s.arms[z]!, s.web, 300 + a + b, w0, { far: true, flush });
  drawBody(ctx, s.body, 8001 + b * 977);
  for (const c of s.caught) drawDogfish(ctx, dogfish, c, boil, { alpha: c.alpha ?? 1, jaw: 0.5, squash: 0.96 });
  for (const [a, z] of [[3, 4], [7, 0], [0, 1], [1, 2], [2, 3]] as const) drawWeb(ctx, s.arms[a]!, s.arms[z]!, s.web, 310 + a + b, w0, { flush });
  for (const i of [...NEAR].reverse()) drawArm(ctx, s.arms[i]!, { w0, seed: armSeed(i, b), side: side(i), flush });
}

/** Black silhouettes of visitors in front of the glass, rimmed with the tank's light. */
function drawVisitors(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const person = (x: number, headY: number, r: number, point: boolean): void => {
    ctx.beginPath();
    ctx.ellipse(x, headY, r * 0.86, r, 0, 0, Math.PI * 2);
    ctx.moveTo(x - r * 2.6, headY + r * 6);
    ctx.bezierCurveTo(x - r * 2.7, headY + r * 2.4, x - r * 2.2, headY + r * 1.75, x - r * 0.9, headY + r * 1.55);
    ctx.lineTo(x - r * 0.42, headY + r * 0.8);
    ctx.lineTo(x + r * 0.42, headY + r * 0.8);
    ctx.lineTo(x + r * 0.9, headY + r * 1.55);
    ctx.bezierCurveTo(x + r * 2.2, headY + r * 1.75, x + r * 2.7, headY + r * 2.4, x + r * 2.6, headY + r * 6);
    ctx.closePath();
    if (point) {
      // An arm raised, pointing into the tank.
      ctx.moveTo(x + r * 1.3, headY + r * 1.6);
      ctx.lineTo(x + r * 2.6, headY - r * 1.9);
      ctx.lineTo(x + r * 3.0, headY - r * 1.6);
      ctx.lineTo(x + r * 1.9, headY + r * 2.0);
      ctx.closePath();
    }
  };
  const people = [
    { x: 190, y: 1300, r: 64, point: false },
    { x: 610, y: 1395, r: 48, point: true },
    { x: 920, y: 1270, r: 68, point: false },
  ];
  for (const p of people) {
    ctx.fillStyle = '#03060a';
    person(p.x, p.y, p.r, p.point);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,200,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  ctx.restore();
}

/** The frame round the glass, and the gallery's dark wall. */
function drawFrame(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 61 + (boil % BOIL_FRAMES) * 977, 1.0);
  const m = 34;
  ctx.save();
  ctx.fillStyle = '#0b1218';
  ctx.beginPath();
  ctx.rect(-3000, -3000, 7000, 7000);
  ctx.rect(TANK.x1, TANK.y0, -(TANK.x1 - TANK.x0), TANK.y1 - TANK.y0);
  ctx.fill('evenodd');
  ctx.fillStyle = '#1d262c';
  ctx.beginPath();
  ctx.rect(TANK.x0 - m, TANK.y0 - m, TANK.x1 - TANK.x0 + 2 * m, TANK.y1 - TANK.y0 + 2 * m);
  ctx.rect(TANK.x1, TANK.y0, -(TANK.x1 - TANK.x0), TANK.y1 - TANK.y0);
  ctx.fill('evenodd');
  ctx.restore();
  const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }, { x: x0, y: y0 }];
  pen.stroke(box(TANK.x0, TANK.y0, TANK.x1, TANK.y1), 2.4, '#7fb5b0', 0.6);
  pen.stroke(box(TANK.x0 - m, TANK.y0 - m, TANK.x1 + m, TANK.y1 + m), 2.6, INK, 1);
}

/** Reflections on the glass: faint diagonal sheens. */
function drawGlass(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(TANK.x0, TANK.y0, TANK.x1 - TANK.x0, TANK.y1 - TANK.y0);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, w, a] of [[160, 70, 0.05], [260, 24, 0.06], [700, 120, 0.035], [860, 30, 0.05]] as const) {
    ctx.fillStyle = `rgba(220,240,240,${a})`;
    ctx.beginPath();
    ctx.moveTo(x, TANK.y0);
    ctx.lineTo(x + w, TANK.y0);
    ctx.lineTo(x + w - 420, TANK.y1);
    ctx.lineTo(x - 420, TANK.y1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The aquarium's sign over the tank (world px), and its lettering: baseline below the plate's centre, and size. */
export const SIGN = { x: 540, y: TANK.y0 - 18 } as const;
export const SIGN_TEXT = { dy: 26, size: 78 } as const;

/** The aquarium's sign over the tank. */
function drawSign(ctx: CanvasRenderingContext2D, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = new Pen(ctx, 88 + (boil % BOIL_FRAMES) * 977, 1.0);
  const w = 540;
  const h = 104;
  const c = SIGN;
  const plate = [{ x: c.x - w / 2, y: c.y - h / 2 }, { x: c.x + w / 2, y: c.y - h / 2 }, { x: c.x + w / 2, y: c.y + h / 2 }, { x: c.x - w / 2, y: c.y + h / 2 }];
  ctx.save();
  ctx.globalAlpha = alpha;
  pen.fill(plate, PAPER_FILL, 1);
  pen.fill(plate, '#e8dcc0', 0.6);
  pen.stroke([...plate, plate[0]!], 3, INK);
  pen.stroke([...plate.map((p) => ({ x: p.x + (p.x < c.x ? 10 : -10), y: p.y + (p.y < c.y ? 10 : -10) })), { x: plate[0]!.x + 10, y: plate[0]!.y + 10 }], 1.2, INK, 0.6);
  ctx.restore();
  drawTextLine(ctx, 'Seattle Aquarium', c.x, c.y + SIGN_TEXT.dy, SIGN_TEXT.size, 700, alpha, { fill: INK, halo: '#efe4cc' });
}

/** The whole tank scene through its camera. */
export function drawTank(ctx: CanvasRenderingContext2D, dogfish: Sprite, s: TankState, t: number, boil: number): void {
  ctx.fillStyle = '#0b1218';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.save();
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(s.cam.zoom, s.cam.zoom);
  ctx.translate(-s.cam.x, -s.cam.y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(TANK.x0, TANK.y0, TANK.x1 - TANK.x0, TANK.y1 - TANK.y0);
  ctx.clip();
  drawWater(ctx, t);
  for (const sh of s.back) drawDogfish(ctx, dogfish, sh, boil, { alpha: 0.85 });
  for (const r of ROCKS.slice(0, 3)) drawRock(ctx, r, boil);
  drawAnemone(ctx, 860, 1150, 110, t, 5, boil);
  drawAnemone(ctx, 950, 1175, 80, t, 9, boil);
  drawOcto(ctx, dogfish, s, boil);
  for (const r of ROCKS.slice(3)) drawRock(ctx, r, boil);
  drawAnemone(ctx, 720, 1262, 70, t, 14, boil);
  for (const sh of s.front) drawDogfish(ctx, dogfish, sh, boil, { alpha: sh.alpha ?? 1 });
  drawGlass(ctx);
  ctx.restore();
  drawFrame(ctx, boil);
  drawSign(ctx, s.sign, boil);
  drawVisitors(ctx, s.visitors);
  ctx.restore();
}
