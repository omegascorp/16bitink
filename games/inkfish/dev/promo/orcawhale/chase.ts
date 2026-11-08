import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { drawOrca } from '../foodchain/art/orca';
import { lerp, ramp, VIDEO } from '../short';
import { drawBlueWhale } from './blueWhale';
import { TEXT } from './script';
import { css, drawRays, drawSnow, drawVignette, drawWater, glow, mixRgb, type Rgb, wash } from './sea';
import {
  boatAt, BIGGEST_AT, clockAt, clockShowAt, cycles, earthAt, EARTH_AT, flashAt, HOUR_FOR_AT, KILL_AT, killAt, shakeAt, SIXTY_AT, sizeBarAt, tailPhaseAt, wrap,
} from './story';

/**
 * The chase and the kill, underwater just below the surface: the whole blue
 * whale fleeing to the right with the pod round it (chase), its size under
 * it, a clock sweeping an hour as it tires (exhausted), a whale-watching boat
 * on the surface and a camera's flash, then on "KILL" the dark comes down,
 * the whale rolls nose-down and sinks, and the orcas circle (shock; no blood).
 * And "The biggest prey on Earth": the whale gliding, huge, a little Earth over it.
 */

const SURFACE_Y = 300;
const WHALE_LEN = 1060;
const ORCA_LEN = 300;
const CHASE_TOP: Rgb = [42, 92, 132];
const CHASE_MID: Rgb = [16, 48, 86];
const CHASE_BOTTOM: Rgb = [4, 14, 30];
const TIRED_TOP: Rgb = [58, 78, 96];
const TIRED_MID: Rgb = [22, 36, 54];
const KILL_TOP: Rgb = [46, 28, 54];
const KILL_MID: Rgb = [20, 10, 30];
const KILL_BOTTOM: Rgb = [4, 2, 10];
const LABEL_INK: TextInk = { fill: PAPER, halo: '#061224' };

/** The whale: where it is, its heading and tail; it tires through the hour, then rolls and sinks on "KILL". */
export function chaseWhaleAt(t: number): { readonly x: number; readonly y: number; readonly angle: number; readonly tail: number } {
  const k = killAt(t);
  return {
    x: 540 + 14 * Math.sin(cycles(3, t)) - 40 * k,
    y: 700 + 10 * Math.sin(cycles(5, t)) + 150 * k,
    angle: 0.02 * Math.sin(cycles(4, t)) + 0.24 * k,
    tail: tailPhaseAt(t),
  };
}

/** Where the size bar's middle sits under the whale (y), for the safe-area test. */
export const SIZE_BAR_Y = 815;

/** The pod around the whale while it flees: [dx, dy] from its middle, then the circle they swim on after the kill. */
const POD: readonly { readonly dx: number; readonly dy: number; readonly a: number; readonly s: number }[] = [
  { dx: 330, dy: -170, a: 0.3, s: 1 },
  { dx: 300, dy: 330, a: 1.9, s: 0.92 },
  { dx: -80, dy: -200, a: 4.1, s: 1.05 },
  { dx: -300, dy: 350, a: 2.9, s: 0.9 },
  { dx: 560, dy: 30, a: 5.2, s: 1.0 },
  { dx: -500, dy: -110, a: 3.6, s: 0.85 },
];

interface PodOrca { readonly x: number; readonly y: number; readonly angle: number; readonly len: number; readonly front: boolean; readonly flip: boolean }

function podAt(t: number): PodOrca[] {
  const w = chaseWhaleAt(t);
  const k = killAt(t);
  const spin = 1.6 * Math.max(0, wrap(t) - KILL_AT);
  return POD.map((o, i) => {
    const bob = 22 * Math.sin(cycles(7 + i, t) + i);
    const surge = 34 * Math.sin(cycles(5 + i, t) + i * 1.7);
    const chase = { x: w.x + o.dx + surge, y: w.y + o.dy + bob, angle: 0.08 * Math.sin(cycles(6 + i, t) + i) - 0.05 * Math.sign(o.dy) };
    const th = o.a + spin;
    const ring = { x: w.x + 470 * Math.cos(th), y: w.y + 190 * Math.sin(th), angle: Math.atan2(190 * Math.cos(th), -470 * Math.sin(th)) };
    const turn = (ring.angle - chase.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const angle = chase.angle + turn * k;
    const flip = Math.cos(angle) < 0;
    return {
      x: lerp(chase.x, ring.x, k),
      y: lerp(chase.y, ring.y, k),
      angle,
      len: ORCA_LEN * o.s,
      front: k > 0.5 ? Math.sin(th) > 0 : o.dy > 0,
      flip,
    };
  });
}

function drawPod(ctx: CanvasRenderingContext2D, t: number, front: boolean): void {
  podAt(t).forEach((o, i) => {
    if (o.front !== front) return;
    drawOrca(ctx, o.x, o.y, o.len, o.angle, t, { jaw: 0.15 + 0.15 * Math.sin(cycles(9, t) + i), tail: cycles(26 + i, t) }, o.flip);
  });
}

/** The surface seen from below: a bright rippling band, and the boat's hull on it. */
function drawSurfaceBand(ctx: CanvasRenderingContext2D, t: number, dark: number): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, SURFACE_Y + 40);
  g.addColorStop(0, `rgba(200,225,240,${(0.5 * (1 - dark)).toFixed(3)})`);
  g.addColorStop(1, 'rgba(200,225,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, SURFACE_Y + 40);
  ctx.strokeStyle = `rgba(230,242,250,${(0.55 * (1 - 0.6 * dark)).toFixed(3)})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = -20; x <= VIDEO.width + 20; x += 16) {
    const y = SURFACE_Y + 7 * Math.sin(x / 70 + cycles(8, t)) + 4 * Math.sin(x / 31 - cycles(11, t));
    if (x === -20) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** The whale-watching boat's hull from below, its people's camera flashing on "saw". */
function drawBoat(ctx: CanvasRenderingContext2D, t: number): void {
  const show = boatAt(t);
  if (show <= 0) return;
  const x = lerp(-120, 260, ramp(wrap(t), KILL_AT - 2.0, KILL_AT - 1.2)) + 10 * Math.sin(cycles(4, t));
  const y = SURFACE_Y + 4 * Math.sin(cycles(8, t));
  ctx.save();
  ctx.globalAlpha = show;
  // Above the waterline (seen faintly through it): the cabin and two people, one with a camera.
  ctx.fillStyle = 'rgba(16,24,34,0.55)';
  ctx.fillRect(x - 70, y - 70, 120, 64);
  for (const px of [x + 70, x + 100]) {
    ctx.beginPath();
    ctx.arc(px, y - 52, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px - 9, y - 40, 18, 36);
  }
  // The hull, dark against the light.
  ctx.fillStyle = '#0b1219';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 190, y - 6);
  ctx.lineTo(x + 170, y - 6);
  ctx.quadraticCurveTo(x + 150, y + 40, x + 90, y + 52);
  ctx.lineTo(x - 160, y + 46);
  ctx.quadraticCurveTo(x - 185, y + 30, x - 190, y - 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const f = flashAt(t);
  if (f > 0) {
    glow(ctx, x + 100, y - 46, 260, '255,255,240', f);
    wash(ctx, 'screen', '#ffffff', 0.18 * f);
  }
}

/** The clock: a paper face whose hand sweeps a whole turn (an hour) on "for an hour…". */
function drawClock(ctx: CanvasRenderingContext2D, t: number): void {
  const show = clockShowAt(t);
  if (show <= 0) return;
  const s = wrap(t) - HOUR_FOR_AT + 0.25;
  const pop = s < 0.3 ? 0.5 + 0.5 * ramp(s, 0, 0.3) + 0.12 * Math.sin(ramp(s, 0, 0.3) * Math.PI) : 1;
  const r = 96 * pop;
  const [cx, cy] = [860, 470];
  const turn = clockAt(t);
  ctx.save();
  ctx.globalAlpha = show;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(cx + 8, cy + 10, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The hour swept so far, shaded.
  if (turn > 0.002) {
    ctx.fillStyle = 'rgba(200,60,50,0.28)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r * 0.86, -Math.PI / 2, -Math.PI / 2 + turn * Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r0 = i % 3 ? 0.78 : 0.68;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * r0, cy + Math.sin(a) * r * r0);
    ctx.lineTo(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
    ctx.stroke();
  }
  const hand = (a: number, len: number, w: number): void => {
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  };
  hand(-Math.PI / 2 + ((2 + turn) / 12) * Math.PI * 2, r * 0.45, 8);
  hand(-Math.PI / 2 + turn * Math.PI * 2, r * 0.74, 5);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** "60 ft" and "18 m" under the whale, on a bar from its snout to its flukes. */
function drawSizeBar(ctx: CanvasRenderingContext2D, t: number): void {
  const show = sizeBarAt(t);
  if (show <= 0) return;
  const w = chaseWhaleAt(t);
  const grow = ramp(wrap(t), SIXTY_AT - 0.08, SIXTY_AT + 0.3);
  const half = (WHALE_LEN / 2) * grow;
  const y = SIZE_BAR_Y;
  ctx.save();
  ctx.globalAlpha = show;
  ctx.lineCap = 'round';
  for (const [colour, width] of [['#061224', 14], [PAPER, 6]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(w.x - half, y);
    ctx.lineTo(w.x + half, y);
    ctx.moveTo(w.x - half, y - 22);
    ctx.lineTo(w.x - half, y + 22);
    ctx.moveTo(w.x + half, y - 22);
    ctx.lineTo(w.x + half, y + 22);
    ctx.stroke();
  }
  ctx.restore();
  const pop = 0.7 + 0.3 * ramp(wrap(t), SIXTY_AT, SIXTY_AT + 0.2);
  drawTextLine(ctx, '60 ft', VIDEO.width / 2, TEXT.sizeFt.y, TEXT.sizeFt.size * pop, 700, show, LABEL_INK);
  drawTextLine(ctx, '18 m', VIDEO.width / 2, TEXT.sizeM.y, TEXT.sizeM.size * pop, 700, show * 0.9, LABEL_INK);
}

export function drawChase(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  const u = wrap(t);
  const tired = ramp(u, HOUR_FOR_AT, HOUR_FOR_AT + 1);
  const k = killAt(t);
  const top = mixRgb(mixRgb(CHASE_TOP, TIRED_TOP, tired), KILL_TOP, k);
  const mid = mixRgb(mixRgb(CHASE_MID, TIRED_MID, tired), KILL_MID, k);
  drawWater(ctx, sheet, top, mid, mixRgb(CHASE_BOTTOM, KILL_BOTTOM, k));
  drawRays(ctx, t, 0.9 - 0.3 * tired - 0.5 * k, SURFACE_Y - 40, '205,228,245', 1500);
  const w = chaseWhaleAt(t);
  drawSnow(ctx, t, '#dfe8ff', 0.8, 0, 0, w.tail * 60);
  drawSurfaceBand(ctx, t, k);
  const jolt = shakeAt(t);
  ctx.save();
  ctx.translate(jolt.x, jolt.y);
  drawPod(ctx, t, false);
  drawBlueWhale(ctx, w.x, w.y, WHALE_LEN, w.angle, t, { tail: w.tail, gape: 0.04 * k });
  drawPod(ctx, t, true);
  drawBoat(ctx, t);
  ctx.restore();
  drawSizeBar(ctx, t);
  drawVignette(ctx, 0.5 + 0.35 * k, '6,2,10');
  wash(ctx, 'multiply', css([150, 70, 110]), 0.45 * k);
  // A dark pulse on "KILL".
  const hit = Math.max(0, 1 - Math.abs(u - KILL_AT - 0.05) / 0.25);
  wash(ctx, 'multiply', '#1a0612', 0.5 * hit);
  drawClock(ctx, t);
}

// ---------------------------------------------------------------- the biggest prey on Earth

const PREY_TOP: Rgb = [60, 128, 176];
const PREY_MID: Rgb = [22, 70, 118];

/** A little Earth: blue sea, two pale continents, an inked rim, a shine. */
function drawEarth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.15 * Math.sin(cycles(2, t)));
  ctx.fillStyle = '#2f6fa8';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#8fbf6e';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  const land = (pts: readonly Pt[]): void => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x * r, p.y * r) : ctx.moveTo(p.x * r, p.y * r)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  land([{ x: -0.7, y: -0.55 }, { x: -0.2, y: -0.75 }, { x: 0.05, y: -0.4 }, { x: -0.25, y: -0.1 }, { x: -0.15, y: 0.45 }, { x: -0.45, y: 0.6 }, { x: -0.6, y: 0.1 }, { x: -0.85, y: -0.15 }]);
  land([{ x: 0.25, y: -0.2 }, { x: 0.7, y: -0.35 }, { x: 0.95, y: 0.05 }, { x: 0.6, y: 0.35 }, { x: 0.45, y: 0.75 }, { x: 0.25, y: 0.3 }]);
  const shade = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  shade.addColorStop(0, 'rgba(255,255,255,0.25)');
  shade.addColorStop(0.6, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,10,30,0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPrey(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  const u = wrap(t);
  drawWater(ctx, sheet, PREY_TOP, PREY_MID, [6, 22, 46]);
  drawRays(ctx, t, 1.2, -150, '230,240,250', 1900);
  drawSnow(ctx, t, '#e8f0ff', 0.7, 0, 0, u * 40);
  // A slow pull back: the whale filling the frame, and more of it.
  const z = 1.12 - 0.12 * ramp(u, BIGGEST_AT - 0.4, EARTH_AT + 0.4);
  ctx.save();
  ctx.translate(540, 840);
  ctx.scale(z, z);
  ctx.translate(-540, -840);
  drawBlueWhale(ctx, 520, 820, 1300, -0.1 + 0.02 * Math.sin(cycles(3, t)), t, { tail: cycles(11, t) });
  drawOrca(ctx, 830, 1060, ORCA_LEN * 0.9, -0.1, t, { tail: cycles(28, t), jaw: 0.1 });
  ctx.restore();
  const e = earthAt(t);
  if (e > 0) {
    const s = u - EARTH_AT + 0.1;
    const pop = s < 0.3 ? 0.4 + 0.6 * ramp(s, 0, 0.3) + 0.15 * Math.sin(ramp(s, 0, 0.3) * Math.PI) : 1;
    ctx.save();
    ctx.globalAlpha = e;
    drawEarth(ctx, 540, 450, 95 * pop, t);
    ctx.restore();
  }
  drawVignette(ctx, 0.4);
}
