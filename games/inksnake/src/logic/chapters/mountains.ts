import { BOARD } from '../../level/types';
import { Charger } from '../enemies/charger';
import { Diver, HAWK } from '../enemies/diver';
import type { ChapterRules } from '../enemyTypes';
import type { Prey, PreySpec, PreyWorld } from '../preyTypes';
import { WildBoar } from './mountainsBoar';
import { stepBird } from './mountainsBirds';

/**
 * Chapter 7, the Mountains: the spider-tailed horned viper in the limestone
 * crags of the western Zagros. It lures birds down with its spider-like
 * tail (larks, warblers, a finch, the Isabelline shrike; some of them on
 * migration) and eats rock agamas too. Short-toed snake eagles hunt it from
 * the sky, rocks come down the slope, and a wild boar roots about the
 * hillside.
 */

/** A bird's step with its own spec (see mountainsBirds.ts). */
const bird = (kind: string) => (p: Prey, world: PreyWorld, dt: number, near: boolean): void => stepBird(p, MOUNTAINS_PREY[kind]!, world, dt, near);

const MOUNTAINS_PREY: Readonly<Record<string, PreySpec>> = {
  lark: { name: 'crested lark', size: 12, growth: 30, gait: 'hop', speed: 120, fear: 85, points: 14, step: bird('lark') },
  warbler: { name: 'warbler', size: 10, growth: 26, gait: 'hop', speed: 130, fear: 80, points: 12, step: bird('warbler') },
  'desert-finch': { name: 'desert finch', size: 13, growth: 30, gait: 'hop', speed: 115, fear: 90, points: 14, step: bird('desert-finch') },
  // Too big to swallow at once: venom (a strike puts it to sleep).
  shrike: { name: 'Isabelline shrike', size: 24, growth: 62, gait: 'hop', speed: 120, fear: 95, points: 36, step: bird('shrike') },
  agama: { name: 'rock agama', size: 12, growth: 32, gait: 'scurry', speed: 160, fear: 105, points: 12 },
};

/** The short-toed snake eagle hangs in the wind ("kiting") before it drops, a little quicker to lock on than the hawk. */
const SNAKE_EAGLE = { ...HAWK, circleTime: [3.6, 5.6] as const, lockTime: 1.05, stoop: 0.42, circleR: 125, cause: 'snatched' };

export const MOUNTAINS_RULES: ChapterRules = {
  prey: MOUNTAINS_PREY,
  enemies: {
    'snake-eagle': {
      make: (id, def, _level, i) => new Diver(id, 'snake-eagle', (def.from ?? 4) + i * 6, SNAKE_EAGLE),
      text: {
        name: 'A short-toed snake eagle', card: 'A snake eagle hunts overhead', hint: 'A snake eagle is circling…',
        tip: 'When the red ring locks on, slip into a crevice: the eagle can\'t see you in the rock.',
        coach: { mouse: 'A snake eagle! Its diet is almost all snakes: get out of the ring, or into a crevice', touch: 'A snake eagle! Its diet is almost all snakes: get out of the ring, or into a crevice' },
      },
    },
    rockfall: {
      make: (id, def) => new Charger(id, 'rockfall', def.from ?? 8, {
        every: [9, 13], warn: 1.9, run: 1.3, halfWidth: 30, cause: 'crushed', nip: 24, word: 'Rockfall!',
      }),
      text: {
        name: 'Rockfall', card: 'Rocks come down the slope', hint: 'Pebbles trickle down the scree…',
        tip: 'When the dotted lane shows, get your head out of it: the rocks come straight down it.',
        coach: { mouse: 'Rockfall! Get your head out of the dotted lane', touch: 'Rockfall! Get your head out of the dotted lane' },
      },
    },
  },
  bosses: {
    boar: {
      make: (id, def) => new WildBoar(id, def.hp, BOARD.w, BOARD.h),
      text: {
        name: 'the Wild Boar', card: 'Boss: the Wild Boar', hint: 'A wild boar roots about the hillside!',
        tip: 'Keep a rock behind you when the boar paws the ground, then slip aside: it charges into the rock, dazed. Strike!',
        coach: { mouse: 'Put a rock behind you, dodge the charge, then strike the dazed boar', touch: 'Put a rock behind you, dodge the charge, then tap to strike the dazed boar' },
      },
    },
  },
  hints: {
    stalk: {
      mouse: 'Birds fly off when they see you: creep up and strike (click or Space)', touch: 'Birds fly off when they see you: creep up and tap to strike',
      until: 'strike', max: 12,
    },
    lure: {
      mouse: 'Hold E (or Shift) to keep still and wiggle your spider tail: birds fly down to it', touch: 'Hold the Lure button to keep still and wiggle your spider tail: birds fly down to it',
      max: 16,
    },
    lurestrike: {
      mouse: 'A bird is hopping up to the "spider": strike it before it flies off!', touch: 'A bird is hopping up to the "spider": tap to strike before it flies off!',
      after: 'land', until: 'eat', max: 12,
    },
    crevice: {
      mouse: 'Lure from a crevice: the eagle can\'t see you in the rock', touch: 'Lure from a crevice: the eagle can\'t see you in the rock',
      after: 'miss', max: 8,
    },
    larks: {
      mouse: 'Crested larks pass through on migration: lure them down', touch: 'Crested larks pass through on migration: lure them down',
      max: 8,
    },
    nightrock: {
      mouse: 'Night on the crags: you only see what\'s near you', touch: 'Night on the crags: you only see what\'s near you',
      max: 6,
    },
    boarplan: {
      mouse: 'Let the boar charge into a rock, then strike while it\'s dazed', touch: 'Let the boar charge into a rock, then tap to strike while it\'s dazed',
      after: 'pounce', until: 'bossHit', max: 18,
    },
  },
  hurts: {
    crushed: { title: 'Crushed by rocks…', word: 'Bonk!' },
    charged: { title: 'Bowled over…', word: 'Oof!' },
  },
};
