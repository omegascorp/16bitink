import { moveSlot, splitSlot, type Army } from '../../logic/army';
import { sendAll } from '../../logic/heroes';
import { fitSlot } from './armySlots';

/** The two armies on the trade card: the picked hero's first, the one met second. */
export type TradeArmies = readonly [Army, Army];
/** A slot on the trade card: whose army (0 the picked hero's, 1 the other's) and which slot. */
export interface TradeRef {
  readonly side: 0 | 1;
  readonly i: number;
}

const put = (armies: TradeArmies, side: 0 | 1, army: Army): TradeArmies => (side === 0 ? [army, armies[1]] : [armies[0], army]);

/**
 * The company at `from` onto the slot at `to`, as the town and the sheet
 * move them: merged with its like, swapped with another. Across the two
 * armies the one it leaves must still lead a company; null when the move
 * does nothing or isn't allowed.
 */
export function tradeMove(armies: TradeArmies, from: TradeRef, to: TradeRef): TradeArmies | null {
  const same = from.side === to.side;
  const r = moveSlot(armies[from.side], from.i, armies[to.side], to.i, same, true);
  if (!r) return null;
  return same ? put(armies, from.side, r.src) : put(put(armies, from.side, r.src), to.side, r.dst);
}

/** `n` of the company at `at` split off into a new one in the same army; the new one's slot comes back too. */
export function tradeSplit(armies: TradeArmies, at: TradeRef, n: number): { armies: TradeArmies; at: TradeRef } | null {
  const r = splitSlot(armies[at.side], at.i, n);
  return r ? { armies: put(armies, at.side, r.army), at: { side: at.side, i: r.at } } : null;
}

/** Every company of side `from` goes to the other where it fits, `from` keeping its first so it still leads one. */
export function tradeAll(armies: TradeArmies, from: 0 | 1): TradeArmies | null {
  const to = from === 0 ? 1 : 0;
  const r = sendAll(armies[from], armies[to]);
  return r ? put(put(armies, from, r.from), to, r.to) : null;
}

/** Whether side `side` has anything to send the other (more than the one company it must keep). */
export const canSendAll = (armies: TradeArmies, side: 0 | 1): boolean => armies[side].filter(Boolean).length > 1;

/** The biggest slot for a row on the trade card `inner` wide: the hero's face (a slot itself), `gap`, then the seven. */
export const tradeSlot = (inner: number, gap: number): number => fitSlot(Math.floor(((inner - gap) * 7) / 8));
