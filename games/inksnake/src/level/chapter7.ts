import type { CoverDef, LevelDef, SolidDef, ZoneDef } from './types';

/**
 * Chapter 7, The Mountains (full game): the spider-tailed horned viper in
 * the limestone crags of the western Zagros. New: the lure (level 3), birds
 * that fly off when they see you (larks, warblers, desert finches, the
 * Isabelline shrike to put to sleep with venom), rock agamas, the
 * short-toed snake eagle, rockfall, and the Wild Boar.
 * Served to owners only (content/paid.ts): never import it from client code.
 */

const crag = (x: number, y: number, w: number, h: number): SolidDef => ({ kind: 'rect', look: 'crag', x, y, w, h });
const outcrop = (x: number, y: number, r = 30): SolidDef => ({ kind: 'circle', look: 'crag', x, y, r });
const boulder = (x: number, y: number, r = 18): SolidDef => ({ kind: 'circle', look: 'boulder', x, y, r });
const crevice = (x: number, y: number, r = 42): CoverDef => ({ look: 'crevice', x, y, r });
const thyme = (x: number, y: number, r = 36): CoverDef => ({ look: 'thyme', x, y, r });
/** Loose scree: it slips under the snake (a little slower). */
const scree = (x: number, y: number, w: number, h: number): ZoneDef => ({ kind: 'sand', look: 'scree', shape: 'rect', x, y, w, h });

export const CHAPTER_7: readonly LevelDef[] = [
  {
    id: 'mountains-1', name: 'Limestone Ledge', snake: 'spidertail', start: { x: 200, y: 280 }, heading: 0, length: 120, target: 320, par: 40,
    prey: [{ kind: 'agama', count: 4 }, { kind: 'lark', count: 1 }],
    solids: [crag(400, 70, 120, 50), boulder(700, 400, 20), boulder(820, 150), outcrop(560, 430, 28)],
    cover: [crevice(110, 90), thyme(860, 460)],
    teach: ['stalk'],
  },
  {
    id: 'mountains-2', name: 'Eagle Shadow', snake: 'spidertail', start: { x: 200, y: 280 }, heading: 0, length: 125, target: 360, par: 46,
    prey: [{ kind: 'agama', count: 4 }, { kind: 'warbler', count: 1 }],
    enemies: [{ kind: 'snake-eagle', from: 4 }],
    solids: [crag(430, 230, 90, 70), boulder(300, 110), boulder(720, 120, 20), outcrop(760, 420, 30)],
    cover: [crevice(130, 450), crevice(600, 90, 40), crevice(860, 290, 40), thyme(420, 460)],
  },
  {
    id: 'mountains-3', name: 'The Spider\'s Tail', snake: 'spidertail', start: { x: 240, y: 270 }, heading: 0, length: 130, target: 380, par: 50,
    prey: [{ kind: 'agama', count: 1 }, { kind: 'lark', count: 1 }, { kind: 'warbler', count: 1 }],
    solids: [boulder(120, 100), boulder(840, 440, 20), crag(760, 60, 110, 44), outcrop(170, 450, 26)],
    cover: [thyme(520, 470, 34)],
    teach: ['lure', 'lurestrike'],
  },
  {
    id: 'mountains-4', name: 'Loose Rock', snake: 'spidertail', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 400, par: 52,
    prey: [{ kind: 'agama', count: 3 }, { kind: 'desert-finch', count: 1 }, { kind: 'warbler', count: 1 }],
    enemies: [{ kind: 'rockfall', from: 7 }],
    solids: [crag(380, 60, 100, 50), boulder(620, 300, 20), outcrop(820, 120, 28), boulder(480, 440)],
    cover: [crevice(860, 450, 40), thyme(120, 90)],
    zones: [scree(560, 0, 140, 160)],
  },
  {
    id: 'mountains-5', name: 'Migration', snake: 'spidertail', start: { x: 480, y: 290 }, heading: -Math.PI / 2, length: 130, target: 440, par: 46,
    prey: [{ kind: 'agama', count: 5 }, { kind: 'lark', count: 2 }, { kind: 'warbler', count: 2 }],
    goal: { kind: 'rush', seconds: 60 },
    solids: [boulder(200, 120), boulder(760, 120), boulder(200, 420), boulder(760, 420)],
    cover: [thyme(480, 470, 32)],
  },
  {
    id: 'mountains-6', name: 'Lark Song', snake: 'spidertail', start: { x: 220, y: 280 }, heading: 0, length: 135, target: 420, par: 60,
    prey: [{ kind: 'agama', count: 2 }, { kind: 'lark', count: 1 }],
    goal: { kind: 'feast', food: 'lark', count: 5 },
    solids: [crag(430, 60, 110, 46), boulder(700, 440, 20), outcrop(820, 200, 28), boulder(140, 450)],
    cover: [thyme(560, 470, 34), crevice(880, 70, 38)],
    teach: ['larks'],
  },
  {
    id: 'mountains-7', name: 'One Slip', snake: 'spidertail', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 440, par: 62,
    prey: [{ kind: 'agama', count: 3 }, { kind: 'warbler', count: 1 }, { kind: 'lark', count: 1 }],
    enemies: [{ kind: 'snake-eagle', from: 6 }, { kind: 'rockfall', from: 12 }],
    lives: 1,
    solids: [crag(440, 220, 80, 90), boulder(320, 90), boulder(700, 110, 20), outcrop(780, 430, 28)],
    cover: [crevice(130, 460, 40), crevice(620, 460, 40), crevice(860, 260, 40), thyme(560, 80)],
    teach: ['knot', 'crevice'],
  },
  {
    id: 'mountains-8', name: 'Shrike Season', snake: 'spidertail', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 480, par: 70,
    prey: [{ kind: 'agama', count: 2 }, { kind: 'shrike', count: 1 }, { kind: 'desert-finch', count: 1 }],
    enemies: [{ kind: 'snake-eagle', from: 7 }, { kind: 'rockfall', from: 10 }],
    solids: [crag(400, 70, 110, 44), boulder(640, 300, 20), outcrop(800, 110, 26), boulder(420, 450)],
    cover: [crevice(120, 90, 40), crevice(860, 450, 40), thyme(600, 470, 34)],
    zones: [scree(620, 0, 120, 170)],
    teach: ['venom'],
  },
  {
    id: 'mountains-9', name: 'Starlit Scree', snake: 'spidertail', start: { x: 200, y: 280 }, heading: 0, length: 145, target: 460, par: 66,
    prey: [{ kind: 'agama', count: 3 }, { kind: 'lark', count: 1 }, { kind: 'warbler', count: 1 }],
    dark: true,
    solids: [crag(420, 80, 100, 46), boulder(440, 430), outcrop(700, 270, 28), boulder(840, 120), boulder(820, 450, 20)],
    cover: [crevice(110, 460, 40)],
    zones: [scree(560, 360, 180, 180)],
    teach: ['nightrock'],
  },
  {
    id: 'mountains-10', name: 'The Wild Boar', snake: 'spidertail', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 400, par: 80,
    prey: [{ kind: 'agama', count: 3 }, { kind: 'lark', count: 1 }],
    goal: { kind: 'boss' },
    boss: { kind: 'boar', hp: 3 },
    solids: [boulder(420, 130, 24), outcrop(560, 400, 32), crag(700, 180, 70, 60), boulder(300, 430, 22), boulder(860, 400, 24), boulder(120, 110, 20)],
    cover: [crevice(480, 270, 38), thyme(860, 90)],
    teach: ['boarplan'],
  },
];
