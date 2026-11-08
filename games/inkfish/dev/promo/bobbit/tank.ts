import { INK, Pen, type Pt as PenPt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { clamp01, VIDEO } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { wash } from './mood';
import { TEXT } from './script';
import { barryAt, BARRY_SIZE, NOTCH, roomToScreen, tagPlacement, tankCamAt } from './barry';
import { coralFallAt, cycles, flagAt, laughAt, pagesAt, type Pt, tagAt, wrap } from './story';
import { bodyLine, drawBody, drawHead } from './worm';

/**
 * "One like it hid in an English aquarium for months. They named him
 * Barry.": a warm, cosy room drawn like a cartoon: a big tank on a wooden
 * stand, a toppled coral, a Union Jack pinned up, a calendar shedding its
 * pages. Two antennae twitch in a crack in the rock; then the camera rushes
 * in and Barry peeks out with a name tag, clacking his jaws at us.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'] as const;
const CAL = { x: 130, y: 300, w: 270, h: 330 } as const;
const TANK = { x: 80, y: 650, w: 920, h: 520 } as const;

export interface TankCast {
  readonly room: readonly HTMLCanvasElement[];
  readonly clown: Sprite;
}

/** The room, the stand and the tank's still parts, baked once a boil frame. */
function makeRoom(f: number): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const pen = new Pen(ctx, 8100 + f * 977, 1.5);
  const rng = createRng(8200 + f);
  // A warm wall with faint stripes, a skirting board, the floor.
  wash(ctx, 'multiply', 'rgb(255,226,170)', 0.55);
  for (let x = 40; x < VIDEO.width; x += 90) pen.hair([{ x, y: 0 }, { x: x + 4, y: 1500 }], 2, '#b98d5a', 0.25);
  pen.fill([{ x: 0, y: 1500 }, { x: VIDEO.width, y: 1500 }, { x: VIDEO.width, y: VIDEO.height }, { x: 0, y: VIDEO.height }], '#8a6240', 0.85);
  pen.stroke([{ x: 0, y: 1500 }, { x: VIDEO.width, y: 1500 }], 3);
  // The stand: a wooden cabinet.
  const stand: PenPt[] = [{ x: 60, y: 1180 }, { x: 1020, y: 1180 }, { x: 1010, y: 1560 }, { x: 70, y: 1560 }];
  pen.fill(stand, '#9a6a3c', 1);
  for (let i = 0; i < 7; i++) pen.hair([{ x: 70, y: 1215 + i * 52 }, { x: 1010, y: 1212 + i * 52 + rng() * 6 }], 1.6, '#4a2e18', 0.5);
  pen.closed(stand, 3.2);
  pen.stroke([{ x: 540, y: 1200 }, { x: 540, y: 1550 }], 2.6);
  // The tank's water and gravel.
  const glass: PenPt[] = [{ x: TANK.x, y: TANK.y }, { x: TANK.x + TANK.w, y: TANK.y }, { x: TANK.x + TANK.w, y: TANK.y + TANK.h }, { x: TANK.x, y: TANK.y + TANK.h }];
  const g = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h);
  g.addColorStop(0, '#5fb8c4');
  g.addColorStop(1, '#2c7f93');
  ctx.fillStyle = g;
  ctx.fillRect(TANK.x, TANK.y, TANK.w, TANK.h);
  for (let i = 0; i < 900; i++) {
    const x = TANK.x + rng() * TANK.w;
    const y = TANK.y + TANK.h - 70 + rng() * 70;
    ctx.fillStyle = ['#d9c39a', '#a88a62', '#efe2c4', '#7a644a'][i % 4]!;
    ctx.beginPath();
    ctx.arc(x, y, 3 + rng() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.hair(Array.from({ length: 20 }, (_, i) => ({ x: TANK.x + (i / 19) * TANK.w, y: TANK.y + TANK.h - 72 + 6 * Math.sin(i * 1.4) })), 2, INK, 0.6);
  // A standing coral at the left, and the stump of the one that's been snipped.
  const coral = new Pen(ctx, 8300 + f * 977, 1.3);
  branch(coral, { x: 230, y: TANK.y + TANK.h - 50 }, -Math.PI / 2, 150, 3);
  coral.stroke([{ x: 430, y: TANK.y + TANK.h - 50 }, { x: 434, y: TANK.y + TANK.h - 92 }], 16, '#e0707a');
  coral.stroke([{ x: 422, y: TANK.y + TANK.h - 92 }, { x: 446, y: TANK.y + TANK.h - 96 }], 3);
  // The glass's frame, lid and glare.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const [x0, w] of [[160, 70], [260, 26], [820, 50]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, TANK.y + 40);
    ctx.lineTo(x0 + w, TANK.y + 40);
    ctx.lineTo(x0 + w - 120, TANK.y + TANK.h - 90);
    ctx.lineTo(x0 - 120, TANK.y + TANK.h - 90);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  pen.fill([{ x: TANK.x - 14, y: TANK.y - 26 }, { x: TANK.x + TANK.w + 14, y: TANK.y - 26 }, { x: TANK.x + TANK.w + 14, y: TANK.y + 6 }, { x: TANK.x - 14, y: TANK.y + 6 }], '#2b2a30', 1);
  pen.closed(glass, 5);
  pen.stroke([{ x: TANK.x, y: TANK.y + 40 }, { x: TANK.x + TANK.w, y: TANK.y + 40 }], 1.5, '#e8f6f8');
  // The calendar's nail and backing card.
  pen.dot(CAL.x + CAL.w / 2, CAL.y - 14, 6);
  return canvas;
}

/** A branching coral, drawn recursively from its base. */
function branch(pen: Pen, from: PenPt, angle: number, len: number, depth: number): void {
  const to = { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len };
  pen.stroke([from, { x: (from.x + to.x) / 2 + 6, y: (from.y + to.y) / 2 }, to], 4 + depth * 5, '#e0707a');
  pen.stroke([from, to], 2.2);
  if (depth <= 0) return;
  branch(pen, to, angle - 0.5, len * 0.66, depth - 1);
  branch(pen, to, angle + 0.45, len * 0.62, depth - 1);
}

export function makeTank(): TankCast {
  return { room: Array.from({ length: BOIL_FRAMES }, (_, f) => makeRoom(f)), clown: makeSprite('clownfish', 2) };
}

function drawTag(ctx: CanvasRenderingContext2D, t: number, amount: number): void {
  if (amount <= 0.01) return;
  const p = tagPlacement(t);
  const s = p.size * (1 + 0.3 * Math.sin(Math.PI * amount) * (1 - amount));
  const w = s * 3.4;
  const h = s * 1.55;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.translate(p.x, p.y - s * 0.32);
  ctx.rotate(-0.08);
  ctx.fillStyle = '#fbf6ea';
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.06;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.62, w, h, s * 0.18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d6453b';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.62, w, h * 0.3, [s * 0.18, s * 0.18, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#fbf6ea';
  ctx.font = `700 ${s * 0.32}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('HELLO, my name is', 0, -h * 0.4);
  ctx.restore();
  drawTextLine(ctx, 'BARRY', p.x, p.y + s * 0.18, s, 700, amount, { fill: INK, halo: '#fbf6ea' });
}

function drawCalendar(ctx: CanvasRenderingContext2D, t: number, pen: Pen): void {
  const pages = pagesAt(t);
  const page = (name: string, x: number, y: number, angle: number, alpha: number): void => {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + CAL.w / 2, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(-CAL.w / 2, 0, CAL.w, CAL.h);
    ctx.fillStyle = '#d6453b';
    ctx.fillRect(-CAL.w / 2, 0, CAL.w, 70);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(-CAL.w / 2, 0, CAL.w, CAL.h);
    ctx.lineWidth = 1.4;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) ctx.strokeRect(-CAL.w / 2 + 20 + c * 39, 200 + r * 24, 32, 18);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + CAL.w / 2, y);
    ctx.rotate(angle);
    drawTextLine(ctx, name, 0, TEXT.month.y - CAL.y, TEXT.month.size, 700, 1);
    ctx.restore();
  };
  page(MONTHS[Math.min(MONTHS.length - 1, Math.floor(pages))]!, CAL.x, CAL.y, 0, 1);
  // Torn-off pages flying away.
  for (let i = 0; i < Math.ceil(pages) && i < MONTHS.length - 1; i++) {
    const p = pages - i;
    if (p <= 0 || p > 1.4) continue;
    page(MONTHS[i]!, CAL.x + 520 * p, CAL.y - 160 * p + 260 * p * p, 1.6 * p * (i % 2 ? -1 : 1), 1 - p / 1.4);
  }
  // The rings at the top.
  for (let i = 0; i < 4; i++) pen.circle(CAL.x + 50 + i * 57, CAL.y + 4, 9, 2.6);
}

/** The Union Jack, pinned to the wall, popping up on "English". */
function drawFlag(ctx: CanvasRenderingContext2D, pop: number, pen: Pen): void {
  if (pop <= 0.01) return;
  const s = pop + 0.25 * Math.sin(Math.PI * pop) * (1 - pop) * 4;
  const w = 250;
  const h = 150;
  ctx.save();
  ctx.translate(830, 420);
  ctx.rotate(0.06);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.clip();
  ctx.fillStyle = '#1f3c7a';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const diag = (width: number, colour: string): void => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.moveTo(w / 2, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.stroke();
  };
  diag(30, '#fbf6ea');
  diag(10, '#c8323a');
  ctx.fillStyle = '#fbf6ea';
  ctx.fillRect(-w / 2, -24, w, 48);
  ctx.fillRect(-24, -h / 2, 48, h);
  ctx.fillStyle = '#c8323a';
  ctx.fillRect(-w / 2, -14, w, 28);
  ctx.fillRect(-14, -h / 2, 28, h);
  ctx.restore();
  ctx.save();
  ctx.translate(830, 420);
  ctx.rotate(0.06);
  ctx.scale(s, s);
  pen.closed([{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }], 3);
  pen.dot(-w / 2 + 10, -h / 2 + 10, 6, '#c8323a');
  pen.dot(w / 2 - 10, -h / 2 + 10, 6, '#c8323a');
  ctx.restore();
}

/** The rock with the crack: its back, then (after Barry) its front lip. */
const ROCK_BACK: readonly PenPt[] = [
  { x: 520, y: 1110 }, { x: 540, y: 980 }, { x: 590, y: 900 }, { x: 650, y: 880 }, { x: 700, y: 870 }, { x: 760, y: 880 }, { x: 820, y: 900 }, { x: 880, y: 960 },
  { x: 910, y: 1110 },
];
const ROCK_FRONT: readonly PenPt[] = [
  { x: 520, y: 1110 }, { x: 530, y: 1000 }, { x: 570, y: 930 }, { x: 640, y: 905 }, { x: 670, y: 920 }, { x: 700, y: 930 }, { x: 735, y: 920 }, { x: 765, y: 906 },
  { x: 830, y: 920 }, { x: 890, y: 980 }, { x: 910, y: 1110 },
];

function drawRock(ctx: CanvasRenderingContext2D, shape: readonly PenPt[], pen: Pen, light: string): void {
  pen.fill(shape, light, 1);
  pen.hatch(shape, 9, 0.9, 1.2, { alpha: 0.35 });
  pen.closed(shape, 3.4);
}

function drawSparkles(ctx: CanvasRenderingContext2D, centre: Pt, amount: number, t: number): void {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.fillStyle = '#ffe28a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + cycles(1, t);
    const r = 250 + 60 * Math.sin(i * 2.3 + cycles(6, t));
    const x = centre.x + Math.cos(a) * r;
    const y = centre.y + Math.sin(a) * r * 0.75;
    const s = (18 + 10 * Math.sin(cycles(9, t) + i)) * amount;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const rr = k % 2 === 0 ? s : s * 0.3;
      const ang = (k / 8) * Math.PI * 2;
      if (k === 0) ctx.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
      else ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTank(ctx: CanvasRenderingContext2D, cast: TankCast, t: number, boil: number): void {
  const cam = tankCamAt(t);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.save();
  ctx.translate(cam.at.x, cam.at.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.focus.x, -cam.focus.y);
  ctx.drawImage(cast.room[boil]!, 0, 0);
  const pen = new Pen(ctx, 8500 + boil * 1013, 1.3);
  drawCalendar(ctx, t, pen);
  drawFlag(ctx, flagAt(t), new Pen(ctx, 8600 + boil * 1013, 1.2));
  // A clownfish, nervous, keeping well clear of the rock.
  const u = wrap(t);
  const swim = Math.sin(u * 1.3);
  drawSwimmer(ctx, cast.clown, { j: 0, age: 0, shape: 'clownfish', x: 300 + 120 * swim, y: 800 + 20 * Math.sin(u * 2.1), length: 110, facing: Math.cos(u * 1.3) >= 0 ? 1 : -1, tilt: 0, beat: u * 12, effort: 0.4 }, boil);
  // The snipped coral branch toppling.
  const fall = coralFallAt(t);
  ctx.save();
  ctx.translate(434, TANK.y + TANK.h - 92);
  ctx.rotate(fall * 1.35);
  const coral = new Pen(ctx, 8700 + boil * 1013, 1.2);
  branch(coral, { x: 0, y: 0 }, -Math.PI / 2, 95, 2);
  ctx.restore();
  // Bubbles from the air stone.
  ctx.save();
  ctx.strokeStyle = 'rgba(240,250,255,0.8)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) {
    const y = TANK.y + TANK.h - 70 - (((u * 260 + i * 57) % 460));
    ctx.beginPath();
    ctx.arc(950 + 8 * Math.sin(u * 7 + i), y, 6 + (i % 3) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // The rock, and Barry in his crack.
  const rock = new Pen(ctx, 8800 + boil * 1013, 1.3);
  drawRock(ctx, ROCK_BACK, rock, '#6f6a70');
  const b = barryAt(t);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, VIDEO.width, NOTCH.y + 18);
  ctx.clip();
  drawBody(ctx, bodyLine(b, { x: NOTCH.x, y: NOTCH.y + 20 }, 80, BARRY_SIZE), BARRY_SIZE, t, boil, 5);
  drawHead(ctx, b, BARRY_SIZE, t, boil, 'all', 5);
  ctx.restore();
  drawRock(ctx, ROCK_FRONT, new Pen(ctx, 8900 + boil * 1013, 1.3), '#8a8489');
  ctx.restore();
  // Laughter: a warm pink glow, sparkles round his head, his name tag.
  const laugh = laughAt(t);
  wash(ctx, 'soft-light', 'rgb(255,150,190)', 0.4 * laugh);
  drawSparkles(ctx, roomToScreen(cam, b.head), laugh, t);
  drawTag(ctx, t, tagAt(t));
  // The rush into the dark crack at the end.
  const dive = clamp01((cam.zoom - 2.8) / 3.5);
  wash(ctx, 'source-over', '#000', dive ** 0.7);
}
