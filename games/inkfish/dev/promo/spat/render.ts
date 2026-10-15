import { INK } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine } from '../captions';
import { onScreen as onScreenAt } from '../gameplay/fish';
import { drawCredit, drawFloatText, drawGrowthBar, floatLife, SCORE_INK } from '../gameplay/hud';
import { drawZoomMarks, type MarkField } from '../gameplay/marks';
import { drawChomp, drawExclaim, drawSuction } from '../effects';
import { makeBackdrop } from '../backdrop';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderSpatAudio } from './audio';
import { makeKelp } from './scenery';
import {
  BAR_MARKS, CAPTIONS, captionAlpha, FLOATS, fryAlarm, fryAt, fryEyes, fryJaw, frySquash, GULP_AT, growthBar, hunterEyes, hunterFish, hunterJaw,
  hunterLump, hunterMenace, hunterSquash, LOOP_S, MISS_AT, sardinesAt, shake, SNACK_AT, spikeBurst, SUCK_FROM, viewAt, type View, type WorldFish,
} from './story';

/** Draws the "he spat me out" short (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;

const FIELD: MarkField = { focus: FOCUS, scale: 1, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

/** The game tints a stunned fish lilac (0xc4a8e0) and draws it in light ink. */
const STUN_TINT = '#c4a8e0';

interface Layers {
  readonly fish: CanvasRenderingContext2D;
  readonly tint: CanvasRenderingContext2D;
}

function makeLayer(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  return canvas.getContext('2d')!;
}

/** The sheephead: a hunter in heavy ink, or stunned (light ink, tinted lilac), or between the two. */
function drawHunter(
  ctx: CanvasRenderingContext2D, layers: Layers, sprites: { heavy: Sprite; light: Sprite }, pose: Pose, boil: number, look: SwimLook, menace: number,
): void {
  const heavyLook: SwimLook = { ...look, mouth: { teeth: true } };
  if (menace >= 1) {
    drawSwimmer(ctx, sprites.heavy, pose, boil, heavyLook);
    return;
  }
  const { fish, tint } = layers;
  fish.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(fish, sprites.light, pose, boil, look);
  if (menace > 0) drawSwimmer(fish, sprites.heavy, pose, boil, { ...heavyLook, alpha: menace });
  // Multiply by the tint, then cut back to the fish's own shape.
  tint.clearRect(0, 0, VIDEO.width, VIDEO.height);
  tint.drawImage(fish.canvas, 0, 0);
  tint.save();
  tint.globalCompositeOperation = 'multiply';
  tint.globalAlpha = 1 - menace;
  tint.fillStyle = STUN_TINT;
  tint.fillRect(0, 0, VIDEO.width, VIDEO.height);
  tint.globalAlpha = 1;
  tint.globalCompositeOperation = 'destination-in';
  tint.drawImage(fish.canvas, 0, 0);
  tint.restore();
  ctx.drawImage(tint.canvas, 0, 0);
}

/** Where the spines went in: the game's ring of short pen strokes round the biter, growing and fading. */
function drawSpikeMarks(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, u: number): void {
  const grow = 1 - (1 - u) ** 3;
  const r = radius * (1 + 0.4 * grow);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(4, radius * 0.045);
  ctx.globalAlpha = 0.9 * (1 - grow);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
    ctx.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** A "!" over a fish's head. */
function exclaimOver(ctx: CanvasRenderingContext2D, p: Pose, size: number, popped: number): void {
  if (popped <= 0) return;
  drawExclaim(ctx, p.x + p.facing * p.length * 0.1, p.y - p.length * 0.42 - size * 0.35, size * popped, p.facing * 0.12);
}

export function createSpat(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(70,130,120,0.06)', bottom: 'rgba(28,72,88,0.32)' });
  const kelp = makeKelp();
  const fry = makeSprite('perchfry', 3);
  const icon = makeSprite('perchfry', 2);
  const hunter = { heavy: makeSprite('sheephead', 6, 'heavy'), light: makeSprite('sheephead', 6, 'light') };
  const sardine = makeSprite('sardine', 2);
  const layers: Layers = { fish: makeLayer(), tint: makeLayer() };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    ctx.drawImage(backdrop, 0, 0);
    kelp(ctx, v, FOCUS.x, boil, t, LOOP_S);
    drawZoomMarks(ctx, FIELD, v, 0, t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const he = onScreen(hunterFish(t), v);
    const heLook: SwimLook = { jaw: hunterJaw(t), lump: hunterLump(t), eyes: hunterEyes(t), ...hunterSquash(t) };
    const menace = hunterMenace(t);
    const f = fryAt(t);
    const you = f.kind === 'inside' ? null : onScreen(f.fish, v);
    const youLook: SwimLook = { jaw: fryJaw(t), eyes: fryEyes(t), ...frySquash(t) };

    // The sardines, the one you take going in between your mouth and body.
    let snack: { readonly pose: Pose; readonly stretch: number; readonly squash: number } | null = null;
    for (const s of sardinesAt(t)) {
      const pose = onScreen(s.fish, v);
      if (s.kind === 'swallowed') snack = { pose, stretch: s.stretch, squash: s.squash };
      else drawSwimmer(ctx, sardine, pose, boil);
    }

    if (you && (f.kind === 'swallowed' || (f.kind === 'spat' && f.inMouth))) {
      // You going in (or coming out) of his mouth: the inside, you, then him over you.
      const look = f.kind === 'swallowed' ? { stretch: f.stretch, squash: f.squash } : youLook;
      drawSwimmer(ctx, hunter.heavy, he, boil, { ...heLook, part: 'mouth', mouth: { teeth: true } });
      drawSwimmer(ctx, fry, you, boil, look);
      drawSwimmer(ctx, hunter.heavy, he, boil, { ...heLook, part: 'body', mouth: { teeth: true } });
    } else {
      drawHunter(ctx, layers, hunter, he, boil, heLook, menace);
    }
    drawSuction(ctx, he, t >= SUCK_FROM - 0.2 && t < GULP_AT ? 1 : 0, t / 3);
    drawChomp(ctx, he, (t - MISS_AT) / 0.12);
    drawChomp(ctx, he, (t - GULP_AT) / 0.12);
    const burst = spikeBurst(t);
    if (burst !== null) drawSpikeMarks(ctx, he.x + he.facing * he.length * 0.28, he.y, he.length * 0.26, burst);

    if (you && f.kind !== 'swallowed' && !(f.kind === 'spat' && f.inMouth)) {
      if (snack) {
        drawSwimmer(ctx, fry, you, boil, { ...youLook, part: 'mouth' });
        drawSwimmer(ctx, sardine, snack.pose, boil, { stretch: snack.stretch, squash: snack.squash });
        drawSwimmer(ctx, fry, you, boil, { ...youLook, part: 'body' });
      } else {
        drawSwimmer(ctx, fry, you, boil, youLook);
      }
      drawChomp(ctx, you, (t - SNACK_AT) / 0.12);
      exclaimOver(ctx, you, 90, fryAlarm(t));
    }
    ctx.restore();

    for (const fl of FLOATS) {
      const life = floatLife(t - fl.at, fl.life);
      if (!life) continue;
      const x = FOCUS.x + v.zoom * (fl.x - v.x);
      const y = FOCUS.y + v.zoom * (fl.y - v.y);
      drawFloatText(ctx, fl.text, x, y - 120 * life.rise, fl.size, life.alpha, SCORE_INK);
    }
    drawGrowthBar(ctx, icon, 'perchfry', { ...growthBar(t), marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
    drawCredit(ctx);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSpatAudio };
}
