import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { drawChomp } from '../goliath/effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderTigerSharkAudio } from './audio';
import { boilAt, LOOP_S, type Mood, moodAt } from './beats';
import { drawChart, makeChartArt } from './grid';
import { captionAt } from './script';
import {
  drawBackdrop, drawBubbles, drawCrown, drawDrops, drawFlash, drawFloatRings, drawLightning, drawRain, drawRipples, drawShafts, drawSpecks, drawVignette,
  drawWash, drawWaterline, paletteAt,
} from './sea';
import { BIRD_BOX, BIRD_MID, type BirdSprites, drawBirdAt, drawFeatherAt, FLOAT_LINE, makeBirdSprites, makeFeatherFrames } from './songbird';
import {
  birdsAt, breachAt, type Camera, cameraAt, CIRCLERS_N, circlerAt, CRASH, FOCUS, floatingFeatherAt, heroAt, hookBirdAt, hookFeatherAt, littleFishAt, rainAt,
  type Bird, snapBurst, splashesAt, sprayAt, toScreen,
} from './story';
import { drawTiger, makeTigerSprite, type TigerPose } from './tiger';

/** Draws "These sharks eat birds that fall out of the SKY!" (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
const CAPTION_MAX_W = 980;
const INK_BG = '#03090a';
const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: '#f4eddc', halo: INK_BG };
const SPOKEN_INK: TextInk = { fill: SPOKEN, halo: INK_BG };
/** Sprite px per texture px: the shark is up to ~1200 px long on screen. */
const SHARK_RES = 6;
const BIRD_RES = 4;

/** How dark the edges are in each mood: close and heavy for the storm and the deep, open for the sunset and the joke. */
const VIGNETTE: Readonly<Record<Mood, number>> = { shock: 1, tender: 0.45, storm: 1, dread: 1.25, number: 1, cheeky: 0.45 };

/** The vignette eased from one mood's to the next over 0.4 s. */
function vignetteAt(t: number): number {
  let sum = 0;
  for (let k = 0; k < 8; k++) sum += VIGNETTE[moodAt(t - k * 0.05)];
  return sum / 8;
}

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours = i === now.word ? SPOKEN_INK : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

function drawBird(ctx: CanvasRenderingContext2D, birds: BirdSprites, b: Bird, boil: number): void {
  if (b.pose === 'float') {
    // Sat on the water: its drawing's waterline on the surface.
    const k = b.size / BIRD_BOX.w;
    drawBirdAt(ctx, birds, 'float', boil, b.x, b.y - (FLOAT_LINE - BIRD_MID.y) * k, b.size, b.tilt, b.facing, b.alpha);
    return;
  }
  drawBirdAt(ctx, birds, b.pose, boil, b.x, b.y, b.size, b.tilt, b.facing, b.alpha);
}

/** Faint chalk streaks trailing up from the bird in the hook: it's falling. */
function drawFallStreak(ctx: CanvasRenderingContext2D, b: Bird, px: number): void {
  ctx.save();
  ctx.strokeStyle = '#e4ece6';
  ctx.lineCap = 'round';
  const s = b.size;
  for (const [dx, len, a] of [[-0.22, 0.75, 0.45], [0.02, 1, 0.55], [0.24, 0.6, 0.4]] as const) {
    const x = b.x + dx * s;
    const y0 = b.y - 0.3 * s;
    const g = ctx.createLinearGradient(0, y0, 0, y0 - len * s);
    g.addColorStop(0, `rgba(228,236,230,${a})`);
    g.addColorStop(1, 'rgba(228,236,230,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 5 * px;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x + 0.08 * len * s, y0 - len * s);
    ctx.stroke();
  }
  ctx.restore();
}

/** The floating bird seen from below: its dark body on the surface and its feet paddling. */
function drawUnderside(ctx: CanvasRenderingContext2D, b: Bird, t: number, px: number): void {
  if (b.pose !== 'float') return;
  ctx.save();
  ctx.globalAlpha = 0.75 * b.alpha;
  ctx.fillStyle = '#0d1714';
  ctx.beginPath();
  ctx.ellipse(b.x - 4, b.y + 6, b.size * 0.3, b.size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d1714';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3 * px;
  for (const [dx, ph] of [[-6, 0], [6, Math.PI]] as const) {
    const kick = Math.sin(t * 7 + ph);
    ctx.beginPath();
    ctx.moveTo(b.x + dx, b.y + 12);
    ctx.lineTo(b.x + dx - 6 + 8 * kick, b.y + 34);
    ctx.stroke();
  }
  ctx.restore();
}

export function createTigerShark(ctx: CanvasRenderingContext2D): Short {
  const tiger = makeTigerSprite(SHARK_RES);
  const birds = makeBirdSprites(BIRD_RES);
  const feather = makeFeatherFrames(4);
  const sardine: Sprite = makeSprite('sardine', 3);
  const chart = makeChartArt(tiger);
  const layer = document.createElement('canvas');
  layer.width = VIDEO.width;
  layer.height = VIDEO.height;
  const murkCtx = layer.getContext('2d')!;

  /** A shark under the water, darkened by the murk it's in (0 clear .. 1 hidden). */
  const drawMurky = (pose: TigerPose, murk: number, cam: Camera, boil: number, deep: string): void => {
    if (murk >= 0.99) return;
    const toWorld = (c: CanvasRenderingContext2D): void => {
      c.translate(FOCUS.x, FOCUS.y);
      c.scale(cam.zoom, cam.zoom);
      c.translate(-cam.x, -cam.y);
    };
    if (murk <= 0.01) {
      drawTiger(ctx, tiger, pose, boil);
      return;
    }
    murkCtx.setTransform(1, 0, 0, 1, 0, 0);
    murkCtx.clearRect(0, 0, VIDEO.width, VIDEO.height);
    murkCtx.save();
    toWorld(murkCtx);
    drawTiger(murkCtx, tiger, pose, boil);
    murkCtx.restore();
    murkCtx.save();
    murkCtx.globalCompositeOperation = 'source-atop';
    murkCtx.fillStyle = deep;
    murkCtx.globalAlpha = Math.min(1, 0.96 * murk);
    murkCtx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    murkCtx.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.min(1, 4 * (1 - murk));
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const pal = paletteAt(t);
    const px = 1 / cam.zoom;
    const surface = toScreen(cam, { x: 0, y: 0 }).y;
    const left = cam.x - (FOCUS.x + 80) / cam.zoom;
    const right = cam.x + (VIDEO.width - FOCUS.x + 80) / cam.zoom;
    const deep = `rgb(${pal.seaDeep.map((c) => Math.round(c)).join(',')})`;

    drawBackdrop(ctx, pal, surface, cam.zoom, t);
    const flash = drawLightning(ctx, surface, t);

    ctx.save();
    ctx.translate(FOCUS.x, FOCUS.y);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    drawShafts(ctx, pal, t);
    drawSpecks(ctx, t, px);

    // Under the surface: the sharks circling, back to front, and the hero.
    const sharks: { pose: TigerPose; murk: number; z: number }[] = [];
    const hero = heroAt(t);
    if (t > 10 && t < 16.3) for (let i = 1; i < CIRCLERS_N; i++) sharks.push(circlerAt(i, t));
    if (hero) sharks.push({ ...hero, z: t > 10 && t < 15.3 ? circlerAt(0, t).z : 2 });
    sharks.sort((a, b) => a.z - b.z);
    for (const s of sharks) {
      ctx.save();
      drawMurky(s.pose, s.murk, cam, boil, deep);
      ctx.restore();
    }
    const fish = littleFishAt(t);
    if (fish) {
      drawSwimmer(ctx, sardine, { j: 0, age: 0, shape: 'sardine', x: fish.x, y: fish.y, length: 120, facing: -1, tilt: 0.05 * Math.sin(fish.beat * 0.3), beat: fish.beat, effort: 0.8 }, boil);
    }
    const flying = birdsAt(t);
    for (const b of flying) drawUnderside(ctx, b, t, px);

    drawWash(ctx, pal, t, left, right);
    const b = breachAt(t);
    if (b !== null) drawBubbles(ctx, -40, b - CRASH, px);
    drawWaterline(ctx, t, left, right, px);
    for (const sp of splashesAt(t)) {
      drawRipples(ctx, sp.x, sp.since, sp.size, px);
      drawCrown(ctx, sp.x, sp.half, sp.since, sp.size, px);
    }
    drawDrops(ctx, sprayAt(t), px);
    // On the surface and in the air: the floating bird, the feather, the flock, the bird in the hook.
    for (const bird of flying) {
      if (bird.pose === 'float') drawFloatRings(ctx, bird.x, t, bird.size * 0.6, bird.alpha, px);
      drawBird(ctx, birds, bird, boil);
    }
    const floating = floatingFeatherAt(t);
    if (floating) {
      drawFloatRings(ctx, floating.x, t, 70, floating.alpha, px);
      drawFeatherAt(ctx, feather, boil, floating.x, floating.y, 110, floating.tilt, floating.alpha);
    }
    const hookBird = hookBirdAt(t);
    if (hookBird) {
      drawFallStreak(ctx, hookBird, px);
      drawBird(ctx, birds, hookBird, boil);
    }
    const drifting = hookFeatherAt(t);
    if (drifting) drawFeatherAt(ctx, feather, boil, drifting.x, drifting.y, 120, drifting.tilt);
    ctx.restore();

    // The snap: chalk wedges bursting from the jaws as they shut on "SKY!".
    const burst = snapBurst(t);
    if (burst.u >= 0 && burst.u <= 1) drawChomp(ctx, toScreen(cam, burst.at), -1.3, 900 * cam.zoom, burst.u);

    drawRain(ctx, rainAt(t), surface, t);
    drawVignette(ctx, vignetteAt(t));
    drawFlash(ctx, flash);
    drawChart(ctx, chart, birds, t, boil);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderTigerSharkAudio };
}
