import { bottomAt, topAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { FISH_TEX } from '../../../src/art/fishArt';
import type { Sprite } from '../sprites';

/** The golden grouper look, for this short only: a warm light ochre body, paler belly, the dark bars and mottles kept. Recolours a copy of the baked sprite; the game's art is untouched. */
const LIFT = '#8c5e1a';
const WARM = '#f2c880';
const BELLY_LIFT = '#3a2a10';

export function goldGrouper(sprite: Sprite): Sprite {
  const side = FISH_TEX * sprite.res;
  const frames = sprite.frames.map((src) => {
    const out = document.createElement('canvas');
    out.width = side;
    out.height = side;
    const g = out.getContext('2d')!;
    g.drawImage(src, 0, 0);
    // Lift the brown to ochre (screen), then a second, paler lift over the whole sprite; both only where the fish is.
    for (const [op, color, alpha] of [['screen', LIFT, 1], ['screen', BELLY_LIFT, 0.6], ['multiply', WARM, 1]] as const) {
      const layer = document.createElement('canvas');
      layer.width = side;
      layer.height = side;
      const l = layer.getContext('2d')!;
      l.drawImage(out, 0, 0);
      l.globalCompositeOperation = op;
      l.globalAlpha = alpha;
      l.fillStyle = color;
      l.fillRect(0, 0, side, side);
      l.globalAlpha = 1;
      l.globalCompositeOperation = 'destination-in';
      l.drawImage(src, 0, 0);
      g.clearRect(0, 0, side, side);
      g.drawImage(layer, 0, 0);
    }
    // Broad, soft dark-brown oblique bars, slanting back-down, only where the fish is.
    const a = ANATOMY.grouper;
    const R = sprite.res;
    const bars = document.createElement('canvas');
    bars.width = side;
    bars.height = side;
    const b = bars.getContext('2d')!;
    b.filter = `blur(${2.5 * R}px)`;
    b.fillStyle = '#3a2410';
    for (let i = 0; i < 5; i++) {
      const t0 = 0.12 + i * 0.13;
      const w = 0.055;
      const pts = [[xAt(a, t0), topAt(a, t0) - 4], [xAt(a, t0 + w), topAt(a, t0 + w) - 4], [xAt(a, t0 + w + 0.2), bottomAt(a, t0 + w + 0.2) + 4], [xAt(a, t0 + 0.2), bottomAt(a, t0 + 0.2) + 4]];
      b.beginPath();
      pts.forEach(([x, y], k) => (k === 0 ? b.moveTo(x! * R, y! * R) : b.lineTo(x! * R, y! * R)));
      b.closePath();
      b.fill();
    }
    b.filter = 'none';
    b.globalCompositeOperation = 'destination-in';
    b.drawImage(src, 0, 0);
    g.globalAlpha = 0.6;
    g.drawImage(bars, 0, 0);
    g.globalAlpha = 1;
    return out;
  });
  return { ...sprite, frames };
}
