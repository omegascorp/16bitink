import { BOARD, type LevelDef } from '../../level/types';
import { Diver, HAWK } from '../enemies/diver';
import { Drifter } from '../enemies/drifter';
import type { ChapterRules } from '../enemyTypes';
import { dist, pt, type Pt } from '../vec';
import { inZone } from '../zones';
import { REEF_PREY } from './reefPrey';
import { Shark } from './reefShark';

/**
 * Chapter 6, the Reef: the banded sea krait hunts eels in the coral holes
 * underwater and comes up onto the sand cays to breathe. White-bellied
 * sea eagles take sea snakes in the shallows, box jellies drift through
 * and sting whatever brushes them (a hazard, not a hunter), and the Tiger
 * Shark circles and charges.
 *
 * Its ground: a water zone over the whole board, land zones for the cays,
 * and sand zones for the shallows round them (the cay included): the
 * eagle only strikes over sand.
 */

/** Spots box jellies start from: open water, spread out, away from the snake's start. */
function jellySpot(level: LevelDef, i: number): Pt {
  const zones = level.zones ?? [];
  const solids = level.solids ?? [];
  const open: Pt[] = [];
  for (let x = 110; x < BOARD.w - 60; x += 105) {
    for (let y = 80; y < BOARD.h - 50; y += 95) {
      const p = pt(x, y);
      if (!inZone(p, zones, 'water') || inZone(p, zones, 'sand') || dist(p, level.start) < 220) continue;
      if (solids.some((s) => (s.kind === 'circle' ? dist(p, s) < s.r + 40 : p.x > s.x - 40 && p.x < s.x + s.w + 40 && p.y > s.y - 40 && p.y < s.y + s.h + 40))) continue;
      open.push(p);
    }
  }
  open.sort((a, b) => dist(b, level.start) - dist(a, level.start));
  const picked: Pt[] = [];
  for (const p of open) if (picked.every((q) => dist(p, q) > 230)) picked.push(p);
  return picked[i % Math.max(1, picked.length)] ?? pt(BOARD.w * 0.7, BOARD.h * 0.3);
}

export const REEF_RULES: ChapterRules = {
  prey: REEF_PREY,
  enemies: {
    'sea-eagle': {
      make: (id, def, _level, i) => new Diver(id, 'sea-eagle', (def.from ?? 6) + i * 7, {
        ...HAWK, ringR: 50, circleR: 150, circleTime: [3.5, 5.5], lockTime: 1.15, stoop: 0.45, giveUp: 14, awayTime: [5, 8], over: 'sand', cause: 'snatched',
      }),
      text: {
        name: 'A white-bellied sea eagle', card: 'A sea eagle watches the cays', hint: 'A sea eagle is circling…',
        tip: 'The sea eagle only strikes on the cays and in the shallows: when its red ring locks on, dive back into deep water.',
        coach: { mouse: 'A sea eagle! On the cays and shallows it can see you: dive into deep water', touch: 'A sea eagle! On the cays and shallows it can see you: dive into deep water' },
      },
    },
    jelly: {
      make: (id, _def, level, i) => new Drifter(id, 'jelly', jellySpot(level, i), { speed: 20, zone: 'water', reach: 15, nip: 24, rest: 1.4 }),
      text: {
        name: 'Box jellies', card: 'Box jellies drift by', hint: 'Box jellies are drifting in…',
        tip: 'Box jellies sting anything that brushes them: steer your whole body round them.',
      },
    },
  },
  bosses: {
    shark: {
      make: (id, def) => new Shark(id, def.hp, BOARD.w, BOARD.h),
      text: {
        name: 'the Tiger Shark', card: 'Boss: the Tiger Shark', hint: 'A tiger shark is circling!',
        tip: 'When its fin rises, swim out of the dotted lane. After the charge it turns slowly: strike its snout.',
        coach: { mouse: 'Out of the shark\'s lane! Then strike its snout while it turns', touch: 'Out of the shark\'s lane! Then tap to strike its snout while it turns' },
      },
    },
  },
  hints: {
    breath: {
      mouse: 'Underwater your breath runs down: come up on a sand cay to breathe', touch: 'Underwater your breath runs down: come up on a sand cay to breathe',
      max: 10,
    },
    eelholes: {
      mouse: 'Eels hide in the coral holes: wait for one to poke out, then strike', touch: 'Eels hide in the coral holes: wait for one to poke out, then tap to strike',
      until: 'eat', max: 16,
    },
    reefnight: {
      mouse: 'Night on the reef: you only see what\'s near you, but the water glows where you swim', touch: 'Night on the reef: you only see what\'s near you, but the water glows where you swim',
      max: 7,
    },
    sharkplan: {
      mouse: 'Swim out of the lane as it charges, then strike its snout while it turns', touch: 'Swim out of the lane as it charges, then tap to strike its snout while it turns',
      after: 'crouch', until: 'bossHit', max: 18,
    },
  },
  hurts: {
    drowned: { title: 'Out of breath…', word: 'Gasp!' },
    shark: { title: 'Caught by the shark…', word: 'Chomp!' },
  },
};
