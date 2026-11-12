import { describe, expect, it } from 'vitest';
import { UNIT_ART } from '../src/art/pixel/manifest';
import { armyOf, moveSlot, splitSlot } from '../src/logic/army';
import { faceBox, FACE } from '../src/scenes/battle/pixelFaces';
import { armyRowW, fitSlot, splitCount } from '../src/scenes/hud/armySlots';
import { buttonGrid, buttonsGridW, buttonsW, railButtons, railPlan, townButtons, townLayout } from '../src/scenes/town/stripLayout';

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
    expect(townLayout(1400, 900, 22)).toEqual({ kind: 'strip', slot: 60, townW: 150 });
    expect(townLayout(1512, 751, 22)).toEqual({ kind: 'strip', slot: 60, townW: 150 });
  });

  it('gives a phone the whole town: the buttons down a rail, the armies in a drawer', () => {
    for (const [w, h] of [[844, 390], [667, 375], [692, 308], [390, 844]] as const) {
      const plan = townLayout(w, h, 22, 5);
      expect(plan.kind).toBe('rail');
      if (plan.kind !== 'rail') continue;
      const { rail, drawer } = plan;
      // Every button fits down the rail, over the purse.
      const rows = Math.ceil(6 / rail.cols);
      expect(rows * rail.btnH + (rows - 1) * 3 + 12).toBeLessThanOrEqual(h - 22 + 2);
      expect(rail.btnH).toBeGreaterThanOrEqual(48);
      // The drawer's armies (and the town's lines beside them) fit left of the rail.
      const armies = drawer.slot * 8 + 6 + 12;
      expect(armies + (drawer.stacked ? 0 : drawer.townW + 8) + 12).toBeLessThanOrEqual(drawer.w);
      // It stops at the rail unless the rail's buttons end above it.
      if (drawer.w > w - rail.w) expect(12 + rows * rail.btnH + (rows - 1) * 3).toBeLessThanOrEqual(h - 22 + 2 - (drawer.stacked ? 42 : 12) - drawer.slot * 2 - 4);
      expect(drawer.slot).toBeGreaterThan(36);
    }
  });

  it('runs the drawer across a phone held upright, under a one-column rail', () => {
    const plan = townLayout(390, 844, 22, 5);
    if (plan.kind !== 'rail') throw new Error('a rail');
    expect(plan.rail.cols).toBe(1);
    expect(plan.drawer).toMatchObject({ w: 390, stacked: true });
    expect(plan.drawer.slot).toBeGreaterThanOrEqual(44);
  });

  it('stops the drawer at the rail on a phone held sideways', () => {
    const plan = townLayout(692, 308, 22, 5);
    if (plan.kind !== 'rail') throw new Error('a rail');
    expect(plan.drawer.w).toBe(692 - plan.rail.w);
    expect(plan.drawer.stacked).toBe(false);
  });

  it('wraps the rail into a second column only when the buttons would not fit one', () => {
    expect(railPlan(844, 22, 10).cols).toBe(1);
    expect(railPlan(390, 22, 6).cols).toBe(1);
    expect(railPlan(308, 22, 10)).toEqual({ cols: 2, rows: 5, btnH: 52, w: 127 });
  });

  it('puts Army before Leave on the rail', () => {
    expect(railButtons(['hall', 'fort', 'leave'])).toEqual(['hall', 'fort', 'army', 'leave']);
    expect(railButtons(['hall', 'fort', 'tavern', 'leave'])).toEqual(['hall', 'fort', 'tavern', 'army', 'leave']);
  });

  it('never runs off the screen beside the armies', () => {
    for (let w = 320; w < 1600; w += 7) {
      const plan = townLayout(w, 800, 22);
      if (plan.kind === 'strip') expect(plan.townW + 8 + (plan.slot * 8 + 6 + 12) + 8 + 115 + 12).toBeLessThanOrEqual(w);
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

  it('leaves no hole in the grid: the last button takes what is left of its row', () => {
    expect(buttonGrid(3)).toEqual([{ col: 0, row: 0, span: 1 }, { col: 1, row: 0, span: 1 }, { col: 0, row: 1, span: 2 }]);
    expect(buttonGrid(4)[3]).toEqual({ col: 1, row: 1, span: 1 });
    expect(buttonGrid(5).at(-1)).toEqual({ col: 1, row: 1, span: 2 });
  });

  it('never runs off the screen with all five buttons', () => {
    expect(buttonsGridW(4)).toBe(115);
    expect(buttonsGridW(5)).toBe(174);
    expect(buttonsW(5)).toBe(292);
    for (let w = 320; w < 1600; w += 7) {
      const plan = townLayout(w, 800, 22, 5);
      if (plan.kind === 'strip') expect(plan.townW + 8 + (plan.slot * 8 + 6 + 12) + 8 + buttonsGridW(5) + 12).toBeLessThanOrEqual(w);
      else expect(plan.rail.w).toBeLessThan(w / 2);
    }
  });
});
