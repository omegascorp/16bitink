import type { Draw } from '../kit';

/**
 * How a boss is painted: a square frame of `frame` board px centred on the
 * boss, at `res` texture px per board px, one drawing per pose. Every boss
 * is seen from above like the rest of the board and faces +x (the view
 * turns the sprite); `draw` paints one pose with the line boil `d` carries.
 */
export interface BossArt {
  readonly frame: number;
  readonly res: number;
  readonly poses: readonly string[];
  readonly draw: (d: Draw, pose: string) => void;
}
