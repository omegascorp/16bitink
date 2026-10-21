import Phaser from 'phaser';
import { GECKO_MOUTH, GECKO_RES, GECKO_TAIL, type GeckoPose } from '../../art/geckoArt';
import { MARBLE_RES } from '../../art/marbleArt';
import { BOIL } from '../../art/palette';
import { DRAGONFLY_RES, TEX } from '../../art/textures';
import { MOUTH, type Board } from '../../logic/board';
import { colourHex } from '../../logic/colours';

/** How long the gecko's mouth stays open after a spit, ms. */
const SPIT_MS = 130;
/** The next marble rides on the tail this much smaller. */
const TAIL_SCALE = 0.62;
/** How fast its skin turns to a new colour (per second). */
const TINT_RATE = 9;

/**
 * The gecko: its skin washed in the colour of the marble in its mouth, the
 * pen lines over it, the loaded marble at its snout and the next one in its
 * tail. The drawing faces up; the container turns it to aim.
 */
export class GeckoView {
  readonly root: Phaser.GameObjects.Container;
  private readonly skin: Phaser.GameObjects.Image;
  private readonly lines: Phaser.GameObjects.Image;
  private readonly loaded: Phaser.GameObjects.Image;
  private readonly next: Phaser.GameObjects.Image;
  private spitUntil = 0;
  private colour: Phaser.Display.Color;
  private lastX: number;
  private bounce = 0;
  private readonly base: number;

  constructor(scene: Phaser.Scene, board: Board) {
    // Scaled so the drawn mouth sits where the board spits from.
    const scale = MOUTH / Math.hypot(GECKO_MOUTH.x, GECKO_MOUTH.y);
    const marble = 1 / (MARBLE_RES * scale);
    this.skin = scene.add.image(0, 0, TEX.geckoSkin('idle', 0)).setScale(1 / GECKO_RES);
    this.lines = scene.add.image(0, 0, TEX.geckoLines('idle', 0)).setScale(1 / GECKO_RES);
    this.next = scene.add.image(GECKO_TAIL.x, GECKO_TAIL.y, TEX.marble(board.next, 0)).setScale(marble * TAIL_SCALE);
    this.loaded = scene.add.image(GECKO_MOUTH.x, GECKO_MOUTH.y, TEX.marble(board.loaded, 0)).setScale(marble);
    this.root = scene.add.container(board.gecko.x, board.gecko.y, [this.skin, this.next, this.lines, this.loaded]).setScale(scale).setDepth(8);
    this.base = scale;
    this.colour = Phaser.Display.Color.IntegerToColor(colourHex(board.loaded));
    this.lastX = board.gecko.x;
  }

  /** The gecko is within reach of a tap at board point (x, y). */
  contains(x: number, y: number): boolean {
    return Math.hypot(x - this.root.x, y - this.root.y) < 56;
  }

  spat(time: number): void {
    this.spitUntil = time + SPIT_MS;
  }

  swapped(): void {
    this.bounce = 1;
  }

  /** A hop to another lily pad: its marbles jostle (the rise and fall follow the board's hop). */
  hopped(): void {
    this.bounce = 1;
  }

  update(board: Board, time: number, dt: number): void {
    const g = board.gecko;
    const moving = Math.abs(g.x - this.lastX) > 0.5;
    this.lastX = g.x;
    // Mid-hop it's nearer the eye: bigger at the top of the jump.
    const air = board.hopping ? Math.sin(board.hopping.t * Math.PI) : 0;
    this.root.setPosition(g.x, g.y).setRotation(g.angle + Math.PI / 2).setScale(this.base * (1 + air * 0.28));
    const pose: GeckoPose = time < this.spitUntil ? 'spit' : 'idle';
    // Legs boil faster while it runs along the branch.
    const f = Math.floor(time / (moving ? 70 : 150)) % BOIL;
    this.skin.setTexture(TEX.geckoSkin(pose, f));
    this.lines.setTexture(TEX.geckoLines(pose, f));
    // A Dragonfly waiting to go sits on its snout instead of the marble.
    if (board.dragonfly) this.loaded.setTexture(TEX.dragonfly(Math.floor(time / 60) % 2, f)).setVisible(true);
    else if (board.geode) this.loaded.setTexture(TEX.geode(f)).setVisible(true);
    else this.loaded.setTexture(TEX.marble(board.loaded, f)).setVisible(time >= this.spitUntil);
    this.next.setTexture(TEX.marble(board.next, f));
    // The skin eases to the loaded marble's colour.
    const want = Phaser.Display.Color.IntegerToColor(colourHex(board.loaded));
    const k = Math.min(1, dt * TINT_RATE);
    this.colour = Phaser.Display.Color.ObjectToColor({
      r: this.colour.red + (want.red - this.colour.red) * k,
      g: this.colour.green + (want.green - this.colour.green) * k,
      b: this.colour.blue + (want.blue - this.colour.blue) * k,
    });
    this.skin.setTint(this.colour.color);
    this.bounce = Math.max(0, this.bounce - dt * 5);
    const b = 1 + Math.sin(this.bounce * Math.PI) * 0.25;
    const marble = 1 / MARBLE_RES / this.base;
    this.loaded.setScale(board.dragonfly ? (0.9 / DRAGONFLY_RES / this.base) * b : marble * b);
    this.next.setScale(marble * TAIL_SCALE * b);
  }
}
