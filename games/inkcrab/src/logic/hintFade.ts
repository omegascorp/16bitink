/** A rectangle on screen, top-left corner and size. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** How faint a hint gets while the player is behind it: enough to see through, still there. */
export const FADED = 0.25;
/** How quickly a hint fades or comes back, per second (about a third of a second either way). */
const FADE_RATE = 8;

/** Whether the player's box comes within `margin` of the hint's. */
export function behind(hint: Box, player: Box, margin: number): boolean {
  return player.x < hint.x + hint.w + margin && player.x + player.w > hint.x - margin
    && player.y < hint.y + hint.h + margin && player.y + player.h > hint.y - margin;
}

/** The hint's next alpha: easing down to FADED while the player is behind it, back to solid once clear. */
export function hintAlpha(current: number, isBehind: boolean, dtMs: number): number {
  const target = isBehind ? FADED : 1;
  return current + (target - current) * Math.min(1, (dtMs / 1000) * FADE_RATE);
}
