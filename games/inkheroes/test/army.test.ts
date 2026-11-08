import { describe, expect, it } from 'vitest';
import { UNIT_ART } from '../src/art/pixel/manifest';
import { armyOf, moveSlot, splitSlot } from '../src/logic/army';
import { faceBox, FACE } from '../src/scenes/battle/pixelFaces';
import { armyRowW, fitSlot, splitCount } from '../src/scenes/hud/armySlots';
import { buttonGrid, buttonsGridW, buttonsW, narrowButtonW, stripLayout, townButtons } from '../src/scenes/town/stripLayout';

const army = armyOf([{ creature: 'spearman', count: 10 }, { creature: 'bowman', count: 1 }]);

describe('splitting a company', () => {
  it('moves part of it to the first free slot and says where', () => {
    const r = splitSlot(army, 0, 3)!;
    expect(r.at).toBe(2);
    expect(r.army[0]).toEqual({ creature: 'spearman', count: 7 });
    expect(r.army[2]).toEqual({ creature: 'spearman', count: 3 });
    expect(army[0]!.count).toBe(10);
  });

  it('refuses a split that leaves either side empty', () => {
    expect(splitSlot(army, 0, 0)).toBeNull();
    expect(splitSlot(army, 0, 10)).toBeNull();
    expect(splitSlot(army, 1, 1)).toBeNull();
    expect(splitSlot(army, 5, 1)).toBeNull();
  });

  it('refuses when all seven slots are taken', () => {
    const full = armyOf(Array.from({ length: 7 }, () => ({ creature: 'spearman' as const, count: 4 })));
    expect(splitSlot(full, 0, 2)).toBeNull();
  });

  it('gives companies a merge can bring back together', () => {
    const r = splitSlot(army, 0, 3)!;
    const back = moveSlot(r.army, r.at, r.army, 0, true, true)!;
    expect(back.src[0]).toEqual({ creature: 'spearman', count: 10 });
    expect(back.src[r.at]).toBeNull();
  });
});

describe('the army’s slots', () => {
  it('grow with the room, up to a limit, and stay even', () => {
    expect(fitSlot(100)).toBe(36);
    expect(fitSlot(340)).toBe(46);
    expect(fitSlot(2000)).toBe(60);
    for (let room = 266; room < 500; room++) {
      expect(fitSlot(room) % 2).toBe(0);
      if (fitSlot(room) < 60) expect(armyRowW(fitSlot(room))).toBeLessThanOrEqual(room);
    }
  });
});

describe('a face cut for a slot', () => {
  it.each(Object.entries(UNIT_ART))('stays inside the first frame of %s', (_, art) => {
    for (const size of [FACE, 42, 56]) {
      const b = faceBox(art, size);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(art.w);
      expect(b.y + b.h).toBeLessThanOrEqual(art.h);
    }
  });

  it('keeps the face in sight at every size', () => {
    const art = UNIT_ART.spearman!;
    for (const size of [FACE, 42, 56]) {
      const b = faceBox(art, size);
      expect(art.face!.x).toBeGreaterThan(b.x);
      expect(art.face!.x).toBeLessThan(b.x + b.w);
      expect(art.face!.y).toBeGreaterThan(b.y);
      expect(art.face!.y).toBeLessThan(b.y + b.h);
    }
  });

  it('cuts exactly the old square at the turn order’s size', () => {
    const art = UNIT_ART.spearman!;
    expect(faceBox(art, FACE)).toEqual({ x: art.face!.x - FACE / 2, y: art.face!.y - FACE / 2, w: FACE, h: FACE });
  });
});

describe('the split slider', () => {
  it('always leaves at least one on each side', () => {
    expect(splitCount(0, 10)).toBe(1);
    expect(splitCount(1, 10)).toBe(9);
    expect(splitCount(-1, 10)).toBe(1);
    expect(splitCount(2, 10)).toBe(9);
    expect(splitCount(0.5, 10)).toBe(5);
    expect(splitCount(0.5, 2)).toBe(1);
  });
});

describe('the town’s strip', () => {
  it('draws the slots big on a desktop, beside everything else', () => {
    expect(stripLayout(1400, 900, 22)).toEqual({ narrow: false, slot: 60, townW: 150 });
    expect(stripLayout(1512, 751, 22)).toEqual({ narrow: false, slot: 60, townW: 150 });
  });

  it('keeps them bigger than before on phones, and fits the screen', () => {
    const { narrow, slot } = stripLayout(390, 844, 22);
    expect(narrow).toBe(true);
    expect(slot).toBeGreaterThan(36);
    expect(slot * 8 + 6 + 12).toBeLessThanOrEqual(390);
  });

  it('stays one low strip on a landscape phone, leaving the town its room', () => {
    for (const [w, h] of [[844, 390], [667, 375]] as const) {
      const { narrow, slot } = stripLayout(w, h, 22);
      expect(narrow).toBe(false);
      expect(slot).toBeGreaterThanOrEqual(48);
      expect(slot * 2 + 4 + 12).toBeLessThanOrEqual(h * 0.32);
    }
  });

  it('never runs off the screen beside the armies', () => {
    for (let w = 320; w < 1600; w += 7) {
      const { narrow, slot, townW } = stripLayout(w, 800, 22);
      if (!narrow) expect(townW + 8 + (slot * 8 + 6 + 12) + 8 + 115 + 12).toBeLessThanOrEqual(w);
    }
  });

  it('shows the Guild and the Blacksmith only once they stand', () => {
    expect(townButtons([])).toEqual(['hall', 'fort', 'leave']);
    expect(townButtons(['mageGuild1'])).toEqual(['hall', 'fort', 'guild', 'leave']);
    expect(townButtons(['blacksmith'])).toEqual(['hall', 'fort', 'smith', 'leave']);
    expect(townButtons(['mageGuild1', 'blacksmith', 'tavern'])).toEqual(['hall', 'fort', 'guild', 'smith', 'leave']);
  });

  it('shows the Tavern only where it stands and a hero can be hired', () => {
    expect(townButtons(['tavern'], false)).toEqual(['hall', 'fort', 'leave']);
    expect(townButtons([], true)).toEqual(['hall', 'fort', 'leave']);
    expect(townButtons(['mageGuild1', 'blacksmith', 'tavern'], true)).toEqual(['hall', 'fort', 'guild', 'smith', 'tavern', 'leave']);
  });

  it('shows the Storehouse once it stands, before Leave', () => {
    expect(townButtons(['storehouse'])).toEqual(['hall', 'fort', 'store', 'leave']);
    expect(townButtons(['mageGuild1', 'blacksmith', 'tavern', 'storehouse', 'treasury'], true)).toEqual(['hall', 'fort', 'guild', 'smith', 'tavern', 'store', 'leave']);
  });

  it('fits all seven buttons in a row on the narrowest phone', () => {
    for (let w = 300; w < 420; w += 3) expect(narrowButtonW(7, w) * 7 + 6 * 3).toBeLessThanOrEqual(w - 12);
    expect(narrowButtonW(5, 390)).toBe(56);
  });

  it('leaves no hole in the grid: the last button takes what is left of its row', () => {
    expect(buttonGrid(3)).toEqual([{ col: 0, row: 0, span: 1 }, { col: 1, row: 0, span: 1 }, { col: 0, row: 1, span: 2 }]);
    expect(buttonGrid(4)[3]).toEqual({ col: 1, row: 1, span: 1 });
    expect(buttonGrid(5).at(-1)).toEqual({ col: 1, row: 1, span: 2 });
  });

  it('never runs off the screen with all five buttons', () => {
    expect(buttonsGridW(4)).toBe(115);
    expect(buttonsGridW(5)).toBe(174);
    for (let w = 320; w < 1600; w += 7) {
      const { narrow, slot, townW } = stripLayout(w, 800, 22, 5);
      if (narrow) expect(buttonsW(5)).toBeLessThanOrEqual(w);
      else expect(townW + 8 + (slot * 8 + 6 + 12) + 8 + buttonsGridW(5) + 12).toBeLessThanOrEqual(w);
    }
  });

  it('keeps a landscape phone low with four buttons or fewer', () => {
    expect(stripLayout(667, 375, 22, 3).narrow).toBe(false);
    expect(stripLayout(667, 375, 22, 4).narrow).toBe(false);
    expect(stripLayout(844, 390, 22, 5).narrow).toBe(false);
  });
});
