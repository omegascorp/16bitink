import type { GameHost } from '@16bitink/game-sdk';
import { coversProgress, loadProgress, mergeProgress, parseProgress, saveProgress, type Progress } from './save';

/** How long boot waits for the account's progress before playing on the local copy. */
const PULL_TIMEOUT_MS = 4000;

type SaveHost = Pick<GameHost, 'storage' | 'progress'>;

/** Saves on this device and, when signed in, to the player's account. */
export function commitProgress(host: SaveHost, p: Progress): void {
  saveProgress(host.storage, p);
  pushToAccount(host, p);
}

/**
 * On boot: folds the account's progress into this device's (and this
 * device's into the account, e.g. levels played before signing in).
 */
export async function pullFromAccount(host: SaveHost): Promise<void> {
  if (!host.progress) return;
  try {
    const remote = parseProgress(await withTimeout(host.progress.load(), PULL_TIMEOUT_MS));
    const merged = mergeProgress(loadProgress(host.storage), remote);
    saveProgress(host.storage, merged);
    if (!coversProgress(remote, merged)) pushToAccount(host, merged);
  } catch (err) {
    console.warn('[inkheroes] could not load account progress; playing on this device\'s save', err);
  }
}

function pushToAccount(host: SaveHost, p: Progress): void {
  host.progress
    ?.save(p, (theirs) => {
      // Another device saved first: keep both, here and in the account.
      const merged = mergeProgress(loadProgress(host.storage), parseProgress(theirs));
      saveProgress(host.storage, merged);
      return merged;
    })
    .catch((err: unknown) => console.warn('[inkheroes] could not save progress to your account', err));
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
