import { canLiftOff, canRefill, FUEL, refill, refillCost } from '../../logic/fuel';
import { ORES } from '../../logic/ore';
import { Gauge } from '../kit/gauge';
import { plaque } from '../kit/plaque';
import { aside, INK_TEXT, label, SEPIA } from '../kit/type';
import { PAD, section, SECTION_BODY, type ShipPage } from './panel';
import { liftOffCard } from './storyCards';

const BAR_H = 18;
const BTN = { w: 200, h: 44 } as const;
/** Below this share the bar turns madder, as the suit's gauges do. */
const LOW = FUEL.toOrbit / FUEL.max;

/** Why the lander can't climb yet, under the buttons. */
const LIFT_NOTE = {
  core: 'Lift-off needs the drive core fitted.',
  fuel: `The climb to the ship in orbit burns ${FUEL.toOrbit} units.`,
} as const;

/**
 * The lander's fuel on the Ship tab (spec, "The lander"): the tank's bar,
 * a Refill button that splits the ice on hand into fuel, and Lift off once
 * the drive core is in and there's enough for the climb to the ship. After
 * the flight, the same place opens the star map. Far from the lander it's
 * look-only. Returns the height.
 */
export function fuelPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  const inner = w - PAD * 2;
  let ry = y + SECTION_BODY;
  const bar = new Gauge(scene, x + PAD, ry, inner, BAR_H, 'fuel');
  bar.set(p.fuel / FUEL.max, LOW);
  ry += BAR_H + 8;
  label(scene, x + PAD, ry, `${p.fuel} / ${FUEL.max} units`, 17, INK_TEXT, '600');
  aside(scene, x + w - PAD, ry + 2, `one lump of ${ORES[FUEL.ore].name} a unit`, 15, inner / 2, SEPIA).setOrigin(1, 0);
  ry += 32;
  const lift = canLiftOff(p);
  const fill = canRefill(p);
  const cy = ry + BTN.h / 2;
  if (page.remote) {
    plaque(scene, x + PAD + BTN.w / 2, cy, 'At the lander', () => {}, { width: BTN.w, height: BTN.h, size: 16, kind: 'off' });
  } else {
    const fillText = fill === 'ok' ? `Refill · ${refillCost(p)} ice` : fill === 'full' ? 'Full' : 'No ice on hand';
    const doFill = (): void => {
      const r = refill(p);
      if (r.ok) page.commit(r.profile, { news: 'Tank filled' });
    };
    plaque(scene, x + PAD + BTN.w / 2, cy, fillText, doFill, { width: BTN.w, height: BTN.h, size: 16, kind: fill === 'ok' ? 'secondary' : 'off' });
    if (lift === 'flown') plaque(scene, x + w - PAD - BTN.w / 2, cy, 'Star map', () => scene.scene.start('System', { arrived: false }), { width: BTN.w, height: BTN.h, size: 16, kind: 'primary' });
    else plaque(scene, x + w - PAD - BTN.w / 2, cy, 'Lift off', () => {
      if (lift === 'ok') liftOffCard(page);
    }, { width: BTN.w, height: BTN.h, size: 16, kind: lift === 'ok' ? 'primary' : 'off' });
  }
  ry += BTN.h + 10;
  if (!page.remote && (lift === 'core' || lift === 'fuel')) {
    const t = aside(scene, x + PAD, ry, LIFT_NOTE[lift], 15, inner, SEPIA);
    ry += t.height + 6;
  }
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Fuel', 47);
  return h;
}
