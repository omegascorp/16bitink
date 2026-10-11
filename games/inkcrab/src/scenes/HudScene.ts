import { shellFit } from '../art/shellFit';
import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED, RED_HEX } from '../art/palette';
import { getHost, getSound, REG } from '../host';
import { inStickZone, knobOffset, stickCentre, stickVector, STICK } from '../logic/joystick';
import { levelGoal, START_SHELL } from '../level/build';
import { capMark, levelProgress, sizeMarks } from '../logic/progress';
import { shellName, type ShellKind } from '../logic/shells';
import { TEX } from '../art/textures';
import { FOOT, FRAME, SHELL_MID } from '../art/frame';
import type { GameScene } from './GameScene';
import type { TouchState } from './game/input';
import { screenScene, screenSize, toView, uiScaleOf, viewSize } from './hidpi';
import { drawSandGauge, HEAP_MAX_W } from './sandGauge';
import { drawGrowthBar } from './growthBar';
import { HAND_FONT, inkButton, inkText, wobblyRect } from './ui';
import { drawTideClock } from './tideClock';
import { tidePhase, tideTurn } from '../logic/tide';
import { drawRainClock } from './rainClock';
import { drawWindClock } from './windClock';
import { drawMoonClock } from './moonClock';
import { rainTurn } from '../logic/rain';
import { windTurn } from '../logic/wind';
import { moonTurn } from '../logic/moon';
import { chainPrompt, missionGoal, missionLine, missionNotes, missionTag } from '../logic/mission';

const PANEL = { x: 16, y: 14, w: 380, h: 118 } as const;
/** A mission's line, in red pencil under the panel's last row; the panel grows to hold it. */
const MISSION = { y: 124, h: 24 } as const;
/** The sand heap sits in the panel's right end, its count under it. */
const HEAP_AT = { x: PANEL.x + PANEL.w - 16 - HEAP_MAX_W / 2, bottom: PANEL.y + PANEL.h - 30 } as const;
const BAR = { x: 30, y: 60, w: 190, h: 16 } as const;
/** Life icons: a little shell each, right to left from the pause button. */
const LIFE = { size: 30, gap: 36, y: 36 } as const;
const INTRO_MS = 3600;
const INTRO_NOTE_MS = 1500;
/** The pause button, top right; the lives start left of it. */
const PAUSE = { w: 52, h: 44, fromRight: 42 } as const;
/** The smallest a button may be on screen (CSS px), for a fingertip, however small the margin draws. */
const MIN_TAP = 44;
/** The pause button's top edge, units. */
const PAUSE_TOP = 14;
/** Space between the sound and pause buttons, units. */
const CORNER_GAP = 8;
/** The pause card's buttons: their height, and the card's width. */
const CARD_BUTTON_H = 52;
const PAUSE_CARD_W = 300;
const LIVES_FROM_RIGHT = 104;
/** Lives the layout makes room for (a level starts with three). */
const MAX_LIVES_SHOWN = 3;
/** Paper behind the HUD's loose lines of text on a night beach. */
const NIGHT_PAPER = 'rgba(245, 240, 225, 0.88)';
/** The tide clock (or the rain clock), under the lives at the top right. */
const TIDE = { r: 20, fromRight: 54, y: 96 } as const;

/** The on-screen jump button, bottom right (touch only). */
function jumpButton(width: number, height: number): { x: number; y: number; r: number } {
  return { x: width - 80, y: height - 110, r: 44 };
}

/** Hold to hide in the shell, left of the jump button (touch only). */
function hideButton(width: number, height: number): { x: number; y: number; r: number } {
  return { x: width - 180, y: height - 80, r: 34 };
}

/** The notebook margin: level, growth bar, lives, shell, carried sand, and touch controls. */
export class HudScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  /** The touch controls, drawn in screen CSS pixels (see create). */
  private controls!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private sizeText!: Phaser.GameObjects.Text;
  private lives: Phaser.GameObjects.Image[] = [];
  private pauseButton!: Phaser.GameObjects.Container;
  /** Sound on/off, left of the pause button (a note, struck through while muted). */
  private muteButton!: Phaser.GameObjects.Container;
  /** The pause card, while the game is paused. */
  private pauseLayer: Phaser.GameObjects.Container | null = null;
  private intro: Phaser.GameObjects.Container | null = null;
  /** The intro card is on its way out (the player has started, or its time is up). */
  private introLeaving = false;
  private coachText!: Phaser.GameObjects.Text;
  private coachBox!: Phaser.GameObjects.Graphics;
  private sand!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  private shell!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;
  private tideText!: Phaser.GameObjects.Text;
  private missionText!: Phaser.GameObjects.Text;
  private stickPointer: number | null = null;
  private hidePointer: number | null = null;
  private stickPull = { x: 0, y: 0 };
  private touchSeen = false;
  private modeKnown = false;

  constructor() {
    super('Hud');
  }

  create(): void {
    // Smaller on a phone, so the margin doesn't cover the beach.
    screenScene(this, true);
    // Touch controls and touch hints from the start on a touch screen (as InkFish), until a key is pressed.
    if (!this.modeKnown) {
      this.touchSeen = this.sys.game.device.input.touch;
      this.modeKnown = true;
    }
    // The scene object is reused across levels: a finger held down as the last one ended never lifted here.
    this.stickPointer = null;
    this.hidePointer = null;
    this.stickPull = { x: 0, y: 0 };
    this.intro = null;
    this.introLeaving = false;
    this.pauseLayer = null;
    this.g = this.add.graphics();
    // The stick and buttons stay thumb-sized however small the margin draws: drawn in screen pixels, scaled back up.
    this.controls = this.add.graphics();
    const text = (x: number, y: number, size: number, color = BLUE): Phaser.GameObjects.Text =>
      this.add.text(x, y, '', { fontFamily: HAND_FONT, fontSize: `${size}px`, color, padding: { x: 4, y: 2 } });
    const game = this.scene.get('Game') as GameScene;
    this.title = text(28, 20, 26);
    this.sizeText = text(BAR.x + BAR.w + 8, BAR.y - 4, 17);
    this.lives = [];
    this.pauseButton = inkButton(this, 0, LIFE.y, '❚❚', () => this.togglePause(), { width: PAUSE.w, height: PAUSE.h, size: 24 });
    this.muteButton = this.makeMuteButton();
    this.coachBox = this.add.graphics();
    this.coachText = inkText(this, 0, 0, '', 21).setWordWrapWidth(520).setAlign('center');
    this.showIntro(game);
    this.sand = text(HEAP_AT.x, HEAP_AT.bottom + 2, 16).setOrigin(0.5, 0);
    this.note = text(28, 82, 20);
    this.shell = text(28, 102, 18);
    this.prompt = text(0, 0, 24).setOrigin(0.5, 1);
    this.help = text(0, 0, 18).setOrigin(1, 1).setAlpha(0.7);
    this.tideText = text(0, 0, 18).setOrigin(1, 0.5);
    this.missionText = text(28, MISSION.y, 18, RED);
    // On a night beach the sky and sand behind the loose lines are dark: they get a scrap of paper behind them.
    if (game.beach.moon || game.beach.plankton) for (const t of [this.help, this.tideText, this.prompt]) t.setBackgroundColor(NIGHT_PAPER);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    // Pause keys live here: the Game scene's keyboard stops while it's paused.
    this.input.keyboard?.on('keydown-ESC', this.togglePause, this);
    this.input.keyboard?.on('keydown', () => (this.touchSeen = false));
    this.input.keyboard?.on('keydown-P', this.togglePause, this);
    // Pause when the tab is hidden, so nobody gets caught while away.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseIfRunning, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseIfRunning, this));
  }

  update(): void {
    const game = this.scene.get('Game') as GameScene;
    if (!game.level) return;
    const beach = game.beach;
    if (!beach) return;
    const { width, height } = viewSize(this);
    const c = beach.crab;
    const g = this.g;
    g.clear();
    const mission = missionLine(beach.mission, beach.progress, beach.chain);
    this.missionText.setText(mission).setVisible(mission !== '');
    const panelH = this.panelHeight(mission);
    g.fillStyle(PAPER_HEX, 0.88).fillRect(PANEL.x, PANEL.y, PANEL.w, panelH);
    wobblyRect(g, PANEL.x, PANEL.y, PANEL.w, panelH, 3, 1.6, BLUE_HEX);

    const start = game.startSize;
    const goal = levelGoal(game.level);
    drawGrowthBar(g, BAR, levelProgress(c.growth, start, goal), sizeMarks(start, goal), capMark(beach.cap, start, goal), beach.capped && beach.cap < goal);
    this.title.setText(game.level.name);
    this.sizeText.setText(`size ${c.growth.size} of ${goal}`);
    this.syncLives(beach.lives, (c.shell ?? START_SHELL).kind, width);
    this.drawCoach(game, width);
    this.pauseLayer?.setPosition(width / 2, height / 2);

    this.drawTide(game, width);
    this.drawRain(game, width);
    this.drawWind(game, width);
    this.drawMoon(game, width);
    drawSandGauge(g, HEAP_AT.x, HEAP_AT.bottom, c.sand, beach.sandCapacity);
    // Full, it digs nothing until it unloads; past full (a smaller shell) is a warning.
    const loaded = c.sand >= beach.sandCapacity;
    const unload = this.touchSeen ? 'tap to drop' : 'C to drop';
    this.sand.setText(loaded ? `${c.sand}/${beach.sandCapacity} · ${unload}` : `${c.sand}/${beach.sandCapacity}`);
    this.sand.setColor(c.sand > beach.sandCapacity ? RED : BLUE);
    // Centred under the heap, but kept inside the panel when the hint makes it long.
    this.sand.setX(Math.min(HEAP_AT.x, PANEL.x + PANEL.w - 8 - this.sand.width / 2));
    this.note.setText(c.swap ? 'moving house… exposed!' : c.hidden ? 'hiding in the shell' : beach.underKelp(c.body) ? 'under the kelp, out of sight' : beach.underDeck(c.body) ? 'under cover, safe from the sky' : beach.windOn(c.body) !== 0 && beach.gusting ? 'blown along by the gust!' : beach.gusting && beach.sheltered(c.body) ? 'in the lee, out of the wind' : beach.lit && beach.darkness > 0.5 ? 'lit up by the plankton: seen!' : beach.capped ? 'shell full, find a bigger one' : 'growing');
    this.note.setColor(c.swap ? RED : BLUE);
    this.shell.setText(c.shell ? `in a ${shellName(c.shell)}` : 'no shell!');

    const near = beach.nearbyShell;
    const rival = beach.nearbyRival;
    const chain = beach.chain;
    if (near && near.kind.type === 'shell' && !c.swap && beach.nearbyHeld && chain) {
      this.prompt.setText(`${shellName(near.kind.shell)} · ${chainPrompt(chain)}`).setPosition(width / 2, height - 24).setVisible(true);
    } else if (rival?.shell && !c.swap && !beach.nearbyFits) {
      const how = this.touchSeen ? 'tap it' : 'press E';
      this.prompt.setText(`hermit crab in a ${shellName(rival.shell)} · ${how} to rap on its shell`).setPosition(width / 2, height - 24).setVisible(true);
    } else if (near && near.kind.type === 'shell' && !c.swap) {
      const s = near.kind.shell;
      const how = this.touchSeen ? 'tap it' : 'press E';
      const verdict = beach.nearbyFits
        ? `${how} to move in`
        : c.growth.size < s.size - 1 ? 'too big for you yet' : 'too small for you now';
      this.prompt.setText(`${shellName(s)} · ${verdict}`).setPosition(width / 2, height - 24).setVisible(true);
    } else this.prompt.setVisible(false);

    this.help.setPosition(width - 14, height - 10).setText(this.touchSeen
      ? 'tap sand next to the crab to dig · tap open space to drop sand · hold the shell button to hide'
      : '←→ walk · ↑↓ aim · Space jump · X dig · C place sand · E move in · Z hide');
    this.controls.clear().setScale(1 / uiScaleOf(this));
    if (this.touchSeen) {
      const screen = screenSize(this);
      this.drawStick(screen.height);
      this.drawJumpButton(screen.width, screen.height);
      this.drawHideButton(screen.width, screen.height, c.hidden);
    }
  }

  /** The panel's height: taller with a mission line in it. */
  private panelHeight(mission: string): number {
    return mission ? PANEL.h + MISSION.h : PANEL.h;
  }

  /** The intro card gets out of the way as soon as the player starts: walking, digging or hiding. */
  private dismissIntroOnMove(game: GameScene): void {
    const intro = this.intro;
    if (!intro?.active || this.introLeaving) return;
    const c = game.beach.crab;
    if (Math.abs(c.body.vx) < 1 && c.sand === 0 && !c.hidden && c.swap === null) return;
    this.introLeaving = true;
    this.tweens.killTweensOf(intro);
    this.tweens.add({ targets: intro, alpha: 0, duration: 250, onComplete: () => intro.destroy() });
  }

  /** On a tidal beach: the tide clock and which way the water's going. */
  private drawTide(game: GameScene, width: number): void {
    const tide = game.beach.tide;
    this.tideText.setVisible(tide !== null);
    if (!tide) return;
    const t = game.beach.elapsed;
    const turn = tideTurn(tide, t);
    const level = (1 - Math.cos(tidePhase(tide, t) * Math.PI * 2)) / 2;
    const x = width - TIDE.fromRight - this.cornerInset() - 10;
    drawTideClock(this.g, x, this.tideY(width), TIDE.r, level, turn.rising);
    const secs = Math.ceil(turn.seconds);
    this.tideText.setText(turn.rising ? `tide coming in · high in ${secs}s` : `tide going out · low in ${secs}s`).setPosition(x - TIDE.r - 10, this.tideY(width));
  }

  /** On a monsoon beach: the rain clock, and how long until it pours or clears. */
  private drawRain(game: GameScene, width: number): void {
    const rain = game.beach.rain;
    if (!rain) return;
    this.tideText.setVisible(true);
    const turn = rainTurn(rain, game.beach.elapsed);
    const spell = turn.pouring ? rain.pour : rain.period - rain.pour;
    const x = width - TIDE.fromRight - this.cornerInset() - 10;
    drawRainClock(this.g, x, this.tideY(width), TIDE.r, 1 - turn.seconds / spell, turn.pouring);
    const secs = Math.ceil(turn.seconds);
    this.tideText.setText(turn.pouring ? `pouring · hunters half-blind · clears in ${secs}s` : `dry spell · rain in ${secs}s`).setPosition(x - TIDE.r - 10, this.tideY(width));
  }

  /** On a windy beach: the wind clock, which way the gust blows, and how long until it gets up or dies away. */
  private drawWind(game: GameScene, width: number): void {
    const wind = game.beach.wind;
    if (!wind) return;
    this.tideText.setVisible(true);
    const turn = windTurn(wind, game.beach.elapsed);
    const spell = turn.gusting ? wind.gust : wind.period - wind.gust;
    const x = width - TIDE.fromRight - this.cornerInset() - 10;
    drawWindClock(this.g, x, this.tideY(width), TIDE.r, 1 - turn.seconds / spell, turn.gusting, turn.dir);
    const secs = Math.ceil(turn.seconds);
    const way = turn.dir > 0 ? '→' : '←';
    this.tideText.setText(turn.gusting ? `gusting ${way} · dies down in ${secs}s` : `calm · gust ${way} in ${secs}s`).setPosition(x - TIDE.r - 10, this.tideY(width));
  }

  /** On a moonlit beach: the moon clock, and how long until a cloud covers it or it comes out. */
  private drawMoon(game: GameScene, width: number): void {
    const moon = game.beach.moon;
    if (!moon) return;
    this.tideText.setVisible(true);
    const turn = moonTurn(moon, game.beach.elapsed);
    const spell = turn.dark ? moon.dark : moon.period - moon.dark;
    const x = width - TIDE.fromRight - this.cornerInset() - 10;
    drawMoonClock(this.g, x, this.tideY(width), TIDE.r, 1 - turn.seconds / spell, turn.dark);
    const secs = Math.ceil(turn.seconds);
    this.tideText.setText(turn.dark ? `dark · hunters half-blind · moon out in ${secs}s` : `moonlight · cloud in ${secs}s`).setPosition(x - TIDE.r - 10, this.tideY(width));
  }

  private drawCoach(game: GameScene, width: number): void {
    this.dismissIntroOnMove(game);
    const hint = this.intro?.active ? null : game.coach.hint(game.beach, this.touchSeen ? 'touch' : 'keys');
    const box = this.coachBox.clear();
    this.coachText.setVisible(hint !== null);
    if (!hint) return;
    const top = PANEL.y + this.panelHeight(this.missionText.text) + 18;
    this.coachText.setWordWrapWidth(Math.min(640, width - 48)).setText(hint.text);
    const w = this.coachText.width + 28;
    const h = this.coachText.height + 16;
    this.coachText.setPosition(width / 2, top + h / 2);
    box.fillStyle(PAPER_HEX, 0.94).fillRect(width / 2 - w / 2, top, w, h);
    wobblyRect(box, width / 2 - w / 2, top, w, h, 13, 1.6, BLUE_HEX);
  }

  /** Lives as little shells by the pause button, top right. */
  private syncLives(n: number, kind: string, width: number): void {
    while (this.lives.length > Math.max(0, n)) this.lives.pop()?.destroy();
    while (this.lives.length < n) this.lives.push(this.add.image(0, 0, TEX.shell(kind, 0)).setOrigin(SHELL_MID / FRAME, FOOT.y / FRAME));
    // A pause button enlarged for a fingertip stays in the corner, and the lives make room for it.
    const k = this.tapScale(PAUSE.h);
    const pauseX = width - PAUSE.fromRight - this.pauseGrowth();
    const cornerY = PAUSE_TOP + (PAUSE.h * k) / 2;
    this.pauseButton.setScale(k).setPosition(pauseX, cornerY);
    this.muteButton.setScale(k).setPosition(pauseX - PAUSE.w * k - CORNER_GAP, cornerY);
    const scale = (LIFE.size / 116) * shellFit(kind as ShellKind);
    const row = this.livesRow(width);
    this.lives.forEach((img, i) => img.setTexture(TEX.shell(kind, 0)).setScale(scale).setPosition(row.x - i * LIFE.gap, row.y));
  }

  /** The level's name, goal and lesson, centred for a few seconds at the start. */
  private showIntro(game: GameScene): void {
    const { width, height } = viewSize(this);
    const w = Math.min(560, width - 32);
    const m = game.beach.mission;
    const tag = inkText(this, 0, 0, missionTag(m), 20, RED);
    const name = inkText(this, 0, 0, game.level.name, 34);
    const goal = inkText(this, 0, 0, missionGoal(m, levelGoal(game.level)), 24).setWordWrapWidth(w - 40).setAlign('center');
    const lines = [game.level.hint, ...missionNotes(m)];
    const hint = inkText(this, 0, 0, lines.join('\n'), 19).setWordWrapWidth(w - 40).setAlign('center').setAlpha(0.85);
    // Stacked top to bottom, the card sized to fit.
    const parts = [tag, name, goal, hint];
    const gap = 10;
    const h = parts.reduce((sum, t) => sum + t.height, 0) + gap * (parts.length - 1) + 36;
    let y = -h / 2 + 18;
    for (const t of parts) {
      t.setY(y + t.height / 2);
      y += t.height + gap;
    }
    const g = this.add.graphics();
    g.fillStyle(PAPER_HEX, 0.96).fillRect(-w / 2, -h / 2, w, h);
    wobblyRect(g, -w / 2, -h / 2, w, h, 21, 2, BLUE_HEX);
    this.intro = this.add.container(width / 2, height * 0.45, [g, ...parts]);
    // Each note of the mission gets a little longer to read.
    this.tweens.add({ targets: this.intro, alpha: 0, delay: INTRO_MS + missionNotes(m).length * INTRO_NOTE_MS, duration: 500, onStart: () => (this.introLeaving = true), onComplete: () => this.intro?.destroy() });
  }

  private pauseIfRunning(): void {
    if (!this.pauseLayer && this.scene.isActive('Game')) this.togglePause();
  }

  /** Pauses the game under a paper card, or takes the card away and plays on. */
  private togglePause(): void {
    const game = this.scene.get('Game') as GameScene;
    if (this.pauseLayer) {
      this.pauseLayer.destroy();
      this.pauseLayer = null;
      game.resumePlay();
      return;
    }
    if (!this.scene.isActive('Game')) return;
    game.pausePlay();
    this.letGo();
    // The intro card would only sit under the pause card.
    if (this.intro?.active) {
      this.tweens.killTweensOf(this.intro);
      this.intro.destroy();
    }
    const { width, height } = viewSize(this);
    const host = getHost(this);
    const wash = this.add.graphics();
    wash.fillStyle(PAPER_HEX, 0.88).fillRect(-2000, -2000, 4000, 4000);
    const hint = inkText(this, 0, -64, game.level.hint, 20).setWordWrapWidth(Math.min(520, width - 48)).setAlign('center').setAlpha(0.85);
    this.pauseLayer = this.add.container(width / 2, height / 2, [
      wash,
      inkText(this, 0, -150, 'Paused', 64),
      hint,
      inkButton(this, 0, 20, 'Keep scuttling', () => this.togglePause(), { width: 260 }),
      inkButton(this, 0, 90, 'Level select', () => game.quit(), { width: 260 }),
      inkButton(this, 0, 160, 'Exit to 16bit.ink', () => host.onExit(), { width: 260, size: 26 }),
    ]).setDepth(10);
    // Big enough to tap on a phone, but never wider than the screen.
    this.pauseLayer.setScale(Math.min(this.tapScale(CARD_BUTTON_H), (width - 24) / PAUSE_CARD_W));
  }

  /** The tide (or weather) clock's row: under the lives, and clear of an enlarged pause button. */
  private tideY(width: number): number {
    const row = this.livesRow(width);
    const below = row.stacked ? row.y + TIDE.r + 8 : PAUSE_TOP + PAUSE.h * this.tapScale(PAUSE.h) + TIDE.r + 6;
    return Math.max(TIDE.y, below);
  }

  /**
   * Where the lives go (the rightmost one's foot): beside the corner buttons,
   * or, on a screen too narrow for that without running into the panel, in a
   * row under them.
   */
  private livesRow(width: number): { readonly x: number; readonly y: number; readonly stacked: boolean } {
    const beside = width - LIVES_FROM_RIGHT - this.cornerInset();
    const leftmost = beside - (Math.max(this.lives.length, MAX_LIVES_SHOWN) - 1) * LIFE.gap - LIFE.size / 2;
    if (leftmost > PANEL.x + PANEL.w + 8) return { x: beside, y: LIFE.y + 12, stacked: false };
    return { x: width - 16 - LIFE.size / 2, y: PAUSE_TOP + PAUSE.h * this.tapScale(PAUSE.h) + LIFE.size + 6, stacked: true };
  }

  /** Sound on/off: a note, struck through in red while muted. M toggles it too (as in InkFish). */
  private makeMuteButton(): Phaser.GameObjects.Container {
    const sound = getSound(this);
    const strike = this.add.graphics();
    strike.lineStyle(3, RED_HEX, 0.9).lineBetween(-14, 12, 14, -12);
    const sync = (): void => {
      strike.setVisible(sound?.muted === true);
    };
    const toggle = (): void => {
      sound?.setMuted(!sound.muted);
      sync();
    };
    const button = inkButton(this, 0, LIFE.y, '♪', toggle, { width: PAUSE.w, height: PAUSE.h, size: 26 });
    button.add(strike);
    button.setVisible(sound !== undefined);
    this.input.keyboard?.on('keydown-M', toggle);
    sync();
    return button;
  }

  /** How far left of their old place the lives and clocks sit: past the sound button, and an enlarged pause button. */
  private cornerInset(): number {
    return this.pauseGrowth() * 2 + PAUSE.w * this.tapScale(PAUSE.h) + CORNER_GAP;
  }

  /** How much wider than drawn the pause button is, on each side, once enlarged for a fingertip. */
  private pauseGrowth(): number {
    return (PAUSE.w * (this.tapScale(PAUSE.h) - 1)) / 2;
  }

  /** How much to enlarge a button `h` units tall so it's at least MIN_TAP on screen. */
  private tapScale(h: number): number {
    return Math.max(1, MIN_TAP / (h * uiScaleOf(this)));
  }

  /** Lets go of the on-screen stick and hide button (fingers lifted while paused never reach them). */
  private letGo(): void {
    this.stickPointer = null;
    this.hidePointer = null;
    this.stickPull = { x: 0, y: 0 };
  }

  private touch(): TouchState | undefined {
    return this.registry.get(REG.touch) as TouchState | undefined;
  }

  private drawStick(height: number): void {
    const c = stickCentre(height);
    const k = knobOffset(this.stickPull.x, this.stickPull.y);
    this.controls.lineStyle(2, BLUE_HEX, 0.35).strokeCircle(c.x, c.y, STICK.radius);
    this.controls.fillStyle(BLUE_HEX, 0.25).fillCircle(c.x + k.x, c.y + k.y, 22);
  }

  private drawJumpButton(width: number, height: number): void {
    const b = jumpButton(width, height);
    this.controls.lineStyle(2, BLUE_HEX, 0.45).strokeCircle(b.x, b.y, b.r);
    this.controls.fillStyle(BLUE_HEX, 0.12).fillCircle(b.x, b.y, b.r);
    this.controls.lineStyle(3, BLUE_HEX, 0.6).lineBetween(b.x - 12, b.y + 6, b.x, b.y - 8).lineBetween(b.x, b.y - 8, b.x + 12, b.y + 6);
  }

  /** A shell drawn on the button; filled while held. */
  private drawHideButton(width: number, height: number, held: boolean): void {
    const b = hideButton(width, height);
    this.controls.lineStyle(2, BLUE_HEX, 0.45).strokeCircle(b.x, b.y, b.r);
    this.controls.fillStyle(BLUE_HEX, held ? 0.3 : 0.12).fillCircle(b.x, b.y, b.r);
    this.controls.lineStyle(3, BLUE_HEX, 0.6);
    this.controls.beginPath();
    this.controls.arc(b.x, b.y + 6, 14, Math.PI, 0);
    this.controls.closePath();
    this.controls.strokePath();
  }

  private onDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[] = []): void {
    // A press on a HUD button isn't a tap on the beach, and nothing reaches the beach while paused.
    if (over.length > 0 || this.pauseLayer) return;
    if (p.wasTouch) this.touchSeen = true;
    // The controls live in screen pixels (see create), and so do the beach's taps.
    const v = toView(p.x, p.y);
    const { width, height } = screenSize(this);
    const jb = jumpButton(width, height);
    if (p.wasTouch && Math.hypot(v.x - jb.x, v.y - jb.y) <= jb.r) {
      const t = this.touch();
      if (t) t.jump = true;
      return;
    }
    const hb = hideButton(width, height);
    if (p.wasTouch && Math.hypot(v.x - hb.x, v.y - hb.y) <= hb.r) {
      this.hidePointer = p.id;
      const t = this.touch();
      if (t) t.hide = true;
      return;
    }
    if (p.wasTouch && this.stickPointer === null && inStickZone(v.x, v.y, height)) {
      this.stickPointer = p.id;
      this.onMove(p);
      return;
    }
    this.touch()?.taps.push(v);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.stickPointer) return;
    const v = toView(p.x, p.y);
    const c = stickCentre(screenSize(this).height);
    this.stickPull = { x: v.x - c.x, y: v.y - c.y };
    const s = stickVector(this.stickPull.x, this.stickPull.y);
    const t = this.touch();
    if (t) {
      t.stickX = s.x;
      t.stickY = s.y;
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.hidePointer) {
      this.hidePointer = null;
      const t = this.touch();
      if (t) t.hide = false;
      return;
    }
    if (p.id !== this.stickPointer) return;
    this.stickPointer = null;
    this.stickPull = { x: 0, y: 0 };
    const t = this.touch();
    if (t) {
      t.stickX = 0;
      t.stickY = 0;
    }
  }
}
