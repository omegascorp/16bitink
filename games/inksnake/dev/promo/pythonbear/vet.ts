import { lerp } from '../short';
import type { Pt } from '../sprites';
import type { Cast } from './cast';
import { drawCollar } from './marks';
import { drawPythonBody, drawPythonHead, type Lay, lengths, spineOf } from './python';
import { collarLift, lampOn, OPERATED_AT, wrap } from './story';

/**
 * "So they OPERATED…": the vet's table under a round surgical lamp, the
 * python asleep on the steel, a clean white bandage on its side (no cut, no
 * blood), and a blue-gloved hand lifting the radio collar up into the light.
 */
const TABLE_Y = 1170;
const LAMP: Pt = { x: 540, y: 640 };

const KNOTS: readonly Pt[] = [{ x: 850, y: 1118 }, { x: 600, y: 1128 }, { x: 330, y: 1126 }, { x: 120, y: 1132 }, { x: 10, y: 1190 }, { x: -60, y: 1320 }];
const SPINE = spineOf(KNOTS, 4);
const S = lengths(SPINE);
const LAY: Lay = { spine: SPINE, widths: S.map(() => 84), base: 84, headRight: true };

/** A white gauze band round the body `at` px from the head. */
export function drawBandage(ctx: CanvasRenderingContext2D, l: Lay, at: number, wide: number): void {
  const s = lengths(l.spine);
  const i = Math.max(1, s.findIndex((d) => d >= at));
  const p = l.spine[i]!;
  const q = l.spine[i - 1]!;
  const a = Math.atan2(q.y - p.y, q.x - p.x);
  const h = l.widths[i]! / 2 + 3;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  ctx.fillStyle = '#f7f4ea';
  ctx.strokeStyle = '#1a130c';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.rect(-wide / 2, -h, wide, h * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,160,170,0.6)';
  ctx.lineWidth = 1.2;
  for (let k = -wide / 2 + 6; k < wide / 2; k += 7) {
    ctx.beginPath();
    ctx.moveTo(k, -h + 2);
    ctx.lineTo(k - 4, h - 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(120,130,150,0.25)';
  ctx.fillRect(-wide / 2, h * 0.3, wide, h * 0.7);
  ctx.restore();
}

function drawRoom(ctx: CanvasRenderingContext2D, on: number): void {
  ctx.fillStyle = '#0c1014';
  ctx.fillRect(0, 0, 1080, 1920);
  const g = ctx.createRadialGradient(LAMP.x, TABLE_Y - 40, 40, LAMP.x, TABLE_Y - 40, 760);
  g.addColorStop(0, `rgba(205,222,226,${0.45 * on})`);
  g.addColorStop(1, 'rgba(205,222,226,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1920);
  // The light falling from the lamp.
  ctx.save();
  ctx.globalAlpha = 0.22 * on;
  const cone = ctx.createLinearGradient(0, LAMP.y, 0, TABLE_Y);
  cone.addColorStop(0, '#fffbea');
  cone.addColorStop(1, 'rgba(255,251,234,0.2)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(LAMP.x - 120, LAMP.y);
  ctx.lineTo(LAMP.x + 120, LAMP.y);
  ctx.lineTo(LAMP.x + 460, TABLE_Y);
  ctx.lineTo(LAMP.x - 460, TABLE_Y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The lamp: its arm, a dish with a bright face.
  ctx.strokeStyle = '#2b3036';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(LAMP.x, 0);
  ctx.lineTo(LAMP.x, LAMP.y - 50);
  ctx.stroke();
  ctx.fillStyle = '#7d868e';
  ctx.strokeStyle = '#11151a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(LAMP.x, LAMP.y - 30, 190, 60, 0, Math.PI, 0);
  ctx.lineTo(LAMP.x + 190, LAMP.y);
  ctx.ellipse(LAMP.x, LAMP.y, 190, 34, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = on > 0.5 ? '#fffbe6' : '#4a5056';
  ctx.beginPath();
  ctx.ellipse(LAMP.x, LAMP.y, 160, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  // The steel table.
  const top = ctx.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 46);
  top.addColorStop(0, '#d9dee2');
  top.addColorStop(1, '#79828a');
  ctx.fillStyle = top;
  ctx.fillRect(40, TABLE_Y, 1000, 46);
  ctx.strokeStyle = '#11151a';
  ctx.strokeRect(40, TABLE_Y, 1000, 46);
  ctx.fillStyle = '#3c434a';
  for (const x of [120, 940]) ctx.fillRect(x, TABLE_Y + 46, 26, 500);
}

/** The gloved hand from the upper right, holding the collar up by its belt. */
function drawHand(ctx: CanvasRenderingContext2D, at: Pt): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [w, colour] of [[96, '#11151a'], [86, '#3f7f6a']] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(1200, at.y - 320);
    ctx.quadraticCurveTo(at.x + 220, at.y - 120, at.x + 70, at.y - 30);
    ctx.stroke();
  }
  ctx.fillStyle = '#7fb4e0';
  ctx.strokeStyle = '#11151a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(at.x + 20, at.y - 10, 62, 46, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(at.x - 26, at.y - 30, 30, 16, -1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Four fingers curled round the belt, a sheen on the glove.
  ctx.fillStyle = '#8cc0ea';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(at.x - 18 + i * 17, at.y + 22 - i * 9, 13, 19, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(at.x + 8, at.y - 34, 22, 9, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawVet(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const on = lampOn(t);
  drawRoom(ctx, on);
  drawPythonBody(ctx, cast.python, boil, LAY, 0.8);
  drawBandage(ctx, LAY, 430, 64);
  drawPythonHead(ctx, cast.python, boil, LAY, 'sleep');
  const lift = collarLift(t);
  const hand: Pt = { x: lerp(700, 640, lift), y: lerp(1060, 800, lift) };
  drawCollar(ctx, { x: hand.x - 6, y: hand.y + 112 }, 92, Math.PI * 0.46 + 0.12 * Math.sin((wrap(t) - OPERATED_AT) * 5) * (1 - lift * 0.5), lift > 0.7 ? (lift - 0.7) / 0.3 : 0);
  drawHand(ctx, hand);
  const v = ctx.createRadialGradient(540, 980, 300, 540, 980, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1080, 1920);
}
