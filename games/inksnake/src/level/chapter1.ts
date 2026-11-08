import type { CoverDef, LevelDef, SolidDef } from './types';

/**
 * Chapter 1, The Farm (free): the corn snake in a farmyard garden. Each
 * level brings one new thing (see docs/inksnake-design.md): crows, the
 * coil, the hawk, the clock, the hen's eggs, one life, a remix, night,
 * and the Old Tomcat.
 */

const bale = (x: number, y: number, w = 82, h = 50): SolidDef => ({ kind: 'rect', look: 'bale', x, y, w, h });
const rock = (x: number, y: number, r = 22): SolidDef => ({ kind: 'circle', look: 'rock', x, y, r });
const post = (x: number, y: number): SolidDef => ({ kind: 'circle', look: 'post', x, y, r: 9 });
const trough = (x: number, y: number): SolidDef => ({ kind: 'rect', look: 'trough', x, y, w: 128, h: 40 });
const barrel = (x: number, y: number): SolidDef => ({ kind: 'circle', look: 'barrel', x, y, r: 26 });
const cabbages = (x: number, y: number, r = 53): CoverDef => ({ look: 'cabbage', x, y, r });
const grass = (x: number, y: number, r = 66): CoverDef => ({ look: 'grass', x, y, r });
const pumpkins = (x: number, y: number, r = 60): CoverDef => ({ look: 'pumpkin', x, y, r });

/** A row of fence posts from (x0, y) to (x1, y), one every `gap` px. */
function fence(x0: number, x1: number, y: number, gap = 60): SolidDef[] {
  return Array.from({ length: Math.floor((x1 - x0) / gap) + 1 }, (_, i) => post(x0 + i * gap, y));
}

export const CHAPTER_1: readonly LevelDef[] = [
  {
    id: 'farm-1', name: 'Corn Crib', snake: 'corn', start: { x: 180, y: 285 }, heading: 0, length: 128, target: 340, par: 30,
    prey: [{ kind: 'mouse', count: 4 }, { kind: 'frog', count: 2 }],
    solids: [{ kind: 'rect', look: 'crib', x: 615, y: 68, w: 170, h: 102 }, bale(225, 420), rock(795, 390)],
    cover: [grass(105, 98, 60)],
    teach: ['steer', 'eat', 'strike'],
  },
  {
    id: 'farm-2', name: "Crow's Feet", snake: 'corn', start: { x: 190, y: 270 }, heading: 0, length: 128, target: 400, par: 36,
    prey: [{ kind: 'mouse', count: 4 }, { kind: 'frog', count: 2 }],
    enemies: [{ kind: 'crow', from: 5 }],
    solids: [bale(420, 90), bale(495, 105, 60, 42), rock(675, 390), rock(285, 442, 19), ...fence(735, 930, 172)],
    cover: [grass(862, 450, 61)],
    teach: ['crow'],
  },
  {
    id: 'farm-3', name: 'Rat Run', snake: 'corn', start: { x: 260, y: 420 }, heading: -0.4, length: 230, target: 510, par: 55,
    prey: [{ kind: 'rat', count: 2 }, { kind: 'mouse', count: 2 }],
    solids: [trough(420, 225), barrel(780, 120), rock(225, 120)],
    cover: [grass(825, 420, 60)],
    teach: ['coil'],
  },
  {
    id: 'farm-4', name: 'Hawk Shadow', snake: 'corn', start: { x: 190, y: 270 }, heading: 0, length: 136, target: 476, par: 50,
    prey: [{ kind: 'mouse', count: 4 }, { kind: 'frog', count: 1 }, { kind: 'rat', count: 1 }],
    enemies: [{ kind: 'hawk', from: 6 }],
    solids: [rock(480, 90), bale(675, 390)],
    cover: [cabbages(322, 158), cabbages(285, 420, 49), cabbages(615, 248, 56), cabbages(848, 135, 48), cabbages(840, 442, 51)],
    teach: ['hawk', 'cover'],
  },
  {
    id: 'farm-5', name: 'Mouse Rush', snake: 'corn', start: { x: 480, y: 285 }, heading: -Math.PI / 2, length: 136, target: 510, par: 45,
    prey: [{ kind: 'mouse', count: 7 }, { kind: 'frog', count: 2 }],
    goal: { kind: 'rush', seconds: 55 },
    solids: [bale(165, 105), bale(720, 105), bale(165, 390), bale(720, 390)],
    cover: [],
    teach: ['rush'],
  },
  {
    id: 'farm-6', name: 'The Hen Coop', snake: 'corn', start: { x: 170, y: 420 }, heading: 0, length: 136, target: 459, par: 45,
    prey: [{ kind: 'egg', count: 3 }, { kind: 'mouse', count: 3 }],
    goal: { kind: 'feast', food: 'egg', count: 6 },
    nests: [{ x: 645, y: 188 }, { x: 720, y: 188 }, { x: 795, y: 188 }, { x: 682, y: 248 }, { x: 758, y: 248 }],
    enemies: [{ kind: 'hen' }],
    solids: [{ kind: 'rect', look: 'coop', x: 622, y: 45, w: 230, h: 110 }, trough(240, 150), ...fence(570, 885, 322, 45)],
    cover: [grass(420, 420, 63)],
    teach: ['feast'],
  },
  {
    id: 'farm-7', name: 'One Bite', snake: 'corn', start: { x: 190, y: 270 }, heading: 0, length: 144, target: 540, par: 55,
    prey: [{ kind: 'mouse', count: 4 }, { kind: 'rat', count: 1 }],
    enemies: [{ kind: 'crow', count: 2, from: 4 }],
    lives: 1,
    solids: [barrel(390, 150), barrel(420, 390), rock(675, 270, 26), bale(795, 90)],
    cover: [pumpkins(810, 435)],
    teach: ['knot'],
  },
  {
    id: 'farm-8', name: 'Harvest Moon', snake: 'corn', start: { x: 175, y: 440 }, heading: -0.3, length: 144, target: 600, par: 80,
    prey: [{ kind: 'rat', count: 2 }, { kind: 'mouse', count: 3 }],
    enemies: [{ kind: 'hawk', from: 8 }, { kind: 'crow', from: 4 }],
    solids: [{ kind: 'rect', look: 'crib', x: 420, y: 45, w: 153, h: 94 }, bale(750, 300), ...fence(90, 300, 195)],
    cover: [pumpkins(225, 330, 56), cabbages(645, 165, 53), grass(862, 465, 60), cabbages(525, 420, 48)],
  },
  {
    id: 'farm-9', name: 'The Barn at Night', snake: 'corn', start: { x: 190, y: 270 }, heading: 0, length: 144, target: 560, par: 60,
    prey: [{ kind: 'mouse', count: 5 }, { kind: 'frog', count: 2 }, { kind: 'rat', count: 1 }],
    dark: true,
    solids: [bale(315, 90), bale(390, 90), bale(315, 405), bale(675, 225, 102, 60), barrel(840, 420), rock(570, 450, 19)],
    teach: ['dark'],
  },
  {
    id: 'farm-10', name: 'The Old Tomcat', snake: 'corn', start: { x: 190, y: 270 }, heading: 0, length: 162, target: 476, par: 70,
    prey: [{ kind: 'mouse', count: 4 }],
    goal: { kind: 'boss' },
    boss: { kind: 'tomcat', hp: 3 },
    solids: [bale(420, 75), rock(735, 420), barrel(225, 450)],
    cover: [cabbages(315, 248, 51), cabbages(645, 225, 51), grass(840, 112, 56)],
    teach: ['boss'],
  },
];
