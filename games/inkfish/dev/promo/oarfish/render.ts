import { halo } from '../../../src/art/glowArt';
import { PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderOarfishAudio } from './audio';
import { drawChart, drawWipe } from './chart';
import { drawDepthGauge, drawDimension, drawDiver, drawLegend, drawSeismograph, drawVisitor } from './marks';
import { drawOarfish, toScreen, type View } from './ribbon';
import { drawCrack, drawFuji, drawGreatWave, drawGround, drawSandStipple, drawSkyAndSea, drawSnow, drawSurfaceInk, drawWash, type Smear } from './scenery';
import {
  beachedAt, cameraAt, CLOSE, captionAt, chartOn, crack, deepFishAt, LOOP_S, shakeAt, snowShift, washFront, waveFront, waveHeight, wipeAt,
} from './story';

/** Draws the "they call this the doomsday fish" short (story.ts has the choreography). */

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const SPOKEN = '#f5c84a';
const CAPTION_Y = 1170;
const CAPTION_SIZE = 96;
/** The snow's smear: about a frame's worth of its motion. */
const BLUR_S = 1 / 25;

function viewAt(t: number): View {
  const cam = cameraAt(t);
  const shake = shakeAt(t);
  return { x: cam.x, y: cam.y, zoom: cam.zoom, dx: shake.x, dy: shake.y };
}

function smearAt(t: number): Smear {
  const dt = 1 / 120;
  const [a, b] = [Math.max(t - dt, 0), Math.min(t + dt, LOOP_S - 1e-6)];
  const [ca, cb] = [cameraAt(a), cameraAt(b)];
  const [sa, sb] = [snowShift(a), snowShift(b)];
  return { x: ((sb.x - sa.x) / (b - a)) * BLUR_S, y: ((sb.y - sa.y) / (b - a)) * BLUR_S, zoom: ((Math.log(cb.zoom) - Math.log(ca.zoom)) / (b - a)) * BLUR_S };
}

/**
 * The deep oarfish, drawn on its own layer and shaded away from its head,
 * so the head is lit and the long body fades into the dark below.
 */
function drawDeepFish(ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, view: View, t: number, boil: number): void {
  const pose = deepFishAt(t);
  const head = toScreen(view, pose);
  if (head.y > VIDEO.height + 1400 || head.y < -view.zoom * 9 || head.x < -900 || head.x > VIDEO.width + 900) return;
  // A cold light from above, on the head.
  halo(ctx, head.x, head.y, Math.max(260, view.zoom * 1.2), '#5f7fb5', 0.16);
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawOarfish(layer, pose, view, { boil });
  // Close up, the body sinks into the dark below the head; further out, only the tail darkens.
  const close = Math.max(0, Math.min(1, Math.log(view.zoom / 150) / Math.log(CLOSE / 150)));
  const shade = layer.createRadialGradient(head.x, head.y, 120 + 120 * close, head.x, head.y, 1700 - 950 * close);
  shade.addColorStop(0, 'rgba(3,6,15,0)');
  shade.addColorStop(1, `rgba(3,6,15,${(0.6 + 0.32 * close).toFixed(3)})`);
  layer.save();
  layer.globalCompositeOperation = 'source-atop';
  layer.fillStyle = shade;
  layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer.restore();
  ctx.drawImage(layer.canvas, 0, 0);
}

/** The world: sky, sea, the deep oarfish, the shore and the one on the beach. */
function drawWorld(ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, t: number, boil: number): void {
  const view = viewAt(t);
  drawSkyAndSea(ctx, view, t);
  drawFuji(ctx, view);
  drawGreatWave(ctx, view, waveHeight(t), waveFront(t), t);
  drawSnow(ctx, t, snowShift(t), smearAt(t), toScreen(view, { x: 0, y: 0 }).y);
  drawDeepFish(ctx, layer, view, t, boil);
  drawSurfaceInk(ctx, view, t);
  drawGround(ctx, view);
  drawSandStipple(ctx, view);
  drawCrack(ctx, view, crack(t));
  drawVisitor(ctx, view, t);
  const beached = beachedAt(t);
  if (beached) drawOarfish(ctx, beached, view, { boil });
  const wash = washFront(t);
  if (wash !== null) drawWash(ctx, view, wash, t);
  drawDiver(ctx, view, t, boil);
  drawDimension(ctx, view, t);
  drawDepthGauge(ctx, t);
  drawLegend(ctx, t);
  drawSeismograph(ctx, t);
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

export function createOarfish(ctx: CanvasRenderingContext2D): Short {
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const scene = (chart: boolean): void => (chart ? drawChart(ctx, t, boil) : drawWorld(ctx, layer, t, boil));
    const wipe = wipeAt(t);
    if (wipe) drawWipe(ctx, wipe.u, wipe.dir, () => scene(wipe.dir < 0), () => scene(wipe.dir > 0), t);
    else scene(chartOn(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderOarfishAudio };
}
