import Phaser from 'phaser';
import { BLUE } from '../../art/palette';
import { HAND, paperCard } from '../uiPaint';

const NOTE_H = 52;
/** Notes are baked in widths of this step, so a few sizes serve every hint. */
const STEP = 40;

/**
 * The coach's first-time hint, on a slip of sage-washed paper taped to
 * the board. It fades in when a hint comes and out when it's done.
 */
export class HintNote {
  readonly root: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private card: Phaser.GameObjects.Image | null = null;
  private shown: string | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add.text(0, 2, '', { fontFamily: HAND, fontSize: '24px', color: BLUE, padding: { x: 4, y: 4 } }).setOrigin(0.5);
    this.root = scene.add.container(0, 0, [this.text]).setAlpha(0);
  }

  /** What's on the note (its card and words), to fade without touching the note's own fade in and out. */
  get faces(): readonly (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[] {
    return this.card ? [this.card, this.text] : [this.text];
  }

  set(hint: string | null): void {
    if (hint === this.shown) return;
    // One note straight after another (a fight's prompts follow fast): new words, no fade out and in.
    const swap = this.shown !== null && hint !== null && this.root.alpha > 0.5;
    this.shown = hint;
    this.scene.tweens.killTweensOf(this.root);
    if (!hint) {
      this.scene.tweens.add({ targets: this.root, alpha: 0, duration: 220 });
      return;
    }
    this.text.setText(hint);
    const w = Math.ceil((this.text.width + 44) / STEP) * STEP;
    this.card?.destroy();
    this.card = paperCard(this.scene, 0, 0, w, NOTE_H, 9, { radius: 4, rough: 1.2, shadow: 0.55, tapes: ['top'], tapeLen: 48, tint: 'sage' });
    this.root.addAt(this.card, 0);
    if (!swap) this.root.setAlpha(0);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: swap ? 120 : 260 });
    this.scene.tweens.add({ targets: this.card, angle: { from: -2.5, to: -0.6 }, duration: 320, ease: 'Back.Out' });
  }
}
