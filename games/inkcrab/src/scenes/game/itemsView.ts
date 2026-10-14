import { shellFit } from '../../art/shellFit';
import Phaser from 'phaser';
import { FOOT, FRAME, SHELL_MID, SHELL_UNITS } from '../../art/frame';
import { FOOD_FRAME, FOOD_GROUND, FOOD_RES } from '../../art/itemArt';
import { BOIL, RED_HEX } from '../../art/palette';
import { TEX } from '../../art/textures';
import type { Item } from '../../logic/items';
import { shellPx, SHELLS } from '../../logic/shells';

interface ItemSprites {
  readonly mark: Phaser.GameObjects.Image;
  readonly art: Phaser.GameObjects.Image;
}

/** World px per food frame unit. */
const FOOD_UNIT = 0.32;

/** A buried find's red-pencil mark: the ring's size past the find's, and the cross's half-width, as shares of the find's size. */
const FIND_MARK = { ring: 1.05, cross: 0.38, pad: 3 } as const;
/** How often the pencil marks boil, ms. */
const BOIL_MS = 260;

/**
 * Food, loose shells and a mission's finds, each over a highlighter swipe. Buried ones show
 * only a faint swipe through the sand: something's down there. A buried find is the
 * mission's, so it's marked in the mission's red pencil too: ringed, with a cross, like a
 * spot on a treasure map, so it can't be taken for food or a shell.
 */
export class ItemsView {
  private readonly sprites = new Map<number, ItemSprites>();
  private readonly marks: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.marks = scene.add.graphics().setDepth(2.5);
  }

  /** `hidden`: items drawn elsewhere for now (the shells the crab and rivals are moving into). */
  sync(items: ReadonlyMap<number, Item>, time: number, hidden: ReadonlySet<number>): void {
    for (const [id, s] of this.sprites) {
      if (items.has(id)) continue;
      s.mark.destroy();
      s.art.destroy();
      this.sprites.delete(id);
    }
    const boil = Math.floor(time / BOIL_MS) % BOIL;
    this.marks.clear();
    for (const item of items.values()) {
      const s = this.sprites.get(item.id) ?? this.create(item);
      this.place(item, s, boil);
      s.mark.setVisible(!hidden.has(item.id));
      if (hidden.has(item.id)) s.art.setVisible(false);
      if (item.buried && item.kind.type === 'find') this.findMark(item, boil);
    }
  }

  /** A buried find ringed in red pencil with a cross through it, boiling a little. */
  private findMark(item: Item, boil: number): void {
    const g = this.marks;
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const rx = item.w * FIND_MARK.ring + FIND_MARK.pad;
    const ry = item.h * FIND_MARK.ring + FIND_MARK.pad;
    const steps = 36;
    g.lineStyle(1.5, RED_HEX, 0.85).beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2 * 1.15 - 0.6;
      const wob = 1 + Math.sin(a * 3 + boil * 1.7 + item.id) * 0.06 + (i / steps) * 0.08;
      const x = cx + Math.cos(a) * rx * wob;
      const y = cy + Math.sin(a) * ry * wob;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
    const d = Math.max(item.w, item.h) * FIND_MARK.cross;
    const j = Math.sin(boil * 2.3 + item.id) * 0.6;
    g.lineStyle(1.8, RED_HEX, 0.9);
    g.lineBetween(cx - d + j, cy - d, cx + d, cy + d - j).lineBetween(cx + d - j, cy - d, cx - d, cy + d + j);
  }

  private create(item: Item): ItemSprites {
    const mark = this.scene.add.image(0, 0, TEX.highlight(item.id % BOIL)).setBlendMode(Phaser.BlendModes.MULTIPLY);
    const art = this.scene.add.image(0, 0, TEX.highlight(0));
    const s = { mark, art };
    this.sprites.set(item.id, s);
    return s;
  }

  private place(item: Item, s: ItemSprites, boil: number): void {
    const cx = item.x + item.w / 2;
    const bottom = item.y + item.h;
    s.mark.setPosition(cx, item.y + item.h / 2).setDisplaySize(item.w * 1.5, item.h * 1.6);
    s.mark.setDepth(item.buried ? 2 : 3).setAlpha(item.buried ? 0.4 : 0.8);
    s.art.setVisible(!item.buried).setDepth(4);
    if (item.buried) return;
    if (item.kind.type === 'shell') {
      const unit = (shellPx(item.kind.shell.size) / SHELL_UNITS) * shellFit(item.kind.shell.kind);
      s.art.setTexture(TEX.shell(item.kind.shell.kind, boil)).setOrigin(SHELL_MID / FRAME, FOOT.y / FRAME).setScale(unit).setPosition(cx, bottom);
    } else {
      const key = item.kind.type === 'find' ? TEX.find(item.kind.find, boil) : TEX.food(item.kind.food, boil);
      s.art.setTexture(key).setOrigin(0.5, (FOOD_FRAME / 2 + FOOD_GROUND) / FOOD_FRAME).setScale(FOOD_UNIT / FOOD_RES).setPosition(cx, bottom);
    }
  }
}
