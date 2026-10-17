/**
 * The first star system (spec, "The first star system"), laid out by the
 * life rules in docs/inkmine-xenobiology.md:
 * - plants and animals only on worlds in the star's habitable zone that are
 *   big enough to hold air (a moon counts, at its giant's distance);
 * - outside the zone, life only in an ocean or brine under a crust, kept
 *   liquid by a giant's tides, so only on a giant's moon;
 * - everything else is dead rock, ice or a gas giant you don't land on;
 * - carbon and water here (other chemistries come in later systems);
 * - almost no air the prospector can breathe: here, only Cardia's.
 *
 * The star is an orange dwarf, the kind researchers rank best for life:
 * steady, long-lived and gentler than a red dwarf (Cuntz & Guinan, 2016).
 * Distances are in AU and masses in Earth masses, the astronomers' units,
 * for the docs and the tests only: the game never names Earth. Data only:
 * the star map draws it, and test/starSystem.test.ts holds it to the rules.
 *
 * Ids are saved (a world visited, later): never change one.
 */

export type WorldKind = 'living' | 'underground' | 'underIce' | 'dead' | 'giant';

export interface Star {
  readonly name: string;
  /** Brightness, against the sun of the astronomers' unit (1). */
  readonly luminosity: number;
  /** Mass, the same way. */
  readonly mass: number;
  readonly about: string;
}

export interface World {
  readonly id: string;
  readonly name: string;
  readonly kind: WorldKind;
  /** The giant it circles, for a moon; null for a planet. */
  readonly parent: string | null;
  /** From the star, in AU (a moon's is its giant's). */
  readonly au: number;
  /** In Earth masses: the astronomers' unit again, never said in the game. */
  readonly mass: number;
  /**
   * Its place in the game's order (1 = Graphite, chapter 1); null for a
   * giant, which isn't landed on. The order follows the starship's tank:
   * the cheapest trips first (sister moons, then the next planets out and
   * in), keeping water before lava and darkness near the end.
   */
  readonly chapter: number | null;
  /** Its air, in a few words. */
  readonly air: string;
  readonly breathable: boolean;
  /** What life is built from here, when there is any. */
  readonly chemistry: 'carbon · water' | null;
  /** What the ship's telescope makes of it from orbit, before anyone lands. */
  readonly seen: string;
}

export const STAR: Star = {
  name: 'the orange star',
  luminosity: 0.45,
  mass: 0.78,
  about: 'An orange dwarf, smaller and cooler than a yellow star, and steadier: it barely flares, and it will shine for tens of billions of years.',
};

/** Below this many Earth masses a world can't hold air for long: about Mars's (Heller & Barnes, 2013). */
export const AIR_MASS = 0.1;

/**
 * The habitable zone in AU: where a world with air keeps liquid water. The
 * wide ("optimistic") edges, from where a young Venus and an early Mars may
 * still have had water (Kopparapu et al., 2013), scaled by the star's
 * brightness: the light falls off with the square of the distance.
 */
export function habitableZone(star: Star = STAR): { readonly inner: number; readonly outer: number } {
  const k = Math.sqrt(star.luminosity);
  return { inner: 0.75 * k, outer: 1.77 * k };
}

/** Where water freezes into the ice giants form from: about 2.7 AU for a sun like the astronomers' (unverified scaling). */
export const snowLine = (star: Star = STAR): number => 2.7 * Math.sqrt(star.luminosity);

export const inZone = (au: number, star: Star = STAR): boolean => {
  const z = habitableZone(star);
  return au >= z.inner && au <= z.outer;
};

/** From the star outwards; each giant's moons follow it, nearest first. */
export const WORLDS: readonly World[] = [
  {
    id: 'ember', name: 'Ember', kind: 'dead', parent: null, au: 0.12, mass: 0.6, chapter: 6,
    air: 'carbon dioxide and sulfur gases', breathable: false, chemistry: null,
    seen: 'So close to the star that one face always looks at it. The night side glows dull red: the ground there is molten.',
  },
  {
    id: 'prism', name: 'Prism', kind: 'dead', parent: null, au: 0.3, mass: 0.07, chapter: 5,
    air: 'none', breathable: false, chemistry: null,
    seen: 'No air. Too small to have kept any. It flashes as it turns, as if parts of it were glass.',
  },
  {
    id: 'talus', name: 'Talus', kind: 'living', parent: null, au: 0.56, mass: 0.45, chapter: 4,
    air: 'thin carbon dioxide', breathable: false, chemistry: 'carbon · water',
    seen: 'Red dust and dry gullies, at the warm edge of where water can stay. A faint trace in its thin air that only something alive would keep making.',
  },
  {
    id: 'brine', name: 'Brine', kind: 'living', parent: null, au: 0.78, mass: 1.1, chapter: 3,
    air: 'nitrogen and carbon dioxide', breathable: false, chemistry: 'carbon · water',
    seen: 'Nearly all sea, dotted with islands. The water looks purple, not blue: something living floats on it.',
  },
  {
    id: 'sepia', name: 'Sepia', kind: 'giant', parent: null, au: 1.05, mass: 95, chapter: null,
    air: 'hydrogen and helium, no ground under it', breathable: false, chemistry: null,
    seen: 'A banded gas giant with wide rings, the one in Graphite\'s sky. It formed farther out and drifted in, as many giants do, bringing its icy moons with it.',
  },
  {
    id: 'graphite', name: 'Graphite', kind: 'underground', parent: 'sepia', au: 1.05, mass: 0.03, chapter: 1,
    air: 'none', breathable: false, chemistry: 'carbon · water',
    seen: 'The grey moon. Too small to hold air, but Sepia\'s tides knead it, and deep down it\'s warm enough for life.',
  },
  {
    id: 'mycel', name: 'Mycel', kind: 'living', parent: 'sepia', au: 1.05, mass: 0.3, chapter: 2,
    air: 'thick carbon dioxide, full of spores', breathable: false, chemistry: 'carbon · water',
    seen: 'Green under a thick haze. The haze scatters light like dust and thickens and thins with its seasons: spores, maybe.',
  },
  {
    id: 'cardia', name: 'Cardia', kind: 'living', parent: 'sepia', au: 1.05, mass: 0.5, chapter: 10,
    air: 'rich in oxygen', breathable: true, chemistry: 'carbon · water',
    seen: 'Red, and its air is full of oxygen, more than anything but life could make. The readings rise and fall, slowly, like breathing.',
  },
  {
    id: 'indigo', name: 'Indigo', kind: 'giant', parent: null, au: 3.4, mass: 15, chapter: null,
    air: 'hydrogen, helium and methane, no ground under it', breathable: false, chemistry: null,
    seen: 'A blue ice giant, out past where water freezes. Two of its moons are worth a look.',
  },
  {
    id: 'umbra', name: 'Umbra', kind: 'underIce', parent: 'indigo', au: 3.4, mass: 0.015, chapter: 9,
    air: 'none above the ice', breathable: false, chemistry: 'carbon · water',
    seen: 'A cracked shell of ice. Plumes of water vapour jet from the cracks: there\'s an ocean under there, kept liquid by Indigo\'s tides.',
  },
  {
    id: 'pumice', name: 'Pumice', kind: 'dead', parent: 'indigo', au: 3.4, mass: 0.0001, chapter: 7,
    air: 'none', breathable: false, chemistry: null,
    seen: 'Too light for its size: it would float on water. Ice and rock full of holes, like a sponge.',
  },
  {
    id: 'rime', name: 'Rime', kind: 'dead', parent: null, au: 9, mass: 0.004, chapter: 8,
    air: 'a trace of nitrogen, frozen out as frost', breathable: false, chemistry: null,
    seen: 'Far out, alone, frozen to the core. No giant to knead it, so no ocean ever stayed liquid inside.',
  },
];

export const worldById = (id: string): World | undefined => WORLDS.find((w) => w.id === id);

/** A giant's moons, nearest first. */
export const moonsOf = (id: string): readonly World[] => WORLDS.filter((w) => w.parent === id);

/** The worlds circling the star itself, from the star outwards. */
export const planetsOf = (): readonly World[] => WORLDS.filter((w) => w.parent === null);

/** The world a chapter is set on. */
export const worldOfChapter = (n: number): World | undefined => WORLDS.find((w) => w.chapter === n);

/** The kind as the suit's scan reads it out. */
export const KIND_LINE: Readonly<Record<WorldKind, string>> = {
  living: 'Life signs',
  underground: 'Life, deep underground',
  underIce: 'Life under the ice, maybe',
  dead: 'No life signs',
  giant: 'Gas giant: no ground to land on',
};
