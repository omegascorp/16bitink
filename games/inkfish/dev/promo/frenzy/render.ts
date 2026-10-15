import { INK } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine } from '../captions';
import { drawChomp, drawExclaim, drawSuction } from '../effects';
import { makeBackdrop } from '../backdrop';
import { asPose } from '../gameplay/fish';
import { drawCredit, GROWTH_INK, SCORE_INK } from '../gameplay/hud';
import { drawZoomMarks, type MarkField } from '../gameplay/marks';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderFrenzyAudio } from './audio';
import { drawBoldText, drawComboHud } from './hud';
import { schoolAt } from './school';
import {
  BAR_MARKS, bubblesAt, CAPTIONS, captionAlpha, DRIFT, floatScores, frenzyShout, GULPS, growthBar, LOOP_S, meterAt, multiplierAt, playerEyes, playerFish, playerJaw,
  playerLump, gulpSnap, shake, storyTime, suction,
} from './story';

/** Draws the "all-you-can-eat buffet" short (story.ts has the choreography). */

/** Fish are placed in screen px; the marks drift past as if the camera follows you through the water. */
const FIELD: MarkField = { focus: { x: VIDEO.width / 2, y: VIDEO.height / 2 }, scale: 1, loopS: LOOP_S };

/** The game's label, shouted big where the captions sit. */
const SHOUT = { text: '×5 INK FRENZY!', y: 420, size: 124 } as const;

/** A glint off a minnow's flank: a little inked four-point star. */
function drawGlint(ctx: CanvasRenderingContext2D, p: Pose, amount: number): void {
  if (amount < 0.02) return;
  const x = p.x - p.facing * p.length * 0.05;
  const y = p.y - p.length * 0.2;
  const r = 26 * amount;
  ctx.save();
  ctx.fillStyle = '#fffdf6';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.globalAlpha = Math.min(1, amount * 1.5);
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const d = k % 2 ? r * 0.28 : r;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBubbles(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = 'rgba(255,253,246,0.55)';
  ctx.lineWidth = 2;
  for (const b of bubblesAt(t)) {
    ctx.globalAlpha = 0.8 * b.alpha;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawShout(ctx: CanvasRenderingContext2D, t: number): void {
  const shout = frenzyShout(t);
  if (!shout) return;
  ctx.save();
  ctx.translate(VIDEO.width / 2, SHOUT.y);
  ctx.rotate(-0.04);
  ctx.scale(shout.scale, shout.scale);
  drawTextLine(ctx, SHOUT.text, 0, 0, SHOUT.size, 700, shout.alpha, GROWTH_INK);
  ctx.restore();
}

export function createFrenzy(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(60,110,160,0.05)', bottom: 'rgba(30,64,110,0.3)' });
  const inkling = makeSprite('inkling');
  const icon = makeSprite('inkling', 2);
  const minnow: Sprite = makeSprite('minnow', 4);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    ctx.drawImage(backdrop, 0, 0);
    drawZoomMarks(ctx, FIELD, { x: DRIFT * t, y: 0, zoom: 1 }, 0, t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const you = asPose(playerFish(t));
    const snap = gulpSnap(t);
    const youLook: SwimLook = {
      jaw: playerJaw(t), lump: playerLump(t), eyes: playerEyes(t), squash: 1 - 0.1 * snap, stretch: 1 + 0.05 * snap,
    };
    const swallowing: { readonly pose: Pose; readonly stretch: number; readonly squash: number }[] = [];
    const alarms: { readonly pose: Pose; readonly alarm: number }[] = [];
    for (const m of schoolAt(t)) {
      const pose = asPose(m.fish);
      if (m.kind === 'swallowed') {
        swallowing.push({ pose, stretch: m.stretch, squash: m.squash });
        continue;
      }
      drawSwimmer(ctx, minnow, pose, boil);
      drawGlint(ctx, pose, m.sparkle);
      if (m.alarm > 0) alarms.push({ pose, alarm: m.alarm });
    }
    if (swallowing.length > 0) {
      // Inside of your mouth, the meals going in, then you over them.
      drawSwimmer(ctx, inkling, you, boil, { ...youLook, part: 'mouth' });
      for (const s of swallowing) drawSwimmer(ctx, minnow, s.pose, boil, { stretch: s.stretch, squash: s.squash });
      drawSwimmer(ctx, inkling, you, boil, { ...youLook, part: 'body' });
    } else {
      drawSwimmer(ctx, inkling, you, boil, youLook);
    }
    drawSuction(ctx, you, suction(t), t / 3);
    drawBubbles(ctx, t);
    const s = storyTime(t);
    for (const at of GULPS) drawChomp(ctx, you, (s - at) / 0.12);
    for (const a of alarms) {
      const h = 64 * a.alarm;
      drawExclaim(ctx, a.pose.x + a.pose.facing * a.pose.length * 0.1, a.pose.y - a.pose.length * 0.3 - h * 0.4, h, a.pose.facing * 0.12);
    }
    ctx.restore();

    for (const f of floatScores(t)) drawBoldText(ctx, f.text, f.x, f.y, f.size, f.alpha, SCORE_INK);
    const bar = growthBar(t);
    const { label, mult } = multiplierAt(t);
    // While the shout is up, it is the label; the HUD's own copy steps aside.
    const hudLabel = frenzyShout(t) || mult < 2 ? '' : `×${mult}${label ? ` ${label}` : ''}`;
    drawComboHud(ctx, icon, 'inkling', { fill: bar.fill, marks: BAR_MARKS, meter: meterAt(t), label: hudLabel, alpha: bar.alpha }, GROWTH_INK, t);
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
    drawShout(ctx, t);
    drawCredit(ctx);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderFrenzyAudio };
}
