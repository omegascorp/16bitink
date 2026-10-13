import { INK } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import type { Pose } from '../chain';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { drawChomp, drawExclaim, drawSuction } from '../effects';
import { makeBackdrop } from '../backdrop';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderRevengeAudio } from './audio';
import {
  BAR_MARKS, biggerText, CAPTIONS, captionAlpha, growthBar, gulpSnap, inklingAlarm, inklingEyes, inklingFish, inklingJaw, inklingLump, LOOP_S, MEALS,
  perchAlarm, perchAt, perchJaw, perchMenace, perchMurk, pullAt, SCALE, shake, snacksAt, SNAP_AT, suction, viewAt, type View, type WorldFish,
} from './story';

/** Draws the "remember this perch" short (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 820 } as const;
const BIGGER_RED = '#a3342b';
const BIGGER_INK: TextInk = { fill: BIGGER_RED, halo: INK_ON_PAPER.halo };

function onScreen(f: WorldFish, v: View): Pose {
  return {
    j: 0, age: 0, ...f,
    x: FOCUS.x + v.zoom * (f.x - v.x),
    y: FOCUS.y + v.zoom * (f.y - v.y),
    length: v.zoom * f.length,
  };
}

// ---------------------------------------------------------------- the water

interface Mark { readonly x: number; readonly y: number; readonly size: number; readonly wave: boolean; readonly phase: number }

/** Marks on one tile of the world, in tile widths; each zoom layer repeats the tile SCALE times bigger. */
const MARKS: readonly Mark[] = (() => {
  const rng = createRng(1717);
  return Array.from({ length: 34 }, () => ({ x: rng(), y: rng(), size: 0.6 + rng() * 0.8, wave: rng() < 0.6, phase: rng() * Math.PI * 2 }));
})();
const TILE = { w: 1500, h: 2600 } as const;

const wrapTo = (v: number, size: number): number => v - size * Math.floor(v / size + 0.5);

/**
 * The game's "~" current marks and specks of marine snow at every scale:
 * as the camera pulls back they shrink and fade, and bigger ones fade in,
 * so after a whole loop (SCALE times further back) the field is the same.
 * They are fixed in the world, so they slide by as the camera pans.
 */
function drawMarks(ctx: CanvasRenderingContext2D, v: View, pull: number, t: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (let layer = -1; layer <= 2; layer++) {
    const size = SCALE ** layer;
    const onScreenScale = SCALE ** (layer - pull);
    for (const m of MARKS) {
      const len = 70 * m.size * onScreenScale;
      // Fade in while small, out while big: no mark pops.
      const fade = Math.max(0, Math.min(1, (len - 10) / 30)) * Math.max(0, Math.min(1, (300 - len) / 140));
      if (fade <= 0) continue;
      const sway = 10 * onScreenScale * Math.sin((2 * Math.PI * t) / LOOP_S * 2 + m.phase);
      const x = FOCUS.x + v.zoom * wrapTo(m.x * TILE.w * size - v.x, TILE.w * size) + sway;
      const y = FOCUS.y + v.zoom * wrapTo(m.y * TILE.h * size - v.y, TILE.h * size);
      if (x < -len || x > VIDEO.width + len || y < -len || y > VIDEO.height + len) continue;
      ctx.globalAlpha = fade * (m.wave ? 0.2 : 0.24);
      if (!m.wave) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, len * 0.035), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.lineWidth = Math.max(1, len * 0.03);
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const px = x - len / 2 + (k / 6) * len;
        const py = y + Math.sin(k * 1.4 + m.phase) * len * 0.06;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the HUD

/** A hand-inked box: each side a little wobbly, the same every frame. */
function wobblyBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const rng = createRng(31);
  const j = (): number => (rng() - 0.5) * 3;
  ctx.beginPath();
  ctx.moveTo(x + j(), y + j());
  ctx.quadraticCurveTo(x + w / 2, y + j(), x + w + j(), y + j());
  ctx.quadraticCurveTo(x + w + j(), y + h / 2, x + w + j(), y + h + j());
  ctx.quadraticCurveTo(x + w / 2, y + h + j(), x + j(), y + h + j());
  ctx.quadraticCurveTo(x + j(), y + h / 2, x + j(), y + j());
  ctx.stroke();
}

const BAR = { x: 300, y: 1170, w: 600, h: 26 } as const;

/** The game's growth bar, with your fish beside it. */
function drawGrowthBar(ctx: CanvasRenderingContext2D, icon: Sprite, t: number): void {
  const { fill, alpha } = growthBar(t);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,250,240,0.9)';
  ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
  ctx.fillStyle = 'rgba(52,102,194,0.6)';
  ctx.fillRect(BAR.x, BAR.y, BAR.w * fill, BAR.h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  for (const m of BAR_MARKS) {
    ctx.beginPath();
    ctx.moveTo(BAR.x + BAR.w * m, BAR.y - 6);
    ctx.lineTo(BAR.x + BAR.w * m, BAR.y + BAR.h + 6);
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  wobblyBox(ctx, BAR.x, BAR.y, BAR.w, BAR.h);
  ctx.restore();
  const pose: Pose = { j: 0, age: 0, shape: 'inkling', x: BAR.x - 70, y: BAR.y + BAR.h / 2, length: 100, facing: 1, tilt: 0, beat: 0, effort: 0 };
  drawSwimmer(ctx, icon, pose, Math.floor(t * BOIL_FPS + 1e-6), { alpha });
}

// ---------------------------------------------------------------- the fish

/** The perch, as a hunter (heavy ink) or prey (light), or between the two as it flips; the dad rises out of the dark. */
function drawPerch(
  ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, sprites: { heavy: Sprite; light: Sprite }, pose: Pose, boil: number, look: SwimLook, t: number,
): void {
  const menace = perchMenace(t);
  const dark = perchMurk(t);
  const target = dark > 0.005 ? layer : ctx;
  if (target === layer) layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  if (menace < 1) drawSwimmer(target, sprites.light, pose, boil, look);
  if (menace > 0) drawSwimmer(target, sprites.heavy, pose, boil, { ...look, alpha: menace, mouth: { teeth: true } });
  if (target === ctx) return;
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

/** A "!" over a fish's head. */
function exclaimOver(ctx: CanvasRenderingContext2D, p: Pose, size: number, popped: number): void {
  if (popped <= 0) return;
  drawExclaim(ctx, p.x + p.facing * p.length * 0.1, p.y - p.length * 0.42 - size * 0.35, size * popped, p.facing * 0.12);
}

export function createRevenge(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(60,110,160,0.05)', bottom: 'rgba(30,64,110,0.3)' });
  const inkling = makeSprite('inkling');
  const icon = makeSprite('inkling', 2);
  const perch = { heavy: makeSprite('perch', 8, 'heavy'), light: makeSprite('perch', 8, 'light') };
  const snacks = { minnow: makeSprite('minnow', 3), blenny: makeSprite('blenny', 4) } as const;
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    ctx.drawImage(backdrop, 0, 0);
    drawMarks(ctx, v, pullAt(t), t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const you = onScreen(inklingFish(t), v);
    const snap = gulpSnap(t);
    const youLook: SwimLook = {
      jaw: inklingJaw(t), lump: inklingLump(t), eyes: inklingEyes(t), squash: 1 - 0.1 * snap, stretch: 1 + 0.05 * snap,
    };
    let swallowing: { readonly sprite: Sprite; readonly pose: Pose; readonly stretch: number; readonly squash: number } | null = null;

    for (const s of snacksAt(t)) {
      const sprite = snacks[s.fish.shape as keyof typeof snacks];
      const pose = onScreen(s.fish, v);
      if (s.kind === 'swallowed') swallowing = { sprite, pose, stretch: s.stretch, squash: s.squash };
      else drawSwimmer(ctx, sprite, pose, boil, { alpha: s.alpha });
    }

    const p = perchAt(t);
    const perchPose = p.kind === 'gone' ? null : onScreen(p.fish, v);
    if (p.kind === 'swimming' && perchPose) drawPerch(ctx, layer, perch, perchPose, boil, { jaw: perchJaw(t) }, t);
    if (p.kind === 'swallowed' && perchPose) swallowing = { sprite: perch.light, pose: perchPose, stretch: p.stretch, squash: p.squash };

    if (swallowing) {
      // Inside of your mouth, the meal going in, then you over it.
      drawSwimmer(ctx, inkling, you, boil, { ...youLook, part: 'mouth' });
      drawSwimmer(ctx, swallowing.sprite, swallowing.pose, boil, { stretch: swallowing.stretch, squash: swallowing.squash });
      drawSwimmer(ctx, inkling, you, boil, { ...youLook, part: 'body' });
    } else {
      drawSwimmer(ctx, inkling, you, boil, youLook);
    }
    drawSuction(ctx, you, suction(t), t / 3);
    for (const at of MEALS) drawChomp(ctx, you, (t - at) / 0.12);
    if (perchPose) {
      drawChomp(ctx, perchPose, (t - SNAP_AT) / 0.12);
      exclaimOver(ctx, perchPose, perchPose.length * 0.4, perchAlarm(t));
    }
    exclaimOver(ctx, you, Math.max(70, you.length * 0.5), inklingAlarm(t));
    ctx.restore();

    const bigger = biggerText(t);
    if (bigger) drawTextLine(ctx, 'Bigger!', you.x, you.y - you.length * 0.35 - 40 - 90 * bigger.rise, 88, 700, bigger.alpha, BIGGER_INK);
    drawGrowthBar(ctx, icon, t);
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  };

  return { loopSeconds: LOOP_S, draw, audio: renderRevengeAudio };
}
