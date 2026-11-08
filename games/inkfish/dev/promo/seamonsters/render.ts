import { createGameCard } from '../foodchain/inserts';
import type { Short } from '../short';
import { smooth } from '../short';
import { drawYou } from '../swallowyou/art/people';
import { vignette, wash } from '../swallowyou/sea';
import { drawText, INK_ON_PAPER } from '../swallowyou/text';
import { prepare as prepareLegends } from './art/legends';
import { prepare as prepareSiphonophore } from './art/siphonophore';
import { renderSeamonstersAudio } from './audio';
import { drawLegendBeat, drawOverlays, legendHide } from './cards';
import { prepareCast, SQUID_EYE } from './cast';
import { cutAt, drawDarkness } from './cutaways';
import { drawCornerMap, drawCounter, drawNameCard, hudAlpha, mapAlpha, STAMP_TIMES } from './hud';
import { layoutRow, W, H } from './lineup';
import { drawOpen } from './open';
import { createStageKit, drawStage, monsterPoint, type StageKit } from './stage';
import { sectionStart, T, VIDEO_S } from './timeline';

/**
 * Draws "sea monsters size comparison… but every one is real", the fourth
 * long-form video (script.md has the words, timeline.ts the beats): the cold
 * open's engravings, then the line-up from "you" to the blue whale, each
 * animal arriving behind the legend it started (a card stamped REAL and
 * torn open), measured on the counter, with the cut-aways its story needs;
 * the game card; the siphonophore laid out over the blue whale; the monster
 * map with every legend stamped; the end card.
 */

const s = sectionStart;

/** The game card's window, and the end card's start. */
const GAME = { from: s(5) - 0.3, to: s(6) - 0.3 } as const;
const END_AT = T.end - 0.2;

/** The end card: the logo and the site on the left, the right half clear for YouTube's end-screen elements. */
function drawEndCard(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f4eddc';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  drawYou(ctx, 230, 1040, 300, t, { arms: 'shrug', alpha, halo: 0 });
  drawText(ctx, 'InkFish', { x: 140, y: 400, size: 190, maxWidth: 760, left: true }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, 'Every animal here is drawn for the game.', { x: 146, y: 500, size: 56, maxWidth: 780, left: true }, 500, alpha, INK_ON_PAPER);
  drawText(ctx, 'Free to try in your browser · 16bit.ink', { x: 146, y: 590, size: 60, maxWidth: 780, left: true }, 700, alpha, INK_ON_PAPER);
}

/** A white flash on each REAL stamp and each shock, and the darker grade in the deep sections. */
function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const deep = t >= s(7) && t < s(9) ? 1 : 0;
  vignette(ctx, 0.25 + 0.2 * deep);
  for (const at of [T.dinosaurs, T.sank, T.longer, ...STAMP_TIMES]) {
    const d = t - at;
    if (d >= 0 && d < 0.35) wash(ctx, 'screen', '#fff4e0', 0.28 * (1 - d / 0.35));
  }
}

/** The line-up with its overlays, legend cards and HUD. */
function drawLineup(ctx: CanvasRenderingContext2D, kit: StageKit, t: number): void {
  const cut = cutAt(t);
  if (cut && !cut.over) {
    cut.draw(ctx, kit.sea, t);
    return;
  }
  drawStage(ctx, kit, t);
  drawDarkness(ctx, monsterPoint(kit, 'squid', t, SQUID_EYE.along, SQUID_EYE.down), t);
  drawOverlays(ctx, kit, t);
  if (cut?.over) cut.draw(ctx, kit.sea, t);
  drawLegendBeat(ctx, t);
  const hud = hudAlpha(t) * (cut?.over ? 0.3 : 1) * (1 - legendHide(t));
  drawCounter(ctx, t, hud);
  drawNameCard(ctx, t, hud);
}

export async function createSeamonsters(ctx: CanvasRenderingContext2D): Promise<Short> {
  await Promise.all([prepareCast(), prepareLegends(), prepareSiphonophore()]);
  layoutRow();
  const kit = createStageKit();
  const game = createGameCard();

  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t >= END_AT) {
      drawEndCard(ctx, t, 1);
      ctx.restore();
      return;
    }
    if (t >= GAME.from && t < GAME.to) {
      game.draw(ctx, t, GAME.from, T.eatUp, T.free, 1);
      ctx.restore();
      return;
    }
    if (t < s(1) - 0.05) drawOpen(ctx, kit.sea, t);
    else drawLineup(ctx, kit, t);
    drawGrade(ctx, t);
    kit.sea.grain(ctx, 0.12);
    // The monster map: in the corner from the first legend, filling the frame on "every monster… was real", back again for the pull out.
    const grow = smooth((t - T.allReal + 0.3) / 0.8) * (1 - smooth((t - T.weirder + 0.2) / 0.8));
    const inCut = cutAt(t);
    const mapOn = t >= s(1) && !(inCut && !inCut.over) ? mapAlpha(t) * (1 - legendHide(t)) : 0;
    drawCornerMap(ctx, t, Math.max(mapOn * (1 - smooth((t - T.weirder) / 0.5)), grow), grow);
    if (t > END_AT - 0.4) drawEndCard(ctx, t, smooth((t - END_AT + 0.4) / 0.4));
    ctx.restore();
  };

  return { loopSeconds: VIDEO_S, draw, audio: renderSeamonstersAudio };
}
