import Phaser from 'phaser';
import type { MineInput } from '../../logic/mine';

/**
 * Keyboard controls: arrows or WASD move and drill (push into the ground),
 * Space jumps and, held in the air, fires the jetpack, E unrolls a ladder, R recalls to the lander, L (or
 * Enter) lifts off from the lander. Touch comes
 * with the HUD's stick and buttons (build order, later).
 */
export class GameInput {
  private readonly keys: Record<'left' | 'right' | 'up' | 'down' | 'a' | 'd' | 'w' | 's' | 'jump' | 'ladder' | 'recall' | 'liftoff' | 'enter', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('No keyboard input');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT), up: kb.addKey(K.UP), down: kb.addKey(K.DOWN),
      a: kb.addKey(K.A), d: kb.addKey(K.D), w: kb.addKey(K.W), s: kb.addKey(K.S),
      jump: kb.addKey(K.SPACE), ladder: kb.addKey(K.E), recall: kb.addKey(K.R), liftoff: kb.addKey(K.L), enter: kb.addKey(K.ENTER),
    };
  }

  /** Forgets presses made while the game wasn't reading (the key that closed the intro card). */
  flush(): void {
    for (const key of Object.values(this.keys)) Phaser.Input.Keyboard.JustDown(key);
  }

  read(): MineInput {
    const k = this.keys;
    const ix = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const iy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const just = Phaser.Input.Keyboard.JustDown;
    return { ix, iy, jump: just(k.jump), thrust: k.jump.isDown, ladder: just(k.ladder), recall: just(k.recall), liftoff: just(k.liftoff) || just(k.enter) };
  }
}
