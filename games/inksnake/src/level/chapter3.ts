import type { CoverDef, LevelDef, SolidDef, ZoneDef } from './types';

/**
 * Chapter 3, The Dunes (full game): the sidewinder on the loose sand of the
 * Mojave. New: burying in the sand (level 3), venom for kangaroo rats too
 * big to swallow, coyotes, a kingsnake, a red-tailed hawk, dust devils,
 * the night (a pit viper feels prey's warmth), and the Roadrunner.
 * Served to owners only (content/paid.ts): never import it from client code.
 *
 * Ground: dunes of loose sand (zone 'sand': burying works there, and the
 * sidewinder keeps its full speed) with flats of desert gravel between
 * (no zone: slower going, and nowhere to bury).
 */

const dune = (x: number, y: number, r: number): ZoneDef => ({ kind: 'sand', look: 'dune', shape: 'circle', x, y, r });
const creosote = (x: number, y: number, r = 16): SolidDef => ({ kind: 'circle', look: 'creosote', x, y, r });
const rock = (x: number, y: number, w = 96, h = 44): SolidDef => ({ kind: 'rect', look: 'rock', x, y, w, h });
const boulder = (x: number, y: number, r = 22): SolidDef => ({ kind: 'circle', look: 'boulder', x, y, r });
const yucca = (x: number, y: number, r = 12): SolidDef => ({ kind: 'circle', look: 'yucca', x, y, r });
const brush = (x: number, y: number, r = 46): CoverDef => ({ look: 'brush', x, y, r });

export const CHAPTER_3: readonly LevelDef[] = [
  {
    id: 'dunes-1', name: 'Sidewinder Tracks', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 340, par: 50,
    prey: [{ kind: 'pocket-mouse', count: 3 }, { kind: 'side-lizard', count: 2 }, { kind: 'kangaroo-rat', count: 1 }],
    zones: [dune(230, 270, 320), dune(780, 300, 300)],
    solids: [creosote(430, 110), creosote(640, 420, 18), rock(760, 80), yucca(860, 330)],
    cover: [brush(110, 90)],
    teach: ['venom', 'krats'],
  },
  {
    id: 'dunes-2', name: 'Coyote Hour', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 340, par: 80,
    prey: [{ kind: 'side-lizard', count: 3 }, { kind: 'pocket-mouse', count: 3 }],
    enemies: [{ kind: 'coyote', from: 5 }],
    zones: [dune(220, 300, 290), dune(740, 220, 290)],
    solids: [creosote(380, 100), creosote(600, 310, 18), rock(740, 420, 100, 46), yucca(840, 130)],
    cover: [brush(880, 460), brush(460, 455)],
  },
  {
    id: 'dunes-3', name: 'Cratering', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 400, par: 60,
    prey: [{ kind: 'kangaroo-rat', count: 2 }, { kind: 'pocket-mouse', count: 2 }, { kind: 'side-lizard', count: 1 }],
    enemies: [{ kind: 'coyote', from: 6 }],
    zones: [dune(480, 270, 520)],
    solids: [creosote(470, 120), creosote(520, 430, 18), boulder(760, 270), yucca(300, 110)],
    cover: [brush(860, 90, 44)],
    teach: ['bury', 'ambush'],
  },
  {
    id: 'dunes-4', name: 'The Kingsnake', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 400, par: 90,
    prey: [{ kind: 'side-lizard', count: 3 }, { kind: 'pocket-mouse', count: 2 }, { kind: 'kangaroo-rat', count: 1 }],
    enemies: [{ kind: 'kingsnake', from: 4 }],
    zones: [dune(250, 220, 310), dune(730, 350, 320)],
    solids: [rock(420, 70, 110, 44), creosote(610, 170), boulder(470, 420, 24), yucca(850, 120)],
    cover: [brush(120, 460), brush(880, 470, 44)],
  },
  {
    id: 'dunes-5', name: 'Lizard Rush', snake: 'sidewinder', start: { x: 480, y: 280 }, heading: -Math.PI / 2, length: 140, target: 440, par: 70,
    prey: [{ kind: 'side-lizard', count: 5 }, { kind: 'pocket-mouse', count: 4 }],
    goal: { kind: 'rush', seconds: 75 },
    zones: [dune(480, 270, 470)],
    solids: [creosote(200, 120), creosote(760, 120), creosote(200, 420), creosote(760, 420)],
    cover: [],
  },
  {
    id: 'dunes-6', name: 'Kangaroo Rat Flats', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 440, par: 65,
    prey: [{ kind: 'kangaroo-rat', count: 3 }, { kind: 'pocket-mouse', count: 2 }],
    goal: { kind: 'feast', food: 'kangaroo-rat', count: 4 },
    enemies: [{ kind: 'dust-devil', from: 9 }],
    zones: [dune(180, 260, 260), dune(560, 160, 240), dune(760, 420, 250)],
    solids: [creosote(420, 360), creosote(640, 300, 18), rock(780, 60, 96, 40), yucca(330, 80)],
    cover: [brush(110, 460), brush(900, 230, 42)],
  },
  {
    id: 'dunes-7', name: 'One Strike', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 420, par: 90,
    prey: [{ kind: 'side-lizard', count: 3 }, { kind: 'pocket-mouse', count: 3 }],
    enemies: [{ kind: 'coyote', count: 2, from: 4 }],
    lives: 1,
    zones: [dune(260, 280, 330), dune(760, 260, 320)],
    solids: [creosote(420, 140), creosote(440, 400), boulder(640, 270, 22), rock(760, 70, 100, 40), yucca(830, 450)],
    cover: [brush(110, 90, 44), brush(620, 470, 44)],
    teach: ['knot'],
  },
  {
    id: 'dunes-8', name: 'Hawk Shadow', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 460, par: 100,
    prey: [{ kind: 'kangaroo-rat', count: 2 }, { kind: 'side-lizard', count: 2 }, { kind: 'pocket-mouse', count: 2 }],
    enemies: [{ kind: 'redtail', from: 6 }, { kind: 'coyote', from: 11 }],
    zones: [dune(240, 250, 320), dune(720, 320, 330)],
    solids: [creosote(380, 90), creosote(620, 130, 18), rock(470, 420, 100, 44), yucca(860, 110)],
    cover: [brush(110, 460), brush(560, 280, 44), brush(880, 470, 44)],
  },
  {
    id: 'dunes-9', name: 'Warm Blood', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 480, par: 70,
    // Night: the kangaroo rats and pocket mice are out (lizards sleep), and the sidewinder hunts.
    prey: [{ kind: 'pocket-mouse', count: 4 }, { kind: 'kangaroo-rat', count: 2 }],
    dark: true,
    zones: [dune(260, 270, 330), dune(760, 270, 300)],
    solids: [creosote(400, 120), creosote(420, 420), boulder(660, 270, 22), yucca(820, 110), rock(760, 430, 96, 40)],
    teach: ['heatsense'],
  },
  {
    id: 'dunes-10', name: 'The Roadrunner', snake: 'sidewinder', start: { x: 200, y: 280 }, heading: 0, length: 160, target: 460, par: 45,
    prey: [{ kind: 'pocket-mouse', count: 3 }, { kind: 'side-lizard', count: 2 }],
    goal: { kind: 'boss' },
    boss: { kind: 'roadrunner', hp: 3 },
    zones: [dune(480, 270, 500)],
    solids: [creosote(460, 110), boulder(700, 420, 22), yucca(820, 170)],
    cover: [brush(300, 440, 46)],
    teach: ['roadrunner'],
  },
];
