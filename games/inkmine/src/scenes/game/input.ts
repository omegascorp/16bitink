import Phaser from 'phaser';
import type { MineInput } from '../../logic/mine';

/**
 * Keyboard controls: arrows or WASD move and drill (push into the ground),
 * Space jumps and, held in the air, fires the jetpack,
 * R feeds the lower of the cell and life support from the bag; L, Esc, P
 * or Enter goes aboard at the lander and opens the inventory anywhere else
 * (the world waits while it's open, and recall is there). Touch comes with the HUD's stick and buttons (build order, later).
 */
export class GameInput {
  /** Each button's last key-down time seen, so a press counts once, however short. */
  private readonly seen = new Map<Phaser.Input.Keyboard.Key, number>();
  private readonly keys: Record<'left' | 'right' | 'up' | 'down' | 'a' | 'd' | 'w' | 's' | 'jump' | 'feed' | 'aboard' | 'enter' | 'pause' | 'p', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('No keyboard input');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT), up: kb.addKey(K.UP), down: kb.addKey(K.DOWN),
      a: kb.addKey(K.A), d: kb.addKey(K.D), w: kb.addKey(K.W), s: kb.addKey(K.S),
      jump: kb.addKey(K.SPACE), feed: kb.addKey(K.R), aboard: kb.addKey(K.L), enter: kb.addKey(K.ENTER),
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
    return { ix, iy, jump: just(k.jump), thrust: k.jump.isDown, recall: false, feed: just(k.feed) ? 'lowest' : null };
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

  /** Forgets every press so far: keys pressed while the game waited behind the inventory don't fire when it resumes. */
  forget(): void {
    for (const key of Object.values(this.keys)) this.seen.set(key, key.timeDown);
  }

  /** Pressed this frame: the menu key (L, Esc, P or Enter), aboard at the lander or the inventory anywhere else. */
  menu(): boolean {
    // Every key is read, so a press on one that isn't used this frame doesn't fire later.
    return [this.keys.aboard, this.keys.enter, this.keys.pause, this.keys.p].map((k) => this.pressed(k)).some(Boolean);
  }
}
