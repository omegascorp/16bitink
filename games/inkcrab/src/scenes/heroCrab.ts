import Phaser from 'phaser';
import { FOOT, FRAME, SHELL_UNITS } from '../art/frame';
import { crabShift } from '../art/mouth';
import { BOIL } from '../art/palette';
import { TEX } from '../art/textures';
import { MOUTH_OFFSET, bodyFill, SHELLS, type ShellKind } from '../logic/shells';

/**
 * The player's crab drawn big for the end-of-level screens: popping in
 * with a puff of sand, its line boiling like the game's, then hopping for
 * joy or, caught, pulled into its shell and trembling.
 */
const BOIL_MS = 240;
/** When the first shell pops in, ms after the screen opens. */
export const POP_DELAY = 350;

export type Mood = 'happy' | 'hiding';

/** One crab in `kind`, `width` px wide, its shell centred on `mid` and resting on `ground`. */
export function crabInShell(scene: Phaser.Scene, kind: ShellKind, mid: number, ground: number, width: number, depth: number, mood: Mood): Phaser.GameObjects.Container {
  const unit = width / SHELL_UNITS;
  const shell = scene.add.image(0, 0, TEX.shell(kind, 0)).setOrigin(FOOT.x / FRAME, FOOT.y / FRAME).setScale(0);
  scene.tweens.add({ targets: shell, scale: unit, delay: POP_DELAY, duration: 380, ease: 'Back.Out' });
  puff(scene, mid, ground - width * 0.3, width, POP_DELAY, depth + 1);
  boil(scene, [shell], [kind]);
  const crab = crabIn(scene, kind, shell, mid + MOUTH_OFFSET * width, ground, unit, depth);
  const at = POP_DELAY + 450;
  if (mood === 'happy') hop(scene, crab, at);
  else cower(scene, crab, at);
  return crab;
}

/** Pulled all the way in: only the shell shows, shivering now and then. */
function cower(scene: Phaser.Scene, crab: Phaser.GameObjects.Container, at: number): void {
  const shake = [-3, 3, -2.5, 2.5, -1.5, 0].map((angle) => ({ angle, duration: 60 }));
  scene.tweens.chain({ targets: crab, delay: at, loop: -1, loopDelay: 1400, tweens: shake });
}

/** The grown crab in its biggest shell (moved into one group with it), crowding the opening as it does at the cap. */
export function crabIn(scene: Phaser.Scene, kind: ShellKind, shell: Phaser.GameObjects.Image, foot: number, ground: number, unit: number, depth: number): Phaser.GameObjects.Container {
  const origin = { x: FOOT.x / FRAME, y: FOOT.y / FRAME };
  const spec = SHELLS[kind];
  const body = unit * bodyFill(spec, spec.maxSize);
  const shift = crabShift(kind, unit, body);
  const back = scene.add.image(shift, 0, TEX.crabBack(0)).setOrigin(origin.x, origin.y).setScale(body).setAlpha(0);
  const front = scene.add.image(shift, 0, TEX.crabFront(0)).setOrigin(origin.x, origin.y).setScale(body).setAlpha(0);
  shell.setPosition(0, 0);
  const c = scene.add.container(foot, ground, [back, shell, front]).setDepth(depth);
  let f = 0;
  scene.time.addEvent({
    delay: BOIL_MS, loop: true, callback: () => {
      f = (f + 1) % BOIL;
      back.setTexture(TEX.crabBack(f));
      front.setTexture(TEX.crabFront(f));
    },
  });
  return c;
}

/** Peeks out once its shell lands, then hops for joy every so often. */
export function hop(scene: Phaser.Scene, crab: Phaser.GameObjects.Container, at: number): void {
  const [back, , front] = crab.list;
  scene.tweens.add({ targets: [back, front], alpha: 1, delay: at - 200, duration: 200 });
  scene.tweens.chain({
    targets: crab,
    delay: at,
    loop: -1,
    loopDelay: 900,
    tweens: [
      { y: crab.y - 26, duration: 180, ease: 'Quad.Out' },
      { y: crab.y, duration: 200, ease: 'Bounce.Out' },
      { y: crab.y - 16, duration: 150, ease: 'Quad.Out' },
      { y: crab.y, duration: 170, ease: 'Bounce.Out' },
    ],
  });
}

export function boil(scene: Phaser.Scene, shells: readonly Phaser.GameObjects.Image[], kinds: readonly ShellKind[]): void {
  let f = 0;
  scene.time.addEvent({
    delay: BOIL_MS, loop: true, callback: () => {
      f = (f + 1) % BOIL;
      shells.forEach((s, i) => s.setTexture(TEX.shell(kinds[i]!, f)));
    },
  });
}

export function puff(scene: Phaser.Scene, x: number, y: number, size: number, delay: number, depth: number): void {
  const p = scene.add.image(x, y, TEX.puff(0)).setScale(0).setAlpha(0).setDepth(depth);
  const s = (size * 1.5) / 64;
  scene.tweens.add({ targets: p, scale: s, alpha: { from: 0.9, to: 0 }, delay, duration: 520, ease: 'Quad.Out', onComplete: () => p.destroy() });
}
