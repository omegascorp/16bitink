import { INK, Pen, type Pt } from '../../../src/art/pen';
import { clamp01, VIDEO } from '../short';
import { drawTextLine } from '../captions';
import { drawJelly } from './jelly';
import { fillShape, glow, hash, mix, pathOf } from './paint';
import { CHALK, INK_BG } from './scene';
import { ALARM, flareAt, jellyAlarmAt, jellyAt, jellySweatAt, sectionScrollAt, sweepAt, sweepFadeAt } from './story';

/**
 * The throat cut open lengthwise, running down the screen: the fleshy
 * walls left and right, every spine on them angled down towards the
 * stomach, the back wall's spines pointing down too, the dark gullet between.
 * The camera drifts down it (scroll, px). The spines flare in a wave on
 * "ALL", an arrow sweeps down on "down!", and the jellyfish tries to get out.
 */

const LUMEN_TOP = '#5a1c22';
const LUMEN_BOTTOM = '#12040a';
const MUSCLE = '#6e222a';
const LINING = '#c0767a';
const SKIN = '#1b2330';
const SPINE_LIT = '#f6ecdc';
const SPINE_SHADE = '#b8998a';

/** Spine rows every ROW px down the throat (world), and how long they are. */
const ROW = 92;
const SPINE_LEN = 235;
/** The spines' angle from straight down, radians: they lean in towards the middle. */
const LEAN = 0.7;

/** The inner edge of each wall at world y: left, right. */
const wallL = (yw: number): number => 232 + 16 * Math.sin(yw / 130) + 8 * Math.sin(yw / 47);
const wallR = (yw: number): number => 848 - 16 * Math.sin(yw / 140 + 1.3) - 8 * Math.sin(yw / 53 + 2);

interface Spine {
  readonly base: Pt;
  readonly tip: Pt;
  readonly side: -1 | 1;
  readonly width: number;
  readonly flare: number;
}

function spineOf(t: number, side: -1 | 1, yw: number, scroll: number, k: number, back: boolean): Spine {
  const y = yw - scroll;
  const x = side < 0 ? wallL(yw) : wallR(yw);
  const flare = flareAt(t, y);
  const len = SPINE_LEN * (0.85 + 0.3 * hash(k)) * (back ? 0.7 : 1) * (1 + 0.16 * flare);
  const lean = (LEAN - 0.16 * flare) * (back ? 0.8 : 1);
  const inward = -side;
  return {
    base: { x: x + side * (back ? 26 : 4), y },
    tip: { x: x + inward * Math.sin(lean) * len + side * (back ? 26 : 0), y: y + Math.cos(lean) * len },
    side,
    width: (back ? 30 : 44) * (0.85 + 0.3 * hash(k * 3 + 1)),
    flare,
  };
}

/** One spine: a pale curved cone, lit on its upper flank, with a dark fold at its root. */
function drawSpine(ctx: CanvasRenderingContext2D, pen: Pen, s: Spine, dim: number): void {
  const along = { x: s.tip.x - s.base.x, y: s.tip.y - s.base.y };
  const len = Math.hypot(along.x, along.y) || 1;
  // Its base runs along the wall (vertical), so the cone sits on it.
  const b0 = { x: s.base.x, y: s.base.y - s.width * 0.55 };
  const b1 = { x: s.base.x, y: s.base.y + s.width * 0.55 };
  const n = { x: -along.y / len, y: along.x / len };
  // A slight downward curve along its length.
  const mid = { x: s.base.x + along.x * 0.5 + n.x * s.side * 10, y: s.base.y + along.y * 0.5 + n.y * s.side * 10 };
  const c0 = { x: mid.x - n.x * s.width * 0.28 * s.side, y: mid.y - n.y * s.width * 0.28 * s.side };
  const c1 = { x: mid.x + n.x * s.width * 0.28 * s.side, y: mid.y + n.y * s.width * 0.28 * s.side };
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#20070b';
  ctx.beginPath();
  ctx.ellipse(s.base.x, s.base.y + 6, 12, s.width * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(b0.x, b0.y, b1.x, b1.y);
  const lit = mix(SPINE_LIT, '#fffbe8', s.flare * 0.6);
  g.addColorStop(0, mix(lit, LUMEN_BOTTOM, dim));
  g.addColorStop(0.5, mix(mix(SPINE_LIT, SPINE_SHADE, 0.45), LUMEN_BOTTOM, dim));
  g.addColorStop(1, mix('#7d5d55', LUMEN_BOTTOM, dim));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(b0.x, b0.y);
  ctx.quadraticCurveTo(c0.x, c0.y, s.tip.x, s.tip.y);
  ctx.quadraticCurveTo(c1.x, c1.y, b1.x, b1.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.stroke([b0, c0, s.tip, c1, b1], 2.4 * (1 - 0.5 * dim), INK, 0.9 * (1 - 0.4 * dim));
  // A wet glint down its lit flank, brighter as it flares.
  ctx.save();
  ctx.globalAlpha = (0.35 + 0.6 * s.flare) * (1 - dim);
  ctx.strokeStyle = '#fffdf6';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3 + 3 * s.flare;
  ctx.beginPath();
  ctx.moveTo(b0.x + along.x * 0.18, b0.y + along.y * 0.18 + s.width * 0.18);
  ctx.quadraticCurveTo(c0.x + n.x * 6 * s.side, c0.y + n.y * 6 * s.side, s.base.x + along.x * 0.82, s.base.y + along.y * 0.82);
  ctx.stroke();
  ctx.restore();
  if (s.flare > 0.3) glow(ctx, s.tip.x, s.tip.y, 26 + 30 * s.flare, '#fff1cf', 0.5 * s.flare);
}

export function drawSection(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = new Pen(ctx, 9091 + boil * 977, 1.1);
  const scroll = sectionScrollAt(t);
  // The gullet: dark red, light coming down from the mouth above.
  const g = ctx.createLinearGradient(0, -scroll * 0.6, 0, VIDEO.height);
  g.addColorStop(0, LUMEN_TOP);
  g.addColorStop(1, LUMEN_BOTTOM);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // The back wall: wavy folds, and rows of small spines pointing down.
  for (let k = 0; k < 9; k++) {
    const x0 = 300 + k * 60;
    const pts: Pt[] = [];
    for (let y = -40; y <= VIDEO.height + 40; y += 40) pts.push({ x: x0 + 14 * Math.sin((y + scroll) / 90 + k), y });
    pen.hair(pts, 2, '#2a080d', 0.5);
  }
  const first = Math.floor((scroll - 300) / (ROW * 0.8));
  for (let r = first; r < first + Math.ceil((VIDEO.height + 600) / (ROW * 0.8)); r++) {
    const yw = r * ROW * 0.8;
    const y = yw - scroll;
    for (let c = 0; c < 6; c++) {
      const x = 330 + c * 84 + (r % 2) * 42 + (hash(r * 13 + c) - 0.5) * 20;
      const len = 60 + 30 * hash(r * 7 + c);
      const f = flareAt(t, y);
      const tip = { x: x + (hash(r + c * 5) - 0.5) * 8, y: y + len * (1 + 0.2 * f) };
      const shape = [{ x: x - 11, y }, tip, { x: x + 11, y }];
      fillShape(ctx, shape, mix('#7a4a46', '#f2e2cc', 0.15 + 0.6 * f), 0.75);
      pen.hair([shape[0]!, tip, shape[2]!], 1.2, '#1a0507', 0.6);
    }
  }
  // Light from the mouth, fading as the camera goes deeper.
  const light = ctx.createLinearGradient(0, 0, 0, 700);
  light.addColorStop(0, `rgba(255,190,170,${(0.32 * (1 - clamp01(scroll / 600))).toFixed(3)})`);
  light.addColorStop(1, 'rgba(255,190,170,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, VIDEO.width, 700);
  drawJellyInThroat(ctx, t, boil);
  drawSweep(ctx, t);
  // The walls, cut open: skin outside, muscle, the pink lining along the edge.
  for (const side of [-1, 1] as const) drawWall(ctx, pen, side, scroll);
  // The spines along both walls, back row first.
  const firstRow = Math.floor((scroll - 300) / ROW);
  const rows = Math.ceil((VIDEO.height + 400) / ROW);
  for (const back of [true, false]) {
    for (let r = firstRow; r < firstRow + rows; r++) {
      for (const side of [-1, 1] as const) {
        const yw = r * ROW + (back ? ROW / 2 : 0) + (side > 0 ? ROW * 0.25 : 0);
        drawSpine(ctx, pen, spineOf(t, side, yw, scroll, r * 2 + (side > 0 ? 1 : 0) + (back ? 500 : 0), back), back ? 0.35 : 0);
      }
    }
  }
  drawJellyMarks(ctx, t);
}

function drawWall(ctx: CanvasRenderingContext2D, pen: Pen, side: -1 | 1, scroll: number): void {
  const edge: Pt[] = [];
  for (let y = -60; y <= VIDEO.height + 60; y += 20) edge.push({ x: side < 0 ? wallL(y + scroll) : wallR(y + scroll), y });
  const outer = side < 0 ? -40 : VIDEO.width + 40;
  const shape = [...edge, { x: outer, y: VIDEO.height + 60 }, { x: outer, y: -60 }];
  const x0 = side < 0 ? 0 : VIDEO.width;
  const x1 = side < 0 ? 250 : VIDEO.width - 250;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, SKIN);
  g.addColorStop(0.18, SKIN);
  g.addColorStop(0.24, '#3a1218');
  g.addColorStop(0.5, MUSCLE);
  g.addColorStop(0.86, '#a24c52');
  g.addColorStop(1, LINING);
  fillShape(ctx, shape, g);
  // Muscle fibres and the skin's speckles.
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  for (let k = 0; k < 7; k++) {
    const xk = side < 0 ? 70 + k * 22 : VIDEO.width - 70 - k * 22;
    const pts: Pt[] = [];
    for (let y = -40; y <= VIDEO.height + 40; y += 30) pts.push({ x: xk + 6 * Math.sin((y + scroll) / 70 + k * 1.7), y });
    pen.hair(pts, 1.4, '#3c0d13', 0.45);
  }
  for (let i = 0; i < 60; i++) {
    const yw = (hash(i * 3 + (side > 0 ? 1 : 0)) * 2400) - ((scroll * 1) % 2400);
    const y = ((yw % 2400) + 2400) % 2400 - 200;
    const x = side < 0 ? 8 + hash(i * 5) * 40 : VIDEO.width - 8 - hash(i * 5) * 40;
    pen.dot(x, y, 1.5 + 3 * hash(i * 9), '#e7e2d6', 0.5);
  }
  ctx.restore();
  pen.hair(edge.map((p) => ({ x: p.x - side * 7, y: p.y })), 5, '#e8a2a2', 0.5);
  pen.stroke(edge, 3.2, INK);
  const cut = edge.map((p) => ({ x: side < 0 ? 58 : VIDEO.width - 58, y: p.y }));
  pen.hair(cut, 2, INK, 0.6);
}

/** The bold arrow sweeping down the middle on "down!". */
function drawSweep(ctx: CanvasRenderingContext2D, t: number): void {
  const k = sweepAt(t);
  const fade = sweepFadeAt(t);
  if (k <= 0.01 || fade <= 0.01) return;
  const x = 540;
  const top = 280;
  const bottom = top + 1000 * k;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Speed streaks either side.
  ctx.strokeStyle = 'rgba(255,240,220,0.35)';
  ctx.lineWidth = 6;
  for (const dx of [-90, -55, 55, 90]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, top + 120 + Math.abs(dx));
    ctx.lineTo(x + dx, bottom - 160 - Math.abs(dx) * 0.6);
    ctx.stroke();
  }
  for (const pass of [{ c: INK_BG, w: 46 }, { c: CHALK, w: 26 }]) {
    ctx.strokeStyle = pass.c;
    ctx.fillStyle = pass.c;
    ctx.lineWidth = pass.w;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom - 40);
    ctx.stroke();
    ctx.beginPath();
    const h = 110 + pass.w * 0.6;
    ctx.moveTo(x - h * 0.75, bottom - h);
    ctx.lineTo(x, bottom + pass.w * 0.3);
    ctx.lineTo(x + h * 0.75, bottom - h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawJellyInThroat(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const j = jellyAt(t);
  if (!j) return;
  drawJelly(ctx, j.x, j.y, 380, { squash: j.squash, pulse: j.pulse, tilt: j.tilt, trail: j.trail, face: j.face, alpha: 1 }, boil, 3);
}

/** The "!" as it hits the spines, the sweat drop as it gives up. */
function drawJellyMarks(ctx: CanvasRenderingContext2D, t: number): void {
  const j = jellyAt(t);
  if (!j) return;
  const alarm = jellyAlarmAt(t);
  if (alarm > 0) drawTextLine(ctx, '!', j.x + ALARM.dx, j.y - ALARM.above, ALARM.size * Math.min(ALARM.pop, alarm * 1.4), 700, alarm, { fill: '#f5c84a', halo: INK_BG });
  const sweat = jellySweatAt(t);
  if (sweat > 0) {
    const x = j.x + 130;
    const y = j.y - 170 + 40 * (1 - sweat);
    ctx.save();
    ctx.globalAlpha = sweat;
    ctx.fillStyle = '#bfe6f5';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 34);
    ctx.quadraticCurveTo(x + 22, y, x, y + 10);
    ctx.quadraticCurveTo(x - 22, y, x, y - 34);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
