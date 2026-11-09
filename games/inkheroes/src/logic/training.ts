import { addTroops, setSlot, type Army } from './army';
import { weekOf, type Adventure, type Prompt } from './adventure';
import { creature, lineOf, lineUnits, type CreatureId } from './creatures';
import { SANCTUM_NAMES, SITE_NAMES, type MapObject, type SanctumLook } from './objects';
import { rankOf, RARITY_NAMES, type Rarity } from './rarity';
import { addTo, affordable, canAfford, describeAmount, pay, purse, type Amount, type Purse } from './resources';
import { upgradeCost } from './town';

/**
 * Training on the map (docs/inkheroes-design.md, "Rarity: five ranks"): an
 * Arena of Heroes raises Rare troops to Epic, a chapter's legendary site
 * Epic to Legendary. The visiting hero picks one company; the site trains up
 * to one week's growth of its line (a legendary site half, rounded up),
 * once a week for any hero, for the difference in price (a legendary site
 * also takes gems, the line's level, once a training). Part of a company
 * goes to a free slot or onto a company of the same unit; with no free slot
 * only a whole company under the cap trains.
 */

export type TrainingKind = 'arena' | 'sanctum';
/** The rank each site trains from (it trains to the next). */
const FROM: Readonly<Record<TrainingKind, Rarity>> = { arena: 3, sanctum: 4 };

export const isTrainingSite = (o: Pick<MapObject, 'kind'>): boolean => o.kind === 'arena' || o.kind === 'sanctum';
const kindOf = (o: Pick<MapObject, 'kind'>): TrainingKind => (o.kind === 'sanctum' ? 'sanctum' : 'arena');

/** The rank a site trains from. */
export const trainsFrom = (o: Pick<MapObject, 'kind'>): Rarity => FROM[kindOf(o)];

/** A training site's name on the map: the Arena of Heroes, or the legendary site's own. */
export function trainingName(o: Pick<MapObject, 'kind' | 'look'>): string {
  if (o.kind !== 'sanctum') return SITE_NAMES.arena;
  return SANCTUM_NAMES[o.look as SanctumLook] ?? SITE_NAMES.sanctum;
}

/** The next rank of `id`'s line, or null at the top (or for a unit with no rank). */
export function nextRank(id: CreatureId): CreatureId | null {
  const r = rankOf(id);
  return r ? lineUnits(lineOf(id))[r] ?? null : null;
}

/** How many of `id`'s line the site trains at once: a week's growth, a legendary site half of it, rounded up. */
export function trainCap(o: Pick<MapObject, 'kind'>, id: CreatureId): number {
  const growth = creature(lineOf(id)).growth;
  return kindOf(o) === 'sanctum' ? Math.ceil(growth / 2) : growth;
}

/** A legendary site's fee, once a training: gems, the line's level (1 for Hoplites … 7 for Titans). */
export const trainingFee = (o: Pick<MapObject, 'kind'>, id: CreatureId): Amount => (kindOf(o) === 'sanctum' ? { gems: creature(id).level } : {});

/** What training `count` of `from` to `to` costs: the difference in price for each, and the site's fee. */
export function trainCost(o: Pick<MapObject, 'kind'>, from: CreatureId, to: CreatureId, count: number): Amount {
  const total = addTo(purse(upgradeCost(from, to, count)), trainingFee(o, from));
  return Object.fromEntries(Object.entries(total).filter(([, n]) => n > 0));
}

/** One company the site can train now: which slot, into what, how many and for how much. */
export interface TrainOffer {
  readonly slot: number;
  readonly from: CreatureId;
  readonly to: CreatureId;
  readonly count: number;
  readonly cost: Amount;
}

/** A company of the right rank: what the site would do for it, or why it can't. */
export type TrainCheck = { readonly offer: TrainOffer } | { readonly slot: number; readonly why: string };

/** How many of slot `i` the purse could train, the fee paid first. */
function canPayFor(o: MapObject, from: CreatureId, to: CreatureId, p: Purse): number {
  const fee = trainingFee(o, from);
  return canAfford(p, fee) ? affordable(pay(p, fee), upgradeCost(from, to, 1)) : 0;
}

/** The army once `n` of slot `i` have trained into `to`: the whole company in its place, or part of it to a like company or a free slot (null: no room for it). */
function trainedArmy(army: Army, i: number, to: CreatureId, n: number): Army | null {
  const s = army[i]!;
  if (n >= s.count) return setSlot(army, i, { creature: to, count: s.count });
  return addTroops(setSlot(army, i, { creature: s.creature, count: s.count - n }), to, n);
}

/** What the site does for slot `i` of `army` (null: no company there of the rank it trains). */
export function trainCheck(o: MapObject, army: Army, i: number, p: Purse): TrainCheck | null {
  const s = army[i];
  const to = s && rankOf(s.creature) === trainsFrom(o) ? nextRank(s.creature) : null;
  if (!s || !to) return null;
  const cap = trainCap(o, s.creature);
  const n = Math.min(s.count, cap, canPayFor(o, s.creature, to, p));
  const name = creature(s.creature).plural;
  if (n <= 0) return { slot: i, why: `${name}: the purse can't pay to train one (${describeAmount(trainCost(o, s.creature, to, 1))}).` };
  if (!trainedArmy(army, i, to, n)) return { slot: i, why: `${name}: no free slot, so only a whole company of ${cap} or fewer can train here.` };
  return { offer: { slot: i, from: s.creature, to, count: n, cost: trainCost(o, s.creature, to, n) } };
}

/** Every company of the right rank in `army`, with what the site would do for each. */
export const trainChecks = (o: MapObject, army: Army, p: Purse): TrainCheck[] =>
  army.flatMap((_, i) => trainCheck(o, army, i, p) ?? []);

/** The offers among the checks, the strongest line first. */
export const trainOffers = (o: MapObject, army: Army, p: Purse): TrainOffer[] =>
  trainChecks(o, army, p).flatMap((c) => ('offer' in c ? [c.offer] : [])).sort((a, b) => creature(b.from).level - creature(a.from).level);

/** How a training site reads on the map: what it trains, and whether it has trained this `week`. */
export function trainingWords(o: MapObject, week: number): string {
  const from = trainsFrom(o);
  const done = o.week === week ? ' (trained this week)' : '';
  return `${trainingName(o)}: trains ${RARITY_NAMES[from]} troops to ${RARITY_NAMES[(from + 1) as Rarity]}, once a week${done}`;
}

const message = (adv: Adventure, title: string, text: string): Adventure => ({ ...adv, prompts: [...adv.prompts, { kind: 'message', title, text }] });

/** The hero at a training site: its choice of companies, or why there is nothing to do. */
export function visitTraining(adv: Adventure, o: MapObject): Adventure {
  const name = trainingName(o);
  const from = RARITY_NAMES[trainsFrom(o)];
  const to = RARITY_NAMES[(trainsFrom(o) + 1) as Rarity];
  if (o.week === weekOf(adv.day)) return message(adv, name, 'The trainers have done their week’s work. Come back on Monday.');
  const checks = trainChecks(o, adv.hero.army, adv.purse);
  if (!checks.length) return message(adv, name, `Only ${from} troops train here, to ${to}, and ${adv.hero.name} leads none.`);
  if (!checks.some((c) => 'offer' in c)) return message(adv, name, checks.map((c) => ('why' in c ? c.why : '')).join('\n'));
  return { ...adv, prompts: [...adv.prompts, { kind: 'train', id: o.id }] };
}

/** Answers the site's card: the company in `slot` trains (as many as the site and the purse allow), or (no slot) the hero leaves. */
export function trainAt(adv: Adventure, slot?: number): Adventure {
  const [first, ...rest] = adv.prompts;
  if (first?.kind !== 'train') return adv;
  const o = adv.objects.find((x) => x.id === first.id);
  const check = o && slot !== undefined ? trainCheck(o, adv.hero.army, slot, adv.purse) : null;
  if (!o || !check || !('offer' in check)) return { ...adv, prompts: rest };
  const { offer } = check;
  const army = trainedArmy(adv.hero.army, slot!, offer.to, offer.count)!;
  const done: Prompt = { kind: 'message', title: trainingName(o), text: `${offer.count} ${creature(offer.from).plural} come out ${RARITY_NAMES[rankOf(offer.to)!]}: ${creature(offer.to).plural}.` };
  return {
    ...adv,
    purse: pay(adv.purse, offer.cost),
    hero: { ...adv.hero, army },
    objects: adv.objects.map((x) => (x.id === o.id ? { ...x, week: weekOf(adv.day) } : x)),
    prompts: [done, ...rest],
  };
}
