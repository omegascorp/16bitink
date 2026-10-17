import { getProfile } from '../../host';
import { ORES } from '../../logic/ore';
import { AIR, FEED, fuelIn, hasRoomFor, type Gauge as GaugeName } from '../../logic/suit';
import type { GameScene } from '../GameScene';
import { Gauge } from '../kit/gauge';
import { plaque } from '../kit/plaque';
import { aside, INK_TEXT, label, SEPIA } from '../kit/type';
import { PAD, section, SECTION_BODY, type ShipPage } from './panel';
import { FUEL_BTN } from './fuelPanel';

const BAR_H = 18;
const ROW_H = 60;
/** Below this share a bar turns madder, as the HUD's do. */
const LOW = AIR.low;
const NAMES: Readonly<Record<GaugeName, string>> = { air: 'Life support', cell: 'Cell' };

/**
 * The suit's life support on the Suit tab of the inventory, far from the
 * lander: the air and the cell as they stand, each with a Feed button that
 * burns one piece of its ore from the bag into it (the world waits while
 * the inventory is open). At the lander the suit is topped up anyway, so
 * the panel is only here. Returns the height, 0 when there's no world to
 * read the suit from.
 */
export function lifePanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene } = page;
  const game = scene.scene.get('Game') as GameScene | null;
  if (!game?.suitState) return 0;
  const { suit, fuels } = game.suitState();
  const inner = w - PAD * 2;
  const barW = inner - FUEL_BTN.w - 18;
  let ry = y + SECTION_BODY;
  for (const g of ['air', 'cell'] as const) {
    const level = g === 'air' ? suit.air : suit.energy;
    const max = g === 'air' ? suit.maxAir : suit.maxEnergy;
    const ore = ORES[fuelIn(suit.bag, fuels, g) ?? fuels[g][0]!];
    label(scene, x + PAD, ry, NAMES[g], 17, INK_TEXT, '600');
    aside(scene, x + PAD + barW, ry + 2, `${Math.round(level)} / ${max}`, 15, barW / 2, SEPIA).setOrigin(1, 0);
    new Gauge(scene, x + PAD, ry + 28, barW, BAR_H, g).set(level / max, LOW);
    const have = fuelIn(suit.bag, fuels, g) !== null;
    const room = hasRoomFor(suit, g);
    const text = !room ? 'Full' : have ? `Feed · 1 ${ore.name}` : `No ${ore.name}`;
    plaque(scene, x + w - PAD - FUEL_BTN.w / 2, ry + 24, text, () => {
      const r = game.feedNow(g);
      page.commit(getProfile(scene), { news: r.ok ? `${g === 'air' ? 'Air' : 'Cell'} + ${ore.name}` : r.why === 'full' ? `${NAMES[g]} is full` : `No ${ore.name} in the bag` });
    }, { width: FUEL_BTN.w, height: FUEL_BTN.h, size: 15, kind: have && room ? 'secondary' : 'off' });
    ry += ROW_H;
  }
  const names = (g: keyof typeof fuels): string => fuels[g].map((o) => ORES[o].name).join(' or ');
  const note = `One ${names('air')} gives the air ${FEED.air}, one ${names('cell')} gives the cell ${FEED.cell}, from the bag. At the lander the suit tops itself up.`;
  const t = aside(scene, x + PAD, ry, note, 15, inner, SEPIA);
  ry += t.height + 10;
  const h = ry - y;
  section(scene, x, y, w, h, 'Life support', 61);
  return h;
}
