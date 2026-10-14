import { INK } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { mouthOf, type Pose } from '../chain';
import { drawTextLine } from '../captions';
import { drawChomp, drawExclaim } from '../effects';
import { drawMarks, makeBackdrop, makeMarks } from '../backdrop';
import { drawCredit, drawFloatText, floatLife, SCORE_INK } from '../gameplay/hud';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderBaitAudio } from './audio';
import { drawHookAt, drawLine, drawWarning, drawWorm, makeHookFrames } from './rig';
import {
  barbAt, BITE_AT, CAPTIONS, captionAlpha, gulpSnap, inklingAt, inklingEyes, inklingJaw, LOOP_S, MEALS, perchAlarm, perchAt, perchJaw, rigAt, shake,
  snacksAt,
} from './story';

/** Draws the "free food? it's a trap!" short (story.ts has the choreography). */

/** Bubbles knocked loose as the barb bites (the game's burst), then a trail behind the perch as it is hauled up: delay (s), sideways offset and radius (px). */
const BURST = (() => {
  const rng = createRng(23);
  return Array.from({ length: 9 }, () => ({ delay: rng() * 0.35, dx: (rng() - 0.5) * 120, r: 8 + rng() * 14 }));
})();

function drawBubbles(ctx: CanvasRenderingContext2D, t: number): void {
  const since = t - BITE_AT;
  if (since < 0 || since > 2.2) return;
  const from = barbAt(BITE_AT);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  BURST.forEach((b, k) => {
    const s = since - b.delay;
    if (s < 0) return;
    ctx.globalAlpha = 0.75 * Math.max(0, 1 - s / 1.15);
    ctx.beginPath();
    ctx.arc(from.x + b.dx + Math.sin(s * 5 + k) * 12, from.y - 20 - s * 240, b.r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

/** A "!" beside the hooked perch's head, clear of its fins. */
function exclaimBy(ctx: CanvasRenderingContext2D, p: Pose, popped: number): void {
  if (popped <= 0) return;
  const m = mouthOf(p);
  const size = p.length * 0.5;
  drawExclaim(ctx, m.x - p.length * 0.4, m.y + size * 0.1, size * popped, -0.12);
}

export function createBait(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(60,110,160,0.05)', bottom: 'rgba(30,64,110,0.3)' });
  const marks = makeMarks(34, 4242);
  const inkling = makeSprite('inkling');
  const minnow = makeSprite('minnow', 4);
  const perch = makeSprite('perch', 6);
  const hook = makeHookFrames();

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    ctx.drawImage(backdrop, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const rig = rigAt(t);
    if (rig.phase === 'warn') drawWarning(ctx, rig.reach);
    const hookShown = rig.phase === 'drop' || rig.phase === 'hold' || rig.phase === 'reel';
    if (hookShown) drawLine(ctx, rig);

    const p = perchAt(t);
    const perchLook: SwimLook = { jaw: perchJaw(t) };
    if (p.kind === 'swimming') {
      // Inside of its mouth, then the hook and worm (going in as it bites), then the perch over them.
      drawSwimmer(ctx, perch, p.pose, boil, { ...perchLook, part: 'mouth' });
      if (hookShown) drawHookAt(ctx, hook, boil, rig);
      if (rig.worm) drawWorm(ctx, rig);
      drawSwimmer(ctx, perch, p.pose, boil, { ...perchLook, part: 'body' });
    } else {
      if (p.kind === 'hooked') drawSwimmer(ctx, perch, p.pose, boil, perchLook);
      // The barb in its lip.
      if (hookShown) drawHookAt(ctx, hook, boil, rig);
      if (rig.worm) drawWorm(ctx, rig);
    }

    const you = inklingAt(t);
    const snap = gulpSnap(t);
    const youLook: SwimLook = { jaw: inklingJaw(t), eyes: inklingEyes(t), squash: 1 - 0.1 * snap, stretch: 1 + 0.05 * snap };
    let swallowing: { readonly sprite: Sprite; readonly pose: Pose; readonly stretch: number; readonly squash: number } | null = null;
    for (const m of snacksAt(t)) {
      if (m.kind === 'swallowed') swallowing = { sprite: minnow, pose: m.pose, stretch: m.stretch, squash: m.squash };
      else drawSwimmer(ctx, minnow, m.pose, boil, { alpha: m.alpha });
    }
    if (swallowing) {
      // Inside of your mouth, the minnow going in, then you over it.
      drawSwimmer(ctx, inkling, you, boil, { ...youLook, part: 'mouth' });
      drawSwimmer(ctx, swallowing.sprite, swallowing.pose, boil, { stretch: swallowing.stretch, squash: swallowing.squash });
      drawSwimmer(ctx, inkling, you, boil, { ...youLook, part: 'body' });
    } else {
      drawSwimmer(ctx, inkling, you, boil, youLook);
    }
    for (const m of MEALS) drawChomp(ctx, you, (t - m.at) / 0.12);

    if (p.kind !== 'gone') {
      drawChomp(ctx, p.pose, (t - BITE_AT) / 0.12);
      exclaimBy(ctx, p.pose, perchAlarm(t));
    }
    drawBubbles(ctx, t);
    ctx.restore();

    // The game's score text over you for each minnow.
    for (const m of MEALS) {
      const life = floatLife(t - m.at);
      if (life) drawFloatText(ctx, m.text, you.x, you.y - you.length * 0.35 - 30 - 90 * life.rise, 76, life.alpha, SCORE_INK);
    }
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
    drawCredit(ctx);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBaitAudio };
}
