import type { Chapter, LevelDef, PlayerFishId, PowerUpId, SpeciesId, ZoneId } from './types';
import { PLAYER_FISH, ZONE_IDS } from './zones';

const SPECIES: readonly SpeciesId[] = ['minnow', 'perch', 'puffer', 'pike', 'angler', 'eel'];
const POWER_UPS: readonly PowerUpId[] = ['speed', 'shrink'];

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isTriple = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every(isNum);

const isPos = (v: unknown): v is number => isNum(v) && v > 0;
const ascending = (t: readonly number[]): boolean => t.every((x, i) => i === 0 || x > t[i - 1]!);

function hasSaneRanges(l: LevelDef): boolean {
  return (
    l.tiers.every(isPos) && ascending(l.tiers) &&
    l.playerSizes.every(isPos) && ascending(l.playerSizes) &&
    isPos(l.world.width) && isPos(l.world.height) && isPos(l.maxFish) && isPos(l.parTime) &&
    l.hazards.jellyfish >= 0 && l.hazards.hookEverySec >= 0 &&
    l.spawns.every((s) => s.weight > 0 && s.size[0] > 0 && s.size[0] <= s.size[1])
  );
}

function isLevel(v: unknown): v is LevelDef {
  return hasShape(v) && hasSaneRanges(v);
}

function hasShape(v: unknown): v is LevelDef {
  if (typeof v !== 'object' || v === null) return false;
  const l = v as Record<string, unknown>;
  const world = l.world as Record<string, unknown> | undefined;
  const hazards = l.hazards as Record<string, unknown> | undefined;
  return (
    typeof l.id === 'string' && typeof l.name === 'string' && isNum(l.chapter) &&
    isTriple(l.tiers) && isTriple(l.playerSizes) &&
    isNum(world?.width) && isNum(world?.height) &&
    isNum(hazards?.jellyfish) && isNum(hazards?.hookEverySec) &&
    isNum(l.maxFish) && isNum(l.parTime) &&
    Array.isArray(l.powerUps) && l.powerUps.every((p) => POWER_UPS.includes(p as PowerUpId)) &&
    Array.isArray(l.spawns) && l.spawns.length > 0 &&
    l.spawns.every((s: Record<string, unknown>) =>
      SPECIES.includes(s?.species as SpeciesId) && isNum(s?.weight) &&
      Array.isArray(s?.size) && s.size.length === 2 && s.size.every(isNum))
  );
}

/** Validates chapters fetched from the server before the game trusts them. */
export function parseChapters(data: unknown): Chapter[] {
  if (!Array.isArray(data)) throw new Error('Expected an array of chapters');
  return data.map((c, i) => {
    const ch = c as Record<string, unknown>;
    const depth = ch?.depth;
    const d = Array.isArray(depth) && depth.length === 2 && depth.every(isNum) ? (depth as [number, number]) : null;
    const validDepth = d !== null && d[0] >= 0 && d[0] < d[1];
    if (!isNum(ch?.id) || typeof ch.name !== 'string' || !Array.isArray(ch.levels) ||
      !ZONE_IDS.includes(ch.zone as ZoneId) || !PLAYER_FISH.includes(ch.player as PlayerFishId) || !validDepth) {
      throw new Error(`Chapter ${i} is malformed`);
    }
    const bad = ch.levels.findIndex((l) => !isLevel(l));
    if (bad >= 0) throw new Error(`Chapter ${ch.id} level ${bad} is malformed`);
    return {
      id: ch.id, name: ch.name, zone: ch.zone as ZoneId, player: ch.player as PlayerFishId,
      depth: d, levels: ch.levels as LevelDef[],
    };
  });
}
