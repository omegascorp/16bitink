import type { Chapter } from '../src/levels/types';
import { ZONE_INFO } from '../src/levels/zones';
import { buildChapters, s, type Recipe } from './kit';
import { SHALLOW_RECIPES } from './shallows';

/**
 * Paid chapters 2–10 (90 levels). SERVER-ONLY: imported by the website's
 * content registry and served by /api/content/inkfish to verified owners.
 * Never import this from the game's client code or it ships to everyone.
 */

/** Chapters 5–10, from the shipwreck down to the trench (2–4 are in shallows.ts). */
const DEEP_RECIPES: Readonly<Record<number, Recipe>> = {
  5: {
    levels: [
      { id: 'barnacle-bay', name: 'Barnacle Bay' },
      { id: 'porthole-panic', name: 'Porthole Panic' },
      { id: 'rigging', name: 'Rigging' },
      { id: 'cargo-hold', name: 'Cargo Hold' },
      { id: 'wreck-rush', name: 'Wreck Rush' },
      { id: 'captains-cabin', name: 'Captain’s Cabin' },
      { id: 'broken-mast', name: 'Broken Mast' },
      { id: 'crows-nest', name: 'Crow’s Nest' },
      { id: 'anchors-shadow', name: 'Anchor’s Shadow' },
      { id: 'keel', name: 'Keel' },
    ],
    spawns: [s('sweeper', 5, 8, 14, 0), s('snapper', 3, 24, 38, 0), s('cod', 2.5, 30, 46, 1), s('scorpionfish', 1.5, 30, 44, 3), s('jack', 2, 40, 56, 5), s('barracuda', 1.5, 52, 72, 4), s('moray', 1.5, 58, 82, 6)],
    boss: 'shark', jellyfish: [4, 7], hookEverySec: [14, 8],
  },
  6: {
    levels: [
      { id: 'the-edge', name: 'The Edge' },
      { id: 'blue-blank', name: 'Blue Blank' },
      { id: 'updraft', name: 'Updraft' },
      { id: 'vertigo', name: 'Vertigo' },
      { id: 'open-rush', name: 'Open Rush' },
      { id: 'cold-current', name: 'Cold Current' },
      { id: 'shelf-break', name: 'Shelf Break' },
      { id: 'last-light', name: 'Last Light' },
      { id: 'long-fall', name: 'Long Fall' },
      { id: 'over-the-edge', name: 'Over the Edge' },
    ],
    spawns: [s('anchovy', 5, 8, 14, 0), s('mackerel', 3, 22, 36, 0), s('flyingfish', 3, 18, 30, 1), s('needlefish', 2, 36, 50, 3), s('bonito', 2, 44, 60, 5), s('mahi', 1.5, 52, 72, 7)],
    boss: 'swordfish', jellyfish: [5, 8], hookEverySec: [12, 7],
  },
  7: {
    levels: [
      { id: 'dimming', name: 'Dimming' },
      { id: 'lantern-light', name: 'Lantern Light' },
      { id: 'faint-lines', name: 'Faint Lines' },
      { id: 'glowworms', name: 'Glowworms' },
      { id: 'twilight-rush', name: 'Twilight Rush' },
      { id: 'ghost-ink', name: 'Ghost Ink' },
      { id: 'fading-page', name: 'Fading Page' },
      { id: 'dusk-patrol', name: 'Dusk Patrol' },
      { id: 'silver-shoal', name: 'Silver Shoal' },
      { id: 'lights-out', name: 'Lights Out' },
    ],
    spawns: [s('bristlemouth', 5, 8, 14, 0), s('pearleye', 3, 20, 32, 0), s('barreleye', 2, 22, 34, 2), s('sabertooth', 2, 40, 58, 4), s('dragonfish', 2, 40, 62, 6), s('eel', 1.5, 64, 90), s('coelacanth', 0.6, 56, 74, 7)],
    boss: 'oarfish', jellyfish: [5, 9], hookEverySec: [0, 0],
  },
  8: {
    levels: [
      { id: 'ink-black', name: 'Ink Black' },
      { id: 'deep-crosshatch', name: 'Deep Crosshatch' },
      { id: 'pressure', name: 'Pressure' },
      { id: 'lures', name: 'Lures' },
      { id: 'midnight-rush', name: 'Midnight Rush' },
      { id: 'blind-lines', name: 'Blind Lines' },
      { id: 'teeth', name: 'Teeth' },
      { id: 'cold-blot', name: 'Cold Blot' },
      { id: 'snow-of-ink', name: 'Snow of Ink' },
      { id: 'midnight', name: 'Midnight' },
    ],
    spawns: [s('bigscale', 5, 8, 14, 0), s('whalefish', 3, 20, 34, 0), s('fangtooth', 2.5, 36, 54, 2), s('blackdragon', 2, 50, 72, 4), s('gulper', 2, 60, 90, 6)],
    boss: 'sleepershark', jellyfish: [6, 9], hookEverySec: [0, 0],
  },
  9: {
    levels: [
      { id: 'the-plain', name: 'The Plain' },
      { id: 'silt', name: 'Silt' },
      { id: 'footprints', name: 'Footprints' },
      { id: 'sea-snow', name: 'Sea Snow' },
      { id: 'abyss-rush', name: 'Abyss Rush' },
      { id: 'vents', name: 'Vents' },
      { id: 'hush', name: 'Hush' },
      { id: 'lonely-light', name: 'Lonely Light' },
      { id: 'bone-field', name: 'Bone Field' },
      { id: 'the-edge-of-the-page', name: 'The Edge of the Page' },
    ],
    spawns: [s('bristlemouth', 5, 8, 14), s('rattail', 3, 22, 36, 0), s('tripodfish', 2.5, 28, 40, 1), s('lizardfish', 2, 36, 54, 3), s('halosaur', 2, 40, 60, 5), s('cuskeel', 2, 56, 80, 7)],
    boss: 'seadevil', jellyfish: [7, 10], hookEverySec: [0, 0],
  },
  10: {
    levels: [
      { id: 'the-crack', name: 'The Crack' },
      { id: 'walls-of-ink', name: 'Walls of Ink' },
      { id: 'pressure-lines', name: 'Pressure Lines' },
      { id: 'the-narrows', name: 'The Narrows' },
      { id: 'trench-rush', name: 'Trench Rush' },
      { id: 'echoes', name: 'Echoes' },
      { id: 'hadal-hunt', name: 'Hadal Hunt' },
      { id: 'the-floor', name: 'The Floor' },
      { id: 'deepest-blot', name: 'Deepest Blot' },
      { id: 'challenger-deep', name: 'Challenger Deep' },
    ],
    spawns: [s('bristlemouth', 5, 8, 14), s('facelesscusk', 3, 22, 34, 0), s('snipeeel', 2.5, 26, 40, 1), s('ghostshark', 2, 44, 64, 3), s('angler', 2, 42, 66, 5), s('rattail', 2, 40, 56), s('tripodfish', 1.5, 30, 44), s('cuskeel', 2, 60, 84)],
    boss: 'giantsquid', jellyfish: [8, 11], hookEverySec: [0, 0],
  },
};

const RECIPES: Readonly<Record<number, Recipe>> = { ...SHALLOW_RECIPES, ...DEEP_RECIPES };

for (const z of ZONE_INFO) {
  if (z.id > 1 && !RECIPES[z.id]) throw new Error(`Missing recipe for chapter ${z.id}`);
}

export const INKFISH_FULL_CHAPTERS: readonly Chapter[] = buildChapters(RECIPES);
