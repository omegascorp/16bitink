import { describe, expect, it } from 'vitest';
import { HERO_ART, UNIT_ART } from '../src/art/pixel/manifest';
import { armyOf } from '../src/logic/army';
import { createBattle } from '../src/logic/battle';
import type { BattleHero } from '../src/logic/battleTypes';
import { creature } from '../src/logic/creatures';
import { bookSize, drawBook, drawFrame, drawPicture, drawPortrait, drawSocket, drawRibbon, drawRule, EDGE, FACE, FILLS, pageOrigin, pictureOffset, RIBBONS, RIMS, SLOT } from '../src/scenes/battle/pixelFrames';
import type { PixelBuffer } from '../src/scenes/battle/pixelRaster';
import type { Pixels } from '../src/scenes/battle/pixelScenery';
import { unitInfo } from '../src/scenes/battle/unitCard';

function at(b: PixelBuffer, x: number, y: number): number[] {
  const i = (y * b.w + x) * 4;
  return [b.data[i]!, b.data[i + 1]!, b.data[i + 2]!, b.data[i + 3]!];
}

describe('battle UI frames', () => {
  it('cuts the corners, outlines the edge and lights the rim from the top left', () => {
    const f = drawFrame(30, 20, { rim: 'bronze', fill: FILLS.button });
    for (const [x, y] of [[0, 0], [29, 0], [0, 19], [29, 19]] as const) expect(at(f, x, y)[3]).toBe(0);
    expect(at(f, 10, 0)).toEqual([...EDGE]);
    expect(at(f, 0, 10)).toEqual([...EDGE]);
    expect(at(f, 10, 1)).toEqual([...RIMS.bronze.light]);
    expect(at(f, 1, 10)).toEqual([...RIMS.bronze.light]);
    expect(at(f, 10, 18)).toEqual([...RIMS.bronze.dark]);
    expect(at(f, 28, 10)).toEqual([...RIMS.bronze.dark]);
    expect(at(f, 15, 10)).toEqual([...FILLS.button]);
  });

  it('leaves the inside clear without a fill', () => {
    const f = drawFrame(12, 12, { rim: 'gold', fill: null });
    expect(at(f, 6, 6)[3]).toBe(0);
  });

  it('draws the rule the width it is asked, its diamond in the middle', () => {
    const r = drawRule(41);
    expect(r.w).toBe(41);
    expect(at(r, 20, 2)).toEqual([...RIMS.gold.mid]);
    expect(at(r, 5, 2)).toEqual([...RIMS.bronze.light]);
  });
});

describe('turn-order portraits', () => {
  /** A face crop with one red pixel at its top left and the rest clear. */
  const face: Pixels = (() => {
    const data = new Uint8ClampedArray(FACE * FACE * 4);
    data.set([200, 40, 30, 255], 0);
    return { data, w: FACE, h: FACE };
  })();

  it('puts the face 1:1 inside the frame, mirrored for the right-hand side', () => {
    const left = drawPortrait(face, 'player', false, false);
    expect(left.w).toBe(SLOT);
    expect(at(left, 2, 2)).toEqual([200, 40, 30, 255]);
    expect(at(left, 3, 2)).toEqual(at(drawSocket(SLOT, 'player'), 3, 2));
    const right = drawPortrait(face, 'enemy', true, false);
    expect(at(right, 2 + FACE - 1, 2)).toEqual([200, 40, 30, 255]);
    expect(at(right, 1, 10)).toEqual([...RIMS.enemy.light]);
  });

  it('darkens a unit that has waited', () => {
    const p = drawPortrait(face, 'player', false, true);
    const [r] = at(p, 2, 2);
    expect(r).toBeLessThan(200);
  });

  it('has a face point inside every unit and hero frame', () => {
    for (const art of [...Object.values(UNIT_ART), ...Object.values(HERO_ART)]) {
      expect(art.face, art.name).toBeDefined();
      const { x, y } = art.face!;
      expect(x - FACE / 2, art.name).toBeGreaterThanOrEqual(0);
      expect(y - FACE / 2, art.name).toBeGreaterThanOrEqual(0);
      expect(x + FACE / 2, art.name).toBeLessThanOrEqual(art.w);
      expect(y + FACE / 2, art.name).toBeLessThanOrEqual(art.footY);
    }
  });
});

describe('unit info card', () => {
  const hero = (o: Partial<BattleHero> = {}): BattleHero => ({ name: 'Rowan', attack: 0, defense: 0, power: 1, mana: 20, spells: [], skills: {}, morale: 0, luck: 0, ...o });

  it('lists the stats, the battle\'s changes in brackets after the creature\'s own', () => {
    const { state } = createBattle({ hero: hero({ attack: 2 }), army: armyOf([{ creature: 'bowman', count: 12 }]) }, { hero: null, army: armyOf([{ creature: 'wolf', count: 9 }]) }, 1);
    const slinger = state.stacks.find((s) => s.side === 0)!;
    const info = unitInfo(state, slinger);
    expect(info.rows.map((r) => r.stat)).toEqual(['attack', 'defense', 'shots', 'damage', 'health', 'left', 'speed']);
    const base = creature('bowman');
    expect(info.rows[0]!.value).toBe(`${base.attack} (${base.attack + 2})`);
    expect(info.rows[1]!.value).toBe(`${base.defense}`);
    expect(info.notes).toContain('Shoots');
    expect(info.count).toBe(12);
    const wolf = unitInfo(state, state.stacks.find((s) => s.side === 1)!);
    expect(wolf.rows.some((r) => r.stat === 'shots')).toBe(false);
  });
});

describe('unit picture', () => {
  it('stands a short unit on the ground and lowers a tall one to keep its head in', () => {
    const short = pictureOffset({ l: 30, t: 40, r: 70, b: 90 }, 90, 112, 112);
    expect(short.y + 90).toBe(112 - 8);
    expect(short.x).toBe(56 - 50);
    const tall = pictureOffset({ l: 20, t: 4, r: 120, b: 128 }, 128, 112, 112);
    expect(tall.y + 4).toBe(3);
  });

  it('draws the frame over the scene, clipped to the picture', () => {
    const sheet: Pixels = { data: new Uint8ClampedArray(4 * 4 * 4).fill(255), w: 4, h: 4 };
    const p = drawPicture(null, sheet, 0, 4, 4, { x: 10, y: 10 }, 12, 12);
    expect(at(p, 10, 10)).toEqual([255, 255, 255, 255]);
    expect(at(p, 0, 0)).toEqual([...FILLS.portrait]);
    expect(p.w).toBe(12);
  });
});

describe('spellbook', () => {
  it('lays two pages side by side in a leather cover, a fold at the spine', () => {
    const b = drawBook(100, 80);
    expect(bookSize(100, 80)).toEqual({ w: b.w, h: b.h });
    const left = pageOrigin(100, 0);
    const right = pageOrigin(100, 1);
    expect(right.x - left.x).toBe(100 + 8);
    // The middle of a page is plain parchment; the spine-side column of the left page is the fold.
    expect(at(b, left.x + 50, left.y + 40)).toEqual([228, 204, 158, 255]);
    expect(at(b, left.x + 99, left.y + 40)).toEqual([126, 92, 58, 255]);
    for (const [x, y] of [[0, 0], [b.w - 1, 0]] as const) expect(at(b, x, y)[3]).toBe(0);
  });

  it('notches a ribbon at its free end', () => {
    const r = drawRibbon(30, 20, RIBBONS.red, 'right');
    expect(at(r, 29, 10)[3]).toBe(0);
    expect(at(r, 29, 1)[3]).toBe(255);
    expect(at(r, 5, 10)).toEqual([...RIBBONS.red.mid]);
    const d = drawRibbon(20, 30, RIBBONS.red, 'down');
    expect(at(d, 10, 29)[3]).toBe(0);
  });
});
