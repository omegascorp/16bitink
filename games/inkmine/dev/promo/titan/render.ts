import { HIGHLIGHT } from '../../../src/art/palette';
import { drawSpokenLine, PAPER_ON_DARK, SPOKEN } from '../captions';
import { VIDEO, type Short } from '../short';
import { drawSprite } from '../sprites';
import { renderTitanAudio } from './audio';
import { captionAt } from './cues';
import { bubblesOn, dropsAt, kickedAt, motesAt, ringsAt } from './field';
import { drawBubbles, drawBurst, drawDrops, drawFright, drawGlint, drawMotes, drawPuff, drawRings, drawSpeedArcs, grade, bakeRime } from './effects';
import { drawFlyer, makeFlyer, onBody } from './flyer';
import { bakeInset, bakeToddler, goldNote, iceNote, INSET_R, note, TODDLER_SCALE } from './marks';
import { bakeHazeBands, bakeLake, bakeShore, bakeSky, LAKE_HEADROOM } from './scenery';
import {
  boilAt, buckleAt, coatPuffAt, coldAt, degreesAt, dreadAt, flyBurstAt, flyerAt, fourAt, hazeAt, HAZE_PERIOD, horizonAt, insetAt, liftAt, LOOP_S,
  poofAt, reliefAt, SCALE, shockMarkAt, shoreAt, SHORE_BELOW, thickAt, toddlerAt, weightAt, wrap, type Flyer,
} from './story';

/** Draws the "you could fly on Titan" short (story.ts has the choreography). */

const W = VIDEO.width;
const H = VIDEO.height;
/** The buckles on the near wing (its drawing's x along the arm). */
const BUCKLES = [3.2, 8.2] as const;

/** Where a point along the near wing's arm is on screen. */
function onWing(f: Flyer, along: number, scale = SCALE): { x: number; y: number } {
  const s = onBody(f, { x: 2, y: -0.6 });
  return { x: s.x + Math.cos(f.near) * along * scale, y: s.y + Math.sin(f.near) * along * scale };
}

export function createTitan(ctx: CanvasRenderingContext2D): Short {
  const sky = bakeSky();
  const bands = bakeHazeBands();
  const lake = bakeLake();
  const shore = bakeShore();
  const rime = bakeRime();
  const inset = bakeInset();
  const toddler = bakeToddler();
  const flyer = makeFlyer();

  const drawWorld = (t: number, boil: number): void => {
    ctx.drawImage(sky, 0, 0);
    const scroll = ((hazeAt(t) % HAZE_PERIOD) + HAZE_PERIOD) % HAZE_PERIOD;
    ctx.globalAlpha = 0.45 + 0.55 * thickAt(t);
    for (const y of [scroll - HAZE_PERIOD, scroll, scroll + HAZE_PERIOD]) if (y < H && y + HAZE_PERIOD > 0) ctx.drawImage(bands, 0, y);
    ctx.globalAlpha = 1;
    const horizon = horizonAt(t);
    if (horizon - LAKE_HEADROOM < H) ctx.drawImage(lake, 0, horizon - LAKE_HEADROOM);
    if (shoreAt(t) && horizon + SHORE_BELOW < H) ctx.drawImage(shore, 0, horizon + SHORE_BELOW);
    drawRings(ctx, ringsAt(t), boil);
    drawBubbles(ctx, bubblesOn(t), boil);
    drawDrops(ctx, dropsAt(t));
    drawDrops(ctx, kickedAt(t), true);
  };

  const drawNotes = (t: number, f: Flyer, boil: number): void => {
    // "Saturn's moon Titan": the inset, popping in at the top right.
    const ins = insetAt(t);
    if (ins > 0) {
      const k = 0.7 + 0.3 * Math.min(1, ins * 1.4);
      const size = (INSET_R * 2 + 16) * k;
      ctx.globalAlpha = ins;
      ctx.drawImage(inset, 880 - size / 2, 430 - size / 2, size, size);
      ctx.globalAlpha = 1;
    }
    goldNote(ctx, '4×', 860, 470, 190, fourAt(t));
    goldNote(ctx, 'thicker air', 860, 560, 72, fourAt(t) * Math.min(1, Math.max(0, (t - 8.7) * 4)));
    const tod = toddlerAt(t);
    if (tod > 0) {
      const k = 0.6 + 0.4 * Math.min(1, tod * 1.5);
      drawSprite(ctx, toddler, boil, { x: 860, y: 860, scale: TODDLER_SCALE * k, alpha: tod });
      note(ctx, '=', 690, 700, 170, tod);
    }
    const feet = onBody(f, { x: 0, y: 16 });
    goldNote(ctx, '≈ 10 kg', Math.max(170, feet.x), 990, 84, weightAt(t));
    goldNote(ctx, '≈ 10 kg', 860, 990, 84, tod);
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    drawWorld(t, boil);
    const motes = motesAt(t);
    drawMotes(ctx, motes.filter((m) => !m.front));
    const f = flyerAt(t);
    drawSpeedArcs(ctx, f, flyerAt(t - 1 / 30), boil);
    drawFlyer(ctx, flyer, f, t, boil);
    drawMotes(ctx, motes.filter((m) => m.front));

    // "FLY": ink bursting out round it; buckles glinting on "Strap"; the coat's puffs.
    const mid = onBody(f, { x: 0, y: -4 });
    drawBurst(ctx, mid.x, mid.y, 300, 470, flyBurstAt(t), 16, '#ffe2b0', 7);
    BUCKLES.forEach((x, i) => {
      const b = onWing(f, x);
      drawGlint(ctx, b.x, b.y, 46, buckleAt(i, t));
    });
    const chest = onBody(f, { x: 0, y: 2 });
    drawPuff(ctx, chest.x, chest.y, 170, coatPuffAt(t));
    drawPuff(ctx, chest.x, chest.y, 170, poofAt(t));
    drawFright(ctx, f, shockMarkAt(t));

    drawNotes(t, f, boil);
    grade(ctx, { lift: liftAt(t), cold: coldAt(t), dread: dreadAt(t), relief: reliefAt(t) }, rime);
    iceNote(ctx, '−180 °C', 790, 380, 150, degreesAt(t));

    const now = captionAt(t);
    if (now) {
      const rows = now.line.rows;
      let first = 0;
      rows.forEach((row, r) => {
        const y = SPOKEN.y - (rows.length - 1 - r) * 105;
        drawSpokenLine(ctx, row.map((w) => w.text), now.word - first, PAPER_ON_DARK, HIGHLIGHT, y);
        first += row.length;
      });
    }
  };

  return { loopSeconds: LOOP_S, draw, audio: renderTitanAudio };
}

