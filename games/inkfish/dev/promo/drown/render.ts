import { PAPER, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makeBackdrop } from '../backdrop';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { mouthOf } from '../chain';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderDrownAudio } from './audio';
import { bodyPoint, GILL, poseOf } from './fish';
import { drawMap, makeMap } from './map';
import { drawBed, drawCallout, drawGauge, drawO2, drawRing, drawWaterFlow, drawZzz, RED, WATER } from './props';
import { drawMoonbeams, drawNightWash, drawStream, makeMoon, MOON } from './scene';
import {
  bluefinLabel, captionAt, chokeLabel, gillsLabel, hookAt, mouthLabel, oceanLabel, tunaLabel, waterLabel,
} from './script';
import {
  bedAt, bedCrossAt, boilAt, drainAt, flowPhase, gaugeAt, LOOP_S, mapAt, nightAt, oxygenAt, ringAt, routeUAt, TUNA, tunaAt, waterAt, zzzAt,
  zzzStrikeAt, type Fish,
} from './story';

/** Draws the "fish CAN drown" short (story.ts has the choreography). */

const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const WATERY: TextInk = { fill: WATER, halo: PAPER };
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const LABEL_SIZE = 62;
const HOOK = { text: 'FISH CAN DROWN?!', y: 400, size: 132 } as const;
const GAUGE = { x: 850, y: 520, r: 95 } as const;
/** The ring sits this far along the tuna, just behind its pectoral fins. */
const RING_ALONG = 0.42;

/** The spoken line, word by word, the word being said in red. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : INK_ON_PAPER);
    x += (natural[i]! + space) * k;
  });
}

/** The tuna in its life ring (when it's wearing it): the ring's far half, the fish, the near half. */
function drawTuna(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, t: number, boil: number): void {
  const ring = ringAt(t);
  const scale = f.len / TUNA.len;
  const at = bodyPoint(f, RING_ALONG, 0);
  const c = ring ? { x: at.x, y: at.y - ring.lift } : null;
  if (ring && c) drawRing(ctx, c, scale, ring.spin, 'back', boil);
  drawSwimmer(ctx, sprite, poseOf(f), boil, { jaw: f.jaw });
  if (ring && c) drawRing(ctx, c, scale, ring.spin, 'front', boil);
}

/** Its labels while it breathes: "tuna", "mouth", "water", "gills". */
function drawBreathing(ctx: CanvasRenderingContext2D, f: Fish, t: number): void {
  const m = mouthOf(poseOf(f));
  const gill = bodyPoint(f, GILL, 0.35);
  const back = bodyPoint(f, 0.6, -1);
  drawCallout(ctx, 'tuna', { x: back.x - 40, y: back.y - 90 }, null, tunaLabel(t), LABEL_SIZE, SPOKEN);
  drawCallout(ctx, 'mouth', { x: m.x - 20, y: m.y + 185 }, { x: m.x + 4, y: m.y + 22 }, mouthLabel(t), LABEL_SIZE, INK_ON_PAPER);
  drawCallout(ctx, 'water', { x: m.x + 165, y: m.y + 135 }, null, waterLabel(t), LABEL_SIZE, WATERY);
  drawCallout(ctx, 'gills', { x: gill.x - 170, y: Math.min(1075, gill.y + 160) }, gill, gillsLabel(t), LABEL_SIZE, SPOKEN);
}

/** The O₂ gauge, and the warning under it as it drains. */
function drawOxygen(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const drain = drainAt(t);
  const alarm = Math.max(0, Math.min(1, (drain - 0.55) / 0.3));
  drawGauge(ctx, GAUGE.x, GAUGE.y, GAUGE.r, oxygenAt(t), alarm, gaugeAt(t), t, boil);
  const shown = chokeLabel(t);
  if (shown <= 0) return;
  drawTextLine(ctx, 'no water = no', GAUGE.x - 40, GAUGE.y + 165, 52, 700, shown, SPOKEN);
  drawO2(ctx, GAUGE.x + 122, GAUGE.y + 165, 52, shown, RED);
}

/** Night: the moon and its light, the crossed-out bed and the struck-through "Zzz". */
function drawNight(ctx: CanvasRenderingContext2D, moon: readonly HTMLCanvasElement[], f: Fish, t: number, boil: number): void {
  const night = nightAt(t);
  drawMoonbeams(ctx, night, t / LOOP_S);
  if (night > 0) {
    const frame = moon[boil % moon.length]!;
    ctx.save();
    ctx.globalAlpha = night;
    ctx.drawImage(frame, MOON.x - frame.width / 2, MOON.y - frame.height / 2);
    ctx.restore();
  }
  drawBed(ctx, 245, 545, 1.25, bedAt(t), bedCrossAt(t), boil);
  const head: Pt = bodyPoint(f, 0.12, -1.1);
  drawZzz(ctx, 700, 540, 1, zzzAt(t), zzzStrikeAt(t), head, boil);
}

/** "bluefin" over the little tuna crossing the map. */
function drawBluefin(ctx: CanvasRenderingContext2D, f: Fish, t: number): void {
  drawCallout(ctx, 'bluefin', { x: f.x, y: f.y + 85 }, null, bluefinLabel(t), LABEL_SIZE, SPOKEN);
}

export function createDrown(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(70,150,210,0.10)', bottom: 'rgba(30,90,160,0.32)' });
  const tuna = makeSprite('tuna', 5);
  const map = makeMap();
  const moon = makeMoon(BOIL_FRAMES);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const f = tunaAt(t);
    const onMap = mapAt(t);
    ctx.drawImage(backdrop, 0, 0);
    drawStream(ctx, flowPhase(t), 1 - onMap);
    drawMap(ctx, map, boil, onMap, routeUAt(t), oceanLabel(t));
    drawTuna(ctx, tuna, f, t, boil);
    drawWaterFlow(ctx, f, waterAt(t), flowPhase(t));
    drawNightWash(ctx, nightAt(t));
    drawNight(ctx, moon, f, t, boil);
    drawBreathing(ctx, f, t);
    drawOxygen(ctx, t, boil);
    drawBluefin(ctx, f, t);
    drawTextLine(ctx, HOOK.text, VIDEO.width / 2, HOOK.y, HOOK.size, 700, hookAt(t), SPOKEN);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderDrownAudio };
}
