import type Phaser from 'phaser';
import { chapterById, isLoaded, nextMap, partsOf, type ChapterId } from '../level/maps';
import { answerPrompt, ourHeroes, playerTowns, type Adventure } from '../logic/adventure';
import { getHost, trackOffer } from '../host';
import { partDays } from '../logic/chapter';
import { PRIMARY_NAMES } from '../logic/hero';
import { RANK_NAMES, SKILLS } from '../logic/skills';
import { has, type Town } from '../logic/town';
import { UI_TEX } from './battle/pixelUi';
import { openCard, type CardSpec } from './CardScene';
import { narrator } from './NarratorScene';
import { Session } from './session';
import { isLineId, lineText } from '../narration/lines';

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
    openCard(scene, {
      title: 'Victory!',
      body: `${session.def.goal.text[0]!.toUpperCase()}${session.def.goal.text.slice(1)}: done in ${days} ${days === 1 ? 'day' : 'days'}${adv.lostStacks === 0 ? ', and not one company lost' : ''}.${end}`,
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

/** The hero is about to storm walls with no war machine: what it's for, where to get one, and what going without costs. */
export function wallsCard(town: Town, adv: Adventure, storm: () => void): CardSpec {
  const smith = playerTowns(adv).find((t) => has(t, 'blacksmith'));
  const buy = smith ? `The Blacksmith in ${smith.name} sells them.` : 'Build a Blacksmith in a town of yours to buy one.';
  return {
    title: `The walls of ${town.name}`,
    body: `Walls stop your army, and only a war machine can break them. A Catapult rides with you as gear and brings them down. ${buy}\nWithout one, your troops must hack through the gate by hand, under fire.`,
    picture: UI_TEX.item('catapult'),
    buttons: [
      { label: 'Not yet', kind: 'crown', onClick: () => undefined },
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
  const adv = session.adv;
  const chapter = session.chapter;
  const told = !!narrator(scene)?.say(chapter.ending);
  const towns = playerTowns(adv).length;
  const heroes = ourHeroes(adv).length;
  const march = `${adv.day} days on the march, ${towns} ${towns === 1 ? 'town' : 'towns'} under your banner, ${heroes === 1 ? 'one hero' : `${heroes} heroes`} riding.`;
  const back = { label: 'Back to the campaign', kind: 'plain' as const, onClick: () => toMenu(scene, session, null) };
  const more = { label: 'More games', kind: 'plain' as const, onClick: () => getHost(scene).onExit() };
  const story = told ? [] : [lineText(chapter.ending)];
  if (chapter.n > 1) {
    return {
      title: `Chapter ${chapter.n}: ${chapter.name}, so far`,
      body: [...story, march, `That is all of ${chapter.name} for now: its next parts are being made, and come to the full game as free updates.`, 'Thank you for playing!'].join('\n\n'),
      buttons: [{ ...back, kind: 'crown' }, more],
    };
  }
  const host = getHost(scene);
  const next = chapterById('twoLands');
  const owned = isLoaded(next);
  if (!owned && host.price) trackOffer(scene, 'free_end');
  const onward = owned
    ? 'Chapter 2, The Two Lands, crosses to Egypt: a new people, Neferet the priestess of Isis, and Sacred Rites that curse, ward and raise the fallen. It waits for you now.'
    : 'Chapter 2, The Two Lands, crosses to Egypt: a new people, Neferet the priestess of Isis, and Sacred Rites that curse, ward and raise the fallen. It is part of the full game.';
  return {
    title: 'Chapter 1 complete',
    body: [...story, march, onward, 'Thank you for playing!'].join('\n\n'),
    buttons: [
      owned
        ? { label: 'On to chapter 2', kind: 'crown', onClick: () => startChapter(scene, next.id) }
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
