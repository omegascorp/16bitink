import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { lerp, ramp, VIDEO } from '../short';
import { TAG_AT } from './dive';
import { drawSnow, drawVignette, drawWater, glow, type Rgb } from './sea';
import { cycles, INSIDE_AT, IT_AT, STOMACH_AT, wrap } from './story';
import { drawShark, drawTag, poseWith, TAG_ON_FIN } from './tag';

/**
 * "It was inside something's stomach": pulling back from the glowing tag,
 * it's inside a huge dark body that fills the frame, seen as in an X-ray:
 * the stomach a faint warm sac, the swallowed shark a pale ghost curled in
 * it, the tag on its fin still glowing. The body has no head, fins or tail
 * in frame: nothing to tell what it is.
 */

const EERIE_TOP: Rgb = [70, 24, 52];
const EERIE_MID: Rgb = [36, 12, 32];
const EERIE_BOTTOM: Rgb = [4, 1, 5];

const TOP: readonly Pt[] = [{ x: -300, y: 330 }, { x: 60, y: 350 }, { x: 400, y: 395 }, { x: 760, y: 440 }, { x: 1100, y: 490 }, { x: 1400, y: 540 }];
const UNDER: readonly Pt[] = [{ x: 1400, y: 1120 }, { x: 1100, y: 1190 }, { x: 760, y: 1250 }, { x: 400, y: 1280 }, { x: 60, y: 1300 }, { x: -300, y: 1310 }];

function curve(ctx: CanvasRenderingContext2D, pts: readonly Pt[], move: boolean): void {
  if (move) ctx.moveTo(pts[0]!.x, pts[0]!.y);
  else ctx.lineTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  ctx.lineTo(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y);
}

function bodyPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  curve(ctx, TOP, true);
  curve(ctx, UNDER, false);
  ctx.closePath();
}

const SAC = { x: 530, y: 840, rx: 360, ry: 235 } as const;

let ghost: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
let skins: HTMLCanvasElement[] | null = null;

function makeSkins(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(VIDEO.width, 1000);
    const pen = new Pen(ctx, 7301 + f * 977, 1.4);
    const box = [{ x: 0, y: 0 }, { x: VIDEO.width, y: 0 }, { x: VIDEO.width, y: 1000 }, { x: 0, y: 1000 }];
    pen.hatch(box, 14, 0.25, 1.2, { color: '#000000', alpha: 0.35 });
    pen.hatch(box, 26, 1.9, 1, { color: '#2a1020', alpha: 0.2 });
    return canvas;
  });
}

export function drawBelly(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, boil: number): void {
  const u = wrap(t);
  drawWater(ctx, sheet, EERIE_TOP, EERIE_MID, EERIE_BOTTOM);
  drawSnow(ctx, t, '#f0d6e6', 0.6);
  const k = lerp(3.2, 1, ramp(u, IT_AT - 0.05, INSIDE_AT + 0.35));
  const pulse = 1 + 0.12 * Math.sin(cycles(26, t));
  ctx.save();
  ctx.translate(TAG_AT.x, TAG_AT.y);
  ctx.scale(k, k);
  ctx.translate(-TAG_AT.x, -TAG_AT.y);
  // The body: near black, hatched, a dull red rim along its back and belly.
  skins ??= makeSkins();
  ctx.save();
  bodyPath(ctx);
  const g = ctx.createLinearGradient(0, 400, 0, 1240);
  g.addColorStop(0, '#120a12');
  g.addColorStop(0.5, '#07040a');
  g.addColorStop(1, '#0c060b');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.drawImage(skins[boil % skins.length]!, 0, 330);
  // The stomach, lit from within.
  const sac = ctx.createRadialGradient(SAC.x, SAC.y, 0, SAC.x, SAC.y, SAC.rx);
  sac.addColorStop(0, `rgba(190,70,40,${0.32 * pulse})`);
  sac.addColorStop(0.7, `rgba(120,30,30,${0.2 * pulse})`);
  sac.addColorStop(1, 'rgba(60,10,20,0)');
  ctx.fillStyle = sac;
  ctx.fillRect(0, 300, VIDEO.width, 1000);
  ctx.restore();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(205,120,140,0.5)';
  ctx.lineWidth = 3;
  bodyPath(ctx);
  ctx.stroke();
  // X-ray lines: the sac's wall, faint, doubled.
  ctx.strokeStyle = 'rgba(190,230,255,0.4)';
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.ellipse(SAC.x, SAC.y, SAC.rx, SAC.ry, -0.05, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(190,230,255,0.18)';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();
  // The swallowed shark: a pale ghost, curled a little, the tag on its fin.
  ghost ??= makeCanvas(VIDEO.width, VIDEO.height);
  const gc = ghost.ctx;
  gc.setTransform(1, 0, 0, 1, 0, 0);
  gc.clearRect(0, 0, VIDEO.width, VIDEO.height);
  const pose = poseWith(TAG_AT, TAG_ON_FIN, 560, -0.12, false);
  drawShark(gc, pose, t, { tail: 1.2 }, null);
  ctx.save();
  ctx.filter = 'grayscale(1) invert(1) contrast(1.3)';
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.32 * ramp(u, IT_AT + 0.2, INSIDE_AT + 0.5);
  ctx.drawImage(ghost.canvas, 0, 0);
  ctx.restore();
  ctx.restore();
  // The tag, still glowing.
  const tagLen = 78 * 0.56 * k;
  drawTag(ctx, TAG_AT.x, TAG_AT.y, tagLen, Math.PI - 0.12 + 0.08, { glow: 0.85 * pulse * (0.8 + 0.2 * ramp(u, STOMACH_AT - 0.3, STOMACH_AT)) });
  glow(ctx, TAG_AT.x, TAG_AT.y, 140, '255,150,90', 0.25 * pulse);
  drawVignette(ctx, 0.7, '8,0,6');
}
