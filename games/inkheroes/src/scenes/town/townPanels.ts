import type Phaser from 'phaser';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../../art/creatures/types';
import { INK } from '../../art/palette';
import { TEX } from '../../art/textures';
import { heroInTown, type Adventure } from '../../logic/adventure';
import { BUILDINGS, type BuildingId } from '../../logic/buildings';
import { creature, type CreatureId } from '../../logic/creatures';
import { describeAmount } from '../../logic/resources';
import { SPELLS } from '../../logic/spells';
import { BUILD_ORDER, cantBuild, dwellings, growthOf, guildSpells, has, hireable, SPELLBOOK_COST } from '../../logic/town';
import { HAND, paintedButton, paperCard } from '../uiPaint';

export type PanelKind = 'build' | 'recruit' | 'guild';

export interface TownActions {
  build(id: BuildingId): void;
  hire(id: CreatureId, n: number): void;
  buyBook(): void;
}

/** A panel's content, laid out from its top-left, and its size. */
export interface PanelBody {
  readonly title: string;
  readonly w: number;
  readonly h: number;
  readonly items: Phaser.GameObjects.GameObject[];
}

const SERIF = 'Georgia, serif';
const TILE = { w: 176, h: 92 } as const;
const PAD = 24;
const HEAD = 64;

const serif = (scene: Phaser.Scene, x: number, y: number, text: string, size: number, wrap?: number): Phaser.GameObjects.Text =>
  scene.add.text(x, y, text, { fontFamily: SERIF, fontSize: `${size}px`, color: INK, lineSpacing: 3, ...(wrap ? { wordWrap: { width: wrap } } : {}) });

/** The hall's ledger: every building on this map, built (sage), buildable (sky) or not yet (cream). */
export function buildPanel(scene: Phaser.Scene, adv: Adventure, off: readonly BuildingId[], act: TownActions): PanelBody {
  const shown = BUILD_ORDER.filter((id) => !off.includes(id));
  const cols = 4;
  const rows = Math.ceil(shown.length / cols);
  const w = PAD * 2 + cols * TILE.w + (cols - 1) * 10;
  const items: Phaser.GameObjects.GameObject[] = [];
  shown.forEach((id, i) => {
    const x = PAD + (i % cols) * (TILE.w + 10) + TILE.w / 2;
    const y = HEAD + Math.floor(i / cols) * (TILE.h + 10) + TILE.h / 2;
    const built = has(adv.town, id);
    const why = cantBuild(adv.town, id, adv.purse, off);
    const c = scene.add.container(x, y);
    c.add(paperCard(scene, 0, 0, TILE.w, TILE.h, 600 + i, { radius: 5, rough: 1, shadow: 0.5, tint: built ? 'sage' : why ? 'cream' : 'sky' }));
    c.add(scene.add.text(0, -TILE.h / 2 + 6, BUILDINGS[id].name, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '22px', color: INK }).setOrigin(0.5, 0));
    const line = built ? `✓ ${BUILDINGS[id].says}` : why && why !== 'Not enough resources' ? why : describeAmount(BUILDINGS[id].cost);
    c.add(serif(scene, 0, -2, line, 12, TILE.w - 14).setAlign('center').setOrigin(0.5, 0).setAlpha(built || !why ? 1 : 0.6));
    if (!built) {
      const zone = scene.add.zone(0, 0, TILE.w, TILE.h).setInteractive({ useHandCursor: !why });
      zone.on('pointerup', () => act.build(id));
      c.add(zone);
    }
    items.push(c);
  });
  const h = HEAD + rows * (TILE.h + 10) + 34;
  const note = adv.town.builtToday ? 'Built today: the masons start again tomorrow.' : 'One building a day. Tap a blue one to build it.';
  items.push(serif(scene, w / 2, h - 30, note, 14).setOrigin(0.5, 0));
  return { title: 'Build', w, h, items };
}

/** The dwellings' muster: who can be hired, at what cost, and how many come each week. */
export function recruitPanel(scene: Phaser.Scene, adv: Adventure, act: TownActions): PanelBody {
  const homes = dwellings(adv.town);
  const cols = homes.length > 4 ? 2 : 1;
  const rowW = 540;
  const rowH = 96;
  const w = PAD * 2 + cols * rowW + (cols - 1) * 14;
  const rows = Math.max(1, Math.ceil(homes.length / cols));
  const items: Phaser.GameObjects.GameObject[] = [];
  const toHero = heroInTown(adv);
  items.push(serif(scene, w / 2, 58, toHero ? `Hired troops join ${adv.hero.name}.` : `${adv.hero.name} is away: hired troops wait in the garrison.`, 14).setOrigin(0.5, 0));
  if (homes.length === 0) items.push(serif(scene, w / 2, HEAD + 30, 'Build a dwelling to hire troops.', 16).setOrigin(0.5, 0));
  homes.forEach((id, i) => {
    const x = PAD + (i % cols) * (rowW + 14) + rowW / 2;
    const y = HEAD + 26 + Math.floor(i / cols) * (rowH + 8) + rowH / 2;
    items.push(recruitRow(scene, x, y, rowW, rowH, id, adv, act, i));
  });
  return { title: 'Recruit', w, h: HEAD + 26 + rows * (rowH + 8) + 16, items };
}

function recruitRow(scene: Phaser.Scene, x: number, y: number, w: number, h: number, id: CreatureId, adv: Adventure, act: TownActions, i: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const cr = creature(id);
  const can = hireable(adv.town, id, adv.purse);
  c.add(paperCard(scene, 0, 0, w, h, 700 + i, { radius: 5, rough: 1, shadow: 0.5 }));
  c.add(scene.add.image(-w / 2 + 50, h / 2 - 8, TEX.creature(id, 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.62 / CREATURE_RES));
  c.add(scene.add.text(-w / 2 + 100, -h / 2 + 4, cr.plural, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '26px', color: INK }));
  const traits = `${cr.shots ? ' · shoots' : ''}${cr.flies ? ' · flies' : ''}`;
  c.add(serif(scene, -w / 2 + 108, -4, `${adv.town.stock[id] ?? 0} to hire · ${describeAmount(cr.cost)} each · +${growthOf(adv.town, id)} a week\nAtt ${cr.attack} Def ${cr.defense} Dmg ${cr.minDmg}–${cr.maxDmg} HP ${cr.hp} Spd ${cr.speed}${traits}`, 12));
  if (can > 0) {
    c.add(paintedButton(scene, w / 2 - 66, -18, 'Hire 1', () => act.hire(id, 1), { width: 104, height: 34, size: 20 }));
    c.add(paintedButton(scene, w / 2 - 66, 22, `Hire ${can}`, () => act.hire(id, can), { width: 104, height: 34, size: 20, kind: 'leaf' }));
  }
  return c;
}

/** The mage guild: the spells it teaches, and a spellbook for a hero without one. */
export function guildPanel(scene: Phaser.Scene, adv: Adventure, act: TownActions): PanelBody {
  const spells = guildSpells(adv.town);
  const w = 520;
  const items: Phaser.GameObjects.GameObject[] = [];
  spells.forEach((s, i) => {
    const y = HEAD + i * 58;
    items.push(scene.add.text(PAD, y, `${SPELLS[s].name}`, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '26px', color: INK }));
    items.push(serif(scene, PAD + 8, y + 32, `Level ${SPELLS[s].level} · ${SPELLS[s].mana} mana · ${SPELLS[s].says}`, 13, w - PAD * 2));
  });
  let h = HEAD + spells.length * 58 + 12;
  const hero = adv.hero;
  const line = !heroInTown(adv)
    ? `${hero.name} learns these on entering the town with a spellbook.`
    : hero.hasBook
      ? `${hero.name} has learned them all.`
      : `${hero.name} needs a spellbook to learn them.`;
  items.push(serif(scene, w / 2, h, line, 14, w - PAD * 2).setAlign('center').setOrigin(0.5, 0));
  h += 34;
  if (heroInTown(adv) && !hero.hasBook) {
    items.push(paintedButton(scene, w / 2, h + 22, `Buy a spellbook: ${SPELLBOOK_COST} gold`, () => act.buyBook(), { width: 300, height: 42, size: 22, kind: 'leaf' }));
    h += 56;
  }
  return { title: has(adv.town, 'mageGuild2') ? 'Mage Guild, two floors' : 'Mage Guild', w, h: h + 16, items };
}
