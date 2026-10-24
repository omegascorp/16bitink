import Phaser from 'phaser';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../art/creatures/types';
import { INK, PAPER } from '../art/palette';
import { TEX } from '../art/textures';
import { getSound } from '../host';
import { enterTown, heroInTown } from '../logic/adventure';
import { moveSlot, type Army } from '../logic/army';
import { BUILDINGS, type BuildingId } from '../logic/buildings';
import { creature, type CreatureId } from '../logic/creatures';
import { describeAmount, pay, canAfford, RESOURCES } from '../logic/resources';
import { SPELLS } from '../logic/spells';
import { build, BUILD_ORDER, cantBuild, dwellings, growthOf, guildSpells, has, hire, hireable, income, SPELLBOOK_COST } from '../logic/town';
import { screenScene, viewSize } from './hidpi';
import type { MapScene } from './MapScene';
import { Session } from './session';
import { cardFit } from './uiLayout';
import { HAND, paintedButton, paperCard } from './uiPaint';

/** The town screen is laid out on this board and scaled to fit. */
const BOARD = { w: 1180, h: 720 } as const;
const TILE = { w: 176, h: 86 } as const;
const SANS = 'Georgia, serif';

type SlotRef = { readonly army: 'hero' | 'garrison'; readonly i: number };

/**
 * A town: build one thing a day, hire from its dwellings, swap units
 * between the garrison and the visiting hero, buy a spellbook. Laid out on
 * one board that scales to the screen.
 */
export class TownScene extends Phaser.Scene {
  private session!: Session;
  private board!: Phaser.GameObjects.Container;
  private picked: SlotRef | null = null;

  constructor() {
    super('Town');
  }

  create(): void {
    screenScene(this, true);
    this.cameras.main.setBackgroundColor(PAPER);
    this.session = Session.get(this);
    this.picked = null;
    this.draw();
    this.scale.on('resize', this.draw, this);
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.draw, this));
  }

  private close(): void {
    this.scene.stop();
    (this.scene.get('Map') as MapScene).back();
  }

  private draw(): void {
    this.board?.destroy();
    const v = viewSize(this);
    const adv = this.session.adv;
    const t = adv.town;
    const b = this.add.container(0, 0);
    this.board = b;
    const s = cardFit(v, BOARD, 1.25);
    b.setScale(s).setPosition(v.width / 2 - (BOARD.w * s) / 2, v.height / 2 - (BOARD.h * s) / 2);
    b.add(this.add.text(0, 0, t.name, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '52px', color: INK }));
    b.add(this.add.text(0, 58, `${income(t)} gold a day · ${t.builtToday ? 'built today' : 'one building a day'}`, { fontFamily: SANS, fontSize: '16px', color: INK }));
    b.add(this.add.text(BOARD.w - 150, 6, RESOURCES.map((r) => `${adv.purse[r]} ${r}`).join('   '), { fontFamily: SANS, fontSize: '15px', color: INK, align: 'right', wordWrap: { width: 560 } }).setOrigin(1, 0));
    b.add(paintedButton(this, BOARD.w - 60, 28, 'Leave', () => this.close(), { width: 110, height: 46, size: 24, kind: 'leaf' }));
    this.drawBuildings(b);
    this.drawRecruits(b);
    this.drawArmies(b);
  }

  private drawBuildings(b: Phaser.GameObjects.Container): void {
    const adv = this.session.adv;
    const off = this.session.def.off;
    const shown = BUILD_ORDER.filter((id) => !off.includes(id));
    b.add(this.add.text(0, 92, 'Buildings', { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '30px', color: INK }));
    shown.forEach((id, i) => {
      const x = (i % 4) * (TILE.w + 10);
      const y = 132 + Math.floor(i / 4) * (TILE.h + 10);
      const built = has(adv.town, id);
      const why = cantBuild(adv.town, id, adv.purse, off);
      const c = this.add.container(x + TILE.w / 2, y + TILE.h / 2);
      c.add(paperCard(this, 0, 0, TILE.w, TILE.h, 600 + i, { radius: 5, rough: 1, shadow: 0.5, tint: built ? 'sage' : why ? 'cream' : 'sky' }));
      c.add(this.add.text(0, -TILE.h / 2 + 6, BUILDINGS[id].name, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '22px', color: INK }).setOrigin(0.5, 0));
      const line = built ? `✓ ${BUILDINGS[id].says}` : why && why !== 'Not enough resources' ? why : describeAmount(BUILDINGS[id].cost);
      c.add(this.add.text(0, -2, line, { fontFamily: SANS, fontSize: '12px', color: INK, align: 'center', wordWrap: { width: TILE.w - 14 } }).setOrigin(0.5, 0).setAlpha(built || !why ? 1 : 0.6));
      if (!built) {
        const zone = this.add.zone(0, 0, TILE.w, TILE.h).setInteractive({ useHandCursor: !why });
        zone.on('pointerup', () => this.tryBuild(id));
        c.add(zone);
      }
      b.add(c);
    });
  }

  private tryBuild(id: BuildingId): void {
    const adv = this.session.adv;
    const why = cantBuild(adv.town, id, adv.purse, this.session.def.off);
    const def = BUILDINGS[id];
    if (why) {
      this.toast(`${def.name}: ${why === 'Not enough resources' ? `needs ${describeAmount(def.cost)}` : why.toLowerCase()}`);
      return;
    }
    const r = build(adv.town, id, adv.purse, this.session.def.off);
    let next = { ...adv, town: r.town, purse: r.purse };
    if (heroInTown(next)) next = enterTown(next);
    getSound(this)?.play('build');
    this.session.set(next);
    this.toast(`${def.name} built: ${def.says.toLowerCase()}`);
    this.draw();
  }

  private drawRecruits(b: Phaser.GameObjects.Container): void {
    const adv = this.session.adv;
    const x0 = 4 * (TILE.w + 10) + 20;
    b.add(this.add.text(x0, 92, 'Recruit', { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '30px', color: INK }));
    const homes = dwellings(adv.town);
    if (homes.length === 0) b.add(this.add.text(x0, 136, 'Build a dwelling to hire troops.', { fontFamily: SANS, fontSize: '15px', color: INK }));
    homes.forEach((id, i) => {
      const y = 132 + i * 92;
      const w = BOARD.w - x0;
      const c = this.add.container(x0 + w / 2, y + 42);
      c.add(paperCard(this, 0, 0, w, 84, 700 + i, { radius: 5, rough: 1, shadow: 0.5 }));
      c.add(this.add.image(-w / 2 + 46, 38, TEX.creature(id, 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.55 / CREATURE_RES));
      const cr = creature(id);
      const can = hireable(adv.town, id, adv.purse);
      c.add(this.add.text(-w / 2 + 92, -34, `${cr.plural}`, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '24px', color: INK }));
      c.add(this.add.text(-w / 2 + 92, -6, `${adv.town.stock[id] ?? 0} to hire · ${describeAmount(cr.cost)} each · +${growthOf(adv.town, id)} a week\nAtt ${cr.attack} Def ${cr.defense} Dmg ${cr.minDmg}–${cr.maxDmg} HP ${cr.hp} Spd ${cr.speed}${cr.shots ? ' · shoots' : ''}${cr.flies ? ' · flies' : ''}`, { fontFamily: SANS, fontSize: '12px', color: INK, lineSpacing: 3 }));
      if (can > 0) {
        c.add(paintedButton(this, w / 2 - 70, -16, 'Hire 1', () => this.hire(id, 1), { width: 110, height: 34, size: 20 }));
        c.add(paintedButton(this, w / 2 - 70, 22, `Hire ${can}`, () => this.hire(id, can), { width: 110, height: 34, size: 20, kind: 'leaf' }));
      }
      b.add(c);
    });
    // The mage guild's spells, and a spellbook for a hero without one.
    const spells = guildSpells(adv.town);
    if (has(adv.town, 'mageGuild1')) {
      const y = 132 + Math.max(1, homes.length) * 92 + 6;
      b.add(this.add.text(x0, y, `Mage Guild: ${spells.map((s) => SPELLS[s].name).join(', ')}`, { fontFamily: SANS, fontSize: '14px', color: INK, wordWrap: { width: BOARD.w - x0 } }));
      if (heroInTown(adv) && !adv.hero.hasBook) b.add(paintedButton(this, x0 + 110, y + 46, `Spellbook: ${SPELLBOOK_COST} gold`, () => this.buyBook(), { width: 220, height: 38, size: 20 }));
    }
  }

  private hire(id: CreatureId, n: number): void {
    const adv = this.session.adv;
    const toHero = heroInTown(adv);
    try {
      const r = hire(adv.town, id, n, adv.purse, toHero ? adv.hero.army : adv.town.garrison);
      const town = toHero ? r.town : { ...r.town, garrison: r.army };
      this.session.set({ ...adv, town, purse: r.purse, hero: toHero ? { ...adv.hero, army: r.army } : adv.hero });
      getSound(this)?.play('hire');
      this.draw();
    } catch (err) {
      this.toast(err instanceof Error && err.message === 'No room in the army' ? 'No room: the army has seven companies already' : 'Cannot hire that many');
    }
  }

  private buyBook(): void {
    const adv = this.session.adv;
    if (!canAfford(adv.purse, { gold: SPELLBOOK_COST })) {
      this.toast(`A spellbook costs ${SPELLBOOK_COST} gold`);
      return;
    }
    this.session.set(enterTown({ ...adv, purse: pay(adv.purse, { gold: SPELLBOOK_COST }), hero: { ...adv.hero, hasBook: true } }));
    this.draw();
  }

  private drawArmies(b: Phaser.GameObjects.Container): void {
    const adv = this.session.adv;
    const y = BOARD.h - 150;
    const rows: { label: string; army: Army; ref: SlotRef['army'] }[] = [{ label: 'Garrison', army: adv.town.garrison, ref: 'garrison' }];
    if (heroInTown(adv)) rows.push({ label: adv.hero.name, army: adv.hero.army, ref: 'hero' });
    else b.add(this.add.text(0, y + 84, `${adv.hero.name} is away: troops hired now wait in the garrison.`, { fontFamily: SANS, fontSize: '14px', color: INK }));
    rows.forEach((row, r) => {
      const ry = y + r * 76;
      b.add(this.add.text(0, ry + 20, row.label, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '26px', color: INK }));
      row.army.forEach((slot, i) => {
        const x = 150 + i * 86;
        const picked = this.picked?.army === row.ref && this.picked.i === i;
        const box = this.add.rectangle(x, ry + 30, 80, 68, picked ? 0x2f6b3a : 0x232a4f, picked ? 0.18 : 0.05).setStrokeStyle(picked ? 2.5 : 1, picked ? 0x2f6b3a : 0x232a4f, picked ? 0.9 : 0.35).setInteractive({ useHandCursor: true });
        box.on('pointerup', () => this.pickSlot({ army: row.ref, i }));
        b.add(box);
        if (!slot) return;
        b.add(this.add.image(x, ry + 58, TEX.creature(slot.creature, 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.48 / CREATURE_RES));
        b.add(this.add.text(x + 38, ry + 62, String(slot.count), { fontFamily: SANS, fontSize: '14px', color: '#fdf8ea', backgroundColor: '#232a4f', padding: { x: 3, y: 1 } }).setOrigin(1, 1));
      });
    });
    if (rows.length === 2) b.add(this.add.text(150 + 7 * 86, y + 50, 'Tap a company,\nthen where it goes.', { fontFamily: SANS, fontSize: '13px', color: INK, lineSpacing: 3 }));
  }

  /** First tap picks a company; the second moves it there (merging like units, swapping others). */
  private pickSlot(ref: SlotRef): void {
    const adv = this.session.adv;
    const armyOf = (a: SlotRef['army']): Army => (a === 'hero' ? adv.hero.army : adv.town.garrison);
    if (!this.picked) {
      if (armyOf(ref.army)[ref.i]) this.picked = ref;
      this.draw();
      return;
    }
    const from = this.picked;
    this.picked = null;
    const same = from.army === ref.army;
    const r = moveSlot(armyOf(from.army), from.i, armyOf(ref.army), ref.i, same, from.army === 'hero');
    if (!r) {
      if (from.army === 'hero' && !same) this.toast('A hero must keep at least one company');
      this.draw();
      return;
    }
    const hero = from.army === 'hero' ? r.src : ref.army === 'hero' ? r.dst : adv.hero.army;
    const garrison = from.army === 'garrison' ? r.src : ref.army === 'garrison' ? r.dst : adv.town.garrison;
    this.session.set({ ...adv, hero: { ...adv.hero, army: hero }, town: { ...adv.town, garrison } });
    this.draw();
  }

  private toast(text: string): void {
    const v = viewSize(this);
    const t = this.add.text(v.width / 2, v.height - 30, text, { fontFamily: HAND, fontSize: '28px', color: INK, backgroundColor: '#fdf8ea', padding: { x: 14, y: 6 } }).setOrigin(0.5, 1).setDepth(10);
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 500, onComplete: () => t.destroy() });
  }
}
