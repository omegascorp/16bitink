import Phaser from 'phaser';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../art/creatures/types';
import { VIGNETTE, VIGNETTE_IDS, VISTA, MENU_RES, TITLE, type VignetteId } from '../art/menu';
import { INK, PAPER } from '../art/palette';
import { TEX, VISTA_RES } from '../art/textures';
import { getHost } from '../host';
import { MAPS } from '../level/maps';
import type { MapDef } from '../level/types';
import { calendar } from '../logic/adventure';
import type { CreatureId } from '../logic/creatures';
import { loadProgress } from '../logic/save';
import { openCard } from './CardScene';
import { screenScene, viewSize } from './hidpi';
import { Session } from './session';
import { HAND, paintedButton, paperCard, UI_TEX } from './uiPaint';

/** Maps planned for chapter 1 but not built yet, shown as drafts. */
const PLANNED: readonly { name: string; goal: string; vignette: VignetteId }[] = [
  { name: 'Thornwood', goal: 'Take the bandits’ fort at Thornwood', vignette: 'thornwood' },
  { name: 'The Black Banner', goal: 'Beat the rival lord and take his town', vignette: 'blackBanner' },
];

const CARD = { w: 256, h: 290 } as const;
/** Where the vista's foreground rise tops out, units from its bottom: the muster stands on it. */
const RISE = 96;

type Item = { def: MapDef } | { planned: (typeof PLANNED)[number] };

const vignetteOf = (item: Item): VignetteId | null => {
  if ('planned' in item) return item.planned.vignette;
  return (VIGNETTE_IDS as readonly string[]).includes(item.def.id) ? (item.def.id as VignetteId) : null;
};

/** The campaign: a painted vista under the game's banner, Continue, and chapter 1's maps with their blots. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    screenScene(this, true);
    this.cameras.main.setBackgroundColor(PAPER);
    this.draw();
    this.scale.on('resize', this.draw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.draw, this));
  }

  private draw(): void {
    this.children.removeAll(true);
    const host = getHost(this);
    const v = viewSize(this);
    const progress = loadProgress(host.storage);
    const resumed = Session.resume(this, host);
    // The vista covers the screen, pinned at its bottom centre.
    const cover = Math.max(v.width / VISTA.w, v.height / VISTA.h);
    this.add.image(v.width / 2, v.height, TEX.vista).setOrigin(0.5, 1).setScale(cover / VISTA_RES).setDepth(-2);
    const root = this.add.container(v.width / 2, 0);
    root.add(this.add.image(0, 8, TEX.title).setOrigin(0.5, 0).setScale(1 / MENU_RES));
    root.add(this.add.text(0, TITLE.h - 2, 'Chapter 1 · The Border March', { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '30px', color: INK, stroke: '#fdf8ea', strokeThickness: 5 }).setOrigin(0.5, 0));
    let y = TITLE.h + 50;
    if (resumed) {
      const label = `Continue: ${resumed.def.name}, ${calendar(resumed.adv.day)}`;
      root.add(paintedButton(this, 0, y + 28, label, () => this.scene.start('Map'), { width: Math.min(560, v.width - 40), height: 56, size: 26, kind: 'leaf' }));
      y += 80;
    }
    const all: Item[] = [...MAPS.map((def) => ({ def })), ...PLANNED.map((planned) => ({ planned }))];
    const cols = Math.max(1, Math.min(all.length, Math.floor((v.width - 20) / (CARD.w + 20))));
    all.forEach((item, i) => {
      // A last row that isn't full is centred.
      const inRow = Math.min(cols, all.length - Math.floor(i / cols) * cols);
      const cx = ((i % cols) - (inRow - 1) / 2) * (CARD.w + 20);
      const cy = y + Math.floor(i / cols) * (CARD.h + 20) + CARD.h / 2;
      root.add(this.mapCard(cx, cy, item, progress.maps, resumed));
    });
    const rows = Math.ceil(all.length / cols);
    const totalH = y + rows * (CARD.h + 20);
    const scale = Math.min(1, (v.height - 10) / totalH, (v.width - 16) / TITLE.w);
    root.setScale(scale);
    this.muster(v, cover, { bottom: totalH * scale, half: v.width / 2 - ((cols * (CARD.w + 20)) / 2) * scale });
  }

  /** The Crown's army mustered on the foreground rise, flanking the cards (`clear`: where the cards end, and the room beside them). */
  private muster(v: { width: number; height: number }, cover: number, clear: { bottom: number; half: number }): void {
    const ground = v.height - RISE * cover;
    const s = Phaser.Math.Clamp(cover * 1.25, 0.7, 1.4);
    const left: [CreatureId | 'hero', number, number][] = [['hero', 70, 1.15], ['spearman', 150, 0.95], ['bowman', 215, 0.88]];
    const right: [CreatureId, number, number][] = [['griffin', 80, 0.95], ['swordsman', 165, 0.95], ['monk', 230, 0.9]];
    const place = (id: CreatureId | 'hero', x: number, size: number, flip: boolean): void => {
      const key = id === 'hero' ? TEX.hero('player', 0) : TEX.creature(id, 0);
      this.add.image(x, ground, key).setOrigin(0.5, GROUND_Y / FRAME_H).setScale((size * s) / CREATURE_RES).setFlipX(flip).setDepth(-1);
    };
    // Figures that would stand behind a card stay away; below the cards there's room for all.
    const fits = (x: number): boolean => clear.bottom < ground - 110 * s || x * s + 40 * s < clear.half;
    left.filter(([, x]) => fits(x)).forEach(([id, x, size]) => place(id, x * s, size, false));
    right.filter(([, x]) => fits(x)).forEach(([id, x, size]) => place(id, v.width - x * s, size, true));
  }

  private mapCard(x: number, y: number, item: Item, records: ReturnType<typeof loadProgress>['maps'], resumed: Session | null): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const draft = 'planned' in item;
    c.add(paperCard(this, 0, 0, CARD.w, CARD.h, draft ? 97 + item.planned.name.length : item.def.n * 31, { rule: true, tint: draft ? 'sky' : 'cream' }));
    const vig = vignetteOf(item);
    const top = -CARD.h / 2 + 14;
    if (vig) c.add(this.add.image(0, top, TEX.vignette(vig)).setOrigin(0.5, 0).setScale(1 / MENU_RES).setAlpha(draft ? 0.55 : 1));
    const textY = top + VIGNETTE.h - 6;
    if (draft) {
      c.add(this.add.text(0, textY, item.planned.name, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '30px', color: INK }).setOrigin(0.5, 0).setAlpha(0.65));
      c.add(this.add.text(0, textY + 44, `${item.planned.goal}.`, { fontFamily: 'Georgia, serif', fontSize: '14px', color: INK, align: 'center', wordWrap: { width: CARD.w - 30 } }).setOrigin(0.5, 0).setAlpha(0.6));
      c.add(this.add.text(0, CARD.h / 2 - 40, 'Coming soon', { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '24px', color: '#27408b' }).setOrigin(0.5, 0).setAlpha(0.7));
      return c;
    }
    const def = item.def;
    const rec = records[def.id];
    c.add(this.add.text(0, textY, `${def.n}. ${def.name}`, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '32px', color: INK }).setOrigin(0.5, 0));
    c.add(this.add.text(0, textY + 44, `${def.goal.text[0]!.toUpperCase()}${def.goal.text.slice(1)}.`, { fontFamily: 'Georgia, serif', fontSize: '14px', color: INK, align: 'center', wordWrap: { width: CARD.w - 30 } }).setOrigin(0.5, 0));
    for (let i = 0; i < 3; i++) {
      const key = rec && i < rec.blots ? UI_TEX.blot(i) : UI_TEX.blotSlot;
      c.add(this.add.image((i - 1) * 30, CARD.h / 2 - 72, key).setScale(0.28));
    }
    const playing = resumed?.def.id === def.id;
    c.add(paintedButton(this, 0, CARD.h / 2 - 26, playing ? 'Continue' : rec ? 'Play again' : 'Play', () => this.play(def, resumed), { width: 150, height: 40, size: 22, kind: rec ? 'paper' : 'leaf' }));
    return c;
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
        { label: 'Keep my game', kind: 'paper', onClick: () => undefined },
      ],
    });
  }
}
