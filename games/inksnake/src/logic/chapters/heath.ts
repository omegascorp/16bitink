import { poolOf, Heron } from './heathHeron';
import { Badger } from './heathBadger';
import { Hedgehog } from './heathHedgehog';
import { Diver, HAWK } from '../enemies/diver';
import type { ChapterRules } from '../enemyTypes';
import { stepScurrier } from '../preyMoves';
import type { Prey, PreySpec, PreyWorld } from '../preyTypes';
import { wrapAngle } from '../vec';

/**
 * Chapter 8, the Heath: the European adder on heather and gorse moor,
 * granite boulders and a dry-stone wall. Cold-blooded, it must bask in
 * the sun patches that drift as clouds pass (abilities/adder.ts). It eats
 * wood mice, common lizards and frogs, and strikes field voles (too big to
 * swallow on the spot) with its venom. Buzzards circle, a hedgehog
 * snuffles about (too prickly to strike), a heron waits by the pool, and
 * the Badger digs up from its setts.
 */

/** Heath prey keeps out of the pool: one that wanders in steps back and turns round. */
function dry(spec: () => PreySpec) {
  return (p: Prey, world: PreyWorld, dt: number, near: boolean): void => {
    const x = p.x;
    const y = p.y;
    stepScurrier(p, spec(), world, near, dt);
    if (!world.inZone(p, 'water')) return;
    p.x = x;
    p.y = y;
    p.heading = wrapAngle(p.heading + Math.PI * (0.7 + world.rng() * 0.6));
  };
}

const HEATH_PREY: Readonly<Record<string, PreySpec>> = {
  woodmouse: {
    name: 'wood mouse', plural: 'wood mice', size: 12, growth: 28, gait: 'scurry', speed: 118, fear: 115, points: 10,
    step: dry(() => HEATH_PREY.woodmouse!),
  },
  'common-lizard': {
    name: 'common lizard', size: 10, growth: 24, gait: 'scurry', speed: 170, fear: 110, points: 14,
    step: dry(() => HEATH_PREY['common-lizard']!),
  },
  // Too big to swallow on the spot: an adder strikes a vole, lets it go, and follows it.
  vole: {
    name: 'field vole', size: 24, growth: 64, gait: 'scurry', speed: 96, fear: 105, points: 30,
    step: dry(() => HEATH_PREY.vole!),
  },
};

export const HEATH_RULES: ChapterRules = {
  prey: HEATH_PREY,
  enemies: {
    buzzard: {
      make: (id, def, _level, i) => new Diver(id, 'buzzard', (def.from ?? 5) + i * 7, {
        ...HAWK, ringR: 48, circleTime: [4.5, 7], lockTime: 1.2, stoop: 0.5, diveTime: 0.34, groundTime: 1.2, circleR: 140, awayTime: [7, 10],
      }),
      text: {
        name: 'A common buzzard', card: 'A buzzard circles overhead', hint: 'A buzzard is circling…',
        tip: 'When the red ring locks on, slip under the heather or gorse: the buzzard can\'t see you there. And keep warm: a cold adder is slow.',
        coach: { mouse: 'A buzzard! Get out of the red ring, or hide in the heather', touch: 'A buzzard! Get out of the red ring, or hide in the heather' },
      },
    },
    hedgehog: {
      make: (id, def, _level, i) => new Hedgehog(id, (def.from ?? 6) + i * 8),
      text: {
        name: 'A hedgehog', card: 'A hedgehog snuffles about', hint: 'A hedgehog is snuffling about',
        tip: 'Hedgehogs resist adder venom, and a strike only pricks you: keep warm and keep away from it.',
        coach: { mouse: 'A hedgehog! Too prickly to strike: stay warm and outrun it', touch: 'A hedgehog! Too prickly to strike: stay warm and outrun it' },
      },
    },
    heron: {
      make: (id, def, level, i) => new Heron(id, (def.from ?? 4) + i * 6, poolOf(level)),
      text: {
        name: 'A grey heron', card: 'A heron waits by the pool', hint: 'A heron is watching the pool',
        tip: 'Herons will spear an adder: when its red ring shows, slip out of it, then strike the heron while its bill is down.',
        coach: { mouse: 'A heron! Slip out of its red ring before it stabs', touch: 'A heron! Slip out of its red ring before it stabs' },
      },
    },
  },
  bosses: {
    badger: {
      make: (id, def, level) => new Badger(id, def.hp, level.spots),
      text: {
        name: 'the Badger', card: 'Boss: the Badger', hint: 'The Badger is digging under the heath!',
        tip: 'When a sett trembles, get away from it; then strike the badger while it sniffs about. In the sun it\'s slower to dive back.',
        coach: { mouse: 'Get clear of the trembling sett, then strike the badger while it sniffs', touch: 'Get clear of the trembling sett, then tap to strike the badger while it sniffs' },
      },
    },
  },
  hints: {
    'adder-cold': {
      mouse: 'A cold spring morning: the adder is slow. Slither into the golden sunshine to warm up', touch: 'A cold spring morning: the adder is slow. Slither into the golden sunshine to warm up',
      until: 'eat', max: 10,
    },
    'adder-bask': {
      mouse: 'Golden patches are sunshine: slither through them to warm up. The more of you in the sun, the faster', touch: 'Golden patches are sunshine: slither through them to warm up. The more of you in the sun, the faster',
      max: 12,
    },
    'adder-clouds': {
      mouse: 'Warmth is speed. Clouds drift over the sun patches: follow the sunshine', touch: 'Warmth is speed. Clouds drift over the sun patches: follow the sunshine',
      max: 12,
    },
    'adder-night': {
      mouse: 'Night on the moor, and cold: the stones still hold the day\'s warmth', touch: 'Night on the moor, and cold: the stones still hold the day\'s warmth',
      max: 10,
    },
    'badger-plan': {
      mouse: 'Get clear of the trembling sett, then strike the badger while it sniffs', touch: 'Get clear of the trembling sett, then tap to strike the badger while it sniffs',
      after: 'crouch', until: 'bossHit', max: 18,
    },
  },
  hurts: {
    heronstab: { title: 'Speared…', word: 'Speared!' },
    badgered: { title: 'Badgered…', word: 'Chomp!' },
  },
};
