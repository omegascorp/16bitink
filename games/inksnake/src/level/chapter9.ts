import type { CoverDef, LevelDef, SolidDef, ZoneDef } from './types';

/**
 * Chapter 9, The Jungle (full game): the king cobra in the forests of
 * northern and eastern India, by a stream among bamboo, fallen teak and a
 * ruined temple. New: eating other snakes (rat snakes, banded kraits, a
 * rock python), spreading the hood (level 3), a honey badger, big kraits
 * that bite, and the Grey Mongoose. Served to owners only
 * (content/paid.ts): never import it from client code.
 */

const bamboo = (x: number, y: number, r = 18): SolidDef => ({ kind: 'circle', look: 'bamboo', x, y, r });
const log = (x: number, y: number, w = 130, h = 26): SolidDef => ({ kind: 'rect', look: 'log', x, y, w, h });
const ruin = (x: number, y: number, w = 70, h = 54): SolidDef => ({ kind: 'rect', look: 'ruin', x, y, w, h });
const litter = (x: number, y: number, r = 50): CoverDef => ({ look: 'leaflitter', x, y, r });
const fern = (x: number, y: number, r = 46): CoverDef => ({ look: 'fern', x, y, r });
/** A stream winding down the board from top to bottom, about `w` px wide, centred near `x`. */
const stream = (x: number, w = 56): ZoneDef => ({
  kind: 'water', look: 'stream', shape: 'poly',
  points: [
    { x: x - w / 2, y: -20 }, { x: x + w / 2, y: -20 }, { x: x + 30 + w / 2, y: 180 }, { x: x - 10 + w / 2, y: 360 }, { x: x + 20 + w / 2, y: 560 },
    { x: x + 20 - w / 2, y: 560 }, { x: x - 10 - w / 2, y: 360 }, { x: x + 30 - w / 2, y: 180 },
  ],
});

export const CHAPTER_9: readonly LevelDef[] = [
  {
    id: 'jungle-1', name: 'Snake Eater', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 190, target: 540, par: 38,
    prey: [{ kind: 'bullfrog', count: 3 }, { kind: 'skink', count: 2 }],
    enemies: [{ kind: 'ratsnake', count: 2, from: 1 }],
    solids: [bamboo(480, 110), bamboo(510, 430), log(690, 250), ruin(830, 80)],
    cover: [litter(120, 90)],
    teach: ['snakeeater'],
  },
  {
    id: 'jungle-2', name: 'Badger Trail', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 190, target: 560, par: 38,
    prey: [{ kind: 'bullfrog', count: 3 }, { kind: 'bandicoot', count: 2 }],
    enemies: [{ kind: 'ratsnake', count: 2, from: 2 }, { kind: 'honey-badger', from: 4 }],
    zones: [stream(640)],
    solids: [bamboo(420, 120), bamboo(400, 430, 20), ruin(840, 420, 64, 60)],
    cover: [litter(110, 450), fern(860, 110)],
  },
  {
    id: 'jungle-3', name: 'Spread the Hood', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 190, target: 580, par: 45,
    prey: [{ kind: 'skink', count: 3 }, { kind: 'bullfrog', count: 2 }],
    enemies: [{ kind: 'ratsnake', count: 3, from: 1 }],
    solids: [bamboo(460, 140), bamboo(600, 400), bamboo(780, 180, 20), log(300, 450, 120)],
    cover: [fern(860, 440), litter(110, 90, 46)],
    teach: ['cobrahood'],
  },
  {
    id: 'jungle-4', name: 'Banded Kraits', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 200, target: 600, par: 28,
    prey: [{ kind: 'bullfrog', count: 2 }, { kind: 'bandicoot', count: 2 }],
    enemies: [{ kind: 'banded-krait', count: 2, from: 2 }, { kind: 'big-krait', from: 5 }, { kind: 'ratsnake', from: 4 }],
    solids: [ruin(470, 90, 80, 56), bamboo(560, 420), log(760, 300, 120), bamboo(860, 110)],
    cover: [litter(120, 460), fern(330, 90)],
    teach: ['kraits'],
  },
  {
    id: 'jungle-5', name: 'Monsoon Rush', snake: 'cobra', start: { x: 480, y: 300 }, heading: -Math.PI / 2, length: 200, target: 640, par: 36,
    prey: [{ kind: 'bullfrog', count: 5 }, { kind: 'skink', count: 3 }],
    goal: { kind: 'rush', seconds: 50 },
    enemies: [{ kind: 'ratsnake', count: 2, from: 1 }, { kind: 'rock-python', from: 3 }],
    solids: [bamboo(200, 120), bamboo(760, 120), bamboo(200, 420), bamboo(760, 420)],
    teach: ['pythonvenom'],
  },
  {
    id: 'jungle-6', name: 'Rat Snake Feast', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 200, target: 580, par: 42,
    prey: [{ kind: 'bullfrog', count: 3 }, { kind: 'skink', count: 1 }],
    goal: { kind: 'feast', food: 'ratsnake', count: 6 },
    enemies: [{ kind: 'ratsnake', count: 3, from: 1 }, { kind: 'honey-badger', from: 6 }],
    zones: [stream(700, 50)],
    solids: [bamboo(450, 110), bamboo(470, 430), ruin(860, 250, 60, 70)],
    cover: [litter(120, 460), fern(560, 270, 40)],
  },
  {
    id: 'jungle-7', name: 'One Bite', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 200, target: 600, par: 38,
    prey: [{ kind: 'bullfrog', count: 2 }, { kind: 'bandicoot', count: 2 }],
    enemies: [{ kind: 'ratsnake', count: 2, from: 1 }, { kind: 'honey-badger', from: 5 }, { kind: 'big-krait', from: 8 }],
    lives: 1,
    solids: [bamboo(430, 150), bamboo(450, 400), log(680, 270, 110), ruin(860, 440, 60, 56)],
    cover: [litter(120, 90, 46), fern(860, 100)],
    teach: ['knot'],
  },
  {
    id: 'jungle-8', name: 'Temple Ruins', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 210, target: 650, par: 44,
    prey: [{ kind: 'bullfrog', count: 3 }, { kind: 'bandicoot', count: 2 }],
    enemies: [{ kind: 'rock-python', from: 3 }, { kind: 'banded-krait', count: 2, from: 2 }, { kind: 'honey-badger', from: 6 }],
    solids: [ruin(450, 70, 90, 50), ruin(450, 420, 90, 50), ruin(720, 245, 60, 60), bamboo(880, 100), bamboo(880, 450)],
    cover: [litter(120, 460), litter(620, 90, 44)],
  },
  {
    id: 'jungle-9', name: 'Krait Night', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 210, target: 640, par: 36,
    prey: [{ kind: 'bullfrog', count: 4 }, { kind: 'skink', count: 2 }],
    enemies: [{ kind: 'banded-krait', count: 2, from: 2 }, { kind: 'ratsnake', from: 3 }, { kind: 'big-krait', from: 7 }],
    dark: true,
    zones: [stream(700, 52)],
    solids: [bamboo(440, 130), bamboo(460, 420), log(560, 270, 100)],
    cover: [fern(120, 450), litter(860, 90, 46)],
    teach: ['dark'],
  },
  {
    id: 'jungle-10', name: 'The Grey Mongoose', snake: 'cobra', start: { x: 240, y: 280 }, heading: 0, length: 220, target: 520, par: 34,
    prey: [{ kind: 'bullfrog', count: 3 }],
    goal: { kind: 'boss' },
    boss: { kind: 'grey-mongoose', hp: 4 },
    enemies: [{ kind: 'ratsnake', from: 6 }],
    solids: [bamboo(470, 110), bamboo(700, 430), ruin(840, 200, 60, 56)],
    cover: [litter(300, 440), fern(640, 140, 42)],
    teach: ['mongooseplan'],
  },
];
