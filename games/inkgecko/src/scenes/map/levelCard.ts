import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX, RED } from '../../art/palette';
import type { Place } from '../../level/levels';
import type { LevelDef } from '../../level/types';
import type { LevelRecord } from '../../logic/save';
import { clock, drawBlots, HAND_FONT, inkButton, inkText, wobblyRect } from '../ui';
import { boardPreview, dropPreview } from './thumb';
import { shooterLine } from './levelInfo';

const SOFT_INK = '#4a463e';
const CARD_W = 440;
const THUMB = { w: 360, h: 203 } as const;

export interface LevelCardOpts {
  readonly level: LevelDef;
  readonly number: number;
  readonly place: Place;
  readonly record: LevelRecord | undefined;
  readonly news: readonly string[];
  readonly onPlay: () => void;
}

export interface ChapterCardOpts {
  readonly title: string;
  readonly lines: readonly string[];
  readonly action?: { readonly label: string; readonly run: () => void };
}

/**
 * A card over the map, in the interface layer: a level's picture, how it
 * plays, what's new in it, its best result and a Play button; or a
 * chapter's note (the full game's offer, "still being drawn"). Tapping
 * outside it, Esc or × closes it.
 */
export class MapCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey: (e: KeyboardEvent) => void;

  private constructor(private readonly scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, view: { width: number; height: number }, height: number, fill: (c: Phaser.GameObjects.Container, top: number) => (() => void) | null, private readonly onClose: () => void) {
    const shade = scene.add.rectangle(0, 0, view.width, view.height, PAPER_HEX, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    // Laid out at full size; shrunk to fit a short screen.
    const h = height;
    const fit = Math.min(1, (view.height - 24) / height, (view.width - 16) / CARD_W);
    const top = view.height / 2 / fit - h / 2;
    const card = scene.add.container(view.width / 2, 0);
    const g = scene.add.graphics();
    g.fillStyle(PAPER_HEX, 1).fillRect(-CARD_W / 2, top, CARD_W, h);
    g.fillStyle(0x26316a, 0.08).fillRect(-CARD_W / 2 + 6, top + h, CARD_W, 6);
    wobblyRect(g, -CARD_W / 2, top, CARD_W, h, 77, 2, BLUE_HEX);
    // The card swallows presses so they don't reach the shade behind it.
    const body = scene.add.zone(0, top + h / 2, CARD_W, h).setInteractive();
    card.add([body, g]);
    const act = fill(card, top);
    let fired = false;
    const play = act ? (): void => {
      if (fired) return;
      fired = true;
      act();
    } : null;
    card.add(inkButton(scene, CARD_W / 2 - 28, top + 28, '×', () => this.close(), { width: 40, height: 40, size: 30 }));
    this.root = scene.add.container(0, 0, [shade, card]);
    layer.add(this.root);
    card.setScale(fit * 0.92).setAlpha(0);
    scene.tweens.add({ targets: card, scale: fit, alpha: 1, duration: 140, ease: 'Back.Out' });
    this.onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (e.code === 'Escape') this.close();
      else if ((e.code === 'Enter' || e.code === 'Space') && play) play();
    };
    scene.input.keyboard?.on('keydown', this.onKey);
  }

  static level(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, view: { width: number; height: number }, o: LevelCardOpts, onClose: () => void): MapCard {
    const newsH = o.news.length ? 34 : 0;
    return new MapCard(scene, layer, view, 470 + newsH, (card, top) => {
      card.add(inkText(scene, 0, top + 34, `Level ${o.number}`, 22, SOFT_INK));
      card.add(inkText(scene, 0, top + 70, o.level.name, 38));
      const thumbY = top + 104 + THUMB.h / 2;
      card.add(boardPreview(scene, o.level, o.place, THUMB.w, THUMB.h).setY(thumbY));
      let y = thumbY + THUMB.h / 2 + 26;
      card.add(inkText(scene, 0, y, shooterLine(o.level), 19, SOFT_INK));
      if (o.news.length) {
        y += 34;
        card.add(inkText(scene, 0, y, `New: ${o.news.join(' · ')}`, 21, RED));
      }
      y += 42;
      const blots = scene.add.graphics();
      drawBlots(blots, -92, y, o.record?.blots ?? 0, 10);
      card.add(blots);
      const times = o.record ? `best ${clock(o.record.bestTime)} · par ${clock(o.level.par)}` : `par ${clock(o.level.par)}`;
      card.add(scene.add.text(-46, y, times, { fontFamily: HAND_FONT, fontSize: '22px', color: SOFT_INK, padding: { x: 4, y: 4 } }).setOrigin(0, 0.5));
      card.add(inkButton(scene, 0, y + 58, o.record ? 'Play again' : 'Play', o.onPlay, { width: 220, height: 56, size: 32 }));
      return o.onPlay;
    }, () => {
      // The baked board stays only for the level about to start on it.
      dropPreview(scene, o.level);
      onClose();
    });
  }

  static chapter(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, view: { width: number; height: number }, o: ChapterCardOpts, onClose: () => void): MapCard {
    return new MapCard(scene, layer, view, 150 + o.lines.length * 34 + (o.action ? 70 : 0), (card, top) => {
      card.add(inkText(scene, 0, top + 46, o.title, 36));
      o.lines.forEach((line, i) => card.add(inkText(scene, 0, top + 100 + i * 34, line, 22, SOFT_INK)));
      if (o.action) card.add(inkButton(scene, 0, top + 116 + o.lines.length * 34 + 22, o.action.label, o.action.run, { width: 240, height: 54 }));
      return o.action?.run ?? null;
    }, onClose);
  }

  close(): void {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.root.destroy();
    this.onClose();
  }
}
