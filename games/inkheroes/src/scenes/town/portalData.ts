import type { MapDef } from '../../level/types';
import { heroTown, playerArmy, townById, type Adventure } from '../../logic/adventure';
import { isEmptyArmy, type Army } from '../../logic/army';
import { creature, sizeWord } from '../../logic/creatures';
import { portalLevel, cantStepThrough, portalTowns } from '../../logic/portal';
import { cantFightMob, mobLoot, mobOdds, portalMob, weekMob } from '../../logic/portalMob';
import { armyStrength } from '../../logic/strength';
import { buildingIn } from '../../logic/town';

/** The week's band as the room shows it. */
export interface PortalBand {
  /** "A pack of Wolves". */
  readonly name: string;
  readonly army: Army;
  /** "Against Rowan's army: about even · +240 experience · may carry a Rare piece". */
  readonly line: string;
  /** Why it can't be fought now; null when Fight is lit. */
  readonly why: string | null;
}

/** A town to step through to: where the hero would come out, or why not. */
export interface PortalWay {
  readonly townId: string;
  readonly name: string;
  readonly note: string;
  readonly why: string | null;
}

export interface PortalView {
  readonly title: string;
  /** The week's band (level 2 up): null when it was beaten this week, said by `quiet`. */
  readonly band: PortalBand | null;
  readonly quiet: string;
  /** The towns to step through to (level 3); null below it. */
  readonly ways: readonly PortalWay[] | null;
  /** Who would go, or fight: the picked hero, and how much of the day they have. */
  readonly who: string;
}

/** The Portal room of town `townId`, for its picked hero, as things stand. */
export function portalView(adv: Adventure, def: MapDef, townId: string): PortalView {
  const town = townById(adv, townId)!;
  const level = portalLevel(town);
  const { hero } = adv;
  const title = buildingIn(town, level >= 3 ? 'portal3' : 'portal2').name;
  const mob = portalMob(adv, def, town);
  const band: PortalBand | null = mob && {
    name: `${capital(sizeWord(mob.count))} ${creature(mob.creature).plural}`,
    army: mob.army,
    line: `Against ${hero.name}'s army: ${mobOdds(mob, armyStrength(playerArmy(adv)))} · +${mob.xp} experience · ${mobLoot(mob)}`,
    why: cantFightMob(adv, def),
  };
  const quiet = mob ? '' : weekMob(adv, def, town) ? 'This week\'s band is beaten: a new one comes on Monday.' : 'Nothing on this land answers the call.';
  const note = `Out in its ${isEmptyArmy(hero.army) ? 'garrison' : 'gate'}, the day's ride over`;
  const ways = level >= 3 ? portalTowns(adv, town).map((t): PortalWay => ({ townId: t.id, name: t.name, note, why: cantStepThrough(adv, hero.id, t.id) })) : null;
  const here = heroTown(adv)?.id === town.id;
  const who = !here ? `${hero.name} is away: a hero in ${town.name} fights here${level >= 3 ? ' or steps through' : ''}.` : hero.mp > 0 ? `${hero.name} goes: ${level >= 3 ? 'a fight or a step through' : 'a fight'} ends the day's ride.` : `${hero.name} has no movement left today.`;
  return { title, band, quiet, ways, who };
}

const capital = (s: string): string => `${s[0]!.toUpperCase()}${s.slice(1)}`;

/** The room's parts, UI pixels. */
export const PORTAL_ROOM = { maxW: 460, pad: 8, gap: 6, head: 30, inset: 6, line: 15, way: 34, btn: { w: 110, h: 28 }, foot: 30 } as const;

/** The room for `room` (what the town leaves it): the band's plate, then a row per town to step through to, as many as fit. */
export function portalLayout(room: { w: number; h: number }, view: PortalView, slot: number): { w: number; h: number; band: number; ways: number } {
  const { pad, gap, head, inset, line, way, foot } = PORTAL_ROOM;
  const w = Math.min(PORTAL_ROOM.maxW, room.w);
  const band = inset + line + 4 + (view.band ? slot + 4 + line * 2 : line) + inset;
  const fixed = head + band + gap + foot + pad;
  const waysTop = view.ways ? inset + line + 4 + inset : 0;
  const fit = view.ways ? Math.max(1, Math.min(view.ways.length, Math.floor((room.h - fixed - gap - waysTop) / way))) : 0;
  const ways = view.ways ? waysTop + Math.max(1, fit) * way : 0;
  return { w, h: fixed + (view.ways ? ways + gap : 0), band, ways };
}
