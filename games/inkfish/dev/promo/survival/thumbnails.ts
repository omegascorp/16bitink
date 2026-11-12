import { ANATOMY } from '../../../src/art/fish/registry';
import { makeCanvas } from '../../../src/art/pen';
import type { Pose } from '../chain';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { arrow, caption, divider, FULL, RED, RED_MOUTH, sticker, water, YELLOW, type Rect } from '../thumbnailKit';
import { drawPosed } from './scene';
import { prepareSprites, type FishId } from './species';

/**
 * The thumbnails for the eighth long-form video, "100 Fish Enter a Survival
 * Tournament… Only One Can Win" (script.md's Packaging: Test & Compare takes
 * three of the four). Captions in the cartoon face, X not ×.
 * - crowd: a packed, colourful tank, every fish under a red OUT stamp, the
 *          rivulus big in full colour on a yellow glow, "100 → 1";
 * - shock: the great white's open mouth with a red OUT across it, the
 *          rivulus smug in the corner, "ROUND 1?!";
 * - ends:  the two-ends split: the rivulus tiny on a big ruler, "2 IN" |
 *          the great white's mouth cropped by the frame, "180 IN";
 * - final: the mudskipper | the rivulus facing each other, "VS", "FINAL";
 * - roster: the 11 contestant cards tiny → giant, 10 crossed out, one face down
 *           with a glowing "?", "WHO WINS?";
 * - trophy: a gold trophy ringed by four faces, the great white and the
 *           goldfish crossed out, "ONLY 1 WINS";
 * - podium: a "?" silhouette on the gold step in a spotlight, the great white
 *           OUT at the podium's foot, "1ST OUT?!".
 */
export const SURVIVAL_THUMBNAILS = ['crowd', 'shock', 'ends', 'final', 'roster', 'trophy', 'podium'] as const;
export type SurvivalThumbnail = (typeof SURVIVAL_THUMBNAILS)[number];

const W = 1280;
const H = 720;
const STAMP_FONT = '"Luckiest Guy"';

const fish = (id: FishId, x: number, y: number, len: number, facing: 1 | -1, more: Parameters<typeof drawPosed>[8] = {}) =>
  (c: CanvasRenderingContext2D): void => drawPosed(c, id, x, y, len, facing, 0.4, 0, { effort: 0.5, ...more });

/** A rubber stamp in the cartoon face, for the thumbnails. */
function stamp(ctx: CanvasRenderingContext2D, text: string, colour: string, x: number, y: number, size: number, rot = -0.14): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `400 ${size}px ${STAMP_FONT}`;
  const w = ctx.measureText(text).width + size * 0.8;
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = '#000';
  ctx.strokeRect(-w / 2 - 4, -size * 0.68 - 4, w + 8, size * 1.36 + 8);
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.09;
  ctx.strokeRect(-w / 2, -size * 0.68, w, size * 1.36);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(text, 0, size * 0.06);
  ctx.fillStyle = colour;
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
}

/** The great white for thumbnails: the game's shark in its smooth 'light' ink, a grey-blue back over its white belly. */
let shark: Sprite | null = null;
function greatWhite(x: number, y: number, len: number, facing: 1 | -1, jaw: number) {
  return (c: CanvasRenderingContext2D): void => {
    shark ??= makeSprite('shark', 6, 'light', { ...ANATOMY.shark, wash: '#6f93b4' });
    const pose: Pose = { j: 0, age: 0, shape: 'shark', x, y, length: len, facing, tilt: 0.04 * facing, beat: 0.6, effort: 0.4 };
    drawSwimmer(c, shark, pose, 0, { jaw, mouth: { ...RED_MOUTH, teeth: true } });
  };
}

/** The rivulus as the star: big, its own bright eye, on a yellow glow, stickered so it lifts off the water. */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, facing: 1 | -1, clip?: Rect, reach = 0.85): void {
  const glow = ctx.createRadialGradient(x, y, len * 0.1, x, y, len * reach);
  glow.addColorStop(0, 'rgba(255,226,80,0.95)');
  glow.addColorStop(0.55, 'rgba(255,210,31,0.45)');
  glow.addColorStop(1, 'rgba(255,210,31,0)');
  ctx.save();
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
  }
  ctx.fillStyle = glow;
  ctx.fillRect(x - len, y - len, len * 2, len * 2);
  ctx.restore();
  sticker(ctx, fish('rivulus', x, y, len, facing), { outline: 6, clip });
}

const CROWD: readonly [FishId, number, number, number, 1 | -1][] = [
  ['mako', 200, 130, 360, 1], ['cod', 1100, 130, 260, -1], ['salmon', 1120, 400, 260, -1], ['icefish', 170, 400, 230, 1],
  ['eel', 330, 610, 260, 1], ['goldfish', 1010, 600, 170, -1], ['pupfish', 190, 250, 120, 1], ['goldfish', 620, 110, 140, 1],
  ['tuna', 430, 250, 150, 1], ['yellowfin', 860, 240, 150, -1], ['bluefin', 1210, 250, 140, -1], ['bigeye', 760, 560, 130, -1],
  ['pupfish', 1180, 560, 110, -1], ['albacore', 90, 560, 130, 1], ['salmon', 520, 470, 200, 1],
];

function drawCrowd(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 40 });
  for (const [id, x, y, len, facing] of CROWD) sticker(ctx, fish(id, x, y, len, facing, { expr: 'squeeze' }), { outline: 3 });
  for (const [, x, y, len] of CROWD) stamp(ctx, 'OUT', RED, x, y, len > 200 ? 52 : 40);
  star(ctx, 650, 370, 540, -1, undefined, 0.6);
  caption(ctx, '100', 470, 635, 120, 300, '#ffffff', 'cartoon');
  arrow(ctx, 640, 635, 70);
  caption(ctx, '1', 790, 635, 130, 200, YELLOW, 'cartoon');
}

function drawShock(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 900, y: 40 });
  sticker(ctx, greatWhite(860, 400, 1900, -1, 1), { outline: 6 });
  stamp(ctx, 'OUT', RED, 560, 330, 160);
  star(ctx, 1080, 600, 330, -1);
  caption(ctx, 'ROUND 1?!', 640, 92, 130, 1100, YELLOW, 'cartoon');
}

/** A chunky yellow ruler with inch marks, for the "ends" split. */
function ruler(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.save();
  ctx.fillStyle = YELLOW;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.fillRect(x, y, w, 70);
  ctx.strokeRect(x, y, w, 70);
  for (let i = 0; i <= 8; i++) {
    const xx = x + 20 + i * ((w - 40) / 8);
    ctx.beginPath();
    ctx.moveTo(xx, y);
    ctx.lineTo(xx, y + (i % 2 ? 22 : 40));
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnds(ctx: CanvasRenderingContext2D): void {
  const SPLIT = 560;
  const left: Rect = { x: 0, y: 0, width: SPLIT, height: H };
  const right: Rect = { x: SPLIT, y: 0, width: W - SPLIT, height: H };
  water(ctx, left, { x: 280, y: 60 });
  water(ctx, right, { x: 900, y: 60 });
  ruler(ctx, 50, 520, 460);
  star(ctx, 280, 430, 330, -1, left);
  sticker(ctx, greatWhite(1640, 430, 2300, -1, 1), { outline: 6, clip: right });
  divider(ctx, SPLIT);
  caption(ctx, '2 IN', SPLIT / 2, 110, 140, SPLIT - 60, '#ffffff', 'cartoon');
  caption(ctx, '180 IN', 920, 100, 150, 620, YELLOW, 'cartoon');
}

function drawFinalThumb(ctx: CanvasRenderingContext2D): void {
  const left: Rect = { x: 0, y: 0, width: W / 2, height: H };
  const right: Rect = { x: W / 2, y: 0, width: W / 2, height: H };
  water(ctx, left, { x: 320, y: 60 });
  water(ctx, right, { x: 960, y: 60 });
  sticker(ctx, fish('mudskipper', 290, 440, 500, 1), { outline: 6, clip: left });
  star(ctx, 1000, 440, 480, -1, right, 0.7);
  divider(ctx, W / 2);
  caption(ctx, 'VS', W / 2, 600, 130, 220, '#ffffff', 'cartoon');
  caption(ctx, 'FINAL', W / 2, 92, 140, 700, YELLOW, 'cartoon');
}

/** A red X, black-edged, over (x, y); `weight` 1 is fat, lower lets the picture under it show. */
function crossOut(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, weight = 1): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, w] of [['#000', r * 0.42 * weight], [RED, r * 0.28 * weight]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.moveTo(x + r, y - r);
    ctx.lineTo(x - r, y + r);
    ctx.stroke();
  }
  ctx.restore();
}

/** A contestant card: paper, a blue window with the fish's face, its number. */
function card(ctx: CanvasRenderingContext2D, id: FishId, no: number, x: number, y: number, w: number, rot: number): void {
  const h = w * 1.3;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,10,40,0.5)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fff6e2';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.08);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(3, w * 0.035);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(-w * 0.42, -h * 0.42, w * 0.84, h * 0.66);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#3cc8f2';
  ctx.fillRect(-w, -h, w * 2, h * 2);
  const len = id === 'eel' ? w * 1.6 : id === 'white' || id === 'mako' ? w * 2.1 : w * 1.05;
  drawPosed(ctx, id, len * 0.2, -h * 0.09, len, -1, 0.4, 0, { effort: 0.3 });
  ctx.restore();
  ctx.stroke();
  ctx.font = `400 ${Math.round(w * 0.26)}px ${STAMP_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(`NO.${no}`, 0, h * 0.37);
  ctx.restore();
}

/** A card face down: a red back with a glowing yellow "?". */
function mystery(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  const h = w * 1.3;
  const glow = ctx.createRadialGradient(x, y, w * 0.2, x, y, w * 1.3);
  glow.addColorStop(0, 'rgba(255,226,80,0.95)');
  glow.addColorStop(1, 'rgba(255,210,31,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - w * 1.4, y - w * 1.4, w * 2.8, w * 2.8);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.05);
  ctx.fillStyle = RED;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = w * 0.04;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#fff6e2';
  ctx.lineWidth = w * 0.03;
  ctx.strokeRect(-w * 0.4, -h * 0.42, w * 0.8, h * 0.84);
  ctx.restore();
  caption(ctx, '?', x, y + w * 0.05, w * 0.95, w, YELLOW, 'cartoon');
}

const ROSTER: readonly FishId[] = ['pupfish', 'mudskipper', 'rivulus', 'goldfish', 'eel', 'icefish', 'salmon', 'tuna', 'cod', 'mako', 'white'];

function drawRoster(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 40 });
  // Two rows, tiny → giant: the first six small across the top, the last five bigger below.
  const widths = ROSTER.map((_, i) => (i < 6 ? 92 + i * 17 : 182 + (i - 6) * 18));
  const rowX = (from: number, to: number, gap: number): number[] => {
    const ws = widths.slice(from, to);
    const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
    let x = 640 - total / 2;
    return ws.map((w) => {
      const c = x + w / 2;
      x += w + gap;
      return c;
    });
  };
  const xs = [...rowX(0, 6, 40), ...rowX(6, 11, 22)];
  const spots = ROSTER.map((_, i) => ({ x: xs[i]!, y: i < 6 ? 285 : 540, w: widths[i]!, rot: (((i * 37) % 7) - 3) * 0.02 }));
  ROSTER.forEach((id, i) => {
    const s = spots[i]!;
    if (id === 'rivulus') mystery(ctx, s.x, s.y, s.w * 1.15);
    else {
      card(ctx, id, i + 1, s.x, s.y, s.w, s.rot);
      crossOut(ctx, s.x, s.y - s.w * 0.08, s.w * 0.42, 0.5);
    }
  });
  caption(ctx, 'WHO WINS?', 640, 86, 130, 1100, YELLOW, 'cartoon');
}

/** A gold trophy cup, inked, with painterly highlights. */
function trophy(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const gold = ctx.createLinearGradient(x - s, 0, x + s, 0);
  gold.addColorStop(0, '#a8650a');
  gold.addColorStop(0.3, '#ffe27a');
  gold.addColorStop(0.55, '#f2b52a');
  gold.addColorStop(1, '#9a5a08');
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = s * 0.06;
  // Handles.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * s * 0.78, y - s * 0.45, s * 0.32, s * 0.36, 0, 0, Math.PI * 2);
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.lineWidth = s * 0.09;
    ctx.strokeStyle = '#e8a51e';
    ctx.stroke();
  }
  ctx.lineWidth = s * 0.06;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = gold;
  // The cup.
  ctx.beginPath();
  ctx.moveTo(x - s * 0.8, y - s * 0.95);
  ctx.lineTo(x + s * 0.8, y - s * 0.95);
  ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.15, x + s * 0.14, y + s * 0.3);
  ctx.lineTo(x - s * 0.14, y + s * 0.3);
  ctx.quadraticCurveTo(x - s * 0.8, y + s * 0.15, x - s * 0.8, y - s * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Stem and base.
  ctx.beginPath();
  ctx.rect(x - s * 0.12, y + s * 0.3, s * 0.24, s * 0.35);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x - s * 0.5, y + s * 0.62, s, s * 0.2, s * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5a3418';
  ctx.beginPath();
  ctx.roundRect(x - s * 0.62, y + s * 0.8, s * 1.24, s * 0.26, s * 0.05);
  ctx.fill();
  ctx.stroke();
  // Shine.
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#fff8d8';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.42, y - s * 0.45, s * 0.1, s * 0.38, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  caption(ctx, '1', x, y - s * 0.38, s * 0.8, s, '#ffffff', 'cartoon');
}

function drawTrophy(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 60 });
  const rays = ctx.createRadialGradient(640, 400, 40, 640, 400, 420);
  rays.addColorStop(0, 'rgba(255,240,170,0.9)');
  rays.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = rays;
  ctx.fillRect(0, 0, W, H);
  sticker(ctx, greatWhite(-120, 250, 960, 1, 1), { outline: 6 });
  sticker(ctx, fish('goldfish', 1100, 250, 330, -1), { outline: 6 });
  sticker(ctx, fish('mudskipper', 200, 590, 340, 1), { outline: 6 });
  star(ctx, 1080, 580, 320, -1);
  trophy(ctx, 640, 420, 230);
  crossOut(ctx, 250, 250, 110);
  crossOut(ctx, 1100, 250, 100);
  caption(ctx, 'ONLY 1 WINS', 640, 80, 120, 1100, YELLOW, 'cartoon');
}

/** A fish's shape filled in near-black (the "who?" on the gold step). */
function silhouette(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void): void {
  const { canvas, ctx: c } = makeCanvas(W, H);
  draw(c);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = '#141c2c';
  c.fillRect(0, 0, W, H);
  ctx.drawImage(canvas, 0, 0);
}

function drawPodium(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 30 });
  // The spotlight on the top step.
  const cone = ctx.createLinearGradient(0, 0, 0, 480);
  cone.addColorStop(0, 'rgba(255,240,180,0.85)');
  cone.addColorStop(1, 'rgba(255,240,180,0.15)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(560, 0);
  ctx.lineTo(720, 0);
  ctx.lineTo(860, 470);
  ctx.lineTo(420, 470);
  ctx.closePath();
  ctx.fill();
  // The podium.
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 8;
  for (const [x, top, w, fill, n] of [[640, 470, 300, YELLOW, '1'], [340, 560, 280, '#e3e6ea', '2'], [940, 610, 280, '#e8a060', '3']] as const) {
    ctx.fillStyle = fill;
    ctx.fillRect(x - w / 2, top, w, H - top + 10);
    ctx.strokeRect(x - w / 2, top, w, H - top + 10);
    caption(ctx, n, x, top + 70, 90, 120, '#ffffff', 'cartoon');
  }
  ctx.restore();
  silhouette(ctx, fish('rivulus', 640, 400, 300, -1));
  caption(ctx, '?', 640, 300, 150, 160, YELLOW, 'cartoon');
  // The great white flat out at the foot, mouth open.
  sticker(ctx, greatWhite(1040, 600, 860, -1, 1), { outline: 6 });
  stamp(ctx, 'OUT', RED, 930, 520, 110);
  caption(ctx, '1ST OUT?!', 640, 86, 130, 1100, YELLOW, 'cartoon');
}

export async function drawSurvivalThumbnail(ctx: CanvasRenderingContext2D, id: SurvivalThumbnail): Promise<void> {
  prepareSprites();
  ctx.clearRect(0, 0, W, H);
  if (id === 'crowd') drawCrowd(ctx);
  else if (id === 'shock') drawShock(ctx);
  else if (id === 'ends') drawEnds(ctx);
  else if (id === 'final') drawFinalThumb(ctx);
  else if (id === 'roster') drawRoster(ctx);
  else if (id === 'trophy') drawTrophy(ctx);
  else drawPodium(ctx);
}
