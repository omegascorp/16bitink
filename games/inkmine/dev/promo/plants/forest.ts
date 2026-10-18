import { createRng } from '../../../src/logic/rng';
import { rgba, soft } from '../../../src/art/paint';
import { makeCanvas } from '../../../src/art/pen';
import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../../../src/art/prospector';
import { PROSPECTOR_FINISH, render } from '../../../src/art/textures';
import { makeDraw, type Draw } from '../../../src/art/kit';
import { BOIL } from '../../../src/art/palette';
import { evenLoadout, prospectorLook } from '../../../src/logic/gear';
import { drawSprite, type Frame, type Sprite } from '../sprites';
import { backlight, bakeBlack, BLACKS } from './blackPaint';
import { DISH_ART, drawFiddleheads, drawFrondTree, drawSunDish, drawTuft, FIDDLE_ART, TREE_ART, TUFT_ART } from './flora';
import { bakeGlow, bakeSky, SKY_BOX } from './sky';
import { forestAt, SUN, sunGlowAt, swayAt, twinkleAt, galaxyAt } from './story';

/**
 * The black forest under the red sun (frame 1 and the end): the sky, three
 * bands of ground, and black plants in three depths, the far ones hazed
 * red, all swaying slowly about their feet; the prospector small on a rise
 * for scale, backlit like the plants. Each depth zooms at its own rate as
 * the camera pushes in, so the forest has depth.
 */
type Kind = 'tree' | 'dish' | 'fiddle' | 'tuft';
interface Plant {
  readonly kind: Kind;
  readonly x: number;
  readonly y: number;
  /** Screen px per unit. */
  readonly scale: number;
  readonly lean?: number;
  readonly facing?: number;
}

interface Depth {
  /** How much of the camera's push this depth takes (parallax). */
  readonly k: number;
  readonly haze: number;
  readonly plants: readonly Plant[];
}

const BACK: Depth = {
  k: 0.8, haze: 0.42, plants: [
    { kind: 'tree', x: -30, y: 922, scale: 1.55, lean: 0.35 },
    { kind: 'dish', x: 140, y: 918, scale: 1.4 },
    { kind: 'tree', x: 300, y: 916, scale: 1.2, lean: -0.25 },
    { kind: 'fiddle', x: 405, y: 920, scale: 1.3 },
    { kind: 'dish', x: 470, y: 922, scale: 1.05, facing: -1 },
    { kind: 'tree', x: 780, y: 916, scale: 1.3, lean: 0.3 },
    { kind: 'dish', x: 905, y: 920, scale: 1.5, facing: -1 },
    { kind: 'fiddle', x: 1010, y: 918, scale: 1.4, facing: -1 },
    { kind: 'tree', x: 1140, y: 925, scale: 1.65, lean: -0.35 },
  ],
};
const MID: Depth = {
  k: 1, haze: 0, plants: [
    { kind: 'tree', x: 95, y: 1095, scale: 2.85, lean: 0.6 },
    { kind: 'tuft', x: 470, y: 1000, scale: 2 },
    { kind: 'dish', x: 300, y: 1070, scale: 2.5 },
    { kind: 'fiddle', x: 830, y: 1060, scale: 2.3, facing: -1 },
    { kind: 'tree', x: 1000, y: 1120, scale: 2.5, lean: -0.55 },
    { kind: 'tuft', x: 700, y: 1000, scale: 1.8, facing: -1 },
  ],
};
const FRONT: Depth = {
  k: 1.25, haze: 0, plants: [
    { kind: 'dish', x: 40, y: 1720, scale: 5.2 },
    { kind: 'tuft', x: 380, y: 1585, scale: 4 },
    { kind: 'tuft', x: 870, y: 1610, scale: 4.6, facing: -1 },
    { kind: 'fiddle', x: 1065, y: 1740, scale: 4.6, facing: -1 },
  ],
};

const ART: Readonly<Record<Kind, Frame>> = { tree: TREE_ART, dish: DISH_ART, fiddle: FIDDLE_ART, tuft: TUFT_ART };
const HEIGHT: Readonly<Record<Kind, number>> = { tree: 230, dish: 110, fiddle: 120, tuft: 40 };
/** The red rim's width on screen, px. */
const RIM_PX = 3.4;
const SWAY: Readonly<Record<Kind, number>> = { tree: 0.018, dish: 0.03, fiddle: 0.035, tuft: 0.06 };

function drawKind(d: Draw, p: Plant, seed: number): void {
  if (p.kind === 'tree') drawFrondTree(d, seed, p.lean ?? 0);
  else if (p.kind === 'dish') drawSunDish(d, seed);
  else if (p.kind === 'fiddle') drawFiddleheads(d, seed);
  else drawTuft(d, seed);
}

/** Towards the sun from a plant's middle, on its canvas (mirrored plants see it mirrored). */
function toSun(p: Plant): { x: number; y: number } {
  const dx = SUN.x - p.x;
  const dy = SUN.y - (p.y - HEIGHT[p.kind] * p.scale * 0.6);
  const l = Math.hypot(dx, dy) || 1;
  return { x: (dx / l) * (p.facing ?? 1), y: dy / l };
}

function bakePlant(p: Plant, i: number, haze: number): Sprite {
  const res = Math.min(4, Math.max(1.5, p.scale));
  return bakeBlack(ART[p.kind], res, 700 + i * 37, (d) => drawKind(d, p, 300 + i * 53), { to: toSun(p), alpha: 0.95, haze, px: (RIM_PX * res) / p.scale });
}

/** A band of ground: its top line (`y` of x), dark, its rim lit red from behind. */
function bakeGround(top: (x: number) => number, fill: readonly [string, string], rim: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(SKY_BOX.w, SKY_BOX.h);
  ctx.translate(-SKY_BOX.x, -SKY_BOX.y);
  const xs = Array.from({ length: 160 }, (_, i) => SKY_BOX.x + (i / 159) * SKY_BOX.w);
  const line = (): void => {
    ctx.beginPath();
    xs.forEach((x, i) => (i === 0 ? ctx.moveTo(x, top(x)) : ctx.lineTo(x, top(x))));
  };
  line();
  ctx.lineTo(SKY_BOX.x + SKY_BOX.w, SKY_BOX.y + SKY_BOX.h);
  ctx.lineTo(SKY_BOX.x, SKY_BOX.y + SKY_BOX.h);
  ctx.closePath();
  const y0 = Math.min(...xs.map(top));
  const g = ctx.createLinearGradient(0, y0, 0, y0 + 500);
  g.addColorStop(0, fill[0]);
  g.addColorStop(1, fill[1]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  soft(ctx, 3, () => {
    line();
    ctx.strokeStyle = rgba(BLACKS.rim, rim);
    ctx.lineWidth = 5;
    ctx.stroke();
  });
  ctx.restore();
  return canvas;
}

const hill = (seed: number, base: number, amp: number, knolls: readonly (readonly [number, number, number])[]) => {
  const rng = createRng(seed);
  const ph = [rng() * 6, rng() * 6, rng() * 6];
  return (x: number): number =>
    base + amp * (0.6 * Math.sin(x / 140 + ph[0]!) + 0.3 * Math.sin(x / 61 + ph[1]!) + 0.1 * Math.sin(x / 23 + ph[2]!))
    - knolls.reduce((s, [kx, kh, kw]) => s + kh * Math.exp(-(((x - kx) / kw) ** 2)), 0);
};

/** Where the prospector stands, on the knoll in the middle ground. */
const STANDS = { x: 625, scale: 2.4 } as const;
const MID_TOP = hill(41, 1035, 10, [[STANDS.x, 118, 135], [300, 20, 200]]);

function bakeProspector(): Sprite {
  const frame = { w: PROSPECTOR_FRAME, h: PROSPECTOR_FRAME, ox: PROSPECTOR_FRAME / 2, oy: PROSPECTOR_FRAME / 2 + PROSPECTOR_GROUND };
  const look = prospectorLook(evenLoadout(2));
  const res = 6;
  const frames = Array.from({ length: BOIL }, (_, f) => {
    const canvas = render(frame.w, frame.h, frame.ox, frame.oy, res, (ctx) => drawProspector(makeDraw(ctx, 120 + f, f, 0), 'idle', look), PROSPECTOR_FINISH);
    // Backlit: in shadow on the side we see, rimmed red where the sun catches it.
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(18, 8, 20, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    backlight(canvas, { to: { x: 0.15, y: -1 }, px: res * 1.4, alpha: 0.9 });
    return canvas;
  });
  return { frames, frame, res };
}

export interface Forest {
  draw(ctx: CanvasRenderingContext2D, t: number, boil: number): void;
}

export function makeForest(): Forest {
  const sky = bakeSky();
  const glow = bakeGlow();
  const far = bakeGround(hill(17, 925, 14, [[160, 18, 160], [900, 14, 200]]), ['#220b12', '#16070c'], 0.55);
  const mid = bakeGround(MID_TOP, ['#0d0711', '#050308'], 0.7);
  const front = bakeGround(hill(83, 1625, 30, [[180, 70, 260], [960, 40, 220]]), ['#060409', '#020103'], 0.4);
  const depths = [BACK, MID, FRONT].map((dep, di) => ({ dep, sprites: dep.plants.map((p, i) => bakePlant(p, di * 20 + i, dep.haze)) }));
  const prospector = bakeProspector();

  const layer = (ctx: CanvasRenderingContext2D, zoom: number, draw: () => void): void => {
    ctx.save();
    ctx.translate(SUN.x, SUN.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-SUN.x, -SUN.y);
    draw();
    ctx.restore();
  };
  const plants = (ctx: CanvasRenderingContext2D, i: number, t: number, boil: number): void => {
    const { dep, sprites } = depths[i]!;
    dep.plants.forEach((p, k) => {
      const rot = swayAt(t, k * 1.9 + i, SWAY[p.kind]);
      drawSprite(ctx, sprites[k]!, boil + k, { x: p.x, y: p.y, scale: p.scale, facing: p.facing ?? 1, rotation: rot });
    });
  };

  const scene = (ctx: CanvasRenderingContext2D, t: number, boil: number, alpha: number): void => {
    const cam = forestAt(t);
    const z = (k: number): number => (1 + (cam.push - 1) * k) * cam.away;
    ctx.save();
    ctx.globalAlpha = alpha;
    layer(ctx, z(0.55), () => {
      ctx.drawImage(sky, SKY_BOX.x, SKY_BOX.y);
      drawSkyLife(ctx, t);
      ctx.globalCompositeOperation = 'screen';
      const g = sunGlowAt(t);
      ctx.globalAlpha = alpha * Math.min(1, g * 0.7);
      ctx.drawImage(glow, SUN.x - glow.width / 2, SUN.y - glow.height / 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
    });
    layer(ctx, z(0.7), () => ctx.drawImage(far, SKY_BOX.x, SKY_BOX.y));
    layer(ctx, z(0.8), () => plants(ctx, 0, t, boil));
    layer(ctx, z(1), () => {
      ctx.drawImage(mid, SKY_BOX.x, SKY_BOX.y);
      drawSprite(ctx, prospector, boil, { x: STANDS.x, y: MID_TOP(STANDS.x) + 3, scale: STANDS.scale, facing: -1 });
      plants(ctx, 1, t, boil);
    });
    layer(ctx, z(1.25), () => {
      ctx.drawImage(front, SKY_BOX.x, SKY_BOX.y);
      plants(ctx, 2, t, boil);
    });
    ctx.restore();
  };

  // Pulling away, the forest is drawn off-screen and faded out from the sun's middle, so it shrinks into the stars without edges.
  const buffer = makeCanvas(1080, 1920);
  return {
    draw(ctx, t, boil): void {
      const cam = forestAt(t);
      if (cam.alpha <= 0) return;
      if (cam.away > 0.999) {
        scene(ctx, t, boil, cam.alpha);
        return;
      }
      const b = buffer.ctx;
      b.globalCompositeOperation = 'source-over';
      b.fillStyle = '#06050b';
      b.fillRect(0, 0, 1080, 1920);
      scene(b, t, boil, 1);
      // Gone before the far edges of the baked layers come into view.
      const r = 740 * cam.away;
      const g = b.createRadialGradient(SUN.x, SUN.y, r * 0.3, SUN.x, SUN.y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      b.globalCompositeOperation = 'destination-in';
      b.fillStyle = g;
      b.fillRect(0, 0, 1080, 1920);
      ctx.save();
      ctx.globalAlpha = cam.alpha;
      ctx.drawImage(buffer.canvas, 0, 0);
      ctx.restore();
    },
  };
}

/** Glints that twinkle on "stars", and the galaxy's band brightening on "galaxy". */
const GLINTS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 14 }, () => ({ x: 40 + rng() * 1000, y: 60 + rng() * 330, r: 2 + rng() * 2.5, ph: rng() * Math.PI * 2 }));
})();
function drawSkyLife(ctx: CanvasRenderingContext2D, t: number): void {
  const tw = twinkleAt(t);
  const ga = galaxyAt(t);
  if (ga > 0) {
    ctx.save();
    ctx.globalAlpha *= 0.22 * ga;
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(540, 300);
    ctx.rotate(Math.atan2(40 - 560, 1520));
    const g = ctx.createLinearGradient(0, -140, 0, 140);
    g.addColorStop(0, 'rgba(190, 170, 230, 0)');
    g.addColorStop(0.5, 'rgba(210, 190, 240, 1)');
    g.addColorStop(1, 'rgba(190, 170, 230, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-900, -140, 1800, 280);
    ctx.restore();
  }
  if (tw <= 0) return;
  ctx.save();
  ctx.strokeStyle = '#fff6ea';
  ctx.fillStyle = '#fff6ea';
  GLINTS.forEach((s, i) => {
    const a = tw * (0.5 + 0.5 * Math.sin(t * 9 + s.ph + i));
    if (a <= 0.02) return;
    ctx.globalAlpha = a;
    ctx.lineWidth = 1.4;
    const r = s.r * 4 * a;
    ctx.beginPath();
    ctx.moveTo(s.x - r, s.y);
    ctx.lineTo(s.x + r, s.y);
    ctx.moveTo(s.x, s.y - r);
    ctx.lineTo(s.x, s.y + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
