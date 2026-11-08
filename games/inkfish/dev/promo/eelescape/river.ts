import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { ramp } from '../short';
import { drawEel } from './eelArt';
import { alongTrack, smoothCurve } from './geom';
import { BEHIND_GILL, CHIN, EEL_HALF, EEL_LEN, EXIT, GILL_SLIT, SNOUT, SWALLOW, swung } from './shape';
import { drawBodySprite, drawEye, drawGillGap, drawJawSprite, drawMouthInside, jawSwing, type SleeperSprites } from './sleeperArt';
import {
  CAM_AT, type Cam, cycles, eelHeadOf, escapeAt, excitedAt, faceAt, flashAt, gulpAt, jawOf, riverCamAt, shakeAt, shockAt, triumphAt, wrap,
} from './story';
import { drawRays, drawSpecks, drawVignette, drawWater, glow, type Rgb, wash } from './water';

/**
 * The river close-up (frame 1, "ESCAPED!", the squeeze out of the gills,
 * and the end): murky green-brown water over a bed of pebbles, the dark
 * sleeper's head filling the frame, and the eel: first whipping out of the
 * open mouth as the jaws close on it, later wriggling out of the gill slit.
 */

const TOP: Rgb = [60, 68, 40];
const MID: Rgb = [30, 36, 21];
const BOTTOM: Rgb = [12, 13, 8];

const BED = { x0: -500, y0: 1180, w: 2700, h: 1200 } as const;
const PEBBLE_COLOURS = ['#5d5446', '#6e6450', '#4a4438', '#7a6e58', '#3d3a30', '#66604e'] as const;

/** The river bed: rounded pebbles over dark silt, smaller and hazier further back. Baked per boil frame. */
export function makeBed(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(BED.w, BED.h);
    ctx.translate(-BED.x0, -BED.y0);
    const g = ctx.createLinearGradient(0, BED.y0, 0, BED.y0 + BED.h);
    g.addColorStop(0, 'rgba(38,40,24,0)');
    g.addColorStop(0.06, 'rgba(38,40,24,0.85)');
    g.addColorStop(1, 'rgba(26,24,16,1)');
    ctx.fillStyle = g;
    ctx.fillRect(BED.x0, BED.y0, BED.w, BED.h);
    const pen = new Pen(ctx, 8800 + f * 977, 1.1);
    const rng = createRng(31);
    const stones: { x: number; y: number; r: number; c: string; k: number }[] = [];
    for (let i = 0; i < 420; i++) {
      const y = BED.y0 + 50 + rng() ** 0.8 * (BED.h - 60);
      const near = (y - BED.y0) / BED.h;
      stones.push({ x: BED.x0 + rng() * BED.w, y, r: 18 + near * 70 + rng() * 30, c: PEBBLE_COLOURS[Math.floor(rng() * PEBBLE_COLOURS.length)]!, k: 0.5 + rng() * 0.3 });
    }
    stones.sort((a, b) => a.y - b.y);
    for (const s of stones) {
      const pts: Pt[] = smoothCurve(
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          const w = 1 + (Math.sin(a * 2 + s.x) * 0.08);
          return { x: s.x + Math.cos(a) * s.r * w, y: s.y + Math.sin(a) * s.r * s.k * w };
        }),
        3,
        true,
      );
      const haze = Math.max(0, 1 - (s.y - BED.y0) / 420);
      pen.fill(pts.map((p) => ({ x: p.x + s.r * 0.12, y: p.y + s.r * 0.18 })), '#0c0b07', 0.5);
      pen.fill(pts, s.c, 0.95);
      pen.clipped(pts, () => {
        pen.fill(pts.map((p) => ({ x: p.x - s.r * 0.25, y: p.y - s.r * 0.3 * s.k })), '#e8dcb8', 0.16);
        pen.fill(pts.map((p) => ({ x: p.x + s.r * 0.35, y: p.y + s.r * 0.4 * s.k })), '#15130c', 0.4);
        if (s.r > 40) pen.hatch(pts, 7, 0.9, 0.9, { color: '#15130c', alpha: 0.18, onlyBelow: s.y + s.r * 0.1 });
      });
      pen.stroke([...pts, pts[0]!], 1.2 + s.r * 0.02, INK, 0.75, false);
      if (haze > 0) pen.fill(pts, 'rgb(46,52,31)', 0.65 * haze);
    }
    return canvas;
  });
}

export interface RiverArt {
  readonly fish: SleeperSprites;
  readonly bed: readonly HTMLCanvasElement[];
}

export const toRiverScreen = (p: Pt, cam: Cam): Pt => ({ x: CAM_AT.x + (p.x - cam.x) * cam.zoom, y: CAM_AT.y + (p.y - cam.y) * cam.zoom });

/** The eel's sideways wriggle on its way in: big at the tail outside the mouth, small between the lips, none inside. */
const wriggleIn = (t: number) => (s: number): number => {
  const amp = s < 0 ? 62 * Math.min(1, -s / 260) : s < 230 ? 5 * (1 - s / 230) : 0;
  return amp * Math.sin(s / 105 + cycles(36, t));
};
/** On its way out of the gill, tail first: the wave runs from tail to head. */
const wriggleOut = (t: number) => (s: number): number => 28 * Math.min(1, Math.max(0, s) / 160) * Math.sin(s / 80 + cycles(40, t));

/** The swallowed eel's centre line at gulp g, head to tail. */
export const swallowSpine = (g: number, t: number): Pt[] => {
  const head = eelHeadOf(g);
  return alongTrack(SWALLOW, head, head - EEL_LEN, 60, wriggleIn(t));
};
/** The escaping eel's centre line, head to tail, its tail `tail` px out of the gill slit. */
export const exitSpine = (tail: number, t: number): Pt[] => alongTrack(EXIT, tail - EEL_LEN, tail, 60, wriggleOut(t));

function drawFish(ctx: CanvasRenderingContext2D, art: RiverArt, t: number, boil: number): void {
  const u = wrap(t);
  const g = gulpAt(u);
  const open = jawOf(g);
  const swing = (p: Pt): Pt => swung(p, open);
  const pen = new Pen(ctx, 5000 + boil * 977, 1.1);
  const eelSeed = 6100 + boil * 131;
  drawMouthInside(ctx, pen, swing, open);
  const swallowed = g < 1 ? swallowSpine(g, t) : null;
  if (swallowed) drawEel(ctx, swallowed, EEL_HALF, eelSeed);
  drawBodySprite(ctx, art.fish, boil);
  const face = faceAt(u);
  drawEye(pen, face.pupil, face.look, face.sly);
  const tail = escapeAt(u);
  if (tail > -15) {
    const lift = Math.min(1, (tail + 15) / 60) * (1 - ramp(tail, EEL_LEN, EEL_LEN + 200));
    ctx.save();
    ctx.beginPath();
    BEHIND_GILL.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    drawGillGap(pen, lift);
    drawEel(ctx, exitSpine(tail, t), EEL_HALF, eelSeed);
    ctx.restore();
  }
  ctx.save();
  jawSwing(ctx, open);
  drawJawSprite(ctx, art.fish, boil);
  ctx.restore();
  if (swallowed) {
    // The part of the eel outside the mouth is in front of the lips.
    const chin = swing(CHIN);
    ctx.save();
    ctx.beginPath();
    for (const p of [{ x: SNOUT.x, y: -3000 }, SNOUT, chin, { x: chin.x, y: 5000 }, { x: -5000, y: 5000 }, { x: -5000, y: -3000 }]) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.clip();
    drawEel(ctx, swallowed, EEL_HALF, eelSeed);
    ctx.restore();
  }
}

export function drawRiver(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, art: RiverArt, t: number, boil: number): void {
  const u = wrap(t);
  drawWater(ctx, sheet, TOP, MID, BOTTOM);
  drawRays(ctx, t, 0.75);
  const cam = riverCamAt(u);
  const jolt = shakeAt(u);
  ctx.save();
  ctx.translate(CAM_AT.x + jolt.x, CAM_AT.y + jolt.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  ctx.drawImage(art.bed[boil % art.bed.length]!, BED.x0, BED.y0);
  // The fish's shadow on the bed.
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#060503';
  ctx.beginPath();
  ctx.ellipse(950, 1268, 700, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawFish(ctx, art, t, boil);
  ctx.restore();
  drawSpecks(ctx, t, '#e2dcb4', 1, { x: (cam.x - CAM_AT.x) * cam.zoom, y: (cam.y - CAM_AT.y) * cam.zoom });
  // The moods.
  const shock = shockAt(u);
  wash(ctx, 'multiply', '#6a3a28', 0.45 * shock);
  const tri = triumphAt(u);
  wash(ctx, 'soft-light', '#ffc44a', 0.55 * tri);
  const ex = excitedAt(u);
  wash(ctx, 'soft-light', '#ffe08a', 0.45 * ex);
  wash(ctx, 'screen', '#2d4a30', 0.25 * ex);
  const gill = toRiverScreen(GILL_SLIT, cam);
  const flash = flashAt(u);
  glow(ctx, gill.x + jolt.x, gill.y + jolt.y, 420, '255,248,215', 0.9 * flash);
  glow(ctx, gill.x, gill.y, 600, '255,200,90', 0.35 * tri);
  wash(ctx, 'screen', '#fff6dc', 0.3 * flash);
  drawVignette(ctx, 0.62 + 0.15 * shock, '8,4,2');
}
