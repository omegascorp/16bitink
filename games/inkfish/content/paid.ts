import { generateChapter, type ChapterRecipe, type RecipeSpawn } from '../src/levels/generate';
import type { Chapter } from '../src/levels/types';
import { ZONE_INFO } from '../src/levels/zones';

/**
 * Paid chapters 2–10 (90 levels). SERVER-ONLY: imported by the website's
 * content registry and served by /api/content/inkfish to verified owners.
 * Never import this from the game's client code or it ships to everyone.
 */

type S = RecipeSpawn['species'];
const s = (species: S, weight: number, min: number, max: number, debut?: number): RecipeSpawn =>
  debut === undefined ? { species, weight, size: [min, max] } : { species, weight, size: [min, max], debut };

/** Shared difficulty ramp: each chapter starts a bit harder than the last ended easy. */
function ramp(chapter: number): Pick<ChapterRecipe, 'goal' | 'finalSize' | 'maxFish'> {
  const c = chapter - 1;
  return {
    goal: [60 + c * 10, 115 + c * 12],
    finalSize: [42 + c * 2, 54 + c * 2.5],
    maxFish: [28 + c, 36 + c * 1.5],
  };
}

type Recipe = Omit<ChapterRecipe, 'goal' | 'finalSize' | 'maxFish'>;

/**
 * Each chapter brings its own residents. The first entry is the staple prey;
 * entries with a debut level are new to the game and arrive mid-chapter.
 * Carried-over species (no debut) keep a zone feeling connected to the last.
 */
const RECIPES: Readonly<Record<number, Recipe>> = {
  2: {
    names: ['Long Strokes', 'Blade Runner', 'Grass Margins', 'Puffer Parade', 'Seed School', 'Meadow Ink', 'Pike Patrol', 'Feather Current', 'Swaying Lines', 'Mown Meadow'],
    spawns: [s('sandlance', 5, 8, 14, 0), s('wrasse', 3, 20, 34, 0), s('pipefish', 2, 16, 24, 1), s('puffer', 1.5, 26, 42), s('filefish', 2, 26, 40, 3), s('mullet', 2, 30, 42, 5), s('pike', 1.5, 46, 62)],
    boss: 'tarpon', jellyfish: [2, 5], hookEverySec: [18, 11],
  },
  3: {
    names: ['Tangled Lines', 'Holdfast', 'Canopy Shade', 'Ambush Alley', 'Kelp Rush', 'Frond Maze', 'The Long Eel', 'Sunbeams', 'Stipple Stalks', 'Forest Floor'],
    spawns: [s('sardine', 5, 8, 14, 0), s('garibaldi', 3, 22, 36, 0), s('kelpfish', 2, 18, 28, 1), s('rockfish', 2, 30, 46, 3), s('sheephead', 1.5, 44, 60, 5), s('eel', 1.5, 58, 80, 7)],
    boss: 'lingcod', jellyfish: [3, 6], hookEverySec: [16, 10],
  },
  4: {
    names: ['Coral Scribbles', 'Spiny Margins', 'Puffer Gardens', 'Brain Coral', 'Reef Rush', 'Hatch Lines', 'Lion’s Den', 'Bleached Bones', 'Grotto', 'Reef Crest'],
    spawns: [s('chromis', 5, 8, 14, 0), s('clownfish', 3, 18, 28, 0), s('angelfish', 2.5, 26, 40, 1), s('parrotfish', 2, 32, 46, 2), s('boxfish', 1.5, 24, 36, 4), s('triggerfish', 2, 36, 52, 5), s('lionfish', 1.5, 30, 46, 7)],
    boss: 'grouper', jellyfish: [3, 7], hookEverySec: [15, 9],
  },
  5: {
    names: ['Barnacle Bay', 'Porthole Panic', 'Rigging', 'Cargo Hold', 'Wreck Rush', 'Captain’s Cabin', 'Broken Mast', 'Crow’s Nest', 'Anchor’s Shadow', 'Keel'],
    spawns: [s('herring', 5, 8, 14, 0), s('snapper', 3, 24, 38, 0), s('cod', 2.5, 30, 46, 1), s('scorpionfish', 1.5, 30, 44, 3), s('jack', 2, 40, 56, 5), s('barracuda', 1.5, 52, 72, 4), s('moray', 1.5, 58, 82, 6)],
    boss: 'shark', jellyfish: [4, 7], hookEverySec: [14, 8],
  },
  6: {
    names: ['The Edge', 'Blue Blank', 'Updraft', 'Vertigo', 'Open Rush', 'Cold Current', 'Shelf Break', 'Last Light', 'Long Fall', 'Over the Edge'],
    spawns: [s('anchovy', 5, 8, 14, 0), s('mackerel', 3, 22, 36, 0), s('flyingfish', 3, 18, 30, 1), s('needlefish', 2, 36, 50, 3), s('bonito', 2, 44, 60, 5), s('mahi', 1.5, 52, 72, 7)],
    boss: 'swordfish', jellyfish: [5, 8], hookEverySec: [12, 7],
  },
  7: {
    names: ['Dimming', 'Lantern Light', 'Faint Lines', 'Glowworms', 'Twilight Rush', 'Ghost Ink', 'Fading Page', 'Dusk Patrol', 'Silver Shoal', 'Lights Out'],
    spawns: [s('bristlemouth', 5, 8, 14, 0), s('pearleye', 3, 20, 32, 0), s('barreleye', 2, 22, 34, 2), s('sabertooth', 2, 40, 58, 4), s('dragonfish', 2, 40, 62, 6), s('eel', 1.5, 64, 90), s('coelacanth', 0.6, 56, 74, 7)],
    boss: 'oarfish', jellyfish: [5, 9], hookEverySec: [0, 0],
  },
  8: {
    names: ['Ink Black', 'Deep Crosshatch', 'Pressure', 'Lures', 'Midnight Rush', 'Blind Lines', 'Teeth', 'Cold Blot', 'Snow of Ink', 'Midnight'],
    spawns: [s('bigscale', 5, 8, 14, 0), s('whalefish', 3, 20, 34, 0), s('fangtooth', 2.5, 36, 54, 2), s('blackdragon', 2, 50, 72, 4), s('gulper', 2, 60, 90, 6)],
    boss: 'sleepershark', jellyfish: [6, 9], hookEverySec: [0, 0],
  },
  9: {
    names: ['The Plain', 'Silt', 'Footprints', 'Sea Snow', 'Abyss Rush', 'Vents', 'Hush', 'Lonely Light', 'Bone Field', 'The Edge of the Page'],
    spawns: [s('bristlemouth', 5, 8, 14), s('rattail', 3, 22, 36, 0), s('tripodfish', 2.5, 28, 40, 1), s('lizardfish', 2, 36, 54, 3), s('halosaur', 2, 40, 60, 5), s('cuskeel', 2, 56, 80, 7)],
    boss: 'goblinshark', jellyfish: [7, 10], hookEverySec: [0, 0],
  },
  10: {
    names: ['The Crack', 'Walls of Ink', 'Pressure Lines', 'The Narrows', 'Trench Rush', 'Echoes', 'Hadal Hunt', 'The Floor', 'Deepest Blot', 'Challenger Deep'],
    spawns: [s('bristlemouth', 5, 8, 14), s('blobfish', 3, 22, 34, 0), s('snipeeel', 2.5, 26, 40, 1), s('ghostshark', 2, 44, 64, 3), s('angler', 2, 42, 66, 5), s('rattail', 2, 40, 56), s('tripodfish', 1.5, 30, 44), s('cuskeel', 2, 60, 84)],
    boss: 'giantsquid', jellyfish: [8, 11], hookEverySec: [0, 0],
  },
};

export const INKFISH_FULL_CHAPTERS: readonly Chapter[] = ZONE_INFO.filter((z) => z.id > 1).map((z) => {
  const recipe = RECIPES[z.id];
  if (!recipe) throw new Error(`Missing recipe for chapter ${z.id}`);
  return generateChapter(z, { ...recipe, ...ramp(z.id), world: { width: 3600, height: 2000 } });
});
