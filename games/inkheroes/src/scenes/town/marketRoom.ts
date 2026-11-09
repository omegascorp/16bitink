import type Phaser from 'phaser';
import type { Adventure } from '../../logic/adventure';
import { MARKET_GOODS, marketOffer, marketsOf, maxLots } from '../../logic/market';
import type { Resource } from '../../logic/resources';
import { buildingIn, type Town } from '../../logic/town';
import { INK, PixelButton, UI_TEX } from '../battle/pixelUi';
import { TownRoom } from './townRoom';
import { GAP, LINE, marketLayout, PAD, STEP, TRADE_H, type MarketLayout } from './marketLayout';

/** What the market screen has picked: what to give, what to get, and how many lots. */
export interface MarketPick {
  readonly give: Resource;
  readonly get: Resource;
  readonly lots: number;
}

export interface MarketActions {
  close(): void;
  pick(p: MarketPick): void;
  trade(p: MarketPick): void;
}

/** `n` of resource `r` in words: "1 gem", "5 gems". */
const amountOf = (n: number, r: Resource): string => `${n} ${r === 'gems' && n === 1 ? 'gem' : r}`;

/** The first pick: give what the purse has most of (for its worth), get what it has least of. */
export function firstPick(adv: Adventure): MarketPick {
  const p = adv.purse;
  const give = [...MARKET_GOODS].sort((a, b) => p[b] / (b === 'gold' ? 2500 : 1) - p[a] / (a === 'gold' ? 2500 : 1))[0]!;
  const get = MARKET_GOODS.filter((r) => r !== give && r !== 'gold').sort((a, b) => p[a] - p[b])[0]!;
  return { give, get, lots: 1 };
}

/**
 * The Marketplace as a room (H3's): pick what to give in the top row and
 * what to get in the bottom one; the rate shows between, set how many lots
 * with the steps, and Trade. Each tile of the lower row shows its rate.
 */
export class MarketRoom extends TownRoom {
  constructor(scene: Phaser.Scene, private readonly adv: Adventure, town: Town, private readonly pick: MarketPick, area: { w: number; h: number }, private readonly act: MarketActions, depth: number) {
    const l = marketLayout(area);
    super(scene, area, l, { title: buildingIn(town, 'marketplace').name }, () => act.close(), depth);
    const markets = marketsOf(adv, 'player');
    const mid = Math.floor(l.w / 2);
    this.label('You give', PAD + 2, l.giveY - LINE, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    MARKET_GOODS.forEach((r, i) => this.tile(l, i, l.giveY, r, r === pick.give, `${adv.purse[r]}`, () => act.pick({ ...pick, give: r, get: r === pick.get ? pick.give : pick.get, lots: 1 })));
    this.label('You get', PAD + 2, l.getY - LINE, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    MARKET_GOODS.forEach((r, i) => {
      const o = marketOffer(markets, pick.give, r);
      this.tile(l, i, l.getY, r, r === pick.get, o ? `${o.give}:${o.get}` : '–', () => r !== pick.give && act.pick({ ...pick, get: r, lots: 1 }));
    });
    const o = marketOffer(markets, pick.give, pick.get);
    const most = maxLots(adv.purse, markets, pick.give, pick.get);
    const lots = Math.max(0, Math.min(pick.lots, most));
    const rate = o ? `${amountOf(o.give, pick.give)} for ${amountOf(o.get, pick.get)} · ${markets} ${markets === 1 ? 'Marketplace' : 'Marketplaces'}` : 'Pick two different goods';
    this.label(rate, mid, l.rateY, { anchor: { x: 0.5, y: 0 }, ink: INK.title });
    this.steps(l, lots, most);
    const deal = o && lots ? `Give ${amountOf(o.give * lots, pick.give)}, get ${amountOf(o.get * lots, pick.get)}` : most ? '' : `Not enough ${pick.give}`;
    const go = new PixelButton(scene, { w: Math.min(l.w - PAD * 2, 240), h: TRADE_H, label: 'Trade', ...(deal ? { note: deal } : {}), rim: 'gold', primary: true, onClick: () => act.trade({ ...pick, lots }) });
    go.setPosition(mid - Math.floor(Math.min(l.w - PAD * 2, 240) / 2), l.tradeY);
    go.setEnabled(!!o && lots > 0);
    this.root.add(go.root);
    this.owned.push(go);
  }

  private tile(l: MarketLayout, i: number, y: number, r: Resource, picked: boolean, text: string, onPick: () => void): void {
    const x = PAD + i * (l.tile.w + GAP);
    const plate = this.plate(x, y, l.tile.w, l.tile.h, picked ? 'gold' : 'bronze');
    const size = l.scale * 16;
    const icon = this.scene.add.image(x + Math.floor(l.tile.w / 2), y + 3 + size / 2, UI_TEX.res(r)).setScale(l.scale);
    this.root.add(icon);
    this.label(text, x + Math.floor(l.tile.w / 2), y + 4 + size + 2, { anchor: { x: 0.5, y: 0 }, ink: picked ? INK.title : INK.text });
    plate.img.setInteractive();
    plate.img.on('pointerup', onPick);
  }

  /** The amount in lots: fewer and more by one and by ten, and the most the purse allows. */
  private steps(l: MarketLayout, lots: number, most: number): void {
    const set = (n: number): void => this.act.pick({ ...this.pick, lots: Math.max(1, Math.min(most, n)) });
    const mid = Math.floor(l.w / 2);
    const buttons: [string, () => void, boolean][] = [
      ['−10', () => set(lots - 10), lots > 1],
      ['−', () => set(lots - 1), lots > 1],
      ['+', () => set(lots + 1), lots < most],
      ['+10', () => set(lots + 10), lots < most],
      ['Max', () => set(most), lots < most],
    ];
    const count = 52;
    const total = buttons.length * STEP.w + (buttons.length - 1) * GAP + count + GAP * 2;
    let x = mid - Math.floor(total / 2);
    buttons.forEach(([label, onClick, on], i) => {
      if (i === 2) {
        this.plate(x, l.stepY, count, STEP.h);
        this.label(`${lots} ${lots === 1 ? 'lot' : 'lots'}`, x + count / 2, l.stepY + 6, { anchor: { x: 0.5, y: 0 } });
        x += count + GAP;
      }
      const b = new PixelButton(this.scene, { w: STEP.w, h: STEP.h, label, onClick });
      b.setPosition(x, l.stepY);
      b.setEnabled(on);
      this.root.add(b.root);
      this.owned.push(b);
      x += STEP.w + GAP;
    });
  }
}
