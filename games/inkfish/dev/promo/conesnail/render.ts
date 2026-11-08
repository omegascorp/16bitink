import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { renderConesnailAudio } from './audio';
import { drawBellBack, drawBellFront, type Lump, silhouette } from './bellArt';
import { drawCloud, drawDots, drawFish, drawHand, drawHarpoon, drawPeople, drawZeds } from './props';
import { drawFarReef, drawFlash, drawGrade, drawReef, drawSpecks, drawWater, INK_BG, makeReefLayer, makeSheet, PAPER_ON_INK, SPOKEN } from './scenery';
import { captionAt, insulinLabel, TEXT } from './script';
import { drawEye, drawSnailBody, makeSnailSprites } from './snailArt';
import {
  bellAt, boilAt, type Camera, cameraAt, cycles, dotsAt, eyesAt, type FishKind, fishAt, flashAt, handAt, harpoonAt, LOOP_S, lumpOf, peopleAt, puffsAt,
  rostrumAt, SCREEN_C, shakeAt, snailAt, toScreen, wrap, zedsAt,
} from './story';

/** Draws the "this snail swallows fish WHOLE" short (story.ts has the choreography). */

const CAPTION_Y = TEXT.caption.y;
const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 980;

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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** The camera's transform: snail px to screen px. */
function inWorld(ctx: CanvasRenderingContext2D, cam: Camera): void {
  ctx.translate(SCREEN_C.x - cam.x * cam.zoom, SCREEN_C.y - cam.y * cam.zoom);
  ctx.scale(cam.zoom, cam.zoom);
}

export function createConesnail(ctx: CanvasRenderingContext2D): Short {
  const sheet = makeSheet();
  const reef = makeReefLayer();
  const snail = makeSnailSprites();
  const sprites: Readonly<Record<FishKind, Sprite>> = {
    clownfish: makeSprite('clownfish', 4),
    chromis: makeSprite('chromis', 3),
    wrasse: makeSprite('wrasse', 3),
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const jolt = shakeAt(t);
    const base = cameraAt(t);
    const cam: Camera = { x: base.x - jolt.x / base.zoom, y: base.y - jolt.y / base.zoom, zoom: base.zoom };
    const at = snailAt(t);
    const eyes = eyesAt(t);
    const rostrum = rostrumAt(t);
    const bell = bellAt(t);
    const fish = fishAt(t);
    const swallowed = fish.find((f) => f.bell !== null) ?? null;
    const free = fish.filter((f) => f.bell === null);
    const lump: Lump | null = swallowed?.bell
      ? { from: bell.len - swallowed.bell.inside * swallowed.length, to: bell.len - swallowed.bell.inside * swallowed.length + swallowed.length, half: lumpOf(swallowed) }
      : null;

    drawWater(ctx, sheet, t);
    drawFarReef(ctx, cam, t);
    drawReef(ctx, cam, reef, boil, t);

    ctx.save();
    inWorld(ctx, cam);
    ctx.save();
    ctx.translate(at.x, at.y);
    const sway = 0.05 * Math.sin(cycles(6, t));
    drawEye(ctx, 0, eyes, sway, boil);
    drawSnailBody(ctx, snail, boil);
    drawEye(ctx, 1, eyes, sway * 0.8, boil);
    ctx.restore();

    drawBellBack(ctx, bell, lump, boil);
    if (swallowed?.bell) {
      ctx.save();
      if (swallowed.bell.inside >= 0.98) {
        // All in: nothing of it shows outside the sack.
        const sack = silhouette(bell, lump);
        ctx.beginPath();
        sack.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.clip();
      }
      drawFish(ctx, sprites[swallowed.shape], swallowed, boil, swallowed.bell.seen);
      ctx.restore();
    }
    drawBellFront(ctx, bell, lump, rostrum.wall, rostrum.mesh, boil);

    for (const f of free) drawFish(ctx, sprites[f.shape], f, boil);
    const harpoon = harpoonAt(t);
    if (harpoon) drawHarpoon(ctx, harpoon, boil);
    drawCloud(ctx, puffsAt(t));
    drawDots(ctx, { x: at.x + 40, y: -190 }, dotsAt(t));
    const hand = handAt(t);
    if (hand) drawHand(ctx, hand, boil);
    ctx.restore();

    drawZeds(ctx, zedsAt(t).map((z) => {
      const p = toScreen(cam, z);
      return { ...z, x: p.x, y: p.y, size: z.size * cam.zoom };
    }));
    drawSpecks(ctx, t);
    drawGrade(ctx, t);
    drawPeople(ctx, peopleAt(t));
    const label = insulinLabel(t);
    if (label > 0) drawTextLine(ctx, 'insulin', TEXT.insulin.x, TEXT.insulin.y, TEXT.insulin.size, 700, label, { fill: '#e9ffd0', halo: '#1d1030' });
    drawFlash(ctx, flashAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderConesnailAudio };
}
