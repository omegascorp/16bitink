import type { MapDef } from '../src/level/types';
import { afterBattle, answerPrompt, battleSides, endDay, gridOf, ourHeroes, rivalHeroes, type Adventure } from '../src/logic/adventure';
import { autoBattle } from '../src/logic/autoBattle';
import { rivalTurn } from '../src/logic/rival';
import { lordDay } from '../src/logic/lord/day';
import { NO_MEMORY, type LordMemory } from '../src/logic/lord/knowledge';
import { isLord, LORD_HEROES, playLord } from '../src/logic/lord/turn';
import { armyStrength } from '../src/logic/strength';

/**
 * A whole part played AI against AI (docs/inkheroes-design.md, Part 4
 * "Balance"): the lord mind plays the player's side (lordDay on the
 * adventure itself) and the rival's (playLord, fights fought at once), with
 * probes for the doc's targets.
 */

export interface LordRun {
  readonly adv: Adventure;
  readonly won: boolean;
  readonly lost: boolean;
  /** The part's day it ended (or the last played). */
  readonly day: number;
  /** The part's day the rival first struck something of ours (a mine, a dwelling, a town, a hero), if he did. */
  readonly firstStrike?: number;
  /** The part's day each rival building first stood, by id. */
  readonly built: Readonly<Record<string, number>>;
  /** The part's day each neutral town was taken, and by whom. */
  readonly taken: Readonly<Record<string, { day: number; by: 'player' | 'rival' }>>;
  /** Strength of each side's heroes at the end. */
  readonly strength: { readonly ours: number; readonly his: number };
}

const answerAll = (adv: Adventure): Adventure => {
  let a = adv;
  for (let i = 0; i < 60 && a.prompts.length; i++) {
    const p = a.prompts[0]!;
    a = p.kind === 'dwelling' ? { ...a, prompts: a.prompts.slice(1) } : answerPrompt(a, p.kind === 'chest' ? 'gold' : p.kind === 'levelUp' ? p.offer.choices[0] : undefined);
  }
  return a;
};

const heroStrength = (hs: readonly { army: Parameters<typeof armyStrength>[0] }[]): number => hs.reduce((n, h) => n + armyStrength(h.army), 0);

/** What of ours the rival took or hurt between `a` and `b` (his night). */
function struck(a: Adventure, b: Adventure): boolean {
  const flipped = b.objects.some((o) => o.owner === 'rival' && a.objects.find((x) => x.id === o.id)?.owner === 'player')
    || b.towns.some((t) => t.owner === 'rival' && a.towns.find((x) => x.id === t.id)?.owner === 'player');
  const ids = new Set(ourHeroes(b).map((h) => h.id));
  const hurt = ourHeroes(a).some((h) => !ids.has(h.id)) || heroStrength(ourHeroes(b)) < heroStrength(ourHeroes(a)) * 0.97
    || b.towns.some((t) => t.owner === 'player' && armyStrength(t.garrison) < armyStrength(a.towns.find((x) => x.id === t.id)!.garrison) * 0.97);
  return flipped || hurt;
}

/** The rival's night: a lord's fights fought at once; Kassander's rules' fight with us played out by the battle AI (our hero casting too). */
function rivalNight(adv: Adventure, def: MapDef): Adventure {
  if (!adv.rival) return adv;
  if (isLord(def)) return playLord(adv, def, 'auto').adv;
  let r = rivalTurn(adv, def).adv;
  // A town stormed past its gate: its walls are played next.
  for (let i = 0; i < 3 && r.rivalFight && r.status === 'playing'; i++) {
    const s = battleSides(answerAll(r), r.rivalFight);
    r = afterBattle(answerAll(r), def, r.rivalFight, autoBattle(s.attacker, s.defender, s.seed, s.siege));
  }
  return r;
}

/** The share of our strength a foe may have for our side to fight it (1.5 to 1). */
export const PERSON_ODDS = 1 / 1.5;

export function playLordPart(start: Adventure, def: MapDef, maxDays = 70, onDay?: (adv: Adventure, day: number) => void): LordRun {
  let adv = answerAll(start);
  let mem: LordMemory = NO_MEMORY;
  const begun = adv.begun ?? 1;
  const partDay = (a: Adventure): number => a.day - begun + 1;
  let firstStrike: number | undefined;
  const built: Record<string, number> = {};
  const taken: Record<string, { day: number; by: 'player' | 'rival' }> = {};
  const neutral = new Set(adv.towns.filter((t) => t.owner === 'neutral').map((t) => t.id));
  // Our side plays as a person: fights at about 1.5 to 1 (its heroes cast spells), else the lord's rules.
  const rules = { recruits: def.recruits ?? [], maxHeroes: LORD_HEROES, rest: false, resolve: 'auto' as const, dare: PERSON_ODDS, takeAll: true, commit: true };
  while (adv.status === 'playing' && partDay(adv) <= maxDays) {
    const d = lordDay(adv, def, mem, rules);
    adv = answerAll(d.adv);
    mem = d.memory;
    if (adv.status !== 'playing') break;
    const before = endDay(adv, def);
    adv = answerAll(rivalNight(before, def));
    if (firstStrike === undefined && struck(before, adv)) firstStrike = partDay(adv);
    for (const t of adv.towns) {
      if (t.owner === 'rival') for (const b of t.built) built[b] ??= partDay(adv);
      if (neutral.has(t.id) && t.owner !== 'neutral' && !taken[t.id]) taken[t.id] = { day: partDay(adv), by: t.owner as 'player' | 'rival' };
    }
    onDay?.(adv, partDay(adv));
  }
  return {
    adv, won: adv.status === 'won', lost: adv.status === 'lost', day: partDay(adv), ...(firstStrike !== undefined ? { firstStrike } : {}), built, taken,
    strength: { ours: heroStrength(ourHeroes(adv)), his: heroStrength(rivalHeroes(adv)) },
  };
}

/** A fresh start of a later part as a player has it: the chapter's land before it (left of `x`) already seen. */
export function knowsHome(adv: Adventure, def: MapDef, x = 72): Adventure {
  const w = gridOf(def).w;
  return { ...adv, explored: [...adv.explored].map((c, i) => (i % w < x ? '1' : c)).join('') };
}
