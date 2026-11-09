import type Phaser from 'phaser';
import type { MapDef } from '../../level/types';
import type { Adventure } from '../../logic/adventure';
import { armyOf } from '../../logic/army';
import type { Primary } from '../../logic/hero';
import type { Town } from '../../logic/town';
import type { StatName } from '../../art/pixel/ui';
import { faceOf, heroArt, PX_TEX } from '../battle/pixelAssets';
import { drawPortrait, SLOT } from '../battle/pixelFrames';
import { INK, PixelButton, putBuffer, UI_TEX } from '../battle/pixelUi';
import { ArmyRow } from '../hud/armyRow';
import { HERO_SLOT } from '../hud/armySlots';
import { CHOICE, choiceLayout, TAVERN, tavernChoice, tavernLayout, tavernOffer, type TavernCard, type TavernChoice, type TavernOffer } from './tavernData';
import { specialtyIcon } from '../hud/specialtyIcon';
import { roomIn, TownRoom } from './townRoom';

const HIRE = { w: 110, h: 42 } as const;
/** A roster card's specialty icon. */
const SPEC_ICON = 24;
const STATS: readonly (Primary & StatName)[] = ['attack', 'defense', 'power', 'knowledge'];
/** A stat's icon and the gap before its value. */
const ICON = 16;
const ICON_GAP = 3;

export interface TavernActions {
  close(): void;
  /** Hires hero `id` (none: the one the map's own list offers). */
  hire(id?: string): void;
}

/**
 * The Tavern as a room, like the guild and the Blacksmith: the hero who
 * waits there (their figure, or on a narrow screen their face), their name,
 * class and a line about them, their four stats, what they know and the
 * army they bring, and at the foot the price with Hire, or why they can't
 * be hired.
 */
export class TavernRoom extends TownRoom {
  private readonly faceKeys: string[] = [];

  constructor(scene: Phaser.Scene, adv: Adventure, def: MapDef, town: Town, area: { w: number; h: number }, private readonly act: TavernActions, depth: number) {
    // A map with no recruits of its own: the roster's two, a card each.
    const roster = !def.recruits;
    const l = roster ? choiceLayout(roomIn(area)) : tavernLayout(roomIn(area));
    super(scene, area, l, { title: 'Tavern' }, () => act.close(), depth);
    if (roster) {
      this.choice(tavernChoice(adv, def, town), choiceLayout(roomIn(area)));
      return;
    }
    const offer = tavernOffer(adv, def, town);
    const { pad, gap, head } = TAVERN;
    const bodyH = l.h - head - gap - TAVERN.foot - pad;
    const plate = this.plate(pad, head, l.w - pad * 2, bodyH);
    if (!offer.hero) this.label(offer.note, Math.floor(l.w / 2), head + Math.floor(bodyH / 2) - 7, { wrap: l.w - pad * 4, anchor: { x: 0.5, y: 0 }, ink: INK.dim });
    else {
      const x = l.side ? pad + TAVERN.figure + gap : pad + 6;
      if (l.side) this.figure(offer, pad, head, plate.height);
      this.details(offer, x, head + 5, l.w - pad - 6 - x, !l.side);
    }
    this.foot(offer, pad, l.h - pad - TAVERN.foot, l.w - pad * 2);
  }

  /** The roster's heroes on a card each, and the note (what hiring means, or why it can't be done) at the foot. */
  private choice(c: TavernChoice, l: ReturnType<typeof choiceLayout>): void {
    const { pad, gap, head } = TAVERN;
    if (!c.cards.length) {
      const bodyH = l.h - head - gap - TAVERN.foot - pad;
      this.plate(pad, head, l.w - pad * 2, bodyH);
      this.label(c.note, Math.floor(l.w / 2), head + Math.floor(bodyH / 2) - 7, { wrap: l.w - pad * 4, anchor: { x: 0.5, y: 0 }, ink: INK.dim });
    }
    c.cards.forEach((card, i) => {
      const x = l.side ? pad + i * (l.card.w + gap) : pad;
      const y = l.side ? head : head + i * (l.card.h + gap);
      this.card(card, c.price, x, y, l.card.w, l.card.h);
    });
    const y = l.h - pad - TAVERN.foot;
    this.plate(pad, y, l.w - pad * 2, TAVERN.foot);
    if (!c.cards.length) return;
    const note = this.label(c.note, pad + 6, y, { wrap: l.w - pad * 2 - 12, align: 'left', anchor: { x: 0, y: 0 }, ink: c.cards.some((k) => k.enabled) ? INK.text : INK.dim });
    note.setPosition(pad + 6, y + Math.floor(TAVERN.foot / 2) - Math.ceil(note.height / 2));
  }

  /** One hero for hire: face, name and class, specialty (its icon and line), and Hire. */
  private card(card: TavernCard, price: string, x: number, y: number, w: number, h: number): void {
    const { pad, gap, line, hire } = CHOICE;
    this.plate(x, y, w, h);
    const art = heroArt('player', card.hero.id);
    const key = putBuffer(this.scene, drawPortrait(faceOf(this.scene, PX_TEX.hero(art.id, 'idle'), art.art, HERO_SLOT - 4), 'bronze', false, false, HERO_SLOT));
    this.faceKeys.push(key);
    this.root.add(this.scene.add.image(x + pad, y + pad, key).setOrigin(0));
    const tx = x + pad + HERO_SLOT + 6;
    this.label(card.hero.name, tx, y + pad + 6, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    this.label(card.title, tx, y + pad + 6 + line + 2, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    const at = y + pad + HERO_SLOT + gap;
    if (card.specialty) {
      this.root.add(specialtyIcon(this.scene, card.hero.id, card.specialty.spec, x + pad, at, SPEC_ICON, this.faceKeys));
      this.label(card.specialty.text, x + pad + SPEC_ICON + 6, at, { wrap: w - pad * 2 - SPEC_ICON - 6, align: 'left', anchor: { x: 0, y: 0 } });
    }
    const btn = new PixelButton(this.scene, { w: w - pad * 2, h: hire, label: 'Hire', note: price, rim: 'gold', primary: true, onClick: () => this.act.hire(card.hero.id) });
    btn.setEnabled(card.enabled);
    btn.setPosition(x + pad, y + h - pad - hire);
    this.root.add(btn.root);
    this.owned.push(btn);
  }

  /** The hero as they stand in battle, their feet on the plate's floor. */
  private figure(offer: TavernOffer, x: number, y: number, h: number): void {
    const art = heroArt('player', offer.hero!.id);
    const img = this.scene.add.image(0, 0, PX_TEX.hero(art.id, 'idle'), 0).setDisplayOrigin(art.art.footX, art.art.footY);
    img.setPosition(x + Math.floor(TAVERN.figure / 2), y + h - 6);
    this.root.add(img);
  }

  /** Name, class, blurb, stats, what they know and their army; with `face`, the face heads it. */
  private details(offer: TavernOffer, x: number, y: number, w: number, face: boolean): void {
    const hero = offer.hero!;
    let tx = x;
    if (face) {
      const art = heroArt('player', hero.id);
      const key = putBuffer(this.scene, drawPortrait(faceOf(this.scene, PX_TEX.hero(art.id, 'idle'), art.art, HERO_SLOT - 4), 'bronze', false, false, HERO_SLOT));
      this.faceKeys.push(key);
      this.root.add(this.scene.add.image(x, y, key).setOrigin(0));
      tx = x + HERO_SLOT + 6;
    }
    const { line, gap } = TAVERN;
    const name = this.label(hero.name, tx, y + (face ? 6 : 0), { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    this.label(offer.title, tx + name.width + 8, y + (face ? 7 : 1), { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    let at = face ? y + HERO_SLOT + 4 : y + line + 2;
    if (hero.blurb) at += this.label(hero.blurb, x, at, { wrap: w, align: 'left', anchor: { x: 0, y: 0 } }).height + gap;
    const step = Math.floor(w / STATS.length);
    STATS.forEach((s, i) => {
      this.root.add(this.scene.add.image(x + i * step, at - 1, UI_TEX.stat(s)).setOrigin(0));
      this.label(String(hero[s]), x + i * step + ICON + ICON_GAP, at, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    });
    at += ICON + gap;
    if (offer.knows) at += this.label(offer.knows, x, at, { wrap: w, align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim }).height + gap;
    const row = new ArmyRow(this.scene, SLOT, hero.army.length);
    row.set(armyOf(hero.army));
    row.setPosition(x, at);
    this.root.add(row.root);
    this.owned.push(row);
  }

  /** The price and Hire, or why there's no hiring. */
  private foot(offer: TavernOffer, x: number, y: number, w: number): void {
    this.plate(x, y, w, TAVERN.foot);
    const room = w - (offer.hire ? HIRE.w + 16 : 12);
    const mid = y + Math.floor(TAVERN.foot / 2);
    if (offer.hero) {
      const note = this.label(offer.note, x + 6, mid, { wrap: room, align: 'left', anchor: { x: 0, y: 0 }, ink: offer.hire?.enabled ? INK.text : INK.dim });
      // One line or two, the words sit in the middle of the plate.
      note.setPosition(x + 6, mid - Math.ceil(note.height / 2));
    }
    if (!offer.hire) return;
    const btn = new PixelButton(this.scene, { w: HIRE.w, h: HIRE.h, label: 'Hire', note: offer.price, rim: 'gold', primary: true, onClick: () => this.act.hire() });
    btn.setEnabled(offer.hire.enabled);
    btn.setPosition(x + w - HIRE.w - 4, y + Math.floor((TAVERN.foot - HIRE.h) / 2));
    this.root.add(btn.root);
    this.owned.push(btn);
  }

  override destroy(): void {
    super.destroy();
    for (const k of this.faceKeys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
