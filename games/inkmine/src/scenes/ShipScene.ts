import Phaser from 'phaser';
import { ART_RES, PAPER } from '../art/palette';
import { bakeCharacters, bakePickups, PROSPECTOR_RES, TEX } from '../art/textures';
import { getProfile, setProfile } from '../host';
import { currentPlanet } from '../level/planets';
import type { Profile } from '../logic/economy';
import { prospectorLook } from '../logic/gear';
import { wreckOf } from '../logic/repairs';
import { landerLookOf } from '../logic/ship';
import { defaultTab, focusOf, TABS, type Tab } from '../logic/tech';
import { relayoutOnResize, screenScene, toView, viewSize } from './hidpi';
import { plaque } from './kit/plaque';
import { aside, heading, INK_TEXT, scrawl, SEPIA } from './kit/type';
import { desk, type ShipPage, type ShipUi } from './ship/panel';
import { storagePanel } from './ship/storagePanel';
import { drawTabs } from './ship/tabs';
import { techCard } from './ship/techCard';
import { techPanel } from './ship/techPanel';

export interface ShipData extends ShipUi {
  /** Where the page was scrolled to, kept across a redraw. */
  readonly scrollY?: number;
}

const GAP = 20;
/** Two columns from this layout width; narrower screens stack them and scroll. */
const WIDE = 1000;
/** Header rows: one on a wide screen, two (tabs under the title) on a narrow one. */
const HEAD = { wide: 92, narrow: 150 } as const;
/** Room for the figure over the detail card (wide), or above the slots (narrow). */
const FIG = { wide: 320, narrow: 210 } as const;
const BACK = { w: 180, h: 46 } as const;

/**
 * Aboard the lander, laid out as No Man's Sky's inventory: a Suit tab and a
 * Ship tab (Q / E, or tap). Each shows its technology slots (the gear; the
 * ship's systems and modules) above its storage (the suit bag; the cargo),
 * and beside them the prospector or the lander with the slot in focus on a
 * detail card, to print or repair it.
 */
export class ShipScene extends Phaser.Scene {
  private ui: ShipUi = {};

  constructor() {
    super('Ship');
  }

  create(data: ShipData): void {
    screenScene(this, true);
    // Laid out again for the new size as it stands: the scroll now, and no news (it's been read).
    relayoutOnResize(this, (): ShipData => ({ ...data, news: undefined, scrollY: this.cameras.main.scrollY }));
    this.cameras.main.setBackgroundColor(PAPER);
    const profile = getProfile(this);
    const planet = currentPlanet();
    bakeCharacters(this, prospectorLook(profile.gear), landerLookOf(profile.ship), wreckOf(profile));
    bakePickups(this, planet.style.stone);

    const tab = data.tab ?? defaultTab(profile);
    const focus = focusOf(profile, tab, data.focus);
    this.ui = { selected: data.selected, confirm: data.confirm, tab, focus: data.focus };
    const page: ShipPage = {
      scene: this,
      profile,
      ui: this.ui,
      commit: (p, ui = {}) => this.redraw(p, ui),
      setUi: (ui) => this.redraw(null, ui),
    };

    const { width } = viewSize(this);
    const wide = width >= WIDE;
    this.header(width, wide, tab, data.news);
    let bottom: number;
    if (wide) {
      const leftW = Math.floor(Math.min(680, (width - GAP * 3) * 0.56) / 8) * 8;
      const rightW = Math.floor(Math.min(560, width - GAP * 3 - leftW) / 8) * 8;
      const x0 = Math.round((width - leftW - GAP - rightW) / 2);
      const x1 = x0 + leftW + GAP;
      const top = HEAD.wide;
      const h1 = techPanel(page, tab, focus, x0, top, leftW);
      const h2 = storagePanel(page, tab, x0, top + h1 + GAP, leftW);
      this.figure(tab, profile, x1 + rightW / 2, top + FIG.wide - 10, false);
      const h3 = techCard(page, focus, x1, top + FIG.wide, rightW);
      bottom = Math.max(top + h1 + GAP + h2, top + FIG.wide + h3);
    } else {
      const colW = Math.floor(Math.min(620, width - GAP * 2) / 8) * 8;
      const x = Math.round((width - colW) / 2);
      const top = HEAD.narrow;
      this.figure(tab, profile, width / 2, top + FIG.narrow - 10, true);
      const panels: ((y: number) => number)[] = [
        (y) => techPanel(page, tab, focus, x, y, colW),
        (y) => techCard(page, focus, x, y, colW),
        (y) => storagePanel(page, tab, x, y, colW),
      ];
      bottom = panels.reduce((y, panel) => y + panel(y) + GAP, top + FIG.narrow) - GAP;
    }
    desk(this, width, Math.max(viewSize(this).height, bottom + GAP * 2));
    this.scroll(bottom + GAP, data.scrollY ?? 0);
    this.keys(tab);
  }

  /** The title, the tab strip, the way back down, and any news. */
  private header(width: number, wide: boolean, tab: Tab, news?: string): void {
    const planet = currentPlanet();
    heading(this, GAP + 4, 18, 'The lander', 30).setOrigin(0, 0);
    aside(this, GAP + 6, 54, `crash site, ${planet.name}`, 17, 400, SEPIA).setOrigin(0, 0);
    plaque(this, width - GAP - BACK.w / 2, 40, 'Back down', () => this.scene.start('Game'), { width: BACK.w, height: BACK.h, kind: 'primary' });
    const pick = (t: Tab): void => this.redraw(null, { selected: this.ui.selected, tab: t });
    if (wide) drawTabs(this, width - GAP - BACK.w - 40, 38, tab, pick);
    else drawTabs(this, width - GAP, 104, tab, pick);
    if (!news) return;
    if (wide) scrawl(this, width / 2, 40, news, 30, INK_TEXT).setOrigin(0.5, 0.5);
    else scrawl(this, GAP, 104, news, 26, INK_TEXT).setOrigin(0, 0.5);
  }

  /** The prospector (suit tab) or the lander as broken as it still is (ship tab), standing on `groundY`. */
  private figure(tab: Tab, p: Profile, cx: number, groundY: number, small: boolean): void {
    const shadow = this.add.graphics().fillStyle(0x1f2a55, 0.12);
    if (tab === 'suit') {
      const s = (small ? 3.6 : 5.6) / PROSPECTOR_RES;
      // The frame's centre is 14 units above the feet.
      const img = this.add.image(cx, groundY - 14 * s * PROSPECTOR_RES, TEX.prospector('idle', prospectorLook(p.gear), 0)).setScale(s);
      shadow.fillEllipse(cx, groundY, img.displayWidth * 0.32, 12);
      return;
    }
    const s = (small ? 1.15 : 1.75) / ART_RES;
    this.add.image(cx, groundY, TEX.lander(landerLookOf(p.ship), 0, wreckOf(p))).setOrigin(0.5, 1).setScale(s);
  }

  /** Q and E switch tabs, as the shoulder buttons do in No Man's Sky. */
  private keys(tab: Tab): void {
    const step = (d: number): void => {
      const next = TABS[(TABS.indexOf(tab) + d + TABS.length) % TABS.length]!;
      this.redraw(null, { selected: this.ui.selected, tab: next });
    };
    this.input.keyboard?.on('keydown-Q', () => step(-1));
    this.input.keyboard?.on('keydown-E', () => step(1));
  }

  /** Saves a changed profile (if any) and redraws with new page state, keeping the scroll and (unless changed) the tab and focus. */
  private redraw(p: Profile | null, ui: ShipUi): void {
    if (p) setProfile(this, p);
    const keep = ui.tab && ui.tab !== this.ui.tab ? { tab: ui.tab } : { tab: this.ui.tab, focus: this.ui.focus };
    const next: ShipData = { scrollY: this.cameras.main.scrollY, ...keep, ...ui };
    this.scene.restart(next);
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
