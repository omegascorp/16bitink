import { drawSquidLimbAlong } from '../../../src/art/squidArt';
import { LIMBS } from '../../../src/art/squidPose';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { apply, type Frame, freeLimb, invert, squidInJaws, wrappedLimb } from '../kraken/rig';
import { drawBeam, drawDaylight, drawRec, drawVignette, drawWater, INK_BG, PAPER_ON_INK, SPOKEN, washOf } from '../kraken/scenery';
import { drawSquidSprite, enterFrame, type SquidSprite } from '../kraken/squidDraw';
import { BELLY, jawAt as jawPoint, openJaw, type Pt, TEETH } from '../kraken/whale';
import { drawWhaleBody, drawWhaleJawAt, JAW_SPRITE_ORIGIN, makeWhaleSprite, WHALE_RES, WHALE_SPRITE_ORIGIN, type WhaleSprite } from '../kraken/whaleArt';
import { VIDEO, type Short } from '../short';
import { drawSnow } from '../swallower/scenery';
import {
  drawBus, drawMouthDepth, drawScars, drawShadedLimbs, drawSquidEye, drawWhaleEye, drawWholeSquid, FAR_LIMBS, makeShadedSquid, NEAR_LIMBS, SCARS, type Writhe,
} from './art';
import { renderSpermSquidAudio } from './audio';
import { captionAt, TEXT } from './script';
import {
  BAR_Y, beamAt, boilAt, BUS, BUS_SQUID_SCALE, BUS_TENTACLE, busInAt, busLabelAt, busSquidInAt, daylightAt, divePlaceAt, eyeGlintAt, eyePlaceAt,
  feetAt, fightJawAt, fightPlaceAt, fightSquidAt, hookPlaceAt, hookSquidFrame, lidAt, LOOP_S, metresOf, moodAt, type Place, readoutAt, scarLookAt,
  sceneAt, shakeAt, gulpBulge, gulpTravelAt, slurpAt, SQUID_ROW_Y, swallowAt, teethOpenAt, teethPlaceAt, toothShineAt, toScreen, underJaw, wrap, wrapAt,
} from './story';

/** Draws "this whale swallows giant squid without chewing" (story.ts has the choreography). */

const VARIANT = 'heavy';
const CAPTION_MAX_W = 980;

/** The spoken phrase, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const { y, size } = TEXT.caption;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const total = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, y, size * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

function inPlace(ctx: CanvasRenderingContext2D, p: Place, draw: () => void): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.zoom, p.zoom);
  draw();
  ctx.restore();
}

function inFrame(ctx: CanvasRenderingContext2D, f: Frame, draw: () => void): void {
  ctx.save();
  enterFrame(ctx, f);
  draw();
  ctx.restore();
}

/** Everything outside `poly` (local px). */
function clipOut(ctx: CanvasRenderingContext2D, poly: readonly Pt[]): void {
  ctx.beginPath();
  ctx.rect(-6000, -6000, 12000, 12000);
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
}

/**
 * The inside of the open mouth: dark at the corner of the gape, a little
 * lighter towards the lips, the far lip curving between the palate and the
 * jaw's tip, a pale lining along the palate and the gum.
 */
function drawMouth(ctx: CanvasRenderingContext2D, open: number): void {
  if (open < 0.004) return;
  const palate = BELLY.filter((p) => p.x <= -100 && p.x >= -650);
  const jaw = Array.from({ length: 16 }, (_, i) => openJaw(jawPoint(i / 15).upper, open));
  const tip = jaw[jaw.length - 1]!;
  const front = palate[0]!;
  ctx.save();
  ctx.beginPath();
  [...palate, ...jaw].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.quadraticCurveTo((tip.x + front.x) / 2 - 90, (tip.y + front.y) / 2, front.x, front.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(-650, 0, -110, 0);
  g.addColorStop(0, '#0a0507');
  g.addColorStop(0.6, '#24131a');
  g.addColorStop(1, '#3d2229');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(232,222,214,0.5)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  palate.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 6) : ctx.moveTo(p.x, p.y + 6)));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(214,170,170,0.35)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  jaw.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y - 8) : ctx.moveTo(p.x, p.y - 8)));
  ctx.stroke();
  ctx.restore();
}

/** The open mouth between the palate and the dropped jaw, local px. */
function wedgeOf(open: number): Pt[] {
  const palate = BELLY.filter((p) => p.x <= -100 && p.x >= -650);
  const jaw = Array.from({ length: 16 }, (_, i) => openJaw(jawPoint(i / 15).upper, open));
  return [...palate, ...jaw];
}

interface Art {
  readonly whale: WhaleSprite;
  readonly squid: SquidSprite;
}

/** The whale's head and body, the jaw `open` radians, with `inMouth` drawn between the mouth's inside and the jaw. */
function drawWhale(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number, open: number, inMouth: () => void, after?: () => void): void {
  drawMouth(ctx, open);
  inMouth();
  if (open > 0.004) drawMouthDepth(ctx, wedgeOf(open));
  drawWhaleJawAt(ctx, art.whale, boil, open);
  drawWhaleBody(ctx, art.whale, boil, t * 2.2, 26);
  after?.();
}

// ---------------------------------------------------------------- the scenes

function drawSwallow(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const sw = swallowAt(t);
  const place = hookPlaceAt(t);
  const sq = hookSquidFrame(sw);
  const w: Writhe = {
    t, amount: sw.writhe, droop: 1.0 * (1 - sw.p), down: Math.PI / 2 - (place.rot + sq.angle), stretch: 1.2, tentacle: 330, fan: 1.3 - 0.9 * sw.p,
  };
  inPlace(ctx, place, () => {
    drawWhale(ctx, art, t, boil, sw.open, () => {
      ctx.save();
      clipOut(ctx, underJaw(sw.open));
      inFrame(ctx, sq, () => drawWholeSquid(ctx, w, boil, () => drawSquidSprite(ctx, art.squid, boil)));
      ctx.restore();
    }, () => drawWhaleEye(ctx, boil));
  });
}

function drawDive(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  inPlace(ctx, divePlaceAt(t), () => drawWhale(ctx, art, t * 1.6, boil, 0, () => undefined, () => drawWhaleEye(ctx, boil)));
  const a = readoutAt(t);
  const feet = feetAt(t);
  drawTextLine(ctx, `${feet.toLocaleString('en-US')} ft`, TEXT.depth.x, TEXT.depth.y, TEXT.depth.size, 700, a, PAPER_ON_INK);
  drawTextLine(ctx, `${metresOf(feet)} m`, TEXT.depth.x, TEXT.depthSmall.y, TEXT.depthSmall.size, 700, 0.85 * a, PAPER_ON_INK);
}

function drawBusScene(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const busIn = busInAt(t);
  if (busIn > 0) drawBus(ctx, BUS.x0 - (1 - busIn) * 1200, BUS.x1 - (1 - busIn) * 1200, BUS.top, BUS.h, boil);
  const sIn = busSquidInAt(t);
  if (sIn > 0) {
    const k = BUS_SQUID_SCALE;
    const w: Writhe = { t, amount: 0.3, droop: 0.12, down: Math.PI / 2, stretch: 1.0, tentacle: BUS_TENTACLE, fan: 0.75 };
    ctx.save();
    ctx.translate(BUS.x0 + 124 * k + (1 - sIn) * 1100, SQUID_ROW_Y);
    ctx.scale(k, k);
    drawWholeSquid(ctx, w, boil, () => drawSquidSprite(ctx, art.squid, boil), 1);
    ctx.restore();
  }
  const a = busLabelAt(t);
  if (a <= 0) return;
  // The bar from mantle tip to club tip, the same as the bus.
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineCap = 'round';
  for (const pass of [{ c: INK_BG, w: 12 }, { c: '#f4eddc', w: 5 }]) {
    ctx.strokeStyle = pass.c;
    ctx.lineWidth = pass.w;
    ctx.beginPath();
    ctx.moveTo(BUS.x0, BAR_Y);
    ctx.lineTo(BUS.x1, BAR_Y);
    for (const x of [BUS.x0, BUS.x1]) {
      ctx.moveTo(x, BAR_Y - 26);
      ctx.lineTo(x, BAR_Y + 26);
    }
    ctx.stroke();
  }
  ctx.restore();
  drawTextLine(ctx, '40 ft', VIDEO.width / 2, TEXT.length.y, TEXT.length.size, 700, a, { fill: SPOKEN, halo: INK_BG });
  drawTextLine(ctx, '12 m', VIDEO.width / 2, TEXT.lengthSmall.y, TEXT.lengthSmall.size, 700, 0.9 * a, PAPER_ON_INK);
}

/** A soft light on a lower tooth's enamel (local px, the jaw `open`): a pale streak down its front, `a` 0 .. 1. */
function drawToothShine(ctx: CanvasRenderingContext2D, s: number, h: number, open: number, a: number): void {
  if (a <= 0.01) return;
  const { upper } = jawPoint(s);
  const base = openJaw({ x: upper.x - 2, y: upper.y + 2 }, open);
  const tip = openJaw({ x: upper.x - 2 + h * Math.sin(-0.18), y: upper.y + 4 - h * 0.92 }, open);
  ctx.save();
  ctx.lineCap = 'round';
  for (const [width, alpha] of [[11, 0.16], [5, 0.5], [2.2, 0.85]] as const) {
    ctx.strokeStyle = `rgba(255,251,238,${(alpha * a).toFixed(3)})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(tip.x + (base.x - tip.x) * 0.12, tip.y + (base.y - tip.y) * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The gulp: the underside (the lower jaw, then the throat behind it) pushed
 * down where the swallowed squid passes, a bulge `amount` local px deep
 * centred on `x`, drawn as column slices of the sprites, shifted.
 */
const CUT_Y = 206;
function drawGulpBulge(ctx: CanvasRenderingContext2D, art: Art, boil: number, x: number, amount: number): void {
  if (amount <= 0.5) return;
  const body = art.whale.body[boil % art.whale.body.length]!;
  const jaw = art.whale.jaw[boil % art.whale.jaw.length]!;
  const step = 4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 260, 150, 520, 400);
  ctx.clip();
  for (let cx = x - 250; cx < x + 250; cx += step) {
    const d = amount * Math.exp(-(((cx - x) / 80) ** 2));
    if (d < 0.3) continue;
    const inJaw = cx > JAW_SPRITE_ORIGIN.x + 10 && cx < JAW_SPRITE_ORIGIN.x + jaw.width / WHALE_RES;
    const [sheet, origin] = inJaw ? [jaw, JAW_SPRITE_ORIGIN] : [body, WHALE_SPRITE_ORIGIN];
    const sx = (cx - origin.x) * WHALE_RES;
    if (sx < 0 || sx >= sheet.width) continue;
    // Only the underside moves: from just under the closed jaw's teeth down.
    const sy = (CUT_Y - origin.y) * WHALE_RES;
    ctx.drawImage(sheet, sx, sy, step * WHALE_RES, sheet.height - sy, cx, CUT_Y + d, step + 0.5, (sheet.height - sy) / WHALE_RES);
  }
  ctx.restore();
}

function drawTeeth(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const open = teethOpenAt(t);
  const slurp = slurpAt(t);
  inPlace(ctx, teethPlaceAt(t), () => {
    drawWhale(ctx, art, t, boil, open, () => {
      // The last tentacle tip, slurped back into the throat.
      if (slurp < 1 && open > 0.02) {
        ctx.save();
        clipOut(ctx, underJaw(open));
        const tip = openJaw(jawPoint(0.85).upper, open);
        const back = 390 * slurp;
        const path = Array.from({ length: 16 }, (_, i) => {
          const s = i / 15;
          return { x: (tip.x + 170 - back - 320 * s) / 2.3, y: (lerpY(tip.y - 60, 215, s) - 30 * Math.sin(s * 5 + t * 6) * (1 - s)) / 2.3 };
        });
        ctx.scale(2.3, 2.3);
        const paths = LIMBS.map((_, i) => (i === 7 ? path.reverse() : []));
        drawShadedLimbs(ctx, paths, [7], boil);
        ctx.restore();
      }
    }, () => {
      for (const tooth of TEETH) drawToothShine(ctx, tooth.s, tooth.h, open, toothShineAt(t, tooth.s));
      const g = gulpTravelAt(t);
      drawGulpBulge(ctx, art, boil, lerpY(-200, -740, g), 40 * gulpBulge(g));
      drawWhaleEye(ctx, boil);
    });
  });
}
const lerpY = (a: number, b: number, s: number): number => a + (b - a) * s;

function drawFight(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const fade = fightSquidAt(t);
  const base = squidInJaws(0.1 * Math.sin(t * 5));
  const sq: Frame = { ...base, y: base.y + 700 * (1 - fade) };
  const wrapped = wrapAt(t);
  const paths = LIMBS.map((limb, i) => {
    const free = freeLimb(i, t, 0.85);
    if (wrapped <= 0) return free;
    const root = apply(sq, limb.root);
    const round = wrappedLimb(i, root, t * 9 + i, 1).map((p) => invert(sq, p));
    return free.map((p, k) => ({ x: p.x + (round[k]!.x - p.x) * wrapped, y: p.y + (round[k]!.y - p.y) * wrapped }));
  });
  const squidPart = (fn: () => void): void => {
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha = fade;
    inFrame(ctx, sq, fn);
    ctx.restore();
  };
  const open = fightJawAt(t);
  inPlace(ctx, fightPlaceAt(t), () => {
    squidPart(() => drawShadedLimbs(ctx, paths, FAR_LIMBS, boil));
    drawWhale(ctx, art, t, boil, open, () => squidPart(() => drawSquidSprite(ctx, art.squid, boil)), () => {
      drawScars(ctx, SCARS.map((s) => scarLookAt(s.order, t)), boil, SPOKEN);
      drawWhaleEye(ctx, boil);
      squidPart(() => {
        drawShadedLimbs(ctx, paths, NEAR_LIMBS, boil);
        drawSquidEye(ctx, boil, 0.8);
      });
    });
  });
}

function drawFilm(ctx: CanvasRenderingContext2D, t: number): void {
  const b = beamAt(t);
  const from = { x: -80, y: 300 };
  const reach = 1550;
  drawBeam(ctx, from, b.angle, reach, b.on);
  const pool = { x: from.x + Math.cos(b.angle) * reach * 0.62, y: from.y + Math.sin(b.angle) * reach * 0.62 };
  drawRec(ctx, pool, b.rec, wrap(t));
}

function drawEye(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const place = eyePlaceAt(t);
  inPlace(ctx, place, () => drawWhale(ctx, art, t, boil, 0, () => undefined, () => drawWhaleEye(ctx, boil, lidAt(t), eyeGlintAt(t))));
  // The dark all round it, a little light from the camera's lamp on the eye.
  const at = toScreen(place, { x: -705, y: 112 });
  const g = ctx.createRadialGradient(at.x, at.y, 120, at.x, at.y, 760);
  g.addColorStop(0, 'rgba(3,2,8,0)');
  g.addColorStop(1, 'rgba(3,2,8,0.88)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

export function createSpermSquid(ctx: CanvasRenderingContext2D): Short {
  const sheet = makePaper();
  const art: Art = { whale: makeWhaleSprite(), squid: makeShadedSquid() };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const sc = sceneAt(t);
    const daylight = daylightAt(t);
    drawWater(ctx, sheet, washOf(moodAt(t), daylight));
    drawDaylight(ctx, daylight, VIDEO.width / 2, -300);
    const sinking = sc.name === 'dive' ? 900 * sc.s : sc.name === 'fight' ? -300 * sc.s : 60 * sc.s;
    drawSnow(ctx, { x: 0, y: 4000 + sinking, zoom: 1, vy: sc.name === 'dive' ? 260 : 0 }, t / LOOP_S, daylight);
    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    if (sc.name === 'swallow') drawSwallow(ctx, art, t, boil);
    else if (sc.name === 'dive') drawDive(ctx, art, t, boil);
    else if (sc.name === 'bus') drawBusScene(ctx, art, t, boil);
    else if (sc.name === 'teeth') drawTeeth(ctx, art, t, boil);
    else if (sc.name === 'fight') drawFight(ctx, art, t, boil);
    else if (sc.name === 'film') drawFilm(ctx, t);
    else drawEye(ctx, art, t, boil);
    ctx.restore();
    drawVignette(ctx, 0.8);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSpermSquidAudio };
}
