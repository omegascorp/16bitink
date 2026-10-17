import { canRefillShip, canSetCourse, FIRST_COURSE, isFixed, mapOpen, refillShip, SHIP_TANK, shipRefillCost } from '../../logic/starship';
import { worldById } from '../../logic/starSystem';
import { plaque } from '../kit/plaque';
import { aside, SEPIA } from '../kit/type';
import { FUEL_BTN, tankRow } from './fuelPanel';
import { PAD, section, SECTION_BODY, type ShipPage } from './panel';

/** What the panel says under its buttons, by how the first trip stands. */
const COURSE_NOTE = {
  away: "The ship's tank is refilled aboard: carry the ice up in the lander.",
  broken: 'Mend its power, telescope, tank and engine, and the ship can fly.',
  fuel: `The trip to ${worldById(FIRST_COURSE.to)!.name}, a sister moon, burns ${FIRST_COURSE.fuel} units.`,
  ok: `Ready: set course for ${worldById(FIRST_COURSE.to)!.name} on the star map.`,
  set: `Course set for ${worldById(FIRST_COURSE.to)!.name}.`,
} as const;

/**
 * The starship's fuel on the Starship tab (spec, "Your starship and
 * travel"): its tank's bar once it's mended, Refill from the ice on hand
 * (aboard only), and the star map, where trips are set. Returns the height.
 */
export function starshipPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  let ry = y + SECTION_BODY;
  if (isFixed(p, 'tank')) ry = tankRow(page, x, ry, w, p.shipFuel, SHIP_TANK.capacity, FIRST_COURSE.fuel / SHIP_TANK.capacity);
  else {
    const t = aside(scene, x + PAD, ry, 'The tank is split: it holds nothing until it is mended.', 16, w - PAD * 2, SEPIA);
    ry += t.height + 12;
  }
  const cy = ry + FUEL_BTN.h / 2;
  const fill = canRefillShip(p);
  const opts = (ok: boolean, primary = false) => ({ width: FUEL_BTN.w, height: FUEL_BTN.h, size: 16, kind: ok ? (primary ? 'primary' : 'secondary') : 'off' }) as const;
  if (isFixed(p, 'tank')) {
    const fillText = fill === 'ok' ? `Refill · ${shipRefillCost(p)} ice` : fill === 'full' ? 'Full' : fill === 'away' ? 'Aboard only' : 'No ice on hand';
    plaque(scene, x + PAD + FUEL_BTN.w / 2, cy, fillText, () => {
      const r = refillShip(p);
      if (r.ok) page.commit(r.profile, { news: "Ship's tank filled" });
    }, opts(fill === 'ok'));
  }
  if (p.docked && !page.remote) plaque(scene, x + w - PAD - FUEL_BTN.w / 2, cy, mapOpen(p) ? 'Star map' : 'Telescope down', () => {
    if (mapOpen(p)) scene.scene.start('System', {});
  }, opts(mapOpen(p), true));
  if (isFixed(p, 'tank') || p.docked) ry += FUEL_BTN.h + 10;
  const t = aside(scene, x + PAD, ry, COURSE_NOTE[canSetCourse(p)], 15, w - PAD * 2, SEPIA);
  ry += t.height + 6;
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Starship fuel', 53);
  return h;
}
