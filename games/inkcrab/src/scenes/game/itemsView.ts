import { shellFit } from '../../art/shellFit';
import Phaser from 'phaser';
import { FOOT, FRAME, SHELL_MID, SHELL_UNITS } from '../../art/frame';
import { FOOD_FRAME, FOOD_GROUND, FOOD_RES } from '../../art/itemArt';
import { BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import type { Item } from '../../logic/items';
import { shellPx, SHELLS } from '../../logic/shells';

interface ItemSprites {
  readonly mark: Phaser.GameObjects.Image;
  readonly art: Phaser.GameObjects.Image;
}

/** World px per food frame unit. */
const FOOD_UNIT = 0.32;

/**
 * Food, loose shells and a mission's finds, each over a highlighter swipe. Buried ones show
 * only a faint swipe through the sand: something's down there.
 */
export class ItemsView {
  private readonly sprites = new Map<number, ItemSprites>();

  constructor(private readonly scene: Phaser.Scene) {}

  /** `hidden`: items drawn elsewhere for now (the shells the crab and rivals are moving into). */
  sync(items: ReadonlyMap<number, Item>, time: number, hidden: ReadonlySet<number>): void {
    for (const [id, s] of this.sprites) {
      if (items.has(id)) continue;
      s.mark.destroy();
      s.art.destroy();
      this.sprites.delete(id);
    }
    const boil = Math.floor(time / 260) % BOIL;
    for (const item of items.values()) {
      const s = this.sprites.get(item.id) ?? this.create(item);
      this.place(item, s, boil);
      s.mark.setVisible(!hidden.has(item.id));
      if (hidden.has(item.id)) s.art.setVisible(false);
    }
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
