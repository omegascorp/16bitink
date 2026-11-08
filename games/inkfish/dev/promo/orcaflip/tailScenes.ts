import { INK } from '../../../src/art/pen';
import { drawWhaleShark } from '../foodchain/art/whaleShark';
import { ramp, VIDEO } from '../short';
import { specks, vignette } from '../alvin/water';
import { drawChasingDiver, drawCloseDiver } from './diverParts';
import { rays } from './fx';
import { drawShark, faded, say, silhouette } from './parts';
import { diverCutAt, sinkAt } from './poses';
import { TEXT } from './script';
import { boilAt, livedAt, STARTS } from './story';

/** The last three scenes before the loop closes: the diver, the x-ray, and the shark sinking away. */

/** Beat 5's cut, on "Scientists": a diver close up with a slate, in blue water, the belly-up shark behind. */
export function drawDiverCut(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#3aa0cc');
  g.addColorStop(0.5, '#17689c');
  g.addColorStop(1, '#0a3f6a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  rays(ctx, 0.7, t, 5);
  specks(ctx, t, 30, -14, 0.25);
  const { diver, shark } = diverCutAt(t);
  faded(ctx, (c) => drawShark(c, shark, t), 0.94);
  drawCloseDiver(ctx, diver, boilAt(t), t);
  vignette(ctx, 0.3);
}

/** Beat 5's x-ray: a pale panel, the shark in ink outline, belly-up, and its liver glowing. */
export function drawXray(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = '#071a28';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const open = ramp(t, STARTS.xray, STARTS.xray + 0.3);
  const [cx, cy, w, h] = [540, 800, 980, 560];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.4 + 0.6 * open, open);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 120);
  const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, w * 0.62);
  g.addColorStop(0, 'rgba(240,252,255,0.98)');
  g.addColorStop(0.75, 'rgba(198,232,242,0.97)');
  g.addColorStop(1, 'rgba(146,198,218,0.97)');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(190,240,255,0.8)';
  ctx.shadowBlur = 44;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.clip();
  const [sx, sy, len, a] = [cx, cy + 10, 860, -0.04];
  silhouette(ctx, (c) => {
    c.translate(sx, sy);
    c.rotate(a);
    c.scale(1, -1);
    drawWhaleShark(c, 0, 0, len, 0, t, { tail: 0.4 * t });
  }, '#e4f6fb', 0.97, { colour: 'rgba(20,52,70,0.95)', width: 4 });
  ctx.translate(sx, sy);
  ctx.rotate(a);
  ctx.scale(1, -1);
  // The spine and its bones.
  ctx.strokeStyle = 'rgba(20,52,70,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(len * 0.42, 0);
  ctx.lineTo(-len * 0.4, 0);
  for (let i = 0; i < 26; i++) {
    const x = len * 0.4 - i * (len * 0.8) / 25;
    ctx.moveTo(x, -9);
    ctx.lineTo(x, 9);
  }
  ctx.stroke();
  // The liver, long and low along the belly (up here), glowing.
  const pulse = 1 + 0.05 * Math.sin(t * 7);
  const lx = len * 0.04;
  const ly = len * 0.055;
  ctx.save();
  ctx.translate(lx, ly);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = 'rgba(255,170,60,0.95)';
  ctx.shadowBlur = 60;
  const lg = ctx.createRadialGradient(0, 0, 6, 0, 0, len * 0.2);
  lg.addColorStop(0, '#ffe39a');
  lg.addColorStop(0.6, '#f0952c');
  lg.addColorStop(1, '#c9561c');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.2, len * 0.062, 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  const l = livedAt(t);
  if (l > 0.01) {
    ctx.save();
    ctx.globalAlpha = l;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx + 20, 505);
    ctx.quadraticCurveTo(sx + 90, 570, sx + len * 0.04 + 12, 690);
    ctx.stroke();
    ctx.restore();
  }
  say(ctx, 'liver', TEXT.liver, l);
}

/** Beat 6: the shark sinks away belly-up into the dark, a diver kicking after it, the torch beam giving out short of it. */
export function drawSink(ctx: CanvasRenderingContext2D, t: number): void {
  const s = sinkAt(t);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#1270a8');
  g.addColorStop(0.45, '#0a4674');
  g.addColorStop(1, '#03182c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  rays(ctx, 0.5, t, 5);
  specks(ctx, t, 30, -60, 0.22);
  drawShark(ctx, s.shark, t);
  // The deep closes over it from below: dimmer as it goes, never gone.
  const deep = ctx.createLinearGradient(0, 500, 0, VIDEO.height);
  deep.addColorStop(0, 'rgba(1,8,16,0)');
  deep.addColorStop(1, `rgba(1,8,16,${s.dark})`);
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  drawChasingDiver(ctx, s, boilAt(t), t);
  vignette(ctx, 0.35);
}
