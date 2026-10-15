import { INK, PAPER_FILL, RED } from '../../../src/art/palette';
import { drawSpokenLine, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01, ramp, smooth, VIDEO, type Short } from '../short';
import { critterSprite, drawSprite, type Sprite } from '../sprites';
import { renderSnowCrabAudio } from './audio';
import { CRABS, crabAt, HERO_INDEX } from './field';
import { drawEnergyBar, drawThermometer, mercuryTop, THERMO } from './gauges';
import { callout, inkLine, textWidth } from './labels';
import { drawMap, makeMapCard } from './map';
import { drawNotice, makeNoticeSheet } from './notice';
import { drawFlecks, drawRays, drawWarmth, fleckAt, ghostOf, makeSeafloor } from './scene';
import {
  alaskaLabelAt, barAt, captionAt, crabLabelAt, energyAt, everAt, firstTimeAt, heatAt, heatwaveLabelAt, iceAt, icyLabelAt, joltAt, loneAt, LOOP_S,
  mapAt, noticeAlaskaAt, noticeAt, noticeYearAt, numberAt, pinAt, pinRingAt, seaLabelAt, seasonLineAt, shimmerAt, stampAt, thermoAt, underlineAt,
  vanishedAt, warmthAt, yearAt, yearsAt,
} from './story';
import { boilAt, ICY_AT } from './timing';

/** Draws the "ten billion crabs vanished" short (story.ts has the choreography). */

const RED_INK: TextInk = { fill: RED, halo: PAPER_FILL };
const MAP_AT = { x: 80, y: 290 } as const;
/** The lone warm crab's feet, and its size. */
const LONE = { y: 1030, scale: 4.1 } as const;
const BAR_Y = 700;

/** A crab, or its empty outline, or both as one becomes the other. */
function drawCrab(ctx: CanvasRenderingContext2D, crab: Sprite, ghost: Sprite, boil: number, x: number, y: number, scale: number, facing: number, body: number, outline: number): void {
  if (outline > 0) drawSprite(ctx, ghost, boil, { x, y, scale, facing, alpha: outline });
  if (body > 0) drawSprite(ctx, crab, boil, { x, y, scale, facing, alpha: body });
}

/** "10,000,000,000" and "snow crabs vanished" over the field. */
function drawHeader(ctx: CanvasRenderingContext2D, t: number): void {
  const n = numberAt(t);
  drawTextLine(ctx, '10,000,000,000', VIDEO.width / 2, 385, 150, 700, n);
  const v = vanishedAt(t);
  if (v <= 0) return;
  const a = 'snow crabs';
  const b = 'vanished';
  const size = 92;
  const wa = textWidth(ctx, a + ' ', size, 700);
  const wb = textWidth(ctx, b, size, 700);
  const left = VIDEO.width / 2 - (wa + wb) / 2;
  drawTextLine(ctx, a, left + textWidth(ctx, a, size, 700) / 2, 478, size, 700, v);
  drawTextLine(ctx, b, left + wa + wb / 2, 478, size, 700, v, RED_INK);
  inkLine(ctx, left + wa - 4, 498, left + wa + wb + 6, 494, underlineAt(t), 6, RED);
}

/** The year counter, rolling 2018 → 2021, over a timeline of four dots. */
function drawYears(ctx: CanvasRenderingContext2D, t: number): void {
  const show = yearsAt(t);
  if (show <= 0) return;
  const { year, roll } = yearAt(t);
  const y = 400;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y - 160, VIDEO.width, 190);
  ctx.clip();
  const e = smooth(roll);
  if (roll < 1) drawTextLine(ctx, String(year - 1), VIDEO.width / 2, y - 120 * e, 170, 700, show * (1 - e));
  drawTextLine(ctx, String(year), VIDEO.width / 2, y + 120 * (1 - e), 170, 700, show * e);
  ctx.restore();
  const x0 = 330;
  const x1 = 750;
  const ty = 470;
  inkLine(ctx, x0, ty, x1, ty, 1, 5, INK, show * 0.8);
  const done = year - 2018 + roll;
  inkLine(ctx, x0, ty, x0 + ((x1 - x0) * Math.max(0, done)) / 3, ty, 1, 9, RED, show);
  for (let k = 0; k < 4; k++) {
    const x = x0 + ((x1 - x0) * k) / 3;
    ctx.save();
    ctx.globalAlpha = show;
    ctx.fillStyle = k <= done - 0.5 || k === 0 ? RED : PAPER_FILL;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, ty, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawTextLine(ctx, `'${18 + k}`, x, ty + 62, 44, 700, show * 0.85);
  }
}

/** Wavy lines of heat rising off the warm crab. */
function drawShimmer(ctx: CanvasRenderingContext2D, x: number, t: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.strokeStyle = RED;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  for (let k = 0; k < 3; k++) {
    const u = (t * 0.9 + k / 3) % 1;
    const bx = x - 70 + k * 70;
    const by = 850 - u * 100;
    ctx.globalAlpha = alpha * Math.sin(Math.PI * u) * 0.7;
    ctx.beginPath();
    for (let s = 0; s <= 12; s++) {
      const yy = by - s * 6;
      const xx = bx + 9 * Math.sin(s * 0.9 + t * 6 + k);
      if (s === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Which drifting fleck the "icy water" label points at: the one nearest the label's spot when it is said. */
function icyFleck(): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < 34; i++) {
    const p = fleckAt(i, ICY_AT + 0.3, LOOP_S);
    const d = Math.hypot(p.x - 470, p.y - 660);
    if (d < bestD) [best, bestD] = [i, d];
  }
  return best;
}

export function createSnowCrab(ctx: CanvasRenderingContext2D): Short {
  const floor = makeSeafloor();
  const crab = critterSprite('snowcrab', 4);
  const ghost = ghostOf(crab, 5);
  const mapCard = makeMapCard();
  const sheet = makeNoticeSheet();
  const fleck = icyFleck();
  const order = CRABS.map((_, i) => i).sort((a, b) => CRABS[a]!.y - CRABS[b]!.y);
  const hero = CRABS[HERO_INDEX]!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t);
    ctx.drawImage(floor, 0, 0);
    drawWarmth(ctx, warmthAt(t));
    drawRays(ctx, t);
    drawFlecks(ctx, t, LOOP_S, iceAt(t));

    for (const i of order) {
      const c = CRABS[i]!;
      const s = crabAt(c, t);
      drawCrab(ctx, crab, ghost, boil, s.x, c.y, c.scale, c.facing, s.body, s.ghost);
    }
    const hs = crabAt(hero, t);
    const label = crabLabelAt(t);
    callout(ctx, 'snow crab', hs.x + 330, 960, { x: hs.x + 80, y: hero.y - 70 }, label, 72);
    drawTextLine(ctx, 'Chionoecetes opilio', hs.x + 330, 1012, 46, 500, label * 0.85);

    // One warm crab, burning through its energy.
    const lone = loneAt(t);
    drawShimmer(ctx, lone.x, t, shimmerAt(t));
    drawCrab(ctx, crab, ghost, boil, lone.x, LONE.y, LONE.scale, 1, lone.body, lone.ghost);
    drawEnergyBar(ctx, lone.x, BAR_Y, barAt(t), energyAt(t), t);

    drawHeader(ctx, t);
    drawYears(ctx, t);

    // The heatwave.
    const thermo = thermoAt(t);
    drawThermometer(ctx, thermo, heatAt(t), t);
    const hw = heatwaveLabelAt(t);
    drawTextLine(ctx, 'marine heatwave', 410, 370, 92, 700, hw, RED_INK);
    drawTextLine(ctx, '2018 – 2019', 410, 440, 58, 700, hw * 0.9);
    if (thermo > 0.5 && hw > 0) inkLine(ctx, 700, 352, THERMO.x - THERMO.tube / 2 - 36, mercuryTop(heatAt(t)), ramp(hw, 0.3, 1), 4, INK, thermo);
    const icy = icyLabelAt(t);
    const fp = fleckAt(fleck, t, LOOP_S);
    callout(ctx, 'icy water', 300, 590, fp, icy * clamp01(iceAt(t) * 2), 72);

    drawMap(ctx, mapCard, boil, MAP_AT.x, MAP_AT.y, { show: mapAt(t), alaska: alaskaLabelAt(t), pin: pinAt(t), sea: seaLabelAt(t), ring: pinRingAt(t) });
    drawNotice(ctx, sheet, crab, boil, {
      show: noticeAt(t), year: noticeYearAt(t), alaska: noticeAlaskaAt(t), season: seasonLineAt(t), stamp: stampAt(t), jolt: joltAt(t),
      first: firstTimeAt(t), ever: everAt(t),
    });

    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, INK_ON_PAPER);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSnowCrabAudio };
}

