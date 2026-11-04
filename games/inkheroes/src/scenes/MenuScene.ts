import Phaser from 'phaser';
import { MAP_VIGNETTES } from '../art/pixel/map';
import { SCENERY } from '../art/pixel/scenery';
import { BACKDROP } from '../art/palette';
import { getHost } from '../host';
import { MAPS } from '../level/maps';
import type { MapDef } from '../level/types';
import { calendar } from '../logic/adventure';
import { loadProgress } from '../logic/save';
import { heroArt, nearest, PX_TEX, unitArt } from './battle/pixelAssets';
import { FIGURE_DEPTH, PixelFigure } from './battle/pixelFigure';
import { drawFrame, drawRule, FILLS } from './battle/pixelFrames';
import { renderPixelText } from './battle/pixelFont';
import { DriftingScenery } from './battle/driftingScenery';
import { HORIZON_Y } from './battle/pixelScenery';
import { INK, PixelButton, PixelImage, putBuffer, TextLabel, texturePixels, UI_TEX } from './battle/pixelUi';
import { openCard } from './CardScene';
import { loadMenuArt, MAP_TEX } from './map/pixelMapArt';
import { drawWordmark } from './menu/wordmark';
import { pixelUiCamera } from './pixelScreen';
import { Session } from './session';

/** Maps planned for chapter 1 but not built yet, shown as drafts. */
const PLANNED: readonly { name: string; goal: string; vignette: string }[] = [
  { name: 'Thornwood', goal: 'Take the bandits’ fort at Thornwood', vignette: 'thornwood' },
  { name: 'The Black Banner', goal: 'Beat the rival lord and take his town', vignette: 'blackBanner' },
];

type Item = { def: MapDef } | { planned: (typeof PLANNED)[number] };

/** A map card: its picture (192 × 96) framed, then the text, the laurels and the button; UI pixels. */
const PIC = { w: 192, h: 96 } as const;
const CARD_PAD = 7;
const CARD_W = PIC.w + 4 + CARD_PAD * 2;
const CARD_H = CARD_PAD + PIC.h + 4 + 6 + 15 + 3 + 45 + 4 + 24 + 6 + 22 + CARD_PAD;
const CARD_GAP = 12;
/** A map still to come, compact (a narrow screen without room for full cards): a crop of its picture beside its name. */
const COMPACT = { h: 64, pic: { w: 96, h: 48 } } as const;
const BTN_H = 22;
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
    const all: Item[] = [...MAPS.map((def) => ({ def })), ...PLANNED.map((planned) => ({ planned }))];
    const cols = Math.max(1, Math.min(all.length, Math.floor((w - 8 + CARD_GAP) / (CARD_W + CARD_GAP))));
    const rows = Math.ceil(all.length / cols);
    // The title, Continue and the cards as one block, centred in the screen above the muster.
    const markH = mask.h * scale + 7;
    const head = markH + 2 + 15 + 12 + (resumed ? 36 : 0);
    const drafts = all.filter((i) => 'planned' in i).length;
    // One column that would run off the screen: the maps still to come shrink to a line each.
    const compact = cols === 1 && head + rows * (CARD_H + CARD_GAP) > h;
    const rowH = (i: number): number => (compact && 'planned' in all[i]! ? COMPACT.h : CARD_H);
    const blockH = head + (compact ? (all.length - drafts) * (CARD_H + CARD_GAP) + drafts * (COMPACT.h + CARD_GAP) : rows * (CARD_H + CARD_GAP)) - CARD_GAP;
    const top = Math.max(8, Math.floor((h - MUSTER_FOOT - blockH) / 2) - 10);
    const mark = new PixelImage(this, drawWordmark(mask, scale), { x: 0.5, y: 0 }).setPosition(Math.floor(w / 2), top);
    const chapter = new TextLabel(this, { kind: 'title', anchor: { x: 0.5, y: 0 } }).setText('Chapter I · The Border March').setPosition(Math.floor(w / 2), top + mark.height + 2);
    const rule = new PixelImage(this, drawRule(Math.min(w - 20, chapter.width + 60)), { x: 0.5, y: 0 }).setPosition(Math.floor(w / 2), top + mark.height + 2 + chapter.height + 1);
    this.owned.push(mark, chapter, rule);
    ui.add([mark.img, chapter.img, rule.img]);
    let y = top + mark.height + 2 + chapter.height + 12;
    if (resumed) {
      const label = `Continue: ${resumed.def.name}, ${calendar(resumed.adv.day)}`;
      const bw = Math.min(w - 16, Math.max(220, label.length * 7 + 24));
      const btn = new PixelButton(this, { w: bw, h: 26, label, rim: 'gold', onClick: () => this.scene.start('Map') });
      btn.setPosition(Math.floor((w - bw) / 2), y);
      this.owned.push(btn);
      ui.add(btn.root);
      y += 26 + 10;
    }
    let cy = y;
    all.forEach((item, i) => {
      // A last row that isn't full is centred.
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, all.length - row * cols);
      const rowW = inRow * CARD_W + (inRow - 1) * CARD_GAP;
      const x = Math.floor((w - rowW) / 2) + (i % cols) * (CARD_W + CARD_GAP);
      ui.add(compact && 'planned' in item ? this.compactCard(x, cy, item.planned) : this.mapCard(x, cy, item, progress.maps, resumed));
      if (i % cols === cols - 1 || i === all.length - 1) cy += rowH(i) + CARD_GAP;
    });
    this.muster({ bottom: cy, left: Math.floor((w - (cols * CARD_W + (cols - 1) * CARD_GAP)) / 2) });
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

  private mapCard(x: number, y: number, item: Item, records: ReturnType<typeof loadProgress>['maps'], resumed: Session | null): Phaser.GameObjects.Container {
    const draft = 'planned' in item;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const frame = new PixelImage(this, drawFrame(CARD_W, CARD_H, { rim: draft ? 'dim' : 'bronze', thick: 2, fill: [34, 24, 17, 240], studs: !draft }));
    parts.push(frame.img);
    this.owned.push(frame);
    const vid = draft ? item.planned.vignette : item.def.id;
    const pic = new PixelImage(this, drawFrame(PIC.w + 4, PIC.h + 4, { rim: draft ? 'dim' : 'gold', fill: FILLS.portrait })).setPosition(CARD_PAD, CARD_PAD);
    parts.push(pic.img);
    this.owned.push(pic);
    if (MAP_VIGNETTES[vid]) parts.push(this.add.image(CARD_PAD + 2, CARD_PAD + 2, MAP_TEX.vignette(vid)).setOrigin(0).setAlpha(draft ? 0.5 : 1));
    const cx = Math.floor(CARD_W / 2);
    let ty = CARD_PAD + PIC.h + 4 + 6;
    const name = draft ? item.planned.name : `${item.def.n}. ${item.def.name}`;
    const goal = draft ? `${item.planned.goal}.` : `${item.def.goal.text[0]!.toUpperCase()}${item.def.goal.text.slice(1)}.`;
    const title = new TextLabel(this, { kind: 'title', ink: draft ? INK.dim : INK.title, wrap: CARD_W - CARD_PAD * 2, anchor: { x: 0.5, y: 0 } }).setText(name).setPosition(cx, ty);
    ty += 15 + 3;
    const body = new TextLabel(this, { ink: draft ? INK.dim : INK.text, wrap: CARD_W - CARD_PAD * 2 - 6, anchor: { x: 0.5, y: 0 } }).setText(goal).setPosition(cx, ty);
    this.owned.push(title, body);
    parts.push(title.img, body.img);
    const laurelY = CARD_H - CARD_PAD - BTN_H - 6 - 24;
    if (draft) {
      const soon = new TextLabel(this, { ink: INK.dim, anchor: { x: 0.5, y: 0 } }).setText('Coming soon').setPosition(cx, CARD_H - CARD_PAD - BTN_H + 4);
      this.owned.push(soon);
      parts.push(soon.img);
    } else {
      const def = item.def;
      const rec = records[def.id];
      for (let i = 0; i < 3; i++) {
        const img = this.add.image(cx - 42 + i * 30, laurelY, UI_TEX.laurel).setOrigin(0);
        if (!rec || i >= rec.blots) img.setTint(0x3a2c20).setAlpha(0.75);
        parts.push(img);
      }
      const playing = resumed?.def.id === def.id;
      const btn = new PixelButton(this, { w: 120, h: BTN_H, label: playing ? 'Continue' : rec ? 'Play again' : 'Play', rim: rec ? 'bronze' : 'gold', onClick: () => this.play(def, resumed) });
      btn.setPosition(cx - 60, CARD_H - CARD_PAD - BTN_H);
      this.owned.push(btn);
      parts.push(btn.root);
    }
    return this.add.container(x, y, parts);
  }

  /** A map still to come as one line: the middle of its picture, its name and "Coming soon". */
  private compactCard(x: number, y: number, planned: (typeof PLANNED)[number]): Phaser.GameObjects.Container {
    const frame = new PixelImage(this, drawFrame(CARD_W, COMPACT.h, { rim: 'dim', thick: 2, fill: [34, 24, 17, 240] }));
    const pic = new PixelImage(this, drawFrame(COMPACT.pic.w + 4, COMPACT.pic.h + 4, { rim: 'dim', fill: FILLS.portrait })).setPosition(6, 6);
    const parts: Phaser.GameObjects.GameObject[] = [frame.img, pic.img];
    if (MAP_VIGNETTES[planned.vignette]) {
      const img = this.add.image(8 - (PIC.w - COMPACT.pic.w) / 2, 8 - (PIC.h - COMPACT.pic.h) / 2, MAP_TEX.vignette(planned.vignette)).setOrigin(0).setAlpha(0.5);
      img.setCrop((PIC.w - COMPACT.pic.w) / 2, (PIC.h - COMPACT.pic.h) / 2, COMPACT.pic.w, COMPACT.pic.h);
      parts.push(img);
    }
    const tx = 6 + COMPACT.pic.w + 4 + 6;
    const textW = CARD_W - tx - 6;
    const name = new TextLabel(this, { kind: 'title', ink: INK.dim, wrap: textW, align: 'left', anchor: { x: 0, y: 0 } }).setText(planned.name).setPosition(tx, 10);
    const soon = new TextLabel(this, { ink: INK.dim, align: 'left', anchor: { x: 0, y: 1 } }).setText('Coming soon').setPosition(tx, COMPACT.h - 9);
    this.owned.push(frame, pic, name, soon);
    parts.push(name.img, soon.img);
    return this.add.container(x, y, parts);
  }

  private play(def: MapDef, resumed: Session | null): void {
    if (resumed?.def.id === def.id) {
      this.scene.start('Map');
      return;
    }
    const begin = (): void => {
      resumed?.abandon(this, 'quit');
      Session.begin(this, getHost(this), def);
      this.scene.start('Map');
    };
    if (!resumed) {
      begin();
      return;
    }
    openCard(this, {
      title: `Start ${def.name}?`,
      body: `Your game on ${resumed.def.name} (${calendar(resumed.adv.day)}) will be lost.`,
      buttons: [
        { label: `Start ${def.name}`, onClick: begin },
        { label: 'Keep my game', kind: 'plain', onClick: () => undefined },
      ],
    });
  }
}
