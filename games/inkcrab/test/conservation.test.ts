import { describe, expect, it } from 'vitest';
import { buildTestBeach } from '../src/level/testBeach';
import { createRng } from '../src/logic/rng';
import { Beach, IDLE, type Input } from '../src/logic/sim';
import { TILE, type Terrain } from '../src/logic/terrain';

const sandTiles = (t: Terrain): number => t.tiles.reduce((n, v) => n + (v === TILE.sand || v === TILE.placed ? 1 : 0), 0);

/**
 * Random play: held inputs that change every few frames, as a player's do,
 * alternating between digging until full and unloading until empty so a
 * lot of sand moves.
 */
function randomInput(rng: () => number, b: Beach, digging: boolean): Input {
  const T = b.tileSize;
  const c = b.crab.body;
  const tap = rng() < 0.15
    ? ([Math.floor((c.x + c.w / 2) / T) + Math.floor(rng() * 3) - 1, Math.floor((c.y + c.h / 2) / T) + Math.floor(rng() * 3) - 1] as const)
    : null;
  return {
    ...IDLE,
    moveX: [-1, 0, 0, 1][Math.floor(rng() * 4)]!,
    aimY: ([-1, 0, 1] as const)[Math.floor(rng() * 3)]!,
    jump: rng() < 0.1,
    dig: digging,
    place: !digging,
    interact: rng() < 0.05,
    hide: rng() < 0.05,
    tapTile: tap,
  };
}

describe('sand is conserved', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    it(`never makes or loses a clump in random play (seed ${seed})`, () => {
      const b = new Beach(buildTestBeach(20261005));
      const rng = createRng(seed);
      const total = (): number => sandTiles(b.terrain) + b.crab.sand;
      const start = total();
      let input = IDLE;
      let digging = true;
      let dug = 0;
      let changed = 0;
      for (let frame = 0; frame < 60 * 300; frame++) {
        if (digging && b.crab.sand >= b.sandCapacity) digging = false;
        else if (!digging && b.crab.sand === 0) digging = true;
        if (frame % 8 === 0) input = randomInput(rng, b, digging);
        for (const e of b.step(input, 1 / 60)) {
          if (e.type === 'tiles' && e.dug) dug += e.tiles.length;
          else if (e.type === 'tiles') changed += e.tiles.length;
        }
        const now = total();
        if (now !== start) throw new Error(`frame ${frame}: total ${now} (started ${start}), carried ${b.crab.sand}, input ${JSON.stringify(input)}`);
      }
      expect(total()).toBe(start);
      // The run has to have actually dug and built for this to mean anything.
      expect(dug).toBeGreaterThan(40);
      expect(changed).toBeGreaterThan(80);
    });
  }
});
