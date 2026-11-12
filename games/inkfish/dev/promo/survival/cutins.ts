import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp, smooth } from '../short';
import { drawCard, drawPop, drawText, INK_ON_PAPER, PAPER_ON_INK, RED, YELLOW_ON_INK } from '../swallowyou/text';
import { COCOON, makeCocoon } from './art/cocoon';
import { drawCounter, drawMiniCard, drawOut, drawStamp, EVIDENCE_INK, fadeIn, window01 } from './hud';
import { W } from './layout';
import { drawPosed } from './scene';
import { contestant } from './species';
import { drawStage } from './tank';
import { LAST_WORD_S, T } from './timeline';

/**
 * The pictures on top of the tank: round 1's nurse-shark card, the cancelled
 * speed round (the sailfish, its poster and the speedometer), round 4's
 * flying fish and the lungfish asleep in its cocoon; and the winner's podium.
 */

const GREY = EVIDENCE_INK.MYTH;

/** A paper card centred on screen with a strip of sand and a caption: the cut-in frame. */
function cutCard(ctx: CanvasRenderingContext2D, alpha: number, w: number, h: number, y = 560): { x: number; y: number } {
  const x = 960 - w / 2;
  const top = y - h / 2;
  drawCard(ctx, x, top, w, h, alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, '#7fd0ef');
  g.addColorStop(1, '#3a95cf');
  ctx.fillStyle = g;
  ctx.fillRect(x + 16, top + 16, w - 32, h - 120);
  ctx.fillStyle = '#ecd39a';
  ctx.fillRect(x + 16, top + h - 160, w - 32, 56);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 16, top + 16, w - 32, h - 120);
  ctx.restore();
  return { x, y: top };
}

/** "Not every shark has to swim": a nurse shark resting on the sand. */
export function drawNurse(ctx: CanvasRenderingContext2D, t: number, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  const k = 0.9 + 0.1 * alpha;
  ctx.save();
  ctx.translate(960, 560);
  ctx.scale(k, k);
  ctx.translate(-960, -560);
  const c = cutCard(ctx, alpha, 980, 520);
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x + 16, c.y + 16, 948, 400);
  ctx.clip();
  drawPosed(ctx, 'nurse', 960, c.y + 330, 640, -1, t, boil, { effort: 0, alpha, expr: 'happy' });
  ctx.restore();
  drawText(ctx, 'SOME SHARKS CAN REST', { x: 800, y: c.y + 470, size: 58, maxWidth: 580 }, 700, alpha, INK_ON_PAPER);
  ctx.restore();
  drawStamp(ctx, 'REPORTED', EVIDENCE_INK.REPORTED, 1300, 735, 44, t, T.nurse + 0.5, alpha);
}

/** The cancelled speed round: the sailfish, its "68 mph" poster, a speedometer swinging down to 16. */
export function drawSpeedRound(ctx: CanvasRenderingContext2D, t: number, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  const swim = smooth((t - T.sailfish + 0.4) / 1.2);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawPosed(ctx, 'sailfish', lerp(2300, 760, swim), 600, 760, -1, t, boil, { effort: 0.5 + 0.5 * (1 - swim), expr: t > T.burst ? 'squeeze' : null });
  ctx.restore();
  // The poster on the tank wall.
  const poster = fadeIn(t, T.mph68 - 0.1, 0.25) * alpha;
  if (poster > 0) {
    ctx.save();
    ctx.translate(380, 360);
    ctx.rotate(-0.05);
    drawCard(ctx, -230, -120, 460, 240, poster, '#fff1b8');
    drawText(ctx, '68 MPH!!', { x: 0, y: -30, size: 96, maxWidth: 420 }, 700, poster, { fill: RED, halo: PAPER });
    drawText(ctx, '(109 km/h)', { x: 0, y: 60, size: 54, maxWidth: 420 }, 700, poster * fadeIn(t, T.kmh - 0.2), INK_ON_PAPER);
    ctx.restore();
    drawStamp(ctx, 'MYTH', GREY, 380, 360, 88, t, T.cancelled - 0.4, poster, -0.25);
  }
  drawSpeedometer(ctx, t, fadeIn(t, T.tag, 0.35) * alpha);
}

function drawSpeedometer(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const cx = 1460;
  const cy = 700;
  const r = 230;
  const angleOf = (mph: number): number => Math.PI + (Math.min(80, mph) / 80) * Math.PI;
  const mph = lerp(68, 16, smooth((t - T.burst) / 0.9));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let v = 0; v <= 80; v += 10) {
    const a = angleOf(v);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
    ctx.lineTo(cx + Math.cos(a) * (r - 40), cy + Math.sin(a) * (r - 40));
    ctx.stroke();
  }
  // The max seen: a red tick at 22.
  const seen = fadeIn(t, T.never, 0.3);
  if (seen > 0) {
    const a = angleOf(22);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 9;
    ctx.globalAlpha = alpha * seen;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.lineTo(cx + Math.cos(a) * (r - 60), cy + Math.sin(a) * (r - 60));
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }
  const a = angleOf(mph);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (r - 50), cy + Math.sin(a) * (r - 50));
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawText(ctx, 'mph', { x: cx, y: cy - 70, size: 40, maxWidth: 120 }, 700, alpha, INK_ON_PAPER);
  const measured = fadeIn(t, T.burst + 0.6, 0.3) * alpha;
  drawCard(ctx, cx - 300, cy + 26, 600, 150, measured);
  drawText(ctx, '16 mph (25 km/h)', { x: cx, y: cy + 70, size: 52, maxWidth: 560 }, 700, measured, INK_ON_PAPER);
  drawText(ctx, 'MEASURED, hunting bursts', { x: cx, y: cy + 122, size: 36, maxWidth: 560 }, 700, measured, { fill: '#9a6a00', halo: PAPER });
  drawPop(ctx, 'max seen 22 mph (36 km/h)', cx, cy - r - 46, 46, t, T.never, T.cancelled + 1, YELLOW_ON_INK);
}

/** Round 4's flying fish gliding past the glass, its record and a NO. */
export function drawFlyingFish(ctx: CanvasRenderingContext2D, t: number, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  const u = clamp01((t - T.flying + 0.2) / 2.6);
  const x = lerp(2050, -200, u);
  const y = 420 - Math.sin(Math.PI * u) * 160;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawPosed(ctx, 'flyingfish', x, y, 360, -1, t, boil, { tilt: (u - 0.5) * 0.5, effort: 0.1, expr: 'happy' });
  ctx.restore();
  const card = fadeIn(t, T.s45 - 0.1, 0.25) * alpha;
  drawCard(ctx, 960 - 280, 400, 560, 170, card);
  drawText(ctx, '45 s', { x: 960, y: 460, size: 84, maxWidth: 500 }, 700, card, INK_ON_PAPER);
  drawText(ctx, 'the record', { x: 960, y: 530, size: 44, maxWidth: 500 }, 500, card, INK_ON_PAPER);
  drawStamp(ctx, 'NO', GREY, 1180, 520, 70, t, T.no45, card);
}

let cocoon: ReturnType<typeof makeCocoon> | null = null;

/** The lungfish, not invited: asleep in its mud cocoon. */
export function drawLungfish(ctx: CanvasRenderingContext2D, t: number, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  cocoon ??= makeCocoon(4);
  const k = 0.9 + 0.1 * alpha;
  ctx.save();
  ctx.translate(960, 560);
  ctx.scale(k, k);
  ctx.translate(-960, -560);
  const c = cutCard(ctx, alpha, 980, 520);
  const frame = cocoon.frames[boil % cocoon.frames.length]!;
  const len = 520;
  const scale = len / (COCOON.hl * 2 * cocoon.res);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(960, c.y + 300);
  ctx.scale(scale, scale);
  ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
  ctx.restore();
  drawText(ctx, 'MONTHS TO YEARS IN A COCOON', { x: 800, y: c.y + 470, size: 50, maxWidth: 600 }, 700, alpha, INK_ON_PAPER);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const z = ((t * 0.6 + i / 3) % 1);
    drawText(ctx, 'z', { x: 1160 + z * 90 + i * 8, y: 420 - z * 130, size: 40 + z * 40, maxWidth: 100 }, 700, alpha * (1 - z), PAPER_ON_INK);
  }
  drawStamp(ctx, 'REPORTED', EVIDENCE_INK.REPORTED, 1300, 735, 44, t, T.cocoon + 0.4, alpha);
}

const confetti = (() => {
  const rng = createRng(1234);
  const inks = ['#ffcf33', '#e0322b', '#2fae4e', '#f2ead7', '#5ec3ec', '#141414'];
  return Array.from({ length: 140 }, () => ({ x: rng() * W, speed: 120 + rng() * 160, r: 4 + rng() * 8, ph: rng() * 6.28, ink: inks[Math.floor(rng() * inks.length)]! }));
})();

/** A pen sketch pinned to the backdrop for the slideshow: a crab hole, a log, the skin up close. */
function drawSketch(ctx: CanvasRenderingContext2D, kind: 'burrow' | 'log' | 'skin', x: number, y: number, alpha: number, t: number, boil: number): void {
  if (alpha <= 0) return;
  const w = 360;
  const h = 260;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(kind === 'log' ? 0.05 : -0.05);
  drawCard(ctx, -w / 2, -h / 2, w, h, alpha);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  if (kind === 'burrow') {
    ctx.fillStyle = '#8a6440';
    ctx.fillRect(-w / 2 + 14, -10, w - 28, h / 2 - 4);
    ctx.fillStyle = '#26160b';
    ctx.beginPath();
    ctx.ellipse(0, 30, 52, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 120, -10);
      ctx.lineTo(s * 150, -90);
      ctx.lineTo(s * 165, -70);
      ctx.stroke();
    }
  } else if (kind === 'log') {
    ctx.fillStyle = '#7a5434';
    ctx.beginPath();
    ctx.roundRect(-140, -30, 280, 90, 40);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26160b';
    ctx.beginPath();
    ctx.ellipse(-140, 15, 22, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#c99a6e';
    ctx.fillRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 70);
    ctx.strokeStyle = '#b5381e';
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(-160, -90 + i * 24);
      for (let k = 0; k <= 8; k++) ctx.lineTo(-160 + k * 40, -90 + i * 24 + Math.sin(k + i + boil) * 8);
      ctx.stroke();
    }
  }
  ctx.restore();
  const label = kind === 'burrow' ? 'crab holes' : kind === 'log' ? 'rotting logs' : 'air through its skin';
  drawText(ctx, label, { x, y: y + h / 2 - 28, size: 38, maxWidth: w - 30 }, 700, alpha, INK_ON_PAPER);
  void t;
}

/** The winner: the rivulus on the podium's top step, ink confetti, the counter at 1, the slideshow, the great white's card. */
export function drawPodium(ctx: CanvasRenderingContext2D, t: number, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawStage(ctx, t);
  ctx.restore();
  drawSketch(ctx, 'burrow', 300, 420, fadeIn(t, T.crab - 0.2) * alpha, t, boil);
  drawSketch(ctx, 'log', 300, 730, fadeIn(t, T.logs - 0.2) * alpha, t, boil);
  drawSketch(ctx, 'skin', 1620, 420, fadeIn(t, T.air) * alpha, t, boil);
  // The podium.
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const [x, top, n] of [[960, 760, '1'], [720, 840, '2'], [1200, 880, '3']] as const) {
    ctx.fillStyle = n === '1' ? '#ffcf33' : PAPER;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.fillRect(x - 120, top, 240, 1000 - top);
    ctx.strokeRect(x - 120, top, 240, 1000 - top);
    drawText(ctx, n, { x, y: top + 70, size: 90, maxWidth: 200 }, 700, alpha, INK_ON_PAPER);
  }
  ctx.restore();
  drawPosed(ctx, 'rivulus', 960, 690, 320, -1, t, boil, { expr: 'happy', alpha, effort: 0.6 });
  drawPosed(ctx, 'mudskipper', 720, 790, 170, 1, t, boil, { alpha, effort: 0.3 });
  // Third: the pupfish, the last fish out before the final.
  drawPosed(ctx, 'pupfish', 1200, 838, 130, -1, t, boil, { alpha, effort: 0.3 });
  drawPop(ctx, 'THE WINNER!', 960, 300, 120, t, T.winner, 1e9, YELLOW_ON_INK);
  drawPop(ctx, 'MANGROVE RIVULUS', 960, 410, 80, t, T.winner + 1.4, 1e9, PAPER_ON_INK);
  // The great white's card flipping in, OUT across it.
  const flip = smooth((t - T.beat) / 0.5);
  if (flip > 0) {
    ctx.save();
    ctx.translate(1600, 760);
    ctx.scale(Math.max(0.02, flip), 1);
    drawMiniCard(ctx, contestant('white'), -110, -140, 220, 280, t, boil, alpha, 1);
    ctx.restore();
    drawOut(ctx, 1600, 740, 64, t, T.beat + 0.5, alpha);
  }
  // Ink confetti from "the winner".
  const fall = t - T.winner;
  if (fall > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * (1 - smooth((fall - 7) / 2));
    for (const c of confetti) {
      const y = -20 + ((fall * c.speed + c.ph * 90) % 1120);
      ctx.fillStyle = c.ink;
      ctx.beginPath();
      ctx.arc(c.x + Math.sin(fall * 2 + c.ph) * 20, y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  drawCounter(ctx, t, alpha, 1 + 0.25 * smooth((t - T.winner) / 0.6));
  drawPop(ctx, 'WHICH FISH DID YOU PICK?', 960, 160, 84, t, T.whichFish, 1e9, YELLOW_ON_INK);
  const end = window01(t, LAST_WORD_S + 0.2, 1e9, 0.4) * alpha;
  drawText(ctx, 'InkFish · free in your browser · 16bit.ink', { x: 960, y: 1046, size: 44, maxWidth: 1100 }, 700, end, PAPER_ON_INK);
}
