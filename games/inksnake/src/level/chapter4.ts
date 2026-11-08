import type { Pt } from '../logic/vec';
import type { LevelDef, SolidDef, ZoneDef } from './types';

/**
 * Chapter 4, The Savanna (full game): the African egg-eater in tall grass
 * under flat-topped acacias. New: eating only eggs (weavers' small ones in
 * nests hanging from the acacias' branch tips, guineafowl's big ones in the
 * grass), the rasp (level 3), banded mongooses, weavers mobbing their
 * nests, a wildebeest stampede, and the Secretary Bird.
 * Served to owners only (content/paid.ts): never import it from client code.
 */

const acacia = (x: number, y: number, r = 15): SolidDef => ({ kind: 'circle', look: 'acacia', x, y, r });
const termite = (x: number, y: number, r = 24): SolidDef => ({ kind: 'circle', look: 'termite', x, y, r });
const rock = (x: number, y: number, r = 20): SolidDef => ({ kind: 'circle', look: 'rock', x, y, r });
const grass = (x: number, y: number, r = 90): ZoneDef => ({ kind: 'grass', look: 'tall-grass', shape: 'circle', x, y, r });
/** Two weavers' nests hanging at an acacia's branch tips, either side of its trunk. */
const nestsAt = (x: number, y: number): Pt[] => [{ x: x - 64, y: y - 30 }, { x: x + 62, y: y + 34 }];

export const CHAPTER_4: readonly LevelDef[] = [
  {
    id: 'savanna-1', name: 'Weaver Tree', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 120, target: 340, par: 26,
    prey: [{ kind: 'weaver-egg', count: 4 }],
    solids: [acacia(440, 140), acacia(720, 390), acacia(790, 140), termite(560, 300)],
    nests: [...nestsAt(440, 140), ...nestsAt(720, 390), ...nestsAt(790, 140)],
    zones: [grass(130, 460, 80)],
    teach: ['eggsonly'],
  },
  {
    id: 'savanna-2', name: 'Banded Pack', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 380, par: 32,
    prey: [{ kind: 'weaver-egg', count: 4 }],
    enemies: [{ kind: 'banded-mongoose', count: 3, from: 6 }],
    solids: [acacia(330, 110), acacia(690, 130), acacia(620, 430), rock(840, 300)],
    nests: [...nestsAt(330, 110), ...nestsAt(690, 130), ...nestsAt(620, 430)],
    zones: [grass(480, 300, 100), grass(860, 460, 90), grass(110, 90, 80)],
    teach: ['tallgrass'],
  },
  {
    id: 'savanna-3', name: 'Saw-Scale Bluff', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 400, par: 36,
    prey: [{ kind: 'weaver-egg', count: 4 }],
    enemies: [{ kind: 'banded-mongoose', count: 3, from: 4 }],
    solids: [acacia(420, 120), acacia(520, 420), acacia(800, 260), termite(300, 430, 22)],
    nests: [...nestsAt(420, 120), ...nestsAt(520, 420), ...nestsAt(800, 260)],
    zones: [grass(660, 120, 85)],
    teach: ['rasp'],
  },
  {
    id: 'savanna-4', name: 'Weaver Colony', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 420, par: 32,
    prey: [{ kind: 'weaver-egg', count: 5 }],
    enemies: [{ kind: 'weaver', count: 3, from: 2 }, { kind: 'banded-mongoose', count: 2, from: 16 }],
    solids: [acacia(400, 130), acacia(660, 120), acacia(540, 400), acacia(820, 330), termite(250, 450, 22)],
    nests: [...nestsAt(400, 130), ...nestsAt(660, 120), ...nestsAt(540, 400), ...nestsAt(820, 330)],
    zones: [grass(120, 100, 80), grass(860, 80, 70)],
    teach: ['bluff'],
  },
  {
    id: 'savanna-5', name: 'Nest Raid', snake: 'eggeater', start: { x: 480, y: 280 }, heading: -Math.PI / 2, length: 140, target: 460, par: 30,
    prey: [{ kind: 'weaver-egg', count: 7 }, { kind: 'guinea-egg', count: 1 }],
    goal: { kind: 'rush', seconds: 50 },
    solids: [acacia(220, 130), acacia(740, 130), acacia(220, 410), acacia(740, 410)],
    nests: [...nestsAt(220, 130), ...nestsAt(740, 130), ...nestsAt(220, 410), ...nestsAt(740, 410)],
    zones: [grass(480, 470, 90), grass(480, 70, 80)],
  },
  {
    id: 'savanna-6', name: 'Guineafowl Grass', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 440, par: 30,
    prey: [{ kind: 'guinea-egg', count: 2 }, { kind: 'weaver-egg', count: 3 }],
    goal: { kind: 'feast', food: 'guinea-egg', count: 4 },
    enemies: [{ kind: 'wildebeest', from: 9 }],
    solids: [acacia(420, 110), acacia(800, 400), termite(620, 260, 26), rock(260, 450)],
    nests: [...nestsAt(420, 110), ...nestsAt(800, 400)],
    zones: [grass(470, 390, 110), grass(780, 130, 105), grass(120, 110, 80)],
    teach: ['bigegg'],
  },
  {
    id: 'savanna-7', name: 'One Rasp', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 470, par: 26,
    prey: [{ kind: 'weaver-egg', count: 4 }, { kind: 'guinea-egg', count: 1 }],
    enemies: [{ kind: 'banded-mongoose', count: 2, from: 6 }, { kind: 'weaver', count: 2, from: 10 }],
    lives: 1,
    solids: [acacia(420, 130), acacia(450, 420), acacia(760, 260, 16), termite(620, 100, 22), rock(860, 460)],
    nests: [...nestsAt(420, 130), ...nestsAt(450, 420), ...nestsAt(760, 260)],
    zones: [grass(620, 420, 90), grass(110, 90, 80)],
    teach: ['knot'],
  },
  {
    id: 'savanna-8', name: 'Thunder of Hooves', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 520, par: 44,
    prey: [{ kind: 'weaver-egg', count: 4 }, { kind: 'guinea-egg', count: 1 }],
    enemies: [{ kind: 'wildebeest', from: 9 }, { kind: 'banded-mongoose', count: 3, from: 6 }],
    solids: [acacia(380, 120), acacia(640, 120), acacia(500, 420), termite(820, 300, 24)],
    nests: [...nestsAt(380, 120), ...nestsAt(640, 120), ...nestsAt(500, 420)],
    zones: [grass(150, 440, 90), grass(820, 110, 90), grass(760, 460, 80)],
  },
  {
    id: 'savanna-9', name: 'Savanna Moon', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 500, par: 26,
    prey: [{ kind: 'weaver-egg', count: 5 }, { kind: 'guinea-egg', count: 1 }],
    dark: true,
    solids: [acacia(380, 130), acacia(420, 420), acacia(680, 260, 16), termite(840, 110, 22), rock(820, 440)],
    nests: [...nestsAt(380, 130), ...nestsAt(420, 420), ...nestsAt(680, 260)],
    zones: [grass(600, 470, 85), grass(860, 280, 70)],
    teach: ['savannanight'],
  },
  {
    id: 'savanna-10', name: 'The Secretary Bird', snake: 'eggeater', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 460, par: 42,
    prey: [{ kind: 'weaver-egg', count: 3 }],
    goal: { kind: 'boss' },
    boss: { kind: 'secretary-bird', hp: 4 },
    solids: [acacia(440, 110), acacia(700, 430), termite(820, 190, 22)],
    nests: [...nestsAt(440, 110), ...nestsAt(700, 430)],
    zones: [grass(300, 430, 90), grass(620, 230, 80)],
    teach: ['secretary'],
  },
];
