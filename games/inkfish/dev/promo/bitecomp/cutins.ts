import { INK, PAPER } from '../../../src/art/pen';
import { FRAME } from '../descent/frame';
import { clamp01, smooth, window01 } from '../short';
import { drawCard, drawPop, drawText, INK_ON_PAPER, PAPER_ON_INK, RED_ON_PAPER, YELLOW_ON_INK } from '../swallowyou/text';
import { drawHandSilhouette, drawPiranhaInHandIcon } from './art/handIcon';
import { drawCar, drawElephant, drawFang, drawFishShape, drawMolar, drawShell, drawStickPerson } from './shapes';
import { drawStamp } from './hud';
import { SPECIES } from './species';
import { said, T } from './timeline';

/**
 * The cut-ins script.md's "On screen" notes ask for: the psi lists crossed
 * out, MEASURED vs ESTIMATED, the fish in a hand (the open loop), the 22
 * dogs, the sharks "for their weight", the croc's taped snout; and the
 * small insets beside the bar: a person on one tooth, the turtle's shell,
 * the small car, the elephant on one tooth.
 *
 * `full` cut-ins replace the lab, `over` ones sit on it dimmed, `inset` ones
 * sit in a card at the right while the lab plays on.
 */

const W = FRAME.width;
const H = FRAME.height;

export interface Cut {
  readonly from: number;
  readonly to: number;
  readonly kind: 'full' | 'over' | 'inset';
  draw(ctx: CanvasRenderingContext2D, t: number, alpha: number): void;
}

// ---------------------------------------------------------------- the psi lists

const ROWS: readonly (readonly [number, string])[] = [
  [0.7, '2,500 psi'], [0.55, '1,800 psi'], [0.8, '1,200 psi'], [0.5, '1,100 psi'], [0.65, '950 psi'],
  [0.6, '800 psi'], [0.75, '650 psi'], [0.45, '600 psi'], [0.7, '480 psi'], [0.55, '400 psi'],
];

/** A scribbled name: no animal is named, these are "the lists online". */
function scribble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, seed: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(27,26,31,0.55)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const px = x + (w * i) / 24;
    const py = y + 9 * Math.sin(i * 1.9 + seed) - 4;
    ctx[i ? 'lineTo' : 'moveTo'](px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPsi(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  ctx.fillStyle = '#2b3036';
  ctx.fillRect(0, 0, W, H);
  const card = { x: 360, y: 90, w: 1200, h: 900 };
  drawCard(ctx, card.x, card.y, card.w, card.h, a, '#fbf8f0');
  drawText(ctx, 'STRONGEST BITES EVER!!! (in psi)', { x: W / 2, y: card.y + 100, size: 76, maxWidth: card.w - 80 }, 700, a, INK_ON_PAPER);
  ctx.save();
  ctx.beginPath();
  ctx.rect(card.x, card.y + 140, card.w, card.h - 160);
  ctx.clip();
  const scroll = 40 * (t - T.online);
  ROWS.forEach(([w, psi], i) => {
    const y = card.y + 230 + i * 92 - scroll;
    drawText(ctx, `${i + 1}.`, { x: card.x + 70, y, size: 60, maxWidth: 80 }, 700, a, INK_ON_PAPER);
    scribble(ctx, card.x + 130, y - 18, 560 * w, i);
    drawText(ctx, psi, { x: card.x + card.w - 200, y, size: 62, maxWidth: 300 }, 700, a, INK_ON_PAPER);
    const cross = clamp01((t - T.psi - i * 0.1) / 0.18);
    if (cross > 0) {
      ctx.strokeStyle = '#d8312b';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(card.x + 50, y - 20);
      ctx.lineTo(card.x + 50 + (card.w - 100) * cross, y - 22 + 6 * Math.sin(i));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
  ctx.restore();
  drawPop(ctx, 'psi = pressure, not a bite force', W / 2, 600, 104, t, T.notBite - 0.2, T.today, RED_ON_PAPER, -0.05, 1500);
  drawText(ctx, 'bite numbers online', { x: 280, y: 70, size: 50, maxWidth: 460 }, 700, a * smooth((t - T.online) / 0.3), PAPER_ON_INK);
}

// ---------------------------------------------------------------- measured vs estimated

function drawRules(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  drawPop(ctx, 'ONLY REAL NUMBERS', W / 2, 300, 130, t, T.realNumbers - 0.1, T.forSize, YELLOW_ON_INK, 0, 1500);
  drawStamp(ctx, 'MEASURED', 600, 540, 96, t - T.measured, a, -0.08);
  drawText(ctx, 'a live animal bit a sensor', { x: 600, y: 700, size: 60, maxWidth: 700 }, 700, a * smooth((t - T.measured - 0.2) / 0.3), PAPER_ON_INK);
  drawStamp(ctx, 'ESTIMATED', 1320, 540, 96, t - T.estimate, a, 0.06);
  drawText(ctx, "a scientist's model", { x: 1320, y: 700, size: 60, maxWidth: 700 }, 700, a * smooth((t - T.estimate - 0.2) / 0.3), PAPER_ON_INK);
}

// ---------------------------------------------------------------- the fish in a hand

function fishInHand(caption: string, from: number) {
  return (ctx: CanvasRenderingContext2D, t: number, a: number): void => {
    const card = { x: 460, y: 170, w: 1000, h: 740 };
    drawCard(ctx, card.x, card.y, card.w, card.h, a, PAPER);
    ctx.save();
    ctx.globalAlpha = a;
    const bob = 6 * Math.sin((t - from) * 3);
    ctx.beginPath();
    ctx.rect(card.x, card.y, card.w, card.h);
    ctx.clip();
    // The whole piranha resting in a cupped hand: flat silhouettes, like the card's other icons.
    drawPiranhaInHandIcon(ctx, { x: 890, y: 735 + bob, size: 620, jaw: 0.4 * Math.max(0, Math.sin((t - from) * 2.2)) ** 6 });
    ctx.restore();
    drawPop(ctx, '?', 1290, 560, 300, t, from + 0.5, 1e9, RED_ON_PAPER, 0.12, 300);
    drawText(ctx, caption, { x: W / 2, y: card.y + 100, size: 70, maxWidth: card.w - 80 }, 700, a, INK_ON_PAPER);
  };
}

// ---------------------------------------------------------------- the 22 dogs

function drawDogs(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const card = { x: 110, y: 190, w: 1700, h: 600 };
  drawCard(ctx, card.x, card.y, card.w, card.h, a, PAPER);
  drawText(ctx, '22 pet dogs chewed a sensor', { x: W / 2, y: card.y + 90, size: 76, maxWidth: card.w - 80 }, 700, a, INK_ON_PAPER);
  const best = 7;
  const glow = smooth((t - T.hardest) / 0.3);
  for (let i = 0; i < 22; i++) {
    const col = i % 11;
    const row = Math.floor(i / 11);
    const x = card.x + 175 + col * 140;
    const y = card.y + 290 + row * 200;
    const on = smooth((t - T.researchers - 0.3 - i * 0.04) / 0.2);
    if (on <= 0) continue;
    if (i === best && glow > 0) {
      const g = ctx.createRadialGradient(x - 40, y - 10, 10, x - 40, y - 10, 110);
      g.addColorStop(0, `rgba(255,207,51,${0.85 * glow * a})`);
      g.addColorStop(1, 'rgba(255,207,51,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 160, y - 130, 240, 240);
    }
    ctx.save();
    ctx.globalAlpha = a * on * (i === best ? 1 : 1 - 0.45 * glow);
    SPECIES.dog.draw(ctx, { x: x + 10, y, size: 82, jaw: 0.25 + 0.25 * Math.sin(t * 9 + i), t });
    ctx.restore();
  }
  drawText(ctx, 'the hardest bite', { x: card.x + 175 + best * 140 - 30, y: card.y + 175, size: 46, maxWidth: 360 }, 700, a * glow, RED_ON_PAPER);
}

// ---------------------------------------------------------------- the sharks for their weight

function drawSharks(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const card = { x: 210, y: 170, w: 1500, h: 700 };
  drawCard(ctx, card.x, card.y, card.w, card.h, a, PAPER);
  drawText(ctx, 'bite for its weight: 13 sharks and rays compared', { x: W / 2, y: card.y + 90, size: 64, maxWidth: card.w - 80 }, 700, a, INK_ON_PAPER);
  const cols: readonly { readonly h: number; readonly who: 'other' | 'greatWhite' | 'bullShark' }[] = [
    { h: 0.32, who: 'other' }, { h: 0.4, who: 'other' }, { h: 0.47, who: 'greatWhite' }, { h: 0.53, who: 'other' }, { h: 0.6, who: 'other' }, { h: 1, who: 'bullShark' },
  ];
  const base = card.y + 560;
  const grow = smooth((t - T.forWeight - 0.2) / 0.9);
  const white = smooth((t - T.evenWhite) / 0.3);
  cols.forEach((c, i) => {
    const x = card.x + 170 + i * 235;
    const h = 330 * c.h * grow;
    const colour = c.who === 'bullShark' ? '#d8312b' : c.who === 'greatWhite' ? `rgba(31,63,138,${0.5 + 0.5 * white})` : '#9aa3aa';
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = colour;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(x - 60, base - h, 120, h);
    ctx.fill();
    ctx.stroke();
    if (c.who === 'other') drawFishShape(ctx, x, base + 60, 130, '#9aa3aa');
    else SPECIES[c.who].draw(ctx, { x: x + 55, y: base + 70, size: 80, jaw: 0, t });
    ctx.restore();
  });
  drawText(ctx, 'BULL SHARK', { x: card.x + 170 + 5 * 235, y: base - 350, size: 56, maxWidth: 300 }, 700, a * grow, RED_ON_PAPER);
  drawText(ctx, 'great white', { x: card.x + 170 + 2 * 235, y: base - 180, size: 50, maxWidth: 260 }, 700, a * white, INK_ON_PAPER);
}

// ---------------------------------------------------------------- the taped snout

function drawTaping(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const card = { x: 210, y: 170, w: 1500, h: 720 };
  drawCard(ctx, card.x, card.y, card.w, card.h, a, PAPER);
  const size = 520;
  const bx = 1080;
  const by = 560;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.rect(card.x, card.y, card.w, card.h);
  ctx.clip();
  const tug = window01(t, T.open, T.weaker + 0.6, 0.3) * 0.12;
  SPECIES.saltCroc.draw(ctx, { x: bx, y: by, size, jaw: tug, t });
  // The tape, wound round the snout on "tape".
  const wrap = smooth((t - T.tape) / 0.5);
  if (wrap > 0) {
    ctx.fillStyle = '#e9e6dc';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    for (let k = 0; k < 2; k++) {
      ctx.save();
      ctx.translate(bx - 40 - k * 40, by - 10);
      ctx.rotate(0.12);
      ctx.beginPath();
      ctx.rect(-16, -120 * wrap, 32, 200 * wrap);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // The handler's hand, palm down over the snout, the arm reaching in from above.
    drawHandSilhouette(ctx, { x: bx - 30, y: by - 66, size: 340, angle: 0.55, flipY: true, curl: 0.7 });
  }
  ctx.restore();
  drawText(ctx, 'CLOSING muscles: huge', { x: 640, y: card.y + 110, size: 64, maxWidth: 760 }, 700, a * smooth((t - T.funny) / 0.3), RED_ON_PAPER);
  drawText(ctx, 'OPENING muscles: far weaker', { x: 640, y: card.y + 650, size: 64, maxWidth: 760 }, 700, a * smooth((t - T.open) / 0.3), INK_ON_PAPER);
  drawText(ctx, 'so handlers tape them shut', { x: 1300, y: card.y + 110, size: 56, maxWidth: 700 }, 700, a * smooth((t - T.tape) / 0.3), INK_ON_PAPER);
}

// ---------------------------------------------------------------- the insets

const INSET = { x: 1470, y: 160, w: 410, h: 440 } as const;

function inset(draw: (ctx: CanvasRenderingContext2D, t: number, a: number) => void, caption: string) {
  return (ctx: CanvasRenderingContext2D, t: number, a: number): void => {
    drawCard(ctx, INSET.x, INSET.y, INSET.w, INSET.h, a, PAPER);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.rect(INSET.x, INSET.y, INSET.w, INSET.h);
    ctx.clip();
    draw(ctx, t, a);
    ctx.restore();
    drawText(ctx, caption, { x: INSET.x + INSET.w / 2, y: INSET.y + INSET.h - 30, size: 46, maxWidth: INSET.w - 40 }, 700, a, INK_ON_PAPER);
  };
}

const cx = INSET.x + INSET.w / 2;

const personOnTooth = inset((ctx, t) => {
  drawMolar(ctx, cx, 340, 170);
  drawStickPerson(ctx, cx, 330, 150, Math.sin(t * 5));
}, 'a whole person, on one tooth');

const turtle = inset((ctx, t) => {
  const crack = smooth((t - T.shellWord) / 0.3);
  drawShell(ctx, cx, 430, 300, crack);
  drawFang(ctx, cx, 190 + 70 * smooth((t - T.shellWord + 0.3) / 0.3), 70);
}, "cracks a turtle's shell");

const car = inset((ctx) => {
  ctx.fillStyle = '#6c767e';
  ctx.fillRect(cx - 170, 440, 340, 24);
  drawCar(ctx, cx, 440, 330);
}, '≈ a small car');

const elephant = inset((ctx) => {
  drawFang(ctx, cx, 600, -150);
  drawElephant(ctx, cx - 10, 400, 250);
}, 'an elephant, on one tooth');

// ---------------------------------------------------------------- the list

const s = (word: string, after: number): number => said(word, after);

export const CUTS: readonly Cut[] = [
  { from: T.online - 0.15, to: T.today - 0.1, kind: 'full', draw: drawPsi },
  { from: T.today - 0.05, to: T.forSize - 0.15, kind: 'over', draw: drawRules },
  { from: T.forSize - 0.1, to: T.startYou - 0.3, kind: 'over', draw: fishInHand('the strongest bite for its size?', T.forSize) },
  { from: T.person - 0.1, to: T.jaguar - 0.2, kind: 'inset', draw: personOnTooth },
  { from: T.shell - 0.1, to: T.dog, kind: 'inset', draw: turtle },
  { from: T.researchers - 0.1, to: s('three hundred', T.hardest) - 0.6, kind: 'over', draw: drawDogs },
  { from: T.forWeight - 0.1, to: T.alligator - 0.5, kind: 'over', draw: drawSharks },
  { from: T.smallCar - 0.1, to: T.record - 0.1, kind: 'inset', draw: car },
  { from: T.funny - 0.05, to: T.remember - 0.1, kind: 'over', draw: drawTaping },
  { from: T.remember - 0.05, to: T.huge - 0.3, kind: 'over', draw: fishInHand('remember this fish?', T.remember) },
  { from: T.elephant + 0.7, to: T.megalodon - 0.1, kind: 'inset', draw: elephant },
];

/** The cut-ins on at t, each with its fade. */
export function cutsAt(t: number): readonly { readonly cut: Cut; readonly alpha: number }[] {
  return CUTS.filter((c) => t >= c.from && t < c.to).map((cut) => ({ cut, alpha: window01(t, cut.from, cut.to, 0.25) }));
}
