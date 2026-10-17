import { describe, expect, it } from 'vitest';
import { PLANETS } from '../src/level/planets';
import { AIR_MASS, habitableZone, inZone, moonsOf, snowLine, worldById, worldOfChapter, WORLDS } from '../src/logic/starSystem';

describe('the first star system', () => {
  it('has the ten planets of the game, one per chapter, and two giants', () => {
    const chapters = WORLDS.flatMap((w) => (w.chapter === null ? [] : [w.chapter])).sort((a, b) => a - b);
    expect(chapters).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(WORLDS.filter((w) => w.kind === 'giant').map((w) => w.id)).toEqual(['sepia', 'indigo']);
    expect(new Set(WORLDS.map((w) => w.id)).size).toBe(WORLDS.length);
  });

  it('names its worlds as the built planets are named', () => {
    for (const p of PLANETS) expect(worldOfChapter(p.number)?.name).toBe(p.name);
  });

  it('puts Graphite on a moon of the ringed giant', () => {
    expect(worldById('graphite')?.parent).toBe('sepia');
    expect(moonsOf('sepia').map((w) => w.id)).toEqual(['graphite', 'mycel', 'cardia']);
  });

  it('runs outwards from the star, each moon at its giant\'s distance', () => {
    const planets = WORLDS.filter((w) => w.parent === null).map((w) => w.au);
    expect(planets).toEqual([...planets].sort((a, b) => a - b));
    for (const w of WORLDS.filter((m) => m.parent)) expect(w.au).toBe(worldById(w.parent!)!.au);
  });

  it('keeps plants and animals to worlds in the zone that can hold air', () => {
    for (const w of WORLDS.filter((x) => x.kind === 'living')) {
      expect(inZone(w.au), w.id).toBe(true);
      expect(w.mass, w.id).toBeGreaterThanOrEqual(AIR_MASS);
    }
  });

  it('allows life under a crust only on a giant\'s moon, where tides keep the water liquid', () => {
    for (const w of WORLDS.filter((x) => x.kind === 'underground' || x.kind === 'underIce')) {
      expect(worldById(w.parent ?? '')?.kind, w.id).toBe('giant');
    }
  });

  it('leaves dead every world out of the zone that no giant warms', () => {
    for (const w of WORLDS.filter((x) => x.kind !== 'giant' && !inZone(x.au) && !x.parent)) expect(w.kind, w.id).toBe('dead');
  });

  it('builds what life there is from carbon and water, and nothing on dead worlds', () => {
    for (const w of WORLDS) expect(w.chemistry === null, w.id).toBe(w.kind === 'dead' || w.kind === 'giant');
  });

  it('lets the prospector breathe on one world only: Cardia', () => {
    expect(WORLDS.filter((w) => w.breathable).map((w) => w.id)).toEqual(['cardia']);
  });

  it('keeps the ice giant past the snow line, and the zone where an orange dwarf has it', () => {
    expect(worldById('indigo')!.au).toBeGreaterThan(snowLine());
    const z = habitableZone();
    expect(z.inner).toBeCloseTo(0.5, 1);
    expect(z.outer).toBeCloseTo(1.19, 1);
  });
});
