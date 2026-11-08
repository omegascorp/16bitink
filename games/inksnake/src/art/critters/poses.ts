
/** Every creature that isn't the player: prey, enemies and bosses. */
export type CritterKind = string;

/**
 * Each critter's poses. The game picks a pose from what the critter is
 * doing (see scenes/game/crittersView.ts):
 *
 * - mouse, rat: 'idle', 'run0', 'run1' (legs mid-stride, two phases)
 * - frog: 'sit', 'hop' (legs stretched out behind)
 * - egg: 'egg' (a hen's egg seen from above)
 * - crow: 'stand', 'hop', 'peck' (head down, beak forward), 'fly0', 'fly1' (wings spread: down, up)
 * - hawk: 'soar' (wings spread wide, tail fanned: its red tail shows), 'stoop' (wings folded back, diving),
 *   'ground' (on the ground, wings half open, mantling), 'flap0', 'flap1'
 * - hen: 'walk0', 'walk1', 'peck', 'flap' (wings out, flustered)
 * - tomcat: 'walk0', 'walk1', 'crouch' (low, haunches up, tail tip twitching), 'leap' (stretched out mid-pounce),
 *   'dazed' (sitting, head wobbly, off balance), 'startle' (arched back, fur on end: the cucumber fright)
 */
export const CRITTER_POSES = {
  mouse: ['idle', 'run0', 'run1'],
  rat: ['idle', 'run0', 'run1'],
  frog: ['sit', 'hop'],
  egg: ['egg'],
  crow: ['stand', 'hop', 'peck', 'fly0', 'fly1'],
  hawk: ['soar', 'stoop', 'ground', 'flap0', 'flap1'],
  hen: ['walk0', 'walk1', 'peck', 'flap'],
  tomcat: ['walk0', 'walk1', 'crouch', 'leap', 'dazed', 'startle'],
} as const;

/** The farm's critters, each with its own poses (the chapters' are in art/chapters/). */
export type FarmCritter = keyof typeof CRITTER_POSES;
export type CritterPose<K extends FarmCritter> = (typeof CRITTER_POSES)[K][number];
