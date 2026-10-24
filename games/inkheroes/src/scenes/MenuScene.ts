import Phaser from 'phaser';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../art/creatures/types';
import { INK, PAPER } from '../art/palette';
import { TEX } from '../art/textures';
import { getHost } from '../host';
import { MAPS } from '../level/maps';
import type { MapDef } from '../level/types';
import { calendar } from '../logic/adventure';
import type { CreatureId } from '../logic/creatures';
import { loadProgress } from '../logic/save';
import { openCard } from './CardScene';
import { screenScene, viewSize } from './hidpi';
import { Session } from './session';
import { HAND, paintedButton, paperCard } from './uiPaint';

/** Maps planned for chapter 1 but not built yet, shown as drafts. */
const PLANNED: readonly { name: string; goal: string }[] = [
  { name: 'Thornwood', goal: 'Take the bandits’ fort at Thornwood' },
  { name: 'The Black Banner', goal: 'Beat the rival lord and take his town' },
];

const CARD = { w: 250, h: 172 } as const;

/** The campaign: the game's title, Continue, and chapter 1's maps with their blots. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    screenScene(this, true);
    this.cameras.main.setBackgroundColor(PAPER);
    const host = getHost(this);
    const v = viewSize(this);
    const progress = loadProgress(host.storage);
    const resumed = Session.resume(this, host);
    const root = this.add.container(v.width / 2, 0);
    // A muster of the Crown's army under the title.
    const muster: [CreatureId | 'hero', number, number][] = [['bowman', -170, 0.85], ['spearman', -100, 0.95], ['hero', 0, 1.15], ['swordsman', 100, 0.95], ['griffin', 175, 0.9]];
    for (const [id, x, s] of muster) {
      const key = id === 'hero' ? TEX.hero('player', 0) : TEX.creature(id, 0);
      const img = this.add.image(x, 230, key).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(s / CREATURE_RES);
      if (x > 0 && id !== 'hero') img.setFlipX(true);
      root.add(img);
    }
    root.add(this.add.text(0, 26, 'InkHeroes', { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '72px', color: INK }).setOrigin(0.5, 0));
    root.add(this.add.text(0, 240, 'Chapter 1 · The Border March', { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '30px', color: INK }).setOrigin(0.5, 0));
    let y = 300;
    if (resumed) {
      const label = `Continue: ${resumed.def.name}, ${calendar(resumed.adv.day)}`;
      root.add(paintedButton(this, 0, y + 28, label, () => this.scene.start('Map'), { width: Math.min(560, v.width - 40), height: 56, size: 26, kind: 'leaf' }));
      y += 80;
    }
    const all: ({ def: MapDef } | { planned: (typeof PLANNED)[number] })[] = [...MAPS.map((def) => ({ def })), ...PLANNED.map((planned) => ({ planned }))];
    const cols = Math.max(1, Math.min(all.length, Math.floor((v.width - 20) / (CARD.w + 20))));
    all.forEach((item, i) => {
      const cx = ((i % cols) - (cols - 1) / 2) * (CARD.w + 20);
      const cy = y + Math.floor(i / cols) * (CARD.h + 20) + CARD.h / 2;
      root.add(this.mapCard(cx, cy, item, progress.maps, resumed));
    });
    const rows = Math.ceil(all.length / cols);
    const totalH = y + rows * (CARD.h + 20);
    root.setScale(Math.min(1, (v.height - 10) / totalH));
  }

  private mapCard(x: number, y: number, item: { def: MapDef } | { planned: (typeof PLANNED)[number] }, records: ReturnType<typeof loadProgress>['maps'], resumed: Session | null): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    c.add(paperCard(this, 0, 0, CARD.w, CARD.h, 'def' in item ? item.def.n * 31 : 97, { rule: true, tint: 'def' in item ? 'cream' : 'sky' }));
    if (!('def' in item)) {
      c.add(this.add.text(0, -CARD.h / 2 + 16, item.planned.name, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '30px', color: INK }).setOrigin(0.5, 0).setAlpha(0.6));
      c.add(this.add.text(0, -6, `${item.planned.goal}.\nComing soon.`, { fontFamily: 'Georgia, serif', fontSize: '15px', color: INK, align: 'center', wordWrap: { width: CARD.w - 30 } }).setOrigin(0.5, 0).setAlpha(0.6));
      return c;
    }
    const def = item.def;
    const rec = records[def.id];
    c.add(this.add.text(0, -CARD.h / 2 + 12, `${def.n}. ${def.name}`, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '32px', color: INK }).setOrigin(0.5, 0));
    c.add(this.add.text(0, -18, `${def.goal.text[0]!.toUpperCase()}${def.goal.text.slice(1)}.`, { fontFamily: 'Georgia, serif', fontSize: '14px', color: INK, align: 'center', wordWrap: { width: CARD.w - 30 } }).setOrigin(0.5, 0));
    const g = this.add.graphics();
    for (let i = 0; i < 3; i++) {
      const bx = (i - 1) * 26;
      if (rec && i < rec.blots) g.fillStyle(0x27408b, 0.9).fillCircle(bx, 30, 9);
      g.lineStyle(2, 0x27408b, rec && i < rec.blots ? 1 : 0.35).strokeCircle(bx, 30, 9);
    }
    c.add(g);
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
