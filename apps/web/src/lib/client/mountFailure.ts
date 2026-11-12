/** Phaser couldn't build a shader (vertex, fragment or link): seen on a few Android GPUs. The driver fails the same way on every retry. */
export const isShaderFailure = (message: string): boolean => /Shader failed/.test(message);

/** Phaser's own message when the browser gives no WebGL context. */
export const isWebGlContextFailure = (message: string): boolean => /WebGL/i.test(message) && !isShaderFailure(message);

export type MountFailureAction =
  /** This browser can't draw the game; retrying fails the same way. */
  | 'unsupported'
  /** WebGL works now, but Phaser cached "no WebGL" when it was imported: only a reload gets a fresh import. */
  | 'reload'
  /** Anything else: try again in place. */
  | 'retry';

/** What to offer after the game failed at its mount step. `webglNow`: a fresh WebGL probe succeeded. */
export function classifyMountFailure(message: string, webglNow: boolean): MountFailureAction {
  if (!webglNow || isShaderFailure(message)) return 'unsupported';
  return isWebGlContextFailure(message) ? 'reload' : 'retry';
}
