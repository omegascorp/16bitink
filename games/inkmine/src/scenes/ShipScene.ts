import Phaser from 'phaser';
import { ART_RES, PAPER } from '../art/palette';
import { bakeCharacters, bakePickups, PROSPECTOR_RES, shipTexture, TEX } from '../art/textures';
import { shipLookOf } from '../art/starship';
import { newsSound } from '../audio/news';
import { getProfile, getSound, setProfile } from '../host';
import { currentPlanet, hasWorld } from '../level/planets';
import { worldById } from '../logic/starSystem';
import type { Profile } from '../logic/economy';
import { prospectorLook } from '../logic/gear';
import { hasTool } from '../logic/tools';
import { wreckOf } from '../logic/repairs';
import { landerLookOf } from '../logic/ship';
import { canLand, land } from '../logic/fuel';
import { defaultTab, focusOf, tabsFor, type Tab } from '../logic/tech';
import type { GameScene } from './GameScene';
import { relayoutOnResize, screenScene, viewSize } from './hidpi';
import { muteButton, narrationButton } from './kit/muteButton';
import { plaque } from './kit/plaque';
import { dragScroll } from './kit/scroll';
import { aside, heading, INK_TEXT, scrawl, SEPIA } from './kit/type';
import { desk, NO_FOCUS, type ShipPage, type ShipUi } from './ship/panel';
import { storagePanel } from './ship/storagePanel';
import { fuelPanel } from './ship/fuelPanel';
import { lifePanel } from './ship/lifePanel';
import { storesPanel } from './ship/storesPanel';
import { starshipPanel } from './ship/starshipPanel';
import { drawTabs } from './ship/tabs';
import { stackCard } from './ship/stackCard';
import { techCard } from './ship/techCard';
import { shipStoryCard } from './ship/storyCards';
import { techPanel } from './ship/techPanel';

export interface ShipData extends ShipUi {
  /** Where the page was scrolled to, kept across a redraw. */
  readonly scrollY?: number;
  /** Opened with L far from the lander, over the paused world (see ShipPage.remote). */
  readonly remote?: boolean;
}

const GAP = 20;
/** Two columns from this layout width; narrower screens stack them and scroll. */
const WIDE = 1000;
/** Header rows: one on a wide screen, two (tabs under the title) on a narrow one. */
const HEAD = { wide: 92, narrow: 150 } as const;
/** The tabs whose panel goes under the storage rather than under the figure: the lander's fuel, the suit's life support. */
const belowStorage = (tab: Tab): boolean => tab === 'ship' || tab === 'suit';
/** Room for the figure over the detail card (wide), or above the slots (narrow). */
const FIG = { wide: 320, narrow: 210 } as const;
const BACK = { w: 180, h: 46 } as const;
const RECALL = { w: 160, h: 40 } as const;
/** Keys that leave the page: the same ones that open it (L, Esc, P). */
const MENU_KEYS = ['keydown-L', 'keydown-ESC', 'keydown-P'] as const;

/**
 * Aboard the lander, laid out as No Man's Sky's inventory: a Suit tab and a
 * Ship tab (Q / E, or tap). Each shows its technology slots (the gear; the
 * ship's systems and modules) above its storage (the suit bag; the cargo),
 * and beside them the prospector or the lander with the slot in focus on a
 * detail card, to print or repair it; a stack picked up from the storage
 * shows on that card instead. Tap the slot again, or put the stack down,
 * and the card goes. Far from the lander, L opens the same page over the
 * paused world, read-only but for sorting and locking the suit bag; it's
 * the pause menu too, with Recall. L, Esc or P leaves either page. The Ship
 * tab also has the fuel tank, with Refill and Lift off (ship/fuelPanel.ts).
 */
export class ShipScene extends Phaser.Scene {
  private ui: ShipUi = {};
  private remote = false;
  private tabs: readonly Tab[] = [];

  constructor() {
    super('Ship');
  }

  create(data: ShipData): void {
    screenScene(this, true);
    // Laid out again for the new size as it stands: the scroll now, and no news (it's been read).
    relayoutOnResize(this, (): ShipData => ({ ...data, news: undefined, scrollY: this.cameras.main.scrollY }));
    this.cameras.main.setBackgroundColor(PAPER);
    const profile = getProfile(this);
    const planet = currentPlanet(getProfile(this));
    bakeCharacters(this, prospectorLook(profile.gear, hasTool(profile, 'pulse')), landerLookOf(profile.ship), wreckOf(profile));
    bakePickups(this, planet.style.stone);

    this.remote = data.remote ?? false;
    this.tabs = tabsFor(profile);
    const asked = data.tab && this.tabs.includes(data.tab) ? data.tab : undefined;
    const tab = asked ?? (this.remote ? 'suit' : defaultTab(profile));
    this.ui = { selected: data.selected, confirm: data.confirm, tab, focus: data.focus };
    const page: ShipPage = {
      scene: this,
      profile,
      ui: this.ui,
      remote: this.remote,
      commit: (p, ui = {}) => this.redraw(p, ui),
      setUi: (ui) => this.redraw(null, ui),
    };

    const { width } = viewSize(this);
    const wide = width >= WIDE;
    // The right side shows one thing: the stack held, else the slot in focus, else nothing.
    const sel = this.ui.selected;
    const held = sel ? ([profile.suit, profile.cargo, profile.hold][sel.bag]?.slots[sel.slot] ?? null) : null;
    const focus = held || data.focus === NO_FOCUS ? null : focusOf(profile, tab, data.focus);
    const card = (x: number, y: number, w: number): number => {
      if (sel && held) return stackCard(page, sel, held, x, y, w);
      return focus ? techCard(page, focus, x, y, w) : 0;
    };
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
      const left = top + h1 + (h2 ? GAP + h2 : 0);
      this.figure(tab, profile, x1 + rightW / 2, top + FIG.wide - 10, false);
      this.farNote(tab, x1 + rightW / 2, top + 4, rightW, 28);
      // The lander's fuel and the suit's life support go under the storage; the starship's tank, with its course, under its picture, then the card.
      const under = belowStorage(tab) ? Math.max(0, this.fuel(page, tab, x0, left + GAP, leftW) - GAP) : 0;
      const fuelH = belowStorage(tab) ? 0 : this.fuel(page, tab, x1, top + FIG.wide, rightW);
      const h3 = card(x1, top + FIG.wide + fuelH, rightW);
      bottom = Math.max(left + (under ? GAP + under : 0), top + FIG.wide + fuelH + (h3 || -GAP));
    } else {
      const colW = Math.floor(Math.min(620, width - GAP * 2) / 8) * 8;
      const x = Math.round((width - colW) / 2);
      const top = HEAD.narrow;
      this.figure(tab, profile, width / 2, top + FIG.narrow - 10, true);
      this.farNote(tab, width / 2, top - 6, colW, 22);
      const fuel = (y: number): number => Math.max(0, this.fuel(page, tab, x, y, colW) - GAP);
      // The starship's tank (and its course) leads; the lander's fuel and the suit's life support follow the storage.
      const panels: ((y: number) => number)[] = [
        (y) => (belowStorage(tab) ? 0 : fuel(y)),
        (y) => techPanel(page, tab, focus, x, y, colW),
        (y) => card(x, y, colW),
        (y) => storagePanel(page, tab, x, y, colW),
        (y) => (belowStorage(tab) ? fuel(y) : 0),
      ];
      // An empty card takes no room, nor a gap.
      bottom = panels.reduce((y, panel) => { const h = panel(y); return h ? y + h + GAP : y; }, top + FIG.narrow) - GAP;
    }
    desk(this, width, Math.max(viewSize(this).height, bottom + GAP * 2));
    dragScroll(this, bottom + GAP, data.scrollY ?? 0);
    this.keys(tab);
    this.soundFor(data.news);
    // Story beats happen aboard, not on the suit page far away.
    if (!this.remote) shipStoryCard(page);
  }

  /** The tab's own panels, with the gap after them: the lander's fuel and supplies, the starship's fuel and course, or, in the inventory far from the lander, the suit's life support. */
  private fuel(page: ShipPage, tab: Tab, x: number, y: number, w: number): number {
    if (tab === 'suit') return this.remote ? lifePanel(page, x, y, w) + GAP : 0;
    if (tab === 'starship') return starshipPanel(page, x, y, w) + GAP;
    // The lander's fuel, then its supplies for the suit.
    const fuelH = fuelPanel(page, x, y, w) + GAP;
    return fuelH + storesPanel(page, x, y + fuelH, w) + GAP;
  }

  /** The title, the tab strip, the way back down (or, aboard the starship, landing), and any news. */
  private header(width: number, wide: boolean, tab: Tab, news?: string): void {
    const p = getProfile(this);
    const docked = p.docked;
    // By the star map's name: a world whose ground didn't load is still the one you're over.
    const name = worldById(p.at)?.name ?? currentPlanet(p).name;
    const title = heading(this, GAP + 4, 18, this.remote ? 'Inventory' : docked ? 'Your starship' : 'The lander', 30).setOrigin(0, 0);
    muteButton(this, title.x + title.width + 30, 36);
    narrationButton(this, title.x + title.width + 72, 36);
    const where = this.remote ? 'far from the lander: the cargo is look-only' : docked ? `docked, in orbit over ${name}` : `${p.at === 'graphite' ? 'crash site' : 'landing site'}, ${name}`;
    aside(this, GAP + 6, 54, where, 17, 400, SEPIA).setOrigin(0, 0);
    const back = (): void => {
      if (this.remote) this.close();
      else this.backDown();
    };
    const canGo = !docked || this.remote || (canLand(p) === 'ok' && hasWorld(p.at));
    plaque(this, width - GAP - BACK.w / 2, 40, this.remote ? 'Back' : docked ? 'Land' : 'Back down', back, { width: BACK.w, height: BACK.h, kind: canGo ? 'primary' : 'off' });
    const pick = (t: Tab): void => this.redraw(null, { selected: this.ui.selected, tab: t });
    if (wide) drawTabs(this, width - GAP - BACK.w - 40, 38, this.tabs, tab, pick);
    else drawTabs(this, width - GAP, 104, this.tabs, tab, pick);
    if (this.remote) this.recallButton(wide ? width / 2 : GAP + RECALL.w / 2, wide ? 34 : 104, wide);
    if (!news) return;
    // Far from the lander Recall has the middle of the header: the news goes over the figure instead.
    if (wide && this.remote) scrawl(this, width * 0.76, HEAD.wide + 30, news, 30, INK_TEXT).setOrigin(0.5, 0.5);
    else if (wide) scrawl(this, width / 2, 40, news, 30, INK_TEXT).setOrigin(0.5, 0.5);
    else scrawl(this, GAP + (this.remote ? RECALL.w + 18 : 0), 104, news, this.remote ? 22 : 26, INK_TEXT).setOrigin(0, 0.5);
  }

  /** Recall, as the old pause card had it: the winch hauls you up to the lander, and what its share leaves of the bag stays flagged where you were. */
  private recallButton(cx: number, cy: number, wide: boolean): void {
    plaque(this, cx, cy, 'Recall', () => this.recall(), { width: RECALL.w, height: RECALL.h, size: 15 });
    if (wide) aside(this, cx, cy + RECALL.h / 2 + 6, 'Stuck? The winch hauls you up; the bag stays here, flagged.', 14, 420, SEPIA).setOrigin(0.5, 0).setAlign('center');
  }

  /** Closes the page and asks the world for a recall, done on its next step. */
  private recall(): void {
    this.close();
    (this.scene.get('Game') as GameScene).recall();
  }

  /** Over the lander, when it's looked at from far away: why nothing here can be touched. */
  private farNote(tab: Tab, cx: number, y: number, w: number, size: number): void {
    if (!this.remote || tab !== 'ship') return;
    scrawl(this, cx, y, "You're far from the lander. Come back to it to print, repair or move the cargo.", size, INK_TEXT, w).setOrigin(0.5, 0).setAlign('center');
  }

  /** The prospector (suit tab) or the lander as broken as it still is (ship tab), standing on `groundY`. */
  private figure(tab: Tab, p: Profile, cx: number, groundY: number, small: boolean): void {
    const shadow = this.add.graphics().fillStyle(0x1f2a55, 0.12);
    if (tab === 'suit') {
      const s = (small ? 3.6 : 5.6) / PROSPECTOR_RES;
      // The frame's centre is 14 units above the feet.
      const img = this.add.image(cx, groundY - 14 * s * PROSPECTOR_RES, TEX.prospector('idle', prospectorLook(p.gear, hasTool(p, 'pulse')), 0)).setScale(s);
      shadow.fillEllipse(cx, groundY, img.displayWidth * 0.32, 12);
      return;
    }
    if (tab === 'starship') {
      // Each system shows as broken until it's mended, and it's dark until its power's back.
      const img = this.add.image(cx, groundY - (small ? 80 : 118), shipTexture(this, shipLookOf(p), 'big'));
      img.setScale((small ? Math.min(350, viewSize(this).width - 32) : 548) / img.width);
      return;
    }
    const s = (small ? 1.15 : 1.75) / ART_RES;
    this.add.image(cx, groundY, TEX.lander(landerLookOf(p.ship), 0, wreckOf(p))).setOrigin(0.5, 1).setScale(s);
  }

  /** Aboard, the lander's warm hum (far away, the planet's sound goes on under the page); and a sound for any news. */
  private soundFor(news?: string): void {
    const sound = getSound(this);
    if (!this.remote) sound?.setMood('ship');
    const id = newsSound(news);
    if (id) sound?.play(id);
  }

  /** Q and E switch tabs, as the shoulder buttons do in No Man's Sky. */
  private keys(tab: Tab): void {
    const tabs = this.tabs;
    const step = (d: number): void => {
      const next = tabs[(tabs.indexOf(tab) + d + tabs.length) % tabs.length]!;
      this.redraw(null, { selected: this.ui.selected, tab: next });
    };
    this.input.keyboard?.on('keydown-Q', () => step(-1));
    this.input.keyboard?.on('keydown-E', () => step(1));
    // The keys that open the page close it: back into the world far away, back down aboard. A held key's repeats don't count.
    // Aboard the starship they do nothing: landing burns fuel, so it takes the button.
    const leave = (e: KeyboardEvent): void => {
      if (e.repeat || (!this.remote && getProfile(this).docked)) return;
      if (this.remote) this.close();
      else this.backDown();
    };
    for (const k of MENU_KEYS) this.input.keyboard?.on(k, leave);
  }

  /**
   * Out of the lander: the world starts again from it. Empty data, so a
   * waking note from an earlier start isn't shown again. Aboard the
   * starship it's the landing, which burns the lander's fuel.
   */
  private backDown(): void {
    const p = getProfile(this);
    if (p.docked) {
      if (!hasWorld(p.at)) return;
      const r = land(p);
      if (!r.ok) return;
      setProfile(this, r.profile);
    }
    this.scene.start('Game', {});
  }

  /** The inventory closes back into the world, which takes the bag as it was left here. */
  private close(): void {
    this.scene.stop();
    this.scene.resume('Game');
  }

  /** Saves a changed profile (if any) and redraws with new page state, keeping the scroll and (unless changed) the tab and focus. */
  private redraw(p: Profile | null, ui: ShipUi): void {
    if (p) setProfile(this, p);
    const keep = ui.tab && ui.tab !== this.ui.tab ? { tab: ui.tab } : { tab: this.ui.tab, focus: this.ui.focus };
    const next: ShipData = { scrollY: this.cameras.main.scrollY, remote: this.remote, ...keep, ...ui };
    this.scene.restart(next);
  }
}
