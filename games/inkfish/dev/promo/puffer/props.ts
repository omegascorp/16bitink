import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { clamp01, smooth } from '../short';
import { type Knife, panAt, PETALS, SCALE, type Vial } from './story';

/** The props the narrator talks over: the vial, the scale, "antidote", the fugu plate, the licence and the knife. */

const POISON = '#8b4fd0';
const GLOW = 'rgba(190,120,255,';
const BRASS = '#c9a54a';
const BROWN_GLASS = '#8a5a2b';
export const STRIKE = '#d8402c';
const INDIGO = '#2d4f8e';
const WOOD = '#b98a55';

function skull(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.28;
  // Crossbones behind.
  ctx.beginPath();
  ctx.moveTo(-r * 1.1, r * 0.3);
  ctx.lineTo(r * 1.1, r * 1.3);
  ctx.moveTo(r * 1.1, r * 0.3);
  ctx.lineTo(-r * 1.1, r * 1.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-r * 0.42, r * 0.4, r * 0.84, r * 0.45);
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.05, r * 0.2, 0, Math.PI * 2);
  ctx.arc(r * 0.3, -r * 0.05, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A stoppered vial of tetrodotoxin, glowing; `inside` draws it see-through, as if X-rayed in the fish's belly. */
export function drawVial(ctx: CanvasRenderingContext2D, v: Vial, size: number): void {
  if (v.alpha <= 0) return;
  ctx.save();
  ctx.translate(v.x, v.y);
  // The glow round it.
  const g = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * (v.inside ? 1.7 : 1.1));
  g.addColorStop(0, `${GLOW}${0.55 * v.glow * v.alpha})`);
  g.addColorStop(1, `${GLOW}0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, size * (v.inside ? 1.7 : 1.1), 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(v.angle);
  ctx.globalAlpha = v.alpha * (v.inside ? 0.92 : 1);
  const w = size * 0.42;
  const h = size;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.strokeStyle = INK;
  // Liquid, glass, neck, cork.
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.25, w, h * 0.75, w * 0.35);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-w / 2, h * 0.02, w, h * 0.48, w * 0.35);
  ctx.fillStyle = POISON;
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.25, w, h * 0.75, w * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(-w * 0.28, -h * 0.42, w * 0.56, h * 0.18);
  ctx.fillStyle = '#c99a62';
  ctx.fill();
  ctx.stroke();
  skull(ctx, 0, h * 0.18, w * 0.22, PAPER);
  // A highlight down the glass.
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, -h * 0.12);
  ctx.lineTo(-w * 0.28, h * 0.32);
  ctx.stroke();
  ctx.restore();
}

/** A brown bottle of cyanide with a skull label, its foot at (x, y). */
function drawCyanide(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-36, 0);
  ctx.lineTo(-36, -80);
  ctx.quadraticCurveTo(-36, -100, -14, -106);
  ctx.lineTo(-14, -124);
  ctx.lineTo(14, -124);
  ctx.lineTo(14, -106);
  ctx.quadraticCurveTo(36, -100, 36, -80);
  ctx.lineTo(36, 0);
  ctx.closePath();
  ctx.fillStyle = BROWN_GLASS;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(-16, -138, 32, 16);
  ctx.strokeRect(-16, -138, 32, 16);
  ctx.fillStyle = PAPER;
  ctx.fillRect(-28, -72, 56, 54);
  ctx.strokeRect(-28, -72, 56, 54);
  skull(ctx, 0, -52, 13, INK);
  ctx.restore();
}

/** One pan: three strings from the beam's end to a shallow brass bowl. */
function drawPan(ctx: CanvasRenderingContext2D, end: { x: number; y: number }, pan: { x: number; y: number }): void {
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const dx of [-88, 0, 88]) {
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(pan.x + dx, pan.y);
  }
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pan.x - 100, pan.y);
  ctx.quadraticCurveTo(pan.x, pan.y + 70, pan.x + 100, pan.y);
  ctx.closePath();
  ctx.fillStyle = BRASS;
  ctx.fill();
  ctx.stroke();
}

/** The balance: post, beam at `beam` (left down positive), the pans, the cyanide on the right. */
export function drawScale(ctx: CanvasRenderingContext2D, beam: number, alpha: number, floorY: number): void {
  if (alpha <= 0) return;
  const { pivot, arm } = SCALE;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Post and foot.
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(pivot.x - 11, pivot.y, 22, floorY - pivot.y - 20);
  ctx.fillStyle = BRASS;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pivot.x - 110, floorY);
  ctx.quadraticCurveTo(pivot.x, floorY - 60, pivot.x + 110, floorY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const left = { x: pivot.x - arm * Math.cos(beam), y: pivot.y + arm * Math.sin(beam) };
  const right = { x: pivot.x + arm * Math.cos(beam), y: pivot.y - arm * Math.sin(beam) };
  drawPan(ctx, left, panAt(-1, beam));
  drawPan(ctx, right, panAt(1, beam));
  // The beam over the strings.
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(-beam);
  ctx.beginPath();
  ctx.roundRect(-arm - 8, -9, 2 * arm + 16, 18, 9);
  ctx.fillStyle = BRASS;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = BRASS;
  ctx.fill();
  ctx.stroke();
  // A pointer on the post.
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(-beam);
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -70);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  const panR = panAt(1, beam);
  drawCyanide(ctx, panR.x, panR.y + 6, 1);
  ctx.restore();
}

/** "antidote", written left to right, and a red pen stroke through it. */
export function drawAntidote(ctx: CanvasRenderingContext2D, a: { alpha: number; write: number; strike: number }, x: number, y: number): void {
  if (a.alpha <= 0) return;
  const size = 150;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText('antidote').width;
  ctx.beginPath();
  ctx.rect(x - w / 2 - 20, y - size, (w + 40) * a.write, size * 1.4);
  ctx.clip();
  drawTextLine(ctx, 'antidote', x, y, size, 700, a.alpha);
  ctx.restore();
  if (a.strike <= 0) return;
  const x0 = x - w / 2 - 24;
  const len = (w + 48) * a.strike;
  ctx.save();
  ctx.globalAlpha = a.alpha;
  ctx.strokeStyle = STRIKE;
  ctx.lineCap = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x0, y - size * 0.22);
  ctx.quadraticCurveTo(x0 + len * 0.5, y - size * 0.32, x0 + len, y - size * 0.3 - 0.06 * len);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- fugu

const PLATE = { rx: 330, ry: 205 } as const;
const PETAL_SHAPES = (() => {
  const rng = createRng(318);
  return Array.from({ length: PETALS }, (_, k) => ({ angle: (k / PETALS) * Math.PI * 2 - Math.PI / 2 + (rng() - 0.5) * 0.04, len: 0.93 + rng() * 0.07 }));
})();

/** One thin slice: a long petal from near the middle to near the rim, see-through so the plate's pattern shows. */
function petal(ctx: CanvasRenderingContext2D, angle: number, len: number, shown: number): void {
  if (shown <= 0) return;
  const r0 = 38;
  const r1 = (PLATE.rx - 46) * len;
  const w = 34;
  ctx.save();
  ctx.rotate(angle);
  ctx.globalAlpha *= clamp01(shown * 2);
  const s = 0.75 + 0.25 * smooth(shown);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(r0, 0);
  ctx.bezierCurveTo(r0 + (r1 - r0) * 0.3, -w, r1 - 20, -w * 0.9, r1, -w * 0.15);
  ctx.quadraticCurveTo(r1 + 8, 0, r1, w * 0.15);
  ctx.bezierCurveTo(r1 - 20, w * 0.9, r0 + (r1 - r0) * 0.3, w, r0, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,236,232,0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(27,26,31,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // A fine fold line.
  ctx.beginPath();
  ctx.moveTo(r0 + 20, 0);
  ctx.quadraticCurveTo((r0 + r1) / 2, -6, r1 - 30, 0);
  ctx.strokeStyle = 'rgba(200,150,160,0.5)';
  ctx.stroke();
  ctx.restore();
}

/** The plate of fugu sashimi at (x, y) with chopsticks; `petal(k)` how far slice k is laid. */
export function drawPlate(ctx: CanvasRenderingContext2D, x: number, y: number, p: { alpha: number; petal: (k: number) => number; chopsticks: number }): void {
  if (p.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.translate(x, y + 30 * (1 - smooth(p.alpha)));
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  // Its shadow and foot ring.
  ctx.fillStyle = 'rgba(27,26,31,0.15)';
  ctx.beginPath();
  ctx.ellipse(8, 22, PLATE.rx, PLATE.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, PLATE.rx, PLATE.ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fbf8f1';
  ctx.fill();
  ctx.stroke();
  // Painted indigo rim and pattern under the slices.
  ctx.save();
  ctx.scale(1, PLATE.ry / PLATE.rx);
  ctx.strokeStyle = INDIGO;
  ctx.lineWidth = 6;
  ctx.globalAlpha = p.alpha * 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, PLATE.rx - 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * (PLATE.rx - 18), Math.sin(a) * (PLATE.rx - 18), 14, a + Math.PI * 0.5, a + Math.PI * 1.5);
    ctx.stroke();
  }
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 150, Math.sin(a) * 150, 60, 22, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = p.alpha;
  for (const [k, s] of PETAL_SHAPES.entries()) petal(ctx, s.angle, s.len, p.petal(k));
  // Garnish in the middle: grated radish with chilli, and chives.
  const centre = p.petal(PETALS - 1);
  if (centre > 0) {
    ctx.globalAlpha = p.alpha * centre;
    ctx.fillStyle = '#e8743a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#4f8a3a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const a of [-0.6, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 10 - 30, Math.sin(a) * 10 - 34);
      ctx.lineTo(Math.cos(a) * 26 - 30, Math.sin(a) * 26 - 34);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Chopsticks resting across the front right of the plate.
  if (p.chopsticks > 0) {
    const slide = 1 - smooth(p.chopsticks);
    ctx.globalAlpha = p.alpha * clamp01(p.chopsticks * 2);
    for (const [dx, dy] of [[0, 0], [24, 22]] as const) {
      ctx.save();
      ctx.translate(150 + dx + 160 * slide, 120 + dy + 60 * slide);
      ctx.rotate(-0.55);
      ctx.beginPath();
      ctx.moveTo(-250, -3);
      ctx.lineTo(160, -8);
      ctx.lineTo(160, 8);
      ctx.lineTo(-250, 3);
      ctx.closePath();
      ctx.fillStyle = WOOD;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the licence and the knife

/** The licence card at (x, y): its title, a photo of a chef, lines of print, and the red stamp coming down (`stamp` 0 .. 1, -1 not yet). */
export function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, c: { alpha: number; rise: number; stamp: number }): void {
  if (c.alpha <= 0) return;
  const w = 620;
  const h = 360;
  ctx.save();
  ctx.globalAlpha = c.alpha;
  ctx.translate(x, y + 90 * smooth(c.rise));
  ctx.rotate(-0.04);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(27,26,31,0.15)';
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 10, -h / 2 + 14, w, h, 22);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 22);
  ctx.fillStyle = '#fbf6e8';
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // Header band.
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, 86, [22, 22, 0, 0]);
  ctx.fillStyle = '#e9d9b0';
  ctx.fill();
  ctx.stroke();
  drawTextLine(ctx, 'FUGU CHEF LICENCE', 0, -h / 2 + 62, 58, 700, 1);
  // Photo: a chef in a tall hat.
  const px = -w / 2 + 40;
  const py = -h / 2 + 110;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#e7eef2';
  ctx.fillRect(px, py, 150, 200);
  ctx.strokeRect(px, py, 150, 200);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, 150, 200);
  ctx.clip();
  ctx.fillStyle = '#f7e2c8';
  ctx.beginPath();
  ctx.arc(px + 75, py + 125, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(px + 75, py + 225, 62, 50, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  // The hat: a band and a puffy top.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.rect(px + 47, py + 70, 56, 26);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + 58, py + 58, 20, 0, Math.PI * 2);
  ctx.arc(px + 92, py + 58, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + 75, py + 46, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + 58, py + 58, 20, Math.PI * 0.5, Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + 92, py + 58, 20, Math.PI * 1.6, Math.PI * 2.5);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(px + 63, py + 122, 4, 0, Math.PI * 2);
  ctx.arc(px + 87, py + 122, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Lines of print.
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = c.alpha * 0.55;
  for (const [k, len] of [[0, 300], [1, 250], [2, 320], [3, 180]] as const) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 225, py + 22 + k * 40);
    ctx.lineTo(-w / 2 + 225 + len, py + 22 + k * 40);
    ctx.stroke();
  }
  ctx.globalAlpha = c.alpha;
  if (c.stamp >= 0) drawStamp(ctx, 150, 105, c.stamp);
  ctx.restore();
}

/** The red "APPROVED" stamp, thumping down from big and faint to its place. */
function drawStamp(ctx: CanvasRenderingContext2D, x: number, y: number, u: number): void {
  const s = 1 + 0.7 * (1 - smooth(u));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.2);
  ctx.scale(s, s);
  ctx.globalAlpha *= 0.25 + 0.75 * smooth(u);
  ctx.strokeStyle = STRIKE;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-140, -46, 280, 92, 10);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-128, -36, 256, 72, 7);
  ctx.stroke();
  ctx.fillStyle = STRIKE;
  ctx.font = `700 64px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('APPROVED', 0, 4);
  ctx.restore();
}

/** A long fugu knife (yanagiba), and the flash of the cut along its swing. */
export function drawKnife(ctx: CanvasRenderingContext2D, k: Knife): void {
  if (k.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = k.alpha;
  if (k.slash > 0 && k.slash < 1) {
    // A swoosh of ink below the blade's path.
    ctx.save();
    ctx.globalAlpha = k.alpha * (1 - k.slash);
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    for (const [dy, w] of [[0, 7], [26, 4], [-22, 3]] as const) {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(k.x + 60, k.y - 590 + dy, 560, Math.PI * 0.64 - 0.25 * k.slash, Math.PI * 0.36 + 0.15 * k.slash, true);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.translate(k.x, k.y);
  ctx.rotate(k.angle);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  // Blade: straight spine, the edge sweeping up to the point.
  ctx.beginPath();
  ctx.moveTo(-120, -22);
  ctx.lineTo(300, -22);
  ctx.quadraticCurveTo(290, 6, 230, 18);
  ctx.lineTo(-120, 26);
  ctx.closePath();
  ctx.fillStyle = '#cfd6dc';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-100, -10);
  ctx.lineTo(240, -12);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-120, 10);
  ctx.lineTo(240, 6);
  ctx.stroke();
  // Collar and handle.
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(-148, -22, 28, 46);
  ctx.fillStyle = '#2a2628';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-330, -20, 184, 42, 12);
  ctx.fillStyle = '#d8b98a';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
