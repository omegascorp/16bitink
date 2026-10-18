import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { path, tube } from '../sharkskin/ink';
import { BEAD_GAP, type Camera, type Float, FLOAT_ANCHOR, OTHERS, pointAlong, toScreen } from './story';

/**
 * The Portuguese man o' war in the same pen and ink: its gas-filled float
 * riding on the surface (a translucent blue-violet balloon with a pink
 * crest along the top), the clusters of short polyps hanging under it, and
 * its long blue tentacles beaded with batteries of stinging cells. Not one
 * of the game's jellies (it isn't a jellyfish but a colony), so drawn here
 * after life. Float px are world px, origin at the middle of its waterline.
 */

const FLOAT_RES = 1.6;
const BOX = { x0: -330, y0: -175, w: 660, h: 330 } as const;
const PINK = '#e793d8';
const VIOLET = '#9a6ee0';
export const TENTACLE_BLUE = '#3a62d8';
const BEAD = '#2b3aa6';

/** The balloon: round at its left end, tapering to an upturned point on the right, its belly just under the waterline. */
const BALLOON: readonly Pt[] = Array.from({ length: 64 }, (_, i) => {
  const a = (i / 64) * Math.PI * 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const taper = 1 - 0.38 * Math.max(0, c) ** 1.5;
  const y = s < 0 ? -112 * (-s) ** 0.8 * taper - 34 * Math.max(0, c) ** 5 : 30 * s ** 0.9 * taper;
  return { x: 300 * c, y };
});

/** The top of the balloon at x (float px), for the crest to stand on. */
const topAt = (x: number): number => {
  let best = 0;
  for (let i = 0; i < BALLOON.length; i++) {
    const a = BALLOON[i]!;
    const b = BALLOON[(i + 1) % BALLOON.length]!;
    if (a.y < 0 && (a.x - x) * (b.x - x) <= 0 && a.x !== b.x) best = Math.min(best, a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x));
  }
  return best;
};

/** The crest: a sail arching along the top, highest in the middle, its edge in soft ruffles. */
const CREST_X = [-215, 235] as const;
const CREST: readonly Pt[] = (() => {
  const n = 46;
  const xs = Array.from({ length: n + 1 }, (_, i) => CREST_X[0] + ((CREST_X[1] - CREST_X[0]) * i) / n);
  const top = xs.map((x, i) => {
    const u = i / n;
    const arch = Math.sin(Math.PI * u) ** 0.75;
    return { x, y: topAt(x) + 8 - (62 * arch + 9 * Math.abs(Math.sin(u * Math.PI * 9)) * arch) };
  });
  const bottom = [...xs].reverse().map((x) => ({ x, y: topAt(x) + 14 }));
  return [...top, ...bottom];
})();

/** Short polyps hanging in bunches under the float: where, how long, how curled, what colour. */
const POLYPS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 34 }, () => ({
    x: -230 + rng() * 470,
    len: 25 + rng() * 60,
    curl: (rng() - 0.5) * 2.6,
    colour: ['#6a4fc4', '#3f64d8', '#b76ac4', '#5a7ae8', '#4a56c8'][Math.floor(rng() * 5)]!,
    r: 2.6 + rng() * 2.6,
  }));
})();

function drawFloat(pen: Pen, ctx: CanvasRenderingContext2D): void {
  // The polyps first, behind the balloon.
  for (const p of POLYPS) {
    const from = { x: p.x, y: 18 };
    const mid = { x: p.x + p.curl * 18, y: 18 + p.len * 0.55 };
    const to = { x: p.x + p.curl * 34, y: 18 + p.len };
    // Soft, curling tubes, each with a little rounded mouth at its end.
    const shape = tube(path(from, [mid, to]), p.r * 0.7, p.r);
    pen.fill(shape, p.colour, 0.8);
    pen.fill(tube(path(from, [mid, to]), p.r * 0.25, p.r * 0.35), '#ffffff', 0.25);
    pen.stroke([...shape, shape[0]!], 1.2, INK, 0.65, false);
  }
  // Stubs where the long tentacles hang from.
  for (const o of [...OTHERS.map((q) => q.x), FLOAT_ANCHOR.x]) {
    const stub = tube(path({ x: o, y: 14 }, [{ x: o + 2, y: 24 }, { x: o, y: 34 }]), 6, 5);
    pen.fill(stub, TENTACLE_BLUE, 0.9);
    pen.stroke([...stub, stub[0]!], 1.3, INK, 0.8, false);
  }
  // The crest, then the balloon over its lower edge.
  const g = ctx.createLinearGradient(0, -190, 0, -100);
  g.addColorStop(0, PINK);
  g.addColorStop(1, VIOLET);
  pen.fill(CREST, '#ffffff', 0.4);
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = g;
  ctx.beginPath();
  CREST.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.clipped(CREST, () => {
    // Folds fanning up through the sail.
    for (let x = CREST_X[0] + 12; x < CREST_X[1]; x += 19) pen.hair([{ x, y: topAt(x) + 10 }, { x: x * 1.04 + 4, y: topAt(x) - 80 }], 1.1, '#7a3a9a', 0.4);
  });
  pen.stroke(CREST.slice(0, 47), 2.2, INK, 0.95);
  const body = ctx.createLinearGradient(0, -115, 0, 32);
  body.addColorStop(0, '#dfe4ff');
  body.addColorStop(0.45, '#9fb2f6');
  body.addColorStop(1, '#8a6fdc');
  pen.fill(BALLOON, '#ffffff', 0.45);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = body;
  ctx.beginPath();
  BALLOON.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.clipped(BALLOON, () => {
    // A pink flush along the top, shading stippled into the belly, a glassy highlight.
    pen.fill(BALLOON.map((p) => ({ x: p.x * 0.96, y: p.y * 0.98 - 14 })).filter((p) => p.y < -50), PINK, 0.25);
    pen.stipple(BALLOON, 2600, (_x, y) => Math.max(0, (y + 40) / 75) * 0.6, 1.1, '#3a2a8a');
    pen.hatch(BALLOON, 6, 0.6, 1, { onlyBelow: 0, color: '#3a2a8a', alpha: 0.3 });
    pen.fill(Array.from({ length: 20 }, (_, i) => {
      const a = (i / 20) * Math.PI * 2;
      return { x: -120 + Math.cos(a) * 95, y: -62 + Math.sin(a) * 17 };
    }), '#ffffff', 0.55);
    pen.hair([{ x: -230, y: -40 }, { x: -150, y: -84 }, { x: -40, y: -96 }], 2, '#ffffff', 0.7);
  });
  const half = BALLOON.length / 2;
  pen.stroke([...BALLOON.slice(half), BALLOON[0]!], 2.4, INK, 1);
  pen.stroke(BALLOON.slice(0, half + 1), 3.4, INK, 1);
}

export function makeFloatFrames(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(BOX.w * FLOAT_RES, BOX.h * FLOAT_RES);
    ctx.scale(FLOAT_RES, FLOAT_RES);
    ctx.translate(-BOX.x0, -BOX.y0);
    drawFloat(new Pen(ctx, 501 + f * 977, 1.1), ctx);
    return canvas;
  });
}

export function drawFloatSprite(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], f: Float, cam: Camera, boil: number): void {
  const at = toScreen(cam, f);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(f.tilt);
  ctx.scale(cam.zoom / f.squash / FLOAT_RES, (cam.zoom * f.squash) / FLOAT_RES);
  ctx.drawImage(frames[boil % frames.length]!, BOX.x0 * FLOAT_RES, BOX.y0 * FLOAT_RES);
  ctx.restore();
}

/** A steady per-point, per-boil-frame wobble, screen px. */
const boilJitter = (k: number, boil: number, size: number): Pt => ({ x: size * Math.sin(k * 12.9898 + boil * 78.233), y: size * Math.cos(k * 39.3468 + boil * 11.135) });

export interface TentacleInk {
  /** World px wide. */
  readonly width: number;
  readonly alpha: number;
  /** How far along the line (from its start) the beads have moved, world px: they slide towards the start. */
  readonly reel?: number;
  /** Beads within this many world px of the start shrink away (swallowed). */
  readonly swallow?: number;
  /** Bead size, relative to the strand's width. */
  readonly bead?: number;
}

/** A tentacle: a translucent blue strand with an ink edge and beads of stinging cells along it. */
export function drawTentacle(ctx: CanvasRenderingContext2D, cam: Camera, line: readonly Pt[], ink: TentacleInk, boil: number): void {
  const pts = line.map((p, k) => {
    const s = toScreen(cam, p);
    const j = boilJitter(k, boil, 0.8);
    return { x: s.x + j.x, y: s.y + j.y };
  });
  if (pts.every((p) => p.y > 2000 || p.x < -200 || p.x > 1280)) return;
  const w = ink.width * cam.zoom;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trace = (): void => {
    ctx.beginPath();
    pts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  };
  ctx.globalAlpha = ink.alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + Math.max(1.5, 2.4 * cam.zoom);
  trace();
  ctx.stroke();
  ctx.strokeStyle = TENTACLE_BLUE;
  ctx.lineWidth = w;
  trace();
  ctx.stroke();
  ctx.strokeStyle = '#a9c2ff';
  ctx.globalAlpha = ink.alpha * 0.6;
  ctx.lineWidth = Math.max(1, w * 0.28);
  ctx.translate(-w * 0.18, -w * 0.12);
  trace();
  ctx.stroke();
  ctx.restore();
  // The beads: batteries of stinging cells, every BEAD_GAP along it.
  let total = 0;
  for (let i = 1; i < line.length; i++) total += Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y);
  const shift = (((ink.reel ?? 0) % BEAD_GAP) + BEAD_GAP) % BEAD_GAP;
  ctx.save();
  for (let k = 0, s = BEAD_GAP - shift; s < total; k++, s += BEAD_GAP) {
    const shrink = ink.swallow ? Math.min(1, Math.max(0, (s - 4) / ink.swallow)) : 1;
    if (shrink <= 0) continue;
    const p = toScreen(cam, pointAlong(line, s));
    if (p.y > 2000 || p.y < -50) continue;
    const r = ink.width * (ink.bead ?? 0.85) * cam.zoom * shrink;
    ctx.globalAlpha = ink.alpha;
    ctx.fillStyle = BEAD;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.1, r * 0.85, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, 1.6 * cam.zoom);
    ctx.stroke();
    ctx.fillStyle = '#c7d6ff';
    ctx.globalAlpha = ink.alpha * 0.7;
    ctx.beginPath();
    ctx.arc(p.x - r * 0.35, p.y - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
