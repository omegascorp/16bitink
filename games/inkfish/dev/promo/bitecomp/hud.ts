import { INK, PAPER } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { FRAME } from '../descent/frame';
import { clamp01, smooth } from '../short';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { kgLabel, lbLabel, SPECIES, STATUS_COLOUR, type Animal, type Status } from './species';
import { READOUT } from './stage';
import { BITES, LADDER, T, type Bite } from './timeline';

/**
 * What's written over the lab: the readout's counter (bottom centre, in
 * pounds of force with newtons under it, racing up on every bite), the
 * MEASURED / ESTIMATED stamp beside it, the everyday-weight line under it,
 * the name card (top left) and the ladder along the top, which gets each
 * animal's little head and number as it lands.
 */

const W = FRAME.width;
const LB_TO_N = 4.448;

/** The bite the counter is showing at t: the latest one that has chomped. */
function shownBite(t: number): { readonly bite: Bite; readonly from: number } | null {
  let out: { bite: Bite; from: number } | null = null;
  let prev = 0;
  for (const b of BITES) {
    if (t < b.at) {
      // A fresh start (the line-up from you, the piranha) shows 0 while the head slides in.
      if (b.fromZero && t >= b.arrive && b.arrive > 0) return { bite: b, from: 0 };
      break;
    }
    out = { bite: b, from: b.fromZero ? 0 : prev };
    prev = SPECIES[b.animal].lb;
  }
  return out;
}

/** The counter at t: the number shown (pounds) and how far it is through its climb (1 = landed). */
export function counterAt(t: number): { readonly bite: Bite; readonly lb: number; readonly roll: number } | null {
  const s = shownBite(t);
  if (!s) return null;
  const { bite, from } = s;
  if (t < bite.at) return { bite, lb: 0, roll: 0 };
  const roll = clamp01((t - bite.at) / Math.max(0.5, bite.land - bite.at));
  const eased = 1 - (1 - roll) ** 2.4;
  return { bite, lb: from + (SPECIES[bite.animal].lb - from) * eased, roll };
}

/** The readout: a dark panel with the number in yellow and the newtons under it. */
export function drawReadout(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const c = counterAt(t);
  const r = READOUT;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#14191d';
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 22);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#59636b';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  if (!c) {
    drawText(ctx, '0 lb', { x: W / 2, y: r.y + 128, size: 140, maxWidth: r.w - 60 }, 700, alpha * 0.5, YELLOW_ON_INK);
    return;
  }
  const sp = SPECIES[c.bite.animal];
  const landed = c.roll >= 1;
  const pop = landed ? 1 + 0.16 * Math.max(0, 1 - (t - c.bite.land) / 0.25) : 1;
  ctx.save();
  ctx.translate(W / 2, r.y + 128);
  ctx.scale(pop, pop);
  drawText(ctx, landed ? lbLabel(sp.lb, sp.approx) : lbLabel(c.lb), { x: 0, y: 0, size: 140, maxWidth: r.w - 60 }, 700, alpha, YELLOW_ON_INK);
  ctx.restore();
  const n = landed ? sp.newtons : `${(Math.round((c.lb * LB_TO_N) / 10) * 10).toLocaleString('en-US')} N`;
  const kg = landed ? kgLabel(sp.lb, sp.approx) : kgLabel(c.lb);
  drawText(ctx, `${kg} · ${n} of force`, { x: W / 2, y: r.y + 186, size: 50, maxWidth: r.w - 80 }, 500, alpha * (landed ? 1 : 0.6), PAPER_ON_INK);
}

// ---------------------------------------------------------------- stamps

export function drawStamp(ctx: CanvasRenderingContext2D, label: Status | 'RECORD', x: number, y: number, size: number, since: number, alpha: number, tilt = -0.12): void {
  if (since < 0 || alpha <= 0) return;
  const k = 1 + 0.8 * (1 - smooth(since / 0.16));
  const a = alpha * clamp01(since / 0.06);
  const colour = STATUS_COLOUR[label];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(k, k);
  ctx.globalAlpha = a;
  ctx.font = `700 ${size}px sans-serif`;
  const w = ctx.measureText(label).width + size * 0.9;
  const h = size * 1.45;
  ctx.fillStyle = label === 'RECORD' ? colour : 'rgba(255,255,255,0.88)';
  ctx.strokeStyle = label === 'RECORD' ? '#7a5a00' : colour;
  ctx.lineWidth = size * 0.13;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, size * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + size * 0.16, -h / 2 + size * 0.16, w - size * 0.32, h - size * 0.32, size * 0.12);
  ctx.stroke();
  ctx.fillStyle = label === 'RECORD' ? '#2b1d00' : colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, size * 0.05);
  ctx.restore();
}

/** The stamp beside the readout for the bite on show; the croc's gold RECORD on "the strongest bite ever measured". */
export function drawStamps(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  const c = shownBite(t);
  if (c && t >= c.bite.at) {
    // Lifted as the next head slides in, so a stamp never sits beside the wrong name.
    const next = BITES[BITES.indexOf(c.bite) + 1];
    const lift = next ? 1 - smooth((t - next.arrive) / 0.3) : 1;
    drawStamp(ctx, SPECIES[c.bite.animal].status, 1520, 890, 58, t - c.bite.stamp, alpha * lift);
  }
  const record = BITES.find((b) => b.animal === 'saltCroc' && !b.preview)!;
  if (t < record.leave + 0.5) drawStamp(ctx, 'RECORD', 400, 890, 66, t - T.strongest, alpha * (1 - smooth((t - record.leave) / 0.4)), 0.1);
}

/** The line under the readout: only the everyday weights (and asides) the narration says. */
const LINES: readonly { readonly at: number; readonly until: number; readonly text: string }[] = [
  { at: T.person, until: T.jaguar, text: '= a person standing on one tooth' },
  { at: T.average, until: T.lion, text: 'the average of the 22 dogs: just 58 lb (26 kg)' },
  { at: T.smallCar, until: T.record, text: '= the weight of a small car' },
  { at: T.higher, until: T.elephant, text: 'some studies go even higher' },
  { at: T.elephant + 0.8, until: T.megalodon, text: '= an elephant on one tooth' },
  { at: T.tenTimes, until: T.forSizeTwist, text: '≈ 10 × the great white' },
];

export function drawLine(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  for (const l of LINES) {
    const a = alpha * smooth((t - l.at) / 0.25) * (1 - smooth((t - l.until + 0.3) / 0.3));
    if (a > 0) drawText(ctx, l.text, { x: W / 2, y: 1056, size: 54, maxWidth: 1100 }, 700, a, PAPER_ON_INK);
  }
}

// ---------------------------------------------------------------- the name card

export function drawNameCard(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  for (const b of BITES) {
    const a = alpha * smooth((t - b.arrive - 0.5) / 0.3) * (1 - smooth((t - b.leave) / 0.3));
    if (a <= 0) continue;
    const sp = SPECIES[b.animal];
    const note = b.preview ? 'the record' : sp.note;
    drawCard(ctx, 40, LADDER_H + 20, 700, 132, a);
    drawText(ctx, sp.name, { x: 66, y: LADDER_H + 82, size: 62, maxWidth: 650, left: true }, 700, a, INK_ON_PAPER);
    drawText(ctx, note, { x: 68, y: LADDER_H + 132, size: 40, maxWidth: 650, left: true }, 500, a, INK_ON_PAPER);
  }
}

// ---------------------------------------------------------------- the ladder

const SLOT = W / LADDER.length;
/** The ladder's dark strip: each head, its pounds, and its kilograms under them. */
export const LADDER_H = 168;
const ICON = { w: 168, h: 82, x: 146, y: 52, size: 56 } as const;
const icons = new Map<Animal, HTMLCanvasElement>();

/** Each animal's little head for the ladder, drawn once. */
export function iconOf(a: Animal): HTMLCanvasElement {
  let c = icons.get(a);
  if (!c) {
    c = document.createElement('canvas');
    c.width = ICON.w;
    c.height = ICON.h;
    const x = c.getContext('2d')!;
    const size = a === 'megalodon' ? ICON.size * 0.9 : ICON.size;
    SPECIES[a].draw(x, { x: ICON.x, y: ICON.y, size, jaw: 0, t: 0 });
    icons.set(a, c);
  }
  return c;
}

const ladderInk = (s: Status): TextInk => ({ fill: s === 'MEASURED' ? '#7ee08f' : '#ffc14d', halo: '#0b0f12' });

/** When the ladder is shown at all: from "let's start with you" to the twist's line-up. */
export const ladderAlpha = (t: number): number => smooth((t - T.startYou) / 0.5) * (1 - smooth((t - T.forSizeTwist) / 0.5));

export function drawLadder(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(16,20,24,0.86)';
  ctx.fillRect(0, 0, W, LADDER_H);
  ctx.restore();
  LADDER.forEach((b, i) => {
    const x = i * SLOT;
    const on = smooth((t - b.land) / 0.3);
    if (on <= 0) {
      drawTextLine(ctx, '?', x + SLOT / 2, 92, 64, 700, alpha * 0.35, { fill: PAPER, halo: INK });
      return;
    }
    const sp = SPECIES[b.animal];
    const k = 1 + 0.4 * (1 - on);
    ctx.save();
    ctx.globalAlpha = alpha * on;
    ctx.translate(x + SLOT / 2, 50);
    ctx.scale(k, k);
    ctx.drawImage(iconOf(b.animal), -ICON.w / 2 + 6, -ICON.h / 2 - 2);
    ctx.restore();
    drawTextLine(ctx, lbLabel(sp.lb, sp.approx), x + SLOT / 2, 126, 40, 700, alpha * on, ladderInk(sp.status));
    drawTextLine(ctx, kgLabel(sp.lb, sp.approx), x + SLOT / 2, 158, 28, 500, alpha * on * 0.85, { fill: PAPER, halo: INK });
  });
}
