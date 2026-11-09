import { describe, expect, it } from 'vitest';
import type { Rect, SceneryArt } from '../src/art/pixel/scenery';
import { FIELD_RECT, WORLD } from '../src/scenes/battle/pixelLayout';
import { CLOUD_BAND, CLOUD_PERIOD, composeClouds, composeScenery, composeSky, HORIZON_Y, type Area, type Pixels } from '../src/scenes/battle/pixelScenery';

/** A tiny atlas: each part is a solid block of its own colour, so the output shows which part went where. */
const COLOURS = {
  patch: [40, 120, 40], tuft: [90, 200, 90], stone: [150, 150, 150], bush: [20, 80, 20],
  cloud: [250, 230, 210], far: [120, 140, 170], hill: [70, 140, 70], tree: [10, 60, 30],
} as const;
const BLOCKS: Record<keyof typeof COLOURS, Rect> = {
  patch: [0, 0, 48, 40], tuft: [48, 0, 6, 5], stone: [54, 0, 8, 6], bush: [62, 0, 20, 16],
  cloud: [82, 0, 30, 10], far: [112, 0, 120, 30], hill: [232, 0, 90, 14], tree: [322, 0, 6, 18],
};

function atlas(): Pixels {
  const w = 328;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (const [kind, [x0, y0, bw, bh]] of Object.entries(BLOCKS)) {
    const c = COLOURS[kind as keyof typeof COLOURS];
    for (let y = y0; y < y0 + bh; y++) {
      for (let x = x0; x < x0 + bw; x++) data.set([...c, 255], (y * w + x) * 4);
    }
  }
  return { data, w, h };
}

const ART: SceneryArt = {
  url: '',
  sky: [[200, '#a06040'], [40, '#c08060'], [10, '#b0b0a0']],
  ground: '#304020',
  parts: Object.fromEntries(Object.entries(BLOCKS).map(([k, r]) => [k, [r]])),
};
const WORLD_AREA: Area = { x: 0, y: 0, w: WORLD.w, h: WORLD.h };

function at(p: Pixels, x: number, y: number): number[] {
  const i = (y * p.w + x) * 4;
  return [p.data[i]!, p.data[i + 1]!, p.data[i + 2]!, p.data[i + 3]!];
}

function same(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function crop(p: Pixels, from: Area, to: Area): Pixels {
  const data = new Uint8ClampedArray(to.w * to.h * 4);
  for (let y = 0; y < to.h; y++) {
    const s = ((to.y - from.y + y) * p.w + (to.x - from.x)) * 4;
    data.set(p.data.subarray(s, s + to.w * 4), y * to.w * 4);
  }
  return { data, w: to.w, h: to.h };
}

describe('battle scenery', () => {
  it('covers every pixel of the area, sky above the horizon and ground below', () => {
    const out = composeScenery(atlas(), ART, WORLD_AREA, 7);
    for (let i = 3; i < out.data.length; i += 4) expect(out.data[i]).toBe(255);
    // The sky blends its stops (#a06040, #c08060, #b0b0a0): the top lies between them, unless a cloud covers it.
    const top = at(out, 3, 0).slice(0, 3);
    const inSky = top.every((v, k) => v >= [160, 96, 64][k]! && v <= [192, 176, 160][k]!);
    expect(inSky || top.join() === COLOURS.cloud.join()).toBe(true);
  });

  it('blends the sky smoothly: one colour a row, each a small step from the row above', () => {
    const sky = composeSky(ART, { x: 0, y: HORIZON_Y - 220, w: 16, h: 220 });
    let last: number[] | null = null;
    for (let y = 0; y < sky.h; y++) {
      const row = at(sky, 0, y).slice(0, 3);
      for (let x = 1; x < sky.w; x++) expect(at(sky, x, y).slice(0, 3)).toEqual(row);
      if (last) for (let k = 0; k < 3; k++) expect(Math.abs(row[k]! - last[k]!)).toBeLessThanOrEqual(4);
      last = row;
    }
  });

  it('is the same for the same seed and differs for another', () => {
    const a = composeScenery(atlas(), ART, WORLD_AREA, 7);
    const b = composeScenery(atlas(), ART, WORLD_AREA, 7);
    const c = composeScenery(atlas(), ART, WORLD_AREA, 8);
    expect(same(a.data, b.data)).toBe(true);
    expect(same(a.data, c.data)).toBe(false);
  });

  it('gives a wider screen more scenery round the same middle (a resize never reshuffles it)', () => {
    const wide: Area = { x: -480, y: -300, w: WORLD.w + 960, h: WORLD.h + 600 };
    const big = composeScenery(atlas(), ART, wide, 3);
    const small = composeScenery(atlas(), ART, WORLD_AREA, 3);
    expect(same(crop(big, wide, WORLD_AREA).data, small.data)).toBe(true);
  });

  it('keeps stones and bushes off the hex field', () => {
    for (const seed of [1, 2, 3, 4]) {
      const out = composeScenery(atlas(), ART, WORLD_AREA, seed);
      for (let y = FIELD_RECT.y; y < FIELD_RECT.y + FIELD_RECT.h; y += 2) {
        for (let x = FIELD_RECT.x; x < FIELD_RECT.x + FIELD_RECT.w; x += 2) {
          const c = at(out, x, y).slice(0, 3).join();
          expect(c).not.toBe(COLOURS.stone.join());
          expect(c).not.toBe(COLOURS.bush.join());
        }
      }
    }
  });

  it('puts the horizon parts on the horizon and the ground parts below it', () => {
    const out = composeScenery(atlas(), ART, { x: -200, y: -400, w: 1400, h: 1200 }, 5);
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) {
        const c = at(out, x, y).slice(0, 3).join();
        const wy = y - 400;
        if (c === COLOURS.tuft.join() || c === COLOURS.stone.join() || c === COLOURS.bush.join()) expect(wy).toBeGreaterThanOrEqual(HORIZON_Y);
        if (c === COLOURS.cloud.join()) expect(wy).toBeLessThan(HORIZON_Y - 40);
      }
    }
  });

  it('loops the cloud strip, and sky + drifting clouds + front at drift 0 is the flattened backdrop', () => {
    const tile = composeClouds(atlas(), ART, 9);
    expect(tile.w).toBe(CLOUD_PERIOD);
    // Above the mountains the flattened backdrop is only sky and clouds: clouds wherever the tile has them.
    const area: Area = { x: -CLOUD_PERIOD / 2, y: CLOUD_BAND.top, w: CLOUD_PERIOD * 2, h: HORIZON_Y - 150 - CLOUD_BAND.top };
    const all = composeScenery(atlas(), ART, area, 9);
    const sky = composeSky(ART, area);
    const front = composeScenery(atlas(), ART, area, 9, 'front');
    let clouds = 0;
    for (let y = 0; y < area.h; y += 3) {
      for (let x = 0; x < area.w; x += 3) {
        const wx = area.x + x;
        const t = at(tile, ((wx % CLOUD_PERIOD) + CLOUD_PERIOD) % CLOUD_PERIOD, y);
        const want = t[3] === 255 ? t : at(sky, x, y);
        if (t[3] === 255) clouds++;
        expect(at(all, x, y)).toEqual(want);
        expect(at(front, x, y)[3]).toBe(0);
      }
    }
    expect(clouds).toBeGreaterThan(0);
  });
});
