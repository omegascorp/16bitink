import { INK, makeCanvas, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawHumpbackBack, drawHumpbackFront, HUMPBACK_HINGE, humpbackMouth, humpbackPin, type HumpbackPose } from '../foodchain/art/humpback';
import { drawTextLine } from '../captions';
import { drawAmbient, drawBubble, drawRays, makeWater, RED } from '../seal/scene';
import { VIDEO } from '../short';
import { drawSeaLion } from './animals';
import { TEXT } from './script';
import type { Placed } from './story';
import { fistAt, fistTagAt, guideAt, hookAt, lensAt, LOOP_S, mouthGape, mouthSweat, placeAt, riseAt, SCHOOL_WHALES, slipAt, throatTagAt, yearAt } from './story';

/** The five scenes, each drawn on its own transparent layer. */

const PAPER_ON_BLUE = { fill: PAPER, halo: '#10335f' };
const RED_ON_PAPER = { fill: RED, halo: PAPER };
const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + boil * 977, 1.2);

// ---------------------------------------------------------------- sky and sea

/** The wavy waterline across the picture, a whole number of cycles a loop so it matches at the loop point. */
export const waveY = (x: number, horizon: number, t: number): number =>
  horizon + 7 * Math.sin(x / 80 - (2 * Math.PI * 3 * t) / LOOP_S) + 4 * Math.sin(x / 33 + (2 * Math.PI * 2 * t) / LOOP_S);

/** Sky down to the horizon, then open sea; the part of the sea in front of the animals is laid by `drawSeaFront`. */
function drawSkyAndSea(ctx: CanvasRenderingContext2D, horizon: number, t: number, boil: number, sky: readonly [string, string]): void {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, sky[0]);
  g.addColorStop(1, sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, horizon + 20);
  // Soft clouds.
  const rng = createRng(31);
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const cx = rng() * VIDEO.width;
    const cy = 120 + rng() * (horizon - 360);
    const w = 160 + rng() * 220;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.32);
    const cg = ctx.createRadialGradient(0, 0, 10, 0, 0, w);
    cg.addColorStop(0, 'rgba(255,252,240,0.55)');
    cg.addColorStop(1, 'rgba(255,252,240,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(-w, -w, w * 2, w * 2);
    ctx.restore();
  }
  ctx.restore();
  const sea = ctx.createLinearGradient(0, horizon, 0, VIDEO.height);
  sea.addColorStop(0, '#3a98c6');
  sea.addColorStop(0.4, '#1f6aa2');
  sea.addColorStop(1, '#0b3262');
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 12) ctx.lineTo(x, waveY(x, horizon, t));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  ctx.fillStyle = sea;
  ctx.fill();
  const pen = penFor(ctx, 5, boil);
  const line: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 24) line.push({ x, y: waveY(x, horizon, t) });
  pen.stroke(line, 3.2, INK, 0.8);
}

/** The sea in front of the whale: a translucent sheet over what is under the waterline, and a ring of foam. */
function drawSeaFront(ctx: CanvasRenderingContext2D, horizon: number, t: number, boil: number, foam: { readonly x: number; readonly w: number }): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 12) ctx.lineTo(x, waveY(x, horizon, t) + 6);
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, horizon, 0, VIDEO.height);
  g.addColorStop(0, 'rgba(52,150,200,0.5)');
  g.addColorStop(1, 'rgba(10,50,100,0.86)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  const pen = penFor(ctx, 9, boil);
  const line: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 24) line.push({ x, y: waveY(x, horizon, t) + 6 });
  pen.stroke(line, 4, INK, 0.9);
  // Foam piled round where the whale breaks the surface.
  const rng = createRng(77);
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const u = rng();
    const x = foam.x + (u - 0.5) * foam.w * 1.25 + 10 * Math.sin(t * 3 + i);
    const y = waveY(x, horizon, t) - 6 + (rng() - 0.3) * 46;
    const r = 10 + rng() * 22;
    ctx.fillStyle = 'rgba(248,252,255,0.92)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,90,130,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

/** Drops thrown up round the whale, each rising and falling a whole number of times a loop. */
function drawSpray(ctx: CanvasRenderingContext2D, centre: Pt, spread: number, loop: number, count = 26): void {
  const rng = createRng(1313);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const ph = (rng() + loop * (2 + Math.floor(rng() * 2))) % 1;
    const dx = side * (spread * (0.35 + rng() * 0.65)) * Math.min(1, ph * 1.6);
    const up = 360 * (0.4 + rng() * 0.8);
    const y = centre.y - up * (1 - (2 * ph - 1) ** 2);
    drawBubble(ctx, centre.x + dx, y, 5 + rng() * 9, 0.9);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- frame 1

/** The humpback's placement for the hook: rising head-up, the head filling the upper frame. */
const HOOK_WHALE = { len: 4500, angle: -1.97, hinge: { x: 540, y: 1330 } } as const;
export const HOOK_HORIZON = 1760;

/** Frame 1: a humpback bursting up out of the sea, mouth gaping, throat ballooned, a wide-eyed sea lion in its mouth. */
export function drawHook(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const h = hookAt(t);
  drawSkyAndSea(ctx, HOOK_HORIZON, t, boil, ['#8ccbec', '#f7ead0']);
  const pose: HumpbackPose = { gape: h.gape - 0.08, throat: h.throat, tail: h.tail, fin: -1.35 };
  const { len, angle } = HOOK_WHALE;
  const pin = humpbackPin(HUMPBACK_HINGE, { x: HOOK_WHALE.hinge.x, y: HOOK_WHALE.hinge.y + h.bob }, len, angle);
  const { x } = pin;
  const wy = pin.y;
  drawHumpbackBack(ctx, x, wy, len, angle, t, pose);
  const m = humpbackMouth(x, wy, len, angle, pose);
  const lion: Placed = { x: m.x + 30, y: m.y - 30, len: 760, rot: -0.8 + h.wobble, face: 1, beat: t * 3 };
  drawSeaLion(ctx, lion, { mood: 'nervous', gape: 0, sweat: 1 }, boil);
  drawHumpbackFront(ctx, x, wy, len, angle, t, pose);
  drawSeaFront(ctx, HOOK_HORIZON, t, boil, { x: 600, w: 700 });
  drawSpray(ctx, { x: 560, y: HOOK_HORIZON }, 520, h.foam);
}

// ---------------------------------------------------------------- Monterey Bay

function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, flick: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const h = len * 0.17;
  ctx.beginPath();
  ctx.moveTo(len * 0.5, 0);
  ctx.quadraticCurveTo(len * 0.1, -h * 1.5, -len * 0.32, -h * 0.3);
  ctx.lineTo(-len * 0.52, -h * (0.9 + flick * 0.4));
  ctx.lineTo(-len * 0.5, h * (0.9 - flick * 0.4));
  ctx.lineTo(-len * 0.32, h * 0.3);
  ctx.quadraticCurveTo(len * 0.1, h * 1.3, len * 0.5, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -h * 1.5, 0, h * 1.3);
  g.addColorStop(0, '#5d7388');
  g.addColorStop(0.45, '#c3d2de');
  g.addColorStop(1, '#f4f8fb');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(len * 0.32, -h * 0.1, Math.max(1.4, len * 0.04), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const FISH = (() => {
  const rng = createRng(2019);
  return Array.from({ length: 190 }, () => ({
    a: rng() * Math.PI * 2,
    r: Math.sqrt(rng()),
    spin: (rng() < 0.5 ? 1 : -1) * (0.5 + rng() * 0.7),
    len: 40 + rng() * 22,
    wob: rng() * 6.28,
  }));
})();

let water: HTMLCanvasElement | null = null;

/** Wider, bright: humpbacks lunging up through a silver ball of anchovies, sea lions darting round. */
export function drawSchool(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const u = t - 3;
  water ??= makeWater();
  ctx.drawImage(water, 0, 0);
  drawRays(ctx, (t / LOOP_S) * 2);
  drawAmbient(ctx, t / LOOP_S);
  // The far whale first, small; then the ball and the darting sea lions; then the near ones.
  const whales = [
    { x: 395, y0: 2050, y1: 1560, len: 1500, angle: -1.35, gape: 0.8 },
    { x: -30, y0: 2800, y1: 2120, len: 2500, angle: -1.28, gape: 0.9 },
    { x: 530, y0: 2550, y1: 1960, len: 2000, angle: -1.3, gape: 1 },
  ];
  const ball = { x: 560, y: 640 };
  const drawWhale = (i: number): void => {
    const w = whales[i]!;
    const rise = riseAt(t, i);
    const y = w.y0 + (w.y1 - w.y0) * rise;
    const pose: HumpbackPose = { gape: w.gape * (0.35 + 0.65 * rise), throat: 0.9 * rise, tail: u * 4 + i };
    drawHumpbackBack(ctx, w.x, y, w.len, w.angle, t, pose);
    drawHumpbackFront(ctx, w.x, y, w.len, w.angle, t, pose);
  };
  drawWhale(0);
  for (const f of FISH) {
    const a = f.a + f.spin * u * 0.9;
    const x = ball.x + Math.cos(a) * f.r * 480;
    const y = ball.y + Math.sin(a) * f.r * 380;
    const dir = a + (f.spin > 0 ? Math.PI / 2 : -Math.PI / 2);
    drawFish(ctx, x, y, f.len, dir + 0.1 * Math.sin(u * 8 + f.wob), Math.sin(u * 14 + f.wob));
  }
  const dart = (k: number, y: number, dir: 1 | -1): void => {
    const ph = ((u * 0.55 + k * 0.37) % 1 + 1) % 1;
    const x = dir === 1 ? -200 + ph * (VIDEO.width + 400) : VIDEO.width + 200 - ph * (VIDEO.width + 400);
    const p: Placed = { x, y: y + 40 * Math.sin(u * 3 + k), len: 300, rot: 0.12 * Math.sin(u * 5 + k), face: dir, beat: u * 6 + k };
    drawSeaLion(ctx, p, { mood: 'plain', gape: 0 }, boil);
  };
  dart(0, 480, 1);
  dart(1, 780, -1);
  dart(2, 1180, 1);
  drawWhale(1);
  drawWhale(2);
  // The place and the year, written big at the top.
  drawTextLine(ctx, 'Monterey Bay', VIDEO.width / 2, TEXT.place.y, TEXT.place.size, 700, placeAt(t), PAPER_ON_BLUE);
  drawTextLine(ctx, '2019', VIDEO.width / 2, TEXT.year.y, TEXT.year.size, 700, yearAt(t), RED_ON_PAPER);
}

// ---------------------------------------------------------------- the mouth

/** Pushed in on the open mouth with the sea lion inside, the jaws starting to close. */
export function drawMouth(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const rays = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  rays.addColorStop(0, '#2f86b8');
  rays.addColorStop(1, '#0a2f5e');
  ctx.fillStyle = rays;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const pose: HumpbackPose = { gape: mouthGape(t), throat: 0.6, fin: -1.9 };
  const len = 3600;
  const angle = -0.08;
  const m0 = humpbackMouth(0, 0, len, angle, pose);
  const x = 560 - m0.x;
  const y = 820 - m0.y;
  drawHumpbackBack(ctx, x, y, len, angle, t, pose);
  const m = humpbackMouth(x, y, len, angle, pose);
  const lion: Placed = { x: m.x, y: m.y + 10, len: 560, rot: 0.1 + 0.05 * Math.sin(t * 17), face: 1, beat: t * 5 };
  drawSeaLion(ctx, lion, { mood: 'nervous', gape: 0.1, sweat: mouthSweat(t) }, boil);
  drawHumpbackFront(ctx, x, y, len, angle, t, pose);
}

// ---------------------------------------------------------------- the throat

function ringedTube(ctx: CanvasRenderingContext2D, x0: number, x1: number, cy: number, h: number): void {
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  g.addColorStop(0, '#7a3d4c');
  g.addColorStop(0.5, '#3b1623');
  g.addColorStop(1, '#8a4a58');
  ctx.fillStyle = g;
  ctx.fillRect(x0, cy - h / 2, x1 - x0, h);
  const hl = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  hl.addColorStop(0, 'rgba(255,214,214,0.32)');
  hl.addColorStop(0.3, 'rgba(255,214,214,0)');
  hl.addColorStop(0.75, 'rgba(0,0,0,0)');
  hl.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = hl;
  ctx.fillRect(x0, cy - h / 2, x1 - x0, h);
  ctx.strokeStyle = 'rgba(255,200,200,0.3)';
  ctx.lineWidth = 3;
  for (let x = x0 + 24; x < x1; x += 34) {
    ctx.beginPath();
    ctx.ellipse(x, cy, 10, h / 2 - 6, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x0, cy - h / 2);
  ctx.lineTo(x1, cy - h / 2);
  ctx.moveTo(x0, cy + h / 2);
  ctx.lineTo(x1, cy + h / 2);
  ctx.stroke();
}

/** A painted fist, front on: four curled fingers stacked with knuckles at the left, the thumb wrapped across them, a cuff; `h` high, so exactly `h` across. */
function drawFist(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const line = (w: number, c = INK): void => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  const rr = (x: number, y: number, w: number, hh: number, r: number): void => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, hh, r);
  };
  // Soft shadow under the whole fist.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.5, h * 0.6, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // The wrist and the cuff behind.
  const wrist = ctx.createLinearGradient(0, -h * 0.3, 0, h * 0.3);
  wrist.addColorStop(0, '#e3b08a');
  wrist.addColorStop(1, '#b9795a');
  rr(h * 0.3, -h * 0.3, h * 0.55, h * 0.6, 12);
  ctx.fillStyle = wrist;
  ctx.fill();
  line(4);
  rr(h * 0.7, -h * 0.4, h * 0.6, h * 0.8, 16);
  const cuff = ctx.createLinearGradient(0, -h * 0.4, 0, h * 0.4);
  cuff.addColorStop(0, '#4a7cae');
  cuff.addColorStop(1, '#274a72');
  ctx.fillStyle = cuff;
  ctx.fill();
  line(5);
  // The four fingers, each a curled sausage with its own light and shade and two creases.
  const fh = h / 4;
  for (let i = 0; i < 4; i++) {
    const y0 = -h / 2 + i * fh;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + fh);
    g.addColorStop(0, '#f6d3b4');
    g.addColorStop(0.4, '#e2ac84');
    g.addColorStop(1, '#a96a4e');
    rr(-h * 0.5, y0 + 1, h * 0.92, fh - 1, fh * 0.48);
    ctx.fillStyle = g;
    ctx.fill();
    line(3.6);
    ctx.strokeStyle = 'rgba(100,52,36,0.55)';
    ctx.lineWidth = 3;
    for (const x of [-h * 0.12, h * 0.2]) {
      ctx.beginPath();
      ctx.moveTo(x, y0 + fh * 0.22);
      ctx.quadraticCurveTo(x + 6, y0 + fh * 0.5, x, y0 + fh * 0.78);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,240,224,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-h * 0.36, y0 + fh * 0.22);
    ctx.lineTo(-h * 0.2, y0 + fh * 0.2);
    ctx.stroke();
    // The knuckle, a round bump at the left.
    const k = ctx.createRadialGradient(-h * 0.44, y0 + fh * 0.4, 2, -h * 0.42, y0 + fh * 0.5, fh * 0.6);
    k.addColorStop(0, 'rgba(255,236,214,0.9)');
    k.addColorStop(1, 'rgba(255,236,214,0)');
    ctx.fillStyle = k;
    ctx.beginPath();
    ctx.arc(-h * 0.42, y0 + fh * 0.5, fh * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // The thumb wrapped across the middle of the fingers, with its nail.
  ctx.save();
  ctx.rotate(-0.28);
  const tg = ctx.createLinearGradient(0, h * 0.02, 0, h * 0.34);
  tg.addColorStop(0, '#f8dcc0');
  tg.addColorStop(0.5, '#e6b48c');
  tg.addColorStop(1, '#b5775a');
  rr(-h * 0.46, h * 0.04, h * 0.8, h * 0.3, h * 0.15);
  ctx.fillStyle = tg;
  ctx.fill();
  line(4.5);
  ctx.fillStyle = '#f6e4dc';
  ctx.beginPath();
  ctx.ellipse(h * 0.2, h * 0.19, h * 0.09, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  line(2, 'rgba(90,50,40,0.8)');
  ctx.strokeStyle = 'rgba(100,52,36,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-h * 0.1, h * 0.1);
  ctx.quadraticCurveTo(-h * 0.06, h * 0.19, -h * 0.1, h * 0.28);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

const LENS = { x: 540, y: 740, r: 380 } as const;
/** The throat's width, which the fist matches. */
export const THROAT_H = 190;

/** A cutaway lens over the whale's head: the narrow throat, and a fist beside it at exactly the same width. */
export function drawThroat(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  // The humpback's head behind, big and dim.
  const sea = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  sea.addColorStop(0, '#1d6a9c');
  sea.addColorStop(1, '#082a52');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const pose: HumpbackPose = { gape: 0, throat: 0.15 };
  const len = 3500;
  drawHumpbackBack(ctx, -520, 880, len, 0.06, t, pose);
  drawHumpbackFront(ctx, -520, 880, len, 0.06, t, pose);
  ctx.fillStyle = 'rgba(4,16,36,0.5)';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const open = lensAt(t);
  if (open <= 0.01) return;
  const r = LENS.r * (0.15 + 0.85 * open);
  ctx.save();
  ctx.beginPath();
  ctx.arc(LENS.x, LENS.y, r, 0, Math.PI * 2);
  ctx.clip();
  const lining = ctx.createRadialGradient(LENS.x, LENS.y, 40, LENS.x, LENS.y, LENS.r);
  lining.addColorStop(0, '#6b3342');
  lining.addColorStop(1, '#2a0f1b');
  ctx.fillStyle = lining;
  ctx.fillRect(LENS.x - LENS.r, LENS.y - LENS.r, LENS.r * 2, LENS.r * 2);
  // The mouth cavity opening into the narrow tube.
  ctx.beginPath();
  ctx.moveTo(LENS.x - LENS.r, LENS.y - 330);
  ctx.lineTo(260, LENS.y - THROAT_H / 2);
  ctx.lineTo(260, LENS.y + THROAT_H / 2);
  ctx.lineTo(LENS.x - LENS.r, LENS.y + 330);
  ctx.closePath();
  ctx.fillStyle = '#1b0a12';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  // A few baleen plates at the mouth end.
  ctx.fillStyle = '#0c0a0d';
  for (let i = 0; i < 7; i++) {
    const bx = 120 + i * 18;
    ctx.fillRect(bx + 40, LENS.y - 250 + i * 10, 9, 80 - i * 5);
  }
  ringedTube(ctx, 260, 600, LENS.y, THROAT_H);
  // The tube's far end: a dark opening, the way down.
  ctx.fillStyle = '#12060b';
  ctx.beginPath();
  ctx.ellipse(600, LENS.y, 34, THROAT_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  // The guide lines, the same width across the throat and the fist.
  const guide = guideAt(t);
  if (guide > 0.01) {
    ctx.save();
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(255,245,214,${(0.9 * guide).toFixed(3)})`;
    const to = 260 + (LENS.x + LENS.r - 260) * guide;
    for (const dy of [-THROAT_H / 2, THROAT_H / 2]) {
      ctx.beginPath();
      ctx.moveTo(260, LENS.y + dy);
      ctx.lineTo(to, LENS.y + dy);
      ctx.stroke();
    }
    ctx.restore();
  }
  const fist = fistAt(t);
  if (fist > 0.01) drawFist(ctx, 765 + (1 - fist) * 420, LENS.y, THROAT_H);
  ctx.restore();
  // The lens's rim: paper, then ink.
  ctx.beginPath();
  ctx.arc(LENS.x, LENS.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 24;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.stroke();
  void boil;
  drawTextLine(ctx, 'throat', 400, TEXT.throatTag.y, TEXT.throatTag.size, 700, throatTagAt(t), RED_ON_PAPER);
  drawTextLine(ctx, 'fist', 770, TEXT.fistTag.y + 30, TEXT.fistTag.size, 700, fistTagAt(t), RED_ON_PAPER);
}

// ---------------------------------------------------------------- the slip

export const SLIP_HORIZON = 1010;
const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** The whale freezes, mouth open; the sea lion slides over the lower lip and plops into the water. */
export function drawSlip(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const s = slipAt(t);
  drawSkyAndSea(ctx, SLIP_HORIZON, t, boil, ['#93cfee', '#f9ecd2']);
  const pose: HumpbackPose = { gape: s.gape, throat: 0.35 * (1 - s.slide), tail: 0.3, fin: -1.9 };
  const len = 3600;
  const angle = -0.09;
  const m0 = humpbackMouth(0, 0, len, angle, pose);
  const x = 410 - m0.x;
  const y = 770 - m0.y + 6 * Math.sin(t * 2.3) * (1 - s.frozen);
  drawHumpbackBack(ctx, x, y, len, angle, t, pose);
  const m = humpbackMouth(x, y, len, angle, pose);
  const lip: Pt = { x: m.x + m.radius * 0.95, y: m.y + m.radius * 1.15 };
  const splash: Pt = { x: lip.x + 330, y: SLIP_HORIZON + 40 };
  const start: Pt = { x: m.x, y: m.y + 10 };
  let at: Pt = lerpPt(start, lip, s.slide);
  let rot = 0.1 + 0.9 * s.slide;
  if (s.fly > 0) {
    const arc = 300 * 4 * s.fly * (1 - s.fly);
    at = { x: lerpPt(lip, splash, s.fly).x, y: lerpPt(lip, splash, s.fly).y - arc };
    rot = 0.9 + 0.9 * s.fly;
  }
  const lionMood = s.slide > 0.3 ? 'smug' : 'nervous';
  const lion: Placed = { x: at.x, y: at.y, len: 520, rot: rot + 0.04 * Math.sin(t * 19) * (1 - s.slide), face: 1, beat: t * 5 };
  const lionLook = { mood: lionMood, gape: 0, sweat: s.sweat } as const;
  const lionShown = s.sinceSplash < 0.02;
  if (lionShown && s.slide < 0.35) drawSeaLion(ctx, lion, lionLook, boil);
  drawHumpbackFront(ctx, x, y, len, angle, t, pose);
  if (lionShown && s.slide >= 0.35) drawSeaLion(ctx, lion, lionLook, boil);
  if (s.sinceSplash >= 0.02) {
    // Bobbing up where it landed, grinning.
    const up: Placed = { x: splash.x + 20, y: SLIP_HORIZON + 130 - 120 * s.pop, len: 360, rot: -0.15, face: 1, beat: t * 6 };
    drawSeaLion(ctx, up, { mood: 'smug', gape: 0, wave: s.pop }, boil);
  }
  drawSeaFront(ctx, SLIP_HORIZON, t, boil, { x: 410, w: 500 });
  if (s.sinceSplash >= 0) drawSplash(ctx, splash, s.sinceSplash);
}

/** A crown of water and drops thrown up where the sea lion lands. */
function drawSplash(ctx: CanvasRenderingContext2D, at: Pt, age: number): void {
  if (age > 1.2) return;
  const rng = createRng(4040);
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.4;
    const v = 260 + rng() * 300;
    const x = at.x + Math.cos(a) * v * age * 0.7;
    const y = at.y + Math.sin(a) * v * age + 900 * age * age * 0.5;
    drawBubble(ctx, x, y, (6 + rng() * 12) * (1 - age * 0.5), Math.max(0, 1 - age / 1.2));
  }
  ctx.restore();
}

export const sceneScratch = (): ReturnType<typeof makeCanvas> => makeCanvas(VIDEO.width, VIDEO.height);
