import type Phaser from 'phaser';
import type { CraftState } from '../../art/asterCraftArt';
import { getProfile, setProfile } from '../../host';
import { surfaceAt } from '../../level/carve';
import type { WorldDef } from '../../level/types';
import type { Profile } from '../../logic/economy';
import { holds, type Hold } from '../../logic/hold';
import { contents, type Inventory } from '../../logic/inventory';
import type { Mine } from '../../logic/mine';
import type { Goal } from '../../logic/repairs';
import { brineSetFound } from '../../logic/repairs';
import { campVisit, craftVisit, crystalVisit, HEART, hasBeat, keptOres, RAISE, REEF_TRADE, reefVisit, searchShipVisit, type CampSays, type CraftSays, type ReefSays } from '../../logic/story';
import { withBag } from '../../logic/suit';
import { CampSite } from './campSite';
import { CraftSite, CrystalSite, ReefSite } from './brineSites';
import { SearchShipSite } from './talusSites';
import type { GroundStyle } from '../../art/palette';
import type { Ring } from './ring';

/** What the story sites need of the scene they're in. */
export interface StoryHost {
  readonly mine: Mine;
  /** The profile with the cargo and the bag as they are this moment. */
  liveProfile(): Profile;
  goal(): Goal;
  /** Saves the profile and the world now. */
  save(): void;
  /** A note over the prospector. */
  say(text: string): void;
  /** Drops any key pressed while a card was up. */
  forget(): void;
  /** The receiver's reading in bars, or null. */
  signal(): number | null;
}

/** Point the beacon or a call comes from, px. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The landed craft stands this many columns east of the camp, on the ground over it (Mycel, once the crew are home). */
const LANDED_OFF = 7;

/**
 * The places the story happens in a world, and what happens there
 * (story.ts): the Aster's camp on Mycel; on Brine the Tidesingers' reef,
 * the crew's craft and its drive crystal in the Leviathan's cave; on Talus
 * the search party's ship. Walking (or swimming, or digging) up to one
 * starts a visit; a card shows what happens, and the world waits until
 * it's read (the HUD reads `camp`, `reef`, `craft`, `crystal` and `ship`).
 * Each visit saves at once.
 */
export class StorySites {
  /** A card is up for one of them: what it says. */
  camp: CampSays | null = null;
  reef: ReefSays | null = null;
  craft: CraftSays | null = null;
  crystal = false;
  /** The search party's ship was just found (Talus). */
  ship = false;
  private readonly campSite: CampSite | null;
  private readonly reefSite: ReefSite | null;
  private readonly craftSite: CraftSite | null;
  private readonly crystalSite: CrystalSite | null;
  private readonly searchSite: SearchShipSite | null;
  /** The crew's craft, landed over their camp once they're home (Mycel). */
  private readonly landed: CraftSite | null;
  private was = { camp: false, reef: false, craft: false, crystal: false, ship: false };

  constructor(private readonly scene: Phaser.Scene, private readonly host: StoryHost, world: WorldDef, tile: number, style: GroundStyle) {
    const site = world.site;
    const camp = world.camp;
    this.campSite = camp ? new CampSite(scene, { col: camp.at[0], row: site.surface + camp.at[1] }, tile) : null;
    const landedCol = camp ? camp.at[0] + LANDED_OFF : 0;
    this.landed = camp ? new CraftSite(scene, { col: landedCol, row: surfaceAt(site, landedCol) }, tile, null) : null;
    const bell = site.bells?.[0];
    const bellAt = bell ? { col: bell.at[0], row: site.surface + bell.at[1] + Math.ceil(bell.h / 2) - 1 } : null;
    this.reefSite = world.reef ? new ReefSite(scene, { col: world.reef.at[0], row: site.surface + world.reef.at[1] }, tile, bellAt) : null;
    const seaRow = site.surface + (site.sea?.level ?? 0);
    this.craftSite = world.craft === undefined ? null : new CraftSite(scene, { col: world.craft, row: surfaceAt(site, world.craft) }, tile, seaRow);
    this.crystalSite = world.crystal ? new CrystalSite(scene, { col: world.crystal.at[0], row: site.surface + world.crystal.at[1] }, tile) : null;
    this.searchSite = world.searchShip ? new SearchShipSite(scene, site, { col: world.searchShip.at[0], row: site.surface + world.searchShip.at[1] }, tile, style) : null;
    this.was = { camp: this.atCamp(), reef: this.atReef(), craft: this.atCraft(), crystal: this.atCrystal(), ship: this.atShip() };
  }

  /** Whether a card is up for any of them (the world waits). */
  get waiting(): boolean {
    return this.camp !== null || this.reef !== null || this.craft !== null || this.crystal || this.ship;
  }

  /** Each step the world runs: arriving at a place starts a visit (once per arrival). */
  step(): void {
    const now = { camp: this.atCamp(), reef: this.atReef(), craft: this.atCraft(), crystal: this.atCrystal(), ship: this.atShip() };
    if (now.camp && !this.was.camp) this.visitCamp();
    if (now.reef && !this.was.reef) this.visitReef();
    if (now.craft && !this.was.craft) this.visitCraft();
    if (now.crystal && !this.was.crystal) this.takeCrystal();
    if (now.ship && !this.was.ship) this.findShip();
    this.was = now;
  }

  update(ring: Ring, now: number): void {
    const p = getProfile(this.scene);
    this.campSite?.update(ring, now, hasBeat(p, 'asterWoken'), hasBeat(p, 'asterReunion'));
    this.landed?.update(ring, now, hasBeat(p, 'craftFlown') ? 'landed' : null);
    this.reefSite?.update(ring, now, hasBeat(p, 'crewMet'));
    this.craftSite?.update(ring, now, craftState(p));
    this.crystalSite?.update(ring, now, hasBeat(p, 'craftMended') && !hasBeat(p, 'crystalFound'));
    this.searchSite?.update(ring, now, this.host.mine);
  }

  /** Where a call being followed comes from, px along the ground: the camp's slow pulse, or the Tidesingers' song. */
  callFrom(g: Goal['kind']): number | null {
    if (g === 'trail' && this.campSite) return this.campSite.x;
    if (g === 'song' && this.reefSite) return this.reefSite.x;
    return null;
  }

  /** Where the beacon points for the story: a place, once what it waits for is in the bag. Null for none. */
  beacon(g: Goal, bag: Inventory): Point | null {
    const has = (h: Hold): boolean => holds(contents(bag), h);
    // The camp once found; while following the trail, only when the receiver says it's right here (it's underground).
    if (this.campSite && (g.kind === 'wake' || g.kind === 'reunion' || (g.kind === 'trail' && this.host.signal() === 5))) return this.campSite.point;
    if (this.craftSite && (g.kind === 'craft' || g.kind === 'flight' || (g.kind === 'heart' && has(HEART)))) return this.craftSite.point;
    if (this.reefSite && ((g.kind === 'reefTrade' && has(REEF_TRADE)) || (g.kind === 'raise' && has(RAISE)))) return this.reefSite.point;
    if (this.crystalSite && g.kind === 'crystal') return this.crystalSite.point;
    if (this.searchSite && g.kind === 'searchShip') return this.searchSite.point;
    return null;
  }

  /** A camp card was read. Finding it, with the charge already in the bag, the pod takes it at once. */
  closeCamp(): void {
    const was = this.camp;
    this.camp = null;
    this.host.forget();
    if (was === 'camp' && this.host.goal().kind === 'wake' && campVisit(this.host.liveProfile(), this.host.mine.suit.bag).says === 'woken') this.visitCamp();
  }

  /** A reef card was read. Paying shows the crew next; meeting them with the copper already in the bag, they take it at once. */
  closeReef(): void {
    const was = this.reef;
    this.reef = null;
    this.host.forget();
    if (was === 'paid') {
      this.reef = 'crew';
      return;
    }
    if (was === 'meet' && this.host.goal().kind === 'reefTrade' && reefVisit(this.host.liveProfile(), this.host.mine.suit.bag, brineSetFound).says === 'paid') this.visitReef();
  }

  closeCraft(): void {
    this.craft = null;
    this.host.forget();
  }

  closeCrystal(): void {
    this.crystal = false;
    this.host.forget();
  }

  closeShip(): void {
    this.ship = false;
    this.host.forget();
  }

  /** In at the Aster's camp, once it's where the story is (it's dug into, so it's found by walking in). */
  private atCamp(): boolean {
    const g = this.host.goal().kind;
    return !!this.campSite && (g === 'trail' || g === 'wake' || g === 'brine' || g === 'reunion' || g === 'talus') && this.campSite.holds(this.host.mine);
  }

  private atReef(): boolean {
    return !!this.reefSite?.holds(this.host.mine);
  }

  private atCraft(): boolean {
    return !!this.craftSite?.near(this.host.mine) && !hasBeat(getProfile(this.scene), 'craftFlown');
  }

  private atCrystal(): boolean {
    return !!this.crystalSite?.near(this.host.mine);
  }

  private atShip(): boolean {
    return !!this.searchSite?.reached(this.host.mine);
  }

  /** The profile after a visit, with the bag as the visit left it; the bag's kept ores follow the story. */
  private settle(profile: Profile, bag: Inventory): void {
    const mine = this.host.mine;
    mine.suit = withBag(mine.suit, bag);
    setProfile(this.scene, { ...profile, suit: bag, cargo: mine.cargo });
    mine.keep = keptOres(profile);
    this.host.save();
  }

  /**
   * Walking into the Aster's camp: found the first time, the pod taking its
   * charge from the bag once it's all there, the sleeper awake after, and,
   * once the crew have flown home from Brine, the four of them together.
   */
  private visitCamp(): void {
    const v = campVisit(this.host.liveProfile(), this.host.mine.suit.bag);
    this.settle(v.profile, v.bag);
    if (v.says === 'awake' || v.says === 'together') {
      this.host.say(v.says === 'awake' ? 'its crown flashes at you' : 'four crowns flash at you');
      return;
    }
    this.camp = v.says;
  }

  /**
   * Swimming in to the Tidesingers' reef: they meet you the first time,
   * wait for their copper, take it and let you in to the Aster crew, and
   * later take the crew's hull patch and float the craft up.
   */
  private visitReef(): void {
    const v = reefVisit(this.host.liveProfile(), this.host.mine.suit.bag, brineSetFound);
    this.settle(v.profile, v.bag);
    if (v.says === 'wait') {
      this.host.say(hasBeat(v.profile, 'craftFlown') ? 'they sing the long song' : hasBeat(v.profile, 'crewMet') ? 'the crew flash their crowns at you' : 'they sing, low and long');
      return;
    }
    this.reef = v.says;
  }

  /** Swimming up to the Aster craft: found the first time; once it's up, it takes its new heart from the bag; with its crystal, it flies. */
  private visitCraft(): void {
    const v = craftVisit(this.host.liveProfile(), this.host.mine.suit.bag);
    if (!v.says) {
      if (hasBeat(v.profile, 'craftMended') && !hasBeat(v.profile, 'crystalFound')) this.host.say('its cradle is empty: the crystal is down below');
      return;
    }
    this.settle(v.profile, v.bag);
    this.craft = v.says;
  }

  /** Reaching the search ship's hatch, dug free: found, the first time. */
  private findShip(): void {
    const p = searchShipVisit(this.host.liveProfile());
    if (!p) return;
    this.settle(p, this.host.mine.suit.bag);
    this.ship = true;
  }

  /** Touching the drive crystal, once the crew have said it's gone: the suit takes it. */
  private takeCrystal(): void {
    const p = crystalVisit(this.host.liveProfile());
    if (!p) return;
    this.settle(p, this.host.mine.suit.bag);
    this.crystal = true;
  }
}

/** How the craft stands on Brine: sunk, raised, mended, or gone (flown home). */
function craftState(p: Profile): CraftState | null {
  if (hasBeat(p, 'craftFlown')) return null;
  return hasBeat(p, 'craftMended') ? 'mended' : hasBeat(p, 'craftRaised') ? 'raised' : 'sunk';
}
