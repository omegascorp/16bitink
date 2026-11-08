import type { Pt } from '../logic/vec';
import type { CoverDef, LevelDef, SolidDef, ZoneDef } from './types';

/**
 * Chapter 6, The Reef (full game): the banded sea krait in a coral reef
 * with sand cays. New: breath (it swims fast underwater but must come up
 * on a cay to breathe; taught on level 3), gobies, conger and moray eels
 * that hide in coral holes (the level's `spots`), box jellies, the
 * white-bellied sea eagle over the cays and shallows, and the Tiger Shark.
 * Served to owners only (content/paid.ts): never import it from client code.
 */

type Circle = Extract<SolidDef, { kind: 'circle' }>;

/** The sea over the whole board: the cays are islands in it. */
const SEA: ZoneDef = { kind: 'water', look: 'reef', shape: 'rect', x: -40, y: -40, w: 1040, h: 620 };
/** A sand cay (land: slow, but breathe) and the shallows round it (where the sea eagle can strike). */
const cay = (x: number, y: number, r: number): readonly ZoneDef[] => [
  { kind: 'sand', look: 'shallows', shape: 'circle', x, y, r: r + 36 },
  { kind: 'land', look: 'cay', shape: 'circle', x, y, r },
];
const coral = (x: number, y: number, r = 24): Circle => ({ kind: 'circle', look: 'coral', x, y, r });
const rock = (x: number, y: number, r = 16): Circle => ({ kind: 'circle', look: 'rock', x, y, r });
const seagrass = (x: number, y: number, r = 46): CoverDef => ({ look: 'seagrass', x, y, r });
const fan = (x: number, y: number, r = 34): CoverDef => ({ look: 'coral-fan', x, y, r });
/** Eel holes in a coral head's side, at these angles (radians, 0 is +x). */
const holes = (c: Circle, ...angles: number[]): Pt[] => angles.map((a) => ({ x: Math.round(c.x + Math.cos(a) * (c.r + 15)), y: Math.round(c.y + Math.sin(a) * (c.r + 15)) }));

const PI = Math.PI;
const UP = -PI / 2;
const DOWN = PI / 2;

const L1 = { a: coral(480, 160, 26), b: coral(580, 400, 24), c: coral(840, 380, 22) };
const L2 = { a: coral(420, 140, 24), b: coral(640, 330, 28), c: coral(330, 300, 20) };
const L3 = { a: coral(330, 300, 26), b: coral(490, 190, 30), c: coral(620, 380, 26), d: coral(720, 170, 22) };
const L4 = { a: coral(420, 300, 26), b: coral(650, 230, 24), c: coral(860, 260, 20) };
const L5 = { a: coral(200, 120), b: coral(760, 120), c: coral(200, 420), d: coral(760, 420) };
const L6 = { a: coral(330, 180, 28), b: coral(560, 330, 30), c: coral(700, 160, 24) };
const L7 = { a: coral(480, 120, 26), b: coral(480, 420, 26) };
const L8 = { a: coral(350, 160, 26), b: coral(600, 390, 28), c: coral(640, 150, 22) };
const L9 = { a: coral(420, 160, 26), b: coral(560, 380, 26), c: coral(780, 250, 22) };
const L10 = { a: coral(300, 120, 22), b: coral(720, 440, 22) };

export const CHAPTER_6: readonly LevelDef[] = [
  {
    id: 'reef-1', name: 'Sand Cay', snake: 'krait', start: { x: 210, y: 280 }, heading: 0, length: 130, target: 340, par: 34,
    prey: [{ kind: 'goby', count: 3 }, { kind: 'conger', count: 2 }],
    zones: [SEA, ...cay(210, 280, 72), ...cay(780, 150, 48)],
    solids: [L1.a, L1.b, L1.c, rock(190, 300, 12)],
    cover: [seagrass(380, 450)],
    spots: [...holes(L1.a, DOWN), ...holes(L1.b, UP), ...holes(L1.c, PI)],
    teach: ['breath'],
  },
  {
    id: 'reef-2', name: 'Box Jellies', snake: 'krait', start: { x: 190, y: 400 }, heading: 0, length: 130, target: 380, par: 36,
    prey: [{ kind: 'goby', count: 3 }, { kind: 'conger', count: 2 }],
    enemies: [{ kind: 'jelly', count: 2 }],
    zones: [SEA, ...cay(190, 400, 66), ...cay(790, 130, 56)],
    solids: [L2.a, L2.b, L2.c],
    cover: [fan(560, 470)],
    spots: [...holes(L2.b, PI, 0), ...holes(L2.a, DOWN)],
  },
  {
    id: 'reef-3', name: 'Long Dive', snake: 'krait', start: { x: 175, y: 100 }, heading: 0, length: 140, target: 400, par: 42,
    prey: [{ kind: 'conger', count: 3 }, { kind: 'goby', count: 2 }],
    zones: [SEA, ...cay(80, 80, 54), ...cay(880, 460, 54)],
    solids: [L3.a, L3.b, L3.c, L3.d],
    cover: [seagrass(180, 440, 44)],
    spots: [...holes(L3.a, PI * 0.8, -PI * 0.2), ...holes(L3.b, DOWN, PI), ...holes(L3.c, UP, 0), ...holes(L3.d, DOWN)],
    teach: ['eelholes'],
  },
  {
    id: 'reef-4', name: 'Sea Eagle', snake: 'krait', start: { x: 230, y: 160 }, heading: 0, length: 140, target: 420, par: 50,
    prey: [{ kind: 'goby', count: 3 }, { kind: 'conger', count: 2 }],
    enemies: [{ kind: 'sea-eagle', from: 5 }],
    zones: [SEA, ...cay(200, 150, 66), ...cay(720, 410, 66), ...cay(560, 110, 40)],
    solids: [L4.a, L4.b, L4.c, rock(700, 390, 14)],
    cover: [seagrass(300, 430, 50), seagrass(840, 130, 44)],
    spots: [...holes(L4.a, UP, PI), ...holes(L4.b, DOWN), ...holes(L4.c, PI)],
  },
  {
    id: 'reef-5', name: 'Goby Rush', snake: 'krait', start: { x: 480, y: 200 }, heading: UP, length: 140, target: 460, par: 50,
    prey: [{ kind: 'goby', count: 7 }, { kind: 'conger', count: 2 }],
    goal: { kind: 'rush', seconds: 60 },
    zones: [SEA, ...cay(480, 300, 64)],
    solids: [L5.a, L5.b, L5.c, L5.d],
    spots: [...holes(L5.a, 0), ...holes(L5.d, PI)],
  },
  {
    id: 'reef-6', name: 'Eel Garden', snake: 'krait', start: { x: 190, y: 440 }, heading: 0, length: 140, target: 420, par: 58,
    prey: [{ kind: 'conger', count: 3 }, { kind: 'moray', count: 1 }, { kind: 'goby', count: 1 }],
    goal: { kind: 'feast', food: 'conger', count: 5 },
    enemies: [{ kind: 'jelly' }],
    zones: [SEA, ...cay(120, 440, 60), ...cay(860, 90, 56)],
    solids: [L6.a, L6.b, L6.c],
    cover: [fan(820, 450)],
    spots: [...holes(L6.a, 0, DOWN, PI), ...holes(L6.b, UP, PI, 0), ...holes(L6.c, DOWN)],
    teach: ['venom'],
  },
  {
    id: 'reef-7', name: 'One Breath', snake: 'krait', start: { x: 230, y: 270 }, heading: 0, length: 150, target: 480, par: 65,
    prey: [{ kind: 'goby', count: 3 }, { kind: 'conger', count: 2 }],
    enemies: [{ kind: 'jelly', count: 2 }, { kind: 'sea-eagle', from: 9 }],
    lives: 1,
    zones: [SEA, ...cay(230, 270, 64), ...cay(740, 270, 64)],
    solids: [L7.a, L7.b],
    cover: [seagrass(740, 110, 44), seagrass(230, 450, 44)],
    spots: [...holes(L7.a, DOWN, PI), ...holes(L7.b, UP, 0)],
    teach: ['knot'],
  },
  {
    id: 'reef-8', name: 'Rip Tide', snake: 'krait', start: { x: 200, y: 400 }, heading: 0, length: 150, target: 520, par: 82,
    prey: [{ kind: 'moray', count: 2 }, { kind: 'conger', count: 1 }, { kind: 'goby', count: 3 }],
    enemies: [{ kind: 'sea-eagle', from: 6 }, { kind: 'jelly', count: 2 }],
    zones: [SEA, ...cay(170, 400, 62), ...cay(800, 140, 60)],
    solids: [L8.a, L8.b, L8.c],
    cover: [seagrass(420, 470, 46), fan(880, 300, 34)],
    spots: [...holes(L8.a, DOWN, 0), ...holes(L8.b, UP, PI), ...holes(L8.c, DOWN)],
  },
  {
    id: 'reef-9', name: 'Glowing Water', snake: 'krait', start: { x: 210, y: 270 }, heading: 0, length: 150, target: 500, par: 52,
    prey: [{ kind: 'conger', count: 3 }, { kind: 'goby', count: 3 }],
    enemies: [{ kind: 'jelly' }],
    dark: true,
    zones: [SEA, ...cay(200, 270, 66), ...cay(780, 440, 52)],
    solids: [L9.a, L9.b, L9.c],
    spots: [...holes(L9.a, DOWN, PI), ...holes(L9.b, UP), ...holes(L9.c, PI)],
    teach: ['reefnight'],
  },
  {
    id: 'reef-10', name: 'The Tiger Shark', snake: 'krait', start: { x: 240, y: 300 }, heading: 0, length: 160, target: 460, par: 72,
    prey: [{ kind: 'goby', count: 3 }, { kind: 'conger', count: 1 }],
    goal: { kind: 'boss' },
    boss: { kind: 'shark', hp: 3 },
    zones: [SEA, ...cay(500, 290, 66), ...cay(140, 100, 44), ...cay(840, 110, 44)],
    solids: [L10.a, L10.b],
    cover: [seagrass(160, 460, 44)],
    spots: [...holes(L10.a, DOWN), ...holes(L10.b, UP)],
    teach: ['sharkplan'],
  },
];
