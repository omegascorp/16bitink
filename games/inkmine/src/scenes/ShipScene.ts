import Phaser from 'phaser';
import { BLUE, PAPER } from '../art/palette';
import { bakeCharacters, bakePickups } from '../art/textures';
import { getProfile, setProfile } from '../host';
import { levelById, levelOrder, planetOf, slotOf } from '../level/levels';
import type { LevelDef } from '../level/types';
import { claimPending, isOpen, type Profile } from '../logic/economy';
import { prospectorLook } from '../logic/gear';
import { holdSize } from '../logic/hold';
import { usedSlots } from '../logic/inventory';
import { contractText, goalText, payText, rewardText } from '../logic/mission';
import { landerLookOf } from '../logic/ship';
import { relayoutOnResize, screenScene, toView, viewSize } from './hidpi';
import { inventoryPanel } from './ship/inventoryPanel';
import { section, SOFT_INK, type ShipPage, type ShipUi } from './ship/panel';
import { gearPanel, landerPanel } from './ship/printerPanel';
import { inkButton, inkText, noteText, PENCIL } from './ui';

export interface ShipData extends ShipUi {
  readonly levelId?: string;
  /** Where the page was scrolled to, kept across a redraw. */
  readonly scrollY?: number;
}

const GAP = 20;
/** Columns side by side from this layout width; narrower screens stack them and scroll. */
const WIDE = 1180;

/**
 * The ship, between landings: a notebook page. The inventory (the suit's
 * bag and the cargo, to sort), the printer (gear from found blueprints and
 * the lander's modules, all printed from resources), and the next landing's
 * briefing with the button to land.
 */
export class ShipScene extends Phaser.Scene {
  private levelId = '';

  constructor() {
    super('Ship');
  }

  create(data: ShipData): void {
    screenScene(this, true);
    relayoutOnResize(this, data);
    this.cameras.main.setBackgroundColor(PAPER);
    // Rewards the guild held for want of room arrive as soon as there's room.
    const stored = getProfile(this);
    if (holdSize(stored.pending)) setProfile(this, claimPending(stored));
    const profile = getProfile(this);
    const order = levelOrder();
    const level = levelById(data.levelId ?? '') ?? levelById(order.find((id) => isOpen(profile, order, id) && !profile.levels[id]?.won) ?? order[0]!)!;
    this.levelId = level.id;
    const planet = planetOf(level.id);
    bakeCharacters(this, prospectorLook(profile.gear), landerLookOf(profile.ship));
    bakePickups(this, planet.style.stone);

    const { width } = viewSize(this);
    const wide = width >= WIDE;
    const colW = wide ? (width - GAP * 4) / 3 : Math.min(620, width - GAP * 2);
    inkText(this, GAP, 34, 'The ship', 48).setOrigin(0, 0.5);
    inkText(this, width - GAP, 34, `cargo ${usedSlots(profile.cargo)}/${profile.cargo.slots.length} slots`, 24, SOFT_INK).setOrigin(1, 0.5);
    if (data.news) inkText(this, wide ? width / 2 : GAP, wide ? 34 : 74, data.news, 30, BLUE).setOrigin(wide ? 0.5 : 0, 0.5);

    const page: ShipPage = {
      scene: this,
      profile,
      ui: { selected: data.selected, confirm: data.confirm },
      commit: (p, ui = {}) => this.redraw(p, ui),
      setUi: (ui) => this.redraw(null, ui),
    };
    const top = wide ? 72 : 96;
    const x = (i: number): number => (wide ? GAP + i * (colW + GAP) : (width - colW) / 2);
    let bottom: number;
    if (wide) {
      const h1 = inventoryPanel(page, x(0), top, colW);
      const h2 = this.briefing(x(0), top + h1 + GAP, colW, level, profile);
      const h3 = gearPanel(page, x(1), top, colW);
      const h4 = landerPanel(page, x(2), top, colW);
      bottom = top + Math.max(h1 + GAP + h2, h3, h4);
    } else {
      const panels: ((y: number) => number)[] = [
        (y) => inventoryPanel(page, x(0), y, colW),
        (y) => this.briefing(x(0), y, colW, level, profile),
        (y) => gearPanel(page, x(0), y, colW),
        (y) => landerPanel(page, x(0), y, colW),
      ];
      bottom = panels.reduce((y, panel) => y + panel(y) + GAP, top) - GAP;
    }
    this.scroll(bottom + GAP, data.scrollY ?? 0);
  }

  /** Saves a changed profile (if any) and redraws the page with new page state, keeping its scroll. */
  private redraw(p: Profile | null, ui: ShipUi): void {
    if (p) setProfile(this, p);
    const next: ShipData = { levelId: this.levelId, scrollY: this.cameras.main.scrollY, ...ui };
    this.scene.restart(next);
  }

  /** The next landing: its mission and pay, the contracts, and the buttons to land or go back to the chart. */
  private briefing(x: number, y: number, w: number, level: LevelDef, p: Profile): number {
    const planet = planetOf(level.id);
    const parts: { text: string; size: number; color: string }[] = [
      { text: `${planet.name} ${slotOf(level.id)} · ${level.name}`, size: 28, color: BLUE },
      { text: level.hint, size: 20, color: SOFT_INK },
      { text: `Mission: ${level.mission.goals.map(goalText).join(', then ')}.`, size: 22, color: BLUE },
      { text: `Pays ${rewardText(level.mission)}.`, size: 20, color: BLUE },
      { text: 'Contracts:', size: 22, color: BLUE },
      ...level.contracts.map((c) => {
        const paid = p.levels[level.id]?.paid.includes(c.kind);
        return { text: `${paid ? '☑' : '☐'} ${contractText(c)} · ${paid ? 'paid' : `pays ${payText(c.pay)}`}`, size: 20, color: paid ? PENCIL : BLUE };
      }),
    ];
    let ty = y + 56;
    for (const part of parts) ty += noteText(this, x + 16, ty, part.text, part.size, w - 32, part.color).height + 8;
    const h = ty - y + 90;
    section(this, x, y, w, h, 'Next landing', 37);
    inkButton(this, x + w / 2 + 80, y + h - 44, 'Land ▸', () => this.scene.start('Game', { levelId: level.id }), { width: 150, height: 50 });
    inkButton(this, x + w / 2 - 90, y + h - 44, '◂ Chart', () => this.scene.start('Chart'), { width: 150, height: 50, size: 24 });
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
