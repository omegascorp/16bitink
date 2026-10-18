import { halo } from '../../../src/art/glowArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine, type TextInk } from '../captions';
import { drawCallout, fontOf, INK_BG, PAPER_ON_INK, SPOKEN } from '../gulper/scenery';
import { VIDEO, type Short } from '../short';
import { drawAngler, drawRod, headOf, rodTipOf } from './anglers';
import { renderMakoAudio } from './audio';
import { drawBoatBack, drawHull } from './boat';
import { anglerAt, boatAt, onBoat, type Pt, rodAt } from './crew';
import { drawMako, makeMakoSprite, MOUTH, type MakoPose, pointOn } from './jaws';
import {
  CHALK, drawBackdrop, drawBubbles, drawClouds, drawDeckSplash, drawRipples, drawShafts, drawSpecks, drawSpeedLines, drawSplash, drawSpray, drawWash, drawWaterline,
} from './sea';
import { PX_PER_M, SHARK_LEN, type Shark, SIX_M_Y } from './shark';
import {
  BUBBLE_SPLASHES, boilAt, type Camera, cameraAt, captionAt, CENTRE, deckSplashAt, flopMarks, hookFlash, LOOP_S, makoLabel, placeLabel, rulerAt, RULER_X, shakeAt,
  sharkWorld, sinceSplash, SPLASHES, sprayAt, streakAt, thrashMarks, toScreen, yourBoatLabel,
} from './story';

/** Draws "This shark can jump INTO your boat!" (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
const CAPTION_MAX_W = 980;
/** Sprite px per texture px: the mako is up to ~480 px long on screen. */
const SHARK_RES = 5;
const SPOKEN_INK: TextInk = { fill: SPOKEN, halo: INK_BG };

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = fontOf(CAPTION_SIZE);
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

/** The mako's pose in world px, for drawMako under the camera's transform. */
const poseOf = (s: Shark): MakoPose => ({ x: s.x, y: s.y, length: SHARK_LEN, turn: s.turn, tilt: s.tilt, beat: s.beat, effort: s.effort, jaw: s.jaw });

/** How fast the camera moves, world px per second, for blurring the specks it races past. */
function cameraDrift(t: number): Pt {
  const h = 1 / 60;
  const a = cameraAt(t - h);
  const b = cameraAt(t + h);
  return { x: (b.x - a.x) / (2 * h), y: (b.y - a.y) / (2 * h) };
}

/** Small chalk marks: nervous twitches round the mako on the line, comic flop lines round its tail on the deck. */
function drawTwitches(ctx: CanvasRenderingContext2D, centre: Pt, size: number, strength: number, t: number, px: number): void {
  if (strength <= 0) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 * px;
  ctx.globalAlpha = strength * (0.6 + 0.4 * Math.sin(t * 40) ** 2);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4;
    const r = size * (1 + 0.08 * Math.sin(t * 30 + k));
    ctx.beginPath();
    ctx.arc(centre.x + Math.cos(a) * r, centre.y + Math.sin(a) * r * 0.6, size * 0.18, a - 0.6, a + 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

/** The chalk ruler beside the 6 m leap: a line up from the sea, a tick each metre, "6 m" at the top. */
function drawRuler(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const r = rulerAt(t);
  if (r.shown <= 0) return;
  const base = toScreen(cam, { x: RULER_X, y: 0 });
  const top = toScreen(cam, { x: RULER_X, y: r.top });
  ctx.save();
  ctx.globalAlpha = r.shown;
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (let m = 1; m <= 6; m++) {
    const y = toScreen(cam, { x: RULER_X, y: -m * PX_PER_M }).y;
    if (y < top.y - 1) break;
    const w = m === 6 ? 34 : 20;
    ctx.beginPath();
    ctx.moveTo(base.x - w, y);
    ctx.lineTo(base.x + w, y);
    ctx.stroke();
  }
  ctx.restore();
  if (r.label > 0) {
    const y6 = toScreen(cam, { x: RULER_X, y: SIX_M_Y }).y;
    drawTextLine(ctx, '6 m', base.x + 120, y6 + 30, 120, 700, r.label, SPOKEN_INK);
  }
}

export function createMako(ctx: CanvasRenderingContext2D): Short {
  const sprite = makeMakoSprite(SHARK_RES);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const jolt = shakeAt(t);
    const px = 1 / cam.zoom;
    const surface = toScreen(cam, { x: 0, y: 0 }).y + jolt.y;
    drawBackdrop(ctx, surface, cam.zoom);
    drawClouds(ctx, cam.x, surface, cam.zoom, t);

    const shark = sharkWorld(t);
    const pose = poseOf(shark);
    const boat = boatAt(t);
    const rod = rodAt(t);
    const a = anglerAt(t, 'A');
    const b = anglerAt(t, 'B');
    const left = cam.x - (CENTRE.x + 60) / cam.zoom;
    const right = cam.x + (VIDEO.width - CENTRE.x + 60) / cam.zoom;
    const mouth = pointOn(pose, MOUTH);

    ctx.save();
    ctx.translate(CENTRE.x + jolt.x, CENTRE.y + jolt.y);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    drawShafts(ctx, t);
    const drift = cameraDrift(t);
    drawSpecks(ctx, t, px, { x: -drift.x * 0.05, y: -drift.y * 0.05 });

    // The cabin, the anglers and the rod, rocking with the boat.
    const pullWorld = { x: mouth.x, y: mouth.y };
    ctx.save();
    ctx.translate(0, boat.heave);
    ctx.rotate(boat.roll);
    drawBoatBack(ctx, boil, px, 1);
    drawAngler(ctx, b, 'B', px);
    drawAngler(ctx, a, 'A', px);
    // The rod bends towards the mako (a unit direction in the boat's frame).
    const tip0 = onBoat(boat, rodTipOf(a, { ...rod, bend: 0 }, { x: 0, y: 0 }));
    const toFish = { x: pullWorld.x - tip0.x, y: pullWorld.y - tip0.y };
    const dist = Math.hypot(toFish.x, toFish.y) || 1;
    const pull = { x: toFish.x / dist, y: toFish.y / dist };
    drawRod(ctx, a, rod, pull, px);
    ctx.restore();

    // The line, from the rod tip down into the sea to the mako's mouth.
    if (rod.line !== null) {
      const tip = onBoat(boat, rodTipOf(a, rod, pull));
      const sag = (1 - rod.line) * 140;
      ctx.save();
      ctx.strokeStyle = '#e6ecf7';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2 * px;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.quadraticCurveTo((tip.x + mouth.x) / 2, (tip.y + mouth.y) / 2 + sag, mouth.x, mouth.y);
      ctx.stroke();
      ctx.restore();
      const flash = hookFlash(t);
      if (flash > 0) drawTwitches(ctx, tip, 34, flash, t, px);
    }

    // The mako, lifted off the dark by a faint glow.
    const under = shark.y > SHARK_LEN * 0.1;
    halo(ctx, shark.x, shark.y, SHARK_LEN * 0.75, '#8fb0ff', under ? 0.07 : 0.16);
    drawMako(ctx, sprite, pose, boil);

    ctx.save();
    ctx.translate(0, boat.heave);
    ctx.rotate(boat.roll);
    drawHull(ctx, boil, px);
    ctx.restore();

    drawWash(ctx, t, left, right);
    // Speed lines streaming behind it as it races.
    const streak = streakAt(t);
    if (streak > 0) {
      const back = { x: -shark.turn * Math.cos(shark.tilt), y: shark.turn * Math.sin(shark.tilt) };
      const len = Math.hypot(back.x, back.y) || 1;
      drawSpeedLines(ctx, { x: shark.x, y: shark.y }, { x: back.x / len, y: back.y / len }, SHARK_LEN, streak, t, px);
    }
    for (const sp of BUBBLE_SPLASHES) drawBubbles(ctx, sp.x, sinceSplash(t, sp), px);
    drawWaterline(ctx, t, left, right, px);
    for (const sp of SPLASHES) {
      const since = sinceSplash(t, sp);
      drawRipples(ctx, sp.x, since, sp.size, px);
      drawSplash(ctx, sp.x, since, sp.size, px);
    }
    drawSpray(ctx, sprayAt(t), px);
    const deck = deckSplashAt(t);
    if (deck) drawDeckSplash(ctx, deck.at, deck.since, px);
    drawTwitches(ctx, { x: shark.x, y: shark.y }, SHARK_LEN * 0.42, thrashMarks(t), t, px);
    drawTwitches(ctx, pointOn(pose, { x: 40, y: 128 }), 70, flopMarks(t), t, px);
    ctx.restore();

    // Notes, on screen.
    const toS = (p: Pt): Pt => {
      const q = toScreen(cam, p);
      return { x: q.x + jolt.x, y: q.y + jolt.y };
    };
    const yours = yourBoatLabel(t);
    if (yours > 0) drawCallout(ctx, 'your boat', { x: 850, y: 640 }, toS(onBoat(boat, { x: 120, y: -214 })), yours, 84);
    const named = makoLabel(t);
    if (named > 0) {
      const at = toS(shark);
      // Over it, but under the surface, clear of the splash as it dives.
      drawCallout(ctx, 'shortfin mako', { x: at.x, y: Math.max(at.y - 190, surface + 150) }, null, named, 90);
    }
    drawRuler(ctx, cam, t);
    const place = placeLabel(t);
    if (place) drawTextLine(ctx, place.text, VIDEO.width / 2, 400, 96 * place.pop, 700, place.shown, PAPER_ON_INK);
    for (const [who, angler] of [['A', a], ['B', b]] as const) {
      if (angler.alarm <= 0) continue;
      const head = toS(onBoat(boat, headOf(angler)));
      drawTextLine(ctx, '!', head.x + (who === 'A' ? -6 : 10), head.y - 34 * cam.zoom, 78 * cam.zoom * angler.alarm, 700, Math.min(1, angler.alarm), SPOKEN_INK);
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderMakoAudio };
}
