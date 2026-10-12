import { halo } from '../../../src/art/glowArt';
import { PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { ramp, VIDEO, window01, type Short } from '../short';
import { renderCoelacanthAudio } from './audio';
import { drawLamp, drawRuler, drawWater, makeCave, WATERLINE } from './cave';
import { drawWaterline, makeDeck, rolled } from './deck';
import { drawCoelacanth, FOSSIL_INK, inFishSpace, LIVING, mixPalette, SHADOW, STONE } from './fish';
import { drawLand } from './land';
import { drawAgeLens } from './lens';
import { buriedClip, drawCracks, drawShards, drawStamp, makeRock, makeStamp } from './rock';
import { pt } from './shape';
import { drawSkeleton } from './skeleton';
import {
  ageAt, BURST_AT, BURY_FROM, BURY_TO, CAVE_AT, cameraAt, captionAt, crackAt, CURATOR_FROM, DECK_Y, deckFishAt, DIVE_FROM, type FishPose, flashAt,
  fossilisedAt, HIDDEN, hiddenAt, HOME, labelAt, LABELS, leapAt, LOOP_S, rollAt, sinceBurst, stampAt, swimmerAt, worldAt, bonesAt,
} from './story';

/** Draws the "this fish was supposed to be extinct" short (story.ts has the choreography). */

const W = VIDEO.width;
const H = VIDEO.height;
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const SPOKEN = '#f5c84a';
const CAPTION_Y = 1170;
const CAPTION_SIZE = 96;

/** Marine snow: it drifts down a screen per loop, and moves with the water as the camera dives. */
const SNOW = (() => {
  const rng = createRng(1938);
  return Array.from({ length: 240 }, () => ({ x: rng() * W, y: rng() * H, r: 0.9 + rng() * 2, phase: rng() * Math.PI * 2, depth: 0.7 + rng() * 0.3 }));
})();
const BLUR_S = 1 / 25;

function snowShift(t: number): number {
  // Sediment raining down while the fish is buried, faster than the snow.
  return t >= BURY_FROM && t < BURST_AT ? 900 * ramp(t, BURY_FROM, BURY_TO) : 0;
}

function drawSnow(ctx: CanvasRenderingContext2D, t: number, camY: number, alpha: number): void {
  if (alpha <= 0) return;
  const dt = 1 / 120;
  const [a, b] = [Math.max(t - dt, 0), Math.min(t + dt, LOOP_S - 1e-6)];
  const camRate = (cameraAt(b).y - cameraAt(a).y) / (b - a);
  const top = WATERLINE - camY;
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = '#dfe8ff';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.26 * alpha;
  for (const m of SNOW) {
    const x = (((m.x + 10 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase)) % W) + W) % W;
    const y = ((((m.y + (H * t) / LOOP_S + snowShift(t) - camY * m.depth) % H) + H) % H);
    if (y < top) continue;
    const sy = Math.max(-140, Math.min(140, -camRate * m.depth * BLUR_S));
    if (Math.abs(sy) > m.r) {
      // Long streaks fainter, so a fast dive reads as speed, not rain.
      ctx.globalAlpha = 0.26 * alpha * Math.max(0.3, Math.min(1, 24 / Math.abs(sy)));
      ctx.lineWidth = m.r * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - sy);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.26 * alpha;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const onScreen = (pose: FishPose, camY: number): FishPose => ({ ...pose, y: pose.y - camY });

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
  let x = W / 2 - total / 2;
  ctx.restore();
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: '#05091a' } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + widths[i]! / 2, CAPTION_Y, CAPTION_SIZE, 700, i <= now.word ? 1 : 0.55, colours);
    x += widths[i]! + space;
  });
}

export function createCoelacanth(ctx: CanvasRenderingContext2D): Short {
  const cave = makeCave();
  const rock = makeRock();
  const deck = makeDeck();
  const stamp = makeStamp();
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = W;
  layerCanvas.height = H;
  const layer = layerCanvas.getContext('2d')!;

  /** The coelacanths resting in the cave: dim shapes in the dark, their eyes shining. */
  const drawHidden = (t: number, camY: number, boil: number): void => {
    const shown = HIDDEN.map((h) => hiddenAt(h, t));
    if (shown.every((s) => s <= 0)) return;
    HIDDEN.forEach((h, i) => {
      const s = shown[i]!;
      if (s <= 0) return;
      layer.clearRect(0, 0, W, H);
      const drift = 6 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S + i * 2);
      const pose: FishPose = { x: h.x, y: h.y + drift - camY, length: h.length, angle: h.angle, paddle: (2 * Math.PI * 6 * t) / LOOP_S + i, effort: 0.4, bend: 0 };
      drawCoelacanth(layer, pose, { palette: SHADOW, boil, seed: 20 + i, facing: h.facing, eyeGlow: 1 });
      ctx.save();
      cave.clipMouth(ctx, camY);
      ctx.globalAlpha = s;
      ctx.drawImage(layerCanvas, 0, 0);
      ctx.restore();
    });
  };

  const drawSea = (t: number, camY: number, boil: number): void => {
    drawWater(ctx, camY);
    drawSnow(ctx, t, camY, 1);
    const deckTop = DECK_Y - camY;
    if (deckTop + 1420 > 0 && t >= BURST_AT) {
      const roll = rollAt(t);
      ctx.save();
      ctx.translate(0, deckTop);
      deck.back(ctx, roll, boil);
      deck.curator(ctx, roll, boil, ramp(t, CURATOR_FROM, CURATOR_FROM + 0.5));
      const fish = deckFishAt(t);
      if (fish) rolled(ctx, roll, () => drawCoelacanth(ctx, fish, { palette: LIVING, boil, seed: 1 }));
      drawWaterline(ctx, t, boil);
      ctx.restore();
    }
    cave.draw(ctx, camY, boil);
    drawHidden(t, camY, boil);
    const lamp = Math.max(0, 1 - Math.abs(camY) / 700);
    drawLamp(ctx, HOME.x, HOME.y - camY, lamp);
    const fish = swimmerAt(t);
    if (fish && t < BURY_FROM + 1e-9) drawCoelacanth(ctx, onScreen(fish, camY), { palette: LIVING, boil, seed: 1, eyeGlow: 0.25 });
    else if (fish && t >= BURST_AT) drawCoelacanth(ctx, onScreen(fish, camY), { palette: LIVING, boil, seed: 1, eyeGlow: 0.25 });
    const s = stampAt(t);
    if (s) drawStamp(ctx, stamp, s, camY, boil);
    drawRuler(ctx, camY, window01(t, DIVE_FROM + 0.15, CAVE_AT + 0.15, 0.3), (text, x, y, a) => drawTextLine(ctx, text, x, y, 64, 700, a, PAPER_ON_INK));
    const age = ageAt(t);
    if (age.open > 0 && fish) {
      const s = fish.length / 1000;
      const to = pt(fish.x - 60 * s, fish.y - 40 * s - camY);
      drawAgeLens(ctx, age.open, age.years, to, boil, PAPER_ON_INK);
    }
  };

  const drawStone = (t: number, camY: number, boil: number): void => {
    if (t < BURY_TO) {
      drawWater(ctx, camY);
      drawSnow(ctx, t, camY, 1 - ramp(t, BURY_TO - 0.4, BURY_TO));
      cave.draw(ctx, camY, boil);
      drawLamp(ctx, HOME.x, HOME.y - camY, 1 - ramp(t, BURY_FROM, BURY_TO));
    } else {
      ctx.fillStyle = '#0c0910';
      ctx.fillRect(0, 0, W, H);
    }
    drawLand(ctx, t, camY, boil);
    rock.draw(ctx, t, camY);
    const fish = onScreen(swimmerAt(Math.min(t, BURST_AT - 1e-6))!, camY);
    const crack = crackAt(t);
    if (t < BURST_AT) {
      if (t < BURY_TO) drawCoelacanth(ctx, fish, { palette: LIVING, boil, seed: 1 });
      ctx.save();
      if (t < BURY_TO) buriedClip(ctx, t, camY);
      const stone = mixPalette(mixPalette(STONE, FOSSIL_INK, fossilisedAt(t)), LIVING, 0.45 * crack * crack);
      drawCoelacanth(ctx, fish, { palette: stone, boil, seed: 1 });
      inFishSpace(ctx, fish, 1, () => drawSkeleton(ctx, bonesAt(t), boil));
      ctx.restore();
    }
    drawCracks(ctx, crack, camY, boil);
    const s = stampAt(t);
    if (s) drawStamp(ctx, stamp, s, camY, boil);
    const tau = sinceBurst(t);
    if (tau >= 0) {
      drawShards(ctx, tau, camY);
      halo(ctx, fish.x, fish.y, 700, '#7fc4ff', 0.6);
      const leap = leapAt(t);
      if (leap) drawCoelacanth(ctx, onScreen(leap, camY), { palette: LIVING, boil, seed: 1, eyeGlow: 1 });
    }
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const cam = cameraAt(t);
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(cam.shakeX, cam.shakeY);
    if (worldAt(t) === 'stone') drawStone(t, cam.y, boil);
    else drawSea(t, cam.y, boil);
    ctx.restore();
    const flash = flashAt(t);
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#fbf6ea';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    for (const l of LABELS) {
      const a = labelAt(l, t);
      if (a > 0) drawTextLine(ctx, l.text, W / 2, l.y, l.size, 700, a, l.onPaper ? INK_ON_PAPER : PAPER_ON_INK);
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderCoelacanthAudio };
}
