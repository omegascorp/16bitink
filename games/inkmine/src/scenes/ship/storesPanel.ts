import { ORES } from '../../logic/ore';
import { canRefillStore, refillStore, storeCapacity, storeOre, storeRefillCost, STORES, type StoreKind } from '../../logic/stores';
import { AIR } from '../../logic/suit';
import { Gauge } from '../kit/gauge';
import { plaque } from '../kit/plaque';
import { aside, INK_TEXT, label, SEPIA } from '../kit/type';
import { FUEL_BTN } from './fuelPanel';
import { PAD, section, SECTION_BODY, type ShipPage } from './panel';

const BAR_H = 18;
const ROW_H = 60;
const NAMES: Readonly<Record<StoreKind, string>> = { air: 'Air tank', power: 'Battery' };
const GAUGE: Readonly<Record<StoreKind, 'air' | 'cell'>> = { air: 'air', power: 'cell' };
const NEWS: Readonly<Record<StoreKind, string>> = { air: 'Air tank filled', power: 'Battery charged' };

/**
 * The lander's stores on the Lander tab, under its fuel (stores.ts): the air
 * tank and the battery that top the suit up at the lander, each with a
 * Refill button that turns the world's water or cell fuel on hand into air
 * or charge (ice and graphite on Graphite, water and lignite on Mycel).
 * Far from the lander they're look-only. Returns the height.
 */
export function storesPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  const cap = storeCapacity(p.ship);
  const inner = w - PAD * 2;
  const barW = inner - FUEL_BTN.w - 18;
  let ry = y + SECTION_BODY;
  for (const k of ['air', 'power'] as const) {
    const level = p.stores[k];
    label(scene, x + PAD, ry, NAMES[k], 17, INK_TEXT, '600');
    aside(scene, x + PAD + barW, ry + 2, `${Math.floor(level)} / ${cap}`, 15, barW / 2, SEPIA).setOrigin(1, 0);
    new Gauge(scene, x + PAD, ry + 28, barW, BAR_H, GAUGE[k]).set(level / cap, AIR.low);
    const why = canRefillStore(p, k);
    // The ore's name short enough for a button: "ice" for water ice.
    const short = ORES[storeOre(p, k)].name.split(' ').at(-1);
    const text = page.remote ? 'At the lander' : why === 'ok' ? `Refill · ${storeRefillCost(p, k)} ${short}` : why === 'full' ? 'Full' : `No ${short}`;
    plaque(scene, x + w - PAD - FUEL_BTN.w / 2, ry + 24, text, () => {
      const r = refillStore(p, k);
      if (r.ok) page.commit(r.profile, { news: NEWS[k] });
    }, { width: FUEL_BTN.w, height: FUEL_BTN.h, size: 15, kind: !page.remote && why === 'ok' ? 'secondary' : 'off' });
    ry += ROW_H;
  }
  const note = `They top your suit up at the lander. One ${ORES[storeOre(p, 'air')].name} gives the tank ${STORES.air.per}, one ${ORES[storeOre(p, 'power')].name} the battery ${STORES.power.per}; its panels also charge it slowly. Supply tanks make both bigger.`;
  const t = aside(scene, x + PAD, ry, note, 15, inner, SEPIA);
  ry += t.height + 10;
  const h = ry - y;
  section(scene, x, y, w, h, 'Supplies', 53);
  return h;
}
