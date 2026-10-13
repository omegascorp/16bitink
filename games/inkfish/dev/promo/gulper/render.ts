import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine, type TextInk } from '../captions';
import type { Pose } from '../chain';
import { VIDEO, type Short } from '../short';
import { makeSprite, SPRITE_RES } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderGulperAudio } from './audio';
import { GULPER_BARE, HALF, HINGE, mouthGeom, type MouthGeom, type Pt, SNOUT, THROAT } from './mouth';
import { drawJaw, drawPouch } from './pouch';
import {
  CHALK, drawCallout, drawDashed, drawFlow, drawQuestion, drawShrimp, drawSnap, drawSnow, drawTailLight, drawVignette, fontOf, INK_BG, makeShrimpSprite, makeWater,
  PAPER_ON_INK, type ShrimpSprite, SPOKEN,
} from './scenery';
import {
  bodyRing, boilAt, type Camera, cameraAt, captionAt, type Eel, eelAt, EEL_LEN, FOOD, foodAt, gillAt, gillLabel, jetsAt, LOOP_S, metresAt, mouthAt, mouthRing,
  onEel, questionAt, readoutAt, shakeAt, type Shrimp, sinkAt, snapAt, snowScroll, suctionAt, tailGlowAt, tailLabel, tailTipAt, tinyAt, tinyLabel, toScreen, UNIT, whipAt,
} from './story';

/** Draws the "its mouth is bigger than its body" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const TOP_Y = 372;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = fontOf(CAPTION_SIZE);
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** The eel's pose for the swimmer, on screen. */
function poseOf(e: Eel, cam: Camera): Pose {
  const c = toScreen(cam, e);
  return { j: 0, shape: 'gulper', age: 0, x: c.x, y: c.y, length: EEL_LEN * cam.zoom, facing: 1, tilt: e.tilt, beat: e.beat, effort: e.effort };
}

/** A point on the eel (snout-relative texture px) on screen. */
const eelPoint = (e: Eel, cam: Camera, p: Pt): Pt => toScreen(cam, onEel(e, p));

/** Runs `draw` in the mouth's frame: snout-relative texture px. */
function inMouthFrame(ctx: CanvasRenderingContext2D, e: Eel, cam: Camera, draw: () => void): void {
  const c = toScreen(cam, e);
  const k = UNIT * cam.zoom;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(-e.tilt);
  ctx.scale(k, k);
  ctx.translate(HALF, 1);
  draw();
  ctx.restore();
}

/** The direction the open mouth faces, on screen (radians): out through the opening, away from the hinge. */
function openingFacing(g: MouthGeom, e: Eel): number {
  const dx = g.tip.x - SNOUT.x;
  const dy = g.tip.y - SNOUT.y;
  let n = { x: dy, y: -dx };
  if (n.x * (HINGE.x - SNOUT.x) + n.y * (HINGE.y - SNOUT.y) > 0) n = { x: -n.x, y: -n.y };
  return Math.atan2(n.y, n.x) - e.tilt;
}

function drawOneShrimp(ctx: CanvasRenderingContext2D, sprite: ShrimpSprite, s: Shrimp, cam: Camera, boil: number): void {
  drawShrimp(ctx, sprite, s, toScreen(cam, s), cam.zoom, boil);
}

/** The ring round the mouth (pouch and gape) and the one round the thin body, with their notes. */
function drawRings(ctx: CanvasRenderingContext2D, t: number, e: Eel, cam: Camera, g: MouthGeom): void {
  const mouth = mouthRing(t);
  if (mouth.drawn > 0 && mouth.alpha > 0) {
    // Hugging the mouth: across the opening, round the pouch, back along the head to the snout.
    const back = Array.from({ length: 8 }, (_, i) => ({ x: THROAT.x + ((SNOUT.x - THROAT.x) * i) / 7, y: THROAT.y + ((SNOUT.y - THROAT.y) * i) / 7 }));
    const pts = [...g.opening, ...g.pouch, ...back].map((p) => eelPoint(e, cam, p));
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const ring = pts.map((p) => {
      const d = Math.hypot(p.x - cx, p.y - cy) || 1;
      return { x: p.x + ((p.x - cx) / d) * 24, y: p.y + ((p.y - cy) / d) * 24 };
    });
    drawDashed(ctx, ring, mouth.drawn, mouth.alpha, SPOKEN);
    const right = Math.max(...ring.map((p) => p.x));
    const bottom = Math.max(...ring.map((p) => p.y));
    drawTextLine(ctx, 'mouth', Math.min(VIDEO.width - 150, right + 20), Math.min(1080, bottom - 30), 104, 700, mouth.alpha * Math.min(1, mouth.drawn * 2), { fill: SPOKEN, halo: INK_BG });
  }
  const body = bodyRing(t);
  if (body.drawn > 0 && body.alpha > 0) {
    // A capsule round the body from behind the head to the tail tip.
    const [x0, x1, h] = [-52, -214, 21];
    const side = (y: number, from: number, to: number): Pt[] => Array.from({ length: 24 }, (_, i) => ({ x: from + ((to - from) * i) / 23, y }));
    // Half circles: round the tail end from top to bottom, round the head end from bottom to top.
    const cap = (x: number, from: number): Pt[] => Array.from({ length: 11 }, (_, i) => {
      const a = from - (Math.PI * i) / 10;
      return { x: x + Math.cos(a) * h, y: Math.sin(a) * h };
    });
    const pts = [...side(-h, x0, x1), ...cap(x1, -Math.PI / 2).slice(1, -1), ...side(h, x1, x0), ...cap(x0, Math.PI / 2).slice(1, -1)].map((p) => eelPoint(e, cam, p));
    drawDashed(ctx, pts, body.drawn, body.alpha, CHALK);
    const at = eelPoint(e, cam, { x: -112, y: -40 });
    drawTextLine(ctx, 'body', at.x, at.y, 70, 700, body.alpha * Math.min(1, body.drawn * 2), PAPER_ON_INK);
  }
}

/** Depth, counting as we sink. */
function drawReadout(ctx: CanvasRenderingContext2D, t: number): void {
  const show = readoutAt(t);
  if (show <= 0) return;
  const metres = Math.round(metresAt(t) / 10) * 10;
  drawTextLine(ctx, `${metres.toLocaleString('en-US')} m`, VIDEO.width / 2, TOP_Y + 8, 124, 700, show, PAPER_ON_INK);
  drawTextLine(ctx, 'down', VIDEO.width / 2, TOP_Y + 80, 60, 700, 0.8 * show, { fill: CHALK, halo: INK_BG });
}

export function createGulper(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const eel = makeSprite('gulper', SPRITE_RES, 'light', GULPER_BARE);
  const shrimp = makeShrimpSprite(3);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.drawImage(water, 0, 0);
    drawSnow(ctx, t / LOOP_S, snowScroll(t), sinkAt(t));

    const cam = cameraAt(t);
    const e = eelAt(t);
    const m = mouthAt(t);
    const g = mouthGeom(m.jaw, m.fill);
    const jolt = shakeAt(t);
    const food = FOOD.map((_, i) => foodAt(i, t));
    const tiny = tinyAt(t);
    const all = [...food, tiny].filter((s): s is Shrimp => s !== null);

    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    // Behind the body: the pouch, what's in it, the gape.
    inMouthFrame(ctx, e, cam, () =>
      drawPouch(ctx, g, m.fill, m.jaw, boil, () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, jolt.x, jolt.y);
        for (const s of all) if (s.inside) drawOneShrimp(ctx, shrimp, s, cam, boil);
        ctx.restore();
      }),
    );
    drawSwimmer(ctx, eel, poseOf(e, cam), boil);
    inMouthFrame(ctx, e, cam, () => drawJaw(ctx, g, m.fill, m.jaw, boil));
    // The whip of a tail is ink on ink: a faint chalk line so it shows.
    const whip = whipAt(t).map((p) => toScreen(cam, p));
    ctx.save();
    ctx.strokeStyle = CHALK;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2.2 * cam.zoom;
    ctx.lineCap = 'round';
    ctx.beginPath();
    whip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    const tip = toScreen(cam, tailTipAt(t));
    drawTailLight(ctx, tip, 9 * cam.zoom, tailGlowAt(t));

    for (const s of all) if (!s.inside) drawOneShrimp(ctx, shrimp, s, cam, boil);

    const gate = eelPoint(e, cam, g.gate);
    drawFlow(ctx, gate, openingFacing(g, e), 0.85, 430 * cam.zoom, suctionAt(t), t, true);
    drawFlow(ctx, toScreen(cam, gillAt(t)), Math.atan2(0.75, -0.65) - e.tilt, 0.35, 330 * cam.zoom, jetsAt(t), t, false);
    drawSnap(ctx, eelPoint(e, cam, { x: 4, y: 4 }), 120 * cam.zoom, snapAt(t));
    ctx.restore();

    drawVignette(ctx);
    drawRings(ctx, t, e, cam, g);
    drawReadout(ctx, t);
    const tailNote = tailLabel(t);
    if (tailNote > 0) drawCallout(ctx, 'glowing tail', { x: tip.x + 150, y: tip.y + 190 }, tip, tailNote, 62);
    const gills = gillLabel(t);
    if (gills > 0) {
      const gill = toScreen(cam, gillAt(t));
      drawCallout(ctx, 'gills', { x: gill.x - 170, y: gill.y - 150 }, gill, gills, 72);
    }
    const tinyNote = tinyLabel(t);
    if (tiny && tinyNote > 0) {
      const at = toScreen(cam, tiny);
      const r = tiny.len * cam.zoom * 0.95;
      ctx.save();
      ctx.globalAlpha = tinyNote * Math.min(1, tiny.alpha * 1.5);
      ctx.strokeStyle = SPOKEN;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawCallout(ctx, 'tiny shrimp', { x: at.x + 250, y: at.y + r + 120 }, { x: at.x + r * 0.7, y: at.y + r * 0.7 }, tinyNote * Math.min(1, tiny.alpha * 1.5), 72);
    }
    const q = questionAt(t);
    if (q > 0) drawQuestion(ctx, eelPoint(e, cam, { x: 30, y: -22 }), 230, q);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGulperAudio };
}
