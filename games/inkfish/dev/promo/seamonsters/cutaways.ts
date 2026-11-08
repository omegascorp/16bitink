import { INK } from '../../../src/art/pen';
import { drawOarfish } from '../oarfish/ribbon';
import { smooth } from '../short';
import { boilOf } from '../swallowyou/art/ink';
import type { Sea } from '../swallowyou/sea';
import { vignette } from '../swallowyou/sea';
import { drawSquid } from '../swallowyou/squid';
import { drawPop, drawText, INK_ON_PAPER, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { drawBaskingShark, drawPlesiosaurOutline } from './art/baskingShark';
import { drawLegend } from './art/legends';
import { drawMonster } from './cast';
import { drawFiltered } from './fx';
import { drawSiphonophoreAlong, drawZooidCloseUp, spiralPath, zooidPoints } from './art/siphonophore';
import { H, W } from './lineup';
import { sectionStart, T } from './timeline';

/**
 * The cut-aways: while one is on it fills the frame instead of the line-up.
 * The oarfish standing on its tail, the basking shark rotting into a
 * "plesiosaur", the first deep-sea film of a giant squid (2012), the Essex
 * rammed, the crew's three months adrift, Moby-Dick, the ROV's spiral in the
 * dark (2020), and the siphonophore's clones under a lens.
 */

const s = sectionStart;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export interface Cut {
  readonly from: number;
  readonly to: number;
  readonly draw: (ctx: CanvasRenderingContext2D, sea: Sea, t: number) => void;
  /** It's laid over the stage (which stays drawn under it) instead of replacing it. */
  readonly over?: boolean;
}

/** The oarfish turned on its tail, head up, its crest swaying, in cold blue. */
function drawUpright(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'cold', t);
  const turn = smooth((t - T.straightUp + 0.1) / 0.7);
  const metres = 8;
  const zoom = 1250 / metres;
  const heading = -Math.PI / 2 * (0.25 + 0.75 * turn);
  const pose = { x: 0, y: 0, heading, length: metres, amp: 0.04, waves: 1.4, phase: t * 1.4, curve: 0.15 * (1 - turn), fin: t * 3.4, crest: t * 0.9, limp: 0 };
  drawOarfish(ctx, pose, { x: 0, y: 0, zoom, dx: 1180 - 540, dy: 90 - 960 + 30 * Math.sin(t * 0.8) }, { boil: boilOf(t) });
  drawText(ctx, 'swims standing straight up', { x: 640, y: 540, size: 76, maxWidth: 820 }, 700, smooth((t - T.straightUp) / 0.3), PAPER_ON_INK);
}

/** The basking shark big and side on; its jaw and gills rot away and it becomes the "plesiosaur". */
function drawRot(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'paper', t);
  const rot = smooth((t - T.jaw) / Math.max(1, T.plesiosaur - T.jaw + 0.4));
  drawBaskingShark(ctx, 1700, 560, 1500, 1, t, { gape: 0.15 * (1 - rot), rot });
  const outline = smooth((t - T.plesiosaur) / 0.5);
  if (outline > 0) drawPlesiosaurOutline(ctx, 1700, 560, 1500, 1, outline);
  drawText(ctx, 'when one rots…', { x: 960, y: 140, size: 84, maxWidth: 1400 }, 700, 1 - smooth((t - T.plesiosaur) / 0.3), INK_ON_PAPER);
  drawText(ctx, 'jaw and gills fall away first', { x: 960, y: 960, size: 64, maxWidth: 1400 }, 700, smooth((t - T.jaw) / 0.3) * (1 - smooth((t - T.plesiosaur) / 0.3)), INK_ON_PAPER);
  drawPop(ctx, 'a "plesiosaur"', 960, 150, 110, t, T.plesiosaur, s(7) - 0.5, INK_ON_PAPER);
}

/** A grainy deep-sea camera frame: black water, a timestamp, an arm crossing the lights. */
function drawDeepCam(ctx: CanvasRenderingContext2D, _sea: Sea, t: number): void {
  ctx.fillStyle = '#05080c';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 40, W * 0.5, H * 0.45, 900);
  g.addColorStop(0, 'rgba(110,140,150,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const u = (t - T.y2012 + 0.5) / (T.dark - T.y2012 + 0.5);
  drawFiltered(ctx, 'grayscale(0.7) contrast(1.2) blur(1.5px)', 0.7, (c) => drawSquid(c, 2300 - 1500 * u, 520 + 60 * Math.sin(t), 1400, -0.12, t));
  // Scan lines and noise.
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000';
  for (let y = (t * 120) % 6; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#dfe8ea';
  for (let i = 0; i < 260; i++) {
    const n = Math.sin(i * 91.7 + Math.floor(t * 24) * 13.1) * 43758.5453;
    const x = (n - Math.floor(n)) * W;
    const m = Math.sin(i * 17.3 + Math.floor(t * 24) * 7.7) * 24634.6345;
    ctx.fillRect(x, (m - Math.floor(m)) * H, 2, 2);
  }
  ctx.restore();
  ctx.save();
  ctx.font = '700 46px monospace';
  ctx.fillStyle = '#e8f1f2';
  ctx.globalAlpha = 0.85;
  ctx.fillText('● REC   2012 · OGASAWARA ISLANDS, JAPAN', 70, 100);
  ctx.restore();
  drawText(ctx, 'first film of one alive in the deep', { x: 960, y: 980, size: 66, maxWidth: 1500 }, 700, smooth((t - T.y2012) / 0.3), PAPER_ON_INK);
}

/** The Essex, rammed: the legend card, full frame, its whale hitting twice. */
function drawEssex(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'paper', t);
  const hit = (at: number): number => smooth((t - at + 0.5) / 0.5);
  const impact = 0.5 * hit(T.essex + 0.2) + 0.5 * hit(T.twice + 0.1);
  const shake = Math.max(0, 1 - Math.abs(t - T.twice - 0.1) / 0.3) * 14;
  drawLegend(ctx, 'essex', 160 + shake * Math.sin(t * 90), 80, 1600, 900, t, { impact, stamp: clamp01((t - T.sank - 0.3) / 0.35) });
}

/** Three whaleboats on an empty sea, the sun crossing three times. */
function drawAdrift(ctx: CanvasRenderingContext2D, _sea: Sea, t: number): void {
  const u = clamp01((t - T.drifted) / (T.melville - T.drifted));
  const day = (u * 3) % 1;
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  const light = Math.sin(Math.PI * day);
  sky.addColorStop(0, `rgb(${Math.round(40 + 180 * light)},${Math.round(50 + 160 * light)},${Math.round(80 + 150 * light)})`);
  sky.addColorStop(1, `rgb(${Math.round(120 + 120 * light)},${Math.round(100 + 110 * light)},${Math.round(90 + 90 * light)})`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.62);
  ctx.fillStyle = `rgb(${Math.round(20 + 60 * light)},${Math.round(50 + 70 * light)},${Math.round(80 + 70 * light)})`;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
  const sx = 200 + day * 1520;
  const sy = H * 0.62 - Math.sin(Math.PI * day) * 420;
  ctx.fillStyle = '#ffd77a';
  ctx.beginPath();
  ctx.arc(sx, sy, 50, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) drawBoat(ctx, 620 + i * 340, H * 0.66 + (i % 2) * 40 + 8 * Math.sin(t * 1.3 + i), 220);
  drawText(ctx, `${Math.min(3, Math.floor(u * 3) + 1)} month${u * 3 >= 1 ? 's' : ''} adrift`, { x: 960, y: 960, size: 76, maxWidth: 1200 }, 700, 1, PAPER_ON_INK);
}

function drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.save();
  ctx.fillStyle = '#3b2a1c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 14);
  ctx.quadraticCurveTo(x, y + 38, x + w / 2, y - 14);
  ctx.lineTo(x + w * 0.4, y - 4);
  ctx.lineTo(x - w * 0.4, y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y - 110);
  ctx.stroke();
  ctx.fillStyle = '#d9cfb4';
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 106);
  ctx.lineTo(x + 70, y - 24);
  ctx.lineTo(x + 4, y - 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Moby-Dick's title page. */
function drawBook(ctx: CanvasRenderingContext2D, sea: Sea, t: number): void {
  sea.draw(ctx, 'paper', t);
  const up = smooth((t - T.melville) / 0.5);
  ctx.save();
  ctx.translate(960, 560 + 80 * (1 - up));
  ctx.rotate(-0.04);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#5c1f1a';
  ctx.fillRect(-330, -430, 660, 860);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#c9a45a';
  ctx.lineWidth = 6;
  ctx.strokeRect(-300, -400, 600, 800);
  ctx.restore();
  const k = smooth((t - T.mobyDick + 0.3) / 0.4);
  drawText(ctx, 'MOBY-DICK', { x: 960, y: 330 + 80 * (1 - up), size: 110, maxWidth: 560 }, 700, up, { fill: '#e8c877', halo: '#2a0c08' });
  drawText(ctx, 'or, The Whale', { x: 960, y: 440 + 80 * (1 - up), size: 60, maxWidth: 560 }, 500, up, { fill: '#e8c877', halo: '#2a0c08' });
  drawText(ctx, 'Herman Melville · 1851', { x: 960, y: 820 + 80 * (1 - up), size: 54, maxWidth: 560 }, 700, up * Math.max(k, smooth((t - T.melville - 1) / 0.4)), { fill: '#e8c877', halo: '#2a0c08' });
  // A white whale on the cover: the sperm whale, bleached.
  drawFiltered(ctx, 'grayscale(1) brightness(2.3) contrast(0.8)', up, (c) => drawMonster(c, 'sperm', { x: 760, y: 625 + 80 * (1 - up) }, 420, -1, t, {}, -0.05));
}

/** The ROV's lights in the black, and the spiral coiled in them. */
function drawRov(ctx: CanvasRenderingContext2D, _sea: Sea, t: number): void {
  ctx.fillStyle = '#020407';
  ctx.fillRect(0, 0, W, H);
  const on = smooth((t - T.y2020) / 0.6);
  const g = ctx.createRadialGradient(W * 0.52, H * 0.5, 60, W * 0.52, H * 0.5, 900);
  g.addColorStop(0, `rgba(90,120,140,${0.5 * on})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const reveal = smooth((t - T.string) / 2.2);
  const path = spiralPath(W * 0.52, H * 0.5, 60, 430, 3.2, 600).map((p) => ({ x: p.x + 14 * Math.sin(t * 0.4 + p.y * 0.01), y: p.y }));
  drawSiphonophoreAlong(ctx, path, t, { reveal, glow: 0.8, alpha: on });
  ctx.save();
  ctx.font = '700 44px monospace';
  ctx.fillStyle = '#d7e4e8';
  ctx.globalAlpha = 0.85 * on;
  ctx.fillText('ROV SuBastian · 2020 · NINGALOO CANYONS, AUSTRALIA', 70, 96);
  ctx.restore();
  vignette(ctx, 0.6);
}

/** The clones under a lens, each kind lit as it's named. */
function drawZooids(ctx: CanvasRenderingContext2D, _sea: Sea, t: number): void {
  const up = smooth((t - T.clones) / 0.5) * (1 - smooth((t - T.crowd) / 0.4));
  ctx.save();
  ctx.fillStyle = `rgba(2,4,8,${0.6 * up})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (up <= 0) return;
  const r = 380 * up;
  const highlight = t >= T.eat ? 'eat' : t >= T.sting ? 'sting' : t >= T.swim ? 'swim' : null;
  drawZooidCloseUp(ctx, 960, 520, r, t, highlight);
  const pts = zooidPoints(960, 520, r);
  const label = (text: string, at: number, p: { readonly x: number; readonly y: number }): void => drawPop(ctx, text, p.x, p.y - 70, 70, t, at, T.crowd, YELLOW_ON_INK);
  label('swim', T.swim, pts.swim);
  label('sting', T.sting, pts.sting);
  label('eat', T.eat, pts.eat);
  drawText(ctx, 'thousands of identical clones', { x: 960, y: 80, size: 66, maxWidth: 1500 }, 700, up * smooth((t - T.clones - 0.3) / 0.3), PAPER_ON_INK);
}

/** The squid in the dark: the stage goes black, only its eye catching the light; it blinks on "watching you". */
export function drawDarkness(ctx: CanvasRenderingContext2D, eye: { readonly x: number; readonly y: number }, t: number): void {
  const dark = smooth((t - T.dark) / 1.2) * (1 - smooth((t - s(8) - 0.2) / 0.8));
  if (dark <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(${Math.round(255 - 245 * dark)},${Math.round(255 - 243 * dark)},${Math.round(255 - 238 * dark)},1)`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const blink = Math.max(0, 1 - Math.abs(t - T.watching - 0.55) / 0.15);
  ctx.save();
  ctx.globalAlpha = dark * (1 - blink);
  const g = ctx.createRadialGradient(eye.x, eye.y, 2, eye.x, eye.y, 70);
  g.addColorStop(0, 'rgba(230,240,255,0.9)');
  g.addColorStop(1, 'rgba(230,240,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(eye.x - 80, eye.y - 80, 160, 160);
  ctx.restore();
}

export const CUTS: readonly Cut[] = [
  { from: T.straightUp - 0.1, to: T.japan - 0.1, draw: drawUpright },
  { from: T.rots - 0.3, to: s(7) - 0.4, draw: drawRot },
  { from: T.y2012 - 0.5, to: T.dark, draw: drawDeepCam },
  { from: T.y1820 - 0.2, to: T.drifted, draw: drawEssex },
  { from: T.drifted, to: T.melville, draw: drawAdrift },
  { from: T.melville, to: T.wasReal, draw: drawBook },
  { from: T.y2020 - 0.1, to: T.oneFifty, draw: drawRov },
  { from: T.clones - 0.1, to: T.crowd + 0.4, draw: drawZooids, over: true },
];

export const cutAt = (t: number): Cut | null => CUTS.find((c) => t >= c.from && t < c.to) ?? null;

