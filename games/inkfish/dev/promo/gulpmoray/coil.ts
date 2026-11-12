import { C, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import { drawSwimmer, pointOn, type SwimLook } from '../gape/swimmer';
import { ramp, VIDEO } from '../short';
import type { Sprite } from '../sprites';
import { paintEel, type Pt } from './eel';

/** Turns of the coil, how far in it winds (share of the belly's radius) and how faint it shows through the skin. */
const TURNS = 1.75;
/** Where along the coil the head leaves the spiral (its share of the length, about its true one). */
const HEAD_FROM = 0.93;
const INWARD = 0.55;
const SHOW = 0.5;
/** The coiled eel's half-depth, as a share of the belly's half-height: thick loops, just clear of each other. */
const COIL_DEPTH = 0.22;

export interface CoilLayers {
  /** The coil is painted here, then cut to the viper's silhouette. */
  readonly paint: CanvasRenderingContext2D;
  /** The viper's silhouette. */
  readonly mask: CanvasRenderingContext2D;
}

export function makeCoilLayers(): CoilLayers {
  const make = (): CanvasRenderingContext2D => {
    const c = document.createElement('canvas');
    c.width = VIDEO.width;
    c.height = VIDEO.height;
    return c.getContext('2d')!;
  };
  return { paint: make(), mask: make() };
}

/**
 * The swallowed moray coiled in the belly, seen faintly through the stretched
 * skin: painted whole (a few thick mottled loops, its head at the inner end,
 * the body winding back out to the throat) on its own layer, cut to the
 * viper's silhouette and faded at the belly's edge, laid on at a low alpha,
 * then a sheen of stretched skin over it. `amount` (0 .. 1) is how far along
 * the coil its nose has got; `fade` how strongly it shows.
 */
export function drawBellyCoil(
  ctx: CanvasRenderingContext2D, layers: CoilLayers, viper: Sprite, you: Pose, look: SwimLook, amount: number, fade: number, t: number, boil: number,
): void {
  const b = look.belly;
  if (!b) return;
  const show = fade * ramp(b.size, 0.1, 0.6);
  if (amount <= 0.01 || show <= 0.01) return;
  const a = ANATOMY.viperfish;
  const x0 = xAt(a, b.at + b.width * 0.34);
  const x1 = xAt(a, b.at - b.width * 0.34);
  const cx = (x0 + x1) / 2;
  const rx = Math.abs(x1 - x0) / 2;
  const ry = a.hh * 0.62;
  const cy = C + a.hh * 0.18;
  const at = (tex: Pt): Pt => pointOn(viper, you, look, tex);
  // u 0 at the throat (the front of the belly, high) .. HEAD_FROM winding inwards .. 1 its nose: the head lying straight at the front, pointing forward.
  const wound = (u: number): Pt => {
    const w = Math.min(u, HEAD_FROM) / HEAD_FROM;
    const th = -0.45 - w * TURNS * Math.PI * 2;
    const r = (1 - INWARD * w) * (1 + 0.04 * Math.sin(3 * th + 2 * t));
    return { x: cx + rx * r * Math.cos(th), y: cy + ry * r * Math.sin(th) };
  };
  const path = (u: number): Pt => {
    const from = wound(u);
    if (u <= HEAD_FROM) return at(from);
    const k = (u - HEAD_FROM) / (1 - HEAD_FROM);
    return at({ x: from.x + (cx + rx * 0.9 - from.x) * k, y: from.y + (cy + ry * 0.02 - from.y) * k });
  };
  const top = at({ x: cx, y: cy - ry });
  const bottom = at({ x: cx, y: cy + ry });
  const front = at({ x: cx + rx, y: cy });
  const back = at({ x: cx - rx, y: cy });
  const half = Math.hypot(bottom.x - top.x, bottom.y - top.y) / 2;
  const centre = at({ x: cx, y: cy });

  const { paint, mask } = layers;
  mask.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(mask, viper, you, boil, { ...look, part: 'body' });
  paint.clearRect(0, 0, VIDEO.width, VIDEO.height);
  // Its nose has got `amount` along the coil, the body trailing back to the throat.
  paintEel(paint, { spine: (f) => path(Math.max(0, amount - f)), depth: half * COIL_DEPTH, boil, fins: false, to: Math.min(1, amount) });
  cut(paint, mask, centre, front, back, half);
  ctx.save();
  ctx.globalAlpha = SHOW * show;
  ctx.drawImage(paint.canvas, 0, 0);
  ctx.restore();

  // The stretched skin's sheen over it, high on the belly.
  paint.clearRect(0, 0, VIDEO.width, VIDEO.height);
  const lit = at({ x: cx + rx * 0.15, y: cy - ry * 0.55 });
  const g = paint.createRadialGradient(lit.x, lit.y, 0, lit.x, lit.y, half * 1.4);
  g.addColorStop(0, 'rgba(232,240,255,0.5)');
  g.addColorStop(0.5, 'rgba(232,240,255,0.16)');
  g.addColorStop(1, 'rgba(232,240,255,0)');
  paint.fillStyle = g;
  paint.fillRect(0, 0, VIDEO.width, VIDEO.height);
  cut(paint, mask, centre, front, back, half);
  ctx.save();
  ctx.globalAlpha = 0.55 * show;
  ctx.drawImage(paint.canvas, 0, 0);
  ctx.restore();
}

/** Keeps only what lies inside the viper and the belly, softly faded at the belly's edge (the throat end of the coil melts away there). */
function cut(paint: CanvasRenderingContext2D, mask: CanvasRenderingContext2D, centre: Pt, front: Pt, back: Pt, half: number): void {
  paint.save();
  paint.globalCompositeOperation = 'destination-in';
  paint.drawImage(mask.canvas, 0, 0);
  const rx = Math.hypot(front.x - back.x, front.y - back.y) / 2;
  paint.translate(centre.x, centre.y);
  paint.rotate(Math.atan2(front.y - back.y, front.x - back.x));
  paint.scale(rx * 1.22, half * 1.2);
  const g = paint.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.86, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  paint.fillStyle = g;
  paint.fillRect(-2, -2, 4, 4);
  paint.restore();
}
