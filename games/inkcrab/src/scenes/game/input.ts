import Phaser from 'phaser';
import type { TilePos } from '../../logic/dig';
import { IDLE, type Input } from '../../logic/sim';

/** Touch state shared from the HUD (which owns the screen) to the game scene. */
export interface TouchState {
  stickX: number;
  stickY: number;
  /** The jump button was pressed since the game last looked. */
  jump: boolean;
  /** The hide button is held. */
  hide: boolean;
  /** Screen taps (CSS px) not yet consumed by the game. */
  taps: { x: number; y: number }[];
}

export function createTouchState(): TouchState {
  return { stickX: 0, stickY: 0, jump: false, hide: false, taps: [] };
}

type Keys = Record<'left' | 'right' | 'up' | 'down' | 'a' | 'd' | 'w' | 's' | 'dig' | 'place' | 'hide', Phaser.Input.Keyboard.Key>;
type Latch = 'jump' | 'dig' | 'place' | 'act';

const LATCHED: Readonly<Record<string, Latch>> = {
  Space: 'jump', KeyX: 'dig', KeyC: 'place', KeyE: 'act', Enter: 'act',
};

/**
 * Keyboard: arrows/WASD to walk and aim, Space to jump, X to dig and C to
 * place sand (both repeat while held), E or Enter to move into a shell,
 * Z held to hide in the shell.
 */
export class GameInput {
  private readonly keys: Keys | null;
  // Presses are latched from keydown events: a tap that goes down and up
  // between two frames would be missed by polling the key state.
  private readonly pressed = new Set<Latch>();

  constructor(scene: Phaser.Scene) {
    const K = Phaser.Input.Keyboard.KeyCodes;
    const kb = scene.input.keyboard;
    this.keys = (kb?.addKeys({
      left: K.LEFT, right: K.RIGHT, up: K.UP, down: K.DOWN, a: K.A, d: K.D, w: K.W, s: K.S, dig: K.X, place: K.C, hide: K.Z,
    }) as Keys | undefined) ?? null;
    kb?.addCapture([K.SPACE, K.X, K.C, K.E, K.ENTER, K.Z]);
    kb?.on('keydown', (e: KeyboardEvent) => {
      const latch = LATCHED[e.code];
      if (latch && !e.repeat) this.pressed.add(latch);
    });
  }

  /** Builds this frame's input; `tapTile` is a touch tap already converted to a tile. */
  read(touch: TouchState, tapTile: TilePos | null, tapInteract: boolean): Input {
    const was = (l: Latch): boolean => this.pressed.has(l);
    const touchJump = touch.jump;
    touch.jump = false;
    const k = this.keys;
    const stickY = touch.stickY > 0.5 ? 1 : touch.stickY < -0.5 ? -1 : 0;
    const input: Input = k
      ? (() => {
          const keyX = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
          const keyY = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
          return {
            moveX: keyX !== 0 ? keyX : touch.stickX,
            aimY: (keyY !== 0 ? keyY : stickY) as -1 | 0 | 1,
            jump: was('jump') || touchJump,
            dig: k.dig.isDown || was('dig'),
            place: k.place.isDown || was('place'),
            interact: was('act') || tapInteract,
            tapTile,
            hide: k.hide.isDown || touch.hide,
          };
        })()
      : { ...IDLE, moveX: touch.stickX, aimY: stickY as -1 | 0 | 1, jump: touchJump, interact: tapInteract, tapTile, hide: touch.hide };
    this.pressed.clear();
    return input;
  }
}
