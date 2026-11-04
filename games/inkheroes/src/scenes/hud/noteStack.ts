/** The lowest line no note on screen is using: 0 is the top of the stack. */
export function freeSlot(taken: readonly number[]): number {
  let slot = 0;
  while (taken.includes(slot)) slot++;
  return slot;
}

export function takeSlot(taken: readonly number[], slot: number): number[] {
  return [...taken, slot];
}

export function releaseSlot(taken: readonly number[], slot: number): number[] {
  return taken.filter((s) => s !== slot);
}
