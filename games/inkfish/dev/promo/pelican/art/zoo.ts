import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { dab, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { fillShape, inkLine, seeded, unitPx, within } from './ink';

/**
 * The sunny zoo enclosure, in world units: a soft summer sky, a line of trees,
 * a wooden rail fence, mown grass and a pond's edge with reeds. The still
 * parts are painted once into two sheets, a sharp one for the wide shots and a
 * soft one (painted small and laid in big) for the close-ups, so the grass
 * melts out of focus behind the animals.
 */

export const WORLD = { x0: -1300, x1: 1300, y0: 520, y1: 2200 } as const;
export const POND = { x: -560, y: 1330, rx: 380, ry: 130 } as const;
const FENCE_Y = 760;

const POND_SHAPE = smoothLoop(
  Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const w = 1 + 0.07 * Math.sin(i * 2.3) + 0.05 * Math.cos(i * 3.7);
    return { x: POND.x + Math.cos(a) * POND.rx * w, y: POND.y + Math.sin(a) * POND.ry * w };
  }),
  5,
);

function paintTrees(ctx: CanvasRenderingContext2D): void {
  const rng = seeded(5);
  const greens = ['74,116,62', '92,138,70', '60,98,54', '108,150,80'];
  for (let x = WORLD.x0 - 60; x < WORLD.x1 + 60; x += 46) {
    const y = 640 + Math.sin(x * 0.004) * 30 + (rng() - 0.5) * 30;
    const r = 80 + rng() * 70;
    dab(ctx, x, y, r * 1.3, greens[Math.floor(rng() * greens.length)]!, 0.9);
  }
  for (let i = 0; i < 70; i++) {
    const x = WORLD.x0 + rng() * (WORLD.x1 - WORLD.x0);
    dab(ctx, x, 590 + rng() * 80, 30 + rng() * 40, '168,206,120', 0.35);
  }
  for (let i = 0; i < 50; i++) {
    const x = WORLD.x0 + rng() * (WORLD.x1 - WORLD.x0);
    dab(ctx, x, 690 + rng() * 60, 30 + rng() * 40, '40,70,40', 0.35);
  }
}

function paintFence(ctx: CanvasRenderingContext2D, boil: number): void {
  for (const y of [FENCE_Y - 36, FENCE_Y - 2]) {
    const rail = [{ x: WORLD.x0, y: y - 7 }, { x: WORLD.x1, y: y - 7 }, { x: WORLD.x1, y: y + 7 }, { x: WORLD.x0, y: y + 7 }];
    const g = ctx.createLinearGradient(0, y - 7, 0, y + 7);
    g.addColorStop(0, '#c99c6a');
    g.addColorStop(1, '#8a6038');
    fillShape(ctx, rail, g);
    inkLine(ctx, [rail[0]!, rail[1]!], 1.1, 0.5, boil);
    inkLine(ctx, [rail[3]!, rail[2]!], 1.1, 0.5, boil);
  }
  for (let x = WORLD.x0 + 40; x < WORLD.x1; x += 170) {
    const post = [{ x: x - 9, y: FENCE_Y - 66 }, { x: x + 9, y: FENCE_Y - 66 }, { x: x + 10, y: FENCE_Y + 26 }, { x: x - 10, y: FENCE_Y + 26 }];
    const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
    g.addColorStop(0, '#d2a674');
    g.addColorStop(1, '#7c5432');
    fillShape(ctx, post, g);
    inkLine(ctx, post, 1.1, 0.55, boil, true);
  }
}

function paintGrass(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, FENCE_Y - 10, 0, WORLD.y1);
  g.addColorStop(0, '#b4d27a');
  g.addColorStop(0.25, '#9cc565');
  g.addColorStop(0.6, '#82b553');
  g.addColorStop(1, '#6ea445');
  ctx.fillStyle = g;
  ctx.fillRect(WORLD.x0, FENCE_Y + 4, WORLD.x1 - WORLD.x0, WORLD.y1 - FENCE_Y);
  const rng = seeded(9);
  // Sunlit and shaded patches, mown stripes, then blades, thicker nearer.
  for (let i = 0; i < 90; i++) {
    const x = WORLD.x0 + rng() * (WORLD.x1 - WORLD.x0);
    const y = FENCE_Y + 40 + rng() * (WORLD.y1 - FENCE_Y);
    dab(ctx, x, y, 60 + rng() * 120, rng() < 0.5 ? '214,236,150' : '70,120,50', 0.16);
  }
  for (let y = FENCE_Y + 40; y < WORLD.y1; y += 90) softLine(ctx, [{ x: WORLD.x0, y }, { x: WORLD.x1, y: y + 6 }], 30, '#c8e08e', 0.12, 3);
  for (let i = 0; i < 4200; i++) {
    const y = FENCE_Y + 10 + Math.pow(rng(), 0.8) * (WORLD.y1 - FENCE_Y);
    const x = WORLD.x0 + rng() * (WORLD.x1 - WORLD.x0);
    const near = (y - FENCE_Y) / (WORLD.y1 - FENCE_Y);
    const h = 6 + near * 18 * (0.6 + rng() * 0.8);
    const lean = (rng() - 0.5) * h * 0.7;
    const colour = rng() < 0.5 ? '#5a8e3a' : rng() < 0.6 ? '#cfe79a' : '#7fb04e';
    taper(ctx, [{ x, y }, { x: x + lean * 0.4, y: y - h * 0.6 }, { x: x + lean, y: y - h }], 1.6 + near * 2.4, 0.2, colour, 0.55);
  }
}

function paintPond(ctx: CanvasRenderingContext2D, boil: number): void {
  // A muddy rim, then the water, the sky in it, reeds at the back.
  ctx.save();
  ctx.translate(0, -8);
  fillShape(ctx, POND_SHAPE.map((p) => ({ x: POND.x + (p.x - POND.x) * 1.06, y: POND.y + (p.y - POND.y) * 1.12 })), '#8c7a4e', 0.85);
  ctx.restore();
  within(ctx, POND_SHAPE, () => {
    const g = ctx.createLinearGradient(0, POND.y - POND.ry, 0, POND.y + POND.ry);
    g.addColorStop(0, '#4f8fae');
    g.addColorStop(0.5, '#6fb3cf');
    g.addColorStop(1, '#9ad2e2');
    ctx.fillStyle = g;
    ctx.fillRect(POND.x - POND.rx * 1.2, POND.y - POND.ry * 1.3, POND.rx * 2.4, POND.ry * 2.6);
    for (let i = 0; i < 5; i++) softLine(ctx, [{ x: POND.x - 300 + i * 40, y: POND.y - 60 + i * 30 }, { x: POND.x + 260 - i * 30, y: POND.y - 50 + i * 30 }], 10, '#e4f6fa', 0.35, 4);
    dab(ctx, POND.x + 120, POND.y - 40, 90, '255,255,255', 0.25);
  });
  inkLine(ctx, POND_SHAPE, 1.3, 0.55, boil, true);
  const rng = seeded(31);
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (1.1 + rng() * 0.8);
    const base = { x: POND.x + Math.cos(a) * POND.rx * 0.98, y: POND.y + Math.sin(a) * POND.ry * 0.98 };
    const h = 50 + rng() * 70;
    taper(ctx, [base, { x: base.x + (rng() - 0.5) * 14, y: base.y - h * 0.6 }, { x: base.x + (rng() - 0.5) * 30, y: base.y - h }], 5, 0.5, rng() < 0.5 ? '#4f7f34' : '#7aa64a', 0.9);
  }
}

/** One sheet of the still parts at `res` px per world unit. */
function bake(res: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil((WORLD.x1 - WORLD.x0) * res), Math.ceil((WORLD.y1 - WORLD.y0) * res));
  ctx.scale(res, res);
  ctx.translate(-WORLD.x0, -WORLD.y0);
  paintTrees(ctx);
  paintGrass(ctx);
  paintFence(ctx, 0);
  paintPond(ctx, 0);
  return canvas;
}

let sheets: { readonly sharp: HTMLCanvasElement; readonly soft: HTMLCanvasElement } | null = null;

/** The sky, in screen space: summer blue over a warm haze at the tree line. */
export function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(200, horizonY));
  g.addColorStop(0, '#8cc6ea');
  g.addColorStop(0.7, '#c6e4f2');
  g.addColorStop(1, '#f4efd8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  dab(ctx, w * 0.78, horizonY * 0.25, 260, '255,250,230', 0.6);
}

/** The still parts of the enclosure under the current (world) transform: sharp at `focus` 1, soft at 0. */
export function drawGround(ctx: CanvasRenderingContext2D, focus: number): void {
  sheets ??= { sharp: bake(0.9), soft: bake(0.22) };
  const draw = (c: HTMLCanvasElement, alpha: number): void => {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, WORLD.x0, WORLD.y0, WORLD.x1 - WORLD.x0, WORLD.y1 - WORLD.y0);
    ctx.restore();
  };
  draw(sheets.soft, 1);
  draw(sheets.sharp, focus);
}

/** Rings spreading on the pond, `phase` 0 .. 1 going round once a cycle. */
export function drawRipples(ctx: CanvasRenderingContext2D, phase: number): void {
  const px = unitPx(ctx);
  for (const [cx, cy, off] of [[POND.x - 120, POND.y + 10, 0], [POND.x + 160, POND.y + 40, 0.5]] as const) {
    for (let i = 0; i < 3; i++) {
      const u = (phase + off + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha = 0.45 * (1 - u);
      ctx.strokeStyle = '#eefaff';
      ctx.lineWidth = 2 * px;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 20 + u * 90, (20 + u * 90) * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- props

/** A gallon jug of water, local units, 64 tall, standing on 0,0. */
export function drawJug(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, boil: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size / 64, size / 64);
  const body = smoothLoop([{ x: -22, y: -40 }, { x: -6, y: -50 }, { x: 14, y: -50 }, { x: 24, y: -40 }, { x: 24, y: -4 }, { x: 20, y: 0 }, { x: -20, y: 0 }, { x: -24, y: -4 }], 4);
  const g = ctx.createLinearGradient(-24, 0, 24, 0);
  g.addColorStop(0, '#d6e6ee');
  g.addColorStop(0.4, '#ffffff');
  g.addColorStop(1, '#bcd2de');
  fillShape(ctx, body, g);
  within(ctx, body, () => {
    const w = ctx.createLinearGradient(0, -34, 0, 0);
    w.addColorStop(0, '#8fd0f0');
    w.addColorStop(1, '#3f95c8');
    ctx.fillStyle = w;
    ctx.fillRect(-30, -34, 60, 40);
    softLine(ctx, [{ x: -24, y: -34 }, { x: 24, y: -34 }], 3, '#e8f8ff', 0.8, 2);
    softLine(ctx, [{ x: -12, y: -44 }, { x: -12, y: -6 }], 5, '#ffffff', 0.6, 3);
  });
  // The handle on the shoulder and the cap.
  const handle = smoothLoop([{ x: 4, y: -50 }, { x: 22, y: -50 }, { x: 24, y: -36 }, { x: 18, y: -36 }, { x: 17, y: -45 }, { x: 8, y: -45 }], 3);
  fillShape(ctx, handle, '#e6f0f4');
  const cap = [{ x: -16, y: -58 }, { x: -4, y: -58 }, { x: -3, y: -49 }, { x: -17, y: -49 }];
  fillShape(ctx, cap, '#2f6fb8');
  inkLine(ctx, body, 1.2, 0.75, boil, true);
  inkLine(ctx, handle, 1, 0.6, boil, true);
  inkLine(ctx, cap, 1, 0.7, boil, true);
  ctx.restore();
}

/** Japan's flag on a little stick, local units, `w` wide. */
export function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, wave: number, boil: number): void {
  const h = w * 0.66;
  const cloth = Array.from({ length: 9 }, (_, i) => ({ x: x + (w * i) / 8, y: y + Math.sin(wave + i * 0.6) * w * 0.03 }));
  const shape: Pt[] = [...cloth, ...[...cloth].reverse().map((p) => ({ x: p.x, y: p.y + h }))];
  taper(ctx, [{ x: x - 2, y: y - 6 }, { x: x - 2, y: y + h * 1.9 }], w * 0.06, w * 0.05, '#6b4a2e', 1);
  fillShape(ctx, shape, '#fbf8f2');
  const mid = cloth[4]!;
  ctx.fillStyle = '#c8102e';
  ctx.beginPath();
  ctx.arc(mid.x, mid.y + h / 2, h * 0.3, 0, Math.PI * 2);
  ctx.fill();
  inkLine(ctx, shape, 1.6, 0.8, boil, true);
}

/** Dappled shade from trees out of shot, soft pools on the grass (world units, drawn live so it stays sharp up close). */
const SHADE: readonly (readonly [number, number, number])[] = [[-620, 1240, 260], [-180, 1330, 200], [260, 1260, 240], [700, 1320, 260], [-60, 1000, 160], [480, 990, 180]];

export function drawShade(ctx: CanvasRenderingContext2D): void {
  for (const [x, y, r] of SHADE) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.32);
    dab(ctx, 0, 0, r, '44,82,36', 0.3);
    dab(ctx, r * 0.4, -r * 0.2, r * 0.5, '44,82,36', 0.2);
    ctx.restore();
  }
}

const TUFTS = (() => {
  const rng = seeded(77);
  return Array.from({ length: 900 }, () => {
    const x = -1000 + rng() * 2000;
    const y = 1040 + rng() * 520;
    return { x, y, h: 10 + rng() * 16, lean: (rng() - 0.5) * 12, light: rng() < 0.45 };
  });
})();

/** Crisp grass blades in the band the animals lie in, so the ground under them reads up close. */
export function drawTufts(ctx: CanvasRenderingContext2D, x0: number, x1: number, boil: number): void {
  for (const b of TUFTS) {
    if (b.x < x0 - 30 || b.x > x1 + 30) continue;
    const sway = Math.sin(boil * 2.1 + b.x * 0.05) * 1.2;
    for (const dx of [-4, 0, 4]) {
      taper(ctx, [{ x: b.x + dx, y: b.y }, { x: b.x + dx + b.lean * 0.4, y: b.y - b.h * 0.6 }, { x: b.x + dx + b.lean + sway + dx * 0.6, y: b.y - b.h }], 2.6, 0.3, b.light ? '#c4e08a' : '#5d9238', 0.75);
    }
  }
}
