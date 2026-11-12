import { bottomAt, C, topAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { FISH_TEX } from '../../../src/art/fishArt';
import type { Sprite } from '../sprites';

/**
 * The mako's real colours, for this short only, so the meal stands clear of the dark navy viper: a copy of the baked
 * sprite (the game's art is untouched) with the back lifted to a lighter steel blue (screen) and the belly pushed to
 * bright white, over a crisp colour line. The viper stays deep blue, the shark reads blue-over-white.
 */
export function steel(sprite: Sprite): Sprite {
  const a = ANATOMY.mako;
  const R = sprite.res;
  const side = FISH_TEX * R;
  const top = C - a.hh;
  const bottom = C + a.hh;
  const frames = sprite.frames.map((src) => {
    const out = document.createElement('canvas');
    out.width = side;
    out.height = side;
    const g = out.getContext('2d')!;
    g.drawImage(src, 0, 0);
    const layer = document.createElement('canvas');
    layer.width = side;
    layer.height = side;
    const l = layer.getContext('2d')!;
    l.drawImage(out, 0, 0);
    l.globalCompositeOperation = 'screen';
    const grad = l.createLinearGradient(0, top * R, 0, bottom * R);
    grad.addColorStop(0, '#3f6aa6');
    grad.addColorStop(0.38, '#5f8cc4');
    grad.addColorStop(0.55, '#a9c0de');
    grad.addColorStop(0.72, '#e8eef5');
    grad.addColorStop(1, '#e8eef5');
    l.fillStyle = grad;
    l.fillRect(0, 0, side, side);
    l.globalCompositeOperation = 'destination-in';
    l.drawImage(src, 0, 0);
    g.clearRect(0, 0, side, side);
    g.drawImage(layer, 0, 0);
    // Countershading: the belly is off-white, going to a faint cool shadow along its bottom edge (the fins under it too).
    g.globalCompositeOperation = 'multiply';
    const shade = g.createLinearGradient(0, top * R, 0, (bottom + 0.35 * a.hh) * R);
    shade.addColorStop(0, '#ffffff');
    shade.addColorStop(0.62, '#ffffff');
    shade.addColorStop(0.82, '#eef2f8');
    shade.addColorStop(1, '#a9b8d0');
    g.fillStyle = shade;
    g.fillRect(0, 0, side, side);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(src, 0, 0);
    // Five thin curved gill slits behind the eye, a touch darker than the skin.
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = '#1d3358';
    g.globalAlpha = 0.85;
    g.lineCap = 'round';
    g.lineWidth = 0.75 * R;
    for (let i = 0; i < 5; i++) {
      const t = 0.205 + i * 0.02;
      const x = xAt(a, t) * R;
      const y0 = topAt(a, t) + (bottomAt(a, t) - topAt(a, t)) * 0.26;
      const y1 = topAt(a, t) + (bottomAt(a, t) - topAt(a, t)) * 0.62;
      g.beginPath();
      g.moveTo(x, y0 * R);
      g.quadraticCurveTo(x - 2.4 * R, ((y0 + y1) / 2) * R, x + 0.4 * R, y1 * R);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    return out;
  });
  return { ...sprite, frames };
}
