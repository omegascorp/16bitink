import { BOARD } from '../../level/types';
import { Charger } from '../enemies/charger';
import { Chaser } from '../enemies/chaser';
import { Diver, HAWK } from '../enemies/diver';
import { RivalSnake, type RivalSpec } from '../enemies/rival';
import type { ChapterRules } from '../enemyTypes';
import { DUNES_PREY } from './dunesPrey';
import { Roadrunner } from './dunesRoadrunner';

/**
 * Chapter 3, the Dunes: the sidewinder on the loose sand of the Mojave.
 * It buries itself to ambush lizards, pocket mice and kangaroo rats (the
 * venom puts the big ones to sleep). Coyotes hunt it, a kingsnake (which
 * resists rattlesnake venom) is after it, a red-tailed hawk circles, dust
 * devils spin across the flats, and the Roadrunner dashes at it.
 */

/**
 * A California kingsnake: bigger than the sidewinder when it arrives, so
 * keep clear of its head (heads meeting, the bigger snake bites: here it
 * constricts). It hunts the sidewinder when it sees it, and eats the
 * level's small prey too. Kingsnakes find snakes by scent, so burying in
 * its path doesn't save you: move away from it.
 */
const KINGSNAKE: RivalSpec = {
  body: { name: 'California kingsnake', latin: 'Lampropeltis californiae', width: 18, speed: 92, turn: 3.2, big: 'none' },
  length: 230, hunts: 170, cause: 'constricted', eatsPrey: true, respawn: 0, points: 0,
};

export const DUNES_RULES: ChapterRules = {
  prey: DUNES_PREY,
  enemies: {
    coyote: {
      make: (id, def, _level, i) => new Chaser(id, 'coyote', (def.from ?? 5) + i * 7, {
        speed: 120, prowl: 46, sight: 220, reach: 18, bite: { kind: 'hurt', cause: 'bitten' }, scared: 'strike',
      }),
      text: {
        name: 'A coyote', card: 'A coyote hunts the dunes', hint: 'A coyote is on the prowl',
        tip: 'On sand you can outrun the coyote, and a strike at its nose sends it off. Buried in the sand, you\'re gone: it loses you.',
        coach: { mouse: 'A coyote! Strike its nose to send it off, or hide in the brush', touch: 'A coyote! Tap to strike its nose, or hide in the brush' },
      },
    },
    kingsnake: {
      make: (id, def, _level, i) => new RivalSnake(id, 'kingsnake', (def.from ?? 4) + i * 8, KINGSNAKE, 'kingsnake'),
      text: {
        name: 'A kingsnake', card: 'A kingsnake hunts snakes', hint: 'A kingsnake! It resists rattlesnake venom',
        tip: 'The kingsnake is bigger than you: keep away from its head. It smells you out even in the sand, so slither off instead of burying.',
        coach: { mouse: 'A kingsnake! It\'s bigger than you: keep away from its head', touch: 'A kingsnake! It\'s bigger than you: keep away from its head' },
      },
    },
    redtail: {
      make: (id, def, _level, i) => new Diver(id, 'redtail', (def.from ?? 6) + i * 5, HAWK),
      text: {
        name: 'A red-tailed hawk', card: 'A hawk circles the dunes', hint: 'A hawk is circling…',
        tip: 'When the red ring locks on, bury yourself or slip under the brush: the hawk can\'t see you there.',
        coach: { mouse: 'A hawk! Bury yourself, or get out of the red ring', touch: 'A hawk! Bury yourself, or get out of the red ring' },
      },
    },
    'dust-devil': {
      make: (id, def) => new Charger(id, 'dust-devil', def.from ?? 9, {
        every: [11, 15], warn: 2.2, run: 2.2, halfWidth: 30, cause: 'whirled', nip: 24, word: 'Dust devil!',
      }),
      text: {
        name: 'Dust devils', card: 'Dust devils spin across the dunes', hint: 'The wind is picking up…',
        tip: 'When a dust devil\'s lane shows, get your head out of it, and as much of your body as you can.',
      },
    },
  },
  bosses: {
    roadrunner: {
      make: (id, def) => new Roadrunner(id, def.hp, BOARD.w, BOARD.h),
      text: {
        name: 'the Roadrunner', card: 'Boss: the Roadrunner', hint: 'The Roadrunner is coming! Meep meep!',
        tip: 'When the roadrunner lowers its head, bury yourself or get out of its lane, then strike it while it skids to a stop.',
        coach: { mouse: 'Dodge the dash (or bury!), then strike the roadrunner as it skids', touch: 'Dodge the dash (or bury!), then tap to strike the roadrunner as it skids' },
      },
    },
  },
  hints: {
    bury: {
      mouse: 'Hold E (or Shift) on sand to bury yourself: hunters can\'t see you', touch: 'Hold the Bury button on sand: hunters can\'t see you',
      after: 'arrive', max: 14,
    },
    ambush: {
      mouse: 'Buried, prey comes close: strike from the sand to ambush it', touch: 'Buried, prey comes close: tap to strike from the sand',
      until: 'eat', max: 12,
    },
    krats: {
      mouse: 'Kangaroo rats kick sand at snakes: strike while it kicks', touch: 'Kangaroo rats kick sand at snakes: tap to strike while it kicks',
      until: 'bite', max: 12,
    },
    heatsense: {
      mouse: 'Night on the dunes: a pit viper feels the warmth of prey, so follow the glow', touch: 'Night on the dunes: a pit viper feels the warmth of prey, so follow the glow',
      max: 8,
    },
    roadrunner: {
      mouse: 'Bury as it lowers its head: it overshoots. Strike while it skids', touch: 'Bury as it lowers its head: it overshoots. Tap to strike while it skids',
      after: 'crouch', until: 'bossHit', max: 18,
    },
  },
  hurts: {
    bitten: { title: 'Bitten…', word: 'Bitten!' },
    constricted: { title: 'Constricted…', word: 'Squeezed!' },
    grabbed: { title: 'Grabbed…', word: 'Grabbed!' },
    whirled: { title: 'Whirled away…', word: 'Whoosh!' },
  },
};
