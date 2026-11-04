import type Phaser from 'phaser';
import { TOWN_ART } from '../../art/pixel/town';
import { heroInGarrison, heroTown, heroVisiting, type Adventure } from '../../logic/adventure';
import type { Town } from '../../logic/town';
import { BUILDINGS, type BuildingId } from '../../logic/buildings';
import { creature, type CreatureId } from '../../logic/creatures';
import { SPELLS } from '../../logic/spells';
import { bestUnit, BUILD_ORDER, cantBuild, dwellings, growthOf, guildSpells, has, SPELLBOOK_COST, stockOf } from '../../logic/town';
import { PX_TEX, unitArt } from '../battle/pixelAssets';
import { drawFrame, drawPicture, FILLS, inkBox, pictureOffset } from '../battle/pixelFrames';
import type { Rgba } from '../battle/pixelRaster';
import { composeScenery, HORIZON_Y, type Pixels } from '../battle/pixelScenery';
import { INK, PixelFrame, PixelImage, TextLabel, texturePixels, UI_TEX } from '../battle/pixelUi';
import { TOWN_TEX, townScenery } from './pixelTownView';
import { fitFactor, shrinkPixels, standOn } from './townPictures';
import { buildingArt, ledgerOf } from './townStage';
import type { Drawn, GridSpec } from './townWindow';

const TERRAIN = 'grass';
/** A ledger card: the building's picture, its name, its state on a coloured bar. */
const HALL_CARD = { w: 160, h: 122, pic: { w: 152, h: 76 } } as const;
/** A muster card: the creature on its picture, then its name, numbers, cost and how many wait. */
const FORT_CARD = { w: 260, h: 112, pic: { w: 100, h: 104 } } as const;
const GUILD_CARD = { w: 260, h: 62 } as const;
const LINE = 15;
const CARD_FILL: Rgba = [44, 31, 21, 255];

/** A ledger card's state, the colour of its bar and the word on it. */
type Ledger = 'built' | 'ready' | 'later' | 'locked' | 'short';
const STATE: Record<Ledger, { fill: Rgba; word: string }> = {
  built: { fill: [56, 96, 44, 255], word: 'Built' },
  ready: { fill: [150, 108, 30, 255], word: 'Build' },
  later: { fill: [84, 70, 52, 255], word: 'Tomorrow' },
  locked: { fill: [104, 38, 28, 255], word: 'Needs more' },
  short: { fill: [104, 38, 28, 255], word: 'Short' },
};

function stateOf(adv: Adventure, town: Town, id: BuildingId, off: readonly BuildingId[]): Ledger {
  const why = cantBuild(town, id, adv.purse, off);
  if (!why) return 'ready';
  if (why === 'Built') return 'built';
  if (why === 'Already built today') return 'later';
  if (why === 'Not enough resources') return 'short';
  return 'locked';
}

export interface ScreenActions {
  pickBuilding(id: BuildingId): void;
  pickDwelling(id: CreatureId): void;
  buyBook(): void;
}

/** A card's frame and a zone over it for taps. */
function card(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onTap?: () => void): Drawn {
  const frame = new PixelFrame(scene, w, h, { rim: 'bronze', fill: CARD_FILL }).setPosition(x, y);
  if (onTap) {
    frame.img.setInteractive({ useHandCursor: true });
    frame.img.on('pointerup', onTap);
  }
  return { parts: [frame.img], owned: [frame] };
}

/** A strip of the grass country, w × h, its horizon `horizon` rows down. */
function countryside(scene: Phaser.Scene, w: number, h: number, horizon: number, seed: number): Pixels {
  const atlas = texturePixels(scene, PX_TEX.scenery(TERRAIN));
  return composeScenery(atlas, townScenery(), { x: 40 + seed * 37, y: HORIZON_Y - horizon, w, h }, seed);
}

/** A picture in a dim frame: `px` inside, at (x, y). */
function framed(scene: Phaser.Scene, px: Pixels, x: number, y: number): Drawn {
  const pic = new PixelImage(scene, px).setPosition(x + 1, y + 1);
  const rim = new PixelImage(scene, drawFrame(px.w + 2, px.h + 2, { rim: 'dim', fill: null })).setPosition(x, y);
  return { parts: [pic.img, rim.img], owned: [pic, rim] };
}

function merge(...d: Drawn[]): Drawn {
  return { parts: d.flatMap((x) => x.parts), owned: d.flatMap((x) => x.owned) };
}

function label(scene: Phaser.Scene, text: string, x: number, y: number, opts: ConstructorParameters<typeof TextLabel>[1] = {}): Drawn {
  const t = new TextLabel(scene, { align: 'left', anchor: { x: 0, y: 0 }, ...opts }).setText(text).setPosition(x, y);
  return { parts: [t.img], owned: [t] };
}

/** The hall: a card for each building on this map (its next step for an upgrade), coloured by whether it can be built today. */
export function hallScreen(scene: Phaser.Scene, adv: Adventure, town: Town, off: readonly BuildingId[], act: ScreenActions): GridSpec {
  const ids = ledgerOf(town.built, BUILD_ORDER, off);
  const { pic } = HALL_CARD;
  return {
    title: `${town.name}: the hall`,
    cell: HALL_CARD,
    count: ids.length,
    maxCols: 5,
    note: town.builtToday ? 'Built today: the masons start again tomorrow.' : 'One building a day. Tap a card to see what it costs.',
    draw: (i, x, y) => {
      const id = ids[i]!;
      const art = buildingArt(id);
      const s = TOWN_ART[art];
      const by = fitFactor(s.w, s.h, pic.w - 8, pic.h - 6);
      const sprite = shrinkPixels(texturePixels(scene, TOWN_TEX.piece(art)), by);
      const picture = standOn(countryside(scene, pic.w, pic.h, pic.h - 26, i + 3), sprite, pic.w, pic.h, 4);
      const st = STATE[stateOf(adv, town, id, off)];
      const bar = new PixelFrame(scene, pic.w, 18, { rim: 'dim', fill: st.fill }).setPosition(x + 4, y + HALL_CARD.h - 22);
      return merge(
        card(scene, x, y, HALL_CARD.w, HALL_CARD.h, () => act.pickBuilding(id)),
        framed(scene, picture, x + 3, y + 3),
        label(scene, BUILDINGS[id].name, x + Math.floor(HALL_CARD.w / 2), y + pic.h + 7, { kind: 'title', anchor: { x: 0.5, y: 0 }, align: 'center' }),
        { parts: [bar.img], owned: [bar] },
        label(scene, st.word, x + Math.floor(HALL_CARD.w / 2), y + HALL_CARD.h - 21, { anchor: { x: 0.5, y: 0 }, align: 'center' }),
      );
    },
  };
}

/** The creature standing on its picture, 1:1 like the battle's unit card (a wide one cropped at the sides). */
function creaturePicture(scene: Phaser.Scene, id: CreatureId, seed: number): Pixels {
  const art = unitArt(id);
  const sheet = texturePixels(scene, PX_TEX.unit(id, 'idle'));
  const { pic } = FORT_CARD;
  const back = countryside(scene, pic.w, pic.h, pic.h - 30, seed + 11);
  const box = inkBox(sheet, 0, art.w, art.h) ?? { l: 0, t: 0, r: art.w, b: art.h };
  return drawPicture(back, sheet, 0, art.w, art.h, pictureOffset(box, art.footY, pic.w, pic.h, 10), pic.w, pic.h);
}

/** A stat: its icon and number. */
function stat(scene: Phaser.Scene, icon: Parameters<typeof UI_TEX.stat>[0], text: string, x: number, y: number): Drawn {
  const img = scene.add.image(x, y - 1, UI_TEX.stat(icon)).setOrigin(0);
  return merge({ parts: [img], owned: [] }, label(scene, text, x + 19, y));
}

/** The fort: a card for each dwelling built, its creature, numbers and how many wait to be hired. */
export function fortScreen(scene: Phaser.Scene, adv: Adventure, town: Town, act: ScreenActions): GridSpec {
  const homes = dwellings(town);
  const toHero = heroVisiting(adv, town);
  const waits = heroInGarrison(adv, town) ? `${adv.hero.name} holds the garrison: hired troops join it.` : `${adv.hero.name} is away: hired troops wait in the garrison.`;
  return {
    title: `${town.name}: the fort`,
    cell: FORT_CARD,
    count: homes.length,
    maxCols: 3,
    empty: 'No dwellings yet: build a Guardhouse (it needs a Fort) to hire troops.',
    note: toHero ? `Hired troops join ${adv.hero.name}. Tap a card to hire.` : waits,
    draw: (i, x, y) => {
      // The line's best level built: what its card shows and hires.
      const id = bestUnit(town, homes[i]!) ?? homes[i]!;
      const cr = creature(id);
      const tx = x + FORT_CARD.pic.w + 10;
      const cols = [tx, tx + 74];
      const rows = [y + 24, y + 24 + LINE, y + 24 + LINE * 2];
      const stats = [
        stat(scene, 'attack', String(cr.attack), cols[0]!, rows[0]!),
        stat(scene, 'defense', String(cr.defense), cols[0]!, rows[1]!),
        stat(scene, 'damage', `${cr.minDmg}–${cr.maxDmg}`, cols[0]!, rows[2]!),
        stat(scene, 'health', String(cr.hp), cols[1]!, rows[0]!),
        stat(scene, 'speed', String(cr.speed), cols[1]!, rows[1]!),
        ...(cr.shots ? [stat(scene, 'shots', String(cr.shots), cols[1]!, rows[2]!)] : []),
      ];
      const gold = scene.add.image(tx, y + 24 + LINE * 3 + 4, UI_TEX.res('gold')).setOrigin(0);
      const extra = Object.entries(cr.cost).filter(([r]) => r !== 'gold').map(([r, n]) => ` + ${n} ${r}`).join('');
      return merge(
        card(scene, x, y, FORT_CARD.w, FORT_CARD.h, () => act.pickDwelling(id)),
        framed(scene, creaturePicture(scene, id, i), x + 3, y + 3),
        label(scene, cr.plural, tx, y + 5, { kind: 'title' }),
        ...stats,
        { parts: [gold], owned: [] },
        label(scene, `${cr.cost.gold ?? 0}${extra} each`, tx + 19, y + 24 + LINE * 3 + 5),
        label(scene, `${stockOf(town, id)} to hire · +${growthOf(town, id)} a week`, tx, y + 24 + LINE * 4 + 6, { ink: INK.good }),
      );
    },
  };
}

/** The mage guild: the spells it teaches, and a spellbook for a hero without one. */
export function guildScreen(scene: Phaser.Scene, adv: Adventure, town: Town, act: ScreenActions): GridSpec {
  const spells = guildSpells(town);
  const hero = adv.hero;
  const here = heroTown(adv)?.id === town.id;
  const note = !here ? `${hero.name} learns these on entering the town with a spellbook.` : hero.hasBook ? `${hero.name} has learned them all.` : `${hero.name} needs a spellbook to learn them.`;
  return {
    title: has(town, 'mageGuild2') ? 'Mage Guild, two floors' : 'Mage Guild',
    cell: GUILD_CARD,
    count: spells.length,
    maxCols: 2,
    empty: 'Build the Mage Guild to learn spells here.',
    note,
    button: here && !hero.hasBook ? { label: `Buy a spellbook: ${SPELLBOOK_COST} gold`, onClick: () => act.buyBook() } : undefined,
    draw: (i, x, y) => {
      const s = SPELLS[spells[i]!];
      const niche = new PixelImage(scene, drawFrame(30, 30, { rim: 'gold', fill: FILLS.portrait })).setPosition(x + 6, y + 6);
      const icon = scene.add.image(x + 9, y + 9, UI_TEX.spell(s.id)).setOrigin(0);
      return merge(
        card(scene, x, y, GUILD_CARD.w, GUILD_CARD.h),
        { parts: [niche.img, icon], owned: [niche] },
        label(scene, s.name, x + 42, y + 4, { kind: 'title' }),
        label(scene, `Level ${s.level} · ${s.mana} mana`, x + 42 + Math.max(70, s.name.length * 7), y + 5, { ink: INK.dim }),
        label(scene, s.says, x + 42, y + 22, { wrap: GUILD_CARD.w - 48 }),
      );
    },
  };
}
