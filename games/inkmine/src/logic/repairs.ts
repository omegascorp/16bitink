import { recipeOf } from './blueprints';
import { fitInventories, hasOnHand, onHand, spend, type PrintResult, type Profile } from './economy';
import { countOf, holdEntries, type Hold } from './hold';
import { ORES } from './ore';
import { hasBeat, tradeLine } from './story';
import { hasTool, TOOL_KINDS } from './tools';

/**
 * Chapter 1's spine (spec, "What to do: needs, not missions"): the lander
 * came down hard after the wormhole, and the suit lists what's broken. Each
 * repair takes ore straight from the cargo (then the bag), no parts to
 * craft first, and opens something you use at once, the way No Man's Sky's
 * crash-and-repair opening does. The printer is first, the radio second,
 * the hull and the thrusters in either order. The drive core can't be
 * printed: the local aliens make it, and when it's in, the lander flies and
 * chapter 1 ends.
 *
 * Ids are saved: never change one.
 */
export const REPAIR_IDS = ['printer', 'comms', 'hull', 'thrusters', 'core'] as const;
export type RepairId = (typeof REPAIR_IDS)[number];

export interface Repair {
  readonly id: RepairId;
  readonly name: string;
  /** What's wrong, as the suit reports it. */
  readonly broken: string;
  /** Ore it takes; null for a part that can't be printed. */
  readonly needs: Hold | null;
  /** Repairs that must be done first. */
  readonly after: readonly RepairId[];
  /** What it opens, said when it's done. */
  readonly opens: string;
  /** A real fact for the field guide. */
  readonly fact?: string;
}

export const REPAIRS: Readonly<Record<RepairId, Repair>> = {
  printer: {
    id: 'printer', name: 'Printer', needs: { copper: 6 }, after: [],
    broken: "Its feed head is cracked: nothing can be printed, gear or parts.",
    opens: 'The printer works: gear from blueprints, parts for the lander.',
    fact: "Copper carries the printer's power: it's the best cheap conductor there is.",
  },
  comms: {
    id: 'comms', name: 'Radio', needs: { copper: 4, quartz: 2 }, after: ['printer'],
    broken: "The radio cracked in the landing, and the dish hangs by its cable. There's no link to the guild.",
    opens: "The radio works. No guild, this far out; but something out there is calling.",
    fact: 'Quartz crystals keep radios on frequency: they ring at a rate that never drifts.',
  },
  hull: {
    id: 'hull', name: 'Hull plating', needs: { galena: 10, graphite: 6 }, after: ['comms'],
    broken: 'The hull is breached: six cargo slots are open to the dust.',
    opens: 'The hull is sealed: the whole cargo hold is usable again.',
    fact: "Lead, smelted from galena, shields against radiation.",
  },
  thrusters: {
    id: 'thrusters', name: 'Thrusters', needs: { silver: 6, quartz: 4 }, after: ['comms'],
    broken: 'The thrusters took the landing: the engine bell is crumpled and the wiring burnt.',
    opens: "The thrusters fire. With a drive core, she'd fly.",
    fact: 'Silver conducts electricity better than any other metal.',
  },
  core: {
    id: 'core', name: 'Drive core', needs: null, after: ['hull', 'thrusters'],
    broken: 'Cracked in the wormhole. Nothing you can print will fix it.',
    opens: 'The drive works. Where to?',
  },
};

export type RepairCheck = 'ok' | 'done' | 'order' | 'materials' | 'given';

export function isRepaired(p: Profile, id: RepairId): boolean {
  return p.repaired.includes(id);
}

/** Whether a repair can be done now, or why not. */
export function canRepair(p: Profile, id: RepairId): RepairCheck {
  const r = REPAIRS[id];
  if (isRepaired(p, id)) return 'done';
  if (!r.after.every((a) => isRepaired(p, a))) return 'order';
  // The drive core can't be printed: it's the Lamplighters' to give (story.ts).
  if (!r.needs) return hasBeat(p, 'core') ? 'ok' : 'given';
  return hasOnHand(p)(r.needs) ? 'ok' : 'materials';
}

/** Repairs a part: its ore out of the cargo (then the bag). */
export function repair(p: Profile, id: RepairId): PrintResult<RepairCheck> {
  const why = canRepair(p, id);
  if (why !== 'ok') return { ok: false, why };
  const needs = REPAIRS[id].needs;
  const spent = needs ? spend(p, needs) : p;
  return { ok: true, profile: fitInventories({ ...spent, repaired: [...spent.repaired, id] }) };
}

/** Which of the lander's visible systems are still broken, for drawing it. */
export interface Wreck {
  readonly printer: boolean;
  readonly comms: boolean;
  readonly hull: boolean;
  readonly thrusters: boolean;
}

export function wreckOf(p: Profile): Wreck {
  return { printer: !isRepaired(p, 'printer'), comms: !isRepaired(p, 'comms'), hull: !isRepaired(p, 'hull'), thrusters: !isRepaired(p, 'thrusters') };
}

/** The one thing to do next, shown on the HUD. */
export type Goal =
  | { readonly kind: 'repair'; readonly id: RepairId }
  /** A blueprint the next repair can't be reached without, lying somewhere on the planet. */
  | { readonly kind: 'find'; readonly blueprint: string }
  /** Found, now print it aboard. */
  | { readonly kind: 'print'; readonly blueprint: string }
  /** The call came in: print a receiver to follow it. */
  | { readonly kind: 'receiver' }
  /** Follow the call with the receiver, by its strength, to the Lamplighters. */
  | { readonly kind: 'signal' }
  /** Bring the Lamplighters what they asked for, in the bag. */
  | { readonly kind: 'trade' }
  /** Paid and the ship whole: go back to them for the core. */
  | { readonly kind: 'collect' }
  /** The core is in: chapter 1 is over. */
  | { readonly kind: 'done' };

/** The drill that breaks Graphite's stone: the radio needs quartz, which lies in it. */
const STONE_DRILL = 'drill-1';

/**
 * What to do next: the printer, then (as quartz lies in stone) finding and
 * printing the drill, then the radio; then following the call to the
 * Lamplighters, the hull and the thrusters, bringing the Lamplighters their
 * silver, and last fitting the drive core they give you. One goal at a
 * time, never none: the complaint about No Man's Sky's start is the stretch
 * with no prompt.
 */
export function currentGoal(p: Profile): Goal {
  if (!isRepaired(p, 'printer')) return { kind: 'repair', id: 'printer' };
  const drill = recipeOf(STONE_DRILL)!;
  if (p.gear.drill < drill.mk) return p.found.includes(STONE_DRILL) ? { kind: 'print', blueprint: STONE_DRILL } : { kind: 'find', blueprint: STONE_DRILL };
  if (!isRepaired(p, 'comms')) return { kind: 'repair', id: 'comms' };
  if (!hasBeat(p, 'met')) return hasTool(p, 'receiver') ? { kind: 'signal' } : { kind: 'receiver' };
  const next = REPAIR_IDS.find((id) => id !== 'core' && !isRepaired(p, id));
  if (next) return { kind: 'repair', id: next };
  if (!hasBeat(p, 'core')) return hasBeat(p, 'paid') ? { kind: 'collect' } : { kind: 'trade' };
  return isRepaired(p, 'core') ? { kind: 'done' } : { kind: 'repair', id: 'core' };
}

/** "native copper 3/6 · quartz 0/2": what a repair needs against what's on hand. */
export function needsLine(need: Hold, have: Hold): string {
  return holdEntries(need).map(([ore, n]) => `${ORES[ore].name} ${Math.min(countOf(have, ore), n)}/${n}`).join(' · ');
}

/** The goal as one line for the HUD. */
export function goalLine(p: Profile, g: Goal): string {
  if (g.kind === 'find') return 'Stone is too hard for the starter drill. Find the drill blueprint: follow the beacon';
  if (g.kind === 'print') return `Print the ${recipeOf(g.blueprint)!.piece} Mk ${recipeOf(g.blueprint)!.mk}: go aboard (L at the lander)`;
  if (g.kind === 'receiver') {
    const need = TOOL_KINDS.receiver.recipe;
    const how = hasOnHand(p)(need) ? 'go aboard (L at the lander)' : needsLine(need, onHand(p));
    return `The radio caught a call from somewhere over the horizon. Print a receiver to follow it: ${how}`;
  }
  if (g.kind === 'signal') return 'Follow the call with the receiver: the more bars, the closer you are';
  if (g.kind === 'trade') return `The Lamplighters want silver from deep down for a drive core. Bring it in your bag: ${tradeLine(p.suit, (ore) => ORES[ore as keyof typeof ORES].name)}`;
  if (g.kind === 'collect') return 'Your ship is whole: go back to the Lamplighters for the drive core';
  if (g.kind === 'done') return 'The drive works. Where to?';
  const r = REPAIRS[g.id];
  const label = `Repair the ${r.name.toLowerCase()}`;
  if (!r.needs) return hasBeat(p, 'core') ? 'Fit the drive core: go aboard (L at the lander)' : `${label}: the Lamplighters can make one`;
  return hasOnHand(p)(r.needs) ? `${label}: go aboard (L at the lander)` : `${label}: ${needsLine(r.needs, onHand(p))}`;
}
