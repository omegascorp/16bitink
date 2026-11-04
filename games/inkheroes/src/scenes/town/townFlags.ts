import type { TownArt } from '../../art/pixel/town';
import type { Pixels } from '../battle/pixelScenery';

/**
 * The town's flags, cut from their sprites so they can fly: each one's
 * cloth lifted out of the still sprite and drawn again in a few frames of
 * a wave that grows from the pole to the tip. No Phaser here, so it can
 * be tested.
 */

/** A flag's cloth in its sprite (pixels, from the top-left, the pole left of it). `over`: it flies in front of the building, so only its blue cloth and outline are its own. */
export interface FlagSpot {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly over?: boolean;
}

export const FLAGS: Partial<Record<TownArt, readonly FlagSpot[]>> = {
  'walls-castle': [{ x: 119, y: 4, w: 14, h: 10 }, { x: 44, y: 85, w: 13, h: 9 }, { x: 194, y: 86, w: 13, h: 9 }, { x: 122, y: 124, w: 13, h: 9, over: true }],
  'walls-citadel': [{ x: 113, y: 4, w: 19, h: 14 }, { x: 40, y: 37, w: 18, h: 14 }, { x: 188, y: 37, w: 18, h: 14 }, { x: 113, y: 69, w: 19, h: 14, over: true }],
  'hall-capitol': [{ x: 112, y: 6, w: 11, h: 10 }],
  'wall-tower': [{ x: 30, y: 2, w: 9, h: 10 }],
  tiltyard: [{ x: 100, y: 1, w: 19, h: 9 }],
};

/** Frames in a flag's wave, and how long each shows (ms). */
export const FLAG_FRAMES = 6;
export const FLAG_FRAME_MS = 130;

/** How far a flag's tip swings up and down, pixels. */
export const flagAmp = (spot: FlagSpot): number => Math.max(1, Math.round(spot.h / 8));

/** One flying flag: its frames (all one size) and where their top-left goes in the sprite. */
export interface FlagCut {
  readonly x: number;
  readonly y: number;
  readonly frames: readonly Pixels[];
}

const blueCloth = (d: Uint8ClampedArray, i: number): boolean => d[i + 3]! >= 128 && d[i + 2]! > d[i]! + 45 && d[i + 2]! > d[i + 1]! + 15;
const dark = (d: Uint8ClampedArray, i: number): boolean => d[i + 3]! >= 128 && d[i]! + d[i + 1]! + d[i + 2]! < 240;

/** Which pixels of `spot` are the flag's: every opaque one, or (over the building) the blue cloth and the dark outline touching it. */
function flagMask(src: Pixels, spot: FlagSpot): boolean[] {
  const { data, w } = src;
  const at = (x: number, y: number): number => (y * w + x) * 4;
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < src.w && y < src.h;
  const mask: boolean[] = [];
  for (let v = 0; v < spot.h; v++) {
    for (let u = 0; u < spot.w; u++) {
      const x = spot.x + u;
      const y = spot.y + v;
      if (!inside(x, y)) {
        mask.push(false);
        continue;
      }
      const i = at(x, y);
      if (!spot.over) {
        mask.push(data[i + 3]! >= 128);
        continue;
      }
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1 && !edge; dx++) edge = inside(x + dx, y + dy) && blueCloth(data, at(x + dx, y + dy));
      mask.push(blueCloth(data, i) || (dark(data, i) && edge));
    }
  }
  return mask;
}

/**
 * `src` with its flags lifted out (`still`), and each flag's frames. Where a
 * flag flew in front of the building, the hole is filled from the nearest
 * pixel above or below it in the same column.
 */
export function cutFlags(src: Pixels, spots: readonly FlagSpot[]): { still: Pixels; flags: FlagCut[] } {
  const still = new Uint8ClampedArray(src.data);
  const flags = spots.map((spot) => {
    const mask = flagMask(src, spot);
    const amp = flagAmp(spot);
    const fw = spot.w;
    const fh = spot.h + amp * 2;
    const frames: Pixels[] = [];
    for (let f = 0; f < FLAG_FRAMES; f++) {
      const out = new Uint8ClampedArray(fw * fh * 4);
      const phase = (f / FLAG_FRAMES) * Math.PI * 2;
      for (let u = 0; u < spot.w; u++) {
        // Still at the pole, swinging most at the tip, the wave running out along it.
        const dy = Math.round(amp * (u / Math.max(1, spot.w - 1)) * Math.sin(phase - u * 0.7));
        for (let v = 0; v < spot.h; v++) {
          if (!mask[v * spot.w + u]) continue;
          const s = ((spot.y + v) * src.w + spot.x + u) * 4;
          const d = ((v + amp + dy) * fw + u) * 4;
          out.set(src.data.subarray(s, s + 4), d);
        }
      }
      frames.push({ data: out, w: fw, h: fh });
    }
    for (let u = 0; u < spot.w; u++) {
      for (let v = 0; v < spot.h; v++) {
        if (!mask[v * spot.w + u]) continue;
        const x = spot.x + u;
        const i = ((spot.y + v) * src.w + x) * 4;
        still[i + 3] = 0;
        if (!spot.over) continue;
        // The wall behind: the nearest pixel of the same column that isn't the flag's.
        for (let k = 1; k < spot.h + 2; k++) {
          const from = [v - k, v + k].find((r) => r >= 0 && r < spot.h ? !mask[r * spot.w + u] : true);
          if (from === undefined) continue;
          const y = spot.y + from;
          if (y < 0 || y >= src.h) break;
          const j = (y * src.w + x) * 4;
          if (src.data[j + 3]! < 128) break;
          still.set(src.data.subarray(j, j + 4), i);
          break;
        }
      }
    }
    return { x: spot.x, y: spot.y - amp, frames };
  });
  return { still: { data: still, w: src.w, h: src.h }, flags };
}
