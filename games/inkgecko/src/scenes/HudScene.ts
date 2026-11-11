import Phaser from 'phaser';
import { getSound } from '../host';
import { levelOrder } from '../level/levels';
import { CHARM_NAMES } from '../logic/charms';
import { goalNotes } from './hud/goalNotes';
import type { GameScene } from './GameScene';
import { screenScene, toView, uiScaleOf, viewSize } from './hidpi';
import { HintNote } from './hud/hintNote';
import { COMPACT_TAG, LevelTag } from './hud/levelTag';
import { columnHeight, Meter, METER_COL_W, METER_H } from './hud/meter';
import { PauseCard } from './hud/pauseCard';
import { ThumbStick } from './hud/thumbStick';
import { TouchButtons } from './hud/touchButtons';
import { hitSize, hudPlan, type HudPlan } from './uiLayout';
import { ROUND, roundButton, type RoundButton } from './uiPaint';

const MARGIN = 14;
const SIZES = { button: ROUND, margin: MARGIN, meterH: METER_H, tagW: COMPACT_TAG.w, colW: METER_COL_W } as const;

/**
 * Over the board: the level's paper tag with the clock, the meter (score,
 * the bar's vine, lives), the pause and sound buttons, first-time hints
 * on a taped note, the thumbstick and the Spit and Swap buttons on a touch
 * screen, and the pause card. Laid out round the board as the game's stage
 * says (see hudPlan); a turned phone may change which tag and meter it uses.
 */
export class HudScene extends Phaser.Scene {
  private tag!: LevelTag;
  private meter!: Meter;
  private hint!: HintNote;
  private pauseButton!: RoundButton;
  private soundButton!: RoundButton;
  private plan!: HudPlan;
  private pauseCard: PauseCard | null = null;
  private stick!: ThumbStick;
  private touchButtons!: TouchButtons;
  /** The tag and meter's current forms, so a new plan knows when to build them afresh. */
  private shape = '';

  constructor() {
    super('Hud');
  }

  private game2(): GameScene {
    return this.scene.get('Game') as GameScene;
  }

  create(): void {
    screenScene(this, true);
    this.pauseCard = null;
    this.shape = '';
    this.hint = new HintNote(this);
    this.stick = new ThumbStick(this);
    this.touchButtons = new TouchButtons(this);
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

  /** Builds the tag and meter in the forms `plan` wants, if they aren't already. */
  private shapePieces(plan: HudPlan): void {
    const shape = `${plan.tag.compact}/${plan.meter.column}`;
    if (shape === this.shape) return;
    this.shape = shape;
    this.tag?.root.destroy();
    this.meter?.root.destroy();
    const game = this.game2();
    this.tag = new LevelTag(this, `${this.levelNumber()} · ${game.level.name}`, game.level.par, plan.tag.compact);
    this.meter = new Meter(this, game.board.maxLives, plan.meter.column);
    // Hints and the pause card lie over the tag and meter.
    this.children.sendToBack(this.meter.root);
    this.children.sendToBack(this.tag.root);
    this.showPieces(!this.pauseCard);
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
    const game = this.game2();
    this.plan = hudPlan(view, game.stage(), uiScaleOf(this), game.board.rail, { ...SIZES, colH: columnHeight(game.board.maxLives) });
    const { k } = this.plan;
    this.shapePieces(this.plan);
    this.tag.root.setPosition(this.plan.tag.x, this.plan.tag.y).setScale(k);
    this.meter.root.setPosition(this.plan.meter.x, this.plan.meter.y).setScale(k * this.plan.meter.scale);
    const [pause, sound] = this.plan.buttons;
    this.pauseButton.root.setPosition(pause!.x, pause!.y).setScale(k);
    // A touch screen held sideways keeps the sound switch on the pause card.
    this.soundButton.root.setVisible(!!sound && !this.pauseCard);
    if (sound) this.soundButton.root.setPosition(sound.x, sound.y).setScale(k);
    this.hint.root.setPosition(view.width / 2, this.plan.hintY).setScale(k);
    this.hint.fitWidth(this.plan.hintW);
    this.stick.place(this.plan.stick.x, this.plan.stick.y);
    this.touchButtons.place(this.plan.fire, this.plan.swap);
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

  /** Where the thumbstick rests, CSS px, or null while it isn't shown (a mouse, or paused). */
  stickRest(): { x: number; y: number } | null {
    return this.stick?.restCss() ?? null;
  }

  /** The tag, meter, buttons and hint hide while the pause card (which says it all) is up. */
  private showPieces(on: boolean): void {
    [this.tag.root, this.meter.root, this.hint.root, this.pauseButton.root].forEach((o) => o.setVisible(on));
    this.soundButton.root.setVisible(on && (this.plan?.buttons.length ?? 2) > 1);
  }

  /** Where the Spit and Swap buttons are, CSS px, or null while they aren't shown. */
  touchDiscs(): ReturnType<TouchButtons['discs']> {
    return this.touchButtons?.discs() ?? null;
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
    const charms = [...goalNotes(b), ...(Object.entries(b.timers) as [keyof typeof b.timers, number][]).filter(([, t]) => t > 0).map(([c, t]) => `${CHARM_NAMES[c]} ${Math.ceil(t)}s`)];
    if (b.burstArmed) charms.push('Burst ready');
    if (b.dragonfly) charms.push('Dragonfly ready');
    this.tag.update(b.elapsed, b.danger > 0.85, charms);
    this.hint.set(game.coach.current(game.input2.touch));
    const touch = !this.pauseCard && (game.input2.touch || !this.sys.game.device.os.desktop);
    this.stick.setVisible(touch);
    this.stick.update(game.input2.stickHold);
    this.touchButtons.setVisible(touch);
    if (touch) this.touchButtons.update(b.loaded, b.next, game.input2.isPressing('fire'), game.input2.isPressing('swap'), time);
  }
}
