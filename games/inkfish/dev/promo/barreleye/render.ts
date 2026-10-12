import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderBarreleyeAudio } from './audio';
import { drawBarreleye } from './fish';
import {
  drawArrow, drawBite, drawCopepod, drawDepthTag, drawNaresRing, drawSight, drawSpotRing, drawStrike, drawSwivel, label, PAPER_ON_INK,
} from './marks';
import {
  ANATOMY, type Camera, cameraAt, captionAt, depthMetres, depthTag, eyesGuess, eyesLabel, type FishPose, fishAt, gazeOf, gleam, lensesAt, LOOP_S,
  mouthAt, naresRing, nostrilsLabel, onFish, preyAt, shieldLit, sight, sightReach, spotRing, strike, swivelArrow, WIDE,
} from './story';

/** Draws the "this fish can see through its own head" short (story.ts has the choreography). */

const SPOKEN = '#f5c84a';
const CAPTION_Y = 1170;
const CAPTION_SIZE = 96;
/** The copepod's length in world px: drawn bigger than life, so it reads. */
const PREY_LEN = 120;

interface Pt { readonly x: number; readonly y: number }

const toScreen = (cam: Camera, p: Pt): Pt => ({
  x: VIDEO.width / 2 + (p.x - cam.x) * cam.zoom,
  y: VIDEO.height / 2 + (p.y - cam.y) * cam.zoom,
});

/** The deep: near-black water, with the last of the daylight faint at the top. */
function makeWater(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#13234a');
  g.addColorStop(0.4, '#0a1430');
  g.addColorStop(1, '#03060f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const light = ctx.createRadialGradient(VIDEO.width * 0.55, -200, 50, VIDEO.width * 0.55, -200, 1100);
  light.addColorStop(0, 'rgba(90, 140, 200, 0.22)');
  light.addColorStop(1, 'rgba(90, 140, 200, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/**
 * Marine snow at different depths: it drifts down a whole tile per loop, and
 * moves with the camera (near flakes more), spreading as it zooms in.
 */
const TILE = { w: VIDEO.width * 1.3, h: VIDEO.height * 1.2 } as const;
const SNOW = (() => {
  const rng = createRng(4243);
  return Array.from({ length: 300 }, () => ({ x: rng() * TILE.w, y: rng() * TILE.h, d: 0.25 + rng() * 0.75, r: 0.8 + rng() * 2.2, phase: rng() * Math.PI * 2 }));
})();
const wrap = (v: number, m: number): number => ((v % m) + m) % m;

function drawSnow(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  for (const m of SNOW) {
    const spread = cam.zoom ** m.d / WIDE.zoom ** m.d;
    const u = wrap(m.x - (cam.x - WIDE.x) * m.d + 12 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase), TILE.w) - TILE.w / 2;
    const v = wrap(m.y - (cam.y - WIDE.y) * m.d + (TILE.h * t) / LOOP_S, TILE.h) - TILE.h / 2;
    const x = VIDEO.width / 2 + u * spread;
    const y = VIDEO.height / 2 + v * spread;
    ctx.globalAlpha = 0.12 + 0.22 * m.d;
    ctx.beginPath();
    ctx.arc(x, y, m.r * (0.6 + 0.5 * m.d) * Math.sqrt(spread), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Puts the context in the fish's own px for `draw`. */
function onFishCtx(ctx: CanvasRenderingContext2D, cam: Camera, f: FishPose, draw: () => void): void {
  const c = toScreen(cam, f);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.rotate(f.tilt);
  draw();
  ctx.restore();
}

/** "eyes?" crossed out, and "nostrils", by the ring round the two dots. */
function drawNaresLabels(ctx: CanvasRenderingContext2D, cam: Camera, f: FishPose, t: number, boil: number): void {
  const nares = toScreen(cam, onFish(f, { x: 326, y: -10 }));
  const guess = eyesGuess(t);
  const named = nostrilsLabel(t);
  if (guess <= 0 && named <= 0) return;
  const eyesAt = { x: nares.x + 245, y: nares.y - 300 };
  const nostrilsAt = { x: nares.x + 235, y: nares.y - 185 };
  ctx.save();
  ctx.globalAlpha = Math.max(guess, named);
  drawArrow(ctx, { x: nares.x + 175, y: nares.y - 150 }, { x: nares.x + 82, y: nares.y - 62 }, 0.2, Math.min(1, guess * 1.4), 3700, boil);
  ctx.restore();
  label(ctx, 'eyes?', eyesAt, guess);
  ctx.save();
  ctx.globalAlpha = guess;
  drawStrike(ctx, eyesAt, 150, strike(t), boil);
  ctx.restore();
  label(ctx, 'nostrils', nostrilsAt, named, 84, { fill: SPOKEN, halo: '#05091a' });
}

/** "eyes", pointing at the green lenses. */
function drawEyesLabel(ctx: CanvasRenderingContext2D, cam: Camera, f: FishPose, t: number, boil: number): void {
  const show = eyesLabel(t);
  if (show <= 0) return;
  const lens = toScreen(cam, lensesAt(f)[0]!);
  const at = { x: lens.x - 330, y: lens.y - 90 };
  label(ctx, 'real eyes', at, show, 84, { fill: '#8ff0a0', halo: '#05091a' });
  ctx.save();
  ctx.globalAlpha = show;
  drawArrow(ctx, { x: at.x + 40, y: at.y + 30 }, { x: lens.x - 70, y: lens.y + 10 }, -0.2, Math.min(1, show * 1.3), 3800, boil);
  ctx.restore();
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

export function createBarreleye(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const cam = cameraAt(t);
    const f = fishAt(t);
    ctx.drawImage(water, 0, 0);
    drawSnow(ctx, cam, t);
    const prey = preyAt(t);
    const lenses = lensesAt(f).map((p) => toScreen(cam, p));
    drawSight(ctx, lenses, gazeOf(f), sight(t), sightReach(t), t, Math.max(0, 1 - Math.abs(spotRing(t) - 0.2) * 3));
    if (prey) drawCopepod(ctx, toScreen(cam, prey), PREY_LEN * cam.zoom, prey.heading, prey.kick, t, boil);
    onFishCtx(ctx, cam, f, () => {
      drawBarreleye(ctx, f, boil, { lit: shieldLit(t), gleam: gleam(t) });
      drawNaresRing(ctx, { x: 326, y: -10 }, naresRing(t), boil);
      drawSwivel(ctx, ANATOMY.pivots[0], f.eyes, swivelArrow(t), boil);
    });
    if (prey) drawSpotRing(ctx, toScreen(cam, prey), spotRing(t), boil);
    drawBite(ctx, toScreen(cam, mouthAt(f)), 70 * cam.zoom, f.bite, boil);
    drawNaresLabels(ctx, cam, f, t, boil);
    drawEyesLabel(ctx, cam, f, t, boil);
    drawDepthTag(ctx, depthTag(t), depthMetres(t), boil);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBarreleyeAudio };
}
