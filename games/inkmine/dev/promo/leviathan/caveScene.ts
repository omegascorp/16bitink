import { makeDraw, pt } from '../../../src/art/kit';
import { makeCanvas } from '../../../src/art/pen';
import { mix, rgba } from '../../../src/art/paint';
import { PAPER_FILL, RED } from '../../../src/art/palette';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, PAPER_ON_DARK } from '../captions';
import { clamp01, lerp, ramp, VIDEO } from '../short';
import { drawSprite } from '../sprites';
import { bubblesIn, drawBubbles } from './bubbles';
import { BLOCK, blockCorner, FLOOR_Y, makeBlock, makeCaveBack, makeRock, ROCK_INK, ROW_TOP, SHAFT_X } from './cave';
import { FEET, type Figures } from './figures';
import { barAt, BLOCKS_AT, caveCameraAt, digAt, hushAt, lightsAt, noiseAt, sceneAt, wrap } from './story';

/** Screen px per drawing unit in the wide shots: the giant nearly fills the width, its tail just out of frame. */
const GIANT_SCALE = 3.3;
const GIANT_X = 470;
const FIGURE_SCALE = 3.3;
const BAR = { x: 72, y: 470, w: 74, h: 400 } as const;

/** The noise bar, hand-inked: a wobbly frame with seven notches, red climbing up it. */
function drawNoiseBar(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const noise = noiseAt(t);
  const hot = ramp(noise, 0.72, 0.98);
  const d = makeDraw(ctx, 7900 + boil, boil, 0, PAPER_FILL);
  const { x, y, w, h } = BAR;
  const inner = { x: x + 8, y: y + 8, w: w - 16, h: h - 16 };
  const shape = [pt(x, y), pt(x + w, y + 3), pt(x + w - 2, y + h), pt(x + 2, y + h - 2)];
  ctx.save();
  d.pen.fill(shape, '#0d0a1e', 0.86);
  const fill = inner.h * noise;
  const g = ctx.createLinearGradient(0, inner.y + inner.h, 0, inner.y);
  g.addColorStop(0, '#f3c64a');
  g.addColorStop(0.55, '#e8772e');
  g.addColorStop(1, RED);
  ctx.fillStyle = g;
  ctx.fillRect(inner.x, inner.y + inner.h - fill, inner.w, fill);
  if (hot > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 22);
    const r = 150 + 60 * pulse;
    const cy = inner.y + inner.h - fill;
    const glow = ctx.createRadialGradient(x + w / 2, cy, 0, x + w / 2, cy, r);
    glow.addColorStop(0, rgba('#ff5a3c', 0.5 * hot));
    glow.addColorStop(1, rgba('#ff5a3c', 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(x + w / 2 - r, cy - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  for (let i = 1; i < 7; i++) {
    const ny = inner.y + (inner.h * i) / 7;
    d.pen.hair([pt(x + 2, ny), pt(x + w * 0.42, ny + 1)], 3, PAPER_FILL, 0.85);
  }
  for (let i = 0; i < 4; i++) d.pen.stroke([shape[i]!, shape[(i + 1) % 4]!], 6, PAPER_FILL, 1, false);
  ctx.restore();
  drawTextLine(ctx, 'NOISE', x + w / 2 + 8, y - 22, 66, 700, ctx.globalAlpha, hot > 0.5 ? { fill: '#ff8a6a', halo: '#0d1230' } : PAPER_ON_DARK);
}

/** Bits of the block flying off and sinking in the water, for 1.4 s after it gives. */
function drawCrumbs(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  BLOCKS_AT.forEach((at, row) => {
    const age = t - at;
    if (age < 0 || age > 1.4) return;
    const rng = createRng(8100 + row);
    const top = ROW_TOP + row * BLOCK;
    for (let i = 0; i < 16; i++) {
      const vx = (rng() - 0.5) * 240;
      const vy = rng() * 90 + 60;
      const size = 5 + rng() * 13;
      const spin = (rng() - 0.5) * 8;
      ctx.save();
      ctx.translate(SHAFT_X + (rng() - 0.5) * BLOCK * 0.8 + (vx * (1 - Math.exp(-age * 3))) / 3, top + BLOCK * (0.3 + 0.5 * rng()) + vy * age + 150 * age * age);
      ctx.rotate(spin * age);
      ctx.globalAlpha = 1 - clamp01((age - 1) / 0.4);
      ctx.fillStyle = mix(ROCK_INK.rock, '#e8e2ec', 0.1 + rng() * 0.2);
      ctx.strokeStyle = '#141030';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.5);
      ctx.lineTo(size * 0.4, -size * 0.8);
      ctx.lineTo(size, size * 0.4);
      ctx.lineTo(-size * 0.3, size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();
}

/** Each block's noise going out: inked arcs running down from the drill towards the sleeper. */
function drawRings(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const d = makeDraw(ctx, 7950 + boil, boil, 0, PAPER_FILL);
  BLOCKS_AT.forEach((at, row) => {
    const age = t - at;
    if (age < 0 || age > 0.75) return;
    const u = age / 0.75;
    const cy = ROW_TOP + row * BLOCK + BLOCK * 0.7;
    for (const lag of [0, 0.18, 0.36]) {
      const k = u - lag;
      if (k <= 0) continue;
      const r = 90 + 620 * k;
      const arc = Array.from({ length: 16 }, (_, i) => {
        const a = Math.PI * (0.18 + (0.64 * i) / 15);
        return pt(SHAFT_X + Math.cos(a) * r, cy + Math.sin(a) * r * 0.62);
      });
      const hot = (row + 2) / 7;
      d.pen.stroke(arc, 7 - 4 * k, mix('#f5f0e1', '#ff7a55', hot), (1 - k) * 0.7, false);
    }
  });
}

function drawCracks(ctx: CanvasRenderingContext2D, row: number, work: number, boil: number): void {
  if (work <= 0) return;
  const d = makeDraw(ctx, 8000 + row * 11 + boil, boil, 0, '#0d0a1e');
  const rng = createRng(8050 + row);
  const top = ROW_TOP + row * BLOCK;
  const shown = Math.ceil(work * 7);
  for (let i = 0; i < shown; i++) {
    const a = rng() * Math.PI * 2;
    const c = pt(SHAFT_X, top + 6);
    const b = pt(c.x + Math.cos(a) * 46, c.y + Math.abs(Math.sin(a)) * 92);
    const m = pt((c.x + b.x) / 2 + (rng() - 0.5) * 28, (c.y + b.y) / 2);
    const e = pt(b.x + (rng() - 0.5) * 24, b.y + (rng() - 0.5) * 14);
    d.pen.stroke([c, m, b, e], 3, '#0d0a1e', 0.9, false);
  }
}

/** The quiet, and then the lights: the sleeper on its floor, the prospector working down the shaft over its head. */
export function makeCaveScene(figures: Figures): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const back = makeCaveBack();
  const rock = makeRock();
  const blocks = [0, 1, 2, 3, 4].map(makeBlock);
  const { canvas: darkCanvas, ctx: darkCtx } = makeCanvas(VIDEO.width, VIDEO.height);
  darkCtx.fillStyle = '#9692c8';
  darkCtx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const vignette = darkCtx.createRadialGradient(620, 1040, 360, 620, 1040, 1250);
  vignette.addColorStop(0, 'rgba(20, 14, 60, 0)');
  vignette.addColorStop(1, 'rgba(8, 6, 26, 0.9)');
  darkCtx.fillStyle = vignette;
  darkCtx.fillRect(0, 0, VIDEO.width, VIDEO.height);

  return (ctx, time, boil) => {
    const t = wrap(time);
    const waking = sceneAt(t) === 'wake';
    const camera = caveCameraAt(t);
    const dig = digAt(t);
    const headY = ROW_TOP - FEET * FIGURE_SCALE + dig.row * BLOCK;
    const hush = hushAt(t);
    const buzz = hush > 0 || waking ? 0 : Math.sin(t * 90) * 2.2;
    ctx.save();
    ctx.translate(540, 960);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    ctx.drawImage(back, -60, -60);
    drawBubbles(ctx, bubblesIn(t, 12, 2.2, { x0: 0, x1: 1080, y0: 860, y1: 1300, rMin: 4, rMax: 11 }), 0.6);
    const giant = waking ? figures.stir : figures.sleep;
    drawSprite(ctx, giant, boil, { x: GIANT_X, y: FLOOR_Y + 4, scale: GIANT_SCALE });
    drawBubbles(ctx, bubblesIn(t, 9, 5.5, { x0: 620, x1: 640, y0: 760, y1: 1010, rMin: 4, rMax: 12 }), 0.9);
    ctx.drawImage(rock[boil]!, -60, -60);
    const gone = BLOCKS_AT.filter((at) => t >= at).length;
    blocks.forEach((b, row) => {
      if (row < gone) return;
      const c = blockCorner(row);
      const shiver = row === gone ? buzz * 0.5 : 0;
      ctx.drawImage(b[boil]!, c.x + shiver, c.y);
    });
    if (gone < blocks.length) drawCracks(ctx, gone, dig.work, boil);
    drawCrumbs(ctx, t);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    // Past the frame's edges, whatever the camera is doing.
    ctx.drawImage(darkCanvas, -120, -120, VIDEO.width + 240, VIDEO.height + 240);
    ctx.restore();

    if (waking) {
      // The lights come up along the flank, head first.
      const reach = lerp(1100, -160, lightsAt(t));
      ctx.save();
      ctx.beginPath();
      ctx.rect(reach, 0, 1400, VIDEO.height);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      for (let pass = 0; pass < 2; pass++) drawSprite(ctx, figures.stirLights, boil, { x: GIANT_X, y: FLOOR_Y + 4, scale: GIANT_SCALE });
      ctx.filter = 'blur(14px)';
      drawSprite(ctx, figures.stirLights, boil, { x: GIANT_X, y: FLOOR_Y + 4, scale: GIANT_SCALE });
      ctx.filter = 'none';
      ctx.restore();
    }

    // The lamp's warm pool in the shaft, then the small figure.
    const x = SHAFT_X - 14 + buzz;
    const y = headY;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lamp = ctx.createRadialGradient(x + 10, y, 0, x + 10, y, 260);
    lamp.addColorStop(0, rgba('#ffd9a0', 0.42));
    lamp.addColorStop(1, rgba('#ffd9a0', 0));
    ctx.fillStyle = lamp;
    ctx.fillRect(x - 260, y - 260, 520, 520);
    ctx.restore();
    drawSprite(ctx, hush > 0.5 || waking ? figures.idle : figures.drill, boil, { x, y, scale: FIGURE_SCALE });
    if (hush <= 0) drawRings(ctx, t, boil);
    ctx.restore();
    const bar = barAt(t);
    if (bar > 0) {
      ctx.save();
      ctx.globalAlpha = bar;
      drawNoiseBar(ctx, t, boil);
      ctx.restore();
    }
  };
}
