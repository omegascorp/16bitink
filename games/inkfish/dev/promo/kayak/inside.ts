import { Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp, ramp, VIDEO } from '../short';
import { ADRIAN, drawEyesInDark, drawPaddler, headOf } from './people';
import { blinkAt, glanceAt, INSIDE, insideLightAt, type Paddler, wrap } from './story';

/**
 * "…then everything went DARK. Kayak and all.": inside the shut mouth. Black,
 * a thin sliver of grey daylight between the lips closing to a crack, the
 * baleen hanging like a curtain, rim-lit; the wet folds of the throat below;
 * Adrián in his kayak barely there in the dark, only his wide white eyes
 * showing, glancing round and blinking. The camera creeps in.
 */

const DARK = '#020607';
const CRACK_Y = 380;

const PLATES = (() => {
  const rng = createRng(77);
  return Array.from({ length: 46 }, (_, i) => ({ x: 30 + (i / 45) * 1020 + (rng() - 0.5) * 14, len: 180 + 260 * Math.sin(Math.PI * (i / 45)) + rng() * 90, lean: -30 + rng() * 26, w: 9 + rng() * 8 }));
})();

/** Adrián in the dark: sitting still, holding his paddle. */
const SITTING: Paddler = { x: 540, y: 1120, tilt: -0.04, facing: 1, scale: 1.9, stroke: 0.4, arms: 'paddle', face: 'shock' };

export function drawInside(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const u = wrap(t);
  const light = insideLightAt(t);
  const pen = new Pen(ctx, 515 + boil * 977, 1.4);
  const creep = lerp(1, 1.09, ramp(u, INSIDE.from, INSIDE.to));
  ctx.save();
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.translate(VIDEO.width / 2, 900);
  ctx.scale(creep, creep);
  ctx.translate(-VIDEO.width / 2, -900);
  // The crack of daylight between the lips, closing.
  const gap = lerp(26, 5, ramp(u, INSIDE.from, INSIDE.from + 0.6)) * (0.3 + 0.7 * light);
  ctx.save();
  ctx.shadowColor = 'rgba(210,225,220,0.9)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = `rgba(214,226,222,${(0.25 + 0.65 * light).toFixed(3)})`;
  ctx.beginPath();
  ctx.moveTo(60, CRACK_Y);
  for (let x = 60; x <= 1020; x += 40) ctx.lineTo(x, CRACK_Y - gap / 2 - 3 * Math.sin(x / 47));
  for (let x = 1020; x >= 60; x -= 40) ctx.lineTo(x, CRACK_Y + gap / 2 + 3 * Math.sin(x / 31));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // A faint cone of that light falling down through the mouth.
  const cone = ctx.createLinearGradient(0, CRACK_Y, 0, 1400);
  cone.addColorStop(0, `rgba(150,180,175,${(0.16 * light).toFixed(3)})`);
  cone.addColorStop(1, 'rgba(150,180,175,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(240, CRACK_Y);
  ctx.lineTo(840, CRACK_Y);
  ctx.lineTo(1000, 1400);
  ctx.lineTo(80, 1400);
  ctx.closePath();
  ctx.fill();
  // The baleen curtain: long dark plates hanging from the roof, frayed at their tips, rim-lit along the crack.
  for (const p of PLATES) {
    const top = { x: p.x, y: CRACK_Y + 8 };
    const tip = { x: p.x + p.lean, y: CRACK_Y + p.len };
    pen.fill([{ x: top.x - p.w / 2, y: top.y }, { x: top.x + p.w / 2, y: top.y }, { x: tip.x + 2, y: tip.y }, { x: tip.x - 2, y: tip.y - 6 }], '#140d0b', 0.95);
    for (let k = -1; k <= 1; k++) pen.hair([{ x: tip.x + k * 3, y: tip.y - 30 }, { x: tip.x + k * 6 + p.lean * 0.15, y: tip.y + 22 }], 1.4, '#6d5a46', 0.6 * light);
    pen.hair([{ x: top.x + p.w / 2, y: top.y }, { x: top.x + p.w / 2 + p.lean * 0.25, y: top.y + p.len * 0.3 }], 1.8, '#a9bdb6', 0.55 * light);
  }
  // The throat's folds below, catching a little light.
  for (let k = 0; k < 7; k++) {
    const y = 1260 + k * 70;
    pen.hair([{ x: -40, y: y + 40 }, { x: 300, y: y - 10 }, { x: 780, y: y - 10 }, { x: 1120, y: y + 40 }], 3, '#3a5550', 0.35 * light);
  }
  // A pool of water sloshing in the bottom of the throat.
  ctx.fillStyle = `rgba(28,46,46,${(0.8 * light).toFixed(3)})`;
  ctx.fillRect(-40, SITTING.y - 4, VIDEO.width + 80, 900);
  pen.hair([{ x: 100, y: SITTING.y }, { x: 400, y: SITTING.y - 4 }, { x: 700, y: SITTING.y + 2 }, { x: 980, y: SITTING.y - 2 }], 2.4, '#8fa6a0', 0.55 * light);
  // Adrián, barely lit: drawn, then the dark laid over him but for a glow on the kayak's deck.
  ctx.save();
  ctx.globalAlpha = light;
  drawPaddler(ctx, SITTING, ADRIAN, boil, t, 11);
  ctx.restore();
  const shade = ctx.createLinearGradient(0, CRACK_Y + 300, 0, VIDEO.height);
  shade.addColorStop(0, 'rgba(2,6,7,0.62)');
  shade.addColorStop(1, 'rgba(2,6,7,0.85)');
  ctx.fillStyle = shade;
  ctx.fillRect(-100, CRACK_Y + 60, VIDEO.width + 200, VIDEO.height);
  const head = headOf(SITTING);
  drawEyesInDark(ctx, head, 16 * SITTING.scale * 0.55, glanceAt(t), blinkAt(t), boil);
  // A drip from the baleen.
  const drip = (u * 1.6) % 1;
  ctx.fillStyle = `rgba(190,210,205,${(0.6 * light).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(700, CRACK_Y + 230 + drip * 520, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
