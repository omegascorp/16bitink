import type { GameHost } from '@16bitink/game-sdk';
import { covers, loadSave, mergeSaves, parseSaveValue, persistSave, type SaveData } from './save';

/** How long boot waits for the account's progress before playing on the local copy. */
const PULL_TIMEOUT_MS = 4000;

type SaveHost = Pick<GameHost, 'storage' | 'progress'>;

/** Saves on this device and, when signed in, to the player's account. */
export function commitSave(host: SaveHost, save: SaveData): void {
  persistSave(host.storage, save);
  pushToAccount(host, save);
}

/**
 * On boot: folds the account's progress into this device's (and this
 * device's into the account, e.g. levels played before signing in).
 */
export async function pullFromAccount(host: SaveHost): Promise<void> {
  if (!host.progress) return;
  try {
    const remote = parseSaveValue(await withTimeout(host.progress.load(), PULL_TIMEOUT_MS));
    const merged = mergeSaves(loadSave(host.storage), remote);
    persistSave(host.storage, merged);
    if (!covers(remote, merged)) pushToAccount(host, merged);
  } catch (err) {
    console.warn('[inkfish] could not load account progress; playing on this device\'s save', err);
  }
}

function pushToAccount(host: SaveHost, save: SaveData): void {
  host.progress
    ?.save(save, (theirs) => {
      // Another device saved first: keep both, here and in the account.
      const merged = mergeSaves(loadSave(host.storage), parseSaveValue(theirs));
      persistSave(host.storage, merged);
      return merged;
    })
    .catch((err: unknown) => console.warn('[inkfish] could not save progress to your account', err));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e: unknown) => { clearTimeout(timer); reject(e); },
    );
  });
}
