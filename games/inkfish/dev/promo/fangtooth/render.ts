import { PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderFangtoothAudio } from './audio';
import { BRAIN, EYE, fangPoint, LATERAL, skinAt, skinThetaAt, SNOUT_X, TAIL_X } from './body';
import { drawFangtooth, placePoint } from './fish';
import { drawHand, PALM } from './hand';
import { drawShrimp } from './prey';
import { project, toCamera, v3 } from './space';
import {
  blurAt, brainGlow, brainLabel, burstAt, captionAt, darkAt, depthLabel, eyeAt, eyeLabel, fangGlow, fangLabel, fishAt, handDrawn, handShown, lateralLabel,
  LOOP_S, preyAt, restAt, ripplesAt, scaleRateAt, senseAt, shakeAt, sizeLabel, socketGlow, socketLabel, xrayAt,
} from './story';

/** Draws the "biggest teeth in the ocean, for its size" short (story.ts has the choreography). */

const CHALK = '#dcd6e6';
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const SPOKEN = '#f5c84a';
const CAPTION_Y = 1170;
const CAPTION_SIZE = 96;
const LABEL_SIZE = 70;
/** Labels stay inside the area the Shorts buttons leave clear, and above the captions. */
const SAFE = { left: 110, right: VIDEO.width - 110, top: 300, bottom: 1040 } as const;

/** The deep: near-black water, a touch lighter at the top. */
function makeWater(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#0b1430');
  g.addColorStop(1, '#03060f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/**
 * Marine snow drifting down through the dark, smeared along its motion
 * while the fish rushes at the camera or away (as if the camera moved),
 * about one frame's worth, so it streaks and settles smoothly.
 */
const SNOW = (() => {
  const rng = createRng(1717);
  return Array.from({ length: 240 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2, phase: rng() * Math.PI * 2 }));
})();
const BLUR_S = 1 / 25;

function drawSnow(ctx: CanvasRenderingContext2D, t: number): void {
  const zoomRate = scaleRateAt(t);
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = '#dfe8ff';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.26;
  for (const m of SNOW) {
    const x = (((m.x + 10 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase)) % VIDEO.width) + VIDEO.width) % VIDEO.width;
    const y = (m.y + (VIDEO.height * t) / LOOP_S) % VIDEO.height;
    const sx = Math.max(-260, Math.min(260, (x - VIDEO.width / 2) * zoomRate * BLUR_S));
    const sy = Math.max(-260, Math.min(260, (y - 700) * zoomRate * BLUR_S));
    if (Math.hypot(sx, sy) > m.r) {
      ctx.lineWidth = m.r * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - sx, y - sy);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The dark closing in from the edges, `dark` 0 .. 1. */
function drawVignette(ctx: CanvasRenderingContext2D, dark: number): void {
  if (dark <= 0) return;
  const g = ctx.createRadialGradient(VIDEO.width / 2, 700, 120 + 380 * (1 - dark), VIDEO.width / 2, 760, 1250 - 350 * dark);
  g.addColorStop(0, 'rgba(1,2,6,0)');
  g.addColorStop(1, `rgba(1,2,6,${Math.min(0.97, 0.45 + 0.55 * dark).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** Pressure ripples spreading from the shrimp. */
function drawRipples(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, ages: readonly number[]): void {
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 2.5;
  for (const age of ages) {
    const u = age / 0.9;
    ctx.globalAlpha = 0.45 * (1 - u);
    ctx.beginPath();
    ctx.arc(x, y, scale * (0.6 + 4.2 * u), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The bite: pale strokes bursting from the jaws and a puff of dark ink. */
const BURST = (() => {
  const rng = createRng(31);
  return Array.from({ length: 14 }, (_, k) => ({ a: (k / 14) * Math.PI * 2 + rng() * 0.3, reach: 0.7 + rng() * 0.6, blob: 0.25 + rng() * 0.3 }));
})();

function drawBurst(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.lineCap = 'round';
  // Ink puffs, spreading and fading.
  for (const b of BURST) {
    const r = size * (0.4 + 0.9 * b.reach * Math.sqrt(u));
    ctx.globalAlpha = 0.55 * (1 - u);
    ctx.fillStyle = '#0a0607';
    ctx.beginPath();
    ctx.arc(x + Math.cos(b.a) * r, y + Math.sin(b.a) * r, size * b.blob * (0.4 + u), 0, Math.PI * 2);
    ctx.fill();
  }
  // Chalk strokes, flying out.
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = Math.max(3, size * 0.05);
  ctx.globalAlpha = 1 - u;
  for (const b of BURST) {
    const r0 = size * (0.45 + 0.5 * u) * b.reach;
    const r1 = size * (0.75 + 0.9 * u) * b.reach;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(b.a) * r0, y + Math.sin(b.a) * r0);
    ctx.lineTo(x + Math.cos(b.a) * r1, y + Math.sin(b.a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A label in chalk handwriting with leader lines to what it names. */
function drawCallout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: readonly Pt[], alpha: number, size = LABEL_SIZE): void {
  if (alpha <= 0) return;
  const x = Math.max(SAFE.left, Math.min(SAFE.right, at.x));
  const y = Math.max(SAFE.top, Math.min(SAFE.bottom, at.y));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = CHALK;
  ctx.fillStyle = CHALK;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  for (const p of to) {
    // From the nearer edge of the text towards the thing, stopping just short of it.
    const from = { x, y: p.y > y ? y + size * 0.2 : y - size * 0.75 };
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 30) continue;
    const end = { x: p.x - (dx / len) * 14, y: p.y - (dy / len) * 14 };
    ctx.beginPath();
    ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawTextLine(ctx, text, x, y, size, 700, alpha, PAPER_ON_INK);
}

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const words = now.line.words.map((w) => w.text);
  const space = ctx.measureText(' ').width;
  const widths = words.map((w) => ctx.measureText(w).width);
  const total = widths.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  let x = VIDEO.width / 2 - total / 2;
  ctx.restore();
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: '#05091a' } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + widths[i]! / 2, CAPTION_Y, CAPTION_SIZE, 700, i <= now.word ? 1 : 0.55, colours);
    x += widths[i]! + space;
  });
}

/** A dimension line between the fish and the hand, snout to tail: how long they grow. And the hand named. */
function drawSize(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const pose = restAt(t);
  const y = -3.95;
  const a = project(toCamera(pose, v3(TAIL_X, y, 0)));
  const b = project(toCamera(pose, v3(SNOUT_X, y, 0)));
  const label = 'up to 16 cm';
  ctx.save();
  ctx.font = `700 60px ${CAPTION_FONT}`;
  const gap = ctx.measureText(label).width / 2 + 18;
  const mid = (a.x + b.x) / 2;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(mid - gap, a.y);
  ctx.moveTo(mid + gap, b.y);
  ctx.lineTo(b.x, b.y);
  for (const p of [a, b]) {
    ctx.moveTo(p.x, p.y - 14);
    ctx.lineTo(p.x, p.y + 14);
  }
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, label, mid, a.y + 20, 60, 700, alpha, PAPER_ON_INK);
  const palm = project(toCamera(pose, v3(PALM[0], PALM[1], 0)));
  drawTextLine(ctx, 'your hand', palm.x, palm.y + 20, 58, 700, alpha * handDrawn(t), { fill: CHALK, halo: '#05091a' });
}

/** The callouts of the X-ray, the eye and the lateral line. */
function drawLabels(ctx: CanvasRenderingContext2D, t: number): void {
  const pose = fishAt(t);
  const fang = fangLabel(t);
  if (fang > 0) {
    const p = placePoint(pose, fangPoint(0.55, 1), true).at;
    drawCallout(ctx, 'fang', { x: p.x + 230, y: p.y + 170 }, [p], fang);
  }
  const sockets = socketLabel(t);
  if (sockets > 0) {
    // One label each side, pointing in at its socket.
    const pts = ([1, -1] as const).map((side) => placePoint(pose, fangPoint(0.75, side), false).at);
    const [left, right] = pts[0]!.x < pts[1]!.x ? [pts[0]!, pts[1]!] : [pts[1]!, pts[0]!];
    drawCallout(ctx, 'socket', { x: left.x - 280, y: left.y + 230 }, [left], sockets);
    drawCallout(ctx, 'socket', { x: right.x + 280, y: right.y + 230 }, [right], sockets);
  }
  const brain = brainLabel(t);
  if (brain > 0) {
    const p = placePoint(pose, BRAIN[1]!.c, false).at;
    drawCallout(ctx, 'brain', { x: p.x - 40, y: p.y - 250 }, [p], brain);
  }
  const eye = eyeLabel(t);
  if (eye > 0) {
    const p = placePoint(pose, skinAt(EYE.x, skinThetaAt(EYE.x, EYE.y)), false).at;
    const r = Math.max(26, EYE.r * p.scale * 2.4);
    ctx.save();
    ctx.globalAlpha = eye;
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.1, r, -0.2, -0.4, Math.PI * 2 * eye - 0.2);
    ctx.stroke();
    ctx.restore();
    drawCallout(ctx, 'tiny eyes', { x: p.x - 60, y: p.y - 230 }, [{ x: p.x, y: p.y - r }], eye);
  }
  const lateral = lateralLabel(t);
  if (lateral > 0) {
    const [x, y] = LATERAL[10]!;
    const p = placePoint(pose, skinAt(x, skinThetaAt(x, y)), false).at;
    drawCallout(ctx, 'lateral line', { x: p.x - 40, y: p.y - 300 }, [p], lateral);
  }
  const depth = depthLabel(t);
  if (depth > 0) drawTextLine(ctx, '500–2,000 m down', VIDEO.width / 2, 360, 76, 700, depth, PAPER_ON_INK);
}

export function createFangtooth(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const drawScene = (c: CanvasRenderingContext2D, t: number, boil: number): void => {
    const pose = fishAt(t);
    const rest = restAt(t);
    c.drawImage(water, 0, 0);
    drawSnow(c, t);
    drawHand(c, rest, handDrawn(t), handShown(t), boil);
    const prey = preyAt(t);
    const preyAt2d = prey ? project(toCamera(rest, prey.at)) : null;
    const ripples = ripplesAt(t);
    if (preyAt2d && ripples.length) drawRipples(c, preyAt2d.x, preyAt2d.y, preyAt2d.scale, ripples);
    drawFangtooth(c, pose, {
      boil,
      xray: xrayAt(t),
      sense: (u) => senseAt(t, u),
      fangGlow: fangGlow(t),
      socketGlow: socketGlow(t),
      brainGlow: brainGlow(t),
      eye: eyeAt(t),
    });
    if (prey && preyAt2d) drawShrimp(c, preyAt2d.x, preyAt2d.y, 2.4 * preyAt2d.scale, prey.heading, prey.flick);
    const burst = burstAt(t);
    if (burst >= 0 && burst <= 1) {
      const mouth = placePoint(pose, v3(SNOUT_X + 0.2, 0.2, 0), false).at;
      drawBurst(c, mouth.x, mouth.y, 2.4 * mouth.scale, burst);
    }
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const shake = shakeAt(t);
    layer.save();
    layer.translate(shake.x, shake.y);
    drawScene(layer, t, boil);
    layer.restore();
    const blur = blurAt(t);
    ctx.save();
    ctx.fillStyle = '#03060f';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    if (blur > 0.01) ctx.filter = `blur(${(14 * blur).toFixed(1)}px)`;
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();
    drawVignette(ctx, darkAt(t));
    drawSize(ctx, t, sizeLabel(t));
    drawLabels(ctx, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderFangtoothAudio };
}
