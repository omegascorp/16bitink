import Phaser from 'phaser';
import { getSound } from '../host';
import { levelOrder } from '../level/levels';
import { goalNotes } from './hud/goalNotes';
import type { GameScene } from './GameScene';
import { DPR, screenScene, screenSize, toView, uiScaleOf, viewSize } from './hidpi';
import { HintNote } from './hud/hintNote';
import { LevelTag } from './hud/levelTag';
import { Meter, METER_H } from './hud/meter';
import { PauseCard } from './hud/pauseCard';
import { AbilityButton } from './hud/abilityButton';
import { ThumbStick } from './hud/thumbStick';
import { fadeUnder, type FadePiece } from './hud/underFade';
import { hitSize, hudPlan, type HudPlan } from './uiLayout';
import { STICK } from '../logic/joystick';
import { ROUND, roundButton, type RoundButton } from './uiPaint';

const MARGIN = 14;
const SIZES = { button: ROUND, margin: MARGIN, meterH: METER_H } as const;

/**
 * Over the board: the level's paper tag with the clock, the meter (score,
 * the goal's vine, lives), the pause and sound buttons, first-time hints
 * on a taped note, the thumbstick on a touch screen, and the pause card.
 * Laid out for a screen held either way (see hudPlan).
 */
export class HudScene extends Phaser.Scene {
  private tag!: LevelTag;
  private meter!: Meter;
  private hint!: HintNote;
  private pauseButton!: RoundButton;
  private soundButton!: RoundButton;
  private plan!: HudPlan;
  private pauseCard: PauseCard | null = null;
  private abilityButton: AbilityButton | null = null;
  private stick!: ThumbStick;

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
    // First, so it draws under the rest.
    this.stick = new ThumbStick(this);
    this.tag = new LevelTag(this, `${this.levelNumber()} · ${game.level.name}`, game.level.par);
    this.meter = new Meter(this, game.level.snake, game.world.maxLives);
    this.hint = new HintNote(this);
    this.pauseButton = roundButton(this, 0, 0, 'pause', () => this.togglePause());
    this.soundButton = roundButton(this, 0, 0, getSound(this)?.muted ? 'muted' : 'sound', () => this.toggleSound());
    const ability = game.world.ability;
    this.abilityButton = ability?.button ? new AbilityButton(this, ability, this.sys.game.device.os.desktop, (held) => this.game2().input2.setAbilityButton(held)) : null;
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
    if (this.abilityButton?.contains(v.x, v.y, this.plan.k)) return true;
    return [this.pauseButton, this.soundButton].some((b) => Math.abs(v.x - b.root.x) < r && Math.abs(v.y - b.root.y) < r);
  }

  /** The pieces of the interface go see-through while the snake slides under them. */
  private fadeUnderSnake(game: GameScene, dt: number): void {
    const pieces: FadePiece[] = [this.tag.root, this.meter.root, this.pauseButton.root, this.soundButton.root, ...(this.abilityButton ? [this.abilityButton.root] : [])]
      .map((root) => ({ box: root, fade: [root] }));
    // The hint's note fades in and out on its own: fade what's on it instead.
    pieces.push({ box: this.hint.root, fade: this.hint.faces });
    const snake = game.world.snake;
    const pts = snake.trail.pts.slice(0, snake.trail.count).map((p) => {
      const s = game.toScreen(p.x, p.y);
      return toView(s.x, s.y, this);
    });
    const z = game.cameras.main.zoom / DPR / uiScaleOf(this);
    fadeUnder(this.pauseCard ? [] : pieces, pts, (snake.width / 2) * z, dt);
  }

  private layout(): void {
    const view = viewSize(this);
    this.plan = hudPlan(view, screenSize(this), uiScaleOf(this), false, SIZES);
    const { k } = this.plan;
    this.tag.root.setPosition(this.plan.tag.x, this.plan.tag.y).setScale(k);
    this.meter.root.setPosition(this.plan.meter.x, this.plan.meter.y).setScale(k);
    [this.pauseButton, this.soundButton].forEach((b, i) => b.root.setPosition(this.plan.buttons[i]!.x, this.plan.buttons[i]!.y).setScale(k));
    this.hint.root.setPosition(view.width / 2, this.plan.hintY).setScale(k);
    // The ability's button in the corner a thumb reaches: bottom right, above the meter on an upright phone.
    const ab = AbilityButton.size;
    this.abilityButton?.root.setPosition(view.width - SIZES.margin - (ab.w / 2) * k, this.plan.upright ? this.plan.meter.y - SIZES.meterH * k - (ab.h / 2) * k : view.height - SIZES.margin - (ab.h / 2) * k).setScale(k);
    // The stick's resting ring in the opposite corner, above the meter and the hint on an upright phone.
    const r = (STICK.radius + 8) / uiScaleOf(this);
    const bottom = this.plan.upright ? this.plan.hintY - (HintNote.height / 2) * k - SIZES.margin : view.height - SIZES.margin * 2;
    this.stick.place(SIZES.margin * 2 + r, bottom - r);
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
    this.abilityButton?.root.setVisible(on);
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

  update(time: number, delta: number): void {
    const game = this.game2();
    const w = game.world;
    if (!w) return;
    this.fadeUnderSnake(game, delta / 1000);
    this.meter.update(w.score, w.progress, w.lives, time);
    const left = w.timeLeft;
    this.tag.update(w.elapsed, left !== null && left < 10, goalNotes(w));
    // A boss's word for this moment of the fight, then the ability's (down on the floor…), before any first-time hint.
    const touch = game.input2.touch;
    const now = w.boss?.prompt?.(w.snake) ?? w.ability?.prompt?.(w.snake) ?? null;
    this.hint.set(now ? (touch ? now.touch : now.mouse) : game.coach.current(touch));
    this.abilityButton?.update(time);
    this.stick.setVisible(!this.pauseCard && (touch || !this.sys.game.device.os.desktop));
    this.stick.update(game.input2.stickHold);
  }
}
