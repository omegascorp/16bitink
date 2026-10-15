import { ramp, window01 } from '../short';
import {
  BITE_AT, DOWN_AT, DRAGS_AT, FISH_AT, GRAB_AT, GULP_AT, HEAD_AT, LOOP_S, MADE_AT, MORAY_AT, MOST_AT, MOVIE_AT, NARROW_AT, ONE_AT, pop, PREY_AT, type Pt, REAL_AT,
  SCIENTISTS_AT, SECOND_AT, SO_AGAIN_AT, SO_AT, THOUGHT_AT, THROAT_AT, YEAR_AT,
} from './story';

/** When each note, label and prop is on screen (0 hidden .. 1 shown), timed to the words, and the jolt of the bites. */

/** The film slate: up on "thought", clapped on "movie", over the hook, gone by "The moray". */
export const slateAt = (t: number): number => (t > LOOP_S / 2 ? ramp(t, THOUGHT_AT - 0.15, THOUGHT_AT + 0.1) : 1 - ramp(t, REAL_AT + 0.6, MORAY_AT));
/** Its clapstick, 0 shut .. 1 open: open as it appears, clapped on "movie". */
export const clapAt = (t: number): number => (t > LOOP_S / 2 ? (t < MOVIE_AT ? 1 : 1 - ramp(t, MOVIE_AT, MOVIE_AT + 0.06)) : 0);

/** "second jaw", pointing at it: over the hook, on "one in its throat", and from "the second jaw" until it is down. */
export const jawLabel = (t: number): number =>
  Math.max(t > LOOP_S / 2 ? ramp(t, MADE_AT + 0.3, MADE_AT + 0.5) : 0, t < LOOP_S / 2 ? 1 - ramp(t, MORAY_AT - 0.2, MORAY_AT) : 0, window01(t, ONE_AT - 0.1, HEAD_AT, 0.2), window01(t, SECOND_AT - 0.1, DOWN_AT + 0.5, 0.2));
/** The ring round it in its throat, on "throat". */
export const throatRing = (t: number): number => window01(t, THROAT_AT - 0.1, HEAD_AT + 0.1, 0.2);
/** "moray eel", on its name. */
export const nameLabel = (t: number): number => window01(t, MORAY_AT - 0.05, HEAD_AT, 0.2);
/** The head's height measured on "head", "narrow" on "narrow". */
export const measureAt = (t: number): number => window01(t, HEAD_AT - 0.1, FISH_AT + 0.4, 0.2);
export const narrowLabel = (t: number): number => window01(t, NARROW_AT - 0.05, FISH_AT + 0.4, 0.2);
/** ✗ by the moray's mouth on "suck prey in"; ✓ by the grouper on "most fish". */
export const crossAt = (t: number): number => pop(t, PREY_AT - 0.1, SO_AT + 0.2 - PREY_AT);
export const tickAt = (t: number): number => pop(t, GULP_AT + 0.05, SO_AT + 0.7 - GULP_AT);
export const mostLabel = (t: number): number => window01(t, MOST_AT - 0.05, SO_AT + 0.8, 0.2);
/** "drags it down": an arrow down its throat. */
export const downArrow = (t: number): number => window01(t, DRAGS_AT - 0.05, DOWN_AT + 0.7, 0.15);
export const arrowGrow = (t: number): number => ramp(t, DRAGS_AT - 0.05, DRAGS_AT + 0.6);
/** The camera, from "Scientists" until the last "So"; the viewfinder round the head; "REC" blinking. */
export const cameraAt = (t: number): number => window01(t, SCIENTISTS_AT - 0.1, SO_AGAIN_AT + 0.1, 0.25);
export const recBlink = (t: number): number => (Math.floor(t * 3) % 2 === 0 ? 1 : 0.25);
/** "2007" stamped on "2007", then the paper. */
export const stampAt = (t: number): number => (t < YEAR_AT ? 0 : 1 - ramp(t, SO_AGAIN_AT - 0.1, SO_AGAIN_AT + 0.15));
export const stampSlam = (t: number): number => ramp(t, YEAR_AT, YEAR_AT + 0.12);
export const paperLabel = (t: number): number => window01(t, YEAR_AT + 0.35, SO_AGAIN_AT + 0.15, 0.2);

/** A jolt of the picture on the bite and the grab, px. */
export function shakeAt(t: number): Pt {
  for (const at of [BITE_AT, GRAB_AT]) {
    const u = t - at;
    if (u < 0 || u > 0.25) continue;
    const fade = (1 - u / 0.25) ** 2;
    return { x: 9 * fade * Math.sin(u * 95), y: 6 * fade * Math.cos(u * 77) };
  }
  return { x: 0, y: 0 };
}

