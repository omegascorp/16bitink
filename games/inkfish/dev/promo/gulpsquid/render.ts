import { SQUID_TEX, drawSquidBody, drawSquidFin, drawSquidLimbAlong, drawSquidPupil, mantleHalf, FIN } from '../../../src/art/squidArt';
import { halo } from '../../../src/art/glowArt';
import { PAPER, makeCanvas } from '../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine, type TextInk } from '../captions';
import { onScreen as onScreenAt } from '../gameplay/fish';
import { drawCredit, drawFloatText, drawGrowthBar, GROWTH_INK, SCORE_INK } from '../gameplay/hud';
import type { MarkField } from '../gameplay/marks';
import { drawChomp, drawExclaim, drawSuction } from '../gape/effects';
import { drawLights, drawPlayerLight, makeWater } from '../gape/render';
import { drawSnow } from '../gape/snow';
import { clipToGape, drawSwimmer, lipsOf, pointOn, type SwimLook } from '../gape/swimmer';
import { VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { renderGulpSquidAudio } from './audio';
import {
  armPaths, BAR_MARKS, BITE_AT, biggerText, CAPTIONS, captionAlpha, EYE_AT, eyeOpen, finFlare, GULP_AT, growthBar, gulpSnap, isDessert, LOOP_S, mouthFrame, pullAt,
  poke, POKE_POP, SCALE, SCORE_TEXT, scoreText, shake, SLURP_AT, squidAlarm, squidGone, squidMurk, squidTip, suction, tentaclePath, viewAt, viperBelly, viperEyes,
  viperFish, viperJaw, viperLureGlow, type Frame, type View, type WorldFish,
} from './story';

/** Draws "how did that fit 4" (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;
const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The viper's skin over its eye, for closed eyes. */
const VIPER_LID = '#8a9fd3';
const CAPTION_LINE = 1.02;
/** Sprite px per squid texture px. */
const RES = 5;
/** The tentacles go into the mouth, behind the viper's lips, from here. */
const CLIPPED_FROM = SLURP_AT + 0.02;
const EYE_GLOW = '#ffe6a8';

interface SquidArt {
  readonly body: readonly HTMLCanvasElement[];
  readonly fin: readonly HTMLCanvasElement[];
  readonly pupil: HTMLCanvasElement;
}

const frameSeed = (f: number): number => 101 + f * 977;

function makeSquidArt(): SquidArt {
  const sprite = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
    const { canvas, ctx } = makeCanvas(w * RES, h * RES);
    ctx.scale(RES, RES);
    draw(ctx);
    return canvas;
  };
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => f);
  return {
    body: frames.map((f) => sprite(SQUID_TEX.body.w, SQUID_TEX.body.h, (c) => drawSquidBody(c, 'light', frameSeed(f)))),
    fin: frames.map((f) => sprite(SQUID_TEX.fin.w, SQUID_TEX.fin.h, (c) => drawSquidFin(c, 'light', frameSeed(f) + 37))),
    pupil: sprite(SQUID_TEX.pupil.w, SQUID_TEX.pupil.h, drawSquidPupil),
  };
}

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Enters the mouth's frame: body px of the squid, x out of the mouth, drawn where the camera shows it. */
function enterFrame(ctx: CanvasRenderingContext2D, f: Frame, v: View): void {
  ctx.translate(FOCUS.x + v.zoom * (f.origin.x - v.x), FOCUS.y + v.zoom * (f.origin.y - v.y));
  ctx.rotate(Math.atan2(f.ex.y, f.ex.x));
  const s = v.zoom * f.k;
  ctx.scale(s, s);
}

export function createGulpSquid(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const icon = makeSprite('viperfish', 2);
  const art = makeSquidArt();
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  /** The squid's arms, fins and body in the squid's own frame (call after entering the mouth's frame). */
  const drawSquid = (c: CanvasRenderingContext2D, t: number, boil: number, only: 'body' | 'all'): void => {
    const tip = squidTip(t);
    const seed = frameSeed(boil % BOIL_FRAMES);
    const { w, h } = SQUID_TEX.body;
    c.save();
    c.translate(tip.x, tip.y);
    c.rotate(tip.a);
    c.translate(124, 0);
    const arms = only === 'all' ? armPaths(t) : [];
    arms.forEach((a, i) => {
      if (a.far) drawSquidLimbAlong(c, a.pts, 'arm', 'light', seed + 11 + i, true);
    });
    // The fins, flared or pressed flat, rooted on the mantle.
    const flare = finFlare(t);
    for (const mirror of [false, true]) {
      c.save();
      c.translate(FIN.x, mirror ? mantleHalf(FIN.x) * 0.94 - 2 : -mantleHalf(FIN.x) + 2);
      c.scale(1, mirror ? -flare : flare);
      c.drawImage(art.fin[boil % BOIL_FRAMES]!, -SQUID_TEX.fin.w * FIN.origin.x, -SQUID_TEX.fin.h * FIN.origin.y, SQUID_TEX.fin.w, SQUID_TEX.fin.h);
      c.restore();
    }
    c.drawImage(art.body[boil % BOIL_FRAMES]!, -w / 2, -h / 2, w, h);
    // The pupil follows you: back down towards the viper.
    c.drawImage(art.pupil, EYE_AT.x - 3 - 12, EYE_AT.y + 1 - 12, SQUID_TEX.pupil.w, SQUID_TEX.pupil.h);
    arms.forEach((a, i) => {
      if (!a.far) drawSquidLimbAlong(c, a.pts, 'arm', 'light', seed + 11 + i, false);
    });
    c.restore();
  };

  /** The two tentacles, in the mouth's frame. */
  const drawTentacles = (c: CanvasRenderingContext2D, t: number, boil: number): void => {
    const seed = frameSeed(boil % BOIL_FRAMES);
    for (const j of [0, 1] as const) drawSquidLimbAlong(c, tentaclePath(t, j), 'tentacle', 'light', seed + 23 + j * 5, j === 0);
  };

  /** The squid in the dark, darkened by `murk`, its eye showing first. */
  const drawMurky = (t: number, boil: number, v: View, murk: number): void => {
    const f = mouthFrame(t);
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
    layer.save();
    enterFrame(layer, f, v);
    drawSquid(layer, t, boil, 'all');
    drawTentacles(layer, t, boil);
    layer.restore();
    layer.save();
    layer.globalCompositeOperation = 'source-atop';
    layer.fillStyle = `rgba(5,10,30,${(0.95 * murk).toFixed(3)})`;
    layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
    layer.restore();
    ctx.save();
    ctx.globalAlpha = 1 - 0.4 * murk;
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();
    // The eye alone, lit, opening in the dark.
    const open = eyeOpen(t);
    if (open <= 0.01) return;
    const k = v.zoom * f.k;
    const tip = squidTip(t);
    const c = Math.cos(tip.a);
    const s = Math.sin(tip.a);
    const local = { x: tip.x + c * (124 + EYE_AT.x) - s * EYE_AT.y, y: tip.y + s * (124 + EYE_AT.x) + c * EYE_AT.y };
    const o = { x: FOCUS.x + v.zoom * (f.origin.x - v.x), y: FOCUS.y + v.zoom * (f.origin.y - v.y) };
    const a = Math.atan2(f.ex.y, f.ex.x);
    const eye = { x: o.x + k * (local.x * Math.cos(a) - local.y * Math.sin(a)), y: o.y + k * (local.x * Math.sin(a) + local.y * Math.cos(a)) };
    halo(ctx, eye.x, eye.y, 34 * k * open, EYE_GLOW, 0.5 * open * murk);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, 20 * k * open, 20 * k * open * (0.25 + 0.75 * open), 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(o.x, o.y);
    ctx.rotate(a);
    ctx.scale(k, k);
    drawSquid(ctx, t, boil, 'body');
    ctx.restore();
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    ctx.drawImage(water, 0, 0);
    drawSnow(ctx, FIELD, v, pullAt(t), t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const you = onScreen(viperFish(t), v);
    const snap = gulpSnap(t);
    const look: SwimLook = {
      jaw: viperJaw(t), belly: viperBelly(t), eyes: viperEyes(t), lid: VIPER_LID, squash: 1 - 0.08 * snap, stretch: 1 + 0.05 * snap,
    };
    drawPlayerLight(ctx, you);
    const drawViper = (): void => {
      drawSwimmer(ctx, viper, you, boil, look);
      drawLights(ctx, viper, you, look, viperLureGlow(t));
    };

    const murk = squidMurk(t);
    const f = mouthFrame(t);
    const alive = !squidGone(t);
    // The tentacles are over the viper's head until the last slurp pulls them in behind its lips.
    const tentaclesIn = t >= CLIPPED_FROM && t < GULP_AT;
    if (alive && murk > 0.005) {
      drawMurky(t, boil, v, murk);
      drawViper();
    } else if (alive) {
      // The inside of the mouth, the squid going in (only where the open mouth and the water in front of it are), then the viper over it.
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
      ctx.save();
      clipToGape(ctx, viper, you, look);
      ctx.save();
      enterFrame(ctx, f, v);
      drawSquid(ctx, t, boil, 'all');
      if (tentaclesIn) drawTentacles(ctx, t, boil);
      ctx.restore();
      ctx.restore();
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
      drawLights(ctx, viper, you, look, viperLureGlow(t));
      if (!tentaclesIn) {
        ctx.save();
        enterFrame(ctx, f, v);
        drawTentacles(ctx, t, boil);
        ctx.restore();
      }
    } else {
      drawViper();
    }

    // A tentacle tip poking out of the closed lips.
    const tip = poke(t);
    if (tip) {
      ctx.save();
      enterFrame(ctx, f, v);
      ctx.beginPath();
      ctx.rect(0, -300, 600, 600);
      ctx.clip();
      const seed = 101 + (boil % BOIL_FRAMES) * 977 + 61;
      const path = Array.from({ length: 12 }, (_, i) => {
        const u = i / 11;
        return { x: tip.out - 80 * (1 - u), y: tip.wiggle * u * u };
      });
      drawSquidLimbAlong(ctx, path, 'tentacle', 'light', seed, false);
      ctx.restore();
    }

    const lipsAt = lipsOf('viperfish', look.jaw ?? 0).mid;
    const lips = pointOn(viper, you, look, { x: lipsAt.x + 4, y: lipsAt.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    drawChomp(ctx, you, (t - GULP_AT) / 0.14);
    drawChomp(ctx, you, (t - BITE_AT) / 0.12);
    drawChomp(ctx, you, (t - POKE_POP) / 0.12);
    // The squid's "!" over its eye as it sees the teeth.
    const pop = squidAlarm(t);
    if (alive && pop > 0 && (isDessert(t) || t < 0.8)) {
      const tp = squidTip(t);
      const k = v.zoom * f.k;
      const o = { x: FOCUS.x + v.zoom * (f.origin.x - v.x), y: FOCUS.y + v.zoom * (f.origin.y - v.y) };
      const a = Math.atan2(f.ex.y, f.ex.x);
      const lx = tp.x + 124 + EYE_AT.x + 8;
      const ly = tp.y - 78;
      drawExclaim(ctx, o.x + k * (lx * Math.cos(a) - ly * Math.sin(a)), o.y + k * (lx * Math.sin(a) + ly * Math.cos(a)), 120 * pop, 0.12);
    }
    ctx.restore();

    const score = scoreText(t);
    if (score) drawFloatText(ctx, SCORE_TEXT, you.x + you.length * 0.15, Math.max(560, you.y - you.length * 0.25 - 30 - 70 * score.rise), 84, score.alpha, SCORE_INK);
    const bigger = biggerText(t);
    if (bigger) drawFloatText(ctx, 'Bigger!', you.x, Math.max(560, you.y - you.length * 0.3 - 40 - 70 * bigger.rise), 92, bigger.alpha, GROWTH_INK);
    drawGrowthBar(ctx, icon, 'viperfish', { ...growthBar(t), marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) {
      const alpha = captionAlpha(c, t);
      c.text.split('\n').forEach((row, i) => drawTextLine(ctx, row, VIDEO.width / 2, c.y + i * c.size * CAPTION_LINE, c.size, 700, alpha, PAPER_ON_INK));
    }
    drawCredit(ctx, PAPER_ON_INK);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGulpSquidAudio };
}
