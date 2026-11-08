import { BOARD } from '../../level/types';
import { Crow } from '../enemies/pecker';
import { Hawk } from '../enemies/diver';
import { Hen } from '../enemies/hen';
import { Tomcat } from '../enemies/tomcat';
import type { ChapterRules } from '../enemyTypes';

/**
 * Chapter 1, the farm: its enemies and boss (its prey is the base set in
 * logic/prey.ts, as every chapter may use it).
 */
export const FARM_RULES: ChapterRules = {
  enemies: {
    crow: {
      make: (id, def, _level, i) => new Crow(id, (def.from ?? 3) + i * 5),
      text: {
        name: 'Crows', card: 'Crows peck your tail', hint: 'Crows are after your tail',
        tip: 'Turn and strike at a crow: it flaps off for a while.',
        coach: { mouse: 'A crow pecks your tail! Strike it to scare it off', touch: 'A crow pecks your tail! Tap to strike and scare it off' },
      },
    },
    hawk: {
      make: (id, def, _level, i) => new Hawk(id, (def.from ?? 3) + i * 5),
      text: {
        name: 'A red-tailed hawk', card: 'A hawk circles overhead', hint: 'A hawk is circling…',
        tip: 'When the red ring locks on, slip under the cabbages: the hawk can\'t see you there.',
        coach: { mouse: 'A hawk! Get out of the red ring, or hide under the cabbages', touch: 'A hawk! Get out of the red ring, or hide under the cabbages' },
      },
    },
    hen: {
      make: (id, _def, level, i) => {
        const nests = level.nests ?? [];
        const home = nests.length
          ? { x: nests.reduce((s, n) => s + n.x, 0) / nests.length + i * 30, y: nests.reduce((s, n) => s + n.y, 0) / nests.length + 40 }
          : { x: BOARD.w / 2, y: BOARD.h / 2 };
        return new Hen(id, home);
      },
      text: { name: 'A hen guarding her eggs', card: 'The hen guards her eggs', hint: 'The hen is watching her eggs', tip: 'Strike at the hen to send her flapping, then take an egg while she\'s away.' },
    },
  },
  bosses: {
    tomcat: {
      make: (id, def) => new Tomcat(id, def.hp, BOARD.w, BOARD.h),
      text: {
        name: 'the Old Tomcat', card: 'Boss: the Old Tomcat', hint: 'The Old Tomcat is hunting you!',
        tip: 'Watch for the cat\'s wiggle: slip sideways out of its lane, then strike it while it\'s off balance.',
        coach: { mouse: 'Dodge the pounce, then strike the cat while it\'s off balance', touch: 'Dodge the pounce, then tap to strike the cat while it\'s off balance' },
      },
    },
  },
  hurts: {
    knot: { title: 'All in knots…', word: 'Knotted!' },
    snatched: { title: 'Snatched…', word: 'Snatched!' },
    pounced: { title: 'Pounced on…', word: 'Pounced!' },
    pecked: { title: 'Pecked…', word: 'Pecked!' },
  },
};
