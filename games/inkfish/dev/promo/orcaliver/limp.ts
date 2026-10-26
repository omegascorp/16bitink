import { drawTextLine } from '../captions';
import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawOrca } from '../foodchain/art/orca';
import { clamp01, lerp, ramp } from '../short';
import { type BodyPose, onBody, ORCA_SNOUT, poseWith, SHARK_BELLY } from './pose';
import { drawSpeedLines, tinted } from './paint';
import { TEXT, zAges, zAlpha } from './script';
import { drawSnow, drawVignette, drawWater, glow, mixRgb, type Rgb, wash } from './sea';
import { AND_AT, chargeAt, cycles, limpAt, LIVER_AT, THEN_AT, until, wrap } from './story';

/**
 * "and a shark on its back goes LIMP." (eerie): murky violet-teal water, the
 * shark hanging belly-up, its tail slowing, then still on "LIMP": it sags
 * and sinks, and three "z"s drift up off its head. "Then they went straight
 * for the…" (the shock building): the water darkens to red, an orca comes in
 * fast and dark from the upper left, straight for the belly, the camera
 * pushing in, until the flash.
 */

const EERIE_TOP: Rgb = [44, 58, 84];
const EERIE_MID: Rgb = [22, 28, 50];
const EERIE_BOTTOM: Rgb = [4, 6, 14];
const ALARM_TOP: Rgb = [70, 22, 36];
const ALARM_MID: Rgb = [34, 10, 22];
const ALARM_BOTTOM: Rgb = [6, 2, 6];
const Z_FILL = '#d8e6ff';
const Z_HALO = '#0c1022';

/** The shark on its back: snout to the right, sinking slowly, sagging on "LIMP". */
export function limpSharkAt(t: number): BodyPose {
  const u = wrap(t);
  const sink = ramp(u, AND_AT - 0.3, THEN_AT + 1.5) * until(u, LIVER_AT + 0.15);
  const limp = limpAt(t);
  return { x: 540, y: lerp(740, 800, sink), length: 860, angle: 0.02 + 0.09 * limp + 0.01 * Math.sin(cycles(3, t)), flip: true };
}

/** The tail: twitching until "LIMP", then still. */
export const limpTailAt = (t: number): number => 0.9 + (1 - limpAt(t)) * 0.7 * Math.sin(cycles(19, t));

/** The charging orca: from the upper left, straight for the belly (on top now). */
export function chargeOrcaAt(t: number): BodyPose {
  const shark = limpSharkAt(t);
  const belly = onBody(shark, SHARK_BELLY);
  const c = chargeAt(t);
  const angle = 0.72;
  const back = lerp(800, 90, c);
  const snout = { x: belly.x - Math.cos(angle) * back, y: belly.y - 40 - Math.sin(angle) * back };
  return poseWith(snout, ORCA_SNOUT, 1300, angle, false);
}

export function drawLimp(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  const c = chargeAt(t);
  const red = ramp(c, 0, 0.6);
  drawWater(ctx, sheet, mixRgb(EERIE_TOP, ALARM_TOP, red), mixRgb(EERIE_MID, ALARM_MID, red), mixRgb(EERIE_BOTTOM, ALARM_BOTTOM, red));
  drawSnow(ctx, t, '#d0dcf0', 0.7);
  const shark = limpSharkAt(t);
  const belly = onBody(shark, SHARK_BELLY);
  // The camera: a slow push in, faster on the charge, towards the belly.
  const zoom = 1 + 0.06 * ramp(wrap(t), AND_AT, THEN_AT) * until(wrap(t), LIVER_AT + 0.15) + 0.18 * c ** 2;
  ctx.save();
  ctx.translate(belly.x, belly.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-belly.x, -belly.y);
  glow(ctx, shark.x, shark.y - 40, 520, '160,170,220', 0.2 * (1 - red));
  drawGreatWhite(ctx, shark.x, shark.y, shark.length, shark.angle, t, { tail: limpTailAt(t), worried: 0.3 * (1 - limpAt(t)) }, shark.flip);
  if (c > 0) {
    const orca = chargeOrcaAt(t);
    const snout = onBody(orca, ORCA_SNOUT);
    drawSpeedLines(ctx, snout.x - 200, snout.y - 120, orca.angle, clamp01(c * 3), 420, 700);
    tinted(ctx, (cc) => drawOrca(cc, orca.x, orca.y, orca.length, orca.angle, t, { jaw: 0.5 * c, tail: cycles(31, t) }), '#12040a', 0.45);
  }
  ctx.restore();
  // "z z Z" drifting up off its head.
  const za = zAlpha(t);
  zAges(t).forEach((age, i) => {
    if (age <= 0) return;
    const rise = Math.min(1, age / 1.2);
    const x = TEXT.z.x + 40 * i + 18 * Math.sin(age * 4 + i);
    const y = TEXT.z.y - TEXT.zRise * rise * (0.6 + 0.2 * i);
    const size = TEXT.z.size * (0.7 + 0.18 * i);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.15 + 0.1 * Math.sin(age * 3));
    drawTextLine(ctx, i === 2 ? 'Z' : 'z', 0, 0, size, 700, za * clamp01(age * 5) * (1 - 0.4 * rise), { fill: Z_FILL, halo: Z_HALO });
    ctx.restore();
  });
  wash(ctx, 'soft-light', '#7a6ab0', 0.25 * (1 - red));
  drawVignette(ctx, 0.65 + 0.15 * red, red > 0.5 ? '10,0,4' : '2,4,12');
}
