import type { LevelDef } from '../../logic/level';
import { COIN, LAVA, WATER } from '../../logic/particles';
import { CH2, PIN_T, T } from '../common';

/**
 * Chapter 2, level 9, lights out: the guard is the lamp. A salamander
 * bathes in the Ember Bath, glowing like an ember, and the rubies glint on
 * the bath's floor under the lava. It is the only light down there, and it
 * moves: once Nib is in his pit beside the bath it wades across to him,
 * shoving the rubies ahead of it, and glares at him over the sill. So the
 * player sees the bath, the rubies and the far side by its light, and
 * washes it only once it has come.
 * 1. The pit: Nib starts on a shelf behind his gate (S) and drops into a pit
 *    beside the bath. The bath's sill (G, a pin) is too high for the
 *    salamander to climb, so it can see Nib but not reach him. The big
 *    tank's pin (W) runs past S, so it can't come out before S.
 * 2. The wash: W pours over the sill, onto the salamander waiting there:
 *    it washes away (the level's one wash) and the bath sets to stone with
 *    the rubies in it, by the sill, where Nib digs them out. Only then is G
 *    safe to pull, and the way on opens: across the stone, up the den and
 *    down into the hall.
 *    - G, the pin right beside Nib, is the tempting one: pulled while the
 *      bath is hot, the lava pours into the pit (burnt). Pulled before S,
 *      the pit fills with lava and Nib drops into it (burnt).
 * 3. The armadillo's hall (the supporting stage, chapter 1's stacked tank):
 *    an armadillo paces the floor to the chest, under a brazier of lava (K)
 *    with a small tank of water (V) above it, and a bowl of gold (H).
 *    - K first: the lava runs over the floor and scorches the armadillo;
 *      then V sets it to stone, and the gold can come down.
 *    - V first: the water sets the lava in the brazier, which holds it for
 *      good, and the armadillo waits for Nib (inked or pricked).
 *    - H before K: the brazier's lava runs over the gold (melted).
    - H before V: the bowl sits near the brazier, so the gold drops onto the
      hot lava on the floor (melted); it must wait for the stone.
 *    - G before K and V: Nib walks into the armadillo or the hot lava.
 *    - The wash is only part of it: W's tank is small, and the bath is left
 *      hot. The small tank over the bath's far end (Q) finishes it to stone,
 *      and it has to come after the wash, with a few seconds for the stone
 *      to set (too long a wait and the salamander gets over). Without Q, G
 *      lets the salamander (inked) or the lava (burnt) out.
 * The stages are tied by G: it opens the whole way down at once, so the
 * hall has to be made safe while Nib is still shut in his pit, and the
 * wash has to wait for the salamander, which only comes once Nib is down.
 * Winning order: S, K, V, H, W, Q, G (S before W; W before Q; K before V and H; V before
 * H; V before G; W before G).
 */
export const EMBER_LIGHT: LevelDef = {
  id: 'ember-light',
  chapter: CH2,
  name: 'Ember Light',
  goal: 'Take the chest and pick up 45 coins',
  tip: 'Lights out! A salamander glows like an ember: watch where it walks.',
  ruin: 'volcano',
  dark: true,
  rooms: [
    // Nib's shelf, his pit, the bath and the den above them.
    [[40, 480], [1000, 480], [1000, 930], [700, 930], [700, 1000], [410, 1000], [410, 1040], [300, 1040], [300, 780], [40, 780]],
    // The armadillo's hall, down from the den, with the landing.
    [[1000, 860], [1860, 860], [1860, 1200], [1200, 1200], [1200, 1140], [1000, 1140]],
  ],
  walls: [
    { ax: 40, ay: 480, bx: 1000, by: 480, t: T }, // 0 ceiling
    { ax: 40, ay: 480, bx: 40, by: 780, t: T }, // 1 left wall
    { ax: 40, ay: 780, bx: 300, by: 780, t: T }, // 2 Nib's shelf
    { ax: 300, ay: 780, bx: 300, by: 1040, t: T }, // 3 the pit's left wall
    { ax: 300, ay: 1040, bx: 410, by: 1040, t: T }, // 4 the pit's floor
    { ax: 410, ay: 1000, bx: 410, by: 1040, t: T }, // 5 the pit's right wall, under the bath's sill
    { ax: 410, ay: 1000, bx: 700, by: 1000, t: T }, // 6 the bath's floor
    { ax: 700, ay: 930, bx: 700, by: 1000, t: T }, // 7 the den's lip
    { ax: 700, ay: 930, bx: 1000, by: 930, t: T }, // 8 the den
    { ax: 1000, ay: 480, bx: 1000, by: 860, t: T }, // 9 over the way down to the hall
    { ax: 1000, ay: 930, bx: 1000, by: 1140, t: T }, // 10 the hall's left wall
    { ax: 1000, ay: 860, bx: 1860, by: 860, t: T }, // 11 the hall's ceiling
    { ax: 1860, ay: 860, bx: 1860, by: 1200, t: T }, // 12 right wall
    { ax: 1000, ay: 1140, bx: 1200, by: 1140, t: T }, // 13 the landing
    { ax: 1200, ay: 1140, bx: 1200, by: 1200, t: T }, // 14 its edge: too high for the armadillo
    { ax: 1200, ay: 1200, bx: 1860, by: 1200, t: T }, // 15 the armadillo's floor, to the chest
    { ax: 384, ay: 560, bx: 384, by: 760, t: T }, // 16 the big tank, over the sill
    { ax: 540, ay: 560, bx: 540, by: 760, t: T }, // 17
    { ax: 1240, ay: 970, bx: 1240, by: 1040, t: T }, // 18 the brazier
    { ax: 1360, ay: 970, bx: 1360, by: 1040, t: T }, // 19
    { ax: 1240, ay: 880, bx: 1240, by: 950, t: T }, // 20 the small tank over the brazier
    { ax: 1360, ay: 880, bx: 1360, by: 950, t: T }, // 21
    { ax: 1440, ay: 940, bx: 1440, by: 1040, t: T }, // 22 the gold's bowl
    { ax: 1540, ay: 940, bx: 1540, by: 1040, t: T }, // 23
    { ax: 600, ay: 560, bx: 600, by: 760, t: T }, // 24 the small tank, over the bath's far end
    { ax: 690, ay: 560, bx: 690, by: 760, t: T }, // 25
  ],
  bars: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
  pins: [
    { id: 'S', ax: 292, ay: 704, bx: 292, by: 774, t: PIN_T },
    { id: 'G', ax: 410, ay: 932, bx: 410, by: 998, t: PIN_T },
    { id: 'W', ax: 376, ay: 768, bx: 548, by: 768, t: PIN_T },
    { id: 'K', ax: 1232, ay: 1048, bx: 1368, by: 1048, t: PIN_T },
    { id: 'V', ax: 1232, ay: 958, bx: 1368, by: 958, t: PIN_T },
    { id: 'Q', ax: 698, ay: 768, bx: 592, by: 768, t: PIN_T },
    { id: 'H', ax: 1548, ay: 1048, bx: 1432, by: 1048, t: PIN_T },
  ],
  fills: [
    { kind: WATER, x0: 392, x1: 532, y1: 760, count: 18 },
    { kind: WATER, x0: 608, x1: 682, y1: 760, count: 55 },
    { kind: LAVA, x0: 418, x1: 692, y1: 992, count: 54 },
    { kind: LAVA, x0: 1248, x1: 1352, y1: 1040, count: 60 },
    { kind: WATER, x0: 1248, x1: 1352, y1: 950, count: 16 },
    { kind: COIN, x0: 1448, x1: 1532, y1: 1040, count: 30 },
  ],
  rubies: [
    { x: 560, y: 980 },
    { x: 620, y: 980 },
  ],
  nib: { x: 100, y: 756 },
  blots: [
    { x: 650, y: 966, animal: 'salamander' },
    { x: 1740, y: 1170, animal: 'armadillo' },
  ],
  chest: { x: 1820, y: 1176 },
  coinsNeeded: 45,
  solution: ['S', 'K', 'V', 'H', 'W', 'Q~3', 'G'],
  stops: [{ x: 355 }, { x: 560 }, { x: 850 }, { x: 1100 }, { x: 1450 }, { x: 1800 }],
  torches: [
    { x: 120, y: 720 },
    { x: 1100, y: 1080 },
    { x: 1790, y: 1130 },
  ],
  view: { x: 0, y: 440, w: 1900, h: 820 },
};
