import type { CoverDef, LevelDef, SolidDef } from './types';

/**
 * Chapter 2, The Pine Barrens (full game): the eastern hognose on sandy
 * ground under pitch pines. New: playing dead (level 3), toads that puff
 * up, fence lizards, raccoons, an opossum, wildfire, and the Red Fox.
 * Served to owners only (content/paid.ts): never import it from client code.
 */

const pine = (x: number, y: number, r = 15): SolidDef => ({ kind: 'circle', look: 'pine', x, y, r });
const log = (x: number, y: number, w = 120, h = 28): SolidDef => ({ kind: 'rect', look: 'log', x, y, w, h });
const stump = (x: number, y: number): SolidDef => ({ kind: 'circle', look: 'stump', x, y, r: 20 });
const blueberry = (x: number, y: number, r = 52): CoverDef => ({ look: 'blueberry', x, y, r });
const fern = (x: number, y: number, r = 48): CoverDef => ({ look: 'fern', x, y, r });

export const CHAPTER_2: readonly LevelDef[] = [
  {
    id: 'barrens-1', name: 'Sand Road', snake: 'hognose', start: { x: 200, y: 280 }, heading: 0, length: 130, target: 340, par: 32,
    prey: [{ kind: 'toad', count: 4 }, { kind: 'frog', count: 1 }],
    solids: [pine(420, 120), pine(700, 400), pine(820, 150, 17), log(560, 430)],
    cover: [blueberry(110, 90)],
    teach: ['toads'],
  },
  {
    id: 'barrens-2', name: 'Raccoon Tracks', snake: 'hognose', start: { x: 200, y: 270 }, heading: 0, length: 130, target: 380, par: 40,
    prey: [{ kind: 'toad', count: 4 }, { kind: 'frog', count: 1 }],
    enemies: [{ kind: 'raccoon', from: 4 }],
    solids: [pine(380, 90), pine(640, 300), stump(780, 120), log(260, 430, 130)],
    cover: [fern(860, 440)],
  },
  {
    id: 'barrens-3', name: 'Possum Hollow', snake: 'hognose', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 400, par: 45,
    prey: [{ kind: 'toad', count: 4 }, { kind: 'lizard', count: 1 }],
    enemies: [{ kind: 'opossum', from: 5 }],
    solids: [pine(480, 100), pine(520, 430), pine(760, 260, 17), stump(300, 110)],
    cover: [blueberry(860, 90, 48), fern(120, 450)],
    teach: ['playdead'],
  },
  {
    id: 'barrens-4', name: 'Fence Lizards', snake: 'hognose', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 420, par: 48,
    prey: [{ kind: 'lizard', count: 3 }, { kind: 'toad', count: 2 }],
    enemies: [{ kind: 'opossum', from: 6 }, { kind: 'raccoon', from: 12 }],
    solids: [log(380, 80, 140), pine(620, 200), pine(690, 420), stump(860, 300)],
    cover: [blueberry(470, 380), fern(860, 90)],
  },
  {
    id: 'barrens-5', name: 'Toad Chorus', snake: 'hognose', start: { x: 480, y: 280 }, heading: -Math.PI / 2, length: 140, target: 460, par: 42,
    prey: [{ kind: 'toad', count: 7 }, { kind: 'frog', count: 2 }],
    goal: { kind: 'rush', seconds: 55 },
    solids: [pine(200, 120), pine(760, 120), pine(200, 420), pine(760, 420)],
    cover: [],
  },
  {
    id: 'barrens-6', name: 'Smoke on the Wind', snake: 'hognose', start: { x: 200, y: 280 }, heading: 0, length: 140, target: 420, par: 50,
    prey: [{ kind: 'lizard', count: 3 }, { kind: 'toad', count: 3 }],
    goal: { kind: 'feast', food: 'lizard', count: 5 },
    enemies: [{ kind: 'wildfire', from: 8 }],
    solids: [pine(420, 110), pine(560, 420), stump(780, 240), log(700, 60, 110)],
    cover: [fern(110, 440), blueberry(860, 450, 48)],
  },
  {
    id: 'barrens-7', name: 'One Wrong Turn', snake: 'hognose', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 480, par: 55,
    prey: [{ kind: 'toad', count: 4 }, { kind: 'lizard', count: 1 }],
    enemies: [{ kind: 'raccoon', count: 2, from: 4 }],
    lives: 1,
    solids: [pine(400, 150), pine(420, 390), pine(640, 270, 18), log(760, 90, 100), stump(820, 440)],
    cover: [blueberry(120, 90, 46)],
    teach: ['knot'],
  },
  {
    id: 'barrens-8', name: 'Controlled Burn', snake: 'hognose', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 520, par: 70,
    prey: [{ kind: 'toad', count: 4 }, { kind: 'lizard', count: 2 }],
    enemies: [{ kind: 'wildfire', from: 9 }, { kind: 'opossum', from: 5 }],
    solids: [pine(360, 100), pine(620, 120), pine(480, 420), log(740, 380, 120), stump(860, 200)],
    cover: [fern(120, 460), blueberry(880, 460, 46)],
  },
  {
    id: 'barrens-9', name: 'Whip-poor-will', snake: 'hognose', start: { x: 200, y: 280 }, heading: 0, length: 150, target: 500, par: 60,
    prey: [{ kind: 'toad', count: 5 }, { kind: 'frog', count: 2 }],
    dark: true,
    solids: [pine(380, 120), pine(400, 420), pine(660, 270, 18), stump(820, 110), log(780, 430, 110)],
    teach: ['dark'],
  },
  {
    id: 'barrens-10', name: 'The Red Fox', snake: 'hognose', start: { x: 200, y: 280 }, heading: 0, length: 160, target: 460, par: 75,
    prey: [{ kind: 'toad', count: 4 }],
    goal: { kind: 'boss' },
    boss: { kind: 'fox', hp: 3 },
    solids: [pine(440, 110), pine(700, 420), stump(820, 200)],
    cover: [blueberry(300, 420, 50), fern(620, 160, 46)],
    teach: ['foxplan'],
  },
];
