import { s, type Recipe } from './kit';

/**
 * Chapters 2–4, the sunlit shallows below the free tide pool. Part of the
 * paid content on the site (paid.ts) and the whole of the CrazyGames edition
 * (crazygames.ts), which ends with them.
 *
 * Each chapter brings its own residents. The first entry is the staple prey;
 * entries with a debut level are new to the game and arrive mid-chapter.
 * Carried-over species (no debut) keep a zone feeling connected to the last.
 */
export const SHALLOW_RECIPES: Readonly<Record<number, Recipe>> = {
  2: {
    levels: [
      { id: 'long-strokes', name: 'Long Strokes' },
      { id: 'blade-runner', name: 'Blade Runner' },
      { id: 'grass-margins', name: 'Grass Margins' },
      { id: 'puffer-parade', name: 'Puffer Parade' },
      { id: 'seed-school', name: 'Seed School' },
      { id: 'meadow-ink', name: 'Meadow Ink' },
      { id: 'pike-patrol', name: 'Pike Patrol' },
      { id: 'feather-current', name: 'Feather Current' },
      { id: 'swaying-lines', name: 'Swaying Lines' },
      { id: 'mown-meadow', name: 'Mown Meadow' },
    ],
    spawns: [s('sandlance', 5, 8, 14, 0), s('wrasse', 3, 20, 34, 0), s('pipefish', 2, 16, 24, 1), s('puffer', 1.5, 26, 42), s('filefish', 2, 26, 40, 3), s('mullet', 2, 30, 42, 5), s('pike', 1.5, 46, 62)],
    boss: 'tarpon', jellyfish: [2, 5], hookEverySec: [18, 11],
  },
  3: {
    levels: [
      { id: 'tangled-lines', name: 'Tangled Lines' },
      { id: 'holdfast', name: 'Holdfast' },
      { id: 'canopy-shade', name: 'Canopy Shade' },
      { id: 'ambush-alley', name: 'Ambush Alley' },
      { id: 'kelp-rush', name: 'Kelp Rush' },
      { id: 'frond-maze', name: 'Frond Maze' },
      { id: 'the-long-eel', name: 'The Long Eel' },
      { id: 'sunbeams', name: 'Sunbeams' },
      { id: 'stipple-stalks', name: 'Stipple Stalks' },
      { id: 'forest-floor', name: 'Forest Floor' },
    ],
    spawns: [s('sardine', 5, 8, 14, 0), s('garibaldi', 3, 22, 36, 0), s('kelpfish', 2, 18, 28, 1), s('rockfish', 2, 30, 46, 3), s('sheephead', 1.5, 44, 60, 5), s('eel', 1.5, 58, 80, 7)],
    boss: 'lingcod', jellyfish: [3, 6], hookEverySec: [16, 10],
  },
  4: {
    levels: [
      { id: 'coral-scribbles', name: 'Coral Scribbles' },
      { id: 'spiny-margins', name: 'Spiny Margins' },
      { id: 'puffer-gardens', name: 'Puffer Gardens' },
      { id: 'brain-coral', name: 'Brain Coral' },
      { id: 'reef-rush', name: 'Reef Rush' },
      { id: 'hatch-lines', name: 'Hatch Lines' },
      { id: 'lions-den', name: 'Lion’s Den' },
      { id: 'bleached-bones', name: 'Bleached Bones' },
      { id: 'grotto', name: 'Grotto' },
      { id: 'reef-crest', name: 'Reef Crest' },
    ],
    spawns: [s('chromis', 5, 8, 14, 0), s('clownfish', 3, 18, 28, 0), s('angelfish', 2.5, 26, 40, 1), s('parrotfish', 2, 32, 46, 2), s('boxfish', 1.5, 24, 36, 4), s('triggerfish', 2, 36, 52, 5), s('lionfish', 1.5, 30, 46, 7)],
    boss: 'grouper', jellyfish: [3, 7], hookEverySec: [15, 9],
  },
};
