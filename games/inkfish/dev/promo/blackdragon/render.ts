import { halo } from '../../../src/art/glowArt';
import { PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { mouthOf } from '../chain';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { suckedIn } from '../effects';
import { VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderBlackdragonAudio } from './audio';
import { bodyPoint, drawFishAt, lightsOf, type Pt, screenPoseOf, silhouette } from './fish';
import { drawLens, GRANULE_LAYER } from './lens';
import {
  BLUE_LIGHT, CHALK, drawCallout, drawExclaim, drawLamp, drawRay, drawSnap, drawSnow, drawSwallow, fillBeam, fillPool, LAMP_LIGHT, makeWater, NIGHT,
} from './scene';
import {
  alarmAt, beamAngle, boilAt, captionAt, dragonAt, eatenAt, type Fish, granulesAt, hunterAt, hunterLabel, LAMP, lampOn, LENS_RAYS, lensAt, lensRayAt,
  LOOP_S, nameLabel, numberAt, ordinaryLabel, pigmentLabel, preyAt, preyGlow, type PreyId, preyLabel, RAYS, type Ray, type RayEnd, readoutAt,
  reflectedAt, SKIN_SPOT, snapAt,
} from './story';

/** Draws the "blacker than black" short (story.ts has the choreography). */

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: NIGHT };
const SPOKEN = '#f5c84a';
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const LABEL_SIZE = 64;
/** How far each bristlemouth's light reaches, px: far enough to give away a hunter creeping close. */
const POOL: Readonly<Record<PreyId, number>> = { near: 400, meal: 270 };
const PREY_IDS: readonly PreyId[] = ['near', 'meal'];
/** A ray's lit stretch, px. */
const TRAIL = 120;

const text = (ctx: CanvasRenderingContext2D) => (s: string, x: number, y: number, size: number, alpha: number): void =>
  drawTextLine(ctx, s, x, y, size, 700, alpha, PAPER_ON_INK);

interface Cast {
  readonly dragon: Fish;
  readonly hunter: Fish;
  readonly prey: Readonly<Record<PreyId, Fish | null>>;
}

const castAt = (t: number): Cast => ({ dragon: dragonAt(t), hunter: hunterAt(t), prey: { near: preyAt('near', t), meal: preyAt('meal', t) } });

function endPoint(cast: Cast, end: RayEnd, seed: number): Pt | null {
  if (end.kind === 'lamp') return { x: LAMP.x + 6, y: LAMP.y + ((seed * 37) % 90) - 45 };
  if (end.who === 'dragon') return bodyPoint('blackdragon', cast.dragon, end.along, end.side);
  if (end.who === 'hunter') return bodyPoint('sabertooth', cast.hunter, end.along, end.side);
  const f = cast.prey[end.who];
  return f ? bodyPoint('bristlemouth', f, end.along, end.side) : null;
}

/** Where a bristlemouth's light is: the one being eaten carries it into the blackdragon's mouth. */
function whereGlowing(cast: Cast, id: PreyId, t: number): Fish | null {
  const f = cast.prey[id];
  const eaten = eatenAt(t);
  if (!f || id !== 'meal' || eaten === null) return f;
  const [p] = suckedIn(screenPoseOf('bristlemouth', f), screenPoseOf('blackdragon', cast.dragon), eaten);
  return { ...f, x: p.x, y: p.y, len: p.length, tilt: p.tilt };
}

/** A ray on its way, then swallowed by the blackdragon or bounced off anything else. */
function drawRayAt(ctx: CanvasRenderingContext2D, cast: Cast, ray: Ray, index: number, t: number): void {
  const u = (t - ray.at) / ray.travel;
  if (u <= 0 || u > 2.2) return;
  const from = endPoint(cast, ray.from, index);
  const to = endPoint(cast, ray.to, index);
  if (!from || !to) return;
  const colour = ray.colour === 'lamp' ? LAMP_LIGHT : BLUE_LIGHT;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  if (u <= 1) {
    const tip = { x: from.x + dx * u, y: from.y + dy * u };
    const back = Math.min(TRAIL, d * u);
    drawRay(ctx, { x: tip.x - (dx / d) * back, y: tip.y - (dy / d) * back }, tip, colour, 1);
    return;
  }
  const v = u - 1;
  if (v <= 1) {
    // The tail of the ray running on into the spot it hit.
    const left = TRAIL * (1 - v);
    if (left > 4) drawRay(ctx, { x: to.x - (dx / d) * left, y: to.y - (dy / d) * left }, to, colour, 1, false);
  }
  if (!ray.back) {
    drawSwallow(ctx, to, colour, v / 0.8);
    return;
  }
  const away = ray.back.kind === 'lamp' ? { x: to.x - 0.35 * 420, y: to.y - 0.94 * 420 } : endPoint(cast, ray.back, index);
  if (!away || v > 1.2) return;
  const w = Math.min(1, v);
  const bx = away.x - to.x;
  const by = away.y - to.y;
  const bd = Math.hypot(bx, by) || 1;
  const tip = { x: to.x + bx * w, y: to.y + by * w };
  const back = Math.min(TRAIL, bd * w);
  drawRay(ctx, { x: tip.x - (bx / bd) * back, y: tip.y - (by / bd) * back }, tip, colour, 1 - Math.max(0, v - 1) / 0.2);
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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: NIGHT } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** "99.95%" as it's said, what it is, and how little comes back. */
function drawReadout(ctx: CanvasRenderingContext2D, t: number): void {
  const show = readoutAt(t);
  if (show <= 0) return;
  const n = numberAt(t);
  if (n) drawTextLine(ctx, n, VIDEO.width / 2, 420, 150, 700, show, { fill: SPOKEN, halo: NIGHT });
  drawTextLine(ctx, 'of the light, swallowed', VIDEO.width / 2, 492, 60, 700, show * (n.endsWith('%') ? 1 : 0), PAPER_ON_INK);
  const back = reflectedAt(t);
  if (back > 0) drawTextLine(ctx, 'light reflected: 0.05%', VIDEO.width / 2, 560, 60, 700, back, { fill: CHALK, halo: NIGHT });
}

export function createBlackdragon(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const layer = (): CanvasRenderingContext2D => {
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO.width;
    canvas.height = VIDEO.height;
    return canvas.getContext('2d')!;
  };
  const mask = layer();
  const lit = layer();
  const black = silhouette(makeSprite('blackdragon', 4), 'blackdragon');
  const saber = makeSprite('sabertooth', 3);
  const bristle = makeSprite('bristlemouth', 2);

  /** The blackdragon, and the bristlemouth going into its mouth when it bites (drawn only where there's light: `lit`). */
  const drawDragon = (c: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, withPrey: boolean): void => {
    const f = cast.dragon;
    const pose = screenPoseOf('blackdragon', f);
    const look = { jaw: f.jaw, ...(f.lump > 0 ? { lump: { size: f.lump, at: 0.3 } } : {}) };
    const eaten = eatenAt(t);
    const meal = cast.prey.meal;
    if (eaten !== null && meal && withPrey) {
      drawSwimmer(c, black, pose, boil, { ...look, part: 'mouth' });
      const [prey, shape] = suckedIn(screenPoseOf('bristlemouth', meal), pose, eaten);
      drawSwimmer(c, bristle, prey, boil, shape);
      drawSwimmer(c, black, pose, boil, { ...look, part: 'body' });
    } else {
      drawSwimmer(c, black, pose, boil, look);
    }
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const on = lampOn(t);
    const angle = beamAngle(t);
    const cast = castAt(t);
    const glows = PREY_IDS.map((id) => ({ id, f: whereGlowing(cast, id, t), glow: preyGlow(id, t) * (id === 'meal' ? 1 - (eatenAt(t) ?? 0) : 1) }));

    // The dark: water, snow, the beam's haze, the bristlemouths' blue, and the fish barely there.
    ctx.drawImage(water, 0, 0);
    drawSnow(ctx, t, '#c8d4f0', 0.16);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    fillBeam(ctx, angle, on, '255,232,180', 0.5, 0.2);
    ctx.restore();
    for (const { f, glow } of glows) if (f && glow > 0) halo(ctx, f.x, f.y, 300, BLUE_LIGHT, 0.32 * glow);
    drawFishAt(ctx, saber, 'sabertooth', cast.hunter, boil, { alpha: 0.12 });
    drawDragon(ctx, cast, t, boil, false);

    // Everything as the light shows it, kept only where light falls.
    mask.clearRect(0, 0, VIDEO.width, VIDEO.height);
    mask.save();
    mask.globalCompositeOperation = 'lighter';
    fillBeam(mask, angle, on, '255,255,255', 1, 0.8);
    for (const { id, f, glow } of glows) if (f) fillPool(mask, f, POOL[id], glow);
    mask.restore();
    lit.clearRect(0, 0, VIDEO.width, VIDEO.height);
    drawSnow(lit, t, '#fff4d6', 0.7);
    drawFishAt(lit, saber, 'sabertooth', cast.hunter, boil);
    const near = cast.prey.near;
    if (near) drawFishAt(lit, bristle, 'bristlemouth', near, boil);
    const meal = cast.prey.meal;
    if (meal && eatenAt(t) === null) drawFishAt(lit, bristle, 'bristlemouth', meal, boil);
    drawDragon(lit, cast, t, boil, true);
    lit.save();
    lit.globalCompositeOperation = 'destination-in';
    lit.drawImage(mask.canvas, 0, 0);
    lit.restore();
    ctx.drawImage(lit.canvas, 0, 0);

    // Lights: the bristlemouths' photophores, and the blackdragon's own little ones.
    for (const { f, glow } of glows) {
      if (!f || glow <= 0) continue;
      for (const l of lightsOf('bristlemouth', f)) halo(ctx, l.x, l.y, Math.max(12, l.r * 7), l.color, 0.85 * glow);
    }
    for (const l of lightsOf('blackdragon', cast.dragon)) halo(ctx, l.x, l.y, Math.max(10, l.r * 5), l.color, 0.5);
    drawLamp(ctx, angle, on);

    RAYS.forEach((ray, i) => {
      if (ray.colour === 'lamp' && on < 0.5) return;
      drawRayAt(ctx, cast, ray, i, t);
    });
    drawSnap(ctx, mouthOf(screenPoseOf('blackdragon', cast.dragon)), -1, 90, snapAt(t));
    const pop = alarmAt(t);
    if (pop > 0 && near) drawExclaim(ctx, near.x + 20, near.y - 110, 120 * pop, -0.12);

    drawLens(ctx, bodyPoint('blackdragon', cast.dragon, SKIN_SPOT, -0.2), lensAt(t), granulesAt(t), LENS_RAYS.map((_, i) => lensRayAt(i, t)));

    const write = text(ctx);
    const h = cast.hunter;
    drawCallout(ctx, write, 'ordinary fish', { x: h.x, y: h.y - 100 }, null, ordinaryLabel(t), LABEL_SIZE);
    drawCallout(ctx, write, 'hunter', { x: h.x, y: h.y - 100 }, null, hunterLabel(t), LABEL_SIZE);
    drawCallout(ctx, write, 'Pacific blackdragon', { x: 610, y: 1090 }, null, nameLabel(t), LABEL_SIZE);
    for (const { f } of glows) if (f) drawCallout(ctx, write, 'prey', { x: f.x, y: f.y - 70 }, null, preyLabel(t), 56);
    drawCallout(ctx, write, 'pigment granules', { x: 790, y: 420 }, GRANULE_LAYER, pigmentLabel(t) * Math.min(1, lensAt(t) * 2), LABEL_SIZE);
    drawReadout(ctx, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBlackdragonAudio };
}

