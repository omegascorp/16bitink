import Phaser from 'phaser';
import { getSound } from '../../host';
import type { DayReport, GoldSource, SourceKind } from '../../logic/dayReport';
import { RESOURCES } from '../../logic/resources';
import { badgeTexture, faceOf, heroArt, PX_TEX, unitArt } from '../battle/pixelAssets';
import { cardButtonLook, drawPortrait, drawRule, FILLS, RIMS, SLOT, SLOT_GAP, type RimName } from '../battle/pixelFrames';
import type { CardView } from '../battle/pixelBuildCard';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel, UI_TEX } from '../battle/pixelUi';
import type { CardSpec } from '../CardScene';
import { drawMeter } from './dayCardArt';
import { barLength, centredRows, faceSlot, needsColumns } from './dayCardLayout';

/** A column's widest, the card's padding, and the space between its parts, UI pixels. */
const COLUMN_W = 352;
const PAD = 9;
const GAP = 5;
const RULE_H = 5;
const BTN_H = 30;
/** Inside a panel: its padding, a line of text, an icon, and the space between an icon and its words. */
const BOX = 6;
const LINE = 15;
const ICON = 16;
const ICON_GAP = 3;
/** The space between the amounts of the totals. */
const TOTAL_GAP = 12;
/** A gold bar's row: the label's room, the amount's, and the bar's height. */
const BAR = { label: 80, amount: 34, h: 9, row: 13 } as const;
/** The mana gauge's size. */
const GAUGE = { w: 56, h: 9 } as const;
/** The room for a town's name beside its recruits. */
const NAME_W = 66;
/** A portrait's frame round the cut, UI pixels. */
const FRAME = 4;
/** Each source's colour on the bars. */
const SOURCE_RIM: Readonly<Record<SourceKind, RimName>> = { town: 'gold', mines: 'bronze', estates: 'green' };

/** A thing laid out on one line: `w` across, drawn by `at` from its left edge and the line's top. */
interface Piece {
  readonly w: number;
  at(x: number, y: number): void;
}

/**
 * The card that opens the day, as an infographic rather than a paragraph:
 * what came in (the totals, and where the gold is from as bars), the hero
 * rested, on a new week the recruits waiting in each town, then the night's
 * news. On a short, wide screen it spreads into two columns.
 */
export class PixelDayCard implements CardView {
  private root: Phaser.GameObjects.Container | null = null;
  private back: Phaser.GameObjects.Container | null = null;
  private front: Phaser.GameObjects.Container | null = null;
  private readonly shade: Phaser.GameObjects.Rectangle;
  private owned: { destroy(): void }[] = [];
  private closed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly parent: Phaser.GameObjects.Container, private readonly spec: CardSpec, private readonly report: DayReport, private readonly screen: { w: number; h: number }, private readonly onClose: () => void, quiet = false) {
    if (!quiet) getSound(scene)?.play('card');
    this.shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    parent.add(this.shade);
    if (needsColumns(this.compose(false), screen) && this.spreads()) {
      this.teardown();
      this.compose(true);
    }
  }

  /** Whether there's anything to put in a second column. */
  private spreads(): boolean {
    return !!this.report.week || !!this.spec.body;
  }

  /** Draws the card, in two columns or one; its height. */
  private compose(wide: boolean): number {
    const { scene, spec, screen } = this;
    this.back = scene.add.container(0, 0);
    this.front = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [this.back, this.front]);
    this.parent.add(this.root);
    const w = Math.min(wide ? COLUMN_W * 2 : COLUMN_W, screen.w - 8);
    const inner = w - PAD * 2;
    const title = this.keep(new TextLabel(scene, { kind: 'title', wrap: inner, anchor: { x: 0.5, y: 0 } }).setText(spec.title));
    const rule = this.keep(new PixelImage(scene, drawRule(Math.min(inner, title.width + 40)), { x: 0.5, y: 0 }));
    title.setPosition(Math.floor(w / 2), PAD);
    const top = PAD + title.height + GAP;
    rule.setPosition(Math.floor(w / 2), top);
    this.front.add([rule.img, title.img]);
    const first = top + RULE_H + GAP;
    const colW = wide ? Math.floor((inner - GAP) / 2) : inner;
    const rightX = wide ? PAD + colW + GAP : PAD;
    let left = this.income(PAD, first, colW);
    left = this.hero(PAD, left, colW);
    let right = wide ? first : left;
    if (this.report.week) right = this.week(rightX, right, colW);
    if (spec.body) right = this.news(rightX, right, colW, spec.body);
    const button = spec.buttons[0];
    let y = Math.max(left, right);
    if (button) {
      const b = this.keep(new PixelButton(scene, {
        w: inner, h: BTN_H, label: button.label, ...cardButtonLook(button.kind, 0),
        onClick: () => {
          if (this.closed) return;
          this.close();
          button.onClick();
        },
      }));
      b.setPosition(PAD, y);
      this.front.add(b.root);
      y += BTN_H;
    }
    const h = y + PAD;
    const panel = this.keep(new PixelFrame(scene, w, h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true }));
    this.back.addAt(panel.img, 0);
    this.root.setPosition(Math.floor((screen.w - w) / 2), Math.max(2, Math.floor((screen.h - h) / 2)));
    return h;
  }

  /** The totals, then a bar for each source of gold; where the next panel starts. */
  private income(x: number, y: number, w: number): number {
    const room = w - BOX * 2;
    const pieces = RESOURCES.filter((r) => this.report.income[r] > 0).map((r): Piece => {
      const label = this.label({ kind: r === 'gold' ? 'title' : undefined, align: 'left' }, `+${this.report.income[r]}`);
      const icon = this.image(UI_TEX.res(r));
      return {
        w: ICON + ICON_GAP + label.width,
        at: (px, py) => {
          icon.setPosition(px, py);
          label.setPosition(px + ICON + ICON_GAP, py + 1);
        },
      };
    });
    let at = y + BOX;
    at = this.lay(pieces, x + BOX, at, room);
    const { sources } = this.report;
    const best = Math.max(...sources.map((s) => s.gold));
    at += 2;
    for (const s of sources) at = this.bar(s, best, x + BOX, at, room);
    return this.box(x, y, w, at + BOX - 1, 'dim');
  }

  /** One source of gold: its name, its bar and its amount; the y of the next row. */
  private bar(s: GoldSource, best: number, x: number, y: number, room: number): number {
    const bar = room - BAR.label - BAR.amount - 4;
    const name = this.label({ ink: INK.dim, align: 'left' }, s.label);
    name.setPosition(x, y - 2);
    const meter = this.keep(new PixelImage(this.scene, drawMeter(bar, BAR.h, barLength(s.gold, best, bar) / bar, RIMS[SOURCE_RIM[s.kind]])));
    meter.setPosition(x + BAR.label, y + Math.floor((BAR.row - BAR.h) / 2));
    this.front!.add(meter.img);
    const amount = this.label({ anchor: { x: 1, y: 0 }, align: 'right' }, String(s.gold));
    amount.setPosition(x + room, y - 2);
    return y + BAR.row;
  }

  /** The hero's face, rested: the tiles to ride today and the mana. */
  private hero(x: number, y: number, w: number): number {
    const { hero } = this.report;
    const art = heroArt();
    const face = this.keep(new PixelImage(this.scene, drawPortrait(faceOf(this.scene, PX_TEX.hero(art.id, 'idle'), art.art), 'bronze', false, false)));
    face.setPosition(x + BOX, y + BOX);
    this.front!.add(face.img);
    const left = x + BOX + SLOT + BOX;
    const room = w - (left - x) - BOX;
    const name = this.label({ ink: INK.title, align: 'left' }, `${hero.name} is rested`);
    name.setPosition(left, y + BOX - 1);
    const pieces = [this.travel(), ...(hero.maxMana > 0 ? [this.mana()] : [])];
    const end = this.lay(pieces, left, y + BOX + LINE, room, 'left');
    return this.box(x, y, w, Math.max(y + BOX + SLOT, end - 1) + BOX, 'dim');
  }

  private travel(): Piece {
    const { tiles, horses } = this.report.hero;
    const icon = this.image(UI_TEX.stat('speed'));
    const label = this.label({ align: 'left' }, `${tiles} tiles`);
    const extra = horses ? this.label({ ink: INK.good, align: 'left' }, `+${horses} Stables`) : null;
    return {
      w: ICON + ICON_GAP + label.width + (extra ? ICON_GAP * 2 + extra.width : 0),
      at: (x, y) => {
        icon.setPosition(x, y);
        label.setPosition(x + ICON + ICON_GAP, y + 1);
        extra?.setPosition(x + ICON + ICON_GAP * 3 + label.width, y + 1);
      },
    };
  }

  private mana(): Piece {
    const { mana, maxMana, gained } = this.report.hero;
    const icon = this.image(UI_TEX.stat('mana'));
    const gauge = this.keep(new PixelImage(this.scene, drawMeter(GAUGE.w, GAUGE.h, mana / maxMana, RIMS.player)));
    this.front!.add(gauge.img);
    const label = this.label({ align: 'left' }, `${mana}/${maxMana}`);
    const extra = gained ? this.label({ ink: INK.spell, align: 'left' }, `+${gained}`) : null;
    return {
      w: ICON + ICON_GAP + GAUGE.w + ICON_GAP + label.width + (extra ? ICON_GAP + extra.width : 0),
      at: (x, y) => {
        icon.setPosition(x, y);
        gauge.setPosition(x + ICON + ICON_GAP, y + 4);
        const after = x + ICON + ICON_GAP * 2 + GAUGE.w;
        label.setPosition(after, y + 1);
        extra?.setPosition(after + label.width + ICON_GAP, y + 1);
      },
    };
  }

  /** A new week: the recruits waiting in each town, and the wilds growing. */
  private week(x: number, y: number, w: number): number {
    const { recruits } = this.report.week!;
    const room = w - BOX * 2;
    const head = this.label({ kind: 'title', anchor: { x: 0.5, y: 0 } }, recruits.length ? 'A new week: fresh recruits' : 'A new week');
    head.setPosition(x + Math.floor(w / 2), y + BOX - 1);
    let at = y + BOX + LINE + 2;
    const slot = faceSlot(room, NAME_W, Math.max(0, ...recruits.map((t) => t.units.length)));
    for (const t of recruits) {
      const name = this.label({ ink: INK.dim, align: 'left' }, t.town);
      name.setPosition(x + BOX, at + Math.floor((slot - LINE) / 2));
      t.units.forEach((u, i) => {
        const fx = x + BOX + NAME_W + i * (slot + SLOT_GAP);
        const face = this.keep(new PixelImage(this.scene, drawPortrait(faceOf(this.scene, PX_TEX.unit(u.creature, 'idle'), unitArt(u.creature), slot - FRAME), 'bronze', false, false, slot)));
        face.setPosition(fx, at);
        this.front!.add([face.img, this.scene.add.image(fx + slot - 1, at + slot - 1, badgeTexture(this.scene, 0, u.count)).setOrigin(1, 1)]);
      });
      at += slot + SLOT_GAP;
    }
    const icon = this.image(UI_TEX.stat('attack'));
    const line = this.keep(new TextLabel(this.scene, { ink: INK.dim, wrap: room - ICON - ICON_GAP, align: 'left' }).setText('The monsters of the wilds have grown.'));
    this.front!.add(line.img);
    icon.setPosition(x + BOX, at);
    line.setPosition(x + BOX + ICON + ICON_GAP, at + 1);
    return this.box(x, y, w, at + Math.max(ICON, line.height) + BOX, 'gold');
  }

  /** The night's news, a line each. */
  private news(x: number, y: number, w: number, body: string): number {
    const room = w - BOX * 2 - ICON - ICON_GAP;
    let at = y + BOX;
    for (const line of body.split('\n')) {
      const icon = this.image(UI_TEX.stat('sight'));
      const text = this.keep(new TextLabel(this.scene, { wrap: room, align: 'left' }).setText(line));
      this.front!.add(text.img);
      icon.setPosition(x + BOX, at);
      text.setPosition(x + BOX + ICON + ICON_GAP, at + 1);
      at += Math.max(ICON, text.height) + 2;
    }
    return this.box(x, y, w, at - 2 + BOX, 'enemy');
  }

  /** Pieces on rows `room` wide from `x`; the y under them. */
  private lay(pieces: readonly Piece[], x: number, y: number, room: number, align: 'left' | 'centre' = 'centre'): number {
    let at = y;
    for (const row of centredRows(pieces.map((p) => p.w), room, TOTAL_GAP)) {
      const shift = align === 'left' ? row[0]!.x : 0;
      for (const c of row) pieces[c.i]!.at(x + c.x - shift, at);
      at += ICON + 1;
    }
    return at;
  }

  /** The panel from `y` to `bottom` behind what was just drawn; where the next one starts. */
  private box(x: number, y: number, w: number, bottom: number, rim: RimName): number {
    const panel = this.keep(new PixelFrame(this.scene, w, bottom - y, { rim, thick: 1, fill: FILLS.plate }));
    panel.setPosition(x, y);
    this.back!.add(panel.img);
    return bottom + GAP;
  }

  private label(opts: ConstructorParameters<typeof TextLabel>[1], text: string): TextLabel {
    const t = this.keep(new TextLabel(this.scene, opts).setText(text));
    this.front!.add(t.img);
    return t;
  }

  private image(key: string): Phaser.GameObjects.Image {
    const img = this.scene.add.image(0, 0, key).setOrigin(0);
    this.front!.add(img);
    return img;
  }

  private keep<T extends { destroy(): void }>(o: T): T {
    this.owned.push(o);
    return o;
  }

  private teardown(): void {
    for (const o of this.owned) o.destroy();
    this.owned = [];
    this.root?.destroy();
    this.root = null;
  }

  close(): void {
    if (this.closed) return;
    this.dispose();
    this.onClose();
  }

  /** Takes the card down without answering it (to draw it again at a new screen size). */
  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.teardown();
    this.shade.destroy();
  }
}
