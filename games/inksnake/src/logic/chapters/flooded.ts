import { BOARD } from '../../level/types';
import { RivalSnake, type RivalSpec } from '../enemies/rival';
import type { ChapterRules } from '../enemyTypes';
import { BlackCaiman, caimanLair } from './floodedCaiman';
import { Jaguar } from './floodedJaguar';
import { FLOODED_PREY } from './floodedPrey';

/**
 * Chapter 10, the Flooded Forest: the green anaconda in the dark water
 * between the trees of the Amazon's flooded forest, the heaviest snake
 * there is. It eats fish, wading birds, capybaras and young caimans, and
 * coils whatever's too big to swallow. Black caimans lurk in the water, a
 * bigger anaconda hunts it (big females eat smaller anacondas), and the
 * Jaguar prowls the banks.
 */

/** The bigger anaconda: a big female, thicker and longer than you, and a little slower. */
const BIG_ANACONDA: RivalSpec = {
  body: { name: 'green anaconda', latin: 'Eunectes murinus', width: 31, speed: 98, turn: 2.6, big: 'none' },
  length: 340, hunts: 210, cause: 'squeezed', eatsPrey: true, respawn: 0, points: 0,
};

export const FLOODED_RULES: ChapterRules = {
  prey: FLOODED_PREY,
  enemies: {
    'black-caiman': {
      make: (id, def, level, i) => new BlackCaiman(id, caimanLair(level, i, BOARD.w, BOARD.h), (def.from ?? 3) + i * 4),
      text: {
        name: 'A black caiman', card: 'A black caiman lurks', hint: 'Two eyes in the water…',
        tip: 'Caimans take young anacondas. Give its eyes a wide berth, and when bubbles rise get out of the red ring.',
        coach: { mouse: 'Bubbles: a caiman is about to snap! Get out of the red ring', touch: 'Bubbles: a caiman is about to snap! Get out of the red ring' },
      },
    },
    'big-anaconda': {
      make: (id, def, _level, i) => new RivalSnake(id, 'big-anaconda', (def.from ?? 6) + i * 8, BIG_ANACONDA, 'big-anaconda'),
      text: {
        name: 'A bigger anaconda', card: 'A bigger anaconda hunts you', hint: 'A bigger anaconda is in the water…',
        tip: 'Big anacondas sometimes eat smaller ones. Keep your head away from hers, or submerge: she hunts by sight.',
      },
    },
  },
  bosses: {
    jaguar: {
      make: (id, def, level) => new Jaguar(id, def.hp, level, BOARD.w, BOARD.h),
      text: {
        name: 'the Jaguar', card: 'Boss: the Jaguar', hint: 'The Jaguar prowls the banks!',
        tip: 'Stay under the water: the jaguar can\'t see you there. When it bends down to drink, swim up close and strike from below.',
        coach: { mouse: 'Submerge, and strike the jaguar from under the water while it drinks', touch: 'Submerge, and tap to strike the jaguar from under the water while it drinks' },
      },
    },
  },
  hints: {
    submerge: {
      mouse: 'Hold E (or Shift) in the water to submerge: only your eyes show, and nothing sees you coming',
      touch: 'Hold the Submerge button in the water: only your eyes show, and nothing sees you coming', max: 16,
    },
    egrets: {
      mouse: 'Egrets fly off when they see you: creep up on them submerged', touch: 'Egrets fly off when they see you: creep up on them submerged',
      until: 'eat', max: 14,
    },
    breath: { mouse: 'Under the water your breath runs down: come up for air', touch: 'Under the water your breath runs down: come up for air', max: 8 },
    capycoil: {
      mouse: 'Capybaras are too big to swallow: when one drinks, circle round it to coil it',
      touch: 'Capybaras are too big to swallow: when one drinks, circle round it to coil it', until: 'squeeze', max: 25,
    },
    caimancoil: {
      mouse: 'A young caiman is too big to swallow: coil it', touch: 'A young caiman is too big to swallow: coil it', until: 'squeeze', max: 18,
    },
    jaguarplan: {
      mouse: 'Stay submerged. When the jaguar drinks, swim close and strike from under the water',
      touch: 'Stay submerged. When the jaguar drinks, swim close and tap to strike from under the water', until: 'bossHit', max: 22,
    },
  },
  hurts: {
    snapped: { title: 'Snapped up…', word: 'Snap!' },
    squeezed: { title: 'Squeezed…', word: 'Squeezed!' },
    mauled: { title: 'Mauled…', word: 'Mauled!' },
  },
};
