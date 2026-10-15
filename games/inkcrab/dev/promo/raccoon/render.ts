import { FOOD_FRAME, FOOD_GROUND, drawFood } from '../../../src/art/itemArt';
import { makeDraw } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { HIGHLIGHT, PAPER_FILL, RED } from '../../../src/art/palette';
import { drawSpokenLine, drawTextLine, PAPER_ON_DARK } from '../captions';
import { clamp01, smooth, VIDEO, type Short } from '../short';
import { bakeSprite, boilAt, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { renderRaccoonAudio } from './audio';
import {
  captionAt, cleanLabel, crabLabel, crossAt, crossJoltAt, feelingLabel, lensesAt, lotorLabel, moonGlowAt, nervesLabel, pawsLabel, sparkleAt,
  washingAt, waterLabel,
} from './beats';
import { drawLens } from './lens';
import { drawRaccoon, handsOf } from './raccoonArt';
import { drawRipple, drawSplash, drawWater, makeBackdrop, MOON, NIGHT_TINT, poolFloor, POOL } from './scene';
import {
  alarmAt, CLAM_B, CLAM_RISE, CLAM_SCALE, clamSizeAt, CRAB_SCALE, type Crab, crabAt, floorClamAt, heldAt, heldScaleAt, heldTurnAt, LOOP_S, RACCOON, raccoonAt, RIPPLE_LIFE, RIPPLES,
  SHELL_DROP, SPLASH_S, SPLASHES, stirAt, toScreen,
} from './story';

/** Draws the "raccoons aren't washing their food" short (story.ts and beats.ts have the choreography). */

const DARK = PAPER_ON_DARK.halo;

interface Kit {
  readonly clam: Sprite;
  readonly back: Sprite;
  readonly front: Sprite;
  readonly shell: Sprite;
}

/** The hermit crab, as the game layers it: legs behind, the shell, head and claws in front (shut in: the shell alone). */
function drawCrab(ctx: CanvasRenderingContext2D, kit: Kit, c: Crab, boil: number): void {
  const step = c.walking ? boil : 0;
  ctx.save();
  ctx.translate(c.x, c.y - SHELL_DROP * c.scale);
  ctx.rotate(c.rotation);
  const at = { x: 0, y: SHELL_DROP * c.scale, scale: CRAB_SCALE * c.scale, facing: c.facing };
  const out = 1 - c.hidden;
  drawSprite(ctx, kit.back, step, { ...at, alpha: out });
  drawSprite(ctx, kit.shell, boil, at);
  drawSprite(ctx, kit.front, step, { ...at, alpha: out });
  ctx.restore();
}

/** A paper-white leader line with a dark halo, from a label to what it names. */
function leader(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, alpha: number): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const a = { x: from.x + (dx / len) * 12, y: from.y + (dy / len) * 12 };
  const b = { x: to.x - (dx / len) * 14, y: to.y - (dy / len) * 14 };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (const [colour, width] of [[DARK, 9], [PAPER_FILL, 4]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = PAPER_FILL;
  ctx.fill();
  ctx.restore();
}

/** A sketchbook label in paper-white handwriting, with a leader line to what it names. */
function callout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size = 64): void {
  if (alpha <= 0) return;
  if (to) leader(ctx, { x: at.x, y: to.y > at.y ? at.y + size * 0.2 : at.y - size * 0.75 }, to, alpha);
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, PAPER_ON_DARK);
}

/** The red strike through "washing?" and a ✗ after it, `s` 0 .. ~1.3 as it's stamped on, jolting by `jolt`. */
function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, jolt: number): void {
  if (s <= 0) return;
  const shake = 6 * jolt * Math.sin(jolt * 30);
  ctx.save();
  ctx.lineCap = 'round';
  const reach = Math.min(1, s);
  for (const [colour, width] of [[DARK, 20], [RED, 11]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x - 225 + shake, y + 10);
    ctx.lineTo(x - 225 + 420 * reach + shake, y - 14 * reach);
    ctx.stroke();
  }
  ctx.translate(x + 300 + shake, y - 20);
  ctx.rotate(-0.1 + 0.15 * jolt);
  ctx.scale(s * (1 + 0.2 * jolt), s * (1 + 0.2 * jolt));
  for (const [colour, width] of [[DARK, 26], [RED, 15]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(-42, -42);
    ctx.lineTo(42, 42);
    ctx.moveTo(40, -44);
    ctx.lineTo(-40, 44);
    ctx.stroke();
  }
  ctx.restore();
}

/** A four-pointed sparkle at (x, y), `u` 0 .. 1 of its life. */
function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, size: number): void {
  if (u <= 0 || u >= 1) return;
  const s = size * Math.sin(Math.PI * u);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(u * 0.8);
  ctx.fillStyle = PAPER_FILL;
  ctx.strokeStyle = HIGHLIGHT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const r = k % 2 === 0 ? s : s * 0.28;
    const a = (k / 8) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function createRaccoon(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop();
  const kit: Kit = {
    clam: bakeSprite(FOOD_FRAME, 8, FOOD_GROUND, 900, (d) => drawFood(d, 'clam')),
    back: crabSprite('back', 4),
    front: crabSprite('front', 4),
    shell: shellSprite('whelk', 4),
  };

  /** What its hands hold, drawn in the raccoon's local units at the grip. */
  const drawHeld = (t: number, boil: number) => (grip: Pt): void => {
    const held = heldAt(t);
    const s = RACCOON.s;
    if (held === 'clam') {
      const size = clamSizeAt(t);
      if (size > 0) drawSprite(ctx, kit.clam, boil, { x: grip.x, y: grip.y + CLAM_RISE / s, scale: (CLAM_SCALE / s) * size });
    } else if (held === 'crab') {
      ctx.save();
      ctx.translate(grip.x, grip.y);
      ctx.scale(1 / s, 1 / s);
      const k = heldScaleAt(t);
      drawCrab(ctx, kit, { x: 0, y: SHELL_DROP * k, facing: -1, hidden: 1, rotation: heldTurnAt(t), walking: false, scale: k }, boil);
      ctx.restore();
    }
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t);
    ctx.drawImage(backdrop, 0, 0);
    // The moon brightening on "night".
    const moon = moonGlowAt(t);
    if (moon > 0) {
      const g = ctx.createRadialGradient(MOON.x, MOON.y, MOON.r, MOON.x, MOON.y, MOON.r * 4);
      g.addColorStop(0, `rgba(251,244,214,${0.55 * moon})`);
      g.addColorStop(1, 'rgba(251,244,214,0)');
      ctx.fillStyle = g;
      ctx.fillRect(MOON.x - MOON.r * 4, MOON.y - MOON.r * 4, MOON.r * 8, MOON.r * 8);
    }

    // In the pool, under its water: the next clam on the floor, the crab, the raccoon's hands.
    const floorClam = floorClamAt(t);
    if (floorClam > 0) drawSprite(ctx, kit.clam, boil, { x: CLAM_B.x, y: poolFloor(CLAM_B.x) + 3, scale: CLAM_SCALE, alpha: floorClam });
    const crab = crabAt(t);
    if (crab) drawCrab(ctx, kit, crab, boil);
    const pose = raccoonAt(t);
    ctx.save();
    ctx.translate(RACCOON.x, RACCOON.y);
    ctx.scale(RACCOON.s, RACCOON.s);
    drawRaccoon(makeDraw(ctx, 5100 + boil, boil, 0), pose, drawHeld(t, boil));
    ctx.restore();
    drawWater(ctx, t, boil, stirAt(t));
    for (const at of RIPPLES) {
      const u = (((t - at) % LOOP_S) + LOOP_S) % LOOP_S / RIPPLE_LIFE;
      drawRipple(ctx, toScreen(raccoonAt(at).grip).x, u, 0.8);
    }
    for (const s of SPLASHES) {
      const u = (t - s.at) / SPLASH_S;
      drawSplash(ctx, s.x, u, s.size);
      drawRipple(ctx, s.x, u * 0.6, s.size * 1.4);
    }
    ctx.fillStyle = NIGHT_TINT;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);

    // Over the scene: what's said, labelled.
    const hands = toScreen(pose.grip);
    const nearHand = toScreen(handsOf(pose).near);
    drawSparkle(ctx, hands.x + 34, hands.y - 28, sparkleAt(t), 46);
    drawSparkle(ctx, hands.x - 30, hands.y - 6, sparkleAt(t) - 0.2, 30);
    drawSparkle(ctx, hands.x + 8, hands.y - 58, sparkleAt(t) - 0.35, 26);
    const alarm = alarmAt(t);
    if (alarm > 0) drawTextLine(ctx, '!', hands.x + 70, hands.y - 70, 130 * (0.6 + 0.4 * smooth(alarm)), 700, alarm, { fill: RED, halo: PAPER_FILL });

    const washing = washingAt(t);
    drawTextLine(ctx, 'washing?', 480, 470, 132, 700, washing, PAPER_ON_DARK);
    drawCross(ctx, 480, 432, crossAt(t), crossJoltAt(t));
    callout(ctx, 'Procyon lotor: “the washer”', { x: 540, y: 420 }, null, lotorLabel(t), 66);
    callout(ctx, 'water', { x: 830, y: 905 }, { x: 790, y: POOL.surface + 22 }, waterLabel(t), 72);
    callout(ctx, 'paws', { x: 240, y: 1090 }, { x: nearHand.x - 6, y: nearHand.y + 4 }, pawsLabel(t), 72);
    callout(ctx, 'already clean ✓', { x: 820, y: 800 }, { x: hands.x + 36, y: hands.y - 12 }, cleanLabel(t), 70);
    callout(ctx, 'feeling, not washing', { x: 760, y: 880 }, { x: hands.x + 10, y: hands.y - 10 }, feelingLabel(t), 62);
    callout(ctx, 'hermit crab', { x: 860, y: 800 }, { x: hands.x + 40, y: hands.y - 10 }, crabLabel(t), 70);

    const lenses = lensesAt(t);
    for (const lens of lenses) drawLens(ctx, lens, lens.id === 'wet' ? hands : nearHand, t, boil);
    const dry = lenses.find((l) => l.id === 'dry');
    const wet = lenses.find((l) => l.id === 'wet');
    const nerves = nervesLabel(t);
    if (dry && nerves > 0) callout(ctx, 'touch nerves', { x: 810, y: 905 }, { x: dry.x + dry.r * 0.18, y: dry.y + dry.r * 0.22 }, nerves * clamp01(dry.open * 2), 68);
    if (dry) drawTextLine(ctx, 'dry', dry.x, dry.y - dry.r - 26, 76, 700, clamp01(dry.meter * 2), PAPER_ON_DARK);
    if (wet) drawTextLine(ctx, 'wet', wet.x, wet.y - wet.r - 26, 76, 700, clamp01(wet.open * 2 - 1), PAPER_ON_DARK);

    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, PAPER_ON_DARK, HIGHLIGHT);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderRaccoonAudio };
}
