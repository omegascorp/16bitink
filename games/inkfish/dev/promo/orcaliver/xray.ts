import { drawTextLine } from '../captions';
import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { clamp01, lerp, VIDEO } from '../short';
import { inBody, pathOf, spare } from './paint';
import { type BodyPose, LIVER_FAR, LIVER_MID, LIVER_NEAR, onBody } from './pose';
import { liverLabel, quarterLabel, quarterSince, TEXT } from './script';
import { drawSnow, drawVignette, glow, wash } from './sea';
import { cycles, liverAt, shakeAt, splitAt, wrap } from './story';

/**
 * "Then they went straight for the LIVER!" (shock): an X-ray. The young
 * great white as a pale blue ghost on dark film, and inside it, the liver:
 * two long lobes glowing warm orange, nothing opened, just the outline lit
 * from within. "liver" written under it with an arrow.
 * "It's about a QUARTER of a shark's body," (excited): the silhouette splits
 * into four pieces, the liver's piece lit orange, the rest dimmed, and a big
 * "¼" pops up above.
 */

export const XRAY_SHARK: BodyPose = { x: 540, y: 760, length: 1000, angle: 0, flip: false };
/** The cuts across the shark into four, in its local x: the liver's piece is the second from the head. */
export const CUTS_LOCAL = [-226, -608, -782] as const;
const FILM = '#050d18';
const GLOW_ORANGE = '255,150,60';
const SPOKEN = '#f5c84a';
const HALO = '#050d18';

/** The cuts on screen, x. */
const cutXs = (): number[] => CUTS_LOCAL.map((x) => onBody(XRAY_SHARK, { x, y: 0 }).x);

/** The liver: both lobes, a warm glow inside an orange outline, in the shark's local frame. */
function drawLiver(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  if (amount <= 0.01) return;
  const pulse = 1 + 0.1 * Math.sin(cycles(22, t));
  for (const [lobe, k] of [[LIVER_FAR, 0.6], [LIVER_NEAR, 1]] as const) {
    ctx.save();
    pathOf(ctx, lobe);
    const g = ctx.createRadialGradient(LIVER_MID.x, LIVER_MID.y, 0, LIVER_MID.x, LIVER_MID.y, 220);
    g.addColorStop(0, `rgba(255,190,90,${(0.75 * amount * k * pulse).toFixed(3)})`);
    g.addColorStop(1, `rgba(220,90,30,${(0.35 * amount * k).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = `rgba(${GLOW_ORANGE},${amount.toFixed(3)})`;
    ctx.shadowBlur = 28;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(255,200,120,${(amount * k).toFixed(3)})`;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }
}

/** The X-ray: the shark inverted to a pale ghost, tinted blue, with the liver lit inside. */
function paintXray(t: number): HTMLCanvasElement {
  const shark = spare('xray-shark');
  drawGreatWhite(shark.ctx, XRAY_SHARK.x, XRAY_SHARK.y, XRAY_SHARK.length, XRAY_SHARK.angle, t, { tail: 0.4 + 0.25 * Math.sin(cycles(11, t)) }, XRAY_SHARK.flip);
  const film = spare('xray-film');
  film.ctx.filter = 'grayscale(1) invert(1) contrast(1.25)';
  film.ctx.drawImage(shark.canvas, 0, 0);
  film.ctx.filter = 'none';
  film.ctx.globalCompositeOperation = 'multiply';
  film.ctx.fillStyle = '#7fc8ff';
  film.ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  film.ctx.globalCompositeOperation = 'destination-in';
  film.ctx.drawImage(shark.canvas, 0, 0);
  film.ctx.globalCompositeOperation = 'source-over';
  inBody(film.ctx, XRAY_SHARK, () => drawLiver(film.ctx, liverAt(t), t));
  return film.canvas;
}

/** The shark's silhouette in orange, for lighting its liver's piece. */
function paintLit(t: number): HTMLCanvasElement {
  const lit = spare('xray-lit');
  drawGreatWhite(lit.ctx, XRAY_SHARK.x, XRAY_SHARK.y, XRAY_SHARK.length, XRAY_SHARK.angle, t, { tail: 0.4 + 0.25 * Math.sin(cycles(11, t)) }, XRAY_SHARK.flip);
  lit.ctx.globalCompositeOperation = 'source-in';
  lit.ctx.fillStyle = '#ff9a3c';
  lit.ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return lit.canvas;
}

/** Faint grid lines on the film. */
function drawFilm(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const g = ctx.createRadialGradient(540, 780, 60, 540, 780, 900);
  g.addColorStop(0, 'rgba(40,80,120,0.55)');
  g.addColorStop(1, 'rgba(40,80,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.save();
  ctx.strokeStyle = 'rgba(120,190,255,0.08)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= VIDEO.width; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIDEO.height);
    ctx.stroke();
  }
  for (let y = 0; y <= VIDEO.height; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIDEO.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** The "liver" label under the shark, a hand-drawn arrow up to it. */
function drawLiverLabel(ctx: CanvasRenderingContext2D, a: number): void {
  if (a <= 0.01) return;
  const tip = onBody(XRAY_SHARK, { x: LIVER_MID.x, y: 88 });
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = SPOKEN;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(TEXT.liver.x - 20, TEXT.liver.y - TEXT.liver.size * 0.85);
  ctx.quadraticCurveTo(tip.x - 90, tip.y + 90, tip.x - 6, tip.y + 14);
  ctx.moveTo(tip.x - 6, tip.y + 14);
  ctx.lineTo(tip.x - 40, tip.y + 26);
  ctx.moveTo(tip.x - 6, tip.y + 14);
  ctx.lineTo(tip.x - 14, tip.y + 50);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'liver', TEXT.liver.x, TEXT.liver.y, TEXT.liver.size, 700, a, { fill: SPOKEN, halo: HALO });
}

/** The "¼", popping up with a little overshoot. */
function drawQuarter(ctx: CanvasRenderingContext2D, t: number): void {
  const a = quarterLabel(t);
  if (a <= 0.01) return;
  const since = quarterSince(t);
  const over = TEXT.quarterPop - 1;
  const pop = since < 0.14 ? lerp(0.4, TEXT.quarterPop, since / 0.14) : 1 + over * Math.max(0, 1 - (since - 0.14) / 0.14);
  ctx.save();
  ctx.translate(TEXT.quarter.x, TEXT.quarter.y);
  ctx.scale(pop, pop);
  ctx.rotate(-0.05 + 0.03 * Math.sin(cycles(9, t)));
  drawTextLine(ctx, '¼', 0, 0, TEXT.quarter.size, 700, a, { fill: SPOKEN, halo: HALO });
  ctx.restore();
}

export function drawXray(ctx: CanvasRenderingContext2D, _sheet: HTMLCanvasElement, t: number): void {
  const jolt = shakeAt(t);
  const split = splitAt(t);
  drawFilm(ctx);
  drawSnow(ctx, t, '#9fd0ff', 0.35);
  const film = paintXray(t);
  const liverGlow = onBody(XRAY_SHARK, LIVER_MID);
  ctx.save();
  ctx.translate(jolt.x, jolt.y);
  glow(ctx, liverGlow.x, liverGlow.y, 420, GLOW_ORANGE, 0.3 * liverAt(t) * (1 + 0.1 * Math.sin(cycles(22, wrap(t)))));
  if (split <= 0.001) {
    ctx.drawImage(film, 0, 0);
  } else {
    // Four pieces, pulled apart; the liver's piece lit, the rest dimmed.
    const xs = [0, ...cutXs().reverse(), VIDEO.width];
    const gap = 34 * split;
    const lit = paintLit(t);
    for (let i = 0; i < 4; i++) {
      const isLiver = i === 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(xs[i]!, 0, xs[i + 1]! - xs[i]!, VIDEO.height);
      ctx.clip();
      ctx.translate((i - 1.5) * gap, 0);
      if (isLiver) {
        // Lit orange from behind, the X-ray screened over it.
        ctx.globalAlpha = 0.7 * split;
        ctx.drawImage(lit, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'screen';
      } else {
        ctx.globalAlpha = lerp(1, 0.4, split);
      }
      ctx.drawImage(film, 0, 0);
      ctx.restore();
    }
    // The cut lines, dashed, between the pieces.
    ctx.save();
    ctx.strokeStyle = `rgba(200,230,255,${(0.7 * clamp01(split * 2)).toFixed(3)})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 12]);
    xs.slice(1, 4).forEach((x, j) => {
      const dx = (j - 1) * gap;
      ctx.beginPath();
      ctx.moveTo(x + dx, XRAY_SHARK.y - 230);
      ctx.lineTo(x + dx, XRAY_SHARK.y + 220);
      ctx.stroke();
    });
    ctx.restore();
  }
  ctx.restore();
  drawLiverLabel(ctx, liverLabel(t));
  drawQuarter(ctx, t);
  wash(ctx, 'soft-light', '#4aa0ff', 0.15);
  drawVignette(ctx, 0.6, '1,4,10');
}
