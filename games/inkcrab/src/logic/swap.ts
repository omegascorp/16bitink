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

export function tickSwap(swap: Swap, dt: number): { swap: Swap; done: boolean } {
  const elapsed = Math.min(SWAP_SECONDS, swap.elapsed + dt);
  return { swap: { ...swap, elapsed }, done: elapsed >= SWAP_SECONDS };
}

export function swapProgress(swap: Swap): number {
  return swap.elapsed / SWAP_SECONDS;
}
