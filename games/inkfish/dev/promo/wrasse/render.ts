import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeMarks } from '../backdrop';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { drawExclaim } from '../effects';
import { clamp01, lerp, smooth, VIDEO, type Short } from '../short';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderWrasseAudio } from './audio';
import { drawCard, drawStamp, type CardState } from './card';
import { eyeOf, type Fish, makeCleaner, poseOf, throatOf } from './cleaner';
import {
  clipGlass, drawBubbles, drawMirrorBack, drawMirrorFront, drawPipette, drawPuff, makeStation, MARK_BROWN, RED,
} from './scene';
import {
  alarmAt, blindCrossAt, blindSightAt, boilAt, captionAt, cardAt, failAt, failJoltAt, glintAt, type Lens, lensAt, LOOP_S, markAt, markLabel,
  mirrorRingAt, mirrorSightAt, mostAt, nameLabel, pipetteAt, PUFF_S, PUFFS, puffAt, reflectionOf, ROWS, rowAt, rowRingAt, reflectionLabel, scientistsLabel,
  scrapeLabel, squeezeAt, stampAt, throatLabel, titleAt, wrasseAt,
} from './story';

/** Draws the "this fish passed a test your dog fails" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const SPOKEN: TextInk = { fill: '#1f66c8', halo: PAPER };

/** A fish turned by its `face` (squeezed edge-on through a turn). */
function drawFishAt(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, boil: number): void {
  if (Math.abs(f.face) < 0.01) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, poseOf(f), boil);
  ctx.restore();
}

/** The brown mark on a fish's throat, `m` 0 .. 1 (paler as it is scuffed). */
function drawMark(ctx: CanvasRenderingContext2D, f: Fish, m: number): void {
  if (m <= 0 || Math.abs(f.face) < 0.15) return;
  const p = throatOf(f);
  ctx.save();
  ctx.globalAlpha = clamp01(m * 1.4);
  ctx.translate(p.x, p.y);
  ctx.rotate(-f.tilt * Math.sign(f.face));
  ctx.scale(Math.abs(f.face) * (0.6 + 0.4 * clamp01(m * 3)), 0.6 + 0.4 * clamp01(m * 3));
  ctx.beginPath();
  ctx.ellipse(0, 0, f.len * 0.04, f.len * 0.026, 0, 0, Math.PI * 2);
  ctx.fillStyle = MARK_BROWN;
  ctx.globalAlpha *= 0.4 + 0.6 * m;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, f.len * 0.006);
  ctx.globalAlpha *= 0.6;
  ctx.stroke();
  ctx.restore();
}

/** A dashed ink line of sight from `a` to `b`, `u` 0 .. 1 of it drawn, with an arrowhead. */
function drawSight(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, u: number, alpha: number): void {
  if (u <= 0 || alpha <= 0) return;
  const tip = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 22 * Math.cos(ang + s * 0.5), tip.y - 22 * Math.sin(ang + s * 0.5));
  }
  ctx.stroke();
  ctx.restore();
}

/** A label in ink handwriting, with a leader line to what it names. */
function callout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size = 64): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
    ctx.lineTo(to.x - (dx / len) * 12, to.y - (dy / len) * 12);
    ctx.stroke();
    ctx.restore();
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha);
}

/** The magnifier: grown out of the throat to its place, showing the throat close up. */
function drawLens(ctx: CanvasRenderingContext2D, lens: Lens, spot: Pt, open: number, inside: () => void): void {
  if (open <= 0) return;
  const e = smooth(open);
  const c = { x: lerp(spot.x, lens.x, e), y: lerp(spot.y, lens.y, e) };
  const r = lerp(18, lens.r, e);
  const z = lerp(1, lens.zoom, e);
  ctx.save();
  ctx.globalAlpha = clamp01(open * 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.setLineDash([14, 10]);
  const d = Math.hypot(c.x - spot.x, c.y - spot.y) || 1;
  const px = -(c.y - spot.y) / d;
  const py = (c.x - spot.x) / d;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(spot.x + px * 22 * s, spot.y + py * 22 * s);
    ctx.lineTo(c.x + px * r * s, c.y + py * r * s);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(c.x, c.y);
  ctx.scale(z, z);
  ctx.translate(-spot.x, -spot.y);
  inside();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
}

/** The spoken line, word by word, the word being said in blue. */
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

const cardStateAt = (t: number): CardState => ({
  show: cardAt(t),
  title: titleAt(t),
  most: mostAt(t),
  fail: failAt(t),
  rows: Object.fromEntries(ROWS.map((id) => [id, { shown: rowAt(id, t), stamp: stampAt(id, t), ring: rowRingAt(id, t) }])) as CardState['rows'],
  jolt: failJoltAt(t),
});

export function createWrasse(ctx: CanvasRenderingContext2D): Short {
  const station = makeStation();
  const marks = makeMarks(24, 57);
  const wrasse = makeCleaner(4);
  const mini = makeCleaner(2);

  /** Everything in the water (what a lens magnifies too): the reef, the mirror and reflection, the wrasse, sand, pipette. */
  const drawWorld = (t: number, boil: number, f: Fish, image: Fish, mark: number, tip: Pt, puffs = true): void => {
    ctx.drawImage(station, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    drawBubbles(ctx, t);
    drawMirrorBack(ctx);
    ctx.save();
    clipGlass(ctx);
    drawFishAt(ctx, wrasse, image, boil);
    drawMark(ctx, image, mark);
    ctx.restore();
    drawMirrorFront(ctx, glintAt(t));
    drawFishAt(ctx, wrasse, f, boil);
    drawMark(ctx, f, mark);
    PUFFS.forEach((_, i) => {
      const u = puffAt(i, t);
      if (puffs && u >= 0 && u <= 1) drawPuff(ctx, throatOf(wrasseAt(t - u * PUFF_S)), u, i);
    });
    drawPipette(ctx, tip, pipetteAt(t), squeezeAt(t));
  };

  /** A red ring round the reflection's spot as the wrasse sees it, `width` scaled for the lens. */
  const drawSpotRing = (at: Pt, t: number, alpha: number, width: number): void => {
    if (alpha <= 0) return;
    const ring = clamp01(mirrorRingAt(t));
    ctx.save();
    ctx.strokeStyle = RED;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 24 + 14 * Math.sin(Math.PI * ring), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const f = wrasseAt(t);
    const image = reflectionOf(f);
    const mark = markAt(t);
    const throat = throatOf(f);
    const target = throatOf(image);
    const tip = { x: throat.x - 4, y: throat.y + 8 };
    drawWorld(t, boil, f, image, mark, tip);

    // What it can and can't see.
    const blind = blindSightAt(t);
    if (blind > 0) {
      const eye = eyeOf(f);
      drawSight(ctx, eye, { x: eye.x + Math.sign(f.face) * 260, y: eye.y - 10 }, smooth(blind * 1.5), blind);
    }
    drawStamp(ctx, 'cross', throat.x - 46, throat.y + 34, 48, blindCrossAt(t), 0.1);
    const sight = mirrorSightAt(t);
    if (sight > 0) drawSight(ctx, eyeOf(f), target, smooth(sight * 1.6), sight);
    drawSpotRing(target, t, sight, 6);

    const lens = lensAt(t);
    if (lens) {
      const spot = lens.lens.id === 'mirror' ? target : throat;
      drawLens(ctx, lens.lens, spot, lens.open, () => {
        drawWorld(t, boil, f, image, mark, tip, false);
        if (lens.lens.id === 'mirror') drawSpotRing(target, t, sight, 3);
      });
      const L = lens.lens;
      callout(ctx, 'brown mark', { x: 250, y: 730 }, { x: L.x - 14, y: L.y + 6 }, L.id === 'throat' ? markLabel(t) * lens.open : 0, 72);
      callout(ctx, 'throat', { x: 930, y: 660 }, { x: L.x + 22, y: L.y + 12 }, L.id === 'throat' ? throatLabel(t) * lens.open : 0, 64);
      callout(ctx, 'its reflection', { x: L.x, y: 300 }, null, L.id === 'mirror' ? reflectionLabel(t) * lens.open : 0, 72);
    }

    const pop = alarmAt(t);
    if (pop > 0) drawExclaim(ctx, f.x - Math.sign(f.face) * f.len * 0.25, f.y - 100, 100 * pop, -0.12);

    callout(ctx, 'scientists in Japan', { x: 440, y: 1010 }, null, scientistsLabel(t), 60);
    callout(ctx, 'cleaner wrasse', { x: 420, y: 1012 }, null, nameLabel(t), 64);
    const scrape = scrapeLabel(t);
    if (scrape > 0) drawTextLine(ctx, 'scrape!', 300 + 6 * Math.sin(t * 25), 930, 72, 700, scrape);

    drawCard(ctx, cardStateAt(t), (x, y) => drawFishAt(ctx, mini, { x, y, len: 130, face: 1, tilt: 0, beat: (2 * Math.PI * 30 * t) / LOOP_S, effort: 0.3 }, boil));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderWrasseAudio };
}
