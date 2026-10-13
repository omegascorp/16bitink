import { VIDEO } from '../short';
import type { Pt } from './scene';

/**
 * Light and dark over the picture: a layer of night laid over everything,
 * with holes where light falls (the deck lamp's beam, a faint glow round
 * the fish so it can just be made out, the lens), and the lamp's warm glow
 * added back on top.
 */

export interface Beam {
  /** The lamp's glass, on screen, and where it points (radians, 0 right, π/2 down). */
  readonly from: Pt;
  readonly aim: number;
  /** How far it reaches, px. */
  readonly reach: number;
  readonly strength: number;
}

export interface Hole {
  readonly at: Pt;
  readonly r: number;
  readonly strength: number;
  /** Hard-edged (the lens) or soft (a glow). */
  readonly hard: boolean;
}

const SPREAD = 0.27;

/** The beam's wedge as a path. */
function wedge(ctx: CanvasRenderingContext2D, b: Beam): void {
  ctx.beginPath();
  ctx.moveTo(b.from.x, b.from.y);
  ctx.arc(b.from.x, b.from.y, b.reach, b.aim - SPREAD, b.aim + SPREAD);
  ctx.closePath();
}

function beamGradient(ctx: CanvasRenderingContext2D, b: Beam, colour: (a: number) => string, strength: number): CanvasGradient {
  const g = ctx.createRadialGradient(b.from.x, b.from.y, 0, b.from.x, b.from.y, b.reach);
  g.addColorStop(0, colour(strength));
  g.addColorStop(0.55, colour(strength * 0.85));
  g.addColorStop(1, colour(0));
  return g;
}

export function makeShade(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  return canvas;
}

/** Lays the night (`dark` 0 .. 1) over the picture, lit where the beam and the holes are. */
export function drawShade(ctx: CanvasRenderingContext2D, shade: HTMLCanvasElement, dark: number, beam: Beam | null, holes: readonly Hole[]): void {
  if (dark <= 0.002) return;
  const s = shade.getContext('2d')!;
  s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, shade.width, shade.height);
  s.fillStyle = `rgba(1,3,10,${dark.toFixed(4)})`;
  s.fillRect(0, 0, shade.width, shade.height);
  s.globalCompositeOperation = 'destination-out';
  if (beam && beam.strength > 0) {
    // Soft edges: the wedge a few times, each a little narrower.
    for (const k of [1, 0.8, 0.6]) {
      wedge(s, { ...beam, aim: beam.aim });
      s.save();
      s.clip();
      s.fillStyle = beamGradient(s, beam, (a) => `rgba(0,0,0,${(a * 0.4 * k).toFixed(4)})`, beam.strength);
      s.beginPath();
      s.moveTo(beam.from.x, beam.from.y);
      s.arc(beam.from.x, beam.from.y, beam.reach, beam.aim - SPREAD * k, beam.aim + SPREAD * k);
      s.closePath();
      s.fill();
      s.restore();
    }
  }
  for (const h of holes) {
    if (h.strength <= 0) continue;
    s.beginPath();
    if (h.hard) {
      s.fillStyle = `rgba(0,0,0,${h.strength.toFixed(4)})`;
      s.arc(h.at.x, h.at.y, h.r, 0, Math.PI * 2);
    } else {
      const g = s.createRadialGradient(h.at.x, h.at.y, 0, h.at.x, h.at.y, h.r);
      g.addColorStop(0, `rgba(0,0,0,${h.strength.toFixed(4)})`);
      g.addColorStop(0.6, `rgba(0,0,0,${(h.strength * 0.6).toFixed(4)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      s.fillStyle = g;
      s.arc(h.at.x, h.at.y, h.r, 0, Math.PI * 2);
    }
    s.fill();
  }
  s.globalCompositeOperation = 'source-over';
  ctx.drawImage(shade, 0, 0);
}

/** The beam's warm light added over the picture. */
export function drawBeamGlow(ctx: CanvasRenderingContext2D, beam: Beam | null): void {
  if (!beam || beam.strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  wedge(ctx, beam);
  ctx.fillStyle = beamGradient(ctx, beam, (a) => `rgba(255,214,140,${(a * 0.13).toFixed(4)})`, beam.strength);
  ctx.fill();
  // The glare at the glass.
  const g = ctx.createRadialGradient(beam.from.x, beam.from.y, 0, beam.from.x, beam.from.y, 90);
  g.addColorStop(0, `rgba(255,240,200,${(0.7 * beam.strength).toFixed(4)})`);
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(beam.from.x - 90, beam.from.y - 90, 180, 180);
  ctx.restore();
}
