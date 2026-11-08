import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { PAPER } from '../../../src/art/pen';
import type { TextInk } from '../captions';
import { VIDEO } from '../short';
import { css, drawSnow, drawWater, type Rgb } from './sea';
import { type Grade, toScreen, type View } from './story';

/**
 * The floodlit seabed 1,500 ft down: black water over the game's paper, the
 * cone of the ROV's floodlight from above-left, marine snow drifting through
 * it, the rock the swordfish lies on, and the mood's colour grade.
 */

export const INK_BG = '#03070c';
export const SPOKEN = '#f5c84a';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };
export const CHALK = '#e6eef0';

const DEEP_TOP: Rgb = [9, 17, 28];
const DEEP_MID: Rgb = [4, 9, 16];
const DEEP_BOTTOM: Rgb = [1, 3, 7];

/** Black water, the floodlight's glow in it, and the snow. */
export function drawDeepWater(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, v: View, t: number): void {
  drawWater(ctx, sheet, DEEP_TOP, DEEP_MID, DEEP_BOTTOM);
  drawCone(ctx);
  // The snow sinks slowly; it drifts against the camera a little, so it reads as deep water.
  drawSnow(ctx, t, '#e8eef2', 1.25, -v.y * 0.35 + v.x * 0.0);
}

/** Where the floodlight comes from (off the top left) and where it points. */
const LAMP: Pt = { x: -160, y: -260 };
const AIM = Math.atan2(1500, 820);
const SPREAD = 0.36;
const REACH = 2400;

/** The floodlight's cone, lit water scattering it. */
function drawCone(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(LAMP.x, LAMP.y, 60, LAMP.x, LAMP.y, REACH);
  g.addColorStop(0, 'rgba(225,235,240,0.42)');
  g.addColorStop(0.35, 'rgba(170,195,210,0.2)');
  g.addColorStop(1, 'rgba(120,150,170,0)');
  ctx.fillStyle = g;
  for (const [spread, alpha] of [[SPREAD, 0.55], [SPREAD * 0.62, 0.6], [SPREAD * 0.3, 0.5]] as const) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(LAMP.x, LAMP.y);
    ctx.lineTo(LAMP.x + Math.cos(AIM - spread) * REACH, LAMP.y + Math.sin(AIM - spread) * REACH);
    ctx.lineTo(LAMP.x + Math.cos(AIM + spread) * REACH, LAMP.y + Math.sin(AIM + spread) * REACH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Everything outside the floodlight sinks into the dark. */
export function drawFalloff(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(LAMP.x, LAMP.y, 700, LAMP.x + 200, LAMP.y + 300, 2500);
  g.addColorStop(0, 'rgba(1,3,6,0)');
  g.addColorStop(1, 'rgba(1,3,6,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

// ---------------------------------------------------------------- the rock

/** The seabed sheet, world px: x from ROCK.left, y from ROCK.top (its ridge is near y 0). */
const ROCK = { left: -1700, top: -170, width: 3400, height: 1100 } as const;

const ridgeY = (x: number): number => {
  const flat = Math.exp(-(((x - 260) / 520) ** 2));
  const rough = 26 * Math.sin(x / 140 + 1.2) + 14 * Math.sin(x / 61) + 40 * Math.sin(x / 410 - 0.6);
  return 4 + rough * (1 - 0.8 * flat) - 50 * Math.max(0, Math.abs(x - 260) / 900 - 0.6);
};

/** The rock in ink and wash, one canvas per boil frame. */
export function makeRock(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(ROCK.width, ROCK.height);
    ctx.translate(-ROCK.left, -ROCK.top);
    const pen = new Pen(ctx, 707 + f * 31, 1.6);
    const ridge: Pt[] = [];
    for (let x = ROCK.left; x <= ROCK.left + ROCK.width; x += 24) ridge.push({ x, y: ridgeY(x) });
    const body = [...ridge, { x: ROCK.left + ROCK.width, y: ROCK.top + ROCK.height }, { x: ROCK.left, y: ROCK.top + ROCK.height }];
    // Dark basalt, catching the light along its top.
    const g = ctx.createLinearGradient(0, -60, 0, 700);
    g.addColorStop(0, '#7a7366');
    g.addColorStop(0.1, '#4a463f');
    g.addColorStop(0.45, '#24221f');
    g.addColorStop(1, '#0b0a0a');
    pen.fill(body, '#000', 1);
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.fill();
    ctx.restore();
    pen.hatch(body, 11, 0.62, 0.9, { color: INK, alpha: 0.45 });
    pen.hatch(body, 17, -0.5, 0.7, { color: INK, alpha: 0.25, onlyBelow: 60 });
    pen.stipple(body, 7000, (_x, y) => Math.min(1, 0.25 + y / 500), 1.1, INK);
    // Boulders and ledges along the ridge, lit from the upper left.
    const rng = pen.rng;
    for (let i = 0; i < 34; i++) {
      const x = ROCK.left + 60 + rng() * (ROCK.width - 120);
      if (Math.abs(x - 260) < 300 && rng() < 0.7) continue;
      const y = ridgeY(x) + 6 + rng() * 26;
      const rx = 30 + rng() * 70;
      const ry = rx * (0.4 + rng() * 0.3);
      const stone = ellipse2(x, y, rx, ry, rng() * 0.4 - 0.2);
      pen.fill(stone, '#34312c', 1);
      pen.fill(ellipse2(x - rx * 0.25, y - ry * 0.35, rx * 0.6, ry * 0.4, 0), '#6a645a', 0.45);
      pen.hatch(stone, 7, 0.9, 0.7, { color: INK, alpha: 0.4, onlyBelow: y });
      pen.stroke([...stone, stone[0]!], 1.8, INK, 0.9);
    }
    // The ridge line, inked twice, and pale silt dusting the top.
    pen.stroke(ridge, 3.2, INK, 1);
    for (let i = 0; i < 260; i++) {
      const x = ROCK.left + rng() * ROCK.width;
      pen.dot(x, ridgeY(x) + 2 + rng() * 10, 1 + rng() * 1.6, '#d8d0bb', 0.55);
    }
    return canvas;
  });
}

function ellipse2(cx: number, cy: number, rx: number, ry: number, rot: number): Pt[] {
  return Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return { x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) };
  });
}

export function drawRock(ctx: CanvasRenderingContext2D, rock: readonly HTMLCanvasElement[], v: View, boil: number): void {
  const p = toScreen(v, { x: ROCK.left, y: ROCK.top });
  if (p.y > VIDEO.height) return;
  ctx.drawImage(rock[boil % rock.length]!, p.x, p.y, ROCK.width * v.zoom, ROCK.height * v.zoom);
}

// ---------------------------------------------------------------- grade

/** The mood's colour over the frame (soft light), and the dark closing in at the edges. */
export function drawGrade(ctx: CanvasRenderingContext2D, g: Grade): void {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = Math.min(1, g.strength * 1.2);
  ctx.fillStyle = css(g.rgb);
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = g.strength * 0.12;
  ctx.fillStyle = css(g.rgb);
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  const v = ctx.createRadialGradient(VIDEO.width / 2, 800, 360, VIDEO.width / 2, 860, 1250);
  v.addColorStop(0, 'rgba(1,3,7,0)');
  v.addColorStop(1, `rgba(1,3,7,${g.vignette.toFixed(3)})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
