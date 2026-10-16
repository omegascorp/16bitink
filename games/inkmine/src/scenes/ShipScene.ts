import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { bakeCharacters, bakePickups } from '../art/textures';
import { getProfile, setProfile } from '../host';
import { currentPlanet } from '../level/planets';
import type { Profile } from '../logic/economy';
import { prospectorLook } from '../logic/gear';
import { usedSlots } from '../logic/inventory';
import { wreckOf } from '../logic/repairs';
import { landerLookOf } from '../logic/ship';
import { relayoutOnResize, screenScene, toView, viewSize } from './hidpi';
import { inventoryPanel } from './ship/inventoryPanel';
import { repairPanel } from './ship/repairPanel';
import { plaque } from './kit/plaque';
import { aside, heading, INK_TEXT, prose, scrawl, SEPIA } from './kit/type';
import { desk, PAD, section, SECTION_BODY, type ShipPage, type ShipUi } from './ship/panel';
import { gearPanel, landerPanel } from './ship/printerPanel';

export interface ShipData extends ShipUi {
  /** Where the page was scrolled to, kept across a redraw. */
  readonly scrollY?: number;
}

const GAP = 20;
/** Columns side by side from this layout width; narrower screens stack them and scroll. */
const WIDE = 1180;

/**
 * Aboard the lander: a notebook page. The inventory (the suit's bag and the
 * cargo, to sort), the printer (gear from found blueprints and the lander's
 * modules, all printed from resources), and the way back down.
 */
export class ShipScene extends Phaser.Scene {
  constructor() {
    super('Ship');
  }

  create(data: ShipData): void {
    screenScene(this, true);
    relayoutOnResize(this, data);
    this.cameras.main.setBackgroundColor(PAPER);
    const profile = getProfile(this);
    const planet = currentPlanet();
    bakeCharacters(this, prospectorLook(profile.gear), landerLookOf(profile.ship), wreckOf(profile));
    bakePickups(this, planet.style.stone);

    const { width } = viewSize(this);
    const wide = width >= WIDE;
    // Rounded, so resizing the window doesn't bake a new set of plates for every width.
    const colW = Math.floor((wide ? (width - GAP * 4) / 3 : Math.min(620, width - GAP * 2)) / 8) * 8;
    heading(this, GAP + 4, 18, 'The lander', 30).setOrigin(0, 0);
    aside(this, GAP + 6, 54, `crash site, ${planet.name}`, 17, 400, SEPIA).setOrigin(0, 0);
    aside(this, width - GAP, 30, `cargo ${usedSlots(profile.cargo)} of ${profile.cargo.slots.length} slots`, 18, 400, SEPIA).setOrigin(1, 0.5);
    if (data.news) scrawl(this, wide ? width / 2 : GAP, wide ? 40 : 96, data.news, 30, INK_TEXT).setOrigin(wide ? 0.5 : 0, 0.5);

    const page: ShipPage = {
      scene: this,
      profile,
      ui: { selected: data.selected, confirm: data.confirm },
      commit: (p, ui = {}) => this.redraw(p, ui),
      setUi: (ui) => this.redraw(null, ui),
    };
    const top = wide ? 96 : 124;
    const x = (i: number): number => (wide ? GAP + i * (colW + GAP) : (width - colW) / 2);
    let bottom: number;
    if (wide) {
      const h1 = inventoryPanel(page, x(0), top, colW);
      const h2 = this.backDown(x(0), top + h1 + GAP, colW);
      const h3 = gearPanel(page, x(1), top, colW);
      const h4 = repairPanel(page, x(2), top, colW);
      const h5 = landerPanel(page, x(2), top + h4 + GAP, colW);
      bottom = top + Math.max(h1 + GAP + h2, h3, h4 + GAP + h5);
    } else {
      const panels: ((y: number) => number)[] = [
        (y) => repairPanel(page, x(0), y, colW),
        (y) => inventoryPanel(page, x(0), y, colW),
        (y) => this.backDown(x(0), y, colW),
        (y) => gearPanel(page, x(0), y, colW),
        (y) => landerPanel(page, x(0), y, colW),
      ];
      bottom = panels.reduce((y, panel) => y + panel(y) + GAP, top) - GAP;
    }
    desk(this, width, Math.max(viewSize(this).height, bottom + GAP * 2));
    this.scroll(bottom + GAP, data.scrollY ?? 0);
  }

  /** Saves a changed profile (if any) and redraws the page with new page state, keeping its scroll. */
  private redraw(p: Profile | null, ui: ShipUi): void {
    if (p) setProfile(this, p);
    const next: ShipData = { scrollY: this.cameras.main.scrollY, ...ui };
    this.scene.restart(next);
  }

  /** The way back out: down the ladder to the planet, from the lander. */
  private backDown(x: number, y: number, w: number): number {
    const planet = currentPlanet();
    const ty = y + SECTION_BODY;
    const t = prose(this, x + PAD, ty, `${planet.name}. ${planet.blurb} Print what you can, sort the cargo, then head back down.`, 17, w - PAD * 2, SEPIA);
    const h = ty - y + t.height + 86;
    section(this, x, y, w, h, 'Aboard', 37);
    plaque(this, x + w / 2, y + h - 42, 'Back down', () => this.scene.start('Game'), { width: 200, height: 46, kind: 'primary' });
    return h;
  }

  /** On a screen too short for the page, drag or wheel to scroll it. */
  private scroll(contentH: number, startY: number): void {
    const { height } = viewSize(this);
    if (contentH <= height) return;
    const cam = this.cameras.main;
    // Clamped by hand: camera bounds don't sit right with this zoomed, top-left-origin camera.
    const to = (y: number): void => {
      cam.setScroll(0, Phaser.Math.Clamp(y, 0, contentH - height));
    };
    to(startY);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => to(cam.scrollY + dy));
    let last: number | null = null;
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      last = toView(ptr.x, ptr.y, this).y;
    });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (last === null || !ptr.isDown) return;
      const now = toView(ptr.x, ptr.y, this).y;
      to(cam.scrollY - (now - last));
      last = now;
    });
    this.input.on('pointerup', () => {
      last = null;
    });
  }
}
