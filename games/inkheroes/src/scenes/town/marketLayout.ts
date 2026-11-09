import { MARKET_GOODS } from '../../logic/market';

/** The Marketplace room's layout (src/scenes/town/marketRoom.ts draws it). Pure: no Phaser. */

/** The room a window may take of `area` (as townRoom.ts's). */
const roomIn = (area: { w: number; h: number }): { w: number; h: number } => ({ w: area.w - 8, h: area.h - 8 });

export const GAP = 3;
export const PAD = 6;
export const LINE = 14;
export const STEP = { w: 34, h: 24 } as const;
const MAX_W = 470;
export const TRADE_H = 30;

export interface MarketLayout {
  readonly w: number;
  readonly h: number;
  readonly tile: { readonly w: number; readonly h: number };
  /** The resource icons' scale (16 px icons, doubled where there is room). */
  readonly scale: 1 | 2;
  readonly giveY: number;
  readonly getY: number;
  readonly rateY: number;
  readonly stepY: number;
  readonly tradeY: number;
}

/** The market's window in `area`: a row of the seven goods to give, a row to get, the rate, the amount and Trade. */
export function marketLayout(area: { w: number; h: number }): MarketLayout {
  const room = roomIn(area);
  const w = Math.min(MAX_W, room.w);
  const tw = Math.floor((w - PAD * 2 - GAP * (MARKET_GOODS.length - 1)) / MARKET_GOODS.length);
  const scale = tw >= 52 ? 2 : 1;
  const tile = { w: tw, h: (scale === 2 ? 32 : 16) + 6 + LINE + 4 };
  const giveY = 30 + LINE;
  const getY = giveY + tile.h + 6 + LINE;
  const rateY = getY + tile.h + 6;
  const stepY = rateY + LINE + 6;
  const tradeY = stepY + STEP.h + 8;
  return { w, h: tradeY + TRADE_H + 8, tile, scale, giveY, getY, rateY, stepY, tradeY };
}

