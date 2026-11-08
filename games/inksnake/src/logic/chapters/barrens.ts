import { BOARD } from '../../level/types';
import { Charger } from '../enemies/charger';
import { Chaser } from '../enemies/chaser';
import { Pecker } from '../enemies/pecker';
import type { ChapterRules } from '../enemyTypes';
import { stepHopper } from '../preyMoves';
import type { Prey, PreySpec, PreyWorld } from '../preyTypes';
import { dist } from '../vec';
import { Fox } from './barrensFox';

/**
 * Chapter 2, the Pine Barrens: the eastern hognose on sandy ground under
 * pitch pines. It eats toads above all; toads puff themselves up when a
 * snake comes near (it doesn't fool a hognose). Raccoons grab at its tail,
 * opossums hunt it, wildfire sweeps through, and the Red Fox leaps.
 */

/** A toad puffs up when a snake it can see comes this close, and stays puffed this long, s. */
const PUFF_NEAR = 70;
const PUFF_TIME = 1.8;

/** Toads: they hop like frogs, but puff up and sit tight when a snake comes close (the view shows it). */
function toadStep(p: Prey, world: PreyWorld, dt: number, near: boolean): void {
  const d = p.data ?? (p.data = { puff: 0 });
  d.puff = Math.max(0, (d.puff ?? 0) - dt);
  if (world.headSeen && dist(p, world.head) < PUFF_NEAR) d.puff = PUFF_TIME;
  if (d.puff > 0) {
    p.mode = 'idle';
    return;
  }
  stepHopper(p, BARRENS_PREY.toad!, world, near, dt);
}

const BARRENS_PREY: Readonly<Record<string, PreySpec>> = {
  toad: { name: 'toad', size: 16, growth: 34, gait: 'hop', speed: 210, fear: 90, points: 12, step: toadStep },
  lizard: { name: 'fence lizard', size: 10, growth: 24, gait: 'scurry', speed: 175, fear: 115, points: 14 },
};

export const BARRENS_RULES: ChapterRules = {
  prey: BARRENS_PREY,
  enemies: {
    raccoon: {
      make: (id, def, _level, i) => new Pecker(id, 'raccoon', (def.from ?? 4) + i * 6, {
        nip: 22, reach: 30, windup: 0.6, scareReach: 46, shy: 56, speed: 88, hops: false, flies: false, awayTime: [8, 12],
      }),
      text: {
        name: 'Raccoons', card: 'Raccoons grab at your tail', hint: 'A raccoon is after your tail',
        tip: 'Turn and strike at the raccoon: it runs off for a while.',
        coach: { mouse: 'A raccoon grabs your tail! Strike it to send it off', touch: 'A raccoon grabs your tail! Tap to strike it' },
      },
    },
    opossum: {
      make: (id, def, _level, i) => new Chaser(id, 'opossum', (def.from ?? 5) + i * 6, {
        speed: 112, prowl: 42, sight: 230, reach: 18, bite: { kind: 'hurt', cause: 'bitten' }, scared: 'strike', avoid: 'water',
      }),
      text: {
        name: 'An opossum', card: 'An opossum hunts you', hint: 'An opossum is prowling',
        tip: 'Play dead when the opossum comes for you: it loses interest in a still snake.',
      },
    },
    wildfire: {
      make: (id, def) => new Charger(id, 'wildfire', def.from ?? 10, {
        every: [10, 14], warn: 2.2, run: 2.4, halfWidth: 34, cause: 'singed', nip: 30, word: 'Fire!',
      }),
      text: {
        name: 'Wildfire', card: 'Wildfire sweeps the barrens', hint: 'Smoke on the wind…',
        tip: 'When the fire\'s lane shows, get your head out of it, and as much of your body as you can.',
      },
    },
  },
  bosses: {
    fox: {
      make: (id, def) => new Fox(id, def.hp, BOARD.w, BOARD.h),
      text: {
        name: 'the Red Fox', card: 'Boss: the Red Fox', hint: 'The Red Fox is hunting you!',
        tip: 'When the fox crouches, play dead: it lands to sniff you, and that\'s your moment to strike.',
        coach: { mouse: 'Play dead as the fox leaps: strike while it sniffs you', touch: 'Play dead as the fox leaps: tap to strike while it sniffs you' },
      },
    },
  },
  hints: {
    playdead: {
      mouse: 'Hold E (or Shift) to play dead: hunters lose interest', touch: 'Hold the Play dead button: hunters lose interest',
      after: 'arrive', max: 14,
    },
    toads: { mouse: 'Toads puff up to look too big: a hognose eats them anyway', touch: 'Toads puff up to look too big: a hognose eats them anyway', until: 'eat', max: 10 },
    // Before its first leap; from then on the fox says what to do at each moment (Fox.prompt).
    foxplan: { mouse: 'Foxes pounce on mice from a leap. Fool this one: play dead', touch: 'Foxes pounce on mice from a leap. Fool this one: play dead', until: 'crouch', max: 10 },
  },
  hurts: {
    bitten: { title: 'Bitten…', word: 'Bitten!' },
    singed: { title: 'Singed…', word: 'Too hot!' },
  },
};
