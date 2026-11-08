import { BOARD } from '../../level/types';
import { Charger } from '../enemies/charger';
import { Chaser } from '../enemies/chaser';
import type { ChapterRules } from '../enemyTypes';
import type { PreySpec } from '../preyTypes';
import { pt } from '../vec';
import { SecretaryBird } from './savannaSecretary';
import { Weaver } from './savannaWeavers';

/**
 * Chapter 4, the Savanna: the African egg-eater in tall grass under flat-
 * topped acacias. It eats only birds' eggs (its species spec has the diet
 * and the wide gape): weavers' small eggs in nests hanging from the acacias'
 * branch tips, and the guineafowl's big ones in ground nests in the grass,
 * each a long still swallow (the shell is spat out after). Banded mongooses
 * hunt in packs, weavers mob it at their nests, wildebeest stampede, and
 * the Secretary Bird stamps.
 */

const SAVANNA_PREY: Readonly<Record<string, PreySpec>> = {
  // Eggs are still: weavers' lie in the level's nests; guineafowl eggs lie in the tall grass (their ground nests).
  'weaver-egg': { name: 'weaver egg', size: 10, growth: 26, gait: 'still', speed: 0, fear: 0, points: 12 },
  'guinea-egg': { name: 'guineafowl egg', size: 30, growth: 72, gait: 'still', speed: 0, fear: 0, points: 36, zone: 'grass' },
};

export const SAVANNA_RULES: ChapterRules = {
  prey: SAVANNA_PREY,
  enemies: {
    'banded-mongoose': {
      // A pack: they come in close together.
      make: (id, def, _level, i) => new Chaser(id, 'banded-mongoose', (def.from ?? 5) + i * 1.3, {
        speed: 118, prowl: 50, sight: 200, reach: 16, bite: { kind: 'hurt', cause: 'bitten' }, scared: 'strike', avoid: 'water',
      }),
      text: {
        name: 'Banded mongooses', card: 'A mongoose pack is out hunting', hint: 'Banded mongooses! They hunt in packs',
        tip: 'Rasp when the mongooses close in, or slip into the tall grass: they lose sight of you there.',
        coach: { mouse: 'Mongooses eat snakes! Hide in the tall grass, or rasp (E)', touch: 'Mongooses eat snakes! Hide in the tall grass, or tap Rasp' },
      },
    },
    weaver: {
      make: (id, def, level, i) => {
        const nests = level.nests ?? [];
        const home = nests.length ? nests[(i * 2) % nests.length]! : pt(BOARD.w / 2, BOARD.h / 2);
        return new Weaver(id, 'weaver', home, (def.from ?? 2) + i * 0.8);
      },
      text: {
        name: 'Weaver birds', card: 'Weavers guard their nests', hint: 'The weavers are watching their nests',
        tip: 'Weavers mob you near their nests and nip your tail: rasp or strike to send them off, then raid the nest.',
        coach: { mouse: 'Weavers! Strike or rasp (E) to send them off', touch: 'Weavers! Tap to strike, or tap Rasp, to send them off' },
      },
    },
    wildebeest: {
      make: (id, def) => new Charger(id, 'wildebeest', def.from ?? 10, {
        every: [11, 15], warn: 2.4, run: 2.2, halfWidth: 42, cause: 'trampled', nip: 30, word: 'Stampede!',
      }),
      text: {
        name: 'A wildebeest stampede', card: 'Wildebeest stampede across the plain', hint: 'The ground is shaking…',
        tip: 'When the herd\'s lane shows, get your head out of it, and as much of your body as you can.',
      },
    },
  },
  bosses: {
    'secretary-bird': {
      make: (id, def) => new SecretaryBird(id, def.hp, BOARD.w, BOARD.h),
      text: {
        name: 'the Secretary Bird', card: 'Boss: the Secretary Bird', hint: 'The Secretary Bird stamps on snakes!',
        tip: 'Swerve out of the red ring before the foot comes down, then strike while its foot is down. A rasp won\'t scare it.',
        coach: { mouse: 'Dodge the stamp, then strike while its foot is down', touch: 'Dodge the stamp, then tap to strike while its foot is down' },
      },
    },
  },
  hints: {
    eggsonly: {
      mouse: 'An egg-eater eats only eggs: raid the weavers\' hanging nests', touch: 'An egg-eater eats only eggs: raid the weavers\' hanging nests',
      until: 'eat', max: 12,
    },
    tallgrass: {
      mouse: 'In the tall grass the mongooses lose sight of you', touch: 'In the tall grass the mongooses lose sight of you',
      after: 'arrive', max: 10,
    },
    rasp: {
      mouse: 'Press E to rasp your scales like a viper: hunters nearby run off', touch: 'Tap Rasp to rasp your scales like a viper: hunters nearby run off',
      after: 'arrive', until: 'scared', max: 16,
    },
    bluff: {
      mouse: 'Almost toothless, but a strike still bluffs: lunge at a weaver to send it off', touch: 'Almost toothless, but a strike still bluffs: tap to lunge at a weaver',
      after: 'arrive', until: 'scared', max: 14,
    },
    bigegg: {
      mouse: 'Guineafowl eggs are huge: you stop to swallow one, then spit out the shell', touch: 'Guineafowl eggs are huge: you stop to swallow one, then spit out the shell',
      max: 12,
    },
    savannanight: {
      mouse: 'Night on the savanna: you only see what\'s near you', touch: 'Night on the savanna: you only see what\'s near you', max: 6,
    },
    secretary: {
      mouse: 'Swerve out of the red ring, then strike while the bird\'s foot is down', touch: 'Swerve out of the red ring, then tap to strike while its foot is down',
      after: 'crouch', until: 'bossHit', max: 18,
    },
  },
  hurts: {
    bitten: { title: 'Bitten…', word: 'Bitten!' },
    trampled: { title: 'Trampled…', word: 'Trampled!' },
    stamped: { title: 'Stamped on…', word: 'Stamped!' },
  },
};
