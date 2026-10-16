import { ellipse, INK, type Pt } from '../../../src/art/pen';
import { PAPER_FILL } from '../../../src/art/fish/kit';
import { drawTextLine } from '../captions';
import { arc, livePen, RED, roundRect } from './ink';
import { HOUR } from './story';

/**
 * The lab's two timekeepers, in lab coordinates: the clock with its one
 * paying hour, and the tear-off calendar flipping through the months; and
 * the ding's starburst at the feeder.
 */

export const CLOCK = { x: 815, y: 410, r: 104 } as const;
export const CALENDAR = { x: 262, y: 432, w: 240, h: 262 } as const;
const GOLD = '#f2c14e';

/** Pops up from nothing, overshooting a little (the pen sets its own alpha, so it scales rather than fades). */
function popIn(ctx: CanvasRenderingContext2D, x: number, y: number, shown: number): void {
  const s = shown * (1 + 0.18 * Math.sin(Math.PI * shown));
  ctx.translate(x, y);
  ctx.scale(s, s);
}

/** Clock angle of a time in hours (12 a turn), radians from 3 o'clock, y down. */
const angleOf = (h: number): number => (h / 12) * Math.PI * 2 - Math.PI / 2;

/**
 * The clock, `shown` 0 .. 1 (it pops up), its hour shaded `shade` 0 .. 1 of
 * the way round, glowing while the hand `h` is in it.
 */
export function drawClock(ctx: CanvasRenderingContext2D, boil: number, shown: number, shade: number, h: number, lit: boolean): void {
  if (shown <= 0.01) return;
  const pen = livePen(ctx, 41, boil);
  const { x, y, r } = CLOCK;
  ctx.save();
  popIn(ctx, x, y, shown);
  ctx.translate(-x, -y);
  // The case, its shadow, and the face.
  pen.fill(ellipse(x + 8, y + 10, r + 12, r + 12, 40), '#2a2a30', 0.18);
  pen.fill(ellipse(x, y, r + 12, r + 12, 40), '#3a3f47', 1);
  pen.fill(ellipse(x - 6, y - 6, r + 4, r + 4, 40), '#5a616b', 0.6);
  pen.fill(ellipse(x, y, r, r, 40), PAPER_FILL, 1);
  pen.stroke([...ellipse(x, y, r + 12, r + 12, 40), { x: x + r + 12, y }], 2.8);
  pen.stroke([...ellipse(x, y, r, r, 40), { x: x + r, y }], 1.8, INK, 0.9, false);
  // The paying hour: a wedge of gold wash, hatched, that sweeps open on "one hour".
  if (shade > 0) {
    const a0 = angleOf(HOUR.from);
    const a1 = a0 + (angleOf(HOUR.to) - a0) * shade;
    const wedge: Pt[] = [{ x, y }, ...arc(x, y, r - 3, r - 3, a0, a1, 10)];
    pen.fill(wedge, GOLD, lit ? 0.95 : 0.6);
    pen.clipped(wedge, () => {
      for (let k = -r; k < r; k += 9) pen.hair([{ x: x + k, y: y - r }, { x: x + k + r, y: y + r }], 1, '#b07a1c', 0.5);
    });
    pen.stroke([...wedge, wedge[0]!], 2, '#8a5a12', 1, false);
  }
  // Hour ticks and numbers.
  for (let i = 0; i < 12; i++) {
    const a = angleOf(i);
    const major = i % 3 === 0;
    const r0 = r * (major ? 0.8 : 0.86);
    pen.hair([{ x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0 }, { x: x + Math.cos(a) * r * 0.95, y: y + Math.sin(a) * r * 0.95 }], major ? 3 : 1.6, INK, 1);
  }
  for (const [n, v] of [['12', 0], ['3', 3], ['6', 6], ['9', 9]] as const) {
    const a = angleOf(v);
    drawTextLine(ctx, n, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62 + 14, 42, 700, 1, { fill: INK, halo: PAPER_FILL });
  }
  // The one hand, an arrow, with a counterweight tail.
  const a = angleOf(h);
  const dir = { x: Math.cos(a), y: Math.sin(a) };
  const tip = { x: x + dir.x * r * 0.84, y: y + dir.y * r * 0.84 };
  pen.stroke([{ x: x - dir.x * r * 0.2, y: y - dir.y * r * 0.2 }, tip], 6, INK, 1, false);
  const side = { x: -dir.y, y: dir.x };
  const head = [tip, { x: tip.x - dir.x * 26 + side.x * 12, y: tip.y - dir.y * 26 + side.y * 12 }, { x: tip.x - dir.x * 26 - side.x * 12, y: tip.y - dir.y * 26 - side.y * 12 }];
  pen.fill(head, INK, 1);
  pen.fill(ellipse(x, y, 10, 10, 12), RED, 1);
  pen.stroke([...ellipse(x, y, 10, 10, 12), { x: x + 10, y }], 1.8, INK, 1, false);
  ctx.restore();
}

/** One calendar page: a red band with the month, and the days' grid. */
function drawPage(ctx: CanvasRenderingContext2D, boil: number, month: string, seed: number): void {
  const pen = livePen(ctx, seed, boil);
  const { x, y, w, h } = CALENDAR;
  const left = x - w / 2;
  const top = y - h / 2 + 22;
  const page = roundRect(left, top, w, h - 22, 8);
  pen.fill(page, PAPER_FILL, 1);
  const band = [{ x: left, y: top }, { x: left + w, y: top }, { x: left + w, y: top + 78 }, { x: left, y: top + 78 }];
  pen.fill(band, RED, 0.92);
  pen.stroke([...page, page[0]!], 2.6);
  drawTextLine(ctx, month, x, top + 64, 70, 700, 1, { fill: PAPER_FILL, halo: RED });
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const cx = left + 22 + col * 34;
      const cy = top + 104 + row * 30;
      pen.hair([{ x: cx - 9, y: cy }, { x: cx + 9, y: cy }], 2.2, INK, row === 0 && col < 2 ? 0.2 : 0.55);
    }
  }
}

/**
 * The calendar, `shown` 0 .. 1, on `month` (an index into `months`), with the
 * page over it lifting up and over its rings by `flip` 0 .. 1 if one is.
 */
export function drawCalendar(ctx: CanvasRenderingContext2D, boil: number, shown: number, months: readonly string[], month: number, flip: number | null): void {
  if (shown <= 0.01) return;
  const { x, y, w, h } = CALENDAR;
  const top = y - h / 2 + 22;
  ctx.save();
  popIn(ctx, x, y, shown);
  ctx.translate(-x, -y);
  const pen = livePen(ctx, 42, boil);
  // The board behind the pages, and its shadow.
  const board = roundRect(x - w / 2 - 14, y - h / 2 + 6, w + 28, h + 8, 10);
  pen.fill(roundRect(x - w / 2 - 6, y - h / 2 + 16, w + 28, h + 8, 10), '#2a2a30', 0.16);
  pen.fill(board, '#8a6a4a', 1);
  pen.stroke([...board, board[0]!], 2.4);
  drawPage(ctx, boil, months[Math.min(months.length - 1, month + (flip === null ? 0 : 1))]!, 43);
  if (flip !== null) {
    // The old page swinging up about the rings: foreshortened, then its blank back.
    const k = Math.cos(Math.PI * flip);
    ctx.save();
    ctx.translate(0, top);
    ctx.scale(1, k);
    ctx.translate(0, -top);
    if (k > 0) drawPage(ctx, boil, months[month]!, 44);
    else {
      const back = roundRect(x - w / 2, top, w, h - 22, 8);
      pen.fill(back, '#efe6d2', 1);
      pen.stroke([...back, back[0]!], 2.4);
    }
    ctx.restore();
  }
  // The rings binding the pages.
  for (let i = 0; i < 5; i++) {
    const rx = x - w / 2 + 30 + i * ((w - 60) / 4);
    pen.stroke(arc(rx, top, 9, 16, Math.PI * 0.95, Math.PI * 2.05, 10), 3.2, '#5b6770', 1, false);
  }
  ctx.restore();
}

/** The ding: rays bursting from a point and fading, `u` 0 .. 1 over its life. */
export function drawDing(ctx: CanvasRenderingContext2D, boil: number, at: Pt, u: number): void {
  const pen = livePen(ctx, 45, boil, 0.6);
  const fade = 1 - u;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const r0 = 26 + 50 * u;
    const r1 = r0 + 26 * (1 - u * 0.5);
    pen.stroke([{ x: at.x + Math.cos(a) * r0, y: at.y + Math.sin(a) * r0 }, { x: at.x + Math.cos(a) * r1, y: at.y + Math.sin(a) * r1 }], 4, i % 2 ? GOLD : RED, fade, false);
  }
}
