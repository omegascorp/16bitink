import { INK, PAPER, Pen } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { clamp01 } from '../short';
import { drawApple, drawNewton } from './newton';
import {
  ageCount, ageMarks, ageMode, BIRTH, CAMEO as NEWTON_CAMEO, birthPulse, LIFE, LOOP_S, NEWTON_BORN, newtonName, newtonPulse, pupsSince, RIBBON, ribbonShow, ribbonX, TODAY,
} from './story';

/**
 * The ribbon of history across the top of the picture: the years from 1550
 * to today, the shark's life as a bar running back about 400 years to a
 * fuzzy, uncertain start, and Newton's cameo pinned at 1642, just after it.
 * Later its labels count the shark's age instead, up to its first pups.
 */

const CHALK = '#dcd6e6';
const LIFE_INK = '#bfe3ee';
const SPOKEN = '#f5c84a';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const GOLD_ON_INK: TextInk = { fill: SPOKEN, halo: '#05091a' };

/** Text with its left edge at x. */
export function drawTextLeft(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight: 500 | 700, alpha: number, ink: TextInk): void {
  ctx.save();
  ctx.font = `${weight} ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  drawTextLine(ctx, text, x + w / 2, y, size, weight, alpha, ink);
}

const Y = RIBBON.y;
const BAR = 13;
/** Where the shark's life fades in from: the uncertain years round its birth. */
const FUZZ_FROM = BIRTH - 55;
const FUZZ_TO = BIRTH + 45;
const ageX = (age: number): number => ribbonX(BIRTH + age);

/** Newton's cameo above the ribbon, pinned to 1642. */
const CAMEO = { ...NEWTON_CAMEO, x: ribbonX(NEWTON_BORN) } as const;

function drawAxis(ctx: CanvasRenderingContext2D, pen: Pen, alpha: number, ages: number): void {
  pen.stroke([{ x: RIBBON.left - 10, y: Y }, { x: RIBBON.right + 10, y: Y }], 3, CHALK, alpha, false);
  for (let year = 1550; year <= 2000; year += 50) {
    const x = ribbonX(year);
    const long = year % 100 === 0;
    pen.stroke([{ x, y: Y + BAR + 2 }, { x, y: Y + BAR + (long ? 16 : 8) }], long ? 3 : 2, CHALK, alpha * 0.9, false);
  }
  // The calendar's years make way before the ages come in, rather than crossing over.
  const calendar = alpha * clamp01(1 - 2 * ages);
  for (let year = 1600; year <= 2000; year += 100) drawTextLine(ctx, String(year), ribbonX(year), Y + 66, 40, 700, calendar, PAPER_ON_INK);
}

/** The shark's life: a pale bar from its uncertain birth to today, fading in from the left. */
function drawLife(ctx: CanvasRenderingContext2D, pen: Pen, alpha: number, pulse: number, bracket: number): void {
  const [x0, x1, x2] = [ribbonX(FUZZ_FROM), ribbonX(FUZZ_TO), ribbonX(TODAY)];
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(191,227,238,0)');
  g.addColorStop(1, `rgba(191,227,238,${(0.9).toFixed(2)})`);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x0, Y - BAR, x1 - x0, BAR * 2);
  ctx.fillStyle = LIFE_INK;
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillRect(x1, Y - BAR, x2 - x1, BAR * 2);
  ctx.restore();
  // Hatching across the fuzzy start: nobody knows the year.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, Y - BAR, x1 - x0 + 20, BAR * 2);
  ctx.clip();
  for (let x = x0 - 30; x < x1 + 20; x += 9) pen.hair([{ x, y: Y + BAR }, { x: x + 18, y: Y - BAR }], 1.4, INK, alpha * 0.45 * clamp01((x - x0) / (x1 - x0)));
  ctx.restore();
  // Its outline, fading out over the uncertain start like the bar.
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const [a, b] = [x0 + ((x1 - x0) * i) / steps, x0 + ((x1 - x0) * (i + 1)) / steps];
    const fade = alpha * 0.9 * ((i + 0.5) / steps);
    pen.hair([{ x: a, y: Y - BAR }, { x: b, y: Y - BAR }], 2.2, INK, fade);
    pen.hair([{ x: a, y: Y + BAR }, { x: b, y: Y + BAR }], 2.2, INK, fade);
  }
  pen.stroke([{ x: x1, y: Y - BAR }, { x: x2, y: Y - BAR }, { x: x2, y: Y + BAR }, { x: x1, y: Y + BAR }], 2.2, INK, alpha * 0.9, false);
  // "?" over its start, swelling as the narrator says "born".
  drawTextLine(ctx, '?', ribbonX(BIRTH - 30), Y - 26, 58 * (1 + 0.35 * pulse), 700, alpha, pulse > 0.05 ? GOLD_ON_INK : PAPER_ON_INK);
  // Today, at its right end.
  drawTextLine(ctx, 'today', x2 - 18, Y - 26, 40, 700, alpha * (1 - bracket), PAPER_ON_INK);
}

/** A bracket over the whole of its life, for the "≈ 400 years" stamp to sit on: drawn out from the middle as the stamp lands. */
function drawLifeBracket(ctx: CanvasRenderingContext2D, pen: Pen, alpha: number): void {
  if (alpha <= 0) return;
  const [a, b] = [ribbonX(BIRTH), ribbonX(TODAY)];
  const y = Y - BAR - 22;
  const mid = (a + b) / 2;
  const left = mid - (mid - a) * alpha;
  const right = mid + (b - mid) * alpha;
  const hook = 12 * alpha;
  pen.stroke([{ x: left, y: y + hook }, { x: left + 10, y }, { x: mid - 16, y }, { x: mid, y: y - 10 }], 3, SPOKEN, alpha, false);
  pen.stroke([{ x: right, y: y + hook }, { x: right - 10, y }, { x: mid + 16, y }, { x: mid, y: y - 10 }], 3, SPOKEN, alpha, false);
}

/** Newton's cameo, its pin down to 1642, his name, and the apple. */
function drawNewtonPin(ctx: CanvasRenderingContext2D, pen: Pen, t: number, boil: number, alpha: number): void {
  const pulse = newtonPulse(t);
  const x = CAMEO.x;
  const bottom = CAMEO.y + CAMEO.h * 0.5;
  ctx.save();
  ctx.setLineDash([7, 7]);
  pen.stroke([{ x, y: bottom + 4 }, { x, y: Y - BAR - 4 }], 2.4, CHALK, alpha, false);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pulse > 0.05 ? SPOKEN : PAPER;
  ctx.beginPath();
  ctx.arc(x, Y, 9 + 4 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  drawNewton(ctx, x, CAMEO.y, CAMEO.h, pulse, boil, alpha);
  // The apple drops a little and back, three times a loop.
  const drop = 8 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S);
  drawApple(ctx, x + 92, CAMEO.y - 34 + drop, 19, boil, alpha);
  const name = alpha * newtonName(t);
  const ink = pulse > 0.05 ? GOLD_ON_INK : PAPER_ON_INK;
  drawTextLeft(ctx, 'Isaac Newton', x + 124, CAMEO.y + 8, 60, 700, name, ink);
  drawTextLeft(ctx, 'born 1642', x + 126, CAMEO.y + 62, 50, 700, name, PAPER_ON_INK);
}

/** The age labels, a playhead counting up the years, and the first pups at 150. */
function drawAges(ctx: CanvasRenderingContext2D, pen: Pen, t: number, alpha: number, ages: number): void {
  const labels = alpha * clamp01(2 * ages - 1);
  for (let age = 0; age <= LIFE; age += 100) drawTextLine(ctx, String(age), ageX(age), Y + 66, 40, 700, labels, PAPER_ON_INK);
  drawTextLeft(ctx, 'age', RIBBON.left - 6, Y + 66, 36, 500, labels * 0.8, PAPER_ON_INK);
  const marks = alpha * ageMarks(t);
  if (marks <= 0) return;
  const age = ageCount(t);
  const x = ageX(age);
  // The years without pups, tinted as the playhead passes.
  ctx.save();
  ctx.globalAlpha = marks * 0.75;
  ctx.fillStyle = SPOKEN;
  ctx.fillRect(ageX(0), Y - BAR, x - ageX(0), BAR * 2);
  ctx.restore();
  pen.stroke([{ x, y: Y - BAR - 14 }, { x, y: Y + BAR + 14 }], 4, SPOKEN, marks, false);
  const since = pupsSince(t);
  const landed = since >= 0;
  const pop = landed ? 1 + 0.4 * Math.exp(-since * 8) * Math.sin(since * 24) : 1;
  drawTextLine(ctx, String(Math.round(age)), x, Y + 128, 68 * pop, 700, marks, GOLD_ON_INK);
  if (landed) {
    const u = clamp01(since / 0.25);
    drawTextLine(ctx, 'first pups', x, Y + 186, 52, 700, marks * u, GOLD_ON_INK);
  }
}

/** The ribbon of history, at time t. `stampLanded` (0 .. 1) hands its "this shark" label over to the stamp. */
export function drawRibbon(ctx: CanvasRenderingContext2D, t: number, boil: number, stampLanded: number): void {
  const alpha = ribbonShow(t);
  if (alpha <= 0) return;
  const ages = ageMode(t);
  const pen = new Pen(ctx, 2026 + boil * 17, 0.9);
  drawAxis(ctx, pen, alpha, ages);
  drawLife(ctx, pen, alpha, birthPulse(t), stampLanded);
  drawTextLine(ctx, 'this shark', ribbonX(1880), Y - 26, 46, 700, alpha * (1 - stampLanded), PAPER_ON_INK);
  drawLifeBracket(ctx, pen, alpha * stampLanded);
  drawNewtonPin(ctx, pen, t, boil, alpha);
  drawAges(ctx, pen, t, alpha, ages);
}
