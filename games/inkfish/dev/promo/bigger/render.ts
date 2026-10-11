import { INK } from '../../../src/art/pen';
import { ART_RES, drawHook } from '../../../src/art/propArt';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { mouthOf, type Pose } from '../chain';
import { drawTextLine } from '../captions';
import { drawChomp, drawExclaim, drawSuction } from '../effects';
import { makeBackdrop, makeMarks, drawMarks } from '../backdrop';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderBiggerAudio } from './audio';
import {
  alarm, CAPTIONS, captionAlpha, GULP_AT, grouperAt, grouperEyes, grouperJaw, grouperLump, grouperVisible, HOOK_LEN, hookAt, LINE_TOP, lineBow,
  LOOP_S, murk, PING_AT, shake, sharkAt, sharkJaw, snap, suction,
} from './story';

/** Between the gulp and tearing free, the hook is inside the grouper. */
const swallowedHook = (t: number): boolean => t >= GULP_AT && t < PING_AT;

/** Draws the "there's always a bigger fish" short (story.ts has the choreography). */

const HOOK_RES = 4;
/** The hook drawing's eye and bend, in its own units (propArt.drawHook). */
const HOOK_EYE = { x: 32, y: 4 };
const HOOK_BEND = { x: 22, y: 68 };
const HOOK_SCALE = HOOK_LEN / Math.hypot(HOOK_BEND.x - HOOK_EYE.x, HOOK_BEND.y - HOOK_EYE.y);
const HOOK_AXIS = Math.atan2(HOOK_BEND.y - HOOK_EYE.y, HOOK_BEND.x - HOOK_EYE.x);

function makeHookFrames(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const canvas = document.createElement('canvas');
    canvas.width = 48 * HOOK_RES;
    canvas.height = 76 * HOOK_RES;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(HOOK_RES / ART_RES, HOOK_RES / ART_RES);
    drawHook(ctx, 301 + f * 211);
    return canvas;
  });
}

interface Pt { readonly x: number; readonly y: number }

/** Which way the line runs at the hook (from the rod to the bend), and the hook's eye, where the line ties on. */
function rigAt(bend: Pt): { readonly dir: Pt; readonly eye: Pt } {
  const len = Math.hypot(bend.x - LINE_TOP.x, bend.y - LINE_TOP.y);
  const dir = { x: (bend.x - LINE_TOP.x) / len, y: (bend.y - LINE_TOP.y) / len };
  return { dir, eye: { x: bend.x - dir.x * HOOK_LEN, y: bend.y - dir.y * HOOK_LEN } };
}

/** The line from the rod (off the top) to the hook's eye, bowed sideways by `bow` px at its middle. */
function drawLine(ctx: CanvasRenderingContext2D, bend: Pt, bow: number): void {
  const { dir, eye } = rigAt(bend);
  // A quadratic's middle sits half as far out as its control point.
  const control = { x: (LINE_TOP.x + eye.x) / 2 - dir.y * bow * 2, y: (LINE_TOP.y + eye.y) / 2 + dir.x * bow * 2 };
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(LINE_TOP.x, LINE_TOP.y);
  ctx.quadraticCurveTo(control.x, control.y, eye.x, eye.y);
  ctx.stroke();
  ctx.restore();
}

/** The hook hanging from the line with its bend at `bend`. */
function drawHookAt(ctx: CanvasRenderingContext2D, hook: readonly HTMLCanvasElement[], boil: number, bend: Pt): void {
  const { dir, eye } = rigAt(bend);
  ctx.save();
  ctx.translate(eye.x, eye.y);
  ctx.rotate(Math.atan2(dir.y, dir.x) - HOOK_AXIS);
  ctx.drawImage(hook[boil % hook.length]!, -HOOK_EYE.x * HOOK_SCALE, -HOOK_EYE.y * HOOK_SCALE, 48 * HOOK_SCALE, 76 * HOOK_SCALE);
  ctx.restore();
}

/** Bubbles let out with the gulp: start delay (s), sideways offset and radius (px). */
const BUBBLES = (() => {
  const rng = createRng(19);
  return Array.from({ length: 9 }, () => ({ delay: rng() * 0.5, dx: (rng() - 0.5) * 90, r: 7 + rng() * 14 }));
})();

function drawGulpBubbles(ctx: CanvasRenderingContext2D, t: number): void {
  const since = t - GULP_AT;
  if (since < 0 || since > 2) return;
  const from = mouthOf(grouperAt(GULP_AT));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  BUBBLES.forEach((b, k) => {
    const s = since - b.delay;
    if (s < 0) return;
    ctx.globalAlpha = 0.75 * Math.max(0, 1 - s / 1.4);
    ctx.beginPath();
    ctx.arc(from.x + b.dx + Math.sin(s * 6 + k) * 10, from.y - 60 - s * 260, b.r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

/** The grouper, drawn whole; while the deep still hides it, it is a dark shape. */
function drawGrouper(ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, boil: number, look: SwimLook): void {
  const dark = murk(pose);
  if (dark <= 0.005) {
    drawSwimmer(ctx, sprite, pose, boil, look);
    return;
  }
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(layer, sprite, pose, boil, look);
  layer.save();
  layer.globalCompositeOperation = 'source-atop';
  layer.fillStyle = `rgba(16,26,46,${(0.93 * dark).toFixed(3)})`;
  layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer.restore();
  ctx.save();
  ctx.globalAlpha = 1 - 0.25 * dark;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

export function createBiggerFish(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(44,79,134,0.05)', bottom: 'rgba(22,44,86,0.42)' });
  const marks = makeMarks(36, 77);
  const shark = makeSprite('shark');
  const grouper = makeSprite('grouper');
  const hook = makeHookFrames();
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    ctx.drawImage(backdrop, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const s = sharkAt(t);
    const bend = hookAt(t);
    // The line runs behind the fish. The hook shows at the shark's lip, is hidden inside the grouper, and hangs behind the fish once loose.
    drawLine(ctx, bend, lineBow(t));
    if (s.kind === 'gone' && !swallowedHook(t)) drawHookAt(ctx, hook, boil, bend);

    const g = grouperVisible(t) ? grouperAt(t) : null;
    const jaw = grouperJaw(t);
    const gLook: SwimLook = {
      jaw,
      squash: 1 - 0.1 * snap(t),
      stretch: 1 + 0.05 * snap(t),
      lump: grouperLump(t),
      eyes: grouperEyes(t),
    };
    if (g && s.kind === 'swallowed') {
      // Inside of the mouth, the shark going in, then the grouper over it.
      drawSwimmer(ctx, grouper, g, boil, { ...gLook, part: 'mouth' });
      drawSwimmer(ctx, shark, s.pose, boil, { stretch: s.stretch, squash: s.squash });
      drawSwimmer(ctx, grouper, g, boil, { ...gLook, part: 'body' });
    } else if (g) {
      drawGrouper(ctx, layer, grouper, g, boil, gLook);
    }
    if (g) {
      drawSuction(ctx, g, suction(t), t / 3);
      drawChomp(ctx, g, (t - GULP_AT) / 0.12);
    }
    drawGulpBubbles(ctx, t);

    if (s.kind === 'swimming') {
      drawSwimmer(ctx, shark, s.pose, boil, { jaw: sharkJaw(t) });
      drawHookAt(ctx, hook, boil, bend);
      const pop = alarm(t);
      const p = s.pose;
      if (pop > 0) drawExclaim(ctx, p.x + p.facing * p.length * 0.18, p.y - p.length * 0.5, p.length * 0.42 * pop, p.facing * 0.12);
    }
    ctx.restore();

    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBiggerAudio };
}
