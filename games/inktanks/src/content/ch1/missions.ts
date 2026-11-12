import type { LootTable } from '../../logic/loot';
import type { MissionDef } from '../../logic/mission/types';

/**
 * Loot by stage of the chapter: missions 1–2 field the starter families plus
 * Cannon, Medium and Half-tracks (unlocked by their intel); Rockets and
 * Tracks join from mission 3, Heavy hulls from mission 5.
 */
const EARLY: LootTable = { families: ['machinegun', 'cannon', 'light', 'medium', 'wheels', 'halftracks'], crateMk: [0.75, 0.25, 0], botMk: [0.9, 0.1, 0], kitShare: 0.25, botTaste: { machinegun: 3, light: 3, wheels: 3 } };
const MIDDLE: LootTable = { families: ['machinegun', 'cannon', 'rockets', 'light', 'medium', 'wheels', 'halftracks', 'tracks'], crateMk: [0.7, 0.3, 0], botMk: [0.8, 0.2, 0], kitShare: 0.25 };
const LATE: LootTable = { families: ['machinegun', 'cannon', 'rockets', 'light', 'medium', 'heavy', 'wheels', 'halftracks', 'tracks'], crateMk: [0.65, 0.35, 0], botMk: [0.7, 0.3, 0], kitShare: 0.25 };
/** Mission 1 is the first fight anyone has: its bots are all Mk I. */
const FIRST: LootTable = { ...EARLY, botMk: [1, 0, 0] };
const lootFor = (level: number): LootTable => (level === 1 ? FIRST : level <= 2 ? EARLY : level <= 4 ? MIDDLE : LATE);


/** Chapter 1, Meadowlands: the ten missions (design doc "Levels"). Tuned from the sim. */
const MISSIONS: readonly MissionDef[] = [
  {
    level: 1, name: 'First Drop', type: 'royale', main: { kind: 'royale', top: 3 }, bonus: ['kills3', 'swap2'], storm: 'on', supplyDrops: 0, bots: 4, length: 240,
    teaches: 'Drop, drive, shoot, swap a part, intel', briefing: 'Land on the farm, find better parts in the crates and outlast the storm. Top three passes.',
  },
  {
    level: 2, name: 'Barn Raid', type: 'raid', main: { kind: 'raid', tag: 'target', need: 3 }, bonus: ['noKit', 'intel6'], storm: 'off', supplyDrops: 0, bots: 5, length: 300,
    teaches: 'Breakable targets, the workshop after', briefing: 'The Boars keep their fuel in the orchard. Blow up three barrel stacks.',
  },
  {
    level: 3, name: 'Bridges', type: 'royale', main: { kind: 'royale', top: 3 }, bonus: ['noStorm', 'kills3'], storm: 'on', supplyDrops: 1, length: 300,
    teaches: 'Water, choke points, the storm forcing a crossing', briefing: 'The river splits the land. Two bridges, and the storm will make you cross one.',
  },
  {
    level: 4, name: 'Milk Run', type: 'escort', main: { kind: 'escort', road: 'truck', truckHp: 1400, speed: 60 }, bonus: ['truck75', 'kills3'], storm: 'off', supplyDrops: 0, bots: 6, length: 300,
    teaches: 'Protecting, roofs, close fights', briefing: 'Bring the supply truck down the road to the village. It only drives while you stay near.',
  },
  {
    level: 5, name: 'Weasel Ace', type: 'ace',
    main: { kind: 'ace', ace: { name: 'Sly', crew: 'Weasel', clan: 'weasels', loadout: { gun: { family: 'machinegun', mk: 2 }, hull: { family: 'light', mk: 2 }, drive: { family: 'wheels', mk: 2 } }, hpMult: 1.25 } },
    bonus: ['intel10', 'noKit'], storm: 'off', supplyDrops: 0, bots: 6, length: 300,
    teaches: 'Target choice, rare intel', briefing: 'Sly, a Weasel ace on Mk II Wheels, hides in the woods. Destroy Sly and take the intel.',
  },
  {
    level: 6, name: 'Airdrop', type: 'royale', main: { kind: 'royale', top: 3 }, bonus: ['kills3', 'intel10'], storm: 'on', supplyDrops: 2, length: 330,
    teaches: 'Contested Mk III', briefing: 'Two supply drops fall over the quarry. Each holds a Mk III part, and everyone wants it.',
  },
  {
    level: 7, name: 'Hold the Hill', type: 'hold',
    main: { kind: 'hold', point: 'hill', radius: 220, seconds: 90, waves: [{ at: 25, count: 2 }, { at: 55, count: 3 }, { at: 90, count: 3 }] },
    bonus: ['noKit', 'kills5'], storm: 'off', supplyDrops: 0, bots: 4, length: 300,
    teaches: 'Waves, positioning', briefing: 'Hold the radar hill for 90 seconds. Waves come from every side.',
  },
  {
    level: 8, name: 'Wreck in the Rails', type: 'salvage', main: { kind: 'salvage', at: 'wreck', pickup: 'pickup' }, bonus: ['kills3', 'fast'], storm: 'off', supplyDrops: 0, bots: 7, length: 300,
    teaches: 'Being hunted, cover', briefing: 'A prototype crashed in the rail yard. Take it to the farm. Carrying it slows you and shows you on every minimap.',
  },
  {
    level: 9, name: 'Valley Brawl', type: 'royale', main: { kind: 'royale', top: 1 }, bonus: ['kills5', 'intel10'], storm: 'on', supplyDrops: 2, length: 360,
    teaches: 'Everything', briefing: 'The whole valley but the fort. Last tank standing wins.',
  },
  {
    level: 10, name: 'The Old Fort', type: 'fortress',
    main: {
      kind: 'fortress',
      boss: { name: 'Iron Sow', hp: 2000, speed: 22, road: 'fort', turrets: [{ gun: 'cannon', dx: 30, dy: -34, hp: 260 }, { gun: 'cannon', dx: 30, dy: 34, hp: 260 }, { gun: 'rockets', dx: -34, dy: 0, hp: 300 }, { gun: 'machinegun', dx: 58, dy: 0, hp: 220 }] },
    },
    bonus: ['kills5', 'noStorm'], storm: 'off', supplyDrops: 1, bots: 4, length: 360,
    teaches: 'The chapter boss', briefing: 'The Boars hold the old fort with the Iron Sow, a land fortress. Break its turrets, then the hull.',
  },
];

export const CH1_MISSIONS: readonly MissionDef[] = MISSIONS.map((m) => ({ ...m, loot: m.loot ?? lootFor(m.level) }));

export function ch1Mission(level: number): MissionDef {
  const m = CH1_MISSIONS.find((x) => x.level === level);
  if (!m) throw new Error(`no chapter 1 mission ${level}`);
  return m;
}
