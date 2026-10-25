import type { CoverDef, LevelDef, SolidDef, ZoneDef } from './types';

/**
 * Chapter 8, The Heath (full game): the European adder on heather moor
 * with granite boulders and a dry-stone wall. Cold-blooded: its warmth is
 * its speed, and it warms in sun patches that clouds drift over (taught on
 * level 3; level 1 starts on a cold spring morning). New: wood mice,
 * common lizards, field voles (struck with venom), a buzzard, a hedgehog,
 * a heron at the pool, and the Badger digging between its setts.
 * Served to owners only (content/paid.ts): never import it from client code.
 */

const boulder = (x: number, y: number, r = 24): SolidDef => ({ kind: 'circle', look: 'boulder', x, y, r });
const wall = (x: number, y: number, w = 180, h = 22): SolidDef => ({ kind: 'rect', look: 'wall', x, y, w, h });
const heather = (x: number, y: number, r = 50): CoverDef => ({ look: 'heather', x, y, r });
const gorse = (x: number, y: number, r = 44): CoverDef => ({ look: 'gorse', x, y, r });
/** Sunny ground when the sky is clear (clouds drift over it from level 3). */
const sun = (x: number, y: number, r = 85): ZoneDef => ({ kind: 'sun', shape: 'circle', x, y, r });
/** A patch no cloud ever covers (before the clouds are taught). */
const clear = (x: number, y: number, r = 85): ZoneDef => ({ kind: 'sun', look: 'clear', shape: 'circle', x, y, r });
/** At night: a stone that still holds the day's warmth. */
const stone = (x: number, y: number, r = 60): ZoneDef => ({ kind: 'sun', look: 'warmstone', shape: 'circle', x, y, r });
const pool = (x: number, y: number, r = 72): ZoneDef => ({ kind: 'water', look: 'pool', shape: 'circle', x, y, r });

export const CHAPTER_8: readonly LevelDef[] = [
  {
    id: 'heath-1', name: 'Spring Morning', snake: 'adder', start: { x: 200, y: 290 }, heading: 0, length: 120, target: 320, par: 50,
    prey: [{ kind: 'woodmouse', count: 4 }, { kind: 'common-lizard', count: 1 }],
    zones: [clear(330, 290, 95), clear(700, 150, 90), clear(720, 410, 85)],
    solids: [boulder(500, 110), boulder(540, 440, 26), wall(80, 470, 170)],
    cover: [heather(110, 90)],
    teach: ['adder-cold', 'adder-bask'],
  },
  {
    id: 'heath-2', name: 'Buzzard Weather', snake: 'adder', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 380, par: 70,
    prey: [{ kind: 'woodmouse', count: 4 }, { kind: 'common-lizard', count: 1 }],
    enemies: [{ kind: 'buzzard', from: 6 }],
    zones: [clear(420, 160, 90), clear(640, 400, 90), clear(820, 200, 80)],
    solids: [boulder(560, 250), boulder(300, 440, 22), wall(700, 60, 160)],
    cover: [heather(260, 140), heather(480, 400, 48), gorse(820, 450), heather(860, 90, 46)],
  },
  {
    id: 'heath-3', name: 'Passing Clouds', snake: 'adder', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 400, par: 70,
    prey: [{ kind: 'woodmouse', count: 4 }, { kind: 'common-lizard', count: 2 }],
    zones: [sun(380, 150, 90), sun(620, 380, 95), sun(820, 150, 85), sun(200, 430, 80)],
    solids: [boulder(500, 270, 26), boulder(760, 290), wall(560, 40, 150)],
    cover: [heather(100, 80, 46), gorse(880, 460)],
    teach: ['adder-clouds', 'adder-bask'],
  },
  {
    id: 'heath-4', name: 'Hedgehog Hour', snake: 'adder', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 400, par: 80,
    prey: [{ kind: 'woodmouse', count: 3 }, { kind: 'vole', count: 1 }, { kind: 'common-lizard', count: 1 }],
    enemies: [{ kind: 'hedgehog', from: 7 }],
    zones: [sun(400, 140, 90), sun(660, 400, 95), sun(820, 160, 85), sun(220, 440, 80)],
    solids: [boulder(540, 260, 26), wall(700, 270, 22, 120), boulder(320, 330, 20)],
    cover: [heather(110, 90, 46), heather(860, 460, 46)],
    teach: ['venom'],
  },
  {
    id: 'heath-5', name: 'Heather Rush', snake: 'adder', start: { x: 480, y: 290 }, heading: -Math.PI / 2, length: 140, target: 440, par: 55,
    prey: [{ kind: 'woodmouse', count: 7 }, { kind: 'common-lizard', count: 2 }],
    goal: { kind: 'rush', seconds: 60 },
    zones: [sun(480, 270, 110), sun(180, 140, 85), sun(780, 140, 85), sun(180, 420, 85), sun(780, 420, 85)],
    solids: [boulder(300, 270, 22), boulder(660, 270, 22)],
    cover: [heather(480, 80, 44), heather(480, 470, 44)],
  },
  {
    id: 'heath-6', name: 'Vole Runs', snake: 'adder', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 420, par: 75,
    prey: [{ kind: 'vole', count: 2 }, { kind: 'woodmouse', count: 2 }],
    goal: { kind: 'feast', food: 'vole', count: 4 },
    enemies: [{ kind: 'buzzard', from: 10 }],
    zones: [sun(420, 150, 90), sun(660, 390, 95), sun(840, 150, 85), sun(180, 440, 80)],
    solids: [wall(480, 270, 200, 22), boulder(780, 300, 24), boulder(300, 120, 22)],
    cover: [heather(560, 120, 46), gorse(330, 420), heather(880, 460, 44)],
  },
  {
    id: 'heath-7', name: 'One Cold Bite', snake: 'adder', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 420, par: 95,
    prey: [{ kind: 'woodmouse', count: 4 }, { kind: 'common-lizard', count: 1 }],
    enemies: [{ kind: 'buzzard', from: 6 }, { kind: 'hedgehog', from: 12 }],
    lives: 1,
    zones: [sun(400, 160, 90), sun(640, 400, 95), sun(820, 170, 85), sun(220, 440, 80)],
    solids: [boulder(560, 250, 26), boulder(760, 420, 22), wall(620, 50, 140)],
    cover: [heather(300, 160, 48), heather(480, 420, 48), gorse(860, 300), heather(120, 90, 44)],
    teach: ['knot'],
  },
  {
    id: 'heath-8', name: 'Heron Pool', snake: 'adder', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 480, par: 65,
    prey: [{ kind: 'woodmouse', count: 3 }, { kind: 'frog', count: 2 }, { kind: 'vole', count: 1 }],
    enemies: [{ kind: 'heron', from: 5 }, { kind: 'buzzard', from: 12 }],
    zones: [pool(600, 270, 75), sun(380, 130, 90), sun(820, 120, 85), sun(380, 430, 85), sun(840, 430, 80)],
    solids: [boulder(480, 280, 22), boulder(740, 280, 24), wall(80, 470, 160)],
    cover: [heather(220, 110, 48), heather(620, 470, 46), gorse(900, 280, 40)],
  },
  {
    id: 'heath-9', name: 'Moor at Night', snake: 'adder', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 440, par: 80,
    prey: [{ kind: 'woodmouse', count: 5 }, { kind: 'frog', count: 2 }],
    enemies: [{ kind: 'hedgehog', from: 10 }],
    dark: true,
    zones: [stone(420, 140, 70), stone(700, 400, 70), stone(820, 140, 65), stone(240, 430, 65)],
    solids: [boulder(420, 140, 26), boulder(700, 400, 26), boulder(820, 140, 22), boulder(240, 430, 22), wall(560, 250, 22, 120)],
    teach: ['dark', 'adder-night'],
  },
  {
    id: 'heath-10', name: 'The Badger', snake: 'adder', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 460, par: 50,
    prey: [{ kind: 'woodmouse', count: 4 }, { kind: 'common-lizard', count: 1 }],
    goal: { kind: 'boss' },
    boss: { kind: 'badger', hp: 4 },
    spots: [{ x: 400, y: 150 }, { x: 760, y: 140 }, { x: 560, y: 300 }, { x: 330, y: 420 }, { x: 800, y: 420 }],
    zones: [sun(560, 290, 110), sun(330, 420, 85), sun(760, 140, 80), sun(160, 140, 80)],
    solids: [boulder(480, 80, 22), boulder(660, 420, 24), wall(880, 240, 22, 110)],
    cover: [heather(120, 440, 46), gorse(620, 160, 40)],
    teach: ['badger-plan'],
  },
];
