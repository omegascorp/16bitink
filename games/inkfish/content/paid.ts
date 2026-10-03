import { generateChapter, type ChapterRecipe } from '../src/levels/generate';
import type { Chapter, SpawnEntry } from '../src/levels/types';
import { ZONE_INFO } from '../src/levels/zones';

/**
 * Paid chapters 2–10 (90 levels). SERVER-ONLY: imported by the website's
 * content registry and served by /api/content/inkfish to verified owners.
 * Never import this from the game's client code or it ships to everyone.
 */

type S = SpawnEntry['species'];
const s = (species: S, weight: number, min: number, max: number): SpawnEntry => ({ species, weight, size: [min, max] });

/** Shared difficulty ramp: each chapter starts a bit harder than the last ended easy. */
function ramp(chapter: number): Pick<ChapterRecipe, 'goal' | 'finalSize' | 'maxFish'> {
  const c = chapter - 1;
  return {
    goal: [60 + c * 10, 115 + c * 12],
    finalSize: [42 + c * 2, 54 + c * 2.5],
    maxFish: [28 + c, 36 + c * 1.5],
  };
}

const RECIPES: Readonly<Record<number, Omit<ChapterRecipe, 'goal' | 'finalSize' | 'maxFish'>>> = {
  2: {
    names: ['Long Strokes', 'Blade Runner', 'Grass Margins', 'Puffer Parade', 'Seed School', 'Meadow Ink', 'Swaying Lines', 'Pike Patrol', 'Feather Current', 'Mown Meadow'],
    spawns: [s('minnow', 5, 8, 14), s('perch', 3, 22, 36), s('puffer', 2.5, 26, 42), s('pike', 1.5, 46, 62)],
    jellyfish: [2, 5], hookEverySec: [18, 11],
  },
  3: {
    names: ['Tangled Lines', 'Holdfast', 'Canopy Shade', 'Ambush Alley', 'Kelp Rush', 'Frond Maze', 'Stipple Stalks', 'The Long Eel', 'Sunbeams', 'Forest Floor'],
    spawns: [s('minnow', 5, 8, 14), s('perch', 3, 22, 38), s('pike', 2, 48, 64), s('eel', 1.5, 58, 80)],
    jellyfish: [3, 6], hookEverySec: [16, 10],
  },
  4: {
    names: ['Coral Scribbles', 'Spiny Margins', 'Puffer Gardens', 'Brain Coral', 'Reef Rush', 'Hatch Lines', 'Grotto', 'Anglers Arrive', 'Bleached Bones', 'Reef Crest'],
    spawns: [s('minnow', 5, 8, 14), s('puffer', 3.5, 26, 44), s('perch', 2.5, 24, 40), s('angler', 1.5, 36, 56)],
    jellyfish: [3, 7], hookEverySec: [15, 9],
  },
  5: {
    names: ['Barnacle Bay', 'Porthole Panic', 'Rigging', 'Cargo Hold', 'Wreck Rush', 'Captain’s Cabin', 'Anchor’s Shadow', 'Broken Mast', 'Crow’s Nest', 'Keel'],
    spawns: [s('minnow', 5, 8, 14), s('pike', 3, 50, 70), s('eel', 2, 62, 84), s('angler', 2, 38, 58)],
    jellyfish: [4, 7], hookEverySec: [14, 8],
  },
  6: {
    names: ['The Edge', 'Blue Blank', 'Updraft', 'Vertigo', 'Open Rush', 'Cold Current', 'Long Fall', 'Shelf Break', 'Last Light', 'Over the Edge'],
    spawns: [s('minnow', 5, 8, 14), s('pike', 3, 52, 74), s('eel', 2.5, 64, 88), s('angler', 2, 40, 62)],
    jellyfish: [5, 8], hookEverySec: [12, 7],
  },
  7: {
    names: ['Dimming', 'Lantern Light', 'Faint Lines', 'Glowworms', 'Twilight Rush', 'Ghost Ink', 'Silver Shoal', 'Fading Page', 'Dusk Patrol', 'Lights Out'],
    spawns: [s('minnow', 5, 8, 14), s('eel', 3, 64, 90), s('angler', 3, 40, 64), s('puffer', 1.5, 28, 46)],
    jellyfish: [5, 9], hookEverySec: [0, 0],
  },
  8: {
    names: ['Ink Black', 'Deep Crosshatch', 'Pressure', 'Lures', 'Midnight Rush', 'Blind Lines', 'Snow of Ink', 'Teeth', 'Cold Blot', 'Midnight'],
    spawns: [s('minnow', 5, 8, 14), s('angler', 4, 42, 66), s('eel', 3, 66, 94)],
    jellyfish: [6, 9], hookEverySec: [0, 0],
  },
  9: {
    names: ['The Plain', 'Silt', 'Footprints', 'Sea Snow', 'Abyss Rush', 'Vents', 'Bone Field', 'Hush', 'Lonely Light', 'The Edge of the Page'],
    spawns: [s('minnow', 5, 8, 14), s('angler', 4, 44, 68), s('eel', 3, 70, 96), s('pike', 1.5, 56, 78)],
    jellyfish: [7, 10], hookEverySec: [0, 0],
  },
  10: {
    names: ['The Crack', 'Walls of Ink', 'Pressure Lines', 'The Narrows', 'Trench Rush', 'Echoes', 'Deepest Blot', 'Hadal Hunt', 'The Floor', 'The Last Page'],
    spawns: [s('minnow', 5, 8, 14), s('angler', 4, 46, 70), s('eel', 3.5, 72, 100), s('pike', 2, 58, 80)],
    jellyfish: [8, 11], hookEverySec: [0, 0],
  },
};

export const INKFISH_FULL_CHAPTERS: readonly Chapter[] = ZONE_INFO.filter((z) => z.id > 1).map((z) => {
  const recipe = RECIPES[z.id];
  if (!recipe) throw new Error(`Missing recipe for chapter ${z.id}`);
  return generateChapter(z, { ...recipe, ...ramp(z.id), world: { width: 3600, height: 2000 } });
});
