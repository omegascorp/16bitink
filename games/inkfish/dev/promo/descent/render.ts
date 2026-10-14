import { BIRD_FRAMES, BIRD_TEX, drawBird } from '../../../src/art/birdArt';
import { CRITTER_BODY, isCritter, type CritterId } from '../../../src/art/critterArt';
import { drawCreature, fishLights, type FishShape } from '../../../src/art/fishArt';
import { FISH_TEX } from '../../../src/art/fish/kit';
import { halo } from '../../../src/art/glowArt';
import { makeCanvas, PAPER } from '../../../src/art/pen';
import { ART_RES } from '../../../src/art/propArt';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import type { BirdId } from '../../../src/logic/birds';
import { createRng } from '../../../src/logic/rng';
import type { Pose } from '../chain';
import { drawTextLine } from '../captions';
import { drawChomp, drawExclaim } from '../effects';
import { lureOf } from '../light/render';
import { ramp, window01, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderDescentAudio } from './audio';
import { drawBarreleyeAt } from './barreleye';
import { ACTORS, actorById, BEAM, BITES, CALLOUTS, EXCLAIMS, LANDER, MIGRATION, SAND, SOFT_UNTIL, SOFT_WORDS, type Actor, type Place } from './cast';
import { FRAME } from './frame';
import {
  drawChapterCard, drawCallout, dialsAt, drawDepth, drawDials, drawFigure, drawZoneBar, inkFor, PAPER_ON_INK,
} from './hud';
import { cellAlpha, drawCell, drawEverest, drawGameCard, drawSpectrum, drawTrenches, everestAlpha, routeAt, spectrumAt, trenchesAlpha } from './inserts';
import { CLOSE_UPS, closeUpAt, drawCloseUp, drawRedBeam } from './open';
import { createTerrain } from './terrain';
import { sectionStart, T, VIDEO_S } from './timeline';
import { darkBehind, drawLamp, drawLine, drawRays, drawSnow, drawSurface, drawWater, makePaper, makeSnow } from './water';
import { cameraAt, darknessAt, depthAt, metresAt, toScreen } from './world';

/**
 * Draws "fish get weirder the deeper you go… until they can't", the first
 * long-form video (script.md has the words, timeline.ts the beats). The
 * cold open's close-ups, then one continuous dive with the game's player
 * fish and the animals the narrator names, the dials and cards over it,
 * and the cut-ins (the game card, Everest, the cell, the trenches).
 */

const W = FRAME.width;
const H = FRAME.height;

// ---------------------------------------------------------------- sprites

/** Sprite px per texture px for a fish this long on screen: sharp, without wasting memory on the small ones. */
const resFor = (length: number): number => Math.max(2, Math.min(6, Math.ceil(length / 165)));

function critterSprite(kind: CritterId, res: number): Sprite {
  const side = FISH_TEX * res;
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(side, side);
    ctx.scale(res, res);
    drawCreature(ctx, kind, 'light', f, 101 + f * 977);
    return canvas;
  });
  return { frames, bodyPx: CRITTER_BODY[kind].hl * 2 * res, res };
}

function birdFrames(kind: BirdId): HTMLCanvasElement[] {
  return Array.from({ length: BIRD_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(BIRD_TEX.w * ART_RES, BIRD_TEX.h * ART_RES);
    drawBird(ctx, kind, f, 5 + f);
    return canvas;
  });
}

interface Sprites {
  fish(shape: FishShape, length: number): Sprite;
  critter(kind: CritterId): Sprite;
  bird(kind: BirdId): HTMLCanvasElement[];
}

function createSprites(): Sprites {
  const cache = new Map<string, Sprite>();
  const birds = new Map<BirdId, HTMLCanvasElement[]>();
  return {
    fish(shape, length) {
      const res = resFor(length);
      const key = `${shape}@${res}`;
      let s = cache.get(key);
      if (!s) {
        s = makeSprite(shape, res);
        cache.set(key, s);
      }
      return s;
    },
    critter(kind) {
      const key = `critter:${kind}`;
      let s = cache.get(key);
      if (!s) {
        s = critterSprite(kind, 2);
        cache.set(key, s);
      }
      return s;
    },
    bird(kind) {
      let f = birds.get(kind);
      if (!f) {
        f = birdFrames(kind);
        birds.set(kind, f);
      }
      return f;
    },
  };
}

// ---------------------------------------------------------------- drawing one actor

/** The glow of a fish's own lights, drawn over it in its frame. */
function drawGlow(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, strength: number): void {
  const lights = fishLights(pose.shape);
  if (lights.length === 0 || strength <= 0.01) return;
  const scale = pose.length / sprite.bodyPx;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(scale, scale);
  for (const l of lights) halo(ctx, (l.x - FISH_TEX / 2) * sprite.res, (l.y - FISH_TEX / 2) * sprite.res, Math.max(14, l.r * 8) * sprite.res, l.color, strength);
  ctx.restore();
}

const poseOf = (a: Actor, p: Place, t: number): Pose => ({
  j: 0, shape: a.shape as FishShape, age: 0, x: p.x, y: toScreen(p.y, t), length: a.length, facing: p.facing, tilt: p.tilt, beat: p.beat, effort: p.effort,
});

function drawActor(ctx: CanvasRenderingContext2D, sprites: Sprites, a: Actor, t: number, boil: number): void {
  const p = a.place(t);
  const y = toScreen(p.y, t);
  const reach = a.length * 0.8;
  if (p.x < -reach || p.x > W + reach || y < -reach || y > H + reach || p.alpha <= 0) return;
  ctx.save();
  if (a.saturation) ctx.filter = `saturate(${a.saturation(t).toFixed(3)}) brightness(${(0.75 + 0.25 * a.saturation(t)).toFixed(3)})`;
  if (a.kind === 'bird') {
    const frames = sprites.bird(a.shape as BirdId);
    const f = frames[Math.floor(t * 7) % frames.length]!;
    const w = a.length * 1.4;
    const h = (w * BIRD_TEX.h) / BIRD_TEX.w;
    ctx.translate(p.x, y);
    ctx.scale(p.facing, 1);
    ctx.drawImage(f, -w / 2, -h / 2, w, h);
  } else if (a.kind === 'critter') {
    const s = sprites.critter(a.shape as CritterId);
    const frame = s.frames[(Math.floor(t * 5) + boil) % s.frames.length]!;
    const scale = a.length / s.bodyPx;
    const side = frame.width * scale;
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, y);
    ctx.scale(p.facing, 1);
    ctx.drawImage(frame, -side / 2, -side / 2, side, side);
  } else if (a.shape === 'barreleye') {
    drawBarreleyeAt(ctx, { x: p.x, y, length: a.length, facing: p.facing, tilt: p.tilt, eyesUp: p.eyesUp ?? 0, beat: p.beat, effort: p.effort, alpha: p.alpha }, boil);
  } else {
    const s = sprites.fish(a.shape as FishShape, a.length);
    const pose = poseOf(a, p, t);
    const wob = p.wobble * Math.sin(t * 8.5 + a.length);
    drawSwimmer(ctx, s, pose, boil, { jaw: p.jaw, alpha: p.alpha, squash: 1 + 0.16 * wob, stretch: 1 - 0.08 * wob });
    if (a.glow) drawGlow(ctx, s, pose, darknessAt(metresAt(p.y)) * p.alpha * (0.85 + 0.15 * Math.sin(t * 3 + a.length)));
    if (a.shape === 'seadevil') {
      const lure = lureOf(s, pose);
      halo(ctx, lure.x, lure.y, 260, '#d8f4ff', 0.25 * p.alpha);
      halo(ctx, lure.x, lure.y, 70, '#d8f4ff', (0.95 + 0.05 * Math.sin(t * 5)) * p.alpha);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- effects in the dive

/** The parrotfish's sand: grains leaving its vent and sinking. */
const GRAINS = (() => {
  const rng = createRng(404);
  return Array.from({ length: 140 }, (_, i) => ({ at: SAND.from + i * 0.022, dx: (rng() - 0.5) * 40, vy: 30 + rng() * 40, r: 1.5 + rng() * 2.5 }));
})();

function drawSand(ctx: CanvasRenderingContext2D, t: number): void {
  if (t < SAND.from || t > SAND.to) return;
  const fish = actorById(SAND.actor);
  ctx.save();
  ctx.fillStyle = '#fffdf6';
  ctx.strokeStyle = 'rgba(27,26,31,0.45)';
  ctx.lineWidth = 1;
  for (const g of GRAINS) {
    if (g.at > t) break;
    const p = fish.place(g.at);
    const age = t - g.at;
    const x = p.x - p.facing * fish.length * 0.38 + g.dx * (0.3 + age) - p.facing * 12 * age;
    const y = toScreen(p.y + 10 + g.vy * age + 10 * age * age, t);
    ctx.globalAlpha = Math.max(0, 1 - age / 3.5);
    ctx.beginPath();
    ctx.arc(x, y, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** The lander: a frame with legs and a lamp, sinking into the picture; its lamp lights the water below-left. */
function drawLander(ctx: CanvasRenderingContext2D, t: number): void {
  for (const visit of [LANDER.open, LANDER.close]) {
    if (t < visit.sink || t > visit.off) continue;
    const sink = ramp(t, visit.sink, visit.sink + 3);
    const y = toScreen(LANDER.y - 900 * (1 - sink), t);
    const x = LANDER.x;
    const lamp = ramp(t, visit.lamp, visit.lamp + 0.35) * (visit === LANDER.open ? 1 - ramp(t, visit.off - 0.5, visit.off) : 1);
    drawLamp(ctx, x - 50, y + 50, 2.62, 1200, lamp);
    ctx.save();
    ctx.strokeStyle = '#b8c3dc';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeRect(x - 60, y - 70, 120, 110);
    ctx.beginPath();
    ctx.moveTo(x - 60, y - 70);
    ctx.lineTo(x + 60, y + 40);
    ctx.moveTo(x + 60, y - 70);
    ctx.lineTo(x - 60, y + 40);
    for (const lx of [-60, 0, 60]) {
      ctx.moveTo(x + lx, y + 40);
      ctx.lineTo(x + lx * 1.4, y + 100);
    }
    ctx.stroke();
    ctx.fillStyle = lamp > 0 ? '#f4f8ff' : '#5a6684';
    ctx.beginPath();
    ctx.arc(x - 50, y + 50, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/** The loosejaw's red searchlight, and the shrimp it finds (only seen in its light). */
function drawBeam(ctx: CanvasRenderingContext2D, sprites: Sprites, t: number, boil: number): void {
  if (t < BEAM.from || t > BEAM.to) return;
  const fish = actorById(BEAM.actor);
  const p = fish.place(t);
  const y = toScreen(p.y, t);
  const eye = { x: p.x + p.facing * fish.length * 0.38, y: y + 8 };
  const on = ramp(t, BEAM.from, BEAM.from + 0.6);
  const reveal = ramp(t, BEAM.reveal, BEAM.reveal + 1);
  const shrimp = actorById(BEAM.shrimp);
  const sp = shrimp.place(t);
  // Swept slowly, then held on the shrimp once it's found.
  const toShrimp = Math.atan2(toScreen(sp.y, t) - eye.y, sp.x - eye.x);
  const sweep = (1 - reveal) * 0.25 * Math.sin((t - BEAM.from) * 0.9) + reveal * toShrimp;
  drawRedBeam(ctx, eye.x, eye.y, 1, 900, sweep, on);
  if (reveal > 0 && t >= shrimp.from) {
    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.filter = 'sepia(1) saturate(5) hue-rotate(-28deg) brightness(0.9)';
    drawActor(ctx, sprites, shrimp, t, boil);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the video

export function createDescent(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const snow = makeSnow();
  const terrain = createTerrain();
  const sprites = createSprites();
  const closeSprites = new Map(CLOSE_UPS.map((c) => [c.shape, makeSprite(c.shape, 6)] as const));
  const spriteFor = (shape: FishShape): Sprite => sprites.fish(shape, 120);
  const glowWith = (sprite: Sprite) => (pose: Pose, strength: number): void => drawGlow(ctx, sprite, pose, strength);
  // Warm the sprite cache now, not mid-recording.
  for (const a of ACTORS) {
    if (a.kind === 'fish') sprites.fish(a.shape as FishShape, a.length);
    else if (a.kind === 'critter' && isCritter(a.shape)) sprites.critter(a.shape);
    else if (a.kind === 'bird') sprites.bird(a.shape as BirdId);
  }

  const drawDive = (t: number, boil: number): void => {
    const metres = depthAt(t);
    ctx.drawImage(paper, 0, 0);
    drawWater(ctx, t);
    drawRays(ctx, t);
    drawSurface(ctx, t);
    terrain.drawBack(ctx, t);
    drawSnow(ctx, snow, t, ramp(t, T.falls, T.falls + 2));
    drawLine(ctx, t, ramp(t, T.line, T.line + 1.4), window01(t, T.line, T.in2022, 0.5) + window01(t, T.thatsTheLine - 0.3, T.thatsTheLine + 2, 0.4));
    drawLander(ctx, t);
    for (const a of ACTORS) {
      if (t < a.from || t >= a.to || a.id === BEAM.shrimp) continue;
      drawActor(ctx, sprites, a, t, boil);
    }
    drawBeam(ctx, sprites, t, boil);
    for (const b of BITES) {
      const u = (t - b.t) / 0.3;
      if (u < 0 || u > 1) continue;
      const eater = actorById(b.eater);
      drawChomp(ctx, poseOf(eater, eater.place(b.t), t), u);
    }
    drawSand(ctx, t);
    for (const ex of EXCLAIMS) {
      const u = (t - ex.at) / 0.6;
      if (u < 0 || u > 1) continue;
      const a = actorById(ex.actor);
      const p = a.place(t);
      ctx.save();
      ctx.globalAlpha = u < 0.75 ? 1 : (1 - u) / 0.25;
      drawExclaim(ctx, p.x + a.length * 0.1, toScreen(p.y, t) - a.length * 0.55 - 10 * Math.sin(Math.PI * Math.min(1, u * 3)), a.length * 0.5, 0.12);
      ctx.restore();
    }
    for (const c of CALLOUTS) {
      if (t < c.from - 0.1 || t > c.to + 0.4) continue;
      const a = actorById(c.actor);
      if (t < a.from || t >= a.to) continue;
      const p = a.place(t);
      const y = toScreen(p.y, t);
      drawCallout(ctx, p.x, y, a.length * 0.55, c.label, c.note, window01(t, c.from - 0.1, c.to + 0.4, 0.3), ramp(t, c.from, c.from + 0.5), darkBehind(y, t));
    }
    // What's written over it.
    const dark = darknessAt(metres);
    const hud = Math.min(ramp(t, T.keepGoing, T.keepGoing + 0.5), 1 - window01(t, T.game - 0.2, T.lightsOff + 1.6, 0.3), 1 - ramp(t, T.startTidePool - 0.3, T.startTidePool + 0.3));
    drawDepth(ctx, metres, hud);
    drawZoneBar(ctx, metres, hud);
    drawDials(ctx, { ...dialsAt(t, metres), shown: dialsAt(t, metres).shown.map((v) => v * hud) as unknown as [number, number, number] });
    drawChapterCard(ctx, t, metres);
    const spectrum = spectrumAt(t);
    drawSpectrum(ctx, spectrum.alpha, spectrum.fade, inkFor(dark), spectrum.label, spectrum.at);
    drawFigure(ctx, '< 1%', 'of the sea floor is reef', 520, 690, window01(t, T.onePercent - 0.1, T.parrotfish - 0.2, 0.3), dark);
    drawFigure(ctx, '~ 25%', 'of all ocean species live there', 520, 900, window01(t, T.quarter - 0.1, T.parrotfish - 0.2, 0.3), dark);
    drawFigure(ctx, '3 in 4', 'animals in the deep can glow', 520, 820, window01(t, T.threeInFour - 0.1, T.barreleye - 0.3, 0.3), dark);
    drawFigure(ctx, 'every night', 'the biggest migration on Earth', 520, 860, window01(t, T.migration - 0.2, sectionStart(9) - 0.6, 0.3), dark);
    drawFigure(ctx, '~4 °C', 'no sunlight at all', 520, 860, window01(t, T.fourDegrees - 0.1, T.theyWait, 0.3), dark);
    drawFigure(ctx, '> 50%', 'of Earth’s surface is abyssal plain', 560, 780, window01(t, T.continents - 0.6, T.tripodfish - 0.3, 0.3), dark);
    SOFT_WORDS.forEach((w, i) => drawTextLine(ctx, w.text, 420, 730 + i * 66, i === 0 ? 72 : 52, 700, window01(t, w.at, SOFT_UNTIL, 0.25), PAPER_ON_INK));
    if (window01(t, T.noMoreFish - 0.1, T.beThisFish, 0.3) > 0) drawTextLine(ctx, 'no more fish', W / 2, 980, 80, 700, window01(t, T.noMoreFish - 0.1, T.beThisFish, 0.3), PAPER_ON_INK);
    if (window01(t, T.deepestFilmed - 0.1, T.belowIt - 0.3, 0.3) > 0) {
      drawTextLine(ctx, 'the deepest fish ever filmed', W / 2, 960, 84, 700, window01(t, T.deepestFilmed - 0.1, T.belowIt - 0.3, 0.3), PAPER_ON_INK);
    }
    drawEverest(ctx, paper, t, everestAlpha(t));
    drawCell(ctx, t, cellAlpha(t));
    drawTrenches(ctx, paper, t, trenchesAlpha(t));
  };

  const draw = (seconds: number): void => {
    const t = Math.max(0, Math.min(seconds, VIDEO_S - 1e-6));
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const shot = closeUpAt(t);
    if (shot) {
      const sprite = closeSprites.get(shot.shape)!;
      drawCloseUp(ctx, shot, t, sprite, boil, glowWith(sprite));
      return;
    }
    drawDive(t, boil);
    // The game card, then the lights going off, and on into the dark.
    const gameCard = window01(t, T.game - 0.3, T.lightsOff, 0.3);
    if (gameCard > 0) drawGameCard(ctx, paper, spriteFor, t, routeAt(t), gameCard, false);
    const black = t >= T.lightsOff ? 1 - ramp(t, T.everythingChanges + 0.6, sectionStart(8) + 0.4) : 0;
    if (black > 0) {
      ctx.save();
      ctx.globalAlpha = black;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // The end card.
    const end = ramp(t, T.startTidePool - 0.2, T.startTidePool + 0.6);
    if (end > 0) drawGameCard(ctx, paper, spriteFor, t, routeAt(t), end, true);
    // The rush back up in the cold open whites out into the tide pool's sunlight on "puddle".
    const flash = window01(t, T.puddle - 0.35, T.puddle + 0.25, 0.2);
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = flash * 0.85;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };

  return { loopSeconds: VIDEO_S, draw, audio: renderDescentAudio };
}
