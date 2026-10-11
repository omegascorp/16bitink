import { describe, expect, it } from 'vitest';
import type { SfxId } from '../src/audio/recipes';
import type { SoundBoard } from '../src/audio/sound';
import { buildLevel } from '../src/level/build';
import { BEACH_1 } from '../src/level/beach1';
import { Beach, type SimEvent } from '../src/logic/sim';
import { Soundscape } from '../src/scenes/game/soundscape';

const view = { x: 0, y: 0, width: 4000, height: 4000, left: 0, right: 4000, top: 0, bottom: 4000 } as unknown as Phaser.Geom.Rectangle;

function setup(): { heard: SfxId[]; scape: Soundscape; beach: Beach } {
  const heard: SfxId[] = [];
  const board = { play: (id: SfxId) => heard.push(id) } as unknown as SoundBoard;
  const beach = new Beach(buildLevel(BEACH_1[0]!));
  return { heard, scape: new Soundscape(board, beach), beach };
}

describe('level sounds', () => {
  it('sounds the sand the crab moves, but not the tide smoothing it', () => {
    const { heard, scape, beach } = setup();
    const at: [number, number][] = [[3, 3]];
    const events: SimEvent[] = [
      { type: 'tiles', tiles: at, dug: true },
      { type: 'tiles', tiles: at, dug: false, placed: true },
      { type: 'tiles', tiles: at, dug: false, poured: true },
      { type: 'tiles', tiles: at, dug: false, poured: true, washed: true },
      { type: 'tiles', tiles: at, dug: false },
    ];
    for (const e of events) scape.react(e, beach, view);
    expect(heard).toEqual(['dig', 'place', 'pour']);
  });

  it('crunches a meal, and bonks one wasted in a full shell', () => {
    const { heard, scape, beach } = setup();
    scape.react({ type: 'ate', id: 1, points: 2, wasted: 0, x: 10, y: 10 }, beach, view);
    scape.react({ type: 'ate', id: 2, points: 2, wasted: 2, x: 10, y: 10 }, beach, view);
    expect(heard).toEqual(['eat', 'full']);
  });

  it('gives every shell move and mission moment its own sound', () => {
    const { heard, scape, beach } = setup();
    const events: SimEvent[] = [
      { type: 'swapStart', id: 1 }, { type: 'rapped', x: 0, y: 0, item: 1 }, { type: 'traded', x: 0, y: 0, item: 1 },
      { type: 'joined', x: 0, y: 0, line: 1 }, { type: 'collected', x: 0, y: 0, count: 1 }, { type: 'quarry', x: 0, y: 0, giant: false },
      { type: 'struck', x: 0, y: 0 }, { type: 'won' },
    ];
    for (const e of events) scape.react(e, beach, view);
    expect(heard).toEqual(['out', 'knock', 'trade', 'join', 'find', 'quarry', 'tok', 'win']);
  });

  it('stays quiet on a frame where nothing changed', () => {
    const { heard, scape, beach } = setup();
    scape.listen(beach, view);
    scape.listen(beach, view);
    expect(heard).toEqual([]);
  });
});
