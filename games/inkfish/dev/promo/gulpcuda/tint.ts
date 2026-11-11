import { C, heightAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { FISH_TEX } from '../../../src/art/fishArt';
import type { Sprite } from '../sprites';

/**
 * The barracuda's real silver, for this short only, so the meal stands clear of the dark navy viper: a copy of the
 * baked sprite (the game's art is untouched) with a steel-blue back (multiply) grading to a silver flank and a white
 * belly (screen), then clear dark chevrons along the upper flank and a few black blotches towards the tail.
 */
export function silvery(sprite: Sprite): Sprite {
  const a = ANATOMY.barracuda;
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
    const shade = (op: GlobalCompositeOperation, stops: readonly (readonly [number, string])[]): void => {
      const layer = document.createElement('canvas');
      layer.width = side;
      layer.height = side;
      const l = layer.getContext('2d')!;
      l.drawImage(out, 0, 0);
      l.globalCompositeOperation = op;
      const grad = l.createLinearGradient(0, top * R, 0, bottom * R);
      stops.forEach(([at, color]) => grad.addColorStop(at, color));
      l.fillStyle = grad;
      l.fillRect(0, 0, side, side);
      l.globalCompositeOperation = 'destination-in';
      l.drawImage(src, 0, 0);
      g.clearRect(0, 0, side, side);
      g.drawImage(layer, 0, 0);
    };
    shade('multiply', [[0, '#2f4560'], [0.3, '#5d7694'], [0.55, '#c3cfdc'], [1, '#ffffff']]);
    shade('screen', [[0, '#000000'], [0.45, '#2a3442'], [0.7, '#8a96a6'], [1, '#ffffff']]);
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = '#141c2b';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 1.7 * R;
    const N = 17;
    for (let i = 0; i < N; i++) {
      const t = 0.27 + (i / (N - 1)) * 0.6;
      const x = xAt(a, t) * R;
      const h = heightAt(a, t);
      g.beginPath();
      g.moveTo(x - 2.2 * R, (C - h * 0.8) * R);
      g.lineTo(x + 1.6 * R, (C - h * 0.3) * R);
      g.lineTo(x - 2.2 * R, (C + h * 0.1) * R);
      g.stroke();
    }
    g.fillStyle = '#05070c';
    for (const [t, dy, r] of [[0.64, 0.38, 2.8], [0.74, 0.3, 2.4], [0.84, 0.2, 2]] as const) {
      g.beginPath();
      g.ellipse(xAt(a, t) * R, (C + heightAt(a, t) * dy) * R, r * 1.3 * R, r * R, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    return out;
  });
  return { ...sprite, frames };
}
