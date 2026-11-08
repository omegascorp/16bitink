import Phaser from 'phaser';
import { BLUE, PAPER_HEX, RED } from '../../art/palette';
import type { LevelDef, Place } from '../../level/types';
import type { LevelRecord } from '../../logic/save';
import { clock, drawBlots, HAND_FONT, inkButton, inkText } from '../ui';
import { freePaper, paperCard } from '../uiPaint';
import { boardPreview, dropPreview } from './thumb';
import { playLine } from './levelInfo';
import { twistTexts } from '../../level/twistText';

const SOFT_INK = '#4a463e';
const CARD_W = 440;
const THUMB = { w: 360, h: 203 } as const;
const CARD_SEED = 61;
/** Notes under the picture wrap to this width (the card less its margins). */
const NOTE_W = CARD_W - 80;
const NOTE_GAP = 6;
const SEP = ' · ';

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
  private paperH = 0;

  private constructor(private readonly scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, view: { width: number; height: number }, height: number, fill: (c: Phaser.GameObjects.Container, top: number) => (() => void) | null, private readonly onClose: () => void) {
    const shade = scene.add.rectangle(0, 0, view.width, view.height, PAPER_HEX, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    // Laid out at full size; shrunk to fit a short screen.
    const h = height;
    const fit = Math.min(1, (view.height - 24) / height, (view.width - 16) / CARD_W);
    const top = view.height / 2 / fit - h / 2;
    const card = scene.add.container(view.width / 2, 0);
    const g = paperCard(scene, 0, top + h / 2, CARD_W, h, CARD_SEED, { tapes: ['tl', 'tr'], rule: true });
    this.paperH = h;
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
    // The notes under the picture, each wrapped to the card at its " · " breaks: the card grows to fit them.
    const twists = twistTexts(o.level).map((t) => t.card);
    const notes = [
      wrapped(scene, playLine(o.level).split(SEP), 19, SOFT_INK),
      ...(o.news.length ? [wrapped(scene, o.news.map((n, i) => (i ? n : `New: ${n}`)), 21, RED)] : []),
      ...(twists.length ? [wrapped(scene, twists, 22, BLUE)] : []),
    ];
    const notesH = notes.reduce((h, t) => h + t.height, 0) + (notes.length - 1) * NOTE_GAP;
    return new MapCard(scene, layer, view, 436 + notesH, (card, top) => {
      card.add(inkText(scene, 0, top + 34, `Level ${o.number}`, 22, SOFT_INK));
      card.add(inkText(scene, 0, top + 70, o.level.name, 38));
      const thumbY = top + 104 + THUMB.h / 2;
      card.add(boardPreview(scene, o.level, o.place, THUMB.w, THUMB.h).setY(thumbY));
      let y = thumbY + THUMB.h / 2 + 12;
      for (const t of notes) {
        card.add(t.setPosition(0, y));
        y += t.height + NOTE_GAP;
      }
      y += 42 - NOTE_GAP - 8;
      const blots = scene.add.graphics();
      drawBlots(blots, -92, y, o.record?.blots ?? 0, 10);
      card.add(blots);
      const times = o.record ? `best ${clock(o.record.bestTime)} · par ${clock(o.level.par)}` : `par ${clock(o.level.par)}`;
      card.add(scene.add.text(-46, y, times, { fontFamily: HAND_FONT, fontSize: '22px', color: SOFT_INK, padding: { x: 4, y: 4 } }).setOrigin(0, 0.5));
      card.add(inkButton(scene, 0, y + 58, o.record ? 'Play again' : 'Play', o.onPlay, { width: 220, height: 58, size: 32, kind: 'leaf' }));
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
      if (o.action) card.add(inkButton(scene, 0, top + 116 + o.lines.length * 34 + 22, o.action.label, o.action.run, { width: 240, height: 56, kind: 'leaf' }));
      return o.action?.run ?? null;
    }, onClose);
  }

  close(): void {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.root.destroy();
    freePaper(this.scene, CARD_W, this.paperH, CARD_SEED);
    this.onClose();
  }
}

/**
 * Short notes joined with " · ", broken into centred lines that fit the
 * card: a line takes notes while they fit, and a single note too long for
 * a line wraps at its spaces. Top-centred, so the card stacks them.
 */
function wrapped(scene: Phaser.Scene, parts: readonly string[], size: number, color: string): Phaser.GameObjects.Text {
  const t = inkText(scene, 0, 0, '', size, color).setOrigin(0.5, 0).setAlign('center');
  const fits = (s: string): boolean => t.setText(s).width <= NOTE_W;
  const lines: string[] = [];
  for (const part of parts) {
    const last = lines[lines.length - 1];
    if (last !== undefined && fits(last + SEP + part)) lines[lines.length - 1] = last + SEP + part;
    else lines.push(part);
  }
  t.setWordWrapWidth(NOTE_W).setText(lines.join('\n'));
  return t;
}
