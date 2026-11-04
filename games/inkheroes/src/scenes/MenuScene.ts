import Phaser from 'phaser';
import { SCENERY } from '../art/pixel/scenery';
import { BACKDROP } from '../art/palette';
import { getHost } from '../host';
import { MAPS } from '../level/maps';
import { calendar } from '../logic/adventure';
import { loadProgress } from '../logic/save';
import { heroArt, nearest, PX_TEX, unitArt } from './battle/pixelAssets';
import { FIGURE_DEPTH, PixelFigure } from './battle/pixelFigure';
import { drawRule } from './battle/pixelFrames';
import { renderPixelText } from './battle/pixelFont';
import { DriftingScenery } from './battle/driftingScenery';
import { HORIZON_Y } from './battle/pixelScenery';
import { PixelImage, TextLabel, texturePixels } from './battle/pixelUi';
import { openCard } from './CardScene';
import { loadMenuArt } from './map/pixelMapArt';
import { chapterCard, chapterCardHeight, CHAPTER_CARD_W, type ChapterCardSpec } from './menu/chapterCard';
import { drawWordmark } from './menu/wordmark';
import { pixelUiCamera } from './pixelScreen';
import { Session } from './session';

/** Where the horizon sits down the screen, and how far up from the bottom the muster stands. */
const HORIZON_AT = 0.5;
const MUSTER_FOOT = 22;
const SCENERY_SEED = 3041;
const TERRAIN = 'grass';

/**
 * The campaign, as pixel art on the art's grid like the battle: a landscape
 * composed from the battle's grass scenery under the game's gold wordmark,
 * Continue, and chapter 1's maps as framed cards with their pictures and
 * the laurels won. The army musters on the grass either side, breathing.
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

  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BACKDROP);
    this.ready = false;
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
    const resumed = Session.resume(this, host);
    this.backdrop();
    this.layer = this.add.layer().setDepth(1);
    const ui = this.add.container(0, 0).setDepth(2);
    // The wordmark: as big as the screen's width allows.
    const mask = renderPixelText({ lines: ['INKHEROES'] }, { ink: [255, 255, 255, 255] });
    const scale = Math.max(2, Math.min(5, Math.floor((w - 24) / mask.w)));
    const spec: ChapterCardSpec = {
      parts: MAPS, records: progress.maps,
      playing: resumed ? { def: resumed.def, when: calendar(resumed.adv.day) } : null,
      onPlay: () => this.play(resumed),
      ...(resumed ? { onStartOver: () => this.startOver(resumed) } : {}),
    };
    // The title and the chapter's card as one block, centred in the screen above the muster.
    const markH = mask.h * scale + 7;
    const head = markH + 2 + 15 + 12;
    const blockH = head + chapterCardHeight(spec);
    const top = Math.max(8, Math.floor((h - MUSTER_FOOT - blockH) / 2) - 10);
    const mark = new PixelImage(this, drawWordmark(mask, scale), { x: 0.5, y: 0 }).setPosition(Math.floor(w / 2), top);
    const chapter = new TextLabel(this, { kind: 'title', anchor: { x: 0.5, y: 0 } }).setText('Chapter I · The Border March').setPosition(Math.floor(w / 2), top + mark.height + 2);
    const rule = new PixelImage(this, drawRule(Math.min(w - 20, chapter.width + 60)), { x: 0.5, y: 0 }).setPosition(Math.floor(w / 2), top + mark.height + 2 + chapter.height + 1);
    this.owned.push(mark, chapter, rule);
    ui.add([mark.img, chapter.img, rule.img]);
    const y = top + mark.height + 2 + chapter.height + 12;
    const left = Math.floor((w - CHAPTER_CARD_W) / 2);
    ui.add(chapterCard(this, this.owned, spec).setPosition(left, y));
    this.muster({ bottom: y + chapterCardHeight(spec), left });
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

  /** Continue the game saved, or start the chapter from its first part. */
  private play(resumed: Session | null): void {
    if (!resumed) Session.begin(this, getHost(this), MAPS[0]!);
    this.scene.start('Map');
  }

  private startOver(resumed: Session): void {
    openCard(this, {
      title: 'Start the chapter over?',
      body: `Your game on ${resumed.def.name} (${calendar(resumed.adv.day)}) will be lost. The laurels you have won stay.`,
      buttons: [
        { label: 'Start over', onClick: () => {
          resumed.abandon(this);
          this.play(null);
        } },
        { label: 'Keep my game', kind: 'plain', onClick: () => undefined },
      ],
    });
  }
}
