/**
 * Where a note written in the world goes (the "+ copper" and "too hard!"
 * that rise beside the prospector), so notes written together stack
 * instead of covering each other. Pure: no Phaser.
 */

/** A note still showing: its middle, its width, and the height it was written at (its middle). */
export interface PlacedNote {
  readonly x: number;
  readonly w: number;
  readonly at: number;
}

/** Notes sit at least this far apart (px, middle to middle): a line of the hand at 20 px. */
export const NOTE_LINE = 24;
/** A run of notes (a blast's worth of pieces) climbs this many lines, then starts again where it was asked. */
export const NOTE_LINES_MAX = 5;

/**
 * The height for a note `w` wide at `x`, asked for at `y`: there if it's
 * clear, else moved up a line past each note still showing that it would
 * cover. Notes are compared where they were written, not where they've
 * risen to: every note rises the same way, so that's where they end up
 * against each other. Past NOTE_LINES_MAX lines up, it goes where it was
 * asked, as the oldest have risen and faded by then.
 */
export function placeNote(live: readonly PlacedNote[], x: number, w: number, y: number): number {
  let at = y;
  for (;;) {
    const hit = live.find((n) => Math.abs(n.x - x) < (n.w + w) / 2 && Math.abs(n.at - at) < NOTE_LINE);
    if (!hit) return at;
    // Always upward: each move takes it above the note it hit, so this ends.
    at = hit.at - NOTE_LINE;
    if (y - at > NOTE_LINE * NOTE_LINES_MAX) return y;
  }
}
