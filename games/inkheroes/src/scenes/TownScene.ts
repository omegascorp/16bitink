import { runInSlices } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../art/creatures/types';
import { INK, PAPER } from '../art/palette';
import { TEX, townJobs } from '../art/textures';
import { getSound } from '../host';
import { enterTown, heroInTown } from '../logic/adventure';
import { moveSlot, type Army } from '../logic/army';
import { BUILDINGS, type BuildingId } from '../logic/buildings';
import type { CreatureId } from '../logic/creatures';
import { canAfford, describeAmount, pay, RESOURCES } from '../logic/resources';
import { build, cantBuild, has, hire, income, SPELLBOOK_COST } from '../logic/town';
import { screenScene, viewSize } from './hidpi';
import type { MapScene } from './MapScene';
import { Session } from './session';
import { buildPanel, guildPanel, recruitPanel, type PanelBody, type PanelKind, type TownActions } from './town/townPanels';
import { shownPieces, townView, TOWN_VIEW } from './town/townView';
import { inkText } from './ui';
import { cardFit } from './uiLayout';
import { HAND, paintedButton, paperCard, roundButton } from './uiPaint';

/** The town screen is laid out on this board and scaled to fit: the townscape over a strip for the armies. */
const BOARD = { w: TOWN_VIEW.w, h: 720 } as const;
const STRIP = { y: TOWN_VIEW.h, h: BOARD.h - TOWN_VIEW.h } as const;
const SANS = 'Georgia, serif';

type SlotRef = { readonly army: 'hero' | 'garrison'; readonly i: number };

/** What tapping each building in the townscape opens. */
const OPENS: Partial<Record<BuildingId, PanelKind>> = {
  villageHall: 'build', townHall: 'build', cityHall: 'build', capitol: 'build',
  fort: 'recruit', citadel: 'recruit', castle: 'recruit',
  guardhouse: 'recruit', archeryRange: 'recruit', griffinTower: 'recruit', barracks: 'recruit', monastery: 'recruit', tiltyard: 'recruit', seraphSpire: 'recruit',
  mageGuild1: 'guild', mageGuild2: 'guild',
};

/**
 * A town, as Heroes III shows it: the painted townscape, where each
 * building stands once built and opens what it does when tapped (the hall
 * its ledger of buildings, the walls and dwellings the muster, the guild
 * its spells), over a strip with the purse, the garrison and the visiting
 * hero. One building a day; units swap between garrison and hero.
 */
export class TownScene extends Phaser.Scene {
  private session!: Session;
  private board!: Phaser.GameObjects.Container;
  private picked: SlotRef | null = null;
  private panel: PanelKind | null = null;
  private fresh: BuildingId | undefined;
  private ready = false;

  constructor() {
    super('Town');
  }

  create(): void {
    screenScene(this, true);
    this.cameras.main.setBackgroundColor(PAPER);
    this.session = Session.get(this);
    this.picked = null;
    this.panel = null;
    this.fresh = undefined;
    this.ready = false;
    this.scale.on('resize', this.draw, this);
    this.input.keyboard?.on('keydown-ESC', () => (this.panel ? this.openPanel(null) : this.close()));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.draw, this));
    // The townscape is painted the first time a town opens (and as it grows).
    const jobs = townJobs(this, shownPieces(this.session.adv.town.built));
    if (!jobs.length) {
      this.ready = true;
      this.draw();
      return;
    }
    const v = viewSize(this);
    const label = inkText(this, v.width / 2, v.height / 2, `the gates of ${this.session.adv.town.name} open…`, 32);
    void runInSlices(jobs).then(() => {
      if (!this.sys.isActive()) return;
      label.destroy();
      this.ready = true;
      this.draw();
    });
  }

  private close(): void {
    this.scene.stop();
    (this.scene.get('Map') as MapScene).back();
  }

  private actions(): TownActions {
    return { build: (id) => this.tryBuild(id), hire: (id, n) => this.hire(id, n), buyBook: () => this.buyBook() };
  }

  private draw(): void {
    if (!this.ready) return;
    this.board?.destroy();
    const v = viewSize(this);
    const b = this.add.container(0, 0);
    this.board = b;
    const s = cardFit(v, BOARD, 1.25);
    b.setScale(s).setPosition(v.width / 2 - (BOARD.w * s) / 2, v.height / 2 - (BOARD.h * s) / 2);
    b.add(townView(this, this.session.adv.town.built, { onPick: (id) => this.pickBuilding(id), fresh: this.fresh }));
    this.fresh = undefined;
    this.drawStrip(b);
    if (this.panel) this.drawPanel(b, this.panel);
  }

  /** The strip under the townscape: name, income and purse; the armies; the town's buttons. */
  private drawStrip(b: Phaser.GameObjects.Container): void {
    const adv = this.session.adv;
    const t = adv.town;
    b.add(paperCard(this, BOARD.w / 2, STRIP.y + STRIP.h / 2 + 2, BOARD.w - 8, STRIP.h - 4, 811, { radius: 6, rough: 1.2, shadow: 0.7, rule: true }));
    b.add(this.add.text(22, STRIP.y + 8, t.name, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '40px', color: INK }));
    b.add(this.add.text(30, STRIP.y + 56, `${income(t)} gold a day · ${t.builtToday ? 'built today' : 'one building a day'}`, { fontFamily: SANS, fontSize: '14px', color: INK }));
    let x = BOARD.w - 24;
    for (const r of [...RESOURCES].reverse()) {
      const n = this.add.text(x, STRIP.y + 34, String(adv.purse[r]), { fontFamily: HAND, fontSize: '26px', color: INK, padding: { x: 4, y: 2 } }).setOrigin(1, 0.5);
      x -= n.width + 2;
      const icon = this.add.image(x - 12, STRIP.y + 34, TEX.icon(r)).setScale(1 / 3);
      x -= 40;
      b.add([n, icon]);
    }
    this.drawArmies(b);
    const guild = has(t, 'mageGuild1');
    const buttons: [string, () => void, 'leaf' | 'paper' | 'sky'][] = [
      ['Build', () => this.openPanel('build'), t.builtToday ? 'paper' : 'leaf'],
      ['Recruit', () => this.openPanel('recruit'), 'paper'],
      ...(guild ? [['Mage Guild', () => this.openPanel('guild'), 'paper'] as [string, () => void, 'paper']] : []),
      ['Leave', () => this.close(), 'sky'],
    ];
    buttons.forEach(([label, onClick, kind], i) => {
      const bx = 870 + (i % 2) * 160;
      const by = STRIP.y + 112 + Math.floor(i / 2) * 60;
      b.add(paintedButton(this, bx, by, label, onClick, { width: 146, height: 48, size: 24, kind }));
    });
  }

  private drawArmies(b: Phaser.GameObjects.Container): void {
    const adv = this.session.adv;
    const y = STRIP.y + 82;
    const rows: { label: string; army: Army; ref: SlotRef['army'] }[] = [{ label: 'Garrison', army: adv.town.garrison, ref: 'garrison' }];
    if (heroInTown(adv)) rows.push({ label: adv.hero.name, army: adv.hero.army, ref: 'hero' });
    else b.add(this.add.text(30, y + 90, `${adv.hero.name} is away: troops hired now wait in the garrison.`, { fontFamily: SANS, fontSize: '14px', color: INK }));
    rows.forEach((row, r) => {
      const ry = y + r * 76;
      b.add(this.add.text(22, ry + 18, row.label, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '26px', color: INK }));
      row.army.forEach((slot, i) => {
        const x = 170 + i * 84;
        const picked = this.picked?.army === row.ref && this.picked.i === i;
        const box = this.add.rectangle(x, ry + 34, 78, 68, picked ? 0x2f6b3a : 0x232a4f, picked ? 0.18 : 0.06).setStrokeStyle(picked ? 2.5 : 1, picked ? 0x2f6b3a : 0x232a4f, picked ? 0.9 : 0.35).setInteractive({ useHandCursor: true });
        box.on('pointerup', () => this.pickSlot({ army: row.ref, i }));
        b.add(box);
        if (!slot) return;
        b.add(this.add.image(x, ry + 62, TEX.creature(slot.creature, 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.48 / CREATURE_RES));
        b.add(this.add.text(x + 37, ry + 66, String(slot.count), { fontFamily: SANS, fontSize: '14px', color: '#fdf8ea', backgroundColor: '#232a4f', padding: { x: 3, y: 1 } }).setOrigin(1, 1));
      });
    });
  }

  private pickBuilding(id: BuildingId): void {
    if (this.panel) return;
    const opens = OPENS[id];
    if (opens) {
      this.openPanel(opens);
      return;
    }
    this.toast(`${BUILDINGS[id].name}: ${BUILDINGS[id].says.toLowerCase()}`);
  }

  private openPanel(kind: PanelKind | null): void {
    this.panel = kind;
    this.draw();
  }

  /** A panel over the townscape, on a dimmed board that closes it when tapped. */
  private drawPanel(b: Phaser.GameObjects.Container, kind: PanelKind): void {
    const adv = this.session.adv;
    const body: PanelBody = kind === 'build' ? buildPanel(this, adv, this.session.def.off, this.actions()) : kind === 'recruit' ? recruitPanel(this, adv, this.actions()) : guildPanel(this, adv, this.actions());
    const dim = this.add.rectangle(BOARD.w / 2, BOARD.h / 2, BOARD.w + 400, BOARD.h + 400, 0x232a4f, 0.28).setInteractive();
    dim.on('pointerup', () => this.openPanel(null));
    b.add(dim);
    const x0 = BOARD.w / 2 - body.w / 2;
    const y0 = Math.max(6, Math.min(TOWN_VIEW.h / 2 + 40, BOARD.h / 2) - body.h / 2);
    const p = this.add.container(x0, y0);
    const card = paperCard(this, body.w / 2, body.h / 2, body.w, body.h, 900 + body.h, { radius: 8, rule: true, shadow: 1.2 });
    // The card swallows taps so only the dim board around it closes the panel.
    const guard = this.add.zone(body.w / 2, body.h / 2, body.w, body.h).setInteractive();
    p.add([card, guard]);
    p.add(this.add.text(body.w / 2, 8, body.title, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '40px', color: INK }).setOrigin(0.5, 0));
    p.add(body.items);
    p.add(roundButton(this, body.w - 18, 18, 'close', () => this.openPanel(null), 44).root);
    b.add(p);
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
    // Paint the new building, then close the ledger so it can be seen rising.
    void runInSlices(townJobs(this, shownPieces(next.town.built))).then(() => {
      if (!this.sys.isActive()) return;
      this.fresh = id;
      this.panel = null;
      this.draw();
      this.toast(`${def.name} built: ${def.says.toLowerCase()}`);
    });
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
