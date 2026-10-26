import { INK, makeCanvas, Pen } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { type Camera, cycles, type Fish, HOLE, type Pt, type Worm } from './story';
import { drawHead, drawWormBack } from './worm';

/**
 * The night seabed the strike and the lurk happen on: black-blue water with
 * drifting specks, a diver's flashlight slanting down from the upper right,
 * a plain of pale sand with the burrow's dark mouth in it, the worm, the
 * fish, and sand flung up or settling. The water and the beam are fixed on
 * screen; the seabed, worm and fish go through the camera.
 */

export interface NightCast {
  readonly sheet: HTMLCanvasElement;
  readonly chromis: Sprite;
  /** The sand's grain, one sheet per boil frame. */
  readonly sand: readonly HTMLCanvasElement[];
}

/** The sand plane's far edge (where it fades into the dark) and how far down it's drawn, scene px. */
const SAND_TOP = HOLE.y - 150;
const SAND_W = 2200;
const SAND_H = 1100;
const SAND_X = HOLE.x - SAND_W / 2;

function makeSand(f: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(SAND_W, SAND_H);
  const rng = createRng(5150 + f * 211);
  const pen = new Pen(ctx, 5151 + f * 977, 1.2);
  // Ripples running across the plane, closer together towards the far edge.
  for (let i = 0; i < 26; i++) {
    const y = 40 + (i / 26) ** 1.5 * SAND_H;
    const pts = Array.from({ length: 30 }, (_, j) => ({ x: (j / 29) * SAND_W, y: y + 9 * Math.sin(j * 0.7 + i * 1.9) + rng() * 3 }));
    pen.hair(pts, 1.3 + (y / SAND_H) * 1.6, INK, 0.22 + 0.2 * (y / SAND_H));
  }
  // Grains and pebbles.
  for (let i = 0; i < 2600; i++) {
    const x = rng() * SAND_W;
    const y = rng() ** 0.8 * SAND_H;
    ctx.globalAlpha = 0.18 + rng() * 0.3;
    ctx.fillStyle = rng() < 0.75 ? INK : '#f4eddc';
    ctx.beginPath();
    ctx.arc(x, y, (0.7 + rng() * 1.8) * (0.5 + y / SAND_H), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 26; i++) {
    const x = rng() * SAND_W;
    const y = 80 + rng() * (SAND_H - 80);
    const r = (5 + rng() * 9) * (0.5 + y / SAND_H);
    pen.fill(Array.from({ length: 10 }, (_, j) => ({ x: x + Math.cos(j * 0.63) * r * (1 + 0.2 * Math.sin(j * 2.1)), y: y + Math.sin(j * 0.63) * r * 0.6 })), '#3a332b', 0.5);
    pen.closed(Array.from({ length: 10 }, (_, j) => ({ x: x + Math.cos(j * 0.63) * r, y: y + Math.sin(j * 0.63) * r * 0.6 })), 1.2);
  }
  return canvas;
}

export function makeNight(): NightCast {
  return { sheet: makePaper(), chromis: makeSprite('chromis', 3), sand: Array.from({ length: BOIL_FRAMES }, (_, f) => makeSand(f)) };
}

/** The water's wash, top to bottom, [r, g, b]: a cold night by default. */
export type Rgb = readonly [number, number, number];
export interface Wash {
  readonly top: Rgb;
  readonly mid: Rgb;
  readonly bottom: Rgb;
}
export const NIGHT: Wash = { top: [12, 26, 46], mid: [6, 14, 28], bottom: [2, 6, 12] };
const css = (c: Rgb, a = 1): string => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;

export function drawWater(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, wash: Wash): void {
  ctx.drawImage(sheet, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, css(wash.top, 0.95));
  g.addColorStop(0.55, css(wash.mid, 0.96));
  g.addColorStop(1, css(wash.bottom, 0.97));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const SPECKS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 120 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2.2, phase: rng() * 6.28, depth: 0.4 + rng() * 0.6 }));
})();

/** Specks drifting in the water, brighter where the beam catches them. */
export function drawSpecks(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  ctx.save();
  ctx.fillStyle = '#e8eef8';
  for (const m of SPECKS) {
    const x = m.x + 16 * Math.sin(cycles(1, t) + m.phase);
    const y = (((m.y - 60 * Math.sin(cycles(1, t) + m.phase * 0.5) * m.depth) % VIDEO.height) + VIDEO.height) % VIDEO.height;
    ctx.globalAlpha = alpha * (0.1 + 0.22 * m.depth) * (inBeam(x, y) ? 2.2 : 1);
    ctx.beginPath();
    ctx.arc(x, y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The flashlight: from off screen at the upper right, aimed down at the burrow. */
const LAMP: Pt = { x: 1230, y: -260 };
const AIM: Pt = { x: 470, y: 1150 };
const BEAM_HALF = 0.2;
function inBeam(x: number, y: number): boolean {
  const a = Math.atan2(AIM.y - LAMP.y, AIM.x - LAMP.x);
  const b = Math.atan2(y - LAMP.y, x - LAMP.x);
  return Math.abs(b - a) < BEAM_HALF;
}

/** The beam's cone of light (screen blend), `strength` 0 .. 1. */
export function drawBeam(ctx: CanvasRenderingContext2D, t: number, strength: number): void {
  if (strength <= 0.01) return;
  const a = Math.atan2(AIM.y - LAMP.y, AIM.x - LAMP.x) + 0.015 * Math.sin(cycles(2, t));
  const len = 2400;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [half, alpha] of [[BEAM_HALF, 0.16], [BEAM_HALF * 0.55, 0.14]] as const) {
    const g = ctx.createLinearGradient(LAMP.x, LAMP.y, LAMP.x + Math.cos(a) * len, LAMP.y + Math.sin(a) * len);
    g.addColorStop(0, `rgba(255,244,214,${(alpha * strength).toFixed(3)})`);
    g.addColorStop(0.55, `rgba(255,236,200,${(alpha * 0.8 * strength).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(LAMP.x, LAMP.y);
    ctx.lineTo(LAMP.x + Math.cos(a - half) * len, LAMP.y + Math.sin(a - half) * len);
    ctx.lineTo(LAMP.x + Math.cos(a + half) * len, LAMP.y + Math.sin(a + half) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The pool of light the beam throws on the sand, and on whatever stands in it (scene px, under the camera). */
function drawPool(ctx: CanvasRenderingContext2D, strength: number): void {
  const g = ctx.createRadialGradient(AIM.x + 40, HOLE.y - 10, 20, AIM.x + 40, HOLE.y - 10, 520);
  g.addColorStop(0, `rgba(255,236,196,${(0.3 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,236,196,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(AIM.x - 600, HOLE.y - 560, 1200, 1000);
  ctx.restore();
}

function drawSand(ctx: CanvasRenderingContext2D, cast: NightCast, boil: number): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, SAND_TOP, 0, SAND_TOP + SAND_H);
  g.addColorStop(0, 'rgba(70,68,70,0)');
  g.addColorStop(0.08, 'rgba(70,68,70,0.9)');
  g.addColorStop(0.3, 'rgba(62,60,62,1)');
  g.addColorStop(1, 'rgba(22,24,30,1)');
  ctx.fillStyle = g;
  ctx.fillRect(SAND_X, SAND_TOP, SAND_W, SAND_H);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(cast.sand[boil % cast.sand.length]!, SAND_X, SAND_TOP);
  ctx.restore();
  // The burrow's mouth: a dark hole with a raised rim.
  ctx.save();
  const hole = ctx.createRadialGradient(HOLE.x, HOLE.y, 10, HOLE.x, HOLE.y, 150);
  hole.addColorStop(0, '#050403');
  hole.addColorStop(0.75, 'rgba(14,11,9,0.95)');
  hole.addColorStop(1, 'rgba(30,26,22,0)');
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.ellipse(HOLE.x, HOLE.y, 165, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const pen = new Pen(ctx, 5300 + boil * 1013, 1.4);
  pen.stroke(Array.from({ length: 19 }, (_, i) => ({ x: HOLE.x + Math.cos(Math.PI + (i / 18) * Math.PI) * 140, y: HOLE.y + Math.sin(Math.PI + (i / 18) * Math.PI) * 30 })), 2.4);
}

/** The near rim of the hole, over the worm's base: sand heaped a little, its edge inked. */
function drawRim(ctx: CanvasRenderingContext2D, boil: number): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, HOLE.y, 0, HOLE.y + 60);
  g.addColorStop(0, 'rgb(92,88,86)');
  g.addColorStop(1, 'rgba(66,64,66,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(HOLE.x, HOLE.y + 4, 170, 30, 0, 0, Math.PI);
  ctx.ellipse(HOLE.x, HOLE.y + 4, 230, 62, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const pen = new Pen(ctx, 5400 + boil * 1013, 1.4);
  pen.stroke(Array.from({ length: 19 }, (_, i) => ({ x: HOLE.x + Math.cos((i / 18) * Math.PI) * 168, y: HOLE.y + 4 + Math.sin((i / 18) * Math.PI) * 29 })), 3);
  for (let i = 0; i < 11; i++) {
    const a = 0.25 + (i / 10) * (Math.PI - 0.5);
    const x = HOLE.x + Math.cos(a) * 190;
    const y = HOLE.y + 10 + Math.sin(a) * 40;
    pen.hair([{ x, y }, { x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 9 }], 1.4, INK, 0.45);
  }
}

const GRAINS = (() => {
  const rng = createRng(911);
  return Array.from({ length: 64 }, () => {
    const a = (rng() - 0.5) * 1.9;
    const speed = 700 + rng() * 900;
    return { vx: Math.sin(a) * speed, vy: -Math.cos(a) * speed, r: 4 + rng() * 9, lag: rng() * 0.12, x0: (rng() - 0.5) * 220 };
  });
})();
const GRAVITY = 2300;

/** Sand flung up out of the hole: `u` is the burst's own clock (0 the burst, below 0 nothing yet). */
function drawSpray(ctx: CanvasRenderingContext2D, u: number, scale: number, grain: number): void {
  if (u <= 0 || u > 2.5) return;
  ctx.save();
  // A cloud of silt billowing up and thinning.
  const cloud = Math.min(1, u * 4) * Math.max(0, 1 - u / 2.5);
  const r = 160 + 380 * Math.min(1, u);
  const g = ctx.createRadialGradient(HOLE.x, HOLE.y - r * 0.3, 10, HOLE.x, HOLE.y - r * 0.3, r);
  g.addColorStop(0, `rgba(96,88,78,${(0.32 * cloud).toFixed(3)})`);
  g.addColorStop(1, 'rgba(96,88,78,0)');
  ctx.fillStyle = g;
  ctx.fillRect(HOLE.x - r, HOLE.y - r * 1.3, r * 2, r * 1.6);
  for (const s of GRAINS) {
    const v = u - s.lag;
    if (v <= 0) continue;
    const x = HOLE.x + s.x0 + s.vx * v * scale;
    const y = HOLE.y - 20 + (s.vy * v + 0.5 * GRAVITY * v * v) * scale;
    if (y > HOLE.y + 60) continue;
    ctx.globalAlpha = 0.9 * Math.min(1, (HOLE.y + 60 - y) / 80);
    // A faint trail behind it.
    const vy = s.vy + GRAVITY * v;
    const sp = Math.hypot(s.vx, vy) || 1;
    ctx.fillStyle = 'rgba(200,190,170,0.22)';
    ctx.beginPath();
    ctx.moveTo(x + (vy / sp) * (s.r * grain) * 0.7, y - (s.vx / sp) * (s.r * grain) * 0.7);
    ctx.lineTo(x - (s.vx / sp) * (s.r * grain) * 7, y - (vy / sp) * (s.r * grain) * 7);
    ctx.lineTo(x - (vy / sp) * (s.r * grain) * 0.7, y + (s.vx / sp) * (s.r * grain) * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b8ad98';
    ctx.beginPath();
    ctx.arc(x, y, (s.r * grain), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.globalAlpha *= 0.7;
    ctx.beginPath();
    ctx.arc(x + (s.r * grain) * 0.25, y + (s.r * grain) * 0.3, (s.r * grain) * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Silt hanging and sinking back after the worm has gone down: `u` 0 .. 1 over the beat. */
function drawSettle(ctx: CanvasRenderingContext2D, u: number): void {
  if (u < 0) return;
  ctx.save();
  const cloud = Math.max(0, 1 - u) * Math.min(1, u * 8);
  const g = ctx.createRadialGradient(HOLE.x, HOLE.y - 80, 10, HOLE.x, HOLE.y - 80, 420);
  g.addColorStop(0, `rgba(140,132,118,${(0.45 * cloud).toFixed(3)})`);
  g.addColorStop(1, 'rgba(140,132,118,0)');
  ctx.fillStyle = g;
  ctx.fillRect(HOLE.x - 420, HOLE.y - 500, 840, 700);
  GRAINS.slice(0, 40).forEach((s, i) => {
    const x = HOLE.x + s.x0 * 1.6 + 30 * Math.sin(u * 6 + i);
    const y = HOLE.y - 420 * (1 - u) * (0.3 + (i % 7) / 9) + 40;
    if (y > HOLE.y + 40) return;
    ctx.globalAlpha = 0.6 * Math.max(0, 1 - u * 0.9);
    ctx.fillStyle = '#b8ad98';
    ctx.beginPath();
    ctx.arc(x, y, s.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export interface NightView {
  readonly cam: Camera;
  readonly shake: Pt;
  readonly worm: Worm;
  readonly fish: Fish | null;
  /** The burst's clock (see drawSpray); below 0 none. */
  readonly spray: number;
  /** The settling silt's clock (see drawSettle); below 0 none. */
  readonly settle: number;
  /** How panicked the fish looks, 0 .. 1. */
  readonly panic: number;
  readonly wash: Wash;
}

/** A point on the fish, given in its own frame (body lengths, facing right, nose at +x), on screen. */
function onFish(f: Fish, lx: number, ly: number): Pt {
  const x = lx * f.length;
  const y = ly * f.length;
  const c = Math.cos(f.tilt);
  const s = Math.sin(f.tilt);
  return { x: f.x + f.facing * (x * c + y * s), y: f.y + (-x * s + y * c) };
}

function drawFish(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, boil: number, panic: number): void {
  drawSwimmer(ctx, sprite, { j: 0, age: 0, shape: 'chromis', x: f.x, y: f.y, length: f.length, facing: f.facing, tilt: f.tilt, beat: f.beat, effort: f.effort }, boil);
  if (panic <= 0.02) return;
  // Wide, white, terrified eye, its pupil shrunk to a dot and staring down at the worm.
  const eye = onFish(f, 0.31, -0.035);
  const r = f.length * (0.06 + 0.035 * panic);
  const pen = new Pen(ctx, 5600 + boil * 1013, 0.6);
  ctx.save();
  ctx.globalAlpha = Math.min(1, panic * 1.5);
  ctx.fillStyle = '#fbf8f0';
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, r, 0, Math.PI * 2);
  ctx.fill();
  pen.circle(eye.x, eye.y, r, Math.max(1.5, f.length * 0.014));
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(eye.x + r * 0.15 * f.facing, eye.y + r * 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  // Shake lines round its head.
  for (const [lx, ly, dx, dy] of [[0.5, -0.32, 0.12, -0.1], [0.62, -0.18, 0.15, -0.02], [0.52, 0.22, 0.12, 0.1]] as const) {
    pen.stroke([onFish(f, lx, ly), onFish(f, lx + dx, ly + dy)], f.length * 0.018);
  }
  ctx.restore();
}

export function drawNight(ctx: CanvasRenderingContext2D, cast: NightCast, view: NightView, t: number, boil: number): void {
  drawWater(ctx, cast.sheet, view.wash);
  drawBeam(ctx, t, 1);
  drawSpecks(ctx, t, 1);
  const { cam, shake } = view;
  ctx.save();
  ctx.translate(cam.at.x + shake.x, cam.at.y + shake.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.focus.x, -cam.focus.y);
  drawSand(ctx, cast, boil);
  drawPool(ctx, 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-2000, -4000, 5000, 4000 + HOLE.y + 4);
  ctx.clip();
  drawWormBack(ctx, view.worm, HOLE, 1, t, boil);
  ctx.restore();
  if (view.worm.head.y < HOLE.y + 60) {
    if (view.fish) drawFish(ctx, cast.chromis, view.fish, boil, view.panic);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-2000, -4000, 5000, 4000 + HOLE.y + 4);
    ctx.clip();
    drawHead(ctx, view.worm, 1, t, boil, 'front');
    ctx.restore();
  } else if (view.fish) {
    drawFish(ctx, cast.chromis, view.fish, boil, view.panic);
  }
  drawRim(ctx, boil);
  drawSpray(ctx, view.spray, 1, 1 / cam.zoom);
  drawSettle(ctx, view.settle);
  ctx.restore();
  // The paper's grain through everything, like ink and wash on a sheet.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.35;
  ctx.drawImage(cast.sheet, 0, 0);
  ctx.restore();
}
