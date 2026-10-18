import { blueprintId, recipeOf } from './blueprints';
import { PIECES } from './gear';
import { fitInventories, hasOnHand, onHand, spend, type PrintResult, type Profile } from './economy';
import { fuelOre, ROUND_TRIP } from './fuel';
import { countOf, holdEntries, type Hold } from './hold';
import { ORES } from './ore';
import { HEART, hasBeat, RAISE, REEF_TRADE, tradeLine, WAKE } from './story';
import { FIRST_COURSE, isFixed, shipFuelOre, STARSHIP, STARSHIP_IDS, type StarshipId } from './starship';
import { worldById } from './starSystem';
import { tripFuel } from './travel';
import type { WorldId } from './worlds';
import { hasTool, TOOL_KINDS } from './tools';

/**
 * Chapter 1's spine (spec, "What to do: needs, not missions"): the lander
 * came down hard after the wormhole, and the suit lists what's broken. Each
 * repair takes ore straight from the cargo (then the bag), no parts to
 * craft first, and opens something you use at once, the way No Man's Sky's
 * crash-and-repair opening does. The printer is first, then the hull and
 * the thrusters in either order, and the radio last: the moment it works,
 * the call comes in that leads to the drive core. The core can't be
 * printed: the local aliens make it. With it in and the tank filled
 * (fuel.ts), the lander flies up to the ship in orbit and chapter 1 ends.
 *
 * Ids are saved: never change one.
 */
export const REPAIR_IDS = ['printer', 'hull', 'thrusters', 'comms', 'core'] as const;
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
    id: 'comms', name: 'Radio', needs: { copper: 4, quartz: 2 }, after: ['hull', 'thrusters'],
    broken: "The radio cracked in the landing, and the dish hangs by its cable. There's no link to the guild.",
    opens: "The radio works. No guild, this far out; but something out there is calling.",
    fact: 'Quartz crystals keep radios on frequency: they ring at a rate that never drifts.',
  },
  hull: {
    id: 'hull', name: 'Hull plating', needs: { graphite: 10, galena: 3 }, after: ['printer'],
    broken: 'The hull is breached: six cargo slots are open to the dust.',
    opens: 'The hull is sealed: the whole cargo hold is usable again.',
    fact: "Graphite fibres make light, stiff panels; lead only seals the seams. A lead hull would be heavy, and cosmic rays hitting it spray more radiation.",
  },
  thrusters: {
    id: 'thrusters', name: 'Thrusters', needs: { copper: 6, silver: 6, graphite: 2 }, after: ['printer'],
    broken: 'The thrusters took the landing: the engine bell is crumpled and the wiring burnt.',
    opens: "The thrusters fire. With a drive core, it would fly; and with the radio working, you might find out where to get one.",
    fact: 'Rocket chambers are lined with copper and a little silver: it pulls the heat away before the wall can melt. The nozzle throat is graphite.',
  },
  core: {
    id: 'core', name: 'Drive core', needs: null, after: ['comms'],
    broken: 'Cracked in the wormhole. Nothing you can print will fix it.',
    opens: 'The drive works. Fill the tank, and the lander can climb to the ship.',
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
  /** A blueprint the next repair can't be reached without, learnt by studying a broken one somewhere on the planet. */
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
  /** The core is in: fill the tank for the climb to orbit and back (fuel.ts). */
  | { readonly kind: 'fuel' }
  /** Fuelled: lift off and fly up to the starship. */
  | { readonly kind: 'liftoff' }
  /** Aboard (or back down for the ore): mend the starship's next system (starship.ts). */
  | { readonly kind: 'starship'; readonly id: StarshipId }
  /** The ship's mended: fill its tank for the first trip. */
  | { readonly kind: 'shipFuel' }
  /** Set course for the first sister moon on the star map. */
  | { readonly kind: 'course' }
  /** Course set: chapter 1 is over. */
  | { readonly kind: 'done' }
  /** In orbit over a world not yet landed on: go down (Mycel when `world` isn't given). */
  | { readonly kind: 'land'; readonly world?: WorldId }
  /** On Mycel: follow the Aster lander's distress beacon with the receiver, by its strength, to the wreck. */
  | { readonly kind: 'distress' }
  /** The Aster's resonator studied: print the pulse, your first weapon (tools.ts). */
  | { readonly kind: 'pulse' }
  /** A world's drill printed: study the rest of its set's designs (Mk 2 on Mycel, the Aster crew's gear; Mk 3 on Brine, the Tidesingers' old tools). */
  | { readonly kind: 'explore'; readonly found: number; readonly of: number; readonly mk?: number }
  /** Every Mk 2 design found: follow the faint signal under the beacon's, east, to where the crew went (the Aster's camp). */
  | { readonly kind: 'trail' }
  /** At the camp: bring the sleep pod its charge, in the bag (story.ts WAKE). */
  | { readonly kind: 'wake' }
  /** The last of the Aster awake: its crew flew to Brine. Fit the tank it drew for you (starship.ts asterTank). */
  | { readonly kind: 'brine' }
  /** The Aster tank fitted: fill the ship's tank for a trip to `to`. */
  | { readonly kind: 'tripFuel'; readonly to: WorldId }
  /** Fuelled: set course for `to` on the star map. */
  | { readonly kind: 'setCourse'; readonly to: WorldId }
  /** On Brine: swim out to the Aster craft the telescope saw on the reef. */
  | { readonly kind: 'craft' }
  /** Dive and follow the Tidesingers' song, heard only under water, to their reef. */
  | { readonly kind: 'song' }
  /** Bring the Tidesingers the copper they asked for, in the bag. */
  | { readonly kind: 'reefTrade' }
  /** The crew drew the rebreather: print it. */
  | { readonly kind: 'rebreather' }
  /** Bring the Aster crew iron for their craft's hull, in the bag, at the reef. */
  | { readonly kind: 'raise' }
  /** The craft is up: bring its new heart's ore to it, in the bag. */
  | { readonly kind: 'heart' }
  /** The craft hums, but its drive crystal fell into the Leviathan's cave: fetch it. */
  | { readonly kind: 'crystal' }
  /** Bring the crystal to the craft. */
  | { readonly kind: 'flight' }
  /** Back on Mycel: the crew flew home; meet them at their camp. */
  | { readonly kind: 'reunion' }
  /** The four Aster together again, and their star chart yours: the end of chapter 3. */
  | { readonly kind: 'brineEnd' };

/** The drill that breaks Graphite's stone: the thrusters' silver and the radio's quartz lie in it. */
const STONE_DRILL = 'drill-1';
/** Mycel's drill: its stone, and the rest of its gear, wait on it. */
const MYCEL_DRILL = 'drill-2';
/** Mycel's set of designs to study, Mk 2 (the beacon leads to the nearest one not yet learnt). */
export const MYCEL_SET = PIECES.map((piece) => blueprintId(piece, 2));
/** Brine's drill, given by the Tidesingers for their copper. */
const BRINE_DRILL = 'drill-3';
/** Brine's set of designs, Mk 3: the drill from the Tidesingers, the rest from their drowned village. */
export const BRINE_SET = PIECES.map((piece) => blueprintId(piece, 3));

/** Whether every Mk 3 design is learnt: then the crew ask for the hull patch (story.ts reefVisit). */
export const brineSetFound = (p: Pick<Profile, 'found'>): boolean => BRINE_SET.every((id) => p.found.includes(id));

/**
 * Chapter 2, on Mycel: land, follow the distress beacon to the Aster lander's
 * wreck, study their resonator by it and print the pulse (Mycel has
 * creatures, and the deeper the fiercer), then find and print its drill (its
 * stone won't break for Graphite's), then study the rest of the Aster crew's
 * gear round the wreck. Then the crew's trail east to their camp, where the
 * last of them sleeps in a pod that needs power; woken, it shows where the
 * others went: Brine.
 */
function mycelGoal(p: Profile): Goal {
  if (!p.visited.includes('mycel')) return { kind: 'land' };
  if (!hasBeat(p, 'asterFound')) return { kind: 'distress' };
  // Their resonator first, lying in the open by the wreck: the stone round it is where things live.
  if (!p.found.includes('pulse')) return { kind: 'find', blueprint: 'pulse' };
  if (!hasTool(p, 'pulse')) return { kind: 'pulse' };
  const drill = recipeOf(MYCEL_DRILL)!;
  if (p.gear.drill < drill.mk) return p.found.includes(MYCEL_DRILL) ? { kind: 'print', blueprint: MYCEL_DRILL } : { kind: 'find', blueprint: MYCEL_DRILL };
  const found = MYCEL_SET.filter((id) => p.found.includes(id)).length;
  if (found < MYCEL_SET.length) return { kind: 'explore', found, of: MYCEL_SET.length };
  if (!hasBeat(p, 'asterCamp')) return { kind: 'trail' };
  if (!hasBeat(p, 'asterWoken')) return { kind: 'wake' };
  // On to Brine: fit the tank the Aster drew, fill it and set course.
  if (!isFixed(p, 'asterTank')) return { kind: 'brine' };
  return tripGoal(p, 'brine');
}

/** A world's name, for the goal lines. */
const worldName = (id: WorldId): string => worldById(id)?.name ?? id;

/** What the trip to `to` burns from where you are (from Mycel if you're there already). */
const tripTo = (p: Profile, to: WorldId): number => tripFuel(p.at === to ? (to === 'mycel' ? 'brine' : 'mycel') : p.at, to) ?? 0;
const brineTrip = (p: Profile): number => tripTo(p, 'brine');

/** Fill the ship's tank for `to`, or, filled, set course for it. */
const tripGoal = (p: Profile, to: WorldId): Goal => (p.shipFuel >= tripTo(p, to) ? { kind: 'setCourse', to } : { kind: 'tripFuel', to });

/**
 * Chapter 3, on Brine (spec, "Brine: The story"): land, swim out to the
 * crew's sunk craft, follow the Tidesingers' song down to their reef, bring
 * them copper (they give the Mk 3 drill's design, and let you in to the
 * crew, who give the rebreather's), print both, study the Tidesingers' old
 * tools in their drowned village, then raise the crew's craft (iron for its
 * hull) and give it a new heart. Its drive crystal fell into the flooded
 * underworld, by the sleeping Leviathan: fetch it and the crew fly home to
 * Mycel, where the four Aster meet again at their camp.
 */
function brineGoal(p: Profile): Goal {
  if (!p.visited.includes('brine')) return { kind: 'land', world: 'brine' };
  if (!hasBeat(p, 'craftFound')) return { kind: 'craft' };
  if (!hasBeat(p, 'reefMet')) return { kind: 'song' };
  if (!hasBeat(p, 'reefPaid')) return { kind: 'reefTrade' };
  if (p.gear.drill < recipeOf(BRINE_DRILL)!.mk) return { kind: 'print', blueprint: BRINE_DRILL };
  if (!hasTool(p, 'rebreather')) return { kind: 'rebreather' };
  const found = BRINE_SET.filter((id) => p.found.includes(id)).length;
  if (found < BRINE_SET.length) return { kind: 'explore', found, of: BRINE_SET.length, mk: 3 };
  if (!hasBeat(p, 'craftRaised')) return { kind: 'raise' };
  if (!hasBeat(p, 'craftMended')) return { kind: 'heart' };
  if (!hasBeat(p, 'crystalFound')) return { kind: 'crystal' };
  if (!hasBeat(p, 'craftFlown')) return { kind: 'flight' };
  if (hasBeat(p, 'asterReunion')) return { kind: 'brineEnd' };
  return p.at === 'mycel' ? { kind: 'reunion' } : tripGoal(p, 'mycel');
}

/**
 * What to do next: the printer, the hull (its ore lies in the soil), then
 * (as silver and quartz lie in stone) finding and printing the drill, the
 * thrusters, and the radio last; then following the call to the
 * Lamplighters, bringing them their silver, fitting the drive core they
 * give you, and filling the tank. One goal at a time, never none: the
 * complaint about No Man's Sky's start is the stretch with no prompt.
 */
export function currentGoal(p: Profile): Goal {
  if (p.at === 'brine' || p.visited.includes('brine')) return brineGoal(p);
  if (p.at === 'mycel' || p.visited.includes('mycel')) return mycelGoal(p);
  if (!isRepaired(p, 'printer')) return { kind: 'repair', id: 'printer' };
  if (!isRepaired(p, 'hull')) return { kind: 'repair', id: 'hull' };
  const drill = recipeOf(STONE_DRILL)!;
  if (p.gear.drill < drill.mk) return p.found.includes(STONE_DRILL) ? { kind: 'print', blueprint: STONE_DRILL } : { kind: 'find', blueprint: STONE_DRILL };
  const next = REPAIR_IDS.find((id) => id !== 'core' && !isRepaired(p, id));
  if (next) return { kind: 'repair', id: next };
  if (!hasBeat(p, 'met')) return hasTool(p, 'receiver') ? { kind: 'signal' } : { kind: 'receiver' };
  if (!hasBeat(p, 'core')) return hasBeat(p, 'paid') ? { kind: 'collect' } : { kind: 'trade' };
  if (!isRepaired(p, 'core')) return { kind: 'repair', id: 'core' };
  if (!hasBeat(p, 'flown')) return p.fuel >= ROUND_TRIP ? { kind: 'liftoff' } : { kind: 'fuel' };
  const broken = STARSHIP_IDS.find((id) => !isFixed(p, id));
  if (broken) return { kind: 'starship', id: broken };
  if (hasBeat(p, 'course')) return { kind: 'done' };
  return p.shipFuel >= FIRST_COURSE.fuel ? { kind: 'course' } : { kind: 'shipFuel' };
}

/** "native copper 3/6 · quartz 0/2": what a repair needs against what's on hand. */
export function needsLine(need: Hold, have: Hold): string {
  return holdEntries(need).map(([ore, n]) => `${ORES[ore].name} ${Math.min(countOf(have, ore), n)}/${n}`).join(' · ');
}

/** The goal as one line for the HUD. */
export function goalLine(p: Profile, g: Goal): string {
  if (g.kind === 'find' && g.blueprint === 'pulse') return "Something of the Aster's lies by their wreck that isn't gear: study it. Follow the beacon";
  if (g.kind === 'pulse') {
    const need = TOOL_KINDS.pulse.recipe;
    return `Print the pulse, the Aster's weapon rebuilt your way: ${hasOnHand(p)(need) ? 'go aboard (L at the lander)' : needsLine(need, onHand(p))}`;
  }
  if (g.kind === 'find') return g.blueprint === MYCEL_DRILL ? "Mycel's stone is too hard for Graphite's drill. Study the Aster crew's broken drill near their wreck: follow the beacon" : 'Stone is too hard for the starter drill. Find a broken drill to study: follow the beacon';
  if (g.kind === 'land') return `Land on ${g.world === 'brine' ? 'Brine' : 'Mycel'}: Land, top right`;
  if (g.kind === 'distress') return "Follow the Aster's distress call with the receiver: the more bars, the closer you are";
  if (g.kind === 'explore' && g.mk === 3) return `The Tidesingers' old village lies drowned under the shelf west of the reef: study their broken tools for designs. Mk 3 designs ${g.found}/${g.of}`;
  if (g.kind === 'explore') return `The Aster crew's gear lies round their wreck: study each broken piece for its design. Mk 2 designs ${g.found}/${g.of}`;
  if (g.kind === 'trail') return "The crew's pictures showed them walking east. Under the beacon's pulses the receiver picks out a fainter one, slow as a heartbeat: follow it";
  if (g.kind === 'wake') return `The last of the Aster sleeps in a pod whose power is failing. Bring it a charge in your bag: ${tradeLine(p.suit, (ore) => ORES[ore as keyof typeof ORES].name, WAKE)}`;
  if (g.kind === 'brine') {
    const need = STARSHIP.asterTank.needs!;
    const how = hasOnHand(p)(need) ? (p.docked ? 'fit it on the Starship tab' : 'fly up to your ship (L at the lander)') : `${needsLine(need, onHand(p))}, carried up in the lander`;
    return `The Aster's crew flew to Brine and never called back. Fit the tank the Aster drew for you, to reach it: ${how}`;
  }
  if (g.kind === 'tripFuel') {
    const want = tripTo(p, g.to);
    const water = Math.min(countOf(onHand(p), shipFuelOre(p)), want - p.shipFuel);
    const how = p.shipFuel + water >= want ? (p.docked ? 'refill it on the Starship tab' : 'fly up to it (L at the lander)') : `${ORES[shipFuelOre(p)].name} ${p.shipFuel + water}/${want}, carried up in the lander`;
    return `${g.to === 'mycel' ? 'The crew flew home to Mycel. ' : ''}Fill your ship's tank for the trip to ${worldName(g.to)}: ${how}`;
  }
  if (g.kind === 'setCourse') return `${g.to === 'mycel' ? 'The crew flew home. ' : ''}Set course for ${worldName(g.to)}: ${p.docked ? 'the star map, on the Starship tab' : 'fly up to your ship (L at the lander)'}`;
  if (g.kind === 'craft') return "The telescope saw something bright on the reef east of the island: swim out to it. Follow the beacon";
  if (g.kind === 'song') return 'Radio dies in seawater, but sound carries: put your helmet under water and follow the song. The more bars, the closer';
  if (g.kind === 'reefTrade') return `The Tidesingers want copper from inside the rock. Bring it in your bag: ${tradeLine(p.suit, (ore) => ORES[ore as keyof typeof ORES].name, REEF_TRADE)}`;
  if (g.kind === 'rebreather') {
    const need = TOOL_KINDS.rebreather.recipe;
    return `Print the rebreather the crew drew for you: ${hasOnHand(p)(need) ? 'go aboard (L at the lander)' : needsLine(need, onHand(p))}`;
  }
  if (g.kind === 'raise') return `The crew's craft has a cracked hull. Bring them iron to patch it, at the reef: ${tradeLine(p.suit, (ore) => ORES[ore as keyof typeof ORES].name, RAISE)}`;
  if (g.kind === 'heart') return `The craft is up, but its cell drowned. Bring it a new heart: ${tradeLine(p.suit, (ore) => ORES[ore as keyof typeof ORES].name, HEART)}`;
  if (g.kind === 'crystal') return "The craft's drive crystal fell down a crack into the flooded underworld, where something huge sleeps. Fetch it, quietly: drilling near it wakes it. Follow the beacon";
  if (g.kind === 'flight') return 'Bring the drive crystal to the crew\'s craft over the reef. Follow the beacon';
  if (g.kind === 'reunion') return p.docked ? 'The crew flew home to their camp on Mycel: land and go to them' : 'The crew flew home: meet them at their camp in the east. Follow the beacon';
  if (g.kind === 'brineEnd') return "The end of chapter 3. The Aster's star chart shows the way to Talus: chapter 4 is coming";
  if (g.kind === 'print') return `Print the ${recipeOf(g.blueprint)!.piece} Mk ${recipeOf(g.blueprint)!.mk}: go aboard (L at the lander)`;
  if (g.kind === 'receiver') {
    const need = TOOL_KINDS.receiver.recipe;
    const how = hasOnHand(p)(need) ? 'go aboard (L at the lander)' : needsLine(need, onHand(p));
    return `The radio caught a call from somewhere over the horizon. Print a receiver to follow it: ${how}`;
  }
  if (g.kind === 'signal') return 'Follow the call with the receiver: the more bars, the closer you are';
  if (g.kind === 'trade') return `The Lamplighters want silver from deep down for a drive core. Bring it in your bag: ${tradeLine(p.suit, (ore) => ORES[ore as keyof typeof ORES].name)}`;
  if (g.kind === 'collect') return 'Your ship is whole: go back to the Lamplighters for the drive core';
  if (g.kind === 'fuel') {
    const ice = Math.min(countOf(onHand(p), fuelOre(p)), ROUND_TRIP - p.fuel);
    return p.fuel + ice >= ROUND_TRIP ? 'Fill the tank to fly up to your ship and back: go aboard (L at the lander) and refill' : `Fill the tank to fly up to your ship and back: ${ORES[fuelOre(p)].name} ${p.fuel + ice}/${ROUND_TRIP}`;
  }
  if (g.kind === 'liftoff') return 'Lift off and fly up to your ship: go aboard (L at the lander)';
  if (g.kind === 'starship') {
    const s = STARSHIP[g.id];
    const need = s.needs!;
    const how = hasOnHand(p)(need) ? (p.docked ? 'mend it on the Starship tab' : 'fly up to it (L at the lander)') : `${needsLine(need, onHand(p))}, carried up in the lander`;
    return `Mend your ship's ${s.name.toLowerCase()}: ${how}`;
  }
  if (g.kind === 'shipFuel') {
    const ice = Math.min(countOf(onHand(p), shipFuelOre(p)), FIRST_COURSE.fuel - p.shipFuel);
    const how = p.shipFuel + ice >= FIRST_COURSE.fuel ? (p.docked ? 'refill it on the Starship tab' : 'fly up to it (L at the lander)') : `${ORES[shipFuelOre(p)].name} ${p.shipFuel + ice}/${FIRST_COURSE.fuel}, carried up in the lander`;
    return `Fill your ship's tank for the trip to Mycel: ${how}`;
  }
  if (g.kind === 'course') return p.docked ? 'Set course for Mycel: the star map, on the Starship tab' : 'Set course for Mycel: fly up to your ship (L at the lander)';
  if (g.kind === 'done') return 'Course set for Mycel: the next chapter goes there';
  const r = REPAIRS[g.id];
  const label = `Repair the ${r.name.toLowerCase()}`;
  if (!r.needs) return hasBeat(p, 'core') ? 'Fit the drive core: go aboard (L at the lander)' : `${label}: the Lamplighters can make one`;
  return hasOnHand(p)(r.needs) ? `${label}: go aboard (L at the lander)` : `${label}: ${needsLine(r.needs, onHand(p))}`;
}
