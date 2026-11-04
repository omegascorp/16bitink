import type Phaser from 'phaser';
import { getSound } from '../../host';
import type { Hero } from '../../logic/hero';
import { cardButtonLook, drawRule, SLOT } from '../battle/pixelFrames';
import type { CardView } from '../battle/pixelBuildCard';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel, UI_TEX } from '../battle/pixelUi';
import type { CardSpec } from '../CardScene';
import { ArmyRow, ARMY_ROW_W } from './armyRow';
import { gearLayout } from './gearLayout';
import { drawGear, type GearHost, type GearPick } from './gearPanel';
import { heroSheet, type HeroSheet, type SheetRow } from './heroSheetData';

/** A column's width at its widest, the padding, and the spaces between parts, UI pixels. */
const COL_W = 230;
const PAD = 9;
const GAP = 8;
const LINE = 15;
const ICON = 16;
const ICON_GAP = 3;
const RULE_H = 5;
const BAR_H = 4;
const BTN_H = 30;
const BAR_BACK = 0x160e09;
const BAR_FILL = 0xf8d26e;

/** Two columns need this much screen; narrower, they stack. */
const TWO_COLUMNS = COL_W * 2 + GAP * 2 + PAD * 2 + 8;
/** One column needs this much height to say what each stat does. */
const WORDY_H = 680;
/** Below this height the army can't have a row of its own. */
const ROOMY_H = 440;
/** The width it takes to put the army in the right column instead. */
const ARMY_COLUMNS = ARMY_ROW_W * 2 + GAP * 2 + PAD * 2 + 8;
const TAB = { h: 22, gap: 4 } as const;
/** The card's height round the tab's content: padding, the tabs and the buttons. */
const CHROME_H = PAD * 3 + TAB.h + GAP + BTN_H;

/** Where the sheet reads its hero, and how it changes them. */
export interface SheetSource {
  readonly face: string;
  hero(): Hero;
  change(next: Hero): void;
}

/**
 * The hero's sheet, as Heroes 3's hero screen on the battle's pixel card:
 * their face, level and experience, the four stats saying what each does,
 * travel, mana, morale, luck and sight, skills, spells and the army, and
 * their gear on a tab of its own, where it has room to be drawn big.
 */
export class PixelHeroSheet implements CardView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private owned: { destroy(): void }[] = [];
  private keys: string[] = [];
  private closed = false;
  private tab: 'hero' | 'gear' = 'hero';
  private pick: GearPick | null = null;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, private readonly spec: CardSpec, private readonly source: SheetSource, private readonly screen: { w: number; h: number }, private readonly onClose: () => void, quiet = false) {
    if (!quiet) getSound(scene)?.play('card');
    const shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    this.body = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [shade, this.body]);
    parent.add(this.root);
    this.draw();
  }

  /** Drops what's drawn (for a redraw, or for good). */
  private clear(): void {
    for (const o of this.owned) o.destroy();
    this.body.removeAll(true);
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.owned = [];
    this.keys = [];
  }

  private draw(): void {
    this.clear();
    const { screen, spec, scene } = this;
    const hero = this.source.hero();
    const data = heroSheet(hero);
    const tight = screen.h < ROOMY_H && screen.w >= ARMY_COLUMNS;
    const two = tight || screen.w >= TWO_COLUMNS;
    const col = tight ? ARMY_ROW_W : two ? COL_W : Math.min(COL_W + 40, screen.w - 8 - PAD * 2);
    const heroW = two ? col * 2 + GAP * 2 : col;
    const layout = gearLayout({ w: screen.w - 8 - PAD * 2, h: screen.h - 4 - CHROME_H });
    const inner = this.tab === 'gear' ? layout.w : heroW;
    const top = this.tabs(inner) + PAD;
    let bottom = top;
    if (this.tab === 'hero') bottom = this.heroParts(hero, data, col, two, tight, top);
    else {
      const host: GearHost = { scene, body: this.body, owned: this.owned, keys: this.keys };
      drawGear(host, PAD, top, layout, hero, this.pick, {
        pick: (p) => {
          this.pick = p;
          this.draw();
        },
        change: (next) => {
          this.source.change(next);
          this.pick = null;
          this.draw();
        },
      });
      bottom = top + layout.h;
    }
    const btnTop = bottom + GAP;
    const bw = Math.floor((inner - GAP * (spec.buttons.length - 1)) / spec.buttons.length);
    spec.buttons.forEach((b, i) => {
      const btn = new PixelButton(scene, {
        w: bw, h: BTN_H, label: b.label, ...cardButtonLook(b.kind, i + 1),
        onClick: () => {
          if (this.closed) return;
          this.close();
          b.onClick();
        },
      });
      btn.setPosition(PAD + i * (bw + GAP), btnTop);
      this.owned.push(btn);
      this.body.add(btn.root);
    });
    const w = inner + PAD * 2;
    const h = btnTop + BTN_H + PAD;
    const panel = new PixelFrame(scene, w, h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true });
    panel.img.setInteractive();
    this.owned.push(panel);
    this.body.addAt(panel.img, 0);
    this.body.setPosition(Math.floor((screen.w - w) / 2), Math.max(2, Math.floor((screen.h - h) / 2)));
  }

  /** The Hero and Gear tabs across the top. Returns the y below them. */
  private tabs(inner: number): number {
    const w = Math.floor((inner - TAB.gap) / 2);
    (['hero', 'gear'] as const).forEach((tab, i) => {
      const btn = new PixelButton(this.scene, {
        w, h: TAB.h, label: tab === 'hero' ? 'Hero' : 'Gear', rim: this.tab === tab ? 'gold' : 'bronze', primary: this.tab === tab,
        onClick: () => {
          this.tab = tab;
          this.draw();
        },
      });
      btn.setPosition(PAD + i * (w + TAB.gap), PAD);
      this.owned.push(btn);
      this.body.add(btn.root);
    });
    return PAD + TAB.h;
  }

  /** The stats, skills, spells and army (on a `tight` screen, in the right column to save height). Returns the y below. */
  private heroParts(hero: Hero, data: HeroSheet, col: number, two: boolean, tight: boolean, top: number): number {
    const x = PAD;
    const second = two ? x + col + GAP * 2 : x;
    const heroW = two ? col * 2 + GAP * 2 : col;
    let left = this.head(x, top, col, data, this.source.face);
    left = this.stats(x, left + GAP, col, data, !two && this.screen.h < WORDY_H);
    left = this.lines(x, left + GAP, col, data.lines);
    let right = this.heading(second, two ? top : left + GAP, col, 'Skills');
    right = this.text(second, right, col, data.skills.length ? data.skills.map((s) => `${s.name}: ${s.says}`).join('\n') : 'No skills yet: they come with new levels');
    right = this.heading(second, right + GAP, col, 'Spells');
    right = this.text(second, right, col, data.spellsNote ?? data.spells.map((s) => s.name).join(' · '));
    const armyTop = (tight ? right : Math.max(left, right)) + GAP;
    const army = new ArmyRow(this.scene);
    army.set(hero.army);
    army.setPosition(tight ? second : x + Math.floor((heroW - ARMY_ROW_W) / 2), armyTop);
    this.owned.push(army);
    this.body.add(army.root);
    return Math.max(left, armyTop + SLOT);
  }

  private label(opts: ConstructorParameters<typeof TextLabel>[1], text: string, x: number, y: number): TextLabel {
    const l = new TextLabel(this.scene, opts).setText(text).setPosition(x, y);
    this.owned.push(l);
    this.body.add(l.img);
    return l;
  }

  /** The face, name and class, and the experience bar under them. Returns the y below. */
  private head(x: number, y: number, w: number, data: HeroSheet, face: string): number {
    this.body.add(this.scene.add.image(x, y, face).setOrigin(0));
    const tx = x + SLOT + 6;
    this.label({ kind: 'title', align: 'left', anchor: { x: 0, y: 0 } }, data.name, tx, y);
    this.label({ align: 'left', anchor: { x: 0, y: 0 } }, data.title, tx, y + LINE);
    const barY = y + SLOT + 4 + LINE;
    this.label({ align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim }, 'Experience', x, y + SLOT + 3);
    this.label({ align: 'right', anchor: { x: 1, y: 0 } }, data.xp.value, x + w, y + SLOT + 3);
    this.body.add(this.scene.add.rectangle(x, barY, w, BAR_H, BAR_BACK).setOrigin(0));
    this.body.add(this.scene.add.rectangle(x, barY, Math.round(w * data.xp.part), BAR_H, BAR_FILL).setOrigin(0));
    return barY + BAR_H;
  }

  private row(x: number, y: number, w: number, r: SheetRow): void {
    this.body.add(this.scene.add.image(x, y - 1, UI_TEX.stat(r.icon)).setOrigin(0));
    this.label({ align: 'left', anchor: { x: 0, y: 0 } }, r.label, x + ICON + ICON_GAP, y);
    this.label({ kind: 'title', align: 'right', anchor: { x: 1, y: 0 } }, r.value, x + w, y);
  }

  /** The four stats; `brief` leaves out what each one does. */
  private stats(x: number, y: number, w: number, data: HeroSheet, brief: boolean): number {
    let at = y;
    for (const r of data.stats) {
      this.row(x, at, w, r);
      if (!brief) this.label({ align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim }, r.says, x + ICON + ICON_GAP, at + LINE - 1);
      at += brief ? LINE : LINE * 2 + 1;
    }
    return at;
  }

  private lines(x: number, y: number, w: number, rows: readonly SheetRow[]): number {
    rows.forEach((r, i) => this.row(x, y + i * LINE, w, r));
    return y + rows.length * LINE;
  }

  private heading(x: number, y: number, w: number, text: string): number {
    const l = this.label({ kind: 'title', anchor: { x: 0.5, y: 0 } }, text, x + Math.floor(w / 2), y);
    const rule = new PixelImage(this.scene, drawRule(Math.min(w, l.width + 40)), { x: 0.5, y: 0 }).setPosition(x + Math.floor(w / 2), y + l.height + 1);
    this.owned.push(rule);
    this.body.add(rule.img);
    return y + l.height + 1 + RULE_H + 3;
  }

  private text(x: number, y: number, w: number, text: string): number {
    return y + this.label({ wrap: w, align: 'left', anchor: { x: 0, y: 0 } }, text, x, y).height;
  }

  close(): void {
    if (this.closed) return;
    this.dispose();
    this.onClose();
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.clear();
    this.root.destroy();
  }
}
