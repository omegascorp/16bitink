import { drawSpokenLine } from '../captions';
import { type Short } from '../short';
import { crabSprite, drawSprite, shellSprite } from '../sprites';
import { renderOctopusAudio } from './audio';
import { drawArmFlow, drawInsides, NUMBER_AT } from './insides';
import { bodyToScreen, crabAt, JETS, type Octo, octoAt, PUFF_S, PUFFS, rotate, SHELL_TOP } from './motion';
import { drawArms, drawBody } from './octopus';
import { BLUE_INK, callout, drawCross, drawExclaim, drawMonitor, drawNumber, drawPuff, drawTile, IN_BLUE, IN_RED, MONITOR } from './props';
import { drawAmbient, makePool } from './scene';
import {
  alarmAt, blueLabel, bodyLabel, boilAt, captionAt, copperTile, gillsLabel, HEART_IDS, heartRingsAt, ironCross, ironTile, LOOP_S, mainLabel,
  monitorAt, numberAt, oxygenLabel, stoppedAt, stoppedLabel, tapLabel, titleAt, wrap, xrayAt,
} from './story';

/** Draws the "this animal has three hearts" short (story.ts has the beats, motion.ts the moves). */

const CRAB_SCALE = 1.6;
const COPPER = { n: 29, sym: 'Cu', name: 'copper', wash: '#c97a3e', blood: BLUE_INK } as const;
const IRON = { n: 26, sym: 'Fe', name: 'iron', wash: '#8d8a86', blood: '#c0392b' } as const;

/** Water squirted from the siphon at each jet: bubbles streaming back the way it came. */
function drawJetBubbles(ctx: CanvasRenderingContext2D, t: number): void {
  for (const at of JETS) {
    const u = (t - at) / 0.9;
    if (u < 0 || u > 1) continue;
    const o = octoAt(at);
    const from = bodyToScreen(o, { x: 16, y: -4 });
    const back = rotate({ x: 0, y: 1 }, o.angle);
    ctx.save();
    ctx.strokeStyle = '#26316a';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = '#fffaf0';
    for (let k = 0; k < 7; k++) {
      const d = (60 + 26 * k) * Math.sqrt(u);
      const side = (k % 2 ? 1 : -1) * (6 + 5 * k) * u;
      ctx.globalAlpha = 0.85 * (1 - u);
      ctx.beginPath();
      ctx.arc(from.x + back.x * d - back.y * side, from.y + back.y * d + back.x * side, 5 + (k % 3) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function createOctopus(ctx: CanvasRenderingContext2D): Short {
  const pool = makePool();
  const back = crabSprite('back');
  const front = crabSprite('front');
  const shell = shellSprite('whelk');

  const drawCrab = (t: number, boil: number): void => {
    const c = crabAt(t);
    const at = { x: c.x, y: c.ground, scale: CRAB_SCALE, facing: -1, rotation: c.tilt };
    drawSprite(ctx, back, boil, { ...at, alpha: 1 - c.hidden });
    drawSprite(ctx, shell, boil, at);
    drawSprite(ctx, front, boil, { ...at, alpha: 1 - c.hidden });
  };

  const drawOctopus = (t: number, boil: number, o: Octo): void => {
    const xray = xrayAt(t);
    drawArms(ctx, o, boil, (d, i, spine) => {
      if (xray > 0 && (i === 2 || i === 5)) drawArmFlow(d.pen.ctx, spine, t, xray);
    });
    drawBody(ctx, o, boil, xray, (d) => drawInsides(d, t, xray));
  };

  const drawLabels = (t: number, o: Octo): void => {
    const s = (x: number, y: number) => bodyToScreen(o, { x, y });
    const title = titleAt(t);
    if (title > 0) callout(ctx, '3 hearts', { x: 540, y: 345 }, [], title, 96, IN_RED);
    callout(ctx, 'gills', { x: 540, y: 345 }, [s(-17, -50), s(17, -50)], gillsLabel(t), 76);
    callout(ctx, 'body', { x: 150, y: 820 }, [{ x: o.x + o.arms[2]![9]!.x * 5, y: o.y + o.arms[2]![9]!.y * 5 }], bodyLabel(t), 76);
    callout(ctx, 'blue blood!', { x: 850, y: 640 }, [s(15, -47)], blueLabel(t), 80, IN_BLUE);
    callout(ctx, 'oxygen', { x: 850, y: 640 }, [s(9, -60)], oxygenLabel(t) * (1 - blueLabel(t)), 76, IN_BLUE);
    callout(ctx, 'main heart', { x: 830, y: 470 }, [s(6, -44)], mainLabel(t), 72, IN_RED);
    drawTile(ctx, 170, 410, copperTile(t), COPPER);
    drawTile(ctx, 910, 410, ironTile(t), IRON);
    drawCross(ctx, 910, 410, 80, ironCross(t));
    drawMonitor(ctx, t, monitorAt(t), stoppedAt(t));
    const stopped = stoppedLabel(t);
    if (stopped > 0) callout(ctx, 'stopped!', { x: MONITOR.x + MONITOR.w / 2 + 30, y: MONITOR.y + MONITOR.h + 70 }, [], stopped * monitorAt(t), 72, IN_RED);
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    const o = octoAt(t);
    ctx.drawImage(pool, 0, 0);
    drawAmbient(ctx, t);
    drawCrab(t, boil);
    drawOctopus(t, boil, o);
    PUFFS.forEach((p, i) => {
      if (p.to !== SHELL_TOP) drawPuff(ctx, p.to, (t - p.at) / PUFF_S, i);
    });
    drawJetBubbles(ctx, t);
    for (const id of HEART_IDS) {
      const n = NUMBER_AT[id];
      const at = bodyToScreen(o, n);
      drawNumber(ctx, id, { x: at.x, y: at.y + 26 }, numberAt(id, t) * Math.min(1, xrayAt(t) * 3), heartRingsAt(id, t));
    }
    drawLabels(t, o);
    const c = crabAt(t);
    drawExclaim(ctx, c.x + 10, c.ground - 150, 130 * alarmAt(t));
    const tap = tapLabel(t);
    if (tap > 0) callout(ctx, 'tap tap', { x: SHELL_TOP.x - 10, y: SHELL_TOP.y - 120 }, [], tap, 60);
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderOctopusAudio };
}
