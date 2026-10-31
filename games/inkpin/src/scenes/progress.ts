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

/** A level's best: its blots (done, every coin, first try) and the most coins carried out. */
export interface LevelRecord {
  readonly blots: number;
  readonly coins: number;
  readonly allCoins: boolean;
  readonly firstTry: boolean;
}

/** The levels won, by id. A level opens once the one before it is won. */
export interface Progress {
  readonly levels: Readonly<Record<string, LevelRecord>>;
}

const KEY = 'inkpin.progress';

function isRecord(v: unknown): v is LevelRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.blots === 'number' && typeof r.coins === 'number' && typeof r.allCoins === 'boolean' && typeof r.firstTry === 'boolean';
}

export function readProgress(): Progress {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as unknown;
    if (raw && typeof raw === 'object' && 'levels' in raw) {
      const levels: Record<string, LevelRecord> = {};
      for (const [id, rec] of Object.entries((raw as { levels: Record<string, unknown> }).levels ?? {})) if (isRecord(rec)) levels[id] = rec;
      return { levels };
    }
    // The first save kept only the ids won: each counts as done.
    if (raw && typeof raw === 'object' && 'won' in raw && Array.isArray((raw as { won: unknown }).won)) {
      const levels: Record<string, LevelRecord> = {};
      for (const id of (raw as { won: unknown[] }).won) if (typeof id === 'string') levels[id] = { blots: 1, coins: 0, allCoins: false, firstTry: false };
      return { levels };
    }
  } catch {
    // Storage blocked or garbled: start from the first level.
  }
  return { levels: {} };
}

/** True when level `index` of the play order can be played: the first, or the one after a won level. */
export function isOpen(progress: Progress, order: readonly string[], index: number): boolean {
  if (index <= 0) return true;
  // The order runs on across chapters: chapter 2's first level opens after chapter 1's last.
  // TODO paywall: chapter 2 on is the full game; check ownership here once it's sold.
  const before = order[index - 1];
  return before !== undefined && progress.levels[before] !== undefined;
}

/** Records a win, keeping the best of this and earlier ones. */
export function recordWin(id: string, coins: number, allCoins: boolean, firstTry: boolean): Progress {
  const old = readProgress();
  const was = old.levels[id];
  const best = { allCoins: allCoins || (was?.allCoins ?? false), firstTry: firstTry || (was?.firstTry ?? false) };
  const rec: LevelRecord = { ...best, coins: Math.max(coins, was?.coins ?? 0), blots: 1 + (best.allCoins ? 1 : 0) + (best.firstTry ? 1 : 0) };
  const next: Progress = { levels: { ...old.levels, [id]: rec } };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: progress lasts for this visit only.
  }
  return next;
}
