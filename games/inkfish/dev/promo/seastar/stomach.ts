import { INK, Pen, pathOf } from '../../../src/art/pen';
import { type Pt, pt } from './geom';

/**
 * The sea star's stomach pushed out of its mouth: a glossy, translucent,
 * pink-orange membrane flaring from the mouth in frilly folds and pouring
 * down into the mussel's gape, wet highlights on it and a rim of light down
 * its edge, glowing softly. `extent` 0 (in) .. 1 (spread through the
 * shell); `throb` -1 .. 1 swells it; `glow` 0 .. 1 is the digesting glow.
 */

const MEMBRANE = '#f4a08c';
const MEMBRANE_LIGHT = '#ffd6c4';
const FOLD = '#b9586a';

export interface StomachLook {
  readonly mouth: Pt;
  /** The bottom of its reach, in the shell. */
  readonly floor: Pt;
  readonly extent: number;
  readonly throb: number;
  readonly glow: number;
  /** A phase for the frills (whole cycles a loop). */
  readonly phase: number;
}

const ROWS = 32;

interface Sac {
  readonly left: Pt[];
  readonly right: Pt[];
  readonly bottom: Pt[];
  readonly shape: Pt[];
}

function sacOf(s: StomachLook): Sac {
  const e = s.extent;
  const length = (s.floor.y - s.mouth.y) * e;
  const swell = 1 + 0.08 * s.throb;
  const lobe = 128 * e ** 0.6 * swell;
  const neck = 30 * (0.6 + 0.4 * e) * swell;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= ROWS; i++) {
    const v = i / ROWS;
    // Flares out of the mouth, narrows a little, then billows into lobes in the shell.
    const flare = 22 * Math.sin(Math.PI * Math.min(1, v * 2.2)) * e;
    const ruffle = (5 + 12 * v) * Math.sin(v * 19 + s.phase) + 4 * Math.sin(v * 41 - s.phase);
    const w = neck + flare + (lobe - neck) * v ** 1.8 + ruffle * Math.min(1, v * 4) * e;
    const cx = s.mouth.x + (s.floor.x - s.mouth.x) * v + 5 * Math.sin(v * 5 + s.phase * 0.5) * e;
    const y = s.mouth.y + length * v;
    left.push(pt(cx - w, y));
    right.push(pt(cx + w * (1 + 0.04 * Math.sin(s.phase)) - ruffle * 0.4, y));
  }
  // Scalloped, frilly lobes along the bottom.
  const a = left[ROWS]!;
  const b = right[ROWS]!;
  const bottom: Pt[] = [];
  const lobes = 5;
  for (let i = 1; i < lobes * 8; i++) {
    const u = i / (lobes * 8);
    const bump = Math.abs(Math.sin(u * lobes * Math.PI));
    const frill = 5 * Math.sin(u * 60 + s.phase);
    bottom.push(pt(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + (12 + 26 * bump + frill) * e * (1 + 0.15 * Math.sin(s.phase + u * 9))));
  }
  return { left, right, bottom, shape: [...left, ...bottom, ...[...right].reverse()] };
}

export function drawStomach(ctx: CanvasRenderingContext2D, s: StomachLook, boil: number): void {
  if (s.extent < 0.01) return;
  const pen = new Pen(ctx, 613 + boil * 59, 0.9);
  const o = sacOf(s);
  const mid = pt((o.left[ROWS]!.x + o.right[ROWS]!.x) / 2, (s.mouth.y + o.left[ROWS]!.y) / 2);
  // A soft pink glow round it: it's alive.
  const halo = ctx.createRadialGradient(mid.x, mid.y, 10, mid.x, mid.y, 260);
  halo.addColorStop(0, `rgba(255,150,140,${(0.45 * s.extent + 0.4 * s.glow).toFixed(3)})`);
  halo.addColorStop(1, 'rgba(255,150,140,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = halo;
  ctx.fillRect(mid.x - 260, mid.y - 260, 520, 520);
  ctx.restore();

  pen.fill(o.shape, MEMBRANE, 0.82);
  pen.clipped(o.shape, () => {
    // Lit from the upper left, translucent and darker down the folds.
    const g = ctx.createLinearGradient(mid.x - 140, s.mouth.y, mid.x + 140, o.left[ROWS]!.y + 30);
    g.addColorStop(0, 'rgba(255,224,206,0.6)');
    g.addColorStop(0.5, 'rgba(244,150,130,0.05)');
    g.addColorStop(1, 'rgba(150,50,70,0.5)');
    ctx.fillStyle = g;
    pathOf(ctx, o.shape);
    ctx.fill();
    // Folds pouring down the membrane.
    for (let f = -3; f <= 3; f++) {
      const line = o.left.map((l, i) => {
        const r = o.right[i]!;
        const u = 0.5 + f * 0.13 + 0.04 * Math.sin(i * 0.55 + f + s.phase);
        return pt(l.x + (r.x - l.x) * u, l.y);
      });
      pen.hair(line.slice(3), 3, FOLD, 0.45);
      pen.hair(line.slice(3).map((p) => pt(p.x + 5, p.y)), 2, MEMBRANE_LIGHT, 0.45);
    }
    // Wet highlights: a long gleam and a few glints.
    pen.hair(o.left.slice(4, ROWS - 4).map((p, i) => pt(p.x + 20 + i * 0.5, p.y)), 9, '#ffffff', 0.6);
    for (let i = 0; i < 4; i++) {
      const q = o.left[8 + i * 6]!;
      const r = o.right[8 + i * 6]!;
      const c = pt(q.x + (r.x - q.x) * (0.3 + 0.15 * (i % 2)), q.y + 6);
      pen.dot(c.x, c.y, 4 + (i % 2) * 2, '#ffffff', 0.8);
    }
    pen.stroke(o.bottom.map((p) => pt(p.x, p.y - 10)), 6, MEMBRANE_LIGHT, 0.5, false);
  });
  // A rim of light down its right edge, ink round the rest.
  pen.stroke(o.left, 2.6, INK, 0.8);
  pen.stroke(o.bottom, 2.2, INK, 0.65);
  pen.stroke(o.right, 2.6, INK, 0.8);
  pen.stroke(o.right.slice(3).map((p) => pt(p.x - 5, p.y)), 4, '#ffe9de', 0.75, false);
  if (s.glow > 0.01) {
    const g = ctx.createRadialGradient(mid.x, mid.y + 30, 0, mid.x, mid.y + 30, 300);
    g.addColorStop(0, `rgba(255,214,120,${(0.6 * s.glow).toFixed(3)})`);
    g.addColorStop(0.5, `rgba(255,170,90,${(0.25 * s.glow).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(mid.x - 300, mid.y - 270, 600, 600);
    ctx.restore();
  }
}
