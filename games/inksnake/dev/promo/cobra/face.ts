import { makeCanvas } from '../../../src/art/pen';
import { ramp, VIDEO } from '../short';
import { drawSprite, type Pt } from '../sprites';
import { spineOf } from '../pythonbear/python';
import type { Cast } from './cast';
import { COBRA } from './cobraArt';
import { COBRA_SNOUT } from './cobraHead';
import { along, drawHeadOn, drawLaid, drawTongue, type Lay } from './lay';
import { drawMonitor } from './monitor';
import { backOff, BACKED_AT, CUT, FACED_AT, rear, wrap } from './story';

/**
 * "The cobra faced it down, and the lizard backed OFF.": closer, on the mud
 * by the channel in the late light. The king cobra rears, the front of its
 * body standing up off its coils and its head bent forward level at the
 * monitor, the game's own hood (jungleHood.ts) spread behind the neck,
 * narrow as a king cobra's is, seen a little from behind so its pale
 * chevrons show over the neck. The monitor, side on, head up and tongue tasting, holds;
 * on "backed" it backs away to the right, legs walking backwards.
 */
const CO_W = 112;
const ZOOM = 1.45;
const FOCUS = { x: 560, y: 1180 } as const;

const LOW: readonly Pt[] = [
  { x: 470, y: 1410 }, { x: 400, y: 1415 }, { x: 330, y: 1422 }, { x: 270, y: 1432 }, { x: 220, y: 1445 }, { x: 170, y: 1460 },
  { x: 120, y: 1480 }, { x: 60, y: 1500 }, { x: -60, y: 1520 }, { x: -200, y: 1528 }, { x: -400, y: 1532 },
];
const HIGH: readonly Pt[] = [
  { x: 420, y: 820 }, { x: 340, y: 826 }, { x: 276, y: 880 }, { x: 252, y: 1000 }, { x: 258, y: 1150 }, { x: 300, y: 1300 },
  { x: 340, y: 1420 }, { x: 250, y: 1500 }, { x: 70, y: 1530 }, { x: -150, y: 1534 }, { x: -400, y: 1536 },
];

/** The cobra's body from its head back, rearing by `r` (0 low .. 1 up), swaying a little once up. */
export function cobraRear(r: number, sway: number): Lay {
  const knots = LOW.map((p, i) => {
    const q = HIGH[i]!;
    const w = i < 5 ? sway * (1 - i / 5) : 0;
    return { x: p.x + (q.x - p.x) * r + w * 14, y: p.y + (q.y - p.y) * r + w * 4 };
  });
  const spine = spineOf(knots, 3);
  return { spine, widths: spine.map((_, i) => CO_W * (i < 4 ? 0.95 : 1)), base: CO_W, headRight: true };
}

let layer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

/**
 * The narrow hood over the raised neck: the game's hood, turned up the neck
 * and squeezed as seen a little from behind, on its own layer so its front
 * melts away under the head.
 */
function drawHood(ctx: CanvasRenderingContext2D, cast: Cast, l: Lay, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  const top = along(l.spine, 40);
  const low = along(l.spine, 260);
  const rot = Math.atan2(top.y - low.y, top.x - low.x);
  const scale = CO_W / 24;
  layer ??= makeCanvas(VIDEO.width, VIDEO.height);
  const g = layer.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, VIDEO.width, VIDEO.height);
  g.translate(top.x, top.y);
  g.rotate(rot);
  g.scale(1, 0.55 + 0.3 * alpha);
  drawSprite(g, cast.hood, boil, { x: 0, y: 0, scale });
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(-30 * scale, 0, -16 * scale, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade;
  g.fillRect(-40 * scale, -60 * scale, 80 * scale, 120 * scale);
  g.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

export function drawFace(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  // Pushed in on the two of them: the reared cobra on the left, the monitor's head on the right.
  ctx.save();
  ctx.translate(540, 1150);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-FOCUS.x, -FOCUS.y);
  ctx.drawImage(cast.faceBg, 0, 0, VIDEO.width, VIDEO.height);
  const r = rear(t);
  const sway = r * Math.sin((u - CUT.face) * 2.6) * 0.6;
  const l = cobraRear(r, sway);
  const hood = ramp(u, FACED_AT - 0.3, FACED_AT + 0.3);
  drawLaid(ctx, cast.cobra, boil, l, COBRA.line, 0.6);
  drawHood(ctx, cast, l, boil, hood);
  const lift = 0.15 * (1 - r);
  drawHeadOn(ctx, cast.cobraHead.shut, boil, l, lift);
  const flick = (u - CUT.face) % 0.8;
  drawTongue(ctx, l, COBRA_SNOUT.x, lift, flick < 0.24 ? Math.sin((flick / 0.24) * Math.PI) : 0);
  // The monitor, holding, then backing off to the right from "backed".
  const b = backOff(t);
  const tongue = u < BACKED_AT ? Math.max(0, Math.sin(((u - CUT.face) / 0.7) * Math.PI * 2)) : 0;
  drawMonitor(ctx, { x: 820 + 300 * b, y: 1500 }, 3.6, -1, { gait: -2.4 * b, lift: 0.42 - 0.25 * b, tongue, sway: u * 1.2 }, boil);
  ctx.restore();
}
