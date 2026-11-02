import { ART_RES, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The armoured guard: a grumpy armadillo under a domed shell of hard bands,
 * each band edged with a row of studs, so the back reads as "never jump on
 * this". Lava, water and falling stone beat it. Same frame as the boar:
 * faces right, centred on its collision circle, feet at y = 22.
 */
export const ARMADILLO_FRAME = { w: 76, h: 72, ox: 38, oy: 38 } as const;
export type ArmadilloMood = 'grump' | 'scared';

const SHELL = '#a88f6c';
const SHELL_LIGHT = '#e0cda4';
const SHELL_DARK = '#5e4a36';
const SKIN = '#c9a48a';
const SKIN_DARK = '#8a6a58';
const STUD = '#ede0c0';

export function paintArmadillo(mood: ArmadilloMood, boil: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(ARMADILLO_FRAME.w * ART_RES, ARMADILLO_FRAME.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(ARMADILLO_FRAME.ox, ARMADILLO_FRAME.oy);
  const pen = new Pen(ctx, 1700 + boil * 23, 0.5);
  const scared = mood === 'scared';
  paintShadow(ctx);
  const step = boil === 1 ? 2 : boil === 2 ? -2 : 0;
  for (const [x, far] of [[-12 - step, true], [8 + step, true]] as const) paintLeg(pen, x, far);
  paintTail(pen, ctx, boil);
  paintHead(pen, ctx, scared);
  paintShell(pen, ctx, scared);
  for (const [x, far] of [[-8 + step, false], [12 - step, false]] as const) paintLeg(pen, x, far);
  return canvas;
}

function paintShadow(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(0, 22, 0, 0, 22, 26);
  g.addColorStop(0, 'rgba(40,30,20,0.32)');
  g.addColorStop(1, 'rgba(40,30,20,0)');
  ctx.save();
  ctx.translate(0, 22);
  ctx.scale(1, 0.2);
  ctx.fillStyle = g;
  ctx.fillRect(-28, -28, 56, 56);
  ctx.restore();
}

/** A short scaly leg with claws. */
function paintLeg(pen: Pen, x: number, far: boolean): void {
  const color = far ? mix(SKIN_DARK, '#000000', 0.25) : SKIN_DARK;
  const leg = [{ x: x - 3.4, y: 11 }, { x: x + 3.4, y: 11 }, { x: x + 3.2, y: 20 }, { x: x - 3.2, y: 20 }];
  pen.fill(leg, color, 1);
  for (let k = 0; k < 3; k++) pen.hair([{ x: x - 2 + k * 2, y: 20 }, { x: x - 1 + k * 2.4, y: 22.5 }], 0.9, '#2a1e16', 0.9);
  if (!far) pen.stroke([leg[1]!, leg[2]!], 0.8, INK, 0.7, false);
}

/** A ringed tail sticking out behind, tapering to a point. */
function paintTail(pen: Pen, ctx: CanvasRenderingContext2D, boil: number): void {
  const lift = (boil - 1) * 0.8;
  const tail = [{ x: -18, y: 6 }, { x: -31, y: 13 + lift }, { x: -36, y: 17 + lift }, { x: -30, y: 15 + lift }, { x: -18, y: 13 }];
  ctx.fillStyle = mix(SHELL, SHELL_DARK, 0.3);
  ctx.beginPath();
  tail.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  for (let k = 0; k < 4; k++) pen.hair([{ x: -21 - k * 3.5, y: 7.5 + k * 1.8 + lift * (k / 4) }, { x: -21 - k * 3.5, y: 12.8 + k * 0.7 + lift * (k / 4) }], 0.7, SHELL_DARK, 0.9);
  pen.stroke([...tail, tail[0]!], 1, INK, 0.9, false);
}

/** A small head on a long, pointed snout, two big upright ears and a cross little eye. */
function paintHead(pen: Pen, ctx: CanvasRenderingContext2D, scared: boolean): void {
  for (const [ex, dark] of [[10, true], [14, false]] as const) {
    const ear = [{ x: ex - 2.5, y: -2 }, { x: ex - 1, y: -12 - (scared ? 2 : 0) }, { x: ex + 3, y: -11 }, { x: ex + 3, y: -1 }];
    pen.fill(ear, dark ? mix(SKIN, SKIN_DARK, 0.7) : SKIN, 1);
    pen.fill([{ x: ex - 0.8, y: -3 }, { x: ex, y: -9.5 }, { x: ex + 1.6, y: -3 }], '#d98e84', dark ? 0.4 : 0.7);
    pen.stroke(ear, 1, INK, 0.9, false);
  }
  const head: Pt[] = [{ x: 8, y: -2 }, { x: 16, y: -4 }, { x: 22, y: 0 }, { x: 31, y: 6 }, { x: 32, y: 8.5 }, { x: 28, y: 10 }, { x: 18, y: 12 }, { x: 9, y: 12 }];
  const g = ctx.createLinearGradient(8, -4, 20, 12);
  g.addColorStop(0, mix(SKIN, '#ffffff', 0.25));
  g.addColorStop(1, SKIN_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  head.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // A little armoured cap on the head too.
  pen.fill([{ x: 11, y: -2.5 }, { x: 18, y: -4 }, { x: 22, y: -0.5 }, { x: 15, y: 0.5 }], SHELL, 1);
  pen.stroke(head, 1.1, INK, 0.92, false);
  pen.fill(ellipse(32, 8, 1.8, 1.6, 8), '#3a2620', 1);
  const eye = ellipse(19, 3, 2.3, scared ? 2.8 : 2.1, 12);
  pen.fill(eye, '#ffffff', 1);
  pen.stroke([...eye, eye[0]!], 0.6, INK, 0.8, false);
  pen.dot(19.6, scared ? 2.6 : 3.6, scared ? 0.8 : 1.15, '#140f0a');
  if (scared) {
    pen.stroke([{ x: 16.5, y: -0.5 }, { x: 21.5, y: -1.2 }], 1.1, INK, 0.9, false);
    pen.dot(25, -3, 1.2, '#9cc6ea', 0.9);
    pen.hair([{ x: 22, y: 10.4 }, { x: 24, y: 9.6 }, { x: 26, y: 10.4 }], 0.8, INK, 0.9);
  } else {
    pen.stroke([{ x: 16.5, y: 0.2 }, { x: 22, y: 1.8 }], 1.4, INK, 0.95, false);
    pen.hair([{ x: 21, y: 10.4 }, { x: 27, y: 9.4 }], 0.8, INK, 0.9);
  }
}

/** The domed shell: a shield at each end and hard bands across the middle, studded along their edges. */
function paintShell(pen: Pen, ctx: CanvasRenderingContext2D, scared: boolean): void {
  // Scared, it hunches down into its armour.
  const hy = scared ? 1.5 : 0;
  const dome: Pt[] = [];
  for (let i = 0; i <= 30; i++) {
    const a = Math.PI + (i / 30) * Math.PI;
    dome.push({ x: -2 + Math.cos(a) * 21, y: 12 + hy + Math.sin(a) * (21 - hy) });
  }
  dome.push({ x: 19, y: 14 }, { x: -23, y: 14 });
  const g = ctx.createRadialGradient(-9, -4, 2, -2, 8, 26);
  g.addColorStop(0, SHELL_LIGHT);
  g.addColorStop(0.55, SHELL);
  g.addColorStop(1, SHELL_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  dome.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.clipped(dome, () => {
    // The bands: hard ridges across the dome, each casting a shade on the next.
    for (let k = 0; k < 6; k++) {
      const bx = -14 + k * 5.6;
      const top = 12 + hy - Math.sqrt(Math.max(0, 21 * 21 - (bx + 2) ** 2)) * ((21 - hy) / 21);
      ctx.fillStyle = rgba(SHELL_DARK, 0.35);
      ctx.fillRect(bx + 1, top, 2.2, 30);
      pen.hair([{ x: bx, y: top - 1 }, { x: bx + 0.6, y: 14 }], 1.2, mix(SHELL_DARK, INK, 0.3), 0.9);
      pen.hair([{ x: bx - 1.3, y: top }, { x: bx - 1, y: 14 }], 0.8, SHELL_LIGHT, 0.6);
      // Studs along the band's ridge.
      for (let y = top + 3; y < 12; y += 4.2) pen.dot(bx - 0.4, y, 0.95, STUD, 0.95);
    }
    // The scale pattern on the end shields.
    for (const [cx, cy] of [[-17, 6], [13, 6], [-15, 0], [11, 0]] as const) pen.hair(ellipse(cx, cy, 2.2, 1.6, 8), 0.6, SHELL_DARK, 0.7);
    // Fringe of skin under the rim.
    ctx.fillStyle = rgba(SKIN_DARK, 0.65);
    ctx.fillRect(-24, 11, 46, 4);
  });
  // A row of hard little points along the top of the dome: armour, not fur.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.12 + (i / 8) * 0.76);
    const r = 21 - hy;
    const p = { x: -2 + Math.cos(a) * 21, y: 12 + hy + Math.sin(a) * r };
    const n = { x: Math.cos(a), y: Math.sin(a) };
    const t = { x: -n.y, y: n.x };
    const spike = [{ x: p.x + t.x * 1.8, y: p.y + t.y * 1.8 }, { x: p.x + n.x * 3.4, y: p.y + n.y * 3.4 }, { x: p.x - t.x * 1.8, y: p.y - t.y * 1.8 }];
    pen.fill(spike, STUD, 1);
    pen.stroke(spike, 0.6, INK, 0.85, false);
  }
  pen.stroke([...dome.slice(0, 31)], 1.4, INK, 0.95, false);
  pen.hair([{ x: -23, y: 14 }, { x: 19, y: 14 }], 1, INK, 0.8);
}
