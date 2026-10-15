import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeBackdrop, makeMarks } from '../backdrop';
import type { Pose } from '../chain';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { drawChomp, drawSuction } from '../effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { renderPipefishAudio } from './audio';
import { drawBaby } from './baby';
import { ageOf, BABIES, babyAlpha, babyAt, babyGone, copepodAt, SNACKS, snackOf, snoutOpen } from './brood';
import { bodyPoint, drawFishAt, pouchCentre, pouchExit, pouchShape } from './fish';
import { drawCalendar, drawCallout, drawCard, drawLens, drawSexTag } from './notes';
import { drawBurst, drawCopepod, drawFlyingEgg, drawPouch, drawSeagrass } from './scene';
import { drawSeahorse } from './seahorse';
import {
  babiesLabel, badgePulse, boilAt, BURSTS, calendarAt, captionAt, cardAt, CLOUD, dadAt, dadLabel, eggFlight, EGG_COUNT, embryoAt, femaleAt, hookLabel,
  lensAt, LOOP_S, momLabel, onlyLabel, pagesAt, pipefishLabel, pouchAt, pouchLabel, seahorseAt, seahorseLabel, squeezeAt, wrap, type Fish,
} from './story';

/** Draws the "dads get pregnant" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const SPOKEN = { fill: '#2f68ad', halo: '#f4eddc' } as const;
const UNSPOKEN = { fill: '#1b1a1f', halo: '#f4eddc' } as const;
const RED = '#d8432f';

/** The spoken line, word by word, the word being said in blue. */
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

/** The dad, his pouch over his belly, and the notes about him. */
function drawDad(ctx: CanvasRenderingContext2D, sprite: Sprite, dad: Fish, t: number, boil: number): void {
  const squeeze = squeezeAt(t);
  drawFishAt(ctx, sprite, 'pipefish', dad, boil, { squash: 1 + 0.05 * squeeze });
  const fill = pouchAt(t);
  const embryo = t > 4.5 ? embryoAt(t) : 1;
  drawPouch(ctx, pouchShape(dad, fill, squeeze), fill, embryo, pouchLabel(t));
}

function drawDadNotes(ctx: CanvasRenderingContext2D, dad: Fish, t: number): void {
  const at = { x: 330, y: dad.y - 92 };
  const swell = badgePulse(t);
  drawSexTag(ctx, 'DAD', at.x, at.y, 84, 'male', hookLabel(t), swell);
  drawSexTag(ctx, 'pipefish', at.x, at.y, 70, 'male', pipefishLabel(t), swell);
  // Out of the lens's way while it is open.
  drawSexTag(ctx, 'dad', at.x, at.y, 70, 'male', dadLabel(t) * (1 - hookLabel(t)) * (1 - lensAt(t)), swell);
  const exit = pouchExit(dad, pouchAt(t));
  drawCallout(ctx, 'pregnant!', { x: 820, y: 975 }, exit, hookLabel(t), 80);
  drawCallout(ctx, 'brood pouch', { x: 830, y: 590 }, pouchCentre(dad, pouchAt(t)), pouchLabel(t), 66);
}

/** Babies this young are still leaving the pouch: drawn over it; older ones swim behind the dad. */
const LEAVING_S = 0.5;

/** The babies (those leaving the pouch, or the rest), and the copepods some of them snap up. */
function drawBrood(ctx: CanvasRenderingContext2D, t: number, leaving: boolean): void {
  if (leaving) {
    for (const s of SNACKS) {
      const c = copepodAt(s, t);
      if (c) drawCopepod(ctx, c.x, c.y, c.size, c.kick);
    }
  }
  BABIES.forEach((baby, i) => {
    const a = ageOf(baby, t);
    if (a === null || a < LEAVING_S !== leaving) return;
    const p = babyAt(baby, a);
    if (babyGone(p)) return;
    const pose: Pose = { j: 0, shape: 'pipefish', age: 0, x: p.x, y: p.y, length: p.len, facing: p.facing, tilt: p.tilt, beat: p.beat, effort: p.effort };
    drawBaby(ctx, p, babyAlpha(p));
    const pull = snoutOpen(i, a);
    const big = { ...pose, length: pose.length * 2.2 };
    if (pull > 0) drawSuction(ctx, big, pull, t / 2);
    const snack = snackOf(i);
    if (snack) drawChomp(ctx, big, (a - snack.at) / 0.22);
  });
}

export function createPipefish(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(110,190,190,0.12)', bottom: 'rgba(60,140,130,0.32)' });
  const marks = makeMarks(28, 404);
  const dadSprite = makeSprite('pipefish', 5);
  const momSprite = makeSprite('pipefish', 4);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.drawImage(backdrop, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    drawSeagrass(ctx, t);

    const horse = seahorseAt(t);
    if (horse) drawSeahorse(ctx, horse.x, horse.y, horse.h, horse.sway, 1);

    const mom = femaleAt(t);
    if (mom) drawFishAt(ctx, momSprite, 'pipefish', mom, boil);
    const dad = dadAt(t);
    drawBrood(ctx, t, false);
    drawDad(ctx, dadSprite, dad, t, boil);

    if (mom) {
      for (let k = 0; k < EGG_COUNT; k++) {
        const u = eggFlight(k, t);
        if (u !== null) drawFlyingEgg(ctx, bodyPoint('pipefish', mom, 0.45, 1), pouchExit(dad, pouchAt(t)), u, k);
      }
    }
    for (const b of BURSTS) drawBurst(ctx, pouchExit(dad, pouchAt(t)), wrap(t - b.at) / (b === CLOUD ? 0.6 : 0.35), b === CLOUD);
    drawBrood(ctx, t, true);

    drawLens(ctx, pouchCentre(dad, pouchAt(t)), lensAt(t), embryoAt(t), t);
    drawCalendar(ctx, pagesAt(t), calendarAt(t));

    // The notes.
    drawDadNotes(ctx, dad, t);
    if (horse) drawSexTag(ctx, 'seahorse', 600, 400, 70, 'male', seahorseLabel(t), badgePulse(t));
    drawTextLine(ctx, 'the only ones!', 470, 510, 78, 700, onlyLabel(t), { fill: RED, halo: '#f4eddc' });
    if (mom) drawSexTag(ctx, 'mom', mom.x, mom.y + 112, 66, 'female', momLabel(t));
    drawTextLine(ctx, 'up to 100s of babies!', 540, 470, 80, 700, babiesLabel(t), { fill: RED, halo: '#f4eddc' });
    drawCard(ctx, cardAt(t), Math.sin(t * 2.6));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderPipefishAudio };
}
