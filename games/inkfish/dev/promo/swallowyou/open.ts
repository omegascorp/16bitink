import { INK } from '../../../src/art/pen';
import { ADRIAN, drawPaddler } from '../kayak/people';
import { inMouth, type WhalePose } from '../kayak/story';
import { drawWhaleBack, drawWhaleFront } from '../kayak/whale';
import { clamp01, lerp, smooth, window01 } from '../short';
import { boilOf } from './art/ink';
import { drawYou, shouldersOf } from './art/people';
import { drawGrape } from './art/props';
import { drawAnimal, iconOf } from './cast';
import { drawBar, GAUGE } from './hud';
import { H, W } from './layout';
import { type Sea, vignette } from './sea';
import { drawArrow, drawPop, drawText, PAPER_ON_INK, YELLOW, YELLOW_ON_INK } from './text';
import { ANIMALS, sectionStart, T } from './timeline';

/**
 * The cold open and "you": a humpback bursting up round a yellow kayak
 * (frame 1, mid-gulp), shutting on it, then spitting the kayaker out; the
 * question under the surface; a hard cut to "you"; the eight mouths flying
 * by, smallest to biggest; seven greying out and one left dark. Then "you"
 * measured: 5 ft 9 in tall, shoulders 16 in across, and the shoulder bar
 * lifting off to become the test's gauge.
 */

// ---------------------------------------------------------------- the kayak gulp

/** The whale's jaws through the open: wide at frame 1, shut on "swallowed", open again to spit. */
function gapeAt(t: number): number {
  if (t < T.swallowed) return 0.95 - 0.05 * smooth(t / T.swallowed);
  if (t < T.spat - 0.1) return 0.9 * (1 - smooth((t - T.swallowed) / 0.35)) + 0.02;
  if (t < T.grape + 0.6) return 0.75 * smooth((t - T.spat + 0.1) / 0.25);
  return 0.75 * (1 - smooth((t - T.grape - 0.6) / 0.5));
}

function whaleAt(t: number): WhalePose {
  const rise = smooth((t + 0.6) / 3);
  const sink = smooth((t - T.grape) / 1.2);
  return {
    x: -40,
    y: lerp(160, -70, rise) + 260 * sink + 6 * Math.sin(t * 1.7),
    tilt: lerp(1.28, 1.12, rise) - 0.25 * sink,
    gape: gapeAt(t),
    balloon: t > T.swallowed ? 0.5 * smooth((t - T.swallowed) / 0.4) * (1 - smooth((t - T.spat) / 0.5)) : 0.15,
    eye: t > T.spat - 0.1 && t < T.grape ? 'wide' : t > T.swallowed + 0.3 ? 'smug' : 'calm',
    fin: 0.12 * Math.sin(t * 1.4),
  };
}

/** World px to screen: the waterline at world y 0. */
const ZOOM = 1.8;
const FOCUS = { x: 1060, y: 830 };
const enter = (ctx: CanvasRenderingContext2D, zoom: number): void => {
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(zoom, zoom);
};

function drawSurfaceWorld(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  // Overcast sky over the Strait of Magellan, far grey hills, the cold green water.
  const horizon = FOCUS.y;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#5d6670');
  sky.addColorStop(1, '#c9cfcf');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);
  ctx.save();
  ctx.fillStyle = '#7d8786';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, horizon - 70 - 50 * Math.abs(Math.sin(x * 0.004 + 1)) - 20 * Math.sin(x * 0.017));
  ctx.lineTo(W, horizon);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, W, H - horizon);
  ctx.clip();
  sea.draw(ctx, 'capecod', t);
  ctx.restore();
}

/** The water in front of the whale: murky below the surface, the surface line and foam where the whale breaks it. */
function drawWaterFront(ctx: CanvasRenderingContext2D, t: number, foam: number): void {
  const y0 = FOCUS.y;
  const wave = (x: number): number => y0 + 7 * Math.sin(x / 90 + t * 2) + 4 * Math.sin(x / 31 - t * 3);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-20, H + 20);
  for (let x = -20; x <= W + 20; x += 20) ctx.lineTo(x, wave(x));
  ctx.lineTo(W + 20, H + 20);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, 'rgba(60,92,88,0.55)');
  g.addColorStop(1, 'rgba(14,30,32,0.85)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = -20; x <= W + 20; x += 20) (x === -20 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x)));
  ctx.stroke();
  // Foam: white churn round the whale's body, heaped unevenly, with an inked edge on top.
  if (foam > 0) {
    const blobs = Array.from({ length: 46 }, (_, i) => {
      const r0 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const r1 = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
      const x = 600 + r0 * 1000 + 14 * Math.sin(t * 2 + i);
      const centre = 1 - Math.abs(x - 1100) / 520;
      const r = (12 + 34 * r1) * (0.5 + 0.7 * Math.max(0, centre));
      return { x, y: wave(x) - r * 0.5 - 22 * Math.max(0, centre) * r1 - 4 * Math.sin(t * 3 + i), r };
    });
    ctx.fillStyle = 'rgba(40,54,58,0.35)';
    for (const b of blobs) {
      ctx.beginPath();
      ctx.arc(b.x + 4, b.y + 6, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(246,249,248,${(0.95 * foam).toFixed(3)})`;
    for (const b of blobs) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(27,26,31,${(0.55 * foam).toFixed(3)})`;
    ctx.lineWidth = 2.2;
    for (const b of blobs) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, Math.PI * 1.05, Math.PI * 1.75);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Spray flung up as the jaws burst out and as they shut. */
function drawSpray(ctx: CanvasRenderingContext2D, t: number, from: number, at: { x: number; y: number }, size: number): void {
  const u = (t - from) / 1.2;
  if (u <= 0 || u >= 1) return;
  ctx.save();
  ctx.fillStyle = 'rgba(240,246,246,0.9)';
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (i / 25 - 0.5) * 2.4;
    const v = size * (0.6 + 0.5 * Math.sin(i * 7.7));
    const x = at.x + Math.cos(a) * v * u;
    const y = at.y + Math.sin(a) * v * u + 900 * u * u;
    ctx.globalAlpha = 1 - u;
    ctx.beginPath();
    ctx.arc(x, y, 6 + 10 * (1 - u), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGulp(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  const boil = boilOf(t);
  // The camera eases out a touch after the spit to show where he lands.
  const zoom = ZOOM * (1 - 0.2 * smooth((t - T.spat) / 1.2));
  drawSurfaceWorld(ctx, sea, t);
  const w = whaleAt(t);
  const spat = t >= T.spat;
  ctx.save();
  enter(ctx, zoom);
  drawWhaleBack(ctx, w, boil);
  const inside = inMouth(w);
  if (t < T.swallowed + 0.25) {
    drawPaddler(ctx, { x: inside.at.x, y: inside.at.y, tilt: inside.tilt, facing: 1, scale: 1, stroke: t * 6, arms: 'flail', face: 'shock' }, ADRIAN, boil, t, 11);
  }
  drawWhaleFront(ctx, w, boil);
  if (spat) {
    // Out in an arc, over the jaw, landing on the water.
    const u = clamp01((t - T.spat) / 1.1);
    const mouth = inMouth(whaleAt(T.spat + 0.15)).at;
    const land = { x: -560, y: -6 };
    const x = lerp(mouth.x, land.x, u);
    const y = lerp(mouth.y, land.y, u) - 420 * Math.sin(Math.PI * u);
    const landed = u >= 1;
    drawPaddler(ctx, {
      x, y: landed ? land.y + 4 * Math.sin(t * 2) : y, tilt: landed ? 0.05 * Math.sin(t * 2) : -u * 5, facing: 1, scale: 1, stroke: t * 3,
      arms: landed ? 'shrug' : 'flail', face: landed ? 'sheepish' : 'shock',
    }, ADRIAN, boil, t, 11);
  }
  ctx.restore();
  drawWaterFront(ctx, t, 1 - smooth((t - T.grape) / 1.5));
  drawSpray(ctx, t, -0.3, { x: 1100, y: FOCUS.y - 40 }, 700);
  drawSpray(ctx, t, T.swallowed + 0.1, { x: 1200, y: FOCUS.y - 60 }, 420);
  vignette(ctx, 0.45);
  drawPop(ctx, '2025 · Strait of Magellan, Chile', 460, 120, 58, t, T.swallowed - 1.9, T.kayakAll + 1.5, PAPER_ON_INK, -0.02, 820);
  drawPop(ctx, 'KAYAK AND ALL!', 470, 250, 110, t, T.kayakAll, T.spat - 0.6, YELLOW_ON_INK, -0.05, 820);
  drawPop(ctx, 'a few seconds… inside its mouth', 520, 380, 54, t, T.inside, T.spat - 0.3, PAPER_ON_INK, -0.03, 820);
  drawPop(ctx, 'pft!', 1180, 260, 100, t, T.spat + 0.2, T.grape + 0.4, YELLOW_ON_INK, 0.1);
  if (t > T.grape - 0.1) {
    const g = smooth((t - T.grape + 0.1) / 0.3);
    drawGrape(ctx, 1540, 440 + 10 * Math.sin(t * 3), 120 * g, 0.2, t);
    drawPop(ctx, 'like a bad grape', 1540, 580, 58, t, T.grape, T.question, PAPER_ON_INK, 0.03);
  }
}

// ---------------------------------------------------------------- the question, under the surface

function drawQuestion(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'cold', t, t * 40);
  // The kayak far above, a small dark shape on the bright surface.
  const g = ctx.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, 'rgba(220,240,245,0.9)');
  g.addColorStop(1, 'rgba(220,240,245,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 160);
  ctx.save();
  ctx.fillStyle = '#16212a';
  ctx.beginPath();
  ctx.ellipse(W / 2 + 40 * Math.sin(t * 0.7), 46, 120, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Big shapes passing under it, as shadows.
  const u = t - T.question;
  ctx.save();
  ctx.filter = 'brightness(0.18)';
  drawAnimal(ctx, 'white', { x: lerp(-200, 1400, u / 4.2), y: 520 }, 900, 1, t, { gape: 0.3 });
  drawAnimal(ctx, 'humpback', { x: lerp(2600, 900, u / 4.2), y: 860 }, 2200, -1, t, { gape: 0.2 });
  ctx.restore();
  vignette(ctx, 0.6);
  drawPop(ctx, 'which animal could swallow…', W / 2, 360, 84, t, T.question + 1.5, T.you - 0.05, PAPER_ON_INK, -0.02, 1300);
}


// ---------------------------------------------------------------- "YOU"

function drawYouAlone(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'night', t);
  const pop = smooth((t - T.you) / 0.15);
  drawYou(ctx, W / 2, 930, 640 * (0.9 + 0.1 * pop), t, { halo: 12 });
  vignette(ctx, 0.7);
  drawPop(ctx, 'YOU', W / 2, 200, 150, t, T.you, T.smallest - 0.95, YELLOW_ON_INK, -0.03);
  drawPop(ctx, '…and keep you?', W / 2 + 470, 520, 70, t, T.keep, T.smallest - 0.95, PAPER_ON_INK, 0.04);
}

// ---------------------------------------------------------------- the eight mouths

/** The eight mouths in a row, small to huge, the camera sweeping along them; then all but one grey out. */
function drawMouths(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'night', t);
  const sweep = smooth((t - T.smallest + 0.9) / (T.onlyOne - T.smallest + 0.4));
  const settle = smooth((t - T.onlyOne + 0.4) / 0.6);
  const grey = smooth((t - T.onlyOne - 0.2) / 0.4);
  // Each mouth bigger than the last; all laid out at their size on one row.
  const sizes = ANIMALS.map((_, i) => 200 * 1.2 ** i);
  const xs: number[] = [];
  let x = 0;
  sizes.forEach((s) => {
    xs.push(x + s / 2);
    x += s + 30;
  });
  const total = x;
  // Sweep along the row at close range.
  const zoom = 1.1;
  const centre = lerp(lerp(xs[0]!, xs[ANIMALS.length - 1]!, sweep), total / 2, settle);
  ANIMALS.forEach((a, i) => {
    // From the row into a grid of two rows of four, all one size, for "only ONE".
    const rowSize = sizes[i]! * zoom;
    const rowX = W / 2 + (xs[i]! - centre) * zoom;
    const gridX = 300 + (i % 4) * 440;
    const gridY = 450 + Math.floor(i / 4) * 300;
    const size = lerp(rowSize, 400, settle);
    const cx = lerp(rowX, gridX, settle);
    const cy = lerp(580, gridY, settle);
    if (cx < -size || cx > W + size) return;
    const icon = iconOf(a);
    const h = (size * icon.height) / icon.width;
    const last = i === ANIMALS.length - 1;
    ctx.save();
    if (grey > 0) ctx.filter = last ? `brightness(${1 - 0.92 * grey})` : `grayscale(${grey}) brightness(${1 - 0.25 * grey})`;
    ctx.globalAlpha = last ? 1 : 1 - 0.3 * grey;
    ctx.drawImage(icon, cx - size / 2, cy - h / 2, size, h);
    ctx.restore();
    if (last && grey > 0) drawText(ctx, '?', { x: cx, y: cy + 60, size: 220, maxWidth: 300 }, 700, grey, YELLOW_ON_INK);
  });
  vignette(ctx, 0.55);
  drawPop(ctx, 'smallest mouth…', 520, 200, 72, t, T.smallest, T.onlyOne - 0.4, PAPER_ON_INK, -0.03);
  drawPop(ctx, '…biggest throat on Earth', 1300, 200, 72, t, T.biggest, T.onlyOne - 0.4, PAPER_ON_INK, -0.03);
  drawPop(ctx, 'only ONE could', W / 2, 200, 96, t, T.onlyOne, sectionStart(1) - 0.3, YELLOW_ON_INK, -0.02);
  drawPop(ctx, "(and it's not the one you think)", W / 2, 1010, 58, t, T.notTheOne, sectionStart(1) - 0.3, PAPER_ON_INK, 0.01, 1200);
}

// ---------------------------------------------------------------- 1 · you

/** Where "you" stand in section 1, and how tall you're drawn. */
const ME = { x: 820, y: 960, h: 680 } as const;

function drawMeal(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'cold', t);
  // Something with a mouth slides in from the right on "Anything that wants to swallow you whole…".
  const loom = window01(t, T.anything - 0.3, T.testIt + 0.5, 0.8);
  if (loom > 0) {
    ctx.save();
    ctx.filter = 'brightness(0.15)';
    drawAnimal(ctx, 'white', { x: lerp(W + 200, 1480, loom), y: 560 }, 2600, -1, t, { gape: 0.3 + 0.6 * smooth((t - T.anything) / 1.5) });
    ctx.restore();
  }
  drawYou(ctx, ME.x, ME.y, ME.h, t, { halo: 12 });
  vignette(ctx, 0.5);
  drawPop(ctx, 'the meal', ME.x - 460, 380, 84, t, T.meal - 0.1, T.average, YELLOW_ON_INK, -0.05);
  drawArrow(ctx, ME.x - 400, 420, ME.x - 140, 520, window01(t, T.meal, T.average, 0.2));
  drawPop(ctx, "(that's you)", ME.x - 460, 470, 54, t, T.thatsYou, T.average, PAPER_ON_INK, -0.05);
  // The height bar.
  const tall = window01(t, T.average, T.anything + 0.4, 0.3);
  if (tall > 0) {
    const x = ME.x - 210;
    const top = ME.y - ME.h * smooth((t - T.average) / 0.8);
    ctx.save();
    ctx.globalAlpha = tall;
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 24, ME.y);
    ctx.lineTo(x + 24, ME.y);
    ctx.moveTo(x, ME.y);
    ctx.lineTo(x, top);
    ctx.moveTo(x - 24, top);
    ctx.lineTo(x + 24, top);
    ctx.stroke();
    ctx.restore();
    drawPop(ctx, '5 ft 9 in', x - 150, ME.y - ME.h / 2, 72, t, T.fiveNine, T.anything + 0.4, YELLOW_ON_INK, -0.04);
    drawPop(ctx, '1.75 m', x - 150, ME.y - ME.h / 2 + 62, 46, t, T.fiveNine + 0.2, T.anything + 0.4, PAPER_ON_INK, -0.04);
  }
  // The shoulder bar: drawn across your shoulders, then lifted off to the corner.
  const sh = shouldersOf(ME.x, ME.y, ME.h);
  const width = sh.right.x - sh.left.x;
  const draw = smooth((t - T.shoulders) / 0.6);
  if (draw > 0) {
    const lift = smooth((t - T.downThroat) / 0.9);
    const x = lerp(ME.x, GAUGE.x, lift);
    const y = lerp(sh.left.y - 6, GAUGE.y, lift) - 120 * Math.sin(Math.PI * lift);
    const len = lerp(width * draw, GAUGE.length, lift);
    drawBar(ctx, x, y, len, 1);
    drawPop(ctx, '16 in · 40 cm', ME.x + 330, sh.left.y - 30, 68, t, T.sixteen, T.downThroat, YELLOW_ON_INK, 0.03);
    drawPop(ctx, 'your shoulders', ME.x + 330, sh.left.y + 34, 48, t, T.shoulders + 0.3, T.downThroat, PAPER_ON_INK, 0.03);
  }
  drawPop(ctx, 'down its throat?', ME.x + 520, 760, 70, t, T.downThroat, T.testIt + 0.6, PAPER_ON_INK, -0.03);
  drawPop(ctx, "LET'S TEST IT", W / 2 - 200, 200, 96, t, T.testIt, sectionStart(2) - 0.1, YELLOW_ON_INK, -0.03);
}

/** The cold open and section 1, by time. */
export function drawOpen(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  if (t < T.question - 0.1) drawGulp(ctx, sea, t);
  else if (t < T.you) drawQuestion(ctx, sea, t);
  else if (t < T.smallest - 0.9) drawYouAlone(ctx, sea, t);
  else if (t < sectionStart(1) - 0.3) drawMouths(ctx, sea, t);
  else drawMeal(ctx, sea, t);
}
