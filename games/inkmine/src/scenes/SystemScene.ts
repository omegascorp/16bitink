import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { bakeSystem, shipTexture, TEX } from '../art/textures';
import { shipLookOf } from '../art/starship';
import { worldRadius } from '../art/systemArt';
import { habitableZone, KIND_LINE, moonsOf, planetsOf, snowLine, STAR, worldById, WORLDS, type World } from '../logic/starSystem';
import { getHost, getProfile, getSound, REG, setProfile } from '../host';
import { hasWorld } from '../level/planets';
import { canTravel, travel, tripFuel, type TravelCheck } from '../logic/travel';
import { isWorldId, type WorldId } from '../logic/worlds';
import { loadPaidPlanets } from './BootScene';
import type { Profile } from '../logic/economy';
import { FIRST_COURSE, setCourse } from '../logic/starship';
import { hasBeat } from '../logic/story';
import { relayoutOnResize, screenScene, viewSize } from './hidpi';
import { muteButton } from './kit/muteButton';
import { plaque } from './kit/plaque';
import { dragScroll } from './kit/scroll';
import { storyCard } from './kit/storyCard';
import { aside, heading, INK_TEXT, label, MADDER, prose, scrawl, SEPIA, VERDIGRIS } from './kit/type';
import { desk, PAD, section, SECTION_BODY } from './ship/panel';

export interface SystemData {
  /** Just docked: the arrival card shows first. */
  readonly arrived?: boolean;
  /** The world on the card (Graphite unless one was tapped). */
  readonly selected?: string;
  /** Course just set: the end-of-the-demo card shows. */
  readonly demoEnd?: boolean;
}

const GAP = 20;
const HEAD = 96;
/** Narrower than this (a phone held upright), the map runs down the page instead of across. */
const ACROSS = 900;
/** The map's distance scale is logarithmic, from this far from the star to this far. */
const AU = { near: 0.1, far: 12 } as const;
/** Moons hang this far from their giant, and this far apart: below it across the page, beside it (past its name) down the page. */
const MOON = { first: 60, step: 52, firstDown: 170, stepDown: 72 } as const;
const BACK = { w: 300, h: 46 } as const;
const CARD_W = 760;
/** How wide the ship is drawn by its world. */
const MAP_SHIP_W = 57;
const HIGHLIGHT = 0xd9ee7a;
/** Keys that leave the map, as they leave the lander's page. */
const BACK_KEYS = ['keydown-L', 'keydown-ESC', 'keydown-P'] as const;

/** Where the map puts things: a world's centre, by its distance and (for a moon) its place round its giant. */
interface Layout {
  readonly vertical: boolean;
  /** A world's centre. */
  at(w: World): { x: number; y: number };
  /** The page's height below the map. */
  readonly bottom: number;
}

/**
 * The star map, from your ship in orbit (spec, "The first star system"):
 * the orange star at one edge and its twelve worlds by distance (on a log
 * scale, or the inner ones would sit on top of each other), the habitable
 * zone washed in highlighter and the snow line dashed, each giant's moons
 * hanging from it, and your ship by Graphite. Tap a world for what the
 * telescope makes of it. Shown first when you dock at the end of chapter 1,
 * and from the lander's Fuel panel after.
 */
export class SystemScene extends Phaser.Scene {
  constructor() {
    super('System');
  }

  create(data: SystemData): void {
    screenScene(this, true);
    relayoutOnResize(this, (): SystemData => ({ selected: data.selected }));
    this.cameras.main.setBackgroundColor(PAPER);
    bakeSystem(this);
    // Out among the stars: high, sparse and spacious.
    getSound(this)?.setMood('space');
    const { width, height } = viewSize(this);
    const here = getProfile(this).at;
    const selected = worldById(data.selected ?? here) ?? WORLDS[0]!;
    this.header(width);
    const layout = this.layout(width);
    this.zones(layout, width);
    this.worlds(layout, selected);
    const cw = Math.min(CARD_W, width - GAP * 2);
    const cardBottom = layout.bottom + this.card(selected, Math.round((width - cw) / 2), layout.bottom, cw);
    desk(this, width, Math.max(height, cardBottom + GAP * 2));
    dragScroll(this, cardBottom + GAP, 0);
    for (const k of BACK_KEYS) this.input.keyboard?.on(k, (e: KeyboardEvent) => {
      if (!e.repeat) this.back();
    });
    if (data.arrived) this.arrival();
    if (data.demoEnd) this.demoEnd();
    // At a world whose ground didn't load (the full game, offline): say so, and offer to try again.
    if (!hasWorld(here)) this.unavailable(here);
  }

  private header(width: number): void {
    const title = heading(this, GAP + 4, 18, 'The orange star', 30).setOrigin(0, 0).setDepth(2);
    muteButton(this, title.x + title.width + 30, 36)?.setDepth(2);
    // Once the first trip is set without the full game, the demo is over, and the map says so.
    const over = demoOver(getProfile(this));
    const sub = over ? 'the end of the demo: the rest of the journey is coming soon' : "through your ship's telescope: in no chart you remember";
    aside(this, GAP + 6, 54, sub, 17, Math.max(240, width - BACK.w - GAP * 4), over ? MADDER : SEPIA).setOrigin(0, 0).setDepth(2);
    plaque(this, width - GAP - BACK.w / 2, 40, 'Back to the ship', () => this.back(), { width: BACK.w, height: BACK.h, kind: 'primary', size: 16 }).setDepth(2);
  }

  /** Across the page on a wide screen, down it on a narrow one. */
  private layout(width: number): Layout {
    const vertical = width < ACROSS;
    const t = (au: number): number => (Math.log(au) - Math.log(AU.near)) / (Math.log(AU.far) - Math.log(AU.near));
    const moonOffset = (w: World): number => {
      if (!w.parent) return 0;
      const k = moonsOf(w.parent).indexOf(w);
      return vertical ? MOON.firstDown + MOON.stepDown * k : MOON.first + MOON.step * k;
    };
    if (!vertical) {
      const axisY = HEAD + 124;
      const x0 = 160;
      const x1 = width - 80;
      return { vertical, bottom: axisY + 206, at: (w) => ({ x: x0 + t(w.au) * (x1 - x0), y: axisY + moonOffset(w) }) };
    }
    const axisX = 80;
    const y0 = HEAD + 200;
    const y1 = y0 + 980;
    return { vertical, bottom: y1 + 60, at: (w) => ({ x: axisX + moonOffset(w), y: y0 + t(w.au) * (y1 - y0) }) };
  }

  /** The star, the habitable zone, the snow line and the line the planets sit on. */
  private zones(l: Layout, width: number): void {
    const z = habitableZone();
    const along = (au: number): number => {
      const p = l.at({ ...WORLDS[0]!, au, parent: null });
      return l.vertical ? p.y : p.x;
    };
    const origin = l.at({ ...WORLDS[0]!, au: AU.near, parent: null });
    const g = this.add.graphics().setDepth(-0.5);
    const band = { from: along(z.inner), to: along(z.outer) };
    const snow = along(snowLine());
    const star = this.add.image(0, 0, TEX.star).setOrigin(1, 0.5).setScale(0.8 / 1.5).setDepth(-0.4);
    g.lineStyle(1, 0x1f2a55, 0.45);
    if (!l.vertical) {
      const top = origin.y - 100;
      const h = l.bottom - 20 - top;
      g.fillStyle(HIGHLIGHT, 0.3).fillRect(band.from, top, band.to - band.from, h);
      this.dashes(g, snow, top, snow, top + h);
      g.lineBetween(origin.x - 40, origin.y, width - 40, origin.y);
      star.setPosition(origin.x - 30, origin.y);
      scrawl(this, band.from + 8, top + h - 6, 'habitable zone:\nwater stays liquid', 20, VERDIGRIS).setOrigin(0, 1);
      scrawl(this, snow + 6, top + 4, 'snow line:\nwater freezes', 20, INK_TEXT).setOrigin(0, 0);
    } else {
      g.fillStyle(HIGHLIGHT, 0.3).fillRect(GAP, band.from, width - GAP * 2, band.to - band.from);
      this.dashes(g, GAP, snow, width - GAP, snow);
      g.lineBetween(origin.x, origin.y - 40, origin.x, l.bottom - 30);
      star.setAngle(90).setPosition(origin.x, origin.y - 30);
      scrawl(this, width - GAP - 6, band.from + 4, 'habitable zone:\nwater stays liquid', 20, VERDIGRIS).setOrigin(1, 0).setAlign('right');
      scrawl(this, width - GAP - 6, snow + 4, 'snow line: water freezes', 20, INK_TEXT).setOrigin(1, 0);
    }
  }

  private dashes(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number): void {
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let s = 0; s < len; s += 12) {
      const a = s / len;
      const b = Math.min(1, (s + 6) / len);
      g.lineBetween(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b);
    }
  }

  /** Every world, its name, the giants' strings of moons, the ring round the one on the card, and your ship. */
  private worlds(l: Layout, selected: World): void {
    const g = this.add.graphics().setDepth(-0.3);
    g.lineStyle(1, 0x1f2a55, 0.4);
    for (const giant of planetsOf().filter((w) => moonsOf(w.id).length)) {
      const moons = moonsOf(giant.id);
      const b = l.at(moons.at(-1)!);
      // Down the page the string starts past the giant's name.
      const a = l.vertical ? { x: l.at(moons[0]!).x - 40, y: b.y } : l.at(giant);
      this.dashes(g, a.x, a.y, b.x, b.y);
    }
    for (const w of WORLDS) {
      const p = l.at(w);
      const r = worldRadius(w);
      if (w.id === selected.id) this.add.graphics().setDepth(-0.2).fillStyle(HIGHLIGHT, 0.75).fillCircle(p.x, p.y, r + 9);
      const img = this.add.image(p.x, p.y, TEX.world(w.id)).setScale(1 / 3);
      img.setInteractive({ useHandCursor: true }).on('pointerup', () => this.select(w));
      this.nameOf(l, w, p, r);
    }
    const home = l.at(worldById(getProfile(this).at) ?? WORLDS[0]!);
    const ship = l.vertical ? { x: home.x, y: home.y - 40 } : { x: home.x - 50, y: home.y };
    const img = this.add.image(ship.x, ship.y, shipTexture(this, shipLookOf(getProfile(this)), 'small'));
    img.setScale(MAP_SHIP_W / img.width);
    if (l.vertical) scrawl(this, ship.x + 30, ship.y, 'your ship', 18, INK_TEXT).setOrigin(0, 0.5);
    else scrawl(this, ship.x, ship.y + 12, 'your ship', 18, INK_TEXT).setOrigin(0.5, 0);
  }

  /** A world's name: beside a moon, over a giant, under a planet (across); beside everything (down). */
  private nameOf(l: Layout, w: World, p: { x: number; y: number }, r: number): void {
    const bold = w.id === getProfile(this).at ? '600' : '500';
    if (l.vertical) {
      if (w.parent) label(this, p.x, p.y + r + 4, w.name, 15, INK_TEXT, bold).setOrigin(0.5, 0);
      else label(this, p.x + r * (w.id === 'sepia' ? 2.2 : 1) + 8, p.y, w.name, 16, INK_TEXT, bold).setOrigin(0, 0.5);
      return;
    }
    if (w.parent) label(this, p.x + r + 8, p.y, w.name, 15, INK_TEXT, bold).setOrigin(0, 0.5);
    else if (w.kind === 'giant') label(this, p.x, p.y - r - 8, w.name, 16, INK_TEXT, bold).setOrigin(0.5, 1);
    else label(this, p.x, p.y + r + 6, w.name, 16, INK_TEXT, bold).setOrigin(0.5, 0);
  }

  /** What the telescope makes of the world on the card. Returns the height. */
  private card(w: World, x: number, y: number, cw: number): number {
    const top = y + SECTION_BODY;
    const pic = this.add.image(x + PAD + 46, top + 46, TEX.world(w.id));
    pic.setScale(Math.min(1, 92 / pic.width));
    const tx = x + PAD + 112;
    const tw = cw - (tx - x) - PAD;
    label(this, tx, top, w.name, 24, INK_TEXT, '600');
    // Room on the right for the Set course button on a world the ship can fly to.
    const p = getProfile(this);
    const trip = isWorldId(w.id) && tripFuel(p.at, w.id) !== null ? w.id : null;
    const tw2 = trip ? tw - 220 : tw;
    const where = w.parent ? `moon of ${worldById(w.parent)!.name}` : `${ordinal(planetsOf().indexOf(w) + 1)} world from the star`;
    const kind = aside(this, tx, top + 34, `${KIND_LINE[w.kind]} · ${where}`, 16, tw2, w.kind === 'living' ? VERDIGRIS : INK_TEXT);
    let ry = kind.y + kind.height + 6;
    const air = w.breathable ? `Air: ${w.air}. You could breathe it.` : `Air: ${w.air}.`;
    const scan = w.chemistry ? `${air} Scan: ${w.chemistry}.` : air;
    const a = aside(this, tx, ry, scan, 16, tw, SEPIA);
    ry = a.y + a.height + 8;
    const seen = prose(this, tx, ry, w.seen, 17, tw);
    ry = Math.max(top + 100, seen.y + seen.height + 10);
    const status = scrawl(this, tx, ry, statusOf(w, p), 22, INK_TEXT, tw);
    ry += status.height + 12;
    if (trip) {
      const why = canTravel(p, trip, hasWorld);
      // Without the full game the first trip still ends the demo, and after that the button offers it.
      const unlock = why === 'locked' && hasBeat(p, 'course');
      const go = (): void => (why === 'ok' ? this.fly(trip) : unlock ? getHost(this).onBuy() : this.setCourse());
      // Up by the name, so it's in view without scrolling.
      plaque(this, x + cw - PAD - 100, top + 18, unlock ? 'Unlock' : 'Set course', go, { width: 200, height: 44, size: 16, kind: why === 'ok' || why === 'locked' ? 'primary' : 'off' });
      const note = travelWhy(why, tripFuel(p.at, trip)!);
      if (note) {
        const t = aside(this, tx, ry, note, 15, tw, SEPIA);
        ry += t.height + 10;
      }
    }
    const h = ry - y;
    section(this, x, y, cw, h, 'Telescope', 91);
    return h;
  }

  private select(w: World): void {
    this.scene.restart({ selected: w.id } satisfies SystemData);
  }

  private arrival(): void {
    storyCard(this, {
      title: 'Where you fell',
      subtitle: 'the star map, at first light',
      pictures: [{ key: TEX.star, h: 90 }, { key: TEX.world('sepia'), h: 90 }],
      text: `${STAR.name[0]!.toUpperCase()}${STAR.name.slice(1)}, and twelve worlds round it. The grey moon was never a planet: it's one of three moons round the ringed giant. Not one of these worlds is in any chart you remember. Home is somewhere past all of them.`,
      button: 'Look around',
    }, () => {});
  }

  /** Back to the starship's page (the map is only open aboard). */
  private back(): void {
    this.scene.start('Ship', { remote: false, tab: 'starship' });
  }

  /** A trip made: the ship flies there, and its page opens in orbit over the new world. Setting out from Graphite the first time ends chapter 1. */
  private fly(to: WorldId): void {
    const was = getProfile(this);
    const first = !hasBeat(was, 'course');
    setProfile(this, travel(was, to));
    const name = worldById(to)!.name;
    const from = worldById(was.at)!.name;
    storyCard(this, {
      title: `Course set for ${name}`,
      subtitle: first ? 'the end of chapter 1' : `${from} to ${name}`,
      pictures: [{ key: shipTexture(this, shipLookOf(getProfile(this)), 'small'), h: 70 }, { key: TEX.world(to), h: 70 }],
      text: first
        ? `The engine hums for the first time since the wormhole, and the grey moon slides away below. ${name} grows ahead, green under its haze: a world with air, and with life in it. Whatever lives there has never seen anything like you.`
        : `The engine hums and ${from} slides away below. A short hop round the ringed giant, and ${name} fills the window.`,
      button: `On to ${name}`,
    }, () => this.scene.start('Ship', { remote: false, tab: 'starship' }));
  }

  /** At a world whose ground isn't loaded: the full game failed to come down. */
  private unavailable(at: WorldId): void {
    const err = (this.registry.get(REG.fullError) as string | null | undefined) ?? 'This world is part of the full game.';
    storyCard(this, {
      title: `${worldById(at)!.name} isn't here`,
      subtitle: 'the full game',
      text: `${err} Until it comes down, your ship can't land.`,
      button: 'Try again',
    }, () => void loadPaidPlanets(this).then(() => this.scene.restart({ selected: at } satisfies SystemData)));
  }

  /** The first trip without the full game, from its world's card: the end of the demo. */
  private setCourse(): void {
    const r = setCourse(getProfile(this));
    if (!r.ok) return;
    setProfile(this, r.profile);
    const to = worldById(FIRST_COURSE.to)!.name;
    storyCard(this, {
      title: `Course set for ${to}`,
      subtitle: 'the end of chapter 1',
      pictures: [{ key: shipTexture(this, shipLookOf(getProfile(this)), 'small'), h: 70 }, { key: TEX.world(FIRST_COURSE.to), h: 70 }],
      text: `The engine hums for the first time since the wormhole, and the grey moon slides away below. ${to} grows ahead, green under its haze: a world with air, and with life in it. Whatever lives there has never seen anything like you.`,
      button: 'On to Mycel',
    }, () => this.scene.restart({ selected: FIRST_COURSE.to, demoEnd: true } satisfies SystemData));
  }

  /** Where the demo stops: on the star map, with the full game offered (Mycel is in it; the rest of the journey is still coming). */
  private demoEnd(): void {
    const host = getHost(this);
    const price = host.price ? ` · ${host.price}` : '';
    storyCard(this, {
      title: 'The end of the demo',
      subtitle: 'thank you for playing',
      pictures: [{ key: TEX.world(FIRST_COURSE.to), h: 80 }],
      text: `That's as far as the demo goes. ${worldById(FIRST_COURSE.to)!.name}, the green moon, is in the full game: a fungal jungle with its own ores, its own gear to print and the Aster crew's lost lander. The worlds after it, each with its own people, language and dangers, and the long search for the way home, are coming.`,
      button: `Unlock the full game${price}`,
      secondary: { label: 'Look at the map', press: () => {} },
    }, () => host.onBuy());
  }
}

function ordinal(n: number): string {
  return ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][n - 1] ?? `${n}th`;
}

/** The first trip set without the full game: the demo's over. */
const demoOver = (p: Profile): boolean => hasBeat(p, 'course') && !hasWorld('mycel');

/** Why a trip can't be made yet, beside its button (nothing when it can). */
function travelWhy(why: TravelCheck, fuel: number): string | null {
  if (why === 'docked') return 'Trips are set aboard your ship.';
  if (why === 'ship') return 'The ship needs its power, telescope, tank and engine mended first.';
  if (why === 'fuel') return `The ship's tank needs ${fuel} units for the trip.`;
  if (why === 'locked') return 'It\'s in the full game.';
  return null;
}

/** Whether you're there, have been, can go, or can't land. */
function statusOf(w: World, p: Profile): string {
  if (w.id === p.at) return p.docked ? 'Your ship circles it.' : 'You are here. Your ship circles it.';
  if (isWorldId(w.id) && p.visited.includes(w.id)) return 'You were here.';
  if (w.chapter === null) return 'No ground to land on. Its moons are what matter.';
  if (isWorldId(w.id) && tripFuel(p.at, w.id) !== null) return demoOver(p) && w.id === FIRST_COURSE.to ? 'Course set: the full game goes there.' : "A sister moon: the nearest trip, within reach of the ship's first tank.";
  return 'Out of reach: it needs a bigger tank, and the chapters after.';
}
