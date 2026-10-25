import { BOARD } from '../../level/types';
import { Chaser } from '../enemies/chaser';
import type { ChapterRules, EnemyEntry } from '../enemyTypes';
import { Mongoose } from './jungleMongoose';
import { JUNGLE_PREY } from './junglePrey';
import { BIG_KRAIT, JungleRival, RAT_SNAKE, ROCK_PYTHON, SMALL_KRAIT, type JungleRivalSpec } from './jungleRival';

/**
 * Chapter 9, the Jungle: the king cobra (the northern one, Ophiophagus
 * hannah) in the forests of northern and eastern India, by a stream among
 * bamboo, fallen teak and the stones of a ruined temple. It eats other
 * snakes: rat snakes, banded kraits, even a rock python. It rears up and
 * spreads its hood to freeze everything near (abilities/cobra.ts). Honey
 * badgers hunt cobras and aren't impressed by a hood; big kraits bite; and
 * the Grey Mongoose, which resists cobra venom, feints and darts.
 */

/** A kind of rival snake: `gap` s between one and the next of its kind in a level. */
function rival(kind: string, spec: JungleRivalSpec, from: number, gap: number, text: EnemyEntry['text']): EnemyEntry {
  return { make: (id, def, _level, i) => new JungleRival(id, kind, (def.from ?? from) + i * gap, spec), text };
}

export const JUNGLE_RULES: ChapterRules = {
  prey: JUNGLE_PREY,
  enemies: {
    ratsnake: rival('ratsnake', RAT_SNAKE, 1, 3, {
      name: 'Rat snakes', card: 'Rat snakes: a king cobra\'s dinner', hint: 'Rat snakes! A king cobra eats snakes',
      tip: 'Rat snakes are quick: spread your hood to freeze one, then catch it anywhere along its body.',
      coach: { mouse: 'A rat snake! It\'s thinner than you: catch it, a king cobra eats snakes', touch: 'A rat snake! It\'s thinner than you: catch it, a king cobra eats snakes' },
    }),
    'banded-krait': rival('banded-krait', SMALL_KRAIT, 3, 5, {
      name: 'Banded kraits', card: 'Young banded kraits to eat', hint: 'Banded kraits: the thin ones are dinner',
      tip: 'A krait thinner than you is a meal. Catch it before it slips away.',
    }),
    'big-krait': rival('big-krait', BIG_KRAIT, 8, 9, {
      name: 'A big krait', card: 'A big banded krait bites', hint: 'A big krait! It\'s wider than you',
      tip: 'A krait wider than you bites: keep off its head, or strike it to send it off. Grow wide enough and it\'s dinner too.',
      coach: { mouse: 'A big krait! Wider than you: keep off its head, or strike it', touch: 'A big krait! Wider than you: keep off its head, or tap to strike it' },
    }),
    'rock-python': rival('rock-python', ROCK_PYTHON, 3, 12, {
      name: 'A rock python', card: 'A rock python: too wide to swallow', hint: 'A rock python! Strike it: it falls asleep',
      tip: 'Strike the python anywhere along its body: your venom puts it to sleep, then swallow it whole. Keep off its head.',
    }),
    'honey-badger': {
      make: (id, def, _level, i) => new Chaser(id, 'honey-badger', (def.from ?? 6) + i * 8, {
        speed: 126, prowl: 46, sight: 230, reach: 18, bite: { kind: 'hurt', cause: 'bitten' }, scared: 'strike', avoid: 'water', unmoved: true,
      }),
      text: {
        name: 'A honey badger', card: 'A honey badger hunts you', hint: 'A honey badger! Honey badgers hunt cobras',
        tip: 'Your hood doesn\'t impress a honey badger. Strike its nose, outrun it, hide under the leaves, or slip across the stream.',
        coach: { mouse: 'A honey badger! Your hood won\'t stop it: strike its nose, or hide', touch: 'A honey badger! Your hood won\'t stop it: tap to strike its nose, or hide' },
      },
    },
  },
  bosses: {
    'grey-mongoose': {
      make: (id, def) => new Mongoose(id, def.hp, BOARD.w, BOARD.h),
      text: {
        name: 'the Grey Mongoose', card: 'Boss: the Grey Mongoose', hint: 'The Grey Mongoose! Mongooses resist cobra venom',
        tip: 'The mongoose feints to draw your strike. Wait for it: strike right after the feint, while it\'s off balance. Spread your hood and it stops to stare: strike then too.',
        coach: { mouse: 'Strike the mongoose right after it feints, or spread your hood', touch: 'Tap to strike the mongoose right after it feints, or spread your hood' },
      },
    },
  },
  hints: {
    snakeeater: {
      mouse: 'A king cobra eats snakes: catch a rat snake thinner than you', touch: 'A king cobra eats snakes: catch a rat snake thinner than you',
      after: 'arrive', until: 'eat', max: 14,
    },
    cobrahood: {
      mouse: 'Press E (or Shift) to rear up and spread your hood: everything near freezes', touch: 'Press the Hood button: everything near you freezes',
      until: 'startle', max: 16,
    },
    kraits: {
      mouse: 'Thin kraits are dinner. Wider than you? Keep off its head', touch: 'Thin kraits are dinner. Wider than you? Keep off its head',
      after: 'arrive', max: 12,
    },
    pythonvenom: {
      mouse: 'Too wide to swallow? Strike the python: it falls asleep, then swallow it', touch: 'Too wide to swallow? Tap to strike the python: it falls asleep, then swallow it',
      after: 'arrive', max: 16,
    },
    mongooseplan: {
      mouse: 'Like Rikki-tikki, it feints first: strike right after, while it\'s off balance', touch: 'Like Rikki-tikki, it feints first: tap to strike right after, while it\'s off balance',
      until: 'bossHit', max: 18,
    },
  },
  hurts: {
    bitten: { title: 'Bitten…', word: 'Bitten!' },
    krait: { title: 'A krait bite…', word: 'Krait bite!' },
    constricted: { title: 'Constricted…', word: 'Squeezed!' },
  },
};
