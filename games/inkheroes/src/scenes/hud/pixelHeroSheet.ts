import type Phaser from 'phaser';
import { getSound } from '../../host';
import type { Hero } from '../../logic/hero';
import { moveSlot, splitSlot } from '../../logic/army';
import { cardButtonLook, drawRule, SLOT } from '../battle/pixelFrames';
import type { CardView } from '../battle/pixelBuildCard';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel, UI_TEX } from '../battle/pixelUi';
import type { CardSpec } from '../CardScene';
import { ArmyDrag } from './armyDrag';
import { ArmyRow } from './armyRow';
import { armyRowW, fitSlot, HERO_SLOT } from './armySlots';
import { gearLayout } from './gearLayout';
import { drawGear, type GearHost, type GearPick } from './gearPanel';
import { heroSheet, type HeroSheet, type SheetRow } from './heroSheetData';
import { SKILL_ICON, skillGrid } from './skillGrid';
import { specialtyIcon } from './specialtyIcon';
import { SplitPicker } from './splitPicker';

/** A column's width at its widest, the padding, and the spaces between parts, UI pixels. */
const COL_W = 230;
const PAD = 9;
const GAP = 8;
const LINE = 15;
const ICON = 16;
const ICON_GAP = 3;
const RULE_H = 5;
/** The specialty's icon. */
const SPEC_ICON = 24;
const BAR_H = 4;
const BTN_H = 30;
const BAR_BACK = 0x160e09;
const BAR_FILL = 0xf8d26e;
/** A company carried over the sheet stays above it. */
const CARRIED_DEPTH = 100;

/** Two columns need this much screen; narrower, they stack. */
const TWO_COLUMNS = COL_W * 2 + GAP * 2 + PAD * 2 + 8;
/** It takes this much height for each stat and skill to say what it does. */
const WORDY_H = 680;
/** Below this height the army can't have a row of its own. */
const ROOMY_H = 440;
/** A column that stands alone, or beside the army on a short screen, at its widest. */
const WIDE_COL = 340;
/** The width it takes to put the army in the right column instead. */
const ARMY_COLUMNS = armyRowW(SLOT) * 2 + GAP * 2 + PAD * 2 + 8;
/** The line under the army: a hint, or Split beside it. */
const ARMY_FOOT = { gap: 4, h: 24, split: 70 } as const;
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
 * travel, mana, morale, luck and sight, skills, spells and the army, whose
 * companies can be moved, merged and split here, and their gear on a tab of
 * its own, where it has room to be drawn big.
 */
export class PixelHeroSheet implements CardView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private owned: { destroy(): void }[] = [];
  private keys: string[] = [];
  private closed = false;
  private tab: 'hero' | 'gear' = 'hero';
  private pick: GearPick | null = null;
  /** The army's slot picked, to move or split. */
  private company: number | null = null;
  private splitter: SplitPicker | null = null;

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
    const room = screen.w - 8 - PAD * 2;
    const col = tight ? Math.min(WIDE_COL, Math.floor((room - GAP * 2) / 2)) : two ? COL_W : Math.min(WIDE_COL, room);
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
          this.company = null;
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
    left = this.specialty(x, left + GAP, col, hero.id, data);
    left = this.stats(x, left + GAP, col, data, !two && this.screen.h < WORDY_H);
    left = this.lines(x, left + GAP, col, data.lines);
    let right = this.heading(second, two ? top : left + GAP, col, 'Skills');
    right = this.skills(second, right, col, data);
    if (data.magic) {
      right = this.heading(second, right + GAP, col, 'Spells');
      right = this.text(second, right, col, data.spellsNote ?? data.spells.map((s) => s.name).join(' · '));
    }
    const armyTop = (tight ? right : Math.max(left, right)) + GAP;
    const slot = fitSlot(tight ? col : heroW);
    const rowW = armyRowW(slot);
    const armyX = tight ? second : x + Math.floor((heroW - rowW) / 2);
    this.armyRow(hero, slot, armyX, armyTop);
    return Math.max(left, this.armyFoot(hero, armyX, armyTop + slot + ARMY_FOOT.gap, rowW));
  }

  /** The army, its companies moved by a tap on each slot or a drag between them. */
  private armyRow(hero: Hero, slot: number, x: number, y: number): void {
    const row = new ArmyRow(this.scene, slot);
    row.set(hero.army, this.company);
    row.setPosition(x, y);
    this.owned.push(row);
    this.body.add(row.root);
    new ArmyDrag<number>(this.scene, {
      depth: CARRIED_DEPTH,
      canCarry: (i) => !!this.source.hero().army[i],
      tap: (i) => this.tapCompany(i),
      drop: (from, to) => this.moveCompany(from, to),
    }).watch(row, (i) => i);
  }

  /** What to do next, and Split for a company of more than one. Returns the y below. */
  private armyFoot(hero: Hero, x: number, y: number, w: number): number {
    const picked = this.company === null ? null : hero.army[this.company];
    const canSplit = !!picked && picked.count > 1;
    if (canSplit) {
      const btn = new PixelButton(this.scene, { w: ARMY_FOOT.split, h: ARMY_FOOT.h, label: 'Split', rim: 'gold', onClick: () => this.openSplit() });
      btn.setEnabled(hero.army.includes(null));
      btn.setPosition(x + w - ARMY_FOOT.split, y);
      this.owned.push(btn);
      this.body.add(btn.root);
    }
    const hint = picked ? 'Tap a slot to move them' : 'Drag a company, or tap it, to move it';
    this.label({ align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim, wrap: w - (canSplit ? ARMY_FOOT.split + 4 : 0) }, hint, x, y + 4);
    return y + ARMY_FOOT.h;
  }

  /** The first tap picks a company, the second moves it there; a tap on the same one lets go. */
  private tapCompany(i: number): void {
    const from = this.company;
    if (from === null) this.company = this.source.hero().army[i] ? i : null;
    else if (from === i) this.company = null;
    else {
      this.moveCompany(from, i);
      return;
    }
    this.draw();
  }

  private moveCompany(from: number, to: number): void {
    const hero = this.source.hero();
    this.company = null;
    const r = moveSlot(hero.army, from, hero.army, to, true, true);
    if (r) {
      getSound(this.scene)?.play('card');
      this.source.change({ ...hero, army: r.src });
    }
    this.draw();
  }

  private openSplit(): void {
    const at = this.company;
    const company = at === null ? null : this.source.hero().army[at];
    if (at === null || !company || this.splitter) return;
    this.splitter = new SplitPicker(this.scene, {
      id: company.creature, count: company.count, screen: this.screen, depth: CARRIED_DEPTH, parent: this.root,
      onSplit: (n) => {
        this.closeSplit();
        const hero = this.source.hero();
        const r = splitSlot(hero.army, at, n);
        if (!r) return;
        // The new company stays picked, so a tap sends it where it's wanted.
        this.company = r.at;
        getSound(this.scene)?.play('card');
        this.source.change({ ...hero, army: r.army });
        this.draw();
      },
      onClose: () => this.closeSplit(),
    });
  }

  private closeSplit(): void {
    this.splitter?.destroy();
    this.splitter = null;
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
    const tx = x + HERO_SLOT + 6;
    const textY = y + Math.floor((HERO_SLOT - LINE * 2) / 2);
    this.label({ kind: 'title', align: 'left', anchor: { x: 0, y: 0 } }, data.name, tx, textY);
    this.label({ align: 'left', anchor: { x: 0, y: 0 } }, data.title, tx, textY + LINE);
    const barY = y + HERO_SLOT + 4 + LINE;
    this.label({ align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim }, 'Experience', x, y + HERO_SLOT + 3);
    this.label({ align: 'right', anchor: { x: 1, y: 0 } }, data.xp.value, x + w, y + HERO_SLOT + 3);
    this.body.add(this.scene.add.rectangle(x, barY, w, BAR_H, BAR_BACK).setOrigin(0));
    this.body.add(this.scene.add.rectangle(x, barY, Math.round(w * data.xp.part), BAR_H, BAR_FILL).setOrigin(0));
    return barY + BAR_H;
  }

  /** The specialty: its icon and its one line. Returns the y below (none: y less the gap). */
  private specialty(x: number, y: number, w: number, id: string, data: HeroSheet): number {
    if (!data.specialty) return y - GAP;
    this.body.add(specialtyIcon(this.scene, id, data.specialty.spec, x, y, SPEC_ICON, this.keys));
    const text = this.label({ wrap: w - SPEC_ICON - ICON_GAP * 2, align: 'left', anchor: { x: 0, y: 0 } }, data.specialty.text, x + SPEC_ICON + ICON_GAP * 2, y);
    text.setPosition(x + SPEC_ICON + ICON_GAP * 2, y + Math.max(0, Math.floor((SPEC_ICON - text.height) / 2)));
    return y + Math.max(SPEC_ICON, text.height);
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

  /** Each skill's icon, with its name and what it does; on a short screen, two to a row with its name and rank. Returns the y below. */
  private skills(x: number, y: number, w: number, data: HeroSheet): number {
    if (!data.skills.length) return this.text(x, y, w, 'No skills yet: they come with new levels');
    const wordy = this.screen.h >= WORDY_H;
    const grid = skillGrid(data.skills.length, w, wordy);
    data.skills.forEach((s, i) => {
      const cell = grid.cells[i]!;
      const tx = x + cell.x + SKILL_ICON + ICON_GAP;
      const top = y + cell.y + Math.floor((SKILL_ICON - LINE * 2) / 2);
      this.body.add(this.scene.add.image(x + cell.x, y + cell.y, UI_TEX.skill(s.id)).setOrigin(0));
      this.label({ align: 'left', anchor: { x: 0, y: 0 } }, wordy ? `${s.rank} ${s.name}` : s.name, tx, top);
      this.label({ align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim }, wordy ? s.says : s.rank, tx, top + LINE);
    });
    return y + grid.h;
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
    this.closeSplit();
    this.clear();
    this.root.destroy();
  }
}
