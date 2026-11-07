import { GUARD } from '../../src/level/guard';
import type { LevelDef } from '../../src/logic/level';
import { STEPS_PER_SECOND } from '../../src/logic/particles';
import { World } from '../../src/logic/world';

/**
 * The choreography of "Which Pin Would You Pull First?": level 4, The Guard,
 * the first hall. Everything here is plain data and pure functions (no
 * Phaser, no DOM), so the tests can check the story against the game's real
 * rules, and the page (driver.ts) plays the very same actions into the real
 * game scene.
 *
 * Nib is shut in his corner by the gate G. Over the boar hang a tank of
 * water (pin 1, W) and a pocket of lava (pin 2, L). The tempting pull is the
 * big water, straight over the boar: it falls onto the lava still in its
 * tank, which sets there as stone, and the boar lives. The right pull is the
 * lava: it pours down and scorches the boar, then the water cools the pool.
 *
 * The loop is a cycle of LOOP_S seconds of "cycle time" c. The picture starts
 * SHIFT seconds into the cycle (video time t = c - SHIFT), because the cycle
 * opens with the ink wipe that clears the board: the last frame of the video
 * is the wipe finishing, and the first frame is the fresh board it reveals.
 */
export const LEVEL: LevelDef = GUARD;
export const FPS = 30;
/** Simulation steps the game takes per video frame (STEPS_PER_SECOND / FPS). */
export const STEPS_PER_FRAME = 4;
export const LOOP_S = 16.5;
/** The cycle's start is this long before the video's: the opening wipe finishes at t = 0. */
export const SHIFT_S = 0.5;
/** An ink wipe sweeps the old board away in this long. */
export const WIPE_S = 0.35;
/** Cycle time of the wipe between the wrong try and the right one; the board is rebuilt there. */
export const SWAP_C = 11.7;

export type Segment = 'wrong' | 'right';
/**
 * Seconds the World has already been running when a try begins (the player
 * has been looking at the board for a while: the boar has walked its beat). The
 * wrong try opens with the boar at the far end of its beat, so it is walking
 * back under the tanks as the viewer reads the board, and is at the gate when
 * Nib comes out.
 */
export const PRE_ROLL_S: Readonly<Record<Segment, number>> = { wrong: 0.7, right: 0 };
export type Action =
  | { readonly at: number; readonly kind: 'tap'; readonly pin: string }
  | { readonly at: number; readonly kind: 'goto'; readonly x: number; readonly y?: number }
  | { readonly at: number; readonly kind: 'jump' };

/** The pins as the viewer sees them, 1 to 3, and what each really is. */
export const PIN_NUMBERS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'W', label: '1' },
  { id: 'L', label: '2' },
  { id: 'G', label: '3' },
];

/** The right pin to pull first. */
export const RIGHT_FIRST = 'L';

/**
 * Seconds from the start of each try (`at`). The wrong try: the big water
 * first, then (as an eager player would) the lava, the gate, and Nib out
 * to the chest, where the boar waits. The right try: the lava, Nib off to
 * the vine for the ledge's gold, then the water to cool the pool.
 */
export const ACTIONS: Readonly<Record<Segment, readonly Action[]>> = {
  // "Water first?" (video 8.7 s) ... "Bye, Nib." (the fail lands at about 10.4 s)
  wrong: [
    { at: 9.2, kind: 'tap', pin: 'W' },
    { at: 9.5, kind: 'tap', pin: 'L' },
    { at: 9.75, kind: 'tap', pin: 'G' },
    { at: 9.8, kind: 'goto', x: 700 },
  ],
  // "...pull the LAVA first" (video 12.3 s) ... "big trouble" (the boar is scorched at about 13.4 s)
  right: [
    { at: 1.1, kind: 'tap', pin: 'L' },
    { at: 1.2, kind: 'goto', x: 176, y: 850 },
    { at: 2.05, kind: 'tap', pin: 'W' },
  ],
};

/** Cycle time at which each try begins (the board is built afresh). */
export const SEGMENT_START: Readonly<Record<Segment, number>> = { wrong: 0, right: SWAP_C };

export function segmentAt(c: number): { readonly segment: Segment; readonly local: number } {
  const cc = wrapCycle(c);
  return cc >= SWAP_C ? { segment: 'right', local: cc - SWAP_C } : { segment: 'wrong', local: cc };
}

export const wrapCycle = (c: number): number => ((c % LOOP_S) + LOOP_S) % LOOP_S;
/** Cycle time of video time t. */
export const cycleOf = (t: number): number => wrapCycle(t + SHIFT_S);
/** Whole video frames in the loop. */
export const LOOP_FRAMES = LOOP_S * FPS;

/** Cycle times of the story's beats (checked against the real rules in test/promoPin.test.ts). */
export const BEATS = {
  /** Nib is caught by the boar (the fail begins). */
  failed: 10.9,
  /** The lava has scorched the boar. */
  scorched: SWAP_C + 2.5,
  /** The last 3.0 s of the video: the call to action. */
  ctaFrom: LOOP_S - 3.0 + SHIFT_S,
} as const;

/** The frames of a segment's actions, in order, as [local frame, action]. */
export function actionFrames(segment: Segment): readonly { readonly frame: number; readonly action: Action }[] {
  return ACTIONS[segment].map((action) => ({ frame: Math.round(action.at * FPS), action }));
}

/** Plays one action into a World (the page does the same into the scene's World, through the scene's own tap). */
export function perform(world: World, action: Action): void {
  switch (action.kind) {
    case 'tap':
      world.tap(action.pin);
      return;
    case 'goto':
      world.command(action.y === undefined ? { kind: 'goto', x: action.x } : { kind: 'goto', x: action.x, y: action.y });
      return;
    case 'jump':
      world.jump();
  }
}

/**
 * The game's World as it is at `local` seconds into a try, played the way
 * the page plays it: STEPS_PER_FRAME steps a frame, an action at the start
 * of its frame. `onFrame` sees the world after each frame.
 */
export function playSegment(segment: Segment, local: number, onFrame?: (world: World, frame: number) => void): World {
  const world = new World(LEVEL);
  rollForward(world, segment);
  const due = actionFrames(segment);
  let next = 0;
  const frames = Math.round(local * FPS);
  for (let f = 0; f < frames; f++) {
    while (next < due.length && due[next]!.frame <= f) perform(world, due[next++]!.action);
    for (let s = 0; s < STEPS_PER_FRAME; s++) world.step();
    onFrame?.(world, f);
  }
  return world;
}

/** Runs a fresh World on to where the try opens (see PRE_ROLL_S). */
export function rollForward(world: World, segment: Segment): void {
  for (let s = Math.round(PRE_ROLL_S[segment] * STEPS_PER_SECOND); s > 0; s--) world.step();
}

/** The board the viewer sees at video time t: which try, and the World at that moment. */
export function boardAt(t: number): { readonly segment: Segment; readonly world: World } {
  const { segment, local } = segmentAt(cycleOf(t));
  return { segment, world: playSegment(segment, local) };
}
