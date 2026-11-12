import { describe, expect, it } from 'vitest';
import { INKCRAB_PAID_BEACHES } from '../content/paid';
import { THEMES, type ThemeId } from '../src/art/backdrop';
import { BOIL } from '../src/art/palette';
import { allKeys, birdKeys, coreKeys, levelKeys, setupShellKinds, setupSpecies, speciesKeys, TEX, themeKeys } from '../src/art/texturePlan';
import { isBakeable } from '../src/art/textures';
import { BEACH_1 } from '../src/level/beach1';
import { BIOMES } from '../src/level/biomes';
import { buildLevel, START_SHELL } from '../src/level/build';
import type { LevelDef } from '../src/level/types';

const BEACHES: readonly (readonly LevelDef[])[] = [BEACH_1, ...INKCRAB_PAID_BEACHES];
/** As levels.ts's themeOf, for a beach by index. */
const themeOfBeach = (i: number): ThemeId => (BIOMES[i]!.id in THEMES ? (BIOMES[i]!.id as ThemeId) : 'atoll');

describe('texture plan', () => {
  it('names only keys the game knows how to draw', () => {
    const unknown = allKeys().filter((k) => !isBakeable(k));
    expect(unknown).toEqual([]);
  });

  it('boots without any beach backdrop or creature', () => {
    const core = coreKeys();
    expect(core).toContain(TEX.paper);
    expect(core).toContain(TEX.crabBack(0));
    expect(core).toContain(TEX.shell('periwinkle', BOIL - 1));
    expect(core.some((k) => k.startsWith('backdrop-') || k.startsWith('mover-') || k.startsWith('critter-') || k.startsWith('bird-'))).toBe(false);
    // Small: a few dozen drawings, not the hundreds the whole game has.
    expect(core.length).toBeLessThan(allKeys().length / 5);
  });

  it("plans each level's backdrop, creatures, birds and shells", () => {
    BEACHES.forEach((beach, b) => {
      for (const def of beach) {
        const setup = buildLevel(def);
        const keys = new Set(levelKeys(setup, themeOfBeach(b)));
        const want = [
          ...themeKeys(themeOfBeach(b)),
          ...(def.critters ?? []).flatMap((g) => speciesKeys(g.species ?? 'ghostcrab')),
          ...speciesKeys(def.fry ?? 'slater'),
          ...(def.birds ?? []).flatMap((g) => birdKeys(g.species ?? 'kestrel')),
          TEX.shell(START_SHELL.kind, 0),
          ...def.shells.map(([kind]) => TEX.shell(kind, BOIL - 1)),
        ];
        const missing = want.filter((k) => !keys.has(k));
        expect(missing, def.id).toEqual([]);
        expect([...keys].filter((k) => !isBakeable(k)), def.id).toEqual([]);
      }
    });
  });

  it('draws only its own beach theme for a level', () => {
    const setup = buildLevel(BEACH_1[0]!);
    const keys = levelKeys(setup, 'atoll');
    expect(keys.some((k) => k.startsWith('backdrop-atoll-'))).toBe(true);
    expect(keys.some((k) => /^(backdrop|boat|mover)-(?!atoll-)/.test(k))).toBe(false);
  });

  it("finds the shells rivals wear and the tide brings, and a mission's marked creatures", () => {
    const def = BEACHES.flat().find((l) => l.rivals?.length && l.tideBrings?.shells?.length) ?? BEACHES.flat().find((l) => l.rivals?.length)!;
    const kinds = setupShellKinds(buildLevel(def));
    for (const [kind] of def.rivals ?? []) expect(kinds.has(kind)).toBe(true);
    for (const [kind] of def.tideBrings?.shells ?? []) expect(kinds.has(kind)).toBe(true);
    const marked = BEACHES.flat().map((l) => buildLevel(l)).find((s) => s.marked?.length);
    expect(marked).toBeDefined();
    for (const m of marked!.marked!) expect(setupSpecies(marked!).has(m.species)).toBe(true);
  });

  it("draws a heron's strike and a gull's flight with them", () => {
    expect(speciesKeys('heron')).toContain(TEX.heronStrike(true, 0));
    expect(speciesKeys('gull')).toContain(TEX.bird('gull', false, false, 0));
    expect(speciesKeys('slater')).toHaveLength(2 * BOIL);
  });
});
