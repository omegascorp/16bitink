import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { ALL_SPECIES, SPECIES_INFO, type SpeciesInfo } from '../src/levels/species';
import { PLAYER_FISH } from '../src/levels/zones';

const chapters = [DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS];
const levels = chapters.flatMap((c) => c.levels);
const info = (id: keyof typeof SPECIES_INFO): SpeciesInfo => SPECIES_INFO[id];

describe('species', () => {
  it('fills the ocean: about ten times the original six', () => {
    expect(ALL_SPECIES.length).toBeGreaterThanOrEqual(60);
  });

  it('puts every regular species in the water somewhere', () => {
    const seen = new Set(levels.flatMap((l) => [...l.spawns, ...l.bottom].map((s) => s.species)));
    const missing = ALL_SPECIES.filter((id) => !info(id).giant && !seen.has(id));
    expect(missing).toEqual([]);
  });

  it('keeps crawlers on the seabed and swimmers in open water', () => {
    for (const l of levels) {
      expect(l.spawns.every((s) => !info(s.species).bottom)).toBe(true);
      expect(l.bottom.every((s) => info(s.species).bottom && info(s.species).behaviour === 'crawl')).toBe(true);
    }
  });

  it('gives every zone something to eat on the seabed', () => {
    for (const ch of chapters) {
      const l = ch.levels.at(-1)!;
      expect(l.maxCrawlers).toBeGreaterThan(0);
      expect(l.bottom.some((s) => s.size[0] < l.playerSizes[0]!)).toBe(true);
    }
  });

  it('gives each chapter a new player fish', () => {
    expect(new Set(PLAYER_FISH).size).toBe(chapters.length);
    expect(chapters.map((c) => c.player)).toEqual(PLAYER_FISH);
  });

  it('introduces new species as you play, not all at once', () => {
    for (const ch of chapters) {
      const debutLevels = ch.levels.filter((l) => l.debuts.length > 0).length;
      // The trench is the emptiest place on Earth: even it gets three newcomers.
      expect(debutLevels).toBeGreaterThanOrEqual(3);
    }
  });

  it('announces a species only the first time it ever appears', () => {
    const announced = levels.flatMap((l) => l.debuts);
    expect(new Set(announced).size).toBe(announced.length);
  });
});

describe('giants', () => {
  it('are a unique species per chapter, never in the regular spawns', () => {
    const bosses = chapters.map((c) => c.levels.at(-1)!.objective);
    const species = bosses.map((o) => (o.kind === 'boss' ? o.species : null));
    expect(new Set(species).size).toBe(chapters.length);
    for (const id of species) {
      expect(id && info(id).giant).toBe(true);
      expect(levels.some((l) => l.spawns.some((s) => s.species === id))).toBe(false);
    }
  });

  it('are the biggest fish on their level', () => {
    for (const ch of chapters) {
      const l = ch.levels.at(-1)!;
      if (l.objective.kind !== 'boss') throw new Error('expected a giant');
      const biggestOther = Math.max(...[...l.spawns, ...l.bottom].map((s) => s.size[1]));
      expect(l.objective.size).toBeGreaterThan(biggestOther);
    }
  });
});

describe('art', () => {
  it('has a drawing for every species and every player fish', async () => {
    const { missingAnatomy } = await import('../src/art/fish/registry');
    expect(missingAnatomy([...ALL_SPECIES, ...PLAYER_FISH])).toEqual([]);
  });
});

describe('the last giant', () => {
  it('is a giant squid, waiting at the bottom of the trench', () => {
    const finale = chapters.at(-1)!.levels.at(-1)!.objective;
    expect(finale.kind === 'boss' && finale.species).toBe('giantsquid');
    expect(info('giantsquid').giant).toBe(true);
  });

  it('keeps the coelacanth as a rare twilight fish, no longer a boss', () => {
    expect(info('coelacanth').giant).toBeFalsy();
    const twilight = chapters.find((c) => c.zone === 'twilight')!;
    expect(twilight.levels.some((l) => l.spawns.some((s) => s.species === 'coelacanth'))).toBe(true);
  });
});

describe('giant names', () => {
  it('calls a giant "the giant X", without saying giant twice', async () => {
    const { giantName } = await import('../src/levels/species');
    expect(giantName('bass')).toBe('giant striped bass');
    expect(giantName('giantsquid')).toBe('giant squid');
  });
});

describe('the fish you swim as', () => {
  it('is a tuna at the wreck and a mako shark pup at the drop-off', () => {
    expect(chapters.find((c) => c.zone === 'wreck')!.player).toBe('tuna');
    expect(chapters.find((c) => c.zone === 'dropoff')!.player).toBe('mako');
  });

  it('meets the barracuda at the wreck as a hunter to keep away from', () => {
    expect(info('barracuda').hunter).toBe(true);
    const wreck = chapters.find((c) => c.zone === 'wreck')!;
    expect(wreck.levels.some((l) => l.spawns.some((s) => s.species === 'barracuda'))).toBe(true);
  });
});
