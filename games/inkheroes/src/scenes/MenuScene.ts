import Phaser from 'phaser';
import { SCENERY } from '../art/pixel/scenery';
import { BACKDROP } from '../art/palette';
import type { GameHost } from '@16bitink/game-sdk';
import { getFullError, getHost, getSound, trackOffer } from '../host';
import { CHAPTERS, isLoaded, partsOf, type ChapterDef } from '../level/maps';
import { calendar } from '../logic/adventure';
import { loadProgress, type Progress } from '../logic/save';
import { loadPaidMaps } from './BootScene';
import { heroArt, nearest, PX_TEX, unitArt } from './battle/pixelAssets';
import { FIGURE_DEPTH, PixelFigure } from './battle/pixelFigure';
import { drawRule } from './battle/pixelFrames';
import { renderPixelText } from './battle/pixelFont';
import { DriftingScenery } from './battle/driftingScenery';
import { HORIZON_Y } from './battle/pixelScenery';
import { PixelButton, PixelImage, TextLabel, texturePixels } from './battle/pixelUi';
import { openCard } from './CardScene';
import { SOUND_BTN, soundCard } from './soundCard';
import { loadMenuArt } from './map/pixelMapArt';
import { chapterCard, chapterCardHeight, chapterCardWidth, type ChapterCardSpec } from './menu/chapterCard';
import { spreadCard } from './menu/chapterProgress';
import { drawWordmark } from './menu/wordmark';
import { pixelUiCamera } from './pixelScreen';
import { Session } from './session';

/** Where the horizon sits down the screen, and how far up from the bottom the muster stands. */
const HORIZON_AT = 0.5;
const MUSTER_FOOT = 22;
const SCENERY_SEED = 3041;
const TERRAIN = 'grass';
/** Between two chapters' cards standing side by side, UI pixels. */
const PAIR_GAP = 16;
/** The room the cards keep from the screen's edges. */
const EDGE = 16;
const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

/**
 * The campaign, as pixel art on the art's grid like the battle: a landscape
 * composed from the battle's grass scenery under the game's gold wordmark,
 * Continue, and chapter 1's maps as framed cards with their pictures and
 * how far this game has come. The army musters on the grass either side, breathing.
 */
export class MenuScene extends Phaser.Scene {
  private size = { w: 0, h: 0, k: 1 };
  private owned: { destroy(): void }[] = [];
  private keys: string[] = [];
  private figures: PixelFigure[] = [];
  private layer: Phaser.GameObjects.Layer | null = null;
  private ready = false;
  private country: DriftingScenery | null = null;
  /** How far the clouds have drifted (kept when the menu is redrawn). */
  private drift = 0;
  /** The chapter shown when only one card fits (an index into CHAPTERS). */
  private shown: number | null = null;
  /** The full game's offer was counted as seen on this visit. */
  private offered = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    getSound(this)?.music('map');
    this.cameras.main.setBackgroundColor(BACKDROP);
    this.ready = false;
    this.offered = false;
    this.owned = [];
    this.keys = [];
    this.figures = [];
    const fit = pixelUiCamera(this, (size) => {
      this.size = size;
      if (this.ready) this.draw();
    });
    this.size = fit();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clear());
    const atlasKey = PX_TEX.scenery(TERRAIN);
    if (!this.textures.exists(atlasKey)) this.load.image(atlasKey, SCENERY[TERRAIN]!.url);
    void loadMenuArt(this).then(() => {
      nearest(this, atlasKey);
      if (!this.sys.isActive()) return;
      this.ready = true;
      this.draw();
    });
  }

  update(_t: number, delta: number): void {
    for (const f of this.figures) f.update(delta);
    this.country?.update(delta);
  }

  private clear(): void {
    if (this.country) this.drift = this.country.drift;
    this.country?.destroy();
    this.country = null;
    for (const o of this.owned) o.destroy();
    for (const f of this.figures) f.destroy();
    for (const k of this.keys) if (this.textures.exists(k)) this.textures.remove(k);
    this.layer?.destroy();
    this.owned = [];
    this.keys = [];
    this.figures = [];
    this.layer = null;
    this.children.removeAll(true);
  }

  private draw(): void {
    this.clear();
    const { w, h } = this.size;
    const host = getHost(this);
    const progress = loadProgress(host.storage);
    this.backdrop();
    this.layer = this.add.layer().setDepth(1);
    const ui = this.add.container(0, 0).setDepth(2);
    // The wordmark: as big as the screen's width allows.
    const mask = renderPixelText({ lines: ['InkHeroes'] }, { ink: [255, 255, 255, 255] });
    const scale = Math.max(2, Math.min(5, Math.floor((w - 24) / mask.w)));
    const markH = mask.h * scale + 7;
    const head = markH + 2 + 15 + 12;
    const specs = CHAPTERS.map((c) => this.cardSpec(c, host, progress));
    // Every chapter's card side by side where they fit, else one at a time with a way across.
    const pairW = specs.reduce((n, sp) => n + chapterCardWidth(sp), 0) + PAIR_GAP * (specs.length - 1);
    const pairH = Math.max(...specs.map((sp) => chapterCardHeight(sp)));
    const pair = pairW + EDGE * 2 <= w && head + pairH + EDGE <= h - MUSTER_FOOT;
    const one = this.shown ?? this.defaultChapter();
    const shownSpecs = pair ? specs : [specs[one]!].map((tall) => ({ ...tall, wide: spreadCard(head + chapterCardHeight(tall), chapterCardWidth({ ...tall, wide: true }), { w, h }) }));
    const blockW = pair ? pairW : chapterCardWidth(shownSpecs[0]!);
    const blockH = head + Math.max(...shownSpecs.map((sp) => chapterCardHeight(sp)));
    const top = Math.max(8, Math.floor((h - MUSTER_FOOT - blockH) / 2) - 10);
    const mark = new PixelImage(this, drawWordmark(mask, scale), { x: 0.5, y: 0 }).setPosition(Math.floor(w / 2), top);
    this.owned.push(mark);
    ui.add(mark.img);
    const y = top + mark.height + 2 + 15 + 12;
    let left = Math.floor((w - blockW) / 2);
    shownSpecs.forEach((spec, i) => {
      const c = pair ? CHAPTERS[i]! : CHAPTERS[one]!;
      const cw = chapterCardWidth(spec);
      this.heading(ui, c, left + Math.floor(cw / 2), top + mark.height + 2, pair ? null : one);
      ui.add(chapterCard(this, this.owned, spec).setPosition(left, y));
      left += cw + PAIR_GAP;
    });
    this.muster({ bottom: y + blockH - head, left: Math.floor((w - blockW) / 2) });
    this.soundButton(ui);
  }

  /** The chapter to show first when only one fits: the last with a game in play, else the first. */
  private defaultChapter(): number {
    const host = getHost(this);
    const inPlay = CHAPTERS.map((c, i) => (isLoaded(c) && Session.look(host, c) ? i : -1)).filter((i) => i >= 0);
    return inPlay[inPlay.length - 1] ?? 0;
  }

  /** "Chapter II · The Two Lands" over a card, with arrows to the other chapters when only one card fits (`one`: the one shown). */
  private heading(ui: Phaser.GameObjects.Container, c: ChapterDef, cx: number, y: number, one: number | null): void {
    const label = new TextLabel(this, { kind: 'title', anchor: { x: 0.5, y: 0 } }).setText(`Chapter ${ROMAN[c.n - 1] ?? c.n} · ${c.name}`).setPosition(cx, y);
    const rule = new PixelImage(this, drawRule(Math.min(this.size.w - 20, label.width + 60)), { x: 0.5, y: 0 }).setPosition(cx, y + label.height + 1);
    this.owned.push(label, rule);
    ui.add([label.img, rule.img]);
    if (one === null || CHAPTERS.length < 2) return;
    const step = (by: number, x: number, text: string): void => {
      const to = one + by;
      if (to < 0 || to >= CHAPTERS.length) return;
      const btn = new PixelButton(this, { w: 22, h: 18, label: text, onClick: () => {
        this.shown = to;
        this.draw();
      } });
      btn.setPosition(x, y - 2);
      this.owned.push(btn);
      ui.add(btn.root);
    };
    step(-1, Math.floor(cx - label.width / 2) - 30, '<');
    step(1, Math.ceil(cx + label.width / 2) + 8, '>');
  }

  /** Chapter `c`'s card: its game, or (the full game's, not loaded) what it is and how to get it. */
  private cardSpec(c: ChapterDef, host: GameHost, progress: Progress): ChapterCardSpec {
    const base = { records: progress.maps, last: c.last };
    if (!isLoaded(c)) {
      return { ...base, parts: c.parts, playing: null, ...this.lockedOf(c, host) };
    }
    const looked = Session.look(host, c);
    return {
      ...base, parts: partsOf(c),
      playing: looked ? { def: looked.def, when: calendar(looked.day) } : null,
      onPlay: () => this.play(c),
      ...(looked ? { onStartOver: () => this.startOver(c, looked) } : {}),
    };
  }

  /** A chapter the player can't play now: an owner whose maps didn't come can try again; anyone else sees the offer. */
  private lockedOf(c: ChapterDef, host: GameHost): Pick<ChapterCardSpec, 'locked' | 'onPlay'> {
    if (host.unlocked) {
      const retry = (): void => void loadPaidMaps(this).then(() => this.sys.isActive() && this.draw());
      return { locked: { pitch: getFullError(this) ?? 'Your full game is still on its way.', label: 'Try again' }, onPlay: retry };
    }
    if (!this.offered && host.price) {
      this.offered = true;
      trackOffer(this, 'locked');
    }
    const label = host.price ? `Unlock · ${host.price}` : 'In the full game';
    return { locked: { pitch: `The full game: ${c.pitch}`, label }, onPlay: () => host.onBuy('locked') };
  }

  /** The sound switches, in the corner. */
  private soundButton(ui: Phaser.GameObjects.Container): void {
    const sound = getSound(this);
    if (!sound) return;
    const btn = new PixelButton(this, { w: SOUND_BTN.w, h: SOUND_BTN.h, label: 'Sound', onClick: () => soundCard(sound, (spec) => openCard(this, spec)) });
    btn.setPosition(this.size.w - SOUND_BTN.w - SOUND_BTN.margin, SOUND_BTN.margin);
    this.owned.push(btn);
    ui.add(btn.root);
  }

  /** The battle's grass scenery composed for the whole screen, the horizon half way down. */
  private backdrop(): void {
    const { w, h } = this.size;
    const atlas = texturePixels(this, PX_TEX.scenery(TERRAIN));
    const top = HORIZON_Y - Math.floor(h * HORIZON_AT);
    // The sky, its clouds drifting as in a battle, and the country in front.
    this.country = new DriftingScenery(this, { atlas, art: SCENERY[TERRAIN]!, seed: SCENERY_SEED, area: { x: 480 - Math.floor(w / 2), y: top, w, h }, at: { x: 0, y: 0 }, depth: 0, drift: this.drift });
  }

  /** The army on the grass either side of the cards (`clear`: where the cards end, and their left edge), facing in. */
  private muster(clear: { bottom: number; left: number }): void {
    const { w, h } = this.size;
    const foot = h - MUSTER_FOOT;
    const hero = heroArt();
    const left: [string, number][] = [['hero', 70], ['spearman', 150], ['bowman', 212]];
    const right: [string, number][] = [['griffin', 82], ['swordsman', 168], ['monk', 250]];
    // A figure would stand behind a card unless the cards end above its head or it stands clear of their side.
    const fits = (x: number, art: { footY: number }): boolean => clear.bottom < foot - art.footY + 10 || x + 40 < clear.left;
    const place = (id: string, x: number, mirrored: boolean): void => {
      const art = id === 'hero' ? hero.art : unitArt(id);
      // Each side keeps to its own half of the screen.
      if (!fits(x, art) || x > w / 2 - 36) return;
      const key = id === 'hero' ? (pose: 'idle' | 'walk' | 'attack') => PX_TEX.hero(hero.id, pose) : () => PX_TEX.unit(id, 'idle');
      const fig = new PixelFigure(this, this.layer!, art, key, { x: mirrored ? w - x : x, y: foot }, mirrored);
      fig.sprite.setDepth(FIGURE_DEPTH + foot);
      this.figures.push(fig);
    };
    for (const [id, x] of left) place(id, x, false);
    for (const [id, x] of right) place(id, x, true);
  }

  /** Continue chapter `c`'s saved game, or start the chapter from its first part. */
  private play(c: ChapterDef): void {
    const host = getHost(this);
    if (!Session.resume(this, host, c)) Session.begin(this, host, partsOf(c)[0]!);
    this.scene.start('Map');
  }

  private startOver(c: ChapterDef, looked: { readonly def: { readonly name: string }; readonly day: number }): void {
    openCard(this, {
      title: 'Start the chapter over?',
      body: `Your game on ${looked.def.name} (${calendar(looked.day)}) will be lost.`,
      buttons: [
        { label: 'Start over', onClick: () => {
          const host = getHost(this);
          const saved = Session.resume(this, host, c);
          if (saved) saved.abandon(this);
          else Session.discard(host, c);
          this.play(c);
        } },
        { label: 'Keep my game', kind: 'plain', onClick: () => undefined },
      ],
    });
  }
}
