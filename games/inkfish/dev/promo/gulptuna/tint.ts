import { C, heightAt, topAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { FISH_TEX } from '../../../src/art/fishArt';
import type { Sprite } from '../sprites';

/** The bluefin look, for this short only: navy-black back, silver-white belly, yellow finlets and keel. Recolours a copy of the baked sprite; the game's art is untouched. */
const BACK = '#0b1430';
const FLANK = '#46598a';
const BELLY = '#ffffff';
const YELLOW = '#f2c418';
const FINLETS = { from: 0.66, to: 0.9 } as const;

export function bluefin(sprite: Sprite): Sprite {
  const a = ANATOMY.tuna;
  const R = sprite.res;
  const side = FISH_TEX * R;
  const top = C - a.hh * 1.0;
  const bottom = C + a.hh * 1.0;
  const frames = sprite.frames.map((src) => {
    const out = document.createElement('canvas');
    out.width = side;
    out.height = side;
    const g = out.getContext('2d')!;
    g.drawImage(src, 0, 0);
    // Darken the back and the flank (multiply), then lift the belly (screen); both only where the fish is.
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
    shade('multiply', [[0, BACK], [0.38, FLANK], [0.55, '#c9d3ea'], [1, '#ffffff']]);
    shade('screen', [[0, '#000000'], [0.5, '#000000'], [0.62, '#7d889c'], [1, BELLY]]);
    // The finlets (just outside the tail stalk's edges) and the keel on it.
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = YELLOW;
    for (let t = FINLETS.from; t < FINLETS.to; t += 0.01) {
      const x = xAt(a, t) * R;
      const w = (xAt(a, t + 0.011) - xAt(a, t)) * R + 1;
      const up = topAt(a, t) + 1.2;
      const dn = C + heightAt(a, t) - 1.2;
      g.fillRect(x, (C - 40) * R, w, (up - (C - 40)) * R);
      g.fillRect(x, dn * R, w, 40 * R);
    }
    g.fillRect(xAt(a, 0.86) * R, (C - 1.6) * R, (xAt(a, 1) - xAt(a, 0.86)) * R, 3.2 * R);
    g.globalCompositeOperation = 'source-over';
    return out;
  });
  return { ...sprite, frames };
}
