import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeBackdrop, makeMarks } from '../backdrop';
import type { Pose } from '../chain';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { drawChomp, drawExclaim, drawSuction, suckedIn } from '../effects';
import { ramp, VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderClownfishAudio } from './audio';
import { drawBadge, drawRank, drawRing, drawTags, SPOKEN, UNSPOKEN } from './marks';
import { drawAnemone, drawEggs, drawPop, makeFloor } from './scenery';
import {
  alarmAt, anemonePulse, badgeAt, BARRA_LEN, barracudaAt, BITE_AT, boilAt, captionAt, chompAt, type Clown, clownAt, EGGS, eatenAt, eggAt, HATCHING,
  hatchRingAt, LOOP_S, rankOf, rankShown, ringAt, type Role, shakeAt, SUCK_S, suctionAt, tagsAt,
} from './story';

/** Draws the "Nemo's dad should have become his mom" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const BADGE_R = 24;

/** Back to front: the small ones nestle in the anemone, the big ones swim over them. */
const DRAW_ORDER: readonly Role[] = ['D', 'C', 'A', 'B'];

const poseOf = (shape: 'clownfish' | 'barracuda', x: number, y: number, length: number, facing: 1 | -1, tilt: number, beat: number, effort: number): Pose => ({
  j: 0, shape, age: 0, x, y, length, facing, tilt, beat, effort,
});

/** A clownfish, turned by its `face` (through edge-on) and rolled by `up` (belly up when dead). */
function drawClown(ctx: CanvasRenderingContext2D, sprite: Sprite, c: Clown, boil: number): void {
  if (Math.abs(c.face) < 0.01 || Math.abs(c.up) < 0.01) return;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(c.face, c.up);
  drawSwimmer(ctx, sprite, poseOf('clownfish', 0, 0, c.len, 1, 0, c.beat, c.effort), boil, { alpha: c.alpha });
  ctx.restore();
}

/** Its badge, rank and notes, above it. */
function drawLabels(ctx: CanvasRenderingContext2D, role: Role, c: Clown, t: number): void {
  const x = c.x;
  const badgeY = c.y - c.len * 0.42 - 44;
  // Mom's notes go with her into the barracuda's mouth.
  const fade = role === 'B' ? 1 - ramp(t, BITE_AT - SUCK_S, BITE_AT - SUCK_S + 0.12) : 1;
  const alpha = c.alpha * fade;
  const badge = badgeAt(role, t);
  drawBadge(ctx, x, badgeY, BADGE_R, badge.sex, badge.width, alpha);
  const shown = rankShown(t) * alpha;
  if (shown > 0) drawRank(ctx, x - 76, badgeY + 20, rankOf(role, t), shown);
  drawTags(ctx, tagsAt(role, t), x, badgeY - 50);
  const pop = alarmAt(role, t);
  if (pop > 0) drawExclaim(ctx, x + Math.sign(c.face) * c.len * 0.5, c.y - c.len * 0.4, c.len * 0.45 * pop, Math.sign(c.face) * 0.15);
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

export function createClownfish(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(70,160,205,0.07)', bottom: 'rgba(40,120,170,0.3)' });
  const marks = makeMarks(30, 91);
  const floor = makeFloor();
  const clown = makeSprite('clownfish', 5);
  const barracuda = makeSprite('barracuda', 6, 'heavy');

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.drawImage(backdrop, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    ctx.drawImage(floor, 0, 0);
    drawEggs(ctx, (i) => eggAt(i, t));
    drawPop(ctx, EGGS[HATCHING[0]]!.x, EGGS[HATCHING[0]]!.y, hatchRingAt('C', t));
    drawPop(ctx, EGGS[HATCHING[1]]!.x, EGGS[HATCHING[1]]!.y, hatchRingAt('D', t));

    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    drawAnemone(ctx, t, anemonePulse(t));

    const clowns = DRAW_ORDER.map((role) => ({ role, c: clownAt(role, t) }));
    const eaten = eatenAt(t);
    for (const { role, c } of clowns) if (c && !(role === 'B' && eaten !== null)) drawClown(ctx, clown, c, boil);

    const b = barracudaAt(t);
    if (b) {
      const pose = poseOf('barracuda', b.x, b.y, BARRA_LEN, 1, b.tilt, b.beat, b.effort);
      const look: SwimLook = { jaw: b.jaw, squash: 1 - 0.1 * b.snap, stretch: 1 + 0.05 * b.snap, ...(b.lump > 0 ? { lump: { size: b.lump, at: 0.4 } } : {}) };
      const mom = clownAt('B', t);
      if (eaten !== null && mom) {
        // Inside of its mouth, mom going in, then the barracuda over her.
        drawSwimmer(ctx, barracuda, pose, boil, { ...look, part: 'mouth' });
        const [prey, shape] = suckedIn(poseOf('clownfish', mom.x, mom.y, mom.len, 1, 0, mom.beat, 1), pose, eaten);
        drawSwimmer(ctx, clown, prey, boil, shape);
        drawSwimmer(ctx, barracuda, pose, boil, { ...look, part: 'body' });
      } else {
        drawSwimmer(ctx, barracuda, pose, boil, look);
      }
      drawSuction(ctx, pose, suctionAt(t), t / 3);
      drawChomp(ctx, pose, chompAt(t) / 0.14);
    }

    for (const { role, c } of clowns) {
      if (!c) continue;
      drawRing(ctx, c.x, c.y, c.len, ringAt(role, t));
      drawLabels(ctx, role, c, t);
    }
    ctx.restore();

    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderClownfishAudio };
}
