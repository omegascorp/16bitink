import { canLiftOff, canRefill, FUEL, refill, refillCost, ROUND_TRIP } from '../../logic/fuel';
import { ORES } from '../../logic/ore';
import { Gauge } from '../kit/gauge';
import { plaque } from '../kit/plaque';
import { aside, INK_TEXT, label, SEPIA } from '../kit/type';
import { PAD, section, SECTION_BODY, type ShipPage } from './panel';
import { liftOffCard } from './storyCards';

const BAR_H = 18;
export const FUEL_BTN = { w: 200, h: 44 } as const;
/** Below this share the bar turns madder: not enough to go up and come back down. */
const LOW = ROUND_TRIP / FUEL.max;

/** Why the lander can't climb yet, or what landing burns, under the buttons. */
const NOTES = {
  core: 'Lift-off needs the drive core fitted.',
  fuel: `The climb to your ship burns ${FUEL.toOrbit} units and landing again ${FUEL.toGround}: lift-off waits for both.`,
  docked: `Landing on Graphite burns ${FUEL.toGround} units.`,
  tank: "Aboard, the lander fills through the ship's tank, and it's split: mend it on the Starship tab first.",
} as const;

/** A tank's bar, its level in words, and what it's split from: the top of both fuel panels. Returns the y under it. */
export function tankRow(page: ShipPage, x: number, y: number, w: number, level: number, max: number, low: number): number {
  const { scene } = page;
  const inner = w - PAD * 2;
  new Gauge(scene, x + PAD, y, inner, BAR_H, 'fuel').set(level / max, low);
  const ry = y + BAR_H + 8;
  label(scene, x + PAD, ry, `${level} / ${max} units`, 17, INK_TEXT, '600');
  aside(scene, x + w - PAD, ry + 2, `one lump of ${ORES[FUEL.ore].name} a unit`, 15, inner / 2, SEPIA).setOrigin(1, 0);
  return ry + 32;
}

/**
 * The lander's fuel on the Lander tab (spec, "Your starship and travel"):
 * the tank's bar, a Refill button that splits the ice on hand into fuel,
 * and Lift off once the drive core is in and there's enough to go up and
 * come back down. Aboard the starship, landing is the page's way out, so
 * only Refill is here. Far from the lander it's look-only. Returns the height.
 */
export function fuelPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  let ry = tankRow(page, x, y + SECTION_BODY, w, p.fuel, FUEL.max, LOW);
  const lift = canLiftOff(p);
  const fill = canRefill(p);
  const cy = ry + FUEL_BTN.h / 2;
  const opts = (ok: boolean, primary = false) => ({ width: FUEL_BTN.w, height: FUEL_BTN.h, size: 16, kind: ok ? (primary ? 'primary' : 'secondary') : 'off' }) as const;
  if (page.remote) {
    plaque(scene, x + PAD + FUEL_BTN.w / 2, cy, 'At the lander', () => {}, opts(false));
  } else {
    const fillText = { ok: `Refill · ${refillCost(p)} ice`, full: 'Full', materials: 'No ice on hand', tank: "Ship's tank is split" }[fill];
    plaque(scene, x + PAD + FUEL_BTN.w / 2, cy, fillText, () => {
      const r = refill(p);
      if (r.ok) page.commit(r.profile, { news: 'Tank filled' });
    }, opts(fill === 'ok'));
    if (lift !== 'docked') plaque(scene, x + w - PAD - FUEL_BTN.w / 2, cy, 'Lift off', () => {
      if (lift === 'ok') liftOffCard(page);
    }, opts(lift === 'ok', true));
  }
  ry += FUEL_BTN.h + 10;
  const note = fill === 'tank' ? NOTES.tank : lift !== 'ok' ? NOTES[lift] : null;
  if (!page.remote && note) {
    const t = aside(scene, x + PAD, ry, note, 15, w - PAD * 2, SEPIA);
    ry += t.height + 6;
  }
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Lander fuel', 47);
  return h;
}
