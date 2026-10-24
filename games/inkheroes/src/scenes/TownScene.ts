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
import { screenScene, toView, viewSize } from './hidpi';
import type { MapScene } from './MapScene';
import { Session } from './session';
import { buildPanel, guildPanel, recruitPanel, type PanelBody, type PanelKind, type TownActions } from './town/townPanels';
import { shownPieces, townView, TOWN_VIEW } from './town/townView';
import { inkText } from './ui';
import { cardFit } from './uiLayout';
import { HAND, paintedButton, paperCard, roundButton } from './uiPaint';

/** The strip along the bottom for the purse, armies and buttons, in its own units (it spans the screen's width). */
const STRIP = { w: 1180, h: 250 } as const;
/** The most of the screen's height the strip may take. */
const STRIP_SHARE = 0.4;
/** How far the townscape tucks under the strip's torn edge. */
const TUCK = 12;
/** The most sky a wide screen may crop off the townscape's top, units: the keep's flag stands just below. */
const SKY_CROP = 20;
/** A press that moves further than this (CSS px) is a drag, not a tap. */
const DRAG = 10;
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
  /** Where the strip begins on screen: messages show just above it. */
  private stripTop = 0;
  /** The townscape, how far it is panned from centre and how far it can go each way. */
  private town: Phaser.GameObjects.Container | null = null;
  private townLeft = 0;
  private panX = 0;
  private panRoom = 0;
  /** Where the current press began, and whether it has turned into a drag. */
  private press: { x: number; y: number; panX: number } | null = null;
  private dragged = false;
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
    this.panX = 0;
    this.wirePan();
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

  /** Dragging the townscape sideways pans it when it's wider than the screen. */
  private wirePan(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const at = toView(p.x, p.y, this);
      this.press = at.y < this.stripTop && !this.panel ? { ...at, panX: this.panX } : null;
      this.dragged = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.press || !p.isDown) return;
      const at = toView(p.x, p.y, this);
      if (!this.dragged && Math.abs(at.x - this.press.x) < DRAG) return;
      this.dragged = true;
      this.panX = Phaser.Math.Clamp(this.press.panX + at.x - this.press.x, -this.panRoom / 2, this.panRoom / 2);
      this.town?.setX(this.townLeft + this.panX);
    });
    this.input.on('pointerup', () => {
      this.press = null;
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
    // The strip spans the bottom; the townscape fills the screen above it,
    // cropping its sides (or a little sky) to cover. A screen wider still
    // keeps the castle whole and shows the ground mirrored past its edges.
    const u = Math.min(1.25, v.width / STRIP.w, (v.height * STRIP_SHARE) / STRIP.h);
    const stripTop = v.height - STRIP.h * u;
    this.stripTop = stripTop;
    const area = { w: v.width, h: stripTop + TUCK };
    const s = Math.max(area.h / TOWN_VIEW.h, Math.min(area.w / TOWN_VIEW.w, area.h / (TOWN_VIEW.h - SKY_CROP)));
    // Wider than the screen (a phone held upright): drag sideways to look along the town.
    this.panRoom = Math.max(0, TOWN_VIEW.w * s - area.w);
    this.panX = Phaser.Math.Clamp(this.panX, -this.panRoom / 2, this.panRoom / 2);
    const town = townView(this, this.session.adv.town.built, { onPick: (id) => this.pickBuilding(id), fresh: this.fresh });
    town.setScale(s).setPosition((area.w - TOWN_VIEW.w * s) / 2 + this.panX, area.h - TOWN_VIEW.h * s);
    this.town = town;
    this.townLeft = (area.w - TOWN_VIEW.w * s) / 2;
    b.add(town);
    this.fresh = undefined;
    const strip = this.add.container(0, stripTop).setScale(u);
    this.drawStrip(strip, v.width / u);
    b.add(strip);
    if (this.panel) this.drawPanel(b, this.panel, v);
  }

  /** The strip under the townscape, `w` units wide: name, income and purse; the armies; the town's buttons. */
  private drawStrip(b: Phaser.GameObjects.Container, w: number): void {
    const adv = this.session.adv;
    const t = adv.town;
    b.add(paperCard(this, w / 2, STRIP.h / 2 + 2, Math.round(w - 8), STRIP.h - 4, 811, { radius: 6, rough: 1.2, shadow: 0.7, rule: true }));
    b.add(this.add.text(22, 8, t.name, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '40px', color: INK }));
    b.add(this.add.text(30, 56, `${income(t)} gold a day · ${t.builtToday ? 'built today' : 'one building a day'}`, { fontFamily: SANS, fontSize: '14px', color: INK }));
    let x = w - 24;
    for (const r of [...RESOURCES].reverse()) {
      const n = this.add.text(x, 34, String(adv.purse[r]), { fontFamily: HAND, fontSize: '26px', color: INK, padding: { x: 4, y: 2 } }).setOrigin(1, 0.5);
      x -= n.width + 2;
      const icon = this.add.image(x - 12, 34, TEX.icon(r)).setScale(1 / 3);
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
      const bx = w - 310 + (i % 2) * 160;
      const by = 112 + Math.floor(i / 2) * 60;
      b.add(paintedButton(this, bx, by, label, onClick, { width: 146, height: 48, size: 24, kind }));
    });
  }

  private drawArmies(b: Phaser.GameObjects.Container): void {
    const adv = this.session.adv;
    const y = 82;
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
    if (this.panel || this.dragged) return;
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

  /** A panel in the middle of the screen, over a dimmed town that closes it when tapped. */
  private drawPanel(b: Phaser.GameObjects.Container, kind: PanelKind, v: { width: number; height: number }): void {
    const adv = this.session.adv;
    const body: PanelBody = kind === 'build' ? buildPanel(this, adv, this.session.def.off, this.actions()) : kind === 'recruit' ? recruitPanel(this, adv, this.actions()) : guildPanel(this, adv, this.actions());
    const dim = this.add.rectangle(v.width / 2, v.height / 2, v.width, v.height, 0x232a4f, 0.28).setInteractive();
    dim.on('pointerup', () => this.openPanel(null));
    b.add(dim);
    const k = cardFit(v, body, 1.25);
    const p = this.add.container(v.width / 2 - (body.w * k) / 2, v.height / 2 - (body.h * k) / 2).setScale(k);
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

  /** A message on an ink banner just above the strip, rising in and fading after a while. */
  private toast(text: string): void {
    const v = viewSize(this);
    const y = (this.stripTop || v.height) - 18;
    const t = this.add.text(v.width / 2, y + 10, text, { fontFamily: HAND, fontSize: '28px', color: '#fdf8ea', backgroundColor: '#27408b', padding: { x: 18, y: 6 }, align: 'center', wordWrap: { width: Math.min(760, v.width - 40) } })
      .setOrigin(0.5, 1).setDepth(20).setAlpha(0);
    t.setShadow(0, 3, 'rgba(35,42,79,0.35)', 6, false, true);
    this.tweens.add({ targets: t, alpha: 1, y, duration: 220, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 500, onComplete: () => t.destroy() });
  }
}
