import type { Pt } from '../logic/vec';
import type { CoverDef, LevelDef, SolidDef, ZoneDef } from './types';

/**
 * Chapter 10, The Flooded Forest (full game), the finale: the green
 * anaconda in the Amazon's flooded forest, dark tea-coloured water between
 * the trunks, banks and islands of land. New: submerging (level 3), fish
 * shoals, egrets at the water's edge, capybaras coming down to drink (coil
 * them), young caimans, black caimans lurking, a bigger anaconda, and the
 * Jaguar. Served to owners only (content/paid.ts): never import it from
 * client code.
 */

/** The water under everything: land zones are the banks and islands in it. */
const WATER: ZoneDef = { kind: 'water', look: 'blackwater', shape: 'rect', x: -20, y: -20, w: 1000, h: 580 };

/** An island or bank: a rounded blob of land, a little irregular. */
function isle(x: number, y: number, rx: number, ry: number, twist = 0, look = 'bank'): ZoneDef {
  const points: Pt[] = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const k = 1 + 0.1 * Math.sin(a * 3 + twist) + 0.06 * Math.cos(a * 5 - twist);
    return { x: Math.round(x + Math.cos(a) * rx * k), y: Math.round(y + Math.sin(a) * ry * k) };
  });
  return { kind: 'land', look, shape: 'poly', points };
}

/** A bank along the board's top (or bottom) edge, its shore wavy at about `shore` px in. */
function edgeBank(side: 'top' | 'bottom', shore: number, twist = 0): ZoneDef {
  const n = 12;
  const shoreY = (i: number): number => Math.round(shore + 14 * Math.sin(i * 1.3 + twist) + 8 * Math.cos(i * 2.1 - twist));
  const along: Pt[] = Array.from({ length: n + 1 }, (_, i) => ({ x: Math.round(-20 + (1000 * i) / n), y: side === 'top' ? shoreY(i) : 540 - shoreY(i) }));
  const back = side === 'top' ? -20 : 560;
  return { kind: 'land', look: 'bank', shape: 'poly', points: [{ x: -20, y: back }, ...along, { x: 980, y: back }] };
}

const trunk = (x: number, y: number, r = 16): SolidDef => ({ kind: 'circle', look: 'trunk', x, y, r });
const log = (x: number, y: number, w = 110, h = 24): SolidDef => ({ kind: 'rect', look: 'log', x, y, w, h });
const lily = (x: number, y: number, r = 44): CoverDef => ({ look: 'lily', x, y, r });
const lettuce = (x: number, y: number, r = 38): CoverDef => ({ look: 'water-lettuce', x, y, r });
const reeds = (x: number, y: number, r = 40): CoverDef => ({ look: 'reeds', x, y, r });

export const CHAPTER_10: readonly LevelDef[] = [
  {
    id: 'flooded-1', name: 'Black Water', snake: 'anaconda', start: { x: 330, y: 270 }, heading: 0, length: 210, target: 500, par: 50,
    prey: [{ kind: 'piranha', count: 5 }, { kind: 'egret', count: 1 }, { kind: 'river-turtle', count: 1 }],
    zones: [WATER, isle(770, 115, 125, 70, 0.4), isle(180, 455, 140, 62, 1.7), isle(600, 445, 75, 46, 2.9)],
    solids: [trunk(520, 150), trunk(880, 330, 18), trunk(420, 390), trunk(700, 290, 14)],
    cover: [lily(300, 110), lettuce(820, 470)],
  },
  {
    id: 'flooded-2', name: 'Two Eyes', snake: 'anaconda', start: { x: 260, y: 270 }, heading: 0, length: 210, target: 520, par: 60,
    prey: [{ kind: 'piranha', count: 5 }, { kind: 'river-turtle', count: 2 }],
    enemies: [{ kind: 'black-caiman', from: 3 }],
    zones: [WATER, isle(480, 470, 130, 55, 0.8), isle(840, 115, 95, 72, 2.2)],
    spots: [{ x: 720, y: 330 }, { x: 540, y: 140 }, { x: 260, y: 420 }, { x: 860, y: 450 }],
    solids: [trunk(600, 260, 18), trunk(360, 140), trunk(120, 430), trunk(760, 200, 14)],
    cover: [lily(160, 110), lily(640, 380, 40)],
  },
  {
    id: 'flooded-3', name: 'Only the Eyes Show', snake: 'anaconda', start: { x: 300, y: 285 }, heading: 0, length: 220, target: 520, par: 70,
    prey: [{ kind: 'egret', count: 3 }, { kind: 'piranha', count: 2 }],
    zones: [WATER, isle(240, 125, 150, 72, 0.3), isle(730, 135, 135, 70, 1.9), isle(520, 445, 175, 64, 3.1)],
    solids: [trunk(480, 230), trunk(880, 320, 18), trunk(110, 380)],
    cover: [reeds(140, 175, 36), lettuce(850, 470)],
    teach: ['submerge', 'egrets', 'breath'],
  },
  {
    id: 'flooded-4', name: 'Bigger Sister', snake: 'anaconda', start: { x: 280, y: 270 }, heading: 0, length: 230, target: 560, par: 70,
    prey: [{ kind: 'piranha', count: 5 }, { kind: 'river-turtle', count: 1 }, { kind: 'egret', count: 1 }],
    enemies: [{ kind: 'big-anaconda', from: 6 }],
    zones: [WATER, isle(760, 130, 120, 68, 1.1), isle(220, 460, 150, 58, 2.4)],
    solids: [trunk(520, 140), trunk(600, 400, 18), trunk(860, 380), log(380, 400, 100, 22)],
    cover: [lily(470, 290, 42), lettuce(110, 110)],
  },
  {
    id: 'flooded-5', name: 'Piranha Run', snake: 'anaconda', start: { x: 300, y: 280 }, heading: 0, length: 220, target: 520, par: 40,
    prey: [{ kind: 'piranha', count: 8 }, { kind: 'river-turtle', count: 2 }],
    goal: { kind: 'rush', seconds: 70 },
    zones: [WATER, isle(820, 100, 100, 55, 0.6), isle(140, 470, 110, 50, 2.0)],
    solids: [trunk(560, 140), trunk(660, 400), trunk(400, 430, 14)],
    cover: [lily(780, 400, 40)],
  },
  {
    id: 'flooded-6', name: 'Capybara Crossing', snake: 'anaconda', start: { x: 300, y: 300 }, heading: 0, length: 260, target: 720, par: 110,
    prey: [{ kind: 'capybara', count: 2 }, { kind: 'piranha', count: 3 }],
    goal: { kind: 'feast', food: 'capybara', count: 3 },
    zones: [WATER, isle(700, 150, 120, 80, 0.9), isle(330, 120, 105, 62, 2.6), isle(640, 430, 115, 62, 1.4)],
    solids: [trunk(500, 300, 18), trunk(130, 420), trunk(900, 320)],
    cover: [reeds(760, 110, 34), lettuce(240, 440)],
    teach: ['capycoil'],
  },
  {
    id: 'flooded-7', name: 'One Snap', snake: 'anaconda', start: { x: 260, y: 280 }, heading: 0, length: 240, target: 540, par: 80,
    prey: [{ kind: 'piranha', count: 5 }, { kind: 'egret', count: 1 }, { kind: 'river-turtle', count: 1 }],
    enemies: [{ kind: 'black-caiman', count: 2, from: 4 }],
    lives: 1,
    zones: [WATER, isle(760, 120, 120, 66, 0.2), isle(300, 470, 140, 54, 1.6)],
    spots: [{ x: 640, y: 330 }, { x: 470, y: 130 }, { x: 860, y: 440 }, { x: 120, y: 120 }],
    solids: [trunk(540, 230, 18), trunk(380, 120), trunk(880, 280), trunk(120, 360)],
    cover: [lily(700, 440, 42), lettuce(200, 120)],
    teach: ['knot'],
  },
  {
    id: 'flooded-8', name: 'High Water', snake: 'anaconda', start: { x: 300, y: 290 }, heading: 0, length: 260, target: 720, par: 120,
    prey: [{ kind: 'young-caiman', count: 1 }, { kind: 'capybara', count: 1 }, { kind: 'piranha', count: 4 }],
    enemies: [{ kind: 'black-caiman', from: 5 }, { kind: 'big-anaconda', from: 16 }],
    zones: [WATER, isle(720, 140, 120, 76, 1.3), isle(260, 450, 130, 58, 0.5)],
    spots: [{ x: 880, y: 420 }, { x: 520, y: 110 }, { x: 110, y: 130 }],
    solids: [trunk(500, 300, 18), trunk(900, 260), trunk(100, 370)],
    cover: [lily(600, 450, 42), reeds(780, 100, 34)],
    teach: ['caimancoil'],
  },
  {
    id: 'flooded-9', name: 'Night Swim', snake: 'anaconda', start: { x: 280, y: 280 }, heading: 0, length: 240, target: 580, par: 90,
    prey: [{ kind: 'piranha', count: 5 }, { kind: 'egret', count: 2 }],
    enemies: [{ kind: 'black-caiman', from: 6 }],
    dark: true,
    zones: [WATER, isle(740, 125, 130, 70, 2.1), isle(250, 460, 140, 56, 0.7), isle(660, 450, 70, 44, 1.2)],
    spots: [{ x: 820, y: 330 }, { x: 480, y: 160 }, { x: 120, y: 160 }],
    solids: [trunk(520, 300, 18), trunk(400, 120), trunk(880, 450)],
    cover: [lily(160, 300, 40)],
    teach: ['dark'],
  },
  {
    id: 'flooded-10', name: 'The Jaguar', snake: 'anaconda', start: { x: 600, y: 280 }, heading: 0, length: 260, target: 400, par: 120,
    prey: [{ kind: 'piranha', count: 5 }, { kind: 'river-turtle', count: 1 }],
    goal: { kind: 'boss' },
    boss: { kind: 'jaguar', hp: 3 },
    zones: [WATER, edgeBank('top', 88, 0.4), edgeBank('bottom', 86, 2.2), isle(60, 270, 70, 120, 1.0)],
    spots: [{ x: 300, y: 70 }, { x: 660, y: 66 }, { x: 250, y: 470 }, { x: 720, y: 474 }, { x: 70, y: 270 }],
    solids: [trunk(300, 280, 18), trunk(760, 240), trunk(560, 400, 14), trunk(880, 160)],
    cover: [reeds(900, 60, 38), reeds(130, 470, 36), lily(650, 300, 40)],
    teach: ['jaguarplan'],
  },
];
