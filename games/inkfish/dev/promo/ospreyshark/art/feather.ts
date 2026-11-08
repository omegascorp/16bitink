import { type Pt } from '../../../../src/art/pen';
import { fillShape, inkLine, within } from '../../pelican/art/ink';
import { path } from '../../seal/art/paint';

/**
 * One painted flight feather for the osprey's wings and tail: a long leaf
 * with a rounded tip (or a narrowed "finger" tip for the outer primaries),
 * washed from its base to its tip, crossed by fine dark bars, a pale shaft,
 * and a thin ink edge.
 */

export interface FeatherInk {
  readonly base: string;
  readonly tip: string;
  readonly bar: string;
  /** How strong the bars are, 0 .. 1. */
  readonly bars: number;
  readonly shaft: string;
  /** A dark band at the tip, 0 .. 1. */
  readonly tipBand: number;
}

export interface Feather {
  readonly at: Pt;
  /** Unit direction from the base to the tip. */
  readonly dir: Pt;
  readonly len: number;
  readonly width: number;
  /** Narrowed outer tip (an osprey's wingtip "fingers"). */
  readonly finger?: boolean;
}

/** The feather's outline. */
export function featherShape(f: Feather): Pt[] {
  const n = { x: -f.dir.y, y: f.dir.x };
  const left: Pt[] = [];
  const right: Pt[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    // Narrow at the quill, full by a third of the way, a little narrower toward the tip, rounded off.
    let hw = (f.width / 2) * (0.5 + 0.5 * Math.sin(Math.min(1, s / 0.32) * Math.PI * 0.5)) * (1 - 0.18 * s);
    if (f.finger && s > 0.5) hw *= 1 - 0.42 * Math.min(1, (s - 0.5) / 0.2);
    if (s > 0.78) hw *= Math.sqrt(Math.max(0, 1 - ((s - 0.78) / 0.22) ** 2));
    // A gentle curve along the feather; the outer vane narrower than the inner.
    const bow = f.width * 0.12 * Math.sin(Math.PI * s);
    const c = { x: f.at.x + f.dir.x * f.len * s + n.x * bow, y: f.at.y + f.dir.y * f.len * s + n.y * bow };
    left.push({ x: c.x + n.x * hw * 0.8, y: c.y + n.y * hw * 0.8 });
    right.push({ x: c.x - n.x * hw * 1.2, y: c.y - n.y * hw * 1.2 });
  }
  return [...left, ...right.reverse()];
}

export function paintFeather(ctx: CanvasRenderingContext2D, f: Feather, ink: FeatherInk, boil: number, edge = 0.55): void {
  const shape = featherShape(f);
  const tip = { x: f.at.x + f.dir.x * f.len, y: f.at.y + f.dir.y * f.len };
  const g = ctx.createLinearGradient(f.at.x, f.at.y, tip.x, tip.y);
  g.addColorStop(0, ink.base);
  g.addColorStop(0.75, ink.tip);
  g.addColorStop(1, ink.tip);
  fillShape(ctx, shape, g);
  const n = { x: -f.dir.y, y: f.dir.x };
  within(ctx, shape, () => {
    // Bars across the vane, a little curved, fading toward the base.
    if (ink.bars > 0) {
      ctx.strokeStyle = ink.bar;
      ctx.lineCap = 'round';
      const count = Math.max(3, Math.round(f.len / 30));
      const seed = Math.abs(Math.round(f.at.x * 7 + f.at.y * 13));
      for (let i = 1; i <= count; i++) {
        const jitter = ((seed * (i + 3)) % 17) / 17 - 0.5;
        const s = 0.16 + (0.74 * (i + 0.35 * jitter)) / count;
        const c = { x: f.at.x + f.dir.x * f.len * s, y: f.at.y + f.dir.y * f.len * s };
        const back = f.width * 0.3;
        ctx.globalAlpha = ink.bars * (0.25 + 0.35 * s);
        ctx.lineWidth = Math.max(1, f.width * (0.08 + 0.05 * (i % 2)));
        ctx.beginPath();
        ctx.moveTo(c.x + n.x * f.width - f.dir.x * back, c.y + n.y * f.width - f.dir.y * back);
        ctx.quadraticCurveTo(c.x + f.dir.x * back * 0.3, c.y + f.dir.y * back * 0.3, c.x - n.x * f.width - f.dir.x * back, c.y - n.y * f.width - f.dir.y * back);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (ink.tipBand > 0) {
      const s0 = { x: f.at.x + f.dir.x * f.len * 0.8, y: f.at.y + f.dir.y * f.len * 0.8 };
      const b = ctx.createLinearGradient(s0.x, s0.y, tip.x, tip.y);
      b.addColorStop(0, 'rgba(40,28,20,0)');
      b.addColorStop(0.35, `rgba(40,28,20,${0.75 * ink.tipBand})`);
      b.addColorStop(1, `rgba(30,20,14,${0.9 * ink.tipBand})`);
      ctx.fillStyle = b;
      path(ctx, shape);
      ctx.fill();
    }
    // The shadow side of the vane, the shaft.
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#1c140e';
    ctx.lineWidth = f.width * 0.35;
    ctx.beginPath();
    ctx.moveTo(f.at.x - n.x * f.width * 0.45, f.at.y - n.y * f.width * 0.45);
    ctx.lineTo(tip.x - n.x * f.width * 0.45, tip.y - n.y * f.width * 0.45);
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = ink.shaft;
    ctx.lineWidth = Math.max(0.8, f.width * 0.06);
    ctx.beginPath();
    ctx.moveTo(f.at.x + n.x * f.width * 0.08, f.at.y + n.y * f.width * 0.08);
    ctx.lineTo(tip.x - f.dir.x * f.len * 0.06, tip.y - f.dir.y * f.len * 0.06);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  inkLine(ctx, shape, 1.0, edge, boil, true);
}
