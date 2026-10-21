import Phaser from 'phaser';
import { getSound } from '../host';
import { levelOrder } from '../level/levels';
import { CHARM_NAMES } from '../logic/charms';
import type { GameScene } from './GameScene';
import { screenScene, screenSize, toView, uiScaleOf, viewSize } from './hidpi';
import { HintNote } from './hud/hintNote';
import { LevelTag } from './hud/levelTag';
import { Meter, METER_H } from './hud/meter';
import { PauseCard } from './hud/pauseCard';
import { hitSize, hudPlan, type HudPlan } from './uiLayout';
import { ROUND, roundButton, type RoundButton } from './uiPaint';

const MARGIN = 14;
const SIZES = { button: ROUND, margin: MARGIN, meterH: METER_H } as const;

/**
 * Over the board: the level's paper tag with the clock, the meter (score,
 * the bar's vine, lives), the pause and sound buttons, first-time hints
 * on a taped note, and the pause card. Laid out for a screen held either
 * way (see hudPlan).
 */
export class HudScene extends Phaser.Scene {
  private tag!: LevelTag;
  private meter!: Meter;
  private hint!: HintNote;
  private pauseButton!: RoundButton;
  private soundButton!: RoundButton;
  private plan!: HudPlan;
  private pauseCard: PauseCard | null = null;

  constructor() {
    super('Hud');
  }

  private game2(): GameScene {
    return this.scene.get('Game') as GameScene;
  }

  create(): void {
    screenScene(this, true);
    this.pauseCard = null;
    const game = this.game2();
    this.tag = new LevelTag(this, `${this.levelNumber()} · ${game.level.name}`, game.level.par);
    this.meter = new Meter(this);
    this.hint = new HintNote(this);
    this.pauseButton = roundButton(this, 0, 0, 'pause', () => this.togglePause());
    this.soundButton = roundButton(this, 0, 0, getSound(this)?.muted ? 'muted' : 'sound', () => this.toggleSound());
    this.layout();
    // Here rather than in the game's input, so Esc can also unpause the paused game.
    const kb = this.input.keyboard;
    kb?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
      else if (e.code === 'KeyM') this.toggleSound();
      else if (e.code === 'Enter' && this.pauseCard) this.resume();
    });
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      this.pauseCard?.destroy();
      this.pauseCard = null;
      PauseCard.free(this);
    });
  }

  private levelNumber(): number {
    return levelOrder().indexOf(this.game2().level.id) + 1;
  }

  /** True when a press at pointer `p` is on the HUD's buttons (or the pause card), not the board. */
  covers(p: Phaser.Input.Pointer): boolean {
    if (this.pauseCard) return true;
    const v = toView(p.x, p.y, this);
    const r = (hitSize(ROUND, uiScaleOf(this) * this.plan.k) * this.plan.k) / 2;
    return [this.pauseButton, this.soundButton].some((b) => Math.abs(v.x - b.root.x) < r && Math.abs(v.y - b.root.y) < r);
  }

  private layout(): void {
    const view = viewSize(this);
    this.plan = hudPlan(view, screenSize(this), uiScaleOf(this), this.game2().board.rail, SIZES);
    const { k } = this.plan;
    this.tag.root.setPosition(this.plan.tag.x, this.plan.tag.y).setScale(k);
    this.meter.root.setPosition(this.plan.meter.x, this.plan.meter.y).setScale(k);
    [this.pauseButton, this.soundButton].forEach((b, i) => b.root.setPosition(this.plan.buttons[i]!.x, this.plan.buttons[i]!.y).setScale(k));
    this.hint.root.setPosition(view.width / 2, this.plan.hintY).setScale(k);
    if (this.pauseCard) {
      // A turned or resized screen lays the card out afresh.
      this.pauseCard.destroy();
      this.pauseCard = this.openCard();
    }
  }

  toggleSound(): void {
    const sound = getSound(this);
    if (!sound) return;
    sound.setMuted(!sound.muted);
    this.soundButton.setIcon(sound.muted ? 'muted' : 'sound');
    this.pauseCard?.setMuted(sound.muted);
  }

  togglePause(): void {
    if (this.pauseCard) this.resume();
    else this.pause();
  }

  private pause(): void {
    this.game2().pausePlay();
    this.pauseCard = this.openCard();
    this.showPieces(false);
  }

  /** The tag, meter, buttons and hint hide while the pause card (which says it all) is up. */
  private showPieces(on: boolean): void {
    [this.tag.root, this.meter.root, this.hint.root, this.pauseButton.root, this.soundButton.root].forEach((o) => o.setVisible(on));
  }

  private openCard(): PauseCard {
    const game = this.game2();
    return new PauseCard(this, {
      game, view: viewSize(this), upright: this.plan.upright, touch: game.input2.touch || !this.sys.game.device.os.desktop,
      title: { n: this.levelNumber(), name: game.level.name },
      onResume: () => this.resume(),
      onSound: () => this.toggleSound(),
    });
  }

  private resume(): void {
    this.pauseCard?.destroy();
    this.pauseCard = null;
    this.showPieces(true);
    this.game2().resumePlay();
  }

  update(time: number): void {
    const game = this.game2();
    const b = game.board;
    if (!b) return;
    this.meter.update(b.score, b.progress, b.filled, b.lives, time);
    const charms = (Object.entries(b.timers) as [keyof typeof b.timers, number][]).filter(([, t]) => t > 0).map(([c, t]) => `${CHARM_NAMES[c]} ${Math.ceil(t)}s`);
    if (b.burstArmed) charms.push('Burst ready');
    if (b.dragonfly) charms.push('Dragonfly ready');
    this.tag.update(b.elapsed, b.danger > 0.85, charms);
    this.hint.set(game.coach.current(game.input2.touch));
  }
}
