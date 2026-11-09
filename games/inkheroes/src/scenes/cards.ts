import type Phaser from 'phaser';
import { chapterEnd } from './chapterEnd';
import { chapterById, isLoaded, nextMap, partsOf, type ChapterId } from '../level/maps';
import { answerPrompt, itemLine, playerTowns, type Adventure } from '../logic/adventure';
import { itemDef } from '../logic/items';
import { getHost, trackOffer } from '../host';
import { partDays } from '../logic/chapter';
import { PRIMARY_NAMES } from '../logic/hero';
import { RANK_NAMES, SKILLS } from '../logic/skills';
import { buildingIn, has, type Town } from '../logic/town';
import { buildingOf, FACTIONS, factionOf } from '../logic/factions';
import { UI_TEX } from './battle/pixelUi';
import { openCard, type CardSpec } from './CardScene';
import { narrator } from './NarratorScene';
import { Session } from './session';
import { isLineId, lineText } from '../narration/lines';
import { addTroops } from '../logic/army';
import { creature } from '../logic/creatures';
import { dwellingHireable, dwellingName, dwellingStock } from '../logic/dwellings';
import { RESOURCES } from '../logic/resources';

/**
 * The cards the map shows from the adventure's state: its waiting prompts
 * (messages, chests, level-ups), then victory or defeat.
 */
export function openPrompt(scene: Phaser.Scene & { showPrompts(): void }, session: Session): void {
  const adv = session.adv;
  const next = (choice?: Parameters<typeof answerPrompt>[1]): void => {
    session.set(answerPrompt(session.adv, choice));
    scene.showPrompts();
  };
  const first = adv.prompts[0];
  if (first?.kind === 'message') {
    // Told aloud, the story plays in the narrator's strip while play goes on: a part's opening keeps a short card (its brief and goal), the rest none.
    const told = isLineId(first.line) && !!narrator(scene)?.say(first.line);
    if (told && first.brief === undefined) {
      next();
      return;
    }
    openCard(scene, { title: first.title, body: told ? first.brief! : first.text, picture: first.item ? UI_TEX.item(first.item) : undefined, report: first.report, buttons: [{ label: 'On we go', onClick: () => next() }] });
    return;
  }
  if (first?.kind === 'chest' && first.item) {
    // 1 chest in 4 holds a piece (src/logic/loot.ts): the piece, its grade and what it gives, and Take.
    const def = itemDef(first.item);
    openCard(scene, {
      title: 'Treasure Chest',
      body: `Under the lid lies the ${def.name}.\n${itemLine(first.item)}`,
      picture: UI_TEX.item(first.item),
      buttons: [{ label: 'Take', kind: 'crown', onClick: () => next('gold') }],
    });
    return;
  }
  if (first?.kind === 'chest') {
    openCard(scene, {
      title: 'Treasure Chest',
      body: 'An old iron-bound chest, full of coin. Keep the gold, or give it to the villages along the road and learn from their stories?',
      buttons: [
        { label: `Keep ${first.gold} gold`, kind: 'crown', onClick: () => next('gold') },
        { label: `Take ${first.xp} experience`, kind: 'crown', onClick: () => next('xp') },
      ],
    });
    return;
  }
  if (first?.kind === 'dwelling') {
    openCard(scene, dwellingCard(adv, first, next));
    return;
  }
  if (first?.kind === 'levelUp') {
    const o = first.offer;
    const hero = adv.hero;
    openCard(scene, {
      title: `${hero.name} reaches level ${o.level}`,
      body: `+1 ${PRIMARY_NAMES[o.primary]}${o.choices.length ? '\nChoose a skill to learn:' : ''}`,
      buttons: o.choices.length
        ? o.choices.map((id, i) => {
          const rank = (hero.skills[id] ?? 0) + 1;
          return { label: `${RANK_NAMES[rank]} ${SKILLS[id].name}`, note: SKILLS[id].says(SKILLS[id].values[rank - 1]!), picture: UI_TEX.skill(id), kind: 'crown' as const, onClick: () => next(id) };
        })
        : [{ label: 'On we go', onClick: () => next() }],
    });
    return;
  }
  if (adv.status === 'won') {
    const next = nextMap(session.def);
    const days = partDays(adv);
    // Otherwise the land opens further and the hero rides on; after the last part built, the chapter's own card.
    const end = next ? `\nThe road goes on: ${next.name} lies ahead.` : '';
    // A part's own ending, told as the chapter rides on, or (the chapter's last part) before its ending (read here when it isn't heard).
    const won = session.def.won ? (narrator(scene)?.say(session.def.won) ? '' : `\n\n${lineText(session.def.won)}`) : '';
    openCard(scene, {
      title: 'Victory!',
      body: `${session.def.goal.text[0]!.toUpperCase()}${session.def.goal.text.slice(1)}: done in ${days} ${days === 1 ? 'day' : 'days'}${adv.lostStacks === 0 ? ', and not one company lost' : ''}.${end}${won}`,
      // One way on: from the next part the map's own menu still leads back to the campaign.
      buttons: [next
        ? { label: `Ride on to ${next.name}`, onClick: () => rideOnward(scene, session) }
        : { label: 'On we go', onClick: () => openCard(scene, chapterDoneCard(scene, session)) }],
    });
    return;
  }
  if (adv.status === 'lost') {
    openCard(scene, {
      title: 'Defeat',
      body: `${playerTowns(adv).length ? `${adv.hero.name}'s army has been beaten.` : 'Your last town has fallen.'} Try this day again with a different plan?`,
      buttons: [
        { label: 'Replay the day', onClick: () => {
          session.replayDay();
          scene.scene.restart();
        } },
        { label: 'Back to the campaign', kind: 'plain', onClick: () => toMenu(scene, session, 'lose') },
      ],
    });
  }
}

/** An outer dwelling of ours with creatures waiting: how many, their price, and Hire (all the purse and the army allow) or Leave. */
function dwellingCard(adv: Adventure, p: Extract<Adventure['prompts'][number], { kind: 'dwelling' }>, next: (choice?: 'hire') => void): CardSpec {
  const o = adv.objects.find((x) => x.id === p.id)!;
  const c = creature(o.creature!);
  const waiting = dwellingStock(o);
  const can = dwellingHireable(o, adv.purse, adv.hero.army);
  const price = RESOURCES.filter((r) => (c.cost[r] ?? 0) > 0).map((r) => `${c.cost[r]} ${r}`).join(', ');
  const why = can ? '' : addTroops(adv.hero.army, c.id, 1) ? '\nThe purse can’t pay for one.' : `\n${adv.hero.name}'s army has no room for them.`;
  return {
    title: dwellingName(o),
    body: `${p.text ? `${p.text}\n` : ''}${waiting} ${waiting === 1 ? c.name : c.plural} wait here, ${price} each.${why}`,
    buttons: [
      ...(can ? [{ label: `Hire ${can}`, kind: 'crown' as const, onClick: () => next('hire') }] : []),
      { label: 'Leave', kind: can ? 'plain' as const : 'crown' as const, onClick: () => next() },
    ],
  };
}

/** The hero is about to storm walls with no war machine: what it's for, where to get one, and what going without costs. */
export function wallsCard(town: Town, adv: Adventure, storm: () => void, later: () => void = () => undefined): CardSpec {
  // In the hero's people's words: the Greeks' Catapult from a Blacksmith, Egypt's siege ramp from a Workshop.
  const people = factionOf(adv.hero);
  const words = FACTIONS[people].siege;
  const smith = playerTowns(adv).find((t) => has(t, 'blacksmith') && factionOf(t) === people) ?? playerTowns(adv).find((t) => has(t, 'blacksmith'));
  const shop = buildingOf(people, 'blacksmith').name;
  const buy = smith ? `The ${buildingIn(smith, 'blacksmith').name} in ${smith.name} sells them.` : `Build a ${shop} in a town of yours to buy one.`;
  return {
    title: `The walls of ${town.name}`,
    body: `${words.card} ${buy}\nWithout one, your troops must hack through the gate by hand, under fire.`,
    picture: UI_TEX.item(words.item),
    buttons: [
      { label: 'Not yet', kind: 'crown', onClick: later },
      { label: 'Storm it now', kind: 'plain', onClick: storm },
    ],
  };
}

/**
 * The end of everything built of a chapter: its ending (told by the
 * narrator, or read here), how the whole march went, and what comes next,
 * so finishing reads as an ending, not a dead end. Chapter 1's points on to
 * chapter 2: open to an owner, the full game's offer to anyone else.
 */
function chapterDoneCard(scene: Phaser.Scene, session: Session): CardSpec {
  const chapter = session.chapter;
  const told = !!narrator(scene)?.say(chapter.ending);
  const end = chapterEnd(chapter, session.adv, told, isLoaded);
  const back = { label: 'Back to the campaign', kind: 'plain' as const, onClick: () => toMenu(scene, session, null) };
  const more = { label: 'More games', kind: 'plain' as const, onClick: () => getHost(scene).onExit() };
  const body = end.body.join('\n\n');
  const next = end.next;
  if (!next) return { title: end.title, body, buttons: [{ ...back, kind: 'crown' }, more] };
  const host = getHost(scene);
  const owned = isLoaded(next);
  if (!owned && host.price) trackOffer(scene, 'free_end');
  return {
    title: end.title,
    body,
    buttons: [
      owned
        ? { label: `On to chapter ${next.n}`, kind: 'crown', onClick: () => startChapter(scene, next.id) }
        : host.price
          ? { label: `Full game · ${host.price}`, kind: 'crown', onClick: () => host.onBuy('free_end') }
          : { ...back, kind: 'crown' },
      ...(owned || host.price ? [back] : []),
      more,
    ],
  };
}

/** Leaves the chapter won for the start (or the saved game) of chapter `id`. */
function startChapter(scene: Phaser.Scene, id: ChapterId): void {
  const chapter = chapterById(id);
  const host = getHost(scene);
  for (const key of ['MapHud', 'Card', 'Town', 'Battle']) if (key !== scene.scene.key) scene.scene.stop(key);
  if (!Session.resume(scene, host, chapter)) Session.begin(scene, host, partsOf(chapter)[0]!);
  scene.scene.start('Map');
}

/** The part won, the land opens further and the hero rides straight on. */
function rideOnward(scene: Phaser.Scene, session: Session): void {
  for (const key of ['MapHud', 'Card', 'Town', 'Battle']) if (key !== scene.scene.key) scene.scene.stop(key);
  session.rideOn(scene);
  scene.scene.start('Map');
}

/** Leaves the map for the campaign menu (the game is kept: a lost day comes back to its morning). */
export function toMenu(scene: Phaser.Scene, session: Session, result: 'lose' | null): void {
  if (result) session.leaveLost(scene);
  for (const key of ['Map', 'MapHud', 'Card', 'Town', 'Battle']) if (key !== scene.scene.key) scene.scene.stop(key);
  scene.scene.start('Menu');
}
