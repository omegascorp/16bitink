import { INK, PAPER } from '../../../src/art/pen';
import { lerp, smooth, window01 } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { drawYou, drawYouLying } from './art/people';
import { drawAntlers, drawBottle, drawBus, drawCan, drawFilmFrame, drawHide, drawJawbone, drawLid, drawSack, drawStone } from './art/props';
import { boilOf, glow } from './art/ink';
import { drawAnimal, type AnimalPose } from './cast';
import { moodCamera } from './grade';
import { drawNameCard, drawRuler } from './hud';
import { bodyMiddle, type Camera, H, mouthOf, type Pt, type Stage, stageCamera, toScreen, W, YOU_X } from './layout';
import { createSea, type Look, type Sea } from './sea';
import { SPECIES, YOU_FT, yousLong } from './species';
import { drawSquid } from './squid';
import { drawPop, PAPER_ON_INK, YELLOW } from './text';
import { type Animal, T } from './timeline';

/**
 * One animal's turn: its open mouth fills the frame, the camera pulls back
 * to it beside "you" on the ruler, and the beats the narrator names play on
 * it: the grouper's trash-can-lid mouth, what's in the tiger shark's belly,
 * the film frame torn off the great white, the croc's small prey, stones and
 * death roll, the Greenland shark's reindeer, the whale shark's school bus
 * and the "you" that fits in its mouth, the sperm whale's squid.
 */

export const LOOK_OF: Readonly<Record<Animal, Look>> = {
  grouper: 'florida', tiger: 'tropic', white: 'cold', croc: 'estuary', greenland: 'arctic', whaleShark: 'plankton', humpback: 'capecod', sperm: 'deep',
};

export interface StageKit {
  readonly sea: Sea;
  readonly minnow: Sprite;
}

export function createStageKit(): StageKit {
  return { sea: createSea(), minnow: makeSprite('perch', 3) };
}

/** The jaws: working open and shut in the close-up, idling in the line-up, wide where the beat wants it. */
function gapeAt(s: Stage, t: number): number {
  const a = s.animal;
  const close = 0.55 + 0.45 * Math.cos((2 * Math.PI * (t - s.close)) / 1.7);
  const pulled = smooth((t - s.pullFrom) / (s.pullTo - s.pullFrom));
  let idle = 0.12 + 0.08 * Math.sin(t * 1.3);
  if (a === 'whaleShark') idle = 0.75 + 0.1 * Math.sin(t * 0.8);
  if (a === 'croc') idle = Math.max(idle, window01(t, T.chew - 0.2, T.wholeCroc + 0.3, 0.3) * (0.55 + 0.35 * Math.sin(t * 3)));
  if (a === 'sperm') idle = Math.max(idle, window01(t, T.squid, T.swallowWhole + 0.2, 0.5) * 0.85);
  if (a === 'grouper') idle = Math.max(idle, window01(t, T.trashLid - 0.2, T.y2014 - 0.2, 0.3));
  return lerp(Math.max(0.15, close), idle, pulled);
}

function poseAt(s: Stage, t: number): AnimalPose {
  const roll = s.animal === 'croc' && t > T.rolls - 0.1 && t < T.crocTears + 1.2 ? (t - T.rolls + 0.1) * 9 : 0;
  return { gape: gapeAt(s, t), roll };
}

// ---------------------------------------------------------------- the belly cut-away

interface BellyItem {
  readonly at: number;
  readonly draw: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number) => void;
  readonly dx: number;
  readonly dy: number;
  readonly size: number;
  readonly angle: number;
}

const item = (at: number, draw: BellyItem['draw'], dx: number, dy: number, size: number, angle: number): BellyItem => ({ at, draw, dx, dy, size, angle });

const BELLY: Partial<Record<Animal, { readonly from: number; readonly to: number; readonly items: readonly BellyItem[]; readonly lines: readonly (readonly [number, string])[] }>> = {
  tiger: {
    from: T.redSea - 0.2, to: T.butEven - 0.1,
    items: [
      item(T.cans, (c, x, y, s, a, t) => drawCan(c, x, y, s, a, t), -70, -60, 80, 0.4),
      item(T.cans + 0.25, (c, x, y, s, a, t) => drawCan(c, x, y, s, a, t, '#2f6db0'), 10, -78, 74, -0.6),
      item(T.bottle, drawBottle, 70, -10, 96, 1.1),
      item(T.sacks, drawSack, -60, 50, 100, -0.2),
      item(T.sacks + 0.35, drawSack, 40, 62, 92, 0.5),
    ],
    lines: [[T.cans, '2 cans'], [T.bottle, 'a plastic bottle'], [T.sacks, '2 burlap sacks']],
  },
  croc: {
    from: T.rocks - 0.5, to: T.anythingBig - 0.1,
    items: [0, 1, 2, 3, 4, 5].map((k) => item(T.rocks + k * 0.12, (c, x, y, s, a, t) => drawStone(c, x, y, s, a, t, k + 1), -74 + (k % 3) * 74, -40 + Math.floor(k / 3) * 84, 96 - (k % 2) * 18, k)),
    lines: [[T.rocks, 'stones!']],
  },
  greenland: {
    from: T.reindeer - 0.4, to: T.freezing - 0.2,
    items: [item(T.reindeer, drawAntlers, -10, -40, 190, 0.15), item(T.polarBear, drawJawbone, -40, 70, 110, -0.2), item(T.moose, drawHide, 70, 60, 100, 0.3)],
    lines: [[T.reindeer, 'a whole reindeer'], [T.polarBear, 'polar bear jaw'], [T.moose, 'moose hide']],
  },
};

/** A round cut-away into the belly at (x, y): its dark inside, the things in it popping in, and their names beside it. */
function drawBelly(ctx: CanvasRenderingContext2D, a: Animal, x: number, y: number, t: number): void {
  const b = BELLY[a];
  if (!b) return;
  const show = window01(t, b.from, b.to, 0.3);
  if (show <= 0) return;
  const r = 200 * (0.6 + 0.4 * show);
  ctx.save();
  ctx.globalAlpha = show;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#4a2f26');
  g.addColorStop(1, '#170c09');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (const it of b.items) {
    const u = (t - it.at) / 0.25;
    if (u <= 0) continue;
    const k = u >= 1 ? 1 : 0.3 + 0.7 * u + 0.3 * Math.sin(Math.PI * u);
    const bob = 4 * Math.sin(t * 2 + it.dx);
    it.draw(ctx, x + it.dx, y + it.dy + bob, it.size * k, it.angle + 0.05 * Math.sin(t + it.dy), t);
  }
  ctx.restore();
  ctx.lineWidth = 12;
  ctx.strokeStyle = PAPER;
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  b.lines.forEach(([at, text], i) => {
    const lx = x + r + 40 > W - 420 ? x - r - 220 : x + r + 190;
    drawPop(ctx, text, lx, y - 60 + i * 64, 54, t, at, b.to, PAPER_ON_INK, -0.03, 380);
  });
}

// ---------------------------------------------------------------- the stage

const atScreen = (cam: Camera, p: Pt): Pt => toScreen(cam, p);

/** The row of yous laid head to toe along the ruler: "it's N yous long". */
function drawYousRow(ctx: CanvasRenderingContext2D, cam: Camera, s: Stage, t: number): void {
  if (s.yous === null) return;
  const show = window01(t, s.yous, s.yous + 4.2, 0.3);
  if (show <= 0) return;
  const n = yousLong(s.animal);
  const h = YOU_FT * cam.ppf;
  const y = toScreen(cam, { x: 0, y: -0.15 * YOU_FT * 0.6 }).y - h * 0.12;
  const whole = Math.floor(n);
  for (let i = 0; i < Math.ceil(n); i++) {
    const pop = smooth((t - s.yous - i * 0.12) / 0.2);
    if (pop <= 0) continue;
    const x = toScreen(cam, { x: i * YOU_FT, y: 0 }).x;
    ctx.save();
    if (i >= whole) {
      // The part of a you left over, clipped.
      ctx.beginPath();
      ctx.rect(x - 4, 0, (n - whole) * h + 4, H);
      ctx.clip();
    }
    drawYouLying(ctx, x, y, h * pop, 1, t, { ghost: true, halo: 0, alpha: show });
    ctx.restore();
  }
  const label = n >= 10 ? `${Math.round(n)} yous long!` : `${(Math.round(n * 2) / 2).toString()} yous long!`;
  drawPop(ctx, label, W / 2 + 120, 450, 72, t, s.yous + 0.3, s.yous + 2.2, { fill: YELLOW, halo: '#140d02' }, -0.03);
}

/** Ice over the Arctic water: a thick ceiling across the top, white above and pale blue beneath, cracked. */
function drawIce(ctx: CanvasRenderingContext2D, t: number): void {
  const under = (x: number): number => 92 + 22 * Math.sin(x * 0.011) + 12 * Math.sin(x * 0.047 + 1) + 6 * Math.sin(x * 0.13);
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, 120);
  g.addColorStop(0, '#f4fafb');
  g.addColorStop(0.6, '#cfe6ec');
  g.addColorStop(1, '#8fbccb');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, under(x));
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 30) (x === 0 ? ctx.moveTo(x, under(x)) : ctx.lineTo(x, under(x)));
  ctx.stroke();
  // Cracks.
  ctx.strokeStyle = 'rgba(70,110,125,0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 210 + 40 * Math.sin(i * 3.3);
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x + 18 * Math.sin(i), 40);
    ctx.lineTo(x - 10, under(x) - 6);
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, W * 0.5, 60, 900, 'rgba(160,220,230,A)', 0.16 + 0.03 * Math.sin(t));
}

/** Draws one animal's stage at t (no cut-aways: render.ts decides when those take over). */
export function drawStage(ctx: CanvasRenderingContext2D, kit: StageKit, s: Stage, t: number): void {
  const a = s.animal;
  const sp = SPECIES[a];
  const cam = stageCamera(s, t);
  const pulled = smooth((t - s.pullFrom) / (s.pullTo - s.pullFrom));
  kit.sea.draw(ctx, LOOK_OF[a], t, cam.cx * 2, cam.ppf / 30);
  const mood = moodCamera(t);
  ctx.save();
  ctx.translate(W / 2 + mood.shakeX, H / 2 + mood.shakeY);
  ctx.scale(mood.zoom, mood.zoom);
  ctx.translate(-W / 2, -H / 2);

  const mid = bodyMiddle(a);
  const L = sp.feet;
  const snout = atScreen(cam, { x: 0, y: -mid });
  if (a === 'sperm') glow(ctx, snout.x + 0.3 * L * cam.ppf, snout.y, 0.8 * L * cam.ppf, 'rgba(120,150,190,A)', 0.35);
  if (a === 'whaleShark') {
    const busShow = window01(t, T.bus - 0.1, T.fiveFeet - 0.3, 0.4);
    const ground = atScreen(cam, { x: L * 0.5, y: 0 });
    drawBus(ctx, ground.x, ground.y - 6, 40 * cam.ppf, busShow * 0.9);
    drawPop(ctx, 'as long as a school bus · 40 ft', W / 2 - 100, 330, 64, t, T.bus, T.fiveFeet - 0.4, { fill: YELLOW, halo: '#140d02' }, -0.02, 1000);
  }

  // "You", to scale, on the ruler (shrugging at the end of the sperm whale's turn).
  const you = atScreen(cam, { x: YOU_X, y: 0 });
  const arms = a === 'sperm' && t > T.notSquid - 0.2 ? 'shrug' : 'down';
  drawYou(ctx, you.x, you.y, YOU_FT * cam.ppf, t, { arms, alpha: smooth((pulled - 0.45) / 0.5) });
  if (pulled > 0.5) drawPop(ctx, 'you', you.x, you.y - YOU_FT * cam.ppf - 26, 44, t, s.pullTo - 0.3, s.end, PAPER_ON_INK);

  // The animal, facing you; the sperm whale turns away after a squid at the end.
  const pose = poseAt(s, t);
  if (a === 'sperm' && t > T.notInterested + 0.3) {
    const go = t - T.notInterested - 0.3;
    const turn = smooth(go / 0.6);
    const centre = atScreen(cam, { x: L / 2 + go * go * 4, y: -mid });
    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.scale(Math.cos(Math.PI * turn) || 0.01, 1);
    ctx.translate(-centre.x, -centre.y);
    drawAnimal(ctx, a, { x: centre.x - (L * cam.ppf) / 2, y: centre.y }, L * cam.ppf, -1, t, { gape: 0.2 });
    ctx.restore();
    drawSquid(ctx, atScreen(cam, { x: L + 6 + go * go * 4 + go * 3, y: 0 }).x, atScreen(cam, { x: 0, y: -mid - 1 }).y, 15 * cam.ppf, Math.PI, t);
  } else if (a === 'croc' && pose.roll) {
    // The death roll: a dark blur spinning about its long axis, nothing in its jaws.
    ctx.save();
    ctx.filter = 'brightness(0.35) blur(1.5px)';
    for (const lag of [0.24, 0.12, 0]) {
      ctx.globalAlpha = lag === 0 ? 1 : 0.3;
      drawAnimal(ctx, a, snout, L * cam.ppf, -1, t, { ...pose, roll: (pose.roll ?? 0) - lag * 9 });
    }
    ctx.restore();
  } else {
    if (a === 'croc') drawSmallPrey(ctx, kit, cam, t);
    const swallowing = a === 'sperm' && t > T.swallowWhole - 0.2;
    if (swallowing) drawSpermSquid(ctx, cam, s, t);
    drawAnimal(ctx, a, snout, L * cam.ppf, -1, t, pose);
    if (a === 'sperm' && !swallowing) drawSpermSquid(ctx, cam, s, t);
  }

  // Beats on the stage.
  if (a === 'grouper') {
    const m = atScreen(cam, mouthOf(a));
    const lid = window01(t, T.trashLid, T.y2014 - 0.2, 0.25);
    drawLid(ctx, m.x - 0.3 * cam.ppf, m.y, 1.9 * cam.ppf, lid);
    drawPop(ctx, 'a trash can lid', m.x, m.y - 1.4 * cam.ppf, 54, t, T.trashLid, T.y2014 - 0.2, PAPER_ON_INK, -0.04, 520);
  }
  if (a === 'white') {
    const frame = window01(t, T.honestly - 0.1, T.whiteNo + 2, 0.2);
    const tear = smooth((t - T.jawsLied - 0.6) / 0.5);
    const box = { x: snout.x - 40, y: snout.y - L * cam.ppf * 0.22, w: L * cam.ppf + 80, h: L * cam.ppf * 0.44 };
    drawFilmFrame(ctx, box.x, box.y, box.w, box.h, frame, tear);
    drawPop(ctx, '#1 for fatal attacks', W / 2 - 300, 340, 60, t, T.fatal, T.seal - 1.3, { fill: YELLOW, halo: '#140d02' }, -0.03, 700);
    drawPop(ctx, "it doesn't do whole", W / 2 - 300, 340, 64, t, T.notWhole4, T.honestly - 0.1, PAPER_ON_INK, -0.03, 700);
    drawPop(ctx, 'JAWS LIED', snout.x + 0.5 * L * cam.ppf, box.y - 90, 72, t, T.jawsLied, T.whiteNo - 0.2, { fill: YELLOW, halo: '#140d02' }, -0.05, 600);
  }
  if (a === 'croc') {
    drawPop(ctx, "can't chew", W / 2 - 280, 330, 60, t, T.chew, T.rocks - 0.4, PAPER_ON_INK, -0.03);
    drawPop(ctx, 'swallows small prey whole', W / 2 - 280, 400, 52, t, T.smallPrey, T.rocks - 0.4, PAPER_ON_INK, -0.03, 700);
    drawPop(ctx, 'it rolls…', W / 2 - 280, 330, 64, t, T.rolls, T.crocNo - 0.6, PAPER_ON_INK, -0.03);
    drawPop(ctx, 'and tears it apart', W / 2 - 280, 404, 56, t, T.crocTears, T.crocNo - 0.6, PAPER_ON_INK, -0.03);
  }
  if (a === 'greenland') {
    drawPop(ctx, 'freezing water, far from people', W / 2 - 250, 330, 54, t, T.freezing, T.mostlyDead - 0.1, PAPER_ON_INK, -0.03, 820);
    drawPop(ctx, 'mostly eats things already dead', W / 2 - 250, 330, 54, t, T.mostlyDead, T.greenlandNo + 0.8, PAPER_ON_INK, -0.03, 820);
  }
  if (a === 'whaleShark') drawWhaleSharkBeats(ctx, cam, t);
  if (a === 'sperm') {
    drawPop(ctx, 'hunts giant squid in the dark', W / 2 - 200, 330, 54, t, T.squid, T.ninety - 0.2, PAPER_ON_INK, -0.03, 800);
    drawPop(ctx, '1 of ~90 kinds of whale', W / 2 - 200, 330, 60, t, T.ninety, T.onlyThroat + 0.4, { fill: YELLOW, halo: '#140d02' }, -0.03, 800);
    drawPop(ctx, "YOU'RE NOT SQUID", W / 2 + 330, 640, 100, t, T.notSquid, T.end, { fill: YELLOW, halo: '#140d02' }, -0.04, 900);
  }
  const belly = atScreen(cam, { x: L * 0.42, y: -mid });
  drawBelly(ctx, a, Math.min(W - 260, Math.max(260, belly.x)), Math.min(H - 300, Math.max(420, belly.y)), t);
  drawYousRow(ctx, cam, s, t);
  drawRuler(ctx, cam, s, t, pulled);
  ctx.restore();
  if (a === 'greenland') drawIce(ctx, t);
  drawNameCard(ctx, s, t);
}

/** The sperm whale's giant squid, under its head between the jaws, swallowed whole on "WHOLE!". */
function drawSpermSquid(ctx: CanvasRenderingContext2D, cam: Camera, s: Stage, t: number): void {
  const m = toScreen(cam, mouthOf('sperm'));
  const gone = smooth((t - T.swallowWhole + 0.5) / 0.6);
  const show = window01(t, s.close - 1, T.swallowWhole + 0.2, 0.4);
  const x = lerp(m.x - 4 * cam.ppf, m.x + 2 * cam.ppf, gone);
  const y = lerp(m.y + 1.5 * cam.ppf, m.y, gone) + 0.3 * cam.ppf * Math.sin(t * 1.3);
  drawSquid(ctx, x, y, 15 * cam.ppf * (1 - 0.5 * gone), -0.25 + 0.06 * Math.sin(t), t, show * (1 - gone));
}

/** The croc's small prey: a fish swims into its open jaws and is swallowed whole. */
function drawSmallPrey(ctx: CanvasRenderingContext2D, kit: StageKit, cam: Camera, t: number): void {
  const from = T.smallPrey - 0.6;
  const to = T.wholeCroc + 0.1;
  if (t < from || t > to) return;
  const m = toScreen(cam, mouthOf('croc'));
  const u = smooth((t - from) / (to - from));
  const x = lerp(m.x - 2.6 * cam.ppf, m.x + 0.6 * cam.ppf, u);
  const y = lerp(m.y - 2.2 * cam.ppf, m.y, u) + Math.sin(t * 4) * 6;
  drawSwimmer(ctx, kit.minnow, { j: 0, shape: 'perch', age: 0, x, y, length: 1.4 * cam.ppf * (1 - 0.4 * u), facing: 1, tilt: 0, beat: t * 12, effort: 0.8 }, boilOf(t));
}

/** The whale shark's mouth: a bracket "5 ft" across it, then "you" fitting inside its outline, and plankton streaming in. */
function drawWhaleSharkBeats(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const m = toScreen(cam, mouthOf('whaleShark'));
  const half = 2.5 * cam.ppf;
  const bracket = window01(t, T.fiveFeet - 0.1, T.itsThroat, 0.3);
  if (bracket > 0) {
    ctx.save();
    ctx.globalAlpha = bracket;
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(m.x - 60, m.y - half);
    ctx.lineTo(m.x - 90, m.y - half);
    ctx.lineTo(m.x - 90, m.y + half);
    ctx.lineTo(m.x - 60, m.y + half);
    ctx.stroke();
    ctx.restore();
    drawPop(ctx, 'a mouth almost 5 ft wide', W / 2 - 100, 330, 72, t, T.fiveFeet, T.fit - 0.1, { fill: YELLOW, halo: '#140d02' }, -0.02, 1000);
  }
  const fit = window01(t, T.fit - 0.1, T.itsThroat + 0.2, 0.3);
  if (fit > 0) {
    // A ghost of you standing in the mouth's opening, with room to spare.
    drawYou(ctx, m.x + 0.3 * cam.ppf, m.y + half * 0.95, 4.6 * cam.ppf, t, { ghost: true, halo: 0, alpha: fit });
    drawPop(ctx, "you'd fit, with room to spare", W / 2 - 100, 330, 72, t, T.fit, T.itsThroat, PAPER_ON_INK, -0.02, 1000);
  }
  const tiny = window01(t, T.tiny - 0.2, T.whaleSharkNo, 0.4);
  if (tiny > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(240,250,220,${(0.8 * tiny).toFixed(3)})`;
    for (let i = 0; i < 40; i++) {
      const u = (t * 0.5 + i / 40) % 1;
      const x = m.x - 6 * cam.ppf * (1 - u);
      const y = m.y + Math.sin(i * 2.3) * half * (1 - u);
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    drawPop(ctx, 'it eats tiny things', W / 2 - 300, 330, 64, t, T.tiny, T.spit - 0.1, PAPER_ON_INK, -0.03, 800);
    drawPop(ctx, 'it would spit you out', W / 2 - 300, 330, 64, t, T.spit, T.whaleSharkNo - 0.2, PAPER_ON_INK, -0.03, 800);
  }
}
