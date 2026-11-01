import type { LevelDef } from '../../logic/level';
import { COIN, GAS, LAVA, WATER } from '../../logic/particles';
import { CH3, PIN_T, T } from '../common';

/**
 * Chapter 3, level 4 (Level 24): the Puff Frog. Three rain frogs float
 * puffed up in gas, and each one is a single clear moment: vent its dome and
 * it drops about 6 s later, right under the vent, onto a plate or into water.
 * 1. The crypt: G is the gas pit's lid beside the cracked bar. The gas pools
 *    along the roof to the bowl under the pipe, and the blast takes frog 3
 *    and breaks the bar to the chest. Once the dam's water has come down the
 *    pipe, the bowl is doused: the bar stands ('sealed'), unless the lamp T,
 *    pulled after G, drops its oil through the pooled gas and lights it.
 * 2. The plate: A vents the plate dome. Frog 1 drops into the pit under the
 *    vent, and its weight opens the sluice D at the foot of the cistern.
 * 3. The flood: W lets the cistern out. Through the open sluice it washes
 *    frog 1, fills the pit (the water keeps the plate down) and runs on into
 *    the dam's well. Before A, D is shut and it leaks away at the doorstep's
 *    grate.
 * 4. The dam: U pours the well into Nib's pit; it runs along the gallery,
 *    through the gallery's door E, down the pipe onto the bowl, and across
 *    the crypt into the frog dome's deep pool (and the open gas pit).
 * 5. The frog dome: B vents it, and frog 2 drops into the full pool and
 *    washes. The pool's floor is the plate Q under the vent: a frog weighs 30
 *    on it, water in a 40-px plate never more than ~19 (need 24). Vented
 *    before the flood, frog 2 lands on the dry Q and E (an inverse door)
 *    shuts: the dam's water stays in Nib's pit and runs off at the pocket's
 *    grate past the 18-px lip, the pool stays dry, and Nib, dropped in,
 *    stomps the frog and can't climb out ('sealed' on E). No water ever
 *    reaches a frog on Q to wash it: the landing's grate reaches up under S.
 * Nib's pin S is the floor of his pit and the frog dome's roof: out before B,
 * he drops through the gas ('gassed'); out before the flood, the pool is dry.
 * The trap: T, the little oil lamp in the roof over the gas pit's lid. With
 * the lid in, its oil runs down the sloping lid, through the slot under the
 * bar and onto the gold ('melted'; on the way down it lights frog 3's gas,
 * which breaks the bar too). Once the pit is open, the oil drips into it and
 * stays there (after the flood it sets to stone in the pit's water).
 * Winning order: G, A, W, U, B, S, then walk to the chest (T, if pulled,
 * after G). Rough spot: A, W, U, T, G, … times out ('playing'): the oil sets
 * on the wet lid, two stone grains roll under the domes' lip and Nib's climb
 * probe stops him there (outside the audit's sample).
 */
export const PUFF_FROG: LevelDef = {
  id: 'puff-frog',
  chapter: CH3,
  ruin: 'tomb',
  name: 'The Puff Frog',
  goal: 'Blast the cracked wall and take the chest',
  tip: 'A rain frog puffs up in gas and floats. Let its gas out and it drops straight down: into water, it washes away; onto a plate, it holds it down.',
  rooms: [
    [[1560, 120], [1760, 120], [1760, 470], [1560, 470]], // the cistern and its doorstep
    [[904, 350], [1560, 350], [1560, 470], [1400, 470], [1400, 542], [1270, 542], [1270, 470], [960, 470], [960, 540], [904, 540]], // the plate dome, its pit and the dam's well
    [[1300, 280], [1360, 280], [1360, 350], [1300, 350]], // vent A
    [[712, 540], [1040, 540], [1040, 650], [968, 650], [968, 700], [896, 700], [896, 650], [712, 650]], // the gallery, Nib's pit in its floor, and the overflow pocket past it
    [[712, 650], [758, 650], [758, 700], [712, 700]], // the pipe down to the bowl
    [[600, 700], [970, 700], [970, 846], [896, 834], [896, 960], [816, 960], [816, 840], [600, 840]], // the crypt and the frog's pool
    [[846, 662], [886, 662], [886, 700], [846, 700]], // vent B
    [[620, 840], [700, 840], [700, 910], [620, 910]], // the crypt's gas pit
    [[500, 720], [600, 720], [600, 856], [500, 866]], // the chest's niche, its floor running down from the slot under the bar
    [[620, 648], [700, 648], [700, 700], [620, 700]], // the oil lamp's tank, in the crypt's roof over the gas pit
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
    { ax: 1040, ay: 540, bx: 1040, by: 650, t: T }, // 19
    { ax: 712, ay: 540, bx: 712, by: 700, t: T }, // 20 the gallery's end, and the pipe's left side
    { ax: 758, ay: 654, bx: 896, by: 648, t: T }, // 21 the gallery's floor, running down to the pipe
    { ax: 968, ay: 650, bx: 1040, by: 650, t: T }, // 22 the overflow pocket right of Nib's pit
    { ax: 758, ay: 654, bx: 758, by: 700, t: T }, // 23 the pipe, right over the bowl
    { ax: 896, ay: 650, bx: 896, by: 700, t: T }, // 24 Nib's pit, its floor the pin S in the crypt's roof
    { ax: 968, ay: 650, bx: 968, by: 700, t: T }, // 25
    { ax: 600, ay: 700, bx: 620, by: 700, t: T }, // 26 the crypt's roof, either side of the lamp
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
    { ax: 688, ay: 840, bx: 816, by: 840, t: T }, // 37 the crypt's floor
    { ax: 980, ay: 630, bx: 980, by: 650, t: T }, // 38 the pocket's lip, 18 above the gallery's: only water E holds back reaches its grate
    { ax: 800, ay: 700, bx: 800, by: 760, t: T }, // 39 the lip between the frog's dome and the bowl's dome
    { ax: 620, ay: 856, bx: 620, by: 920, t: T }, // 40 the gas pit, beside the bar; its lid G slopes down to the slot
    { ax: 700, ay: 840, bx: 700, by: 920, t: T }, // 41
    { ax: 620, ay: 920, bx: 700, by: 920, t: T }, // 42
    { ax: 600, ay: 700, bx: 600, by: 806, t: T }, // 43 the cracked bar to the chest, a slot under it at the floor (too low for Nib)
    { ax: 716, ay: 772, bx: 746, by: 772, t: T }, // 44 the bowl's shelf under the pipe, its tip under the flame
    { ax: 500, ay: 720, bx: 592, by: 720, t: T }, // 45 the chest's niche
    { ax: 500, ay: 720, bx: 500, by: 866, t: T }, // 46
    { ax: 500, ay: 866, bx: 620, by: 856, t: T }, // 47 its floor, running down from the slot to the gold
    { ax: 968, ay: 540, bx: 1040, by: 540, t: T }, // 48 the gallery's roof right of the dam
    { ax: 620, ay: 648, bx: 620, by: 700, t: T }, // 49 the oil lamp's tank, in the roof right over the gas pit
    { ax: 700, ay: 648, bx: 700, by: 700, t: T }, // 50
    { ax: 620, ay: 648, bx: 700, by: 648, t: T }, // 51 the tank's roof
    { ax: 700, ay: 700, bx: 712, by: 700, t: T }, // 52 the crypt's roof, right of the tank
  ],
  bars: [9, 10, 39, 43, 44, 49, 50, 51],
  cracked: [43],
  pins: [
    { id: 'G', ax: 704, ay: 826, bx: 612, by: 852, t: PIN_T }, // the gas pit's lid, sloping down to the slot under the bar
    { id: 'A', ax: 1368, ay: 350, bx: 1292, by: 350, t: PIN_T }, // the plate dome's vent
    { id: 'W', ax: 1768, ay: 348, bx: 1552, by: 348, t: PIN_T }, // the cistern's floor
    { id: 'U', ax: 976, ay: 540, bx: 888, by: 540, t: PIN_T }, // the dam: the well's floor, in the gallery's roof
    { id: 'B', ax: 838, ay: 700, bx: 894, by: 700, t: PIN_T }, // the frog dome's vent
    { id: 'S', ax: 976, ay: 700, bx: 888, by: 700, t: PIN_T }, // Nib's pin, the floor of his pit and the frog dome's roof
    { id: 'T', ax: 620, ay: 700, bx: 700, by: 700, t: PIN_T }, // the trap: the oil lamp's floor, over the gas pit's lid
  ],
  drains: [
    { x0: 1300, x1: 1360, y0: 280, y1: 330 }, // vent A
    { x0: 854, x1: 878, y0: 670, y1: 692 }, // vent B
    { x0: 990, x1: 1032, y0: 624, y1: 642 }, // the overflow pocket's grate
    { x0: 904, x1: 964, y0: 752, y1: 846 }, // the grate where Nib lands, reaching up under his pin: water through his pit never reaches the pool
    { x0: 1744, x1: 1756, y0: 454, y1: 470 }, // the doorstep's grate: a flood held back by the shut sluice leaks away
  ],
  fills: [
    { kind: WATER, x0: 1568, x1: 1752, y1: 340, count: 420 },
    { kind: GAS, x0: 1158, x1: 1412, y1: 358, count: 50 }, // the plate dome, round frog 1
    { kind: GAS, x0: 808, x1: 962, y1: 708, count: 34 }, // the frog dome, round frog 2 and under Nib
    { kind: GAS, x0: 608, x1: 672, y1: 708, count: 12 }, // the bowl's dome by the bar, round frog 3
    { kind: GAS, x0: 628, x1: 692, y1: 856, count: 30 }, // the crypt's gas pit
    { kind: COIN, x0: 528, x1: 600, y1: 851, count: 10 }, // the chest's gold, right inside the slot
    { kind: LAVA, x0: 628, x1: 692, y1: 693, count: 12 }, // the oil lamp's oil, over the gas pit's lid
  ],
  nib: { x: 932, y: 669 },
  blots: [
    { x: 1200, y: 380, animal: 'frog' },
    { x: 856, y: 730, animal: 'frog' },
    { x: 640, y: 730, animal: 'frog' },
  ],
  chest: { x: 524, y: 832 },
  coinsNeeded: 8,
  plates: [
    { id: 'P', x0: 1278, x1: 1392, y: 534 },
    { id: 'Q', x0: 836, x1: 876, y: 952, need: 24 }, // the pool's floor under vent B: a frog presses it (30); water can't (~17 at most)
  ],
  doors: [
    { id: 'D', ax: 1560, ay: 474, bx: 1560, by: 400, t: T, plate: 'P' },
    { id: 'E', ax: 886, ay: 548, bx: 886, by: 646, t: T, plate: 'Q', invert: true }, // the gallery's door: a frog on the pool's floor shuts it, and the dam's water never reaches the pipe
  ],
  seals: [{ wall: 43, side: 'left' }, { door: 'E', side: 'up' }], // the bar, and the gallery's door: shut, the dam's water never reaches the pool
  braziers: [{ x: 720, y: 764 }],
  solution: ['G', 'A', 'W', 'U', 'B', 'S', '@524'],
  stops: [],
  torches: [],
  view: { x: 460, y: 100, w: 1340, h: 880 },
};
