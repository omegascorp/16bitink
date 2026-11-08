import type { LevelDef } from '../logic/level';
import { COIN, LAVA, WATER } from '../logic/particles';
import { CH1, PIN_T, T } from './common';

/**
 * Level 9, lights out: only Nib's lamp, the torches and glowing lava light
 * the temple. Read it, then cool it: at the bottom of the Ember Shaft the
 * sump's lava is the only light, so once the water sets it to stone the
 * floor Nib has to drop onto is dark, and whatever is down there with him.
 * 1. The seed in the dark: Nib starts at the bottom of a pit lit only by a
 *    lava bowl beside the seed. Its tank (S) grows the vine up to the hall,
 *    which runs on to Nib's gate (G) at the mouth of the shaft.
 * 2. The pen over the fire: the shaft's mouth is a pen, and a porcupine
 *    paces it on a sloping floor pin (P), with its gold. The gold slides
 *    into a pocket at the low end (too low for the porcupine), against a
 *    slot pin (C) that lets it down a chute into the gold hall. Then the
 *    floor: the porcupine drops into the glowing sump and is scorched. Then
 *    the tank by the sump (W) sets it to stone, a floor to land on, and a
 *    baffle keeps its last drops away from the porcupine's side.
 *    - Floor first: the gold drops into the lava with the porcupine: melted.
 *    - Water first (the tank over the fire is the obvious pull): the
 *      porcupine lands on cold stone in the dark and waits for Nib; the
 *      sill is too high for it, and only Nib can climb the vine out.
 *    - Leave the floor in: Nib drops into the pen with the porcupine.
 *    - Open the gate on the glowing sump: Nib drops into the lava.
 * 3. The gold pit: a vine climbs out of the sump into the gold hall, where a
 *    second porcupine paces a pit full of gold under a lamp of lava (L) and
 *    a tank of water (V). The lamp is the brightest thing in the hall and
 *    lava scorches guards, but it runs into the dry pit and melts the gold.
 *    Water first: it washes the porcupine away (the level's one wash) and
 *    drowns the gold, and then the lamp's lava only sets to stone in the
 *    pool, a step up out of the pit on the chest's side.
 *    - The lamp before the water: melted.
 *    - Nib in the hall before the water: he walks into the porcupine.
 *    - The lamp with Nib in the pool: it lands on him.
 * The chest is past the pit, at the end of the gold hall. The stages are
 * tied by Nib's way down: the gate opens on both the sump and the gold pit,
 * and the pen's gold ends up in the gold hall.
 * Winning order: C, P, W, V, L, S, G (C before P before W; V before L; G
 * last of those; S any time).
 */
export const TORCHES: LevelDef = {
  id: 'torches',
  chapter: CH1,
  name: 'Torches Out',
  goal: 'Take the chest and pick up 90 coins',
  tip: 'Lights out! Lava glows in the dark, and water puts it out: look before you cool it.',
  dark: true,
  rooms: [
    // Nib's pit, the vine shaft, the hall above and the Ember Shaft down to its sump.
    [[40, 1000], [280, 1000], [280, 480], [1660, 480], [1660, 1340], [1360, 1340], [1360, 860], [364, 860], [364, 1000], [428, 1000], [428, 1300], [40, 1300]],
    // The gold hall, under the upper hall, with the gold pit.
    [[428, 1000], [1360, 1000], [1360, 1300], [980, 1300], [980, 1390], [820, 1390], [820, 1300], [428, 1300]],
  ],
  walls: [
    { ax: 40, ay: 1000, bx: 280, by: 1000, t: T }, // 0 Nib's pit: ceiling
    { ax: 40, ay: 1000, bx: 40, by: 1300, t: T }, // 1 left wall
    { ax: 40, ay: 1300, bx: 428, by: 1300, t: T }, // 2 floor
    { ax: 428, ay: 1000, bx: 428, by: 1300, t: T }, // 3 between Nib's pit and the gold hall
    { ax: 364, ay: 1000, bx: 428, by: 1000, t: T }, // 4 ceiling past the vine shaft
    { ax: 280, ay: 480, bx: 280, by: 1000, t: T }, // 5 the hall's left wall, down the vine shaft
    { ax: 364, ay: 860, bx: 364, by: 1000, t: T }, // 6 the vine shaft's right wall
    { ax: 364, ay: 860, bx: 1360, by: 860, t: T }, // 7 the hall floor
    { ax: 280, ay: 480, bx: 1660, by: 480, t: T }, // 8 ceiling
    { ax: 1660, ay: 480, bx: 1660, by: 1340, t: T }, // 9 the shaft's far wall
    { ax: 1360, ay: 1340, bx: 1660, by: 1340, t: T }, // 10 the sump
    { ax: 1360, ay: 860, bx: 1360, by: 998, t: T }, // 11 the shaft's near wall, over the gold's slot
    { ax: 1360, ay: 1046, bx: 1360, by: 1180, t: T }, // 12 and under it, over the way into the gold hall
    { ax: 1360, ay: 1260, bx: 1360, by: 1340, t: T }, // 13 the sump's sill: too high to climb, so a vine
    { ax: 428, ay: 1000, bx: 1360, by: 1000, t: T }, // 14 the gold hall's ceiling
    { ax: 428, ay: 1300, bx: 820, by: 1300, t: T }, // 15 its floor by the chest
    { ax: 820, ay: 1300, bx: 820, by: 1390, t: T }, // 16 the gold pit
    { ax: 820, ay: 1390, bx: 980, by: 1390, t: T }, // 17
    { ax: 980, ay: 1300, bx: 980, by: 1390, t: T }, // 18
    { ax: 980, ay: 1300, bx: 1360, by: 1300, t: T }, // 19 its floor from the gate
    { ax: 344, ay: 490, bx: 344, by: 700, t: T }, // 20 the seed's tank
    { ax: 1420, ay: 868, bx: 1420, by: 968, t: T }, // 21 the pen's gold pocket: coins slide under, the porcupine can't
    { ax: 1560, ay: 640, bx: 1560, by: 912, t: T }, // 22 the pen's far side
    { ax: 1572, ay: 1080, bx: 1572, by: 1180, t: T }, // 23 the sump's water tank
    { ax: 1564, ay: 1270, bx: 1564, by: 1305, t: T }, // 24 a baffle over the sump: the tank's last drops stay on its side
    { ax: 826, ay: 1040, bx: 826, by: 1182, t: T }, // 25 the lamp
    { ax: 896, ay: 1040, bx: 896, by: 1182, t: T }, // 26
    { ax: 826, ay: 1040, bx: 896, by: 1040, t: T }, // 27
    { ax: 910, ay: 1040, bx: 910, by: 1222, t: T }, // 28 the pit's water tank
    { ax: 974, ay: 1040, bx: 974, by: 1222, t: T }, // 29
    { ax: 1360, ay: 860, bx: 1460, by: 860, t: T }, // 30 the hall floor's last stretch, a ledge out over the pen
    { ax: 1300, ay: 480, bx: 1300, by: 782, t: T }, // 31 over Nib's gate
    { ax: 1352, ay: 1056, bx: 1290, by: 1092, t: T }, // 32 a chute under the gold's slot, out into the hall
    { ax: 380, ay: 1146, bx: 424, by: 1146, t: T }, // 33 a lava bowl by the seed, the only light in Nib's pit
    { ax: 380, ay: 1146, bx: 380, by: 1190, t: T }, // 34
    { ax: 424, ay: 1146, bx: 424, by: 1190, t: T }, // 35
    { ax: 380, ay: 1190, bx: 424, by: 1190, t: T }, // 36
  ],
  bars: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  pins: [
    { id: 'S', ax: 358, ay: 708, bx: 272, by: 708, t: PIN_T },
    { id: 'C', ax: 1360, ay: 1004, bx: 1360, by: 1040, t: PIN_T },
    { id: 'P', ax: 1568, ay: 920, bx: 1366, by: 1044, t: PIN_T },
    { id: 'W', ax: 1564, ay: 1188, bx: 1666, by: 1188, t: PIN_T },
    { id: 'G', ax: 1300, ay: 790, bx: 1300, by: 856, t: PIN_T },
    { id: 'L', ax: 812, ay: 1190, bx: 904, by: 1190, t: PIN_T },
    { id: 'V', ax: 988, ay: 1230, bx: 902, by: 1230, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 288, x1: 336, y1: 700, count: 36 },
    { kind: LAVA, x0: 388, x1: 416, y1: 1182, count: 6 },
    { kind: COIN, x0: 700, x1: 820, y1: 852, count: 12 },
    { kind: COIN, x0: 1370, x1: 1414, y1: 1000, count: 36 },
    { kind: WATER, x0: 1580, x1: 1652, y1: 1180, count: 20 },
    { kind: LAVA, x0: 1368, x1: 1652, y1: 1332, count: 56 },
    { kind: LAVA, x0: 834, x1: 888, y1: 1182, count: 30 },
    { kind: WATER, x0: 918, x1: 966, y1: 1222, count: 55 },
    { kind: COIN, x0: 828, x1: 972, y1: 1382, count: 50 },
    { kind: COIN, x0: 450, x1: 560, y1: 1292, count: 14 },
  ],
  nib: { x: 110, y: 1268 },
  blots: [
    { x: 1490, y: 935, spiky: true },
    { x: 900, y: 1330, spiky: true },
  ],
  chest: { x: 470, y: 1270 },
  coinsNeeded: 90,
  vines: [
    { x: 330, top: 852, bottom: 1292, seed: true },
    { x: 1394, top: 1252, bottom: 1305 },
  ],
  solution: ['C', 'P', 'W', 'V', 'L', 'S', 'G'],
  stops: [{ x: 330, y: 850 }, { x: 1100 }, { x: 1500 }, { x: 1394, y: 1250 }, { x: 1250 }, { x: 900 }, { x: 470 }],
  torches: [
    { x: 560, y: 790 },
    { x: 900, y: 790 },
    { x: 1230, y: 790 },
    { x: 1500, y: 880 },
    { x: 1250, y: 1230 },
    { x: 900, y: 1270 },
    { x: 540, y: 1220 },
  ],
  view: { x: 0, y: 430, w: 1700, h: 1000 },
};
