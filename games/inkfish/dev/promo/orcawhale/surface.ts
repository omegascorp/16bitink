import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { drawTextLine, INK_ON_PAPER } from '../captions';
import { lerp, ramp, VIDEO } from '../short';
import { TEXT } from './script';
import { drawVignette } from './sea';
import { AUSTRALIA_AT, cycles, placeAt, POD_AT, wrap } from './story';

/**
 * "Australia, 2019.": cut wide to the open sea at the surface under a low grey
 * sky (tension): far off a blow and the whale's back, black fins closing in on
 * it; a little ink map of Australia with a pin at Bremer Bay, and the label.
 */

const HORIZON = 980;
const SKY_TOP = '#5d6b78';
const SKY_LOW = '#a7b1b6';
const SEA_TOP = '#4c6168';
const SEA_LOW = '#1a2a33';

/** Australia's coast, [longitude, latitude], rough but recognisable; and Tasmania. */
const MAINLAND: readonly (readonly [number, number])[] = [
  [113.6, -22.0], [114.2, -26.3], [115.0, -29.5], [115.7, -31.8], [115.0, -34.3], [117.9, -35.1], [119.4, -34.4], [123.6, -33.9],
  [126.0, -32.3], [129.0, -31.6], [131.2, -31.5], [134.2, -32.9], [135.9, -34.8], [137.7, -33.0], [138.0, -35.6], [139.6, -37.0],
  [140.9, -38.1], [143.5, -38.8], [144.9, -37.9], [146.3, -39.1], [148.0, -37.8], [149.9, -37.5], [150.9, -34.4], [151.3, -33.8],
  [152.5, -32.4], [153.6, -28.6], [153.1, -26.0], [152.9, -25.3], [151.0, -23.5], [149.4, -21.3], [146.8, -19.2], [145.4, -16.4],
  [145.3, -14.9], [143.6, -14.3], [142.5, -10.7], [141.6, -12.9], [141.5, -15.5], [140.8, -17.5], [139.3, -17.4], [137.7, -16.2],
  [135.9, -15.0], [136.7, -12.3], [135.3, -12.0], [132.6, -11.5], [131.0, -12.2], [130.1, -13.0], [129.4, -14.9], [128.1, -15.0],
  [126.0, -14.1], [124.4, -15.5], [122.2, -17.3], [121.1, -19.4], [118.8, -20.3], [116.7, -20.6], [114.6, -21.8],
];
const TASMANIA: readonly (readonly [number, number])[] = [[144.6, -40.7], [148.3, -40.9], [148.3, -42.2], [147.0, -43.6], [145.2, -42.2]];
/** Bremer Bay, Western Australia. */
const BREMER: readonly [number, number] = [119.4, -34.4];

/** The map card: its middle, and px per degree. */
export const MAP = { x: 560, y: 520, w: 520, h: 490, scale: 9, mid: [133.5, -24] as const } as const;
const project = ([lon, lat]: readonly [number, number], at: Pt, k: number): Pt => ({
  x: at.x + (lon - MAP.mid[0]) * MAP.scale * k,
  y: at.y - 70 - (lat - MAP.mid[1]) * MAP.scale * k * 1.1,
});

function inkPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], wobble: number): void {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const w = wobble * Math.sin(i * 2.3);
    if (i) ctx.lineTo(p.x + w, p.y - w);
    else ctx.moveTo(p.x, p.y);
  });
  ctx.closePath();
}

/** The card pops in with a little overshoot, tilted like a photo pinned to the picture. */
function drawMap(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const show = placeAt(t);
  if (show <= 0) return;
  const s = wrap(t) - AUSTRALIA_AT + 0.05;
  const pop = s < 0.35 ? 0.7 + 0.3 * Math.sin((Math.min(1, s / 0.35) * Math.PI) / 2) + 0.12 * Math.sin(Math.min(1, s / 0.35) * Math.PI) : 1;
  ctx.save();
  ctx.globalAlpha = show;
  ctx.translate(MAP.x, MAP.y);
  ctx.rotate(0.05);
  ctx.scale(pop, pop);
  // The card: paper with a soft shadow and a hand-inked edge.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-MAP.w / 2 + 14, -MAP.h / 2 + 16, MAP.w, MAP.h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(-MAP.w / 2, -MAP.h / 2, MAP.w, MAP.h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(-MAP.w / 2 + 2, -MAP.h / 2 + 2, MAP.w - 4, MAP.h - 4);
  // Faint sea hatching round the coast.
  ctx.strokeStyle = 'rgba(40,70,100,0.22)';
  ctx.lineWidth = 2;
  for (let y = -MAP.h / 2 + 24; y < MAP.h / 2 - 10; y += 22) {
    ctx.beginPath();
    ctx.moveTo(-MAP.w / 2 + 16, y);
    ctx.lineTo(MAP.w / 2 - 16, y + 6);
    ctx.stroke();
  }
  const o = { x: 0, y: 0 };
  const wob = 0.8 + 0.4 * boil;
  for (const coast of [MAINLAND, TASMANIA]) {
    const pts = coast.map((p) => project(p, o, 1));
    inkPath(ctx, pts, wob);
    ctx.fillStyle = '#d9c9a2';
    ctx.fill();
    ctx.fillStyle = 'rgba(120,90,50,0.18)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  // The pin at Bremer Bay, dropping in and pulsing.
  const pin = project(BREMER, o, 1);
  const drop = 1 - ramp(s, 0.1, 0.4);
  const pulse = 0.5 + 0.5 * Math.sin(cycles(26, t));
  ctx.strokeStyle = `rgba(200,40,40,${(0.5 * pulse).toFixed(3)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pin.x, pin.y, 14 + 12 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  const py = pin.y - 80 * drop;
  ctx.fillStyle = '#c8332f';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pin.x, py);
  ctx.bezierCurveTo(pin.x - 26, py - 30, pin.x - 18, py - 58, pin.x, py - 58);
  ctx.bezierCurveTo(pin.x + 18, py - 58, pin.x + 26, py - 30, pin.x, py);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(pin.x, py - 38, 7, 0, Math.PI * 2);
  ctx.fill();
  // The label, written on the card under the map.
  drawTextLine(ctx, 'Australia, 2019', 0, TEXT.place.y - MAP.y, TEXT.place.size, 700, 1, INK_ON_PAPER);
  ctx.restore();
}

/** Swells: inked crests in rows, smaller towards the horizon, rolling in whole cycles a loop. */
function drawSwell(ctx: CanvasRenderingContext2D, t: number, push: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < 16; r++) {
    const d = r / 15;
    const y = HORIZON + 8 + (VIDEO.height - HORIZON) * d ** 1.8 * (1 + 0.15 * push);
    const amp = 2 + 16 * d * d;
    const wave = 30 + 260 * d;
    ctx.strokeStyle = `rgba(214,226,230,${(0.2 + 0.4 * d).toFixed(3)})`;
    ctx.lineWidth = 1 + 3 * d;
    ctx.beginPath();
    for (let x = -20; x <= VIDEO.width + 20; x += 12) {
      const yy = y + amp * Math.sin(x / wave * 2 * Math.PI + cycles(6, t) + r * 1.3);
      if (x === -20) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    ctx.strokeStyle = `rgba(6,14,20,${(0.2 + 0.35 * d).toFixed(3)})`;
    ctx.lineWidth = 2 + 6 * d;
    ctx.stroke();
  }
  ctx.restore();
}

/** Far off: the blue whale's long back and its blow; the orcas' fins closing on it from the right. */
function drawFarAction(ctx: CanvasRenderingContext2D, t: number): void {
  const u = wrap(t);
  const k = ramp(u, AUSTRALIA_AT - 0.6, POD_AT);
  const bx = 300;
  const by = HORIZON + 40;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.7, 1.7);
  ctx.translate(-bx, -by);
  // The blow: a misty plume rising and drifting.
  const blow = ramp(u, AUSTRALIA_AT - 0.3, AUSTRALIA_AT + 0.6);
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const h = blow * (40 + i * 9);
    const g = ctx.createRadialGradient(bx + 30 + i * 2.2, by - h, 0, bx + 30 + i * 2.2, by - h, 18 + i * 3);
    g.addColorStop(0, `rgba(235,240,242,${(0.22 * blow * (1 - i / 16)).toFixed(3)})`);
    g.addColorStop(1, 'rgba(235,240,242,0)');
    ctx.fillStyle = g;
    ctx.fillRect(bx - 60, by - h - 80, 200, 160);
  }
  // The back: a long low hump, the little dorsal fin far back.
  ctx.fillStyle = '#25343e';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx - 150, by + 6);
  ctx.quadraticCurveTo(bx - 20, by - 26 - 4 * Math.sin(cycles(4, t)), bx + 120, by + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx - 100, by - 10);
  ctx.lineTo(bx - 112, by - 22);
  ctx.lineTo(bx - 120, by - 6);
  ctx.fill();
  // The fins: tall black triangles cutting in from the right.
  const fins = [{ x: 700, y: 10, h: 60 }, { x: 610, y: 26, h: 70 }, { x: 760, y: 38, h: 76 }, { x: 540, y: 6, h: 50 }, { x: 660, y: 48, h: 84 }];
  fins.forEach((f, i) => {
    const x = lerp(f.x + 80, f.x - 200, k) + 8 * Math.sin(cycles(5, t) + i);
    const y = HORIZON + f.y + 3 * Math.sin(cycles(7, t) + i * 2);
    const h = f.h * (0.92 + 0.08 * Math.sin(cycles(5, t) + i));
    ctx.fillStyle = '#0d1116';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.3, y);
    ctx.quadraticCurveTo(x - h * 0.1, y - h * 0.6, x - h * 0.05, y - h);
    ctx.quadraticCurveTo(x + h * 0.12, y - h * 0.4, x + h * 0.32, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // A white wake curling off each fin.
    ctx.strokeStyle = 'rgba(235,240,242,0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + h * 0.34, y + 2);
    ctx.quadraticCurveTo(x + h * 0.8, y + 6, x + h * 1.3, y + 1);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
  });
  ctx.restore();
  ctx.restore();
}

export function drawSurface(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, boil: number): void {
  const u = wrap(t);
  const push = ramp(u, AUSTRALIA_AT - 0.6, POD_AT);
  ctx.drawImage(sheet, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_LOW);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, HORIZON);
  const sea = ctx.createLinearGradient(0, HORIZON, 0, VIDEO.height);
  sea.addColorStop(0, SEA_TOP);
  sea.addColorStop(1, SEA_LOW);
  ctx.fillStyle = sea;
  ctx.fillRect(0, HORIZON, VIDEO.width, VIDEO.height - HORIZON);
  ctx.globalAlpha = 1;
  // Low cloud: soft dark bands drifting.
  for (let i = 0; i < 5; i++) {
    const y = 140 + i * 130;
    const x = ((i * 310 + 40 * cycles(1, t)) % 1400) - 200;
    const g = ctx.createRadialGradient(x, y, 10, x, y, 360);
    g.addColorStop(0, 'rgba(60,70,80,0.28)');
    g.addColorStop(1, 'rgba(60,70,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 380, y - 200, 760, 400);
  }
  // The slow push in towards the action.
  ctx.save();
  const z = 1 + 0.08 * push;
  ctx.translate(VIDEO.width / 2, HORIZON);
  ctx.scale(z, z);
  ctx.translate(-VIDEO.width / 2, -HORIZON);
  ctx.strokeStyle = 'rgba(30,40,46,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-100, HORIZON);
  ctx.lineTo(VIDEO.width + 100, HORIZON);
  ctx.stroke();
  drawSwell(ctx, t, push);
  drawFarAction(ctx, t);
  ctx.restore();
  drawVignette(ctx, 0.5, '8,12,16');
  drawMap(ctx, t, boil);
}
