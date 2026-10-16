import Phaser from 'phaser';
import type { MineInput } from '../../logic/mine';

/**
 * Keyboard controls: arrows or WASD move and drill (push into the ground),
 * Space jumps and, held in the air, fires the jetpack, E unrolls a ladder,
 * R feeds the lower of the cell and life support from the bag, L (or Enter)
 * goes aboard at the lander, Esc (or P) pauses (recall is on the pause
 * card). Touch comes with the HUD's stick and buttons (build order, later).
 */
export class GameInput {
  /** Each button's last key-down time seen, so a press counts once, however short. */
  private readonly seen = new Map<Phaser.Input.Keyboard.Key, number>();
  private readonly keys: Record<'left' | 'right' | 'up' | 'down' | 'a' | 'd' | 'w' | 's' | 'jump' | 'ladder' | 'feed' | 'aboard' | 'enter' | 'pause' | 'p', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('No keyboard input');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT), up: kb.addKey(K.UP), down: kb.addKey(K.DOWN),
      a: kb.addKey(K.A), d: kb.addKey(K.D), w: kb.addKey(K.W), s: kb.addKey(K.S),
      jump: kb.addKey(K.SPACE), ladder: kb.addKey(K.E), feed: kb.addKey(K.R), aboard: kb.addKey(K.L), enter: kb.addKey(K.ENTER),
      pause: kb.addKey(K.ESC), p: kb.addKey(K.P),
    };
    // A key pressed before this scene started (going aboard, a card closed) isn't a press here.
    for (const key of Object.values(this.keys)) this.seen.set(key, key.timeDown);
  }

  read(): MineInput {
    const k = this.keys;
    const ix = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const iy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const just = (key: Phaser.Input.Keyboard.Key): boolean => this.pressed(key);
    return { ix, iy, jump: just(k.jump), thrust: k.jump.isDown, ladder: just(k.ladder), recall: false, feed: just(k.feed) ? 'lowest' : null };
  }

  /**
   * Pressed since last asked. Phaser's JustDown forgets a press released
   * within the same frame (a quick tap, or a slow frame on a phone); the
   * key's down time doesn't.
   */
  private pressed(key: Phaser.Input.Keyboard.Key): boolean {
    const last = this.seen.get(key) ?? 0;
    this.seen.set(key, key.timeDown);
    return key.timeDown > last;
  }

  /** Pressed this frame: pause, or back from it. */
  pause(): boolean {
    const a = this.pressed(this.keys.pause);
    const b = this.pressed(this.keys.p);
    return a || b;
  }

  /** Pressed this frame: go aboard (only does anything at the lander). */
  aboard(): boolean {
    const a = this.pressed(this.keys.aboard);
    const b = this.pressed(this.keys.enter);
    return a || b;
  }
}
