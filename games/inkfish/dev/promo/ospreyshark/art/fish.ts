import { type Pt } from '../../../../src/art/pen';
import { fillShape, inkLine, seeded, unitPx, within } from '../../pelican/art/ink';
import { dab, smoothLoop, softLine, taper } from '../../seal/art/paint';

/**
 * A generic silver fish (no species), painted to the bar of the great white:
 * a slim torpedo, a blue-green back washing down to bright silver flanks and
 * a white belly, a sheen band, rows of fine scales, a lateral line, a gill
 * cover, soft grey fins and a forked tail, and a big round eye with a gold
 * ring and a catchlight. `worry` widens the eye, lifts a worried brow and
 * opens the mouth; `wiggle` bends the body (a struggle).
 *
 * Own units: nose at +100, tail fork at about -110, belly down, the middle
 * at 0,0.
 */

export interface FishPose {
  readonly x: number;
  readonly y: number;
  readonly k: number;
  /** Radians: 0 faces right. */
  readonly a: number;
  /** 0 calm .. 1 very worried. */
  readonly worry: number;
  /** Body bend, about -1 .. 1. */
  readonly wiggle: number;
  /** Which way it looks: -1 back, 0 ahead, 1 up at the viewer. */
  readonly look: number;
}

const TOP: readonly Pt[] = [
  { x: 104, y: 1 }, { x: 98, y: -8 }, { x: 84, y: -18 }, { x: 70, y: -24 }, { x: 52, y: -28 }, { x: 20, y: -30 }, { x: -14, y: -27 }, { x: -44, y: -20 },
  { x: -66, y: -12 }, { x: -78, y: -8 },
];
const BOTTOM: readonly Pt[] = [
  { x: -78, y: 7 }, { x: -66, y: 10 }, { x: -44, y: 17 }, { x: -12, y: 25 }, { x: 20, y: 27 }, { x: 52, y: 24 }, { x: 78, y: 16 }, { x: 92, y: 10 }, { x: 101, y: 6 },
];
const BODY = smoothLoop([...TOP, ...BOTTOM], 4);
const TAIL = smoothLoop([
  { x: -74, y: -6 }, { x: -92, y: -20 }, { x: -112, y: -36 }, { x: -118, y: -34 }, { x: -106, y: -12 }, { x: -100, y: 0 },
  { x: -106, y: 12 }, { x: -118, y: 34 }, { x: -112, y: 36 }, { x: -92, y: 18 }, { x: -74, y: 6 },
], 4);
const DORSAL = smoothLoop([{ x: 26, y: -28 }, { x: 14, y: -44 }, { x: 4, y: -46 }, { x: -6, y: -40 }, { x: -10, y: -27 }], 4);
const DORSAL2 = smoothLoop([{ x: -36, y: -22 }, { x: -44, y: -32 }, { x: -54, y: -30 }, { x: -58, y: -17 }], 3);
const ANAL = smoothLoop([{ x: -30, y: 20 }, { x: -40, y: 32 }, { x: -52, y: 30 }, { x: -56, y: 15 }], 3);
const PELVIC = smoothLoop([{ x: 18, y: 26 }, { x: 8, y: 38 }, { x: -2, y: 36 }, { x: 2, y: 25 }], 3);
const PECTORAL = smoothLoop([{ x: 52, y: 6 }, { x: 34, y: 0 }, { x: 22, y: 6 }, { x: 34, y: 14 }, { x: 50, y: 12 }], 3);
export const FISH_EYE: Pt = { x: 74, y: -6 };
const EYE_R = 9;

/** Bends a point of the body: the rear swings with the wiggle. */
const bend = (p: Pt, w: number): Pt => {
  const u = Math.max(0, (40 - p.x) / 160);
  return { x: p.x, y: p.y + w * 26 * u * u };
};
const bent = (pts: readonly Pt[], w: number): Pt[] => pts.map((p) => bend(p, w));

function fin(ctx: CanvasRenderingContext2D, shape: readonly Pt[], root: Pt, boil: number): void {
  const g = ctx.createLinearGradient(root.x, root.y, shape[Math.floor(shape.length / 2)]!.x, shape[Math.floor(shape.length / 2)]!.y);
  g.addColorStop(0, 'rgba(150,165,175,0.95)');
  g.addColorStop(1, 'rgba(200,210,215,0.7)');
  fillShape(ctx, shape, g);
  within(ctx, shape, () => {
    const tip = shape[Math.floor(shape.length / 2)]!;
    for (let i = 0; i < 6; i++) {
      const u = i / 5;
      softLine(ctx, [root, { x: tip.x + (u - 0.5) * 22, y: tip.y + (u - 0.5) * 12 }], 1.2 * unitPx(ctx), '#5c6c78', 0.4, 1);
    }
  });
  inkLine(ctx, shape, 1.1, 0.7, boil, true);
}

/** The silver fish, placed. */
export function drawFish(ctx: CanvasRenderingContext2D, p: FishPose, boil: number): void {
  const px0 = 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.scale(p.k, p.k);
  const w = p.wiggle;
  const px = unitPx(ctx) * px0;
  // The tail and the fins behind the body.
  const tail = bent(TAIL, w);
  const tg = ctx.createLinearGradient(-74, 0, -118, 0);
  tg.addColorStop(0, '#93a6b2');
  tg.addColorStop(1, '#c8d3da');
  fillShape(ctx, tail, tg);
  within(ctx, tail, () => {
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      softLine(ctx, bent([{ x: -78, y: 0 }, { x: -114, y: -34 + 68 * u }], w), 1.2 * px, '#4e5e6a', 0.45, 1);
    }
  });
  inkLine(ctx, tail, 1.2, 0.75, boil, true);
  fin(ctx, bent(DORSAL2, w), bend({ x: -46, y: -20 }, w), boil);
  fin(ctx, bent(ANAL, w), bend({ x: -42, y: 18 }, w), boil);
  fin(ctx, DORSAL, { x: 10, y: -28 }, boil);
  fin(ctx, PELVIC, { x: 8, y: 26 }, boil);
  // The body: blue-green back, silver flanks, white belly.
  const body = bent(BODY, w);
  const g = ctx.createLinearGradient(0, -30, 0, 27);
  g.addColorStop(0, '#2f5262');
  g.addColorStop(0.22, '#4f7a88');
  g.addColorStop(0.42, '#b9c9d0');
  g.addColorStop(0.55, '#eef3f5');
  g.addColorStop(0.8, '#f8f9f8');
  g.addColorStop(1, '#c2c9d2');
  fillShape(ctx, body, g);
  within(ctx, body, () => {
    // A bright sheen band and a pale gold blush, then rows of fine scales.
    softLine(ctx, bent([{ x: 90, y: -2 }, { x: 20, y: -6 }, { x: -70, y: -2 }], w), 9, '#ffffff', 0.7, 4);
    softLine(ctx, bent([{ x: 70, y: 6 }, { x: 0, y: 6 }, { x: -60, y: 3 }], w), 8, '#e7dcb6', 0.35, 4);
    dab(ctx, 40, 24, 40, '120,130,160', 0.25);
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.9 * px;
    for (let row = 0; row < 7; row++) {
      for (let i = 0; i < 16; i++) {
        const x = 58 - i * 9 - (row % 2) * 4.5;
        const y = -24 + row * 7.5;
        const q = bend({ x, y }, w);
        ctx.strokeStyle = row < 2 ? 'rgba(20,40,52,0.35)' : 'rgba(80,100,115,0.28)';
        ctx.beginPath();
        ctx.arc(q.x, q.y, 5, -0.55 * Math.PI, 0.55 * Math.PI);
        ctx.stroke();
      }
    }
    const rng = seeded(71);
    for (let i = 0; i < 18; i++) dab(ctx, -60 + rng() * 120, -26 + rng() * 10, 2 + rng() * 2, '15,35,45', 0.4);
    // The lateral line.
    inkLine(ctx, bent([{ x: 58, y: -10 }, { x: 10, y: -13 }, { x: -40, y: -8 }, { x: -76, y: -1 }], w), 0.9, 0.45, boil);
    // The gill cover.
    inkLine(ctx, [{ x: 58, y: -20 }, { x: 52, y: -6 }, { x: 54, y: 8 }, { x: 62, y: 18 }], 1.1, 0.6, boil);
    softLine(ctx, [{ x: 56, y: -18 }, { x: 50, y: -4 }, { x: 53, y: 10 }], 4, '#6f8796', 0.35, 3);
  });
  inkLine(ctx, body, 1.5, 0.85, boil, true);
  fin(ctx, PECTORAL, { x: 50, y: 8 }, boil);
  drawFace(ctx, p, boil);
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, p: FishPose, boil: number): void {
  const worry = Math.max(0, Math.min(1, p.worry));
  const { x, y } = FISH_EYE;
  const r = EYE_R * (1 + 0.28 * worry);
  // The eye: a gold ring, a dark iris looking where it looks, a catchlight.
  ctx.fillStyle = '#1b1a1f';
  ctx.beginPath();
  ctx.arc(x, y, r + 1.4, 0, Math.PI * 2);
  ctx.fill();
  const ring = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, r);
  ring.addColorStop(0, '#fff6d8');
  ring.addColorStop(0.6, '#e6c77a');
  ring.addColorStop(1, '#9c7a34');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const look = { x: -p.look * r * 0.18 + r * 0.06, y: -Math.max(0, p.look) * r * 0.16 };
  ctx.fillStyle = '#07090c';
  ctx.beginPath();
  ctx.arc(x + look.x, y + look.y, r * (0.58 - 0.12 * worry), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + look.x + r * 0.22, y + look.y - r * 0.26, Math.max(1, r * 0.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(x + look.x - r * 0.24, y + look.y + r * 0.22, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // A worried brow hugging the top of the eye, its front end raised.
  if (worry > 0.02) {
    taper(ctx, [{ x: x - r * 1.05, y: y - r * 1.05 }, { x: x, y: y - r * 1.4 - 2 * worry }, { x: x + r * 0.95, y: y - r * 1.55 - 4 * worry }], 2.2 + 1.6 * worry, 1, '#1b1a1f', 0.85 * worry);
  }
  // The mouth at the tip of the snout: a line when calm; scared, a worried round "o" with pale lips.
  const open = worry;
  if (open > 0.05) {
    const [mx, my] = [98.5 - open, 5.5 + 1.5 * open];
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(0.35);
    ctx.fillStyle = '#ead8d0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.6 + 2.6 * open, 1.6 + 3.6 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a1820';
    ctx.beginPath();
    ctx.ellipse(0.3, 0.3, 1.6 + 1.9 * open, 0.9 + 2.7 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(0.35);
    inkLine(ctx, Array.from({ length: 17 }, (_, i) => ({ x: Math.cos((i / 16) * Math.PI * 2) * (2.6 + 2.6 * open), y: Math.sin((i / 16) * Math.PI * 2) * (1.6 + 3.6 * open) })), 1.1, 0.8, boil, true);
    ctx.restore();
  } else {
    inkLine(ctx, [{ x: 104, y: 3 }, { x: 98, y: 4.5 }, { x: 92, y: 6 }], 1.1, 0.8, boil);
  }
}
