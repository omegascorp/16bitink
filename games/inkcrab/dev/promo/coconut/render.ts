import { INK, PAPER, RED, SAND_DRY } from '../../../src/art/palette';
import { drawSpokenLine } from '../captions';
import { clamp01, lerp, ramp, smooth, type Short } from '../short';
import { critterSprite, drawSprite } from '../sprites';
import { renderCoconutAudio } from './audio';
import { drawChart, type ChartState } from './chart';
import { captionAt } from './cues';
import { drawHermit, makeHermit, onCrab } from './hermit';
import { callout, drawDashedRing, drawDial, drawLabelParts, drawLens, drawRewind, drawSpikes, drawTape } from './marks';
import { drawBurst, drawCracks, drawSet, makeNut, makePlatform, makeSet, NUT_RY, SAND_TOP } from './scene';
import {
  almostLabel, armourAt, armourLabel, barAt, BARS, BIG, bigAt, biggestLabel, boilAt, borrowedLabel, burstAt, cardAt, CLAW_TIP, crabRingAt, crackAt,
  dialAt, ghostAt, gripAt, hermitLabel, LENS, lensAt, hermitSizeAt, kgPopAt, legRingsAt, LIFT_PX, LOOP_S, metreLabel, metrePopAt, MORPH_FROM, MORPH_TO, morphPuffAt, nameLabel,
  needleAt, noShellLabel, NUT, onLandLabel, pinchBurstAt, predatorsLabel, rewindAt, scaleAt, seam, splitAt, tapeAt, tinyRingAt, tooBigLabel,
} from './story';

/** Draws the "this crab cracks open coconuts" short (story.ts has the choreography). */

/** Screen px per unit of the coconut's drawing. */
const NUT_SCALE = NUT.rx / 20;
/** The coconut crab's leg tips, in its drawing's units: the hind foot and the front one. */
const FEET = [-44, 42] as const;

const chartAt = (t: number): ChartState => ({
  show: cardAt(t),
  bars: Object.fromEntries(BARS.map((id) => [id, barAt(id, t)])) as ChartState['bars'],
  almost: almostLabel(t) * cardAt(t),
  predators: predatorsLabel(t) * cardAt(t),
  ring: crabRingAt(t),
});

export function createCoconut(ctx: CanvasRenderingContext2D): Short {
  const set = makeSet();
  const big = critterSprite('coconutcrab', 6);
  const ghost = critterSprite('ghostcrab', 4);
  const nut = makeNut();
  const platform = makePlatform();
  const hermit = makeHermit();
  const icons = {
    fox: critterSprite('arcticfox', 2, true),
    raccoon: critterSprite('raccoon', 2, true),
    monitor: critterSprite('monitor', 2, true),
    crab: critterSprite('coconutcrab', 2),
  };

  /** The coconut: whole and cracking in the claw, or split, the right half rolled onto its back. */
  const drawNut = (t: number, boil: number): void => {
    const split = smooth(splitAt(t));
    const squeeze = gripAt(t) * Math.max(0, Math.sin(2 * Math.PI * 2.4 * seam(t)));
    if (split <= 0.01) {
      const rot = 0.03 * squeeze;
      drawSprite(ctx, nut.whole, boil, { x: NUT.x, y: NUT.ground, scale: NUT_SCALE, rotation: rot });
      drawCracks(ctx, NUT.x, NUT.ground - NUT_RY * NUT_SCALE, NUT_SCALE, crackAt(t));
      return;
    }
    drawSprite(ctx, nut.left, boil, { x: NUT.x - 14 * split, y: NUT.ground, scale: NUT_SCALE, rotation: -0.12 * split });
    drawSprite(ctx, nut.bowl, boil, { x: NUT.x + 18 + 110 * split, y: NUT.ground, scale: NUT_SCALE, rotation: 0.1 * (1 - split) });
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t);
    drawSet(ctx, set, t);

    // The scale rises out of the sand under the crab.
    const lift = scaleAt(t);
    if (lift > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 1080, BIG.ground + 3);
      ctx.clip();
      drawSprite(ctx, platform, boil, { x: BIG.x + 8, y: BIG.ground + LIFT_PX * (1 - smooth(lift)) + 2, scale: 560 / 120 });
      ctx.restore();
    }
    drawNut(t, boil);
    const g = ghostAt(t);
    if (g) drawSprite(ctx, ghost, boil, { x: g.x, y: BIG.ground, scale: 1.7, facing: g.facing });

    const pose = bigAt(t);
    drawSprite(ctx, big, boil, { x: pose.x, y: pose.y, scale: pose.scale, rotation: pose.rot, alpha: pose.alpha });
    drawHermit(ctx, hermit, t, boil);

    // The soft crab turning into the coconut crab: a puff of ink.
    const puff = morphPuffAt(t);
    if (puff > 0 && puff < 1) drawSpikes(ctx, BIG.x + 40, BIG.ground - 120, 140 + 160 * puff, 60, 1 - puff, 12);

    // "coconut crab", "biggest crab on land", a ghost crab for scale.
    callout(ctx, 'coconut crab', { x: 540, y: 410 }, null, nameLabel(t), 96);
    callout(ctx, 'Birgus latro', { x: 540, y: 478 }, null, nameLabel(t), 54, 500);
    drawLabelParts(ctx, [['biggest crab', biggestLabel(t)], [' on land', onLandLabel(t)]], 540, 590, 72);
    if (g) callout(ctx, 'ghost crab', { x: Math.max(92, g.x + 20), y: 925 }, null, clamp01(biggestLabel(t) * 1.2) * 0.85, 42);

    // "up to four kilos": the dial; "legs nearly a metre across": the tape.
    drawDial(ctx, { x: 800, y: 470 }, 118, needleAt(t), dialAt(t), { x: BIG.x + 250, y: BIG.ground - LIFT_PX + 6 });
    const kg = kgPopAt(t);
    if (kg > 0) drawLabelParts(ctx, [['4 kg', dialAt(t)]], 360, 500, 150 * (kg < 1 ? 0.7 + 0.45 * Math.sin(Math.PI * Math.min(1, kg) * 0.75) : 1));
    const footY = pose.y - 6;
    const rings = legRingsAt(t);
    for (const fx of FEET) drawDashedRing(ctx, pose.x + fx * pose.scale, footY, 34, rings, RED);
    drawTape(ctx, pose.x + FEET[0] * pose.scale, pose.x + FEET[1] * pose.scale, 625, footY - 20, tapeAt(t));
    const m = metrePopAt(t);
    if (m > 0) drawLabelParts(ctx, [['≈ 1 m', metreLabel(t)]], 385, 578, 104 * (m < 1 ? 0.7 + 0.45 * Math.sin(Math.PI * Math.min(1, m) * 0.75) : 1));

    // "Its pinch": a snap at the claw, then the chart.
    const claw = { x: pose.x + CLAW_TIP.x * pose.scale, y: pose.y + CLAW_TIP.y * pose.scale };
    const pb = pinchBurstAt(t);
    if (pb > 0 && pb < 1) drawSpikes(ctx, claw.x + 10, claw.y - 10, 60 + 80 * pb, 50, 1 - pb, 8);
    drawChart(ctx, chartAt(t), icons, boil);

    // The rewind to its start in life, and the young hermit crab's labels.
    drawRewind(ctx, 540, 470, rewindAt(t), t);
    const s = hermitSizeAt(t);
    const body = onCrab(10, 18, s);
    drawDashedRing(ctx, body.x, body.y, 80, tinyRingAt(t), INK);
    callout(ctx, 'tiny', { x: body.x - 150, y: body.y - 70 }, null, tinyRingAt(t), 60);
    // The magnifier over it, so the tiny crab reads on a phone.
    const focus = onCrab(-5, 28, s);
    drawLens(ctx, LENS, focus, 80, lensAt(t), () => {
      ctx.fillStyle = PAPER;
      ctx.fillRect(body.x - 200, body.y - 200, 400, 400);
      ctx.fillStyle = SAND_DRY;
      ctx.fillRect(body.x - 200, SAND_TOP + 4, 400, 400);
      ctx.fillStyle = INK;
      ctx.fillRect(body.x - 200, SAND_TOP + 4, 400, 1.2);
      drawHermit(ctx, hermit, t, boil);
    });
    const inLens = (lx: number, ly: number): { x: number; y: number } => {
      const p = onCrab(lx, ly, s);
      return { x: LENS.x + (p.x - focus.x) * LENS.zoom, y: LENS.y + (p.y - focus.y) * LENS.zoom };
    };
    const open = smooth(lensAt(t));
    callout(ctx, 'hermit crab', { x: 540, y: 305 }, inLens(30, -12), hermitLabel(t) * open, 80);
    callout(ctx, 'borrowed snail shell', { x: 540, y: 880 }, inLens(-30, 30), borrowedLabel(t) * open, 72);
    callout(ctx, 'too big for any shell!', { x: 540, y: 560 }, null, tooBigLabel(t), 76);
    callout(ctx, 'no shell!', { x: 540, y: 560 }, null, noShellLabel(t), 92);
    const coil = onCrab(-1, 27, s);
    const into = smooth(ramp(t, MORPH_FROM, MORPH_TO));
    const back = { x: lerp(coil.x, BIG.x - 150, into), y: lerp(coil.y - 40, BIG.ground - 150, into) };
    callout(ctx, 'grows its own armour', { x: 540, y: 690 }, back, armourLabel(t) * clamp01(armourAt(t) * 4), 76);

    // The CRACK on "COCONUTS", over everything but the words.
    const top = { x: NUT.x, y: NUT.ground - 2 * NUT_RY * NUT_SCALE };
    drawBurst(ctx, top.x, top.y + 40, burstAt(t), 'CRACK!', 130, { x: 720, y: 800 });

    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderCoconutAudio };
}
