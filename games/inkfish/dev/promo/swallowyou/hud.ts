import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT } from '../captions';
import { clamp01, smooth } from '../short';
import { createRng } from '../../../src/logic/rng';
import { iconOf } from './cast';
import {
  BAR_PX, type Camera, CARD, CARD_PPI, GAUGE, H, NAME_CARD, RING_AT, rulerTicks, SHOULDERS_LABEL, slotOf, slotStampAt, STAMP_CARD, type Stage, STAGES,
  tapeAt, testAt, toScreen, W,
} from './layout';
import { SHOULDERS_IN, SPECIES } from './species';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, RED, YELLOW } from './text';
import { ANIMALS, type Animal, T } from './timeline';

/**
 * What's written over the stage: the name card (top left), the size ruler
 * (along the bottom, feet with metres under, the tape running out to the
 * animal's length), the stamp card (top right: eight mouths, each stamped
 * with its verdict), the shoulder gauge under it, and the shoulder test's
 * card with its ring, its bar and its stamp.
 */

// ---------------------------------------------------------------- stamps

const stamps = new Map<string, HTMLCanvasElement>();

/** A rubber stamp's print: a double border round the word, ink worn off in specks. Cached per word and colour. */
function stampCanvas(text: string, colour: string): HTMLCanvasElement {
  const key = `${text}|${colour}`;
  const hit = stamps.get(key);
  if (hit) return hit;
  const size = 150;
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = Math.ceil(probe.measureText(text).width + size * 0.9);
  const h = Math.ceil(size * 1.25);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d')!;
  c.strokeStyle = colour;
  c.fillStyle = colour;
  c.lineWidth = 12;
  c.beginPath();
  c.roundRect(8, 8, w - 16, h - 16, 22);
  c.stroke();
  c.lineWidth = 4;
  c.beginPath();
  c.roundRect(24, 24, w - 48, h - 48, 14);
  c.stroke();
  c.font = `700 ${size}px ${CAPTION_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, w / 2, h / 2 + size * 0.06);
  // Worn ink: specks and streaks knocked out.
  c.globalCompositeOperation = 'destination-out';
  const rng = createRng(text.length * 97 + colour.length);
  for (let i = 0; i < 260; i++) {
    c.globalAlpha = 0.25 + rng() * 0.6;
    c.beginPath();
    c.arc(rng() * w, rng() * h, 1 + rng() * 4.5, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < 6; i++) {
    c.globalAlpha = 0.25;
    c.fillRect(rng() * w, rng() * h, 30 + rng() * 80, 2 + rng() * 3);
  }
  stamps.set(key, canvas);
  return canvas;
}

/**
 * A stamp `height` px tall centred at (x, y), turned `angle`. `thump` is the
 * landing: 0 not yet, above 1 still coming down (bigger, fainter), 1 landed.
 */
export function drawStamp(ctx: CanvasRenderingContext2D, text: string, colour: string, x: number, y: number, height: number, angle: number, thump: number, alpha = 1): void {
  if (thump <= 0 || alpha <= 0) return;
  const c = stampCanvas(text, colour);
  const k = (height / c.height) * thump;
  ctx.save();
  ctx.globalAlpha = alpha * clamp01(2.2 - thump);
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(k, k);
  // A dark halo so a yellow stamp reads on paper and a red one on dark water.
  ctx.shadowColor = colour === RED ? 'rgba(255,240,220,0.65)' : 'rgba(20,12,0,0.85)';
  ctx.shadowBlur = 10 / k;
  ctx.drawImage(c, -c.width / 2, -c.height / 2);
  ctx.restore();
}

const verdictColour = (a: Animal): string => (SPECIES[a].verdict === 'COULD' ? YELLOW : RED);

// ---------------------------------------------------------------- the name card

/** The animal's name, its size in feet and pounds, metric under: slid in from the left on its name. */
export function drawNameCard(ctx: CanvasRenderingContext2D, s: Stage, t: number): void {
  const show = Math.min(smooth((t - s.name) / 0.35), 1 - smooth((t - s.end + 0.5) / 0.4));
  if (show <= 0) return;
  const sp = SPECIES[s.animal];
  const dx = -60 * (1 - show);
  ctx.save();
  ctx.translate(dx, 0);
  drawText(ctx, sp.name, NAME_CARD.name, 700, show, PAPER_ON_INK);
  drawText(ctx, sp.us, NAME_CARD.us, 700, show * smooth((t - s.name - 0.25) / 0.3), { fill: YELLOW, halo: '#140d02' });
  drawText(ctx, sp.metric, NAME_CARD.metric, 500, 0.9 * show * smooth((t - s.name - 0.4) / 0.3), PAPER_ON_INK);
  ctx.restore();
}

// ---------------------------------------------------------------- the ruler

const metres = (ft: number): string => {
  const m = ft * 0.3048;
  return m < 10 ? `${(Math.round(m * 10) / 10).toString()} m` : `${Math.round(m)} m`;
};

/** The ruler along the ground: ticks from the snout back, the tape run out to `tape` feet, and the length marked at its end. */
export function drawRuler(ctx: CanvasRenderingContext2D, cam: Camera, s: Stage, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const L = SPECIES[s.animal].feet;
  const tape = tapeAt(s, t);
  const y = toScreen(cam, { x: 0, y: 0 }).y;
  if (y > H + 40) return;
  const x0 = toScreen(cam, { x: 0, y: 0 }).x;
  const xAt = (ft: number): number => toScreen(cam, { x: ft, y: 0 }).x;
  const xEnd = Math.min(W - 30, xAt(L + 2.6));
  ctx.save();
  ctx.globalAlpha = alpha;
  // The board: a paper strip under the tick marks.
  ctx.fillStyle = 'rgba(244,237,220,0.92)';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(Math.max(-20, x0 - 14), y, xEnd - x0 + 28, 70, 8);
  ctx.fill();
  ctx.stroke();
  // The tape, yellow, run out from the snout.
  if (tape > 0) {
    ctx.fillStyle = '#f2c53d';
    ctx.fillRect(x0, y + 3, xAt(tape) - x0, 14);
  }
  ctx.strokeStyle = INK;
  for (const tick of rulerTicks(cam.ppf, L + 2)) {
    const x = xAt(tick.ft);
    if (x > W - 20) break;
    ctx.lineWidth = tick.major ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + (tick.major ? 22 : 12));
    ctx.stroke();
  }
  ctx.restore();
  for (const tick of rulerTicks(cam.ppf, L + 2)) {
    if (!tick.major || tick.ft === 0 || tick.ft > L + 1) continue;
    const x = xAt(tick.ft);
    if (x > W - 90) break;
    drawText(ctx, `${tick.ft} ft`, { x, y: y + 47, size: 30, maxWidth: 130 }, 700, alpha * 0.95, INK_ON_PAPER);
    drawText(ctx, metres(tick.ft), { x, y: y + 68, size: 22, maxWidth: 130 }, 500, alpha * 0.8, INK_ON_PAPER);
  }
  // The previous animal's length, a faint mark for the stair-step.
  const i = STAGES.findIndex((x) => x.animal === s.animal);
  if (i > 0 && L - SPECIES[STAGES[i - 1]!.animal].feet > 2.5) {
    const prev = STAGES[i - 1]!.animal;
    const px = xAt(SPECIES[prev].feet);
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#7c8794';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(px, y - 60);
    ctx.lineTo(px, y);
    ctx.stroke();
    ctx.restore();
    drawText(ctx, `${SPECIES[prev].short} · ${SPECIES[prev].us.split(' · ')[0]!}`, { x: px, y: y - 70, size: 28, maxWidth: 300 }, 700, alpha * 0.75, PAPER_ON_INK);
  }
  // The length, marked where the tape stops.
  const done = smooth((t - s.measure - 1.0) / 0.4);
  if (tape > 0) {
    const xm = xAt(tape);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = RED;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xm, y + 2);
    ctx.lineTo(xm - 13, y - 22);
    ctx.lineTo(xm + 13, y - 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const label = done > 0 ? SPECIES[s.animal].us.split(' · ')[0]! : `${Math.round(tape)} ft`;
    const lx = Math.min(W - 140, Math.max(140, xm));
    drawText(ctx, label, { x: lx, y: y - 36, size: 50, maxWidth: 240 }, 700, alpha, { fill: YELLOW, halo: '#140d02' });
  }
}

// ---------------------------------------------------------------- the stamp card

/** The stamp card: eight mouths, each stamped as its verdict comes in. `grey` dims all but the last mouth (the cold open's "only ONE"). */
export function drawStampCard(
  ctx: CanvasRenderingContext2D, t: number, alpha: number, opts: { readonly x?: number; readonly y?: number; readonly scale?: number; readonly grey?: number; readonly mystery?: number; readonly neverHas?: number } = {},
): void {
  if (alpha <= 0) return;
  const k = opts.scale ?? 1;
  ctx.save();
  ctx.translate(opts.x ?? 0, opts.y ?? 0);
  ctx.translate(STAMP_CARD.x, STAMP_CARD.y);
  ctx.scale(k, k);
  ctx.translate(-STAMP_CARD.x, -STAMP_CARD.y);
  drawCard(ctx, STAMP_CARD.x, STAMP_CARD.y, STAMP_CARD.width, STAMP_CARD.height, alpha);
  drawText(ctx, 'COULD IT SWALLOW YOU?', { x: STAMP_CARD.x + STAMP_CARD.width / 2, y: STAMP_CARD.y + 36, size: 30, maxWidth: STAMP_CARD.width - 40 }, 700, alpha, INK_ON_PAPER);
  ANIMALS.forEach((a, i) => {
    const slot = slotOf(i);
    const icon = iconOf(a);
    const grey = opts.grey ?? 0;
    const dim = i === ANIMALS.length - 1 ? 0 : grey;
    const iw = slot.width - 10;
    const ih = (iw * icon.height) / icon.width;
    ctx.save();
    ctx.globalAlpha = alpha * (1 - 0.6 * dim);
    if (dim > 0) ctx.filter = `grayscale(${dim}) brightness(${1 + 0.4 * dim})`;
    if (i === ANIMALS.length - 1 && (opts.mystery ?? 0) > 0) ctx.filter = `brightness(${1 - 0.9 * (opts.mystery ?? 0)})`;
    ctx.drawImage(icon, slot.x + 5, slot.y + (slot.height - ih) / 2, iw, ih);
    ctx.restore();
    if ((opts.mystery ?? 0) > 0 && i === ANIMALS.length - 1) {
      drawText(ctx, '?', { x: slot.x + slot.width / 2, y: slot.y + slot.height * 0.72, size: 62, maxWidth: 80 }, 700, alpha * (opts.mystery ?? 0), { fill: YELLOW, halo: '#140d02' });
    }
    const st = slotStampAt(a, t);
    if (st > 0) {
      const thump = st >= 1 ? 1 : 1 + 0.8 * (1 - st);
      drawStamp(ctx, SPECIES[a].verdict, verdictColour(a), slot.x + slot.width / 2, slot.y + slot.height / 2 + 4, slot.height * (SPECIES[a].verdict === 'COULD' ? 0.62 : 0.7), -0.2, thump, alpha);
    }
  });
  if ((opts.neverHas ?? 0) > 0) {
    const last = slotOf(ANIMALS.length - 1);
    drawText(ctx, '…but never has', { x: last.x + last.width / 2 - 30, y: STAMP_CARD.y + STAMP_CARD.height + 34, size: 34, maxWidth: 260 }, 700, alpha * (opts.neverHas ?? 0), { fill: YELLOW, halo: '#140d02' });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the shoulder gauge and test

/** The yellow shoulder bar: `length` px, centred at (x, y). */
export function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, alpha: number, scaleY = 1): void {
  if (alpha <= 0) return;
  const h = Math.max(8, length * 0.075) * scaleY;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = YELLOW;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, h * 0.16);
  ctx.beginPath();
  ctx.roundRect(x - length / 2, y - h / 2, length, h, h / 2);
  ctx.fill();
  ctx.stroke();
  // Little end caps, like shoulders.
  ctx.fillStyle = '#e09a1a';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + side * (length / 2 - h * 0.5), y, h * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export { GAUGE };

export function drawGauge(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  drawBar(ctx, GAUGE.x, GAUGE.y, GAUGE.length, alpha);
  drawText(ctx, SHOULDERS_LABEL, { x: GAUGE.x, y: GAUGE.y + 44, size: 34, maxWidth: 460 }, 700, alpha * 0.95, PAPER_ON_INK);
}

/** The throat's width on the card at t (the whale shark's shrinks to four inches as it's said). */
export function throatAt(a: Animal, t: number): number {
  const sp = SPECIES[a];
  if (a !== 'whaleShark') return sp.throat;
  return 13 - (13 - sp.throat) * smooth((t - T.fourInches) / 0.7);
}

function ringPath(ctx: CanvasRenderingContext2D, rx: number, ry: number, from: number, to: number): void {
  ctx.beginPath();
  ctx.ellipse(RING_AT.x, RING_AT.y, rx, ry, 0, from, to);
}

/** The test card: the throat as a ring, the bar coming down on it, and the stamp. */
export function drawTestCard(ctx: CanvasRenderingContext2D, a: Animal, t: number): void {
  const st = testAt(a, t);
  if (st.show <= 0) return;
  const dx = (1 - st.show) * 760;
  ctx.save();
  ctx.translate(dx, 0);
  drawCard(ctx, CARD.x, CARD.y, CARD.width, CARD.height, 1);
  drawText(ctx, 'THE SHOULDER TEST', { x: CARD.x + CARD.width / 2, y: CARD.y + 54, size: 44, maxWidth: CARD.width - 60 }, 700, 1, INK_ON_PAPER);
  const rx = (throatAt(a, t) * CARD_PPI) / 2;
  const ry = rx * 0.62;
  // The throat: a dark hole with a fleshy rim, back half first.
  ctx.save();
  const g = ctx.createRadialGradient(RING_AT.x, RING_AT.y + ry * 0.3, 0, RING_AT.x, RING_AT.y, rx);
  g.addColorStop(0, '#050203');
  g.addColorStop(0.7, '#2a0d12');
  g.addColorStop(1, '#6a2630');
  ctx.fillStyle = g;
  ringPath(ctx, rx, ry, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a5525b';
  ctx.lineWidth = Math.max(6, rx * 0.14);
  ringPath(ctx, rx, ry, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // The bar: hovering, falling, landing on the rim (bouncing), or slipping through into the dark.
  const barY = RING_AT.y - st.lift;
  if (st.through > 0) {
    ctx.save();
    ringPath(ctx, rx, ry, 0, Math.PI * 2);
    ctx.clip();
    drawBar(ctx, RING_AT.x, barY + st.through * ry * 1.6, BAR_PX * (1 - 0.55 * st.through), 1 - 0.8 * st.through, 1 - 0.5 * st.through);
    ctx.restore();
  } else {
    drawBar(ctx, RING_AT.x, barY, BAR_PX, 1);
  }
  // The rim's front half, over the bar.
  ctx.save();
  ctx.strokeStyle = '#c0666f';
  ctx.lineWidth = Math.max(6, rx * 0.14);
  ringPath(ctx, rx, ry, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ringPath(ctx, rx + Math.max(3, rx * 0.07), ry + Math.max(3, rx * 0.07), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Impact marks where the bar's ends hit the rim.
  if (!st.fits && st.phase !== 'hover' && st.lift < 14) {
    for (const side of [-1, 1]) {
      const ex = RING_AT.x + side * Math.min(BAR_PX / 2, rx + 30);
      ctx.save();
      ctx.strokeStyle = RED;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const ang = -Math.PI / 2 + (k - 1.5) * 0.45;
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(ang) * 18, barY + Math.sin(ang) * 18);
        ctx.lineTo(ex + Math.cos(ang) * 34, barY + Math.sin(ang) * 34);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  drawText(ctx, `your shoulders · ${SHOULDERS_IN} in`, { x: RING_AT.x, y: Math.min(barY, RING_AT.y - 40) - 36, size: 40, maxWidth: CARD.width - 60 }, 700, st.through > 0.3 ? 1 - st.through : 1, INK_ON_PAPER);
  const sp = SPECIES[a];
  const throatText = sp.throatLabel ? `its throat · ${a === 'whaleShark' && t < T.fourInches ? '?' : sp.throatLabel}` : 'its throat';
  drawText(ctx, throatText, { x: RING_AT.x, y: CARD.y + CARD.height - 36, size: 42, maxWidth: CARD.width - 60 }, 700, 1, INK_ON_PAPER);
  if (a === 'humpback' && t > T.close - 0.2) {
    drawText(ctx, 'an inch short!', { x: RING_AT.x, y: CARD.y + 112, size: 50, maxWidth: CARD.width - 80 }, 700, smooth((t - T.close + 0.2) / 0.3), { fill: RED, halo: PAPER });
  }
  // The verdict.
  if (st.stamp > 0) {
    drawStamp(ctx, sp.verdict, verdictColour(a), RING_AT.x, RING_AT.y - 10, 250, -0.17, st.stamp);
  }
  if (a === 'croc') {
    const u = (t - T.notWhole) / 0.16;
    if (u > 0) drawStamp(ctx, 'NOT WHOLE', RED, RING_AT.x + 20, RING_AT.y + 120, 86, -0.1, u >= 1 ? 1 : 1 + 0.9 * (1 - u) * (1 - u));
  }
  ctx.restore();
}

/** The gauge shows from when the bar lifts off "you" (section 1) whenever no test is on. */
export const gaugeAlpha = (t: number, testing: boolean): number => (testing ? 0 : smooth((t - T.downThroat - 0.9) / 0.3) * (1 - smooth((t - T.end) / 0.4)));
