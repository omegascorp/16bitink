import Phaser from 'phaser';
import { GECKO_MOUTH, GECKO_RES, type GeckoPose } from '../../art/geckoArt';
import { MARBLE_RES } from '../../art/marbleArt';
import { BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import { colourHex, COLOURS } from '../../logic/colours';

export type Mood = 'happy' | 'glum';

/** How often the happy gecko spits a celebratory marble, ms. */
const SPIT_EVERY = 1500;
const SPIT_MS = 160;
/** A glum gecko's skin: washed out to a rainy blue-grey. */
const GLUM_TINT = 0x9aabbd;

/**
 * The gecko on a result card, drawn as in play (its washed skin under the
 * pen lines, boiling). Happy, it sits up jauntily and spits a marble now
 * and then; glum, it lies on its side, grey with the rain, and sighs.
 */
export class GeckoPortrait {
  readonly root: Phaser.GameObjects.Container;
  private readonly skin: Phaser.GameObjects.Image;
  private readonly lines: Phaser.GameObjects.Image;
  private nextSpit = 600;
  private spitUntil = 0;
  private shot = 0;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, private readonly mood: Mood, size: number) {
    this.skin = scene.add.image(0, 0, TEX.geckoSkin('idle', 0)).setTint(mood === 'happy' ? colourHex('green') : GLUM_TINT);
    this.lines = scene.add.image(0, 0, TEX.geckoLines('idle', 0));
    const shadow = scene.add.ellipse(6, 10, 90, 130, 0x26316a, 0.08);
    this.root = scene.add.container(x, y, [shadow, this.skin, this.lines]).setScale(size / GECKO_RES);
    if (mood === 'happy') {
      this.root.setRotation(-0.28);
      scene.tweens.add({ targets: this.root, y: y - 5, rotation: -0.2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else {
      this.root.setRotation(-1.8).setAlpha(0.95);
      shadow.setPosition(-4, 4);
      // A slow sigh.
      scene.tweens.add({ targets: this.root, scaleX: (size / GECKO_RES) * 1.03, scaleY: (size / GECKO_RES) * 0.97, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  update(time: number): void {
    const f = Math.floor(time / 150) % BOIL;
    const pose: GeckoPose = time < this.spitUntil ? 'spit' : 'idle';
    this.skin.setTexture(TEX.geckoSkin(pose, f));
    this.lines.setTexture(TEX.geckoLines(pose, f));
    if (this.mood !== 'happy' || time < this.nextSpit) return;
    this.nextSpit = time + SPIT_EVERY;
    this.spitUntil = time + SPIT_MS;
    this.spit();
  }

  /** A marble leaps from its mouth, arcs up and fades. */
  private spit(): void {
    const colour = COLOURS[this.shot++ % COLOURS.length]!;
    const r = this.root;
    const k = r.scaleX;
    const [cos, sin] = [Math.cos(r.rotation), Math.sin(r.rotation)];
    const mx = r.x + (GECKO_MOUTH.x * cos - GECKO_MOUTH.y * sin) * k;
    const my = r.y + (GECKO_MOUTH.x * sin + GECKO_MOUTH.y * cos) * k;
    const m = this.scene.add.image(mx, my, TEX.marble(colour, 0)).setScale(0.55 / MARBLE_RES);
    r.parentContainer?.add(m);
    const dx = sin * 60 + 30;
    this.scene.tweens.add({ targets: m, x: mx + dx, duration: 900, ease: 'Linear' });
    this.scene.tweens.add({ targets: m, y: my - 46, duration: 420, ease: 'Quad.Out', yoyo: true });
    this.scene.tweens.add({ targets: m, alpha: 0, scale: 0.3 / MARBLE_RES, delay: 500, duration: 400, onComplete: () => m.destroy() });
  }
}
