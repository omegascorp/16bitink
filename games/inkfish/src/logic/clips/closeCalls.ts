/**
 * Close calls: a hunter got within a whisker of the player's fish and the
 * fish got away. Fed the gap to the nearest hunter every frame; reports the
 * escape once the hunter has fallen well behind, timed at the closest moment.
 */

/** Closer than this (px between the two bodies) counts as a close call. */
export const CLOSE_GAP = 40;
/** The hunter must fall this far behind before it counts as an escape. */
const CLEAR_GAP = CLOSE_GAP * 2.5;
/** After a bite, the hunter swimming off isn't an escape. */
const QUIET_AFTER_HURT_S = 1.5;

export interface CloseCallState {
  /** The closest gap of the close call under way, or null when there isn't one. */
  readonly closest: number | null;
  readonly closestAt: number;
  readonly quietUntil: number;
}

export const initialCloseCall: CloseCallState = { closest: null, closestAt: 0, quietUntil: 0 };

/**
 * One frame: `gap` to the nearest hunter after the player (null if none),
 * `hurt` if the player was bitten this frame.
 */
export function trackCloseCall(state: CloseCallState, now: number, gap: number | null, hurt: boolean): { state: CloseCallState; escapedAt: number | null } {
  if (hurt) return { state: { ...initialCloseCall, quietUntil: now + QUIET_AFTER_HURT_S }, escapedAt: null };
  if (now < state.quietUntil) return { state, escapedAt: null };
  if (gap !== null && gap < CLOSE_GAP) {
    const closer = state.closest === null || gap < state.closest;
    return { state: closer ? { ...state, closest: gap, closestAt: now } : state, escapedAt: null };
  }
  if (state.closest !== null && (gap === null || gap > CLEAR_GAP)) {
    return { state: { ...state, closest: null }, escapedAt: state.closestAt };
  }
  return { state, escapedAt: null };
}
