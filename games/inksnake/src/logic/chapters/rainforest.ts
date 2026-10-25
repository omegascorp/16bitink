import { BOARD } from '../../level/types';
import { Pecker } from '../enemies/pecker';
import type { ChapterRules } from '../enemyTypes';
import { SerpentEagle } from './rainforestEagle';
import { Monitor } from './rainforestMonitor';
import { RAINFOREST_PREY } from './rainforestPrey';

/**
 * Chapter 5, the Rainforest: the paradise flying snake in the canopy of a
 * Southeast Asian forest, seen from above. The tree crowns (`tree` zones)
 * are home; everywhere else is the forest floor far below, where it's slow.
 * It glides from crown to crown, hunts geckos and tree frogs (and bats in
 * the air), keeps clear of a water monitor on the floor and hornbills in
 * the trees, and faces the Crested Serpent Eagle, a bird that lives on
 * snakes. Wording follows docs/inksnake-research.md: it glides (never
 * "flies"); hornbills eating snakes isn't checked, so they only peck here.
 */
export const RAINFOREST_RULES: ChapterRules = {
  prey: RAINFOREST_PREY,
  enemies: {
    hornbill: {
      make: (id, def, _level, i) => new Pecker(id, 'hornbill', (def.from ?? 4) + i * 6, {
        nip: 18, reach: 28, windup: 0.55, scareReach: 46, shy: 60, speed: 82, hops: true, flies: true, awayTime: [8, 12], zone: 'tree',
      }),
      text: {
        name: 'Hornbills', card: 'A hornbill pecks at your tail', hint: 'A hornbill is after your tail',
        tip: 'Turn and strike at the hornbill: it flaps off for a while. It keeps to the trees, so a glide leaves it behind.',
        coach: { mouse: 'A hornbill pecks your tail! Strike it to send it off', touch: 'A hornbill pecks your tail! Tap to strike it' },
      },
    },
    monitor: {
      make: (id, def, _level, i) => new Monitor(id, 'monitor', (def.from ?? 5) + i * 6, { speed: 104, prowl: 46, sight: 240, reach: 18, cause: 'bitten' }),
      text: {
        name: 'A water monitor', card: 'A water monitor prowls the floor', hint: 'A water monitor down on the forest floor…',
        tip: 'Keep off the forest floor while the monitor prowls. If you land there, slither straight back to a tree: it can\'t follow you up.',
      },
    },
  },
  bosses: {
    'serpent-eagle': {
      make: (id, def, level) => new SerpentEagle(id, def.hp, level, BOARD.w, BOARD.h),
      text: {
        name: 'the Crested Serpent Eagle', card: 'Boss: the Crested Serpent Eagle', hint: 'The Crested Serpent Eagle lives on snakes!',
        tip: 'Glide out of the red ring before the swoop. When the eagle lands on a crown after a miss, glide over and strike it there.',
        coach: { mouse: 'Glide out of the ring; strike the eagle where it lands', touch: 'Glide out of the ring; tap to strike the eagle where it lands' },
      },
    },
  },
  hints: {
    canopy: { mouse: 'Catch the geckos in the tree crowns to grow longer', touch: 'Catch the geckos in the tree crowns to grow longer', until: 'eat', max: 14 },
    glide: {
      mouse: 'On a tree crown, press E (or Shift) to glide: hold it to sail further', touch: 'On a tree crown, press Glide: hold it to sail further',
      until: 'land', max: 20,
    },
    floor: {
      mouse: 'On the forest floor you\'re slow: slither back to a tree to glide again', touch: 'On the forest floor you\'re slow: slither back to a tree to glide again',
      max: 8,
    },
    nightcanopy: { mouse: 'Night in the canopy: you only see what\'s near you', touch: 'Night in the canopy: you only see what\'s near you', max: 6 },
    bats: { mouse: 'Bats flit between the trees: glide into one to catch it', touch: 'Bats flit between the trees: glide into one to catch it', max: 10 },
    eagleplan: {
      mouse: 'Missed! The eagle has landed: glide over and strike it', touch: 'Missed! The eagle has landed: glide over and tap to strike it',
      after: 'miss', until: 'bossHit', max: 12,
    },
  },
  hurts: {
    bitten: { title: 'Bitten…', word: 'Bitten!' },
    taloned: { title: 'Taken by the eagle…', word: 'Talons!' },
  },
};
