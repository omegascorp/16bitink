/** Moving house: about a second out of the shell, defenseless. */
export const SWAP_SECONDS = 1;

export interface Swap {
  /** The loose shell being moved into. */
  readonly itemId: number;
  readonly elapsed: number;
}

export function startSwap(itemId: number): Swap {
  return { itemId, elapsed: 0 };
}

/** `seconds`: how long the move takes (the player's by default). */
export function tickSwap(swap: Swap, dt: number, seconds = SWAP_SECONDS): { swap: Swap; done: boolean } {
  const elapsed = Math.min(seconds, swap.elapsed + dt);
  return { swap: { ...swap, elapsed }, done: elapsed >= seconds };
}

export function swapProgress(swap: Swap, seconds = SWAP_SECONDS): number {
  return swap.elapsed / seconds;
}
