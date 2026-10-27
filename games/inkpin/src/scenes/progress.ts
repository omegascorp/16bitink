/** What the player keeps between visits, in the browser: the bank, and the levels opened and won. */

/** Everything Nib has carried out of the ruins, kept in the browser. */
export interface Bank {
  readonly coins: number;
  readonly idols: number;
}
const BANK_KEY = 'inkpin.bank';

export function readBank(): Bank {
  try {
    const raw = JSON.parse(window.localStorage.getItem(BANK_KEY) ?? 'null') as unknown;
    if (raw && typeof raw === 'object' && 'coins' in raw && 'idols' in raw) {
      const { coins, idols } = raw as { coins: unknown; idols: unknown };
      if (typeof coins === 'number' && typeof idols === 'number') return { coins, idols };
    }
  } catch {
    // Storage blocked or garbled: start an empty bank.
  }
  return { coins: 0, idols: 0 };
}

export function addToBank(coins: number, idols: number): Bank {
  const old = readBank();
  const next = { coins: old.coins + coins, idols: old.idols + idols };
  try {
    window.localStorage.setItem(BANK_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the bank lasts for this visit only.
  }
  return next;
}

/** Which levels the player has opened and won. */
export interface Progress {
  /** Levels 0..unlocked are open to play. */
  readonly unlocked: number;
  /** Ids of the levels won. */
  readonly won: readonly string[];
}

const KEY = 'inkpin.progress';

export function readProgress(): Progress {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as unknown;
    if (raw && typeof raw === 'object' && 'unlocked' in raw && 'won' in raw) {
      const { unlocked, won } = raw as { unlocked: unknown; won: unknown };
      if (typeof unlocked === 'number' && Array.isArray(won) && won.every((w) => typeof w === 'string')) return { unlocked, won: won as string[] };
    }
  } catch {
    // Storage blocked or garbled: start from the first level.
  }
  return { unlocked: 0, won: [] };
}

/** Records a win, opening the next level. */
export function markWon(index: number, id: string): Progress {
  const old = readProgress();
  const next = { unlocked: Math.max(old.unlocked, index + 1), won: old.won.includes(id) ? old.won : [...old.won, id] };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: progress lasts for this visit only.
  }
  return next;
}
