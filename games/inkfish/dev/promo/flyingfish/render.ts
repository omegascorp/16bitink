import { BIRD_FRAMES, BIRD_TEX, drawBird } from '../../../src/art/birdArt';
import { ART_RES } from '../../../src/art/propArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { drawChomp, drawExclaim } from '../effects';
import { VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderFlyingFishAudio } from './audio';
import { boilAt, LOOP_S, wrap } from './beats';
import { bubbleAt, BUBBLES } from './bubbles';
import { drawFerry, lensOf } from './ferry';
import { type Fish, FISH_SPLASHES, fishAt, screenX, SURFACE_Y } from './flight';
import { drawWingHighlight, drawWings, FAR_TIP, onFish, WINGLESS } from './flyer';
import { ferryAt, GANNET_SCALE, GANNET_SPLASH, gannetAt, type Gannet, MAHI_SNAP, mahiAt } from './hunters';
import { drawArrow, drawBadge, drawFinsNote, drawLabel, drawRecFrame, drawRuler, drawSightLine, drawStopwatch, SPOKEN, UNSPOKEN } from './marks';
import {
  drawBubble, drawRipples, drawShafts, drawSky, drawSpeedLines, drawSplash, drawWater, drawWaterline, drawZigzag, RIPPLE_S, SPLASH_S,
} from './scenery';
import {
  alarmAt, badgeAt, cameraAt, captionAt, finsNoteAt, fourHundredAt, gannetLabelAt, mahiLabelAt, metresAt, recAt, rulerAt, stopwatchAt, wingGlowAt,
} from './story';

/** Draws "This fish flew for forty-five seconds" (beats.ts, flight.ts, hunters.ts and story.ts have the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const GANNET_RES = 6;
const BOIL_SEED = (f: number): number => 101 + f * 977;

/** The game's gannet, one canvas per boil frame and wing frame, facing right. */
function makeGannetFrames(): HTMLCanvasElement[][] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) =>
    Array.from({ length: BIRD_FRAMES }, (_, wing) => {
      const canvas = document.createElement('canvas');
      canvas.width = BIRD_TEX.w * GANNET_RES;
      canvas.height = BIRD_TEX.h * GANNET_RES;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(GANNET_RES / ART_RES, GANNET_RES / ART_RES);
      drawBird(ctx, 'gannet', wing, 523 + f * 313);
      return canvas;
    }));
}

/** The gannet, turned nose-down by its heading. */
function drawGannet(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[][], boil: number, g: Gannet): void {
  const canvas = frames[boil % frames.length]![g.frame]!;
  const k = GANNET_SCALE / GANNET_RES;
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.heading);
  ctx.scale(k, k);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  ctx.restore();
}

/** The spoken line, word by word, the word being said in orange. */
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
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : UNSPOKEN);
    x += (natural[i]! + space) * k;
  });
}

/** Splashes, their ripples, and the zigzag the tail leaves on the waves. */
function drawSurfaceMarks(ctx: CanvasRenderingContext2D, t: number): void {
  for (const s of [...FISH_SPLASHES, GANNET_SPLASH]) {
    const since = wrap(t - s.at);
    if (since > RIPPLE_S + 0.6) continue;
    const x = screenX(s.wx, s.at, t);
    drawRipples(ctx, x, since, s.kind === 'flick' ? 0.35 : 0.8);
    if (since <= SPLASH_S) drawSplash(ctx, x, since, s);
  }
  const flicks = FISH_SPLASHES.filter((s) => s.kind === 'flick');
  const shown = flicks.filter((s) => t >= s.at && t - s.at < 3).map((s) => ({ x: screenX(s.wx, s.at, t), since: t - s.at }));
  drawZigzag(ctx, shown);
}

/** The notes over the scene: stopwatch, record, REC frame, fins = wings, ruler, names, "!". */
function drawNotes(ctx: CanvasRenderingContext2D, t: number, fish: Fish): void {
  const watch = stopwatchAt(t);
  drawStopwatch(ctx, 900, 390, 80, watch.seconds, watch.alpha);
  const badge = badgeAt(t);
  drawBadge(ctx, 330, 305, badge.alpha, badge.year);
  drawRecFrame(ctx, fish.x - 20, fish.y - 5, 560, 310, recAt(t), t);

  const note = finsNoteAt(t);
  if (note.fins > 0) {
    drawFinsNote(ctx, 470, 345, note.fins, note.wings);
    drawArrow(ctx, { x: 330, y: 370 }, onFish(fish, { x: FAR_TIP.x + 22, y: FAR_TIP.y + 20 }), note.fins);
  }
  drawRuler(ctx, 110, 950, 360, metresAt(t), rulerAt(t), fourHundredAt(t));

  const clampX = (x: number): number => Math.max(170, Math.min(VIDEO.width - 170, x));
  const mahi = mahiAt(t);
  if (mahi) drawLabel(ctx, 'mahi-mahi', clampX(mahi.x - 30), mahi.y - 95, mahiLabelAt(t));
  const g = gannetAt(t);
  if (g) drawLabel(ctx, 'gannet', clampX(g.x + 40), g.y - 75, gannetLabelAt(t));
  const pop = alarmAt(t);
  if (pop > 0) drawExclaim(ctx, fish.x + 175, fish.y - 85, 110 * pop, 0.15);
}

export function createFlyingFish(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makePaper();
  const flyer = makeSprite('flyingfish', 4, 'light', WINGLESS);
  const mahi = makeSprite('mahi', 4, 'heavy');
  const gannet = makeGannetFrames();

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.drawImage(backdrop, 0, 0);
    drawSky(ctx, t);
    const fish = fishAt(t);

    const ferry = ferryAt(t);
    if (ferry) {
      const lens = lensOf(ferry.x, ferry.y);
      drawSightLine(ctx, lens, fish, cameraAt(t) * recAt(t));
      drawFerry(ctx, { ...ferry, aim: fish, camera: cameraAt(t), t });
    }

    const m = mahiAt(t);
    if (m) drawSwimmer(ctx, mahi, m, boil, { jaw: m.jaw });
    const g = gannetAt(t);
    if (g) drawGannet(ctx, gannet, boil, g);

    drawSpeedLines(ctx, fish.x, fish.y, t, Math.max(0, Math.min(1, (SURFACE_Y - 60 - fish.y) / 80)) * fish.fold);
    drawWings(ctx, fish, fish.fold, BOIL_SEED(boil) + 17);
    drawSwimmer(ctx, flyer, fish, boil);
    drawWingHighlight(ctx, fish, fish.fold, wingGlowAt(t));

    // The sea over whatever is in it, then what happens on its surface.
    drawWater(ctx, t);
    drawShafts(ctx, t);
    drawWaterline(ctx, t);
    for (const b of BUBBLES) {
      const p = bubbleAt(b, t);
      if (p) drawBubble(ctx, p.x, p.y, p.r, p.alpha);
    }
    drawSurfaceMarks(ctx, t);
    if (m) drawChomp(ctx, m, wrap(t - MAHI_SNAP) / 0.14);

    drawNotes(ctx, t, fish);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderFlyingFishAudio };
}
