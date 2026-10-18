import { cloud } from '../../../src/art/backdrop/tropic';
import { swells } from '../../../src/art/backdrop/water';
import { bezier, makeDraw, pt } from '../../../src/art/kit';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { INK, PAPER, PAPER_FILL } from '../../../src/art/palette';
import { VIDEO } from '../short';
import { drawSprite } from '../sprites';
import { CREST_TOP, drawTentacle, type FloatSprites, ROOT_SPAN } from './manowarArt';
import { callout, drawArrow, glowBehind } from './marks';
import { leftFloatAt, type Rider, rightFloatAt, sailLabel, SEA_SCALE, SURFACE, windAt } from './story';

/**
 * Out at sea in the sun: two men o' war bobbing at the surface, mirror
 * images, one's sail leaning left and the other's right, their tentacles
 * hanging down through the water. The wind gets up and blows them apart,
 * each off to its own side. Screen px.
 */
const { width: W, height: H } = VIDEO;
const HORIZON = 600;
const K = 2;
const SEA_FAR = '#62a9d4';
const SEA_DEEP = '#21508c';

export function makeSea(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, '#7fc0e6');
  sky.addColorStop(1, '#dff0ef');
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON);
  ctx.restore();
  // The sun, high on the right.
  const sun = ctx.createRadialGradient(860, 360, 20, 860, 360, 190);
  sun.addColorStop(0, 'rgba(255,250,225,0.95)');
  sun.addColorStop(1, 'rgba(255,250,225,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(600, 160, 460, 420);
  const d = makeDraw(ctx, 5800, 0, 0);
  d.pen.circle(860, 360, 42, 2, INK);
  ctx.save();
  ctx.scale(K, K);
  const far = makeDraw(ctx, 5801, 0, 0);
  cloud(far, 110, 230, 130, 5);
  ctx.restore();
  const sea = ctx.createLinearGradient(0, HORIZON, 0, H);
  sea.addColorStop(0, SEA_FAR);
  sea.addColorStop(0.17, '#4b93c9');
  sea.addColorStop(1, SEA_DEEP);
  ctx.fillStyle = sea;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  d.pen.stroke([pt(0, HORIZON), pt(W, HORIZON)], 1.6, INK, 0.5, false);
  ctx.save();
  ctx.scale(K, K);
  swells(makeDraw(ctx, 5802, 0, 0), HORIZON / K + 6, SURFACE / K - 12);
  ctx.restore();
  // Sunlight broken on the water under the sun.
  for (let k = 0; k < 22; k++) {
    const y = HORIZON + 10 + k * 12;
    const x = 860 + Math.sin(k * 2.7) * (30 + k * 5);
    d.pen.hair([pt(x - 14 - k, y), pt(x + 14 + k, y)], 2, PAPER_FILL, 0.7 - k * 0.025);
  }
  return canvas;
}

/** A float's tentacles, hanging down through the water and swaying. */
function hangingTentacles(r: Rider, facing: number, t: number): Pt[][] {
  return [-30, -16, -4, 10].map((lx, i) => {
    const from = pt(r.x + lx * SEA_SCALE * facing, r.y + (ROOT_SPAN.y + 6) * SEA_SCALE);
    const out: Pt[] = [];
    for (let s = 0; s <= 1100; s += 25) out.push(pt(from.x + 26 * Math.sin(s * 0.009 - t * 1.9 + i * 1.3) * Math.min(1, s / 260) - facing * s * 0.06, from.y + s));
    return out;
  });
}

/** The wind's streaks: from the sky between them, curving out over each float, running as the wind blows. */
function drawWind(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  if (a <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([60, 46]);
  ctx.lineDashOffset = -420 * t;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const path = bezier(pt(540 + side * 18 * k, 360 + 46 * k), pt(540 + side * (60 + 30 * k), 560 + 40 * k), pt(540 + side * (330 + 40 * k), 640 + 36 * k), 16);
      for (const [color, w, al] of [[INK, 9, 0.35], [PAPER_FILL, 5, 0.95]] as const) {
        ctx.globalAlpha = a * al;
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Where a float's crest top is on screen. */
const crestOf = (r: Rider, facing: number): Pt => pt(r.x + (CREST_TOP.x + 14) * SEA_SCALE * facing, r.y + CREST_TOP.y * SEA_SCALE);

export function drawSea(ctx: CanvasRenderingContext2D, base: HTMLCanvasElement, floats: FloatSprites, t: number, boil: number): void {
  ctx.drawImage(base, 0, 0);
  const riders = [[leftFloatAt(t), -1], [rightFloatAt(t), 1]] as const;
  riders.forEach(([r, f], k) => hangingTentacles(r, f, t).forEach((path, i) => drawTentacle(ctx, path, 6, boil, 30 + k * 4 + i, 0.9, 11)));
  // The water over everything below the surface.
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = SEA_DEEP;
  ctx.fillRect(0, SURFACE, W, H - SURFACE);
  ctx.restore();
  riders.forEach(([r, f]) => glowBehind(ctx, r.x + f * 30, r.y - 120, 230, 150, r.hi));
  riders.forEach(([r, f]) => drawSprite(ctx, floats.afloat, boil, { x: r.x, y: r.y + 14, scale: SEA_SCALE, facing: f, rotation: r.rot }));
  // The float's belly just under the surface, and a ring of ripples round it.
  const d = makeDraw(ctx, 5810 + boil, boil, 0);
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#4b93c9';
  ctx.fillRect(0, SURFACE + 6, W, 44);
  ctx.restore();
  for (const [r] of riders) {
    for (const [dx, w] of [[-170, 70], [-80, 60], [70, 70], [160, 60]] as const) {
      const y = SURFACE + 8 + 3 * Math.sin(t * 3 + dx);
      d.pen.hair(bezier(pt(r.x + dx - w / 2, y), pt(r.x + dx, y - 5), pt(r.x + dx + w / 2, y), 6), 2.6, PAPER_FILL, 0.85);
    }
  }
  drawWind(ctx, t, windAt(t));
  // "sail?": both sails named; then which way each leans, as it's said.
  const [[a, fa], [b, fb]] = riders;
  callout(ctx, 'sail', { x: 540, y: 470 }, [crestOf(a, fa), crestOf(b, fb)], sailLabel(t), 92);
  drawArrow(ctx, pt(a.x + 70, a.y - 250), pt(a.x - 120, a.y - 222), -40, a.hi);
  drawArrow(ctx, pt(b.x - 70, b.y - 250), pt(b.x + 120, b.y - 222), 40, b.hi);
}
