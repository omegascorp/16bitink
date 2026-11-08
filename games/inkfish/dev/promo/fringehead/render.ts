import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderFringeheadAudio } from './audio';
import { drawBreath, drawDiver, type DiverPose, finTip } from './diver';
import {
  drawBoing, drawBubbleBurst, drawBurst, drawDash, drawDashed, drawGlint, drawMark, drawPuffs, drawSmug, drawTicks, drawTrace,
} from './effects';
import { drawFringehead, type FishPose, type FringeheadSprite, gapeOf, HEAD_END, headOutline, makeFringeheadSprite, rimOf, toScreenOf } from './fringehead';
import { drawDesk, drawPerson, mouthFront, personToScreen, type PersonPose } from './people';
import { drawProp, makeBottle, makeCan, type PropArt } from './props';
import { CAPTION, captionAt, NAME_LABEL, QUESTION } from './script';
import {
  BOTTLE_WATER, CHALK, CLASH_WATER, clipOutsideShell, drawRays, drawRedEdge, drawShellPart, drawSpecks, drawTint, drawVignette, DUEL_WATER, enterView, INK_BG,
  makeShell, makeWater, PAPER_ON_INK, type ShellArt, SOLO_WATER, SPOKEN,
} from './scene';
import {
  BIGGER_AT, boilAt, CLASH_FOCUS_Y, CLASH_SCREEN_Y, clashZoomAt, bottleAt, CAN_MOUTH, clashAt, clashHitAge, DART_AT, duelAt, flashAt, gagAt, LOOP_S, RECOIL_AT, sceneAt, shakeAt, SLAM_HIT, soloAt, wrap,
} from './story';

/** Draws "these fish fight by comparing mouth size" (story.ts has the choreography). */

const CAPTION_MAX_W = 980;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION.size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION.y, CAPTION.size * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

interface Art {
  readonly fish: FringeheadSprite;
  readonly clash: HTMLCanvasElement;
  readonly solo: HTMLCanvasElement;
  readonly duel: HTMLCanvasElement;
  readonly bottleWater: HTMLCanvasElement;
  readonly paper: HTMLCanvasElement;
  readonly shell: ShellArt;
  readonly bottle: PropArt;
  readonly can: PropArt;
}

function drawClash(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  ctx.drawImage(art.clash, 0, 0);
  drawRays(ctx, CLASH_WATER.ray, t);
  drawSpecks(ctx, t);
  const c = clashAt(t);
  // Close in on the meeting point, a little above the middle of the frame.
  const z = clashZoomAt(t);
  ctx.save();
  ctx.translate(VIDEO.width / 2, CLASH_SCREEN_Y);
  ctx.scale(z, z);
  ctx.translate(-VIDEO.width / 2, -CLASH_FOCUS_Y);
  drawFringehead(ctx, art.fish, c.a, boil);
  drawFringehead(ctx, art.fish, c.b, boil);
  const age = clashHitAge(t);
  if (age !== null) drawBurst(ctx, { x: c.seam, y: rimOf(c.a).centre.y }, 470, age, 0.4);
  ctx.restore();
  drawVignette(ctx, 0.65);
}

function drawSolo(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  ctx.drawImage(art.solo, 0, 0);
  drawRays(ctx, SOLO_WATER.ray, t);
  drawSpecks(ctx, t, '#d6e2f0');
  const s = soloAt(t);
  ctx.save();
  enterView(ctx, s.view);
  drawFringehead(ctx, art.fish, s.fish, boil);
  // The folded jaw traced from the snout back past the head, ticks at the head's end and the jaw's end.
  const folded = gapeOf(0, 0, 0).upper.map((q) => toScreenOf(s.fish, q)).reverse();
  drawTrace(ctx, folded, s.trace * 1.15, 9);
  const k = s.fish.len / 200;
  drawTicks(ctx, [{ at: toScreenOf(s.fish, { x: HEAD_END, y: 2 }), h: 70 * k / 3.5 }, { at: folded[folded.length - 1]!, h: 70 * k / 3.5 }], s.trace);
  // The head's outline, faint, over the flared gape.
  drawDashed(ctx, headOutline().map((q) => toScreenOf(s.fish, q)), s.outline, CHALK, 6, true);
  if (s.outline > 0) {
    const r = rimOf(s.fish);
    drawDashed(ctx, [r.top, { x: r.top.x, y: r.bottom.y }], s.outline, SPOKEN, 5);
  }
  ctx.restore();
  drawVignette(ctx, 0.55);
  drawTextLine(ctx, NAME_LABEL.text, VIDEO.width / 2, NAME_LABEL.y, NAME_LABEL.size, 700, s.label, PAPER_ON_INK);
}

function drawDuel(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const u = wrap(t);
  ctx.drawImage(art.duel, 0, 0);
  const d = duelAt(t);
  drawRays(ctx, DUEL_WATER.ray, t, 1200);
  drawSpecks(ctx, t);
  ctx.save();
  enterView(ctx, d.view);
  drawShellPart(ctx, art.shell.back, boil);
  drawShellPart(ctx, art.shell.front, boil);
  drawFringehead(ctx, art.fish, d.a, boil);
  ctx.save();
  clipOutsideShell(ctx);
  drawFringehead(ctx, art.fish, d.b, boil);
  ctx.restore();
  drawBurst(ctx, { x: d.seam ?? 600, y: rimOf(d.a).centre.y }, 560, u - SLAM_HIT, 0.5);
  drawPuffs(ctx, toScreenOf(d.b, { x: 4, y: 0 }), -1, u - BIGGER_AT);
  drawSmug(ctx, toScreenOf(d.a, { x: -10, y: -20 }), 150, d.warm, u);
  ctx.restore();
  drawRedEdge(ctx, d.tension);
  drawTint(ctx, '#ffb24a', 0.16 * d.warm, 'soft-light');
  drawTint(ctx, '#ffd890', 0.08 * d.warm);
  drawVignette(ctx, 0.55);
  drawTint(ctx, '#fff6e0', flashAt(t));
}

const GAG_LEFT = { x: 272, y: 930 };
const GAG_RIGHT = { x: 808, y: 930 };
const GAG_SCALE = 1.08;

function drawGag(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const u = wrap(t);
  ctx.drawImage(art.paper, 0, 0);
  const wash = ctx.createRadialGradient(540, 760, 100, 540, 800, 1100);
  wash.addColorStop(0, 'rgba(255,236,190,0.35)');
  wash.addColorStop(1, 'rgba(120,90,60,0.35)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const g = gagAt(t);
  const left: PersonPose = { ...GAG_LEFT, dir: 1, scale: GAG_SCALE, jaw: g.jaw, lean: g.lean, outfit: 'tie' };
  const right: PersonPose = { ...GAG_RIGHT, dir: -1, scale: GAG_SCALE, jaw: g.jaw, lean: g.lean, outfit: 'badge' };
  drawPerson(ctx, left, boil, 11);
  drawPerson(ctx, right, boil, 23);
  drawDesk(ctx, 1030, boil, u);
  drawMark(ctx, '?', { x: GAG_LEFT.x + 10, y: QUESTION.y }, QUESTION.size, g.ask);
  const meet = personToScreen(left, mouthFront(g.jaw));
  const meetR = personToScreen(right, mouthFront(g.jaw));
  drawBoing(ctx, { x: (meet.x + meetR.x) / 2, y: (meet.y + meetR.y) / 2 }, g.bonk);
}

function drawBottleScene(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const u = wrap(t);
  ctx.drawImage(art.bottleWater, 0, 0);
  drawRays(ctx, BOTTLE_WATER.ray, t, 1300);
  drawSpecks(ctx, t, '#f0fff4');
  const b = bottleAt(t);
  ctx.save();
  enterView(ctx, b.view);
  const diver: DiverPose = {
    x: 930 + 40 * b.recoil,
    y: 380 - 900 * (1 - b.diverIn) - 130 * b.recoil,
    lean: 0.14 - 0.22 * b.recoil,
    kick: u * (5 + 9 * b.recoil),
    kickSize: 0.12 + 0.15 * b.recoil,
    splay: b.recoil * (1 - 0.5 * b.recoil),
  };
  if (b.diverIn > 0) {
    drawBreath(ctx, diver.x + 40, diver.y - 380, u, b.recoil);
    drawDiver(ctx, diver, boil);
  }
  // The can and its tenant.
  drawProp(ctx, art.can.back, boil);
  if (b.canPeek > 0) {
    const peeker: FishPose = { x: CAN_MOUTH.x + 26 - 50 * b.canPeek, y: CAN_MOUTH.y + 6, len: 145, dir: -1, tilt: 0, jaw: 0, press: 0, puff: 0, mood: 'calm', beat: u * 6, wag: 1 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(-100, -100, CAN_MOUTH.x + 100, VIDEO.height + 200);
    ctx.ellipse(CAN_MOUTH.x, CAN_MOUTH.y, 15, 44, 0, 0, Math.PI * 2);
    ctx.clip();
    drawFringehead(ctx, art.fish, peeker, boil);
    ctx.restore();
  }
  drawProp(ctx, art.can.front, boil);
  // The bottle and the fish in it.
  drawProp(ctx, art.bottle.back, boil);
  const dart = u >= DART_AT - 0.05 && u < DART_AT + 0.3;
  if (dart) drawDash(ctx, toScreenOf(b.fish, { x: -260, y: 0 }), toScreenOf(b.fish, { x: -90, y: 0 }), 1 - (u - DART_AT + 0.05) / 0.35);
  drawFringehead(ctx, art.fish, b.fish, boil);
  drawProp(ctx, art.bottle.front, boil);
  drawGlint(ctx, { x: 430, y: 900 }, b.glint, u);
  if (b.diverIn > 0) drawBubbleBurst(ctx, finTip(diver), 160, u - RECOIL_AT);
  ctx.restore();
  drawVignette(ctx, 0.35);
}

export function createFringehead(ctx: CanvasRenderingContext2D): Short {
  const art: Art = {
    fish: makeFringeheadSprite(),
    clash: makeWater(CLASH_WATER, 3),
    solo: makeWater(SOLO_WATER, 5),
    duel: makeWater(DUEL_WATER, 7),
    bottleWater: makeWater(BOTTLE_WATER, 9),
    paper: makePaper(),
    shell: makeShell(),
    bottle: makeBottle(),
    can: makeCan(),
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const jolt = shakeAt(t);
    const scene = sceneAt(t);
    ctx.save();
    ctx.fillStyle = scene === 'gag' ? '#d9ccae' : scene === 'bottle' ? '#2c6a6c' : INK_BG;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.translate(jolt.x, jolt.y);
    if (scene === 'clash') drawClash(ctx, art, t, boil);
    else if (scene === 'solo') drawSolo(ctx, art, t, boil);
    else if (scene === 'duel') drawDuel(ctx, art, t, boil);
    else if (scene === 'gag') drawGag(ctx, art, t, boil);
    else drawBottleScene(ctx, art, t, boil);
    ctx.restore();
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderFringeheadAudio };
}
