import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 4 (Level 24): the Puff Frog. Three rain frogs float
 * puffed up in gas, and each one is a single clear moment: vent its dome and
 * it drops about 6 s later, right under the vent.
 * 1. The crypt: G frees the gas pit beside the cracked bar. The gas pools
 *    along the roof to the bowl under the pipe, and the blast takes frog 3
 *    and breaks the bar to the chest. Once the dam's water has come down the
 *    pipe, the bowl is doused: the bar stands ('sealed').
 * 2. The plate: A vents the plate dome. Frog 1 drops into the frog-sign pit
 *    under the vent, and its weight opens the frog-sign sluice D at the foot
 *    of the cistern.
 * 3. The flood: W lets the cistern out. Through the open sluice it washes
 *    frog 1, fills the pit (the water keeps the plate down) and runs on into
 *    the dam's well. Before A, D is shut and it leaks away at the doorstep's
 *    grate.
 * 4. The dam: U pours the well into Nib's pit in the gallery floor; it runs
 *    along the gallery, down the pipe onto the bowl, and across the crypt into
 *    the frog dome's deep pool.
 * 5. The frog dome: B vents it, and frog 2 drops into the full pool and washes.
 * Nib's pin S is the floor of his pit and the frog dome's roof: out before B,
 * he drops through the gas ('gassed'); out before the flood, the dam pours
 * down his hole into the grate where he lands, the pool stays dry, and his
 * walk ends at the bottom of it ('sealed').
 * The trap: T, the little oil lamp hung over the burial niche, the chest's
 * gold beneath it. Its lava pours straight onto the gold ('melted') wherever
 * it falls; what misses pools hot on the floor Nib crosses.
 * Winning order: G, A, W, U, B, S (B may come before the flood: the flood
 * washes the frog in its dry pool).
 */
export const PUFF_FROG: LevelDef = {
  id: 'puff-frog',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Puff Frog',
  goal: 'Blast the cracked wall and take the chest',
  tip: 'A rain frog puffs up in gas and floats. Let its gas out and it drops straight down: into water, and it washes away.',
  rooms: [
    [[1560, 120], [1760, 120], [1760, 470], [1560, 470]], // the cistern and its doorstep
    [[904, 350], [1560, 350], [1560, 470], [1400, 470], [1400, 542], [1270, 542], [1270, 470], [960, 470], [960, 540], [904, 540]], // the plate dome, its pit and the dam's well
    [[1300, 280], [1360, 280], [1360, 350], [1300, 350]], // vent A
    [[712, 540], [1000, 540], [1000, 650], [968, 650], [968, 700], [896, 700], [896, 650], [712, 650]], // the gallery, and Nib's pit in its floor
    [[712, 650], [758, 650], [758, 700], [712, 700]], // the pipe down to the bowl
    [[600, 700], [970, 700], [970, 846], [896, 834], [896, 960], [816, 960], [816, 840], [600, 840]], // the crypt and the frog's pool
    [[846, 662], [886, 662], [886, 700], [846, 700]], // vent B
    [[620, 840], [700, 840], [700, 910], [620, 910]], // the crypt's gas pit
    [[500, 720], [600, 720], [600, 840], [500, 840]], // the chest's room
  ],
  walls: [
    { ax: 1560, ay: 120, bx: 1560, by: 396, t: T }, // 0 the cistern, down to the sluice
    { ax: 1760, ay: 120, bx: 1760, by: 470, t: T }, // 1
    { ax: 1560, ay: 120, bx: 1760, by: 120, t: T }, // 2
    { ax: 1560, ay: 470, bx: 1760, by: 470, t: T }, // 3 the doorstep
    { ax: 904, ay: 350, bx: 1300, by: 350, t: T }, // 4 the plate dome's roof
    { ax: 1360, ay: 350, bx: 1560, by: 350, t: T }, // 5
    { ax: 1300, ay: 350, bx: 1300, by: 280, t: T }, // 6 vent A
    { ax: 1360, ay: 350, bx: 1360, by: 280, t: T }, // 7
    { ax: 1300, ay: 280, bx: 1360, by: 280, t: T }, // 8
    { ax: 1150, ay: 350, bx: 1150, by: 410, t: T }, // 9 the plate dome's lips
    { ax: 1420, ay: 350, bx: 1420, by: 410, t: T }, // 10
    { ax: 1400, ay: 492, bx: 1560, by: 466, t: T }, // 11 the sluice's landing, running down to the pit
    { ax: 1400, ay: 492, bx: 1400, by: 542, t: T }, // 12 the plate pit (62+ deep: the frog can't climb out)
    { ax: 1270, ay: 542, bx: 1400, by: 542, t: T }, // 13
    { ax: 1270, ay: 470, bx: 1270, by: 542, t: T }, // 14
    { ax: 960, ay: 510, bx: 1270, by: 470, t: T }, // 15 the overflow, running down to the dam
    { ax: 904, ay: 350, bx: 904, by: 540, t: T }, // 16 the dam's well, right over Nib's pit
    { ax: 960, ay: 510, bx: 960, by: 540, t: T }, // 17
    { ax: 712, ay: 540, bx: 896, by: 540, t: T }, // 18 the gallery's roof
    { ax: 1000, ay: 540, bx: 1000, by: 650, t: T }, // 19
    { ax: 712, ay: 540, bx: 712, by: 700, t: T }, // 20 the gallery's end, and the pipe's left side
    { ax: 758, ay: 654, bx: 896, by: 648, t: T }, // 21 the gallery's floor, running down to the pipe
    { ax: 968, ay: 650, bx: 1000, by: 650, t: T }, // 22 ... right of Nib's pit, where the dam pours
    { ax: 758, ay: 654, bx: 758, by: 700, t: T }, // 23 the pipe, right over the bowl
    { ax: 896, ay: 650, bx: 896, by: 700, t: T }, // 24 Nib's pit, its floor the pin S in the crypt's roof
    { ax: 968, ay: 650, bx: 968, by: 700, t: T }, // 25
    { ax: 600, ay: 700, bx: 712, by: 700, t: T }, // 26 the crypt's roof
    { ax: 758, ay: 700, bx: 846, by: 700, t: T }, // 27
    { ax: 846, ay: 700, bx: 846, by: 662, t: T }, // 28 vent B: a pocket under the gallery's floor, too narrow for a frog
    { ax: 886, ay: 700, bx: 886, by: 662, t: T }, // 29
    { ax: 846, ay: 662, bx: 886, by: 662, t: T }, // 30
    { ax: 886, ay: 700, bx: 888, by: 700, t: T }, // 31
    { ax: 970, ay: 700, bx: 970, by: 846, t: T }, // 32 the crypt
    { ax: 896, ay: 834, bx: 970, by: 846, t: T }, // 33 where Nib lands, running down to a grate: water through his pit never reaches the pool
    { ax: 896, ay: 818, bx: 896, by: 960, t: T }, // 34 the frog's pool under vent B, 120 deep: dry, nothing climbs out
    { ax: 816, ay: 960, bx: 896, by: 960, t: T }, // 35
    { ax: 816, ay: 840, bx: 816, by: 960, t: T }, // 36
    { ax: 688, ay: 840, bx: 816, by: 840, t: T }, // 37
    { ax: 600, ay: 840, bx: 632, by: 840, t: T }, // 38
    { ax: 800, ay: 700, bx: 800, by: 760, t: T }, // 39 the lip between the frog's dome and the bowl's dome
    { ax: 620, ay: 840, bx: 620, by: 910, t: T }, // 40 the gas pit, beside the bar
    { ax: 700, ay: 840, bx: 700, by: 910, t: T }, // 41
    { ax: 620, ay: 910, bx: 700, by: 910, t: T }, // 42
    { ax: 600, ay: 700, bx: 600, by: 840, t: T }, // 43 the cracked bar to the chest
    { ax: 716, ay: 772, bx: 746, by: 772, t: T }, // 44 the bowl's shelf under the pipe, its tip under the flame
    { ax: 500, ay: 720, bx: 600, by: 720, t: T }, // 45 the chest's room
    { ax: 500, ay: 720, bx: 500, by: 820, t: T }, // 46
    { ax: 500, ay: 820, bx: 592, by: 820, t: T }, // 47 a step up from the crypt: the water stays out
    { ax: 592, ay: 820, bx: 592, by: 840, t: T }, // 48
    { ax: 968, ay: 540, bx: 1000, by: 540, t: T }, // 49 the gallery's roof right of the dam
    { ax: 540, ay: 720, bx: 540, by: 762, t: T }, // 50 the oil lamp's tank, hung over the burial niche
    { ax: 580, ay: 720, bx: 580, by: 762, t: T }, // 51
  ],
  bars: [9, 10, 39, 43, 44, 50, 51],
  cracked: [43],
  pins: [
    { id: 'G', ax: 696, ay: 840, bx: 628, by: 840, t: PIN_T }, // the gas pit's lid in the crypt's floor
    { id: 'A', ax: 1368, ay: 350, bx: 1292, by: 350, t: PIN_T }, // the plate dome's vent
    { id: 'W', ax: 1768, ay: 348, bx: 1552, by: 348, t: PIN_T }, // the cistern's floor
    { id: 'U', ax: 976, ay: 540, bx: 888, by: 540, t: PIN_T }, // the dam: the well's floor, in the gallery's roof
    { id: 'B', ax: 838, ay: 700, bx: 894, by: 700, t: PIN_T }, // the frog dome's vent
    { id: 'S', ax: 976, ay: 700, bx: 888, by: 700, t: PIN_T }, // Nib's pin, the floor of his pit and the frog dome's roof
    { id: 'T', ax: 586, ay: 762, bx: 544, by: 762, t: PIN_T }, // the trap: the oil lamp's floor, over the chest's gold
  ],
  drains: [
    { x0: 1300, x1: 1360, y0: 280, y1: 330 }, // vent A
    { x0: 854, x1: 878, y0: 670, y1: 692 }, // vent B
    { x0: 904, x1: 964, y0: 790, y1: 846 }, // the grate where Nib lands: water through his pit never reaches the pool
    { x0: 1744, x1: 1756, y0: 454, y1: 470 }, // the doorstep's grate: a flood held back by the shut sluice leaks away
  ],
  fills: [
    { kind: WATER, x0: 1568, x1: 1752, y1: 340, count: 420 },
    { kind: GAS, x0: 1158, x1: 1412, y1: 358, count: 50 }, // the plate dome, round frog 1
    { kind: GAS, x0: 808, x1: 962, y1: 708, count: 34 }, // the frog dome, round frog 2 and under Nib
    { kind: GAS, x0: 608, x1: 672, y1: 708, count: 12 }, // the bowl's dome by the bar, round frog 3
    { kind: GAS, x0: 628, x1: 692, y1: 848, count: 30 }, // the crypt's gas pit
    { kind: COIN, x0: 512, x1: 584, y1: 812, count: 10 }, // the chest-room reward, past the cracked bar
    { kind: LAVA, x0: 546, x1: 574, y1: 756, count: 12 }, // the oil lamp's oil, over the niche
  ],
  nib: { x: 932, y: 669 },
  blots: [
    { x: 1200, y: 380, animal: 'frog' },
    { x: 856, y: 730, animal: 'frog' },
    { x: 640, y: 730, animal: 'frog' },
  ],
  chest: { x: 556, y: 788 },
  coinsNeeded: 8,
  plates: [{ id: 'P', x0: 1278, x1: 1392, y: 534 }],
  doors: [{ id: 'D', ax: 1560, ay: 474, bx: 1560, by: 400, t: T, plate: 'P' }],
  seals: [{ wall: 43, side: 'left' }, { wall: 36, side: 'up' }], // the bar, and the dry pool Nib can't climb out of
  braziers: [{ x: 720, y: 764 }],
  solution: ['G', 'A', 'W', 'U', 'B', 'S', '@556'],
  walkHeights: [789],
  stops: [],
  torches: [],
  view: { x: 460, y: 100, w: 1340, h: 880 },
};
