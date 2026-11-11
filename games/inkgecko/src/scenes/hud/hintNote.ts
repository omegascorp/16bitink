import Phaser from 'phaser';
import { BLUE } from '../../art/palette';
import { HAND, paperCard } from '../uiPaint';

const NOTE_H = 52;
/** Notes are baked in widths of this step, so a few sizes serve every hint. */
const STEP = 40;
/** Room either side of a note's words, units. */
const PAD = 44;

/**
 * The coach's first-time hint, on a slip of sage-washed paper taped to
 * the board. It fades in when a hint comes and out when it's done.
 */
export class HintNote {
  /** The note's height, units. */
  static readonly height = NOTE_H;
  readonly root: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private card: Phaser.GameObjects.Image | null = null;
  private shown: string | null = null;
  /** The widest a note may be, units (a narrow screen wraps its hint onto two lines). */
  private maxW = Infinity;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add.text(0, 2, '', { fontFamily: HAND, fontSize: '24px', color: BLUE, padding: { x: 4, y: 4 }, align: 'center', lineSpacing: -6 }).setOrigin(0.5);
    this.root = scene.add.container(0, 0, [this.text]).setAlpha(0);
  }

  /** Keeps notes at most `w` units wide from the next hint on. */
  fitWidth(w: number): void {
    if (w === this.maxW) return;
    this.maxW = w;
    const hint = this.shown;
    this.shown = null;
    if (hint) this.set(hint);
  }

  set(hint: string | null): void {
    if (hint === this.shown) return;
    this.shown = hint;
    this.scene.tweens.killTweensOf(this.root);
    if (!hint) {
      this.scene.tweens.add({ targets: this.root, alpha: 0, duration: 220 });
      return;
    }
    // The widest card a step allows, and the words wrapped to fit inside it.
    const widest = Number.isFinite(this.maxW) ? Math.max(STEP * 3, Math.floor(this.maxW / STEP) * STEP) : Infinity;
    this.text.setWordWrapWidth(Number.isFinite(widest) ? widest - PAD : null).setText(hint);
    const w = Math.min(Math.ceil((this.text.width + PAD) / STEP) * STEP, widest);
    const h = Math.max(NOTE_H, Math.ceil((this.text.height + 16) / 8) * 8);
    this.card?.destroy();
    this.card = paperCard(this.scene, 0, 0, w, h, 9, { radius: 4, rough: 1.2, shadow: 0.55, tapes: ['top'], tapeLen: 48, tint: 'sage' });
    this.root.addAt(this.card, 0);
    this.root.setAlpha(0);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 260 });
    this.scene.tweens.add({ targets: this.card, angle: { from: -2.5, to: -0.6 }, duration: 320, ease: 'Back.Out' });
  }
}
